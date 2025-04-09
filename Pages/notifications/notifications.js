// Global variable to track if authentication is complete
let authenticationComplete = false;
let currentAuthenticatedUser = null;

// Show auth status banner immediately
document.addEventListener('DOMContentLoaded', () => {
    const authBanner = document.getElementById('auth-status-banner');
    if (authBanner) {
        authBanner.style.display = 'block';
    }
    
    // Add event listener for reload button
    const reloadBtn = document.querySelector('.reload-notifications');
    if (reloadBtn) {
        reloadBtn.addEventListener('click', () => {
            console.log("Manual reload requested");
            window.location.reload();
        });
    }
    
    console.log("DOM Content Loaded - checking auth state");
    
    // Check if authentication is already complete
    if (authenticationComplete && currentAuthenticatedUser) {
        console.log("Auth already complete, initializing notifications");
        initializeNotifications();
    } else {
        console.log("Waiting for authentication to complete");
        // The onAuthStateChanged handler will call initializeNotifications when ready
    }
});

// Check if user is signed in
firebase.auth().onAuthStateChanged(async (user) => {
    // Hide auth banner
    const authBanner = document.getElementById('auth-status-banner');
    if (authBanner) {
        authBanner.style.display = 'none';
    }
    
    if (!user) {
        // User is not signed in, redirect to login page
        console.log("User not authenticated, redirecting to login");
        window.location.href = '/Pages/login/login.html';
        return;
    }
    
    console.log("Auth state changed - user authenticated:", user.uid);
    currentAuthenticatedUser = user;
    authenticationComplete = true;
    
    // Now that we have confirmed authentication, load notifications
    if (document.readyState === "complete" || document.readyState === "interactive") {
        console.log("DOM already loaded, initializing notifications now");
        initializeNotifications();
    }
    
    // Fetch user profile data from Firestore
    try {
        const userRef = firebase.firestore().collection('users').doc(user.uid);
        const userSnap = await userRef.get();
        
        // Update user info in the dropdown if user is signed in
        const userNameElement = document.getElementById('user-name');
        const userEmailElement = document.getElementById('user-email');
        const avatarInitials = document.getElementById('avatar-initials');
        const avatarInitialsDropdown = document.getElementById('avatar-initials-dropdown');
        const avatarImage = document.getElementById('avatar-image');
        const avatarImageDropdown = document.getElementById('avatar-image-dropdown');
        
        if (userSnap.exists) {
            const userData = userSnap.data();
            
            // Use custom profile name if available, otherwise fallback to auth name
            if (userNameElement) {
                userNameElement.textContent = userData.fullName || user.displayName || 'User';
            }
            
            if (userEmailElement && user.email) {
                userEmailElement.textContent = user.email;
            }

            // Handle profile picture - check for custom avatar first
            if (userData.photoURL) {
                // User has a custom profile picture from Firestore
                if (avatarImage) {
                    avatarImage.src = userData.photoURL;
                    avatarImage.style.display = 'block';
                }
                if (avatarImageDropdown) {
                    avatarImageDropdown.src = userData.photoURL;
                    avatarImageDropdown.style.display = 'block';
                }
                if (avatarInitials) {
                    avatarInitials.style.display = 'none';
                }
                if (avatarInitialsDropdown) {
                    avatarInitialsDropdown.style.display = 'none';
                }
            } else if (user.photoURL) {
                // Fallback to auth profile picture
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
                
                // Get initials from custom name if available
                const fullName = userData.fullName || user.displayName || '';
                const initials = fullName
                    ? fullName
                        .split(' ')
                        .map(name => name[0])
                        .join('')
                        .toUpperCase()
                    : user.email ? user.email[0].toUpperCase() : 'JN';
                
                if (avatarInitials) {
                    avatarInitials.style.display = 'flex';
                    avatarInitials.textContent = initials;
                }
                if (avatarInitialsDropdown) {
                    avatarInitialsDropdown.style.display = 'flex';
                    avatarInitialsDropdown.textContent = initials;
                }
            }
        } else {
            // If user document doesn't exist in Firestore, create one
            const defaultUserData = {
                fullName: user.displayName || '',
                email: user.email,
                uid: user.uid,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            };
            
            // If user has a photo URL from auth, save it to Firestore
            if (user.photoURL) {
                defaultUserData.photoURL = user.photoURL;
            }
            
            // Set the user document
            await firebase.firestore().collection('users').doc(user.uid).set(defaultUserData);
            
            // Update UI with default data
            if (userNameElement) {
                userNameElement.textContent = defaultUserData.fullName || 'User';
            }
            
            if (userEmailElement) {
                userEmailElement.textContent = defaultUserData.email;
            }
            
            // Handle avatar with default data
            if (user.photoURL) {
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
                const initials = user.displayName
                    ? user.displayName
                        .split(' ')
                        .map(name => name[0])
                        .join('')
                        .toUpperCase()
                    : user.email ? user.email[0].toUpperCase() : 'JN';
                
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
        console.error("Error fetching user data:", error);
    }
});

// Initialize notifications when the page loads
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM Content Loaded - checking auth state");
    
    // Check if authentication is already complete
    if (authenticationComplete && currentAuthenticatedUser) {
        console.log("Auth already complete, initializing notifications");
        initializeNotifications();
    } else {
        console.log("Waiting for authentication to complete");
        // The onAuthStateChanged handler will call initializeNotifications when ready
    }
    
    // Setup the show rejected toggle button
    const showRejectedToggle = document.getElementById('show-rejected-toggle');
    if (showRejectedToggle) {
        // Check if we have a saved preference
        const showRejected = localStorage.getItem('showRejectedNotifications') === 'true';
        if (showRejected) {
            document.body.classList.add('show-rejected');
            showRejectedToggle.classList.add('active');
        }
        
        showRejectedToggle.addEventListener('click', () => {
            const isShowing = document.body.classList.toggle('show-rejected');
            showRejectedToggle.classList.toggle('active', isShowing);
            
            // Save preference
            localStorage.setItem('showRejectedNotifications', isShowing);
            
            // Update the visibility of rejected notifications
            const rejectedGroup = document.querySelector('.rejected-notifications-group');
            if (rejectedGroup) {
                rejectedGroup.style.display = isShowing ? 'block' : 'none';
            }
            
            // Update rejected notification items
            const rejectedItems = document.querySelectorAll('.notification-item.rejected');
            rejectedItems.forEach(item => {
                // Only handle those not in the rejected group
                if (!item.closest('.rejected-notifications-group')) {
                    item.style.display = isShowing ? 'flex' : 'none';
                }
            });
            
            // Update text if needed
            if (isShowing) {
                showRejectedToggle.innerHTML = '<i class="fas fa-eye-slash"></i> Hide Rejected';
            } else {
                showRejectedToggle.innerHTML = '<i class="fas fa-eye"></i> Show Rejected';
                
                // If no other notifications are visible, show empty state with message
                const totalVisibleNotifications = document.querySelectorAll('.notification-item:not(.rejected)').length;
                if (totalVisibleNotifications === 0) {
                    const hasRejected = document.querySelectorAll('.notification-item.rejected').length > 0;
                    if (hasRejected) {
                        updateEmptyNotificationsUI('You have no active notifications. Toggle "Show Rejected" to view your rejected notifications.');
                    } else {
                        updateEmptyNotificationsUI();
                    }
                }
            }
        });
    }
});

