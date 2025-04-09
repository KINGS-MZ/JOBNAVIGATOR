document.addEventListener('DOMContentLoaded', () => {
    // Theme functionality
    const html = document.documentElement;
    const body = document.body;
    const themeToggle = document.getElementById('theme-toggle');
    const sunIcon = themeToggle.querySelector('.sun-icon');
    const moonIcon = themeToggle.querySelector('.moon-icon');
    const languageToggle = document.getElementById('language-toggle');

    // Theme toggle functionality
    themeToggle.addEventListener('click', () => {
        // Toggle dark mode class on html element only (body will inherit from CSS)
        html.classList.toggle('dark-mode');
        
        // Save theme preference
        const isDarkMode = html.classList.contains('dark-mode');
        localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
    });

    // The theme is already applied by the theme-loader.js script
    // This is kept for backward compatibility
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        html.classList.add('dark-mode');
    } else {
        html.classList.remove('dark-mode');
    }

    // Language toggle functionality
    let currentLanguage = localStorage.getItem('language') || 'en';
    
    languageToggle.addEventListener('click', () => {
        // Toggle between English and French (or add more languages as needed)
        currentLanguage = currentLanguage === 'en' ? 'fr' : 'en';
        localStorage.setItem('language', currentLanguage);
        
        // Show language change notification
        const languageText = currentLanguage === 'en' ? 'English' : 'Français';
        
        // Create or update toast notification
        showToast(`Language changed to ${languageText}`);
        
        // In a real application, you would update UI text here
        // updatePageLanguage(currentLanguage);
    });

    // Simple toast notification function
    function showToast(message) {
        // Check if toast container exists, if not create it
        let toast = document.querySelector('.language-toast');
        if (!toast) {
            toast = document.createElement('div');
            toast.className = 'language-toast';
            document.body.appendChild(toast);
            
            // Add toast styles if not already in CSS
            const style = document.createElement('style');
            style.textContent = `
                .language-toast {
                    position: fixed;
                    bottom: 20px;
                    left: 50%;
                    transform: translateX(-50%);
                    background: var(--primary-blue);
                    color: white;
                    padding: 10px 20px;
                    border-radius: 4px;
                    z-index: 1000;
                    opacity: 0;
                    transition: opacity 0.3s ease;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.2);
                }
                .dark-mode .language-toast {
                    background: var(--primary-green);
                }
                .language-toast.show {
                    opacity: 1;
                }
            `;
            document.head.appendChild(style);
        }
        
        // Set message and show toast
        toast.textContent = message;
        toast.classList.add('show');
        
        // Hide toast after delay
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
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
