import { initializeApp } from "firebase/app";

import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyC2QeOKQCldQnbGujNgeDAGGOLrmARCvN4",
  authDomain: "ticketli-ec52b.firebaseapp.com",
  projectId: "ticketli-ec52b",
  storageBucket: "ticketli-ec52b.firebasestorage.app",
  messagingSenderId: "870557539874",
  appId: "1:870557539874:web:9846aeab9620f34021f47b",
  measurementId: "G-ZGED97CYE0"
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);