import { 
    auth
} from '../../Firebase/firebase-config.js';
import { 
    onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js';

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

document.addEventListener('DOMContentLoaded', () => {
    // Theme buttons
    const themeButtons = document.querySelectorAll('.theme-btn');
    themeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            themeButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            const theme = btn.dataset.theme;
            if (theme === 'dark') {
                document.body.classList.add('dark-mode');
                localStorage.setItem('theme', 'dark');
            } else if (theme === 'light') {
                document.body.classList.remove('dark-mode');
                localStorage.setItem('theme', 'light');
            } else {
                // System theme
                if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
                    document.body.classList.add('dark-mode');
                } else {
                    document.body.classList.remove('dark-mode');
                }
                localStorage.setItem('theme', 'system');
                
                // Listen for system theme changes
                window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
                    if (localStorage.getItem('theme') === 'system') {
                        if (e.matches) {
                            document.body.classList.add('dark-mode');
                        } else {
                            document.body.classList.remove('dark-mode');
                        }
                    }
                });
            }
        });
    });

    // Load saved theme
    const savedTheme = localStorage.getItem('theme') || 'system';
    const themeBtn = document.querySelector(`[data-theme="${savedTheme}"]`);
    if (themeBtn) {
        themeBtn.click();
    }

    // Form handling
    const settingsForm = document.querySelector('.settings-container');
    const saveButton = document.querySelector('.btn-primary');
    const cancelButton = document.querySelector('.btn-secondary');
    const deleteAccountButton = document.getElementById('deleteAccount');
    const forgotPasswordLink = document.getElementById('forgotPasswordLink');

    // Load saved settings
    loadSavedSettings();

    saveButton.addEventListener('click', () => {
        // Collect form data
        const settings = {
            profile: {
                fullName: document.getElementById('fullName').value,
                email: document.getElementById('email').value,
                phone: document.getElementById('phone').value,
                location: document.getElementById('location').value
            },
            notifications: {
                email: document.getElementById('emailNotif').checked,
                jobAlerts: document.getElementById('jobAlerts').checked,
                courseUpdates: document.getElementById('courseUpdates').checked,
                newsletter: document.getElementById('newsletter').checked
            },
            privacy: {
                profileVisibility: document.getElementById('profileVisibility').checked,
                resumeVisibility: document.getElementById('resumeVisibility').checked,
                activityStatus: document.getElementById('activityStatus').checked
            },
            preferences: {
                language: document.getElementById('language').value,
                timezone: document.getElementById('timezone').value
            },
            theme: localStorage.getItem('theme') || 'system'
        };

        // Save to localStorage
        localStorage.setItem('userSettings', JSON.stringify(settings));

        // Show success message
        showNotification('Settings saved successfully!', 'success');
    });

    cancelButton.addEventListener('click', () => {
        // Reset form to last saved settings
        loadSavedSettings();
        showNotification('Changes discarded', 'info');
    });

    // Forgot password handling
    forgotPasswordLink.addEventListener('click', (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value;
        if (email) {
            // Here you would typically make an API call to trigger password reset
            showNotification('Password reset link sent to your email!', 'info');
        } else {
            showNotification('Please enter your email address first', 'error');
        }
    });

    // Delete account handling
    deleteAccountButton.addEventListener('click', () => {
        if (confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
            // Here you would typically make an API call to delete the account
            showNotification('Account scheduled for deletion', 'warning');
            setTimeout(() => {
                window.location.href = '../../index.html';
            }, 2000);
        }
    });

    // Theme Toggle
    const themeToggle = document.getElementById('theme-toggle');
    const themeIcon = themeToggle.querySelector('i');

    // Initialize theme
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const storedTheme = localStorage.getItem('theme');
    const isDark = storedTheme ? storedTheme === 'dark' : prefersDark;

    if (isDark) {
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

    // Handle logout
    const logoutLink = document.getElementById('logout-link');
    if (logoutLink) {
        logoutLink.addEventListener('click', (event) => {
            event.preventDefault();
            auth.signOut().then(() => {
                window.location.href = '/Pages/login/login.html';
            }).catch((error) => {
                console.error('Error signing out:', error);
            });
        });
    }
});

function loadSavedSettings() {
    const savedSettings = JSON.parse(localStorage.getItem('userSettings') || '{}');
    
    // Restore profile settings
    if (savedSettings.profile) {
        document.getElementById('fullName').value = savedSettings.profile.fullName || '';
        document.getElementById('email').value = savedSettings.profile.email || '';
        document.getElementById('phone').value = savedSettings.profile.phone || '';
        document.getElementById('location').value = savedSettings.profile.location || '';
    }

    // Restore notification settings
    if (savedSettings.notifications) {
        document.getElementById('emailNotif').checked = savedSettings.notifications.email ?? true;
        document.getElementById('jobAlerts').checked = savedSettings.notifications.jobAlerts ?? true;
        document.getElementById('courseUpdates').checked = savedSettings.notifications.courseUpdates ?? false;
        document.getElementById('newsletter').checked = savedSettings.notifications.newsletter ?? false;
    }

    // Restore privacy settings
    if (savedSettings.privacy) {
        document.getElementById('profileVisibility').checked = savedSettings.privacy.profileVisibility ?? true;
        document.getElementById('resumeVisibility').checked = savedSettings.privacy.resumeVisibility ?? true;
        document.getElementById('activityStatus').checked = savedSettings.privacy.activityStatus ?? false;
    }

    // Restore preferences
    if (savedSettings.preferences) {
        document.getElementById('language').value = savedSettings.preferences.language || 'en';
        document.getElementById('timezone').value = savedSettings.preferences.timezone || 'UTC';
    }
}

function showNotification(message, type = 'success') {
    // Remove any existing notifications
    const existingNotification = document.querySelector('.notification');
    if (existingNotification) {
        existingNotification.remove();
    }

    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    // Style the notification
    Object.assign(notification.style, {
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        padding: '1rem 2rem',
        backgroundColor: getNotificationColor(type),
        color: 'white',
        borderRadius: '8px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        zIndex: '1000',
        opacity: '0',
        transform: 'translateY(20px)',
        transition: 'all 0.3s ease'
    });

    // Add to document
    document.body.appendChild(notification);

    // Trigger animation
    setTimeout(() => {
        notification.style.opacity = '1';
        notification.style.transform = 'translateY(0)';
    }, 100);

    // Remove after 3 seconds
    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transform = 'translateY(20px)';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

function getNotificationColor(type) {
    switch (type) {
        case 'success':
            return '#2ecc71';
        case 'error':
            return '#e74c3c';
        case 'warning':
            return '#f1c40f';
        case 'info':
            return '#3498db';
        default:
            return '#2ecc71';
    }
}
