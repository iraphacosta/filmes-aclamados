import { type CSSProperties, useEffect, useMemo, useState } from "react";
import { AuthControl } from "./componentes/AuthControl";
import { BarraTopo, type Fonte, type Lista, type Ordenar } from "./componentes/BarraTopo";
import { CardFilme } from "./componentes/CardFilme";
import { Detalhe } from "./componentes/Detalhe";
import { NotificacaoCentral } from "./componentes/NotificacaoCentral";
import { Radar } from "./componentes/Radar";
import { ScrollTopo } from "./componentes/ScrollTopo";
import { TemaToggle } from "./componentes/TemaToggle";
import { carregarCatalogo, carregarRadar, type EstadoDisponibilidade, type Filme } from "./dados";
import { nomePais } from "./formato";
import { plataformasDisponiveis, plataformasDoFilme } from "./plataformas";
import { useDadosPessoais } from "./favoritos";
import { useNovidades } from "./novidades";
import { useTema } from "./tema";

const CHAVE_COLUNAS = "filmes-aclamados:colunas";
const POR_PAGINA = 50;

function lerColunas(): number {
  const v = Number(localStorage.getItem(CHAVE_COLUNAS));
  if (v === 1 || v === 2 || v === 3) return v;
  return typeof window !== "undefined" && window.innerWidth < 640 ? 1 : 3;
}

const scoreRt = (f: Filme) => f.atual_rt ?? f.rt_critica;
const scoreMc = (f: Filme) => f.atual_metacritic ?? f.metacritic;

/** Comparador decrescente que joga valores nulos para o fim. */
function porNotaDesc(get: (f: Filme) => number | null) {
  return (a: Filme, b: Filme) => {
    const va = get(a);
    const vb = get(b);
    if (va == null && vb == null) return 0;
    if (va == null) return 1;
    if (vb == null) return -1;
    return vb - va;
  };
}

/** Comparador por data (YYYY-MM-DD) decrescente. */
function porDataDesc(get: (f: Filme) => string) {
  return (a: Filme, b: Filme) => {
    const va = get(a);
    const vb = get(b);
    return va < vb ? 1 : va > vb ? -1 : 0;
  };
}

function Masthead({ total, geradoEm }: { total: number; geradoEm: string | null }) {
  const data = geradoEm ? new Date(geradoEm).toLocaleDateString("pt-BR") : null;
  return (
    <header className="masthead">
      <div className="masthead__topo">
        <span className="masthead__filete">desde 2025 · crítica ≥ 65</span>
      </div>
      <h1 className="masthead__nome">
        <img
          className="masthead__logo"
          src={`${import.meta.env.BASE_URL}logo.png`}
          alt="Filmes Aclamados"
          width={1024}
          height={683}
        />
      </h1>
      <p className="masthead__tagline">
        Um diário dos filmes que a crítica aprovou — Rotten Tomatoes e Metacritic, todos os dias.
      </p>
      <div className="masthead__meta">
        <span>{total} {total === 1 ? "filme" : "filmes"} no feed</span>
        {data && <span>· atualizado em {data}</span>}
      </div>
    </header>
  );
}

const VAZIO_MSG: Record<Lista, string> = {
  todos: "Nenhum filme encontrado com esses filtros.",
  queroVer: "Sua lista de “quero ver” está vazia. Marque filmes com o 🔖 na capa.",
  assistidos: "Você ainda não marcou nenhum filme como assistido.",
  avaliados: "Você ainda não avaliou nenhum filme. Abra um filme e dê sua nota.",
};

/** Sequência de páginas a exibir, com reticências entre saltos (1 … 4 5 6 … 12). */
function janelaPaginas(atual: number, total: number): (number | "…")[] {
  const marcadas = new Set([1, total, atual, atual - 1, atual + 1]);
  const lista = [...marcadas].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
  const saida: (number | "…")[] = [];
  let anterior = 0;
  for (const p of lista) {
    if (p - anterior > 1) saida.push("…");
    saida.push(p);
    anterior = p;
  }
  return saida;
}

