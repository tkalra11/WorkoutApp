// js/workout2.js

let exercisesDB = {};
let customExercises = [];
let favorites = [];
let templates = [];
let currentTemplateIndex = 0;
// We don't rely on currentDayIndex global for rendering anymore, 
// but we use it to scroll to the right day initially.
let initialDayIndex = new Date().getDay() - 1; 
if (initialDayIndex < 0) initialDayIndex = 6; 

const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

// Tracks which day card opened the library
let targetDayIndexForAdd = 0; 

document.addEventListener('DOMContentLoaded', async () => {
    loadData();
    await loadExerciseDatabase();
    initUI();
    
    // Header Height Fix
    setTimeout(() => {
        const header = document.querySelector('.top-bar');
        if (header) document.documentElement.style.setProperty('--actual-header-height', header.offsetHeight + 'px');
        
        // SCROLL TO TODAY
        const track = document.getElementById('carousel-track');
        if(track && track.children[initialDayIndex]) {
            track.children[initialDayIndex].scrollIntoView({ behavior: 'auto', inline: 'center' });
        }
    }, 100);
});

// --- DATA MANAGEMENT (Same as workouts.js) ---
function loadData() {
    const t = localStorage.getItem('workout_templates');
    templates = t ? JSON.parse(t) : [{ id: "p1", name: "Default Plan", active: true, schedule: Array(7).fill(null).map(()=>({isRest:false, exercises:[]})) }];
    if (!t) saveTemplates();

    const c = localStorage.getItem('custom_exercises');
    customExercises = c ? JSON.parse(c) : [];

    const f = localStorage.getItem('exercise_favorites');
    favorites = f ? JSON.parse(f) : [];
}

function saveTemplates() { localStorage.setItem('workout_templates', JSON.stringify(templates)); }
function saveCustom() { localStorage.setItem('custom_exercises', JSON.stringify(customExercises)); }
function saveFavorites() { localStorage.setItem('exercise_favorites', JSON.stringify(favorites)); }

async function loadExerciseDatabase() {
    try {
        const response = await fetch('../data/fitness_exercises_by_bodyPart.json');
        if (!response.ok) throw new Error("JSON not found");
        exercisesDB = await response.json();
    } catch (e) { console.error(e); }
}

function initUI() {
    renderTemplateTabs();
    renderCarousel(); // CHANGED: Renders all days at once
    const s = document.getElementById('search-bar');
    if (s) s.addEventListener('input', renderLibraryList);
}

// --- TABS (Same logic) ---
function renderTemplateTabs() {
    const c = document.getElementById('template-tabs');
    if (!c) return;
    c.innerHTML = '';
    templates.forEach((t, i) => {
        const tab = document.createElement('div');
        tab.className = `template-tab ${i === currentTemplateIndex ? 'active' : ''}`;
        
        const span = document.createElement('span');
        span.textContent = t.name;
        span.onclick = () => { currentTemplateIndex = i; renderTemplateTabs(); renderCarousel(); };
        tab.appendChild(span);

        // Edit Controls (Only logic needed to keep it syncing)
        if (i === currentTemplateIndex) {
            // ... (Same edit logic as workouts.js) ...
            // Keeping it simple for the clone, but you can copy the edit logic here if needed
        }
        c.appendChild(tab);
    });
}

// --- CAROUSEL RENDERING (The Magic) ---
function renderCarousel() {
    const track = document.getElementById('carousel-track');
    track.innerHTML = '';

    const currentSchedule = templates[currentTemplateIndex].schedule;

    // Loop through all 7 days and build cards
    daysOfWeek.forEach((dayName, dayIndex) => {
        const plan = currentSchedule[dayIndex];
        const card = document.createElement('div');
        card.className = 'day-card';
        
        // Generate Exercise List HTML
        let contentHtml = '';
        
        if (plan.isRest) {
            contentHtml = `
                <div style="text-align:center; padding:50px 20px; color:#666;">
                    <h3>Rest Day 😴</h3>
                    <p style="margin-top:10px">Recovery is key.</p>
                    <button class="btn-add" onclick="toggleRest(${dayIndex}, false)">Enable Workout</button>
                </div>`;
        } else {
            // Render Exercises
            if (plan.exercises.length === 0) {
                contentHtml = `<div style="text-align:center; padding:30px; color:#555;">No exercises planned yet.</div>`;
            } else {
                plan.exercises.forEach((ex, exIdx) => {
                    // (Same Sets Logic)
                    if (!ex.setsData) ex.setsData = Array(ex.sets||3).fill({weight:0, reps: ex.targetReps||0});
                    
                    let setsHtml = '';
                    ex.setsData.forEach((s, sIdx) => {
                        setsHtml += `
                            <div class="set-row">
                                <span class="set-num">${sIdx+1}</span>
                                <input type="number" placeholder="kg" value="${s.weight}" min="0" onchange="updateSet(${dayIndex}, ${exIdx}, ${sIdx}, 'weight', this.value)">
                                <input type="number" placeholder="reps" value="${s.reps}" min="0" onchange="updateSet(${dayIndex}, ${exIdx}, ${sIdx}, 'reps', this.value)">
                            </div>`;
                    });

                    contentHtml += `
                        <div class="exercise-card">
                            <div class="ex-header">
                                <span class="ex-name">${ex.name}</span>
                                <span class="ex-remove" onclick="removeEx(${dayIndex}, ${exIdx})">×</span>
                            </div>
                            <div class="ex-sets-container">
                                <div class="set-header"><span>Set</span><span>Weight</span><span>Reps</span></div>
                                ${setsHtml}
                                <div class="set-actions">
                                    <button class="btn-set-action" onclick="addSet(${dayIndex}, ${exIdx})">+</button>
                                    <button class="btn-set-action remove" onclick="removeSet(${dayIndex}, ${exIdx})">-</button>
                                </div>
                            </div>
                        </div>`;
                });
            }
            // Add Button
            contentHtml += `<button class="btn-add" onclick="openLibraryForDay(${dayIndex})">+ Add Exercise</button>`;
            
            // Rest Toggle Button (Small)
            contentHtml += `<div style="text-align:center; margin-top:20px;"><button style="background:none; border:none; color:#444; font-size:12px;" onclick="toggleRest(${dayIndex}, true)">Switch to Rest Day</button></div>`;
        }

        // Card Structure
        card.innerHTML = `
            <div class="day-card-header">
                <div class="day-card-title">${dayName}</div>
                <div class="day-card-subtitle">${plan.isRest ? 'Rest Day' : plan.exercises.length + ' Exercises'}</div>
            </div>
            <div class="day-card-content">
                ${contentHtml}
            </div>
        `;
        
        track.appendChild(card);
    });
}

