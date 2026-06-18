import type { CriterioQualificacao, Disponibilidade } from "../dados";
import { ROTULO_CRITERIO, resumoDisponibilidade } from "../formato";

type EstadoRT = "rotten" | "fresh" | "certified";

/**
 * Estado do Rotten Tomatoes a partir da nota: Rotten (<60%), Fresh (60–89%) ou
 * Certified Fresh (≥90%). O "Certified Fresh" real depende da contagem de
 * críticas (que não temos), então aqui é uma aproximação pela nota.
 */
function estadoRT(valor: number): EstadoRT {
  if (valor < 60) return "rotten";
  if (valor >= 90) return "certified";
  return "fresh";
}

/** Ícone do Rotten Tomatoes conforme o estado (respingo verde / tomate / tomate com halo). */
function IconeRT({ estado, size = 14 }: { estado: EstadoRT; size?: number }) {
  if (estado === "rotten") {
    return (
      <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden>
        <path
          d="M12 1.5c1.4 0 2 1.6 3.3 1.9 1.3.3 2.6-.8 3.6.2 1 1-.1 2.3.2 3.6.3 1.3 1.9 1.9 1.9 3.3 0 1.4-1.6 2-1.9 3.3-.3 1.3.8 2.6-.2 3.6-1 1-2.3-.1-3.6.2-1.3.3-1.9 1.9-3.3 1.9-1.4 0-2-1.6-3.3-1.9-1.3-.3-2.6.8-3.6-.2-1-1 .1-2.3-.2-3.6-.3-1.3-1.9-1.9-1.9-3.3 0-1.4 1.6-2 1.9-3.3.3-1.3-.8-2.6.2-3.6 1-1 2.3.1 3.6-.2 1.3-.3 1.9-1.9 3.3-1.9z"
          fill="#93c53c"
        />
        <circle cx="12" cy="12" r="3.2" fill="#6fa42a" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden>
      {estado === "certified" && <circle cx="12" cy="12.8" r="11" fill="#f6cb28" />}
      <circle cx="12" cy={estado === "certified" ? 14 : 14.4} r={estado === "certified" ? 6.2 : 7.8} fill="#e23b2e" />
      <path d="M12 8.2c-1.2-2.3-3.9-3-5.7-1.7 1.4 1.7 3.9 2.1 5.7 1.7z" fill="#54a23f" />
      <path d="M12 8.2c1.2-2.3 3.9-3 5.7-1.7-1.4 1.7-3.9 2.1-5.7 1.7z" fill="#54a23f" />
      <path d="M12 5.8v2.6" stroke="#3c7d30" strokeWidth="1.5" strokeLinecap="round" />
      <ellipse cx="9.5" cy="12.4" rx="2" ry="1.3" fill="rgba(255,255,255,0.42)" transform="rotate(-25 9.5 12.4)" />
    </svg>
  );
}

/** Chip de nota com a identidade de cada site (RT tomate, Metacritic caixa, IMDb dourado). */
export function NotaChip({
  tipo,
  valor,
  compacto = false,
  href = null,
}: {
  tipo: "rt" | "mc" | "imdb";
  valor: number | null;
  compacto?: boolean;
  href?: string | null;
}) {
  const nome = tipo === "rt" ? "Rotten Tomatoes" : tipo === "mc" ? "Metacritic" : "IMDb";
  const vazio = valor == null;

  let conteudo;
  if (tipo === "rt") {
    conteudo = (
      <>
        {valor != null && <IconeRT estado={estadoRT(valor)} size={compacto ? 13 : 15} />}
        <span className="nota-chip__valor">{vazio ? "—" : `${valor}%`}</span>
      </>
    );
  } else if (tipo === "mc") {
    const cor = vazio ? "vazio" : valor >= 61 ? "bom" : valor >= 40 ? "medio" : "ruim";
    conteudo = <span className={`mc-box mc-box--${cor}`}>{vazio ? "—" : valor}</span>;
  } else {
    conteudo = (
      <>
        <span className="imdb-badge">IMDb</span>
        <span className="nota-chip__valor">{vazio ? "—" : valor.toFixed(1)}</span>
      </>
    );
  }

  const classe = `nota-chip nota-${tipo} ${compacto ? "nota-chip--compacto" : ""} ${href ? "nota-chip--link" : ""}`;

  if (href) {
    return (
      <a className={classe} href={href} target="_blank" rel="noreferrer" title={`Ver em ${nome}`}>
        {conteudo}
      </a>
    );
  }
  return (
    <span className={classe} title={nome}>
      {conteudo}
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
