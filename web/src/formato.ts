import type { CriterioQualificacao, Disponibilidade, EstadoDisponibilidade } from "./dados";

const MESES = [
  "jan", "fev", "mar", "abr", "mai", "jun",
  "jul", "ago", "set", "out", "nov", "dez",
];

/** "2025-09-05" -> "5 de set. de 2025" (sem fuso, sem surpresas). */
export function dataLonga(iso: string): string {
  const [a, m, d] = iso.split("-").map(Number);
  if (!a || !m || !d) return iso;
  return `${d} de ${MESES[m - 1]}. de ${a}`;
}

/** "2025-09-05" -> "5 set 2025" (curto, cabe numa linha só no card). */
export function dataMedia(iso: string): string {
  const [a, m, d] = iso.split("-").map(Number);
  if (!a || !m || !d) return iso;
  return `${d} ${MESES[m - 1]} ${a}`;
}

/** "2026-05-30" -> "30/05". */
export function dataCurta(iso: string): string {
  const [, m, d] = iso.split("-");
  return m && d ? `${d}/${m}` : iso;
}

/** Busca no Google. */
function buscaGoogle(consulta: string): string {
  return `https://www.google.com/search?q=${encodeURIComponent(consulta)}`;
}

/**
 * Links para a crítica de cada veículo, via busca no Google restrita ao site
 * (site:dominio) — costuma cair direto na resenha quando ela existe.
 * (Não dá para saber, só com TMDb/OMDb, se a crítica existe — então são buscas.)
 */
export function linksVeiculos(titulo: string): { nome: string; url: string }[] {
  return [
    { nome: "Folha de S.Paulo", url: buscaGoogle(`${titulo} crítica site:folha.uol.com.br`) },
    { nome: "O Globo", url: buscaGoogle(`${titulo} crítica site:oglobo.globo.com`) },
    { nome: "Variety", url: buscaGoogle(`${titulo} review site:variety.com`) },
    { nome: "Roger Ebert", url: buscaGoogle(`${titulo} review site:rogerebert.com`) },
  ];
}

/** Link para o filme no agregador, via Google restrito ao site (RT/Metacritic). */
export function linkAgregador(tipo: "rt" | "mc", titulo: string): string {
  const site = tipo === "rt" ? "rottentomatoes.com" : "metacritic.com";
  return buscaGoogle(`${titulo} site:${site}`);
}

/** Link direto para o perfil do filme no Letterboxd (via id do TMDb). */
export function linkLetterboxd(tmdbId: number): string {
  return `https://letterboxd.com/tmdb/${tmdbId}/`;
}

/** Link para a página do filme no IMDb (ou uma busca, quando não há id). */
export function linkImdb(imdbId: string | null, titulo: string): string {
  return imdbId
    ? `https://www.imdb.com/title/${imdbId}/`
    : `https://www.imdb.com/find/?q=${encodeURIComponent(titulo)}&s=tt`;
}

// Tradução de códigos ISO para nomes em pt-BR.
const nomesPais = new Intl.DisplayNames(["pt-BR"], { type: "region" });
const nomesIdioma = new Intl.DisplayNames(["pt-BR"], { type: "language" });

export function nomePais(iso: string): string {
  try {
    return nomesPais.of(iso) ?? iso;
  } catch {
    return iso;
  }
}

export function nomeIdioma(iso: string): string {
  try {
    const n = nomesIdioma.of(iso);
    return n ? n.charAt(0).toUpperCase() + n.slice(1) : iso;
  } catch {
    return iso;
  }
}

/** 142 -> "2h 22min"; 58 -> "58min". */
export function duracaoTexto(min: number | null | undefined): string | null {
  if (!min || min <= 0) return null;
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h > 0) return m > 0 ? `${h}h ${m}min` : `${h}h`;
  return `${m}min`;
}

export const ROTULO_CRITERIO: Record<CriterioQualificacao, string> = {
  rt: "Rotten Tomatoes",
  metacritic: "Metacritic",
  ambos: "RT + Metacritic",
};

export const ROTULO_DISPONIBILIDADE: Record<EstadoDisponibilidade, string> = {
  streaming: "Em streaming",
  cinema: "No cinema",
  nao_lancado: "Inédito no Brasil",
};

/** Texto curto de disponibilidade para o card (ex.: "Netflix" ou "No cinema"). */
export function resumoDisponibilidade(d: Disponibilidade): string {
  if (d.estado === "streaming" && d.servicos?.length) {
    const nomes = d.servicos.map((s) => s.nome);
    const unicos = [...new Set(nomes)];
    return unicos.slice(0, 2).join(" · ") + (unicos.length > 2 ? "…" : "");
  }
  return ROTULO_DISPONIBILIDADE[d.estado];
}
