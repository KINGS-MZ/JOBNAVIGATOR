document.addEventListener('DOMContentLoaded', () => {
    // Handle profile picture upload
    const editPictureBtn = document.querySelector('.edit-picture');
    const profilePicture = document.querySelector('.profile-picture img');

    editPictureBtn.addEventListener('click', () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    profilePicture.src = event.target.result;
                    // Here you would typically upload the image to your server
                    // uploadProfilePicture(file);
                };
                reader.readAsDataURL(file);
            }
        };
        
        input.click();
    });

    // Handle cover photo upload
    const editCoverBtn = document.querySelector('.edit-cover');
    const profileCover = document.querySelector('.profile-cover');

    editCoverBtn.addEventListener('click', () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    profileCover.style.backgroundImage = `url(${event.target.result})`;
                    // Here you would typically upload the image to your server
                    // uploadCoverPhoto(file);
                };
                reader.readAsDataURL(file);
            }
        };
        
        input.click();
    });

    // Handle edit profile button
    const editProfileBtn = document.querySelector('.edit-profile-btn');
    
    editProfileBtn.addEventListener('click', () => {
        // Create modal for editing profile
        const modal = document.createElement('div');
        modal.className = 'edit-profile-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <h2>Edit Profile</h2>
                <form id="edit-profile-form">
                    <div class="form-group">
                        <label>Full Name</label>
                        <input type="text" name="fullName" value="John Doe" required>
                    </div>
                    <div class="form-group">
                        <label>Title</label>
                        <input type="text" name="title" value="Web Developer | OFPPT Graduate" required>
                    </div>
                    <div class="form-group">
                        <label>Location</label>
                        <input type="text" name="location" value="Casablanca, Morocco" required>
                    </div>
                    <div class="form-group">
                        <label>About Me</label>
                        <textarea name="about" rows="4" required>Recent OFPPT graduate with a strong foundation in web development and a passion for creating user-friendly applications. Seeking opportunities to apply my skills and contribute to innovative projects.</textarea>
                    </div>
                    <div class="form-actions">
                        <button type="button" class="cancel-btn">Cancel</button>
                        <button type="submit" class="save-btn">Save Changes</button>
                    </div>
                </form>
            </div>
        `;

        document.body.appendChild(modal);

        // Handle form submission
        const form = document.getElementById('edit-profile-form');
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            // Here you would typically send the form data to your server
            // updateProfile(formData);
            
            // Update UI
            document.querySelector('.profile-details h1').textContent = form.fullName.value;
            document.querySelector('.profile-details .title').textContent = form.title.value;
            document.querySelector('.profile-details .location').innerHTML = 
                `<i class="fas fa-map-marker-alt"></i> ${form.location.value}`;
            document.querySelector('.profile-section p').textContent = form.about.value;

            // Close modal
            modal.remove();
        });

        // Handle cancel button
        const cancelBtn = modal.querySelector('.cancel-btn');
        cancelBtn.addEventListener('click', () => {
            modal.remove();
        });

        // Close modal when clicking outside
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    });

    // Handle skill tags
    const skillTags = document.querySelectorAll('.skill-tag');
    skillTags.forEach(tag => {
        tag.addEventListener('click', () => {
            // Here you could implement skill endorsement functionality
            tag.classList.toggle('endorsed');
        });
    });

    // Handle profile completion
    function updateProfileCompletion() {
        const tasks = document.querySelectorAll('.completion-tasks li');
        const completedTasks = document.querySelectorAll('.completion-tasks li.completed');
        const percentage = (completedTasks.length / tasks.length) * 100;
        
        document.querySelector('.progress').style.width = `${percentage}%`;
        document.querySelector('.profile-completion p').textContent = `${Math.round(percentage)}% Complete`;
    }

    // Call initially and after any profile updates
    updateProfileCompletion();

    // Handle logout
    const logoutBtn = document.getElementById('logout-btn');
    logoutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        // Here you would typically handle logout logic
        // logout();
        window.location.href = 'index.html';
    });
});
