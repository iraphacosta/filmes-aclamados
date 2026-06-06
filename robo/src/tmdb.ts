/** Cliente do TMDb: descoberta de lançamentos e metadados (ficha do filme). */

import type { Disponibilidade, ServicoStreaming } from "../../compartilhado/src/index";
import { anoDe, buscarJson } from "./util";

const BASE = "https://api.themoviedb.org/3";
const IMG = "https://image.tmdb.org/t/p";

function url(caminho: string, params: Record<string, string>): string {
  const q = new URLSearchParams({ api_key: TMDB_API_KEY, ...params });
  return `${BASE}${caminho}?${q.toString()}`;
}

let TMDB_API_KEY = "";
export function configurarTmdb(apiKey: string): void {
  TMDB_API_KEY = apiKey;
}

export interface CandidatoDescoberto {
  tmdb_id: number;
  titulo_original: string;
  data_lancamento: string;
}

interface RespostaDiscover {
  page: number;
  total_pages: number;
  results: Array<{
    id: number;
    original_title?: string;
    title?: string;
    release_date?: string;
  }>;
}

/**
 * Descobre filmes lançados a partir de DATA_CORTE até hoje (sem lançamentos
 * futuros). `ordem` permite varrer tanto por data ("primary_release_date.desc",
 * para pegar novidades) quanto por relevância ("popularity.desc", para alcançar
 * o catálogo aclamado que já tem notas). `votosMin` descarta filmes que o TMDb
 * mal conhece, para não entupir a fila de obscuros sem nota.
 */
export async function descobrirCandidatos(
  dataCorte: string,
  ate: string,
  paginas: number,
  ordem: "primary_release_date.desc" | "popularity.desc" | "vote_average.desc" = "primary_release_date.desc",
  votosMin = 0,
): Promise<CandidatoDescoberto[]> {
  const encontrados: CandidatoDescoberto[] = [];
  for (let pagina = 1; pagina <= paginas; pagina++) {
    const params: Record<string, string> = {
      language: "pt-BR",
      region: "BR",
      sort_by: ordem,
      include_adult: "false",
      "primary_release_date.gte": dataCorte,
      "primary_release_date.lte": ate,
      page: String(pagina),
    };
    if (votosMin > 0) params["vote_count.gte"] = String(votosMin);
    const dados = await buscarJson<RespostaDiscover>(url("/discover/movie", params));
    for (const r of dados.results) {
      if (!r.release_date) continue;
      encontrados.push({
        tmdb_id: r.id,
        titulo_original: r.original_title ?? r.title ?? "(sem título)",
        data_lancamento: r.release_date,
      });
    }
    if (pagina >= dados.total_pages) break;
  }
  return encontrados;
}

/**
 * Varredura progressiva do catálogo (por popularidade), de `paginaInicial` por
 * `paginas` páginas. Retorna a próxima página (com wrap ao chegar ao fim) e o
 * total — permite caminhar pelo catálogo inteiro ao longo dos dias (cursor).
 */
export async function varrerCandidatos(
  dataCorte: string,
  ate: string,
  paginaInicial: number,
  paginas: number,
  votosMin: number,
): Promise<{ candidatos: CandidatoDescoberto[]; proximaPagina: number; totalPaginas: number }> {
  const encontrados: CandidatoDescoberto[] = [];
  let total = 1;
  let pagina = Math.max(1, paginaInicial);
  for (let i = 0; i < paginas; i++) {
    const dados = await buscarJson<RespostaDiscover>(
      url("/discover/movie", {
        language: "pt-BR",
        region: "BR",
        sort_by: "popularity.desc",
        include_adult: "false",
        "primary_release_date.gte": dataCorte,
        "primary_release_date.lte": ate,
        "vote_count.gte": String(votosMin),
        page: String(pagina),
      }),
    );
    total = dados.total_pages || 1;
    if (pagina > total) {
      pagina = 1;
      i--;
      continue;
    }
    for (const r of dados.results) {
      if (!r.release_date) continue;
      encontrados.push({
        tmdb_id: r.id,
        titulo_original: r.original_title ?? r.title ?? "(sem título)",
        data_lancamento: r.release_date,
      });
    }
    pagina++;
  }
  return { candidatos: encontrados, proximaPagina: pagina > total ? 1 : pagina, totalPaginas: total };
}

/** Resolve só o código IMDb de um filme (chamada leve). */
export async function buscarImdbId(tmdbId: number): Promise<string | null> {
  const d = await buscarJson<{ imdb_id: string | null }>(
    url(`/movie/${tmdbId}/external_ids`, {}),
  );
  return d.imdb_id || null;
}

