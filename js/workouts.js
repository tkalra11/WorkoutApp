import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { doc, updateDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

let exercisesDB = {};
let customExercises = [];
let favorites = [];
let templates = [];
let currentTemplateIndex = 0;
let currentDayIndex = new Date().getDay() - 1; 
if (currentDayIndex < 0) currentDayIndex = 6; 
const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

// workouts.js - Top of file

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Initial local load so the screen isn't totally empty while waiting for Firebase
    loadDataLocal(); 
    await loadExerciseDatabase();
    initUI(); // Initial render with local data

    // 2. React to Firebase Login
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            console.log("Authenticated: Fetching cloud data...");
            await loadDataCloud(user.uid);
            initUI(); // Re-render with fresh cloud data
        } else {
            console.log("Not authenticated: Using local data.");
        }
    });
    setTimeout(applyLayoutFixes, 150);
});

function applyLayoutFixes() {
    const header = document.querySelector('.top-bar');
    if (header) {
        document.documentElement.style.setProperty('--actual-header-height', header.offsetHeight + 'px');
    }
}

// --- DATA MANAGEMENT ---
async function syncToCloud() {
    if (auth.currentUser) {
        try {
            const userRef = doc(db, "users", auth.currentUser.uid);
            // We use server-compatible ISO strings for the cloud timestamp
            const now = new Date().toISOString();
            
            await updateDoc(userRef, {
                workout_templates: templates,
                custom_exercises: customExercises,
                exercise_favorites: favorites,
                lastSynced: now
            });
            console.log("Cloud sync successful at:", now);
        } catch (error) {
            console.error("Cloud sync failed (saved locally):", error);
        }
    }
}

async function saveTemplates() {
    const syncData = {
        data: templates,
        lastModified: Date.now()
    };
    localStorage.setItem('workout_templates', JSON.stringify(syncData));
    await syncToCloud();
}

async function saveCustom() { 
    const syncData = {
        data: customExercises,
        lastModified: Date.now()
    };
    localStorage.setItem('custom_exercises', JSON.stringify(syncData)); 
    await syncToCloud();
}

async function saveFavorites() { 
    const syncData = {
        data: favorites,
        lastModified: Date.now()
    };
    localStorage.setItem('exercise_favorites', JSON.stringify(syncData)); 
    await syncToCloud();
}

function loadDataLocal() {
    const tRaw = localStorage.getItem('workout_templates');
    const cRaw = localStorage.getItem('custom_exercises');
    const fRaw = localStorage.getItem('exercise_favorites');

    // Helper to extract data from the {data, lastModified} structure
    const extract = (raw) => {
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        return parsed.hasOwnProperty('data') ? parsed.data : parsed;
    };

    const tData = extract(tRaw);
    if (tData && tData.length > 0) {
        templates = tData;
    } else {
        // Fallback: Create the Default Plan if nothing exists locally
        templates = [{ 
            id: "p1", 
            name: "Default Plan", 
            active: true, 
            schedule: Array(7).fill(null).map((_, i) => ({ 
                isRest: false, 
                exercises: [], 
                dayName: "" 
            })) 
        }];
    }

    customExercises = extract(cRaw) || [];
    favorites = extract(fRaw) || [];
}

async function loadDataCloud(uid) {
    try {
        const userDoc = await getDoc(doc(db, "users", uid));
        
        // Use the same keys as loadDataLocal
        const tLocalRaw = localStorage.getItem('workout_templates');
        const tLocalParsed = tLocalRaw ? JSON.parse(tLocalRaw) : {};
        const localTime = tLocalParsed.lastModified || 0;

        if (userDoc.exists()) {
            const cloudData = userDoc.data();
            const cloudTime = cloudData.lastSynced ? new Date(cloudData.lastSynced).getTime() : 0;

            // --- COMPARISON LOGIC ---
            if (cloudTime >= localTime) {
                console.log("Cloud is newer or equal. Checking content...");
                
                // SAFETY CHECK: Only overwrite if cloud actually has data
                if (cloudData.workout_templates && cloudData.workout_templates.length > 0) {
                    templates = cloudData.workout_templates;
                    customExercises = cloudData.custom_exercises || [];
                    favorites = cloudData.exercise_favorites || [];
                    
                    // Update local cache with cloud data and cloud timestamp
                    localStorage.setItem('workout_templates', syncObj(templates, cloudTime));
                    localStorage.setItem('custom_exercises', syncObj(customExercises, cloudTime));
                    localStorage.setItem('exercise_favorites', syncObj(favorites, cloudTime));
                } else {
                    console.log("Cloud is empty. Pushing local default up.");
                    await syncToCloud();
                }
            } else {
                console.log("Local is newer. Pushing to cloud.");
                await syncToCloud();
            }
        } else {
            // New User: Document doesn't exist yet, push the default plan
            console.log("New user detected. Initializing cloud document.");
            await syncToCloud();
        }
    } catch (error) {
        console.error("Cloud load/comparison failed:", error);
    }
}

