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
import { carregarCatalogo, carregarFila, salvarCatalogo, salvarFila } from "./catalogo";
import { buscarNotas, configurarOmdb, type NotasOmdb } from "./omdb";
import {
  buscarImdbId,
  buscarMetadados,
  configurarTmdb,
  descobrirCandidatos,
  type CandidatoDescoberto,
  type MetadadosTmdb,
} from "./tmdb";
import { anoDe, carregarEnv, emLotes, envObrigatoria, hoje } from "./util";

const CONCORRENCIA = 5;

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

async function main(): Promise<void> {
  carregarEnv(path.resolve(import.meta.dirname, "..", ".env"));
  configurarTmdb(envObrigatoria("TMDB_API_KEY"));
  configurarOmdb(envObrigatoria("OMDB_API_KEY"));

  const dia = hoje();
  const paginas = Number(process.env.PAGINAS_DESCOBERTA ?? "3") || 3;

  console.log(`\n=== Coleta de ${dia} ===`);

  const catalogo = await carregarCatalogo();
  const estado = await carregarFila();

  const idsConhecidos = new Set<number>([
    ...catalogo.filmes.map((f) => f.tmdb_id),
    ...estado.fila.map((f) => f.tmdb_id),
  ]);

  // 1. Descoberta -> novos entram na fila.
  // Duas varreduras: por DATA (novidades) e por RELEVÂNCIA (alcança o catálogo
  // aclamado que já tem notas). Piso de votos evita lotar a fila de obscuros.
  console.log(`Descobrindo candidatos (${paginas} página(s) x2: data + relevância)...`);
  const VOTOS_MIN = 15;
  const [porData, porRelevancia] = await Promise.all([
    descobrirCandidatos(DATA_CORTE, dia, paginas, "primary_release_date.desc", VOTOS_MIN),
    descobrirCandidatos(DATA_CORTE, dia, paginas, "popularity.desc", VOTOS_MIN),
  ]);
  const vistos = new Map<number, CandidatoDescoberto>();
  for (const c of [...porRelevancia, ...porData]) {
    if (!vistos.has(c.tmdb_id)) vistos.set(c.tmdb_id, c);
  }
  const candidatos = [...vistos.values()];
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

  // 2–4. Processa a fila: consulta notas; quem cruzar 65 entra no feed; resto continua na fila.
  console.log(`Avaliando a fila de espera (${estado.fila.length})...`);
  const aindaNaFila: FilmeNaFila[] = [];
  let promovidos = 0;

  const avaliacoes = await emLotes(estado.fila, CONCORRENCIA, async (item) => {
    let imdbId = item.imdb_id;
    if (!imdbId) imdbId = await buscarImdbId(item.tmdb_id);
    if (!imdbId) return { item, imdbId: null as string | null, notas: null as NotasOmdb | null };
    const notas = await buscarNotas(imdbId);
    return { item, imdbId, notas };
  });

  for (const { item, imdbId, notas } of avaliacoes) {
    item.imdb_id = imdbId;
    if (!imdbId || !notas || !qualifica(notas.rt, notas.metacritic)) {
      // Permanece na fila (N/A ou ainda abaixo do critério). Não é erro.
      item.ultima_consulta = dia;
      item.ultimo_rt = notas?.rt ?? null;
      item.ultimo_metacritic = notas?.metacritic ?? null;
      aindaNaFila.push(item);
      continue;
    }
    // Cruzou o critério: promove para o feed.
    const meta = await buscarMetadados(item.tmdb_id, dia);
    catalogo.filmes.push(montarFilme(meta, imdbId, notas, dia));
    promovidos++;
  }
  estado.fila = aindaNaFila;
  console.log(`  ${promovidos} promovido(s) para o feed. Restam ${estado.fila.length} na fila.`);

  // 5–7. Atualiza quem já está no feed: histórico do dia + ficha (disponibilidade, IMDb).
  console.log(`Atualizando o feed (${catalogo.filmes.length})...`);
  await emLotes(catalogo.filmes, CONCORRENCIA, async (filme) => {
    const notas = await buscarNotas(filme.imdb_id);
    anexarHistorico(filme, notas, dia);
    Object.assign(filme, derivarNotas(filme.historico));
    filme.rt_critica = notas.rt;
    filme.metacritic = notas.metacritic;
    if (notas.imdb != null) filme.imdb_publico = notas.imdb;
    try {
      const meta = await buscarMetadados(filme.tmdb_id, dia);
      filme.disponibilidade_br = meta.disponibilidade_br;
      if (meta.poster_url) filme.poster_url = meta.poster_url;
    } catch (e) {
      console.warn(`  (aviso) não atualizei a ficha de ${filme.titulo_original}: ${String(e)}`);
    }
  });

  // 8. Grava
  await salvarCatalogo(catalogo);
  await salvarFila(estado);
  console.log(`\nPronto. Feed: ${catalogo.filmes.length} filme(s). Fila: ${estado.fila.length}.`);
}

main().catch((erro) => {
  console.error("Falha na coleta:", erro);
  process.exit(1);
});
