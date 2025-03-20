// Import Firebase modules
import { auth, db, doc, getDoc } from '../../Firebase/firebase-config.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js';

// DOM elements for theme
const themeToggle = document.getElementById('theme-toggle');

// DOM elements for user menu
const userMenuBtn = document.getElementById('user-menu-btn');
const userDropdown = document.getElementById('user-dropdown');
const logoutLink = document.getElementById('logout-link');

// DOM elements for user info
const userNameElement = document.getElementById('user-name');
const userEmailElement = document.getElementById('user-email');
const avatarInitials = document.getElementById('avatar-initials');
const avatarInitialsDropdown = document.getElementById('avatar-initials-dropdown');
const avatarImage = document.getElementById('avatar-image');
const avatarImageDropdown = document.getElementById('avatar-image-dropdown');

// DOM elements for content
const loadingContainer = document.querySelector('.loading-container');
const emptyState = document.querySelector('.empty-state');
const postsContainer = document.querySelector('.posts-container');

// Initialize theme
function initTheme() {
    console.log("Initializing theme...");
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.documentElement.classList.add('dark-mode');
        document.body.classList.add('dark-mode');
        if (themeToggle) themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
    } else {
        document.documentElement.classList.remove('dark-mode');
        document.body.classList.remove('dark-mode');
        if (themeToggle) themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
    }
}

// Toggle theme
if (themeToggle) {
    themeToggle.addEventListener('click', () => {
        console.log("Theme toggle clicked");
        if (document.documentElement.classList.contains('dark-mode')) {
            document.documentElement.classList.remove('dark-mode');
            document.body.classList.remove('dark-mode');
            localStorage.setItem('theme', 'light');
            themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
        } else {
            document.documentElement.classList.add('dark-mode');
            document.body.classList.add('dark-mode');
            localStorage.setItem('theme', 'dark');
            themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
        }
    });
}

// Toggle user dropdown
if (userMenuBtn) {
    userMenuBtn.addEventListener('click', (e) => {
        console.log("User menu clicked");
        e.preventDefault();
        e.stopPropagation();
        userDropdown.classList.toggle('show');
    });
}

// Close user dropdown when clicking outside
document.addEventListener('click', (e) => {
    if (userDropdown && !e.target.closest('.user-menu') && userDropdown.classList.contains('show')) {
        userDropdown.classList.remove('show');
    }
});

// Handle sign out
if (logoutLink) {
    logoutLink.addEventListener('click', async (e) => {
        e.preventDefault();
        try {
            await auth.signOut();
            window.location.href = '../login/login.html';
        } catch (error) {
            console.error('Error signing out: ', error);
        }
    });
}

// Get user initials for avatar
function getUserInitials(name) {
    if (!name) return 'U';
    const nameParts = name.split(' ').filter(part => part.length > 0);
    if (nameParts.length === 0) return 'U';
    if (nameParts.length === 1) return nameParts[0].charAt(0).toUpperCase();
    return (nameParts[0].charAt(0) + nameParts[nameParts.length - 1].charAt(0)).toUpperCase();
}

// When DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM loaded, initializing...");
    
    // Initialize theme
    initTheme();
    
    // Show loading state
    if (loadingContainer) loadingContainer.style.display = 'flex';
    if (emptyState) emptyState.style.display = 'none';
    if (postsContainer) postsContainer.style.display = 'none';
    
    // Authenticate user
    onAuthStateChanged(auth, async (user) => {
        console.log("Auth state changed:", user ? "User found" : "No user");
        
        if (user) {
            // User is signed in, update UI
            try {
                // Get user data from Firestore
                const userDoc = await getDoc(doc(db, "users", user.uid));
                const userData = userDoc.exists() ? userDoc.data() : {};
                
                // Update user name
                if (userNameElement) {
                    userNameElement.textContent = userData.fullName || user.displayName || 'User';
                }
                
                // Update user email
                if (userEmailElement) {
                    userEmailElement.textContent = user.email || '';
                }
                
                // Update avatar
                if (userData.photoURL || user.photoURL) {
                    const photoURL = userData.photoURL || user.photoURL;
                    
                    if (avatarImage) {
                        avatarImage.src = photoURL;
                        avatarImage.style.display = 'block';
                        if (avatarInitials) avatarInitials.style.display = 'none';
                    }
                    
                    if (avatarImageDropdown) {
                        avatarImageDropdown.src = photoURL;
                        avatarImageDropdown.style.display = 'block';
                        if (avatarInitialsDropdown) avatarInitialsDropdown.style.display = 'none';
                    }
                } else {
                    // Use initials
                    const initials = getUserInitials(userData.fullName || user.displayName || user.email || 'User');
                    
                    if (avatarInitials) {
                        avatarInitials.textContent = initials;
                        avatarInitials.style.display = 'flex';
                        if (avatarImage) avatarImage.style.display = 'none';
                    }
                    
                    if (avatarInitialsDropdown) {
                        avatarInitialsDropdown.textContent = initials;
                        avatarInitialsDropdown.style.display = 'flex';
                        if (avatarImageDropdown) avatarImageDropdown.style.display = 'none';
                    }
                }
                
                // Show empty state for now (simplified for testing)
                if (loadingContainer) loadingContainer.style.display = 'none';
                if (emptyState) emptyState.style.display = 'flex';
                
            } catch (error) {
                console.error('Error loading user data:', error);
                // Show error state
                if (loadingContainer) loadingContainer.style.display = 'none';
                if (emptyState) {
                    emptyState.style.display = 'flex';
                    emptyState.innerHTML = `
                        <div class="empty-illustration">
                            <i class="fas fa-exclamation-triangle"></i>
                        </div>
                        <h2>Something went wrong</h2>
                        <p>We couldn't load your saved posts. Please try again later.</p>
                    `;
                }
            }
        } else {
            // User is not signed in, redirect to login
            window.location.href = '../login/login.html';
        }
    });
}); 