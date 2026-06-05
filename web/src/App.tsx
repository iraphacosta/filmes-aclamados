import { useEffect, useMemo, useState } from "react";
import { BarraTopo } from "./componentes/BarraTopo";
import { CardFilme } from "./componentes/CardFilme";
import { Detalhe } from "./componentes/Detalhe";
import { carregarCatalogo, type Filme } from "./dados";
import { useDadosPessoais } from "./favoritos";

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

export function App() {
  const [filmes, setFilmes] = useState<Filme[]>([]);
  const [geradoEm, setGeradoEm] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const [busca, setBusca] = useState("");
  const [genero, setGenero] = useState("");
  const [soFavoritos, setSoFavoritos] = useState(false);
  const [abertoId, setAbertoId] = useState<number | null>(null);

  const pessoal = useDadosPessoais();

  useEffect(() => {
    carregarCatalogo()
      .then(({ filmes, geradoEm }) => {
        setFilmes(filmes);
        setGeradoEm(geradoEm);
      })
      .catch((e: unknown) => setErro(e instanceof Error ? e.message : String(e)))
      .finally(() => setCarregando(false));
  }, []);

  const generos = useMemo(() => {
    const set = new Set<string>();
    for (const f of filmes) for (const g of f.generos) set.add(g);
    return [...set].sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [filmes]);

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return filmes.filter((f) => {
      if (soFavoritos && !pessoal.ehFavorito(f.tmdb_id)) return false;
      if (genero && !f.generos.includes(genero)) return false;
      if (termo) {
        const alvo = `${f.titulo_original} ${f.titulo_ingles}`.toLowerCase();
        if (!alvo.includes(termo)) return false;
      }
      return true;
    });
  }, [filmes, busca, genero, soFavoritos, pessoal]);

  const aberto = abertoId != null ? filmes.find((f) => f.tmdb_id === abertoId) ?? null : null;

  return (
    <div className="app">
      <div className="grao" aria-hidden />
      <div className="vinheta" aria-hidden />

      <div className="container">
        <Masthead total={filmes.length} geradoEm={geradoEm} />

        <BarraTopo
          busca={busca}
          onBusca={setBusca}
          generos={generos}
          generoAtivo={genero}
          onGenero={setGenero}
          soFavoritos={soFavoritos}
          onToggleFavoritos={() => setSoFavoritos((v) => !v)}
          totalFavoritos={pessoal.totalFavoritos}
        />

        {carregando && <p className="estado-vazio">Carregando o feed…</p>}
        {erro && <p className="estado-vazio estado-erro">{erro}</p>}

        {!carregando && !erro && filtrados.length === 0 && (
          <p className="estado-vazio">
            {soFavoritos
              ? "Você ainda não favoritou nenhum filme."
              : "Nenhum filme encontrado com esses filtros."}
          </p>
        )}

        <main className="feed">
          {filtrados.map((filme, i) => (
            <CardFilme
              key={filme.tmdb_id}
              filme={filme}
              indice={i}
              ehFavorito={pessoal.ehFavorito(filme.tmdb_id)}
              onAbrir={() => setAbertoId(filme.tmdb_id)}
              onAlternarFavorito={() => pessoal.alternarFavorito(filme.tmdb_id)}
            />
          ))}
        </main>

        <footer className="rodape">
          <p>
            Notas via OMDb (Rotten Tomatoes · Metacritic · IMDb) e metadados via TMDb. Projeto pessoal.
          </p>
        </footer>
      </div>

      {aberto && (
        <Detalhe
          filme={aberto}
          ehFavorito={pessoal.ehFavorito(aberto.tmdb_id)}
          nota={pessoal.notaDe(aberto.tmdb_id)}
          onFechar={() => setAbertoId(null)}
          onAlternarFavorito={() => pessoal.alternarFavorito(aberto.tmdb_id)}
          onDefinirNota={(n) => pessoal.definirNota(aberto.tmdb_id, n)}
        />
      )}
    </div>
  );
}
