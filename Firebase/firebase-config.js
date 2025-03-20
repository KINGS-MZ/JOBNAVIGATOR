import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js';
import { getFirestore, collection, addDoc, query, where, getDocs, doc, getDoc, setDoc, updateDoc, deleteDoc } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js';

// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCb-WQn8hxetYE2wWMQ37y7vRAKl0hFbkI",
  authDomain: "jobnav-799f0.firebaseapp.com",
  databaseURL: "https://jobnav-799f0-default-rtdb.firebaseio.com",
  projectId: "jobnav-799f0",
  storageBucket: "jobnav-799f0.firebasestorage.app",
  messagingSenderId: "908819629942",
  appId: "1:908819629942:web:e569e324a0959efaef1c57",
  measurementId: "G-58CZK5KRN4"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { auth, app, db, collection, addDoc, query, where, getDocs, doc, getDoc, setDoc, updateDoc, deleteDoc };