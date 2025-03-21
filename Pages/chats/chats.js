// Theme toggle functionality
document.addEventListener('DOMContentLoaded', () => {
    const themeToggle = document.getElementById('theme-toggle');
    const htmlEl = document.documentElement;
    const bodyEl = document.body;
    const themeIcon = themeToggle.querySelector('i');
    
    // Check for saved theme preference or respect OS preference
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
        htmlEl.classList.add('dark-mode');
        bodyEl.classList.add('dark-mode');
        themeIcon.classList.replace('fa-moon', 'fa-sun');
    }
    
    themeToggle.addEventListener('click', () => {
        htmlEl.classList.toggle('dark-mode');
        bodyEl.classList.toggle('dark-mode');
        
        if (htmlEl.classList.contains('dark-mode')) {
            themeIcon.classList.replace('fa-moon', 'fa-sun');
            localStorage.setItem('theme', 'dark');
        } else {
            themeIcon.classList.replace('fa-sun', 'fa-moon');
            localStorage.setItem('theme', 'light');
        }
    });
    
    // User dropdown menu toggle
    const userBtn = document.getElementById('user-menu-btn');
    const dropdownMenu = document.getElementById('user-dropdown');
    
    userBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdownMenu.classList.toggle('show');
    });
    
    document.addEventListener('click', (e) => {
        if (!dropdownMenu.contains(e.target) && !userBtn.contains(e.target)) {
            dropdownMenu.classList.remove('show');
        }
    });

    // Mobile chat functionality - UI only
    const friendsList = document.getElementById('friends-list');
    const messagesSection = document.getElementById('messages-section');
    const backBtn = document.getElementById('back-btn');
    const navbar = document.querySelector('nav');
    const bottomNav = document.querySelector('.bottom-nav');
    
    // Function to show messages section (for mobile)
    function showMessages() {
        friendsList.classList.add('hidden');
        messagesSection.classList.add('active');
        
        // On mobile, hide navbar and bottom nav for immersive chat
        if (window.innerWidth <= 768) {
            navbar.classList.add('hidden');
            bottomNav.classList.add('hidden');
            document.body.classList.add('chat-open');
        }
    }
    
    // Function to show contacts list (for mobile)
    function showContacts() {
        friendsList.classList.remove('hidden');
        messagesSection.classList.remove('active');
        
        // Show navbar and bottom nav again
        navbar.classList.remove('hidden');
        bottomNav.classList.remove('hidden');
        document.body.classList.remove('chat-open');
    }
    
    // Add click event to back button
    backBtn.addEventListener('click', showContacts);
    
    // Check window size on resize
    window.addEventListener('resize', () => {
        if (window.innerWidth > 768) {
            friendsList.classList.remove('hidden');
            messagesSection.classList.remove('active');
            navbar.classList.remove('hidden');
            bottomNav.classList.remove('hidden');
            document.body.classList.remove('chat-open');
        }
    });

    // Bottom navigation functionality
    function updateNavigation() {
        const bottomNav = document.querySelector('.bottom-nav');
        
        if (window.innerWidth <= 768) {
            // Mobile view: show bottom nav
            bottomNav.style.display = 'flex';
        } else {
            // Desktop view: hide bottom nav
            bottomNav.style.display = 'none';
        }
    }
    
    // Check on load
    updateNavigation();
    
    // Also update on window resize
    window.addEventListener('resize', updateNavigation);
});