// New function to initialize notifications after authentication
function initializeNotifications() {
    console.log("Initializing notifications for user:", currentAuthenticatedUser.uid);
    
    // Force refresh the page data from scratch (but avoid loop)
    if (window.location.search.indexOf('fresh=true') === -1) {
        console.log("First page load - ensuring fresh data");
        setTimeout(() => {
            const currentPath = window.location.pathname;
            window.location.href = currentPath + '?fresh=true&t=' + new Date().getTime();
        }, 100);
        return;
    }
    
    // Load notifications
    console.log("Loading notifications");
    loadNotifications();
    
    // Debug: Directly check for follow request notifications
    debugCheckFollowRequests();
    
    // Set up auto-refresh every 30 seconds
    setInterval(() => {
        console.log("Auto-refreshing notifications");
        loadNotifications();
    }, 30000);
    
    // Add event listener for "Mark All as Read" button
    const markAllReadBtn = document.querySelector('.mark-all-read');
    if (markAllReadBtn) {
        markAllReadBtn.addEventListener('click', markAllAsRead);
    }

    // Theme Toggle
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
        // Material Symbols icons are used instead of Font Awesome
        const moonIcon = themeToggle.querySelector('.moon-icon');
        const sunIcon = themeToggle.querySelector('.sun-icon');

        // Initialize theme
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const storedTheme = localStorage.getItem('theme');
        const isDark = storedTheme ? storedTheme === 'dark' : prefersDark;

        if (isDark) {
            document.documentElement.classList.add('dark-mode');
            document.body.classList.add('dark-mode');
            // Toggle visibility of icons for dark mode
            if (moonIcon && sunIcon) {
                moonIcon.style.opacity = '0';
                sunIcon.style.opacity = '1';
            }
        }

        function toggleTheme() {
            document.documentElement.classList.toggle('dark-mode');
            document.body.classList.toggle('dark-mode');
            const isDark = document.body.classList.contains('dark-mode');
            
            // Toggle visibility of icons based on theme
            if (moonIcon && sunIcon) {
                moonIcon.style.opacity = isDark ? '0' : '1';
                sunIcon.style.opacity = isDark ? '1' : '0';
            }
            
            // Save preference
            localStorage.setItem('theme', isDark ? 'dark' : 'light');
        }

        themeToggle.addEventListener('click', toggleTheme);
    }

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
            firebase.auth().signOut().then(() => {
                window.location.href = '../login/login.html';
            }).catch((error) => {
                console.error('Error signing out:', error);
            });
        });
    }
}