function Paginacao({
  atual,
  total,
  inicio,
  fim,
  totalFilmes,
  onIr,
}: {
  atual: number;
  total: number;
  inicio: number;
  fim: number;
  totalFilmes: number;
  onIr: (n: number) => void;
}) {
  if (total <= 1) return null;
  return (
    <nav className="paginacao" aria-label="Paginação">
      <p className="paginacao__resumo">
        {inicio}–{fim} de {totalFilmes} filmes
      </p>
      <div className="paginacao__controles">
        <button
          className="paginacao__seta"
          onClick={() => onIr(atual - 1)}
          disabled={atual <= 1}
          aria-label="Página anterior"
        >
          ‹
        </button>
        {janelaPaginas(atual, total).map((it, i) =>
          it === "…" ? (
            <span key={`elipse-${i}`} className="paginacao__elipse" aria-hidden>
              …
            </span>
          ) : (
            <button
              key={it}
              className={`paginacao__num ${it === atual ? "ativo" : ""}`}
              onClick={() => onIr(it)}
              aria-current={it === atual ? "page" : undefined}
              aria-label={`Página ${it}`}
            >
              {it}
            </button>
          ),
        )}
        <button
          className="paginacao__seta"
          onClick={() => onIr(atual + 1)}
          disabled={atual >= total}
          aria-label="Próxima página"
        >
          ›
        </button>
      </div>
    </nav>
  );
}

