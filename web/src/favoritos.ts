import { onAuthStateChanged } from "firebase/auth";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { useCallback, useEffect, useRef, useState } from "react";
import { auth, db, entrarComGoogle, sairDoGoogle, type User } from "./firebase";

/**
 * Dados pessoais por filme: "quero ver", "assistido" e nota (0–10).
 *
 * Regras de coerência:
 *  - Dar uma nota marca como assistido (e tira de "quero ver").
 *  - Marcar "assistido" tira de "quero ver"; desmarcar limpa a nota.
 *  - Marcar "quero ver" tira de "assistido" e limpa a nota.
 *  - "avaliados" (tem nota) é sempre um subconjunto de "assistidos".
 *
 * Persistência: localStorage (deslogado) ou Firestore `favoritos/{uid}` (logado),
 * sincronizado em tempo real entre aparelhos. Migra dados locais no 1º login.
 */

const CHAVE = "filmes-aclamados:dados-pessoais:v1";

export interface DadosPessoais {
  assistidos: number[];
  queroVer: number[];
  notas: Record<number, number>;
}

const VAZIO: DadosPessoais = { assistidos: [], queroVer: [], notas: {} };

interface FormatoBruto {
  assistidos?: number[];
  queroVer?: number[];
  notas?: Record<number, number>;
  /** legado (v1 antiga): "favoritos" vira "quero ver". */
  favoritos?: number[];
}

function normalizar(d: FormatoBruto | undefined | null): DadosPessoais {
  if (!d) return VAZIO;
  const temNovo = Array.isArray(d.assistidos) || Array.isArray(d.queroVer);
  if (!temNovo && Array.isArray(d.favoritos)) {
    return { assistidos: [], queroVer: d.favoritos, notas: d.notas ?? {} };
  }
  return { assistidos: d.assistidos ?? [], queroVer: d.queroVer ?? [], notas: d.notas ?? {} };
}

function lerLocal(): DadosPessoais {
  try {
    const bruto = localStorage.getItem(CHAVE);
    return bruto ? normalizar(JSON.parse(bruto) as FormatoBruto) : VAZIO;
  } catch {
    return VAZIO;
  }
}

function gravarLocal(dados: DadosPessoais): void {
  try {
    localStorage.setItem(CHAVE, JSON.stringify(dados));
  } catch {
    /* indisponível — ignora */
  }
}

function temAlgo(d: DadosPessoais): boolean {
  return d.assistidos.length > 0 || d.queroVer.length > 0 || Object.keys(d.notas).length > 0;
}

const sem = (lista: number[], id: number) => lista.filter((x) => x !== id);
const com = (lista: number[], id: number) => (lista.includes(id) ? lista : [...lista, id]);

export interface ApiPessoal {
  ehAssistido: (tmdbId: number) => boolean;
  alternarAssistido: (tmdbId: number) => void;
  querVer: (tmdbId: number) => boolean;
  alternarQueroVer: (tmdbId: number) => void;
  notaDe: (tmdbId: number) => number | null;
  definirNota: (tmdbId: number, nota: number | null) => void;
  totais: { assistidos: number; queroVer: number; avaliados: number };
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

  const estadoRef = useRef(estado);
  estadoRef.current = estado;

  useEffect(() => onAuthStateChanged(auth, (u) => {
    setUsuario(u);
    setCarregandoAuth(false);
  }), []);

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
            const local = lerLocal();
            const inicial = temAlgo(local) ? local : VAZIO;
            void setDoc(ref, inicial);
            setEstado(inicial);
          } else {
            setEstado(normalizar(snap.data() as FormatoBruto));
          }
          setSincronizando(false);
        } else {
          setEstado(normalizar(snap.data() as FormatoBruto));
        }
      },
      (erro) => {
        console.error("Firestore (dados pessoais):", erro);
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

  const alternarAssistido = useCallback(
    (id: number) => {
      const e = estadoRef.current;
      if (e.assistidos.includes(id)) {
        // desmarca assistido -> limpa a nota também
        const notas = { ...e.notas };
        delete notas[id];
        salvar({ ...e, assistidos: sem(e.assistidos, id), notas });
      } else {
        salvar({ ...e, assistidos: com(e.assistidos, id), queroVer: sem(e.queroVer, id) });
      }
    },
    [salvar],
  );

  const alternarQueroVer = useCallback(
    (id: number) => {
      const e = estadoRef.current;
      if (e.queroVer.includes(id)) {
        salvar({ ...e, queroVer: sem(e.queroVer, id) });
      } else {
        const notas = { ...e.notas };
        delete notas[id];
        salvar({ ...e, queroVer: com(e.queroVer, id), assistidos: sem(e.assistidos, id), notas });
      }
    },
    [salvar],
  );

  const definirNota = useCallback(
    (id: number, nota: number | null) => {
      const e = estadoRef.current;
      const notas = { ...e.notas };
      if (nota == null) {
        delete notas[id];
        salvar({ ...e, notas });
      } else {
        notas[id] = nota;
        // dar nota marca como assistido e tira de "quero ver"
        salvar({ ...e, notas, assistidos: com(e.assistidos, id), queroVer: sem(e.queroVer, id) });
      }
    },
    [salvar],
  );

  const ehAssistido = useCallback((id: number) => estado.assistidos.includes(id), [estado.assistidos]);
  const querVer = useCallback((id: number) => estado.queroVer.includes(id), [estado.queroVer]);
  const notaDe = useCallback(
    (id: number) => (id in estado.notas ? estado.notas[id]! : null),
    [estado.notas],
  );

  return {
    ehAssistido,
    alternarAssistido,
    querVer,
    alternarQueroVer,
    notaDe,
    definirNota,
    totais: {
      assistidos: estado.assistidos.length,
      queroVer: estado.queroVer.length,
      avaliados: Object.keys(estado.notas).length,
    },
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
