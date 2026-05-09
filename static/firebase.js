import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

 const firebaseConfig = {
  apiKey: "AIzaSyD1kMohW-RLw0EpfjgL-twy02f9t7Kfgrg",
  authDomain: "collaborative-video-viewer.firebaseapp.com",
  projectId: "collaborative-video-viewer",
  storageBucket: "collaborative-video-viewer.firebasestorage.app",
  messagingSenderId: "118746109883",
  appId: "1:118746109883:web:1350a9841548bb1134169e",
  measurementId: "G-8DNNW5T2XL"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
