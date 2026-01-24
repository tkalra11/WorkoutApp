# Fitness App Codebase Documentation

## 1. Architecture Overview
This is a Vanilla JavaScript Progressive Web App (PWA). It uses no frameworks.
- **Storage:** `localStorage` (browser memory) to save plans, exercises, and history.
- **Routing:** File-based (`index.html`, `workouts.html`, etc.).
- **Layout:** `script.js` dynamically injects the Header and Bottom Navbar into every page to ensure consistency.

## 2. File Structure
- `index.html`, `workouts.html`: The pages.
- `style.css`: The single source of truth for styles. Uses CSS Variables for iPhone Safe Areas.
- `script.js`: Runs on EVERY page. Handles:
  - Header/Navbar injection.
  - Active tab highlighting.
  - iPhone Safe Area calculations.
- `workouts.js`: Runs ONLY on `workouts.html`. Handles:
  - Loading JSON database.
  - Managing workout templates (CRUD).
  - Favorites system.
  - Library filtering logic.

## 3. Data Models (LocalStorage)
The app saves data in 3 keys:

1. `workout_templates`:
   - Array of Plan objects.
   - Each Plan has a `schedule` array (0-6 for Mon-Sun).
   - Each Day has `isRest` (bool) and `exercises` (array).

2. `custom_exercises`:
   - Array of user-created exercises.
   - Structure matches the main JSON DB: `{ id, name, target, bodyPart }`.

3. `exercise_favorites`:
   - Simple array of Exercise IDs strings: `["001", "cust_123"]`.

## 4. Key Logic Flows

### The "Body Part" Mapping
The JSON file uses technical terms (`upper arms`, `waist`).
The App uses user-friendly terms (`Arms`, `Abs`).
**Logic Location:** `workouts.js` -> `renderLibraryList()`
This function maps the UI selection (e.g., 'arms') to the multiple JSON keys (`lower arms` + `upper arms`) to build the list.

### Safe Area Handling
**Logic Location:** `style.css`
- `env(safe-area-inset-top)`: Pushes content down on notched iPhones.
- `padding-bottom`: Ensures the navbar doesn't sit on the home swipe bar.

## 5. How to Edit
- **Change Colors:** Edit `style.css` colors (Currently Dark Mode #121212).
- **Add Exercises:** Update `fitness_exercises_by_bodyPart.json`.