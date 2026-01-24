// workouts.js

// --- STATE ---
let exercisesDB = {};
let customExercises = [];
let favorites = [];
let templates = [];
let currentTemplateIndex = 0;
let currentDayIndex = new Date().getDay() - 1; 
if (currentDayIndex < 0) currentDayIndex = 6; 

const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', async () => {
    loadData();
    await loadExerciseDatabase();
    initUI();
});

// --- DATA MANAGEMENT ---
function loadData() {
    // Templates
    const storedTemplates = localStorage.getItem('workout_templates');
    if (storedTemplates) {
        templates = JSON.parse(storedTemplates);
    } else {
        templates = [{
            id: "plan_default",
            name: "Default Workout Plan",
            active: true,
            schedule: Array(7).fill(null).map(() => ({ isRest: false, exercises: [] }))
        }];
        saveTemplates();
    }

    // Custom Exercises
    const storedCustom = localStorage.getItem('custom_exercises');
    customExercises = storedCustom ? JSON.parse(storedCustom) : [];

    // Favorites
    const storedFavs = localStorage.getItem('exercise_favorites');
    favorites = storedFavs ? JSON.parse(storedFavs) : [];
}

function saveTemplates() {
    localStorage.setItem('workout_templates', JSON.stringify(templates));
}

function saveCustom() {
    localStorage.setItem('custom_exercises', JSON.stringify(customExercises));
}

function saveFavorites() {
    localStorage.setItem('exercise_favorites', JSON.stringify(favorites));
}

async function loadExerciseDatabase() {
    try {
        const response = await fetch('fitness_exercises_by_bodyPart.json');
        if (!response.ok) throw new Error("JSON not found");
        exercisesDB = await response.json();
    } catch (error) {
        console.error("DB Load Error:", error);
    }
}

// --- UI RENDERING ---
function initUI() {
    renderTemplateTabs();
    renderDaySelector();
    renderDayPlan();
    
    // Search Listener
    const searchInput = document.getElementById('search-bar');
    if (searchInput) searchInput.addEventListener('input', renderLibraryList);
}

function renderTemplateTabs() {
    const container = document.getElementById('template-tabs');
    if (!container) return;
    container.innerHTML = '';

    // Render existing plans
    templates.forEach((temp, index) => {
        const tab = document.createElement('div');
        tab.className = `template-tab ${index === currentTemplateIndex ? 'active' : ''}`;
        
        // Editable Name span
        const nameSpan = document.createElement('span');
        nameSpan.textContent = temp.name;
        tab.appendChild(nameSpan);

        tab.onclick = () => {
            currentTemplateIndex = index;
            renderTemplateTabs();
            renderDayPlan();
        };
        container.appendChild(tab);
    });

    // Add "+" Button
    const addBtn = document.createElement('div');
    addBtn.className = 'template-tab';
    addBtn.innerHTML = '+';
    addBtn.onclick = createNewPlan;
    container.appendChild(addBtn);
}

function createNewPlan() {
    const name = prompt("Name your new plan:");
    if (!name) return;
    
    templates.push({
        id: "plan_" + Date.now(),
        name: name,
        active: false,
        schedule: Array(7).fill(null).map(() => ({ isRest: false, exercises: [] }))
    });
    
    saveTemplates();
    currentTemplateIndex = templates.length - 1; // Switch to new plan
    renderTemplateTabs();
    renderDayPlan();
}

function renderDaySelector() {
    const container = document.getElementById('day-selector');
    if (!container) return;
    container.innerHTML = '';
    const labels = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
    
    labels.forEach((label, index) => {
        const bubble = document.createElement('div');
        bubble.className = `day-bubble ${index === currentDayIndex ? 'active' : ''}`;
        bubble.textContent = label;
        bubble.onclick = () => {
            currentDayIndex = index;
            renderDaySelector();
            renderDayPlan();
        };
        container.appendChild(bubble);
    });
}

function renderDayPlan() {
    const dayHeader = document.getElementById('current-day-name');
    if (dayHeader) dayHeader.textContent = daysOfWeek[currentDayIndex];

    const currentPlan = templates[currentTemplateIndex].schedule[currentDayIndex];
    const listContainer = document.getElementById('exercise-list');
    const restToggle = document.getElementById('rest-toggle');

    // Rest Toggle
    if (restToggle) {
        const newToggle = restToggle.cloneNode(true);
        restToggle.parentNode.replaceChild(newToggle, restToggle);
        newToggle.checked = currentPlan.isRest;
        newToggle.addEventListener('change', (e) => {
            templates[currentTemplateIndex].schedule[currentDayIndex].isRest = e.target.checked;
            saveTemplates();
            renderDayPlan();
        });
    }

    listContainer.innerHTML = '';

    // Show exercises regardless of rest day status (as requested)
    if (currentPlan.exercises.length === 0) {
        listContainer.innerHTML = `
            <div style="text-align:center; padding:40px; color:#666;">
                ${currentPlan.isRest ? '<p>Rest Day Active</p>' : ''}
                <p>No exercises planned.</p>
            </div>`;
    } else {
        currentPlan.exercises.forEach((exercise, index) => {
            const item = document.createElement('div');
            item.className = 'exercise-card';
            item.innerHTML = `
                <div class="ex-header">
                    <span class="ex-name">${exercise.name}</span>
                    <span class="ex-remove" onclick="removeExercise(${index})">×</span>
                </div>
                <div class="ex-details">
                    <div class="input-group">
                        <label>Sets</label>
                        <input type="number" value="${exercise.sets}" onchange="updateEx(${index}, 'sets', this.value)">
                    </div>
                    <div class="input-group">
                        <label>Reps</label>
                        <input type="text" value="${exercise.targetReps}" onchange="updateEx(${index}, 'targetReps', this.value)">
                    </div>
                </div>
            `;
            listContainer.appendChild(item);
        });
    }
}

