import type { Filme } from "../dados";
import { dataLonga } from "../formato";
import { NotaChip, SeloCriterio, SeloDisponibilidade } from "./Selos";

interface Props {
  filme: Filme;
  ehFavorito: boolean;
  indice: number;
  onAbrir: () => void;
  onAlternarFavorito: () => void;
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

export function CardFilme({ filme, ehFavorito, indice, onAbrir, onAlternarFavorito }: Props) {
  return (
    <article className="card" style={{ animationDelay: `${Math.min(indice, 12) * 60}ms` }}>
      <button className="card__poster-btn" onClick={onAbrir} aria-label={`Abrir ${filme.titulo_original}`}>
        {filme.poster_url ? (
          <img className="poster" src={filme.poster_url} alt={`Pôster de ${filme.titulo_original}`} loading="lazy" />
        ) : (
          <PosterFallback filme={filme} />
        )}
        <span className="card__disp">
          <SeloDisponibilidade disp={filme.disponibilidade_br} />
        </span>
      </button>

      <button
        className={`favorito ${ehFavorito ? "favorito--ativo" : ""}`}
        onClick={onAlternarFavorito}
        aria-pressed={ehFavorito}
        aria-label={ehFavorito ? "Remover dos favoritos" : "Adicionar aos favoritos"}
      >
        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden>
          <path
            d="M12 21s-7.5-4.6-10-9.3C.4 8.4 2 5 5.3 5c2 0 3.4 1.1 4.2 2.3C10.3 6.1 11.7 5 13.7 5 17 5 18.6 8.4 17 11.7 14.5 16.4 12 21 12 21z"
            fill={ehFavorito ? "currentColor" : "none"}
            stroke="currentColor"
            strokeWidth="1.6"
          />
        </svg>
      </button>

      <div className="card__corpo" onClick={onAbrir}>
        <SeloCriterio criterio={filme.criterio_qualificacao} />
        <h3 className="card__titulo">{filme.titulo_original}</h3>
        {filme.titulo_ingles && filme.titulo_ingles !== filme.titulo_original && (
          <p className="card__titulo-en">{filme.titulo_ingles}</p>
        )}
        <p className="card__lancamento">
          <span className="card__lancamento-rotulo">Estreia</span>
          {dataLonga(filme.data_lancamento)}
        </p>
        <div className="card__notas">
          <NotaChip tipo="rt" valor={filme.atual_rt ?? filme.rt_critica} compacto />
          <NotaChip tipo="mc" valor={filme.atual_metacritic ?? filme.metacritic} compacto />
          <NotaChip tipo="imdb" valor={filme.imdb_publico} compacto />
        </div>
      </div>
    </article>
  );
}
