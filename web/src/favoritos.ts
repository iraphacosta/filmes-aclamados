import { useCallback, useEffect, useState } from "react";

/**
 * Favoritos + nota pessoal (0–10) por filme.
 *
 * Hoje: persistido no localStorage do navegador.
 * Fase 3: trocar a implementação de `lerEstado`/`gravarEstado` por Firebase
 * Firestore (sincroniza entre aparelhos). A interface do hook não muda.
 */

const CHAVE = "filmes-aclamados:dados-pessoais:v1";

export interface DadosPessoais {
  /** tmdb_id dos filmes favoritados. */
  favoritos: number[];
  /** nota pessoal por tmdb_id (0–10). */
  notas: Record<number, number>;
}

const VAZIO: DadosPessoais = { favoritos: [], notas: {} };

function lerEstado(): DadosPessoais {
  try {
    const bruto = localStorage.getItem(CHAVE);
    if (!bruto) return VAZIO;
    const dados = JSON.parse(bruto) as Partial<DadosPessoais>;
    return { favoritos: dados.favoritos ?? [], notas: dados.notas ?? {} };
  } catch {
    return VAZIO;
  }
}

function gravarEstado(dados: DadosPessoais): void {
  try {
    localStorage.setItem(CHAVE, JSON.stringify(dados));
  } catch {
    /* armazenamento indisponível — ignora */
  }
}

export interface ApiPessoal {
  ehFavorito: (tmdbId: number) => boolean;
  alternarFavorito: (tmdbId: number) => void;
  notaDe: (tmdbId: number) => number | null;
  definirNota: (tmdbId: number, nota: number | null) => void;
  totalFavoritos: number;
}

export function useDadosPessoais(): ApiPessoal {
  const [estado, setEstado] = useState<DadosPessoais>(() => lerEstado());

  useEffect(() => {
    gravarEstado(estado);
  }, [estado]);

  const ehFavorito = useCallback(
    (tmdbId: number) => estado.favoritos.includes(tmdbId),
    [estado.favoritos],
  );

  const alternarFavorito = useCallback((tmdbId: number) => {
    setEstado((e) => {
      const jaTem = e.favoritos.includes(tmdbId);
      return {
        ...e,
        favoritos: jaTem
          ? e.favoritos.filter((id) => id !== tmdbId)
          : [...e.favoritos, tmdbId],
      };
    });
  }, []);

  const notaDe = useCallback(
    (tmdbId: number) => (tmdbId in estado.notas ? estado.notas[tmdbId]! : null),
    [estado.notas],
  );

  const definirNota = useCallback((tmdbId: number, nota: number | null) => {
    setEstado((e) => {
      const notas = { ...e.notas };
      if (nota == null) delete notas[tmdbId];
      else notas[tmdbId] = nota;
      return { ...e, notas };
    });
  }, []);

  return {
    ehFavorito,
    alternarFavorito,
    notaDe,
    definirNota,
    totalFavoritos: estado.favoritos.length,
  };
}
