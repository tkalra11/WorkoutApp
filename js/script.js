// script.js - Updated for PWA Stability and Layout Fixes

async function loadLayout() {
    try {
        // 1. Fetch both components simultaneously
        const [navRes, headerRes] = await Promise.all([
            fetch('../layout/navbar.html'),
            fetch('../layout/header.html')
        ]);

        const navText = await navRes.text();
        const headerText = await headerRes.text();

        // 2. Inject into DOM
        document.body.insertAdjacentHTML('afterbegin', headerText);
        document.body.insertAdjacentHTML('beforeend', navText);

        // 3. Immediate logic execution
        updatePageTitle();
        highlightActiveTab();
        
        // 4. Measure and adjust padding after the browser has had a moment to render
        requestAnimationFrame(() => {
            adjustContentPadding();
        });

    } catch (error) {
        console.error('Error loading layout:', error);
    }
}

function adjustContentPadding() {
    const header = document.querySelector('.top-bar');
    const container = document.querySelector('.container');
    const workoutNav = document.getElementById('template-tabs');
    
    if (header && container) {
        const headerHeight = header.offsetHeight;
        // Save header height to a CSS variable for global use
        document.documentElement.style.setProperty('--header-real-height', headerHeight + 'px');
        
        // Check if we are on the workout page (which has an extra nav bar)
        if (workoutNav) {
            // Header + Tab Height (50) + Margin (20)
            container.style.paddingTop = (headerHeight + 50 + 20) + 'px';
        } else {
            // Header + Margin (20)
            container.style.paddingTop = (headerHeight + 20) + 'px';
        }
    }
}

function updatePageTitle() {
    const path = window.location.pathname.split('/').pop() || 'dashboard.html';
    const titleElement = document.getElementById('page-title');
    
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
    const currentPath = window.location.pathname.split('/').pop() || 'dashboard.html';
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
        const href = item.getAttribute('href');
        if (href && href.includes(currentPath)) {
            item.classList.add('active');
        }
    });
}

// PWA FIX: Prevents Safari from showing browser UI when navigating
document.addEventListener('click', function(e) {
    const target = e.target.closest('a');
    if (target && target.getAttribute('href')) {
        const href = target.getAttribute('href');
        // Check if it's an internal link
        if (!href.startsWith('http') || href.includes(window.location.hostname)) {
            e.preventDefault();
            window.location.href = target.href;
        }
    }
}, false);

document.addEventListener('DOMContentLoaded', loadLayout);
window.addEventListener('resize', adjustContentPadding);