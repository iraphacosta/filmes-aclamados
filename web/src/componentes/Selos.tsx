import type { CriterioQualificacao, Disponibilidade } from "../dados";
import { ROTULO_CRITERIO, resumoDisponibilidade } from "../formato";

/** Tomate do Rotten Tomatoes: vermelho quando "fresh" (≥60%), respingo verde quando "rotten". */
function IconeTomate({ podre, size = 14 }: { podre: boolean; size?: number }) {
  if (podre) {
    return (
      <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden>
        <path
          d="M12 3l1.7 3.6 3.9-.6-2 3.4 2.8 2.7-3.8.8.3 3.9-3.1-2.4-3.1 2.4.3-3.9-3.8-.8 2.8-2.7-2-3.4 3.9.6z"
          fill="#5bbb55"
        />
        <circle cx="12" cy="12" r="2.7" fill="#3e9444" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden>
      <circle cx="12" cy="14" r="8" fill="#e53b2e" />
      <path d="M12 7.6C10.5 4.6 7.6 4.1 6 5.6c1.5 1.5 4 2 6 2z" fill="#4a9d3f" />
      <path d="M12 7.6c1.5-3 4.4-3.5 6-2-1.5 1.5-4 2-6 2z" fill="#4a9d3f" />
      <path d="M12 4.6v3" stroke="#3a7d32" strokeWidth="1.4" strokeLinecap="round" />
      <ellipse cx="9.4" cy="11.6" rx="2.1" ry="1.4" fill="rgba(255,255,255,0.4)" transform="rotate(-25 9.4 11.6)" />
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
        <IconeTomate podre={!vazio && valor < 60} size={compacto ? 13 : 15} />
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
