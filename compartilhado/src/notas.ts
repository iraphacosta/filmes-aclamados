/**
 * Lógica pura de notas — compartilhada entre robô e front-end.
 * Sem dependências externas, para rodar igual no Node (tsx) e no navegador (Vite).
 */

import { NOTA_MINIMA, type CriterioQualificacao, type RegistroHistorico } from "./tipos";

/** Verdadeiro se as notas cruzam o critério de ENTRADA (RT ≥ 65 OU Metacritic ≥ 65). */
export function qualifica(rt: number | null, metacritic: number | null): boolean {
  return (rt != null && rt >= NOTA_MINIMA) || (metacritic != null && metacritic >= NOTA_MINIMA);
}

/** Qual critério fez o filme entrar (só RT, só Metacritic, ou ambos). */
export function criterioDeEntrada(
  rt: number | null,
  metacritic: number | null,
): CriterioQualificacao {
  const passaRt = rt != null && rt >= NOTA_MINIMA;
  const passaMc = metacritic != null && metacritic >= NOTA_MINIMA;
  if (passaRt && passaMc) return "ambos";
  if (passaRt) return "rt";
  return "metacritic";
}

/** Maior valor não-nulo de uma coluna do histórico (pico). */
function pico(historico: RegistroHistorico[], campo: "rt" | "metacritic"): number | null {
  const valores = historico.map((h) => h[campo]).filter((v): v is number => v != null);
  return valores.length ? Math.max(...valores) : null;
}

/** Valor mais recente não-nulo de uma coluna do histórico (atual). */
function atual(historico: RegistroHistorico[], campo: "rt" | "metacritic"): number | null {
  for (let i = historico.length - 1; i >= 0; i--) {
    const registro = historico[i];
    if (registro && registro[campo] != null) return registro[campo];
  }
  return null;
}

export interface DerivadosNotas {
  pico_rt: number | null;
  pico_metacritic: number | null;
  atual_rt: number | null;
  atual_metacritic: number | null;
}

/** Recalcula pico × atual de RT e Metacritic a partir do histórico. */
export function derivarNotas(historico: RegistroHistorico[]): DerivadosNotas {
  return {
    pico_rt: pico(historico, "rt"),
    pico_metacritic: pico(historico, "metacritic"),
    atual_rt: atual(historico, "rt"),
    atual_metacritic: atual(historico, "metacritic"),
  };
}
