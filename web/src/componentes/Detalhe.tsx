import { useEffect } from "react";
import type { Filme } from "../dados";
import { ROTULO_DISPONIBILIDADE, dataLonga } from "../formato";
import { NotaChip, SeloCriterio } from "./Selos";
import { Sparkline } from "./Sparkline";

interface Props {
  filme: Filme;
  ehFavorito: boolean;
  nota: number | null;
  onFechar: () => void;
  onAlternarFavorito: () => void;
  onDefinirNota: (nota: number | null) => void;
}

/** Bloco "estreou em X, hoje Y" com números grandes. */
function PicoAtual({
  rotulo,
  pico,
  atual,
  sufixo,
  classe,
}: {
  rotulo: string;
  pico: number | null;
  atual: number | null;
  sufixo: string;
  classe: string;
}) {
  if (pico == null && atual == null) return null;
  const delta = pico != null && atual != null ? atual - pico : 0;
  const seta = delta < 0 ? "▾" : delta > 0 ? "▴" : "—";
  return (
    <div className={`veredito ${classe}`}>
      <span className="veredito__rotulo">{rotulo}</span>
      <div className="veredito__numeros">
        <span className="veredito__bloco">
          <span className="veredito__valor">{atual ?? "—"}{atual != null ? sufixo : ""}</span>
          <span className="veredito__cap">hoje</span>
        </span>
        <span className={`veredito__delta ${delta < 0 ? "negativo" : delta > 0 ? "positivo" : ""}`}>
          {seta} {pico != null && atual != null ? `${Math.abs(delta)}${sufixo}` : ""}
        </span>
        <span className="veredito__bloco veredito__bloco--pico">
          <span className="veredito__valor">{pico ?? "—"}{pico != null ? sufixo : ""}</span>
          <span className="veredito__cap">pico</span>
        </span>
      </div>
    </div>
  );
}

