// script.js - Final Combined Fixes
async function loadLayout() {
    try {
        const [navRes, headerRes] = await Promise.all([
            fetch('../layout/navbar.html'),
            fetch('../layout/header.html')
        ]);

        const navText = await navRes.text();
        const headerText = await headerRes.text();

        document.body.insertAdjacentHTML('afterbegin', headerText);
        document.body.insertAdjacentHTML('beforeend', navText);

        // Run immediately after injection
        updatePageTitle();
        highlightActiveTab();
        
        requestAnimationFrame(() => {
            adjustContentPadding();
        });

    } catch (error) {
        console.error('Layout failed:', error);
    }
}

function adjustContentPadding() {
    const header = document.querySelector('.top-bar');
    const container = document.querySelector('.container');
    const workoutNav = document.getElementById('template-tabs');
    
    if (header && container) {
        const headerHeight = header.offsetHeight;
        document.documentElement.style.setProperty('--header-real-height', headerHeight + 'px');
        
        // Dynamic padding for workout page (header + tabs + margin) vs others
        const extraSpace = workoutNav ? 70 : 20; 
        container.style.paddingTop = (headerHeight + extraSpace) + 'px';
    }
}

function updatePageTitle() {
    const path = window.location.pathname.split('/').pop() || 'dashboard.html';
    const titleElement = document.getElementById('page-title');
    if (!titleElement) return;

    if (path.includes('meals')) titleElement.textContent = 'Meals';
    else if (path.includes('workouts')) titleElement.textContent = 'Workouts';
    else if (path.includes('progress')) titleElement.textContent = 'Progress';
    else titleElement.textContent = 'Dashboard';
}

function highlightActiveTab() {
    const currentPath = window.location.pathname.split('/').pop() || 'dashboard.html';
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
        if (item.getAttribute('href').includes(currentPath)) {
            item.classList.add('active');
        }
    });
}

// PWA Fix: Force internal links to stay in standalone app mode
document.addEventListener('click', function(e) {
    const target = e.target.closest('a');
    if (target && target.getAttribute('href')) {
        const href = target.getAttribute('href');
        if (!href.startsWith('http') || href.includes(window.location.hostname)) {
            e.preventDefault();
            window.location.href = target.href;
        }
    }
}, false);

document.addEventListener('DOMContentLoaded', loadLayout);
window.addEventListener('resize', adjustContentPadding);