async function loadExerciseDatabase() {
    try {
        const response = await fetch('../data/fitness_exercises_by_bodyPart.json');
        if (!response.ok) throw new Error("JSON not found");
        exercisesDB = await response.json();
    } catch (e) { console.error(e); }
}

// --- UI RENDERING ---
function initUI() {
    renderTemplateTabs();
    renderDaySelector();
    renderDayPlan();
    const s = document.getElementById('search-bar');
    if (s) s.addEventListener('input', renderLibraryList);
}

// --- PLAN TABS ---
function renderTemplateTabs() {
    const c = document.getElementById('template-tabs');
    if (!c) return;
    c.innerHTML = '';
    templates.forEach((t, i) => {
        const tab = document.createElement('div');
        tab.className = `template-tab ${i === currentTemplateIndex ? 'active' : ''}`;
        
        const span = document.createElement('span');
        span.textContent = t.name;
        span.onclick = () => { currentTemplateIndex = i; renderTemplateTabs(); renderDayPlan(); };
        tab.appendChild(span);

        if (i === currentTemplateIndex) {
            const controls = document.createElement('div');
            controls.className = 'tab-controls';
            
            const rename = document.createElement('span');
            rename.innerHTML = '✎';
            rename.onclick = (e) => { e.stopPropagation(); renamePlan(i); };
            controls.appendChild(rename);

            if (templates.length > 1) {
                const del = document.createElement('span');
                del.innerHTML = '🗑';
                del.className = 'del-btn';
                del.onclick = (e) => { e.stopPropagation(); deletePlan(i); };
                controls.appendChild(del);
            }
            tab.appendChild(controls);
        }
        c.appendChild(tab);
    });
    const add = document.createElement('div');
    add.className = 'template-tab'; add.innerHTML = '+';
    add.onclick = createNewPlan;
    c.appendChild(add);
}

function createNewPlan() {
    const n = prompt("Plan Name:", "New Plan");
    if(!n) return;
    templates.push({ 
        id: "p"+Date.now(), 
        name: n, 
        active: false, 
        schedule: Array(7).fill(null).map(()=>({ isRest: false, exercises: [], dayName: "" })) 
    });
    saveTemplates(); currentTemplateIndex = templates.length-1; renderTemplateTabs(); renderDayPlan();
}
function renamePlan(i) {
    const n = prompt("Rename:", templates[i].name);
    if(n) { templates[i].name = n; saveTemplates(); renderTemplateTabs(); }
}
function deletePlan(i) {
    if(confirm("Delete plan?")) { templates.splice(i,1); currentTemplateIndex=0; saveTemplates(); renderTemplateTabs(); renderDayPlan(); }
}

// --- DAY SELECTOR ---
function renderDaySelector() {
    const c = document.getElementById('day-selector');
    if(!c) return; c.innerHTML='';
    ['M','T','W','T','F','S','S'].forEach((l,i)=>{
        const b = document.createElement('div');
        b.className = `day-bubble ${i===currentDayIndex?'active':''}`;
        b.textContent = l;
        b.onclick = () => { currentDayIndex=i; renderDaySelector(); renderDayPlan(); };
        c.appendChild(b);
    });
}

