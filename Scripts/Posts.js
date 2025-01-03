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

// User Dropdown
const userBtn = document.querySelector('.user-btn');
const userDropdown = document.querySelector('.user-dropdown');

userBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    userDropdown.classList.toggle('active');
});

document.addEventListener('click', () => {
    userDropdown.classList.remove('active');
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
        if (linkHref.includes(pageName) || (pageName === '' && linkHref.includes('posts.html'))) {
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
highlightCurrentPage();

// Form Handling
document.addEventListener('DOMContentLoaded', function() {
    // Check if user is authenticated
    firebase.auth().onAuthStateChanged((user) => {
        if (!user) {
            console.log('User not authenticated, redirecting to login...');
            window.location.href = '../Auth/auth.html';
            return;
        }
        console.log('User is authenticated:', user.email);
    });

    const jobForm = document.getElementById('job-post-form');
    const requirementsContainer = document.getElementById('requirements-container');
    const benefitsContainer = document.getElementById('benefits-container');
    const addRequirementBtn = document.getElementById('add-requirement');
    const addBenefitBtn = document.getElementById('add-benefit');
    const logoInput = document.getElementById('company-logo');
    const logoPreview = document.getElementById('logo-preview');

    // Function to create a new requirement input
    function createRequirementInput() {
        const div = document.createElement('div');
        div.className = 'requirement-input';
        div.innerHTML = `
            <input type="text" name="requirements[]" placeholder="Add a requirement">
            <button type="button" class="remove-requirement">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        // Add event listener to remove button
        div.querySelector('.remove-requirement').addEventListener('click', function() {
            div.remove();
        });
        
        return div;
    }

    // Function to create a new benefit input
    function createBenefitInput() {
        const div = document.createElement('div');
        div.className = 'benefit-input';
        div.innerHTML = `
            <input type="text" name="benefits[]" placeholder="Add a benefit">
            <button type="button" class="remove-benefit">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        // Add event listener to remove button
        div.querySelector('.remove-benefit').addEventListener('click', function() {
            div.remove();
        });
        
        return div;
    }

    // Add requirement input
    function addRequirement() {
        const container = document.getElementById('requirements-container');
        container.appendChild(createRequirementInput());
    }

    // Add benefit input
    function addBenefit() {
        const container = document.getElementById('benefits-container');
        container.appendChild(createBenefitInput());
    }

    // Initialize event listeners for add buttons
    document.getElementById('add-requirement').addEventListener('click', addRequirement);
    document.getElementById('add-benefit').addEventListener('click', addBenefit);
    
    // Add event listeners to initial remove buttons
    document.querySelectorAll('.remove-requirement').forEach(button => {
        button.addEventListener('click', function() {
            this.closest('.requirement-input').remove();
        });
    });
    
    document.querySelectorAll('.remove-benefit').forEach(button => {
        button.addEventListener('click', function() {
            this.closest('.benefit-input').remove();
        });
    });

    // Handle form submission
    jobForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const submitBtn = document.querySelector('.submit-btn');
        submitBtn.classList.add('loading');
        
        try {
            // Get form data
            const formData = new FormData(this);
            const currentUser = firebase.auth().currentUser;
            if (!currentUser) {
                throw new Error('User not logged in');
            }

            const jobData = {
                title: formData.get('title'),
                company: formData.get('company'),
                jobType: formData.get('type'),
                experienceLevel: formData.get('experience'),
                location: formData.get('location'),
                workType: formData.get('workType'),
                salaryMin: formData.get('salaryMin'),
                salaryMax: formData.get('salaryMax'),
                description: formData.get('description'),
                requirements: Array.from(document.querySelectorAll('input[name="requirements[]"]'))
                    .map(input => input.value)
                    .filter(value => value.trim() !== ''),
                benefits: Array.from(document.querySelectorAll('input[name="benefits[]"]'))
                    .map(input => input.value)
                    .filter(value => value.trim() !== ''),
                deadline: formData.get('deadline'),
                positions: formData.get('positions'),
                applyUrl: formData.get('applyUrl'),
                applyEmail: formData.get('applyEmail'),
                createdAt: firebase.database.ServerValue.TIMESTAMP,
                userId: currentUser.uid,
                postedBy: currentUser.uid // Adding both for backward compatibility
            };

            // Handle logo upload if present
            const logoFile = formData.get('logo');
            if (logoFile && logoFile.size > 0) {
                const storageRef = firebase.storage().ref();
                const logoRef = storageRef.child(`company-logos/${Date.now()}_${logoFile.name}`);
                await logoRef.put(logoFile);
                jobData.logoUrl = await logoRef.getDownloadURL();
            }

            // Save to Firebase
            const jobsRef = firebase.database().ref('jobPosts');
            await jobsRef.push(jobData);

            // Show success state
            submitBtn.classList.remove('loading');
            submitBtn.classList.add('success');
            submitBtn.innerHTML = '<i class="fas fa-check"></i> Posted Successfully';

            // Wait briefly then redirect to Jobs page
            setTimeout(() => {
                window.location.href = 'Jobs.html';
            }, 1500);

        } catch (error) {
            console.error('Error posting job:', error);
            
            // Show error state
            submitBtn.classList.remove('loading');
            submitBtn.classList.add('error');
            submitBtn.innerHTML = '<i class="fas fa-exclamation-circle"></i> Error Posting Job';

            // Reset button after delay
            setTimeout(() => {
                submitBtn.classList.remove('error');
                submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Post Job';
            }, 2000);
        }
    });

    // Handle logo preview
    if (logoInput) {
        logoInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file && logoPreview) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    logoPreview.src = e.target.result;
                    logoPreview.style.display = 'block';
                };
                reader.readAsDataURL(file);
            } else if (logoPreview) {
                logoPreview.style.display = 'none';
            }
        });
    }
});

