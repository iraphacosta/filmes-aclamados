import { useCallback, useEffect, useRef, useState } from "react";
import type { User } from "./firebase";

/**
 * Dados pessoais por filme: "quero ver", "assistido" e nota (0–10 = estrelas×2).
 *
 * Regras de coerência:
 *  - Dar uma nota marca como assistido (e tira de "quero ver").
 *  - Marcar "assistido" tira de "quero ver"; desmarcar limpa a nota.
 *  - Marcar "quero ver" tira de "assistido" e limpa a nota.
 *
 * Persistência: localStorage (deslogado) ou Firestore `favoritos/{uid}` (logado).
 * O SDK do Firebase é carregado SOB DEMANDA (import dinâmico) para não pesar no
 * carregamento inicial — o feed aparece na hora, e o login/sync hidratam depois.
 */

type ModuloFirebase = typeof import("./firebase");
let firebasePromise: Promise<ModuloFirebase> | null = null;
const carregarFirebase = (): Promise<ModuloFirebase> =>
  (firebasePromise ??= import("./firebase"));

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
  /** legado: "favoritos" vira "quero ver". */
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

  // Observa login/logout (Firebase carregado sob demanda).
  useEffect(() => {
    let vivo = true;
    let unsub: (() => void) | undefined;
    carregarFirebase()
      .then((fb) => {
        if (!vivo) return;
        // Conclui o login por redirect (mobile/standalone) e expõe erros.
        fb.processarRedirectLogin().catch((e) => console.error("Redirect login:", e));
        unsub = fb.observarAuth((u) => {
          setUsuario(u);
          setCarregandoAuth(false);
        });
      })
      .catch((e) => {
        console.error("Firebase (auth):", e);
        setCarregandoAuth(false);
      });
    return () => {
      vivo = false;
      unsub?.();
    };
  }, []);

  // Fonte de dados conforme o login.
  useEffect(() => {
    if (!usuario) {
      setEstado(lerLocal());
      return;
    }
    setSincronizando(true);
    let vivo = true;
    let unsub: (() => void) | undefined;
    let primeiro = true;
    carregarFirebase().then((fb) => {
      if (!vivo) return;
      unsub = fb.observarFavoritos(
        usuario.uid,
        (dados, existe) => {
          if (primeiro) {
            primeiro = false;
            if (!existe) {
              const local = lerLocal();
              const inicial = temAlgo(local) ? local : VAZIO;
              void fb.gravarFavoritos(usuario.uid, inicial as unknown as Record<string, unknown>);
              setEstado(inicial);
            } else {
              setEstado(normalizar(dados as FormatoBruto));
            }
            setSincronizando(false);
          } else {
            setEstado(normalizar(dados as FormatoBruto));
          }
        },
        (erro) => {
          console.error("Firestore (favoritos):", erro);
          setSincronizando(false);
        },
      );
    });
    return () => {
      vivo = false;
      unsub?.();
    };
  }, [usuario]);

  const salvar = useCallback(
    (novo: DadosPessoais) => {
      setEstado(novo);
      estadoRef.current = novo;
      if (usuario) {
        void carregarFirebase()
          .then((fb) => fb.gravarFavoritos(usuario.uid, novo as unknown as Record<string, unknown>))
          .catch((e) => console.error("Firestore (gravar):", e));
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
      carregarFirebase().then((fb) => fb.entrarComGoogle()).catch((e) => console.error("Login:", e));
    },
    sair: () => {
      carregarFirebase().then((fb) => fb.sairDoGoogle()).catch((e) => console.error("Logout:", e));
    },
  };
}
