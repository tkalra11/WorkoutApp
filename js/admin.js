import { db } from "./firebase-config.js";
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

async function loadPendingExercises() {
    const adminList = document.getElementById('admin-list');
    const querySnapshot = await getDocs(collection(db, "users"));
    
    adminList.innerHTML = '';

    querySnapshot.forEach((userDoc) => {
        const userData = userDoc.data();
        const customs = userData.custom_exercises || [];
        
        // Find exercises that want to go global
        const pending = customs.filter(ex => ex.pendingGlobalApproval === true);

        pending.forEach(ex => {
            const card = document.createElement('div');
            card.className = 'exercise-card';
            card.innerHTML = `
                <h3>${ex.name}</h3>
                <p>Category: ${ex.target}</p>
                <p>Submitted by: ${userData.submittedBy || 'Anonymous'}</p>
                <img src="${ex.gifUrl}" style="width:100%; max-width:200px; border-radius:8px;">
                <div style="margin-top:10px;">
                    <button onclick="downloadGif('${ex.gifUrl}', '${ex.name}')">Download GIF</button>
                    <p style="font-size:12px; color:#888; margin-top:5px;">
                        After downloading, manually add to your GitHub JSON.
                    </p>
                </div>
            `;
            adminList.appendChild(card);
        });
    });
}

window.downloadGif = function(base64, name) {
    const link = document.createElement('a');
    link.href = base64;
    link.download = `${name.replace(/\s+/g, '_')}.gif`;
    link.click();
};

document.addEventListener('DOMContentLoaded', loadPendingExercises);