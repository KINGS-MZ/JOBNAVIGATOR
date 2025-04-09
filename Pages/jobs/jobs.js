import { 
    auth,
    db,
    collection,
    getDocs,
    query,
    where,
    doc,
    getDoc,
    setDoc,
    deleteDoc
} from '../../Firebase/firebase-config.js';
import { 
    onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js';

// Handle authentication state and update UI
onAuthStateChanged(auth, async (user) => {
    const menuSections = document.querySelector('.menu-sections');
    
    // Skip updating menu if it was handled by nav.js
    if (window.navJsHandledMenu) {
        console.log('Menu already handled by nav.js');
        return;
    }
    
    if (user) {
        // Fetch user profile data from Firestore
        try {
            const userRef = doc(db, "users", user.uid);
            const userSnap = await getDoc(userRef);
            
            // Load user's saved jobs for displaying correct save state
            await loadUserSavedJobs();
            
            // Update user info in the dropdown if user is signed in
            const userNameElement = document.getElementById('user-name');
            const userEmailElement = document.getElementById('user-email');
            const avatarInitials = document.getElementById('avatar-initials');
            const avatarInitialsDropdown = document.getElementById('avatar-initials-dropdown');
            const avatarImage = document.getElementById('avatar-image');
            const avatarImageDropdown = document.getElementById('avatar-image-dropdown');
            
            if (userSnap.exists()) {
                const userData = userSnap.data();
                
                // Use custom profile name if available, otherwise fallback to auth name
                if (userNameElement) {
                    userNameElement.textContent = userData.fullName || user.displayName || 'User';
                }
                
                if (userEmailElement && user.email) {
                    userEmailElement.textContent = user.email;
                }
                
                // Handle profile picture - check for custom avatar first
                if (userData.photoURL) {
                    // User has a custom profile picture from Firestore
                    if (avatarImage) {
                        avatarImage.src = userData.photoURL;
                        avatarImage.style.display = 'block';
                    }
                    if (avatarImageDropdown) {
                        avatarImageDropdown.src = userData.photoURL;
                        avatarImageDropdown.style.display = 'block';
                    }
                    if (avatarInitials) {
                        avatarInitials.style.display = 'none';
                    }
                    if (avatarInitialsDropdown) {
                        avatarInitialsDropdown.style.display = 'none';
                    }
                } else if (user.photoURL) {
                    // Fallback to auth profile picture
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
                    // No profile picture, show initials
                    if (avatarImage) {
                        avatarImage.style.display = 'none';
                    }
                    if (avatarImageDropdown) {
                        avatarImageDropdown.style.display = 'none';
                    }
                    
                    // Get initials from custom name if available
                    const fullName = userData.fullName || user.displayName || '';
                    const initials = fullName
                        ? fullName
                            .split(' ')
                            .map(name => name[0])
                            .join('')
                            .toUpperCase()
                        : 'JN';
                    
                    if (avatarInitials) {
                        avatarInitials.style.display = 'flex';
                        avatarInitials.textContent = initials;
                    }
                    if (avatarInitialsDropdown) {
                        avatarInitialsDropdown.style.display = 'flex';
                        avatarInitialsDropdown.textContent = initials;
                    }
                }
            } else {
                // If no Firestore data, fallback to auth data
                if (userNameElement && user.displayName) {
                    userNameElement.textContent = user.displayName;
                }
                
                if (userEmailElement && user.email) {
                    userEmailElement.textContent = user.email;
                }
                
                // Handle default profile picture
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
                        avatarInitials.textContent = initials;
                    }
                    if (avatarInitialsDropdown) {
                        avatarInitialsDropdown.style.display = 'flex';
                        avatarInitialsDropdown.textContent = initials;
                    }
                }
            }
        } catch (error) {
            console.error('Error fetching user profile:', error);
            // Fallback to auth data if Firestore fetch fails
            const userNameElement = document.getElementById('user-name');
            const userEmailElement = document.getElementById('user-email');
            
            if (userNameElement && user.displayName) {
                userNameElement.textContent = user.displayName;
            }
            
            if (userEmailElement && user.email) {
                userEmailElement.textContent = user.email;
            }
        }

        // Update menu content for signed-in users
        if (menuSections) {
            // Load the count of saved jobs
            const savedJobsCount = userSavedJobs.size;
            
            // Get current page path to determine which menu item should be active
            const currentPath = window.location.pathname;
            
            menuSections.innerHTML = `
                <a href="../home/home.html" class="${currentPath.includes('/home/') ? 'active' : ''}">
                    <i class="fas fa-home"></i>
                    Home
                </a>
                <a href="../jobs/jobs.html" class="${currentPath.includes('/jobs/') ? 'active' : ''}">
                    <i class="fas fa-briefcase"></i>
                    Jobs
                </a>
                <a href="../posts/posts.html" class="${currentPath.includes('/posts/') ? 'active' : ''}">
                    <i class="fas fa-newspaper"></i>
                    Posts
                </a>
                <div class="menu-divider"></div>
                <a href="../saved/saved.html" class="${currentPath.includes('/saved/') ? 'active' : ''}">
                    <i class="fas fa-heart"></i>
                    Saved Jobs
                    <span class="badge">${savedJobsCount}</span>
                </a>
                <a href="../chats/chats.html" class="${currentPath.includes('/chats/') ? 'active' : ''}">
                    <i class="fas fa-comments"></i>
                    Chats
                </a>
                <div class="menu-divider"></div>
                <a href="../account/account.html" class="${currentPath.includes('/account/') ? 'active' : ''}">
                    <i class="fas fa-user"></i>
                    My Profile
                </a>
                <a href="../settings/settings.html" class="${currentPath.includes('/settings/') ? 'active' : ''}">
                    <i class="fas fa-cog"></i>
                    Settings
                </a>
                <div class="menu-divider"></div>
                <a href="#" id="logout-link" class="logout-link">
                    <i class="fas fa-sign-out-alt"></i>
                    Sign Out
                </a>
            `;

            // Apply highlighting after menu is built
            highlightCurrentPageInMenu();

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
            
            // Apply highlighting after guest menu is built
            highlightCurrentPageInMenu();
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

// Global variables
let allJobs = [];
let filteredJobs = [];
let currentPage = 1;
const jobsPerPage = 10;
let userSavedJobs = new Set(); // Add this new variable to track saved jobs

// Global variables for filters
let currentFilters = {
    jobType: [],
    experience: [],
    minSalary: null,
    maxSalary: null,
    location: [],
    date: null
};

// Global state for active filters
let activeFilters = {
    location: null,
    jobType: [],
    experience: [],
    salary: {
        min: null,
        max: null
    },
    date: null
};

// Function to create job card with optimized performance
function createJobCard(job) {
    const card = document.createElement('div');
    card.className = 'job-card';
    
    // Check if this job is saved by the current user
    const isSaved = userSavedJobs.has(job.id);
    console.log(`Creating card for job ${job.id}, saved state: ${isSaved}`);
    
    // Use template literal only once
    const cardContent = `
        <div class="job-header">
            <div class="job-meta">
                <div class="job-icon"><i class="${job.icon?.className || 'fas fa-building'}"></i></div>
                <div class="job-info">
                    <h3 class="job-title">${job.title}</h3>
                    <div class="job-details">
                        <span class="company-name">${job.company}</span>
                        ${job.location ? `<span class="job-dot">•</span><span class="job-location">${job.location}</span>` : ''}
                        ${job.type ? `<span class="job-dot">•</span><span class="job-type">${job.type}</span>` : ''}
                    </div>
                </div>
            </div>
            <div class="job-actions">
                <button class="action-btn save-btn" title="${isSaved ? 'Remove from saved' : 'Save job'}">
                    <i class="${isSaved ? 'fas' : 'far'} fa-bookmark"></i>
                </button>
                <button class="action-btn share-btn" title="Share job">
                    <i class="fas fa-share-alt"></i>
                </button>
            </div>
        </div>
        <div class="job-content">
            ${job.description ? `<p class="job-description">${job.description}</p>` : ''}
            <div class="job-tags">
                ${job.skills?.map(skill => `<span class="job-tag">${skill}</span>`).join('') || ''}
            </div>
        </div>
        <div class="job-footer">
            <span class="job-posted">Posted ${formatDate(job.createdAt)}</span>
            <a href="../visualize/visualize.html?id=${job.id}" class="view-details">View Job</a>
        </div>
    `;
    
    card.innerHTML = cardContent;

    // Add click event to navigate to visualization page
    card.addEventListener('click', (e) => {
        // Don't navigate if clicking on action buttons
        if (!e.target.closest('.action-btn')) {
            window.location.href = `../visualize/visualize.html?id=${job.id}`;
        }
    });
    
    // Add event listeners for buttons
    setTimeout(() => {
        const saveBtn = card.querySelector('.save-btn');
        if (saveBtn) {
            saveBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                // Toggle bookmark icon
                const icon = saveBtn.querySelector('i');
                if (icon.classList.contains('far')) {
                    // Save the job
                    icon.classList.replace('far', 'fas');
                    saveBtn.title = 'Remove from saved';
                    handleProtectedAction(() => {
                        saveJob(job).then(() => {
                            // Update the saved state after successful save
                            if (auth.currentUser) {
                                console.log(`Job ${job.id} was saved successfully`);
                                card.setAttribute('data-saved', 'true');
                            }
                        });
                    });
                } else {
                    // Unsave the job
                    icon.classList.replace('fas', 'far');
                    saveBtn.title = 'Save job';
                    handleProtectedAction(() => {
                        unsaveJob(job.id).then(() => {
                            // Update the saved state after successful unsave
                            if (auth.currentUser) {
                                console.log(`Job ${job.id} was unsaved successfully`);
                                card.setAttribute('data-saved', 'false');
                            }
                        });
                    });
                }
            });
        }
        
        const shareBtn = card.querySelector('.share-btn');
        if (shareBtn) {
            shareBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                handleProtectedAction(() => shareJob(job));
            });
        }
    }, 0);

    // Use event delegation for better performance
    card.dataset.jobId = job.id;
    
    return card;
}