function NotaPessoal({ nota, onDefinirNota }: { nota: number | null; onDefinirNota: (n: number | null) => void }) {
  return (
    <div className="nota-pessoal">
      <div className="nota-pessoal__topo">
        <span className="nota-pessoal__rotulo">Minha nota</span>
        {nota != null && (
          <button className="nota-pessoal__limpar" onClick={() => onDefinirNota(null)}>
            limpar
          </button>
        )}
      </div>
      <div className="nota-pessoal__escala" role="group" aria-label="Nota pessoal de 0 a 10">
        {Array.from({ length: 11 }, (_, n) => (
          <button
            key={n}
            className={`nota-pessoal__btn ${nota === n ? "ativo" : ""}`}
            aria-pressed={nota === n}
            onClick={() => onDefinirNota(n)}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}

export function Detalhe({ filme, ehFavorito, nota, onFechar, onAlternarFavorito, onDefinirNota }: Props) {
  useEffect(() => {
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === "Escape") onFechar();
    };
    document.addEventListener("keydown", aoTeclar);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", aoTeclar);
      document.body.style.overflow = "";
    };
  }, [onFechar]);

  const disp = filme.disponibilidade_br;

  return (
    <div className="modal" onClick={onFechar} role="dialog" aria-modal aria-label={filme.titulo_original}>
      <div className="modal__painel" onClick={(e) => e.stopPropagation()}>
        <button className="modal__fechar" onClick={onFechar} aria-label="Fechar">✕</button>

        <div className="detalhe">
          <aside className="detalhe__poster">
            {filme.poster_url ? (
              <img src={filme.poster_url} alt={`Pôster de ${filme.titulo_original}`} />
            ) : (
              <div
                className="poster poster--fallback poster--grande"
                style={{ background: `radial-gradient(120% 120% at 30% 10%, hsl(${(filme.tmdb_id * 47) % 360} 45% 22%), hsl(${(filme.tmdb_id * 47 + 40) % 360} 35% 9%))` }}
              >
                <span className="poster__inicial">{filme.titulo_original.charAt(0)}</span>
              </div>
            )}
            <button
              className={`favorito favorito--barra ${ehFavorito ? "favorito--ativo" : ""}`}
              onClick={onAlternarFavorito}
              aria-pressed={ehFavorito}
            >
              <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
                <path
                  d="M12 21s-7.5-4.6-10-9.3C.4 8.4 2 5 5.3 5c2 0 3.4 1.1 4.2 2.3C10.3 6.1 11.7 5 13.7 5 17 5 18.6 8.4 17 11.7 14.5 16.4 12 21 12 21z"
                  fill={ehFavorito ? "currentColor" : "none"}
                  stroke="currentColor"
                  strokeWidth="1.6"
                />
              </svg>
              {ehFavorito ? "Favorito" : "Favoritar"}
            </button>
            <NotaPessoal nota={nota} onDefinirNota={onDefinirNota} />
          </aside>

          <div className="detalhe__corpo">
            <SeloCriterio criterio={filme.criterio_qualificacao} />
            <h2 className="detalhe__titulo">{filme.titulo_original}</h2>
            {filme.titulo_ingles && filme.titulo_ingles !== filme.titulo_original && (
              <p className="detalhe__titulo-en">{filme.titulo_ingles}</p>
            )}

            <div className="detalhe__datas">
              <span><strong>Estreia:</strong> {dataLonga(filme.data_lancamento)}</span>
              <span><strong>Entrou no feed:</strong> {dataLonga(filme.data_qualificacao)}</span>
            </div>

            <div className="detalhe__generos">
              {filme.generos.map((g) => (
                <span key={g} className="genero-tag">{g}</span>
              ))}
            </div>

            {filme.sinopse_pt && <p className="detalhe__sinopse">{filme.sinopse_pt}</p>}

            <dl className="detalhe__ficha">
              {filme.diretor && (
                <div><dt>Direção</dt><dd>{filme.diretor}</dd></div>
              )}
              {filme.elenco.length > 0 && (
                <div><dt>Elenco</dt><dd>{filme.elenco.join(", ")}</dd></div>
              )}
            </dl>

            <div className="detalhe__notas-atuais">
              <NotaChip tipo="rt" valor={filme.atual_rt ?? filme.rt_critica} />
              {filme.rt_publico != null && (
                <span className="nota-chip nota-rt nota-chip--publico" title="Rotten Tomatoes (público)">
                  <span className="nota-chip__rotulo">RT público</span>
                  <span className="nota-chip__valor">{filme.rt_publico}%</span>
                </span>
              )}
              <NotaChip tipo="mc" valor={filme.atual_metacritic ?? filme.metacritic} />
              <NotaChip tipo="imdb" valor={filme.imdb_publico} />
            </div>

            <section className="detalhe__evolucao">
              <h4 className="detalhe__sub">A crítica ao longo do tempo</h4>
              <div className="vereditos">
                <PicoAtual rotulo="Rotten Tomatoes" pico={filme.pico_rt} atual={filme.atual_rt} sufixo="%" classe="veredito--rt" />
                <PicoAtual rotulo="Metacritic" pico={filme.pico_metacritic} atual={filme.atual_metacritic} sufixo="" classe="veredito--mc" />
              </div>
              <Sparkline historico={filme.historico} />
              <div className="legenda">
                <span><i className="legenda__cor legenda__cor--rt" /> Rotten Tomatoes</span>
                <span><i className="legenda__cor legenda__cor--mc" /> Metacritic</span>
                <span className="legenda__limiar">– – critério (65)</span>
              </div>
            </section>

            <section className="detalhe__disp">
              <h4 className="detalhe__sub">No Brasil</h4>
              <p className={`disp-estado disp-estado--${disp.estado}`}>{ROTULO_DISPONIBILIDADE[disp.estado]}</p>
              {disp.estado === "streaming" && disp.servicos && (
                <ul className="disp-servicos">
                  {disp.servicos.map((s, i) => (
                    <li key={`${s.nome}-${i}`}>
                      {s.nome} <span className="disp-tipo">· {s.tipo}</span>
                    </li>
                  ))}
                </ul>
              )}
              <p className="disp-aviso">
                Dados de disponibilidade vêm do TMDb e podem estar incompletos ou atrasados.
              </p>
            </section>

            <div className="detalhe__links">
              {filme.links.rotten_tomatoes && (
                <a href={filme.links.rotten_tomatoes} target="_blank" rel="noreferrer">Rotten Tomatoes ↗</a>
              )}
              {filme.links.metacritic && (
                <a href={filme.links.metacritic} target="_blank" rel="noreferrer">Metacritic ↗</a>
              )}
              {filme.links.imdb && (
                <a href={filme.links.imdb} target="_blank" rel="noreferrer">IMDb ↗</a>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
