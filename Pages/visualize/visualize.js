// Import Firebase functions
import { 
    auth,
    db,
    doc,
    getDoc,
    deleteDoc,
    setDoc,
    collection,
    query,
    where,
    getDocs
} from '../../Firebase/firebase-config.js';
import { 
    onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js';

// Theme Toggle Functionality
document.addEventListener('DOMContentLoaded', () => {
    // Theme Toggle Functionality
    const themeToggle = document.getElementById('theme-toggle');
    const html = document.documentElement;
    const body = document.body;
    
    // Check for saved theme preference
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
        html.classList.toggle('dark-mode', savedTheme === 'dark');
        body.classList.toggle('dark-mode', savedTheme === 'dark');
        
        // Update the icon depending on the theme
        if (themeToggle) {
            const moonIcon = themeToggle.querySelector('.fa-moon');
            const sunIcon = themeToggle.querySelector('.fa-sun');
            
            if (savedTheme === 'dark') {
                moonIcon.style.display = 'none';
                sunIcon.style.display = 'inline-block';
            } else {
                moonIcon.style.display = 'inline-block';
                sunIcon.style.display = 'none';
            }
        }
    } else {
        // Default to hiding sun icon if no theme is saved
        const sunIcon = themeToggle?.querySelector('.fa-sun');
        if (sunIcon) sunIcon.style.display = 'none';
    }
    
    // Theme toggle click handler
    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            html.classList.toggle('dark-mode');
            body.classList.toggle('dark-mode');
            const isDark = html.classList.contains('dark-mode');
            localStorage.setItem('theme', isDark ? 'dark' : 'light');
            
            // Toggle visibility of moon/sun icons
            const moonIcon = themeToggle.querySelector('.fa-moon');
            const sunIcon = themeToggle.querySelector('.fa-sun');
            
            moonIcon.style.display = isDark ? 'none' : 'inline-block';
            sunIcon.style.display = isDark ? 'inline-block' : 'none';
        });
    }
});

// User menu functionality
const userMenuBtn = document.getElementById('user-menu-btn');
const userDropdown = document.getElementById('user-dropdown');
const menuSections = document.querySelector('.menu-sections');

userMenuBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    userDropdown.classList.toggle('active');
});

// Close dropdown when clicking outside
document.addEventListener('click', (e) => {
    if (!userMenuBtn.contains(e.target) && !userDropdown.contains(e.target)) {
        userDropdown.classList.remove('active');
    }
});

// Force the user icon to show instead of initials
function forceUserIcon() {
    const avatarInitials = document.getElementById('avatar-initials');
    const avatarInitialsDropdown = document.getElementById('avatar-initials-dropdown');
    
    // For main avatar
    if (avatarInitials) {
        // Completely replace with icon
        avatarInitials.innerHTML = '<i class="fa-solid fa-circle-user"></i>';
        avatarInitials.style.display = 'flex';
        
        // Add a class to identify this as using an icon
        avatarInitials.classList.add('using-icon');
    }
    
    // For dropdown avatar
    if (avatarInitialsDropdown) {
        // Completely replace with icon
        avatarInitialsDropdown.innerHTML = '<i class="fa-solid fa-circle-user"></i>';
        avatarInitialsDropdown.style.display = 'flex';
        
        // Add a class to identify this as using an icon
        avatarInitialsDropdown.classList.add('using-icon');
    }
}

// Set up a MutationObserver to ensure the user icon is always displayed
function setupMutationObserver() {
    const avatarInitials = document.getElementById('avatar-initials');
    const avatarInitialsDropdown = document.getElementById('avatar-initials-dropdown');
    
    // Options for the observer (which mutations to observe)
    const config = { childList: true, subtree: true, characterData: true };
    
    // Callback function to execute when mutations are observed
    const callback = function(mutationsList) {
        for(const mutation of mutationsList) {
            if (mutation.type === 'childList' || mutation.type === 'characterData') {
                // Check if our icon is still present
                const hasIcon = mutation.target.querySelector('.fa-circle-user');
                if (!hasIcon) {
                    console.log('Avatar was changed, forcing user icon again');
                    forceUserIcon();
                }
            }
        }
    };
    
    // Create observers for both avatar elements
    if (avatarInitials) {
        const observer = new MutationObserver(callback);
        observer.observe(avatarInitials, config);
    }
    
    if (avatarInitialsDropdown) {
        const observer = new MutationObserver(callback);
        observer.observe(avatarInitialsDropdown, config);
    }
}

// Call it once immediately
forceUserIcon();

// Set up the observer to keep monitoring for changes
setupMutationObserver();

