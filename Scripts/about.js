// Load Lottie animations
const animations = {
    hero: {
        container: 'hero-animation',
        path: 'https://assets5.lottiefiles.com/packages/lf20_bujdzzfn.json'
    },
    search: {
        container: 'search-animation',
        path: 'https://assets8.lottiefiles.com/packages/lf20_kkflmtur.json'
    },
    mentor: {
        container: 'mentor-animation',
        path: 'https://assets5.lottiefiles.com/packages/lf20_xyadoh9h.json'
    },
    network: {
        container: 'network-animation',
        path: 'https://assets3.lottiefiles.com/private_files/lf30_obidsi0t.json'
    }
};

Object.entries(animations).forEach(([key, config]) => {
    lottie.loadAnimation({
        container: document.getElementById(config.container),
        renderer: 'svg',
        loop: true,
        autoplay: true,
        path: config.path
    });
});

// Theme toggle
const themeToggle = document.getElementById('theme-toggle');
themeToggle.addEventListener('click', () => {
    document.body.classList.toggle('dark-theme');
    document.body.classList.toggle('light-theme');
});

// Language selector
const languageSelect = document.getElementById('language-select');
languageSelect.addEventListener('change', (e) => {
    // Add language change logic here
    console.log('Language changed to:', e.target.value);
});

// Add smooth scrolling for navigation
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        document.querySelector(this.getAttribute('href')).scrollIntoView({
            behavior: 'smooth'
        });
    });
});