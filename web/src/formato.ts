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

/**
 * Links de BUSCA pelo título no site de cada veículo de crítica.
 * (Não dá para saber, só com TMDb/OMDb, se a crítica existe — então são buscas.)
 */
export function linksVeiculos(titulo: string): { nome: string; url: string }[] {
  const q = encodeURIComponent(titulo);
  return [
    { nome: "Folha de S.Paulo", url: `https://search.folha.uol.com.br/?q=${q}` },
    { nome: "O Globo", url: `https://oglobo.globo.com/busca/?q=${q}` },
    { nome: "Variety", url: `https://variety.com/?s=${q}` },
    { nome: "Vulture", url: `https://www.vulture.com/search/?q=${q}` },
  ];
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
