interface IconeProps {
  size?: number;
  preenchido?: boolean;
}

/** Check — "assistido". */
export function IconeCheck({ size = 18, preenchido = false }: IconeProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden>
      {preenchido && <circle cx="12" cy="12" r="11" fill="currentColor" opacity="0.18" />}
      <path
        d="M5 12.5l4.2 4.2L19 7"
        fill="none"
        stroke="currentColor"
        strokeWidth={preenchido ? 2.6 : 2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Marcador (bookmark) — "quero ver". */
export function IconeMarcador({ size = 18, preenchido = false }: IconeProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden>
      <path
        d="M6 3.5h12a1 1 0 0 1 1 1V21l-7-4-7 4V4.5a1 1 0 0 1 1-1z"
        fill={preenchido ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Funil — filtros. */
export function IconeFiltro({ size = 16 }: IconeProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden>
      <path
        d="M3.5 5.5h17l-6.5 7.5V19l-4 2v-8L3.5 5.5z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Sino — central de notificações. */
export function IconeSino({ size = 20 }: IconeProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden>
      <path
        d="M6 9a6 6 0 0 1 12 0c0 5 1.5 6.5 1.5 6.5H4.5S6 14 6 9z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path d="M10 19a2 2 0 0 0 4 0" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}