// Function to display jobs for current page
function displayJobs(jobs) {
    const jobsContainer = document.querySelector('.jobs-container');
    if (!jobsContainer) {
        console.error('Jobs container not found');
        return;
    }
    
    // Clear existing jobs
    jobsContainer.innerHTML = '';
    
    if (jobs.length === 0) {
        showNoJobsMessage(jobsContainer, 'No jobs found matching your criteria');
        return;
    }
    
    jobs.forEach(job => {
        const jobCard = createJobCard(job);
        jobsContainer.appendChild(jobCard);
    });
}

// Function to get all filter values
function getFilterValues() {
    return {
        jobType: Array.from(document.querySelectorAll('input[name="job-type"]:checked')).map(cb => cb.value),
        experience: Array.from(document.querySelectorAll('input[name="experience"]:checked')).map(cb => cb.value),
        minSalary: document.getElementById('min-salary').value || null,
        maxSalary: document.getElementById('max-salary').value || null,
        location: Array.from(document.querySelectorAll('input[name="location"]:checked')).map(cb => cb.value),
        date: document.querySelector('input[name="date"]:checked')?.value || null,
        customLocation: activeFilters.location
    };
}

// Function to check if a job matches the filters
function jobMatchesFilters(job, filters) {
    // Job type filter
    if (filters.jobType.length > 0 && !filters.jobType.includes(job.type?.toLowerCase())) {
        return false;
    }

    // Experience level filter
    if (filters.experience.length > 0 && !filters.experience.includes(job.experience?.toLowerCase())) {
        return false;
    }

    // Salary range filter
    const jobSalaryMin = parseInt(job.salaryMin) || 0;
    const jobSalaryMax = parseInt(job.salaryMax) || 0;
    const filterMinSalary = parseInt(filters.minSalary) || 0;
    const filterMaxSalary = parseInt(filters.maxSalary) || Infinity;

    // Check if the job's salary range overlaps with the filter range
    if (jobSalaryMax < filterMinSalary || jobSalaryMin > filterMaxSalary) {
        return false;
    }

    // Location filter - checkbox locations
    if (filters.location.length > 0 && !filters.location.includes(job.location?.toLowerCase())) {
        return false;
    }
    
    // Custom location filter
    if (filters.customLocation && job.location) {
        if (!job.location.toLowerCase().includes(filters.customLocation.toLowerCase())) {
            return false;
        }
    }

    // Date filter
    if (filters.date) {
        const jobDate = new Date(job.createdAt);
        const now = new Date();
        const diffTime = Math.abs(now - jobDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        switch (filters.date) {
            case '24h':
                if (diffDays > 1) return false;
                break;
            case '3d':
                if (diffDays > 3) return false;
                break;
            case '7d':
                if (diffDays > 7) return false;
                break;
            case '30d':
                if (diffDays > 30) return false;
                break;
        }
    }

    return true;
}

// Function to filter jobs based on current filters
function filterJobs(jobs) {
    const filters = getFilterValues();
    return jobs.filter(job => jobMatchesFilters(job, filters));
}

// Function to update pagination controls and display current page
function updatePagination() {
    // Check if pagination container exists
    const paginationContainer = document.querySelector('.pagination');
    if (!paginationContainer) {
        console.error("Pagination container not found");
        return;
    }
    
    console.log(`Updating pagination for ${filteredJobs.length} total jobs`);
    
    const totalPages = Math.ceil(filteredJobs.length / jobsPerPage);
    console.log(`Total pages: ${totalPages}, Current page: ${currentPage}, Jobs per page: ${jobsPerPage}`);
    
    // Adjust current page if needed
    if (currentPage > totalPages) {
        currentPage = Math.max(1, totalPages);
        console.log(`Adjusted current page to ${currentPage}`);
    }
    
    // Clear pagination container
    paginationContainer.innerHTML = '';
    
    // Don't show pagination if there's only one page
    if (totalPages <= 1) {
        console.log("Only one page, not showing pagination controls");
        // Still need to display the page
        displayCurrentPage();
        return;
    }
    
    // Create pagination controls
    // Previous button
    const prevButton = document.createElement('button');
    prevButton.classList.add('pagination-btn', 'prev-btn');
    prevButton.innerHTML = '<i class="fas fa-chevron-left"></i>';
    prevButton.disabled = currentPage === 1;
    prevButton.addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            displayCurrentPage();
            updatePagination();
        }
    });
    
    // Next button
    const nextButton = document.createElement('button');
    nextButton.classList.add('pagination-btn', 'next-btn');
    nextButton.innerHTML = '<i class="fas fa-chevron-right"></i>';
    nextButton.disabled = currentPage === totalPages;
    nextButton.addEventListener('click', () => {
        if (currentPage < totalPages) {
            currentPage++;
            displayCurrentPage();
            updatePagination();
        }
    });
    
    // Page number indicator
    const pageIndicator = document.createElement('span');
    pageIndicator.classList.add('page-indicator');
    pageIndicator.textContent = `Page ${currentPage} of ${totalPages}`;
    
    // Add elements to container
    paginationContainer.appendChild(prevButton);
    paginationContainer.appendChild(pageIndicator);
    paginationContainer.appendChild(nextButton);
    
    // Display current page of jobs
    displayCurrentPage();
}

