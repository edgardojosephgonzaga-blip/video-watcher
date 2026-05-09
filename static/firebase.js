import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

 const firebaseConfig = {
  apiKey: "AIzaSyAR6Wxm1NgnMOapDq41ter3wjH0GA1vlhA",
  authDomain: "svww-b179c.firebaseapp.com",
  projectId: "svww-b179c",
  storageBucket: "svww-b179c.firebasestorage.app",
  messagingSenderId: "385630085703",
  appId: "1:385630085703:web:d30dd9e3f5a77e08cf4762",
  measurementId: "G-LD7LBMDQJK"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);