import type { Filme } from "../dados";
import { dataMedia } from "../formato";
import { IconeCheck, IconeMarcador } from "./icones";
import { NotaChip } from "./Selos";

interface Props {
  filme: Filme;
  indice: number;
  ehAssistido: boolean;
  querVer: boolean;
  onAbrir: () => void;
  onAlternarAssistido: () => void;
  onAlternarQueroVer: () => void;
}

function PosterFallback({ filme }: { filme: Filme }) {
  const hue = (filme.tmdb_id * 47) % 360;
  const estilo = {
    background: `radial-gradient(120% 120% at 30% 10%, hsl(${hue} 45% 22%), hsl(${(hue + 40) % 360} 35% 9%))`,
  };
  return (
    <div className="poster poster--fallback" style={estilo}>
      <span className="poster__inicial">{filme.titulo_original.charAt(0)}</span>
      <span className="poster__titulo-fb">{filme.titulo_original}</span>
    </div>
  );
}

export function CardFilme({
  filme,
  indice,
  ehAssistido,
  querVer,
  onAbrir,
  onAlternarAssistido,
  onAlternarQueroVer,
}: Props) {
  return (
    <article className="card" style={{ animationDelay: `${Math.min(indice, 12) * 60}ms` }}>
      <button className="card__poster-btn" onClick={onAbrir} aria-label={`Abrir ${filme.titulo_original}`}>
        {filme.poster_url ? (
          <img className="poster" src={filme.poster_url} alt={`Pôster de ${filme.titulo_original}`} loading="lazy" />
        ) : (
          <PosterFallback filme={filme} />
        )}
      </button>

      <div className="marcadores">
        <button
          className={`marcador marcador--quero ${querVer ? "marcador--ativo" : ""}`}
          onClick={onAlternarQueroVer}
          aria-pressed={querVer}
          aria-label={querVer ? "Remover de Quero ver" : "Quero ver"}
          title="Quero ver"
        >
          <IconeMarcador preenchido={querVer} size={17} />
        </button>
        <button
          className={`marcador marcador--assistido ${ehAssistido ? "marcador--ativo" : ""}`}
          onClick={onAlternarAssistido}
          aria-pressed={ehAssistido}
          aria-label={ehAssistido ? "Marcar como não assistido" : "Marcar como assistido"}
          title="Já assisti"
        >
          <IconeCheck preenchido={ehAssistido} size={18} />
        </button>
      </div>

      <div className="card__corpo" onClick={onAbrir}>
        <h3 className="card__titulo">{filme.titulo_original}</h3>
        {filme.titulo_ingles && filme.titulo_ingles !== filme.titulo_original && (
          <p className="card__titulo-en">{filme.titulo_ingles}</p>
        )}
        <p className="card__lancamento">
          <span className="card__lancamento-rotulo">Estreia</span>
          <span className="card__lancamento-data">{dataMedia(filme.data_lancamento)}</span>
        </p>
        <div className="card__notas">
          <NotaChip tipo="mc" valor={filme.atual_metacritic ?? filme.metacritic} compacto />
          <NotaChip tipo="imdb" valor={filme.imdb_publico} compacto />
          <NotaChip tipo="rt" valor={filme.atual_rt ?? filme.rt_critica} compacto />
        </div>
      </div>
    </article>
  );
}
