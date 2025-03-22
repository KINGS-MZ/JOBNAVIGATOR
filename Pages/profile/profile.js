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
                    <span class="badge">4</span>
                </a>
                <a href="../notifications/notifications.html">
                    <i class="fas fa-bell"></i>
                    Notifications
                    <span class="badge active">3</span>
                </a>
                <a href="../chats/chats.html">
                    <i class="fas fa-comments"></i>
                    Chats
                </a>
                <div class="menu-divider"></div>
                <a href="profile.html">
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
            
            // Reattach logout event listener
            const logoutLink = document.getElementById('logout-link');
            if (logoutLink) {
                logoutLink.addEventListener('click', (event) => {
                    event.preventDefault();
                    signOut(window.auth).then(() => {
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
        button.addEventListener('click', async (e) => {
            const section = e.currentTarget.closest('.profile-section');
            const sectionHeading = section.querySelector('h2').textContent.trim();
            
            if (sectionHeading === 'About') {
                openModal('aboutModal');
                
                // Get the current about text
                try {
                    const userDoc = await window.db.collection("users").doc(currentUser.uid).get();
                    if (userDoc.exists) {
                        const userData = userDoc.data();
                        document.getElementById('about').value = userData.about || '';
                    }
                } catch (error) {
                    console.error("Error fetching about data:", error);
                }
            } else if (sectionHeading === 'Skills') {
                openModal('skillsModal');
            } else if (sectionHeading === 'Education') {
                openModal('educationModal');
            } else if (sectionHeading === 'Experience') {
                openModal('experienceModal');
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
        modal.querySelector('.btn-cancel').addEventListener('click', function() {
            closeModal(this.closest('.modal-overlay').id);
        });
    });

    // Save about data
    document.querySelectorAll('.modal-overlay').forEach(modal => {
        const saveBtn = modal.querySelector('.btn-save');
        if (saveBtn) {
            saveBtn.addEventListener('click', async () => {
                const modalId = modal.id;
                
                if (modalId === 'aboutModal') {
                    const aboutText = document.getElementById('about').value.trim();
                    
                    try {
                        // Save to Firestore
                        await window.db.collection("users").doc(currentUser.uid).update({
                        about: aboutText
                    });
                    
                        // Update UI
                        const aboutSection = document.querySelector('.profile-section:first-of-type .section-content');
                    if (aboutSection) {
                        if (aboutText) {
                                aboutSection.innerHTML = `<p>${aboutText}</p>`;
                            aboutSection.classList.remove('placeholder-text');
                        } else {
                                aboutSection.innerHTML = `<p class="placeholder-text">Tell recruiters about your professional background and skills.</p>`;
                        }
                    }
                    
                        closeModal(modalId);
                } catch (error) {
                        console.error("Error saving about data:", error);
                        alert("Failed to save changes. Please try again.");
                    }
                } else if (modalId === 'experienceModal') {
                    // Handle save experience
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
                        
                        // Save to Firestore
                        await window.db.collection("users").doc(currentUser.uid).update({
                            experiences
                        });
                        
                        // Update UI
                    updateExperienceUI(experiences);
                        closeModal(modalId);
                        
                        // Clear form
                        document.getElementById('jobTitle').value = '';
                        document.getElementById('company').value = '';
                        document.getElementById('location').value = '';
                        document.getElementById('startDate').value = '';
                        document.getElementById('endDate').value = '';
                        document.getElementById('description').value = '';
                        document.getElementById('skills').value = '';
            } catch (error) {
                        console.error("Error saving experience:", error);
                        alert("Failed to save experience. Please try again.");
                    }
                } else if (modalId === 'educationModal') {
                    // Handle save education
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
                        } catch (error) {
                        console.error("Error saving education:", error);
                        alert("Failed to save education. Please try again.");
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
        
        if (!editAvatarBtn) return;
        
        // Create a hidden file input
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = 'image/*';
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
            
            try {
            // Show loading state
            editAvatarBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
            editAvatarBtn.disabled = true;
            
                // Upload the image to ImageBB (or another service)
                const imageUrl = await uploadImageToImageBB(file);
                
                if (imageUrl) {
                    // Update user profile with new avatar URL
                    await window.db.collection("users").doc(user.uid).update({
                        photoURL: imageUrl
                    });
                    
                    // Update UI
                    profileAvatarImage.src = imageUrl;
                    profileAvatarImage.style.display = 'block';
                    document.getElementById('profile-avatar-initials').style.display = 'none';
                    
                    // Update avatar in navbar
                    const avatarImage = document.getElementById('avatar-image');
                    const avatarImageDropdown = document.getElementById('avatar-image-dropdown');
                    
                    if (avatarImage) {
                        avatarImage.src = imageUrl;
                        avatarImage.style.display = 'block';
                        document.getElementById('avatar-initials').style.display = 'none';
                    }
                    
                    if (avatarImageDropdown) {
                        avatarImageDropdown.src = imageUrl;
                        avatarImageDropdown.style.display = 'block';
                        document.getElementById('avatar-initials-dropdown').style.display = 'none';
                    }
                }
            } catch (error) {
                console.error("Error updating avatar:", error);
                alert("Failed to update avatar. Please try again.");
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
