import { auth, db, doc, getDoc, collection, query, where, getDocs } from '../../Firebase/firebase-config.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js';
import { onSnapshot } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js';
import { ensureUserInFirestore } from '../../Firebase/auth-helpers.js';

// Store the notification listener so we can unsubscribe when user logs out
let notificationListener = null;

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
    const notificationsBtn = document.getElementById('notifications-btn');
    const notificationCount = document.getElementById('notification-count');

    // Debug logging - check if dropdown elements are found
    console.log('Dropdown menu element:', dropdownMenu);
    console.log('User menu button element:', userMenuBtn);

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
            const savedTheme = localStorage.getItem('theme') || 'auto';
            const newTheme = savedTheme === 'dark' ? 'light' : 'dark';
            
            // Update theme using the global function from theme-loader.js
            window.updateTheme(newTheme);
        });
    }

    // Apply theme preference - this is now redundant as theme is applied earlier
    // but we keep it for backward compatibility
    const savedTheme = localStorage.getItem('theme') || 'light';
    if (savedTheme === 'dark') {
        document.documentElement.classList.add('dark-theme');
        document.documentElement.classList.remove('light-theme');
    } else {
        document.documentElement.classList.add('light-theme');
        document.documentElement.classList.remove('dark-theme');
    }

    // User menu dropdown toggle
    if (userMenuBtn && dropdownMenu) {
        // Create a simple state tracker
        let isMenuOpen = false;

        // Remove any existing inline styles
        dropdownMenu.removeAttribute('style');

        userMenuBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();
            
            console.log('User menu button clicked, current state:', isMenuOpen);
            
            // Toggle state
            isMenuOpen = !isMenuOpen;
            
            // Apply the appropriate state
            if (isMenuOpen) {
                // Show dropdown
                dropdownMenu.style.display = 'block';
                dropdownMenu.style.opacity = '1';
                dropdownMenu.style.visibility = 'visible';
                dropdownMenu.style.transform = 'translateY(0)';
                dropdownMenu.style.pointerEvents = 'auto';
                dropdownMenu.classList.add('show');
            } else {
                // Hide dropdown
                dropdownMenu.style.display = 'none';
                dropdownMenu.style.opacity = '0';
                dropdownMenu.style.visibility = 'hidden';
                dropdownMenu.style.pointerEvents = 'none';
                dropdownMenu.classList.remove('show');
            }
            
            console.log('Menu state after click:', isMenuOpen);
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (isMenuOpen && !userMenuBtn.contains(e.target) && !dropdownMenu.contains(e.target)) {
                // Hide dropdown
                dropdownMenu.style.display = 'none';
                dropdownMenu.style.opacity = '0';
                dropdownMenu.style.visibility = 'hidden';
                dropdownMenu.style.pointerEvents = 'none';
                dropdownMenu.classList.remove('show');
                
                // Update state
                isMenuOpen = false;
                console.log('Menu closed by outside click');
            }
        });
    }

    // Add notification button functionality
    if (notificationsBtn) {
        notificationsBtn.addEventListener('click', () => {
            window.location.href = '../notifications/notifications.html';
        });
    }

    // Function to set up real-time notification counter
    const setupNotificationListener = (userId) => {
        // Clean up previous listener if it exists
        if (notificationListener) {
            notificationListener();
        }

        if (notificationCount) {
            try {
                const notificationsRef = collection(db, 'users', userId, 'notifications');
                const unreadQuery = query(notificationsRef, where('read', '==', false));
                
                // Set up real-time listener for notifications
                notificationListener = onSnapshot(unreadQuery, (snapshot) => {
                    const count = snapshot.size;
                    notificationCount.textContent = count;
                    
                    // Add visual feedback when notifications change
                    if (count > 0) {
                        notificationsBtn.classList.add('has-notifications');
                    } else {
                        notificationsBtn.classList.remove('has-notifications');
                    }
                }, (error) => {
                    console.error('Error in notification listener:', error);
                    notificationCount.textContent = '0';
                });
            } catch (error) {
                console.error('Error setting up notification listener:', error);
                notificationCount.textContent = '0';
            }
        }
    };

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

                // Setup real-time notification listener
                setupNotificationListener(user.uid);

                // Update menu sections for signed-in user
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
                            <span class="badge">0</span>
                        </a>
                        <a href="../chats/chats.html">
                            <i class="fas fa-comments"></i>
                            Chats
                        </a>
                        <div class="menu-divider"></div>
                        <a href="../users/users.html">
                            <i class="fas fa-users"></i>
                            Users
                        </a>
                        <a href="../profile/profile.html">
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

            // Clear notification count and unsubscribe from listener
            if (notificationCount) {
                notificationCount.textContent = '0';
            }
            
            if (notificationListener) {
                notificationListener();
                notificationListener = null;
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
