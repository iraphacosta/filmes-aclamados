import { useId } from "react";
import type { RegistroHistorico } from "../dados";

interface Props {
  historico: RegistroHistorico[];
  /** Linha de referência do critério (65). */
  limiar?: number;
}

type Serie = "rt" | "metacritic";

const COR: Record<Serie, string> = {
  rt: "var(--rt)",
  metacritic: "var(--mc)",
};

const L = 0;
const A = 360; // largura do viewBox
const ALT = 80; // altura do viewBox (aspecto fixo → escala uniforme, círculos redondos)
const PAD_T = 8;
const PAD_B = 12;

function pontos(historico: RegistroHistorico[], serie: Serie) {
  const validos = historico
    .map((h, i) => ({ i, v: h[serie] }))
    .filter((p): p is { i: number; v: number } => p.v != null);
  const n = historico.length;
  return validos.map(({ i, v }) => {
    const x = n <= 1 ? A / 2 : L + (i / (n - 1)) * (A - L);
    const y = PAD_T + (1 - v / 100) * (ALT - PAD_T - PAD_B);
    return { x, y, v };
  });
}

function caminho(pts: { x: number; y: number }[]): string {
  return pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
}

export function Sparkline({ historico, limiar = 65 }: Props) {
  const id = useId();
  const yLimiar = PAD_T + (1 - limiar / 100) * (ALT - PAD_T - PAD_B);

  const series: Serie[] = ["rt", "metacritic"];

  return (
    <svg
      className="sparkline"
      viewBox={`0 0 ${A} ${ALT}`}
      role="img"
      aria-label="Evolução das notas ao longo do tempo"
    >
      {/* linha de referência do critério (65) */}
      <line
        x1={0}
        x2={A}
        y1={yLimiar}
        y2={yLimiar}
        className="sparkline-limiar"
        strokeDasharray="3 4"
      />
      {series.map((serie) => {
        const pts = pontos(historico, serie);
        if (pts.length === 0) return null;
        const ultimo = pts[pts.length - 1]!;
        return (
          <g key={serie}>
            {pts.length > 1 && (
              <path
                d={caminho(pts)}
                fill="none"
                stroke={COR[serie]}
                strokeWidth={2.4}
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ filter: `drop-shadow(0 0 3px ${COR[serie]})` }}
              />
            )}
            {pts.map((p, i) => (
              <circle key={`${id}-${serie}-${i}`} cx={p.x} cy={p.y} r={i === pts.length - 1 ? 3.2 : 2} fill={COR[serie]} />
            ))}
            <circle cx={ultimo.x} cy={ultimo.y} r={5.5} fill="none" stroke={COR[serie]} strokeWidth={1.2} opacity={0.5} />
          </g>
        );
      })}
    </svg>
  );
}
