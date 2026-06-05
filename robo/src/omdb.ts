/** Cliente da OMDb: traduz o código IMDb em notas (RT crítica, Metacritic, IMDb). */

import { buscarJson } from "./util";

const BASE = "https://www.omdbapi.com/";

let OMDB_API_KEY = "";
export function configurarOmdb(apiKey: string): void {
  OMDB_API_KEY = apiKey;
}

interface RespostaOmdb {
  Response: "True" | "False";
  Error?: string;
  Metascore?: string;
  imdbRating?: string;
  Ratings?: Array<{ Source: string; Value: string }>;
}

export interface NotasOmdb {
  /** true se a OMDb encontrou o filme (mesmo que sem todas as notas). */
  encontrado: boolean;
  rt: number | null; // Rotten Tomatoes — crítica (%)
  metacritic: number | null; // 0–100
  imdb: number | null; // 0–10
}

function numeroOuNull(texto: string | undefined): number | null {
  if (!texto || texto === "N/A") return null;
  const n = Number(texto);
  return Number.isFinite(n) ? n : null;
}

function porcentagem(texto: string | undefined): number | null {
  if (!texto || texto === "N/A") return null;
  const n = Number(texto.replace("%", "").trim());
  return Number.isFinite(n) ? n : null;
}

/** Consulta as notas de um filme pelo código IMDb. */
export async function buscarNotas(imdbId: string): Promise<NotasOmdb> {
  const q = new URLSearchParams({ apikey: OMDB_API_KEY, i: imdbId, tomatoes: "false" });
  const d = await buscarJson<RespostaOmdb>(`${BASE}?${q.toString()}`);

  if (d.Response !== "True") {
    return { encontrado: false, rt: null, metacritic: null, imdb: null };
  }

  const rtRaw = d.Ratings?.find((r) => r.Source === "Rotten Tomatoes")?.Value;
  const mcFromRatings = d.Ratings?.find((r) => r.Source === "Metacritic")?.Value; // "72/100"

  const metacritic =
    numeroOuNull(d.Metascore) ?? numeroOuNull(mcFromRatings?.split("/")[0]);

  return {
    encontrado: true,
    rt: porcentagem(rtRaw),
    metacritic,
    imdb: numeroOuNull(d.imdbRating),
  };
}