// --- MAIN WORKOUT LIST ---
function renderDayPlan() {
    const currentPlan = templates[currentTemplateIndex].schedule[currentDayIndex];
    
    // Editable Day Name
    const dayHeaderInput = document.getElementById('day-name-input');
    if (dayHeaderInput) {
        dayHeaderInput.value = currentPlan.dayName || daysOfWeek[currentDayIndex];
        
        const newInput = dayHeaderInput.cloneNode(true);
        dayHeaderInput.parentNode.replaceChild(newInput, dayHeaderInput);
        
        newInput.addEventListener('change', (e) => {
            const newVal = e.target.value.trim();
            if (!newVal || newVal === daysOfWeek[currentDayIndex]) {
                templates[currentTemplateIndex].schedule[currentDayIndex].dayName = "";
            } else {
                templates[currentTemplateIndex].schedule[currentDayIndex].dayName = newVal;
            }
            saveTemplates();
        });
        
        newInput.addEventListener('focus', (e) => e.target.select());
    }

    const list = document.getElementById('exercise-list');
    const toggle = document.getElementById('rest-toggle');
    const btn = document.querySelector('.btn-add');

    if (toggle) {
        const n = toggle.cloneNode(true);
        toggle.parentNode.replaceChild(n, toggle);
        n.checked = currentPlan.isRest;
        n.addEventListener('change', (e) => {
            templates[currentTemplateIndex].schedule[currentDayIndex].isRest = e.target.checked;
            saveTemplates(); renderDayPlan();
        });
    }

    if(btn) btn.style.display = currentPlan.isRest ? 'none' : 'block';
    list.innerHTML = '';

    if (currentPlan.isRest) {
        list.innerHTML = `<div style="text-align:center; padding:40px; color:#666;"><p>Rest Day Active 😴</p></div>`;
        return;
    }

    if (currentPlan.exercises.length === 0) {
        list.innerHTML = `<div style="text-align:center; padding:40px; color:#666;"><p>No exercises planned.</p></div>`;
    } else {
        currentPlan.exercises.forEach((ex, exIdx) => {
            const card = document.createElement('div');
            card.className = 'exercise-card';
            
            if (!ex.setsData) ex.setsData = Array(ex.sets||3).fill({weight:0, reps: ex.targetReps||0});

            let setsHtml = '';
            ex.setsData.forEach((s, sIdx) => {
                setsHtml += `
                    <div class="set-row">
                        <span class="set-num">${sIdx+1}</span>
                        <input type="number" placeholder="kg" value="${s.weight}" min="0" onchange="updateSet(${exIdx}, ${sIdx}, 'weight', this)">
                        <input type="number" placeholder="reps" value="${s.reps}" min="0" onchange="updateSet(${exIdx}, ${sIdx}, 'reps', this)">
                    </div>`;
            });

            card.innerHTML = `
                <div class="ex-header">
                    <span class="ex-name">${ex.name}</span>
                    <span class="ex-remove" onclick="removeEx(${exIdx})">×</span>
                </div>
                <div class="ex-sets-container">
                    <div class="set-header"><span>Set</span><span>Weight</span><span>Reps</span></div>
                    ${setsHtml}
                    <div class="set-actions">
                        <button class="btn-set-action" onclick="addSet(${exIdx})">+</button>
                        <button class="btn-set-action remove" onclick="removeSet(${exIdx})">-</button>
                    </div>
                </div>`;
            list.appendChild(card);
        });
    }
}

// UPDATED: Prevent Negative Numbers
function updateSet(exI, sI, f, inputElement) {
    let v = parseFloat(inputElement.value);
    
    // Strict check: if negative or empty/NaN, set to 0
    if (isNaN(v) || v < 0) {
        v = 0;
        inputElement.value = 0; // Update UI immediately
    }
    
    templates[currentTemplateIndex].schedule[currentDayIndex].exercises[exI].setsData[sI][f] = v;
    saveTemplates();
}