interface RespostaDetalhes {
  id: number;
  original_title: string;
  original_language: string;
  title: string;
  overview: string;
  release_date: string;
  poster_path: string | null;
  genres: Array<{ id: number; name: string }>;
  credits?: {
    cast?: Array<{ name: string; order: number }>;
    crew?: Array<{ name: string; job: string }>;
  };
  external_ids?: { imdb_id: string | null };
  translations?: {
    translations?: Array<{ iso_639_1: string; data?: { title?: string } }>;
  };
  "watch/providers"?: {
    results?: Record<
      string,
      {
        link?: string;
        flatrate?: Array<{ provider_name: string; logo_path: string | null }>;
        rent?: Array<{ provider_name: string; logo_path: string | null }>;
        buy?: Array<{ provider_name: string; logo_path: string | null }>;
      }
    >;
  };
  release_dates?: {
    results?: Array<{
      iso_3166_1: string;
      release_dates: Array<{ type: number; release_date: string }>;
    }>;
  };
}

export interface MetadadosTmdb {
  tmdb_id: number;
  imdb_id: string | null;
  titulo_original: string;
  titulo_ingles: string;
  titulo_pt: string;
  ano: number | null;
  data_lancamento: string;
  sinopse_pt: string;
  elenco: string[];
  diretor: string;
  generos: string[];
  poster_url: string | null;
  disponibilidade_br: Disponibilidade;
}

function tituloIngles(d: RespostaDetalhes): string {
  const en = d.translations?.translations?.find((t) => t.iso_639_1 === "en");
  if (en?.data?.title) return en.data.title;
  if (d.original_language === "en" && d.original_title) return d.original_title;
  return d.original_title || d.title || "";
}

function provedores(
  lista: Array<{ provider_name: string; logo_path: string | null }> | undefined,
  tipo: ServicoStreaming["tipo"],
): ServicoStreaming[] {
  return (lista ?? []).map((p) => ({
    nome: p.provider_name,
    tipo,
    logo_url: p.logo_path ? `${IMG}/w92${p.logo_path}` : null,
  }));
}

/** Classifica a disponibilidade no Brasil (dados do TMDb para a região BR). */
function calcularDisponibilidade(d: RespostaDetalhes, hojeISO: string): Disponibilidade {
  const br = d["watch/providers"]?.results?.BR;
  const servicos = [
    ...provedores(br?.flatrate, "assinatura"),
    ...provedores(br?.rent, "aluguel"),
    ...provedores(br?.buy, "compra"),
  ];
  if (servicos.length > 0) {
    return { estado: "streaming", servicos, link_br: br?.link ?? null };
  }

  const lancamentosBr = d.release_dates?.results?.find((r) => r.iso_3166_1 === "BR");
  const teveCinema = lancamentosBr?.release_dates?.some(
    (x) => (x.type === 2 || x.type === 3) && x.release_date.slice(0, 10) <= hojeISO,
  );
  if (teveCinema) return { estado: "cinema" };

  return { estado: "nao_lancado" };
}

/** Busca a ficha completa de um filme no TMDb. */
export async function buscarMetadados(
  tmdbId: number,
  hojeISO: string,
): Promise<MetadadosTmdb> {
  const d = await buscarJson<RespostaDetalhes>(
    url(`/movie/${tmdbId}`, {
      language: "pt-BR",
      append_to_response: "credits,external_ids,watch/providers,release_dates,translations",
    }),
  );

  const diretores = (d.credits?.crew ?? [])
    .filter((c) => c.job === "Director")
    .map((c) => c.name);
  const elenco = (d.credits?.cast ?? [])
    .slice()
    .sort((a, b) => a.order - b.order)
    .slice(0, 8)
    .map((c) => c.name);

  return {
    tmdb_id: d.id,
    imdb_id: d.external_ids?.imdb_id || null,
    titulo_original: d.original_title || d.title || "",
    titulo_ingles: tituloIngles(d),
    titulo_pt: d.title || "",
    ano: anoDe(d.release_date),
    data_lancamento: d.release_date || "",
    sinopse_pt: d.overview || "",
    elenco,
    diretor: diretores.join(", "),
    generos: (d.genres ?? []).map((g) => g.name),
    poster_url: d.poster_path ? `${IMG}/w500${d.poster_path}` : null,
    disponibilidade_br: calcularDisponibilidade(d, hojeISO),
  };
}
