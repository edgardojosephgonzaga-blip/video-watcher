// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-analytics.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyD1kMohW-RLw0EpfjgL-twy02f9t7Kfgrg",
  authDomain: "collaborative-video-viewer.firebaseapp.com",
  projectId: "collaborative-video-viewer",
  storageBucket: "collaborative-video-viewer.firebasestorage.app",
  messagingSenderId: "118746109883",
  appId: "1:118746109883:web:1350a9841548bb1134169e",
  measurementId: "G-8DNNW5T2XL"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

export const auth = getAuth(app);
export const db = getFirestore(app);