// --- ACTIONS ---
function updateEx(index, field, value) {
    templates[currentTemplateIndex].schedule[currentDayIndex].exercises[index][field] = value;
    saveTemplates();
}

function removeExercise(index) {
    if (confirm("Remove exercise?")) {
        templates[currentTemplateIndex].schedule[currentDayIndex].exercises.splice(index, 1);
        saveTemplates();
        renderDayPlan();
    }
}

function createCustomExercise() {
    const name = prompt("Exercise Name:");
    if (!name) return;
    const target = prompt("Body Part (chest, back, legs, arms, abs, shoulders, cardio):");
    
    const newEx = {
        id: "cust_" + Date.now(),
        name: name,
        target: "custom",
        bodyPart: target ? target.toLowerCase() : "custom", 
        isCustom: true
    };
    
    customExercises.push(newEx);
    saveCustom();
    addExerciseToPlan(newEx.id, newEx.name);
}

// --- LIBRARY MODAL ---
let currentFilter = 'favorites'; // Default filter

function openLibrary() {
    document.getElementById('library-modal').classList.add('active');
    filterBodyPart('favorites'); // Reset to favorites on open
}

function closeLibrary() {
    document.getElementById('library-modal').classList.remove('active');
}

function filterBodyPart(category) {
    currentFilter = category;
    
    // Update Chips UI
    document.querySelectorAll('.chip').forEach(c => {
        c.classList.remove('active');
        if (c.innerText.toLowerCase() === category) c.classList.add('active');
    });
    
    renderLibraryList();
}

function renderLibraryList() {
    const query = document.getElementById('search-bar').value.toLowerCase();
    const container = document.getElementById('library-list');
    container.innerHTML = '';

    let list = [];

    // 1. DATA GATHERING & MAPPING
    // Map UI categories to JSON keys
    const map = {
        'chest': ['chest'],
        'back': ['back'],
        'shoulders': ['shoulders', 'neck'],
        'arms': ['lower arms', 'upper arms'],
        'legs': ['lower legs', 'upper legs'],
        'abs': ['waist'],
        'cardio': ['cardio']
    };

    if (currentFilter === 'favorites') {
        // Collect all favorite IDs
        const favIds = new Set(favorites);
        
        // Search in JSON
        Object.values(exercisesDB).flat().forEach(ex => {
            if (favIds.has(ex.id)) list.push(ex);
        });
        // Search in Custom
        customExercises.forEach(ex => {
            if (favIds.has(ex.id)) list.push(ex);
        });

    } else if (currentFilter === 'custom') {
        list = customExercises;

    } else {
        // Normal Category
        const jsonKeys = map[currentFilter] || [];
        
        // Add JSON exercises
        jsonKeys.forEach(key => {
            if (exercisesDB[key]) list = list.concat(exercisesDB[key]);
        });

        // Add Custom exercises that match this body part
        const matchingCustom = customExercises.filter(ex => ex.bodyPart === currentFilter);
        list = list.concat(matchingCustom);
    }

    // 2. SEARCH FILTER
    if (query) {
        list = list.filter(ex => ex.name.toLowerCase().includes(query));
    }

    // 3. RENDER (Lazy limit 50)
    if (list.length === 0) {
        container.innerHTML = `<div style="padding:20px; text-align:center; color:#666;">No exercises found.</div>`;
        return;
    }

    list.slice(0, 50).forEach(ex => {
        const isFav = favorites.includes(ex.id);
        const item = document.createElement('div');
        item.className = 'lib-item';
        item.innerHTML = `
            <div class="lib-info">
                <div class="lib-name-row">
                    <span class="lib-star ${isFav ? 'starred' : ''}" onclick="toggleFav('${ex.id}', this)">★</span>
                    <span class="lib-name">${ex.name}</span>
                </div>
                <div class="lib-meta">${ex.target}</div>
            </div>
            <button class="btn-add-small" onclick="addExerciseToPlan('${ex.id}', '${ex.name.replace(/'/g, "\\'")}')">+</button>
        `;
        container.appendChild(item);
    });
}

function toggleFav(id, starElement) {
    const idx = favorites.indexOf(id);
    if (idx === -1) {
        favorites.push(id);
        starElement.classList.add('starred');
    } else {
        favorites.splice(idx, 1);
        starElement.classList.remove('starred');
    }
    saveFavorites();
    // If currently viewing favorites tab, refresh list to remove un-starred
    if (currentFilter === 'favorites') renderLibraryList();
}

function addExerciseToPlan(id, name) {
    const newEx = {
        id: id,
        name: name,
        sets: 3,
        targetReps: "10"
    };
    
    templates[currentTemplateIndex].schedule[currentDayIndex].exercises.push(newEx);
    saveTemplates();
    closeLibrary();
    renderDayPlan();
}