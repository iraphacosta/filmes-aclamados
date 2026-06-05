import { onAuthStateChanged } from "firebase/auth";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { useCallback, useEffect, useRef, useState } from "react";
import { auth, db, entrarComGoogle, sairDoGoogle, type User } from "./firebase";

/**
 * Favoritos + nota pessoal (0–10) por filme.
 *
 * - Deslogado: persistido no localStorage do navegador (funciona offline).
 * - Logado (Google): sincronizado no Firestore em `favoritos/{uid}`, em tempo
 *   real entre aparelhos. No primeiro login, os dados locais são migrados.
 */

const CHAVE = "filmes-aclamados:dados-pessoais:v1";

export interface DadosPessoais {
  favoritos: number[];
  notas: Record<number, number>;
}

const VAZIO: DadosPessoais = { favoritos: [], notas: {} };

function lerLocal(): DadosPessoais {
  try {
    const bruto = localStorage.getItem(CHAVE);
    if (!bruto) return VAZIO;
    const dados = JSON.parse(bruto) as Partial<DadosPessoais>;
    return { favoritos: dados.favoritos ?? [], notas: dados.notas ?? {} };
  } catch {
    return VAZIO;
  }
}

function gravarLocal(dados: DadosPessoais): void {
  try {
    localStorage.setItem(CHAVE, JSON.stringify(dados));
  } catch {
    /* armazenamento indisponível — ignora */
  }
}

function temAlgo(d: DadosPessoais): boolean {
  return d.favoritos.length > 0 || Object.keys(d.notas).length > 0;
}

function normalizar(d: Partial<DadosPessoais> | undefined): DadosPessoais {
  return { favoritos: d?.favoritos ?? [], notas: d?.notas ?? {} };
}

export interface ApiPessoal {
  ehFavorito: (tmdbId: number) => boolean;
  alternarFavorito: (tmdbId: number) => void;
  notaDe: (tmdbId: number) => number | null;
  definirNota: (tmdbId: number, nota: number | null) => void;
  totalFavoritos: number;
  // autenticação
  usuario: User | null;
  carregandoAuth: boolean;
  sincronizando: boolean;
  entrar: () => void;
  sair: () => void;
}

export function useDadosPessoais(): ApiPessoal {
  const [usuario, setUsuario] = useState<User | null>(null);
  const [carregandoAuth, setCarregandoAuth] = useState(true);
  const [estado, setEstado] = useState<DadosPessoais>(() => lerLocal());
  const [sincronizando, setSincronizando] = useState(false);

  // Mantém a referência mais recente do estado para os mutadores (evita stale).
  const estadoRef = useRef(estado);
  estadoRef.current = estado;

  // Observa o login/logout.
  useEffect(() => onAuthStateChanged(auth, (u) => {
    setUsuario(u);
    setCarregandoAuth(false);
  }), []);

  // Fonte de dados conforme o login.
  useEffect(() => {
    if (!usuario) {
      setEstado(lerLocal());
      return;
    }
    setSincronizando(true);
    const ref = doc(db, "favoritos", usuario.uid);
    let primeiro = true;
    const unsub = onSnapshot(
      ref,
      (snap) => {
        if (primeiro) {
          primeiro = false;
          if (!snap.exists()) {
            // Primeiro login: migra o que houver no localStorage.
            const local = lerLocal();
            const inicial = temAlgo(local) ? local : VAZIO;
            void setDoc(ref, inicial);
            setEstado(inicial);
          } else {
            setEstado(normalizar(snap.data() as Partial<DadosPessoais>));
          }
          setSincronizando(false);
        } else {
          // Atualizações vindas de outro aparelho/aba.
          setEstado(normalizar(snap.data() as Partial<DadosPessoais>));
        }
      },
      (erro) => {
        console.error("Firestore (favoritos):", erro);
        setSincronizando(false);
      },
    );
    return () => unsub();
  }, [usuario]);

  const salvar = useCallback(
    (novo: DadosPessoais) => {
      setEstado(novo);
      estadoRef.current = novo;
      if (usuario) {
        void setDoc(doc(db, "favoritos", usuario.uid), novo).catch((e) =>
          console.error("Firestore (gravar):", e),
        );
      } else {
        gravarLocal(novo);
      }
    },
    [usuario],
  );

  const alternarFavorito = useCallback(
    (tmdbId: number) => {
      const e = estadoRef.current;
      const jaTem = e.favoritos.includes(tmdbId);
      salvar({
        ...e,
        favoritos: jaTem ? e.favoritos.filter((id) => id !== tmdbId) : [...e.favoritos, tmdbId],
      });
    },
    [salvar],
  );

  const definirNota = useCallback(
    (tmdbId: number, nota: number | null) => {
      const e = estadoRef.current;
      const notas = { ...e.notas };
      if (nota == null) delete notas[tmdbId];
      else notas[tmdbId] = nota;
      salvar({ ...e, notas });
    },
    [salvar],
  );

  const ehFavorito = useCallback(
    (tmdbId: number) => estado.favoritos.includes(tmdbId),
    [estado.favoritos],
  );

  const notaDe = useCallback(
    (tmdbId: number) => (tmdbId in estado.notas ? estado.notas[tmdbId]! : null),
    [estado.notas],
  );

  return {
    ehFavorito,
    alternarFavorito,
    notaDe,
    definirNota,
    totalFavoritos: estado.favoritos.length,
    usuario,
    carregandoAuth,
    sincronizando,
    entrar: () => {
      entrarComGoogle().catch((e) => console.error("Login:", e));
    },
    sair: () => {
      sairDoGoogle().catch((e) => console.error("Logout:", e));
    },
  };
}
