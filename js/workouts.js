// js/workouts.js

let exercisesDB = {};
let customExercises = [];
let favorites = [];
let templates = [];
let currentTemplateIndex = 0;
let currentDayIndex = new Date().getDay() - 1; 
if (currentDayIndex < 0) currentDayIndex = 6; 

const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

document.addEventListener('DOMContentLoaded', async () => {
    loadData();
    await loadExerciseDatabase();
    initUI();
    
    setTimeout(() => {
        const header = document.querySelector('.top-bar');
        if (header) {
            document.documentElement.style.setProperty('--actual-header-height', header.offsetHeight + 'px');
        }
    }, 100);
});

// --- DATA MANAGEMENT ---
function loadData() {
    const t = localStorage.getItem('workout_templates');
    if (t) {
        templates = JSON.parse(t);
    } else {
        templates = [{ 
            id: "p1", 
            name: "Default Plan", 
            active: true, 
            schedule: Array(7).fill(null).map(()=>({ isRest: false, exercises: [], dayName: "" })) 
        }];
        saveTemplates();
    }

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
    const rawName = prompt("Name:"); 
    if(!rawName) return;
    const n = rawName.charAt(0).toUpperCase() + rawName.slice(1);
    const t = prompt("Body Part (chest, back...):");
    const newEx = { id: "c"+Date.now(), name: n, target: "custom", bodyPart: t?t.toLowerCase():"custom", isCustom: true };
    customExercises.push(newEx); saveCustom(); addExToPlan(newEx.id, newEx.name);
}

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

        item.innerHTML = `
            <div class="lib-info" onclick="showExerciseDetails('${safeName}', '${safeTarget}', '${safeGif}')">
                <span class="lib-name">${ex.name}</span>
                <div class="lib-meta">${ex.target}</div>
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