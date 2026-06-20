import type { Catalogo, Filme } from "@compartilhado";

// Reexporta os tipos do contrato para o resto do front importar daqui.
export type {
  Catalogo,
  Filme,
  CriterioQualificacao,
  Disponibilidade,
  EstadoDisponibilidade,
  RegistroHistorico,
  ServicoStreaming,
} from "@compartilhado";

export interface CatalogoCarregado {
  filmes: Filme[];
  geradoEm: string | null;
}

/** Carrega o catálogo gerado pelo robô (servido junto do site). */
export async function carregarCatalogo(): Promise<CatalogoCarregado> {
  const url = `${import.meta.env.BASE_URL}catalogo.json?v=${Date.now()}`;
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Não consegui carregar o catálogo (HTTP ${resp.status}).`);
  const dados = (await resp.json()) as Catalogo;
  return { filmes: dados.filmes ?? [], geradoEm: dados.gerado_em ?? null };
}

export interface RadarCarregado {
  filmes: Filme[];
  geradoEm: string | null;
}

/**
 * Carrega o "radar.json" (lançamentos recentes na fila, com ficha completa,
 * gerado pelo robô). Falhas (404 num deploy antigo, JSON inválido) não quebram
 * o app — apenas devolvem um radar vazio.
 */
export async function carregarRadar(): Promise<RadarCarregado> {
  const url = `${import.meta.env.BASE_URL}radar.json?v=${Date.now()}`;
  try {
    const resp = await fetch(url);
    if (!resp.ok) return { filmes: [], geradoEm: null };
    const dados = (await resp.json()) as { filmes?: Filme[]; gerado_em?: string };
    return { filmes: dados.filmes ?? [], geradoEm: dados.gerado_em ?? null };
  } catch {
    return { filmes: [], geradoEm: null };
  }
}
