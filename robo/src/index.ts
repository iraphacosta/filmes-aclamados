/**
 * Robô diário de coleta.
 *
 * Sequência (uma vez por dia):
 *  1. Descobrir candidatos no TMDb (lançados a partir de 2025), + a fila de espera.
 *  2. Para cada candidato, pegar o IMDb e consultar a OMDb (RT + Metacritic).
 *  3. Critério de ENTRADA: RT >= 65 OU Metacritic >= 65. Ao entrar, grava data_qualificacao (hoje, uma vez só).
 *  4. N/A não é rejeição: fica na fila silenciosa e é reconsultado todo dia.
 *  5. Quem está no feed nunca sai (o critério de 65 vale só para entrar).
 *  6. Para todo filme no feed, registra o histórico do dia e atualiza pico × atual.
 *  7. Metadados (ficha) vêm do TMDb.
 *  8. Grava catalogo.json (público) e fila.json (interno).
 */

import path from "node:path";
import {
  DATA_CORTE,
  criterioDeEntrada,
  derivarNotas,
  qualifica,
  type Filme,
  type FilmeNaFila,
  type LinksExternos,
  type RegistroHistorico,
} from "../../compartilhado/src/index";
import { carregarCatalogo, carregarFila, salvarCatalogo, salvarFila, salvarRadar } from "./catalogo";
import { buscarNotas, configurarOmdb, type NotasOmdb } from "./omdb";
import { gerarRadar } from "./radar";
import {
  buscarImdbId,
  buscarMetadados,
  configurarTmdb,
  descobrirCandidatos,
  varrerCandidatos,
  type CandidatoDescoberto,
  type MetadadosTmdb,
} from "./tmdb";
import { anoDe, carregarEnv, diasEntre, emLotes, envObrigatoria, hoje } from "./util";

const CONCORRENCIA = 5;

/** A cada quantos dias as notas (OMDb) de um filme já no feed são reconsultadas. */
const DIAS_ATUALIZAR_NOTAS = 15;

const NOTAS_VAZIAS: NotasOmdb = { encontrado: false, rt: null, metacritic: null, imdb: null };

/**
 * Consulta a OMDb sem derrubar a coleta. `falhou=true` indica erro duro (ex.:
 * limite diário/401), para o item ser re-tentado com prioridade — diferente de
 * um "não encontrado" legítimo.
 */
async function notasSeguras(imdbId: string): Promise<{ notas: NotasOmdb; falhou: boolean }> {
  try {
    return { notas: await buscarNotas(imdbId), falhou: false };
  } catch (e) {
    console.warn(`  (aviso) OMDb falhou (${imdbId}): ${String(e)}`);
    return { notas: NOTAS_VAZIAS, falhou: true };
  }
}

function montarLinks(imdbId: string, titulo: string): LinksExternos {
  const busca = encodeURIComponent(titulo);
  return {
    imdb: `https://www.imdb.com/title/${imdbId}/`,
    rotten_tomatoes: `https://www.rottentomatoes.com/search?search=${busca}`,
    metacritic: `https://www.metacritic.com/search/${busca}/`,
  };
}

/** Constrói um Filme novo para o feed a partir dos metadados + notas do dia. */
function montarFilme(
  meta: MetadadosTmdb,
  imdbId: string,
  notas: NotasOmdb,
  dia: string,
): Filme {
  const historico: RegistroHistorico[] = [
    { data: dia, rt: notas.rt, metacritic: notas.metacritic },
  ];
  return {
    tmdb_id: meta.tmdb_id,
    imdb_id: imdbId,
    titulo_original: meta.titulo_original,
    titulo_ingles: meta.titulo_ingles,
    ano: meta.ano ?? anoDe(meta.data_lancamento) ?? new Date().getUTCFullYear(),
    data_lancamento: meta.data_lancamento,
    data_qualificacao: dia,
    sinopse_pt: meta.sinopse_pt,
    elenco: meta.elenco,
    diretor: meta.diretor,
    generos: meta.generos,
    poster_url: meta.poster_url,
    pais: meta.pais,
    idiomas: meta.idiomas,
    duracao: meta.duracao,
    rt_critica: notas.rt,
    rt_publico: null, // a OMDb não fornece o público do RT de forma confiável
    metacritic: notas.metacritic,
    imdb_publico: notas.imdb,
    criterio_qualificacao: criterioDeEntrada(notas.rt, notas.metacritic),
    historico,
    ...derivarNotas(historico),
    disponibilidade_br: meta.disponibilidade_br,
    links: montarLinks(imdbId, meta.titulo_ingles || meta.titulo_original),
  };
}

