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
const userSearch = document.getElementById('user-search');
const emptyState = document.getElementById('empty-state');
const filterButtons = document.querySelectorAll('.filter-btn');

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

// Initialize page
document.addEventListener('DOMContentLoaded', () => {
    // Set default active filter
    setActiveFilter('all');
    
    // Check authentication state
    auth.onAuthStateChanged(async (user) => {
        if (user) {
            currentUserId = user.uid;
            await Promise.all([
                loadAllUsers(),
                loadFollowingAndFollowers()
            ]);
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
});

// Setup event listeners
function setupEventListeners() {
    // Search functionality
    userSearch.addEventListener('input', handleSearch);
    
    // Filter buttons
    filterButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            const filter = e.target.dataset.filter;
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

// Apply filter (all, following, followers)
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
        case 'all':
        default:
            filteredUsers = [...allUsers];
            break;
    }
    
    // Apply any current search filter
    if (userSearch.value.trim() !== '') {
        const searchTerm = userSearch.value.trim().toLowerCase();
        filteredUsers = filteredUsers.filter(user => 
            (user.fullName && user.fullName.toLowerCase().includes(searchTerm)) ||
            (user.email && user.email.toLowerCase().includes(searchTerm))
        );
    }
    
    displayUsers(filteredUsers);
}

// Handle search input
function handleSearch() {
    applyFilter(currentFilter);
}

// Set active filter button
function setActiveFilter(filter) {
    filterButtons.forEach(button => {
        if (button.dataset.filter === filter) {
            button.classList.add('active');
        } else {
            button.classList.remove('active');
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
        } else if (userSearch.value.trim() !== '') {
            emptyStateHeading.textContent = 'No users found';
            emptyStateText.textContent = 'Try adjusting your search criteria';
        } else {
            emptyStateHeading.textContent = 'No users available';
            emptyStateText.textContent = 'Check back later for more users';
        }
        
        return;
    }
    
    emptyState.style.display = 'none';
    
    users.forEach(user => {
        const isFollowing = followingList.includes(user.id);
        const userElement = createUserElement(user, isFollowing);
        usersList.appendChild(userElement);
    });
}

// Create HTML element for a user
function createUserElement(user, isFollowing) {
    const userItem = document.createElement('div');
    userItem.className = 'user-item';
    
    // Get user's avatar or display default icon
    let avatarContent = '';
    if (user.photoURL) {
        avatarContent = `<img src="${user.photoURL}" alt="${user.fullName || 'User'}">`;
    } else {
        // Always use default icon for users without photos
        avatarContent = `<i class="fas fa-user"></i>`;
    }
    
    // Ensure we display the user's name if available
    // Make sure to trim the name and check it's not empty
    const displayName = user.fullName && user.fullName.trim() ? user.fullName : 'User';
    
    // Check if we have a pending follow request to this user
    const isPending = outgoingPendingRequests.includes(user.id);
    
    // Set button class and text based on follow status
    let btnClass = '';
    let btnIcon = '<i class="fas fa-user-plus"></i>';
    
    if (isFollowing) {
        btnClass = 'following';
        btnIcon = '<i class="fas fa-check"></i>';
    } else if (isPending) {
        btnClass = 'pending';
        btnIcon = '<i class="fas fa-clock"></i>';
    }
    
    // Create HTML structure
    userItem.innerHTML = `
        <div class="user-avatar">
            ${avatarContent}
        </div>
        <div class="user-details">
            <div class="user-name">${displayName}</div>
            <div class="user-bio">${user.bio || user.email || ''}</div>
        </div>
        <div class="user-actions">
            <button class="follow-btn ${btnClass}" data-user-id="${user.id}" ${isPending ? 'title="Click to cancel follow request"' : ''}>
                ${btnIcon}
            </button>
            <button class="message-btn" data-user-id="${user.id}">
                <i class="fas fa-comment"></i>
            </button>
        </div>
    `;
    
    // Make the entire user item clickable to navigate to profile
    userItem.addEventListener('click', (e) => {
        // Don't navigate if clicking on buttons
        if (!e.target.closest('.follow-btn') && !e.target.closest('.message-btn')) {
            navigateToProfile(user.id);
        }
    });
    
    // Add follow/unfollow functionality
    const followBtn = userItem.querySelector('.follow-btn');
    followBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleFollow(user.id, followBtn);
    });
    
    // Add message functionality
    const messageBtn = userItem.querySelector('.message-btn');
    messageBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        navigateToChat(user.id);
    });
    
    return userItem;
}