// --- ACTIONS (Modified to accept DayIndex) ---

function toggleRest(dayIndex, isRest) {
    templates[currentTemplateIndex].schedule[dayIndex].isRest = isRest;
    saveTemplates();
    renderCarousel();
}

function updateSet(dI, exI, sI, f, v) {
    if(v<0) v=0;
    templates[currentTemplateIndex].schedule[dI].exercises[exI].setsData[sI][f] = v;
    saveTemplates();
}
function addSet(dI, exI) {
    const ex = templates[currentTemplateIndex].schedule[dI].exercises[exI];
    const last = ex.setsData[ex.setsData.length-1] || {weight:0, reps:0};
    ex.setsData.push({...last}); saveTemplates(); renderCarousel();
}
function removeSet(dI, exI) {
    const ex = templates[currentTemplateIndex].schedule[dI].exercises[exI];
    if(ex.setsData.length>1) { ex.setsData.pop(); saveTemplates(); renderCarousel(); }
}
function removeEx(dI, exI) {
    if(confirm("Remove exercise?")) {
        templates[currentTemplateIndex].schedule[dI].exercises.splice(exI, 1);
        saveTemplates(); renderCarousel();
    }
}

// --- LIBRARY (Modified to target specific day) ---
let currentFilter = 'chest';

function openLibraryForDay(dayIndex) {
    targetDayIndexForAdd = dayIndex; // STORE THE TARGET DAY
    document.getElementById('library-modal').classList.add('active'); 
    filterBodyPart('chest'); 
}

function closeLibrary() { document.getElementById('library-modal').classList.remove('active'); }

function addExToPlan(id, name) {
    const newEx = { id: id, name: name, setsData: [{weight:0, reps:0}, {weight:0, reps:0}, {weight:0, reps:0}] };
    
    // Use the stored targetDayIndex
    templates[currentTemplateIndex].schedule[targetDayIndexForAdd].exercises.push(newEx);
    saveTemplates(); 
    closeLibrary(); 
    renderCarousel(); // Re-render to show new exercise
}

// ... (Rest of Library/Custom Exercise logic same as workouts.js) ...
// Copy the filterBodyPart, renderLibraryList, createCustomExercise, deleteCustomExercise, toggleFav 
// from your workouts.js here unchanged. They work fine.

function filterBodyPart(cat) {
    currentFilter = cat;
    document.querySelectorAll('.chip').forEach(c => {
        c.classList.remove('active');
        if(c.innerText.toLowerCase() === cat) c.classList.add('active');
    });
    renderLibraryList();
}

function renderLibraryList() {
    // ... Copy exact logic from workouts.js ...
    // Just ensure the add button calls addExToPlan with just ID and Name
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
        if(ex.isCustom) deleteBtn = `<span class="lib-delete" onclick="deleteCustomExercise('${ex.id}', event)" style="margin-right:10px; color:#ff4444; cursor:pointer;">🗑</span>`;

        item.innerHTML = `
            <div class="lib-info"><span class="lib-name">${ex.name}</span><div class="lib-meta">${ex.target}</div></div>
            <div class="lib-actions">
                ${deleteBtn}
                <span class="lib-star ${isFav?'starred':''}" onclick="toggleFav('${ex.id}', this)">★</span>
                <button class="btn-add-small" onclick="addExToPlan('${ex.id}', '${ex.name.replace(/'/g, "\\'")}')">+</button>
            </div>`;
        c.appendChild(item);
    });
}

function createCustomExercise() {
    const rawName = prompt("Name:"); if(!rawName) return;
    const n = rawName.charAt(0).toUpperCase() + rawName.slice(1);
    const t = prompt("Body Part (chest, back...):");
    const newEx = { id: "c"+Date.now(), name: n, target: "custom", bodyPart: t?t.toLowerCase():"custom", isCustom: true };
    customExercises.push(newEx); saveCustom(); addExToPlan(newEx.id, newEx.name);
}

function deleteCustomExercise(id, e) {
    e.stopPropagation();
    if(confirm("Delete this custom exercise?")) {
        customExercises = customExercises.filter(ex => ex.id !== id);
        saveCustom(); renderLibraryList();
    }
}

function toggleFav(id, el) {
    const sId = String(id); const idx = favorites.indexOf(sId);
    if(idx===-1) { favorites.push(sId); el.classList.add('starred'); } else { favorites.splice(idx,1); el.classList.remove('starred'); }
    saveFavorites(); if(currentFilter==='favorites') renderLibraryList();
}