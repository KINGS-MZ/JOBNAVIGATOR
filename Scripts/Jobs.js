// DOM Elements
const jobsList = document.querySelector('.jobs-list');
const searchInput = document.getElementById('search-input');
const searchButton = document.getElementById('search-button');
const filterInputs = document.querySelectorAll('.filters-sidebar input, .filters-sidebar select');
const themeToggle = document.getElementById('theme-toggle');
const themeIcon = themeToggle.querySelector('i');
const body = document.body;
const mainBtn = document.querySelector('.menu-btn');
const menuItems = document.querySelector('.menu-items');
const filterToggleBtn = document.querySelector('.filter-toggle-btn');
const filtersSidebar = document.querySelector('.filters-sidebar');
const filterCloseBtn = document.querySelector('.filters-close-btn');

// Store all jobs for filtering
let allJobs = [];
let isInitialized = false;

// Create a function to get the no jobs Lottie HTML
function getNoJobsLottie(message) {
    return `
        <div class="no-jobs-container">
            <lottie-player
                src="https://lottie.host/03bdc26c-3123-4238-bba3-b152ee2d75a5/s40fKV3HW2.json"
                background="transparent"
                speed="1"
                style="width: 300px; height: 300px; margin: 0 auto;"
                loop
                autoplay>
            </lottie-player>
            <p class="no-jobs-text">${message}</p>
        </div>`;
}

// Fetch jobs from Firebase
async function fetchJobs() {
    try {
        const jobsRef = firebase.database().ref('jobPosts');
        const snapshot = await jobsRef.once('value');
        const jobsData = snapshot.val();
        
        if (!jobsData) {
            jobsList.innerHTML = getNoJobsLottie('No jobs found');
            return [];
        }

        // Convert object to array and add IDs
        const jobs = Object.entries(jobsData).map(([id, job]) => ({
            id,
            ...job
        }));

        // Sort jobs by creation date (newest first)
        jobs.sort((a, b) => {
            const dateA = a.createdAt ? new Date(a.createdAt) : new Date(0);
            const dateB = b.createdAt ? new Date(b.createdAt) : new Date(0);
            return dateB - dateA;
        });

        // Remove any duplicates based on job ID
        const uniqueJobs = jobs.filter((job, index, self) =>
            index === self.findIndex((j) => j.id === job.id)
        );

        allJobs = uniqueJobs;
        return uniqueJobs;
    } catch (error) {
        console.error('Error fetching jobs:', error);
        jobsList.innerHTML = '<div class="error-message">Error loading jobs. Please try again later.</div>';
        return [];
    }
}

// Format salary for display
function formatSalary(min, max) {
    if (!min && !max) return 'Salary not specified';
    if (!max) return `$${min.toLocaleString()}+`;
    if (!min) return `Up to $${max.toLocaleString()}`;
    return `$${min.toLocaleString()} - $${max.toLocaleString()}`;
}

// Format date for display
function formatDate(timestamp) {
    if (!timestamp) return 'Recently';
    
    const date = new Date(timestamp);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    return `${Math.floor(diffDays / 365)} years ago`;
}

