import { IconeCheck, IconeMarcador } from "./icones";

export type Lista = "todos" | "queroVer" | "assistidos" | "avaliados";

interface Props {
  busca: string;
  onBusca: (v: string) => void;
  generos: string[];
  generoAtivo: string;
  onGenero: (g: string) => void;
  lista: Lista;
  onLista: (l: Lista) => void;
  totais: { queroVer: number; assistidos: number; avaliados: number };
  colunas: number;
  onColunas: (n: number) => void;
  condensada: boolean;
}

function IconeColunas({ n }: { n: number }) {
  const gap = 2.2;
  const area = 20;
  const w = (area - gap * (n - 1)) / n;
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden>
      {Array.from({ length: n }).map((_, i) => (
        <rect key={i} x={2 + i * (w + gap)} y="5" width={w} height="14" rx="1" fill="currentColor" />
      ))}
    </svg>
  );
}

export function BarraTopo({
  busca,
  onBusca,
  generos,
  generoAtivo,
  onGenero,
  lista,
  onLista,
  totais,
  colunas,
  onColunas,
  condensada,
}: Props) {
  const alternar = (l: Lista) => onLista(lista === l ? "todos" : l);

  return (
    <div className={`barra ${condensada ? "barra--condensada" : ""}`}>
      <label className="busca">
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
          <circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" strokeWidth="1.8" />
          <line x1="16.5" y1="16.5" x2="21" y2="21" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
        <input
          type="search"
          placeholder="Buscar por título…"
          value={busca}
          onChange={(e) => onBusca(e.target.value)}
          aria-label="Buscar por título"
        />
      </label>

      <div className="filtros">
        <label className="seletor-genero">
          <span className="seletor-genero__rotulo">Gênero</span>
          <select value={generoAtivo} onChange={(e) => onGenero(e.target.value)} aria-label="Filtrar por gênero">
            <option value="">Todos</option>
            {generos.map((g) => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
        </label>

        <div className="listas" role="group" aria-label="Minhas listas">
          <button
            className={`chip-lista chip-lista--quero ${lista === "queroVer" ? "ativo" : ""}`}
            onClick={() => alternar("queroVer")}
            aria-pressed={lista === "queroVer"}
          >
            <IconeMarcador size={15} preenchido={lista === "queroVer"} />
            Quero ver
            {totais.queroVer > 0 && <span className="chip-lista__n">{totais.queroVer}</span>}
          </button>
          <button
            className={`chip-lista chip-lista--assistido ${lista === "assistidos" ? "ativo" : ""}`}
            onClick={() => alternar("assistidos")}
            aria-pressed={lista === "assistidos"}
          >
            <IconeCheck size={15} preenchido={lista === "assistidos"} />
            Assistidos
            {totais.assistidos > 0 && <span className="chip-lista__n">{totais.assistidos}</span>}
          </button>
          <button
            className={`chip-lista chip-lista--avaliado ${lista === "avaliados" ? "ativo" : ""}`}
            onClick={() => alternar("avaliados")}
            aria-pressed={lista === "avaliados"}
          >
            ★ Avaliados
            {totais.avaliados > 0 && <span className="chip-lista__n">{totais.avaliados}</span>}
          </button>
        </div>

        <div className="vista-colunas" role="group" aria-label="Colunas de capas">
          {[2, 3, 4].map((n) => (
            <button
              key={n}
              className={`vista-opt ${colunas === n ? "ativo" : ""}`}
              onClick={() => onColunas(n)}
              title={`${n} colunas`}
              aria-label={`${n} colunas`}
              aria-pressed={colunas === n}
            >
              <IconeColunas n={n} />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