// Filter Functionality
const jobTypeFilter = document.getElementById('job-type');
const locationFilter = document.getElementById('location');
const salaryFilter = document.getElementById('salary-range');

function applyFilters() {
    const selectedJobType = jobTypeFilter.value;
    const selectedLocation = locationFilter.value;
    const selectedSalary = salaryFilter.value;

    // Reference to the jobs collection in Firebase
    const jobsRef = firebase.database().ref('jobPosts');

    jobsRef.once('value')
        .then((snapshot) => {
            const jobs = [];
            snapshot.forEach((childSnapshot) => {
                const job = childSnapshot.val();
                job.id = childSnapshot.key;

                // Apply filters
                const matchesJobType = !selectedJobType || job.jobType === selectedJobType;
                const matchesLocation = !selectedLocation || job.location.toLowerCase().includes(selectedLocation.toLowerCase());
                const matchesSalary = !selectedSalary || (
                    (selectedSalary === 'under-50k' && job.salaryMin < 50000) ||
                    (selectedSalary === '50k-100k' && job.salaryMin >= 50000 && job.salaryMax <= 100000) ||
                    (selectedSalary === 'over-100k' && job.salaryMax > 100000)
                );

                if (matchesJobType && matchesLocation && matchesSalary) {
                    jobs.push(job);
                }
            });

            // Update the UI with filtered jobs
            displayJobs(jobs);
        })
        .catch((error) => {
            console.error('Error fetching jobs:', error);
        });
}

function displayJobs(jobs) {
    const jobListContainer = document.getElementById('job-listings');
    if (!jobListContainer) return;

    jobListContainer.innerHTML = '';

    if (jobs.length === 0) {
        jobListContainer.innerHTML = '<p class="no-jobs">No jobs found matching your criteria</p>';
        return;
    }

    jobs.forEach(job => {
        const jobCard = document.createElement('div');
        jobCard.className = 'job-card';
        jobCard.innerHTML = `
            <div class="job-header">
                <h3>${job.title}</h3>
                <span class="company-name">${job.company}</span>
            </div>
            <div class="job-details">
                <span><i class="fas fa-map-marker-alt"></i> ${job.location}</span>
                <span><i class="fas fa-briefcase"></i> ${job.jobType}</span>
                <span><i class="fas fa-money-bill-wave"></i> $${job.salaryMin.toLocaleString()} - $${job.salaryMax.toLocaleString()}</span>
            </div>
            <div class="job-description">
                <p>${job.description.substring(0, 150)}...</p>
            </div>
            <div class="job-actions">
                <button class="apply-btn" onclick="applyToJob('${job.id}')">Apply Now</button>
                <button class="save-btn" onclick="saveJob('${job.id}')">
                    <i class="far fa-heart"></i>
                </button>
            </div>
        `;
        jobListContainer.appendChild(jobCard);
    });
}

// Add event listeners to filters
jobTypeFilter.addEventListener('change', applyFilters);
locationFilter.addEventListener('input', debounce(applyFilters, 500));
salaryFilter.addEventListener('change', applyFilters);

// Debounce function to prevent too many API calls
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Functions for job actions
function applyToJob(jobId) {
    // Implement job application logic
    console.log('Applying to job:', jobId);
}

function saveJob(jobId) {
    // Implement job saving logic
    console.log('Saving job:', jobId);
}

// Initial load of jobs
applyFilters();