// Load notifications from Firestore
async function loadNotifications() {
    try {
        // Use the global authenticated user instead of checking again
        if (!currentAuthenticatedUser) {
            console.error("No current user found");
            return;
        }

        console.log("Loading notifications for user:", currentAuthenticatedUser.uid);

        // Get user's notifications from Firestore
        const notificationsRef = firebase.firestore()
            .collection('users')
            .doc(currentAuthenticatedUser.uid)
            .collection('notifications');
            
        // First check if any notifications exist
        const checkSnapshot = await notificationsRef.limit(1).get();
        if (checkSnapshot.empty) {
            console.log("No notifications found in collection");
            
            // Force a refresh of the page to try again
            if (window.location.search.indexOf('refresh=true') === -1) {
                setTimeout(() => {
                    window.location.href = window.location.pathname + 
                        (window.location.search ? window.location.search + '&refresh=true' : '?refresh=true');
                }, 2000);
                return;
            }
            
            // Check for pending follow requests directly on the user document
            const userDoc = await firebase.firestore().collection('users').doc(currentAuthenticatedUser.uid).get();
            if (userDoc.exists) {
                const userData = userDoc.data();
                if (userData.pendingFollowRequests && userData.pendingFollowRequests.length > 0) {
                    console.log("Found pending follow requests in user document, but no notifications");
                    
                    // Call the debug function to create missing notifications
                    await debugCheckFollowRequests();
                    
                    // Try one more time to get notifications
                    setTimeout(loadNotifications, 2000);
                }
            }
            
            // Show a message to the user
            updateEmptyNotificationsUI();
            return;
        }
            
        // Set up a real-time listener with orderBy
        notificationsRef
            .orderBy('timestamp', 'desc')
            .onSnapshot(async (snapshot) => {
                console.log("Snapshot received with", snapshot.size, "notifications");
                
                if (snapshot.empty) {
                    updateEmptyNotificationsUI();
                    return;
                }
                
                // Group notifications by type
                const notifications = {
                    job_updates: [],
                    job_alerts: [],
                    follow_requests: [],
                    other: [],
                    rejected: [] // New category for rejected notifications
                };
                
                let hasUnreadNotifications = false;
                
                // Process notifications
                snapshot.forEach(doc => {
                    const notification = {
                        id: doc.id,
                        ...doc.data()
                    };
                    
                    // Convert Firebase timestamp to JavaScript Date
                    if (notification.timestamp && notification.timestamp.toDate) {
                        notification.timestamp = notification.timestamp.toDate();
                    }
                    
                    // Check if notification is unread
                    if (!notification.read) {
                        hasUnreadNotifications = true;
                    }
                    
                    // Sort into appropriate category
                    if (notification.status === 'rejected') {
                        notifications.rejected.push(notification);
                    } else if (notification.type.includes('job_update') || notification.type.includes('application')) {
                        notifications.job_updates.push(notification);
                    } else if (notification.type.includes('job_alert') || notification.type.includes('job_match')) {
                        notifications.job_alerts.push(notification);
                    } else if (notification.type.includes('follow_request')) {
                        notifications.follow_requests.push(notification);
                    } else {
                        notifications.other.push(notification);
                    }
                });
                
                console.log("Processed notifications:", notifications);
                
                // Update notification count in tab title
                const totalNotifications = snapshot.size;
                if (totalNotifications > 0 && hasUnreadNotifications) {
                    document.title = `(${totalNotifications}) Notifications | Job Navigator`;
                } else {
                    document.title = 'Notifications | Job Navigator';
                }
                
                // Update UI with notifications
                updateNotificationsUI(notifications);
            }, (error) => {
                console.error("Error listening to notifications:", error);
                updateEmptyNotificationsUI(error.message);
            });
    } catch (error) {
        console.error("Error loading notifications:", error);
        updateEmptyNotificationsUI(error.message);
    }
}

