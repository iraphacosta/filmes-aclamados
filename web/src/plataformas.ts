import type { Filme } from "./dados";

/**
 * Subfiltro de "Onde assistir → Streaming": agrupa os provedores do TMDb em
 * plataformas canônicas. Os nomes que vêm do TMDb variam muito
 * ("Amazon Prime Video", "Amazon Prime Video with Ads", "HBO Max Amazon Channel",
 * "Netflix Standard with Ads"…), por isso casamos por um trecho do nome.
 *
 * Importante: "Amazon Video" (aluguel/compra) e "Apple TV Store" (compra) são
 * lojas avulsas e de propósito NÃO entram em Prime Video / Apple TV+.
 */
export interface Plataforma {
  id: string;
  rotulo: string;
  /** Recebe o nome do provedor já em minúsculas e diz se pertence à plataforma. */
  combina: (nomeLower: string) => boolean;
}

const PLATAFORMAS: Plataforma[] = [
  { id: "netflix", rotulo: "Netflix", combina: (n) => n.includes("netflix") },
  { id: "prime", rotulo: "Prime Video", combina: (n) => n.includes("amazon prime video") },
  { id: "disney", rotulo: "Disney+", combina: (n) => n.includes("disney") },
  { id: "max", rotulo: "HBO Max", combina: (n) => n.includes("hbo max") || n === "max" },
  { id: "appletv", rotulo: "Apple TV+", combina: (n) => n.includes("apple tv") && !n.includes("store") },
  { id: "paramount", rotulo: "Paramount+", combina: (n) => n.includes("paramount") },
  { id: "mubi", rotulo: "MUBI", combina: (n) => n.includes("mubi") },
  { id: "telecine", rotulo: "Telecine", combina: (n) => n.includes("telecine") },
  { id: "looke", rotulo: "Looke", combina: (n) => n.includes("looke") },
  { id: "globoplay", rotulo: "Globoplay", combina: (n) => n.includes("globoplay") },
];

/** Ids das plataformas conhecidas que oferecem este filme. */
export function plataformasDoFilme(filme: Filme): string[] {
  const servicos = filme.disponibilidade_br.servicos;
  if (!servicos || servicos.length === 0) return [];
  const ids = new Set<string>();
  for (const s of servicos) {
    const nome = s.nome.toLowerCase();
    for (const p of PLATAFORMAS) if (p.combina(nome)) ids.add(p.id);
  }
  return [...ids];
}

/** Plataformas presentes no catálogo, na ordem canônica — só as que têm filmes. */
export function plataformasDisponiveis(filmes: Filme[]): Plataforma[] {
  const presentes = new Set<string>();
  for (const f of filmes) for (const id of plataformasDoFilme(f)) presentes.add(id);
  return PLATAFORMAS.filter((p) => presentes.has(p.id));
}
