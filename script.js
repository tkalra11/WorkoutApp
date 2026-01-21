// script.js - v5 (Auto-Layout Fix)

async function loadLayout() {
    try {
        // 1. Load Navbar (Bottom)
        const navResponse = await fetch('navbar.html');
        const navText = await navResponse.text();
        document.body.insertAdjacentHTML('beforeend', navText);

        // 2. Load Header (Top)
        const headerResponse = await fetch('header.html');
        const headerText = await headerResponse.text();
        document.body.insertAdjacentHTML('afterbegin', headerText);

        // 3. Set the Title dynamically
        updatePageTitle();

        // 4. Highlight active tab
        highlightActiveTab();

        // 5. NEW: Fix the overlap by measuring the real header height
        adjustContentPadding();

    } catch (error) {
        console.error('Error loading layout:', error);
    }
}

// NEW FUNCTION: Automatically pushes content down
function adjustContentPadding() {
    const header = document.querySelector('.top-bar');
    const container = document.querySelector('.container');
    
    if (header && container) {
        // Measure the header's actual height (including the notch area)
        const headerHeight = header.offsetHeight;
        
        // Apply that height + 20px of extra space to the container
        container.style.paddingTop = (headerHeight + 20) + 'px';
    }
}

function updatePageTitle() {
    const path = window.location.pathname.split('/').pop() || 'index.html';
    const titleElement = document.getElementById('page-title');

    // Default to Dashboard if element not found or path is empty
    if (!titleElement) return;

    if (path.includes('meals')) {
        titleElement.textContent = 'Meals';
    } else if (path.includes('workouts')) {
        titleElement.textContent = 'Workouts';
    } else if (path.includes('progress')) {
        titleElement.textContent = 'Progress';
    } else {
        titleElement.textContent = 'Dashboard';
    }
}

function highlightActiveTab() {
    const currentPath = window.location.pathname.split('/').pop() || 'index.html';
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
        if (item.getAttribute('href') === currentPath) {
            item.classList.add('active');
        }
    });
}

// Link Breakout Fix
document.addEventListener('click', function(e) {
    var target = e.target.closest('a');
    if (target && target.hostname === window.location.hostname) {
        e.preventDefault(); 
        window.location.href = target.href;
    }
}, false);

// Run the layout loader
document.addEventListener('DOMContentLoaded', loadLayout);

// EXTRA SAFETY: Run the adjuster again if the user rotates their phone
window.addEventListener('resize', adjustContentPadding);