import { initializeApp } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js";
import {
  GoogleAuthProvider,
  getAuth,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";
import {
  collection,
  deleteDoc,
  doc,
  getFirestore,
  onSnapshot,
  setDoc,
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBNq245v9eECJrP5eDBapjQ5cH0MfSZJnk",
  authDomain: "controle-de-os-ex.firebaseapp.com",
  projectId: "controle-de-os-ex",
  storageBucket: "controle-de-os-ex.firebasestorage.app",
  messagingSenderId: "258027876240",
  appId: "1:258027876240:web:f2c9d422704e6675fb8d15",
};

const firebaseApp = initializeApp(firebaseConfig);
const auth = getAuth(firebaseApp);
const googleProvider = new GoogleAuthProvider();
const firestore = getFirestore(firebaseApp);

export function observarAutenticacao(aoAlterar) {
  return onAuthStateChanged(auth, aoAlterar);
}

export function entrarComGoogle() {
  return signInWithPopup(auth, googleProvider);
}

export function sairDaConta() {
  return signOut(auth);
}

export function observarOS(userId, aoAtualizar, aoDarErro) {
  const ticketsCollection = collection(firestore, "users", userId, "tickets");
  return onSnapshot(ticketsCollection, aoAtualizar, aoDarErro);
}

export function salvarOS(userId, ticket) {
  return setDoc(doc(firestore, "users", userId, "tickets", ticket.id), ticket);
}

export function excluirOS(userId, ticketId) {
  return deleteDoc(doc(firestore, "users", userId, "tickets", ticketId));
}
