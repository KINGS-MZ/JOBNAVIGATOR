// Import Firebase functions
import { 
    auth,
    db,
    doc,
    getDoc
} from '../../Firebase/firebase-config.js';
import { 
    onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js';

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
            <a href="../jobs/SavedJobs.html">
                <i class="fas fa-heart"></i>
                Saved Jobs
                <span class="badge">0</span>
            </a>
            <a href="../jobs/Applications.html">
                <i class="fas fa-briefcase"></i>
                Applications
                <span class="badge">0</span>
            </a>
            <a href="../notifications/notifications.html">
                <i class="fas fa-bell"></i>
                Notifications
                <span class="badge active">0</span>
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

        // Setup action buttons with authentication check
        const applyBtn = document.querySelector('.apply-btn');
        const saveBtn = document.querySelector('.save-btn');

        applyBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (handleProtectedAction('apply')) {
                // Only proceed with email if user is signed in
                if (job.companyEmail) {
                    window.location.href = `mailto:${job.companyEmail}?subject=Application for ${job.title} position`;
                }
            }
        });

        saveBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (handleProtectedAction('save')) {
                // Handle save job functionality
                console.log('Saving job...');
            }
        });

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
});// Force refresh trigger
