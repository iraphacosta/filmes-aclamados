import { useState } from "react";
import type { EstadoDisponibilidade } from "../dados";
import type { Plataforma } from "../plataformas";
import { IconeCheck, IconeFiltro, IconeMarcador } from "./icones";

export type Lista = "todos" | "queroVer" | "assistidos" | "avaliados";
export type Ordenar = "recentes" | "lancamento" | "rt" | "mc" | "imdb" | "minha";
export type Fonte = "rt" | "mc" | "imdb";

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
  ordenar: Ordenar;
  onOrdenar: (o: Ordenar) => void;
  fontes: Fonte[];
  onAlternarFonte: (f: Fonte) => void;
  onde: EstadoDisponibilidade[];
  onAlternarOnde: (e: EstadoDisponibilidade) => void;
  plataformasDisp: Plataforma[];
  plataformasAtivas: string[];
  onAlternarPlataforma: (id: string) => void;
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

const ORDENS: { v: Ordenar; rotulo: string }[] = [
  { v: "recentes", rotulo: "Recentes no feed" },
  { v: "lancamento", rotulo: "Lançamento" },
  { v: "rt", rotulo: "Rotten Tomatoes" },
  { v: "mc", rotulo: "Metacritic" },
  { v: "imdb", rotulo: "IMDb" },
  { v: "minha", rotulo: "Minha nota" },
];

const FONTES: { v: Fonte; rotulo: string; classe: string }[] = [
  { v: "rt", rotulo: "Rotten Tomatoes", classe: "fonte--rt" },
  { v: "mc", rotulo: "Metacritic", classe: "fonte--mc" },
  { v: "imdb", rotulo: "IMDb", classe: "fonte--imdb" },
];

