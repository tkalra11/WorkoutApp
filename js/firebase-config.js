import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
apiKey: "AIzaSyA0-5FYv8a_BcdKC-vQZrqiPKBxSVHEmeM",
    authDomain: "workout-app-x-1.firebaseapp.com",
    projectId: "workout-app-x-1",
    storageBucket: "workout-app-x-1.firebasestorage.app",
    messagingSenderId: "182906264669",
    appId: "1:182906264669:web:5f89150271647aa64301b4",
    measurementId: "G-51J907QPYK"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);