function addSet(exI) {
    const ex = templates[currentTemplateIndex].schedule[currentDayIndex].exercises[exI];
    const last = ex.setsData[ex.setsData.length-1] || {weight:0, reps:0};
    ex.setsData.push({...last}); saveTemplates(); renderDayPlan();
}
function removeSet(exI) {
    const ex = templates[currentTemplateIndex].schedule[currentDayIndex].exercises[exI];
    if(ex.setsData.length>1) { ex.setsData.pop(); saveTemplates(); renderDayPlan(); }
}
function removeEx(i) {
    if(confirm("Remove exercise?")) {
        templates[currentTemplateIndex].schedule[currentDayIndex].exercises.splice(i, 1);
        saveTemplates(); renderDayPlan();
    }
}

// --- LIBRARY ---
let currentFilter = 'favorites'; 

function openLibrary() { 
    document.getElementById('library-modal').classList.add('active'); 
    filterBodyPart('favorites'); 
}

function closeLibrary() { document.getElementById('library-modal').classList.remove('active'); }

function showExerciseDetails(name, target, gifUrl) {
    const modal = document.getElementById('gif-modal');
    document.getElementById('gif-title').textContent = name;
    
    const formattedTarget = target ? (target.charAt(0).toUpperCase() + target.slice(1)) : 'Unknown';
    document.getElementById('gif-target').textContent = `Muscle used: ${formattedTarget}`;
    
    const img = document.getElementById('gif-image');
    img.src = gifUrl || 'https://via.placeholder.com/300x200?text=No+GIF+Available';
    modal.classList.add('active');
}

function closeGifModal() {
    document.getElementById('gif-modal').classList.remove('active');
}

