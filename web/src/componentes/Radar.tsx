import type { Filme } from "../dados";
import { dataMedia } from "../formato";
import { NotaChip } from "./Selos";

/**
 * Radar de lançamentos: filmes recentes que o robô já descobriu (com ficha
 * completa do TMDb), mas que ainda não cruzaram a crítica de 65. Clicar no
 * pôster ou no título abre a mesma ficha dos aclamados.
 */
export function Radar({ filmes, onAbrir }: { filmes: Filme[]; onAbrir: (tmdbId: number) => void }) {
  return (
    <section className="radar" aria-label="Radar de lançamentos">
      <p className="radar__intro">
        Lançamentos recentes que o robô já encontrou, mas que ainda não têm nota suficiente da crítica
        (Rotten Tomatoes ou Metacritic <strong>≥ 65</strong>). Entram no feed automaticamente assim que forem aprovados.
      </p>

      {filmes.length === 0 ? (
        <p className="estado-vazio">Nenhum lançamento recente esperando na fila agora.</p>
      ) : (
        <ul className="radar__lista">
          {filmes.map((f) => {
            const rt = f.atual_rt ?? f.rt_critica;
            const mc = f.atual_metacritic ?? f.metacritic;
            const temNota = rt != null || mc != null;
            return (
              <li key={f.tmdb_id} className="radar__item">
                <button
                  className="radar__capa"
                  onClick={() => onAbrir(f.tmdb_id)}
                  aria-label={`Abrir ${f.titulo_original}`}
                >
                  {f.poster_url ? (
                    <img src={f.poster_url} alt={`Pôster de ${f.titulo_original}`} loading="lazy" />
                  ) : (
                    <span className="radar__capa-fb">{f.titulo_original.charAt(0)}</span>
                  )}
                </button>

                <div className="radar__corpo">
                  <button className="radar__titulo" onClick={() => onAbrir(f.tmdb_id)}>
                    {f.titulo_original}
                  </button>
                  <p className="radar__estreia">
                    <span className="radar__estreia-rotulo">Estreia</span> {dataMedia(f.data_lancamento)}
                  </p>
                  <div className="radar__status">
                    {temNota ? (
                      <>
                        {mc != null && <NotaChip tipo="mc" valor={mc} compacto />}
                        {rt != null && <NotaChip tipo="rt" valor={rt} compacto />}
                        <span className="radar__abaixo">ainda abaixo de 65</span>
                      </>
                    ) : (
                      <span className="radar__aguardando">
                        <span className="radar__pulso" aria-hidden />
                        Aguardando crítica
                      </span>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
