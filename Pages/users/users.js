import { 
    db, 
    auth, 
    collection, 
    getDocs, 
    doc, 
    getDoc, 
    setDoc, 
    deleteDoc, 
    writeBatch, 
    updateDoc, 
    query, 
    where, 
    addDoc
} from '../../Firebase/firebase-config.js';
import { arrayUnion, arrayRemove } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js';

// DOM Elements
const usersList = document.getElementById('users-list');
const emptyState = document.getElementById('empty-state');
const filterOptions = document.querySelectorAll('.filter-option');

// Counter elements
const allCountElement = document.getElementById('all-count');
const followingCountElement = document.getElementById('following-count');
const followersCountElement = document.getElementById('followers-count');
const allCountBadge = document.getElementById('all-count-badge');
const followingCountBadge = document.getElementById('following-count-badge');
const followersCountBadge = document.getElementById('followers-count-badge');

// Sidebar toggle
const sidebarCollapseBtn = document.getElementById('sidebar-collapse');
const sidebar = document.getElementById('sidebar');
const contentArea = document.querySelector('.content-area');

// Action buttons
const refreshBtn = document.querySelector('.action-button[title="Refresh"]');
const layoutBtn = document.querySelector('.action-button[title="Layout"]');
const advancedSearchBtn = document.querySelector('.sidebar-footer-button');

// Current user ID
let currentUserId = null;
// Current filter
let currentFilter = 'all';
// Users cache
let allUsers = [];
// Following and followers cache
let followingList = [];
let followersList = [];
let pendingFollowRequests = [];
let outgoingPendingRequests = [];
// Layout view (grid or list)
let currentLayout = 'grid';

// Initialize page
document.addEventListener('DOMContentLoaded', () => {
    // Check authentication state
    auth.onAuthStateChanged(async (user) => {
        if (user) {
            currentUserId = user.uid;
            await Promise.all([
                loadAllUsers(),
                loadFollowingAndFollowers()
            ]);
            updateCounters();
            applyFilter(currentFilter);
            setupEventListeners();
        } else {
            // Redirect to login page if not authenticated
            window.location.href = '../login/login.html';
        }
    });

    // Let's add the theme toggle icon switch functionality
    const themeToggle = document.getElementById('theme-toggle');
    const moonIcon = themeToggle ? themeToggle.querySelector('.moon-icon') : null;
    const sunIcon = themeToggle ? themeToggle.querySelector('.sun-icon') : null;

    // Set initial icon state based on current theme
    function updateThemeIcons() {
        if (!moonIcon || !sunIcon) return;
        
        const isDarkMode = document.body.classList.contains('dark-mode');
        if (isDarkMode) {
            moonIcon.style.opacity = '0';
            sunIcon.style.opacity = '1';
        } else {
            moonIcon.style.opacity = '1';
            sunIcon.style.opacity = '0';
        }
    }

    // Run on initial load
    updateThemeIcons();

    // Update when theme changes
    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            // Wait a moment for the dark-mode class to be applied/removed
            setTimeout(updateThemeIcons, 50);
        });
    }
    
    // Handle sidebar toggle on mobile
    const toggleSidebarBtn = document.getElementById('toggle-sidebar');
    
    if (toggleSidebarBtn && sidebar) {
        toggleSidebarBtn.addEventListener('click', () => {
            sidebar.classList.toggle('active');
        });
    }
    
    // Handle sidebar collapse button
    if (sidebarCollapseBtn && sidebar && contentArea) {
        sidebarCollapseBtn.addEventListener('click', () => {
            sidebar.classList.toggle('collapsed');
            contentArea.classList.toggle('expanded');
            
            // Update the icon
            const icon = sidebarCollapseBtn.querySelector('.material-symbols-rounded');
            if (sidebar.classList.contains('collapsed')) {
                icon.textContent = 'menu';
            } else {
                icon.textContent = 'menu_open';
            }
        });
    }
    
    // Handle action buttons
    if (refreshBtn) {
        refreshBtn.addEventListener('click', async () => {
            await Promise.all([
                loadAllUsers(),
                loadFollowingAndFollowers()
            ]);
            updateCounters();
            applyFilter(currentFilter);
        });
    }
    
    if (layoutBtn) {
        layoutBtn.addEventListener('click', () => {
            currentLayout = currentLayout === 'grid' ? 'list' : 'grid';
            usersList.classList.toggle('list-view');
            
            // Update the icon
            const icon = layoutBtn.querySelector('.material-symbols-rounded');
            if (currentLayout === 'grid') {
                icon.textContent = 'view_module';
            } else {
                icon.textContent = 'view_list';
            }
        });
    }
    
    if (advancedSearchBtn) {
        advancedSearchBtn.addEventListener('click', () => {
            // Placeholder for advanced search functionality
            alert('Advanced search coming soon!');
        });
    }
});