// Render jobs to the page
async function renderJobs(jobs) {
    jobsList.innerHTML = '';
    
    // Get current user
    const currentUser = firebase.auth().currentUser;
    console.log('Current user:', currentUser ? currentUser.uid : 'No user');
    
    for (const job of jobs) {
        const isSaved = currentUser ? await isJobSavedByUser(job.id) : false;
        const saveIconClass = isSaved ? 'fas' : 'far';
        
        const jobCard = document.createElement('div');
        jobCard.className = 'job-card';
        jobCard.dataset.jobId = job.id;
        
        // Make the entire card clickable
        jobCard.style.cursor = 'pointer';
        jobCard.addEventListener('click', (e) => {
            // Only redirect if the click wasn't on a button
            if (!e.target.closest('.action-btn')) {
                window.location.href = `Preview.html?id=${job.id}`;
            }
        });

        const companyInitial = job.company ? job.company.charAt(0).toUpperCase() : 'C';
        // Check both userId and postedBy fields for backward compatibility
        const isJobOwner = currentUser && (job.userId === currentUser.uid || job.postedBy === currentUser.uid);
        
        jobCard.innerHTML = `
            <div class="job-card-content">
                <button class="action-btn ${isJobOwner ? 'delete-job-btn' : 'save-job-btn'}" 
                        title="${isJobOwner ? 'Delete Job' : 'Save Job'}">
                    <i class="${isJobOwner ? 'fas fa-trash-alt' : saveIconClass} fa-bookmark"></i>
                </button>
                
                <div class="job-header">
                    <div class="job-logo-container">
                        ${job.logoUrl ? 
                            `<img src="${job.logoUrl}" alt="${job.company} logo" class="company-logo">` :
                            `<div class="company-logo">${companyInitial}</div>`
                        }
                    </div>
                    <div class="job-title-container">
                        <h3 class="job-title">${job.title || 'No Title'}</h3>
                        <span class="company-name">${job.company || 'No Company'}</span>
                    </div>
                </div>

                <div class="job-details">
                    <div class="company-info">
                        <span class="job-location">
                            <i class="fas fa-map-marker-alt"></i>
                            ${job.location || 'No Location'}
                        </span>
                        <span class="job-type">
                            <i class="fas fa-briefcase"></i>
                            ${job.jobType || 'Not Specified'}
                        </span>
                    </div>
                    
                    <div class="job-tags">
                        <span class="tag experience-level">
                            <i class="fas fa-layer-group"></i>
                            ${job.experienceLevel || 'Not Specified'}
                        </span>
                        <span class="tag work-type">
                            <i class="fas fa-building"></i>
                            ${job.workType || 'Not Specified'}
                        </span>
                        <span class="tag salary">
                            <i class="fas fa-money-bill-wave"></i>
                            ${formatSalary(job.salaryMin, job.salaryMax)}
                        </span>
                    </div>

                    <div class="job-footer">
                        <span class="posted-date">
                            <i class="far fa-clock"></i>
                            Posted ${formatDate(job.createdAt)}
                        </span>
                        <div class="job-footer-actions">
                            <button class="apply-btn" onclick="applyToJob('${job.id}')">
                                <i class="fas fa-paper-plane"></i>
                                Apply Now
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        jobsList.appendChild(jobCard);
        
        // Add appropriate click handler based on ownership
        const actionBtn = jobCard.querySelector('.action-btn');
        if (actionBtn) {
            actionBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (isJobOwner) {
                    console.log('Deleting job:', job.id);
                    showConfirmationModal(job.id);
                } else {
                    toggleSaveJob(actionBtn);
                }
            });
        }
    }
}

// Function to delete a job
async function deleteJob(jobId) {
    try {
        // Get reference to the job in Firebase
        const jobRef = firebase.database().ref(`jobPosts/${jobId}`);
        
        // Delete the job
        await jobRef.remove();
        console.log('Job deleted successfully');
        
        // Remove the job from allJobs array
        allJobs = allJobs.filter(job => job.id !== jobId);
        
        // Re-render the jobs list
        renderJobs(allJobs);
        
        // Hide the modal
        hideConfirmationModal();
    } catch (error) {
        console.error('Error deleting job:', error);
        alert('Failed to delete job. Please try again.');
    }
}

// Show confirmation modal
function showConfirmationModal(jobId) {
    const modal = document.getElementById('confirmationModal');
    const confirmBtn = document.getElementById('confirmDelete');
    const cancelBtn = document.getElementById('cancelDelete');
    const closeBtn = document.getElementById('modalClose');

    // Show modal with animation
    modal.classList.add('active');
    modal.setAttribute('data-animation', 'in');

    // Clean up old event listeners
    const oldConfirm = confirmBtn.cloneNode(true);
    const oldCancel = cancelBtn.cloneNode(true);
    const oldClose = closeBtn.cloneNode(true);
    
    confirmBtn.parentNode.replaceChild(oldConfirm, confirmBtn);
    cancelBtn.parentNode.replaceChild(oldCancel, cancelBtn);
    closeBtn.parentNode.replaceChild(oldClose, closeBtn);

    // Handle confirm click
    oldConfirm.addEventListener('click', async () => {
        await deleteJob(jobId);
    });

    // Handle cancel click
    const handleCancel = () => {
        hideConfirmationModal();
    };

    oldCancel.addEventListener('click', handleCancel);
    oldClose.addEventListener('click', handleCancel);

    // Close modal when clicking outside
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            handleCancel();
        }
    });
}

// Hide confirmation modal
function hideConfirmationModal() {
    const modal = document.getElementById('confirmationModal');
    modal.setAttribute('data-animation', 'out');
    
    // Wait for animation to finish before hiding
    setTimeout(() => {
        modal.classList.remove('active');
        modal.removeAttribute('data-animation');
    }, 200);
}

// Function to check if a job is saved by current user
async function isJobSavedByUser(jobId) {
    const currentUser = firebase.auth().currentUser;
    if (!currentUser) return false;
    
    try {
        const savedJobRef = firebase.database().ref(`savedJobs/${currentUser.uid}/${jobId}`);
        const snapshot = await savedJobRef.once('value');
        return snapshot.exists();
    } catch (error) {
        console.error('Error checking saved job:', error);
        return false;
    }
}

// Toggle save job
async function toggleSaveJob(button) {
    const currentUser = firebase.auth().currentUser;
    if (!currentUser) {
        alert('Please sign in to save jobs');
        return;
    }

    const jobCard = button.closest('.job-card');
    const jobId = jobCard.dataset.jobId;
    const icon = button.querySelector('i');
    
    try {
        const savedJobRef = firebase.database().ref(`savedJobs/${currentUser.uid}/${jobId}`);
        const isSaved = await isJobSavedByUser(jobId);
        
        if (isSaved) {
            // Remove from saved jobs
            await savedJobRef.remove();
            icon.classList.remove('fas');
            icon.classList.add('far');
        } else {
            // Add to saved jobs
            const jobData = allJobs.find(job => job.id === jobId);
            if (jobData) {
                await savedJobRef.set({
                    timestamp: firebase.database.ServerValue.TIMESTAMP,
                    ...jobData
                });
                icon.classList.remove('far');
                icon.classList.add('fas');
            }
        }
    } catch (error) {
        console.error('Error toggling save state:', error);
        alert('Error saving job. Please try again.');
    }
}

// Filter jobs based on current filters
function filterJobs(jobs = allJobs) {
    // If no jobs, return empty array
    if (!jobs || jobs.length === 0) {
        console.log('No jobs to filter');
        return [];
    }

    // Log all jobs before filtering
    console.log('All jobs before filtering:', jobs.map(job => ({
        title: job.title,
        location: job.location,
        jobType: job.jobType,
        experienceLevel: job.experienceLevel,
        salary: { min: job.salaryMin, max: job.salaryMax }
    })));

    const locationFilter = document.querySelector('input[placeholder="City, state, or zip code"]').value.trim().toLowerCase();
    
    // Get filter groups by their labels
    const filterGroups = document.querySelectorAll('.filter-group');
    let jobTypeCheckboxes = [];
    let experienceLevelCheckboxes = [];
    
    filterGroups.forEach(group => {
        const label = group.querySelector('label');
        if (label) {
            if (label.textContent.includes('Job Type')) {
                jobTypeCheckboxes = group.querySelectorAll('input[type="checkbox"]:checked');
            } else if (label.textContent.includes('Experience Level')) {
                experienceLevelCheckboxes = group.querySelectorAll('input[type="checkbox"]:checked');
            }
        }
    });
    
    const salaryFilter = document.querySelector('.filter-group select').value;

    // Get filter values and normalize them
    const jobTypeFilters = Array.from(jobTypeCheckboxes).map(checkbox => 
        checkbox.parentElement.textContent.trim());
    const experienceLevelFilters = Array.from(experienceLevelCheckboxes).map(checkbox => 
        checkbox.parentElement.textContent.trim());

    console.log('Active filters:', {
        location: locationFilter,
        jobTypes: jobTypeFilters,
        experienceLevels: experienceLevelFilters,
        salary: salaryFilter
    });

    // If no filters are active, return all jobs
    if (!locationFilter && jobTypeFilters.length === 0 && experienceLevelFilters.length === 0 && salaryFilter === 'Any') {
        console.log('No filters active, returning all jobs');
        return jobs;
    }

    const filteredJobs = jobs.filter(job => {
        if (!job) return false;

        // Location filter - case insensitive partial match
        const locationMatch = !locationFilter || 
            (job.location && job.location.toLowerCase().includes(locationFilter));

        // Job type filter - exact match but case insensitive
        const jobTypeMatch = jobTypeFilters.length === 0 || 
            (job.jobType && jobTypeFilters.some(filter => {
                const normalizedJobType = job.jobType.toLowerCase();
                const normalizedFilter = filter.toLowerCase();
                console.log('Job type comparison:', {
                    jobType: normalizedJobType,
                    filter: normalizedFilter,
                    matches: normalizedJobType === normalizedFilter
                });
                return normalizedJobType === normalizedFilter;
            }));

        // Experience level filter - exact match but case insensitive
        const experienceLevelMatch = experienceLevelFilters.length === 0 || 
            (job.experienceLevel && experienceLevelFilters.some(filter => {
                const normalizedJobLevel = job.experienceLevel.toLowerCase();
                const normalizedFilter = filter.toLowerCase();
                console.log('Experience level comparison:', {
                    level: normalizedJobLevel,
                    filter: normalizedFilter,
                    matches: normalizedJobLevel === normalizedFilter
                });
                return normalizedJobLevel === normalizedFilter;
            }));

        // Salary filter
        let salaryMatch = true;
        if (salaryFilter !== 'Any') {
            const minSalary = parseInt(job.salaryMin) || 0;
            const maxSalary = parseInt(job.salaryMax) || minSalary;
            
            console.log('Salary comparison:', {
                jobSalary: { min: minSalary, max: maxSalary },
                filterRange: salaryFilter
            });

            switch (salaryFilter) {
                case '$0 - $50,000':
                    salaryMatch = maxSalary <= 50000;
                    break;
                case '$50,000 - $100,000':
                    salaryMatch = minSalary < 100000 && maxSalary >= 50000;
                    break;
                case '$100,000+':
                    salaryMatch = minSalary >= 100000;
                    break;
            }
        }

        // Log match results
        const matchResult = {
            jobTitle: job.title,
            matches: {
                location: locationMatch,
                jobType: jobTypeMatch,
                experienceLevel: experienceLevelMatch,
                salary: salaryMatch
            },
            overallMatch: locationMatch && jobTypeMatch && experienceLevelMatch && salaryMatch
        };
        console.log('Match result:', matchResult);

        return matchResult.overallMatch;
    });

    console.log('Filtered jobs:', filteredJobs.length);
    return filteredJobs;
}

// Function to initialize the page
async function initializePage() {
    if (isInitialized) {
        console.log('Page already initialized, skipping...');
        return;
    }

    try {
        isInitialized = true;
        const jobs = await fetchJobs();
        if (jobs.length > 0) {
            renderJobs(jobs);
        } else {
            jobsList.innerHTML = getNoJobsLottie('No jobs available');
        }
    } catch (error) {
        console.error('Error initializing page:', error);
        jobsList.innerHTML = '<div class="error-message">Error loading jobs. Please try again later.</div>';
    }
}

// Handle search
async function handleSearch(event) {
    if (event) {
        event.preventDefault();
    }

    // Show loading state
    jobsList.innerHTML = '<div class="loading">Loading jobs...</div>';
    
    try {
        // Check if search input exists
        if (!searchInput) {
            throw new Error('Search input not found');
        }

        const searchTerm = searchInput.value.toLowerCase().trim();
        
        // Fetch jobs only once
        const jobs = await fetchJobs();
        console.log('Total jobs found:', jobs.length);

        // Filter jobs based on search term
        const filteredJobs = jobs.filter(job => {
            if (!job) return false;

            const searchableFields = [
                job.title,
                job.company,
                job.location,
                job.description,
                Array.isArray(job.requirements) ? job.requirements.join(' ') : job.requirements,
                job.jobType
            ].filter(Boolean);

            const searchableText = searchableFields.join(' ').toLowerCase();
            return searchTerm === '' || searchableText.includes(searchTerm);
        });

        console.log('Filtered jobs:', filteredJobs.length);

        // Apply additional filters
        const filteredAndSearchedJobs = filterJobs(filteredJobs);
        console.log('Jobs after filtering:', filteredAndSearchedJobs.length);

        if (filteredAndSearchedJobs.length === 0) {
            jobsList.innerHTML = getNoJobsLottie('No jobs match your search criteria');
            return;
        }

        // Render the filtered jobs
        await renderJobs(filteredAndSearchedJobs);
    } catch (error) {
        console.error('Search error:', error);
        jobsList.innerHTML = '<div class="error-message">Error loading jobs. Please try again later.</div>';
    }
}

// Function to setup user menu
function setupUserMenu() {
    console.log('Setting up user menu');
    const userMenuBtn = document.getElementById('user-menu-btn');
    const userDropdown = document.getElementById('user-dropdown');

    if (!userMenuBtn || !userDropdown) {
        console.error('User menu elements not found:', {
            userMenuBtn: !!userMenuBtn,
            userDropdown: !!userDropdown
        });
        return;
    }

    console.log('Found menu elements');

    // Remove any existing listeners first
    const newUserMenuBtn = userMenuBtn.cloneNode(true);
    userMenuBtn.parentNode.replaceChild(newUserMenuBtn, userMenuBtn);

    // Add click handler to the button
    newUserMenuBtn.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        console.log('Menu button clicked');
        userDropdown.classList.toggle('show');
        console.log('Dropdown visibility:', userDropdown.classList.contains('show'));
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', function(e) {
        if (userDropdown.classList.contains('show') && 
            !userDropdown.contains(e.target) && 
            !newUserMenuBtn.contains(e.target)) {
            userDropdown.classList.remove('show');
            console.log('Closing dropdown from outside click');
        }
    });

    // Close dropdown when pressing escape
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && userDropdown.classList.contains('show')) {
            userDropdown.classList.remove('show');
            console.log('Closing dropdown from escape key');
        }
    });
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM Content Loaded - Setting up user menu');
    setupUserMenu();
    
    // Initialize Firebase Auth state listener
    firebase.auth().onAuthStateChanged(async function(user) {
        if (user) {
            console.log('User is signed in:', user.uid);
            updateUserProfileUI(user);
        } else {
            console.log('No user is signed in');
            updateUserProfileUI(null);
        }
        await initializePage();
    });

    // Setup logout functionality
    const logoutLink = document.getElementById('logout-link');
    if (logoutLink) {
        logoutLink.addEventListener('click', function(e) {
            e.preventDefault();
            handleLogout();
        });
    }
    
    // Add search event listeners
    if (searchButton) {
        searchButton.addEventListener('click', handleSearch);
    }
    if (searchInput) {
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                handleSearch(e);
            }
        });
    }

    // Add filter change listeners
    filterInputs.forEach(input => {
        input.addEventListener('change', async () => {
            const jobs = await fetchJobs();
            const filteredJobs = filterJobs(jobs);
            renderJobs(filteredJobs);
        });
    });
});

// Function to get initials from a name
function getInitials(name) {
    if (!name) return 'JN';
    return name
        .split(' ')
        .map(word => word[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
}

// Function to update user profile UI
function updateUserProfileUI(user) {
    const userAvatar = document.getElementById('user-avatar');
    const dropdownAvatarImg = document.getElementById('dropdown-avatar-img');
    const avatarInitials = document.getElementById('avatar-initials');
    const dropdownInitials = document.getElementById('dropdown-initials');
    const userName = document.getElementById('user-name');
    const userEmail = document.getElementById('user-email');
    
    if (user) {
        // Update user info
        const displayName = user.displayName || 'User';
        userName.textContent = displayName;
        userEmail.textContent = user.email;
        
        // Update avatar/initials
        if (user.photoURL) {
            userAvatar.src = user.photoURL;
            dropdownAvatarImg.src = user.photoURL;
            userAvatar.style.display = 'block';
            dropdownAvatarImg.style.display = 'block';
            avatarInitials.style.display = 'none';
            dropdownInitials.style.display = 'none';
        } else {
            const initials = getInitials(displayName);
            avatarInitials.textContent = initials;
            dropdownInitials.textContent = initials;
            userAvatar.style.display = 'none';
            dropdownAvatarImg.style.display = 'none';
            avatarInitials.style.display = 'block';
            dropdownInitials.style.display = 'block';
        }
    } else {
        // Reset to defaults for logged out state
        userName.textContent = 'Guest User';
        userEmail.textContent = 'guest@example.com';
        userAvatar.style.display = 'none';
        dropdownAvatarImg.style.display = 'none';
        avatarInitials.style.display = 'block';
        dropdownInitials.style.display = 'block';
    }
}

// Function to handle logout
function handleLogout() {
    const signOutModal = document.getElementById('signOutModal');
    const confirmBtn = document.getElementById('confirmSignOut');
    const cancelBtn = document.getElementById('cancelSignOut');
    const userDropdown = document.getElementById('user-dropdown');

    // Show the modal
    signOutModal.style.display = 'flex';
    userDropdown.classList.remove('show');

    // Handle cancel
    cancelBtn.addEventListener('click', () => {
        signOutModal.style.display = 'none';
    });

    // Handle confirm
    confirmBtn.addEventListener('click', () => {
        firebase.auth().signOut().then(() => {
            window.location.href = '../index.html';
        }).catch((error) => {
            console.error('Error signing out:', error);
        });
    });

    // Close on outside click
    signOutModal.addEventListener('click', (e) => {
        if (e.target === signOutModal) {
            signOutModal.style.display = 'none';
        }
    });

    // Close on escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            signOutModal.style.display = 'none';
        }
    });
}

// Function to highlight current page
function highlightCurrentPage() {
    const currentPage = window.location.pathname.split('/').pop().toLowerCase();
    const menuItems = document.querySelectorAll('.menu-item');
    
    menuItems.forEach(item => {
        const href = item.getAttribute('href').toLowerCase();
        if (href === currentPage || (currentPage === '' && href === 'home.html')) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });
}

// Function to toggle menu
function toggleMenu() {
    mainBtn.classList.toggle('active');
    menuItems.classList.toggle('active');
}

// Event listener for main menu button
if (mainBtn) {
    mainBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleMenu();
    });
}

// Close menu when clicking outside
document.addEventListener('click', (e) => {
    if (menuItems && 
        menuItems.classList.contains('active') && 
        !menuItems.contains(e.target) && 
        !mainBtn.contains(e.target)) {
        toggleMenu();
    }
});

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Add event listeners for all filter inputs
    const filterInputs = document.querySelectorAll('.filters-sidebar input, .filters-sidebar select');
    filterInputs.forEach(input => {
        input.addEventListener('change', () => {
            const filteredJobs = filterJobs();
            if (filteredJobs.length === 0) {
                jobsList.innerHTML = getNoJobsLottie('No jobs match your filter criteria');
            } else {
                renderJobs(filteredJobs);
            }
        });
    });

    // Add event listener for location input
    const locationInput = document.querySelector('input[placeholder="City, state, or zip code"]');
    let debounceTimeout;
    locationInput.addEventListener('input', () => {
        clearTimeout(debounceTimeout);
        debounceTimeout = setTimeout(() => {
            const filteredJobs = filterJobs();
            if (filteredJobs.length === 0) {
                jobsList.innerHTML = getNoJobsLottie('No jobs match your filter criteria');
            } else {
                renderJobs(filteredJobs);
            }
        }, 300);
    });

    const applyFiltersBtn = document.querySelector('.filter-button.apply');
    const resetFiltersBtn = document.querySelector('.filter-button.reset');
    
    if (applyFiltersBtn) {
        applyFiltersBtn.addEventListener('click', () => {
            const filteredJobs = filterJobs(allJobs);
            if (filteredJobs.length === 0) {
                jobsList.innerHTML = getNoJobsLottie('No jobs match your filters');
            } else {
                renderJobs(filteredJobs);
            }
            hideFilters(); // Hide the filter sidebar after applying
        });
    }
    
    if (resetFiltersBtn) {
        resetFiltersBtn.addEventListener('click', () => {
            // Reset all filters
            document.querySelector('input[placeholder="City, state, or zip code"]').value = '';
            document.querySelectorAll('.filters-sidebar input[type="checkbox"]').forEach(checkbox => {
                checkbox.checked = false;
            });
            document.querySelector('.filter-group select').value = 'Any';
            
            // Show all jobs
            renderJobs(allJobs);
            hideFilters(); // Hide the filter sidebar after resetting
        });
    }
});

// Function to show filters
function showFilters() {
    filtersSidebar.classList.add('show');
    document.body.style.overflow = 'hidden';
}

// Function to hide filters
function hideFilters() {
    filtersSidebar.classList.remove('show');
    document.body.style.overflow = '';
}

// Function to toggle filters
function toggleFilters() {
    if (filtersSidebar.classList.contains('show')) {
        hideFilters();
    } else {
        showFilters();
    }
}

// Event listeners for filter buttons
if (filterToggleBtn) {
    filterToggleBtn.addEventListener('click', toggleFilters);
}

if (filterCloseBtn) {
    filterCloseBtn.addEventListener('click', hideFilters);
}

// Close filters when clicking outside
document.addEventListener('click', (e) => {
    if (filtersSidebar && 
        filtersSidebar.classList.contains('show') && 
        !filtersSidebar.contains(e.target) && 
        !filterToggleBtn.contains(e.target)) {
        hideFilters();
    }
});

// Initialize Hammer.js for touch gestures
if (filtersSidebar && typeof Hammer !== 'undefined') {
    const hammer = new Hammer(filtersSidebar);
    let currentTranslateY = 0;

    // Configure vertical pan recognition
    hammer.get('pan').set({ direction: Hammer.DIRECTION_VERTICAL });

    hammer.on('panstart', () => {
        if (!filtersSidebar.classList.contains('show')) return;
        filtersSidebar.style.transition = 'none';
    });

    hammer.on('panmove', (e) => {
        if (!filtersSidebar.classList.contains('show')) return;
        if (e.deltaY < 0) return; // Only allow downward movement

        currentTranslateY = e.deltaY;
        requestAnimationFrame(() => {
            filtersSidebar.style.transform = `translateY(${currentTranslateY}px)`;
        });
    });

    hammer.on('panend', (e) => {
        if (!filtersSidebar.classList.contains('show')) return;
        
        const height = filtersSidebar.offsetHeight;
        filtersSidebar.style.transition = 'transform 0.3s cubic-bezier(0.4, 0.0, 0.2, 1)';

        if (currentTranslateY > height * 0.3 || e.velocityY > 0.5) {
            filtersSidebar.style.transform = `translateY(${height}px)`;
            setTimeout(() => {
                filtersSidebar.classList.remove('show');
                document.body.style.overflow = '';
                filtersSidebar.style.transform = '';
            }, 300);
        } else {
            filtersSidebar.style.transform = '';
        }
        currentTranslateY = 0;
    });
}

// Theme Management
function setTheme(isDark) {
    // Remove existing classes
    document.documentElement.classList.remove('light-mode', 'dark-mode');
    document.body.classList.remove('light-mode', 'dark-mode');
    
    // Add new class
    const themeClass = isDark ? 'dark-mode' : 'light-mode';
    document.documentElement.classList.add(themeClass);
    document.body.classList.add(themeClass);
    
    // Update icon
    themeIcon.className = isDark ? 'fas fa-sun' : 'fas fa-moon';
    
    // Save preference
    localStorage.setItem('darkMode', isDark);
}

function toggleTheme() {
    const isDark = !document.documentElement.classList.contains('dark-mode');
    setTheme(isDark);
}

// Initialize theme
function initializeTheme() {
    const isDark = localStorage.getItem('darkMode') === 'true';
    setTheme(isDark);
    
    // Add event listener for theme toggle
    if (themeToggle) {
        themeToggle.addEventListener('click', toggleTheme);
    }
}

// Call initializeTheme when DOM is loaded
document.addEventListener('DOMContentLoaded', initializeTheme);

// Function to update user profile UI
function updateUserProfileUI(user) {
    const userAvatar = document.getElementById('user-avatar');
    const dropdownAvatar = document.querySelector('.dropdown-avatar');
    const userName = document.getElementById('user-name');
    const userEmail = document.getElementById('user-email');
    
    if (user) {
        // Update user info
        const displayName = user.displayName || 'User';
        userName.textContent = displayName;
        userEmail.textContent = user.email;
        
        // Update avatar if user has one
        if (user.photoURL) {
            userAvatar.src = user.photoURL;
            dropdownAvatar.src = user.photoURL;
        }
    } else {
        // Reset to defaults for logged out state
        userName.textContent = 'Guest User';
        userEmail.textContent = 'guest@example.com';
        userAvatar.src = '../Assets/default-avatar.png';
        dropdownAvatar.src = '../Assets/default-avatar.png';
    }
}

// Function to handle logout
function handleLogout() {
    const signOutModal = document.getElementById('signOutModal');
    const confirmBtn = document.getElementById('confirmSignOut');
    const cancelBtn = document.getElementById('cancelSignOut');
    const userDropdown = document.getElementById('user-dropdown');

    // Show the modal
    signOutModal.style.display = 'flex';
    userDropdown.classList.remove('show');

    // Handle cancel
    cancelBtn.addEventListener('click', () => {
        signOutModal.style.display = 'none';
    });

    // Handle confirm
    confirmBtn.addEventListener('click', () => {
        firebase.auth().signOut().then(() => {
            window.location.href = '../index.html';
        }).catch((error) => {
            console.error('Error signing out:', error);
        });
    });

    // Close on outside click
    signOutModal.addEventListener('click', (e) => {
        if (e.target === signOutModal) {
            signOutModal.style.display = 'none';
        }
    });

    // Close on escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            signOutModal.style.display = 'none';
        }
    });
}

// Add event listeners when the document is ready
document.addEventListener('DOMContentLoaded', () => {
    // Remove any existing auth state listeners
    if (firebase.auth().currentUser) {
        firebase.auth().signOut();
    }

    // Initialize Firebase Auth state listener
    firebase.auth().onAuthStateChanged(async (user) => {
        if (user) {
            console.log('User is signed in:', user.uid);
            updateUserProfileUI(user);
            // Only initialize the page once when user signs in
            await initializePage();
        } else {
            console.log('No user is signed in');
            updateUserProfileUI(null);
            // Clear the jobs list when user signs out
            jobsList.innerHTML = '';
            isInitialized = false;
            allJobs = [];
        }
    });

    // Setup logout functionality
    const logoutLink = document.getElementById('logout-link');
    if (logoutLink) {
        logoutLink.addEventListener('click', (e) => {
            e.preventDefault();
            handleLogout();
        });
    }
});
