/**
 * Contrato de dados do projeto — definido UMA vez só e importado tanto pelo
 * robô (que escreve o catalogo.json) quanto pelo front-end (que o lê).
 *
 * Regra de ouro do projeto: as chaves de API NUNCA aparecem aqui nem no JSON.
 */

/** Nota mínima para um filme ENTRAR no feed (vale só para entrar, não para permanecer). */
export const NOTA_MINIMA = 65;

/** Só consideramos filmes lançados a partir desta data. */
export const DATA_CORTE = "2025-01-01";

/** Qual critério fez o filme cruzar a linha de entrada. */
export type CriterioQualificacao = "rt" | "metacritic" | "ambos";

/** Estado de disponibilidade do filme no Brasil (dados do TMDb, região BR). */
export type EstadoDisponibilidade = "streaming" | "cinema" | "nao_lancado";

/** Como um serviço de streaming oferece o filme. */
export type TipoOferta = "assinatura" | "aluguel" | "compra";

export interface ServicoStreaming {
  nome: string;
  tipo: TipoOferta;
  /** URL do logo do provedor no TMDb (opcional). */
  logo_url?: string | null;
}

export interface Disponibilidade {
  estado: EstadoDisponibilidade;
  /** Preenchido quando estado === "streaming". */
  servicos?: ServicoStreaming[];
  /** Link do TMDb "assistir agora" para a região BR, quando houver. */
  link_br?: string | null;
}

/** Um ponto do histórico de notas, registrado diariamente pelo robô. */
export interface RegistroHistorico {
  /** Data da medição, no formato YYYY-MM-DD. */
  data: string;
  /** Rotten Tomatoes — crítica (%), ou null se a OMDb não tinha no dia. */
  rt: number | null;
  /** Metacritic (0–100), ou null se a OMDb não tinha no dia. */
  metacritic: number | null;
}

export interface LinksExternos {
  metacritic?: string | null;
  imdb?: string | null;
  rotten_tomatoes?: string | null;
}

/** Um filme que JÁ entrou no feed (cruzou o critério de 65). */
export interface Filme {
  // Identificadores
  tmdb_id: number;
  imdb_id: string;

  // Títulos
  titulo_original: string;
  titulo_ingles: string;

  // Datas
  ano: number;
  /** Data de lançamento (YYYY-MM-DD) — sempre visível na interface. */
  data_lancamento: string;
  /** Data em que entrou no feed (YYYY-MM-DD). Definida uma vez, nunca muda. */
  data_qualificacao: string;

  // Ficha
  sinopse_pt: string;
  elenco: string[];
  diretor: string;
  generos: string[];
  poster_url: string | null;

  // Ficha extra (opcionais — filmes antigos podem não ter até o robô reprocessar)
  /** Códigos ISO 3166-1 dos países de produção (ex.: ["BR", "US"]). */
  pais?: string[];
  /** Códigos ISO 639-1 dos idiomas falados (ex.: ["pt", "en"]). */
  idiomas?: string[];
  /** Duração em minutos. */
  duracao?: number | null;

  // Notas atuais
  rt_critica: number | null; // %
  rt_publico: number | null; // % (a OMDb normalmente não fornece -> null)
  metacritic: number | null; // 0–100
  imdb_publico: number | null; // 0–10

  // Qualificação e histórico
  criterio_qualificacao: CriterioQualificacao;
  historico: RegistroHistorico[];

  // Derivados do histórico (recalculados pelo robô a cada dia)
  pico_rt: number | null;
  pico_metacritic: number | null;
  atual_rt: number | null;
  atual_metacritic: number | null;

  // Brasil + links
  disponibilidade_br: Disponibilidade;
  links: LinksExternos;
}

/**
 * Um candidato na "fila de espera silenciosa": já foi descoberto no TMDb, mas
 * ainda NÃO cruzou o critério de 65 (ou a OMDb ainda não tem as notas).
 * É reconsultado todos os dias. Não aparece no front-end.
 */
export interface FilmeNaFila {
  tmdb_id: number;
  imdb_id: string | null;
  titulo_original: string;
  data_lancamento: string;
  /** Data em que o robô descobriu este candidato (YYYY-MM-DD). */
  descoberto_em: string;
  /** Última vez que o robô consultou as notas (YYYY-MM-DD). */
  ultima_consulta: string | null;
  /** Últimas notas vistas (para diagnóstico), ainda abaixo do critério. */
  ultimo_rt: number | null;
  ultimo_metacritic: number | null;
}

/** O arquivo público que o front-end lê. */
export interface Catalogo {
  /** Versão do formato, para migrações futuras. */
  versao: number;
  /** Quando o robô gerou este arquivo (ISO 8601). */
  gerado_em: string;
  /** Filmes no feed, já ordenados por data_qualificacao (mais recente primeiro). */
  filmes: Filme[];
}

/** Estado interno do robô (a fila de espera). Commitado, mas o front ignora. */
export interface EstadoFila {
  versao: number;
  atualizado_em: string;
  fila: FilmeNaFila[];
  /** Cursor da varredura progressiva do catálogo (página atual de descoberta). */
  sweep_pagina?: number;
}
