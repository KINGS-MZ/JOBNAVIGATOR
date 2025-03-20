// DOM Elements
const fullNameInput = document.getElementById('fullName');
const emailInput = document.getElementById('email');
const phoneInput = document.getElementById('phone');
const locationInput = document.getElementById('location');
const saveChangesBtn = document.querySelector('.save-changes-btn');
const themeToggle = document.getElementById('theme-toggle');
const userMenuBtn = document.getElementById('user-menu-btn');
const userDropdown = document.getElementById('user-dropdown');
const logoutLink = document.getElementById('logout-link');
const avatarImage = document.getElementById('avatar-image');
const avatarImageDropdown = document.getElementById('avatar-image-dropdown');
const avatarInitials = document.getElementById('avatar-initials');
const avatarInitialsDropdown = document.getElementById('avatar-initials-dropdown');
const userName = document.getElementById('user-name');
const userEmail = document.getElementById('user-email');
const currentPasswordInput = document.getElementById('currentPassword');
const newPasswordInput = document.getElementById('newPassword');
const confirmPasswordInput = document.getElementById('confirmPassword');
const changePasswordBtn = document.getElementById('changePasswordBtn');
const passwordMessage = document.getElementById('passwordMessage');
const forgotPasswordLink = document.getElementById('forgotPasswordLink');

// User Menu Functionality
function toggleUserMenu(event) {
    event.stopPropagation();
    userDropdown.classList.toggle('show');
    userMenuBtn.classList.toggle('active');
}

// Theme Toggle Functionality
function toggleTheme() {
    const currentTheme = localStorage.getItem('theme') || 'system';
    const newTheme = document.body.classList.contains('dark-mode') ? 'light' : 'dark';
    setTheme(newTheme);
}

// Theme management
function setTheme(theme) {
    const themeButtons = document.querySelectorAll('.theme-btn');
    const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    
    // Remove active class from all buttons
    themeButtons.forEach(btn => btn.classList.remove('active'));
    
    // Add active class to the correct button
    const activeButton = document.querySelector(`.theme-btn[data-theme="${theme}"]`);
    if (activeButton) {
        activeButton.classList.add('active');
    }
    
    // Apply theme
    if (isDark) {
        document.documentElement.classList.add('dark-mode');
        document.body.classList.add('dark-mode');
        themeToggle.querySelector('i').className = 'fas fa-sun';
    } else {
        document.documentElement.classList.remove('dark-mode');
        document.body.classList.remove('dark-mode');
        themeToggle.querySelector('i').className = 'fas fa-moon';
    }
    
    localStorage.setItem('theme', theme);
}

// Update user info in UI
function updateUserInfo(userData, user) {
    // Update form fields
    fullNameInput.value = userData.fullName || '';
    emailInput.value = userData.email || user.email;
    phoneInput.value = userData.phone || '';
    locationInput.value = userData.location || '';
    
    // Update user info in dropdown
    userName.textContent = userData.fullName || user.displayName || 'Guest User';
    userEmail.textContent = user.email;
    
    // Handle avatar - first check for photoURL in Firestore
    if (userData.photoURL) {
        // User has a profile picture in Firestore
        avatarImage.src = userData.photoURL;
        avatarImage.style.display = 'block';
        avatarImageDropdown.src = userData.photoURL;
        avatarImageDropdown.style.display = 'block';
        avatarInitials.style.display = 'none';
        avatarInitialsDropdown.style.display = 'none';
    } else if (user.photoURL) {
        // Fallback to Auth profile picture
        avatarImage.src = user.photoURL;
        avatarImage.style.display = 'block';
        avatarImageDropdown.src = user.photoURL;
        avatarImageDropdown.style.display = 'block';
        avatarInitials.style.display = 'none';
        avatarInitialsDropdown.style.display = 'none';
    } else {
        // No profile picture, show initials
        avatarImage.style.display = 'none';
        avatarImageDropdown.style.display = 'none';
        avatarInitials.style.display = 'flex';
        avatarInitialsDropdown.style.display = 'flex';
        
        const initials = userData.fullName 
            ? userData.fullName.split(' ').map(name => name[0]).join('').toUpperCase()
            : user.displayName 
                ? user.displayName.split(' ').map(name => name[0]).join('').toUpperCase()
                : user.email ? user.email[0].toUpperCase() : 'JN';
            
        avatarInitials.textContent = initials;
        avatarInitialsDropdown.textContent = initials;
    }
}