// Setup event listeners
function setupEventListeners() {
    // Filter options in sidebar
    filterOptions.forEach(option => {
        option.addEventListener('click', (e) => {
            const filter = e.currentTarget.dataset.filter;
            setActiveFilter(filter);
            applyFilter(filter);
        });
    });
    
    // Notification button
    const notificationsBtn = document.getElementById('notifications-btn');
    if (notificationsBtn) {
        notificationsBtn.addEventListener('click', () => {
            window.location.href = '../notifications/notifications.html';
        });
    }
}

// Load all users from Firestore
async function loadAllUsers() {
    showLoading(true);
    try {
        const usersCollection = collection(db, 'users');
        const usersSnapshot = await getDocs(usersCollection);
        allUsers = [];
        
        usersSnapshot.forEach(doc => {
            // Don't include current user in the list
            if (doc.id !== currentUserId) {
                allUsers.push({
                    id: doc.id,
                    ...doc.data()
                });
            }
        });
        
        return allUsers;
    } catch (error) {
        console.error('Error loading users:', error);
        showError('Failed to load users. Please try again later.');
        return [];
    } finally {
        showLoading(false);
    }
}

// Load current user's following and followers
async function loadFollowingAndFollowers() {
    try {
        // Get user document to access following, followers, and pending requests
        const userDocRef = doc(db, 'users', currentUserId);
        const userDoc = await getDoc(userDocRef);
        
        if (userDoc.exists()) {
            const userData = userDoc.data();
            
            // Get following list
            followingList = userData.following || [];
            
            // Get followers list
            followersList = userData.followers || [];
            
            // Get pending follow requests sent TO the current user
            // This is not what we need for checking outgoing requests
            // But we'll keep it for other functionality
            pendingFollowRequests = userData.pendingFollowRequests || [];
        }
        
        // Now let's find all outgoing pending requests
        // This is a separate variable to track requests the current user has sent to others
        outgoingPendingRequests = [];
        
        // Check each user to see if they have a pending request from the current user
        const usersSnapshot = await getDocs(collection(db, 'users'));
        usersSnapshot.forEach(userDoc => {
            if (userDoc.id !== currentUserId) {
                const userData = userDoc.data();
                if (userData.pendingFollowRequests && 
                    userData.pendingFollowRequests.includes(currentUserId)) {
                    outgoingPendingRequests.push(userDoc.id);
                }
            }
        });
        
    } catch (error) {
        console.error('Error loading following/followers:', error);
    }
}

// Update the counters in the sidebar
function updateCounters() {
    const allCount = allUsers.length;
    const followingCount = followingList.length;
    const followersCount = followersList.length;
    
    // Update stat cards
    if (allCountElement) {
        allCountElement.textContent = allCount;
    }
    
    if (followingCountElement) {
        followingCountElement.textContent = followingCount;
    }
    
    if (followersCountElement) {
        followersCountElement.textContent = followersCount;
    }
    
    // Update badges in filter options
    if (allCountBadge) {
        allCountBadge.textContent = allCount;
    }
    
    if (followingCountBadge) {
        followingCountBadge.textContent = followingCount;
    }
    
    if (followersCountBadge) {
        followersCountBadge.textContent = followersCount;
    }
}

