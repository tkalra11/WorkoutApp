import { auth, db } from "./firebase-config.js";
import { 
    signInWithPopup, 
    GoogleAuthProvider, 
    onAuthStateChanged, 
    signOut 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { 
    doc, 
    setDoc, 
    getDoc 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const provider = new GoogleAuthProvider();

// --- 1. SIGN IN & MIGRATION ---
export async function handleSignIn() {
    try {
        const result = await signInWithPopup(auth, provider);
        const user = result.user;
        
        // After login, check if cloud data exists; if not, migrate local data
        await migrateLocalDataToCloud(user.uid);
        
        window.location.reload(); // Refresh to update UI
    } catch (error) {
        console.error("Sign-in failed:", error);
        alert("Login failed: " + error.message);
    }
}

async function migrateLocalDataToCloud(uid) {
    const userDocRef = doc(db, "users", uid);
    const docSnap = await getDoc(userDocRef);

    // If no data exists in Firestore, upload what's currently in localStorage
    if (!docSnap.exists()) {
        const localTemplates = JSON.parse(localStorage.getItem('workout_templates'));
        const localCustomEx = JSON.parse(localStorage.getItem('custom_exercises'));
        const localFavs = JSON.parse(localStorage.getItem('exercise_favorites'));

        if (localTemplates || localCustomEx) {
            console.log("Migrating local data to Firebase...");
            await setDoc(userDocRef, {
                workout_templates: localTemplates || [],
                custom_exercises: localCustomEx || [],
                exercise_favorites: localFavs || [],
                lastSynced: new Date().toISOString()
            });
        }
    }
}

// --- 2. SIGN OUT ---
export async function handleSignOut() {
    if (confirm("Sign out? Local changes won't sync until you log back in.")) {
        await signOut(auth);
        window.location.reload();
    }
}

// --- 3. UI LISTENER ---
onAuthStateChanged(auth, (user) => {
    const statusText = document.getElementById('auth-status');
    const loginBtn = document.getElementById('login-btn');

    if (user) {
        if (statusText) statusText.innerHTML = `Signed in as: <strong>${user.email}</strong><br>Cloud Sync Active ✅`;
        if (loginBtn) {
            loginBtn.textContent = "Sign Out";
            loginBtn.onclick = handleSignOut;
            loginBtn.classList.add('remove'); // Use your red button style
        }
    } else {
        if (loginBtn) {
            loginBtn.onclick = handleSignIn;
        }
    }
});