// Function to display current page of jobs
function displayCurrentPage() {
    const startIndex = (currentPage - 1) * jobsPerPage;
    const endIndex = Math.min(startIndex + jobsPerPage, filteredJobs.length);
    const currentPageJobs = filteredJobs.slice(startIndex, endIndex);
    
    const jobsContainer = document.querySelector('.jobs-container');
    if (!jobsContainer) return;
    
    // Reset the container
    jobsContainer.innerHTML = '';
    jobsContainer.classList.remove('showing-message');
    jobsContainer.style.display = 'grid'; // Ensure it's back to grid display
    
    console.log(`Displaying page ${currentPage}: showing jobs ${startIndex}-${endIndex} of ${filteredJobs.length}`);
    
    if (currentPageJobs.length === 0) {
        console.log("No jobs to display on current page");
        showNoJobsMessage(jobsContainer, 'No jobs available for this page');
        return;
    }
    
    // Display current page of jobs
    currentPageJobs.forEach(job => {
        const jobCard = createJobCard(job);
        jobsContainer.appendChild(jobCard);
    });
    
    console.log(`Successfully displayed ${currentPageJobs.length} jobs`);
}

// Function to handle filter changes
function handleFilterChange() {
    const jobsContainer = document.querySelector('.jobs-container');
    const loadingContainer = document.querySelector('.loading-container');
    
    // Show loading state
    jobsContainer.style.display = 'none';
    loadingContainer.style.display = 'block';
    
    // Update active filters based on current form state
    updateActiveFiltersState();
    
    // Apply filters to the allJobs array
    filteredJobs = filterJobs(allJobs);
    
    // Reset to first page when filters change
    currentPage = 1;
    
    // Hide loading state
    loadingContainer.style.display = 'none';
    jobsContainer.style.display = 'grid';
    
    if (filteredJobs.length === 0) {
        showNoJobsMessage(jobsContainer, 'No jobs match your current filters');
    } else {
        // Use the pagination system to display jobs
        updatePagination();
    }
}

// Function to update active filters state from form inputs
function updateActiveFiltersState() {
    // Get all checked job types
    const jobTypes = Array.from(document.querySelectorAll('input[name="job-type"]:checked')).map(cb => cb.value);
    activeFilters.jobType = jobTypes;
    
    // Get all checked experience levels
    const experiences = Array.from(document.querySelectorAll('input[name="experience"]:checked')).map(cb => cb.value);
    activeFilters.experience = experiences;
    
    // Get all checked locations (but preserve custom location if set)
    const locations = Array.from(document.querySelectorAll('input[name="location"]:checked')).map(cb => cb.value);
    // Only reset location if we have checked locations or if all are unchecked
    if (locations.length > 0) {
        activeFilters.location = null; // Clear custom location when checkbox locations are selected
    }
    
    // Get date filter
    const dateFilter = document.querySelector('input[name="date"]:checked')?.value || null;
    activeFilters.date = dateFilter;
    
    // Get salary range
    const minSalary = document.getElementById('min-salary').value || null;
    const maxSalary = document.getElementById('max-salary').value || null;
    activeFilters.salary.min = minSalary;
    activeFilters.salary.max = maxSalary;
    
    // Update the display
    updateActiveFiltersDisplay();
}

// Function to clear all filters
function clearAllFilters() {
    // Uncheck all checkboxes
    document.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
        checkbox.checked = false;
    });
    
    // Clear salary inputs
    document.getElementById('min-salary').value = '';
    document.getElementById('max-salary').value = '';
    
    // Clear location input
    const locationInput = document.getElementById('location-filter');
    if (locationInput) {
        locationInput.value = '';
    }
    
    // Reset active filters
    activeFilters = {
        location: null,
        jobType: [],
        experience: [],
        salary: {
            min: null,
            max: null
        },
        date: null
    };
    
    // Update active filters display
    updateActiveFiltersDisplay();
    
    // Refresh job display
    handleFilterChange();
}

