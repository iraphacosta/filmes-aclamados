import type { ItemRadar } from "../dados";
import { dataMedia, linkImdb, linkLetterboxd } from "../formato";
import { NotaChip } from "./Selos";

/**
 * Radar de lançamentos: filmes recentes que o robô já descobriu, mas que ainda
 * não cruzaram a crítica de 65 — então não estão no feed. Entram sozinhos
 * quando forem aprovados. Os itens vêm da fila (sem pôster/sinopse), por isso a
 * lista é enxuta; o título leva ao Letterboxd.
 */
export function Radar({ itens }: { itens: ItemRadar[] }) {
  return (
    <section className="radar" aria-label="Radar de lançamentos">
      <p className="radar__intro">
        Lançamentos recentes que o robô já encontrou, mas que ainda não têm nota suficiente da crítica
        (Rotten Tomatoes ou Metacritic <strong>≥ 65</strong>). Entram no feed automaticamente assim que forem aprovados.
      </p>

      {itens.length === 0 ? (
        <p className="estado-vazio">Nenhum lançamento recente esperando na fila agora.</p>
      ) : (
        <ul className="radar__lista">
          {itens.map((it) => {
            const temNota = it.rt != null || it.mc != null;
            return (
              <li key={it.tmdb_id} className="radar__item">
                <div className="radar__data">
                  <span className="radar__dia">{dataMedia(it.data_lancamento)}</span>
                  <span className="radar__rotulo">Estreia</span>
                </div>
                <div className="radar__corpo">
                  <a
                    className="radar__titulo"
                    href={linkImdb(it.imdb_id, it.titulo)}
                    target="_blank"
                    rel="noreferrer"
                    title="Ver no IMDb"
                  >
                    {it.titulo}
                  </a>
                  <div className="radar__status">
                    {temNota ? (
                      <>
                        {it.mc != null && <NotaChip tipo="mc" valor={it.mc} compacto />}
                        {it.rt != null && <NotaChip tipo="rt" valor={it.rt} compacto />}
                        <span className="radar__abaixo">ainda abaixo de 65</span>
                      </>
                    ) : (
                      <span className="radar__aguardando">
                        <span className="radar__pulso" aria-hidden />
                        Aguardando crítica
                      </span>
                    )}
                  </div>
                  <a
                    className="radar__letterboxd"
                    href={linkLetterboxd(it.tmdb_id)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Letterboxd ↗
                  </a>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
