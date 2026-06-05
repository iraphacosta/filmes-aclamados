import { useId, useState } from "react";

const CAMINHO_ESTRELA =
  "M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z";

function Estrela({ fill, id }: { fill: number; id: string }) {
  const pct = `${fill * 100}%`;
  return (
    <svg viewBox="0 0 24 24" className="estrela-svg" aria-hidden>
      <defs>
        <linearGradient id={id}>
          <stop offset={pct} stopColor="var(--ambar)" />
          <stop offset={pct} stopColor="transparent" />
        </linearGradient>
      </defs>
      <path d={CAMINHO_ESTRELA} fill={`url(#${id})`} stroke="var(--tinta-3)" strokeWidth="1.2" />
    </svg>
  );
}

/**
 * Nota pessoal em estrelas (0,5 a 5, de meia em meia). Internamente a nota é
 * guardada de 0 a 10 (cada meia estrela = 1 ponto) — compatível com dados antigos.
 */
export function Estrelas({
  nota,
  onDefinir,
}: {
  nota: number | null;
  onDefinir: (nota: number | null) => void;
}) {
  const uid = useId();
  const [hover, setHover] = useState<number | null>(null);

  const valor = nota != null ? nota / 2 : 0; // 0..5
  const base = hover ?? valor;
  const fillDe = (i: number) => (base >= i ? 1 : base >= i - 0.5 ? 0.5 : 0);

  const rotulo = valor > 0 ? (Number.isInteger(valor) ? `${valor}` : valor.toFixed(1)) : "—";

  return (
    <div className="estrelas">
      <div className="estrelas__linha" onMouseLeave={() => setHover(null)}>
        {[1, 2, 3, 4, 5].map((i) => (
          <span className="estrela" key={i}>
            <Estrela fill={fillDe(i)} id={`${uid}-${i}`} />
            <button
              className="estrela__hit estrela__hit--e"
              onMouseEnter={() => setHover(i - 0.5)}
              onClick={() => onDefinir((i - 0.5) * 2)}
              aria-label={`${i - 0.5} de 5 estrelas`}
            />
            <button
              className="estrela__hit estrela__hit--d"
              onMouseEnter={() => setHover(i)}
              onClick={() => onDefinir(i * 2)}
              aria-label={`${i} de 5 estrelas`}
            />
          </span>
        ))}
      </div>
      <span className="estrelas__valor">
        {rotulo}
        <small>/5</small>
      </span>
    </div>
  );
}