const ONDE: { v: EstadoDisponibilidade; rotulo: string; classe: string }[] = [
  { v: "streaming", rotulo: "Streaming", classe: "onde--streaming" },
  { v: "cinema", rotulo: "No cinema", classe: "onde--cinema" },
  { v: "nao_lancado", rotulo: "Inédito no BR", classe: "onde--inedito" },
];

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
  ordenar,
  onOrdenar,
  fontes,
  onAlternarFonte,
  onde,
  onAlternarOnde,
  plataformasDisp,
  plataformasAtivas,
  onAlternarPlataforma,
}: Props) {
  const [aberto, setAberto] = useState(false);
  const alternarLista = (l: Lista) => onLista(lista === l ? "todos" : l);

  const algumFiltro =
    generoAtivo !== "" ||
    lista !== "todos" ||
    fontes.length > 0 ||
    onde.length > 0 ||
    plataformasAtivas.length > 0 ||
    ordenar !== "recentes";

  const limpar = () => {
    onGenero("");
    onLista("todos");
    onOrdenar("recentes");
    for (const f of fontes) onAlternarFonte(f);
    for (const p of plataformasAtivas) onAlternarPlataforma(p);
    for (const e of onde) onAlternarOnde(e);
  };

  return (
    <div className="barra">
      <div className="barra-linha">
        <label className="busca">
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
            <circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" strokeWidth="1.8" />
            <line x1="16.5" y1="16.5" x2="21" y2="21" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
          <input
            type="search"
            placeholder="Buscar título, diretor, elenco, país…"
            value={busca}
            onChange={(e) => onBusca(e.target.value)}
            aria-label="Buscar"
          />
        </label>

        <button
          className={`filtros-botao ${aberto ? "ativo" : ""}`}
          onClick={() => setAberto((v) => !v)}
          aria-expanded={aberto}
          aria-label="Filtros"
        >
          <IconeFiltro />
          {algumFiltro && <span className="filtros-botao__ponto" aria-hidden />}
        </button>
      </div>

      {aberto && (
        <div className="filtros-painel">
          <div className="grupo-filtro">
            <span className="grupo-filtro__rotulo">Minhas listas</span>
            <div className="grupo-filtro__itens">
              <button
                className={`chip chip-lista--quero ${lista === "queroVer" ? "ativo" : ""}`}
                onClick={() => alternarLista("queroVer")}
                aria-pressed={lista === "queroVer"}
              >
                <IconeMarcador size={14} preenchido={lista === "queroVer"} /> Quero ver
                {totais.queroVer > 0 && <span className="chip__n">{totais.queroVer}</span>}
              </button>
              <button
                className={`chip chip-lista--assistido ${lista === "assistidos" ? "ativo" : ""}`}
                onClick={() => alternarLista("assistidos")}
                aria-pressed={lista === "assistidos"}
              >
                <IconeCheck size={14} preenchido={lista === "assistidos"} /> Assistidos
                {totais.assistidos > 0 && <span className="chip__n">{totais.assistidos}</span>}
              </button>
              <button
                className={`chip chip-lista--avaliado ${lista === "avaliados" ? "ativo" : ""}`}
                onClick={() => alternarLista("avaliados")}
                aria-pressed={lista === "avaliados"}
              >
                ★ Avaliados
                {totais.avaliados > 0 && <span className="chip__n">{totais.avaliados}</span>}
              </button>
            </div>
          </div>

          <div className="grupo-filtro">
            <span className="grupo-filtro__rotulo">Ordenar por</span>
            <div className="grupo-filtro__itens">
              {ORDENS.map((o) => (
                <button
                  key={o.v}
                  className={`chip ${ordenar === o.v ? "ativo" : ""}`}
                  onClick={() => onOrdenar(o.v)}
                  aria-pressed={ordenar === o.v}
                >
                  {o.rotulo}
                </button>
              ))}
            </div>
          </div>

          <div className="grupo-filtro">
            <span className="grupo-filtro__rotulo">Onde assistir</span>
            <div className="grupo-filtro__itens">
              {ONDE.map((o) => (
                <button
                  key={o.v}
                  className={`chip ${o.classe} ${onde.includes(o.v) ? "ativo" : ""}`}
                  onClick={() => onAlternarOnde(o.v)}
                  aria-pressed={onde.includes(o.v)}
                >
                  {o.rotulo}
                </button>
              ))}
            </div>

            {onde.includes("streaming") && plataformasDisp.length > 0 && (
              <div className="subfiltro">
                <span className="subfiltro__rotulo">Plataformas</span>
                <div className="grupo-filtro__itens">
                  {plataformasDisp.map((p) => (
                    <button
                      key={p.id}
                      className={`chip chip--plat ${plataformasAtivas.includes(p.id) ? "ativo" : ""}`}
                      onClick={() => onAlternarPlataforma(p.id)}
                      aria-pressed={plataformasAtivas.includes(p.id)}
                    >
                      {p.rotulo}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="grupo-filtro">
            <span className="grupo-filtro__rotulo">Com nota de</span>
            <div className="grupo-filtro__itens">
              {FONTES.map((f) => (
                <button
                  key={f.v}
                  className={`chip ${f.classe} ${fontes.includes(f.v) ? "ativo" : ""}`}
                  onClick={() => onAlternarFonte(f.v)}
                  aria-pressed={fontes.includes(f.v)}
                >
                  {f.rotulo}
                </button>
              ))}
            </div>
          </div>

          <div className="grupo-filtro grupo-filtro--linha">
            <label className="seletor-genero">
              <span className="seletor-genero__rotulo">Gênero</span>
              <select value={generoAtivo} onChange={(e) => onGenero(e.target.value)} aria-label="Filtrar por gênero">
                <option value="">Todos</option>
                {generos.map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </label>

            <div className="vista-colunas" role="group" aria-label="Colunas de capas">
              {[1, 2, 3].map((n) => (
                <button
                  key={n}
                  className={`vista-opt ${colunas === n ? "ativo" : ""}`}
                  onClick={() => onColunas(n)}
                  title={`${n} ${n === 1 ? "coluna" : "colunas"}`}
                  aria-label={`${n} ${n === 1 ? "coluna" : "colunas"}`}
                  aria-pressed={colunas === n}
                >
                  <IconeColunas n={n} />
                </button>
              ))}
            </div>

            {algumFiltro && (
              <button className="filtros-limpar" onClick={limpar}>
                Limpar filtros
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