// Function to set up the location filter input
function setupLocationFilter() {
    const locationInput = document.getElementById('location-filter');
    const applyLocationBtn = document.getElementById('applyLocation');
    
    if (!locationInput || !applyLocationBtn) return;
    
    // Handler for apply button click
    applyLocationBtn.addEventListener('click', () => {
        applyLocationFilter();
    });
    
    // Handler for enter key in input
    locationInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            applyLocationFilter();
        }
    });
    
    // Function to apply the location filter
    function applyLocationFilter() {
        const locationValue = locationInput.value.trim();
        
        // Clear location checkboxes if a location is specified
        if (locationValue) {
            // Uncheck any location checkboxes
            document.querySelectorAll('input[name="location"]:checked').forEach(checkbox => {
                checkbox.checked = false;
            });
            
            // Set the custom location filter
            activeFilters.location = locationValue;
            
            // Update active filters display and apply filters
            updateActiveFiltersDisplay();
            handleFilterChange();
        }
    }
}

// Function to initialize filters
function initializeFilters() {
    // Add change event listeners to all filter inputs
    document.querySelectorAll('input[name="job-type"], input[name="experience"], input[name="location"], input[name="date"]').forEach(input => {
        input.addEventListener('change', () => {
            // If a location checkbox is checked, clear the custom location filter
            if (input.name === 'location' && input.checked) {
                activeFilters.location = null;
                document.getElementById('location-filter').value = '';
            }
            handleFilterChange();
        });
    });
    
    // Set up location filter input
    setupLocationFilter();
    
    // Add input event listeners to salary inputs with validation
    const minSalaryInput = document.getElementById('min-salary');
    const maxSalaryInput = document.getElementById('max-salary');

    if (minSalaryInput) {
        minSalaryInput.addEventListener('input', (e) => {
            // Remove any non-numeric characters
            e.target.value = e.target.value.replace(/[^0-9]/g, '');
            handleFilterChange();
        });
    }

    if (maxSalaryInput) {
        maxSalaryInput.addEventListener('input', (e) => {
            // Remove any non-numeric characters
            e.target.value = e.target.value.replace(/[^0-9]/g, '');
            handleFilterChange();
        });
    }
    
    // Add click event listener to clear filters buttons
    document.querySelector('.clear-filters').addEventListener('click', clearAllFilters);
    
    // Add click event listener to mobile clear filters button
    const mobileClearFiltersBtn = document.getElementById('mobileClearFilters');
    if (mobileClearFiltersBtn) {
        mobileClearFiltersBtn.addEventListener('click', () => {
            clearAllFilters();
            // Visual feedback for mobile clear button
            mobileClearFiltersBtn.classList.add('clicked');
            setTimeout(() => {
                mobileClearFiltersBtn.classList.remove('clicked');
            }, 300);
        });
    }
}

// Main function to load jobs
async function loadJobs(searchQuery = '') {
    const jobsContainer = document.querySelector('.jobs-container');
    const loadingContainer = document.querySelector('.loading-container');
    const seeMoreBtn = document.getElementById('see-more-btn');
    const locationParam = getUrlParameters().location || '';
    
    if (!jobsContainer || !loadingContainer) {
        console.error('Required containers not found');
        return;
    }
    
    console.log(`loadJobs called with search query: "${searchQuery}"`);
    
    try {
        // Show loading state
        loadingContainer.style.display = 'block';
        jobsContainer.style.display = 'none';
        
        // Reset pagination
        currentPage = 1;
        
        // Fetch jobs if not already fetched
        if (allJobs.length === 0) {
            console.log("No jobs in memory, fetching from Firestore...");
            const jobsQuery = query(collection(db, "jobs"), where("status", "==", "published"));
            const querySnapshot = await getDocs(jobsQuery);
            
            if (querySnapshot.empty) {
                console.log("No jobs returned from Firestore query");
                showNoJobsMessage(jobsContainer, "No jobs available at the moment.");
                loadingContainer.style.display = 'none';
                jobsContainer.style.display = 'block';
                if (seeMoreBtn) seeMoreBtn.style.display = 'none';
                return;
            }
            
            // Store all jobs in memory
            allJobs = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            console.log(`Loaded ${allJobs.length} jobs from Firestore`);
        } else {
            console.log(`Using ${allJobs.length} jobs already in memory`);
        }
        
        // First apply search query filter if provided
        let searchedJobs = allJobs;
        
        if (searchQuery) {
            console.log(`Filtering by search query: "${searchQuery}"`);
            const query = searchQuery.toLowerCase();
            searchedJobs = allJobs.filter(job => {
                const titleMatch = job.title?.toLowerCase().includes(query);
                const companyMatch = job.company?.toLowerCase().includes(query);
                const descriptionMatch = job.description?.toLowerCase().includes(query);
                const skillsMatch = job.skills?.some(skill => skill.toLowerCase().includes(query));
                
                return titleMatch || companyMatch || descriptionMatch || skillsMatch;
            });
            console.log(`Found ${searchedJobs.length} jobs matching search query`);
        }
        
        // Apply location filter from URL parameter if no location checkbox is checked
        // and we have a custom location filter
        if (activeFilters.location && !document.querySelector('input[name="location"]:checked')) {
            console.log(`Filtering by custom location: "${activeFilters.location}"`);
            searchedJobs = searchedJobs.filter(job => {
                if (!job.location) return false;
                return job.location.toLowerCase().includes(activeFilters.location.toLowerCase());
            });
            console.log(`Found ${searchedJobs.length} jobs matching custom location`);
        }
        
        // Apply the rest of the filters
        filteredJobs = filterJobs(searchedJobs);
        console.log(`After applying all filters: ${filteredJobs.length} jobs remain`);
        
        if (filteredJobs.length === 0) {
            console.log("No jobs match filters, showing message");
            showNoJobsMessage(jobsContainer, "No jobs match your search criteria.");
            loadingContainer.style.display = 'none';
            jobsContainer.style.display = 'block';
            if (seeMoreBtn) seeMoreBtn.style.display = 'none';
            return;
        }
        
        // Sort jobs by date (newest first)
        filteredJobs.sort((a, b) => {
            const dateA = a.createdAt ? new Date(a.createdAt) : new Date(0);
            const dateB = b.createdAt ? new Date(b.createdAt) : new Date(0);
            return dateB - dateA;
        });
        
        console.log("About to update pagination and display jobs");
        
        // Update pagination and display first page
        updatePagination();
        
        // Hide loading state
        loadingContainer.style.display = 'none';
        jobsContainer.style.display = 'grid';
        
        // Hide the see more button if we're using pagination
        if (seeMoreBtn) {
            seeMoreBtn.style.display = 'none';
        }
    } catch (error) {
        console.error('Error loading jobs:', error);
        showErrorMessage(jobsContainer);
        loadingContainer.style.display = 'none';
        jobsContainer.style.display = 'block';
        if (seeMoreBtn) seeMoreBtn.style.display = 'none';
    }
}

