import type { Tema } from "../tema";

function Sol() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden>
      <circle cx="12" cy="12" r="4.2" fill="none" stroke="currentColor" strokeWidth="1.7" />
      <g stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
        <line x1="12" y1="2.5" x2="12" y2="5" />
        <line x1="12" y1="19" x2="12" y2="21.5" />
        <line x1="2.5" y1="12" x2="5" y2="12" />
        <line x1="19" y1="12" x2="21.5" y2="12" />
        <line x1="5.2" y1="5.2" x2="6.9" y2="6.9" />
        <line x1="17.1" y1="17.1" x2="18.8" y2="18.8" />
        <line x1="18.8" y1="5.2" x2="17.1" y2="6.9" />
        <line x1="6.9" y1="17.1" x2="5.2" y2="18.8" />
      </g>
    </svg>
  );
}

function Lua() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden>
      <path d="M20 14.5A8 8 0 0 1 9.5 4 7 7 0 1 0 20 14.5z" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
    </svg>
  );
}

function Sistema() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden>
      <rect x="3" y="4.5" width="18" height="12" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.7" />
      <line x1="9" y1="20" x2="15" y2="20" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

const OPCOES: { v: Tema; rotulo: string; icon: () => JSX.Element }[] = [
  { v: "claro", rotulo: "Claro", icon: Sol },
  { v: "escuro", rotulo: "Escuro", icon: Lua },
  { v: "sistema", rotulo: "Sistema", icon: Sistema },
];

export function TemaToggle({ tema, onTema }: { tema: Tema; onTema: (t: Tema) => void }) {
  return (
    <div className="tema-toggle" role="group" aria-label="Tema">
      {OPCOES.map(({ v, rotulo, icon: Icone }) => (
        <button
          key={v}
          className={`tema-opt ${tema === v ? "ativo" : ""}`}
          onClick={() => onTema(v)}
          title={rotulo}
          aria-label={rotulo}
          aria-pressed={tema === v}
        >
          <Icone />
        </button>
      ))}
    </div>
  );
}
