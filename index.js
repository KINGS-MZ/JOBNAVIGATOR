document.addEventListener('DOMContentLoaded', () => {
    // Theme functionality
    const html = document.documentElement;
    const body = document.body;
    const themeToggle = document.getElementById('theme-toggle');
    const sunIcon = themeToggle.querySelector('.fa-sun');
    const moonIcon = themeToggle.querySelector('.fa-moon');

    // Theme toggle functionality (using the same implementation as in nav.js)
    themeToggle.addEventListener('click', () => {
        html.classList.toggle('dark-mode');
        body.classList.toggle('dark-mode');
        
        // Save theme preference
        const isDarkMode = html.classList.contains('dark-mode');
        localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
    });

    // The theme is already applied by the theme-loader.js script
    // This is kept for backward compatibility
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        html.classList.add('dark-mode');
        body.classList.add('dark-mode');
    } else {
        html.classList.remove('dark-mode');
        body.classList.remove('dark-mode');
    }

    // Sponsors section - pause carousel on hover
    const sponsorsTrack = document.querySelector('.sponsors-track');
    if (sponsorsTrack) {
        sponsorsTrack.addEventListener('mouseenter', () => {
            sponsorsTrack.style.animationPlayState = 'paused';
        });
        
        sponsorsTrack.addEventListener('mouseleave', () => {
            sponsorsTrack.style.animationPlayState = 'running';
        });
    }

    // Animate feature cards on scroll
    const featureCards = document.querySelectorAll('.feature-card');
    
    const featureObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, { threshold: 0.1 });

    featureCards.forEach(card => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(50px)';
        card.style.transition = 'all 0.6s ease';
        featureObserver.observe(card);
    });
});
