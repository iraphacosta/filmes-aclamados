import type { CriterioQualificacao, Disponibilidade } from "../dados";
import { ROTULO_CRITERIO, resumoDisponibilidade } from "../formato";

/** Chip de nota colorido (RT crítica / Metacritic / IMDb). */
export function NotaChip({
  tipo,
  valor,
  compacto = false,
}: {
  tipo: "rt" | "mc" | "imdb";
  valor: number | null;
  compacto?: boolean;
}) {
  const rotulo = tipo === "rt" ? "RT" : tipo === "mc" ? "MC" : "IMDb";
  const sufixo = tipo === "rt" ? "%" : tipo === "imdb" ? "" : "";
  const texto = valor == null ? "—" : `${valor}${sufixo}`;
  return (
    <span
      className={`nota-chip nota-${tipo} ${compacto ? "nota-chip--compacto" : ""}`}
      title={tipo === "rt" ? "Rotten Tomatoes (crítica)" : tipo === "mc" ? "Metacritic" : "IMDb (público)"}
    >
      <span className="nota-chip__rotulo">{rotulo}</span>
      <span className="nota-chip__valor">{texto}</span>
    </span>
  );
}

/** Selo de critério de qualificação, em forma de canhoto de ingresso. */
export function SeloCriterio({ criterio }: { criterio: CriterioQualificacao }) {
  return (
    <span className={`selo-criterio selo-criterio--${criterio}`} title="Como este filme entrou no feed">
      <span className="selo-criterio__furo selo-criterio__furo--e" aria-hidden />
      <span className="selo-criterio__texto">{ROTULO_CRITERIO[criterio]}</span>
      <span className="selo-criterio__furo selo-criterio__furo--d" aria-hidden />
    </span>
  );
}

/** Indicador curto do estado de disponibilidade no Brasil. */
export function SeloDisponibilidade({ disp }: { disp: Disponibilidade }) {
  return (
    <span className={`selo-disp selo-disp--${disp.estado}`}>
      <span className="selo-disp__ponto" aria-hidden />
      {resumoDisponibilidade(disp)}
    </span>
  );
}
