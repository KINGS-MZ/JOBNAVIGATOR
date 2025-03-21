import { 
    auth,
    db,
    collection,
    addDoc,
    doc,
    getDoc,
    updateDoc
} from '../../Firebase/firebase-config.js';
import { 
    onAuthStateChanged,
    signOut
} from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js';

document.addEventListener('DOMContentLoaded', () => {
    // Variables to track edit mode
    let isEditMode = false;
    let editJobId = null;
    
    // Check if we're in edit mode by looking for edit parameter in URL
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('edit')) {
        isEditMode = true;
        editJobId = urlParams.get('edit');
    }

    // Check if user is signed in
    onAuthStateChanged(auth, async (user) => {
        if (!user) {
            // User is not signed in, redirect to login page
            window.location.href = '/Pages/login/login.html';
            return;
        }
        
        // Update UI for edit mode if applicable
        if (isEditMode) {
            // Update page title and description
            const sectionHeader = document.querySelector('.section-header');
            if (sectionHeader) {
                sectionHeader.innerHTML = `
                    <h2>Edit Job Post</h2>
                    <p>Update your job posting details</p>
                `;
            }
            
            // Update buttons
            const publishButton = document.querySelector('.btn-primary');
            const draftButton = document.querySelector('.btn-secondary');
            
            if (publishButton) {
                publishButton.innerHTML = `
                    <i class="fas fa-save"></i>
                    Save Changes
                `;
            }
            
            if (draftButton) {
                draftButton.style.display = 'none';
            }
            
            // Fetch the job data for editing
            await fetchJobForEditing(editJobId);
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
        if (isEditMode) {
            updateJob();
        } else {
            submitForm('published');
        }
    });

    if (draftButton) {
        draftButton.addEventListener('click', (e) => {
            e.preventDefault();
            submitForm('draft');
        });
    }

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

    // Function to fetch job data for editing
    async function fetchJobForEditing(jobId) {
        try {
            console.log('Fetching job data for editing...');
            
            const jobRef = doc(db, "jobs", jobId);
            const jobDoc = await getDoc(jobRef);
            
            if (!jobDoc.exists()) {
                console.error('Job not found');
                alert('Job post not found');
                window.location.href = '../jobs/jobs.html';
                return;
            }
            
            const jobData = jobDoc.data();
            
            // Check if the current user is the creator of the post
            if (auth.currentUser.uid !== jobData.createdBy.uid) {
                console.error('Not authorized to edit this post');
                alert('You are not authorized to edit this post');
                window.location.href = '../jobs/jobs.html';
                return;
            }
            
            // Populate form with existing data
            document.getElementById('jobTitle').value = jobData.title || '';
            document.getElementById('companyName').value = jobData.company || '';
            document.getElementById('location').value = jobData.location || '';
            document.getElementById('employmentType').value = jobData.type || '';
            document.getElementById('salaryMin').value = jobData.salaryMin || '';
            document.getElementById('salaryMax').value = jobData.salaryMax || '';
            document.getElementById('companyEmail').value = jobData.companyEmail || '';
            editorContent.innerHTML = jobData.description || '';
            
            // Set the icon
            if (jobData.icon && jobData.icon.className) {
                selectedIconData = {
                    className: jobData.icon.className,
                    name: jobData.icon.name || 'briefcase'
                };
                iconSelector.querySelector('i').className = jobData.icon.className;
            }
            
            // Add skills
            if (jobData.skills && Array.isArray(jobData.skills)) {
                jobData.skills.forEach(skill => {
                    addTag(skill, document.getElementById('skillsContainer'), skillTags);
                });
            }
            
            // Add benefits
            if (jobData.benefits && Array.isArray(jobData.benefits)) {
                jobData.benefits.forEach(benefit => {
                    addTag(benefit, document.getElementById('benefitsContainer'), benefitTags);
                });
            }
            
            console.log('Job data loaded for editing');
        } catch (error) {
            console.error('Error fetching job data:', error);
            alert('Error loading job data: ' + error.message);
        }
    }
    
    // Function to update existing job
    async function updateJob() {
        try {
            console.log('Updating job post...');
            
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
                alert('You must be signed in to update a job post');
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
                status: 'published',
                updatedAt: new Date().toISOString(),
                companyEmail
            };

            console.log('Updating job in Firebase:', formData);

            // Update job in Firebase
            const jobRef = doc(db, "jobs", editJobId);
            await updateDoc(jobRef, formData);
            
            console.log('Job updated successfully');
            alert('Job post updated successfully!');
            
            // Redirect to the updated job page (replace current history instead of adding to it)
            window.location.replace(`../visualize/visualize.html?id=${editJobId}`);
            
        } catch (error) {
            console.error("Error updating job post:", error);
            alert('Error updating job post: ' + error.message);
        }
    }
});