export function App() {
  const [filmes, setFilmes] = useState<Filme[]>([]);
  const [geradoEm, setGeradoEm] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [radar, setRadar] = useState<Filme[]>([]);
  const [aba, setAba] = useState<"feed" | "radar">("feed");

  const [busca, setBusca] = useState("");
  const [genero, setGenero] = useState("");
  const [lista, setLista] = useState<Lista>("todos");
  const [ordenar, setOrdenar] = useState<Ordenar>("recentes");
  const [fontes, setFontes] = useState<Fonte[]>([]);
  const [onde, setOnde] = useState<EstadoDisponibilidade[]>([]);
  const [plataformas, setPlataformas] = useState<string[]>([]);
  const [abertoId, setAbertoId] = useState<number | null>(null);
  const [colunas, setColunas] = useState<number>(() => lerColunas());
  const [pagina, setPagina] = useState(1);
  const [rolou, setRolou] = useState(false);

  const pessoal = useDadosPessoais();
  const novidades = useNovidades(filmes);
  const { tema, setTema } = useTema();

  useEffect(() => {
    carregarCatalogo()
      .then(({ filmes, geradoEm }) => {
        setFilmes(filmes);
        setGeradoEm(geradoEm);
      })
      .catch((e: unknown) => setErro(e instanceof Error ? e.message : String(e)))
      .finally(() => setCarregando(false));
  }, []);

  useEffect(() => {
    carregarRadar().then(({ filmes }) => setRadar(filmes)).catch(() => {});
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(CHAVE_COLUNAS, String(colunas));
    } catch {
      /* ignora */
    }
  }, [colunas]);

  useEffect(() => {
    const aoRolar = () => setRolou(window.scrollY > 320);
    window.addEventListener("scroll", aoRolar, { passive: true });
    aoRolar();
    return () => window.removeEventListener("scroll", aoRolar);
  }, []);

  const alternarFonte = (f: Fonte) =>
    setFontes((fs) => (fs.includes(f) ? fs.filter((x) => x !== f) : [...fs, f]));

  const alternarOnde = (e: EstadoDisponibilidade) => {
    setOnde((arr) => (arr.includes(e) ? arr.filter((x) => x !== e) : [...arr, e]));
    // Saiu do streaming → as plataformas deixam de fazer sentido.
    if (e === "streaming" && onde.includes("streaming")) setPlataformas([]);
  };

  const alternarPlataforma = (id: string) =>
    setPlataformas((arr) => (arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id]));

  const generos = useMemo(() => {
    const set = new Set<string>();
    for (const f of filmes) for (const g of f.generos) set.add(g);
    return [...set].sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [filmes]);

  const plataformasDisp = useMemo(() => plataformasDisponiveis(filmes), [filmes]);

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return filmes.filter((f) => {
      if (lista === "queroVer" && !pessoal.querVer(f.tmdb_id)) return false;
      if (lista === "assistidos" && !pessoal.ehAssistido(f.tmdb_id)) return false;
      if (lista === "avaliados" && pessoal.notaDe(f.tmdb_id) == null) return false;
      if (fontes.includes("rt") && scoreRt(f) == null) return false;
      if (fontes.includes("mc") && scoreMc(f) == null) return false;
      if (fontes.includes("imdb") && f.imdb_publico == null) return false;
      if (onde.length > 0 && !onde.includes(f.disponibilidade_br.estado)) return false;
      if (plataformas.length > 0) {
        const ids = plataformasDoFilme(f);
        if (!plataformas.some((p) => ids.includes(p))) return false;
      }
      if (genero && !f.generos.includes(genero)) return false;
      if (termo) {
        const alvo = [
          f.titulo_original,
          f.titulo_ingles,
          f.diretor,
          f.elenco.join(" "),
          f.generos.join(" "),
          String(f.ano),
          (f.pais ?? []).map(nomePais).join(" "),
        ]
          .join(" ")
          .toLowerCase();
        if (!alvo.includes(termo)) return false;
      }
      return true;
    });
  }, [filmes, busca, genero, lista, fontes, onde, plataformas, pessoal]);

  const ordenado = useMemo(() => {
    const arr = filtrados.slice();
    if (ordenar === "rt") arr.sort(porNotaDesc(scoreRt));
    else if (ordenar === "mc") arr.sort(porNotaDesc(scoreMc));
    else if (ordenar === "imdb") arr.sort(porNotaDesc((f) => f.imdb_publico));
    else if (ordenar === "minha") arr.sort(porNotaDesc((f) => pessoal.notaDe(f.tmdb_id)));
    else if (ordenar === "lancamento") arr.sort(porDataDesc((f) => f.data_lancamento));
    // "recentes": mantém a ordem do catálogo (data de qualificação desc)
    return arr;
  }, [filtrados, ordenar, pessoal]);

  // Sempre que filtros/ordenação mudam, volta para a primeira página.
  useEffect(() => {
    setPagina(1);
  }, [busca, genero, lista, ordenar, fontes, onde, plataformas]);

  const totalPaginas = Math.max(1, Math.ceil(ordenado.length / POR_PAGINA));
  const paginaAtual = Math.min(pagina, totalPaginas);
  const visiveis = ordenado.slice((paginaAtual - 1) * POR_PAGINA, paginaAtual * POR_PAGINA);
  const inicio = ordenado.length === 0 ? 0 : (paginaAtual - 1) * POR_PAGINA + 1;
  const fim = Math.min(paginaAtual * POR_PAGINA, ordenado.length);

  const irParaPagina = (n: number) => {
    setPagina(Math.min(Math.max(1, n), totalPaginas));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const aberto =
    abertoId != null
      ? (filmes.find((f) => f.tmdb_id === abertoId) ?? radar.find((f) => f.tmdb_id === abertoId) ?? null)
      : null;
  // Filme do radar (ainda não no feed): a ficha esconde as seções de qualificação.
  const abertoEhRadar = aberto != null && !filmes.some((f) => f.tmdb_id === aberto.tmdb_id);

  return (
    <div className="app">
      <div className="sol" aria-hidden />
      <div className="grao" aria-hidden />
      <div className="vinheta" aria-hidden />

      <div className="container">
        <div className="topo-conta">
          <TemaToggle tema={tema} onTema={setTema} />
          <NotificacaoCentral
            novos={novidades.novos}
            onAbrir={(id) => setAbertoId(id)}
            marcarVistos={novidades.marcarVistos}
          />
          <AuthControl
            usuario={pessoal.usuario}
            carregando={pessoal.carregandoAuth}
            sincronizando={pessoal.sincronizando}
            onEntrar={pessoal.entrar}
            onSair={pessoal.sair}
          />
        </div>
        <Masthead total={filmes.length} geradoEm={geradoEm} />

        <nav className="abas" role="tablist" aria-label="Seções">
          <button
            className={`aba ${aba === "feed" ? "ativo" : ""}`}
            role="tab"
            aria-selected={aba === "feed"}
            onClick={() => setAba("feed")}
          >
            Aclamados
          </button>
          <button
            className={`aba ${aba === "radar" ? "ativo" : ""}`}
            role="tab"
            aria-selected={aba === "radar"}
            onClick={() => setAba("radar")}
          >
            Radar
            {radar.length > 0 && <span className="aba__n">{radar.length}</span>}
          </button>
        </nav>

        {aba === "radar" && <Radar filmes={radar} onAbrir={(id) => setAbertoId(id)} />}

        {aba === "feed" && (
          <>
            <BarraTopo
              busca={busca}
              onBusca={setBusca}
              generos={generos}
              generoAtivo={genero}
              onGenero={setGenero}
              lista={lista}
              onLista={setLista}
              totais={pessoal.totais}
              colunas={colunas}
              onColunas={setColunas}
              ordenar={ordenar}
              onOrdenar={setOrdenar}
              fontes={fontes}
              onAlternarFonte={alternarFonte}
              onde={onde}
              onAlternarOnde={alternarOnde}
              plataformasDisp={plataformasDisp}
              plataformasAtivas={plataformas}
              onAlternarPlataforma={alternarPlataforma}
            />

            {carregando && <p className="estado-vazio">Carregando o feed…</p>}
            {erro && <p className="estado-vazio estado-erro">{erro}</p>}

            {!carregando && !erro && ordenado.length === 0 && (
              <p className="estado-vazio">{VAZIO_MSG[lista]}</p>
            )}

            <main
              className={`feed ${colunas === 3 ? "feed--3col" : ""}`}
              style={{ "--colunas": colunas } as CSSProperties}
            >
              {visiveis.map((filme, i) => (
                <CardFilme
                  key={filme.tmdb_id}
                  filme={filme}
                  indice={i}
                  ehAssistido={pessoal.ehAssistido(filme.tmdb_id)}
                  querVer={pessoal.querVer(filme.tmdb_id)}
                  onAbrir={() => setAbertoId(filme.tmdb_id)}
                  onAlternarAssistido={() => pessoal.alternarAssistido(filme.tmdb_id)}
                  onAlternarQueroVer={() => pessoal.alternarQueroVer(filme.tmdb_id)}
                />
              ))}
            </main>

            <Paginacao
              atual={paginaAtual}
              total={totalPaginas}
              inicio={inicio}
              fim={fim}
              totalFilmes={ordenado.length}
              onIr={irParaPagina}
            />
          </>
        )}

        <footer className="rodape">
          <p>
            Notas via OMDb (Rotten Tomatoes · Metacritic · IMDb) e metadados via TMDb. Projeto pessoal.
          </p>
        </footer>
      </div>

      <ScrollTopo visivel={rolou} />

      {aberto && (
        <Detalhe
          filme={aberto}
          radar={abertoEhRadar}
          ehAssistido={pessoal.ehAssistido(aberto.tmdb_id)}
          querVer={pessoal.querVer(aberto.tmdb_id)}
          nota={pessoal.notaDe(aberto.tmdb_id)}
          onFechar={() => setAbertoId(null)}
          onAlternarAssistido={() => pessoal.alternarAssistido(aberto.tmdb_id)}
          onAlternarQueroVer={() => pessoal.alternarQueroVer(aberto.tmdb_id)}
          onDefinirNota={(n) => pessoal.definirNota(aberto.tmdb_id, n)}
        />
      )}
    </div>
  );
}