// Load user profile data from Firestore
async function loadUserProfile() {
    const user = firebase.auth().currentUser;
    if (!user) {
        console.log('No user found, redirecting to login');
        window.location.href = '../../index.html';
        return;
    }

    try {
        console.log('Loading profile for user:', user.uid);
        // First try to get the user document
        const userRef = firebase.firestore().collection('users').doc(user.uid);
        const userDoc = await userRef.get();

        if (userDoc.exists) {
            console.log('User document found');
            const userData = userDoc.data();
            
            // If user has a photoURL in auth but not in Firestore, update Firestore
            if (user.photoURL && !userData.photoURL) {
                await userRef.update({
                    photoURL: user.photoURL
                });
                userData.photoURL = user.photoURL;
            }
            
            updateUserInfo(userData, user);
        } else {
            console.log('Creating new user document');
            // If no document exists, create one with default values
            const defaultUserData = {
                fullName: user.displayName || '',
                email: user.email,
                phone: '',
                location: '',
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                uid: user.uid
            };
            
            // If user has a photo URL from auth, save it to Firestore
            if (user.photoURL) {
                defaultUserData.photoURL = user.photoURL;
            }
            
            // Create the user document
            await userRef.set(defaultUserData);
            
            // Update the UI with default data
            updateUserInfo(defaultUserData, user);
        }
    } catch (error) {
        console.error('Error loading user profile:', error);
        // Show more detailed error message
        alert('Error loading profile data: ' + error.message);
    }
}

