import { auth, db, doc, getDoc } from '../../Firebase/firebase-config.js';
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

    // Initialize guest state
    avatarImage.style.display = 'none';
    avatarImageDropdown.style.display = 'none';
    avatarInitials.style.display = 'flex';
    avatarInitialsDropdown.style.display = 'flex';
    avatarInitials.textContent = '';  // Clear any existing content
    avatarInitialsDropdown.textContent = '';  // Clear any existing content
    const guestIcon = document.createElement('i');
    guestIcon.className = 'fa-solid fa-circle-user';
    const guestIconDropdown = document.createElement('i');
    guestIconDropdown.className = 'fa-solid fa-circle-user';
    avatarInitials.appendChild(guestIcon);
    avatarInitialsDropdown.appendChild(guestIconDropdown);
    userName.textContent = 'Welcome';
    userEmail.textContent = 'Sign in to access your account';

    // Theme toggle functionality
    themeToggle.addEventListener('click', () => {
        const isDarkMode = document.body.classList.contains('dark-mode');
        if (isDarkMode) {
            document.body.classList.remove('dark-mode');
            localStorage.setItem('theme', 'light');
        } else {
            document.body.classList.add('dark-mode');
            localStorage.setItem('theme', 'dark');
        }
    });

    // Check for saved theme preference and set initial state
    const savedTheme = localStorage.getItem('theme') || 'light';
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-mode');
    } else {
        document.body.classList.remove('dark-mode');
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
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            // User is signed in - first try to get profile data from Firestore
            try {
                const userRef = doc(db, "users", user.uid);
                const userSnap = await getDoc(userRef);
                
                if (userSnap.exists()) {
                    const userData = userSnap.data();
                    
                    // Update user info with custom data from Firestore
                    userName.textContent = userData.fullName || user.displayName || 'User';
                    userEmail.textContent = user.email;
                    
                    // Update avatar - check for custom avatar first
                    if (userData.photoURL) {
                        // User has custom profile picture
                        avatarImage.style.display = 'block';
                        avatarImage.src = userData.photoURL;
                        avatarImageDropdown.style.display = 'block';
                        avatarImageDropdown.src = userData.photoURL;
                        avatarInitials.style.display = 'none';
                        avatarInitialsDropdown.style.display = 'none';
                    } else if (user.photoURL) {
                        // Fallback to auth profile picture
                        avatarImage.style.display = 'block';
                        avatarImage.src = user.photoURL;
                        avatarImageDropdown.style.display = 'block';
                        avatarImageDropdown.src = user.photoURL;
                        avatarInitials.style.display = 'none';
                        avatarInitialsDropdown.style.display = 'none';
                    } else {
                        // No profile picture, show initials
                        avatarImage.style.display = 'none';
                        avatarImageDropdown.style.display = 'none';
                        avatarInitials.style.display = 'flex';
                        avatarInitialsDropdown.style.display = 'flex';
                        
                        // Use custom name for initials if available
                        const fullName = userData.fullName || user.displayName || '';
                        const initials = fullName.split(' ').map(n => n[0]).join('').toUpperCase();
                        
                        avatarInitials.textContent = initials || 'JN';
                        avatarInitialsDropdown.textContent = initials || 'JN';
                    }
                } else {
                    // No Firestore data, fallback to auth data
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
                }
            } catch (error) {
                console.error('Error fetching user profile:', error);
                // Fallback to auth data if Firestore fetch fails
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
            }

            // Update menu sections for signed-in user
            menuSections.innerHTML = `
                <a href="../saved/saved.html">
                    <i class="fas fa-heart"></i>
                    Saved Jobs
                    <span class="badge">4</span>
                </a>
                <a href="../jobs/Applications.html">
                    <i class="fas fa-briefcase"></i>
                    Applications
                    <span class="badge">2</span>
                </a>
                <a href="../notifications/notifications.html">
                    <i class="fas fa-bell"></i>
                    Notifications
                    <span class="badge active">0</span>
                </a>
                <div class="menu-divider"></div>
                <a href="../profile/profile.html">
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
                        window.location.href = '../login/login.html';
                    }).catch((error) => {
                        console.error('Error signing out:', error);
                    });
                });
            }
        } else {
            // User is signed out
            userName.textContent = 'Welcome';
            userEmail.textContent = 'Sign in to access your account';
            
            // Reset avatar images
            avatarImage.style.display = 'none';
            avatarImageDropdown.style.display = 'none';
            
            // Show avatar initials containers with user icon
            avatarInitials.style.display = 'flex';
            avatarInitialsDropdown.style.display = 'flex';
            avatarInitials.textContent = '';  // Clear any existing content
            avatarInitialsDropdown.textContent = '';  // Clear any existing content
            const guestIcon = document.createElement('i');
            guestIcon.className = 'fa-solid fa-circle-user';
            const guestIconDropdown = document.createElement('i');
            guestIconDropdown.className = 'fa-solid fa-circle-user';
            avatarInitials.appendChild(guestIcon);
            avatarInitialsDropdown.appendChild(guestIconDropdown);

            // Update menu sections for guest user
            menuSections.innerHTML = `
                <a href="../login/login.html" class="sign-in-link">
                    <i class="fas fa-sign-in-alt"></i>
                    Sign In
                </a>
            `;
        }
    });
});
