/**
 * "Radar de lançamentos": pega os lançamentos RECENTES que ainda estão na fila
 * (não cruzaram a crítica de 65) e enriquece com a ficha completa do TMDb, para
 * o front mostrar pôster + ficha igual à dos aclamados. São objetos Filme com
 * histórico vazio e sem data de qualificação (ainda não entraram no feed).
 */

import type { Filme, FilmeNaFila } from "../../compartilhado/src/index";
import { buscarMetadados } from "./tmdb";
import { diasEntre, emLotes } from "./util";

const JANELA_DIAS = 90;
const LIMITE = 60;
const CONCORRENCIA = 5;

function buscaSite(site: string, titulo: string): string {
  return `https://www.${site}`.replace("{q}", encodeURIComponent(titulo));
}

export async function gerarRadar(
  fila: FilmeNaFila[],
  idsCatalogo: Set<number>,
  dia: string,
): Promise<Filme[]> {
  const recentes = fila
    .filter(
      (f) =>
        f.data_lancamento &&
        f.data_lancamento <= dia &&
        diasEntre(f.data_lancamento, dia) <= JANELA_DIAS &&
        !idsCatalogo.has(f.tmdb_id),
    )
    .sort((a, b) => (a.data_lancamento < b.data_lancamento ? 1 : a.data_lancamento > b.data_lancamento ? -1 : 0))
    .slice(0, LIMITE);

  const filmes: Filme[] = [];
  await emLotes(recentes, CONCORRENCIA, async (item) => {
    try {
      const meta = await buscarMetadados(item.tmdb_id, dia);
      const imdbId = meta.imdb_id || item.imdb_id || "";
      const tituloBusca = meta.titulo_ingles || meta.titulo_original;
      filmes.push({
        tmdb_id: meta.tmdb_id,
        imdb_id: imdbId,
        titulo_original: meta.titulo_original,
        titulo_ingles: meta.titulo_ingles,
        ano: meta.ano ?? (Number(item.data_lancamento.slice(0, 4)) || new Date().getUTCFullYear()),
        data_lancamento: meta.data_lancamento || item.data_lancamento,
        data_qualificacao: "", // ainda não entrou no feed
        sinopse_pt: meta.sinopse_pt,
        elenco: meta.elenco,
        diretor: meta.diretor,
        generos: meta.generos,
        poster_url: meta.poster_url,
        pais: meta.pais,
        idiomas: meta.idiomas,
        duracao: meta.duracao,
        rt_critica: item.ultimo_rt,
        rt_publico: null,
        metacritic: item.ultimo_metacritic,
        imdb_publico: null,
        criterio_qualificacao: "rt", // placeholder — o front não usa no modo radar
        historico: [],
        pico_rt: null,
        pico_metacritic: null,
        atual_rt: item.ultimo_rt,
        atual_metacritic: item.ultimo_metacritic,
        disponibilidade_br: meta.disponibilidade_br,
        links: {
          imdb: imdbId ? `https://www.imdb.com/title/${imdbId}/` : null,
          rotten_tomatoes: buscaSite(`rottentomatoes.com/search?search={q}`, tituloBusca),
          metacritic: buscaSite(`metacritic.com/search/{q}/`, tituloBusca),
        },
      });
    } catch (e) {
      console.warn(`  (radar) pulei ${item.titulo_original}: ${String(e)}`);
    }
  });

  return filmes.sort((a, b) =>
    a.data_lancamento < b.data_lancamento ? 1 : a.data_lancamento > b.data_lancamento ? -1 : 0,
  );
}
