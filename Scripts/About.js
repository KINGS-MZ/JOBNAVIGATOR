document.addEventListener('DOMContentLoaded', function() {
    // Theme Toggle
    const themeToggle = document.getElementById('theme-toggle');
    const body = document.body;
    const moonIcon = themeToggle.querySelector('i');

    function updateThemeIcon() {
        const isDark = body.classList.contains('dark-mode');
        moonIcon.className = isDark ? 'fas fa-sun' : 'fas fa-moon';
    }

    themeToggle.addEventListener('click', () => {
        body.classList.toggle('dark-mode');
        body.classList.toggle('light-mode');
        const isDark = body.classList.contains('dark-mode');
        localStorage.setItem('darkMode', isDark);
        updateThemeIcon();
    });

    // Initialize theme
    const isDark = localStorage.getItem('darkMode') === 'true';
    body.classList.add(isDark ? 'dark-mode' : 'light-mode');
    updateThemeIcon();

    // Floating Menu
    const menuBtn = document.querySelector('.menu-btn');
    const menuItems = document.querySelector('.menu-items');

    menuBtn.addEventListener('click', () => {
        menuItems.classList.toggle('active');
        menuBtn.classList.toggle('active');
    });

    // Intersection Observer for animations
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate');
            }
        });
    }, {
        threshold: 0.1
    });

    // Observe all feature cards and sections
    document.querySelectorAll('.feature-card, .mission-section, .cta-section').forEach(el => {
        observer.observe(el);
    });
});
