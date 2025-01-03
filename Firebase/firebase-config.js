// Your web app's Firebase configuration
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
firebase.initializeApp(firebaseConfig);

// Set persistence to LOCAL
firebase.auth().setPersistence(firebase.auth.Auth.Persistence.LOCAL);