// Apply filter (all, following, followers, etc.)
function applyFilter(filter) {
    currentFilter = filter;
    let filteredUsers = [];
    
    switch (filter) {
        case 'following':
            filteredUsers = allUsers.filter(user => followingList.includes(user.id));
            break;
        case 'followers':
            filteredUsers = allUsers.filter(user => followersList.includes(user.id));
            break;
        case 'recent':
            // Sort by last activity (if available) or creation date
            filteredUsers = [...allUsers].sort((a, b) => {
                const aDate = a.lastActive ? a.lastActive.toDate() : a.createdAt ? a.createdAt.toDate() : new Date(0);
                const bDate = b.lastActive ? b.lastActive.toDate() : b.createdAt ? b.createdAt.toDate() : new Date(0);
                return bDate - aDate;
            });
            break;
        case 'connections':
            // Show users with common connections first
            // This is a placeholder - actual implementation would need to check mutual connections
            filteredUsers = [...allUsers];
            break;
        case 'industry':
            // Show users from the same industry
            // Get current user's industry first
            const currentUserIndustry = getCurrentUserIndustry();
            filteredUsers = allUsers.filter(user => user.industry === currentUserIndustry);
            break;
        case 'suggested':
            // Suggested users - could be based on interests, industry, etc.
            filteredUsers = [...allUsers];
            break;
        case 'recruiters':
            // Show recruiters if they have a role field set to 'recruiter'
            filteredUsers = allUsers.filter(user => user.role === 'recruiter');
            break;
        case 'nearby':
            // Nearby users - would require location data
            filteredUsers = [...allUsers];
            break;
        case 'all':
        default:
            filteredUsers = [...allUsers];
            break;
    }
    
    displayUsers(filteredUsers);
}

// Get current user's industry (placeholder function)
function getCurrentUserIndustry() {
    // This would normally fetch from the current user's data
    // For now we return a placeholder
    return "Technology";
}

// Set active filter 
function setActiveFilter(filter) {
    filterOptions.forEach(option => {
        if (option.dataset.filter === filter) {
            option.classList.add('active');
        } else {
            option.classList.remove('active');
        }
    });
}

// Display users in the list
function displayUsers(users) {
    usersList.innerHTML = '';
    
    if (users.length === 0) {
        emptyState.style.display = 'flex';
        
        // Update empty state message based on filter
        const emptyStateHeading = emptyState.querySelector('h3');
        const emptyStateText = emptyState.querySelector('p');
        
        if (currentFilter === 'following') {
            emptyStateHeading.textContent = 'Not following anyone';
            emptyStateText.textContent = 'When you follow users, they will appear here';
        } else if (currentFilter === 'followers') {
            emptyStateHeading.textContent = 'No followers yet';
            emptyStateText.textContent = 'When users follow you, they will appear here';
        } else {
            emptyStateHeading.textContent = 'No users available';
            emptyStateText.textContent = 'Try adjusting your filter criteria';
        }
    } else {
        emptyState.style.display = 'none';
        
        // Create and append user elements
    users.forEach(user => {
        const isFollowing = followingList.includes(user.id);
        const userElement = createUserElement(user, isFollowing);
        usersList.appendChild(userElement);
    });
    }
}

