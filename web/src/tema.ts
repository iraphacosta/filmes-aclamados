import { useEffect, useState } from "react";

export type Tema = "claro" | "escuro" | "sistema";

const CHAVE = "filmes-aclamados:tema";

function ler(): Tema {
  try {
    const t = localStorage.getItem(CHAVE);
    return t === "claro" || t === "escuro" || t === "sistema" ? t : "sistema";
  } catch {
    return "sistema";
  }
}

function efetivo(t: Tema): "claro" | "escuro" {
  if (t === "sistema") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "escuro" : "claro";
  }
  return t;
}

function aplicar(t: Tema): void {
  document.documentElement.dataset.tema = efetivo(t);
}

export function useTema(): { tema: Tema; setTema: (t: Tema) => void } {
  const [tema, setTemaState] = useState<Tema>(() => ler());

  useEffect(() => {
    aplicar(tema);
  }, [tema]);

  // Quando em "sistema", segue mudanças do SO em tempo real.
  useEffect(() => {
    if (tema !== "sistema") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const aoMudar = () => aplicar("sistema");
    mq.addEventListener("change", aoMudar);
    return () => mq.removeEventListener("change", aoMudar);
  }, [tema]);

  const setTema = (t: Tema) => {
    try {
      localStorage.setItem(CHAVE, t);
    } catch {
      /* ignora */
    }
    setTemaState(t);
  };

  return { tema, setTema };
}