// Toggle follow/unfollow
async function toggleFollow(userId, button) {
    const isFollowing = button.classList.contains('following');
    const isPending = button.classList.contains('pending');
    
    // Disable button during operation
    button.disabled = true;
    
    // Show local loading state in the button
    const originalContent = button.innerHTML;
    button.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    
    try {
        if (isFollowing) {
            // Unfollow user
            const batch = writeBatch(db);
            
            // Update current user's following list
            const currentUserRef = doc(db, 'users', currentUserId);
            batch.update(currentUserRef, {
                following: arrayRemove(userId)
            });
            
            // Update target user's followers list
            const targetUserRef = doc(db, 'users', userId);
            batch.update(targetUserRef, {
                followers: arrayRemove(currentUserId)
            });
            
            await batch.commit();
            
            // Update local cache
            followingList = followingList.filter(id => id !== userId);
            
            // Update button
            button.classList.remove('following');
            button.innerHTML = '<i class="fas fa-user-plus"></i>';
            
        } else if (isPending) {
            // Cancel the follow request
            const batch = writeBatch(db);
            
            // Remove from pending requests in target user's document
            const targetUserRef = doc(db, 'users', userId);
            batch.update(targetUserRef, {
                pendingFollowRequests: arrayRemove(currentUserId)
            });
            
            await batch.commit();
            
            // Update local cache
            outgoingPendingRequests = outgoingPendingRequests.filter(id => id !== userId);
            
            // Update button
            button.classList.remove('pending');
            button.removeAttribute('title');
            button.innerHTML = '<i class="fas fa-user-plus"></i>';
            
            // If there are notifications, remove them
            try {
                const notificationsRef = collection(db, 'users', userId, 'notifications');
                const q = query(notificationsRef, 
                    where("type", "==", "follow_request"),
                    where("senderId", "==", currentUserId)
                );
                
                const notificationSnapshot = await getDocs(q);
                
                if (!notificationSnapshot.empty) {
                    const batch = writeBatch(db);
                    
                    notificationSnapshot.forEach(doc => {
                        batch.delete(doc.ref);
                    });
                    
                    await batch.commit();
                }
            } catch (notifError) {
                console.error('Error removing notification:', notifError);
            }
            
        } else {
            // Send follow request
            const targetUserRef = doc(db, 'users', userId);
            
            // Add to target user's pending requests
            await updateDoc(targetUserRef, {
                pendingFollowRequests: arrayUnion(currentUserId)
            });
            
            // Update local cache
            outgoingPendingRequests.push(userId);
            
            // Update button
            button.classList.add('pending');
            button.title = 'Click to cancel follow request';
            button.innerHTML = '<i class="fas fa-clock"></i>';
            
            // Send notification to target user
            try {
                // Get sender info
                const senderName = auth.currentUser.displayName || 'A user';
                
                const notificationRef = collection(db, 'users', userId, 'notifications');
                await addDoc(notificationRef, {
                    type: 'follow_request',
                    senderId: currentUserId,
                    senderName: senderName,
                    senderPhoto: auth.currentUser.photoURL || null,
                    title: 'New Follow Request',
                    text: `${senderName} wants to follow you`,
                    actions: ['accept', 'reject'],
                    read: false,
                    timestamp: new Date()
                });
            } catch (notifError) {
                console.error('Error sending notification:', notifError);
            }
        }
    } catch (error) {
        console.error('Error toggling follow:', error);
        // Restore original button state on error
        button.innerHTML = originalContent;
        
        let errorMessage = 'Failed to update follow status';
        if (isFollowing) {
            errorMessage = 'Failed to unfollow user';
        } else if (isPending) {
            errorMessage = 'Failed to cancel follow request';
        } else {
            errorMessage = 'Failed to send follow request';
        }
        showError(errorMessage);
    } finally {
        // Re-enable button
        button.disabled = false;
    }
}

// Navigate to user profile
function navigateToProfile(userId) {
    window.location.href = `../profile/profile.html?userId=${userId}`;
}

