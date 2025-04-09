import { auth, db, doc, getDoc, collection, query, where, getDocs } from '../../Firebase/firebase-config.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js';
import { onSnapshot } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js';
import { ensureUserInFirestore } from '../../Firebase/auth-helpers.js';

// Store the notification listener so we can unsubscribe when user logs out
let notificationListener = null;

document.addEventListener('DOMContentLoaded', () => {
    // Set flag indicating nav.js will handle the dropdown menu
    window.navJsHandledMenu = true;
    
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
    const upgradeBtn = document.querySelector('.upgrade-btn');

    // Show loading state immediately
    if (userName) userName.textContent = 'Loading...';
    if (userEmail) userEmail.textContent = 'Please wait...';
    if (avatarInitials) {
        avatarInitials.style.display = 'flex';
        avatarInitials.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    }
    if (avatarInitialsDropdown) {
        avatarInitialsDropdown.style.display = 'flex';
        avatarInitialsDropdown.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    }

    // Hide upgrade button initially
    if (upgradeBtn) {
        upgradeBtn.style.visibility = 'hidden';
    }

    // Function to highlight current page in the dropdown menu
    const highlightCurrentPage = () => {
        const currentPath = window.location.pathname;
        let currentPage = '';
        const pathParts = currentPath.split('/');
        
        for (const part of pathParts) {
            if (['home', 'jobs', 'posts', 'chats', 'saved', 'account', 'settings', 'users', 'notifications'].includes(part)) {
                currentPage = part;
                break;
            }
        }
        
        if (!currentPage) return;
        
        const menuLinks = document.querySelectorAll('.menu-sections a');
        if (!menuLinks.length) return;
        
        menuLinks.forEach(link => {
            link.classList.remove('active');
            const href = link.getAttribute('href');
            if (href && href.includes(`/${currentPage}/`)) {
                link.classList.add('active');
            }
        });
    };

    // Function to set up real-time notification counter
    const setupNotificationListener = (userId) => {
        if (notificationListener) {
            notificationListener();
        }

        if (notificationCount) {
            try {
                const notificationsRef = collection(db, 'users', userId, 'notifications');
                const unreadQuery = query(notificationsRef, where('read', '==', false));
                
                notificationListener = onSnapshot(unreadQuery, (snapshot) => {
                    const count = snapshot.size;
                    notificationCount.textContent = count;
                    
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

    // Function to handle displaying of the upgrade button based on subscription status
    const manageUpgradeButton = async (userId) => {
        try {
            if (!upgradeBtn) return;
            
            if (!userId) {
                upgradeBtn.style.display = 'none';
                return;
            }
            
            const userDocRef = doc(db, 'users', userId);
            const userDoc = await getDoc(userDocRef);
            
            if (userDoc.exists()) {
                const userData = userDoc.data();
                if (userData.role === 'admin') {
                    upgradeBtn.innerHTML = '<i class="fas fa-pen-fancy"></i>Creator';
                    upgradeBtn.classList.remove('premium-badge');
                    upgradeBtn.classList.add('admin-badge');
                    upgradeBtn.style.visibility = 'visible';
                    upgradeBtn.style.display = 'flex';
                    return;
                }
                
                if (userData.subscription && userData.subscription.status === 'active' && 
                    userData.subscription.plan === 'premium') {
                    upgradeBtn.innerHTML = '<i class="fas fa-crown"></i>Premium';
                    upgradeBtn.classList.remove('admin-badge');
                    upgradeBtn.classList.add('premium-badge');
                    upgradeBtn.href = '../subscription/subscription.html';
                    upgradeBtn.style.visibility = 'visible';
                    upgradeBtn.style.display = 'flex';
                    return;
                }
            }
            
            upgradeBtn.innerHTML = '<i class="fas fa-star"></i>Upgrade';
            upgradeBtn.classList.remove('premium-badge', 'admin-badge');
            upgradeBtn.href = '../subscription/subscription.html';
            upgradeBtn.style.visibility = 'visible';
            upgradeBtn.style.display = 'flex';
            
        } catch (error) {
            console.error('Error checking subscription status:', error);
            if (upgradeBtn && userId) {
                upgradeBtn.innerHTML = '<i class="fas fa-star"></i>Upgrade';
                upgradeBtn.classList.remove('premium-badge', 'admin-badge');
                upgradeBtn.style.visibility = 'visible';
                upgradeBtn.style.display = 'flex';
            } else if (upgradeBtn) {
                upgradeBtn.style.display = 'none';
            }
        }
    };

    // Set up auth state listener
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            // Immediately update with basic user info from auth
            if (userName) userName.textContent = user.displayName || 'User';
            if (userEmail) userEmail.textContent = user.email;
            
            // Update avatar with auth data first
            if (user.photoURL) {
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
                if (avatarImage) avatarImage.style.display = 'none';
                if (avatarImageDropdown) avatarImageDropdown.style.display = 'none';
                
                const initials = (user.displayName || '').split(' ').map(n => n[0]).join('').toUpperCase();
                
                if (avatarInitials) {
                    avatarInitials.style.display = 'flex';
                    avatarInitials.textContent = initials || 'JN';
                }
                if (avatarInitialsDropdown) {
                    avatarInitialsDropdown.style.display = 'flex';
                    avatarInitialsDropdown.textContent = initials || 'JN';
                }
            }

            // Show basic menu immediately
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
                    <a href="../user-account/account.html">
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

                // Add logout functionality immediately
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
                
                highlightCurrentPage();
            }

            // Set up notifications and upgrade button in parallel
            Promise.all([
                setupNotificationListener(user.uid),
                manageUpgradeButton(user.uid)
            ]).catch(error => {
                console.error('Error setting up notifications or upgrade button:', error);
            });

            // Load Firestore data in the background
            try {
                const userData = await ensureUserInFirestore(user);
                
                if (userData) {
                    // Update with Firestore data if available
                    if (userName) userName.textContent = userData.fullName || user.displayName || 'User';
                    
                    // Update avatar with Firestore data if available
                    if (userData.photoURL) {
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
                    }
                }
            } catch (error) {
                console.error('Error loading Firestore data:', error);
            }
        } else {
            // User is signed out - show guest state immediately
            if (userName) userName.textContent = 'Welcome';
            if (userEmail) userEmail.textContent = 'Sign in to access your account';
            
            if (avatarImage) avatarImage.style.display = 'none';
            if (avatarImageDropdown) avatarImageDropdown.style.display = 'none';
            
            if (avatarInitials) {
                avatarInitials.style.display = 'flex';
                avatarInitials.textContent = '';
                const guestIcon = document.createElement('i');
                guestIcon.className = 'fa-solid fa-circle-user';
                avatarInitials.appendChild(guestIcon);
            }
            
            if (avatarInitialsDropdown) {
                avatarInitialsDropdown.style.display = 'flex';
                avatarInitialsDropdown.textContent = '';
                const guestIconDropdown = document.createElement('i');
                guestIconDropdown.className = 'fa-solid fa-circle-user';
                avatarInitialsDropdown.appendChild(guestIconDropdown);
            }

            if (notificationCount) {
                notificationCount.textContent = '0';
            }
            
            if (notificationListener) {
                notificationListener();
                notificationListener = null;
            }

            if (upgradeBtn) {
                upgradeBtn.style.display = 'none';
            }

            if (menuSections) {
                menuSections.innerHTML = `
                    <div class="guest-welcome">
                        <p>Please sign in to access all features</p>
                    </div>
                    <div class="menu-divider"></div>
                    <a href="../login/login.html" class="sign-in-link">
                        <i class="fas fa-sign-in-alt"></i>
                        Sign In
                    </a>
                `;
            }
        }
    });

    // User menu dropdown toggle
    if (userMenuBtn && dropdownMenu) {
        let isMenuOpen = false;
        dropdownMenu.removeAttribute('style');
        dropdownMenu.classList.remove('show');
        
        window.navMenuFunctions = {
            isOpen: () => isMenuOpen,
            open: () => {
                dropdownMenu.style.display = 'block';
                dropdownMenu.style.opacity = '1';
                dropdownMenu.style.visibility = 'visible';
                dropdownMenu.style.transform = 'translateY(0)';
                dropdownMenu.style.pointerEvents = 'auto';
                dropdownMenu.classList.add('show');
                isMenuOpen = true;
            },
            close: () => {
                dropdownMenu.classList.remove('show');
                setTimeout(() => {
                    if (!isMenuOpen) {
                        dropdownMenu.style.display = 'none';
                        dropdownMenu.style.visibility = 'hidden';
                    }
                }, 300);
                isMenuOpen = false;
            }
        };

        userMenuBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();
            isMenuOpen = !isMenuOpen;
            
            if (isMenuOpen) {
                dropdownMenu.style.display = 'block';
                dropdownMenu.style.opacity = '1';
                dropdownMenu.style.visibility = 'visible';
                dropdownMenu.style.transform = 'translateY(0)';
                dropdownMenu.style.pointerEvents = 'auto';
                dropdownMenu.classList.add('show');
            } else {
                dropdownMenu.classList.remove('show');
                setTimeout(() => {
                    if (!isMenuOpen) {
                        dropdownMenu.style.display = 'none';
                        dropdownMenu.style.visibility = 'hidden';
                    }
                }, 300);
            }
        });

        document.addEventListener('click', (e) => {
            if (isMenuOpen && !userMenuBtn.contains(e.target) && !dropdownMenu.contains(e.target)) {
                isMenuOpen = false;
                dropdownMenu.classList.remove('show');
                setTimeout(() => {
                    if (!isMenuOpen) {
                        dropdownMenu.style.display = 'none';
                        dropdownMenu.style.visibility = 'hidden';
                    }
                }, 300);
            }
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && isMenuOpen) {
                isMenuOpen = false;
                dropdownMenu.classList.remove('show');
                setTimeout(() => {
                    if (!isMenuOpen) {
                        dropdownMenu.style.display = 'none';
                        dropdownMenu.style.visibility = 'hidden';
                    }
                }, 300);
            }
        });
    }

    // Add notification button functionality
    if (notificationsBtn) {
        notificationsBtn.addEventListener('click', () => {
            window.location.href = '../notifications/notifications.html';
        });
    }
});
