import { initializeApp } from "firebase/app";
import { GoogleAuthProvider, getAuth, signInWithPopup, signOut, type User } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

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
export const auth = getAuth(app);
export const db = getFirestore(app);

const provider = new GoogleAuthProvider();

export function entrarComGoogle(): Promise<unknown> {
  return signInWithPopup(auth, provider);
}

export function sairDoGoogle(): Promise<void> {
  return signOut(auth);
}

export type { User };