// Call it again after a short delay to ensure it's not overridden
setTimeout(forceUserIcon, 100);

// Also set an interval to periodically check and force the icon if needed
// This is a fallback in case the mutation observer doesn't catch everything
const intervalId = setInterval(() => {
    const avatarInitials = document.getElementById('avatar-initials');
    const avatarInitialsDropdown = document.getElementById('avatar-initials-dropdown');
    
    if (avatarInitials && !avatarInitials.querySelector('.fa-circle-user')) {
        console.log('Periodic check: Avatar icon missing, restoring');
        forceUserIcon();
    }
    
    if (avatarInitialsDropdown && !avatarInitialsDropdown.querySelector('.fa-circle-user')) {
        console.log('Periodic check: Dropdown avatar icon missing, restoring');
        forceUserIcon();
    }
}, 500);

// Handle authentication state
onAuthStateChanged(auth, (user) => {
    console.log('Auth state changed:', user);
    const menuSections = document.querySelector('.menu-sections');
    
    // Get avatar elements
    const avatarInitials = document.getElementById('avatar-initials');
    const avatarInitialsDropdown = document.getElementById('avatar-initials-dropdown');
    const avatarImage = document.getElementById('avatar-image');
    const avatarImageDropdown = document.getElementById('avatar-image-dropdown');
    
    if (user) {
        // User is signed in
        const displayName = user.displayName || 'User';
        const email = user.email;
        
        // Update user info in the dropdown
        const userNameElement = document.getElementById('user-name');
        const userEmailElement = document.getElementById('user-email');
        
        if (userNameElement && user.displayName) {
            userNameElement.textContent = user.displayName;
        }
        
        if (userEmailElement && user.email) {
            userEmailElement.textContent = user.email;
        }

        // Handle profile picture
        if (user.photoURL) {
            // User has a profile picture
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
            // Force user icon for signed-in users without profile pictures
            if (avatarImage) avatarImage.style.display = 'none';
            if (avatarImageDropdown) avatarImageDropdown.style.display = 'none';
            
            // Force user icon
            forceUserIcon();
            
            // Call it again after a short delay to ensure it's not overridden
            setTimeout(forceUserIcon, 100);
        }

        // Update menu sections for signed-in user
        menuSections.innerHTML = `
            <a href="../home/home.html">
                <i class="fas fa-home"></i>
                Home
            </a>
            <a href="../jobs/jobs.html">
                <i class="fas fa-briefcase"></i>
                Jobs
            </a>
            <a href="../posts/posts.html">
                <i class="fas fa-newspaper"></i>
                Posts
            </a>
            <div class="menu-divider"></div>
            <a href="../saved/saved.html">
                <i class="fas fa-heart"></i>
                Saved Jobs
                <span class="badge">0</span>
            </a>
            <a href="../notifications/notifications.html">
                <i class="fas fa-bell"></i>
                Notifications
                <span class="badge active">0</span>
            </a>
            <a href="../chats/chats.html">
                <i class="fas fa-comments"></i>
                Chats
            </a>
            <div class="menu-divider"></div>
            <a href="../profile/profile.html">
                <i class="fas fa-user"></i>
                My Profile
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

        // Add logout functionality
        document.getElementById('logout-link')?.addEventListener('click', async (e) => {
            e.preventDefault();
            try {
                await auth.signOut();
                window.location.href = '../login/login.html';
            } catch (error) {
                console.error('Error signing out:', error);
            }
        });
    } else {
        // Guest user - update avatar and menu
        // Force default user icon for guest users
        if (avatarImage) avatarImage.style.display = 'none';
        if (avatarImageDropdown) avatarImageDropdown.style.display = 'none';
        
        // Force user icon
        forceUserIcon();
        
        // Call it again after a short delay to ensure it's not overridden
        setTimeout(forceUserIcon, 100);

        // Update user info for guest
        const userName = document.getElementById('user-name');
        const userEmail = document.getElementById('user-email');
        
        if (userName) {
            userName.textContent = 'Welcome';
        }
        if (userEmail) {
            userEmail.textContent = 'Sign in to access your account';
        }

        // Update menu sections for guest user
        menuSections.innerHTML = `
            <a href="../login/login.html" class="sign-in-link">
                <i class="fas fa-sign-in-alt"></i>
                Sign In
            </a>
        `;
    }
    
    // Load job details regardless of auth state
    loadJobDetails();
});

// Function to get URL parameters
function getUrlParameter(name) {
    const urlParams = new URLSearchParams(window.location.search);
    const param = urlParams.get(name);
    console.log(`Getting URL parameter ${name}:`, param);
    return param;
}

// Function to format date
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

// Function to create benefits list
function createBenefitsList(benefits) {
    if (!benefits || benefits.length === 0) return '';
    
    return `
        <section class="benefits-section">
            <h3><i class="fas fa-gift"></i> Benefits</h3>
            <ul class="benefits-list">
                ${benefits.map(benefit => `
                    <li class="benefit-item">
                        <span class="benefit-text">${benefit}</span>
                    </li>
                `).join('')}
            </ul>
        </section>
    `;
}

// Function to create requirements list HTML
function createRequirementsList(requirements) {
    if (!requirements || requirements.length === 0) return '';
    
    return `
        <section class="requirements">
            <h3>Requirements</h3>
            <ul>
                ${requirements.map(req => `<li>${req}</li>`).join('')}
            </ul>
        </section>
    `;
}

// Function to show loading state
function showLoading() {
    const loadingHTML = `
        <div class="loading-container">
            <div id="lottie-loading"></div>
            <p>Loading job details...</p>
        </div>
    `;
    document.querySelector('.job-details-content').style.display = 'none';
    document.querySelector('.job-details-container').innerHTML = loadingHTML;

    // Initialize Lottie animation
    lottie.loadAnimation({
        container: document.getElementById('lottie-loading'),
        renderer: 'svg',
        loop: true,
        autoplay: true,
        path: 'https://lottie.host/0a32af61-c5c3-4557-9fdd-a4f789d88a1b/QpRxAkRZEi.json'
    });
}

// Variable to store if job is saved
let isJobSaved = false;
let currentJob = null;

// Function to load job details
async function loadJobDetails() {
    console.log('Starting loadJobDetails...');
    const jobId = getUrlParameter('id');
    if (!jobId) {
        console.error('No job ID in URL');
        showError('No job ID provided');
        return;
    }

    try {
        console.log('Loading job with ID:', jobId);
        const jobRef = doc(db, "jobs", jobId);
        console.log('Job reference:', jobRef);
        
        const jobDoc = await getDoc(jobRef);
        console.log('Job doc exists:', jobDoc.exists());

        if (!jobDoc.exists()) {
            console.error('Job document not found');
            showError('Job not found');
            return;
        }

        const job = jobDoc.data();
        console.log('Job data:', job);
        displayJobDetails(job);
    } catch (error) {
        console.error('Error loading job details:', error);
        showError('Failed to load job details: ' + error.message);
    }
}

// Function to display job details
function displayJobDetails(job) {
    console.log('Displaying job details:', job);
    
    // Store the current job for later use
    currentJob = job;

    try {
        // Hide loading state and show content
        document.querySelector('.loading-container').style.display = 'none';
        document.querySelector('.job-details-content').style.display = 'block';

        // Update basic info
        document.getElementById('job-title').textContent = job.title;
        document.getElementById('company-name').textContent = job.company;
        document.getElementById('location').textContent = job.location;
        document.getElementById('job-type').textContent = job.type;
        document.getElementById('salary').textContent = job.salaryMin && job.salaryMax ? 
            `$${job.salaryMin.toLocaleString()} - $${job.salaryMax.toLocaleString()}` : 
            'Salary not specified';
        document.getElementById('posted-date').textContent = `Posted ${formatDate(job.createdAt)}`;

        // Check if the current user is the creator of the post
        const deleteBtn = document.getElementById('delete-btn');
        const editBtn = document.getElementById('edit-btn');
        const applyBtn = document.querySelector('.apply-btn');
        const saveBtn = document.querySelector('.save-btn');

        if (auth.currentUser && job.createdBy && job.createdBy.uid && auth.currentUser.uid === job.createdBy.uid) {
            // Show delete and edit buttons only if the current user is the creator
            deleteBtn.style.display = 'flex';
            editBtn.style.display = 'flex';
            
            // Hide apply and save buttons for the creator
            applyBtn.style.display = 'none';
            saveBtn.style.display = 'none';
            
            // Add event listener for edit button
            editBtn.addEventListener('click', () => {
                const jobId = getUrlParameter('id');
                window.location.href = `../posts/posts.html?edit=${jobId}`;
            });
            
            // Add event listener for delete button
            deleteBtn.addEventListener('click', async () => {
                if (confirm('Are you sure you want to delete this post? This action cannot be undone.')) {
                    try {
                        const jobId = getUrlParameter('id');
                        const jobRef = doc(db, "jobs", jobId);
                        await deleteDoc(jobRef);
                        alert('Post deleted successfully');
                        window.location.href = '../jobs/jobs.html';
                    } catch (error) {
                        console.error('Error deleting post:', error);
                        alert('Failed to delete post: ' + error.message);
                    }
                }
            });
        } else {
            // Hide delete and edit buttons for other users
            deleteBtn.style.display = 'none';
            editBtn.style.display = 'none';
            
            // Setup action buttons with authentication check for non-creators
            applyBtn.addEventListener('click', (e) => {
                e.preventDefault();
                if (handleProtectedAction('apply')) {
                    // Only proceed with email if user is signed in
                    if (job.companyEmail) {
                        window.location.href = `mailto:${job.companyEmail}?subject=Application for ${job.title} position`;
                    }
                }
            });

            // Check if the job is saved
            checkIfJobIsSaved(job.id).then(saved => {
                isJobSaved = saved;
                updateSaveButtonUI(saveBtn);
            });

            saveBtn.addEventListener('click', (e) => {
                e.preventDefault();
                handleProtectedAction(() => {
                    toggleSaveJob(job);
                });
            });
        }

        // Update company logo
        const logoImg = document.getElementById('company-logo');
        if (job.icon?.className) {
            logoImg.style.display = 'none';
            const iconElement = document.createElement('i');
            iconElement.className = job.icon.className;
            iconElement.style.fontSize = '45px';
            iconElement.style.color = 'var(--primary-blue)';
            iconElement.style.margin = '0.5rem 0';
            logoImg.parentElement.appendChild(iconElement);
        }

        // Update company card
        const companyCard = document.querySelector('.company-card');
        companyCard.innerHTML = `
            <h3>
                <i class="fas fa-building"></i>
                About the Company
            </h3>
            <div class="company-logo-large">
                ${job.icon?.className ? 
                    `<i class="${job.icon.className}" style="font-size: 60px; color: var(--primary-blue); margin: 0.5rem 0;"></i>` : 
                    `<img src="${job.companyLogo || ''}" alt="${job.company} logo">`}
            </div>
            <h4>${job.company}</h4>
            <p class="company-description">${job.companyDescription || 'No company description available.'}</p>
            <div class="company-stats">
                <div class="stat">
                    <i class="fas fa-map-marker-alt"></i>
                    <span id="company-location">${job.location || 'Location not specified'}</span>
                </div>
                <div class="stat">
                    <i class="fas fa-globe"></i>
                    <span id="company-website">
                        ${job.companyWebsite ? 
                            `<a href="${job.companyWebsite}" target="_blank">${job.companyWebsite}</a>` : 
                            'Website not available'}
                    </span>
                </div>
            </div>
        `;

        // Update job tags/skills
        const jobTags = document.getElementById('job-tags');
        jobTags.innerHTML = job.skills?.map(skill => `<span class="job-tag">${skill}</span>`).join('') || '';

        // Update job description and requirements
        const mainContent = document.querySelector('.main-content');
        mainContent.innerHTML = `
            <section class="job-description">
                <h3><i class="fas fa-file-alt"></i> Job Description</h3>
                <div>${job.description || 'No description provided'}</div>
            </section>
            ${createRequirementsList(job.requirements)}
            ${createBenefitsList(job.benefits)}
        `;

        // Add creator info if available
        if (job.createdBy) {
            const postedBy = document.createElement('p');
            postedBy.className = 'posted-by';
            postedBy.innerHTML = `Posted by: ${job.createdBy.displayName || 'Anonymous'}`;
            mainContent.appendChild(postedBy);
        }

        console.log('Job details displayed successfully');
    } catch (error) {
        console.error('Error in displayJobDetails:', error);
        showError('Error displaying job details: ' + error.message);
    }
}

// Function to show error state
function showError(message) {
    console.error('Showing error:', message);
    const loadingContainer = document.querySelector('.loading-container');
    
    // Check if the error is about no job ID
    if (message === 'No job ID provided') {
        // Create countdown element with redirection message
        loadingContainer.innerHTML = `
            <p class="error-message">${message}</p>
            <p class="redirect-message">Redirecting to jobs page in <span id="countdown">3</span> seconds...</p>
        `;
        
        // Start countdown
        let countdown = 3;
        const countdownElement = document.getElementById('countdown');
        
        const countdownInterval = setInterval(() => {
            countdown--;
            countdownElement.textContent = countdown;
            
            if (countdown <= 0) {
                clearInterval(countdownInterval);
                // Redirect to jobs page
                window.location.href = '../jobs/Jobs.html';
            }
        }, 1000);
    } else {
        // For other errors, show the error animation
        loadingContainer.innerHTML = `
            <lottie-player 
                src="https://lottie.host/58cd0d57-9c9c-4897-8a0f-e421585cf238/1Xk51HlxlI.json" 
                background="transparent" 
                speed="1" 
                style="width: 200px; height: 200px;" 
                loop 
                autoplay>
            </lottie-player>
            <p class="error-message">${message}</p>
        `;
    }
}

// Toast Dialog Functionality
const toastDialog = document.getElementById('toastDialog');
const toastOverlay = document.getElementById('toastOverlay');
const toastClose = document.getElementById('toastClose');
const toastSignIn = document.getElementById('toastSignIn');
const toastSignUp = document.getElementById('toastSignUp');

// Function to show toast
function showToast(message) {
    const toastDialog = document.getElementById('toastDialog');
    const toastOverlay = document.getElementById('toastOverlay');
    const toastMessage = document.querySelector('.toast-message');
    const toastTitle = document.querySelector('.toast-title');
    const toastActions = document.querySelector('.toast-actions');
    
    if (message && auth.currentUser) {
        // Show a success/error toast
        toastTitle.textContent = 'Notification';
        toastMessage.textContent = message;
        toastActions.style.display = 'none';
    } else {
        // Show the sign in required toast
        toastTitle.textContent = 'Sign in Required';
        toastMessage.textContent = 'You need to be signed in to perform this action. Please sign in or create an account to continue.';
        toastActions.style.display = 'flex';
    }
    
    toastDialog.classList.add('active');
        toastOverlay.classList.add('active');
    
    // Auto-hide the toast after 3 seconds if it's a notification
    if (message && auth.currentUser) {
        setTimeout(hideToast, 3000);
    }
}

// Function to hide toast
function hideToast() {
    const toastDialog = document.getElementById('toastDialog');
    const toastOverlay = document.getElementById('toastOverlay');
    
    toastDialog.classList.remove('active');
    toastOverlay.classList.remove('active');
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
toastClose.addEventListener('click', hideToast);
toastOverlay.addEventListener('click', hideToast);

// Redirect to login page with sign in section
toastSignIn.addEventListener('click', () => {
    const currentPage = encodeURIComponent(window.location.href);
    window.location.href = `../login/login.html?redirect=${currentPage}`;
});

// Redirect to login page with sign up section
toastSignUp.addEventListener('click', () => {
    const currentPage = encodeURIComponent(window.location.href);
    window.location.href = `../login/login.html?redirect=${currentPage}&section=signup`;
});

// Function to check if a job is saved by the current user
async function checkIfJobIsSaved(jobId) {
    if (!auth.currentUser) {
        return false;
    }
    
    try {
        const userId = auth.currentUser.uid;
        const savedJobRef = doc(db, 'users', userId, 'savedItems', jobId);
        const savedJobSnap = await getDoc(savedJobRef);
        
        return savedJobSnap.exists();
    } catch (error) {
        console.error('Error checking if job is saved:', error);
        return false;
    }
}

// Function to update the save button UI
function updateSaveButtonUI(saveBtn) {
    if (!saveBtn) return;
    
    const icon = saveBtn.querySelector('i') || document.createElement('i');
    if (!saveBtn.querySelector('i')) {
        saveBtn.appendChild(icon);
    }
    
    if (isJobSaved) {
        icon.className = 'fas fa-bookmark';
        saveBtn.title = 'Remove from saved';
        saveBtn.querySelector('span').textContent = 'Saved';
    } else {
        icon.className = 'far fa-bookmark';
        saveBtn.title = 'Save job';
        saveBtn.querySelector('span').textContent = 'Save';
    }
}

// Function to toggle job saved state
async function toggleSaveJob(job) {
    if (!auth.currentUser) {
        showToast();
        return;
    }
    
    try {
        const userId = auth.currentUser.uid;
        const jobId = job.id;
        const savedJobRef = doc(db, 'users', userId, 'savedItems', jobId);
        const saveBtn = document.querySelector('.save-btn');
        
        if (isJobSaved) {
            // Unsave the job
            await deleteDoc(savedJobRef);
            isJobSaved = false;
        } else {
            // Save the job
            const jobData = {
                type: 'job',
                title: job.title,
                company: job.company,
                location: job.location,
                postType: job.type,
                description: job.description || '',
                icon: 'fa-briefcase',
                tags: job.skills || [],
                url: `../visualize/visualize.html?id=${jobId}`,
                createdAt: job.createdAt,
                savedAt: new Date(),
                jobId: jobId // Store the original job ID for reference
            };
            
            await setDoc(savedJobRef, jobData);
            isJobSaved = true;
        }
        
        // Just update the UI without showing a toast notification
        updateSaveButtonUI(saveBtn);
    } catch (error) {
        console.error('Error toggling job save state:', error);
    }
}

// Force refresh trigger
