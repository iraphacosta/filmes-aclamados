import { useEffect } from "react";
import type { Filme } from "../dados";
import { ROTULO_DISPONIBILIDADE, dataLonga, linkAgregador, linksVeiculos } from "../formato";
import { Estrelas } from "./Estrelas";
import { IconeCheck, IconeMarcador } from "./icones";
import { NotaChip, SeloCriterio } from "./Selos";
import { Sparkline } from "./Sparkline";

interface Props {
  filme: Filme;
  ehAssistido: boolean;
  querVer: boolean;
  nota: number | null;
  onFechar: () => void;
  onAlternarAssistido: () => void;
  onAlternarQueroVer: () => void;
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
      <Estrelas nota={nota} onDefinir={onDefinirNota} />
    </div>
  );
}

function NotasCriticos({ filme }: { filme: Filme }) {
  const titulo = filme.titulo_ingles || filme.titulo_original;
  return (
    <div className="detalhe__criticos">
      <span className="detalhe__criticos-rotulo">A crítica</span>
      <div className="detalhe__notas-atuais">
        <NotaChip tipo="rt" valor={filme.atual_rt ?? filme.rt_critica} href={linkAgregador("rt", titulo)} />
        {filme.rt_publico != null && (
          <span className="nota-chip nota-rt nota-chip--publico" title="Rotten Tomatoes (público)">
            <span className="nota-chip__rotulo">RT público</span>
            <span className="nota-chip__valor">{filme.rt_publico}%</span>
          </span>
        )}
        <NotaChip tipo="mc" valor={filme.atual_metacritic ?? filme.metacritic} href={linkAgregador("mc", titulo)} />
        <NotaChip tipo="imdb" valor={filme.imdb_publico} href={filme.links.imdb} />
      </div>
    </div>
  );
}

export function Detalhe({
  filme,
  ehAssistido,
  querVer,
  nota,
  onFechar,
  onAlternarAssistido,
  onAlternarQueroVer,
  onDefinirNota,
}: Props) {
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
            <div className="detalhe__marcadores">
              <button
                className={`btn-marcar ${querVer ? "btn-marcar--quero ativo" : ""}`}
                onClick={onAlternarQueroVer}
                aria-pressed={querVer}
              >
                <IconeMarcador preenchido={querVer} size={16} />
                {querVer ? "Na lista" : "Quero ver"}
              </button>
              <button
                className={`btn-marcar ${ehAssistido ? "btn-marcar--assistido ativo" : ""}`}
                onClick={onAlternarAssistido}
                aria-pressed={ehAssistido}
              >
                <IconeCheck preenchido={ehAssistido} size={16} />
                {ehAssistido ? "Assistido" : "Marcar assistido"}
              </button>
            </div>
            <NotasCriticos filme={filme} />
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

            <section className="detalhe__veiculos">
              <h4 className="detalhe__sub">Crítica em outros veículos</h4>
              <div className="detalhe__links">
                {linksVeiculos(filme.titulo_ingles || filme.titulo_original).map((v) => (
                  <a key={v.nome} href={v.url} target="_blank" rel="noreferrer">
                    {v.nome} ↗
                  </a>
                ))}
              </div>
              <p className="disp-aviso">
                Busca pelo título no site de cada veículo — a crítica pode não existir para todos.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
