// Standalone Theme Toggle Script
document.addEventListener('DOMContentLoaded', function() {
    // Get the theme toggle button
    const themeToggle = document.getElementById('theme-toggle');
    
    // Function to toggle theme
    function toggleTheme() {
        // Get current theme from localStorage or default to light
        const currentTheme = localStorage.getItem('theme') || 'light';
        
        // Determine new theme
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        
        // Apply the new theme
        applyTheme(newTheme);
        
        // Save the preference
        localStorage.setItem('theme', newTheme);
    }
    
    // Function to apply theme
    function applyTheme(theme) {
        const isDark = theme === 'dark';
        
        // Toggle dark-theme and light-theme classes on both html and body elements
        document.documentElement.classList.toggle('dark-theme', isDark);
        document.documentElement.classList.toggle('light-theme', !isDark);
        document.body.classList.toggle('dark-theme', isDark);
        document.body.classList.toggle('light-theme', !isDark);
        
        // Update theme toggle icons if they exist
        if (themeToggle) {
            const moonIcon = themeToggle.querySelector('.moon-icon');
            const sunIcon = themeToggle.querySelector('.sun-icon');
            
            if (moonIcon && sunIcon) {
                // Set display to block to ensure visibility
                moonIcon.style.display = 'block';
                sunIcon.style.display = 'block';
                
                // Set opacity based on theme
                moonIcon.style.opacity = isDark ? '0' : '1';
                sunIcon.style.opacity = isDark ? '1' : '0';
                
                // Ensure visibility is set to visible
                moonIcon.style.visibility = 'visible';
                sunIcon.style.visibility = 'visible';
            }
        }
        
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
            document.documentElement.style.setProperty('--surface-color-hover', '#f8f9fa');
            document.documentElement.style.setProperty('--text-color', '#333333');
            document.documentElement.style.setProperty('--text-color-secondary', '#666666');
            document.documentElement.style.setProperty('--text-color-tertiary', '#999999');
            document.documentElement.style.setProperty('--border-color', '#e0e0e0');
            document.documentElement.style.setProperty('--border-color-light', '#f0f0f0');
            document.documentElement.style.setProperty('--hover-color', 'rgba(0, 0, 0, 0.05)');
            document.documentElement.style.setProperty('--shadow-color', 'rgba(0, 0, 0, 0.1)');
        }
    }
    
    // Apply initial theme
    const savedTheme = localStorage.getItem('theme') || 'light';
    applyTheme(savedTheme);
    
    // Add click event listener to theme toggle button
    if (themeToggle) {
        themeToggle.addEventListener('click', toggleTheme);
    }
}); 