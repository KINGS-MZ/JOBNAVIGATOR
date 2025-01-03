// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const database = firebase.database();

// Wait for DOM to be loaded
document.addEventListener('DOMContentLoaded', () => {
    // Get DOM elements
    const savedJobsList = document.getElementById('saved-jobs-list');
    const noSavedJobsElement = document.getElementById('no-saved-jobs');
    const viewToggleButtons = document.querySelectorAll('.view-btn');
    const themeToggle = document.getElementById('theme-toggle');
    const userMenuBtn = document.getElementById('user-menu-btn');
    const userDropdown = document.getElementById('user-dropdown');
    const signOutModal = document.getElementById('signOutModal');
    const confirmSignOutBtn = document.getElementById('confirmSignOut');
    const cancelSignOutBtn = document.getElementById('cancelSignOut');
    const mainBtn = document.querySelector('.main-btn');
    const menuItems = document.querySelector('.menu-items');
    const userNameElement = document.getElementById('user-name');
    const userEmailElement = document.getElementById('user-email');
    const avatarInitials = document.getElementById('avatar-initials');
    const dropdownInitials = document.getElementById('dropdown-initials');
    const userAvatar = document.getElementById('user-avatar');
    const dropdownAvatar = document.getElementById('dropdown-avatar-img');
    const logoutLink = document.getElementById('logout-link');

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

    // Theme Toggle
    themeToggle.addEventListener('click', () => {
        document.documentElement.classList.toggle('dark-mode');
        document.body.classList.toggle('dark-mode');
        const isDark = document.documentElement.classList.contains('dark-mode');
        localStorage.setItem('darkMode', isDark);
        themeToggle.querySelector('i').className = isDark ? 'fas fa-sun' : 'fas fa-moon';
    });

    // View Toggle
    viewToggleButtons.forEach(button => {
        button.addEventListener('click', () => {
            viewToggleButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            
            const view = button.dataset.view;
            savedJobsList.classList.toggle('list-view', view === 'list');
        });
    });

    // User Menu Toggle
    function toggleUserMenu(e) {
        e.stopPropagation();
        userDropdown.classList.toggle('show');
        document.body.style.overflow = userDropdown.classList.contains('show') ? 'hidden' : '';
    }

    function closeUserMenu() {
        userDropdown.classList.remove('show');
        document.body.style.overflow = '';
    }

    // Add click listener to user menu button
    userMenuBtn.addEventListener('click', toggleUserMenu);

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (!userMenuBtn.contains(e.target) && !userDropdown.contains(e.target)) {
            closeUserMenu();
        }
    });

    // Close menu when pressing Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeUserMenu();
        }
    });

    // Handle touch events for mobile
    let touchStartY = 0;
    let touchEndY = 0;

    userDropdown.addEventListener('touchstart', (e) => {
        touchStartY = e.touches[0].clientY;
    });

    userDropdown.addEventListener('touchmove', (e) => {
        touchEndY = e.touches[0].clientY;
        const deltaY = touchEndY - touchStartY;

        if (deltaY > 50) { // If dragged down more than 50px
            closeUserMenu();
        }
    });

    // Prevent scrolling on mobile when menu is open
    userDropdown.addEventListener('touchmove', (e) => {
        if (e.target === userDropdown) {
            e.preventDefault();
        }
    }, { passive: false });

    // Update user info in the dropdown
    function updateUserInfo(user) {
        if (user) {
            userEmailElement.textContent = user.email;
            
            // Set display name
            const displayName = user.displayName || 'Guest User';
            userNameElement.textContent = displayName;
            
            // Set initials
            const initials = displayName.split(' ').map(n => n[0]).join('').toUpperCase();
            avatarInitials.textContent = initials;
            dropdownInitials.textContent = initials;
            
            // Handle profile photo
            if (user.photoURL) {
                userAvatar.src = user.photoURL;
                userAvatar.style.display = 'block';
                avatarInitials.style.display = 'none';
                
                dropdownAvatar.src = user.photoURL;
                dropdownAvatar.style.display = 'block';
                dropdownInitials.style.display = 'none';
            } else {
                userAvatar.style.display = 'none';
                avatarInitials.style.display = 'flex';
                
                dropdownAvatar.style.display = 'none';
                dropdownInitials.style.display = 'flex';
            }
        }
    }

    // Floating Menu
    function toggleMenu() {
        menuItems.classList.toggle('show');
    }

    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
        if (!mainBtn.contains(e.target) && !menuItems.contains(e.target)) {
            menuItems.classList.remove('show');
        }
    });

    // Add click listener to main menu button
    if (mainBtn) {
        mainBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleMenu();
        });
    }

    // Sign Out Modal
    function openSignOutModal() {
        signOutModal.style.display = 'flex';
    }

    function closeSignOutModal() {
        signOutModal.style.display = 'none';
    }

    logoutLink.addEventListener('click', (e) => {
        e.preventDefault();
        openSignOutModal();
    });

    cancelSignOutBtn.addEventListener('click', closeSignOutModal);

    confirmSignOutBtn.addEventListener('click', () => {
        auth.signOut().then(() => {
            window.location.href = 'Login.html';
        }).catch((error) => {
            console.error('Error signing out:', error);
        });
    });

    // Close modal when clicking outside
    signOutModal.addEventListener('click', (e) => {
        if (e.target === signOutModal) {
            closeSignOutModal();
        }
    });

    function renderSavedJobs(savedJobs) {
        savedJobsList.innerHTML = '';
        
        if (!savedJobs || Object.keys(savedJobs).length === 0) {
            noSavedJobsElement.style.display = 'flex';
            savedJobsList.style.display = 'none';
            return;
        }
        
        noSavedJobsElement.style.display = 'none';
        savedJobsList.style.display = 'grid';
        
        Object.entries(savedJobs).forEach(([jobId, job]) => {
            const companyInitial = job.company ? job.company.charAt(0).toUpperCase() : 'C';
            
            const jobCard = document.createElement('div');
            jobCard.className = 'job-card';
            jobCard.dataset.jobId = jobId;
            
            // Make the entire card clickable
            jobCard.style.cursor = 'pointer';
            jobCard.addEventListener('click', (e) => {
                // Only redirect if the click wasn't on a button
                if (!e.target.closest('.action-btn')) {
                    window.location.href = `Preview.html?id=${jobId}`;
                }
            });

            jobCard.innerHTML = `
                <div class="job-card-content">
                    <button class="action-btn save-job-btn" title="Remove from Saved">
                        <i class="fas fa-bookmark"></i>
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
                                <button class="apply-btn" onclick="window.location.href='${job.applyUrl || `Preview.html?id=${jobId}`}'">
                                    <i class="fas fa-paper-plane"></i>
                                    Apply Now
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            savedJobsList.appendChild(jobCard);
            
            // Add click handler for remove button
            const removeBtn = jobCard.querySelector('.save-job-btn');
            if (removeBtn) {
                removeBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    removeSavedJob(jobId);
                });
            }
        });
    }

    function fetchSavedJobs(userId) {
        const savedJobsRef = database.ref(`savedJobs/${userId}`);
        
        savedJobsRef.on('value', (snapshot) => {
            const savedJobs = snapshot.val();
            
            if (!savedJobs) {
                noSavedJobsElement.style.display = 'flex';
                savedJobsList.style.display = 'none';
                return;
            }
            
            noSavedJobsElement.style.display = 'none';
            savedJobsList.style.display = 'grid';
            renderSavedJobs(savedJobs);
        });
    }

    function removeSavedJob(jobId) {
        const user = auth.currentUser;
        if (!user) return;
        
        const jobRef = database.ref(`savedJobs/${user.uid}/${jobId}`);
        jobRef.remove()
            .then(() => {
                console.log('Job removed successfully');
            })
            .catch((error) => {
                console.error('Error removing job:', error);
            });
    }

    // Load saved jobs
    function loadSavedJobs() {
        auth.onAuthStateChanged(user => {
            if (user) {
                updateUserInfo(user);
                fetchSavedJobs(user.uid);
            } else {
                window.location.href = 'Login.html';
            }
        });
    }

    // Initialize the page
    loadSavedJobs();
});
