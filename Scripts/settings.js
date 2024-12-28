// DOM Elements
const settingsTabs = document.querySelectorAll('.settings-nav-item');
const settingsContent = document.querySelectorAll('.settings-tab');
const themeSelect = document.getElementById('theme-select');
const toggleInputs = document.querySelectorAll('.toggle-switch input');
const securityForm = document.getElementById('security-form');
const notificationForm = document.getElementById('notification-form');

// Firebase Auth
const auth = firebase.auth();
const db = firebase.firestore();

// UI Helpers
function showLoader() {
    document.querySelector('.loader').style.display = 'flex';
}

function hideLoader() {
    document.querySelector('.loader').style.display = 'none';
}

function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// Load User Settings
async function loadUserSettings() {
    try {
        showLoader();
        
        const doc = await db.collection('users').doc(auth.currentUser.uid).get();
        if (doc.exists) {
            const data = doc.data();
            
            // Update theme
            if (data.preferences?.theme) {
                themeSelect.value = data.preferences.theme;
                document.body.setAttribute('data-theme', data.preferences.theme);
            }
            
            // Update notification settings
            if (data.notifications) {
                Object.entries(data.notifications).forEach(([key, value]) => {
                    const toggle = document.getElementById(key);
                    if (toggle) toggle.checked = value;
                });
            }
        }
        
        hideLoader();
    } catch (error) {
        console.error('Error loading settings:', error);
        hideLoader();
        showToast('Error loading settings', 'error');
    }
}

// Tab Navigation
settingsTabs.forEach(tab => {
    tab.addEventListener('click', () => {
        // Remove active class from all tabs
        settingsTabs.forEach(t => t.classList.remove('active'));
        settingsContent.forEach(c => c.classList.remove('active'));
        
        // Add active class to clicked tab
        tab.classList.add('active');
        const targetId = tab.dataset.tab + '-settings';
        document.getElementById(targetId).classList.add('active');
    });
});

// Theme Selection
themeSelect.addEventListener('change', async (e) => {
    const theme = e.target.value;
    document.body.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    
    try {
        await db.collection('users').doc(auth.currentUser.uid).update({
            'preferences.theme': theme
        });
        showToast('Theme updated successfully', 'success');
    } catch (error) {
        console.error('Error saving theme preference:', error);
        showToast('Error saving theme', 'error');
    }
});

// Security Settings
securityForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const currentPassword = securityForm.currentPassword.value;
    const newPassword = securityForm.newPassword.value;
    const confirmPassword = securityForm.confirmPassword.value;
    
    if (newPassword !== confirmPassword) {
        showToast('New passwords do not match!', 'error');
        return;
    }
    
    try {
        showLoader();
        
        // Get credentials
        const credential = firebase.auth.EmailAuthProvider.credential(
            auth.currentUser.email,
            currentPassword
        );
        
        // Reauthenticate user
        await auth.currentUser.reauthenticateWithCredential(credential);
        
        // Update password
        await auth.currentUser.updatePassword(newPassword);
        
        showToast('Password updated successfully', 'success');
        securityForm.reset();
        hideLoader();
    } catch (error) {
        console.error('Error updating password:', error);
        hideLoader();
        showToast(error.message, 'error');
    }
});

// Notification Settings
toggleInputs.forEach(input => {
    input.addEventListener('change', async (e) => {
        const setting = e.target.id;
        const value = e.target.checked;
        
        try {
            await db.collection('users').doc(auth.currentUser.uid).update({
                [`notifications.${setting}`]: value,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            showToast('Notification settings updated', 'success');
        } catch (error) {
            console.error('Error updating notification settings:', error);
            showToast('Error updating settings', 'error');
            // Revert toggle if update fails
            e.target.checked = !value;
        }
    });
});

// Initialize settings
document.addEventListener('DOMContentLoaded', () => {
    // Check authentication
    auth.onAuthStateChanged(user => {
        if (user) {
            loadUserSettings();
        } else {
            window.location.href = 'login.html';
        }
    });
});
