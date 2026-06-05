import { initializeApp } from "firebase/app";
import {
  GoogleAuthProvider,
  getAuth,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type User,
} from "firebase/auth";
import { doc, getFirestore, onSnapshot, setDoc } from "firebase/firestore";

// A config do Firebase no front é PÚBLICA por natureza — não é segredo.
// A proteção dos dados vem das regras de segurança do Firestore (por usuário).
const firebaseConfig = {
  apiKey: "AIzaSyDBSNRMZ68agwrYx1JvmgdFroE5W6iEsoQ",
  authDomain: "filmesaclamados.firebaseapp.com",
  projectId: "filmesaclamados",
  storageBucket: "filmesaclamados.firebasestorage.app",
  messagingSenderId: "454063032311",
  appId: "1:454063032311:web:d39f999081a7d5e8c650f2",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

export function entrarComGoogle(): Promise<unknown> {
  return signInWithPopup(auth, provider);
}

export function sairDoGoogle(): Promise<void> {
  return signOut(auth);
}

export function observarAuth(cb: (u: User | null) => void): () => void {
  return onAuthStateChanged(auth, cb);
}

export function observarFavoritos(
  uid: string,
  aoReceber: (dados: Record<string, unknown> | undefined, existe: boolean) => void,
  aoErro: (e: unknown) => void,
): () => void {
  return onSnapshot(
    doc(db, "favoritos", uid),
    (snap) => aoReceber(snap.data(), snap.exists()),
    aoErro,
  );
}

export function gravarFavoritos(uid: string, dados: Record<string, unknown>): Promise<void> {
  return setDoc(doc(db, "favoritos", uid), dados);
}

export type { User };
