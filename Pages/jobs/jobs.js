import { 
    auth,
    db,
    collection,
    getDocs,
    query,
    where
} from '../../Firebase/firebase-config.js';
import { 
    onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js';

// Handle authentication state and update UI
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
                avatarInitialsDropdown.innerHTML = '<i class="fas fa-user-circle"></i>';
            }
        }

        // Update menu content for signed-in users
        if (menuSections) {
            menuSections.innerHTML = `
                <a href="SavedJobs.html">
                    <i class="fas fa-heart"></i>
                    Saved Jobs
                    <span class="badge">4</span>
                </a>
                <a href="Applications.html">
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
                <a href="../profile/Profile.html">
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

// Function to format date
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

// Global variables for pagination
let currentPage = 1;
const jobsPerPage = 10;
let allJobs = [];
let filteredJobs = [];

// Function to create job card with optimized performance
function createJobCard(job) {
    const card = document.createElement('div');
    card.className = 'job-card';
    
    // Use template literal only once
    const cardContent = `
        <div class="company-logo">
            <i class="${job.icon?.className || 'fas fa-building'}"></i>
        </div>
        <h3 class="job-title">${job.title}</h3>
        <p class="company-name">${job.company}</p>
        <div class="job-details">
            <span class="job-detail">
                <i class="fas fa-map-marker-alt"></i>
                ${job.location}
            </span>
            <span class="job-detail">
                <i class="fas fa-clock"></i>
                ${job.type}
            </span>
            ${job.salaryMin || job.salaryMax ? `
                <span class="job-detail">
                    <i class="fas fa-dollar-sign"></i>
                    ${job.salaryMin ? job.salaryMin.toLocaleString() : '0'} - ${job.salaryMax ? job.salaryMax.toLocaleString() : '0'}
                </span>
            ` : ''}
        </div>
        <div class="job-tags">
            ${job.skills?.map(skill => `<span class="job-tag">${skill}</span>`).join('') || ''}
        </div>
        <span class="job-posted">${formatDate(job.createdAt)}</span>
    `;
    
    card.innerHTML = cardContent;

    // Add click event to navigate to visualization page
    card.addEventListener('click', () => {
        window.location.href = `../visualize/visualize.html?id=${job.id}`;
    });

    // Use event delegation for better performance
    card.dataset.jobId = job.id;
    
    return card;
}

// Function to display jobs for current page
function displayJobs(jobs) {
    const jobsContainer = document.querySelector('.jobs-container');
    const startIndex = (currentPage - 1) * jobsPerPage;
    const endIndex = startIndex + jobsPerPage;
    const jobsToShow = jobs.slice(startIndex, endIndex);
    
    jobsToShow.forEach(job => {
        const card = createJobCard(job);
        jobsContainer.appendChild(card);
    });
    
    // Show/hide "See More" button
    const seeMoreButton = document.getElementById('see-more-btn');
    if (seeMoreButton) {
        seeMoreButton.style.display = endIndex < jobs.length ? 'block' : 'none';
    }
}

// Function to filter jobs
function filterJobs(searchQuery = '') {
    const params = getUrlParameters();
    const jobType = document.getElementById('job-type').value;
    const salaryRange = document.getElementById('salary-range').value;
    
    filteredJobs = allJobs.filter(jobData => {
        // Apply search filter
        const matchesSearch = (searchQuery === '' && params.q === '') || 
            jobData.title?.toLowerCase().includes((searchQuery || params.q).toLowerCase()) || 
            jobData.company?.toLowerCase().includes((searchQuery || params.q).toLowerCase()) || 
            jobData.location?.toLowerCase().includes((searchQuery || params.q).toLowerCase()) ||
            jobData.description?.toLowerCase().includes((searchQuery || params.q).toLowerCase());
        
        // Apply location filter
        const matchesLocation = !params.location || 
            jobData.location?.toLowerCase().includes(params.location.toLowerCase());
        
        // Apply job type filter
        const matchesType = (jobType === '' && !params.type) || 
            jobData.type?.toLowerCase() === (jobType || params.type).toLowerCase();
        
        // Apply salary range filter
        let matchesSalary = true;
        const salaryParam = salaryRange || params.salary;
        if (salaryParam !== '') {
            const [min, max] = salaryParam.split('-').map(num => 
                num === '+' ? Infinity : parseInt(num) * 1000
            );
            matchesSalary = (jobData.salaryMin >= min || !min) && 
                (jobData.salaryMax <= max || max === Infinity);
        }
        
        return matchesSearch && matchesLocation && matchesType && matchesSalary;
    });
    
    return filteredJobs;
}

// Function to load more jobs
function loadMoreJobs() {
    currentPage++;
    displayJobs(filteredJobs);
}

// Main function to load jobs
async function loadJobs(searchQuery = '') {
    try {
        const jobsContainer = document.querySelector('.jobs-container');
        const loadingContainer = document.querySelector('.loading-container');
        
        // Show loading state
        if (loadingContainer) {
            loadingContainer.classList.remove('hide');
        }
        jobsContainer.style.display = 'none';

        // Reset pagination
        currentPage = 1;
        jobsContainer.innerHTML = '';

        // Fetch jobs if not already fetched
        if (allJobs.length === 0) {
            const jobsQuery = query(collection(db, "jobs"), where("status", "==", "published"));
            const querySnapshot = await getDocs(jobsQuery);
            
            if (querySnapshot.empty) {
                showNoJobsMessage(jobsContainer, "No jobs available at the moment.");
                return;
            }
            
            // Store all jobs in memory
            allJobs = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        }

        // Filter jobs
        filteredJobs = filterJobs(searchQuery);

        if (filteredJobs.length === 0) {
            showNoJobsMessage(jobsContainer, "No jobs match your search criteria.");
            return;
        }

        // Display first page of jobs
        jobsContainer.style.display = 'grid';
        displayJobs(filteredJobs);

        // Hide loading container
        if (loadingContainer) {
            loadingContainer.classList.add('hide');
        }

    } catch (error) {
        console.error("Error loading jobs:", error);
        showErrorMessage(jobsContainer);
        
        // Hide loading container
        if (loadingContainer) {
            loadingContainer.classList.add('hide');
        }
    }
}

// Helper function to show no jobs message
function showNoJobsMessage(container, message) {
    container.innerHTML = `
        <div class="no-jobs">
            <dotlottie-player 
                src="https://lottie.host/6f65cb19-68f4-4012-80f9-66ea8e94f084/lQ66W9skG5.lottie" 
                background="transparent" 
                speed="1" 
                style="width: 140px; height: 140px" 
                loop 
                autoplay>
            </dotlottie-player>
            <p>${message}</p>
        </div>
    `;
    container.style.display = 'flex';
}

// Helper function to show error message
function showErrorMessage(container) {
    container.innerHTML = `
        <div class="error">
            <dotlottie-player 
                src="https://lottie.host/6f65cb19-68f4-4012-80f9-66ea8e94f084/lQ66W9skG5.lottie" 
                background="transparent" 
                speed="1" 
                style="width: 140px; height: 140px" 
                loop 
                autoplay>
            </dotlottie-player>
            <p>Error loading jobs. Please try again later.</p>
        </div>
    `;
    container.style.display = 'flex';
}

// Function to get URL parameters
function getUrlParameters() {
    const params = new URLSearchParams(window.location.search);
    return {
        q: params.get('q') || '',
        location: params.get('location') || '',
        type: params.get('type') || '',
        salary: params.get('salary') || ''
    };
}

// Function to update search inputs with URL parameters
function updateSearchInputs() {
    const params = getUrlParameters();
    const jobSearch = document.getElementById('job-search');
    const jobType = document.getElementById('job-type');
    const salaryRange = document.getElementById('salary-range');

    if (jobSearch && params.q) {
        jobSearch.value = params.q;
    }
    if (jobType && params.type) {
        jobType.value = params.type;
    }
    if (salaryRange && params.salary) {
        salaryRange.value = params.salary;
    }
}

// Function to handle search
function handleSearch() {
    const searchBtn = document.querySelector('.search-btn');
    const jobSearch = document.getElementById('job-search');
    
    if (searchBtn && jobSearch) {
        searchBtn.addEventListener('click', () => {
            const searchQuery = jobSearch.value.toLowerCase();
            loadJobs(searchQuery);
        });
    }
}

// Function to handle filters
function handleFilters() {
    const jobType = document.getElementById('job-type');
    const salaryRange = document.getElementById('salary-range');
    const filterBtn = document.querySelector('.filter-btn');
    const filters = document.querySelector('.filters');
    let isFiltersVisible = false;

    if (filterBtn && filters) {
        // Toggle filters visibility
        filterBtn.addEventListener('click', (event) => {
            event.preventDefault();
            event.stopPropagation();
            isFiltersVisible = !isFiltersVisible;
            filters.style.display = isFiltersVisible ? 'flex' : 'none';
            filterBtn.classList.toggle('active');
        });

        // Close filters when clicking outside
        document.addEventListener('click', (event) => {
            if (isFiltersVisible && 
                !filterBtn.contains(event.target) && 
                !filters.contains(event.target)) {
                isFiltersVisible = false;
                filters.style.display = 'none';
                filterBtn.classList.remove('active');
            }
        });

        // Close filters when pressing Escape key
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && isFiltersVisible) {
                isFiltersVisible = false;
                filters.style.display = 'none';
                filterBtn.classList.remove('active');
            }
        });
    }
    
    // Handle filter changes
    [jobType, salaryRange].forEach(filter => {
        if (filter) {
            filter.addEventListener('change', () => {
                const searchQuery = document.getElementById('job-search').value.toLowerCase();
                loadJobs(searchQuery);
            });
        }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    // Initialize floating menu first
    initializeFloatingMenu();
    
    // Initialize search and filters
    handleSearch();
    handleFilters();
    updateSearchInputs();
    loadJobs();

    // Theme Toggle
    const themeToggle = document.getElementById('theme-toggle');
    const themeIcon = themeToggle.querySelector('i');

    // Initialize theme
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const storedTheme = localStorage.getItem('theme');
    const isDark = storedTheme ? storedTheme === 'dark' : prefersDark;

    if (isDark) {
        document.documentElement.classList.add('dark-mode');
        document.body.classList.add('dark-mode');
        themeIcon.className = 'fas fa-sun';
    }

    function toggleTheme() {
        document.documentElement.classList.toggle('dark-mode');
        document.body.classList.toggle('dark-mode');
        const isDark = document.body.classList.contains('dark-mode');
        
        // Update icon
        themeIcon.className = isDark ? 'fas fa-sun' : 'fas fa-moon';
        
        // Save preference
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
    }

    themeToggle.addEventListener('click', toggleTheme);

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

        // Add click event listener to the user menu button
        userMenuBtn.addEventListener('click', toggleDropdown);

        // Close dropdown when clicking outside
        document.addEventListener('click', (event) => {
            if (isDropdownOpen && !userMenuBtn.contains(event.target) && !userDropdown.contains(event.target)) {
                isDropdownOpen = false;
                userDropdown.classList.remove('show');
                userMenuBtn.classList.remove('active');
            }
        });

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

    // Handle logout
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

// Initialize Floating Menu
function initializeFloatingMenu() {
    const menuBtn = document.querySelector('.menu-btn');
    const menuItems = document.querySelector('.menu-items');
    let isMenuOpen = false;

    if (!menuBtn || !menuItems) {
        console.error('Floating menu elements not found');
        return;
    }

    // Add click event to toggle menu
    menuBtn.addEventListener('click', (event) => {
        event.stopPropagation();
        isMenuOpen = !isMenuOpen;
        menuItems.classList.toggle('active');
        menuBtn.classList.toggle('active');
        
        // Change the menu button icon
        const menuIcon = menuBtn.querySelector('i');
        menuIcon.className = isMenuOpen ? 'fas fa-times' : 'fas fa-bars';
    });

    // Add click handlers for protected menu items
    const postsBtn = menuItems.querySelector('.posts-btn');
    const settingsBtn = menuItems.querySelector('.settings-btn');

    if (postsBtn) {
        postsBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (handleProtectedAction('add-post')) {
                window.location.href = '../posts/posts.html';
            }
        });
    }

    if (settingsBtn) {
        settingsBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (handleProtectedAction('settings')) {
                window.location.href = '../settings/settings.html';
            }
        });
    }

    // Close menu when clicking outside
    document.addEventListener('click', (event) => {
        if (!menuBtn.contains(event.target) && !menuItems.contains(event.target)) {
            isMenuOpen = false;
            menuItems.classList.remove('active');
            menuBtn.classList.remove('active');
            const menuIcon = menuBtn.querySelector('i');
            menuIcon.className = 'fas fa-bars';
        }
    });

    // Prevent menu from closing when clicking inside it
    menuItems.addEventListener('click', (event) => {
        event.stopPropagation();
    });

    // Close menu when pressing Escape key
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && isMenuOpen) {
            isMenuOpen = false;
            menuItems.classList.remove('active');
            menuBtn.classList.remove('active');
            const menuIcon = menuBtn.querySelector('i');
            menuIcon.className = 'fas fa-bars';
        }
    });
}
