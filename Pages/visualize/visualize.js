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

// Theme toggle functionality
document.addEventListener('DOMContentLoaded', () => {
    const themeToggle = document.getElementById('theme-toggle');
    
    // Theme toggle functionality
    themeToggle.addEventListener('click', () => {
        document.body.classList.toggle('dark-mode');
        localStorage.setItem('theme', document.body.classList.contains('dark-mode') ? 'dark' : 'light');
    });

    // Check for saved theme preference
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-mode');
    }
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

        // Setup apply button
        const applyBtn = document.querySelector('.apply-btn');
        applyBtn.addEventListener('click', () => {
            if (job.companyEmail) {
                window.location.href = `mailto:${job.companyEmail}?subject=Application for ${job.title} position`;
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

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // User menu functionality
    const userMenuBtn = document.getElementById('user-menu-btn');
    const userDropdown = document.getElementById('user-dropdown');

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

    // Check authentication first
    onAuthStateChanged(auth, (user) => {
        console.log('Auth state changed:', user);
        if (!user) {
            // User is not signed in, redirect to login page
            window.location.href = '../login/login.html';
            return;
        }
        
        // Update user info in dropdown
        if (user.displayName) {
            document.getElementById('user-name').textContent = user.displayName;
        }
        if (user.email) {
            document.getElementById('user-email').textContent = user.email;
        }
        if (user.photoURL) {
            const avatarImages = document.querySelectorAll('#avatar-image, #avatar-image-dropdown');
            const avatarInitials = document.querySelectorAll('#avatar-initials, #avatar-initials-dropdown');
            
            avatarImages.forEach(img => {
                img.src = user.photoURL;
                img.style.display = 'block';
            });
            avatarInitials.forEach(div => {
                div.style.display = 'none';
            });
        } else if (user.displayName) {
            const initials = user.displayName
                .split(' ')
                .map(name => name[0])
                .join('')
                .toUpperCase()
                .slice(0, 2);
            
            document.querySelectorAll('#avatar-initials, #avatar-initials-dropdown')
                .forEach(div => div.textContent = initials);
        }
        
        // User is authenticated, load job details
        loadJobDetails();
    });

    // Logout functionality
    document.getElementById('logout-link')?.addEventListener('click', async (e) => {
        e.preventDefault();
        try {
            await auth.signOut();
            window.location.href = '../login/login.html';
        } catch (error) {
            console.error('Error signing out:', error);
        }
    });
});