/** Acrescenta o registro do dia ao histórico (substitui se já houver registro de hoje). */
function anexarHistorico(filme: Filme, notas: NotasOmdb, dia: string): void {
  const registro: RegistroHistorico = { data: dia, rt: notas.rt, metacritic: notas.metacritic };
  const ultimo = filme.historico[filme.historico.length - 1];
  if (ultimo && ultimo.data === dia) {
    filme.historico[filme.historico.length - 1] = registro;
  } else {
    filme.historico.push(registro);
  }
}

/**
 * Verdadeiro se as notas do filme já venceram o ciclo de reconsulta
 * (DIAS_ATUALIZAR_NOTAS dias desde o último registro) — ou se ele ainda não tem
 * nenhum registro. Usado para reconsultar a OMDb nesse ritmo, não diariamente,
 * poupando o orçamento gratuito da OMDb.
 */
function notasVencidas(filme: Filme, dia: string): boolean {
  const ultimo = filme.historico[filme.historico.length - 1];
  if (!ultimo) return true;
  return diasEntre(ultimo.data, dia) >= DIAS_ATUALIZAR_NOTAS;
}

async function main(): Promise<void> {
  carregarEnv(path.resolve(import.meta.dirname, "..", ".env"));
  configurarTmdb(envObrigatoria("TMDB_API_KEY"));
  configurarOmdb(envObrigatoria("OMDB_API_KEY"));

  const dia = hoje();
  const paginas = Number(process.env.PAGINAS_DESCOBERTA ?? "5") || 5;

  console.log(`\n=== Coleta de ${dia} ===`);

  const catalogo = await carregarCatalogo();
  const estado = await carregarFila();

  const idsConhecidos = new Set<number>([
    ...catalogo.filmes.map((f) => f.tmdb_id),
    ...estado.fila.map((f) => f.tmdb_id),
  ]);

  // 1. Descoberta -> novos entram na fila. TRÊS varreduras:
  //   - por DATA (primary_release_date.desc): novidades recém-lançadas;
  //   - por POPULARIDADE (popularity.desc): o mainstream;
  //   - por NOTA do TMDb (vote_average.desc): alcança o cinema autoral/festival
  //     aclamado mas pouco popular (que ficava de fora). É a varredura de maior valor.
  console.log("Descobrindo candidatos (data + popularidade + nota)...");
  const VOTOS_MIN = 15; // piso para data/popularidade/varredura
  const VOTOS_MIN_NOTA = 80; // piso maior p/ "melhor nota" (evita 10/10 de pouquíssimos votos)
  const paginasNota = paginas * 3; // varre mais fundo a lista por nota
  const paginasSweep = paginas * 2; // varredura progressiva do catálogo
  const sweepInicio = estado.sweep_pagina && estado.sweep_pagina > 0 ? estado.sweep_pagina : 1;
  let candidatos: CandidatoDescoberto[] = [];
  try {
    const [porData, porPop, porNota, sweep] = await Promise.all([
      descobrirCandidatos(DATA_CORTE, dia, paginas, "primary_release_date.desc", VOTOS_MIN),
      descobrirCandidatos(DATA_CORTE, dia, paginas, "popularity.desc", VOTOS_MIN),
      descobrirCandidatos(DATA_CORTE, dia, paginasNota, "vote_average.desc", VOTOS_MIN_NOTA),
      varrerCandidatos(DATA_CORTE, dia, sweepInicio, paginasSweep, VOTOS_MIN),
    ]);
    estado.sweep_pagina = sweep.proximaPagina;
    const vistos = new Map<number, CandidatoDescoberto>();
    for (const c of [...porNota, ...porPop, ...porData, ...sweep.candidatos]) {
      if (!vistos.has(c.tmdb_id)) vistos.set(c.tmdb_id, c);
    }
    candidatos = [...vistos.values()];
    console.log(`  Varredura: páginas ${sweepInicio}→${sweep.proximaPagina} de ${sweep.totalPaginas}.`);
  } catch (e) {
    console.warn(`  (aviso) descoberta falhou: ${String(e)} — sigo com a fila atual.`);
  }
  let novos = 0;
  for (const c of candidatos) {
    if (idsConhecidos.has(c.tmdb_id)) continue;
    idsConhecidos.add(c.tmdb_id);
    estado.fila.push({
      tmdb_id: c.tmdb_id,
      imdb_id: null,
      titulo_original: c.titulo_original,
      data_lancamento: c.data_lancamento,
      descoberto_em: dia,
      ultima_consulta: null,
      ultimo_rt: null,
      ultimo_metacritic: null,
    });
    novos++;
  }
  console.log(`  ${candidatos.length} candidatos vistos, ${novos} novos na fila (total fila: ${estado.fila.length}).`);

  // 2–4. Processa a fila com ORÇAMENTO diário de consultas à OMDb: prioriza os
  // nunca consultados e os mais antigos; o excedente fica para os próximos dias.
  // Assim a fila pode crescer (varredura) sem estourar o limite gratuito da OMDb.
  // O feed reconsulta a OMDb só para os filmes com notas vencidas (ciclo de
  // DIAS_ATUALIZAR_NOTAS dias), então descontamos apenas esses — não o feed inteiro.
  const feedVencidos = catalogo.filmes.filter((f) => notasVencidas(f, dia)).length;
  const orcamento = Math.max(150, 850 - feedVencidos);
  const porPrioridade = estado.fila
    .slice()
    .sort((a, b) => ((a.ultima_consulta ?? "") < (b.ultima_consulta ?? "") ? -1 : 1));
  const aChecar = porPrioridade.slice(0, orcamento);
  const adiados = porPrioridade.slice(orcamento);
  console.log(`Avaliando a fila (${aChecar.length} de ${estado.fila.length}; ${adiados.length} adiados p/ depois)...`);
  const aindaNaFila: FilmeNaFila[] = [];
  let promovidos = 0;

  const avaliacoes = await emLotes(aChecar, CONCORRENCIA, async (item) => {
    try {
      let imdbId = item.imdb_id;
      if (!imdbId) imdbId = await buscarImdbId(item.tmdb_id);
      if (!imdbId) return { item, imdbId: null as string | null, notas: null as NotasOmdb | null, falhou: false };
      const { notas, falhou } = await notasSeguras(imdbId);
      return { item, imdbId, notas, falhou };
    } catch (e) {
      console.warn(`  (aviso) avaliação falhou (${item.titulo_original}): ${String(e)}`);
      return { item, imdbId: item.imdb_id, notas: null as NotasOmdb | null, falhou: true };
    }
  });

  for (const { item, imdbId, notas, falhou } of avaliacoes) {
    item.imdb_id = imdbId;
    if (!imdbId || !notas || !qualifica(notas.rt, notas.metacritic)) {
      // Falha dura da OMDb (limite/401): NÃO marca como consultado, p/ re-tentar
      // com prioridade amanhã. N/A legítimo ou abaixo do critério: marca normalmente.
      if (!falhou) {
        item.ultima_consulta = dia;
        item.ultimo_rt = notas?.rt ?? null;
        item.ultimo_metacritic = notas?.metacritic ?? null;
      }
      aindaNaFila.push(item);
      continue;
    }
    // Cruzou o critério: promove para o feed (se os metadados vierem).
    try {
      const meta = await buscarMetadados(item.tmdb_id, dia);
      catalogo.filmes.push(montarFilme(meta, imdbId, notas, dia));
      promovidos++;
    } catch (e) {
      console.warn(`  (aviso) não promovi ${item.titulo_original} hoje (metadados falharam): ${String(e)}`);
      item.ultima_consulta = dia;
      item.ultimo_rt = notas.rt;
      item.ultimo_metacritic = notas.metacritic;
      aindaNaFila.push(item);
    }
  }
  estado.fila = [...aindaNaFila, ...adiados];
  console.log(`  ${promovidos} promovido(s) para o feed. Restam ${estado.fila.length} na fila.`);

  // 5–7. Atualiza quem já está no feed. As NOTAS (OMDb) são reconsultadas a cada
  // DIAS_ATUALIZAR_NOTAS dias por filme — não todo dia — para poupar o orçamento
  // diário da OMDb. A ficha do TMDb (disponibilidade, pôster) segue diária.
  console.log(
    `Atualizando o feed (${catalogo.filmes.length}); notas a reconsultar hoje: ${feedVencidos} (ciclo de ${DIAS_ATUALIZAR_NOTAS} dias).`,
  );
  await emLotes(catalogo.filmes, CONCORRENCIA, async (filme) => {
    // Notas: só reconsulta a OMDb quando venceu o ciclo de DIAS_ATUALIZAR_NOTAS dias.
    if (notasVencidas(filme, dia)) {
      const { notas } = await notasSeguras(filme.imdb_id);
      // Só registra o ponto se a OMDb respondeu — assim um dia de falha/limite
      // não vira um buraco no histórico nem zera as notas atuais.
      if (notas.encontrado) {
        anexarHistorico(filme, notas, dia);
        Object.assign(filme, derivarNotas(filme.historico));
        filme.rt_critica = notas.rt;
        filme.metacritic = notas.metacritic;
        if (notas.imdb != null) filme.imdb_publico = notas.imdb;
      }
    }
    // Ficha do TMDb (disponibilidade no Brasil, pôster) continua diária.
    try {
      const meta = await buscarMetadados(filme.tmdb_id, dia);
      filme.disponibilidade_br = meta.disponibilidade_br;
      if (meta.poster_url) filme.poster_url = meta.poster_url;
      filme.pais = meta.pais;
      filme.idiomas = meta.idiomas;
      filme.duracao = meta.duracao;
    } catch (e) {
      console.warn(`  (aviso) não atualizei a ficha de ${filme.titulo_original}: ${String(e)}`);
    }
  });

  // Poda: descarta candidatos antigos que nunca tiveram nota na OMDb (obscuros sem
  // cobertura) — evita a fila inchar e estourar o limite diário da OMDb com o tempo.
  const PRUNE_DIAS = 45;
  const antesPoda = estado.fila.length;
  estado.fila = estado.fila.filter((item) => {
    const semNota = item.ultimo_rt == null && item.ultimo_metacritic == null;
    const velho = item.ultima_consulta != null && diasEntre(item.descoberto_em, dia) > PRUNE_DIAS;
    return !(semNota && velho);
  });
  const podados = antesPoda - estado.fila.length;
  if (podados > 0) console.log(`  Podados ${podados} candidato(s) antigos sem nota.`);

  // 8. Grava
  await salvarCatalogo(catalogo);
  await salvarFila(estado);

  // Radar: lançamentos recentes na fila, enriquecidos com a ficha do TMDb
  // (pôster + ficha no front). Falha aqui não derruba a coleta já gravada.
  try {
    const idsCatalogo = new Set(catalogo.filmes.map((f) => f.tmdb_id));
    const radar = await gerarRadar(estado.fila, idsCatalogo, dia);
    await salvarRadar(radar);
    console.log(`  Radar: ${radar.length} lançamento(s) recente(s) com ficha.`);
  } catch (e) {
    console.warn(`  (aviso) radar não gerado: ${String(e)}`);
  }

  console.log(`\nPronto. Feed: ${catalogo.filmes.length} filme(s). Fila: ${estado.fila.length}.`);
}

main().catch((erro) => {
  console.error("Falha na coleta:", erro);
  process.exit(1);
});
