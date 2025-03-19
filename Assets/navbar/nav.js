import { auth } from '../../Firebase/firebase-config.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js';

document.addEventListener('DOMContentLoaded', () => {
    const themeToggle = document.getElementById('theme-toggle');
    const userMenuBtn = document.getElementById('user-menu-btn');
    const dropdownMenu = document.getElementById('user-dropdown');
    const avatarImage = document.getElementById('avatar-image');
    const avatarImageDropdown = document.getElementById('avatar-image-dropdown');
    const avatarInitials = document.getElementById('avatar-initials');
    const avatarInitialsDropdown = document.getElementById('avatar-initials-dropdown');
    const userName = document.getElementById('user-name');
    const userEmail = document.getElementById('user-email');
    const menuSections = document.querySelector('.menu-sections');
    const signInLink = document.querySelector('.sign-in-link');

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

    // User menu dropdown toggle
    if (userMenuBtn && dropdownMenu) {
        userMenuBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdownMenu.classList.toggle('show');
        });

        // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
            if (!userMenuBtn.contains(e.target) && !dropdownMenu.contains(e.target)) {
                dropdownMenu.classList.remove('show');
            }
        });
    }

    // Handle user authentication state
    onAuthStateChanged(auth, (user) => {
        if (user) {
            // User is signed in
            const displayName = user.displayName || 'User';
            const email = user.email;
            const photoURL = user.photoURL;
            const initials = displayName.split(' ').map(n => n[0]).join('').toUpperCase();

            // Update user info
            userName.textContent = displayName;
            userEmail.textContent = email;

            // Update avatar
            if (photoURL) {
                avatarImage.style.display = 'block';
                avatarImage.src = photoURL;
                avatarImageDropdown.style.display = 'block';
                avatarImageDropdown.src = photoURL;
                avatarInitials.style.display = 'none';
                avatarInitialsDropdown.style.display = 'none';
            } else {
                avatarImage.style.display = 'none';
                avatarImageDropdown.style.display = 'none';
                avatarInitials.style.display = 'flex';
                avatarInitialsDropdown.style.display = 'flex';
                avatarInitials.textContent = initials;
                avatarInitialsDropdown.textContent = initials;
            }

            // Update menu sections for signed-in user
            menuSections.innerHTML = `
                <a href="../jobs/SavedJobs.html">
                    <i class="fas fa-heart"></i>
                    Saved Jobs
                    <span class="badge">0</span>
                </a>
                <a href="../jobs/Applications.html">
                    <i class="fas fa-briefcase"></i>
                    Applications
                    <span class="badge">0</span>
                </a>
                <a href="../jobs/JobAlerts.html">
                    <i class="fas fa-bell"></i>
                    Job Alerts
                    <span class="badge active">0</span>
                </a>
                <div class="menu-divider"></div>
                <a href="../profile/Profile.html">
                    <i class="fas fa-user"></i>
                    My Profile
                </a>
                <a href="../profile/Resume.html">
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

            // Add logout functionality
            const logoutLink = document.getElementById('logout-link');
            if (logoutLink) {
                logoutLink.addEventListener('click', (e) => {
                    e.preventDefault();
                    auth.signOut().then(() => {
                        window.location.href = '../home/home.html';
                    }).catch((error) => {
                        console.error('Error signing out:', error);
                    });
                });
            }
        } else {
            // User is signed out
            userName.textContent = 'Guest User';
            userEmail.textContent = 'guest@example.com';
            avatarImage.style.display = 'none';
            avatarImageDropdown.style.display = 'none';
            avatarInitials.style.display = 'flex';
            avatarInitialsDropdown.style.display = 'flex';
            avatarInitials.textContent = 'JN';
            avatarInitialsDropdown.textContent = 'JN';

            // Update menu sections for guest user
            menuSections.innerHTML = `
                <a href="../jobs/Applications.html">
                    <i class="fas fa-briefcase"></i>
                    Applications
                    <span class="badge">0</span>
                </a>
                <div class="menu-divider"></div>
                <a href="../auth/login.html" class="sign-in-link">
                    <i class="fas fa-sign-in-alt"></i>
                    Sign In
                </a>
            `;
        }
    });
});
