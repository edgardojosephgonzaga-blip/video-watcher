// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-analytics.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAR6Wxm1NgnMOapDq41ter3wjH0GA1vlhA",
  authDomain: "svww-b179c.firebaseapp.com",
  projectId: "svww-b179c",
  storageBucket: "svww-b179c.firebasestorage.app",
  messagingSenderId: "385630085703",
  appId: "1:385630085703:web:d30dd9e3f5a77e08cf4762",
  measurementId: "G-LD7LBMDQJK"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

export const auth = getAuth(app);
export const db = getFirestore(app);