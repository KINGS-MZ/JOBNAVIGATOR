// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyDxGxwXwXwXwXwXwXwXwXwXwXwXwXwXwXw",
    authDomain: "your-auth-domain.firebaseapp.com",
    projectId: "your-project-id",
    storageBucket: "your-storage-bucket.appspot.com",
    messagingSenderId: "your-messaging-sender-id",
    appId: "your-app-id"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Check authentication state
firebase.auth().onAuthStateChanged((user) => {
    if (user) {
        // User is signed in
        updateUserInfo(user);
        loadNotifications(user.uid);
    } else {
        // User is signed out, redirect to login
        window.location.href = '../login/login.html';
    }
});

// Update user information in the navbar
function updateUserInfo(user) {
    const userAvatar = document.querySelector('.user-avatar');
    const userName = document.querySelector('.user-name');
    const userEmail = document.querySelector('.user-email');
    const userInitials = document.querySelector('.user-initials');

    // Set user name and email
    userName.textContent = user.displayName || 'User';
    userEmail.textContent = user.email;

    // Handle profile picture
    if (user.photoURL) {
        userAvatar.src = user.photoURL;
        userAvatar.style.display = 'block';
        userInitials.style.display = 'none';
    } else {
        // Generate initials from name
        const initials = (user.displayName || 'U')
            .split(' ')
            .map(n => n[0])
            .join('')
            .toUpperCase();
        userInitials.textContent = initials;
        userInitials.style.display = 'flex';
        userAvatar.style.display = 'none';
    }
}

// Load notifications from Firebase
function loadNotifications(userId) {
    const notificationsRef = firebase.firestore().collection('users').doc(userId).collection('notifications');
    
    notificationsRef.orderBy('timestamp', 'desc').get().then((snapshot) => {
        const notificationsContainer = document.querySelector('.notifications-container');
        const jobUpdatesGroup = document.querySelector('.job-updates-group');
        const jobAlertsGroup = document.querySelector('.job-alerts-group');
        const courseUpdatesGroup = document.querySelector('.course-updates-group');
        const systemGroup = document.querySelector('.system-group');

        // Clear existing notifications
        jobUpdatesGroup.innerHTML = '<h2>Job Application Updates</h2>';
        jobAlertsGroup.innerHTML = '<h2>Job Alerts</h2>';
        courseUpdatesGroup.innerHTML = '<h2>Course Updates</h2>';
        systemGroup.innerHTML = '<h2>System Notifications</h2>';

        let hasNotifications = false;

        snapshot.forEach((doc) => {
            const notification = doc.data();
            hasNotifications = true;
            
            // Create notification element
            const notificationElement = createNotificationElement(notification, doc.id);
            
            // Add to appropriate group based on type
            switch (notification.type) {
                case 'job_update':
                    jobUpdatesGroup.appendChild(notificationElement);
                    break;
                case 'job_alert':
                    jobAlertsGroup.appendChild(notificationElement);
                    break;
                case 'course_update':
                    courseUpdatesGroup.appendChild(notificationElement);
                    break;
                case 'system':
                    systemGroup.appendChild(notificationElement);
                    break;
            }
        });

        // Show/hide empty state
        const emptyState = document.querySelector('.empty-state');
        if (emptyState) {
            emptyState.style.display = hasNotifications ? 'none' : 'block';
        }
    }).catch((error) => {
        console.error('Error loading notifications:', error);
        showError('Failed to load notifications. Please try again later.');
    });
}

// Create notification element
function createNotificationElement(notification, id) {
    const div = document.createElement('div');
    div.className = `notification-item ${notification.read ? '' : 'unread'}`;
    div.dataset.id = id;

    const icon = getNotificationIcon(notification.type);
    const timestamp = formatTimestamp(notification.timestamp);

    div.innerHTML = `
        <div class="notification-icon">
            <i class="fas ${icon}"></i>
        </div>
        <div class="notification-content">
            <h3 class="notification-title">${notification.title}</h3>
            <p class="notification-text">${notification.text}</p>
            <div class="notification-meta">
                <span class="notification-type">${formatNotificationType(notification.type)}</span>
                <span class="notification-time">${timestamp}</span>
            </div>
        </div>
        <div class="notification-actions">
            ${!notification.read ? `
                <button class="action-btn mark-read" title="Mark as read">
                    <i class="fas fa-check"></i>
                </button>
            ` : ''}
            <button class="action-btn delete" title="Delete notification">
                <i class="fas fa-trash"></i>
            </button>
        </div>
    `;

    // Add event listeners
    const markReadBtn = div.querySelector('.mark-read');
    if (markReadBtn) {
        markReadBtn.addEventListener('click', () => markAsRead(id));
    }

    const deleteBtn = div.querySelector('.delete');
    deleteBtn.addEventListener('click', () => deleteNotification(id));

    return div;
}

