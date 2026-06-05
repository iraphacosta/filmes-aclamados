interface Props {
  busca: string;
  onBusca: (v: string) => void;
  generos: string[];
  generoAtivo: string;
  onGenero: (g: string) => void;
  soFavoritos: boolean;
  onToggleFavoritos: () => void;
  totalFavoritos: number;
}

export function BarraTopo({
  busca,
  onBusca,
  generos,
  generoAtivo,
  onGenero,
  soFavoritos,
  onToggleFavoritos,
  totalFavoritos,
}: Props) {
  return (
    <div className="barra">
      <label className="busca">
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
          <circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" strokeWidth="1.8" />
          <line x1="16.5" y1="16.5" x2="21" y2="21" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
        <input
          type="search"
          placeholder="Buscar por título…"
          value={busca}
          onChange={(e) => onBusca(e.target.value)}
          aria-label="Buscar por título"
        />
      </label>

      <div className="filtros">
        <label className="seletor-genero">
          <span className="seletor-genero__rotulo">Gênero</span>
          <select value={generoAtivo} onChange={(e) => onGenero(e.target.value)} aria-label="Filtrar por gênero">
            <option value="">Todos</option>
            {generos.map((g) => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
        </label>

        <button
          className={`toggle-fav ${soFavoritos ? "toggle-fav--ativo" : ""}`}
          onClick={onToggleFavoritos}
          aria-pressed={soFavoritos}
        >
          <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden>
            <path
              d="M12 21s-7.5-4.6-10-9.3C.4 8.4 2 5 5.3 5c2 0 3.4 1.1 4.2 2.3C10.3 6.1 11.7 5 13.7 5 17 5 18.6 8.4 17 11.7 14.5 16.4 12 21 12 21z"
              fill={soFavoritos ? "currentColor" : "none"}
              stroke="currentColor"
              strokeWidth="1.6"
            />
          </svg>
          Favoritos
          {totalFavoritos > 0 && <span className="toggle-fav__contador">{totalFavoritos}</span>}
        </button>
      </div>
    </div>
  );
}
