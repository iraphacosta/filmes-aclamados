import { type CSSProperties, useEffect, useMemo, useState } from "react";
import { AuthControl } from "./componentes/AuthControl";
import { BarraTopo, type Fonte, type Lista, type Ordenar } from "./componentes/BarraTopo";
import { CardFilme } from "./componentes/CardFilme";
import { Detalhe } from "./componentes/Detalhe";
import { NotificacaoCentral } from "./componentes/NotificacaoCentral";
import { ScrollTopo } from "./componentes/ScrollTopo";
import { TemaToggle } from "./componentes/TemaToggle";
import { carregarCatalogo, type Filme } from "./dados";
import { useDadosPessoais } from "./favoritos";
import { useNovidades } from "./novidades";
import { useTema } from "./tema";

const CHAVE_COLUNAS = "filmes-aclamados:colunas";

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

function Masthead({ total, geradoEm }: { total: number; geradoEm: string | null }) {
  const data = geradoEm ? new Date(geradoEm).toLocaleDateString("pt-BR") : null;
  return (
    <header className="masthead">
      <div className="masthead__topo">
        <span className="masthead__filete">desde 2025 · crítica ≥ 65</span>
      </div>
      <h1 className="masthead__nome">Aclamados</h1>
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

export function App() {
  const [filmes, setFilmes] = useState<Filme[]>([]);
  const [geradoEm, setGeradoEm] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const [busca, setBusca] = useState("");
  const [genero, setGenero] = useState("");
  const [lista, setLista] = useState<Lista>("todos");
  const [ordenar, setOrdenar] = useState<Ordenar>("recentes");
  const [fontes, setFontes] = useState<Fonte[]>([]);
  const [abertoId, setAbertoId] = useState<number | null>(null);
  const [colunas, setColunas] = useState<number>(() => lerColunas());
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

  const generos = useMemo(() => {
    const set = new Set<string>();
    for (const f of filmes) for (const g of f.generos) set.add(g);
    return [...set].sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [filmes]);

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return filmes.filter((f) => {
      if (lista === "queroVer" && !pessoal.querVer(f.tmdb_id)) return false;
      if (lista === "assistidos" && !pessoal.ehAssistido(f.tmdb_id)) return false;
      if (lista === "avaliados" && pessoal.notaDe(f.tmdb_id) == null) return false;
      if (fontes.includes("rt") && scoreRt(f) == null) return false;
      if (fontes.includes("mc") && scoreMc(f) == null) return false;
      if (fontes.includes("imdb") && f.imdb_publico == null) return false;
      if (genero && !f.generos.includes(genero)) return false;
      if (termo) {
        const alvo = `${f.titulo_original} ${f.titulo_ingles}`.toLowerCase();
        if (!alvo.includes(termo)) return false;
      }
      return true;
    });
  }, [filmes, busca, genero, lista, fontes, pessoal]);

  const ordenado = useMemo(() => {
    const arr = filtrados.slice();
    if (ordenar === "rt") arr.sort(porNotaDesc(scoreRt));
    else if (ordenar === "mc") arr.sort(porNotaDesc(scoreMc));
    else if (ordenar === "imdb") arr.sort(porNotaDesc((f) => f.imdb_publico));
    else if (ordenar === "minha") arr.sort(porNotaDesc((f) => pessoal.notaDe(f.tmdb_id)));
    // "recentes": mantém a ordem do catálogo (data de qualificação desc)
    return arr;
  }, [filtrados, ordenar, pessoal]);

  const aberto = abertoId != null ? filmes.find((f) => f.tmdb_id === abertoId) ?? null : null;

  return (
    <div className="app">
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
        />

        {carregando && <p className="estado-vazio">Carregando o feed…</p>}
        {erro && <p className="estado-vazio estado-erro">{erro}</p>}

        {!carregando && !erro && ordenado.length === 0 && (
          <p className="estado-vazio">{VAZIO_MSG[lista]}</p>
        )}

        <main className="feed" style={{ "--colunas": colunas } as CSSProperties}>
          {ordenado.map((filme, i) => (
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
