import { useState } from "react";
import type { Filme } from "../dados";
import { dataLonga } from "../formato";
import { IconeSino } from "./icones";

interface Props {
  novos: Filme[];
  onAbrir: (tmdbId: number) => void;
  marcarVistos: () => void;
}

export function NotificacaoCentral({ novos, onAbrir, marcarVistos }: Props) {
  const [aberto, setAberto] = useState(false);
  const qtd = novos.length;

  return (
    <div className="notif">
      <button
        className="notif__sino"
        onClick={() => setAberto((v) => !v)}
        aria-label={`Notificações${qtd ? ` (${qtd} novidade${qtd > 1 ? "s" : ""})` : ""}`}
        aria-expanded={aberto}
      >
        <IconeSino />
        {qtd > 0 && <span className="notif__badge">{qtd > 9 ? "9+" : qtd}</span>}
      </button>

      {aberto && (
        <>
          <div className="notif__fundo" onClick={() => setAberto(false)} aria-hidden />
          <div className="notif__painel" role="dialog" aria-label="Novidades">
            <div className="notif__cabecalho">
              <strong>Novidades</strong>
              {qtd > 0 && (
                <button className="notif__limpar" onClick={() => { marcarVistos(); }}>
                  marcar como vistas
                </button>
              )}
            </div>

            {qtd === 0 ? (
              <p className="notif__vazio">Nada novo por aqui. Você está em dia. ✨</p>
            ) : (
              <ul className="notif__lista">
                {novos.map((f) => (
                  <li key={f.tmdb_id}>
                    <button
                      className="notif__item"
                      onClick={() => {
                        onAbrir(f.tmdb_id);
                        setAberto(false);
                      }}
                    >
                      <span className="notif__capa" aria-hidden>
                        {f.poster_url ? (
                          <img src={f.poster_url} alt="" loading="lazy" />
                        ) : (
                          <span className="notif__capa-fb">{f.titulo_original.charAt(0)}</span>
                        )}
                      </span>
                      <span className="notif__texto">
                        <span className="notif__titulo">{f.titulo_original}</span>
                        <span className="notif__data">entrou em {dataLonga(f.data_qualificacao)}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}
