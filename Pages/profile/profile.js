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
    updateDoc
} from '../../Firebase/firebase-config.js';
import { 
    onAuthStateChanged,
    signOut
} from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js';

document.addEventListener('DOMContentLoaded', () => {
    // Theme Toggle Functionality
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

    // Retry loading user data every few seconds to ensure settings changes are reflected
    let retryCount = 0;
    const maxRetries = 3;
    
    function refreshUserData(user, initialUserData) {
        if (retryCount >= maxRetries) return;
        
        setTimeout(async () => {
            try {
                // Get latest user document from Firestore
                const latestUserDoc = await getDoc(doc(db, "users", user.uid));
                if (latestUserDoc.exists()) {
                    const latestUserData = latestUserDoc.data();
                    
                    // Check if data has changed
                    const initialName = initialUserData.name || initialUserData.displayName;
                    const latestName = latestUserData.name || latestUserData.displayName;
                    
                    if (initialName !== latestName || !initialName) {
                        console.log("User data updated, refreshing UI");
                        updateUIForAuthenticatedUser(user, latestUserData);
                    }
                }
                
                retryCount++;
                refreshUserData(user, initialUserData);
            } catch (error) {
                console.error("Error refreshing user data:", error);
                retryCount++;
                refreshUserData(user, initialUserData);
            }
        }, 3000); // Check every 3 seconds
    }

    // Handle Firebase authentication state
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            // User is signed in
            try {
                // Get user document from Firestore
                const userDoc = await getDoc(doc(db, "users", user.uid));
                let userData = {};
                
                if (userDoc.exists()) {
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
                        await setDoc(doc(db, "users", user.uid), {
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
        const location = document.querySelector('.location');
        const menuSections = document.querySelector('.menu-sections');
        
        // Get the display name (check all possible fields where it could be stored)
        // Settings page might store it as name, fullName, or displayName
        const displayName = userData.name || userData.fullName || userData.displayName || user.displayName || 'Your Name';
        
        console.log('User data from Firestore:', userData); // Debugging
        console.log('Display name being used:', displayName); // Debugging
        
        // Update dropdown user info
        if (userName) userName.textContent = displayName;
        if (userEmail) userEmail.textContent = user.email || 'No email provided';
        
        // Update menu sections with correct links for authenticated users
        if (menuSections) {
            menuSections.innerHTML = `
                <a href="../saved/saved.html">
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
                <a href="profile.html">
                    <i class="fas fa-user"></i>
                    My Profile
                </a>
                <a href="Resume.html">
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
                    signOut(auth).then(() => {
                        window.location.href = '../login/login.html';
                    }).catch((error) => {
                        console.error('Error signing out:', error);
                    });
                });
            }
        }
        
        // Update avatar initials and images
        const photoURL = userData.photoURL || user.photoURL;
        if (photoURL) {
            // User has a profile photo, show images and hide initials
            if (avatarImage) {
                avatarImage.src = photoURL;
                avatarImage.style.display = 'block';
            }
            
            if (avatarImageDropdown) {
                avatarImageDropdown.src = photoURL;
                avatarImageDropdown.style.display = 'block';
            }
            
            if (profileAvatarImage) {
                profileAvatarImage.src = photoURL;
                profileAvatarImage.style.display = 'block';
            }
            
            // Hide initials when showing images
            if (avatarInitials.length) {
                avatarInitials.forEach(el => {
                    el.style.display = 'none';
                });
            }
        } else {
            // No profile photo, show initials instead
            if (avatarImage) avatarImage.style.display = 'none';
            if (avatarImageDropdown) avatarImageDropdown.style.display = 'none';
            if (profileAvatarImage) profileAvatarImage.style.display = 'none';
            
            const initials = displayName
                .split(' ')
                .map(name => name[0])
                .join('')
                .toUpperCase();
            
            // Show all initial elements with the user's initials
            if (avatarInitials.length) {
                avatarInitials.forEach(el => {
                    el.style.display = 'flex';
                    el.textContent = initials || 'JN';
                });
            }
        }
        
        // Update profile name if on profile page
        if (profileName) {
            profileName.textContent = displayName;
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
        
        // Update about section
        updateProfileWithUserData(userData);
    };
    
    // Update profile with additional user data from Firestore
    const updateProfileWithUserData = (userData) => {
        // Update about section
        const aboutSection = document.querySelector('.profile-section .section-content p');
        if (aboutSection) {
            const placeholderText = "Tell recruiters about your professional background and skills.";
            
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
                experienceContainer.innerHTML = `
                    <div class="empty-state">
                        <p class="placeholder-text">Your professional experience will appear here. Showcase your career journey by adding your past and current positions.</p>
                        <p class="placeholder-action">Click "Add Experience" to highlight your professional achievements.</p>
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
                educationContainer.innerHTML = `
                    <div class="empty-state">
                        <p class="placeholder-text">Your educational background will appear here. Showcase your degrees, certifications, and academic achievements.</p>
                        <p class="placeholder-action">Click "Add Education" to highlight your educational qualifications.</p>
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
                skillsContainer.innerHTML = `
                    <div class="empty-state">
                        <p class="placeholder-text">Your skills will appear here. Showcase your technical expertise, professional competencies, and other relevant abilities.</p>
                        <p class="placeholder-action">Click "Edit" to add your skills.</p>
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
    
    // Modal handling functions
    function openModal(modalId) {
        document.getElementById(modalId).classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    function closeModal(modalId) {
        document.getElementById(modalId).classList.remove('active');
        document.body.style.overflow = '';
    }

    // Add click handlers to all edit buttons
    document.querySelectorAll('.edit-section').forEach(button => {
        button.addEventListener('click', function() {
            const section = this.closest('.profile-section');
            const sectionTitle = section.querySelector('h2').textContent.toLowerCase();
            const modalId = section.classList.contains('stats-section') ? 'statsModal' : sectionTitle + 'Modal';
            
            // Open the corresponding modal
            openModal(modalId);
            
            // Additional initialization happens in specific modal handlers
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
        modal.querySelector('.btn-cancel').addEventListener('click', function() {
            closeModal(this.closest('.modal-overlay').id);
        });
    });

    // Initialize About modal with user data
    const aboutModal = document.getElementById('aboutModal');
    if (aboutModal) {
        const aboutTextarea = aboutModal.querySelector('#about');
        const aboutSaveBtn = aboutModal.querySelector('.btn-save');
        
        // Find the About section edit button
        const aboutSections = document.querySelectorAll('.profile-section');
        let aboutEditButton;
        
        aboutSections.forEach(section => {
            const heading = section.querySelector('h2');
            if (heading && heading.textContent.trim() === 'About') {
                aboutEditButton = section.querySelector('.edit-section');
            }
        });
        
        // When the About section edit button is clicked, load current about text
        aboutEditButton?.addEventListener('click', async function() {
            try {
                const user = auth.currentUser;
                if (user) {
                    const userDoc = await getDoc(doc(db, "users", user.uid));
                    if (userDoc.exists() && userDoc.data().about) {
                        aboutTextarea.value = userDoc.data().about;
                    } else {
                        aboutTextarea.value = '';
                    }
                }
            } catch (error) {
                console.error("Error loading about data:", error);
            }
        });
        
        // Update About section when save button is clicked
        aboutSaveBtn?.addEventListener('click', async function() {
            const aboutText = aboutTextarea.value.trim();
            const user = auth.currentUser;
            
            if (user) {
                try {
                    // Update the about field in Firestore
                    await updateDoc(doc(db, "users", user.uid), {
                        about: aboutText
                    });
                    
                    // Update the UI
                    const aboutSection = document.querySelector('.profile-section .section-content p');
                    const placeholderText = "Tell recruiters about your professional background and skills.";
                    
                    if (aboutSection) {
                        if (aboutText) {
                            aboutSection.textContent = aboutText;
                            aboutSection.classList.remove('placeholder-text');
                        } else {
                            aboutSection.textContent = placeholderText;
                            aboutSection.classList.add('placeholder-text');
                        }
                    }
                    
                    console.log("About section updated successfully");
                } catch (error) {
                    console.error("Error updating about section:", error);
                }
            }
            
            // Close the modal
            closeModal('aboutModal');
        });
    }

    // Initialize Experience modal with user data
    const experienceModal = document.getElementById('experienceModal');
    if (experienceModal) {
        const jobTitleInput = experienceModal.querySelector('#jobTitle');
        const companyInput = experienceModal.querySelector('#company');
        const locationInput = experienceModal.querySelector('#location');
        const startDateInput = experienceModal.querySelector('#startDate');
        const endDateInput = experienceModal.querySelector('#endDate');
        const descriptionInput = experienceModal.querySelector('#description');
        const skillsInput = experienceModal.querySelector('#skills');
        const experienceSaveBtn = experienceModal.querySelector('.btn-save');
        
        // Add focus/blur events to better highlight the date format
        startDateInput.addEventListener('focus', function() {
            this.setAttribute('title', 'Select month and year (e.g., January 2023)');
        });
        
        endDateInput.addEventListener('focus', function() {
            this.setAttribute('title', 'Select month and year (e.g., January 2023) or leave empty for current position');
        });
        
        // Find the Experience section edit button
        const experienceSections = document.querySelectorAll('.profile-section');
        let experienceAddButton;
        
        experienceSections.forEach(section => {
            const heading = section.querySelector('h2');
            if (heading && heading.textContent.trim() === 'Experience') {
                experienceAddButton = section.querySelector('.edit-section');
            }
        });
        
        // Reset form when Add Experience button is clicked
        experienceAddButton?.addEventListener('click', () => {
            // Clear form fields
            jobTitleInput.value = '';
            companyInput.value = '';
            locationInput.value = '';
            startDateInput.value = '';
            endDateInput.value = '';
            descriptionInput.value = '';
            skillsInput.value = '';
        });
        
        // Save new experience when save button is clicked
        experienceSaveBtn?.addEventListener('click', async function() {
            const user = auth.currentUser;
            
            if (!user) return;
            
            const newExperience = {
                jobTitle: jobTitleInput.value.trim(),
                company: companyInput.value.trim(),
                location: locationInput.value.trim(),
                startDate: startDateInput.value,
                endDate: endDateInput.value,
                description: descriptionInput.value.trim(),
                skills: skillsInput.value.split(',').map(skill => skill.trim()).filter(skill => skill !== '')
            };
            
            // Validate required fields
            if (!newExperience.jobTitle || !newExperience.company || !newExperience.startDate) {
                alert('Please fill in the required fields: Job Title, Company, and Start Date');
                return;
            }
            
            try {
                // Get current user data
                const userDoc = await getDoc(doc(db, "users", user.uid));
                
                if (userDoc.exists()) {
                    const userData = userDoc.data();
                    
                    // Get existing experiences or create empty array
                    const experiences = userData.experiences || [];
                    
                    // Add the new experience
                    experiences.push({
                        ...newExperience,
                        id: Date.now().toString(), // Create a unique ID
                        createdAt: new Date()
                    });
                    
                    // Update user document with new experiences array
                    await updateDoc(doc(db, "users", user.uid), {
                        experiences: experiences
                    });
                    
                    // Update UI with new experience
                    updateExperienceUI(experiences);
                    
                    console.log("Experience added successfully");
                } else {
                    console.error("User document not found");
                }
            } catch (error) {
                console.error("Error adding experience:", error);
            }
            
            // Close the modal
            closeModal('experienceModal');
        });
    }

    // Initialize Education modal with user data
    const educationModal = document.getElementById('educationModal');
    if (educationModal) {
        const degreeInput = educationModal.querySelector('#degree');
        const schoolInput = educationModal.querySelector('#school');
        const eduStartDateInput = educationModal.querySelector('#eduStartDate');
        const eduEndDateInput = educationModal.querySelector('#eduEndDate');
        const fieldOfStudyInput = educationModal.querySelector('#fieldOfStudy');
        const educationSaveBtn = educationModal.querySelector('.btn-save');
        
        // Add focus/blur events to better highlight the date format
        eduStartDateInput.addEventListener('focus', function() {
            this.setAttribute('title', 'Select month and year when you started (e.g., September 2018)');
        });
        
        eduEndDateInput.addEventListener('focus', function() {
            this.setAttribute('title', 'Select month and year when you finished (e.g., June 2022) or leave empty if still studying');
        });
        
        // Find the Education section edit button
        const educationSections = document.querySelectorAll('.profile-section');
        let educationAddButton;
        
        educationSections.forEach(section => {
            const heading = section.querySelector('h2');
            if (heading && heading.textContent.trim() === 'Education') {
                educationAddButton = section.querySelector('.edit-section');
            }
        });
        
        // Reset form when Add Education button is clicked
        educationAddButton?.addEventListener('click', () => {
            // Clear form fields
            degreeInput.value = '';
            schoolInput.value = '';
            eduStartDateInput.value = '';
            eduEndDateInput.value = '';
            fieldOfStudyInput.value = '';
            
            // Reset file upload if it exists
            const fileUpload = educationModal.querySelector('.file-upload');
            if (fileUpload) {
                const text = fileUpload.querySelector('.file-upload-text');
                if (text) text.textContent = 'Drag and drop your diploma here';
            }
        });
        
        // Save new education when save button is clicked
        educationSaveBtn?.addEventListener('click', async function() {
            const user = auth.currentUser;
            
            if (!user) return;
            
            const newEducation = {
                degree: degreeInput.value.trim(),
                school: schoolInput.value.trim(),
                startDate: eduStartDateInput.value,
                endDate: eduEndDateInput.value,
                fieldOfStudy: fieldOfStudyInput.value.trim()
            };
            
            // Validate required fields
            if (!newEducation.degree || !newEducation.school) {
                alert('Please fill in the required fields: Degree and School');
                return;
            }
            
            try {
                // Get current user data
                const userDoc = await getDoc(doc(db, "users", user.uid));
                
                if (userDoc.exists()) {
                    const userData = userDoc.data();
                    
                    // Get existing education or create empty array
                    const education = userData.education || [];
                    
                    // Add the new education
                    education.push({
                        ...newEducation,
                        id: Date.now().toString(), // Create a unique ID
                        createdAt: new Date()
                    });
                    
                    // Update user document with new education array
                    await updateDoc(doc(db, "users", user.uid), {
                        education: education
                    });
                    
                    // Update UI with new education
                    updateEducationUI(education);
                    
                    console.log("Education added successfully");
                } else {
                    console.error("User document not found");
                }
            } catch (error) {
                console.error("Error adding education:", error);
            }
            
            // Close the modal
            closeModal('educationModal');
        });
    }

    // Function to update Experience UI
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
        
        // Clear current experiences
        experienceContainer.innerHTML = '';
        
        // If no experiences, show empty state
        if (!experiences || experiences.length === 0) {
            experienceContainer.innerHTML = `
                <div class="empty-state">
                    <p class="placeholder-text">Your professional experience will appear here. Showcase your career journey by adding your past and current positions.</p>
                    <p class="placeholder-action">Click "Add Experience" to highlight your professional achievements.</p>
                </div>
            `;
            return;
        }
        
        // Add experiences in reverse chronological order (newest first)
        experiences
            .sort((a, b) => new Date(b.startDate) - new Date(a.startDate))
            .forEach(exp => {
                // Format dates for display
                const startDate = exp.startDate ? new Date(exp.startDate + '-01').toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : '';
                const endDate = exp.endDate ? new Date(exp.endDate + '-01').toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : 'Present';
                const duration = startDate && (endDate || 'Present') ? `${startDate} - ${endDate}` : '';
                
                // Create experience item
                const expItem = document.createElement('div');
                expItem.className = 'experience-item';
                expItem.innerHTML = `
                    <div class="company-logo">
                        <i class="fas fa-building"></i>
                    </div>
                    <div class="experience-details">
                        <div class="experience-header">
                            <h3>${exp.jobTitle}</h3>
                            <button class="btn-delete-item" data-id="${exp.id}" aria-label="Delete experience">
                                <i class="fas fa-trash-alt"></i>
                            </button>
                        </div>
                        <p class="company">${exp.company}</p>
                        <p class="duration">${duration}</p>
                        <p class="location">${exp.location || ''}</p>
                        ${exp.description ? `<ul class="responsibilities">
                            ${exp.description.split('\n').map(item => `<li>${item}</li>`).join('')}
                        </ul>` : ''}
                        ${exp.skills && exp.skills.length > 0 ? `
                            <div class="tech-stack">
                                ${exp.skills.map(skill => `<span class="tech-tag">${skill}</span>`).join('')}
                            </div>
                        ` : ''}
                    </div>
                `;
                
                experienceContainer.appendChild(expItem);
                
                // Add delete event listener
                const deleteBtn = expItem.querySelector('.btn-delete-item');
                deleteBtn?.addEventListener('click', async function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    
                    const experienceId = this.dataset.id;
                    if (!experienceId) return;
                    
                    if (confirm('Are you sure you want to delete this experience?')) {
                        const user = auth.currentUser;
                        if (!user) return;
                        
                        try {
                            // Get current user data
                            const userDoc = await getDoc(doc(db, "users", user.uid));
                            
                            if (userDoc.exists()) {
                                const userData = userDoc.data();
                                const experiences = userData.experiences || [];
                                
                                // Filter out the deleted experience
                                const updatedExperiences = experiences.filter(exp => exp.id !== experienceId);
                                
                                // Update user document
                                await updateDoc(doc(db, "users", user.uid), {
                                    experiences: updatedExperiences
                                });
                                
                                // Update UI
                                updateExperienceUI(updatedExperiences);
                                
                                console.log("Experience deleted successfully");
                            }
                        } catch (error) {
                            console.error("Error deleting experience:", error);
                        }
                    }
                });
            });
    }

    // Function to update Education UI
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
        
        // Clear current education
        educationContainer.innerHTML = '';
        
        // If no education, show empty state
        if (!education || education.length === 0) {
            educationContainer.innerHTML = `
                <div class="empty-state">
                    <p class="placeholder-text">Your educational background will appear here. Showcase your degrees, certifications, and academic achievements.</p>
                    <p class="placeholder-action">Click "Add Education" to highlight your educational qualifications.</p>
                </div>
            `;
            return;
        }
        
        // Add education in reverse chronological order (newest first)
        education
            .sort((a, b) => {
                // Sort by end date first (most recent first)
                if (a.endDate && b.endDate) {
                    return new Date(b.endDate) - new Date(a.endDate);
                }
                // If end dates aren't available, sort by start date
                return new Date(b.startDate || 0) - new Date(a.startDate || 0);
            })
            .forEach(edu => {
                // Format dates for display
                let duration = '';
                if (edu.startDate && edu.endDate) {
                    const startYear = new Date(edu.startDate + '-01').getFullYear();
                    const endYear = new Date(edu.endDate + '-01').getFullYear();
                    duration = `${startYear} - ${endYear}`;
                } else if (edu.startDate) {
                    const startYear = new Date(edu.startDate + '-01').getFullYear();
                    duration = `${startYear} - Present`;
                }
                
                // Create education item
                const eduItem = document.createElement('div');
                eduItem.className = 'education-item';
                eduItem.innerHTML = `
                    <div class="school-logo">
                        <i class="fas fa-university"></i>
                    </div>
                    <div class="education-details">
                        <div class="education-header">
                            <h3>${edu.degree}</h3>
                            <button class="btn-delete-item" data-id="${edu.id}" aria-label="Delete education">
                                <i class="fas fa-trash-alt"></i>
                            </button>
                        </div>
                        <p class="school">${edu.school}</p>
                        <p class="duration">${duration}</p>
                        ${edu.fieldOfStudy ? `<p class="description">Specialized in ${edu.fieldOfStudy}</p>` : ''}
                    </div>
                `;
                
                educationContainer.appendChild(eduItem);
                
                // Add delete event listener
                const deleteBtn = eduItem.querySelector('.btn-delete-item');
                deleteBtn?.addEventListener('click', async function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    
                    const educationId = this.dataset.id;
                    if (!educationId) return;
                    
                    if (confirm('Are you sure you want to delete this education entry?')) {
                        const user = auth.currentUser;
                        if (!user) return;
                        
                        try {
                            // Get current user data
                            const userDoc = await getDoc(doc(db, "users", user.uid));
                            
                            if (userDoc.exists()) {
                                const userData = userDoc.data();
                                const education = userData.education || [];
                                
                                // Filter out the deleted education
                                const updatedEducation = education.filter(edu => edu.id !== educationId);
                                
                                // Update user document
                                await updateDoc(doc(db, "users", user.uid), {
                                    education: updatedEducation
                                });
                                
                                // Update UI
                                updateEducationUI(updatedEducation);
                                
                                console.log("Education deleted successfully");
                            }
                        } catch (error) {
                            console.error("Error deleting education:", error);
                        }
                    }
                });
            });
    }

    // File upload functionality
    const fileUpload = document.getElementById('diplomaUpload');
    if (fileUpload) {
        const fileInput = fileUpload.querySelector('input[type="file"]');

        // Handle drag and drop
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            fileUpload.addEventListener(eventName, preventDefaults, false);
        });

        function preventDefaults(e) {
            e.preventDefault();
            e.stopPropagation();
        }

        ['dragenter', 'dragover'].forEach(eventName => {
            fileUpload.addEventListener(eventName, highlight, false);
        });

        ['dragleave', 'drop'].forEach(eventName => {
            fileUpload.addEventListener(eventName, unhighlight, false);
        });

        function highlight(e) {
            fileUpload.classList.add('dragover');
        }

        function unhighlight(e) {
            fileUpload.classList.remove('dragover');
        }

        fileUpload.addEventListener('drop', handleDrop, false);
        fileUpload.addEventListener('click', () => fileInput.click());

        function handleDrop(e) {
            const dt = e.dataTransfer;
            const files = dt.files;
            handleFiles(files);
        }

        fileInput.addEventListener('change', function(e) {
            handleFiles(this.files);
        });

        function handleFiles(files) {
            const file = files[0];
            if (file) {
                // Here you would typically upload the file to your server
                // For now, we'll just update the text to show the file name
                const text = fileUpload.querySelector('.file-upload-text');
                text.textContent = `Selected: ${file.name}`;
            }
        }
    }

    // Save handlers (you'll need to implement the actual save functionality)
    document.querySelectorAll('.btn-save').forEach(button => {
        button.addEventListener('click', function() {
            const modal = this.closest('.modal-overlay');
            // Here you would typically save the data
            // For now, we'll just close the modal
            closeModal(modal.id);
        });
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
                const user = auth.currentUser;
                if (user) {
                    const userDoc = await getDoc(doc(db, "users", user.uid));
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
            const user = auth.currentUser;
            
            if (!user) return;
            
            try {
                // Convert skills data to a format suitable for Firestore
                const skillsForFirestore = {};
                skillsData.forEach((skills, category) => {
                    skillsForFirestore[category] = Array.from(skills);
                });
                
                // Update the skills field in Firestore
                await updateDoc(doc(db, "users", user.uid), {
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
        if (!editAvatarBtn) return;
        
        // Create a hidden file input
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = 'image/*';
        fileInput.style.display = 'none';
        document.body.appendChild(fileInput);
        
        // When edit avatar button is clicked, trigger file selection
        editAvatarBtn.addEventListener('click', () => {
            fileInput.click();
        });
        
        // When a file is selected, upload it
        fileInput.addEventListener('change', async (e) => {
            if (!e.target.files || !e.target.files[0]) return;
            
            const file = e.target.files[0];
            
            // Validate file type and size
            if (!file.type.match('image.*')) {
                alert('Please select an image file');
                return;
            }
            
            if (file.size > 2 * 1024 * 1024) { // 2MB
                alert('Image size should be less than 2MB');
                return;
            }
            
            // Show loading state
            editAvatarBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
            editAvatarBtn.disabled = true;
            
            try {
                // Upload to ImageBB
                const imageUrl = await uploadImageToImageBB(file);
                
                if (imageUrl) {
                    // Save URL to Firestore
                    await updateDoc(doc(db, "users", user.uid), {
                        photoURL: imageUrl
                    });
                    
                    // Update UI with new image
                    const avatarImages = document.querySelectorAll('.avatar-image');
                    avatarImages.forEach(img => {
                        img.src = imageUrl;
                        img.style.display = 'block';
                    });
                    
                    const avatarInitials = document.querySelectorAll('.avatar-initials');
                    avatarInitials.forEach(el => {
                        el.style.display = 'none';
                    });
                    
                    console.log('Avatar updated successfully');
                }
            } catch (error) {
                console.error('Error uploading avatar:', error);
                alert('Failed to upload image. Please try again.');
            } finally {
                // Reset button state
                editAvatarBtn.innerHTML = '<i class="fas fa-camera"></i>';
                editAvatarBtn.disabled = false;
            }
        });
    }
    
    // Function to upload image to ImageBB
    async function uploadImageToImageBB(file) {
        const formData = new FormData();
        formData.append('image', file);
        
        // ImageBB API key
        const apiKey = 'e0a6fcfe00b70b788c6cf56e59297e2f';
        
        try {
            const response = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
                method: 'POST',
                body: formData
            });
            
            if (!response.ok) {
                throw new Error(`ImageBB API error: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.success) {
                return data.data.url;
            } else {
                throw new Error('ImageBB upload failed');
            }
        } catch (error) {
            console.error('Error uploading to ImageBB:', error);
            throw error;
        }
    }
});

// Rest of your profile specific JavaScript