// Update UI when there are no notifications
function updateEmptyNotificationsUI(message) {
    const notificationsContainer = document.querySelector('.notifications-main');
    if (notificationsContainer) {
        notificationsContainer.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">
                    <i class="fas fa-bell-slash"></i>
                </div>
                <h3>No Notifications</h3>
                <p>${message || 'You don\'t have any notifications at this time.'}</p>
                <button class="btn-primary refresh-notifications">
                    <i class="fas fa-sync-alt"></i> Refresh
                </button>
            </div>
        `;
        
        // Add refresh button functionality
        const refreshBtn = notificationsContainer.querySelector('.refresh-notifications');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                window.location.reload();
            });
        }
    }
}

// Update the UI with notifications
function updateNotificationsUI(notifications) {
    // Get notification groups
    const jobUpdatesGroup = document.querySelector('.job-updates-group');
    const jobAlertsGroup = document.querySelector('.job-alerts-group');
    const followRequestsGroup = document.querySelector('.follow-requests-group');
    const otherNotificationsGroup = document.querySelector('.other-notifications-group');
    const rejectedNotificationsGroup = document.querySelector('.rejected-notifications-group');
    
    // Create group elements if they don't exist
    if (!followRequestsGroup) {
        const newGroup = document.createElement('div');
        newGroup.className = 'notification-group follow-requests-group';
        newGroup.innerHTML = `
            <div class="group-header">
                <h2>Follow Requests</h2>
                <span class="group-count">0 notifications</span>
            </div>
        `;
        const notificationsMain = document.querySelector('.notifications-main');
        notificationsMain.prepend(newGroup);
    }
    
    if (!otherNotificationsGroup) {
        const newGroup = document.createElement('div');
        newGroup.className = 'notification-group other-notifications-group';
        newGroup.innerHTML = `
            <div class="group-header">
                <h2>Other Notifications</h2>
                <span class="group-count">0 notifications</span>
            </div>
        `;
        const notificationsMain = document.querySelector('.notifications-main');
        notificationsMain.appendChild(newGroup);
    }
    
    if (!rejectedNotificationsGroup) {
        const newGroup = document.createElement('div');
        newGroup.className = 'notification-group rejected-notifications-group';
        newGroup.style.display = document.body.classList.contains('show-rejected') ? 'block' : 'none';
        newGroup.innerHTML = `
            <div class="group-header">
                <h2>Rejected Notifications</h2>
                <span class="group-count">0 notifications</span>
            </div>
        `;
        const notificationsMain = document.querySelector('.notifications-main');
        notificationsMain.appendChild(newGroup);
    }
    
    // Get the groups again (in case they were just created)
    const updatedFollowRequestsGroup = document.querySelector('.follow-requests-group');
    const updatedOtherNotificationsGroup = document.querySelector('.other-notifications-group');
    const updatedRejectedNotificationsGroup = document.querySelector('.rejected-notifications-group');
    
    // Clear existing notifications
    if (jobUpdatesGroup) {
        const notificationItems = jobUpdatesGroup.querySelectorAll('.notification-item');
        notificationItems.forEach(item => item.remove());
    }
    
    if (jobAlertsGroup) {
        const notificationItems = jobAlertsGroup.querySelectorAll('.notification-item');
        notificationItems.forEach(item => item.remove());
    }
    
    if (updatedFollowRequestsGroup) {
        const notificationItems = updatedFollowRequestsGroup.querySelectorAll('.notification-item');
        notificationItems.forEach(item => item.remove());
    }
    
    if (updatedOtherNotificationsGroup) {
        const notificationItems = updatedOtherNotificationsGroup.querySelectorAll('.notification-item');
        notificationItems.forEach(item => item.remove());
    }
    
    if (updatedRejectedNotificationsGroup) {
        const notificationItems = updatedRejectedNotificationsGroup.querySelectorAll('.notification-item');
        notificationItems.forEach(item => item.remove());
    }
    
    // Add job update notifications
    if (jobUpdatesGroup && notifications.job_updates.length > 0) {
        const groupCount = jobUpdatesGroup.querySelector('.group-count');
        if (groupCount) {
            groupCount.textContent = `${notifications.job_updates.length} notification${notifications.job_updates.length !== 1 ? 's' : ''}`;
        }
        
        notifications.job_updates.forEach(notification => {
            const notificationElement = createNotificationElement(notification);
            jobUpdatesGroup.appendChild(notificationElement);
        });
        
        jobUpdatesGroup.style.display = 'block';
    } else if (jobUpdatesGroup) {
        jobUpdatesGroup.style.display = 'none';
    }
    
    // Add job alert notifications
    if (jobAlertsGroup && notifications.job_alerts.length > 0) {
        const groupCount = jobAlertsGroup.querySelector('.group-count');
        if (groupCount) {
            groupCount.textContent = `${notifications.job_alerts.length} notification${notifications.job_alerts.length !== 1 ? 's' : ''}`;
        }
        
        notifications.job_alerts.forEach(notification => {
            const notificationElement = createNotificationElement(notification);
            jobAlertsGroup.appendChild(notificationElement);
        });
        
        jobAlertsGroup.style.display = 'block';
    } else if (jobAlertsGroup) {
        jobAlertsGroup.style.display = 'none';
    }
    
    // Add follow request notifications
    if (updatedFollowRequestsGroup && notifications.follow_requests.length > 0) {
        const groupCount = updatedFollowRequestsGroup.querySelector('.group-count');
        if (groupCount) {
            groupCount.textContent = `${notifications.follow_requests.length} notification${notifications.follow_requests.length !== 1 ? 's' : ''}`;
        }
        
        notifications.follow_requests.forEach(notification => {
            const notificationElement = createNotificationElement(notification);
            updatedFollowRequestsGroup.appendChild(notificationElement);
        });
        
        updatedFollowRequestsGroup.style.display = 'block';
    } else if (updatedFollowRequestsGroup) {
        updatedFollowRequestsGroup.style.display = 'none';
    }
    
    // Add other notifications
    if (updatedOtherNotificationsGroup && notifications.other.length > 0) {
        const groupCount = updatedOtherNotificationsGroup.querySelector('.group-count');
        if (groupCount) {
            groupCount.textContent = `${notifications.other.length} notification${notifications.other.length !== 1 ? 's' : ''}`;
        }
        
        notifications.other.forEach(notification => {
            const notificationElement = createNotificationElement(notification);
            updatedOtherNotificationsGroup.appendChild(notificationElement);
        });
        
        updatedOtherNotificationsGroup.style.display = 'block';
    } else if (updatedOtherNotificationsGroup) {
        updatedOtherNotificationsGroup.style.display = 'none';
    }
    
    // Add rejected notifications
    if (updatedRejectedNotificationsGroup && notifications.rejected.length > 0) {
        const groupCount = updatedRejectedNotificationsGroup.querySelector('.group-count');
        if (groupCount) {
            groupCount.textContent = `${notifications.rejected.length} notification${notifications.rejected.length !== 1 ? 's' : ''}`;
        }
        
        notifications.rejected.forEach(notification => {
            const notificationElement = createNotificationElement(notification);
            notificationElement.classList.add('rejected'); // Add rejected class for styling
            updatedRejectedNotificationsGroup.appendChild(notificationElement);
        });
        
        // Only show if the toggle is enabled
        updatedRejectedNotificationsGroup.style.display = document.body.classList.contains('show-rejected') ? 'block' : 'none';
    } else if (updatedRejectedNotificationsGroup) {
        updatedRejectedNotificationsGroup.style.display = 'none';
    }
    
    // Show empty state if no notifications
    const totalNotifications = 
        notifications.job_updates.length + 
        notifications.job_alerts.length + 
        notifications.follow_requests.length + 
        notifications.other.length;
        
    if (totalNotifications === 0 && notifications.rejected.length === 0) {
        updateEmptyNotificationsUI();
    } else if (totalNotifications === 0 && notifications.rejected.length > 0 && !document.body.classList.contains('show-rejected')) {
        updateEmptyNotificationsUI('You have no active notifications. Toggle "Show Rejected" to view your rejected notifications.');
    }
}

// Format timestamp to human-readable format
function formatTimestamp(timestamp) {
    if (!timestamp) return 'Unknown date';
    
    // Convert Firestore timestamp to Date if needed
    let date;
    if (timestamp && typeof timestamp.toDate === 'function') {
        date = timestamp.toDate();
    } else if (timestamp instanceof Date) {
        date = timestamp;
    } else {
        return 'Unknown date';
    }
    
    const now = new Date();
    const diff = now - date;
    
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
        return date.toLocaleDateString();
    }
}

// Create notification element
function createNotificationElement(notification) {
    if (!notification || !notification.type) {
        console.error("Invalid notification data:", notification);
        return document.createElement('div'); // Return empty div for invalid notifications
    }

    const notificationElement = document.createElement('div');
    notificationElement.className = `notification-item ${notification.read ? '' : 'unread'}`;
    notificationElement.setAttribute('data-id', notification.id);
    
    const icon = getNotificationIcon(notification.type);
    
    // Handle potential undefined values with fallbacks
    const title = notification.title || formatNotificationType(notification.type) || 'Notification';
    const text = notification.text || notification.message || 'No details available';
    const timestamp = notification.timestamp || notification.createdAt || new Date();
    
    // Make sender names clickable in notification text
    let displayText = text;
    
    // Check if the notification contains sender information
    if (notification.senderId && notification.senderName) {
        // Replace the sender name with a clickable link
        const nameRegex = new RegExp(notification.senderName, 'i');
        displayText = text.replace(nameRegex, `<a href="#" class="user-profile-link" data-user-id="${notification.senderId}">${notification.senderName}</a>`);
    }
    
    // Base HTML structure
    let notificationHTML = `
        <div class="notification-icon">
            <i class="${icon}"></i>
        </div>
        <div class="notification-content">
            <h3 class="notification-title">${title}</h3>
            <p class="notification-text">${displayText}</p>
            <div class="notification-meta">
                <span class="notification-type">${formatNotificationType(notification.type)}</span>
                <span class="notification-time">${formatTimestamp(timestamp)}</span>
            </div>`;
    
    console.log("Processing notification:", notification.id, notification.type, notification.senderId);
    
    // Add action buttons for follow requests
    if (notification.type === 'follow_request' && notification.actions && notification.actions.includes('accept')) {
        notificationHTML += `
            <div class="notification-request-actions">
                <button class="btn-accept" data-sender-id="${notification.senderId}" data-notification-id="${notification.id}">
                    <i class="fas fa-check"></i> Accept
                </button>
                <button class="btn-reject" data-sender-id="${notification.senderId}" data-notification-id="${notification.id}">
                    <i class="fas fa-times"></i> Reject
                </button>
            </div>`;
    }
    
    notificationHTML += `
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
    
    notificationElement.innerHTML = notificationHTML;

    // Add event listeners
    const markReadBtn = notificationElement.querySelector('.mark-read');
    const deleteBtn = notificationElement.querySelector('.delete');

    markReadBtn.addEventListener('click', () => markAsRead(notification.id));
    deleteBtn.addEventListener('click', () => deleteNotification(notification.id));
    
    // Add event listeners for follow request buttons
    const acceptBtn = notificationElement.querySelector('.btn-accept');
    const rejectBtn = notificationElement.querySelector('.btn-reject');
    
    if (acceptBtn) {
        acceptBtn.addEventListener('click', () => acceptFollowRequest(notification.id, notification.senderId));
    }
    
    if (rejectBtn) {
        rejectBtn.addEventListener('click', () => rejectFollowRequest(notification.id, notification.senderId));
    }
    
    // Add event listener for profile links
    const profileLinks = notificationElement.querySelectorAll('.user-profile-link');
    profileLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const userId = link.getAttribute('data-user-id');
            if (userId) {
                navigateToUserProfile(userId);
            }
        });
    });

    return notificationElement;
}

