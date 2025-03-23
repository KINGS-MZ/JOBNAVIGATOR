// This script runs immediately as it's loaded (before DOM is ready)
// to prevent theme flickering when navigating between pages

// Theme Loader Script
document.addEventListener('DOMContentLoaded', function() {
    // Get user preference
    const savedTheme = localStorage.getItem('theme') || 'auto';
    
    // Set initial theme
    setTheme(savedTheme);
    
    // Watch for system preference changes
    if (savedTheme === 'auto') {
        const darkModeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        darkModeMediaQuery.addEventListener('change', (e) => {
            const darkModeOn = e.matches;
            setTheme('auto');
        });
    }
    
    // Set theme based on user choice or system preference
    function setTheme(theme) {
        const darkModeOn = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const isDark = theme === 'dark' || (theme === 'auto' && darkModeOn);
        
        document.documentElement.classList.toggle('dark-theme', isDark);
        document.documentElement.classList.toggle('light-theme', !isDark);
        
        // Common variables
        document.documentElement.style.setProperty('--primary-color', '#4361ee');
        document.documentElement.style.setProperty('--primary-color-rgb', '67, 97, 238');
        document.documentElement.style.setProperty('--accent-color', '#2ecc71');
        
        // Set theme specific variables
        if (isDark) {
            // Dark theme variables
            document.documentElement.style.setProperty('--bg-color', '#121212');
            document.documentElement.style.setProperty('--surface-color', '#1e1e1e');
            document.documentElement.style.setProperty('--surface-color-hover', '#2a2a2a');
            document.documentElement.style.setProperty('--text-color', '#ffffff');
            document.documentElement.style.setProperty('--text-color-secondary', '#a0a0a0');
            document.documentElement.style.setProperty('--text-color-tertiary', '#6c6c6c');
            document.documentElement.style.setProperty('--border-color', '#383838');
            document.documentElement.style.setProperty('--border-color-light', '#303030');
            document.documentElement.style.setProperty('--hover-color', 'rgba(255, 255, 255, 0.05)');
            document.documentElement.style.setProperty('--shadow-color', 'rgba(0, 0, 0, 0.4)');
        } else {
            // Light theme variables
            document.documentElement.style.setProperty('--bg-color', '#f5f7fb');
            document.documentElement.style.setProperty('--surface-color', '#ffffff');
            document.documentElement.style.setProperty('--surface-color-hover', '#f5f7fb');
            document.documentElement.style.setProperty('--text-color', '#333333');
            document.documentElement.style.setProperty('--text-color-secondary', '#65676b');
            document.documentElement.style.setProperty('--text-color-tertiary', '#8e8e8e');
            document.documentElement.style.setProperty('--border-color', '#e1e4e8');
            document.documentElement.style.setProperty('--border-color-light', '#f0f0f0');
            document.documentElement.style.setProperty('--hover-color', 'rgba(0, 0, 0, 0.03)');
            document.documentElement.style.setProperty('--shadow-color', 'rgba(0, 0, 0, 0.1)');
        }
    }
    
    // Update theme when settings change
    window.updateTheme = function(theme) {
        localStorage.setItem('theme', theme);
        setTheme(theme);
    };
}); 