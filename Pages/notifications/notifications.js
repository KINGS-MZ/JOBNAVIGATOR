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

    // Load notifications
    loadNotifications();
});

// Example notifications data
const notifications = {
    job_updates: [
        {
            id: 1,
            title: "Application Status Updated",
            text: "Your application for Senior Software Engineer at Google has been reviewed and moved to the next stage.",
            type: "job_update",
            timestamp: new Date(Date.now() - 1000 * 60 * 30), // 30 minutes ago
            read: false,
            link: "#"
        },
        {
            id: 2,
            title: "Interview Scheduled",
            text: "You have been invited for a technical interview with Microsoft for the Full Stack Developer position.",
            type: "job_update",
            timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
            read: true,
            link: "#"
        }
    ],
    job_alerts: [
        {
            id: 3,
            title: "New Job Matches",
            text: "3 new jobs match your search criteria for 'Frontend Developer' in 'New York'.",
            type: "job_alert",
            timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5), // 5 hours ago
            read: false,
            link: "#"
        }
    ]
};

// Format timestamp to human-readable format
function formatTimestamp(timestamp) {
    const now = new Date();
    const diff = now - timestamp;
    
    if (diff < 60000) { // Less than 1 minute
        return 'Just now';
    } else if (diff < 3600000) { // Less than 1 hour
        const minutes = Math.floor(diff / 60000);
        return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
    } else if (diff < 86400000) { // Less than 1 day
        const hours = Math.floor(diff / 3600000);
        return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
    } else if (diff < 604800000) { // Less than 1 week
        const days = Math.floor(diff / 86400000);
        return `${days} day${days !== 1 ? 's' : ''} ago`;
    } else {
        return timestamp.toLocaleDateString();
    }
}

// Create notification element
function createNotificationElement(notification) {
    const notificationElement = document.createElement('div');
    notificationElement.className = `notification-item ${notification.read ? '' : 'unread'}`;
    
    const icon = getNotificationIcon(notification.type);
    
    notificationElement.innerHTML = `
        <div class="notification-icon">
            <i class="${icon}"></i>
        </div>
        <div class="notification-content">
            <h3 class="notification-title">${notification.title}</h3>
            <p class="notification-text">${notification.text}</p>
            <div class="notification-meta">
                <span class="notification-type">${formatNotificationType(notification.type)}</span>
                <span class="notification-time">${formatTimestamp(notification.timestamp)}</span>
            </div>
        </div>
        <div class="notification-actions">
            <button class="action-btn mark-read" title="Mark as read">
                <i class="fas fa-check"></i>
            </button>
            <button class="action-btn delete" title="Delete">
                <i class="fas fa-trash"></i>
            </button>
        </div>
    `;

    // Add event listeners
    const markReadBtn = notificationElement.querySelector('.mark-read');
    const deleteBtn = notificationElement.querySelector('.delete');

    markReadBtn.addEventListener('click', () => markAsRead(notification.id));
    deleteBtn.addEventListener('click', () => deleteNotification(notification.id));

    return notificationElement;
}

// Get notification icon based on type
function getNotificationIcon(type) {
    switch (type) {
        case 'job_update':
            return 'fas fa-briefcase';
        case 'job_alert':
            return 'fas fa-bell';
        default:
            return 'fas fa-info-circle';
    }
}

// Format notification type for display
function formatNotificationType(type) {
    return type.split('_').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
}

// Load notifications into their respective groups
function loadNotifications() {
    const jobUpdatesGroup = document.querySelector('.job-updates-group');
    const jobAlertsGroup = document.querySelector('.job-alerts-group');
    
    // Clear existing notifications
    jobUpdatesGroup.innerHTML = `
        <div class="group-header">
            <h2>Job Application Updates</h2>
            <span class="group-count">${notifications.job_updates.length} notifications</span>
        </div>
    `;
    
    jobAlertsGroup.innerHTML = `
        <div class="group-header">
            <h2>Job Alerts</h2>
            <span class="group-count">${notifications.job_alerts.length} notification</span>
        </div>
    `;

    // Add notifications to their groups
    notifications.job_updates.forEach(notification => {
        jobUpdatesGroup.appendChild(createNotificationElement(notification));
    });

    notifications.job_alerts.forEach(notification => {
        jobAlertsGroup.appendChild(createNotificationElement(notification));
    });
}

// Mark notification as read
function markAsRead(notificationId) {
    // Find and update the notification
    for (const type in notifications) {
        const notification = notifications[type].find(n => n.id === notificationId);
        if (notification) {
            notification.read = true;
            break;
        }
    }
    
    // Reload notifications to update the UI
    loadNotifications();
}

// Delete notification
function deleteNotification(notificationId) {
    // Remove the notification from all types
    for (const type in notifications) {
        notifications[type] = notifications[type].filter(n => n.id !== notificationId);
    }
    
    // Reload notifications to update the UI
    loadNotifications();
}

// Mark all notifications as read
function markAllAsRead() {
    for (const type in notifications) {
        notifications[type].forEach(notification => {
            notification.read = true;
        });
    }
    
    // Reload notifications to update the UI
    loadNotifications();
}

// Initialize notifications when the page loads
document.addEventListener('DOMContentLoaded', () => {
    loadNotifications();
    
    // Add event listener for "Mark All as Read" button
    const markAllReadBtn = document.querySelector('.mark-all-read');
    if (markAllReadBtn) {
        markAllReadBtn.addEventListener('click', markAllAsRead);
    }
}); 