function createCustomExercise() {
    // 1. Define categories
    const categories = ['chest', 'back', 'shoulders', 'arms', 'legs', 'abs', 'cardio'];
    
    // 2. Create the unified form HTML
    let formHtml = `
<div id="custom-ex-modal" class="modal-overlay">
            <div class="modal-content">
                <h3>Create Custom Exercise</h3>
                
                <label class="input-label">Exercise Name</label>
                <input type="text" id="custom-ex-name" placeholder="e.g. Diamond Pushups" class="modal-input">

                <label class="input-label">Muscle Group</label>
                <select id="custom-ex-category" class="modal-input">
                    ${categories.map(cat => `<option value="${cat}">${cat.charAt(0).toUpperCase() + cat.slice(1)}</option>`).join('')}
                </select>

                <label class="input-label">Upload GIF (Optional)</label>
                <input type="file" id="custom-ex-gif" accept="image/gif" class="modal-input">

                <div class="checkbox-container">
                    <input type="checkbox" id="contribute-global">
                    <label for="contribute-global">Add to global database for others?</label>
                    <p class="helper-text">(Pending admin approval)</p>
                </div>

                <div class="modal-actions">
                    <button onclick="document.getElementById('custom-ex-modal').remove()" class="btn-cancel">Cancel</button>
                    <button onclick="submitCustomExercise()" class="btn-submit">Add Exercise</button>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', formHtml);
    
    // Auto-focus the input for better UX
    setTimeout(() => document.getElementById('custom-ex-name').focus(), 100);
}

// Logic to process the form data
async function submitCustomExercise() {
const nameInput = document.getElementById('custom-ex-name');
    const category = document.getElementById('custom-ex-category').value;
    const gifFile = document.getElementById('custom-ex-gif').files[0];
    const isGlobal = document.getElementById('contribute-global').checked;
    
    if (!nameInput.value.trim()) {
        nameInput.style.borderColor = '#ff4444';
        return;
    }

    let gifData = '';
    if (gifFile) {
        // Convert the GIF to a string so it can be saved to Firestore
        gifData = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.readAsDataURL(gifFile);
        });
    }

    const newEx = { 
        id: "c" + Date.now(), 
        name: nameInput.value.trim(), 
        target: category, 
        bodyPart: category, 
        gifUrl: gifData, 
        isCustom: true,
        pendingGlobalApproval: isGlobal,
        submittedBy: auth.currentUser.email // Helps you know who sent it
    };
    
    customExercises.push(newEx); 
    await saveCustom(); 
    addExToPlan(newEx.id, newEx.name);
    document.getElementById('custom-ex-modal').remove();
};

function deleteCustomExercise(id, e) {
    e.stopPropagation();
    if(confirm("Delete this custom exercise?")) {
        customExercises = customExercises.filter(ex => ex.id !== id);
        saveCustom();
        renderLibraryList(); 
    }
}

function filterBodyPart(cat) {
    currentFilter = cat;
    document.querySelectorAll('.chip').forEach(c => {
        c.classList.remove('active');
        if(c.innerText.toLowerCase() === cat) c.classList.add('active');
    });
    renderLibraryList();
}

function renderLibraryList() {
    const q = document.getElementById('search-bar').value.toLowerCase();
    const c = document.getElementById('library-list'); c.innerHTML='';
    let list = [];
    const map = { 'chest':['chest'], 'back':['back'], 'shoulders':['shoulders','neck'], 'arms':['lower arms','upper arms'], 'legs':['lower legs','upper legs'], 'abs':['waist'], 'cardio':['cardio'] };

    if(currentFilter==='favorites') {
        const fIds = new Set(favorites.map(String));
        Object.values(exercisesDB).flat().forEach(e => { if(fIds.has(String(e.id))) list.push(e); });
        customExercises.forEach(e => { if(fIds.has(String(e.id))) list.push(e); });
    } else if(currentFilter==='custom') {
        list = customExercises;
    } else {
        (map[currentFilter]||[]).forEach(k => { if(exercisesDB[k]) list = list.concat(exercisesDB[k]); });
        list = list.concat(customExercises.filter(e => e.bodyPart === currentFilter));
    }

    if(q) list = list.filter(e => e.name.toLowerCase().includes(q));
    
    if(list.length===0) { c.innerHTML='<div style="padding:20px;text-align:center;color:#666">No results</div>'; return; }

    list.forEach(ex => {
        const isFav = favorites.map(String).includes(String(ex.id));
        const item = document.createElement('div'); item.className='lib-item';
        
        let deleteBtn = '';
        if(ex.isCustom) {
            deleteBtn = `<span class="lib-delete" onclick="deleteCustomExercise('${ex.id}', event)" style="margin-right:10px; color:#ff4444; cursor:pointer;">🗑</span>`;
        }

        const safeName = ex.name.replace(/'/g, "\\'");
        const safeTarget = ex.target.replace(/'/g, "\\'");
        const safeGif = ex.gifUrl || '';
        const capitalizedTarget = ex.target.charAt(0).toUpperCase() + ex.target.slice(1);

        item.innerHTML = `
            <div class="lib-info" onclick="showExerciseDetails('${safeName}', '${safeTarget}', '${safeGif}')">
                <span class="lib-name">${ex.name}</span>
                <div class="lib-meta">${capitalizedTarget}</div>
            </div>
            <div class="lib-actions">
                ${deleteBtn}
                <span class="lib-star ${isFav?'starred':''}" onclick="toggleFav('${ex.id}', this)">★</span>
                <button class="btn-add-small" onclick="addExToPlan('${ex.id}', '${safeName}')">+</button>
            </div>`;
        c.appendChild(item);
    });
}

function toggleFav(id, el) {
    const sId = String(id); const idx = favorites.indexOf(sId);
    if(idx===-1) { favorites.push(sId); el.classList.add('starred'); } else { favorites.splice(idx,1); el.classList.remove('starred'); }
    saveFavorites(); if(currentFilter==='favorites') renderLibraryList();
}

function addExToPlan(id, name) {
    const newEx = { id: id, name: name, setsData: [{weight:0, reps:0}, {weight:0, reps:0}, {weight:0, reps:0}] };
    templates[currentTemplateIndex].schedule[currentDayIndex].exercises.push(newEx);
    saveTemplates(); closeLibrary(); renderDayPlan();
}

window.addSet = addSet;
window.removeSet = removeSet;
window.removeEx = removeEx;
window.updateSet = updateSet;
window.toggleFav = toggleFav;
window.addExToPlan = addExToPlan;
window.openLibrary = openLibrary;
window.closeLibrary = closeLibrary;
window.filterBodyPart = filterBodyPart;
window.createNewPlan = createNewPlan;
window.renamePlan = renamePlan;
window.deletePlan = deletePlan;
window.showExerciseDetails = showExerciseDetails;
window.closeGifModal = closeGifModal;
window.submitCustomExercise = submitCustomExercise;