// Helper function to show no jobs message
function showNoJobsMessage(container, message) {
    console.log(`Showing no jobs message: "${message}"`);
    
    // Add the showing-message class instead of inline styles
    container.classList.add('showing-message');
    
    container.innerHTML = `
        <dotlottie-player 
            src="https://lottie.host/6f65cb19-68f4-4012-80f9-66ea8e94f084/lQ66W9skG5.lottie" 
            background="transparent" 
            speed="1" 
            style="width: 140px; height: 140px" 
            loop 
            autoplay>
        </dotlottie-player>
        <p>${message}</p>
    `;
}

// Helper function to show error message
function showErrorMessage(container) {
    console.log("Showing error message");
    
    // Add the showing-message class instead of inline styles
    container.classList.add('showing-message');
    
    container.innerHTML = `
        <dotlottie-player 
            src="https://lottie.host/6f65cb19-68f4-4012-80f9-66ea8e94f084/lQ66W9skG5.lottie" 
            background="transparent" 
            speed="1" 
            style="width: 140px; height: 140px" 
            loop 
            autoplay>
        </dotlottie-player>
        <p>Error loading jobs. Please try again later.</p>
    `;
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
    const locationFilter = document.querySelectorAll('input[name="location"]');
    const locationInput = document.getElementById('location-filter');
    const jobTypeFilters = document.querySelectorAll('input[name="job-type"]');
    const minSalaryInput = document.getElementById('min-salary');
    const maxSalaryInput = document.getElementById('max-salary');
    
    // Update search query
    if (jobSearch && params.q) {
        jobSearch.value = params.q;
    }
    
    // Reset active filters
    activeFilters = {
        location: null,
        jobType: [],
        experience: [],
        salary: {
            min: null,
            max: null
        },
        date: null
    };
    
    // Update location filters
    let locationFound = false;
    if (params.location) {
        if (locationFilter.length > 0) {
            locationFilter.forEach(filter => {
                if (filter.value.toLowerCase() === params.location.toLowerCase()) {
                    filter.checked = true;
                    locationFound = true;
                    activeFilters.jobType.push(filter.value);
                }
            });
        }
        
        // If location doesn't match any checkboxes, set it as a custom location
        // and populate the location input field
        if (!locationFound && locationInput) {
            locationInput.value = params.location;
            activeFilters.location = params.location;
        }
    }
    
    // Update job type filters
    if (jobTypeFilters.length > 0 && params.type) {
        jobTypeFilters.forEach(filter => {
            if (filter.value.toLowerCase() === params.type.toLowerCase()) {
                filter.checked = true;
                activeFilters.jobType.push(filter.value);
            }
        });
    }
    
    // Update salary range - handle different formats
    // Format could be "min-max", "min+", or "0-max"
    if (params.salary) {
        if (params.salary.includes('-')) {
            const [min, max] = params.salary.split('-');
            if (minSalaryInput && min) {
                minSalaryInput.value = min;
                activeFilters.salary.min = min;
            }
            if (maxSalaryInput && max) {
                maxSalaryInput.value = max;
                activeFilters.salary.max = max;
            }
        } else if (params.salary.endsWith('+')) {
            const min = params.salary.slice(0, -1);
            if (minSalaryInput) {
                minSalaryInput.value = min;
                activeFilters.salary.min = min;
            }
        }
    }
    
    // Display active filters
    updateActiveFiltersDisplay();
    
    // Trigger filter handling if there are any filter parameters
    if (params.location || params.type || params.salary) {
        setTimeout(() => handleFilterChange(), 100);
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

// Function to show toast
function showToast(message) {
    const toastDialog = document.getElementById('toastDialog');
    const toastOverlay = document.getElementById('toastOverlay');
    const toastMessage = document.querySelector('.toast-message');
    const toastTitle = document.querySelector('.toast-title');
    const toastActions = document.querySelector('.toast-actions');
    
    if (message && auth.currentUser) {
        // Show a success/error toast with the provided message
        toastTitle.textContent = 'Notification';
        toastMessage.textContent = message;
        toastActions.style.display = 'none';
        
        toastDialog.style.display = 'block';
        toastOverlay.style.display = 'block';
        document.body.style.overflow = 'hidden';
        
        // Trigger animations
        requestAnimationFrame(() => {
            toastOverlay.classList.add('active');
            toastDialog.classList.add('active');
        });
        
        // Auto-hide the toast after 3 seconds if it's a notification
        setTimeout(hideToast, 3000);
    } else {
        // Add a small delay to ensure Firebase authentication state is fully loaded
        setTimeout(() => {
            // Double-check authentication state before showing toast
            if (!auth.currentUser) {
                // Show the sign in required toast
                toastTitle.textContent = 'Sign in Required';
                toastMessage.textContent = 'You need to be signed in to perform this action. Please sign in or create an account to continue.';
                toastActions.style.display = 'flex';
                
                toastDialog.style.display = 'block';
                toastOverlay.style.display = 'block';
                document.body.style.overflow = 'hidden';
                
                // Trigger animations
                requestAnimationFrame(() => {
                    toastOverlay.classList.add('active');
                    toastDialog.classList.add('active');
                });
            }
        }, 300); // 300ms delay to allow Firebase to complete auth check
    }
}

// Function to hide toast
function hideToast() {
    const toastOverlay = document.getElementById('toastOverlay');
    const toastDialog = document.getElementById('toastDialog');
    
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
    
    // If user is signed in, execute the provided action
    if (typeof action === 'function') {
        action();
    }
    
    return true;
}

// Listen for auth state changes to reload saved jobs
auth.onAuthStateChanged(user => {
    console.log("Auth state changed, refreshing saved jobs status");
    if (user) {
        loadUserSavedJobs().then(() => {
            // Refresh displayed job cards to show correct saved state
            refreshSavedJobStatus();
        });
    } else {
        userSavedJobs.clear();
        refreshSavedJobStatus();
    }
});

// Function to refresh saved status of displayed job cards
function refreshSavedJobStatus() {
    console.log("Refreshing saved status for all displayed job cards");
    const jobCards = document.querySelectorAll('.job-card');
    
    jobCards.forEach(card => {
        const jobId = card.dataset.jobId;
        const saveBtn = card.querySelector('.save-btn');
        const icon = saveBtn?.querySelector('i');
        
        if (saveBtn && icon && jobId) {
            const isSaved = userSavedJobs.has(jobId);
            console.log(`Job ${jobId} saved status: ${isSaved}`);
            
            if (isSaved) {
                icon.className = 'fas fa-bookmark';
                saveBtn.title = 'Remove from saved';
                card.setAttribute('data-saved', 'true');
            } else {
                icon.className = 'far fa-bookmark';
                saveBtn.title = 'Save job';
                card.setAttribute('data-saved', 'false');
            }
        }
    });
}

// Function to save a job to user's saved collection
async function saveJob(job) {
    if (!auth.currentUser) {
        showToast('Please sign in to save jobs');
        return Promise.reject('Not authenticated');
    }
    
    try {
        const userId = auth.currentUser.uid;
        const savedJobRef = doc(db, 'users', userId, 'savedItems', job.id);
        
        // Prepare job data for saving
        const jobData = {
            type: 'job',
            title: job.title,
            company: job.company,
            location: job.location,
            postType: job.type,
            description: job.description || '',
            icon: 'fa-briefcase',
            tags: job.skills || [],
            url: `../visualize/visualize.html?id=${job.id}`,
            createdAt: job.createdAt,
            savedAt: new Date(),
            jobId: job.id // Store the original job ID for reference
        };
        
        await setDoc(savedJobRef, jobData);
        // Add to local set of saved jobs
        userSavedJobs.add(job.id);
        
        // Update saved jobs count in the menu
        updateSavedJobsCount();
        
        // Don't show toast notification for successful save
        console.log(`Job ${job.id} saved to Firebase`);
        return Promise.resolve(job.id);
    } catch (error) {
        console.error('Error saving job:', error);
        return Promise.reject(error);
    }
}

// Function to unsave a job
async function unsaveJob(jobId) {
    if (!auth.currentUser) {
        return Promise.reject('Not authenticated');
    }
    
    try {
        const userId = auth.currentUser.uid;
        const savedJobRef = doc(db, 'users', userId, 'savedItems', jobId);
        
        await deleteDoc(savedJobRef);
        // Remove from local set of saved jobs
        userSavedJobs.delete(jobId);
        
        // Update saved jobs count in the menu
        updateSavedJobsCount();
        
        // Don't show toast notification for successful unsave
        console.log(`Job ${jobId} removed from Firebase`);
        return Promise.resolve(jobId);
    } catch (error) {
        console.error('Error removing job:', error);
        return Promise.reject(error);
    }
}

// Function to update saved jobs count in the menu
function updateSavedJobsCount() {
    const savedJobsBadge = document.querySelector('.menu-sections a[href="../saved/saved.html"] .badge');
    if (savedJobsBadge) {
        savedJobsBadge.textContent = userSavedJobs.size;
    }
}

// Function to share a job
function shareJob(job) {
    if (navigator.share) {
        navigator.share({
            title: job.title,
            text: `Check out this job: ${job.title} at ${job.company}`,
            url: window.location.origin + `/Pages/visualize/visualize.html?id=${job.id}`
        })
        .then(() => console.log('Shared successfully'))
        .catch((error) => console.error('Error sharing:', error));
    } else {
        // Fallback for browsers that don't support navigator.share
        const shareUrl = window.location.origin + `/Pages/visualize/visualize.html?id=${job.id}`;
        
        // Create a temporary input to copy the URL
        const tempInput = document.createElement('input');
        document.body.appendChild(tempInput);
        tempInput.value = shareUrl;
        tempInput.select();
        document.execCommand('copy');
        document.body.removeChild(tempInput);
        
        showToast('Link copied to clipboard');
    }
}

// Initialize Floating Menu
function initializeFloatingMenu() {
    const menuBtn = document.querySelector('.menu-btn');
    const menuItems = document.querySelector('.menu-items');
    
    // Silently return if floating menu elements don't exist
    if (!menuBtn || !menuItems) {
        return;
    }
    
    let isMenuOpen = false;

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

// Function to load user's saved jobs
async function loadUserSavedJobs() {
    // Clear the set first
    userSavedJobs.clear();
    
    if (!auth.currentUser) {
        console.log("No user logged in, saved jobs set cleared");
        return;
    }
    
    try {
        const userId = auth.currentUser.uid;
        console.log(`Loading saved jobs for user ${userId}...`);
        
        const savedItemsQuery = query(collection(db, 'users', userId, 'savedItems'));
        const querySnapshot = await getDocs(savedItemsQuery);
        
        querySnapshot.forEach(doc => {
            const jobData = doc.data();
            // Add to set if it's a job
            if (jobData.type === 'job' && jobData.jobId) {
                userSavedJobs.add(jobData.jobId);
                console.log(`Added saved job with ID: ${jobData.jobId}`);
            } else {
                // For backwards compatibility with existing data
                userSavedJobs.add(doc.id);
                console.log(`Added saved job with doc ID: ${doc.id}`);
            }
        });
        
        console.log(`Loaded ${userSavedJobs.size} saved jobs for user`);
        
        // Update the saved jobs count in the menu
        const savedJobsBadge = document.querySelector('.menu-sections a[href="../saved/saved.html"] .badge');
        if (savedJobsBadge) {
            savedJobsBadge.textContent = userSavedJobs.size;
        }
    } catch (error) {
        console.error('Error loading saved jobs:', error);
    }
}

// Salary Input Handler
class SalaryInputHandler {
    constructor() {
        this.minInput = document.getElementById('min-salary');
        this.maxInput = document.getElementById('max-salary');
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        // Add input event listeners to both inputs
        this.minInput.addEventListener('input', this.handleInput.bind(this));
        this.maxInput.addEventListener('input', this.handleInput.bind(this));
        
        // Add blur event listeners to format values
        this.minInput.addEventListener('blur', this.formatValue.bind(this, this.minInput));
        this.maxInput.addEventListener('blur', this.formatValue.bind(this, this.maxInput));
    }
    
    handleInput() {
        // Ensure min value is not greater than max value
        const minValue = parseInt(this.minInput.value) || 0;
        const maxValue = parseInt(this.maxInput.value) || 0;
        
        if (minValue > maxValue && maxValue !== 0) {
            this.minInput.value = maxValue;
        }
    }
    
    formatValue(input) {
        if (!input.value) return;
        
        let value = parseInt(input.value);
        if (isNaN(value)) {
            input.value = '';
            return;
        }
        
        // Format the value with thousand separators
        input.value = value.toLocaleString('en-US');
    }
    
    getValues() {
        return {
            min: parseInt(this.minInput.value.replace(/,/g, '')) || 0,
            max: parseInt(this.maxInput.value.replace(/,/g, '')) || 0
        };
    }
}

// Initialize the salary input handler when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new SalaryInputHandler();
    
    // Add event listeners for filter checkboxes
    const filterOptions = document.querySelectorAll('.filter-option input[type="checkbox"]');
    filterOptions.forEach(option => {
        option.addEventListener('change', () => {
            // Here you would typically update the job listings based on the selected filters
            console.log('Filter changed:', option.name, option.value, option.checked);
        });
    });
    
    // Clear filters button
    const clearFiltersBtn = document.querySelector('.clear-filters');
    clearFiltersBtn.addEventListener('click', () => {
        filterOptions.forEach(option => {
            option.checked = false;
        });
        // Reset salary inputs
        const minSalary = document.getElementById('min-salary');
        const maxSalary = document.getElementById('max-salary');
        minSalary.value = '';
        maxSalary.value = '';
    });

    console.log("DOM loaded, initializing page...");
    
    // Initialize floating menu first
    initializeFloatingMenu();
    
    // Initialize search and filters
    handleSearch();
    handleFilters();
    updateSearchInputs();
    
    // Load jobs with URL parameters
    const params = getUrlParameters();
    loadJobs(params.q);

    // Theme Toggle
    const themeToggle = document.getElementById('theme-toggle');
    const themeIcon = themeToggle.querySelector('i');

    // User Menu Toggle
    const userMenuBtn = document.getElementById('user-menu-btn');
    const userDropdown = document.getElementById('user-dropdown');

    // Initialize theme and user menu
    initTheme();
    initUserMenu();

    function initUserMenu() {
        // Toggle dropdown when user menu button is clicked
        if (userMenuBtn && userDropdown) {
            userMenuBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                userDropdown.classList.toggle('show');
            });

            // Close dropdown when clicking outside
            document.addEventListener('click', (e) => {
                if (userDropdown.classList.contains('show') && 
                    !userMenuBtn.contains(e.target) && 
                    !userDropdown.contains(e.target)) {
                    userDropdown.classList.remove('show');
                }
            });
        }
    }

    function initTheme() {
        // Check for saved theme preference and apply it
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme === 'dark') {
            document.documentElement.classList.add('dark-mode');
            document.body.classList.add('dark-mode');
            const moonIcon = themeToggle.querySelector('.moon-icon');
            const sunIcon = themeToggle.querySelector('.sun-icon');
            if (moonIcon) {
                moonIcon.style.opacity = '0';
                moonIcon.style.transform = 'rotate(180deg) scale(0)';
            }
            if (sunIcon) {
                sunIcon.style.opacity = '1';
                sunIcon.style.transform = 'rotate(0) scale(1)';
            }
        } else {
            document.documentElement.classList.remove('dark-mode');
            document.body.classList.remove('dark-mode');
            const moonIcon = themeToggle.querySelector('.moon-icon');
            const sunIcon = themeToggle.querySelector('.sun-icon');
            if (moonIcon) {
                moonIcon.style.opacity = '1';
                moonIcon.style.transform = 'rotate(0) scale(1)';
            }
            if (sunIcon) {
                sunIcon.style.opacity = '0';
                sunIcon.style.transform = 'rotate(-180deg) scale(0)';
            }
        }
    }

    function toggleTheme() {
        document.documentElement.classList.toggle('dark-mode');
        document.body.classList.toggle('dark-mode');
        
        // Save theme preference to localStorage
        const isDarkMode = document.documentElement.classList.contains('dark-mode');
        localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
        
        // Toggle visibility of moon/sun icons
        const moonIcon = themeToggle.querySelector('.moon-icon');
        const sunIcon = themeToggle.querySelector('.sun-icon');
        if (moonIcon) {
            moonIcon.style.opacity = isDarkMode ? '0' : '1';
            moonIcon.style.transform = isDarkMode ? 'rotate(180deg) scale(0)' : 'rotate(0) scale(1)';
        }
        if (sunIcon) {
            sunIcon.style.opacity = isDarkMode ? '1' : '0';
            sunIcon.style.transform = isDarkMode ? 'rotate(0) scale(1)' : 'rotate(-180deg) scale(0)';
        }
    }

    // Add theme toggle event listener
    if (themeToggle) {
        themeToggle.addEventListener('click', toggleTheme);
    }

    // Rest of existing initialization code...
    initializeFilters();
});

