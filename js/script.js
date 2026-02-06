async function loadLayout() {
    try {
        // 1. Identify your repository name dynamically
        // GitHub Pages format: https://username.github.io/RepoName/
        const pathParts = window.location.pathname.split('/');
        const repoName = pathParts[1]; // This grabs "WorkoutApp" from the URL
        const baseUrl = `${window.location.origin}/${repoName}/`;

        // 2. Always fetch layouts relative to the Repository Root
        const [navRes, headerRes] = await Promise.all([
            fetch(`${baseUrl}layout/navbar.html`),
            fetch(`${baseUrl}layout/header.html`)
        ]);

        if (!navRes.ok || !headerRes.ok) throw new Error("Layout components failed to load");

        const navText = await navRes.text();
        const headerText = await headerRes.text();

        document.body.insertAdjacentHTML('afterbegin', headerText);
        document.body.insertAdjacentHTML('beforeend', navText);

        // Ensure these functions exist before calling
        if (typeof updatePageTitle === "function") updatePageTitle();
        if (typeof highlightActiveTab === "function") highlightActiveTab();
        
        requestAnimationFrame(() => {
            if (typeof adjustContentPadding === "function") adjustContentPadding();
        });

    } catch (error) {
        console.error('PWA Layout Error:', error);
    }
}

function adjustContentPadding() {
    const header = document.querySelector('.top-bar');
    const container = document.querySelector('.container');
    const workoutNav = document.getElementById('template-tabs');
    
    if (header && container) {
        const headerHeight = header.offsetHeight;
        document.documentElement.style.setProperty('--header-real-height', headerHeight + 'px');
        
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

// Add this at the very bottom of script.js
(function(a, b, c) {
    if (c in b && b[c]) {
        var d, e = a.location,
            f = /^(a|html)$/i;
        a.addEventListener("click", function(a) {
            d = a.target;
            while (!f.test(d.nodeName)) d = d.parentNode;
            if ("href" in d && (d.href.indexOf("http") || ~d.href.indexOf(e.host)) && (d.type !== "file")) {
                a.preventDefault();
                e.href = d.href;
            }
        }, !1);
    }
})(document, window.navigator, "standalone");