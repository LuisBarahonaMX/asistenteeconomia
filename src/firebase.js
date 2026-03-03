// src/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyAUXuiVInkzC2usN_JYdFvFQAt4IsiibH4", // Tus datos actuales
  authDomain: "asistente-economia.firebaseapp.com",
  projectId: "asistente-economia",
  storageBucket: "asistente-economia.firebasestorage.app",
  messagingSenderId: "678695680545",
  appId: "1:678695680545:web:a950a6b7bdad9afa9f0160",
  measurementId: "G-9WH276BQ6W"
};

// 1. Inicializa la App
const app = initializeApp(firebaseConfig);

// 2. IMPORTANTE: Agrega la palabra 'export' antes de cada constante
export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();