// Add a function to handle highlighting the current page in the dropdown menu
function highlightCurrentPageInMenu() {
    // Get the current page path
    const currentPath = window.location.pathname;
    
    // Look for the page directory name in the path
    let currentPage = '';
    const pathParts = currentPath.split('/');
    
    for (const part of pathParts) {
        if (['home', 'jobs', 'posts', 'chats', 'saved', 'account', 'settings', 'users', 'notifications'].includes(part)) {
            currentPage = part;
            break;
        }
    }
    
    if (!currentPage) return; // If we couldn't determine the current page
    
    // Get all menu links in the dropdown
    const menuLinks = document.querySelectorAll('.menu-sections a');
    
    // Remove any existing active classes
    menuLinks.forEach(link => {
        link.classList.remove('active');
    });
    
    // Find and highlight the current page
    menuLinks.forEach(link => {
        const href = link.getAttribute('href');
        if (href && href.includes(`/${currentPage}/`)) {
            link.classList.add('active');
        }
    });
}

// Function to update the active filters display
function updateActiveFiltersDisplay() {
    const activeFiltersContainer = document.getElementById('activeFilters');
    if (!activeFiltersContainer) return;
    
    // Clear current filters
    activeFiltersContainer.innerHTML = '';
    
    let hasActiveFilters = false;
    
    // Add location filter if active
    if (activeFilters.location) {
        hasActiveFilters = true;
        const filterTag = createFilterTag('Location', activeFilters.location, 'location');
        activeFiltersContainer.appendChild(filterTag);
    }
    
    // Add job type filters if active
    activeFilters.jobType.forEach(type => {
        hasActiveFilters = true;
        const filterTag = createFilterTag('Job Type', type, 'jobType', type);
        activeFiltersContainer.appendChild(filterTag);
    });
    
    // Add experience filters if active
    activeFilters.experience.forEach(exp => {
        hasActiveFilters = true;
        const filterTag = createFilterTag('Experience', exp, 'experience', exp);
        activeFiltersContainer.appendChild(filterTag);
    });
    
    // Add salary filter if active
    if (activeFilters.salary.min || activeFilters.salary.max) {
        hasActiveFilters = true;
        let salaryText = '';
        if (activeFilters.salary.min && activeFilters.salary.max) {
            salaryText = `${activeFilters.salary.min} - ${activeFilters.salary.max} MAD`;
        } else if (activeFilters.salary.min) {
            salaryText = `Min: ${activeFilters.salary.min} MAD`;
        } else if (activeFilters.salary.max) {
            salaryText = `Max: ${activeFilters.salary.max} MAD`;
        }
        const filterTag = createFilterTag('Salary', salaryText, 'salary');
        activeFiltersContainer.appendChild(filterTag);
    }
    
    // Add date filter if active
    if (activeFilters.date) {
        hasActiveFilters = true;
        let dateText = '';
        switch (activeFilters.date) {
            case '24h': dateText = 'Last 24 hours'; break;
            case '3d': dateText = 'Last 3 days'; break;
            case '7d': dateText = 'Last 7 days'; break;
            case '30d': dateText = 'Last 30 days'; break;
            default: dateText = activeFilters.date;
        }
        const filterTag = createFilterTag('Date', dateText, 'date');
        activeFiltersContainer.appendChild(filterTag);
    }
    
    // Only show the container if we have active filters
    activeFiltersContainer.style.display = hasActiveFilters ? 'flex' : 'none';
}

