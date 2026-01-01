
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, query, orderBy, onSnapshot } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAKi2cV9hG2TBhRbsO9gx4xQ0DxxUnF_8o",
  authDomain: "skbb-4ec15.firebaseapp.com",
  projectId: "skbb-4ec15",
  storageBucket: "skbb-4ec15.firebasestorage.app",
  messagingSenderId: "902628972456",
  appId: "1:902628972456:web:8466535c4554feabaf6f9d",
  measurementId: "G-8XCHLHPS3H"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

export { collection, addDoc, getDocs, query, orderBy, onSnapshot };
