import { useCallback, useEffect, useMemo, useState } from "react";
import type { Filme } from "./dados";

/**
 * Central de novidades: detecta filmes que entraram no feed desde a última vez
 * que você "viu" as novidades. Estado por aparelho (localStorage).
 *
 * Na primeiríssima visita, marca tudo como visto (badge = 0) — as notificações
 * passam a valer só para o que entrar dali em diante.
 */

const CHAVE = "filmes-aclamados:vistos:v1";

function carregar(): Set<number> | null {
  try {
    const bruto = localStorage.getItem(CHAVE);
    if (!bruto) return null;
    return new Set(JSON.parse(bruto) as number[]);
  } catch {
    return null;
  }
}

function gravar(ids: Set<number>): void {
  try {
    localStorage.setItem(CHAVE, JSON.stringify([...ids]));
  } catch {
    /* ignora */
  }
}

export interface Novidades {
  novos: Filme[];
  marcarVistos: () => void;
}

export function useNovidades(filmes: Filme[]): Novidades {
  const [vistos, setVistos] = useState<Set<number> | null>(() => carregar());

  // Primeira visita: assim que o catálogo chega, registra tudo como visto.
  useEffect(() => {
    if (vistos === null && filmes.length > 0) {
      const ids = new Set(filmes.map((f) => f.tmdb_id));
      gravar(ids);
      setVistos(ids);
    }
  }, [filmes, vistos]);

  const novos = useMemo(() => {
    if (!vistos) return [];
    return filmes.filter((f) => !vistos.has(f.tmdb_id));
  }, [filmes, vistos]);

  const marcarVistos = useCallback(() => {
    const ids = new Set(filmes.map((f) => f.tmdb_id));
    gravar(ids);
    setVistos(ids);
  }, [filmes]);

  return { novos, marcarVistos };
}
