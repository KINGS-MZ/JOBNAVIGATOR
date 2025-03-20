import { 
    auth,
    db,
    collection,
    addDoc
} from '../../Firebase/firebase-config.js';
import { 
    onAuthStateChanged,
    signOut
} from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js';

document.addEventListener('DOMContentLoaded', () => {
    // Check if user is signed in
    onAuthStateChanged(auth, (user) => {
        if (!user) {
            // User is not signed in, redirect to login page
            window.location.href = '/Pages/login/login.html';
            return;
        }
        // Update user info in the dropdown if user is signed in
        const userNameElement = document.getElementById('user-name');
        const userEmailElement = document.getElementById('user-email');
        const avatarInitials = document.getElementById('avatar-initials');
        const avatarInitialsDropdown = document.getElementById('avatar-initials-dropdown');
        const avatarImage = document.getElementById('avatar-image');
        const avatarImageDropdown = document.getElementById('avatar-image-dropdown');
        
        if (userNameElement && user.displayName) {
            userNameElement.textContent = user.displayName;
        }
        
        if (userEmailElement && user.email) {
            userEmailElement.textContent = user.email;
        }

        // Handle profile picture
        if (user.photoURL) {
            // User has a profile picture (e.g., from Google)
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
            // No profile picture, show initials
            if (avatarImage) {
                avatarImage.style.display = 'none';
            }
            if (avatarImageDropdown) {
                avatarImageDropdown.style.display = 'none';
            }
            const initials = user.displayName
                ? user.displayName
                    .split(' ')
                    .map(name => name[0])
                    .join('')
                    .toUpperCase()
                : 'JN';
                
            if (avatarInitials) {
                avatarInitials.style.display = 'flex';
                avatarInitials.textContent = initials;
            }
            if (avatarInitialsDropdown) {
                avatarInitialsDropdown.style.display = 'flex';
                avatarInitialsDropdown.textContent = initials;
            }
        }
    });

    // Form elements
    const jobForm = document.getElementById('postForm');
    const publishButton = document.querySelector('.btn-primary');
    const draftButton = document.querySelector('.btn-secondary');
    const editorContent = document.getElementById('jobDescription');
    const iconSelector = document.getElementById('iconSelector');
    const iconDropdown = document.getElementById('iconDropdown');

    // Initialize tag sets
    const skillTags = new Set();
    const benefitTags = new Set();

    // Icon selector functionality
    let isIconDropdownOpen = false;
    let selectedIconData = {
        className: 'fas fa-briefcase',
        name: 'briefcase'
    };

    iconSelector.addEventListener('click', (e) => {
        e.preventDefault();
        isIconDropdownOpen = !isIconDropdownOpen;
        iconDropdown.style.display = isIconDropdownOpen ? 'block' : 'none';
    });

    document.querySelectorAll('.icon-grid button').forEach(button => {
        button.addEventListener('click', () => {
            const iconElement = button.querySelector('i');
            const iconClass = iconElement.className;
            const iconName = button.getAttribute('data-icon').replace('fa-', '');
            
            selectedIconData = {
                className: iconClass,
                name: iconName
            };
            
            iconSelector.querySelector('i').className = iconClass;
            isIconDropdownOpen = false;
            iconDropdown.style.display = 'none';
        });
    });

    // Close icon dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (isIconDropdownOpen && !iconSelector.contains(e.target) && !iconDropdown.contains(e.target)) {
            isIconDropdownOpen = false;
            iconDropdown.style.display = 'none';
        }
    });

    // Prevent default form submission
    jobForm.addEventListener('submit', (e) => {
        e.preventDefault();
        submitForm('published');
    });

    draftButton.addEventListener('click', (e) => {
        e.preventDefault();
        submitForm('draft');
    });

    async function submitForm(status) {
        try {
            console.log('Starting form submission...');
            
            // Get form values
            const title = document.getElementById('jobTitle').value;
            const company = document.getElementById('companyName').value;
            const location = document.getElementById('location').value;
            const type = document.getElementById('employmentType').value;
            const salaryMin = document.getElementById('salaryMin').value;
            const salaryMax = document.getElementById('salaryMax').value;
            const description = editorContent.innerHTML;
            const companyEmail = document.getElementById('companyEmail').value;

            if (!title || !company || !location || !type || !description || !companyEmail) {
                console.log('Missing required fields');
                alert('Please fill in all required fields');
                return;
            }

            // Get current user data
            const user = auth.currentUser;
            if (!user) {
                alert('You must be signed in to post a job');
                return;
            }

            const formData = {
                title,
                company,
                location,
                type,
                icon: {
                    className: selectedIconData.className,
                    name: selectedIconData.name
                },
                salaryMin: parseFloat(salaryMin) || 0,
                salaryMax: parseFloat(salaryMax) || 0,
                description,
                skills: Array.from(skillTags),
                benefits: Array.from(benefitTags),
                status,
                createdAt: new Date().toISOString(),
                createdBy: {
                    uid: user.uid,
                    displayName: user.displayName || 'Anonymous',
                    email: user.email
                },
                companyEmail
            };

            console.log('Submitting to Firebase:', formData);

            // Save to Firebase
            const docRef = await addDoc(collection(db, "jobs"), formData);
            console.log('Document written with ID:', docRef.id);
            alert('Job post saved successfully!');
            
            // Reset form and selected icon
            jobForm.reset();
            editorContent.innerHTML = '';
            skillTags.clear();
            benefitTags.clear();
            
            // Reset icon to default
            selectedIconData = {
                className: 'fas fa-briefcase',
                name: 'briefcase'
            };
            iconSelector.querySelector('i').className = selectedIconData.className;
            
            // Clear tag containers
            document.getElementById('skillsContainer').innerHTML = '';
            document.getElementById('benefitsContainer').innerHTML = '';
            
        } catch (error) {
            console.error("Error saving job post:", error);
            alert('Error saving job post: ' + error.message);
        }
    }

    // Tags functionality
    function setupTagInput(inputId, containerId, tagSet) {
        const input = document.getElementById(inputId);
        const container = document.getElementById(containerId);
        
        if (input && container) {
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && input.value.trim()) {
                    e.preventDefault();
                    const tag = input.value.trim();
                    if (!tagSet.has(tag)) {
                        addTag(tag, container, tagSet);
                        input.value = '';
                    }
                }
            });
        }
    }

    setupTagInput('skillInput', 'skillsContainer', skillTags);
    setupTagInput('benefitInput', 'benefitsContainer', benefitTags);

    function addTag(text, container, set) {
        const tag = document.createElement('span');
        tag.className = 'tag';
        tag.innerHTML = `
            ${text}
            <button type="button" class="remove-tag">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        tag.querySelector('.remove-tag').addEventListener('click', () => {
            tag.remove();
            set.delete(text);
        });
        
        container.appendChild(tag);
        set.add(text);
    }

    // Rich text editor functionality
    const editorButtons = document.querySelectorAll('.editor-toolbar button');
    editorButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            const command = button.dataset.command;
            if (command) {
                document.execCommand(command, false, null);
                editorContent.focus();
            }
        });
    });

    // File upload functionality
    const imageUpload = document.getElementById('imageUpload');
    const imageInput = document.getElementById('imageInput');
    const pdfUpload = document.getElementById('pdfUpload');
    const pdfInput = document.getElementById('pdfInput');

    imageUpload.addEventListener('click', () => imageInput.click());
    pdfUpload.addEventListener('click', () => pdfInput.click());

    // Drag and drop functionality
    [imageUpload, pdfUpload].forEach(uploadArea => {
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('dragover');
        });

        uploadArea.addEventListener('dragleave', () => {
            uploadArea.classList.remove('dragover');
        });

        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('dragover');
            const files = e.dataTransfer.files;
            const input = uploadArea.querySelector('input');
            input.files = files;
            handleFiles(files, uploadArea.id === 'imageUpload' ? 'uploadedImages' : 'uploadedPdfs');
        });
    });

    imageInput.addEventListener('change', () => handleFiles(imageInput.files, 'uploadedImages'));
    pdfInput.addEventListener('change', () => handleFiles(pdfInput.files, 'uploadedPdfs'));

    function handleFiles(files, containerId) {
        const container = document.getElementById(containerId);
        Array.from(files).forEach(file => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const div = document.createElement('div');
                div.className = 'uploaded-file';
                if (containerId === 'uploadedImages') {
                    div.innerHTML = `
                        <img src="${e.target.result}" alt="${file.name}">
                        <button type="button" class="remove-file"><i class="fas fa-times"></i></button>
                    `;
                } else {
                    div.innerHTML = `
                        <i class="fas fa-file-pdf"></i>
                        <span>${file.name}</span>
                        <button type="button" class="remove-file"><i class="fas fa-times"></i></button>
                    `;
                }
                div.querySelector('.remove-file').addEventListener('click', () => div.remove());
                container.appendChild(div);
            };
            reader.readAsDataURL(file);
        });
    }

    // Salary input validation
    const salaryMinInput = document.getElementById('salaryMin');
    const salaryMaxInput = document.getElementById('salaryMax');

    [salaryMinInput, salaryMaxInput].forEach(input => {
        input.addEventListener('input', validateSalary);
    });

    function validateSalary() {
        const min = parseInt(salaryMinInput.value);
        const max = parseInt(salaryMaxInput.value);
        
        if (min && max && min > max) {
            salaryMaxInput.setCustomValidity('Maximum salary must be greater than minimum salary');
        } else {
            salaryMaxInput.setCustomValidity('');
        }
    }

    // Theme Toggle
    const themeToggle = document.getElementById('theme-toggle');
    const themeIcon = themeToggle.querySelector('i');

    // Initialize theme
    const storedTheme = localStorage.getItem('theme');
    if (storedTheme === 'dark') {
        document.documentElement.classList.add('dark-mode');
        document.body.classList.add('dark-mode');
        themeIcon.className = 'fas fa-sun';
    }

    function toggleTheme() {
        document.documentElement.classList.toggle('dark-mode');
        document.body.classList.toggle('dark-mode');
        const isDark = document.body.classList.contains('dark-mode');
        
        // Update icon
        themeIcon.className = isDark ? 'fas fa-sun' : 'fas fa-moon';
        
        // Save preference
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
    }

    themeToggle.addEventListener('click', toggleTheme);

    // Dropdown Menu
    const userMenuBtn = document.getElementById('user-menu-btn');
    const userDropdown = document.getElementById('user-dropdown');

    if (!userMenuBtn || !userDropdown) {
        console.error('Dropdown elements not found');
    } else {
        let isDropdownOpen = false;

        function toggleDropdown(event) {
            event.stopPropagation();
            isDropdownOpen = !isDropdownOpen;
            userDropdown.classList.toggle('show');
            userMenuBtn.classList.toggle('active');
        }

        // Close dropdown when clicking outside
        document.addEventListener('click', (event) => {
            if (isDropdownOpen && !userMenuBtn.contains(event.target) && !userDropdown.contains(event.target)) {
                isDropdownOpen = false;
                userDropdown.classList.remove('show');
                userMenuBtn.classList.remove('active');
            }
        });

        userMenuBtn.addEventListener('click', toggleDropdown);

        // Prevent dropdown from closing when clicking inside it
        userDropdown.addEventListener('click', (event) => {
            event.stopPropagation();
        });

        // Close dropdown when pressing Escape key
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && isDropdownOpen) {
                isDropdownOpen = false;
                userDropdown.classList.remove('show');
                userMenuBtn.classList.remove('active');
            }
        });
    }

    // Handle sign out
    const logoutLink = document.getElementById('logout-link');
    if (logoutLink) {
        logoutLink.addEventListener('click', async (e) => {
            e.preventDefault();
            try {
                await signOut(auth);
                // Redirect to login page after successful sign out
                window.location.href = '../login/login.html';
            } catch (error) {
                console.error('Error signing out:', error);
            }
        });
    }

    // Character count for job description
    editorContent.addEventListener('input', () => {
        const charCount = editorContent.textContent.length;
        const maxChars = 5000;
        const charCountElement = editorContent.parentElement.querySelector('.char-count');
        charCountElement.textContent = `${charCount}/${maxChars}`;

        if (charCount > maxChars) {
            editorContent.textContent = editorContent.textContent.slice(0, maxChars);
        }
    });

    // Preview functionality
    function updatePreview(data) {
        const previewSection = document.querySelector('.preview-placeholder');
        previewSection.innerHTML = `
            <div class="job-preview">
                <h3>${data.title}</h3>
                <div class="company-info">
                    <span>${data.company}</span> • <span>${data.location}</span>
                </div>
                <div class="job-type">
                    ${data.type} • ${data.experienceLevel}
                </div>
                ${data.salaryMin || data.salaryMax ? `
                    <div class="salary-range">
                        Salary: $${data.salaryMin || '0'} - $${data.salaryMax || '0'} per year
                    </div>
                ` : ''}
                <div class="description">
                    ${data.description}
                </div>
                ${data.requirements.length ? `
                    <div class="skills">
                        <h4>Required Skills:</h4>
                        <div class="tags-container">
                            ${data.requirements.map(skill => `<span class="tag">${skill}</span>`).join('')}
                        </div>
                    </div>
                ` : ''}
                ${data.benefits.length ? `
                    <div class="benefits">
                        <h4>Benefits & Perks:</h4>
                        <div class="tags-container">
                            ${data.benefits.map(benefit => `<span class="tag">${benefit}</span>`).join('')}
                        </div>
                    </div>
                ` : ''}
                ${data.applicationDeadline ? `
                    <div class="deadline">
                        Application Deadline: ${new Date(data.applicationDeadline).toLocaleDateString()}
                    </div>
                ` : ''}
                ${data.applicationUrl ? `
                    <div class="apply-link">
                        <a href="${data.applicationUrl}" target="_blank">Apply Now</a>
                    </div>
                ` : ''}
            </div>
        `;
    }

    // Add CSS class when fields are invalid
    const jobFormElements = {
        title: document.getElementById('jobTitle'),
        company: document.getElementById('companyName'),
        location: document.getElementById('location'),
        type: document.getElementById('employmentType'),
        salaryMin: document.getElementById('salaryMin'),
        salaryMax: document.getElementById('salaryMax'),
        description: document.getElementById('jobDescription'),
        applicationDeadline: document.getElementById('applicationDeadline'),
        applicationUrl: document.getElementById('applicationUrl')
    };

    Object.values(jobFormElements).forEach(input => {
        if (input.required) {
            input.addEventListener('invalid', () => {
                input.classList.add('invalid');
            });
            input.addEventListener('input', () => {
                input.classList.remove('invalid');
            });
        }
    });
});