// Get notification icon based on type
function getNotificationIcon(type) {
    switch (type) {
        case 'job_update':
            return 'fa-briefcase';
        case 'job_alert':
            return 'fa-bell';
        case 'course_update':
            return 'fa-graduation-cap';
        case 'system':
            return 'fa-info-circle';
        default:
            return 'fa-bell';
    }
}

// Format notification type for display
function formatNotificationType(type) {
    return type.split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

// Format timestamp
function formatTimestamp(timestamp) {
    if (!timestamp) return '';
    
    const date = timestamp.toDate();
    const now = new Date();
    const diff = now - date;
    
    // Less than 1 minute
    if (diff < 60000) {
        return 'Just now';
    }
    // Less than 1 hour
    if (diff < 3600000) {
        const minutes = Math.floor(diff / 60000);
        return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} ago`;
    }
    // Less than 24 hours
    if (diff < 86400000) {
        const hours = Math.floor(diff / 3600000);
        return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
    }
    // Less than 7 days
    if (diff < 604800000) {
        const days = Math.floor(diff / 86400000);
        return `${days} ${days === 1 ? 'day' : 'days'} ago`;
    }
    // Otherwise, show date
    return date.toLocaleDateString();
}

// Mark notification as read
function markAsRead(notificationId) {
    const userId = firebase.auth().currentUser.uid;
    const notificationRef = firebase.firestore()
        .collection('users')
        .doc(userId)
        .collection('notifications')
        .doc(notificationId);

    notificationRef.update({
        read: true
    }).then(() => {
        // Update UI
        const notificationElement = document.querySelector(`[data-id="${notificationId}"]`);
        if (notificationElement) {
            notificationElement.classList.remove('unread');
            const markReadBtn = notificationElement.querySelector('.mark-read');
            if (markReadBtn) {
                markReadBtn.remove();
            }
        }
    }).catch((error) => {
        console.error('Error marking notification as read:', error);
        showError('Failed to mark notification as read. Please try again.');
    });
}

// Delete notification
function deleteNotification(notificationId) {
    const userId = firebase.auth().currentUser.uid;
    const notificationRef = firebase.firestore()
        .collection('users')
        .doc(userId)
        .collection('notifications')
        .doc(notificationId);

    notificationRef.delete().then(() => {
        // Remove from UI
        const notificationElement = document.querySelector(`[data-id="${notificationId}"]`);
        if (notificationElement) {
            notificationElement.remove();
        }
    }).catch((error) => {
        console.error('Error deleting notification:', error);
        showError('Failed to delete notification. Please try again.');
    });
}

// Mark all notifications as read
function markAllAsRead() {
    const userId = firebase.auth().currentUser.uid;
    const notificationsRef = firebase.firestore()
        .collection('users')
        .doc(userId)
        .collection('notifications');

    notificationsRef.get().then((snapshot) => {
        const batch = firebase.firestore().batch();
        
        snapshot.forEach((doc) => {
            if (!doc.data().read) {
                batch.update(doc.ref, { read: true });
            }
        });

        return batch.commit();
    }).then(() => {
        // Update UI
        document.querySelectorAll('.notification-item.unread').forEach(item => {
            item.classList.remove('unread');
            const markReadBtn = item.querySelector('.mark-read');
            if (markReadBtn) {
                markReadBtn.remove();
            }
        });
    }).catch((error) => {
        console.error('Error marking all notifications as read:', error);
        showError('Failed to mark all notifications as read. Please try again.');
    });
}

// Show error message
function showError(message) {
    // Create error element
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;

    // Add to page
    const container = document.querySelector('.notifications-container');
    container.insertBefore(errorDiv, container.firstChild);

    // Remove after 5 seconds
    setTimeout(() => {
        errorDiv.remove();
    }, 5000);
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    // Mark all as read button
    const markAllReadBtn = document.querySelector('.mark-all-read');
    if (markAllReadBtn) {
        markAllReadBtn.addEventListener('click', markAllAsRead);
    }

    // Theme toggle
    const themeToggle = document.querySelector('.theme-toggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            document.body.classList.toggle('dark-mode');
            const isDarkMode = document.body.classList.contains('dark-mode');
            localStorage.setItem('darkMode', isDarkMode);
        });

        // Check saved theme preference
        const savedTheme = localStorage.getItem('darkMode');
        if (savedTheme === 'true') {
            document.body.classList.add('dark-mode');
        }
    }
}); 