/** Leitura e escrita dos arquivos de dados em /dados. */

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Catalogo, EstadoFila, Filme } from "../../compartilhado/src/index";

// robo/src -> raiz do repositório
const RAIZ = path.resolve(import.meta.dirname, "..", "..");
const DIR_DADOS = path.join(RAIZ, "dados");

export const CAMINHO_CATALOGO = path.join(DIR_DADOS, "catalogo.json");
export const CAMINHO_FILA = path.join(DIR_DADOS, "fila.json");
export const CAMINHO_RADAR = path.join(DIR_DADOS, "radar.json");

async function lerJson<T>(caminho: string, padrao: T): Promise<T> {
  try {
    const texto = await readFile(caminho, "utf8");
    return JSON.parse(texto) as T;
  } catch (erro: unknown) {
    if (typeof erro === "object" && erro && "code" in erro && erro.code === "ENOENT") {
      return padrao; // primeira execução: arquivo ainda não existe
    }
    throw erro;
  }
}

export async function carregarCatalogo(): Promise<Catalogo> {
  return lerJson<Catalogo>(CAMINHO_CATALOGO, {
    versao: 1,
    gerado_em: new Date().toISOString(),
    filmes: [],
  });
}

export async function carregarFila(): Promise<EstadoFila> {
  return lerJson<EstadoFila>(CAMINHO_FILA, {
    versao: 1,
    atualizado_em: new Date().toISOString(),
    fila: [],
  });
}

/** Ordena o feed por data de qualificação (mais recente primeiro). Desempate por data de lançamento. */
function ordenarFeed(filmes: Filme[]): Filme[] {
  return filmes.slice().sort((a, b) => {
    if (a.data_qualificacao !== b.data_qualificacao) {
      return a.data_qualificacao < b.data_qualificacao ? 1 : -1;
    }
    return a.data_lancamento < b.data_lancamento ? 1 : -1;
  });
}

export async function salvarCatalogo(catalogo: Catalogo): Promise<void> {
  const saida: Catalogo = {
    ...catalogo,
    versao: 1,
    gerado_em: new Date().toISOString(),
    filmes: ordenarFeed(catalogo.filmes),
  };
  await writeFile(CAMINHO_CATALOGO, JSON.stringify(saida, null, 2) + "\n", "utf8");
}

export async function salvarFila(estado: EstadoFila): Promise<void> {
  const saida: EstadoFila = {
    ...estado,
    versao: 1,
    atualizado_em: new Date().toISOString(),
  };
  await writeFile(CAMINHO_FILA, JSON.stringify(saida, null, 2) + "\n", "utf8");
}

/** Grava o radar.json (lançamentos recentes na fila, com ficha completa do TMDb). */
export async function salvarRadar(filmes: Filme[]): Promise<void> {
  const saida = { versao: 1, gerado_em: new Date().toISOString(), filmes };
  await writeFile(CAMINHO_RADAR, JSON.stringify(saida, null, 2) + "\n", "utf8");
}
