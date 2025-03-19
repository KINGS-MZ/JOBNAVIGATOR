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

    // Update user info if available
    const updateUserInfo = () => {
        const userName = document.getElementById('user-name');
        const userEmail = document.getElementById('user-email');
        const avatarInitials = document.querySelectorAll('.avatar-initials');
        
        // You can replace this with actual user data from your authentication system
        const user = {
            name: 'Guest User',
            email: 'guest@example.com'
        };
        
        if (userName) userName.textContent = user.name;
        if (userEmail) userEmail.textContent = user.email;
        if (avatarInitials.length) {
            const initials = user.name
                .split(' ')
                .map(n => n[0])
                .join('')
                .toUpperCase();
            avatarInitials.forEach(el => el.textContent = initials);
        }
    };

    updateUserInfo();

    // Handle logout
    const logoutLink = document.getElementById('logout-link');
    logoutLink?.addEventListener('click', (e) => {
        e.preventDefault();
        // Add your logout logic here
        console.log('Logging out...');
    });

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
            const modalId = section.classList.contains('stats-section') ? 'statsModal' :
                           section.querySelector('h2').textContent.toLowerCase() + 'Modal';
            openModal(modalId);
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
        const skillsList = document.getElementById('skillsList');
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
        
        // Update main skills display
        skillsList.innerHTML = '';
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
                            <button class="btn-delete-skill" onclick="removeSkill('${category}', '${skill}')">
                                <i class="fas fa-times"></i>
                            </button>
                        </span>
                    `).join('')}
                </div>
            `;
            skillsList.appendChild(categoryDiv);
        });

        // Update skills preview in modal
        if (skillsPreview) {
            skillsPreview.innerHTML = '';
            skillsData.forEach((skills, category) => {
                skills.forEach(skill => {
                    const skillSpan = document.createElement('span');
                    skillSpan.className = 'skill-item';
                    skillSpan.innerHTML = `
                        ${skill}
                        <button class="btn-delete-skill" onclick="removeSkill('${category}', '${skill}')">
                            <i class="fas fa-times"></i>
                        </button>
                    `;
                    skillsPreview.appendChild(skillSpan);
                });
            });
        }

        // Update category select options while preserving all categories
        const categorySelect = document.querySelector('.skill-category-select');
        if (categorySelect) {
            const customCategories = Array.from(skillsData.keys())
                .filter(cat => !predefinedCategories.includes(cat));
            
            categorySelect.innerHTML = `
                <option value="">Choose a category</option>
                ${predefinedCategories.map(cat => `
                    <option value="${cat}" ${categorySelect.value === cat ? 'selected' : ''}>
                        ${cat}
                    </option>
                `).join('')}
                ${customCategories.map(cat => `
                    <option value="${cat}" ${categorySelect.value === cat ? 'selected' : ''}>
                        ${cat}
                    </option>
                `).join('')}
                <option value="new">+ Add Custom Category</option>
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
});

// Rest of your profile specific JavaScript
