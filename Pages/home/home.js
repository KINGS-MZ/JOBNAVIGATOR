import { 
    auth
} from '../../Firebase/firebase-config.js';
import { 
    onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js';

// Only update UI if user is signed in
onAuthStateChanged(auth, (user) => {
    const menuSections = document.querySelector('.menu-sections');
    
    if (user) {
        // Update user info in the dropdown if user is signed in
        const userNameElement = document.getElementById('user-name');
        const userEmailElement = document.getElementById('user-email');
        const avatarInitials = document.getElementById('avatar-initials');
        const avatarInitialsDropdown = document.getElementById('avatar-initials-dropdown');
        const avatarImage = document.getElementById('avatar-image');
        const avatarImageDropdown = document.getElementById('avatar-image-dropdown');
        
        if (userNameElement && user.displayName) {
            userNameElement.textContent = user.displayName;
        }
        
        if (userEmailElement && user.email) {
            userEmailElement.textContent = user.email;
        }

        // Handle profile picture
        if (user.photoURL) {
            if (avatarImage) {
                avatarImage.src = user.photoURL;
                avatarImage.style.display = 'block';
            }
            if (avatarImageDropdown) {
                avatarImageDropdown.src = user.photoURL;
                avatarImageDropdown.style.display = 'block';
            }
            if (avatarInitials) {
                avatarInitials.style.display = 'none';
            }
            if (avatarInitialsDropdown) {
                avatarInitialsDropdown.style.display = 'none';
            }
        } else {
            if (avatarImage) {
                avatarImage.style.display = 'none';
            }
            if (avatarImageDropdown) {
                avatarImageDropdown.style.display = 'none';
            }
            const initials = user.displayName
                ? user.displayName
                    .split(' ')
                    .map(name => name[0])
                    .join('')
                    .toUpperCase()
                : 'JN';
                
            if (avatarInitials) {
                avatarInitials.style.display = 'flex';
                avatarInitials.textContent = '';  // Clear any existing content
                const guestIcon = document.createElement('i');
                guestIcon.className = 'fa-solid fa-circle-user';
                avatarInitials.appendChild(guestIcon);
            }
            if (avatarInitialsDropdown) {
                avatarInitialsDropdown.style.display = 'flex';
                avatarInitialsDropdown.textContent = '';  // Clear any existing content
                const guestIconDropdown = document.createElement('i');
                guestIconDropdown.className = 'fa-solid fa-circle-user';
                avatarInitialsDropdown.appendChild(guestIconDropdown);
            }
        }

        // Update menu content for signed-in users
        if (menuSections) {
            menuSections.innerHTML = `
                <a href="../jobs/SavedJobs.html">
                    <i class="fas fa-heart"></i>
                    Saved Jobs
                    <span class="badge">4</span>
                </a>
                <a href="../jobs/Applications.html">
                    <i class="fas fa-briefcase"></i>
                    Applications
                    <span class="badge">2</span>
                </a>
                <a href="../notifications/notifications.html">
                    <i class="fas fa-bell"></i>
                    Notifications
                    <span class="badge active">3</span>
                </a>
                <div class="menu-divider"></div>
                <a href="../profile/profile.html">
                    <i class="fas fa-user"></i>
                    My Profile
                </a>
                <a href="../profile/Resume.html">
                    <i class="fas fa-file-alt"></i>
                    My Resume
                </a>
                <a href="../settings/settings.html">
                    <i class="fas fa-cog"></i>
                    Settings
                </a>
                <div class="menu-divider"></div>
                <a href="#" id="logout-link" class="logout-link">
                    <i class="fas fa-sign-out-alt"></i>
                    Sign Out
                </a>
            `;

            // Reattach logout event listener
            const logoutLink = document.getElementById('logout-link');
            if (logoutLink) {
                logoutLink.addEventListener('click', (event) => {
                    event.preventDefault();
                    auth.signOut().then(() => {
                        window.location.href = '../login/login.html';
                    }).catch((error) => {
                        console.error('Error signing out:', error);
                    });
                });
            }
        }
    } else {
        // Reset user info for guest users
        const userNameElement = document.getElementById('user-name');
        const userEmailElement = document.getElementById('user-email');
        const avatarInitials = document.getElementById('avatar-initials');
        const avatarInitialsDropdown = document.getElementById('avatar-initials-dropdown');
        const avatarImage = document.getElementById('avatar-image');
        const avatarImageDropdown = document.getElementById('avatar-image-dropdown');

        if (userNameElement) userNameElement.textContent = 'Welcome';
        if (userEmailElement) userEmailElement.textContent = 'Sign in to access your account';
        
        if (avatarImage) avatarImage.style.display = 'none';
        if (avatarImageDropdown) avatarImageDropdown.style.display = 'none';
        if (avatarInitials) {
            avatarInitials.style.display = 'flex';
            avatarInitials.textContent = '';  // Clear any existing content
            const guestIcon = document.createElement('i');
            guestIcon.className = 'fa-solid fa-circle-user';
            avatarInitials.appendChild(guestIcon);
        }
        if (avatarInitialsDropdown) {
            avatarInitialsDropdown.style.display = 'flex';
            avatarInitialsDropdown.textContent = '';  // Clear any existing content
            const guestIconDropdown = document.createElement('i');
            guestIconDropdown.className = 'fa-solid fa-circle-user';
            avatarInitialsDropdown.appendChild(guestIconDropdown);
        }

        // Update menu content for guest users
        if (menuSections) {
            menuSections.innerHTML = `
                <a href="../login/login.html" class="sign-in-link">
                    <i class="fas fa-sign-in-alt"></i>
                    Sign In
                </a>
            `;
        }
    }
});

document.addEventListener('DOMContentLoaded', () => {
    // Theme Toggle Functionality
    const themeToggle = document.getElementById('theme-toggle');
    const html = document.documentElement;
    const body = document.body;
    const icon = themeToggle.querySelector('i');
    
    // Check for saved theme preference
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
        html.classList.toggle('dark-mode', savedTheme === 'dark');
        body.classList.toggle('dark-mode', savedTheme === 'dark');
        icon.classList.toggle('fa-sun', savedTheme === 'dark');
        icon.classList.toggle('fa-moon', savedTheme === 'light');
    }
    
    // Theme toggle click handler
    themeToggle.addEventListener('click', () => {
        html.classList.toggle('dark-mode');
        body.classList.toggle('dark-mode');
        const isDark = html.classList.contains('dark-mode');
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
        icon.classList.toggle('fa-sun', isDark);
        icon.classList.toggle('fa-moon', !isDark);
    });

    // Dropdown Menu
    const userMenuBtn = document.getElementById('user-menu-btn');
    const userDropdown = document.getElementById('user-dropdown');

    if (!userMenuBtn || !userDropdown) {
        console.error('Dropdown elements not found');
    } else {
        let isDropdownOpen = false;

        function toggleDropdown(event) {
            event.stopPropagation();
            isDropdownOpen = !isDropdownOpen;
            userDropdown.classList.toggle('show');
            userMenuBtn.classList.toggle('active');
        }

        // Close dropdown when clicking outside
        document.addEventListener('click', (event) => {
            if (isDropdownOpen && !userMenuBtn.contains(event.target) && !userDropdown.contains(event.target)) {
                isDropdownOpen = false;
                userDropdown.classList.remove('show');
                userMenuBtn.classList.remove('active');
            }
        });

        userMenuBtn.addEventListener('click', toggleDropdown);

        // Prevent dropdown from closing when clicking inside it
        userDropdown.addEventListener('click', (event) => {
            event.stopPropagation();
        });

        // Close dropdown when pressing Escape key
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && isDropdownOpen) {
                isDropdownOpen = false;
                userDropdown.classList.remove('show');
                userMenuBtn.classList.remove('active');
            }
        });
    }

    // Floating Menu
    const floatingMenuBtn = document.querySelector('.menu-btn');
    const menuItems = document.querySelector('.menu-items');
    let isMenuOpen = false;

    if (floatingMenuBtn && menuItems) {
        floatingMenuBtn.addEventListener('click', () => {
            isMenuOpen = !isMenuOpen;
            floatingMenuBtn.classList.toggle('active');
            menuItems.classList.toggle('active');
            
            // Rotate menu button when active
            if (isMenuOpen) {
                floatingMenuBtn.querySelector('i').className = 'fas fa-times';
            } else {
                floatingMenuBtn.querySelector('i').className = 'fas fa-bars';
            }
        });

        // Close menu when clicking outside
        document.addEventListener('click', (event) => {
            if (isMenuOpen && !floatingMenuBtn.contains(event.target) && !menuItems.contains(event.target)) {
                isMenuOpen = false;
                floatingMenuBtn.classList.remove('active');
                menuItems.classList.remove('active');
                floatingMenuBtn.querySelector('i').className = 'fas fa-bars';
            }
        });

        // Close menu when pressing Escape key
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && isMenuOpen) {
                isMenuOpen = false;
                floatingMenuBtn.classList.remove('active');
                menuItems.classList.remove('active');
                floatingMenuBtn.querySelector('i').className = 'fas fa-bars';
            }
        });
    }

    // Search and Filter Functionality
    const searchBtn = document.getElementById('search-btn');
    const jobSearch = document.getElementById('job-search');
    const locationSearch = document.getElementById('location-search');
    const jobType = document.getElementById('job-type');
    const salaryRange = document.getElementById('salary-range');

    // Handle search button click
    if (searchBtn) {
        searchBtn.addEventListener('click', () => {
            const searchParams = new URLSearchParams();
            
            // Add search query if present
            if (jobSearch.value) {
                searchParams.append('q', jobSearch.value);
            }
            
            // Add location if present
            if (locationSearch.value) {
                searchParams.append('location', locationSearch.value);
            }
            
            // Add filters if selected
            if (jobType.value) {
                searchParams.append('type', jobType.value);
            }
            if (salaryRange.value) {
                searchParams.append('salary', salaryRange.value);
            }
            
            // Redirect to jobs page with search parameters
            window.location.href = `../jobs/jobs.html?${searchParams.toString()}`;
        });
    }

    // Handle Enter key in search inputs
    [jobSearch, locationSearch].forEach(input => {
        if (input) {
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    searchBtn.click();
                }
            });
        }
    });

    // Handle popular search tags
    const tags = document.querySelectorAll('.tag');
    tags.forEach(tag => {
        tag.addEventListener('click', () => {
            const searchParams = new URLSearchParams();
            searchParams.append('q', tag.textContent);
            window.location.href = `../jobs/jobs.html?${searchParams.toString()}`;
        });
    });

    // Handle filter changes
    [jobType, salaryRange].forEach(filter => {
        if (filter) {
            filter.addEventListener('change', () => {
                searchBtn.click();
            });
        }
    });

    // Toast Dialog Functionality
    const toastDialog = document.getElementById('toastDialog');
    const toastOverlay = document.getElementById('toastOverlay');
    const toastClose = document.getElementById('toastClose');
    const toastSignIn = document.getElementById('toastSignIn');
    const toastSignUp = document.getElementById('toastSignUp');

    // Function to show toast
    function showToast() {
        toastDialog.style.display = 'block';
        toastOverlay.style.display = 'block';
        document.body.style.overflow = 'hidden';
        
        // Trigger animations
        requestAnimationFrame(() => {
            toastOverlay.classList.add('active');
            toastDialog.classList.add('active');
        });
    }

    // Function to hide toast
    function hideToast() {
        toastOverlay.classList.remove('active');
        toastDialog.classList.remove('active');
        document.body.style.overflow = '';
        
        // Wait for animations to finish before hiding
        setTimeout(() => {
            toastOverlay.style.display = 'none';
            toastDialog.style.display = 'none';
        }, 300); // Match the transition duration in CSS
    }

    // Function to check if user is signed in
    function isUserSignedIn() {
        return auth.currentUser !== null;
    }

    // Function to handle protected actions
    function handleProtectedAction(action) {
        if (!isUserSignedIn()) {
            showToast();
            return false;
        }
        return true;
    }

    // Event listeners for toast actions
    if (toastClose) toastClose.addEventListener('click', hideToast);
    if (toastOverlay) toastOverlay.addEventListener('click', hideToast);

    // Redirect to login page with sign in section
    if (toastSignIn) {
        toastSignIn.addEventListener('click', () => {
            const currentPage = encodeURIComponent(window.location.href);
            window.location.href = `../login/login.html?redirect=${currentPage}`;
        });
    }

    // Redirect to login page with sign up section
    if (toastSignUp) {
        toastSignUp.addEventListener('click', () => {
            const currentPage = encodeURIComponent(window.location.href);
            window.location.href = `../login/login.html?redirect=${currentPage}&section=signup`;
        });
    }

    // Add authentication check for protected buttons in the floating menu
    const addPostBtn = document.querySelector('.menu-items .posts-btn');
    const settingsBtn = document.querySelector('.menu-items .settings-btn');

    if (addPostBtn) {
        addPostBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (handleProtectedAction('add-post')) {
                window.location.href = '../posts/posts.html';
            }
        });
    } else {
        console.error('Add Post button not found');
    }

    if (settingsBtn) {
        settingsBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (handleProtectedAction('settings')) {
                window.location.href = '../settings/settings.html';
            }
        });
    } else {
        console.error('Settings button not found');
    }

    // Add console log to debug button selection
    console.log('Add Post button:', addPostBtn);
    console.log('Settings button:', settingsBtn);
});