import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
        apiKey: "AIzaSyAJs6lMn7SZ1ckyCh_d7WaZ_thN9JPd6PU",
        authDomain: "workout-app-x.firebaseapp.com",
        projectId: "workout-app-x",
        storageBucket: "workout-app-x.firebasestorage.app",
        messagingSenderId: "731178906233",
        appId: "1:731178906233:web:e036e45d6b69dda6d71aa8",
        measurementId: "G-5HVSQ1GFZQ"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);