// Function to create a filter tag element
function createFilterTag(label, value, filterType, filterValue = null) {
    const tag = document.createElement('div');
    tag.className = `active-filter-tag ${filterType}-filter`;
    
    const labelSpan = document.createElement('span');
    labelSpan.className = 'filter-label';
    labelSpan.textContent = `${label}: `;
    
    const valueSpan = document.createElement('span');
    valueSpan.className = 'filter-value';
    valueSpan.textContent = value;
    
    const removeButton = document.createElement('button');
    removeButton.className = 'remove-filter';
    removeButton.innerHTML = '<i class="fas fa-times"></i>';
    removeButton.setAttribute('aria-label', `Remove ${label} filter`);
    removeButton.addEventListener('click', () => removeFilter(filterType, filterValue));
    
    tag.appendChild(labelSpan);
    tag.appendChild(valueSpan);
    tag.appendChild(removeButton);
    
    return tag;
}

// Function to remove a filter
function removeFilter(filterType, filterValue = null) {
    switch (filterType) {
        case 'location':
            // Clear location filter
            activeFilters.location = null;
            // Uncheck any location checkboxes
            document.querySelectorAll('input[name="location"]:checked').forEach(checkbox => {
                checkbox.checked = false;
            });
            break;
            
        case 'jobType':
            // Remove specific job type
            activeFilters.jobType = activeFilters.jobType.filter(type => type !== filterValue);
            // Uncheck the checkbox
            document.querySelector(`input[name="job-type"][value="${filterValue}"]:checked`)?.click();
            break;
            
        case 'experience':
            // Remove specific experience level
            activeFilters.experience = activeFilters.experience.filter(exp => exp !== filterValue);
            // Uncheck the checkbox
            document.querySelector(`input[name="experience"][value="${filterValue}"]:checked`)?.click();
            break;
            
        case 'salary':
            // Clear both min and max salary
            activeFilters.salary.min = null;
            activeFilters.salary.max = null;
            // Clear the inputs
            document.getElementById('min-salary').value = '';
            document.getElementById('max-salary').value = '';
            break;
            
        case 'date':
            // Clear date filter
            activeFilters.date = null;
            // Uncheck any date checkboxes
            document.querySelectorAll('input[name="date"]:checked').forEach(checkbox => {
                checkbox.checked = false;
            });
            break;
    }
    
    // Update the display and filter the jobs
    updateActiveFiltersDisplay();
    handleFilterChange();
}

