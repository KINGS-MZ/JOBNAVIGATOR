// Theme Toggle
const themeToggle = document.getElementById('theme-toggle');
const themeIcon = themeToggle.querySelector('i');
const body = document.body;

function applyTheme(isDark) {
    if (isDark) {
        body.classList.remove('light-mode');
        body.classList.add('dark-mode');
        themeIcon.classList.remove('fa-moon');
        themeIcon.classList.add('fa-sun');
    } else {
        body.classList.remove('dark-mode');
        body.classList.add('light-mode');
        themeIcon.classList.remove('fa-sun');
        themeIcon.classList.add('fa-moon');
    }
}

function toggleTheme() {
    const isDark = !body.classList.contains('dark-mode');
    localStorage.setItem('darkMode', isDark);
    applyTheme(isDark);
}

// Initialize theme
document.addEventListener('DOMContentLoaded', () => {
    const isDark = localStorage.getItem('darkMode') === 'true';
    applyTheme(isDark);
});

// Add click event listener
themeToggle.addEventListener('click', toggleTheme);

const userMenuBtn = document.getElementById('user-menu-btn');
const userDropdown = document.getElementById('user-dropdown');

function toggleUserMenu() {
    userDropdown.classList.toggle('active');
}

document.addEventListener('click', (event) => {
    if (!userMenuBtn.contains(event.target) && !userDropdown.contains(event.target)) {
        userDropdown.classList.remove('active');
    }
});

userMenuBtn.addEventListener('click', toggleUserMenu);

const searchBtn = document.getElementById('search-btn');
const jobSearch = document.getElementById('job-search');
const locationSearch = document.getElementById('location-search');
const experienceLevel = document.getElementById('experience-level');
const jobType = document.getElementById('job-type');
const salaryRange = document.getElementById('salary-range');

function handleSearch(event) {
    event.preventDefault();
    
    // Get the search values
    const jobQuery = jobSearch.value.trim();
    const locationQuery = locationSearch.value.trim();
    const experience = experienceLevel ? experienceLevel.value : '';
    const type = jobType ? jobType.value : '';
    const salary = salaryRange ? salaryRange.value : '';
    
    // Build the query string
    const params = new URLSearchParams();
    
    if (jobQuery) {
        params.append('query', jobQuery);
    }
    if (locationQuery) {
        params.append('location', locationQuery);
    }
    if (experience) {
        params.append('experience', experience);
    }
    if (type) {
        params.append('type', type);
    }
    if (salary) {
        params.append('salary', salary);
    }
    
    // Redirect to the jobs page with the search parameters
    window.location.href = `Jobs.html${params.toString() ? '?' + params.toString() : ''}`;
}

// Add event listeners for search
searchBtn.addEventListener('click', handleSearch);

// Add enter key support for search inputs
jobSearch.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        handleSearch(e);
    }
});

locationSearch.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        handleSearch(e);
    }
});

// Quick search tags functionality
const tags = document.querySelectorAll('.tag');
tags.forEach(tag => {
    tag.addEventListener('click', function() {
        const tagText = this.textContent.trim();
        jobSearch.value = tagText;
        handleSearch(new Event('click'));
    });
});

document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
        userDropdown.classList.remove('active');
    }
});

// Floating Menu Functionality
const mainBtn = document.querySelector('.main-btn');
const menuItems = document.querySelector('.menu-items');
const currentPath = window.location.pathname;

// Function to toggle menu
function toggleMenu() {
    menuItems.classList.toggle('active');
    mainBtn.classList.toggle('active');
}

// Function to highlight current page
function highlightCurrentPage() {
    const pageName = currentPath.split('/').pop().toLowerCase();
    const menuLinks = document.querySelectorAll('.menu-item');
    
    menuLinks.forEach(link => {
        const linkHref = link.getAttribute('href').toLowerCase();
        if (linkHref.includes(pageName) || (pageName === '' && linkHref.includes('home.html'))) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });
}

// Initialize floating menu
mainBtn.addEventListener('click', toggleMenu);

// Close menu when clicking outside
document.addEventListener('click', (event) => {
    if (!event.target.closest('.floating-menu')) {
        menuItems.classList.remove('active');
        mainBtn.classList.remove('active');
    }
});

// Highlight current page on load
document.addEventListener('DOMContentLoaded', highlightCurrentPage);

// Floating Menu
const floatingMenu = document.querySelector('.floating-menu');
const menuBtn = document.querySelector('.menu-btn');

menuBtn.addEventListener('click', () => {
    floatingMenu.classList.toggle('active');
});

// Close menu when clicking outside
document.addEventListener('click', (e) => {
    if (!floatingMenu.contains(e.target) && !menuBtn.contains(e.target)) {
        floatingMenu.classList.remove('active');
    }
});

// Close menu when scrolling
let lastScrollTop = 0;
window.addEventListener('scroll', () => {
    const st = window.pageYOffset || document.documentElement.scrollTop;
    if (Math.abs(lastScrollTop - st) > 50) {
        floatingMenu.classList.remove('active');
        lastScrollTop = st;
    }
});