// Create a user element for display
function createUserElement(user, isFollowing) {
    // Create the main user item container
    const userItem = document.createElement('div');
    userItem.className = 'user-item';
    userItem.dataset.userId = user.id;
    
    // ----- User Header -----
    const userHeader = document.createElement('div');
    userHeader.className = 'user-header';
    
    // Avatar
    const avatarContainer = document.createElement('div');
    avatarContainer.className = 'user-avatar';
    
    // Check if user has a profile picture
    if (user.profilePicture) {
        const avatar = document.createElement('img');
        avatar.src = user.profilePicture;
        avatar.alt = `${user.fullName || 'User'}'s profile picture`;
        avatarContainer.appendChild(avatar);
    } else {
        // Display initials if no profile picture
        const initials = getInitials(user.fullName || user.email || 'User');
        avatarContainer.textContent = initials;
    }
    
    // User basic info
    const userInfo = document.createElement('div');
    userInfo.className = 'user-info';
    
    // Name
    const userName = document.createElement('div');
    userName.className = 'user-name';
    userName.textContent = user.fullName || user.email || 'Anonymous User';
    userInfo.appendChild(userName);
    
    // Professional headline
    if (user.headline) {
        const userHeadline = document.createElement('div');
        userHeadline.className = 'user-headline';
        userHeadline.textContent = user.headline;
        userInfo.appendChild(userHeadline);
    } else {
        const userHeadline = document.createElement('div');
        userHeadline.className = 'user-headline';
        userHeadline.textContent = 'Job seeker';
        userHeadline.style.opacity = '0.7';
        userInfo.appendChild(userHeadline);
    }
    
    // Location if available
    if (user.location) {
        const userLocation = document.createElement('div');
        userLocation.className = 'user-location';
        
        const locationIcon = document.createElement('span');
        locationIcon.className = 'material-symbols-rounded';
        locationIcon.textContent = 'location_on';
        
        const locationText = document.createElement('span');
        locationText.textContent = user.location;
        
        userLocation.appendChild(locationIcon);
        userLocation.appendChild(locationText);
        userInfo.appendChild(userLocation);
    } else {
        const userLocation = document.createElement('div');
        userLocation.className = 'user-location';
        
        const locationIcon = document.createElement('span');
        locationIcon.className = 'material-symbols-rounded';
        locationIcon.textContent = 'public';
        
        const locationText = document.createElement('span');
        locationText.textContent = 'Location unknown';
        
        userLocation.appendChild(locationIcon);
        userLocation.appendChild(locationText);
        userInfo.appendChild(userLocation);
    }
    
    // Add avatar and info to header
    userHeader.appendChild(avatarContainer);
    userHeader.appendChild(userInfo);
    userItem.appendChild(userHeader);
    
    // ----- User Body -----
    const userBody = document.createElement('div');
    userBody.className = 'user-body';
    
    // Bio
    if (user.bio) {
        const userBio = document.createElement('div');
        userBio.className = 'user-bio';
        userBio.textContent = user.bio;
        userBody.appendChild(userBio);
    } else {
        const userBio = document.createElement('div');
        userBio.className = 'user-bio';
        userBio.textContent = 'No bio provided.';
        userBio.style.opacity = '0.7';
        userBody.appendChild(userBio);
    }
    
    // Skills
    if (user.skills && user.skills.length > 0) {
        const skillsContainer = document.createElement('div');
        skillsContainer.className = 'user-skills';
        
        // Limit to 4 skills for display
        const displaySkills = user.skills.slice(0, 4);
        
        displaySkills.forEach(skill => {
            const skillTag = document.createElement('div');
            skillTag.className = 'skill-tag';
            skillTag.textContent = skill;
            skillsContainer.appendChild(skillTag);
        });
        
        // Show +X more if there are additional skills
        if (user.skills.length > 4) {
            const moreSkills = document.createElement('div');
            moreSkills.className = 'skill-tag';
            moreSkills.textContent = `+${user.skills.length - 4} more`;
            skillsContainer.appendChild(moreSkills);
        }
        
        userBody.appendChild(skillsContainer);
    } else {
        const skillsContainer = document.createElement('div');
        skillsContainer.className = 'user-skills';
        
        const skillTag = document.createElement('div');
        skillTag.className = 'skill-tag';
        skillTag.textContent = 'No skills listed';
        skillTag.style.opacity = '0.7';
        
        skillsContainer.appendChild(skillTag);
        userBody.appendChild(skillsContainer);
    }
    
    userItem.appendChild(userBody);
    
    // ----- User Actions -----
    const userActions = document.createElement('div');
    userActions.className = 'user-actions';
    
    // Action buttons
    const actionButtons = document.createElement('div');
    actionButtons.className = 'action-buttons';
    
    // Follow button
    const followBtn = document.createElement('button');
    followBtn.className = 'follow-btn';
    
    const isPendingRequest = outgoingPendingRequests.includes(user.id);
    
    if (isFollowing) {
        followBtn.classList.add('following');
        followBtn.innerHTML = '<span class="material-symbols-rounded">check</span>';
        followBtn.setAttribute('title', 'Following');
    } else if (isPendingRequest) {
        followBtn.classList.add('pending');
        followBtn.innerHTML = '<span class="material-symbols-rounded">pending</span>';
        followBtn.setAttribute('title', 'Pending');
    } else {
        followBtn.innerHTML = '<span class="material-symbols-rounded">person_add</span>';
        followBtn.setAttribute('title', 'Follow');
    }
    
    followBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        handleFollowAction(user.id, isFollowing, isPendingRequest);
    });
    
    // Message button
    const messageBtn = document.createElement('button');
    messageBtn.className = 'message-btn';
    messageBtn.innerHTML = '<span class="material-symbols-rounded">chat</span>';
    messageBtn.setAttribute('title', 'Message');
    
    messageBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        handleMessageAction(user.id);
    });
    
    actionButtons.appendChild(followBtn);
    actionButtons.appendChild(messageBtn);
    
    // Options button
    const moreOptionsBtn = document.createElement('button');
    moreOptionsBtn.className = 'more-options-btn';
    moreOptionsBtn.innerHTML = '<span class="material-symbols-rounded">more_vert</span>';
    moreOptionsBtn.setAttribute('aria-label', 'More options');
    
    moreOptionsBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        showUserOptions(user.id);
    });
    
    userActions.appendChild(actionButtons);
    userActions.appendChild(moreOptionsBtn);
    userItem.appendChild(userActions);
    
    // Make the entire user card clickable to view profile
    userItem.addEventListener('click', () => {
        navigateToUserProfile(user.id);
    });
    
    return userItem;
}