// Script to manage navigation display based on screen size
document.addEventListener('DOMContentLoaded', function() {
    // Setup bottom navigation protected links
    setupProtectedNavLinks();
    
    // Initialize other components
    // ...
});

// Function to setup protected navigation links
function setupProtectedNavLinks() {
    // Get bottom navigation links for Users and Chats
    const usersLink = document.querySelector('.bottom-nav a[href="../users/users.html"]');
    const chatsLink = document.querySelector('.bottom-nav a[href="../chats/chats.html"]');
    
    // Add click event handlers to check authentication
    if (usersLink) {
        usersLink.addEventListener('click', function(e) {
            if (!isUserSignedIn()) {
                e.preventDefault();
                showToast(); // Show sign-in required toast
                return false;
            }
        });
    }
    
    if (chatsLink) {
        chatsLink.addEventListener('click', function(e) {
            if (!isUserSignedIn()) {
                e.preventDefault();
                showToast(); // Show sign-in required toast
                return false;
            }
        });
    }
    
    // Add the same protection to the Add Post button (if it exists and isn't already protected)
    const addPostLink = document.querySelector('.bottom-nav a.bottom-nav-add');
    if (addPostLink) {
        addPostLink.addEventListener('click', function(e) {
            if (!isUserSignedIn()) {
                e.preventDefault();
                showToast(); // Show sign-in required toast
                return false;
            }
        });
    }
}

// Event listeners for toast dialog closing
document.addEventListener('DOMContentLoaded', function() {
    const toastClose = document.getElementById('toastClose');
    const toastOverlay = document.getElementById('toastOverlay');
    
    // Close toast when X button is clicked
    if (toastClose) {
        toastClose.addEventListener('click', hideToast);
    }
    
    // Close toast when clicking outside (on the overlay)
    if (toastOverlay) {
        toastOverlay.addEventListener('click', hideToast);
    }
    
    // Add event listeners for the sign in/sign up buttons in the toast
    const toastSignIn = document.getElementById('toastSignIn');
    const toastSignUp = document.getElementById('toastSignUp');
    
    if (toastSignIn) {
        toastSignIn.addEventListener('click', function() {
            const currentPage = encodeURIComponent(window.location.href);
            window.location.href = `../login/login.html?redirect=${currentPage}`;
        });
    }
    
    if (toastSignUp) {
        toastSignUp.addEventListener('click', function() {
            const currentPage = encodeURIComponent(window.location.href);
            window.location.href = `../login/login.html?redirect=${currentPage}&section=signup`;
        });
    }
});
