// src/firebaseConfig.js
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

// ⚠️ Copiada literal desde Firebase Console (SDK npm)
const firebaseConfig = {
  apiKey: "AIzaSyBCvP2p9gbLhM7pAeRQ39wqePoZNkJ_ZOw",
  authDomain: "asistentep-9f276.firebaseapp.com",
  projectId: "asistentep-9f276",
  storageBucket: "asistentep-9f276.appspot.com",
  messagingSenderId: "673127927073",
  appId: "1:673127927073:web:67da79b6dcec1beb704260", // o el que te muestre la consola
  measurementId: "G-9LFQ8P2NLF"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();
