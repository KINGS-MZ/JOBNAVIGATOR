import { 
    onAuthStateChanged,
    signOut
} from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js';

document.addEventListener('DOMContentLoaded', () => {
    // Get profile ID from URL if present (support both 'id' and 'userId' parameters)
    const urlParams = new URLSearchParams(window.location.search);
    const profileId = urlParams.get('id') || urlParams.get('userId');
    let isOwnProfile = true;
    let currentUser = null;
    
    // Setup share button functionality 
    const shareButton = document.getElementById('share-button');
    if (shareButton) {
        shareButton.addEventListener('click', () => {
            // Get current URL or construct URL for current profile
            const profileUrl = profileId 
                ? `${window.location.origin}${window.location.pathname}?userId=${profileId}`
                : `${window.location.origin}${window.location.pathname}`;
            
            // Copy to clipboard
            navigator.clipboard.writeText(profileUrl)
                .then(() => {
                    // Temporarily change icon to indicate success
                    const originalInnerHTML = shareButton.innerHTML;
                    shareButton.innerHTML = '<i class="fas fa-check"></i>';
                    shareButton.style.color = '#2ecc71';
                    shareButton.title = 'Link copied!';
                    
                    // Reset after 2 seconds
                    setTimeout(() => {
                        shareButton.innerHTML = originalInnerHTML;
                        shareButton.style.color = '';
                        shareButton.title = 'Share Profile';
                    }, 2000);
                })
                .catch(err => {
                    console.error('Failed to copy profile URL: ', err);
                    alert('Failed to copy profile URL. Please try again.');
                });
        });
    }
    
    // Theme Toggle Functionality - REMOVE this section as it's handled by nav.js
    /*
    const themeToggle = document.getElementById('theme-toggle');
    const userMenuBtn = document.getElementById('user-menu-btn');
    const userDropdown = document.getElementById('user-dropdown');
    
    // Check for saved theme preference or default to light mode
    const currentTheme = localStorage.getItem('theme');
    if (currentTheme === 'dark') {
        document.body.classList.add('dark-mode');
        document.documentElement.classList.add('dark-mode');
    }

    // Toggle theme
    themeToggle?.addEventListener('click', () => {
        document.body.classList.toggle('dark-mode');
        document.documentElement.classList.toggle('dark-mode');
        
        // Save theme preference
        const isDarkMode = document.body.classList.contains('dark-mode');
        localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
    });

    // Toggle user dropdown
    userMenuBtn?.addEventListener('click', (e) => {
        e.stopPropagation();
        userDropdown.classList.toggle('show');
        
        // Close dropdown when clicking outside
        const closeDropdown = (event) => {
            if (!userMenuBtn.contains(event.target) && !userDropdown.contains(event.target)) {
                userDropdown.classList.remove('show');
                document.removeEventListener('click', closeDropdown);
            }
        };
        
        if (userDropdown.classList.contains('show')) {
            setTimeout(() => {
                document.addEventListener('click', closeDropdown);
            }, 0);
        }
    });
    */

    // Retry loading user data every few seconds to ensure settings changes are reflected
    let retryCount = 0;
    const maxRetries = 3;
    
    function refreshUserData(user, initialUserData) {
        // Set up an interval to refresh user data every minute
        const refreshInterval = setInterval(async () => {
            try {
                // Get latest user document from Firestore
                const latestUserDoc = await window.db.collection("users").doc(user.uid).get();
                if (latestUserDoc.exists) {
                    const latestUserData = latestUserDoc.data();
                    
                    // Only update UI if user data has changed
                    const storedDataHash = JSON.stringify(initialUserData);
                    const newDataHash = JSON.stringify(latestUserData);
                    
                    if (storedDataHash !== newDataHash) {
                        // Update UI with new user data
                        updateUIForAuthenticatedUser(user, latestUserData);
                        
                        // Update the stored data reference
                        initialUserData = latestUserData;
                    }
                }
            } catch (error) {
                console.error("Error refreshing user data:", error);
            }
        }, 60000); // Refresh every minute
        
        // Store the interval ID for cleanup
        window.refreshIntervalId = refreshInterval;
        
        // Clean up interval when user logs out or navigates away
        window.addEventListener('beforeunload', () => {
            if (window.refreshIntervalId) {
                clearInterval(window.refreshIntervalId);
            }
        });
    }

    // Handle Firebase authentication state
    onAuthStateChanged(window.auth, async (user) => {
        if (user) {
            // Store current user
            currentUser = user;
            
            // Check if viewing own profile or another user's profile
            if (profileId && profileId !== user.uid) {
                isOwnProfile = false;
                document.body.classList.add('other-profile');
                
                // Load the other user's profile
                await loadOtherUserProfile(profileId);
                
                // Set up follow button functionality
                setupFollowButton(profileId, user.uid);
            } else {
                // Viewing own profile
                isOwnProfile = true;
                document.body.classList.add('own-profile');
                
            // User is signed in
            try {
                // Get user document from Firestore
                    const userDoc = await window.db.collection("users").doc(user.uid).get();
                let userData = {};
                
                    if (userDoc.exists) {
                    // Update UI with user data from Firestore
                    userData = userDoc.data();
                    
                    // Update UI with combined auth and Firestore data
                    updateUIForAuthenticatedUser(user, userData);
                    
                    // Start periodic refresh to catch updates from settings page
                    refreshUserData(user, userData);
                } else {
                    // User document doesn't exist in Firestore
                    updateUIForAuthenticatedUser(user, {});
                    
                    // Create a new user document
                    try {
                            await window.db.collection("users").doc(user.uid).set({
                            name: user.displayName || "",
                            displayName: user.displayName || "",
                            email: user.email || "",
                            createdAt: new Date()
                        });
                    } catch (error) {
                        console.error("Error creating user document:", error);
                    }
                }
                
                // Set up avatar upload functionality
                setupAvatarUpload(user);
                
            } catch (error) {
                console.error("Error fetching user data:", error);
                updateUIForAuthenticatedUser(user, {});
                }
            }
        } else {
            // User is not signed in, redirect to login page
            window.location.href = '../login/login.html';
        }
    });

    // Update UI for authenticated user
    const updateUIForAuthenticatedUser = (user, userData) => {
        const userName = document.getElementById('user-name');
        const userEmail = document.getElementById('user-email');
        const avatarInitials = document.querySelectorAll('.avatar-initials');
        const profileName = document.querySelector('.profile-details h1');
        const avatarImage = document.getElementById('avatar-image');
        const avatarImageDropdown = document.getElementById('avatar-image-dropdown');
        const profileAvatarInitials = document.getElementById('profile-avatar-initials');
        const profileAvatarImage = document.getElementById('profile-avatar-image');
        const headline = document.querySelector('.headline');
        const locationEl = document.querySelector('.location');
        const menuSections = document.querySelector('.menu-sections');
        
        // Update dropdown and other profile elements
        if (userName) userName.textContent = userData.fullName || user.displayName || 'User';
        if (userEmail) userEmail.textContent = user.email || '';
        
        // Get the user's photo URL from Firestore or auth
        const photoURL = userData.photoURL || user.photoURL;
        
        if (photoURL) {
            // User has a profile photo, show images and hide initials
            if (profileAvatarImage) {
                profileAvatarImage.src = photoURL;
                profileAvatarImage.style.display = 'block';
            }
            
            if (avatarImage) {
                avatarImage.src = photoURL;
                avatarImage.style.display = 'block';
            }
            
            if (avatarImageDropdown) {
                avatarImageDropdown.src = photoURL;
                avatarImageDropdown.style.display = 'block';
            }
            
            // Hide all initials when showing images
                avatarInitials.forEach(el => {
                if (el) el.style.display = 'none';
                });
        } else {
            // No profile photo, show initials instead
            if (profileAvatarImage) profileAvatarImage.style.display = 'none';
            if (avatarImage) avatarImage.style.display = 'none';
            if (avatarImageDropdown) avatarImageDropdown.style.display = 'none';
            
            // Update avatar initials
            const displayName = userData.fullName || user.displayName || 'User';
            const initials = displayName.split(' ').map(n => n[0]).join('').toUpperCase();
                avatarInitials.forEach(el => {
                if (el) {
                    el.textContent = initials;
                    el.style.display = 'flex';
                }
            });
        }
        
        // Update profile details
        if (profileName) profileName.textContent = userData.fullName || user.displayName || 'Your Name';
        
        // Update headline with data from Firebase or show placeholder
        if (headline) {
            if (userData.headline) {
                headline.textContent = userData.headline;
                headline.classList.remove('placeholder-text');
            } else {
                headline.textContent = 'Professional headline not set';
                headline.classList.add('placeholder-text');
            }
        }
        
        // Update location with data from Firebase or hide it
        if (locationEl) {
            if (userData.location) {
                locationEl.innerHTML = `<i class="fas fa-map-marker-alt"></i> ${userData.location}`;
                locationEl.style.display = 'flex';
            } else {
                locationEl.style.display = 'none';
            }
        }
        
        // Update about section
        updateProfileWithUserData(userData);
        
        // Setup edit profile button functionality
        setupEditProfileButton(user.uid, userData);
        
        // Setup avatar upload functionality
        setupAvatarUpload(user);
    };
    
    // Function to set up edit profile button functionality
    function setupEditProfileButton(userId, userData) {
        const editProfileBtn = document.getElementById('edit-profile-button');
        if (!editProfileBtn) return;
        
        // Get modal elements
        const profileEditModal = document.getElementById('profileEditModal');
        const fullNameInput = document.getElementById('fullName');
        const headlineInput = document.getElementById('headline');
        const locationInput = document.getElementById('profileLocation');
        const cancelBtn = document.getElementById('cancelProfileEdit');
        const saveBtn = document.getElementById('saveProfileEdit');
        const closeBtn = profileEditModal.querySelector('.modal-close');
        
        // Fill inputs with existing data
        fullNameInput.value = userData.fullName || '';
        headlineInput.value = userData.headline || '';
        locationInput.value = userData.location || '';
        
        // Open modal when Edit Profile button is clicked
        editProfileBtn.addEventListener('click', () => {
            openModal('profileEditModal');
        });
        
        // Close modal handlers
        cancelBtn.addEventListener('click', () => {
            closeModal('profileEditModal');
        });
        
        closeBtn.addEventListener('click', () => {
            closeModal('profileEditModal');
        });
        
        // Save changes
        saveBtn.addEventListener('click', async () => {
            const updatedData = {
                fullName: fullNameInput.value.trim(),
                headline: headlineInput.value.trim(),
                location: locationInput.value.trim()
            };
            
            try {
                // Update in Firestore
                await window.db.collection('users').doc(userId).update(updatedData);
                
                // Update UI
                const profileName = document.querySelector('.profile-details h1');
                const headline = document.querySelector('.headline');
                const locationEl = document.querySelector('.location');
                
                if (profileName) profileName.textContent = updatedData.fullName;
                
        if (headline) {
                    if (updatedData.headline) {
                        headline.textContent = updatedData.headline;
                        headline.classList.remove('placeholder-text');
                    } else {
                        headline.textContent = 'Professional headline not set';
                headline.classList.add('placeholder-text');
                    }
                }
                
                if (locationEl) {
                    if (updatedData.location) {
                        locationEl.innerHTML = `<i class="fas fa-map-marker-alt"></i> ${updatedData.location}`;
                        locationEl.style.display = 'flex';
            } else {
                        locationEl.style.display = 'none';
                    }
                }
                
                // Also update dropdown for consistency
                const userName = document.getElementById('user-name');
                if (userName) userName.textContent = updatedData.fullName;
                
                // Update avatar initials
                const initials = updatedData.fullName.split(' ').map(n => n[0]).join('').toUpperCase();
                const avatarInitials = document.querySelectorAll('.avatar-initials');
                avatarInitials.forEach(el => {
                    if (el) el.textContent = initials;
                });
                
                // Close modal
                closeModal('profileEditModal');
                
                // Show success message
                showToast('Profile updated successfully');
            } catch (error) {
                console.error('Error updating profile:', error);
                showToast('Failed to update profile. Please try again.', 'error');
            }
        });
    }
    
    // Enhanced toast notification function
    function showToast(message, type = 'success') {
        // Check if a toast container already exists
        let toastContainer = document.querySelector('.toast-container');
        
        // Create container if it doesn't exist
        if (!toastContainer) {
            toastContainer = document.createElement('div');
            toastContainer.className = 'toast-container';
            document.body.appendChild(toastContainer);
        }
        
        // Create toast
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        
        // Add dismiss button
        const dismissBtn = document.createElement('button');
        dismissBtn.className = 'toast-dismiss';
        dismissBtn.innerHTML = '<i class="fas fa-times"></i>';
        dismissBtn.addEventListener('click', () => {
            toast.classList.add('hide');
            setTimeout(() => {
                toast.remove();
                // Remove container if empty
                if (toastContainer.children.length === 0) {
                    toastContainer.remove();
                }
            }, 300);
        });
        
        toast.appendChild(dismissBtn);
        
        // Add to container
        toastContainer.appendChild(toast);
        
        // Auto remove after 4 seconds (increased from 3 seconds)
        setTimeout(() => {
            toast.classList.add('hide');
            setTimeout(() => {
                toast.remove();
                
                // Remove container if empty
                if (toastContainer.children.length === 0) {
                    toastContainer.remove();
                }
            }, 300);
        }, 4000);
    }
    
    // Update profile with additional user data from Firestore
    const updateProfileWithUserData = (userData) => {
        // Update about section
        const aboutSection = document.querySelector('.profile-section .section-content p');
        if (aboutSection) {
            // Different placeholder text based on whether it's own profile or another user's
            const placeholderText = isOwnProfile 
                ? "Tell recruiters about your professional background and skills."
                : "About information not provided.";
            
            if (userData.about) {
                aboutSection.textContent = userData.about;
                aboutSection.classList.remove('placeholder-text');
            } else {
                aboutSection.textContent = placeholderText;
                aboutSection.classList.add('placeholder-text');
            }
        }
        
        // Update experience section
        if (userData.experiences && userData.experiences.length > 0) {
            updateExperienceUI(userData.experiences);
        } else {
            // Find the Experience section container
            const experienceSections = document.querySelectorAll('.profile-section');
            let experienceContainer;
            
            experienceSections.forEach(section => {
                const heading = section.querySelector('h2');
                if (heading && heading.textContent.trim() === 'Experience') {
                    experienceContainer = section.querySelector('.section-content');
                }
            });
            
            // Display empty state with professional message
            if (experienceContainer) {
                experienceContainer.innerHTML = isOwnProfile 
                ? `
                    <div class="empty-state">
                        <p class="placeholder-text">Your professional experience will appear here. Showcase your career journey by adding your past and current positions.</p>
                        <p class="placeholder-action">Click "Add Experience" to highlight your professional achievements.</p>
                    </div>
                `
                : `
                    <div class="empty-state">
                        <p class="placeholder-text">No experience information available.</p>
                    </div>
                `;
            }
        }
        
        // Update education section
        if (userData.education && userData.education.length > 0) {
            updateEducationUI(userData.education);
        } else {
            // Find the Education section container
            const educationSections = document.querySelectorAll('.profile-section');
            let educationContainer;
            
            educationSections.forEach(section => {
                const heading = section.querySelector('h2');
                if (heading && heading.textContent.trim() === 'Education') {
                    educationContainer = section.querySelector('.section-content');
                }
            });
            
            // Display empty state with professional message
            if (educationContainer) {
                educationContainer.innerHTML = isOwnProfile
                ? `
                    <div class="empty-state">
                        <p class="placeholder-text">Your educational background will appear here. Showcase your degrees, certifications, and academic achievements.</p>
                        <p class="placeholder-action">Click "Add Education" to highlight your educational qualifications.</p>
                    </div>
                `
                : `
                    <div class="empty-state">
                        <p class="placeholder-text">No education information available.</p>
                    </div>
                `;
            }
        }
        
        // Update profile stats if available
        if (userData.profileStats) {
            updateProfileStats(userData.profileStats);
        } else {
            // Set default stats
            updateProfileStats({
                views: '0',
                appearances: '0',
                strength: '0%'
            });
        }
        
        // If there are skills, update them
        if (userData.skills) {
            // Load skills data from Firestore
            loadSkillsFromFirestore(userData.skills);
        } else {
            // Find the Skills section container
            const skillsSections = document.querySelectorAll('.profile-section');
            let skillsContainer;
            
            skillsSections.forEach(section => {
                const heading = section.querySelector('h2');
                if (heading && heading.textContent.trim() === 'Skills') {
                    skillsContainer = section.querySelector('.skills-grid');
                }
            });
            
            // Display empty state with professional message
            if (skillsContainer) {
                skillsContainer.innerHTML = isOwnProfile
                ? `
                    <div class="empty-state">
                        <p class="placeholder-text">Your skills will appear here. Showcase your technical expertise, professional competencies, and other relevant abilities.</p>
                        <p class="placeholder-action">Click "Edit" to add your skills.</p>
                    </div>
                `
                : `
                    <div class="empty-state">
                        <p class="placeholder-text">No skills information available.</p>
                    </div>
                `;
            }
        }
    };
    
    // Update profile stats
    const updateProfileStats = (stats) => {
        const viewsElement = document.querySelector('.stat-item:nth-child(1) .stat-value');
        const appearancesElement = document.querySelector('.stat-item:nth-child(2) .stat-value');
        const strengthElement = document.querySelector('.stat-item:nth-child(3) .stat-value');
        
        if (viewsElement) viewsElement.textContent = stats.views || '0';
        if (appearancesElement) appearancesElement.textContent = stats.appearances || '0';
        if (strengthElement) strengthElement.textContent = stats.strength || '0%';
    };
    
    // Update experience section UI with experience data
    function updateExperienceUI(experiences) {
        // Find the Experience section container
        const experienceSections = document.querySelectorAll('.profile-section');
        let experienceContainer;
        
        experienceSections.forEach(section => {
            const heading = section.querySelector('h2');
            if (heading && heading.textContent.trim() === 'Experience') {
                experienceContainer = section.querySelector('.section-content');
            }
        });
        
        if (!experienceContainer) return;
        
        // Clear existing content
        experienceContainer.innerHTML = '';
        
        // Sort experiences by start date (most recent first)
        experiences.sort((a, b) => {
            const dateA = new Date(a.startDate || 0);
            const dateB = new Date(b.startDate || 0);
            return dateB - dateA;
        });
        
        // Add experience items to the container
        experiences.forEach(exp => {
            // Format dates properly
            let formattedStartDate = '';
            let formattedEndDate = 'Present';
            
            try {
                if (exp.startDate) {
                    const startDate = new Date(exp.startDate);
                    if (!isNaN(startDate.getTime())) {
                        formattedStartDate = startDate.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
                    }
                }
                
                if (exp.endDate) {
                    const endDate = new Date(exp.endDate);
                    if (!isNaN(endDate.getTime())) {
                        formattedEndDate = endDate.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
                    }
                }
            } catch (error) {
                console.error("Error formatting dates:", error);
            }
            
            const dateRange = formattedStartDate ? `${formattedStartDate} - ${formattedEndDate}` : `${formattedEndDate}`;
            
            const experienceItem = document.createElement('div');
            experienceItem.className = 'experience-item';
            experienceItem.dataset.id = exp.id;
            experienceItem.innerHTML = `
                <div class="experience-header">
                    <div class="experience-title-company">
                        <h3 class="experience-title">${exp.jobTitle || ''}</h3>
                        <div class="experience-company-container">
                            <span class="experience-company">${exp.company || ''}</span>
                        </div>
                    </div>
                    <div class="experience-meta">
                        <span class="experience-date"><i class="fas fa-calendar-alt"></i> ${dateRange}</span>
                        ${exp.location ? `<span class="experience-location"><i class="fas fa-map-marker-alt"></i> ${exp.location}</span>` : ''}
                    </div>
                </div>
                <div class="experience-content">
                    <p class="experience-description">${exp.description || ''}</p>
                    ${exp.skills && exp.skills.length ? `
                        <div class="experience-skills">
                            ${exp.skills.map(skill => `<span class="skill-tag">${skill}</span>`).join('')}
                        </div>
                    ` : ''}
                </div>
                <div class="item-actions">
                    <button class="btn-edit-item" data-id="${exp.id}" title="Edit this experience">
                        <span class="material-symbols-rounded">edit</span>
                    </button>
                    <button class="btn-delete-item" data-id="${exp.id}" title="Delete this experience">
                        <span class="material-symbols-rounded">delete</span>
                    </button>
                </div>
            `;
            
            experienceContainer.appendChild(experienceItem);
            
            // Add delete event listener
            const deleteBtn = experienceItem.querySelector('.btn-delete-item');
            if (deleteBtn && isOwnProfile) {
                deleteBtn.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    if (confirm('Are you sure you want to delete this experience?')) {
                        try {
                            const experienceId = deleteBtn.dataset.id;
                            
                            // Get current experiences from Firestore
                            const userDoc = await window.db.collection("users").doc(currentUser.uid).get();
                            if (userDoc.exists) {
                                const userData = userDoc.data();
                                const updatedExperiences = (userData.experiences || []).filter(exp => exp.id !== experienceId);
                                
                                // Update Firestore
                                await window.db.collection("users").doc(currentUser.uid).update({
                                    experiences: updatedExperiences
                                });
                                
                                // Update UI
                                updateExperienceUI(updatedExperiences);
                                showToast('Experience deleted successfully');
                            }
                        } catch (error) {
                            console.error("Error deleting experience:", error);
                            showToast('Failed to delete experience', 'error');
                        }
                    }
                });
            } else if (deleteBtn && !isOwnProfile) {
                // Hide actions if not own profile
                experienceItem.querySelector('.item-actions').style.display = 'none';
            }
            
            // Add edit event listener
            const editBtn = experienceItem.querySelector('.btn-edit-item');
            if (editBtn && isOwnProfile) {
                editBtn.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    try {
                        // Get the current experience data
                        const userDoc = await window.db.collection("users").doc(currentUser.uid).get();
                        if (userDoc.exists) {
                            const userData = userDoc.data();
                            const experienceToEdit = (userData.experiences || []).find(item => item.id === editBtn.dataset.id);
                            
                            if (experienceToEdit) {
                                // Open the experience modal
                                openModal('experienceModal');
                                
                                // Populate form with existing data
                                document.getElementById('jobTitle').value = experienceToEdit.jobTitle || '';
                                document.getElementById('company').value = experienceToEdit.company || '';
                                document.getElementById('location').value = experienceToEdit.location || '';
                                document.getElementById('startDate').value = experienceToEdit.startDate || '';
                                document.getElementById('endDate').value = experienceToEdit.endDate || '';
                                document.getElementById('description').value = experienceToEdit.description || '';
                                document.getElementById('skills').value = experienceToEdit.skills ? experienceToEdit.skills.join(', ') : '';
                                
                                // Add an attribute to the modal to indicate it's for editing
                                const modal = document.getElementById('experienceModal');
                                modal.dataset.mode = 'edit';
                                modal.dataset.experienceId = experienceToEdit.id;
                                
                                // Update modal title
                                document.querySelector('#experienceModal .modal-title').textContent = 'Edit Experience';
                                
                                // Update save button text
                                document.querySelector('#experienceModal .btn-save').textContent = 'Update Experience';
                            }
                        }
                    } catch (error) {
                        console.error("Error editing experience:", error);
                        showToast('Failed to load experience data', 'error');
                    }
                });
            }
        });
    }
    
    // Update education section UI with education data
    function updateEducationUI(education) {
        // Find the Education section container
        const educationSections = document.querySelectorAll('.profile-section');
        let educationContainer;
        
        educationSections.forEach(section => {
            const heading = section.querySelector('h2');
            if (heading && heading.textContent.trim() === 'Education') {
                educationContainer = section.querySelector('.section-content');
            }
        });
        
        if (!educationContainer) return;
        
        // Clear existing content
        educationContainer.innerHTML = '';
        
        // Sort education by start date (most recent first)
        education.sort((a, b) => {
            const dateA = new Date(a.startDate || 0);
            const dateB = new Date(b.startDate || 0);
            return dateB - dateA;
        });
        
        // Add education items to the container
        education.forEach(edu => {
            // Format dates properly
            let formattedStartDate = '';
            let formattedEndDate = 'Present';
            
            try {
                if (edu.startDate) {
                    const startDate = new Date(edu.startDate);
                    if (!isNaN(startDate.getTime())) {
                        formattedStartDate = startDate.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
                    }
                }
                
                if (edu.endDate) {
                    const endDate = new Date(edu.endDate);
                    if (!isNaN(endDate.getTime())) {
                        formattedEndDate = endDate.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
                    }
                }
            } catch (error) {
                console.error("Error formatting dates:", error);
            }
            
            const dateRange = formattedStartDate ? `${formattedStartDate} - ${formattedEndDate}` : `${formattedEndDate}`;
            
            const educationItem = document.createElement('div');
            educationItem.className = 'education-item';
            educationItem.dataset.id = edu.id;
            educationItem.innerHTML = `
                <div class="education-header">
                    <div class="education-title-school">
                        <h3 class="education-degree">${edu.degree || ''}</h3>
                        <span class="education-school">${edu.school || ''}</span>
                    </div>
                    <div class="education-meta">
                        <span class="education-date"><i class="fas fa-calendar-alt"></i> ${dateRange}</span>
                    </div>
                </div>
                <div class="education-content">
                    ${edu.fieldOfStudy ? `<p class="education-field"><i class="fas fa-book"></i> Field of Study: ${edu.fieldOfStudy}</p>` : ''}
                </div>
                <div class="item-actions">
                    <button class="btn-edit-item" data-id="${edu.id}" title="Edit this education">
                        <span class="material-symbols-rounded">edit</span>
                    </button>
                    <button class="btn-delete-item" data-id="${edu.id}" title="Delete this education">
                        <span class="material-symbols-rounded">delete</span>
                    </button>
                </div>
            `;
            
            educationContainer.appendChild(educationItem);
            
            // Add delete event listener
            const deleteBtn = educationItem.querySelector('.btn-delete-item');
            if (deleteBtn && isOwnProfile) {
                deleteBtn.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    if (confirm('Are you sure you want to delete this education?')) {
                        try {
                            const educationId = deleteBtn.dataset.id;
                            
                            // Get current education entries from Firestore
                            const userDoc = await window.db.collection("users").doc(currentUser.uid).get();
                            if (userDoc.exists) {
                                const userData = userDoc.data();
                                const updatedEducation = (userData.education || []).filter(item => item.id !== educationId);
                                
                                // Update Firestore
                                await window.db.collection("users").doc(currentUser.uid).update({
                                    education: updatedEducation
                                });
                                
                                // Update UI
                                updateEducationUI(updatedEducation);
                                showToast('Education entry deleted successfully');
                            }
                        } catch (error) {
                            console.error("Error deleting education:", error);
                            showToast('Failed to delete education entry', 'error');
                        }
                    }
                });
            } else if (deleteBtn && !isOwnProfile) {
                // Hide actions if not own profile
                educationItem.querySelector('.item-actions').style.display = 'none';
            }
            
            // Add edit event listener
            const editBtn = educationItem.querySelector('.btn-edit-item');
            if (editBtn && isOwnProfile) {
                editBtn.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    try {
                        // Get the current education data
                        const userDoc = await window.db.collection("users").doc(currentUser.uid).get();
                        if (userDoc.exists) {
                            const userData = userDoc.data();
                            const educationToEdit = (userData.education || []).find(item => item.id === editBtn.dataset.id);
                            
                            if (educationToEdit) {
                                // Open the education modal
                                openModal('educationModal');
                                
                                // Populate form with existing data
                                document.getElementById('degree').value = educationToEdit.degree || '';
                                document.getElementById('school').value = educationToEdit.school || '';
                                document.getElementById('eduStartDate').value = educationToEdit.startDate || '';
                                document.getElementById('eduEndDate').value = educationToEdit.endDate || '';
                                document.getElementById('fieldOfStudy').value = educationToEdit.fieldOfStudy || '';
                                
                                // Add an attribute to the modal to indicate it's for editing
                                const modal = document.getElementById('educationModal');
                                modal.dataset.mode = 'edit';
                                modal.dataset.educationId = educationToEdit.id;
                                
                                // Update modal title
                                document.querySelector('#educationModal .modal-title').textContent = 'Edit Education';
                                
                                // Update save button text
                                document.querySelector('#educationModal .btn-save').textContent = 'Update Education';
                            }
                        }
                    } catch (error) {
                        console.error("Error editing education:", error);
                        showToast('Failed to load education data', 'error');
                    }
                });
            }
        });
    }
    
    // Modal handling functions
    function openModal(modalId) {
        console.log('Opening modal:', modalId);
        const modal = document.getElementById(modalId);
        if (!modal) {
            console.error('Modal not found:', modalId);
            return;
        }
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    function closeModal(modalId) {
        document.getElementById(modalId).classList.remove('active');
        document.body.style.overflow = '';
    }

    // Add event listeners for edit buttons
    document.querySelectorAll('.edit-section').forEach(button => {
        button.addEventListener('click', (e) => {
            console.log('Edit button clicked');
            const section = e.target.closest('.profile-section');
            if (section) {
                const sectionTitle = section.querySelector('h2').textContent.trim();
                console.log('Section title:', sectionTitle);
                if (sectionTitle === 'Education') {
                    console.log('Opening education modal');
                    openModal('educationModal');
                } else if (sectionTitle === 'Skills') {
                    console.log('Opening skills modal');
                    openModal('skillsModal');
                } else if (sectionTitle === 'About') {
                    console.log('Opening about modal');
                    openModal('aboutModal');
                } else if (sectionTitle === 'Experience') {
                    console.log('Opening experience modal');
                    openModal('experienceModal');
                }
            }
        });
    });

    // Add close handlers to all modals
    document.querySelectorAll('.modal-overlay').forEach(modal => {
        // Close on overlay click
        modal.addEventListener('click', function(e) {
            if (e.target === this) {
                closeModal(this.id);
            }
        });

        // Close on close button click
        modal.querySelector('.modal-close').addEventListener('click', function() {
            closeModal(this.closest('.modal-overlay').id);
        });

        // Close on cancel button click
        const cancelBtn = modal.querySelector('.btn-cancel');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', function() {
                closeModal(this.closest('.modal-overlay').id);
            });
        }

        // Save button click for all modals
        const saveBtn = modal.querySelector('.btn-save');
        if (saveBtn) {
            saveBtn.addEventListener('click', async function() {
                const modalId = this.closest('.modal-overlay').id;
                const isEditMode = modal.dataset.mode === 'edit';
                
                if (modalId === 'aboutModal') {
                    // Handle save about
                    const about = document.getElementById('about').value.trim();
                    
                    try {
                        await window.db.collection("users").doc(currentUser.uid).update({
                            about
                        });
                        
                        // Update UI immediately with more specific selector
                        const aboutSection = document.querySelector('.about-column .profile-section .section-content p');
                        if (aboutSection) {
                            if (about) {
                                aboutSection.textContent = about;
                                aboutSection.classList.remove('placeholder-text');
                            } else {
                                const placeholderText = "Tell recruiters about your professional background and skills.";
                                aboutSection.textContent = placeholderText;
                                aboutSection.classList.add('placeholder-text');
                            }
                        }
                        
                        closeModal(modalId);
                        showToast('About section updated successfully');
                    } catch (error) {
                        console.error("Error saving about:", error);
                        showToast('Failed to save about section', 'error');
                    }
                } else if (modalId === 'experienceModal') {
                    // Handle save/update experience
                    const jobTitle = document.getElementById('jobTitle').value.trim();
                    const company = document.getElementById('company').value.trim();
                    const location = document.getElementById('location').value.trim();
                    const startDate = document.getElementById('startDate').value;
                    const endDate = document.getElementById('endDate').value;
                    const description = document.getElementById('description').value.trim();
                    const skills = document.getElementById('skills').value.trim();
                    
                    if (!jobTitle || !company) {
                        alert("Job title and company are required.");
                        return;
                    }
                    
                    try {
                        // Get existing experiences
                        const userDoc = await window.db.collection("users").doc(currentUser.uid).get();
                        let experiences = [];
                        
                        if (userDoc.exists) {
                            const userData = userDoc.data();
                            experiences = userData.experiences || [];
                        }
                        
                        if (isEditMode) {
                            // Edit existing experience
                            const experienceId = modal.dataset.experienceId;
                            const index = experiences.findIndex(exp => exp.id === experienceId);
                            
                            if (index !== -1) {
                                // Update the experience
                                experiences[index] = {
                                    ...experiences[index],
                                    jobTitle,
                                    company,
                                    location,
                                    startDate,
                                    endDate,
                                    description,
                                    skills: skills.split(',').map(s => s.trim()).filter(s => s)
                                };
                            }
                        } else {
                            // Add new experience
                            const newExperience = {
                                id: Date.now().toString(),
                                jobTitle,
                                company,
                                location,
                                startDate,
                                endDate,
                                description,
                                skills: skills.split(',').map(s => s.trim()).filter(s => s)
                            };
                            
                            experiences.push(newExperience);
                        }
                        
                        // Save to Firestore
                        await window.db.collection("users").doc(currentUser.uid).update({
                            experiences
                        });
                        
                        // Update UI
                        updateExperienceUI(experiences);
                        closeModal(modalId);
                        
                        // Reset form and modal state
                        document.getElementById('jobTitle').value = '';
                        document.getElementById('company').value = '';
                        document.getElementById('location').value = '';
                        document.getElementById('startDate').value = '';
                        document.getElementById('endDate').value = '';
                        document.getElementById('description').value = '';
                        document.getElementById('skills').value = '';
                        
                        // Reset modal title and save button text
                        document.querySelector('#experienceModal .modal-title').textContent = 'Add Experience';
                        document.querySelector('#experienceModal .btn-save').textContent = 'Save Experience';
                        
                        // Reset mode
                        modal.dataset.mode = '';
                        modal.dataset.experienceId = '';
                        
                        // Show success message
                        showToast(isEditMode ? 'Experience updated successfully' : 'Experience added successfully');
                    } catch (error) {
                        console.error("Error saving experience:", error);
                        showToast('Failed to save experience', 'error');
                    }
                } else if (modalId === 'educationModal') {
                    // Handle save/update education
                    const degree = document.getElementById('degree').value.trim();
                    const school = document.getElementById('school').value.trim();
                    const startDate = document.getElementById('eduStartDate').value;
                    const endDate = document.getElementById('eduEndDate').value;
                    const fieldOfStudy = document.getElementById('fieldOfStudy').value.trim();
                    
                    if (!degree || !school) {
                        alert("Degree and school are required.");
                        return;
                    }
                    
                    try {
                        // Get existing education entries
                        const userDoc = await window.db.collection("users").doc(currentUser.uid).get();
                        let education = [];
                        
                        if (userDoc.exists) {
                            const userData = userDoc.data();
                            education = userData.education || [];
                        }
                        
                        if (isEditMode) {
                            // Edit existing education
                            const educationId = modal.dataset.educationId;
                            const index = education.findIndex(edu => edu.id === educationId);
                            
                            if (index !== -1) {
                                // Update the education
                                education[index] = {
                                    ...education[index],
                                    degree,
                                    school,
                                    startDate,
                                    endDate,
                                    fieldOfStudy
                                };
                            }
                        } else {
                            // Add new education
                            const newEducation = {
                                id: Date.now().toString(),
                                degree,
                                school,
                                startDate,
                                endDate,
                                fieldOfStudy
                            };
                            
                            education.push(newEducation);
                        }
                        
                        // Save to Firestore
                        await window.db.collection("users").doc(currentUser.uid).update({
                            education
                        });
                        
                        // Update UI
                        updateEducationUI(education);
                        closeModal(modalId);
                        
                        // Clear form
                        document.getElementById('degree').value = '';
                        document.getElementById('school').value = '';
                        document.getElementById('eduStartDate').value = '';
                        document.getElementById('eduEndDate').value = '';
                        document.getElementById('fieldOfStudy').value = '';
                        
                        // Reset modal title and save button text
                        document.querySelector('#educationModal .modal-title').textContent = 'Add Education';
                        document.querySelector('#educationModal .btn-save').textContent = 'Save Education';
                        
                        // Reset mode
                        modal.dataset.mode = '';
                        modal.dataset.educationId = '';
                        
                        // Show success message
                        showToast(isEditMode ? 'Education updated successfully' : 'Education added successfully');
                    } catch (error) {
                        console.error("Error saving education:", error);
                        showToast('Failed to save education', 'error');
                    }
                } else if (modalId === 'skillsModal') {
                    // Get all skills from previews
                    const skillCategories = {};
                    document.querySelectorAll('.skills-preview .skill-category').forEach(category => {
                        const categoryName = category.dataset.category;
                        const skills = [];
                        category.querySelectorAll('.skill-item').forEach(item => {
                            skills.push(item.dataset.skill);
                        });
                        
                        if (skills.length > 0) {
                            skillCategories[categoryName] = skills;
                        }
                    });
                    
                    try {
                        // Save to Firestore
                        await window.db.collection("users").doc(currentUser.uid).update({
                            skills: skillCategories
                        });
                        
                        // Update UI
                        updateSkillsDisplay();
                        closeModal(modalId);
                    } catch (error) {
                        console.error("Error saving skills:", error);
                        alert("Failed to save skills. Please try again.");
                    }
                }
            });
        }
    });

    // Skills management
    const skillsData = new Map(); // Store skills by category

    function addSkill(category, skill) {
        if (!skillsData.has(category)) {
            skillsData.set(category, new Set());
        }
        skillsData.get(category).add(skill);
        updateSkillsDisplay();
    }

    function removeSkill(category, skill) {
        if (skillsData.has(category)) {
            skillsData.get(category).delete(skill);
            if (skillsData.get(category).size === 0) {
                skillsData.delete(category);
            }
            updateSkillsDisplay();
        }
    }

    function updateSkillsDisplay() {
        const skillsList = document.querySelectorAll('.skills-grid');
        const skillsPreview = document.querySelector('.skills-preview');
        
        // Predefined categories
        const predefinedCategories = [
            "Programming Languages",
            "Web Technologies",
            "Frameworks & Libraries",
            "Databases",
            "Cloud Services",
            "DevOps Tools",
            "Mobile Development",
            "Design Tools",
            "Project Management",
            "Testing & QA",
            "Security",
            "AI & Machine Learning",
            "Soft Skills",
            "Languages",
            "Other"
        ];
        
        // Check if we have any skills to display
        const hasSkills = skillsData.size > 0;
        
        // Update all skills lists in the document
        skillsList.forEach(list => {
            // Clear current skills
            list.innerHTML = '';
            
            // If no skills, show empty state for the main skills list
            if (!hasSkills && list.id === 'skillsList') {
                list.innerHTML = `
                    <div class="empty-state">
                        <p class="placeholder-text">Your skills will appear here. Showcase your technical expertise, professional competencies, and other relevant abilities.</p>
                        <p class="placeholder-action">Click "Edit" to add your skills.</p>
                    </div>
                `;
                return;
            }
            
            // Add skills by category
            skillsData.forEach((skills, category) => {
                const categoryDiv = document.createElement('div');
                categoryDiv.className = 'skill-category';
                categoryDiv.innerHTML = `
                    <div class="skill-category-header">
                        <h3 class="skill-category-title">${category}</h3>
                    </div>
                    <div class="skill-tags">
                        ${Array.from(skills).map(skill => `
                            <span class="skill-item">
                                ${skill}
                            </span>
                        `).join('')}
                    </div>
                `;
                list.appendChild(categoryDiv);
            });
        });
        
        // Update skills preview in modal
        if (skillsPreview) {
            skillsPreview.innerHTML = '';
            
            if (!hasSkills) {
                skillsPreview.innerHTML = `<p class="placeholder-text">No skills added yet. Select a category and add skills above.</p>`;
                return;
            }
            
            skillsData.forEach((skills, category) => {
                const categoryDiv = document.createElement('div');
                categoryDiv.className = 'preview-category';
                categoryDiv.innerHTML = `<h4>${category}</h4>`;
                
                const skillsContainer = document.createElement('div');
                skillsContainer.className = 'preview-skills';
                
                skills.forEach(skill => {
                    const skillSpan = document.createElement('span');
                    skillSpan.className = 'skill-item';
                    skillSpan.innerHTML = `
                        ${skill}
                        <button class="btn-delete-skill" data-category="${category}" data-skill="${skill}">
                            <i class="fas fa-times"></i>
                        </button>
                    `;
                    
                    // Add delete event listener
                    const deleteBtn = skillSpan.querySelector('.btn-delete-skill');
                    deleteBtn.addEventListener('click', function() {
                        const category = this.dataset.category;
                        const skill = this.dataset.skill;
                        removeSkill(category, skill);
                    });
                    
                    skillsContainer.appendChild(skillSpan);
                });
                
                categoryDiv.appendChild(skillsContainer);
                skillsPreview.appendChild(categoryDiv);
            });
        }

        // Update category select options while preserving all categories
        const categorySelect = document.querySelector('.skill-category-select');
        if (categorySelect) {
            const currentValue = categorySelect.value;
            const customCategories = Array.from(skillsData.keys())
                .filter(cat => !predefinedCategories.includes(cat));
            
            categorySelect.innerHTML = `
                <option value="">Choose a category</option>
                ${predefinedCategories.map(cat => `
                    <option value="${cat}" ${currentValue === cat ? 'selected' : ''}>
                        ${cat}
                    </option>
                `).join('')}
                ${customCategories.map(cat => `
                    <option value="${cat}" ${currentValue === cat ? 'selected' : ''}>
                        ${cat}
                    </option>
                `).join('')}
                <option value="new" ${currentValue === 'new' ? 'selected' : ''}>+ Add Custom Category</option>
            `;
        }
    }

    // Handle category selection
    document.querySelector('.skill-category-select')?.addEventListener('change', function() {
        const newCategoryInput = document.querySelector('.new-category-input');
        const skillInputContainer = document.querySelector('.skill-input-container');
        
        if (this.value === 'new') {
            newCategoryInput.style.display = 'block';
            skillInputContainer.style.display = 'none';
        } else if (this.value) {
            newCategoryInput.style.display = 'none';
            skillInputContainer.style.display = 'block';
        } else {
            newCategoryInput.style.display = 'none';
            skillInputContainer.style.display = 'none';
        }
    });

    // Handle adding new skills
    document.querySelector('.btn-add-skill')?.addEventListener('click', function() {
        const categorySelect = document.querySelector('.skill-category-select');
        const newCategoryInput = document.querySelector('.new-category-input');
        const skillInput = document.querySelector('.skill-input');
        
        let category = categorySelect.value;
        if (category === 'new') {
            category = newCategoryInput.value.trim();
            if (!category) return;
            
            // Reset inputs
            newCategoryInput.style.display = 'none';
            categorySelect.style.display = 'block';
            newCategoryInput.value = '';
        }
        
        const skill = skillInput.value.trim();
        if (category && skill) {
            addSkill(category, skill);
            skillInput.value = '';
        }
    });

    // Update the new category input handler
    document.querySelector('.new-category-input')?.addEventListener('keyup', function(e) {
        const skillInputContainer = document.querySelector('.skill-input-container');
        if (this.value.trim()) {
            skillInputContainer.style.display = 'block';
        } else {
            skillInputContainer.style.display = 'none';
        }
    });

    // Initialize with some example skills if needed
    // addSkill('Programming Languages', 'JavaScript');
    // addSkill('Programming Languages', 'Python');
    // updateSkillsDisplay();

    // Initialize skills modal with user data
    const skillsModal = document.getElementById('skillsModal');
    if (skillsModal) {
        const categorySelect = skillsModal.querySelector('.skill-category-select');
        const newCategoryInput = skillsModal.querySelector('.new-category-input');
        const skillInput = skillsModal.querySelector('.skill-input');
        const addSkillBtn = skillsModal.querySelector('.btn-add-skill');
        const skillsPreview = skillsModal.querySelector('.skills-preview');
        const saveSkillsBtn = skillsModal.querySelector('.btn-save');
        
        // Find the Skills section edit button
        const skillsSections = document.querySelectorAll('.profile-section');
        let skillsEditButton;
        
        skillsSections.forEach(section => {
            const heading = section.querySelector('h2');
            if (heading && heading.textContent.trim() === 'Skills') {
                skillsEditButton = section.querySelector('.edit-section');
            }
        });
        
        // When the Skills section edit button is clicked, load skills data from Firestore
        skillsEditButton?.addEventListener('click', async function() {
            try {
                const user = window.auth.currentUser;
                if (user) {
                    const userDoc = await window.db.collection("users").doc(user.uid).get();
                    if (userDoc.exists() && userDoc.data().skills) {
                        // Initialize skills data from Firestore
                        skillsData.clear();
                        loadSkillsFromFirestore(userDoc.data().skills);
                    } else {
                        skillsData.clear();
                        updateSkillsDisplay();
                    }
                }
            } catch (error) {
                console.error("Error loading skills data:", error);
            }
        });
        
        // Save skills when save button is clicked
        saveSkillsBtn?.addEventListener('click', async function() {
            const user = window.auth.currentUser;
            
            if (!user) return;
            
            try {
                // Convert skills data to a format suitable for Firestore
                const skillsForFirestore = {};
                skillsData.forEach((skills, category) => {
                    skillsForFirestore[category] = Array.from(skills);
                });
                
                // Update the skills field in Firestore
                await window.db.collection("users").doc(user.uid).update({
                    skills: skillsForFirestore
                });
                
                console.log("Skills updated successfully");
            } catch (error) {
                console.error("Error updating skills:", error);
            }
            
            // Close the modal
            closeModal('skillsModal');
        });
        
        // Handle adding new skills
        addSkillBtn?.addEventListener('click', function() {
            let category = categorySelect.value;
            if (category === 'new') {
                category = newCategoryInput.value.trim();
                if (!category) return;
                
                // Reset inputs
                newCategoryInput.style.display = 'none';
                categorySelect.style.display = 'block';
                newCategoryInput.value = '';
            }
            
            const skill = skillInput.value.trim();
            if (category && skill) {
                addSkill(category, skill);
                skillInput.value = '';
            }
        });
        
        // Handle category selection
        categorySelect?.addEventListener('change', function() {
            if (this.value === 'new') {
                newCategoryInput.style.display = 'block';
                document.querySelector('.skill-input-container').style.display = 'none';
            } else if (this.value) {
                newCategoryInput.style.display = 'none';
                document.querySelector('.skill-input-container').style.display = 'block';
            } else {
                newCategoryInput.style.display = 'none';
                document.querySelector('.skill-input-container').style.display = 'none';
            }
        });
        
        // Update the new category input handler
        newCategoryInput?.addEventListener('keyup', function(e) {
            const skillInputContainer = document.querySelector('.skill-input-container');
            if (this.value.trim()) {
                skillInputContainer.style.display = 'block';
            } else {
                skillInputContainer.style.display = 'none';
            }
        });
    }
    
    // Load skills from Firestore into the skillsData map
    function loadSkillsFromFirestore(skillsFromFirestore) {
        skillsData.clear();
        
        // Convert Firestore skills object to Map data structure
        for (const category in skillsFromFirestore) {
            skillsData.set(category, new Set(skillsFromFirestore[category]));
        }
        
        // Update the UI with skills data
        updateSkillsDisplay();
    }

    // Avatar upload functionality
    function setupAvatarUpload(user) {
        const editAvatarBtn = document.querySelector('.edit-avatar');
        const profileAvatarImage = document.getElementById('profile-avatar-image');
        const profileAvatarInitials = document.getElementById('profile-avatar-initials');
        
        if (!editAvatarBtn) return;
        
        // Remove any existing input to prevent duplicates
        const existingInput = document.getElementById('avatar-upload-input');
        if (existingInput) {
            existingInput.remove();
        }
        
        // Create a hidden file input
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = 'image/*';
        fileInput.id = 'avatar-upload-input';
        fileInput.style.display = 'none';
        document.body.appendChild(fileInput);
        
        // Add click event to edit avatar button
        editAvatarBtn.addEventListener('click', () => {
            fileInput.click();
        });
        
        // Handle file selection
        fileInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            
            // Check file size (max 5MB)
            if (file.size > 5 * 1024 * 1024) {
                showToast('Image is too large. Maximum size is 5MB.', 'error');
                return;
            }
            
            // Check file type
            if (!file.type.startsWith('image/')) {
                showToast('Please select an image file.', 'error');
                return;
            }
            
            try {
            // Show loading state
            editAvatarBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
            editAvatarBtn.disabled = true;
            
                // Show upload in progress toast
                showToast('Uploading your profile picture...', 'info');
                
                // Upload the image to ImageBB
                const imageUrl = await uploadImageToImageBB(file);
                
                if (imageUrl) {
                    // Update user profile with new avatar URL
                    await window.db.collection("users").doc(user.uid).update({
                        photoURL: imageUrl
                    });
                    
                    // Update all UI elements
                    // Profile avatar
                    if (profileAvatarImage) {
                    profileAvatarImage.src = imageUrl;
                    profileAvatarImage.style.display = 'block';
                    }
                    if (profileAvatarInitials) {
                        profileAvatarInitials.style.display = 'none';
                    }
                    
                    // Navbar avatar
                    const avatarImage = document.getElementById('avatar-image');
                    if (avatarImage) {
                        avatarImage.src = imageUrl;
                        avatarImage.style.display = 'block';
                    }
                    
                    const avatarInitials = document.getElementById('avatar-initials');
                    if (avatarInitials) {
                        avatarInitials.style.display = 'none';
                    }
                    
                    // Dropdown avatar
                    const avatarImageDropdown = document.getElementById('avatar-image-dropdown');
                    if (avatarImageDropdown) {
                        avatarImageDropdown.src = imageUrl;
                        avatarImageDropdown.style.display = 'block';
                    }
                    
                    const avatarInitialsDropdown = document.getElementById('avatar-initials-dropdown');
                    if (avatarInitialsDropdown) {
                        avatarInitialsDropdown.style.display = 'none';
                    }
                    
                    // Show success message
                    showToast('Profile picture updated successfully', 'success');
                }
            } catch (error) {
                console.error("Error updating avatar:", error);
                showToast('Failed to update profile picture. Please try again.', 'error');
            } finally {
                // Reset button
                editAvatarBtn.innerHTML = '<i class="fas fa-camera"></i>';
                editAvatarBtn.disabled = false;
            }
        });
    }
    
    // Function to upload image to ImageBB
    async function uploadImageToImageBB(file) {
        const formData = new FormData();
        formData.append('image', file);
        
        // ImageBB API key - you might want to move this to a server-side function for security
        const apiKey = 'e0a6fcfe00b70b788c6cf56e59297e2f';
        
        try {
            console.log('Starting image upload to ImageBB...');
            
            const response = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
                method: 'POST',
                body: formData
            });
            
            if (!response.ok) {
                throw new Error(`ImageBB API error: ${response.status} - ${response.statusText}`);
            }
            
            const data = await response.json();
            console.log('ImageBB response:', data);
            
            if (data.success) {
                // Return the display URL for the image
                return data.data.display_url;
            } else {
                throw new Error('ImageBB upload failed: ' + (data.error?.message || 'Unknown error'));
            }
        } catch (error) {
            console.error('Error uploading to ImageBB:', error);
            throw error;
        }
    }

    // Load other user's profile
    async function loadOtherUserProfile(userId) {
        try {
            // Get other user's document from Firestore
            const userDoc = await window.db.collection("users").doc(userId).get();
            
            if (userDoc.exists) {
                const userData = userDoc.data();
                
                // Update UI with the other user's data
                updateProfileForOtherUser(userData, userId);
                
                // Get current authenticated user data to ensure dropdown shows correct info
                const currentUserDoc = await window.db.collection("users").doc(currentUser.uid).get();
                if (currentUserDoc.exists) {
                    const currentUserData = currentUserDoc.data();
                    
                    // Update only the dropdown menu with current user's data
                    updateDropdownMenuWithAuthenticatedUserData(currentUser, currentUserData);
                }
            } else {
                // User not found
                showProfileNotFoundMessage();
            }
        } catch (error) {
            console.error("Error loading other user's profile:", error);
            showProfileNotFoundMessage();
        }
    }
    
    // Function to update only the dropdown menu with authenticated user data
    function updateDropdownMenuWithAuthenticatedUserData(user, userData) {
        const userName = document.getElementById('user-name');
        const userEmail = document.getElementById('user-email');
        const avatarInitialsDropdown = document.getElementById('avatar-initials-dropdown');
        const avatarImageDropdown = document.getElementById('avatar-image-dropdown');
        
        // Get the display name (check all possible fields where it could be stored)
        const displayName = userData.name || userData.fullName || userData.displayName || user.displayName || user.email || 'Your Account';
        
        // Update dropdown user info
        if (userName) userName.textContent = displayName;
        if (userEmail) userEmail.textContent = user.email || 'No email provided';
        
        // Update avatar in dropdown
        const photoURL = userData.photoURL || user.photoURL;
        if (photoURL) {
            // User has a profile photo, show image
            if (avatarImageDropdown) {
                avatarImageDropdown.src = photoURL;
                avatarImageDropdown.style.display = 'block';
            }
            
            // Hide initials when showing image
            if (avatarInitialsDropdown) {
                avatarInitialsDropdown.style.display = 'none';
            }
        } else {
            // No profile photo, show initials instead
            if (avatarImageDropdown) avatarImageDropdown.style.display = 'none';
            
            const initials = displayName
                .split(' ')
                .map(name => name[0])
                .join('')
                .toUpperCase();
            
            if (avatarInitialsDropdown) {
                avatarInitialsDropdown.style.display = 'flex';
                avatarInitialsDropdown.textContent = initials || 'JN';
            }
        }
    }
    
    // Update profile UI for another user
    function updateProfileForOtherUser(userData, userId) {
        const profileName = document.querySelector('.profile-details h1');
        const headline = document.querySelector('.headline');
        const location = document.querySelector('.location');
        const profileAvatarInitials = document.getElementById('profile-avatar-initials');
        const profileAvatarImage = document.getElementById('profile-avatar-image');
        
        // Update profile name
        if (profileName) {
            profileName.textContent = userData.name || userData.fullName || userData.displayName || 'User';
        }
        
        // Update professional headline
        if (headline) {
            headline.textContent = userData.headline || 'Professional headline not set';
            if (!userData.headline) {
                headline.classList.add('placeholder-text');
            } else {
                headline.classList.remove('placeholder-text');
            }
        }
        
        // Update location
        if (location) {
            const locationIcon = location.querySelector('i');
            const locationText = document.createTextNode(userData.location || 'Location not specified');
            
            // Clear existing content except for the icon
            while (location.lastChild) {
                location.removeChild(location.lastChild);
            }
            
            location.appendChild(locationIcon);
            location.appendChild(locationText);
            
            if (!userData.location) {
                location.classList.add('placeholder-text');
            } else {
                location.classList.remove('placeholder-text');
            }
        }
        
        // Update avatar
        if (userData.photoURL) {
            // User has a profile photo, show image and hide initials
            if (profileAvatarImage) {
                profileAvatarImage.src = userData.photoURL;
                profileAvatarImage.style.display = 'block';
            }
            
            if (profileAvatarInitials) {
                profileAvatarInitials.style.display = 'none';
            }
        } else {
            // No profile photo, show initials instead
            if (profileAvatarImage) {
                profileAvatarImage.style.display = 'none';
            }
            
            if (profileAvatarInitials) {
                const displayName = userData.name || userData.fullName || userData.displayName || 'User';
                const initials = displayName
                    .split(' ')
                    .map(name => name[0])
                    .join('')
                    .toUpperCase();
                
                profileAvatarInitials.style.display = 'flex';
                profileAvatarInitials.textContent = initials || 'JN';
            }
        }
        
        // Update about section and other profile sections
        updateProfileWithUserData(userData);
    }
    
    // Show profile not found message
    function showProfileNotFoundMessage() {
        const profileContent = document.querySelector('.profile-grid');
        const profileHeader = document.querySelector('.profile-header');
        
        if (profileContent) {
            profileContent.innerHTML = `
                <div class="error-message">
                    <h2>Profile Not Found</h2>
                    <p>The user profile you're looking for doesn't exist or has been removed.</p>
                    <a href="../home/home.html" class="btn-primary">
                        <i class="fas fa-home"></i>
                        Return to Home
                    </a>
                </div>
            `;
        }
        
        if (profileHeader) {
            const profileDetails = profileHeader.querySelector('.profile-details');
            if (profileDetails) {
                profileDetails.querySelector('h1').textContent = 'User Not Found';
                profileDetails.querySelector('.headline').textContent = '';
                profileDetails.querySelector('.location').textContent = '';
                
                // Hide action buttons
                const actionButtons = profileDetails.querySelector('.profile-actions');
                if (actionButtons) {
                    actionButtons.style.display = 'none';
                }
            }
        }
    }
    
    // Set up follow button functionality
    async function setupFollowButton(profileId, currentUserId) {
        const followButton = document.getElementById('follow-button');
        const messageButton = document.getElementById('message-button');
        const blockButton = document.createElement('button');
        blockButton.id = 'block-button';
        blockButton.className = 'btn-block other-profile-btn';
        blockButton.innerHTML = '<i class="fas fa-ban"></i>';
        blockButton.title = 'Block User';
        
        // Add block button to action buttons
        const actionButtons = document.querySelector('.profile-actions');
        if (actionButtons) {
            actionButtons.appendChild(blockButton);
        }
        
        // Set up message button functionality
        if (messageButton) {
            messageButton.addEventListener('click', () => {
                // Set a flag in sessionStorage to indicate this is a direct navigation
                sessionStorage.setItem('directNavigation', 'true');
                
                // Navigate to the chats page with the user ID
                window.location.href = `../chats/chats.html?contact=${profileId}`;
            });
        }
        
        if (!followButton) return;
        
        try {
            // Check if already following, has a pending request, or is blocked
            const currentUserDoc = await window.db.collection("users").doc(currentUserId).get();
            
            if (currentUserDoc.exists) {
                const userData = currentUserDoc.data();
                const following = userData.following || [];
                const pendingFollowRequests = userData.pendingFollowRequests || [];
                const blockedUsers = userData.blockedUsers || [];
                
                if (blockedUsers.includes(profileId)) {
                    // This user is blocked
                    followButton.disabled = true;
                    followButton.classList.add('disabled');
                    followButton.title = "You've blocked this user";
                    
                    if (messageButton) {
                        messageButton.disabled = true;
                        messageButton.classList.add('disabled');
                    }
                    
                    blockButton.innerHTML = '<i class="fas fa-user-check"></i>';
                    blockButton.title = 'Unblock User';
                    blockButton.classList.add('unblock');
                } else if (following.includes(profileId)) {
                    // Already following this user
                    followButton.classList.add('following');
                } else if (pendingFollowRequests.includes(profileId)) {
                    // Request already sent
                    followButton.classList.add('pending');
                    // Keep the button enabled so users can cancel the request
                    followButton.title = "Click to cancel follow request";
                }
            }
            
            // Set up block/unblock functionality
            blockButton.addEventListener('click', async () => {
                try {
                    const isBlocked = blockButton.classList.contains('unblock');
                    
                    if (isBlocked) {
                        // Unblock user
                        await window.db.collection("users").doc(currentUserId).update({
                            blockedUsers: firebase.firestore.FieldValue.arrayRemove(profileId)
                        });
                        
                        // Update UI
                        blockButton.innerHTML = '<i class="fas fa-ban"></i>';
                        blockButton.classList.remove('unblock');
                        
                        // Enable follow and message buttons
                        followButton.disabled = false;
                        followButton.classList.remove('disabled');
                        followButton.title = "";
                        
                        if (messageButton) {
                            messageButton.disabled = false;
                            messageButton.classList.remove('disabled');
                        }
                        
                        alert("User has been unblocked.");
                    } else {
                        // Block user - show confirmation dialog
                        if (confirm("Are you sure you want to block this user? They won't be able to see your profile or send you messages.")) {
                            // Remove from following/followers if needed
                            const currentUserDoc = await window.db.collection("users").doc(currentUserId).get();
                            if (currentUserDoc.exists) {
                                const userData = currentUserDoc.data();
                                const following = userData.following || [];
                                
                                // If we're following them, unfollow
                                if (following.includes(profileId)) {
                                    await window.db.collection("users").doc(currentUserId).update({
                                        following: firebase.firestore.FieldValue.arrayRemove(profileId)
                                    });
                                    
                                    // Update their followers list
                                    await window.db.collection("users").doc(profileId).update({
                                        followers: firebase.firestore.FieldValue.arrayRemove(currentUserId)
                                    });
                                }
                                
                                // If they have a pending follow request to us, remove it
                                const profileUserDoc = await window.db.collection("users").doc(profileId).get();
                                if (profileUserDoc.exists) {
                                    const profileData = profileUserDoc.data();
                                    if (profileData.pendingFollowRequests && profileData.pendingFollowRequests.includes(currentUserId)) {
                                        await window.db.collection("users").doc(profileId).update({
                                            pendingFollowRequests: firebase.firestore.FieldValue.arrayRemove(currentUserId)
                                        });
                                    }
                                }
                            }
                            
                            // Block the user
                            await window.db.collection("users").doc(currentUserId).update({
                                blockedUsers: firebase.firestore.FieldValue.arrayUnion(profileId)
                            });
                            
                            // Update UI
                            blockButton.innerHTML = '<i class="fas fa-user-check"></i>';
                            blockButton.classList.add('unblock');
                            
                            // Disable follow and message buttons
                            followButton.disabled = true;
                            followButton.classList.add('disabled');
                            followButton.classList.remove('following');
                            followButton.classList.remove('pending');
                            followButton.title = "You've blocked this user";
                            
                            if (messageButton) {
                                messageButton.disabled = true;
                                messageButton.classList.add('disabled');
                            }
                            
                            alert("User has been blocked.");
                        }
                    }
                } catch (error) {
                    console.error("Error updating block status:", error);
                    alert("There was an error updating block status. Please try again.");
                }
            });
            
            // Add follow/unfollow functionality
            followButton.addEventListener('click', async () => {
                try {
                    const isFollowing = followButton.classList.contains('following');
                    const isPending = followButton.classList.contains('pending');
                    
                    if (isFollowing) {
                        // Unfollow user
                        await window.db.collection("users").doc(currentUserId).update({
                            following: firebase.firestore.FieldValue.arrayRemove(profileId)
                        });
                        
                        // Update the user's followers list
                        await window.db.collection("users").doc(profileId).update({
                            followers: firebase.firestore.FieldValue.arrayRemove(currentUserId)
                        });
                        
                        followButton.classList.remove('following');
                    } else if (isPending) {
                        // Cancel the follow request
                        await window.db.collection("users").doc(profileId).update({
                            pendingFollowRequests: firebase.firestore.FieldValue.arrayRemove(currentUserId)
                        });
                        
                        // Remove any pending notifications for this follow request
                        const notificationsSnapshot = await window.db.collection("users")
                            .doc(profileId)
                            .collection("notifications")
                            .where("type", "==", "follow_request")
                            .where("senderId", "==", currentUserId)
                            .get();
                            
                        // Delete each matching notification
                        notificationsSnapshot.forEach(async (doc) => {
                            await window.db.collection("users")
                                .doc(profileId)
                                .collection("notifications")
                                .doc(doc.id)
                                .delete();
                        });
                        
                        // Reset button state
                        followButton.classList.remove('pending');
                        followButton.title = "";
                        
                    } else {
                        // Send follow request - store the pending request in the RECIPIENT'S profile, not the sender's
                        await window.db.collection("users").doc(profileId).update({
                            pendingFollowRequests: firebase.firestore.FieldValue.arrayUnion(currentUserId)
                        });
                        
                        // Update button state
                        followButton.classList.add('pending');
                        followButton.title = "Click to cancel follow request";
                        
                        // Send a follow request notification
                        await sendFollowRequestNotification(profileId, currentUserId);
                    }
                } catch (error) {
                    console.error("Error updating follow status:", error);
                    alert("There was an error updating your follow status. Please try again.");
                }
            });
        } catch (error) {
            console.error("Error setting up follow button:", error);
        }
    }
    
    // Send a follow request notification
    async function sendFollowRequestNotification(recipientId, senderId) {
        try {
            console.log("Starting notification creation process");
            console.log("Recipient ID:", recipientId);
            console.log("Sender ID:", senderId);
            
            // Get sender's information
            const senderDoc = await window.db.collection("users").doc(senderId).get();
            if (!senderDoc.exists) {
                console.error("Sender document doesn't exist");
                return;
            }
            
            const senderData = senderDoc.data();
            const senderName = senderData.name || senderData.fullName || senderData.displayName || 'A user';
            console.log("Sender name:", senderName);
            
            // Create notification with accept/reject actions
            const notification = {
                type: 'follow_request',
                senderId: senderId,
                senderName: senderName,
                senderPhoto: senderData.photoURL || null,
                title: 'New Follow Request',
                text: `${senderName} wants to follow you`,
                actions: ['accept', 'reject'],
                read: false,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            };
            
            console.log("Notification object created:", notification);
            console.log("Attempting to write to:", `users/${recipientId}/notifications`);
            
            // Add notification to collection - use set with generated ID to ensure it works
            const notificationsRef = window.db.collection("users").doc(recipientId).collection("notifications");
            const newNotificationRef = notificationsRef.doc();
            await newNotificationRef.set(notification);
            
            console.log("Follow request notification created with ID:", newNotificationRef.id);
            
            // Double check that it exists
            setTimeout(async () => {
                try {
                    const check = await newNotificationRef.get();
                    if (check.exists) {
                        console.log("Verified notification exists:", check.data());
                    } else {
                        console.error("Notification was not saved correctly!");
                    }
        } catch (error) {
                    console.error("Error checking notification:", error);
                }
            }, 1000);
            
            alert("Follow request sent successfully!");
        } catch (error) {
            console.error("Error sending follow request notification:", error);
            alert("Error sending follow request. Please try again.");
        }
    }
});

// Rest of your profile specific JavaScript
