// This script runs immediately as it's loaded (before DOM is ready)
// to prevent theme flickering when navigating between pages

// Immediately apply the saved theme when the script loads
(function() {
    // Get saved theme from localStorage
    const savedTheme = localStorage.getItem('theme') || 'light';
    
    // Apply theme to document immediately
    if (savedTheme === 'dark') {
        document.documentElement.classList.add('dark-mode');
        // We'll also set it on body as a fallback, though it may not be available yet
        if (document.body) {
            document.body.classList.add('dark-mode');
        }
    }
})(); 