// Navigate to chat with user
async function navigateToChat(userId) {
    try {
        showLoading(true);
        
        // Get current user and target user details
        const currentUser = auth.currentUser;
        const targetUserDoc = await getDoc(doc(db, 'users', userId));
        
        if (!currentUser || !targetUserDoc.exists()) {
            showError('User not found');
            return;
        }
        
        const targetUser = targetUserDoc.data();
        
        // Check if a chat already exists between these users
        const chatsRef = collection(db, 'chats');
        const q1 = query(chatsRef, 
            where('participants', 'array-contains', currentUserId),
            where('type', '==', 'direct')
        );
        
        const chatsSnapshot = await getDocs(q1);
        let existingChatId = null;
        
        // Look for an existing chat with the target user
        chatsSnapshot.forEach(chatDoc => {
            const chatData = chatDoc.data();
            if (chatData.participants.includes(userId)) {
                existingChatId = chatDoc.id;
            }
        });
        
        // If no existing chat, create a new one
        if (!existingChatId) {
            const newChatRef = doc(collection(db, 'chats'));
            const currentTime = new Date();
            
            // Create the chat document without initial message
            await setDoc(newChatRef, {
                type: 'direct',
                participants: [currentUserId, userId],
                lastMessage: "",
                lastMessageTime: currentTime,
                lastMessageSender: "",
                createdAt: currentTime,
                lastUpdated: currentTime,
                creator: currentUserId
            });
            
            // Create user-specific chat data
            const currentUserName = currentUser.displayName || 'You';
            const targetUserName = targetUser.fullName || targetUser.displayName || 'User';
            
            // Add chat to current user's chats collection
            await setDoc(doc(db, 'users', currentUserId, 'chats', newChatRef.id), {
                chatId: newChatRef.id,
                name: targetUserName,
                photoURL: targetUser.photoURL || null,
                unreadCount: 0,
                lastAccess: currentTime,
                lastMessage: "",
                lastMessageTime: currentTime,
                lastMessageSender: ""
            });
            
            // Add chat to target user's chats collection
            await setDoc(doc(db, 'users', userId, 'chats', newChatRef.id), {
                chatId: newChatRef.id,
                name: currentUserName,
                photoURL: currentUser.photoURL || null,
                unreadCount: 0,
                lastAccess: currentTime,
                lastMessage: "",
                lastMessageTime: currentTime,
                lastMessageSender: ""
            });
            
            // Send notification to the target user
            const notificationRef = collection(db, 'users', userId, 'notifications');
            await addDoc(notificationRef, {
                type: 'new_chat',
                senderId: currentUserId,
                senderName: currentUserName,
                senderPhoto: currentUser.photoURL || null,
                title: 'New Chat',
                text: `${currentUserName} started a new conversation with you`,
                read: false,
                timestamp: currentTime
            });
            
            existingChatId = newChatRef.id;
        }
        
        // Set a flag in sessionStorage to indicate this is a direct navigation
        sessionStorage.setItem('directNavigation', 'true');
        
        // Navigate to chats page with the chat ID and showMessages parameter
        window.location.href = `../chats/chats.html?chatId=${existingChatId}&showMessages=true`;
        
    } catch (error) {
        console.error('Error creating or navigating to chat:', error);
        showError('Unable to start chat. Please try again.');
    } finally {
        showLoading(false);
    }
}

// Show/hide loading state
function showLoading(isLoading) {
    // Get all skeleton users
    const skeletonUsers = usersList.querySelectorAll('.skeleton-user');
    
    // Show/hide skeletons based on loading state
    skeletonUsers.forEach(skeleton => {
        skeleton.style.display = isLoading ? 'flex' : 'none';
    });
    
    // If loading is finished, ensure the empty state is updated correctly
    if (!isLoading && allUsers.length === 0) {
        emptyState.style.display = 'flex';
    } else if (!isLoading) {
        emptyState.style.display = 'none';
    }
}

// Show error toast
function showError(message) {
    // Create toast element
    const toast = document.createElement('div');
    toast.className = 'toast-message error';
    toast.textContent = message;
    
    // Add to body
    document.body.appendChild(toast);
    
    // Show toast
    setTimeout(() => {
        toast.classList.add('show');
    }, 100);
    
    // Hide and remove toast
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            document.body.removeChild(toast);
        }, 300);
    }, 3000);
} 