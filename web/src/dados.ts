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

/** Um lançamento recente ainda na fila (aguardando RT/Metacritic ≥ 65). */
export interface ItemRadar {
  tmdb_id: number;
  imdb_id: string | null;
  titulo: string;
  data_lancamento: string;
  /** Última nota vista (ainda abaixo de 65), ou null se a OMDb não tinha. */
  rt: number | null;
  mc: number | null;
  descoberto_em: string | null;
}

export interface RadarCarregado {
  itens: ItemRadar[];
  geradoEm: string | null;
}

/**
 * Carrega o "radar.json" derivado da fila no build. Falhas (404 num deploy
 * antigo, JSON inválido) não quebram o app — apenas devolvem um radar vazio.
 */
export async function carregarRadar(): Promise<RadarCarregado> {
  const url = `${import.meta.env.BASE_URL}radar.json?v=${Date.now()}`;
  try {
    const resp = await fetch(url);
    if (!resp.ok) return { itens: [], geradoEm: null };
    const dados = (await resp.json()) as { filmes?: ItemRadar[]; gerado_em?: string };
    return { itens: dados.filmes ?? [], geradoEm: dados.gerado_em ?? null };
  } catch {
    return { itens: [], geradoEm: null };
  }
}