// Save profile changes to Firestore
async function saveProfileChanges() {
    const user = firebase.auth().currentUser;
    if (!user) {
        alert('You must be logged in to save changes');
        return;
    }

    try {
        // Show loading state
        saveChangesBtn.disabled = true;
        saveChangesBtn.textContent = 'Saving...';
        
        // Prepare data to update
        const updatedData = {
            fullName: fullNameInput.value,
            email: emailInput.value,
            phone: phoneInput.value,
            location: locationInput.value,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        // Update Firestore
        await firebase.firestore().collection('users').doc(user.uid).update(updatedData);
        
        // Get the updated user data
        const userDoc = await firebase.firestore().collection('users').doc(user.uid).get();
        const userData = userDoc.data();
        
        // Update UI
        updateUserInfo(userData, user);
        
        // Show success message
        alert('Profile updated successfully!');
    } catch (error) {
        console.error('Error saving profile:', error);
        alert('Error saving profile: ' + error.message);
    } finally {
        // Reset button state
        saveChangesBtn.disabled = false;
        saveChangesBtn.textContent = 'Save Changes';
    }
}

// Show message function
function showMessage(message, type) {
    passwordMessage.textContent = message;
    passwordMessage.className = `message-container ${type}`;
    passwordMessage.innerHTML = `<i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i>${message}`;
    
    // Clear message after 5 seconds
    setTimeout(() => {
        passwordMessage.className = 'message-container';
    }, 5000);
}

// Change password function
async function changePassword() {
    const currentPassword = currentPasswordInput.value;
    const newPassword = newPasswordInput.value;
    const confirmPassword = confirmPasswordInput.value;

    // Validate inputs
    if (!currentPassword || !newPassword || !confirmPassword) {
        showMessage('Please fill in all password fields', 'error');
        return;
    }

    if (newPassword !== confirmPassword) {
        showMessage('New passwords do not match', 'error');
        return;
    }

    if (newPassword.length < 6) {
        showMessage('New password must be at least 6 characters long', 'error');
        return;
    }

    const user = firebase.auth().currentUser;
    if (!user) {
        showMessage('You must be logged in to change your password', 'error');
        return;
    }

    try {
        // Reauthenticate user
        const credential = firebase.auth.EmailAuthProvider.credential(
            user.email,
            currentPassword
        );
        await user.reauthenticateWithCredential(credential);

        // Update password
        await user.updatePassword(newPassword);

        // Clear form
        currentPasswordInput.value = '';
        newPasswordInput.value = '';
        confirmPasswordInput.value = '';

        showMessage('Password updated successfully!', 'success');
    } catch (error) {
        console.error('Error changing password:', error);
        let errorMessage = 'Error changing password';
        
        switch (error.code) {
            case 'auth/wrong-password':
                errorMessage = 'Current password is incorrect';
                break;
            case 'auth/weak-password':
                errorMessage = 'New password is too weak';
                break;
            case 'auth/requires-recent-login':
                errorMessage = 'Please log in again to change your password';
                break;
            default:
                errorMessage = error.message;
        }
        
        showMessage(errorMessage, 'error');
    }
}

// Forgot password function
function handleForgotPassword(event) {
    event.preventDefault();
    const email = firebase.auth().currentUser?.email;
    
    if (!email) {
        showMessage('Please log in to reset your password', 'error');
        return;
    }

    firebase.auth().sendPasswordResetEmail(email)
        .then(() => {
            showMessage('Password reset email sent! Please check your inbox.', 'success');
        })
        .catch((error) => {
            console.error('Error sending password reset email:', error);
            showMessage('Error sending password reset email: ' + error.message, 'error');
        });
}

// Document Ready
document.addEventListener('DOMContentLoaded', () => {
    // Close dropdown when clicking outside
    document.addEventListener('click', (event) => {
        if (userDropdown.classList.contains('show') && 
            !userMenuBtn.contains(event.target) && 
            !userDropdown.contains(event.target)) {
            userDropdown.classList.remove('show');
            userMenuBtn.classList.remove('active');
        }
    });

    // Theme button initialization
    const themeButtons = document.querySelectorAll('.theme-btn');
    const savedTheme = localStorage.getItem('theme') || 'system';
    
    // Initialize theme
    setTheme(savedTheme);
    
    // Theme button click handlers
    themeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const theme = btn.dataset.theme;
            setTheme(theme);
        });
    });

    // System theme change listener
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        if (localStorage.getItem('theme') === 'system') {
            setTheme('system');
        }
    });

    // Event Listeners
    if (themeToggle) {
        themeToggle.addEventListener('click', toggleTheme);
    }
    
    if (userMenuBtn) {
        userMenuBtn.addEventListener('click', toggleUserMenu);
    }

    if (saveChangesBtn) {
        saveChangesBtn.addEventListener('click', saveProfileChanges);
    }

    if (logoutLink) {
        logoutLink.addEventListener('click', (event) => {
            event.preventDefault();
            firebase.auth().signOut().then(() => {
                window.location.href = '../login/login.html';
            }).catch((error) => {
                console.error('Error signing out:', error);
            });
        });
    }

    // Listen for auth state changes
    firebase.auth().onAuthStateChanged((user) => {
        if (user) {
            console.log('User is signed in:', user.email);
            console.log('User display name:', user.displayName);
            console.log('User photo URL:', user.photoURL);
            loadUserProfile();
            
            // Update menu content for signed-in users
            const menuSections = document.querySelector('.menu-sections');
            if (menuSections) {
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
                    <a href="settings.html">
                        <i class="fas fa-cog"></i>
                        Settings
                    </a>
                    <div class="menu-divider"></div>
                    <a href="#" id="logout-link" class="logout-link">
                        <i class="fas fa-sign-out-alt"></i>
                        Sign Out
                    </a>
                `;
                
                // Reattach logout event listener
                const logoutLink = document.getElementById('logout-link');
                if (logoutLink) {
                    logoutLink.addEventListener('click', (event) => {
                        event.preventDefault();
                        firebase.auth().signOut().then(() => {
                            window.location.href = '../login/login.html';
                        }).catch((error) => {
                            console.error('Error signing out:', error);
                        });
                    });
                }
            }
        } else {
            console.log('No user is signed in, redirecting to login');
            window.location.href = '../login/login.html';
        }
    });

    // Add event listeners for password change
    if (changePasswordBtn) {
        changePasswordBtn.addEventListener('click', changePassword);
    }

    if (forgotPasswordLink) {
        forgotPasswordLink.addEventListener('click', handleForgotPassword);
    }
});
