import { auth, db, doc, getDoc } from '../../Firebase/firebase-config.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js';
import { ensureUserInFirestore } from '../../Firebase/auth-helpers.js';

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

    // Initialize guest state - only if elements exist
    if (avatarImage) avatarImage.style.display = 'none';
    if (avatarImageDropdown) avatarImageDropdown.style.display = 'none';
    
    if (avatarInitials) {
        avatarInitials.style.display = 'flex';
        avatarInitials.textContent = '';  // Clear any existing content
        const guestIcon = document.createElement('i');
        guestIcon.className = 'fa-solid fa-circle-user';
        avatarInitials.appendChild(guestIcon);
    }
    
    if (avatarInitialsDropdown) {
        avatarInitialsDropdown.style.display = 'flex';
        avatarInitialsDropdown.textContent = '';  // Clear any existing content
        const guestIconDropdown = document.createElement('i');
        guestIconDropdown.className = 'fa-solid fa-circle-user';
        avatarInitialsDropdown.appendChild(guestIconDropdown);
    }
    
    if (userName) userName.textContent = 'Welcome';
    if (userEmail) userEmail.textContent = 'Sign in to access your account';

    // Theme toggle functionality
    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            const isDarkMode = document.body.classList.contains('dark-mode');
            if (isDarkMode) {
                document.body.classList.remove('dark-mode');
                document.documentElement.classList.remove('dark-mode');
                localStorage.setItem('theme', 'light');
            } else {
                document.body.classList.add('dark-mode');
                document.documentElement.classList.add('dark-mode');
                localStorage.setItem('theme', 'dark');
            }
        });
    }

    // Apply theme preference - this is now redundant as theme is applied earlier
    // but we keep it for backward compatibility
    const savedTheme = localStorage.getItem('theme') || 'light';
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-mode');
        document.documentElement.classList.add('dark-mode');
    } else {
        document.body.classList.remove('dark-mode');
        document.documentElement.classList.remove('dark-mode');
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
            try {
                // Ensure user is in Firestore first - this is the key change
                const userData = await ensureUserInFirestore(user);
                
                if (userData) {
                    // Use user data from our helper function
                    if (userName) userName.textContent = userData.fullName || user.displayName || 'User';
                    if (userEmail) userEmail.textContent = user.email;
                    
                    // Update avatar - check for custom avatar first
                    if (userData.photoURL) {
                        // User has profile picture
                        if (avatarImage) {
                            avatarImage.style.display = 'block';
                            avatarImage.src = userData.photoURL;
                        }
                        if (avatarImageDropdown) {
                            avatarImageDropdown.style.display = 'block';
                            avatarImageDropdown.src = userData.photoURL;
                        }
                        if (avatarInitials) avatarInitials.style.display = 'none';
                        if (avatarInitialsDropdown) avatarInitialsDropdown.style.display = 'none';
                    } else if (user.photoURL) {
                        // Fallback to auth profile picture
                        if (avatarImage) {
                            avatarImage.style.display = 'block';
                            avatarImage.src = user.photoURL;
                        }
                        if (avatarImageDropdown) {
                            avatarImageDropdown.style.display = 'block';
                            avatarImageDropdown.src = user.photoURL;
                        }
                        if (avatarInitials) avatarInitials.style.display = 'none';
                        if (avatarInitialsDropdown) avatarInitialsDropdown.style.display = 'none';
                    } else {
                        // No profile picture, show initials
                        if (avatarImage) avatarImage.style.display = 'none';
                        if (avatarImageDropdown) avatarImageDropdown.style.display = 'none';
                        
                        // Use custom name for initials if available
                        const fullName = userData.fullName || user.displayName || '';
                        const initials = fullName.split(' ').map(n => n[0]).join('').toUpperCase();
                        
                        if (avatarInitials) {
                            avatarInitials.style.display = 'flex';
                            avatarInitials.textContent = initials || 'JN';
                        }
                        if (avatarInitialsDropdown) {
                            avatarInitialsDropdown.style.display = 'flex';
                            avatarInitialsDropdown.textContent = initials || 'JN';
                        }
                    }
                } else {
                    // Fallback if our helper failed
                    const displayName = user.displayName || 'User';
                    const email = user.email;
                    const photoURL = user.photoURL;
                    const initials = displayName.split(' ').map(n => n[0]).join('').toUpperCase();

                    // Update user info
                    if (userName) userName.textContent = displayName;
                    if (userEmail) userEmail.textContent = email;

                    // Update avatar
                    if (photoURL) {
                        if (avatarImage) {
                            avatarImage.style.display = 'block';
                            avatarImage.src = photoURL;
                        }
                        if (avatarImageDropdown) {
                            avatarImageDropdown.style.display = 'block';
                            avatarImageDropdown.src = photoURL;
                        }
                        if (avatarInitials) avatarInitials.style.display = 'none';
                        if (avatarInitialsDropdown) avatarInitialsDropdown.style.display = 'none';
                    } else {
                        if (avatarImage) avatarImage.style.display = 'none';
                        if (avatarImageDropdown) avatarImageDropdown.style.display = 'none';
                        
                        if (avatarInitials) {
                            avatarInitials.style.display = 'flex';
                            avatarInitials.textContent = initials;
                        }
                        if (avatarInitialsDropdown) {
                            avatarInitialsDropdown.style.display = 'flex';
                            avatarInitialsDropdown.textContent = initials;
                        }
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
                if (userName) userName.textContent = displayName;
                if (userEmail) userEmail.textContent = email;

                // Update avatar
                if (photoURL) {
                    if (avatarImage) {
                        avatarImage.style.display = 'block';
                        avatarImage.src = photoURL;
                    }
                    if (avatarImageDropdown) {
                        avatarImageDropdown.style.display = 'block';
                        avatarImageDropdown.src = photoURL;
                    }
                    if (avatarInitials) avatarInitials.style.display = 'none';
                    if (avatarInitialsDropdown) avatarInitialsDropdown.style.display = 'none';
                } else {
                    if (avatarImage) avatarImage.style.display = 'none';
                    if (avatarImageDropdown) avatarImageDropdown.style.display = 'none';
                    
                    if (avatarInitials) {
                        avatarInitials.style.display = 'flex';
                        avatarInitials.textContent = initials;
                    }
                    if (avatarInitialsDropdown) {
                        avatarInitialsDropdown.style.display = 'flex';
                        avatarInitialsDropdown.textContent = initials;
                    }
                }
            }

            // Update menu sections for signed-in user
            if (menuSections) {
                menuSections.innerHTML = `
                    <a href="../saved/saved.html">
                        <i class="fas fa-heart"></i>
                        Saved Jobs
                        <span class="badge">0</span>
                    </a>
                    <a href="../applications/applications.html">
                        <i class="fas fa-briefcase"></i>
                        Applications
                        <span class="badge">0</span>
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
            }
        } else {
            // User is signed out
            if (userName) userName.textContent = 'Welcome';
            if (userEmail) userEmail.textContent = 'Sign in to access your account';
            
            // Reset avatar images
            if (avatarImage) avatarImage.style.display = 'none';
            if (avatarImageDropdown) avatarImageDropdown.style.display = 'none';
            
            // Show avatar initials containers with user icon
            if (avatarInitials) {
                avatarInitials.style.display = 'flex';
                avatarInitials.textContent = '';  // Clear any existing content
                const guestIcon = document.createElement('i');
                guestIcon.className = 'fa-solid fa-circle-user';
                avatarInitials.appendChild(guestIcon);
            }
            
            if (avatarInitialsDropdown) {
                avatarInitialsDropdown.style.display = 'flex';
                avatarInitialsDropdown.textContent = '';  // Clear any existing content
                const guestIconDropdown = document.createElement('i');
                guestIconDropdown.className = 'fa-solid fa-circle-user';
                avatarInitialsDropdown.appendChild(guestIconDropdown);
            }

            // Update menu sections for guest user
            if (menuSections) {
                menuSections.innerHTML = `
                    <a href="../login/login.html" class="sign-in-link">
                        <i class="fas fa-sign-in-alt"></i>
                        Sign In
                    </a>
                `;
            }
        }
    });
});