// Get user initials for avatar placeholder
function getInitials(name) {
    if (!name) return 'U';
    
    const parts = name.split(' ');
    if (parts.length === 1) {
        return parts[0].charAt(0).toUpperCase();
    }
    
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

// Handle follow/unfollow action
function handleFollowAction(userId, isFollowing, isPending) {
    if (isFollowing) {
        // Unfollow
        unfollowUser(userId);
    } else if (isPending) {
        // Cancel pending request
        cancelFollowRequest(userId);
    } else {
        // Send follow request
        followUser(userId);
    }
}

// Follow a user
async function followUser(userId) {
    try {
        const userRef = doc(db, 'users', userId);
        const userDoc = await getDoc(userRef);
        
        if (!userDoc.exists()) {
            console.error('User not found');
            return;
        }
        
        const userData = userDoc.data();
        
        // Check if this user requires follow approval
        if (userData.requiresFollowApproval) {
            // Add current user to target user's pending requests
            await updateDoc(userRef, {
                pendingFollowRequests: arrayUnion(currentUserId)
            });
            
            // Update UI to show pending status
            const followBtn = document.querySelector(`.user-item[data-user-id="${userId}"] .follow-btn`);
            if (followBtn) {
                followBtn.classList.add('pending');
                followBtn.innerHTML = '<span class="material-symbols-rounded">pending</span>';
            }
            
            // Add to local tracking
            outgoingPendingRequests.push(userId);
            
            showToast('Follow request sent');
        } else {
            // Direct follow - add to each other's following/followers lists
            // Update the target user's followers
            await updateDoc(userRef, {
                followers: arrayUnion(currentUserId)
            });
            
            // Update current user's following
            const currentUserRef = doc(db, 'users', currentUserId);
            await updateDoc(currentUserRef, {
                following: arrayUnion(userId)
            });
            
            // Update UI
            const followBtn = document.querySelector(`.user-item[data-user-id="${userId}"] .follow-btn`);
            if (followBtn) {
                followBtn.classList.add('following');
                followBtn.innerHTML = '<span class="material-symbols-rounded">check</span>';
            }
            
            // Update local lists
            followingList.push(userId);
            
            showToast('Started following user');
        }
    } catch (error) {
        console.error('Error following user:', error);
        showToast('Error following user. Please try again.');
    }
}

// Unfollow a user
async function unfollowUser(userId) {
    try {
        // Update target user's followers
        const userRef = doc(db, 'users', userId);
        await updateDoc(userRef, {
            followers: arrayRemove(currentUserId)
        });
        
        // Update current user's following
        const currentUserRef = doc(db, 'users', currentUserId);
        await updateDoc(currentUserRef, {
            following: arrayRemove(userId)
        });
        
        // Update UI
        const followBtn = document.querySelector(`.user-item[data-user-id="${userId}"] .follow-btn`);
        if (followBtn) {
            followBtn.classList.remove('following');
            followBtn.innerHTML = '<span class="material-symbols-rounded">person_add</span>';
        }
        
        // Update local list
        followingList = followingList.filter(id => id !== userId);
        
        showToast('Unfollowed user');
    } catch (error) {
        console.error('Error unfollowing user:', error);
        showToast('Error unfollowing user. Please try again.');
    }
}

// Cancel a pending follow request
async function cancelFollowRequest(userId) {
    try {
        const userRef = doc(db, 'users', userId);
        
        // Remove current user from target user's pending requests
        await updateDoc(userRef, {
            pendingFollowRequests: arrayRemove(currentUserId)
        });
        
        // Update UI
        const followBtn = document.querySelector(`.user-item[data-user-id="${userId}"] .follow-btn`);
        if (followBtn) {
            followBtn.classList.remove('pending');
            followBtn.innerHTML = '<span class="material-symbols-rounded">person_add</span>';
        }
        
        // Update local tracking
        outgoingPendingRequests = outgoingPendingRequests.filter(id => id !== userId);
        
        showToast('Follow request cancelled');
    } catch (error) {
        console.error('Error cancelling request:', error);
        showToast('Error cancelling request. Please try again.');
    }
}

// Navigate to user profile
function navigateToUserProfile(userId) {
    window.location.href = `../profile/profile.html?userId=${userId}`;
}

// Handle message action
function handleMessageAction(userId) {
    // Navigate to chat with this user
    window.location.href = `../chats/chats.html?userId=${userId}`;
}

// Show user options menu
function showUserOptions(userId) {
    // This would typically show a dropdown or modal with additional options
    // For simplicity, just show a toast message
    showToast('More options coming soon');
}

// Show a toast message
function showToast(message) {
    // Check if there's an existing toast
    let toast = document.querySelector('.toast-message');
    
    // Create new toast if none exists
    if (!toast) {
        toast = document.createElement('div');
        toast.className = 'toast-message';
        document.body.appendChild(toast);
        
        // Style the toast
        Object.assign(toast.style, {
            position: 'fixed',
            bottom: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            color: 'white',
            padding: '10px 20px',
            zIndex: '1000',
            borderRadius: '4px',
            opacity: '0',
            transition: 'opacity 0.3s ease'
        });
    }
    
    // Set message and show
    toast.textContent = message;
    
    // Fade in
    setTimeout(() => {
        toast.style.opacity = '1';
    }, 10);
    
    // Fade out and remove after delay
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }, 3000);
}

// Show loading skeletons
function showLoading(isLoading) {
    if (isLoading) {
        // Already has skeleton loaders in HTML
        emptyState.style.display = 'none';
    } else {
        // Clear skeletons when loading is done
        usersList.querySelectorAll('.skeleton-user').forEach(skeleton => {
            skeleton.remove();
        });
    }
}

// Show error message
function showError(message) {
    emptyState.style.display = 'flex';
    const heading = emptyState.querySelector('h3');
    const text = emptyState.querySelector('p');
    
    if (heading) heading.textContent = 'Error Loading Users';
    if (text) text.textContent = message;
} 