// Theme Loader Script - This runs immediately to prevent theme flickering
(function() {
    // Add a class to prevent FOUC (Flash of Unstyled Content)
    document.documentElement.classList.add('theme-loading');
    
    // Apply theme immediately before any content loads
    const savedTheme = localStorage.getItem('theme') || 'light';
    const darkModeOn = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const isDark = savedTheme === 'dark' || (savedTheme === 'auto' && darkModeOn);
    
    // Set initial theme class on html element only for now
    document.documentElement.classList.toggle('dark-mode', isDark);
    
    // Define the theme function in the global scope
    window.setTheme = function(theme) {
        // Determine if dark mode should be active
        const darkModeOn = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const isDark = theme === 'dark' || (theme === 'auto' && darkModeOn);
        
        // Toggle dark-mode class on both html and body elements
        document.documentElement.classList.toggle('dark-mode', isDark);
        if (document.body) {
            document.body.classList.toggle('dark-mode', isDark);
        }
        
        // Update theme toggle icons if they exist
        const themeToggle = document.getElementById('theme-toggle');
        if (themeToggle) {
            const moonIcon = themeToggle.querySelector('.moon-icon');
            const sunIcon = themeToggle.querySelector('.sun-icon');
            
            if (moonIcon && sunIcon) {
                moonIcon.style.opacity = isDark ? '0' : '1';
                sunIcon.style.opacity = isDark ? '1' : '0';
            }
        }
        
        // Save the theme preference
        localStorage.setItem('theme', theme);
    };
    
    // Apply theme when DOM is ready
    document.addEventListener('DOMContentLoaded', function() {
        // Remove the loading class
        document.documentElement.classList.remove('theme-loading');
        
        // Set initial theme
        window.setTheme(savedTheme);
        
        // Watch for system preference changes
        if (savedTheme === 'auto') {
            const darkModeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
            darkModeMediaQuery.addEventListener('change', (e) => {
                window.setTheme('auto');
            });
        }
    });
})(); 