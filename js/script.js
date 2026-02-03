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
        document.body.insertAdjacentHTML('beforeend', navText);
        document.body.insertAdjacentHTML('afterbegin', headerText);

        // 3. Use requestAnimationFrame to ensure the browser has painted the elements
        // before we try to measure their height
        requestAnimationFrame(() => {
            adjustContentPadding();
            updatePageTitle();
            highlightActiveTab();
            
            // Trigger specific workout layout fix if on that page
            if (typeof renderDayPlan === "function") {
                const header = document.querySelector('.top-bar');
                if (header) {
                    document.documentElement.style.setProperty('--actual-header-height', header.offsetHeight + 'px');
                }
            }
        });

    } catch (error) {
        console.error('Error loading layout:', error);
    }
}

function adjustContentPadding() {
    const header = document.querySelector('.top-bar');
    const container = document.querySelector('.container');
    
    if (header && container) {
        const headerHeight = header.offsetHeight;
        // Use a CSS variable so we can access this height in style.css
        document.documentElement.style.setProperty('--header-real-height', headerHeight + 'px');
        container.style.paddingTop = (headerHeight + 20) + 'px';
    }
}

// BULLETPROOF PWA NAVIGATION: Prevents Safari Breakout
document.addEventListener('click', function(e) {
    const target = e.target.closest('a');
    if (target && target.getAttribute('href') && target.hostname === window.location.hostname) {
        e.preventDefault(); 
        window.location.href = target.href;
    }
}, false);

document.addEventListener('DOMContentLoaded', loadLayout);
window.addEventListener('resize', adjustContentPadding);