// Navigate to user profile function
function navigateToUserProfile(userId) {
    if (!userId) return;
    
    console.log("Navigating to user profile:", userId);
    
    // Navigate to the profile page with the user ID as a parameter
    window.location.href = `../account/account.html?userId=${userId}`;
}

// Get notification icon based on type
function getNotificationIcon(type) {
    switch (type) {
        case 'job_update':
            return 'fas fa-briefcase';
        case 'job_alert':
            return 'fas fa-bell';
        case 'follow_request':
            return 'fas fa-user-plus';
        case 'follow':
            return 'fas fa-user-friends';
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

// Mark notification as read
async function markAsRead(notificationId) {
    try {
        if (!currentAuthenticatedUser) return;
        
        // Update notification in Firestore
        await firebase.firestore()
            .collection('users')
            .doc(currentAuthenticatedUser.uid)
            .collection('notifications')
            .doc(notificationId)
            .update({ read: true });
        
        // Update UI
        const notificationItem = document.querySelector(`.notification-item[data-id="${notificationId}"]`);
        if (notificationItem) {
            notificationItem.classList.remove('unread');
        }
    } catch (error) {
        console.error("Error marking notification as read:", error);
    }
}

// Delete notification
async function deleteNotification(notificationId) {
    try {
        if (!currentAuthenticatedUser) return;
        
        // Delete notification from Firestore
        await firebase.firestore()
            .collection('users')
            .doc(currentAuthenticatedUser.uid)
            .collection('notifications')
            .doc(notificationId)
            .delete();
        
        // Remove from UI
        const notificationItem = document.querySelector(`.notification-item[data-id="${notificationId}"]`);
        if (notificationItem) {
            notificationItem.remove();
        }
        
        // Reload notifications to update counts
    loadNotifications();
    } catch (error) {
        console.error("Error deleting notification:", error);
    }
}

// Mark all notifications as read
async function markAllAsRead() {
    try {
        if (!currentAuthenticatedUser) return;
        
        // Get all unread notifications
        const unreadNotificationsRef = firebase.firestore()
            .collection('users')
            .doc(currentAuthenticatedUser.uid)
            .collection('notifications')
            .where('read', '==', false);
            
        const snapshot = await unreadNotificationsRef.get();
        
        // Create a batch operation for better performance
        const batch = firebase.firestore().batch();
        
        snapshot.forEach(doc => {
            const notificationRef = firebase.firestore()
                .collection('users')
                .doc(currentAuthenticatedUser.uid)
                .collection('notifications')
                .doc(doc.id);
                
            batch.update(notificationRef, { read: true });
        });
        
        // Execute the batch
        await batch.commit();
        
        // Update UI - remove unread class from all notifications
        document.querySelectorAll('.notification-item.unread').forEach(item => {
            item.classList.remove('unread');
        });
    } catch (error) {
        console.error("Error marking all notifications as read:", error);
    }
}

// Debug function to check for follow requests directly
async function debugCheckFollowRequests() {
    try {
        if (!currentAuthenticatedUser) {
            console.error("No current user found for debug check");
            return;
        }
        
        console.log("Debugging follow requests for user:", currentAuthenticatedUser.uid);
        
        // Get all notifications for the current user
        const notificationsRef = window.db.collection("users")
            .doc(currentAuthenticatedUser.uid)
            .collection("notifications");
        
        console.log("Notifications collection path:", notificationsRef.path);
        
        const notificationsSnapshot = await notificationsRef.get();
            
        console.log("Total notifications found:", notificationsSnapshot.size);
        console.log("Notifications empty?", notificationsSnapshot.empty);
        
        // Check for pendingFollowRequests in user document
        const userDoc = await window.db.collection("users").doc(currentAuthenticatedUser.uid).get();
        if (userDoc.exists) {
            const userData = userDoc.data();
            console.log("User document data:", userData);
            console.log("Pending follow requests:", userData.pendingFollowRequests || []);
            
            // If there are pendingFollowRequests but no notifications, create them now
            const pendingRequests = userData.pendingFollowRequests || [];
            if (pendingRequests.length > 0) {
                console.log("Found pending requests - checking for missing notifications");
                
                for (const senderId of pendingRequests) {
                    try {
                        // Check if notification already exists for this sender
                        const existingNotifications = await notificationsRef
                            .where("type", "==", "follow_request")
                            .where("senderId", "==", senderId)
                            .get();
                            
                        if (existingNotifications.empty) {
                            console.log("Creating missing notification for sender:", senderId);
                            
                            // Get sender data
                            const senderDoc = await window.db.collection("users").doc(senderId).get();
                            if (senderDoc.exists) {
                                const senderData = senderDoc.data();
                                const senderName = senderData.name || senderData.fullName || senderData.displayName || 'A user';
                                
                                // Create notification
                                const notification = {
                                    type: 'follow_request',
                                    senderId: senderId,
                                    senderName: senderName,
                                    senderPhoto: senderData.photoURL || null,
                                    title: 'New Follow Request',
                                    text: `${senderName} wants to follow you`,
                                    actions: ['accept', 'reject'],
                                    read: false,
                                    timestamp: firebase.firestore.FieldValue.serverTimestamp()
                                };
                                
                                // Add notification
                                await notificationsRef.add(notification);
                                console.log("Created missing notification for sender:", senderId);
                            }
                        } else {
                            console.log("Notification already exists for sender:", senderId);
                        }
                    } catch (err) {
                        console.error("Error checking/creating notification:", err);
                    }
                }
                
                // Reload notifications after creating missing ones
                setTimeout(loadNotifications, 1000);
            }
        }
    } catch (error) {
        console.error("Error in debug function:", error);
    }
}

// Accept follow request
async function acceptFollowRequest(notificationId, senderId) {
    try {
        // Get current user
        if (!currentAuthenticatedUser) return;
        
        // Get notification to confirm it's still valid
        const notificationDoc = await firebase.firestore()
            .collection('users')
            .doc(currentAuthenticatedUser.uid)
            .collection('notifications')
            .doc(notificationId)
            .get();
            
        if (!notificationDoc.exists) {
            alert('This follow request no longer exists or has already been processed.');
    loadNotifications();
            return;
        }
        
        // Add sender to current user's followers
        await firebase.firestore().collection('users').doc(currentAuthenticatedUser.uid).update({
            followers: firebase.firestore.FieldValue.arrayUnion(senderId),
            // Remove from pendingFollowRequests in the recipient's profile (current user)
            pendingFollowRequests: firebase.firestore.FieldValue.arrayRemove(senderId)
        });
        
        // Add current user to sender's following
        await firebase.firestore().collection('users').doc(senderId).update({
            following: firebase.firestore.FieldValue.arrayUnion(currentAuthenticatedUser.uid)
        });
        
        // Send confirmation notification to sender
        const userDoc = await firebase.firestore().collection('users').doc(currentAuthenticatedUser.uid).get();
        const userData = userDoc.data();
        const userName = userData.name || userData.fullName || userData.displayName || currentAuthenticatedUser.displayName || 'User';
        
        // Create acceptance notification
        const acceptNotification = {
            type: 'follow_accepted',
            title: 'Follow Request Accepted',
            text: `${userName} accepted your follow request`,
            senderId: currentAuthenticatedUser.uid,
            senderName: userName,
            senderPhoto: userData.photoURL || null,
            read: false,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        // Add notification to sender's collection
        await firebase.firestore().collection('users').doc(senderId).collection('notifications').add(acceptNotification);
        
        // Delete the request notification
        await firebase.firestore().collection('users').doc(currentAuthenticatedUser.uid).collection('notifications').doc(notificationId).delete();
        
        // Remove from UI
        const notificationItem = document.querySelector(`.notification-item[data-id="${notificationId}"]`);
        if (notificationItem) {
            notificationItem.remove();
        }
        
        // Show success message
        alert('Follow request accepted');
        
        // Reload notifications to update counts
        loadNotifications();
    } catch (error) {
        console.error('Error accepting follow request:', error);
        alert('Failed to accept follow request. Please try again.');
    }
}

// Reject follow request
async function rejectFollowRequest(notificationId, senderId) {
    try {
        // Get current user
        if (!currentAuthenticatedUser) return;
        
        // Get notification to confirm it's still valid
        const notificationDoc = await firebase.firestore()
            .collection('users')
            .doc(currentAuthenticatedUser.uid)
            .collection('notifications')
            .doc(notificationId)
            .get();
            
        if (!notificationDoc.exists) {
            alert('This follow request no longer exists or has already been processed.');
    loadNotifications();
            return;
        }
        
        // Remove pending request from current user's list (recipient)
        await firebase.firestore().collection('users').doc(currentAuthenticatedUser.uid).update({
            pendingFollowRequests: firebase.firestore.FieldValue.arrayRemove(senderId)
        });
        
        // Instead of deleting, mark as rejected
        await firebase.firestore()
            .collection('users')
            .doc(currentAuthenticatedUser.uid)
            .collection('notifications')
            .doc(notificationId)
            .update({
                status: 'rejected',
                read: true,
                rejectedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        
        // Update UI - hide in default view
        const notificationItem = document.querySelector(`.notification-item[data-id="${notificationId}"]`);
        if (notificationItem) {
            notificationItem.classList.add('rejected');
            // Only hide if we're not showing rejected notifications
            if (!document.body.classList.contains('show-rejected')) {
                notificationItem.style.display = 'none';
            }
        }
        
        // Show success message
        alert('Follow request rejected');
        
        // Reload notifications to update counts
        loadNotifications();
    } catch (error) {
        console.error('Error rejecting follow request:', error);
        alert('Failed to reject follow request. Please try again.');
    }
} 