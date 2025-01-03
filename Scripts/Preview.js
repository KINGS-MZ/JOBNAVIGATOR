// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', () => {
    // Get job ID from URL
    const urlParams = new URLSearchParams(window.location.search);
    const jobId = urlParams.get('id');

    console.log('Job ID from URL:', jobId); // Debug log

    // Initialize Firebase Auth
    let currentUser = null;

    // Format salary for display
    function formatSalary(min, max) {
        if (!min && !max) return 'Not Specified';
        const formatter = new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            maximumFractionDigits: 0
        });
        return `${formatter.format(min)} - ${formatter.format(max)}`;
    }

    // Format date for display
    function formatDate(timestamp) {
        if (!timestamp) return 'Not Specified';
        const date = new Date(timestamp);
        const now = new Date();
        const diffTime = Math.abs(now - date);
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 0) {
            return 'Today';
        } else if (diffDays === 1) {
            return 'Yesterday';
        } else if (diffDays < 7) {
            return `${diffDays} days ago`;
        } else {
            return date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        }
    }

    // Load job details
    async function loadJobDetails(jobId) {
        console.log('Loading job details for ID:', jobId); // Debug log
        
        if (!jobId) {
            console.error('No job ID provided');
            document.getElementById('job-title').textContent = 'Error: No job ID provided';
            return;
        }

        try {
            console.log('Fetching from Firebase path:', 'jobPosts/' + jobId); // Debug log
            const jobRef = firebase.database().ref('jobPosts/' + jobId);
            const snapshot = await jobRef.once('value');
            const jobData = snapshot.val();

            console.log('Job Data received:', jobData); // Debug log

            if (!jobData) {
                console.error('Job not found');
                document.getElementById('job-title').textContent = 'Job not found';
                return;
            }

            // Update job details in the UI
            document.getElementById('job-title').textContent = jobData.title || 'No Title';
            document.getElementById('company-name').textContent = jobData.company || 'No Company';
            
            // Update company logo
            const logoElement = document.getElementById('company-logo');
            if (jobData.logoUrl) {
                logoElement.src = jobData.logoUrl;
                logoElement.alt = `${jobData.company} logo`;
            } else {
                logoElement.src = '../Assets/default-company-logo.png';
                logoElement.alt = 'Default Company Logo';
            }

            // Job Details
            document.getElementById('job-type').textContent = jobData.jobType || 'Not Specified';
            document.getElementById('experience-level').textContent = jobData.experienceLevel || 'Not Specified';
            document.getElementById('location').textContent = jobData.location || 'Not Specified';
            document.getElementById('work-type').textContent = jobData.workType || 'Not Specified';
            document.getElementById('salary-range').textContent = formatSalary(jobData.salaryMin, jobData.salaryMax);
            document.getElementById('posted-date').textContent = formatDate(jobData.postedAt);
            document.getElementById('job-description').textContent = jobData.description || 'No Description';
            document.getElementById('application-deadline').textContent = jobData.deadline ? 
                new Date(jobData.deadline).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                }) : 'Open Until Filled';
            
            // Update positions count if available
            if (document.getElementById('positions-count')) {
                document.getElementById('positions-count').textContent = jobData.positions || '1';
            }

            // Update application methods if available
            if (jobData.applyUrl) {
                const applyUrlLink = document.getElementById('apply-url');
                if (applyUrlLink) {
                    applyUrlLink.href = jobData.applyUrl;
                    applyUrlLink.style.display = 'inline-flex';
                }
            }

            if (jobData.applyEmail) {
                const applyEmailLink = document.getElementById('apply-email');
                if (applyEmailLink) {
                    applyEmailLink.href = `mailto:${jobData.applyEmail}`;
                    applyEmailLink.style.display = 'inline-flex';
                }
            }
            
            // Update requirements list
            const requirementsList = document.getElementById('requirements-list');
            requirementsList.innerHTML = '';
            if (jobData.requirements && Array.isArray(jobData.requirements)) {
                jobData.requirements.forEach(req => {
                    if (req && req.trim()) {  // Only add non-empty requirements
                        const li = document.createElement('li');
                        li.textContent = req;
                        requirementsList.appendChild(li);
                    }
                });
            }

            // Update benefits list
            const benefitsList = document.getElementById('benefits-list');
            benefitsList.innerHTML = '';
            if (jobData.benefits && Array.isArray(jobData.benefits)) {
                jobData.benefits.forEach(benefit => {
                    if (benefit && benefit.trim()) {  // Only add non-empty benefits
                        const li = document.createElement('li');
                        li.textContent = benefit;
                        benefitsList.appendChild(li);
                    }
                });
            }

            // Check if current user is the post owner and show/hide delete button
            const deleteBtn = document.querySelector('.delete-job-btn');
            if (deleteBtn) {
                const isJobOwner = currentUser && (jobData.userId === currentUser.uid || jobData.postedBy === currentUser.uid);
                console.log('Delete button visibility check:', {
                    currentUserId: currentUser?.uid,
                    jobUserId: jobData.userId,
                    jobPostedBy: jobData.postedBy,
                    isOwner: isJobOwner
                });

                if (isJobOwner) {
                    deleteBtn.style.display = 'inline-flex';
                    
                    // Add delete functionality
                    deleteBtn.onclick = () => {
                        showConfirmationModal(jobId);
                    };
                } else {
                    deleteBtn.style.display = 'none';
                }
            }

        } catch (error) {
            console.error('Error loading job details:', error);
            document.getElementById('job-title').textContent = 'Error loading job details';
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

        // Delete job when confirmed
        oldConfirm.addEventListener('click', async () => {
            try {
                const jobRef = firebase.database().ref('jobPosts/' + jobId);
                await jobRef.remove();
                console.log('Job deleted successfully');
                window.location.href = 'Jobs.html';
            } catch (error) {
                console.error('Error deleting job:', error);
                alert('Failed to delete job. Please try again.');
            }
        });

        // Handle cancel click
        const handleCancel = () => {
            modal.setAttribute('data-animation', 'out');
            setTimeout(() => {
                modal.classList.remove('active');
                modal.removeAttribute('data-animation');
            }, 200);
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

    // Initialize auth state listener and load job details
    firebase.auth().onAuthStateChanged((user) => {
        console.log('Auth state changed:', user?.uid);
        currentUser = user;
        
        // Load job details after auth state is determined
        if (jobId) {
            loadJobDetails(jobId);
        } else {
            console.error('No job ID in URL');
            document.getElementById('job-title').textContent = 'Error: No job ID provided';
        }
    });

    // User Menu Dropdown
    const userMenuBtn = document.getElementById('user-menu-btn');
    const userDropdown = document.getElementById('user-dropdown');

    userMenuBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        userDropdown.classList.toggle('active');
    });

    document.addEventListener('click', (e) => {
        if (!userDropdown.contains(e.target)) {
            userDropdown.classList.remove('active');
        }
    });

    // Share functionality
    const shareBtn = document.querySelector('.share-btn');
    const shareModal = document.getElementById('share-modal');
    const closeModal = document.querySelector('.close-modal');
    const shareUrl = document.getElementById('share-url');
    const copyLinkBtn = document.getElementById('copy-link-btn');

    shareBtn.addEventListener('click', () => {
        shareUrl.value = window.location.href;
        shareModal.classList.add('active');
    });

    closeModal.addEventListener('click', () => {
        shareModal.classList.remove('active');
    });

    shareModal.addEventListener('click', (e) => {
        if (e.target === shareModal) {
            shareModal.classList.remove('active');
        }
    });

    copyLinkBtn.addEventListener('click', async () => {
        try {
            await navigator.clipboard.writeText(shareUrl.value);
            const originalText = copyLinkBtn.innerHTML;
            copyLinkBtn.innerHTML = '<i class="fas fa-check"></i> Copied!';
            setTimeout(() => {
                copyLinkBtn.innerHTML = originalText;
            }, 2000);
        } catch (err) {
            console.error('Failed to copy text: ', err);
        }
    });

    // Share options
    const shareOptions = document.querySelectorAll('.share-option');
    shareOptions.forEach(option => {
        option.addEventListener('click', () => {
            const platform = option.dataset.platform;
            const url = encodeURIComponent(window.location.href);
            const title = encodeURIComponent(document.getElementById('job-title').textContent);
            const company = encodeURIComponent(document.getElementById('company-name').textContent);
            
            let shareUrl;
            switch (platform) {
                case 'linkedin':
                    shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${url}`;
                    break;
                case 'twitter':
                    shareUrl = `https://twitter.com/intent/tweet?text=${title} at ${company}&url=${url}`;
                    break;
                case 'facebook':
                    shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${url}`;
                    break;
                case 'whatsapp':
                    shareUrl = `https://wa.me/?text=${title} at ${company}: ${url}`;
                    break;
            }
            
            window.open(shareUrl, '_blank');
        });
    });

    // Save Job Functionality
    const saveButton = document.querySelector('.save-job-btn');
    if (saveButton) {
        saveButton.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            const icon = saveButton.querySelector('i');
            icon.classList.toggle('fas');
            icon.classList.toggle('far');
            
            if (icon.classList.contains('fas')) {
                icon.style.color = '#ef4444'; // Red color when saved
            } else {
                icon.style.color = ''; // Default color when unsaved
            }
        });
    }

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
    const isDark = localStorage.getItem('darkMode') === 'true';
    applyTheme(isDark);

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
            if (linkHref.includes(pageName)) {
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
});