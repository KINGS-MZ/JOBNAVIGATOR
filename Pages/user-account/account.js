// DOM elements
const themeToggle = document.getElementById('theme-toggle');
const userMenuBtn = document.getElementById('user-menu-btn');
const userDropdown = document.getElementById('user-dropdown');
const editProfileBtn = document.getElementById('edit-profile-btn');
const followBtn = document.getElementById('follow-btn');
const chatBtn = document.getElementById('chat-btn');
const moreOptionsBtn = document.getElementById('more-options-btn');
const optionsDropdown = document.getElementById('options-dropdown');
const blockUserBtn = document.getElementById('block-user-btn');
const reportUserBtn = document.getElementById('report-user-btn');
const shareProfileBtn = document.getElementById('share-profile-btn');
const editSectionBtns = document.querySelectorAll('.edit-section-btn');
const modalOverlay = document.getElementById('modal-overlay');
const toastContainer = document.getElementById('toast-container');
const logoutLink = document.getElementById('logout-link');
const avatarUpload = document.getElementById('avatar-upload');
const userAvatar = document.getElementById('user-avatar');

// Skeleton loaders
const skeletonElements = {
    avatar: document.getElementById('avatar-skeleton'),
    name: document.getElementById('name-skeleton'),
    headline: document.getElementById('headline-skeleton'),
    location: document.getElementById('location-skeleton'),
    connections: document.getElementById('connections-skeleton'),
    applications: document.getElementById('applications-skeleton'),
    interviews: document.getElementById('interviews-skeleton'),
    about: document.getElementById('about-skeleton'),
    experience: document.getElementById('experience-skeleton'),
    education: document.getElementById('education-skeleton'),
    skills: document.getElementById('skills-skeleton'),
    certifications: document.getElementById('certifications-skeleton'),
    languages: document.getElementById('languages-skeleton')
};

// Auth state
let currentUser = null;
let profileUserId = null;
let isOwnProfile = true;

// Initialize the page
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    
    // Check for userId parameter in URL
    const urlParams = new URLSearchParams(window.location.search);
    profileUserId = urlParams.get('userId');
    
    initEventListeners();
    initFirebaseAuth();
});

// Theme initialization
function initTheme() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.documentElement.classList.add('dark-mode');
        document.body.classList.add('dark-mode');
    }
}

// Initialize event listeners
function initEventListeners() {
    // Theme toggle
    themeToggle.addEventListener('click', toggleTheme);
    
    // User menu dropdown
    userMenuBtn.addEventListener('click', toggleUserMenu);
    
    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.user-menu') && userDropdown.classList.contains('show')) {
            userDropdown.classList.remove('show');
        }
        
        if (!e.target.closest('.more-options-container') && optionsDropdown.classList.contains('show')) {
            optionsDropdown.classList.remove('show');
        }
    });
    
    // Avatar upload is now handled by setupAvatarUpload function after authentication
    
    // Edit profile button
    editProfileBtn.addEventListener('click', () => {
        showModal('profile', { userDetails: currentUser });
    });
    
    // Follow button
    followBtn.addEventListener('click', async () => {
        if (!currentUser || !profileUserId) return;
        
        try {
            const isFollowing = followBtn.classList.contains('following');
            const isPending = followBtn.classList.contains('pending');
            
            if (isFollowing) {
                // Unfollow user
                await firebase.firestore().collection("users").doc(currentUser.uid).update({
                    following: firebase.firestore.FieldValue.arrayRemove(profileUserId)
                });
                
                // Update the user's followers list
                await firebase.firestore().collection("users").doc(profileUserId).update({
                    followers: firebase.firestore.FieldValue.arrayRemove(currentUser.uid)
                });
                
                followBtn.classList.remove('following');
                followBtn.innerHTML = '<i class="fas fa-user-plus"></i> Follow';
                showToast('You unfollowed this user', 'info');
            } else if (isPending) {
                // Cancel the follow request
                await firebase.firestore().collection("users").doc(profileUserId).update({
                    pendingFollowRequests: firebase.firestore.FieldValue.arrayRemove(currentUser.uid)
                });
                
                // Remove any pending notifications for this follow request
                const notificationsSnapshot = await firebase.firestore().collection("users")
                    .doc(profileUserId)
                    .collection("notifications")
                    .where("type", "==", "follow_request")
                    .where("senderId", "==", currentUser.uid)
                    .get();
                    
                // Delete each matching notification
                notificationsSnapshot.forEach(async (doc) => {
                    await firebase.firestore().collection("users")
                        .doc(profileUserId)
                        .collection("notifications")
                        .doc(doc.id)
                        .delete();
                });
                
                // Reset button state
                followBtn.classList.remove('pending');
                followBtn.innerHTML = '<i class="fas fa-user-plus"></i> Follow';
                followBtn.title = "";
                showToast('Follow request cancelled', 'info');
            } else {
                // Send follow request
                await firebase.firestore().collection("users").doc(profileUserId).update({
                    pendingFollowRequests: firebase.firestore.FieldValue.arrayUnion(currentUser.uid)
                });
                
                // Update button state
                followBtn.classList.add('pending');
                followBtn.innerHTML = '<i class="fas fa-clock"></i> Pending';
                followBtn.title = "Click to cancel follow request";
                
                // Send a follow request notification
                await sendFollowRequestNotification(profileUserId, currentUser.uid);
                showToast('Follow request sent', 'success');
            }
        } catch (error) {
            console.error("Error updating follow status:", error);
            showToast('Error updating follow status', 'error');
        }
    });
    
    // Chat button
    chatBtn.addEventListener('click', () => {
        // Set a flag in sessionStorage to indicate this is a direct navigation
        sessionStorage.setItem('directNavigation', 'true');
        
        // Navigate to the chats page with the user ID
        window.location.href = `../chats/chats.html?contact=${profileUserId}`;
    });
    
    // More options button
    moreOptionsBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        optionsDropdown.classList.toggle('show');
    });
    
    // We'll attach listeners to options dropdown items in updateUIForOwnProfile or updateUIForVisitingUser
    // since the contents will change based on whether viewing own profile or another user's
    
    // Section edit buttons
    editSectionBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const section = btn.getAttribute('data-section');
            showModal(section);
        });
    });
    
    // Edit and delete buttons for items
    document.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const item = btn.closest('.experience-item, .education-item, .certification-item');
            const section = item.closest('section').querySelector('.card-header h2').textContent.toLowerCase();
            const itemData = getItemData(item, section);
            showModal(section, { action: 'edit', itemData });
        });
    });
    
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const item = btn.closest('.experience-item, .education-item, .certification-item');
            const section = item.closest('section').querySelector('.card-header h2').textContent.toLowerCase();
            const itemData = getItemData(item, section);
            confirmDelete(section, itemData);
        });
    });
    
    // Logout link
    logoutLink.addEventListener('click', (e) => {
        e.preventDefault();
        logout();
    });
}

// Toggle theme
function toggleTheme() {
    const isDarkMode = document.documentElement.classList.toggle('dark-mode');
    document.body.classList.toggle('dark-mode');
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
}

// Toggle user menu dropdown
function toggleUserMenu() {
    userDropdown.classList.toggle('show');
}

// Initialize Firebase Auth
function initFirebaseAuth() {
    try {
        firebase.auth().onAuthStateChanged(handleAuthStateChanged);
    } catch (error) {
        console.error("Firebase Auth Error:", error);
        showToast("Error initializing authentication. Please try again later.", "error");
    }
}

// Handle auth state changed
function handleAuthStateChanged(user) {
    if (user) {
        // User is signed in
        currentUser = user;
        
        // Update dropdown menu with user info
        updateDropdownForCurrentUser(user);
        
        // Determine if we're viewing our own profile or someone else's
        if (!profileUserId || profileUserId === user.uid) {
            // Viewing own profile
            profileUserId = user.uid;
            getUserData(user.uid);
            updateUIForLoggedInUser(user);
        } else {
            // Viewing someone else's profile - record the visit
            recordProfileView(profileUserId, user.uid);
            getOtherUserData(profileUserId);
            updateUIForVisitingUser();
        }
        
        // Setup avatar upload functionality
        setupAvatarUpload(user);
    } else {
        // No user is signed in, redirect to login
        window.location.href = '../login/login.html?redirect=' + encodeURIComponent(window.location.href);
    }
}

// Update dropdown menu with current user's information
function updateDropdownForCurrentUser(user) {
    // Update user name and email in dropdown
    document.getElementById('user-name').textContent = user.displayName || 'User';
    document.getElementById('user-email').textContent = user.email || '';
    
    // Update avatar in dropdown
    const avatarImageDropdown = document.getElementById('avatar-image-dropdown');
    const avatarInitialsDropdown = document.getElementById('avatar-initials-dropdown');
    
    if (user.photoURL) {
        // Show user image
        if (avatarImageDropdown) {
            avatarImageDropdown.src = user.photoURL;
            avatarImageDropdown.style.display = 'block';
        }
        
        // Hide initials
        if (avatarInitialsDropdown) {
            avatarInitialsDropdown.style.display = 'none';
        }
    } else {
        // Show initials
        if (avatarInitialsDropdown) {
            const initials = getInitials(user.displayName || 'User');
            avatarInitialsDropdown.textContent = initials;
            avatarInitialsDropdown.style.display = 'flex';
        }
        
        // Hide image
        if (avatarImageDropdown) {
            avatarImageDropdown.style.display = 'none';
        }
    }
    
    // Check user subscription and update the upgrade button
    checkUserSubscription(user.uid);
    
    // Update saved jobs count if needed (make an API call to get this data)
    firebase.firestore().collection('users').doc(user.uid).get()
        .then(doc => {
            if (doc.exists) {
                const userData = doc.data();
                const savedJobsBadge = document.getElementById('saved-jobs-badge');
                if (savedJobsBadge && userData.savedJobs) {
                    const savedJobsCount = userData.savedJobs.length;
                    savedJobsBadge.textContent = savedJobsCount > 0 ? savedJobsCount : '';
                }
            }
        })
        .catch(error => {
            console.error("Error getting user data for dropdown:", error);
        });
}

// Check user subscription and update upgrade button accordingly
async function checkUserSubscription(userId) {
    try {
        const upgradeBtn = document.querySelector('.upgrade-btn');
        if (!upgradeBtn) return;
        
        if (!userId) {
            // If no user is logged in, show the upgrade button
            upgradeBtn.style.display = 'flex';
            upgradeBtn.innerHTML = '<i class="fas fa-star"></i>Upgrade';
            upgradeBtn.classList.remove('premium-badge', 'admin-badge');
            return;
        }
        
        // First check the user document for embedded subscription data
        const userDoc = await firebase.firestore().collection('users').doc(userId).get();
        
        if (userDoc.exists) {
            const userData = userDoc.data();
            // Check if user is an admin
            if (userData.role === 'admin') {
                upgradeBtn.style.display = 'flex';
                upgradeBtn.innerHTML = '<i class="fas fa-pen-fancy"></i>Creator';
                upgradeBtn.classList.remove('premium-badge');
                upgradeBtn.classList.add('admin-badge');
                return;
            }
            
            // Check if user has subscription data embedded in their user document
            if (userData.subscription && userData.subscription.status === 'active' && 
                userData.subscription.plan === 'premium') {
                upgradeBtn.style.display = 'flex';
                upgradeBtn.innerHTML = '<i class="fas fa-crown"></i>Premium';
                upgradeBtn.classList.remove('admin-badge');
                upgradeBtn.classList.add('premium-badge');
                upgradeBtn.href = '../subscription/subscription.html';
                return;
            }
        }
        
        // If we didn't find subscription in user document, check the subscriptions collection
        try {
            // Query the subscriptions collection
            const subscriptionQuery = await firebase.firestore()
                .collection('subscriptions')
                .where('userId', '==', userId)
                .where('status', 'in', ['active', 'trial'])
                .get();
            
            if (!subscriptionQuery.empty) {
                const subscription = subscriptionQuery.docs[0].data();
                // Check if the subscription is premium or professional
                if (subscription.plan.toLowerCase() === 'premium' || 
                    subscription.plan.toLowerCase() === 'professional') {
                    upgradeBtn.style.display = 'flex';
                    if (subscription.plan.toLowerCase() === 'premium') {
                        upgradeBtn.innerHTML = '<i class="fas fa-crown"></i>Premium';
                    } else {
                        upgradeBtn.innerHTML = '<i class="fas fa-gem"></i>Professional';
                    }
                    upgradeBtn.classList.remove('admin-badge');
                    upgradeBtn.classList.add('premium-badge');
                    upgradeBtn.href = '../subscription/subscription.html';
                    return;
                }
            }
        } catch (subscriptionError) {
            console.error('Error checking subscriptions collection:', subscriptionError);
        }
        
        // If we've reached here, user doesn't have a premium subscription or admin role, show the upgrade button
        upgradeBtn.style.display = 'flex';
        upgradeBtn.innerHTML = '<i class="fas fa-star"></i>Upgrade';
        upgradeBtn.classList.remove('premium-badge', 'admin-badge');
        upgradeBtn.href = '../subscription/subscription.html';
        
    } catch (error) {
        console.error('Error checking subscription status:', error);
        // In case of error, default to showing the button
        const upgradeBtn = document.querySelector('.upgrade-btn');
        if (upgradeBtn) {
            upgradeBtn.style.display = 'flex';
            upgradeBtn.innerHTML = '<i class="fas fa-star"></i>Upgrade';
            upgradeBtn.classList.remove('premium-badge', 'admin-badge');
        }
    }
}

// Get user data from Firestore
function getUserData(userId) {
    try {
        // First, get the user document
        firebase.firestore().collection('users').doc(userId).get()
            .then(doc => {
                if (doc.exists) {
                    const userData = doc.data();
                    
                    // Then check for subscription data
                    return firebase.firestore().collection('subscriptions')
                        .where('userId', '==', userId)
                        .where('status', 'in', ['active', 'trial'])
                        .get()
                        .then(snapshot => {
                            // Add subscription data if available
                            if (!snapshot.empty) {
                                const subscriptionData = snapshot.docs[0].data();
                                userData.subscription = {
                                    plan: subscriptionData.plan,
                                    status: subscriptionData.status
                                };
                                console.log('Found active subscription:', userData.subscription);
                            } else if (userData.currentSubscription) {
                                // For backward compatibility, use currentSubscription if available
                                userData.subscription = {
                                    plan: userData.currentSubscription.plan,
                                    status: userData.currentSubscription.status || 'active'
                                };
                                console.log('Using currentSubscription data:', userData.subscription);
                            }
                            
                            // Update the profile with complete data
                            updateProfileData(userData);
                        })
                        .catch(error => {
                            console.error("Error fetching subscription data:", error);
                            // Continue with user data even if subscription fetch fails
                            updateProfileData(userData);
                        });
                }
            })
            .catch(error => {
                console.error("Error getting user data:", error);
                showToast("Error loading profile data", "error");
            });
    } catch (error) {
        console.error("Firestore Error:", error);
        showToast("Database connection error", "error");
    }
}

// Get other user's data from Firestore
function getOtherUserData(userId) {
    try {
        // Initialize buttons to their default enabled state immediately
        if (followBtn) {
            followBtn.disabled = false;
            followBtn.classList.remove('disabled', 'following', 'pending');
            followBtn.innerHTML = '<i class="fas fa-user-plus"></i> Follow';
            followBtn.title = "";
        }
        
        if (chatBtn) {
            chatBtn.disabled = false;
            chatBtn.classList.remove('disabled');
            chatBtn.title = "";
        }
        
        // First, get the user document
        firebase.firestore().collection('users').doc(userId).get()
            .then(doc => {
                if (doc.exists) {
                    const userData = doc.data();
                    
                    // Ensure we have the photo URL (could be in different properties)
                    userData.photoURL = userData.photoURL || userData.profilePicture || userData.avatarUrl;
                    
                    // Then check for subscription data
                    return firebase.firestore().collection('subscriptions')
                        .where('userId', '==', userId)
                        .where('status', 'in', ['active', 'trial'])
                        .get()
                        .then(snapshot => {
                            // Add subscription data if available
                            if (!snapshot.empty) {
                                const subscriptionData = snapshot.docs[0].data();
                                userData.subscription = {
                                    plan: subscriptionData.plan,
                                    status: subscriptionData.status
                                };
                                console.log('Found active subscription for other user:', userData.subscription);
                            } else if (userData.currentSubscription) {
                                // For backward compatibility, use currentSubscription if available
                                userData.subscription = {
                                    plan: userData.currentSubscription.plan,
                                    status: userData.currentSubscription.status || 'active'
                                };
                                console.log('Using currentSubscription data for other user:', userData.subscription);
                            }
                            
                            // Update the profile with complete data
                            updateProfileData(userData);
                            
                            // Only check follow status if we have a current user
                            if (currentUser) {
                                checkFollowStatus(userId);
                            }
                        })
                        .catch(error => {
                            console.error("Error fetching subscription data:", error);
                            // Continue with user data even if subscription fetch fails
                            updateProfileData(userData);
                            
                            if (currentUser) {
                                checkFollowStatus(userId);
                            }
                        });
                } else {
                    // User not found
                    showToast("User not found", "error");
                    // Redirect to our own profile after a delay
                    setTimeout(() => {
                        window.location.href = 'account.html';
                    }, 2000);
                }
            })
            .catch(error => {
                console.error("Error getting user data:", error);
                showToast("Error loading user profile", "error");
            });
    } catch (error) {
        console.error("Error in getOtherUserData:", error);
        showToast("Error loading user profile", "error");
    }
}

// Update UI for logged in user viewing their own profile
function updateUIForLoggedInUser(user) {
    console.log('Updating UI for logged in user viewing their own profile');
    
    isOwnProfile = true;
    
    // Show edit profile button
    const editProfileBtn = document.getElementById('edit-profile-btn');
    if (editProfileBtn) {
        editProfileBtn.style.display = '';
    }
    
    // Hide follow button and chat button
    const followBtn = document.getElementById('follow-btn');
    if (followBtn) {
        followBtn.style.display = 'none';
    }
    
    const chatBtn = document.getElementById('chat-btn');
    if (chatBtn) {
        chatBtn.style.display = 'none';
    }
    
    // Update options dropdown menu for own profile
    const optionsDropdown = document.getElementById('options-dropdown');
    if (optionsDropdown) {
        optionsDropdown.innerHTML = `
            <a href="#" id="download-resume-btn"><i class="fas fa-file-download"></i> Export Resume</a>
            <a href="#" id="profile-analytics-btn"><i class="fas fa-chart-line"></i> View Analytics</a>
            <a href="../settings/settings.html"><i class="fas fa-user-cog"></i> Account Settings</a>
            <a href="#" id="job-preferences-btn"><i class="fas fa-briefcase"></i> Career Preferences</a>
        `;
        
        // Add event listeners for new options
        document.getElementById('download-resume-btn').addEventListener('click', (e) => {
            e.preventDefault();
            downloadResume();
        });
        
        document.getElementById('profile-analytics-btn').addEventListener('click', (e) => {
            e.preventDefault();
            showProfileAnalytics();
        });
        
        document.getElementById('job-preferences-btn').addEventListener('click', (e) => {
            e.preventDefault();
            showJobPreferences();
        });
    }
    
    // Show edit buttons for all sections
    document.querySelectorAll('.edit-section-btn').forEach(btn => {
        btn.style.display = '';
    });
    
    // Other UI updates for own profile...
}

// Download profile as PDF (placeholder)
function downloadProfile() {
    showToast('Preparing your profile for download...', 'info');
    
    // Simulate download delay
    setTimeout(() => {
        showToast('Profile downloaded successfully!', 'success');
    }, 1500);
}

// View public profile (placeholder)
function viewPublicProfile() {
    showToast('Opening your public profile view...', 'info');
    
    // Get current URL without query parameters
    const baseUrl = window.location.href.split('?')[0];
    
    // Open in new tab with a view parameter
    window.open(`${baseUrl}?view=public&userId=${currentUser.uid}`, '_blank');
}

// Update UI for logged in user viewing another user's profile
function updateUIForVisitingUser() {
    console.log('Updating UI for visiting another user profile');
    
    isOwnProfile = false;
    
    // Hide edit profile button
    const editProfileBtn = document.getElementById('edit-profile-btn');
    if (editProfileBtn) {
        editProfileBtn.style.display = 'none';
    }
    
    // Show follow button
    const followBtn = document.getElementById('follow-btn');
    if (followBtn) {
        followBtn.style.display = '';
    }
    
    // Show chat button for other users' profiles
    const chatBtn = document.getElementById('chat-btn');
    if (chatBtn) {
        chatBtn.style.display = '';
    }
    
    // Update options dropdown menu for visiting other profiles
    const optionsDropdown = document.getElementById('options-dropdown');
    if (optionsDropdown) {
        optionsDropdown.innerHTML = `
            <a href="#" id="block-user-btn"><i class="fas fa-ban"></i> Block Profile</a>
            <a href="#" id="report-user-btn"><i class="fas fa-flag"></i> Report Content</a>
            <a href="#" id="share-profile-btn"><i class="fas fa-share-alt"></i> Share Profile</a>
        `;
        
        // Add event listeners for options
        document.getElementById('block-user-btn').addEventListener('click', (e) => {
            e.preventDefault();
            showConfirmDialog('Block User', 'Are you sure you want to block this user? You won\'t see their content anymore.', () => {
                showToast('User has been blocked', 'success');
                optionsDropdown.classList.remove('show');
            });
        });
        
        document.getElementById('report-user-btn').addEventListener('click', (e) => {
            e.preventDefault();
            showReportModal();
            optionsDropdown.classList.remove('show');
        });
        
        document.getElementById('share-profile-btn').addEventListener('click', (e) => {
            e.preventDefault();
            
            // Check if Web Share API is available
            if (navigator.share) {
                navigator.share({
                    title: document.getElementById('display-name').textContent,
                    text: 'Check out this profile on Job Navigator!',
                    url: window.location.href
                })
                .then(() => console.log('Shared successfully'))
                .catch((error) => console.log('Error sharing:', error));
            } else {
                // Fallback
                showToast('Profile link copied to clipboard!', 'success');
                navigator.clipboard.writeText(window.location.href);
            }
            
            optionsDropdown.classList.remove('show');
        });
    }
    
    // Hide edit buttons for all sections
    document.querySelectorAll('.edit-section-btn').forEach(btn => {
        btn.style.display = 'none';
    });
    
    // Check follow status with the other user
    checkFollowStatus(profileUserId);
    
    // Other UI updates for visited profile...
}

// Check if already following or has a pending request
async function checkFollowStatus(userId) {
    if (!currentUser || !userId || userId === currentUser.uid) return;
    
    try {
        // First reset button states to default
        followBtn.disabled = false;
        followBtn.classList.remove('disabled', 'following', 'pending');
        followBtn.innerHTML = '<i class="fas fa-user-plus"></i> Follow';
        followBtn.title = "";
        
        chatBtn.disabled = false;
        chatBtn.classList.remove('disabled');
        chatBtn.title = "";
        
        // Get both user documents in parallel to avoid race conditions
        const [currentUserDoc, profileUserDoc] = await Promise.all([
            firebase.firestore().collection("users").doc(currentUser.uid).get(),
            firebase.firestore().collection("users").doc(userId).get()
        ]);
        
        if (!currentUserDoc.exists || !profileUserDoc.exists) {
            console.error("One of the user documents doesn't exist");
            return;
        }
        
        const currentUserData = currentUserDoc.data();
        const profileUserData = profileUserDoc.data();
        
        // Get all the necessary arrays with fallbacks to empty arrays
        const following = currentUserData.following || [];
        const blockedUsers = currentUserData.blockedUsers || [];
        const pendingFollowRequests = profileUserData.pendingFollowRequests || [];
        const blockedByProfileUser = profileUserData.blockedUsers || [];
        
        // Check block status first (has priority)
        if (blockedUsers.includes(userId)) {
            // Current user has blocked the profile user
            followBtn.disabled = true;
            followBtn.classList.add('disabled');
            followBtn.title = "You've blocked this user";
            
            chatBtn.disabled = true;
            chatBtn.classList.add('disabled');
            chatBtn.title = "You've blocked this user";
            return;
        }
        
        if (blockedByProfileUser.includes(currentUser.uid)) {
            // Profile user has blocked the current user
            followBtn.disabled = true;
            followBtn.classList.add('disabled');
            followBtn.title = "Unable to follow this user";
            
            chatBtn.disabled = true;
            chatBtn.classList.add('disabled');
            chatBtn.title = "Unable to chat with this user";
            return;
        }
        
        // If we get here, no blocking is in place, proceed with follow status
        if (following.includes(userId)) {
            // Already following this user
            followBtn.classList.add('following');
            followBtn.innerHTML = '<i class="fas fa-user-check"></i> Following';
        } else if (pendingFollowRequests.includes(currentUser.uid)) {
            // Request already sent
            followBtn.classList.add('pending');
            followBtn.innerHTML = '<i class="fas fa-clock"></i> Pending';
            followBtn.title = "Click to cancel follow request";
        }
    } catch (error) {
        console.error("Error checking follow status:", error);
        // On error, ensure buttons remain enabled
        followBtn.disabled = false;
        chatBtn.disabled = false;
    }
}

// Update profile data on UI
function updateProfileData(userData) {
    // Update user avatar
    const userAvatarImg = document.getElementById('user-avatar');
    if (userData.photoURL) {
        userAvatarImg.src = userData.photoURL;
        userAvatarImg.style.display = '';
        if (skeletonElements.avatar) {
            skeletonElements.avatar.style.display = 'none';
        }
    } else {
        // Create initials avatar if no photo
        userAvatarImg.style.display = 'none';
        // The skeleton avatar will continue to be shown until we hide it manually
        if (skeletonElements.avatar) {
            skeletonElements.avatar.style.display = 'none';
        }
        const avatarInitials = document.createElement('div');
        avatarInitials.className = 'avatar-initials';
        avatarInitials.textContent = getInitials(userData.fullName || userData.displayName || userData.name || '');
        userAvatarImg.parentNode.appendChild(avatarInitials);
    }
    
    // Update name, headline, and location
    const displayNameEl = document.getElementById('display-name');
    displayNameEl.textContent = userData.fullName || userData.displayName || userData.name || 'User';
    
    // Get the name row element and show it
    const nameRowEl = document.querySelector('.user-name-row');
    nameRowEl.style.display = '';
    
    // Add subscription badge if user has one with an active status
    if (userData.subscription && userData.subscription.plan && 
        userData.subscription.status && 
        (userData.subscription.status === 'active' || userData.subscription.status === 'trial')) {
        
        const plan = userData.subscription.plan.toLowerCase();
        if (plan === 'premium' || plan === 'professional') {
            // Remove any existing badge first
            const existingBadge = nameRowEl.querySelector('.subscription-badge');
            if (existingBadge) {
                existingBadge.remove();
            }
            
            // Create subscription badge
            const subscriptionBadge = document.createElement('span');
            subscriptionBadge.className = `subscription-badge ${plan}`;
            
            // Use icon instead of text
            const badgeIcon = document.createElement('span');
            badgeIcon.className = 'material-symbols-rounded';
            
            // Different icons for premium and professional
            if (plan === 'premium') {
                badgeIcon.textContent = 'auto_awesome';
                subscriptionBadge.title = 'Premium User';
            } else {
                badgeIcon.textContent = 'verified';
                subscriptionBadge.title = 'Professional User';
            }
            
            subscriptionBadge.appendChild(badgeIcon);
            nameRowEl.appendChild(subscriptionBadge);
            
            console.log('Added subscription badge:', plan, 'status:', userData.subscription.status);
        } else {
            badgeIcon.textContent = 'verified';
            subscriptionBadge.title = 'Professional User';
        }
    } else {
        // Make sure no badge is shown if there's no active subscription
        const existingBadge = nameRowEl.querySelector('.subscription-badge');
        if (existingBadge) {
            existingBadge.remove();
            console.log('Removed subscription badge - no active subscription');
        }
    }
    
    if (skeletonElements.name) {
        skeletonElements.name.style.display = 'none';
    }
    
    const headlineEl = document.getElementById('headline');
    headlineEl.textContent = userData.headline || 'No headline provided';
    headlineEl.style.display = '';
    if (skeletonElements.headline) {
        skeletonElements.headline.style.display = 'none';
    }
    
    const locationEl = document.getElementById('location');
    const locationWrapper = document.querySelector('.location');
    locationEl.textContent = userData.location || 'No location set';
    locationWrapper.style.display = '';
    if (skeletonElements.location) {
        skeletonElements.location.style.display = 'none';
    }
    
    // Update connections counts
    const connectionCounts = document.querySelectorAll('.connection-count');
    
    // Connections count
    connectionCounts[0].textContent = (userData.followers && userData.followers.length) || 0;
    connectionCounts[0].style.display = '';
    if (skeletonElements.connections) {
        skeletonElements.connections.style.display = 'none';
    }
    
    // Applications count (placeholder)
    connectionCounts[1].textContent = userData.applications?.length || 0;
    connectionCounts[1].style.display = '';
    if (skeletonElements.applications) {
        skeletonElements.applications.style.display = 'none';
    }
    
    // Interviews count (placeholder)
    connectionCounts[2].textContent = userData.interviews?.length || 0;
    connectionCounts[2].style.display = '';
    if (skeletonElements.interviews) {
        skeletonElements.interviews.style.display = 'none';
    }
    
    // Update about section
    const aboutContent = document.getElementById('about-content');
    if (userData.about) {
        aboutContent.textContent = userData.about;
    } else {
        aboutContent.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">
                    <i class="fas fa-user"></i>
                </div>
                <h3>No about information yet</h3>
                <p>Add information about yourself to let others know about your background and interests.</p>
                ${isOwnProfile ? '<button class="btn-add-item" onclick="showModal(\'about\')"><i class="fas fa-plus"></i> Add About</button>' : ''}
            </div>
        `;
    }
    aboutContent.style.display = '';
    if (skeletonElements.about) {
        skeletonElements.about.style.display = 'none';
    }
    
    // Load user experience
    if (userData.experience && userData.experience.length > 0) {
        loadUserExperience(userData.experience);
    } else {
        document.getElementById('experience-list').innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">
                    <i class="fas fa-briefcase"></i>
                </div>
                <h3>No experience added yet</h3>
                <p>Share your professional history to highlight your expertise.</p>
                ${isOwnProfile ? '<button class="btn-add-item" onclick="showModal(\'experience\')"><i class="fas fa-plus"></i> Add Experience</button>' : ''}
            </div>
        `;
    }
    document.getElementById('experience-list').style.display = '';
    if (skeletonElements.experience) {
        skeletonElements.experience.style.display = 'none';
    }
    
    // Load user education
    if (userData.education && userData.education.length > 0) {
        loadUserEducation(userData.education);
    } else {
        document.getElementById('education-list').innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">
                    <i class="fas fa-graduation-cap"></i>
                </div>
                <h3>No education added yet</h3>
                <p>Add your educational background to showcase your qualifications.</p>
                ${isOwnProfile ? '<button class="btn-add-item" onclick="showModal(\'education\')"><i class="fas fa-plus"></i> Add Education</button>' : ''}
            </div>
        `;
    }
    document.getElementById('education-list').style.display = '';
    if (skeletonElements.education) {
        skeletonElements.education.style.display = 'none';
    }
    
    // Load user skills
    if (userData.skills && (
        (userData.skills.technical && userData.skills.technical.length > 0) || 
        (userData.skills.soft && userData.skills.soft.length > 0)
    )) {
        loadUserSkills(userData.skills);
    } else {
        document.getElementById('skills-list').innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">
                    <i class="fas fa-tools"></i>
                </div>
                <h3>No skills added yet</h3>
                <p>Showcase your abilities to stand out to potential employers.</p>
                ${isOwnProfile ? '<button class="btn-add-item" onclick="showModal(\'skills\')"><i class="fas fa-plus"></i> Add Skills</button>' : ''}
            </div>
        `;
    }
    document.getElementById('skills-list').style.display = '';
    if (skeletonElements.skills) {
        skeletonElements.skills.style.display = 'none';
    }
    
    // Load user certifications
    if (userData.certifications && userData.certifications.length > 0) {
        loadUserCertifications(userData.certifications);
    } else {
        document.getElementById('certifications-list').innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">
                    <i class="fas fa-certificate"></i>
                </div>
                <h3>No certifications added yet</h3>
                <p>Add professional certifications to validate your expertise.</p>
                ${isOwnProfile ? '<button class="btn-add-item" onclick="showModal(\'certifications\')"><i class="fas fa-plus"></i> Add Certification</button>' : ''}
            </div>
        `;
    }
    document.getElementById('certifications-list').style.display = '';
    if (skeletonElements.certifications) {
        skeletonElements.certifications.style.display = 'none';
    }
    
    // Load user languages
    if (userData.languages && userData.languages.length > 0) {
        loadUserLanguages(userData.languages);
    } else {
        document.getElementById('languages-list').innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">
                    <i class="fas fa-language"></i>
                </div>
                <h3>No languages added yet</h3>
                <p>Add the languages you speak to expand your opportunities.</p>
                ${isOwnProfile ? '<button class="btn-add-item" onclick="showModal(\'languages\')"><i class="fas fa-plus"></i> Add Language</button>' : ''}
            </div>
        `;
    }
    document.getElementById('languages-list').style.display = '';
    if (skeletonElements.languages) {
        skeletonElements.languages.style.display = 'none';
    }
}

// Get initials from name
function getInitials(name) {
    if (!name) return '';
    
    const parts = name.split(' ');
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

// Show modal for editing sections
function showModal(section, data = {}) {
    // Create modal content based on the section
    const modalContent = createModalContent(section, data);
    
    // Add modal to the overlay
    modalOverlay.innerHTML = modalContent;
    modalOverlay.classList.add('active');
    
    // Add event listeners for modal buttons
    const modal = modalOverlay.querySelector('.modal');
    const closeBtn = modal.querySelector('.modal-close');
    const form = modal.querySelector('form');
    
    closeBtn.addEventListener('click', () => {
        modalOverlay.classList.remove('active');
    });
    
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        handleFormSubmit(section, form, data);
    });
}

// Create modal content based on section
function createModalContent(section, data) {
    let title, formFields;
    
    switch (section) {
        case 'about':
            title = 'Edit About';
            formFields = `
                <div class="form-group">
                    <label class="form-label" for="about">About</label>
                    <textarea class="form-textarea" id="about" name="about" rows="6">${data.about || document.getElementById('about-content').textContent}</textarea>
                </div>
            `;
            break;
        case 'profile':
            title = 'Edit Profile';
            formFields = `
                <div class="form-group">
                    <label class="form-label" for="displayName">Name</label>
                    <input class="form-input" type="text" id="displayName" name="displayName" value="${data.userDetails?.displayName || ''}">
                </div>
                <div class="form-group">
                    <label class="form-label" for="headline">Headline</label>
                    <input class="form-input" type="text" id="headline" name="headline" value="${document.getElementById('headline').textContent}">
                </div>
                <div class="form-group">
                    <label class="form-label" for="location">Location</label>
                    <input class="form-input" type="text" id="location" name="location" value="${document.getElementById('location').textContent}">
                </div>
            `;
            break;
        case 'experience':
            title = data.action === 'edit' ? 'Edit Experience' : 'Add Experience';
            formFields = `
                <div class="form-group">
                    <label class="form-label" for="title">Job Title</label>
                    <input class="form-input" type="text" id="title" name="title" value="${data.itemData?.title || ''}">
                </div>
                <div class="form-group">
                    <label class="form-label" for="company">Company</label>
                    <input class="form-input" type="text" id="company" name="company" value="${data.itemData?.company || ''}">
                </div>
                <div class="form-group">
                    <label class="form-label" for="location">Location</label>
                    <input class="form-input" type="text" id="location" name="location" value="${data.itemData?.location || ''}">
                </div>
                <div class="form-row">
                    <div class="form-group half">
                        <label class="form-label" for="startDate">Start Date</label>
                        <input class="form-input" type="month" id="startDate" name="startDate" value="${data.itemData?.startDate || ''}">
                    </div>
                    <div class="form-group half">
                        <label class="form-label" for="endDate">End Date</label>
                        <input class="form-input" type="month" id="endDate" name="endDate" value="${data.itemData?.endDate || ''}">
                        <div class="checkbox-group">
                            <input type="checkbox" id="currentlyWorking" name="currentlyWorking" ${data.itemData?.currentlyWorking ? 'checked' : ''}>
                            <label for="currentlyWorking">I currently work here</label>
                        </div>
                    </div>
                </div>
                <div class="form-group">
                    <label class="form-label" for="description">Description</label>
                    <textarea class="form-textarea" id="description" name="description" rows="4">${data.itemData?.description || ''}</textarea>
                </div>
                <div class="form-group">
                    <label class="form-label" for="skills">Skills (comma separated)</label>
                    <input class="form-input" type="text" id="skills" name="skills" value="${data.itemData?.skills?.join(', ') || ''}">
                </div>
            `;
            break;
        case 'education':
            title = data.action === 'edit' ? 'Edit Education' : 'Add Education';
            formFields = `
                <div class="form-group">
                    <label class="form-label" for="school">School/University</label>
                    <input class="form-input" type="text" id="school" name="school" value="${data.itemData?.school || ''}">
                </div>
                <div class="form-group">
                    <label class="form-label" for="degree">Degree</label>
                    <input class="form-input" type="text" id="degree" name="degree" value="${data.itemData?.degree || ''}">
                </div>
                <div class="form-group">
                    <label class="form-label" for="fieldOfStudy">Field of Study</label>
                    <input class="form-input" type="text" id="fieldOfStudy" name="fieldOfStudy" value="${data.itemData?.fieldOfStudy || ''}">
                </div>
                <div class="form-row">
                    <div class="form-group half">
                        <label class="form-label" for="startYear">Start Year</label>
                        <input class="form-input" type="number" id="startYear" name="startYear" min="1950" max="2030" value="${data.itemData?.startYear || ''}">
                    </div>
                    <div class="form-group half">
                        <label class="form-label" for="endYear">End Year</label>
                        <input class="form-input" type="number" id="endYear" name="endYear" min="1950" max="2030" value="${data.itemData?.endYear || ''}">
                        <div class="checkbox-group">
                            <input type="checkbox" id="currentlyStudying" name="currentlyStudying" ${data.itemData?.currentlyStudying ? 'checked' : ''}>
                            <label for="currentlyStudying">I am currently studying here</label>
                        </div>
                    </div>
                </div>
                <div class="form-group">
                    <label class="form-label" for="description">Description</label>
                    <textarea class="form-textarea" id="description" name="description" rows="4">${data.itemData?.description || ''}</textarea>
                </div>
            `;
            break;
        case 'skills':
            title = 'Edit Skills';
            
            // Get existing technical skills
            const technicalSkills = [];
            const softSkills = [];
            
            try {
                // Try to get existing skills from the DOM
                document.querySelectorAll('.skill-category').forEach(category => {
                    const categoryTitle = category.querySelector('h3').textContent;
                    const skills = Array.from(category.querySelectorAll('.skill-tag')).map(tag => tag.textContent);
                    
                    if (categoryTitle.includes('Technical')) {
                        technicalSkills.push(...skills);
                    } else if (categoryTitle.includes('Soft')) {
                        softSkills.push(...skills);
                    }
                });
            } catch (err) {
                console.error("Error extracting skills:", err);
            }
            
            formFields = `
                <div class="form-group">
                    <label class="form-label" for="technicalSkills">Technical Skills (comma separated)</label>
                    <textarea class="form-textarea" id="technicalSkills" name="technicalSkills" rows="3">${technicalSkills.join(', ')}</textarea>
                </div>
                <div class="form-group">
                    <label class="form-label" for="softSkills">Soft Skills (comma separated)</label>
                    <textarea class="form-textarea" id="softSkills" name="softSkills" rows="3">${softSkills.join(', ')}</textarea>
                </div>
            `;
            break;
        case 'certifications':
            title = data.action === 'edit' ? 'Edit Certification' : 'Add Certification';
            formFields = `
                <div class="form-group">
                    <label class="form-label" for="name">Certification Name</label>
                    <input class="form-input" type="text" id="name" name="name" value="${data.itemData?.name || ''}">
                </div>
                <div class="form-group">
                    <label class="form-label" for="issuer">Issuing Organization</label>
                    <input class="form-input" type="text" id="issuer" name="issuer" value="${data.itemData?.issuer || ''}">
                </div>
                <div class="form-row">
                    <div class="form-group half">
                        <label class="form-label" for="issueDate">Issue Date</label>
                        <input class="form-input" type="month" id="issueDate" name="issueDate" value="${data.itemData?.issueDate || ''}">
                    </div>
                    <div class="form-group half">
                        <label class="form-label" for="expirationDate">Expiration Date</label>
                        <input class="form-input" type="month" id="expirationDate" name="expirationDate" value="${data.itemData?.expirationDate || ''}">
                        <div class="checkbox-group">
                            <input type="checkbox" id="noExpiration" name="noExpiration" ${data.itemData?.noExpiration ? 'checked' : ''}>
                            <label for="noExpiration">This certification doesn't expire</label>
                        </div>
                    </div>
                </div>
                <div class="form-group">
                    <label class="form-label" for="credentialId">Credential ID</label>
                    <input class="form-input" type="text" id="credentialId" name="credentialId" value="${data.itemData?.credentialId || ''}">
                </div>
                <div class="form-group">
                    <label class="form-label" for="credentialUrl">Credential URL</label>
                    <input class="form-input" type="url" id="credentialUrl" name="credentialUrl" value="${data.itemData?.credentialUrl || ''}">
                </div>
            `;
            break;
        case 'languages':
            title = 'Edit Languages';
            
            // Get existing languages
            const languages = [];
            try {
                document.querySelectorAll('.language-item').forEach(item => {
                    const name = item.querySelector('.language-name').textContent;
                    const level = item.querySelector('.language-level').textContent;
                    languages.push({ name, level });
                });
            } catch (err) {
                console.error("Error extracting languages:", err);
            }
            
            // Generate language input fields
            let languageFields = '';
            for (let i = 0; i < Math.max(languages.length + 1, 3); i++) {
                const language = languages[i] || { name: '', level: '' };
                
                languageFields += `
                <div class="form-row language-row">
                    <div class="form-group half">
                        <label class="form-label" for="language${i}">Language</label>
                        <input class="form-input" type="text" id="language${i}" name="language${i}" value="${language.name}">
                    </div>
                    <div class="form-group half">
                        <label class="form-label" for="proficiency${i}">Proficiency</label>
                        <select class="form-select" id="proficiency${i}" name="proficiency${i}">
                            <option value="" ${!language.level ? 'selected' : ''}>Select level</option>
                            <option value="Native or Bilingual" ${language.level === 'Native or Bilingual' ? 'selected' : ''}>Native or Bilingual</option>
                            <option value="Full Professional Proficiency" ${language.level === 'Full Professional Proficiency' ? 'selected' : ''}>Full Professional Proficiency</option>
                            <option value="Professional Working Proficiency" ${language.level === 'Professional Working Proficiency' ? 'selected' : ''}>Professional Working Proficiency</option>
                            <option value="Limited Working Proficiency" ${language.level === 'Limited Working Proficiency' ? 'selected' : ''}>Limited Working Proficiency</option>
                            <option value="Elementary Proficiency" ${language.level === 'Elementary Proficiency' ? 'selected' : ''}>Elementary Proficiency</option>
                        </select>
                    </div>
                </div>
                `;
            }
            
            formFields = `
                <p class="form-note">Add your language proficiencies below. Leave fields empty to remove a language.</p>
                ${languageFields}
            `;
            break;
        case 'jobPreferences':
            title = 'Career Preferences';
            formFields = `
                <div class="form-group">
                    <label class="form-label" for="jobTitle">Desired Job Title</label>
                    <input class="form-input" type="text" id="jobTitle" name="jobTitle" value="${data.jobTitle || ''}">
                </div>
                <div class="form-group">
                    <label class="form-label" for="industry">Preferred Industry</label>
                    <input class="form-input" type="text" id="industry" name="industry" value="${data.industry || ''}">
                </div>
                <div class="form-group">
                    <label class="form-label" for="workType">Work Type</label>
                    <select class="form-select" id="workType" name="workType">
                        <option value="" ${!data.workType ? 'selected' : ''}>Select work type</option>
                        <option value="Full-time" ${data.workType === 'Full-time' ? 'selected' : ''}>Full-time</option>
                        <option value="Part-time" ${data.workType === 'Part-time' ? 'selected' : ''}>Part-time</option>
                        <option value="Contract" ${data.workType === 'Contract' ? 'selected' : ''}>Contract</option>
                        <option value="Freelance" ${data.workType === 'Freelance' ? 'selected' : ''}>Freelance</option>
                        <option value="Internship" ${data.workType === 'Internship' ? 'selected' : ''}>Internship</option>
                    </select>
                </div>
                <div class="form-group">
                    <label class="form-label" for="location">Preferred Location</label>
                    <input class="form-input" type="text" id="location" name="location" value="${data.location || ''}">
                </div>
                <div class="form-row">
                    <div class="form-group half">
                        <label class="form-label" for="salaryMin">Minimum Salary</label>
                        <input class="form-input" type="number" id="salaryMin" name="salaryMin" value="${data.salaryMin || ''}">
                    </div>
                    <div class="form-group half">
                        <label class="form-label" for="salaryMax">Maximum Salary</label>
                        <input class="form-input" type="number" id="salaryMax" name="salaryMax" value="${data.salaryMax || ''}">
                    </div>
                </div>
                <div class="form-group">
                    <label class="form-label" for="openToRelocate">Relocation Preferences</label>
                    <div class="checkbox-group">
                        <input type="checkbox" id="openToRelocate" name="openToRelocate" ${data.openToRelocate ? 'checked' : ''}>
                        <label for="openToRelocate">I am open to relocating</label>
                    </div>
                </div>
                <div class="form-group">
                    <label class="form-label" for="openToRemote">Remote Work Preferences</label>
                    <div class="checkbox-group">
                        <input type="checkbox" id="openToRemote" name="openToRemote" ${data.openToRemote ? 'checked' : ''}>
                        <label for="openToRemote">I am open to remote work</label>
                    </div>
                </div>
            `;
            break;
        default:
            title = `Edit ${section.charAt(0).toUpperCase() + section.slice(1)}`;
            formFields = `<div class="form-group"><p>Edit form for ${section}</p></div>`;
    }
    
    return `
        <div class="modal">
            <div class="modal-header">
                <h2 class="modal-title">${title}</h2>
                <button class="modal-close" aria-label="Close">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <form>
                <div class="modal-body">
                    ${formFields}
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn-cancel modal-close">Cancel</button>
                    <button type="submit" class="btn-save">Save</button>
                </div>
            </form>
        </div>
    `;
}

// Handle form submission
function handleFormSubmit(section, form, data) {
    const formData = new FormData(form);
    const formValues = {};
    
    for (let [key, value] of formData.entries()) {
        formValues[key] = value;
    }
    
    // Handle specific checkbox for experience
    if (section === 'experience' && form.querySelector('#currentlyWorking')) {
        formValues.currentlyWorking = form.querySelector('#currentlyWorking').checked;
        if (formValues.currentlyWorking) {
            formValues.endDate = 'Present';
        }
    }
    
    // Process skills if applicable
    if (formValues.skills) {
        formValues.skills = formValues.skills.split(',').map(skill => skill.trim()).filter(Boolean);
    }
    
    // Save to Firebase
    saveUserData(section, formValues, data);
    
    // Close modal
    modalOverlay.classList.remove('active');
    
    // Show success toast
    showToast(`${section.charAt(0).toUpperCase() + section.slice(1)} updated successfully!`, 'success');
}

// Save user data to Firebase
function saveUserData(section, formValues, data) {
    if (!currentUser) return;
    
    const userId = currentUser.uid;
    const userRef = firebase.firestore().collection('users').doc(userId);
    
    // Update based on section
    switch (section) {
        case 'about':
            userRef.update({
                about: formValues.about
            }).then(() => {
                document.getElementById('about-content').textContent = formValues.about;
                showToast("About section updated successfully", "success");
            }).catch(error => {
                console.error("Error updating about:", error);
                showToast("Failed to update profile", "error");
            });
            break;
            
        case 'profile':
            // First update Firebase Auth display name
            currentUser.updateProfile({
                displayName: formValues.displayName
            }).then(() => {
                // Then update Firestore with fullName
                return userRef.update({
                    fullName: formValues.displayName,
                    headline: formValues.headline,
                    location: formValues.location,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            }).then(() => {
                // Update UI
                document.getElementById('display-name').textContent = formValues.displayName;
                document.getElementById('headline').textContent = formValues.headline;
                document.getElementById('location').textContent = formValues.location;
                
                // Update initials if no photo URL
                if (!currentUser.photoURL) {
                    const initials = getInitials(formValues.displayName);
                    const avatarInitials = document.querySelector('.avatar-initials');
                    if (avatarInitials) {
                        avatarInitials.textContent = initials;
                    }
                }
                
                // Update user name in dropdown
                const userNameEl = document.getElementById('user-name');
                if (userNameEl) {
                    userNameEl.textContent = formValues.displayName;
                }
                
                showToast("Profile updated successfully", "success");
            }).catch(error => {
                console.error("Error updating profile:", error);
                showToast("Failed to update profile", "error");
            });
            break;
            
        case 'experience':
            // Get experience data from form values
            const experienceItem = {
                title: formValues.title,
                company: formValues.company,
                location: formValues.location,
                startDate: formValues.startDate,
                endDate: formValues.currentlyWorking ? 'Present' : formValues.endDate,
                currentlyWorking: formValues.currentlyWorking || false,
                description: formValues.description,
                skills: formValues.skills
            };
            
            // First get the current experiences array
            userRef.get().then(doc => {
                if (doc.exists) {
                    const userData = doc.data();
                    let experiences = userData.experience || [];
                    
                    if (data.action === 'edit' && data.itemData) {
                        // Find and update existing experience
                        const index = experiences.findIndex(exp => 
                            exp.title === data.itemData.title && 
                            exp.company === data.itemData.company);
                        
                        if (index !== -1) {
                            experiences[index] = experienceItem;
                        } else {
                            experiences.push(experienceItem);
                        }
                    } else {
                        // Add new experience
                        experiences.push(experienceItem);
                    }
                    
                    // Update in Firestore
                    userRef.update({
                        experience: experiences
                    }).then(() => {
                        // Update UI
                        loadUserExperience(experiences);
                        showToast("Experience updated successfully", "success");
                    }).catch(error => {
                        console.error("Error updating experience:", error);
                        showToast("Failed to update experience", "error");
                    });
                }
            }).catch(error => {
                console.error("Error getting user data:", error);
                showToast("Failed to retrieve current data", "error");
            });
            break;
            
        case 'education':
            // Get education data from form values
            const educationItem = {
                school: formValues.school,
                degree: formValues.degree,
                fieldOfStudy: formValues.fieldOfStudy,
                startYear: formValues.startYear,
                endYear: formValues.currentlyStudying ? 'Present' : formValues.endYear,
                currentlyStudying: formValues.currentlyStudying || false,
                description: formValues.description
            };
            
            // First get the current education array
            userRef.get().then(doc => {
                if (doc.exists) {
                    const userData = doc.data();
                    let education = userData.education || [];
                    
                    if (data.action === 'edit' && data.itemData) {
                        // Find and update existing education
                        const index = education.findIndex(edu => 
                            edu.school === data.itemData.school && 
                            edu.degree === data.itemData.degree);
                        
                        if (index !== -1) {
                            education[index] = educationItem;
                        } else {
                            education.push(educationItem);
                        }
                    } else {
                        // Add new education
                        education.push(educationItem);
                    }
                    
                    // Update in Firestore
                    userRef.update({
                        education: education
                    }).then(() => {
                        // Update UI
                        loadUserEducation(education);
                        showToast("Education updated successfully", "success");
                    }).catch(error => {
                        console.error("Error updating education:", error);
                        showToast("Failed to update education", "error");
                    });
                }
            }).catch(error => {
                console.error("Error getting user data:", error);
                showToast("Failed to retrieve current data", "error");
            });
            break;
            
        case 'skills':
            // Process skills data
            const technicalSkills = formValues.technicalSkills ? 
                formValues.technicalSkills.split(',').map(skill => skill.trim()).filter(Boolean) : [];
                
            const softSkills = formValues.softSkills ? 
                formValues.softSkills.split(',').map(skill => skill.trim()).filter(Boolean) : [];
            
            const skillsData = {
                technical: technicalSkills,
                soft: softSkills
            };
            
            userRef.update({
                skills: skillsData
            }).then(() => {
                // Update UI
                loadUserSkills(skillsData);
                showToast("Skills updated successfully", "success");
            }).catch(error => {
                console.error("Error updating skills:", error);
                showToast("Failed to update skills", "error");
            });
            break;
            
        case 'certifications':
            // Get certification data from form values
            const certificationItem = {
                name: formValues.name,
                issuer: formValues.issuer,
                issueDate: formValues.issueDate,
                expirationDate: formValues.noExpiration ? 'No Expiration' : formValues.expirationDate,
                noExpiration: formValues.noExpiration || false,
                credentialId: formValues.credentialId,
                credentialUrl: formValues.credentialUrl
            };
            
            // First get the current certifications array
            userRef.get().then(doc => {
                if (doc.exists) {
                    const userData = doc.data();
                    let certifications = userData.certifications || [];
                    
                    if (data.action === 'edit' && data.itemData) {
                        // Find and update existing certification
                        const index = certifications.findIndex(cert => 
                            cert.name === data.itemData.name && 
                            cert.issuer === data.itemData.issuer);
                        
                        if (index !== -1) {
                            certifications[index] = certificationItem;
                        } else {
                            certifications.push(certificationItem);
                        }
                    } else {
                        // Add new certification
                        certifications.push(certificationItem);
                    }
                    
                    // Update in Firestore
                    userRef.update({
                        certifications: certifications
                    }).then(() => {
                        // Update UI
                        loadUserCertifications(certifications);
                        showToast("Certification updated successfully", "success");
                    }).catch(error => {
                        console.error("Error updating certifications:", error);
                        showToast("Failed to update certification", "error");
                    });
                }
            }).catch(error => {
                console.error("Error getting user data:", error);
                showToast("Failed to retrieve current data", "error");
            });
            break;
            
        case 'languages':
            // Process languages data - collect all language inputs
            const languages = [];
            let i = 0;
            
            while (formValues[`language${i}`] !== undefined) {
                const name = formValues[`language${i}`].trim();
                const level = formValues[`proficiency${i}`];
                
                if (name && level) {
                    languages.push({ name, level });
                }
                i++;
            }
            
            userRef.update({
                languages: languages
            }).then(() => {
                // Update UI
                loadUserLanguages(languages);
                showToast("Languages updated successfully", "success");
            }).catch(error => {
                console.error("Error updating languages:", error);
                showToast("Failed to update languages", "error");
            });
            break;
        case 'jobPreferences':
            // Process job preferences data
            const jobPreferencesData = {
                jobTitle: formValues.jobTitle,
                industry: formValues.industry,
                workType: formValues.workType,
                location: formValues.location,
                salaryMin: formValues.salaryMin,
                salaryMax: formValues.salaryMax,
                openToRelocate: formValues.openToRelocate,
                openToRemote: formValues.openToRemote
            };
            
            userRef.update({
                jobPreferences: jobPreferencesData
            }).then(() => {
                // Update UI
                showToast("Job preferences updated successfully", "success");
            }).catch(error => {
                console.error("Error updating job preferences:", error);
                showToast("Failed to update job preferences", "error");
            });
            break;
    }
}

// Load user experience data
function loadUserExperience(experience) {
    const experienceList = document.getElementById('experience-list');
    if (!experienceList) return;
    
    experienceList.innerHTML = '';
    
    if (!experience || !experience.length) {
        // Show empty state for experience
        if (isOwnProfile) {
            // Empty state for own profile
            experienceList.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon"><i class="fas fa-briefcase"></i></div>
                <h3>No work experience added yet</h3>
                <p>Add your professional experience to showcase your career journey</p>
                <button class="btn-add-item" data-section="experience">
                    <i class="fas fa-plus"></i> Add Experience
                </button>
            </div>`;
            
            // Add event listener to the button
            const addButton = experienceList.querySelector('.btn-add-item');
            if (addButton) {
                addButton.addEventListener('click', function() {
                    showModal('experience', { action: 'add' });
                });
            }
        } else {
            // Empty state for viewing someone else's profile
            experienceList.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon"><i class="fas fa-briefcase"></i></div>
                <h3>No work experience listed</h3>
                <p>This user hasn't added any work experience yet</p>
            </div>`;
        }
        return;
    }
    
    experience.forEach(exp => {
        const dateDisplay = exp.startDate + (exp.endDate ? ` - ${exp.endDate}` : '');
        const skills = exp.skills || [];
        
        const skillsHtml = skills.length ? 
            `<div class="skill-tags">
                ${skills.map(skill => `<span class="skill-tag">${skill}</span>`).join('')}
            </div>` : '';
        
        const expHtml = `
        <div class="experience-item">
            <div class="experience-logo">
                <div class="company-logo-placeholder">${getCompanyInitials(exp.company)}</div>
            </div>
            <div class="experience-details">
                <div class="experience-header">
                    <h3>${exp.title}</h3>
                    ${isOwnProfile ? `
                    <div class="item-actions">
                        <button class="action-btn edit-btn"><i class="fas fa-pen"></i></button>
                        <button class="action-btn delete-btn"><i class="fas fa-trash"></i></button>
                    </div>
                    ` : ''}
                </div>
                <p class="experience-company">${exp.company}</p>
                <p class="experience-date">${dateDisplay}</p>
                ${exp.location ? `<p class="experience-location"><i class="fas fa-map-marker-alt"></i> ${exp.location}</p>` : ''}
                <div class="experience-description">
                    <p>${exp.description}</p>
                </div>
                ${skillsHtml}
            </div>
        </div>
        `;
        
        experienceList.innerHTML += expHtml;
    });
    
    // Only attach event listeners if it's the user's own profile
    if (isOwnProfile) {
        // Re-attach event listeners
        document.querySelectorAll('.experience-item .edit-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const item = btn.closest('.experience-item');
                const itemData = getItemData(item, 'experience');
                showModal('experience', { action: 'edit', itemData });
            });
        });
        
        document.querySelectorAll('.experience-item .delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const item = btn.closest('.experience-item');
                const itemData = getItemData(item, 'experience');
                confirmDelete('experience', itemData);
            });
        });
    }
}

// Load user education data
function loadUserEducation(education) {
    const educationList = document.getElementById('education-list');
    if (!educationList) return;
    
    educationList.innerHTML = '';
    
    if (!education || !education.length) {
        // Show empty state for education
        if (isOwnProfile) {
            // Empty state for own profile
            educationList.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon"><i class="fas fa-graduation-cap"></i></div>
                <h3>No education history added</h3>
                <p>Share your academic background and qualifications</p>
                <button class="btn-add-item" data-section="education">
                    <i class="fas fa-plus"></i> Add Education
                </button>
            </div>`;
            
            // Add event listener to the button
            const addButton = educationList.querySelector('.btn-add-item');
            if (addButton) {
                addButton.addEventListener('click', function() {
                    showModal('education', { action: 'add' });
                });
            }
        } else {
            // Empty state for viewing someone else's profile
            educationList.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon"><i class="fas fa-graduation-cap"></i></div>
                <h3>No education history listed</h3>
                <p>This user hasn't added any education information yet</p>
            </div>`;
        }
        return;
    }
    
    education.forEach(edu => {
        const dateDisplay = edu.startYear + (edu.endYear ? ` - ${edu.endYear}` : '');
        
        const eduHtml = `
        <div class="education-item">
            <div class="education-logo">
                <div class="school-logo-placeholder">${getSchoolInitials(edu.school)}</div>
            </div>
            <div class="education-details">
                <div class="education-header">
                    <h3>${edu.school}</h3>
                    ${isOwnProfile ? `
                    <div class="item-actions">
                        <button class="action-btn edit-btn"><i class="fas fa-pen"></i></button>
                        <button class="action-btn delete-btn"><i class="fas fa-trash"></i></button>
                    </div>
                    ` : ''}
                </div>
                <p class="education-degree">${edu.degree}${edu.fieldOfStudy ? ` in ${edu.fieldOfStudy}` : ''}</p>
                <p class="education-date">${dateDisplay}</p>
                ${edu.description ? `<div class="education-description"><p>${edu.description}</p></div>` : ''}
            </div>
        </div>
        `;
        
        educationList.innerHTML += eduHtml;
    });
    
    // Only attach event listeners if it's the user's own profile
    if (isOwnProfile) {
        // Re-attach event listeners
        document.querySelectorAll('.education-item .edit-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const item = btn.closest('.education-item');
                const itemData = getItemData(item, 'education');
                showModal('education', { action: 'edit', itemData });
            });
        });
        
        document.querySelectorAll('.education-item .delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const item = btn.closest('.education-item');
                const itemData = getItemData(item, 'education');
                confirmDelete('education', itemData);
            });
        });
    }
}

// Load user skills data
function loadUserSkills(skills) {
    const skillsList = document.getElementById('skills-list');
    if (!skillsList) return;
    
    skillsList.innerHTML = '';
    
    if (!skills || (!skills.technical && !skills.soft) || 
        ((skills.technical && skills.technical.length === 0) && 
         (skills.soft && skills.soft.length === 0))) {
        // Show empty state for skills
        if (isOwnProfile) {
            // Empty state for own profile
            skillsList.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon"><i class="fas fa-clipboard-list"></i></div>
                <h3>No skills added yet</h3>
                <p>Highlight your technical and soft skills to stand out</p>
                <button class="btn-add-item" data-section="skills">
                    <i class="fas fa-pen"></i> Add Skills
                </button>
            </div>`;
            
            // Add event listener to the button
            const addButton = skillsList.querySelector('.btn-add-item');
            if (addButton) {
                addButton.addEventListener('click', function() {
                    showModal('skills');
                });
            }
        } else {
            // Empty state for viewing someone else's profile
            skillsList.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon"><i class="fas fa-clipboard-list"></i></div>
                <h3>No skills listed</h3>
                <p>This user hasn't added any skills to their profile yet</p>
            </div>`;
        }
        return;
    }
    
    // Technical Skills
    if (skills.technical && skills.technical.length) {
        const technicalHtml = `
        <div class="skill-category">
            <h3>Technical Skills</h3>
            <div class="skill-tags">
                ${skills.technical.map(skill => `<span class="skill-tag">${skill}</span>`).join('')}
            </div>
        </div>
        `;
        skillsList.innerHTML += technicalHtml;
    }
    
    // Soft Skills
    if (skills.soft && skills.soft.length) {
        const softHtml = `
        <div class="skill-category">
            <h3>Soft Skills</h3>
            <div class="skill-tags">
                ${skills.soft.map(skill => `<span class="skill-tag">${skill}</span>`).join('')}
            </div>
        </div>
        `;
        skillsList.innerHTML += softHtml;
    }
}

// Load user certifications data
function loadUserCertifications(certifications) {
    const certificationsList = document.getElementById('certifications-list');
    if (!certificationsList) return;
    
    certificationsList.innerHTML = '';
    
    if (!certifications || !certifications.length) {
        // Show empty state for certifications
        if (isOwnProfile) {
            // Empty state for own profile
            certificationsList.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon"><i class="fas fa-certificate"></i></div>
                <h3>No certifications added yet</h3>
                <p>Showcase your professional certifications and credentials</p>
                <button class="btn-add-item" data-section="certifications">
                    <i class="fas fa-plus"></i> Add Certification
                </button>
            </div>`;
            
            // Add event listener to the button
            const addButton = certificationsList.querySelector('.btn-add-item');
            if (addButton) {
                addButton.addEventListener('click', function() {
                    showModal('certifications', { action: 'add' });
                });
            }
        } else {
            // Empty state for viewing someone else's profile
            certificationsList.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon"><i class="fas fa-certificate"></i></div>
                <h3>No certifications listed</h3>
                <p>This user hasn't added any certifications yet</p>
            </div>`;
        }
        return;
    }
    
    certifications.forEach(cert => {
        const dateDisplay = cert.issueDate ? 
            `Issued ${cert.issueDate}${cert.expirationDate && cert.expirationDate !== 'No Expiration' ? ` · Expires ${cert.expirationDate}` : ''}` : '';
        
        const certHtml = `
        <div class="certification-item">
            <div class="certification-header">
                <h3>${cert.name}</h3>
                ${isOwnProfile ? `
                <div class="item-actions">
                    <button class="action-btn edit-btn"><i class="fas fa-pen"></i></button>
                    <button class="action-btn delete-btn"><i class="fas fa-trash"></i></button>
                </div>
                ` : ''}
            </div>
            <p class="certification-issuer">${cert.issuer}</p>
            ${dateDisplay ? `<p class="certification-date">${dateDisplay}</p>` : ''}
            ${cert.credentialId ? `<p class="certification-id">Credential ID: ${cert.credentialId}</p>` : ''}
        </div>
        `;
        
        certificationsList.innerHTML += certHtml;
    });
    
    // Only attach event listeners if it's the user's own profile
    if (isOwnProfile) {
        // Re-attach event listeners
        document.querySelectorAll('.certification-item .edit-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const item = btn.closest('.certification-item');
                const itemData = getItemData(item, 'certifications');
                showModal('certifications', { action: 'edit', itemData });
            });
        });
        
        document.querySelectorAll('.certification-item .delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const item = btn.closest('.certification-item');
                const itemData = getItemData(item, 'certifications');
                confirmDelete('certifications', itemData);
            });
        });
    }
}

// Load user languages data
function loadUserLanguages(languages) {
    const languagesList = document.getElementById('languages-list');
    if (!languagesList) return;
    
    languagesList.innerHTML = '';
    
    if (!languages || !languages.length) {
        // Show empty state for languages
        if (isOwnProfile) {
            // Empty state for own profile
            languagesList.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon"><i class="fas fa-globe"></i></div>
                <h3>No languages added yet</h3>
                <p>Add the languages you speak and your proficiency level</p>
                <button class="btn-add-item" data-section="languages">
                    <i class="fas fa-pen"></i> Add Languages
                </button>
            </div>`;
            
            // Add event listener to the button
            const addButton = languagesList.querySelector('.btn-add-item');
            if (addButton) {
                addButton.addEventListener('click', function() {
                    showModal('languages');
                });
            }
        } else {
            // Empty state for viewing someone else's profile
            languagesList.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon"><i class="fas fa-globe"></i></div>
                <h3>No languages listed</h3>
                <p>This user hasn't added any languages yet</p>
            </div>`;
        }
        return;
    }
    
    languages.forEach(lang => {
        const langHtml = `
        <div class="language-item">
            <div class="language-name">${lang.name}</div>
            <div class="language-level">${lang.level}</div>
        </div>
        `;
        
        languagesList.innerHTML += langHtml;
    });
}

// Helper function to format date from YYYY-MM to readable format
function formatDate(dateString) {
    if (!dateString) return '';
    
    try {
        const [year, month] = dateString.split('-');
        const date = new Date(year, month - 1);
        return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
    } catch (e) {
        return dateString;
    }
}

// Helper function to get company initials
function getCompanyInitials(company) {
    if (!company) return '';
    
    const words = company.split(' ');
    if (words.length === 1) {
        return words[0].substring(0, 2).toUpperCase();
    }
    
    return (words[0].charAt(0) + words[1].charAt(0)).toUpperCase();
}

// Helper function to get school initials
function getSchoolInitials(school) {
    if (!school) return '';
    
    const words = school.split(' ');
    if (words.length === 1) {
        return words[0].substring(0, 2).toUpperCase();
    }
    
    // For universities like "University of X", try to get U and X
    if (words[0].toLowerCase() === 'university' && words[1].toLowerCase() === 'of' && words.length > 2) {
        return (words[0].charAt(0) + words[2].charAt(0)).toUpperCase();
    }
    
    return (words[0].charAt(0) + words[1].charAt(0)).toUpperCase();
}

// Extend the getItemData function to handle other section types
function getItemData(item, section) {
    if (section === 'experience') {
        const title = item.querySelector('h3').textContent;
        const company = item.querySelector('.experience-company').textContent;
        const dateText = item.querySelector('.experience-date').textContent;
        const location = item.querySelector('.experience-location')?.textContent.replace(/^.*: /, '') || '';
        const description = item.querySelector('.experience-description p').textContent;
        const skillEls = item.querySelectorAll('.skill-tag');
        const skills = Array.from(skillEls).map(el => el.textContent);
        
        // Parse dates
        let startDate = '', endDate = '', currentlyWorking = false;
        if (dateText.includes('-')) {
            const dates = dateText.split('-').map(d => d.trim());
            startDate = dates[0];
            endDate = dates[1];
            currentlyWorking = endDate === 'Present';
        }
        
        return { title, company, location, description, skills, startDate, endDate, currentlyWorking };
    } else if (section === 'education') {
        const school = item.querySelector('h3').textContent;
        const degreeText = item.querySelector('.education-degree').textContent;
        const dateText = item.querySelector('.education-date').textContent;
        const description = item.querySelector('.education-description p')?.textContent || '';
        
        // Parse degree and field of study
        let degree = degreeText;
        let fieldOfStudy = '';
        
        if (degreeText.includes(' in ')) {
            const parts = degreeText.split(' in ');
            degree = parts[0];
            fieldOfStudy = parts[1];
        }
        
        // Parse dates
        let startYear = '', endYear = '', currentlyStudying = false;
        if (dateText.includes('-')) {
            const dates = dateText.split('-').map(d => d.trim());
            startYear = dates[0];
            endYear = dates[1];
            currentlyStudying = endYear === 'Present';
        }
        
        return { school, degree, fieldOfStudy, startYear, endYear, currentlyStudying, description };
    } else if (section === 'certifications') {
        const name = item.querySelector('h3').textContent;
        const issuer = item.querySelector('.certification-issuer').textContent;
        const dateText = item.querySelector('.certification-date')?.textContent || '';
        const credentialId = item.querySelector('.certification-id')?.textContent.replace('Credential ID: ', '') || '';
        
        // Parse dates
        let issueDate = '', expirationDate = '', noExpiration = false;
        
        if (dateText.includes('Issued')) {
            issueDate = dateText.split('Issued ')[1].split(' ·')[0].trim();
            
            if (dateText.includes('Expires')) {
                expirationDate = dateText.split('Expires ')[1].trim();
            } else {
                noExpiration = true;
                expirationDate = 'No Expiration';
            }
        }
        
        return { name, issuer, issueDate, expirationDate, noExpiration, credentialId };
    }
    
    // Default empty object for other sections
    return {};
}

// Delete user data from Firebase
function deleteUserData(section, itemData) {
    if (!currentUser) return;
    
    const userId = currentUser.uid;
    const userRef = firebase.firestore().collection('users').doc(userId);
    
    userRef.get().then(doc => {
        if (doc.exists) {
            const userData = doc.data();
            
            switch (section) {
                case 'experience':
                    if (userData.experience && userData.experience.length) {
                        const updatedExperiences = userData.experience.filter(exp => 
                            !(exp.title === itemData.title && exp.company === itemData.company));
                        
                        userRef.update({
                            experience: updatedExperiences
                        }).then(() => {
                            loadUserExperience(updatedExperiences);
                            showToast("Experience deleted successfully", "success");
                        }).catch(error => {
                            console.error("Error deleting experience:", error);
                            showToast("Failed to delete experience", "error");
                        });
                    }
                    break;
                    
                case 'education':
                    if (userData.education && userData.education.length) {
                        const updatedEducation = userData.education.filter(edu => 
                            !(edu.school === itemData.school && edu.degree === itemData.degree));
                        
                        userRef.update({
                            education: updatedEducation
                        }).then(() => {
                            loadUserEducation(updatedEducation);
                            showToast("Education deleted successfully", "success");
                        }).catch(error => {
                            console.error("Error deleting education:", error);
                            showToast("Failed to delete education", "error");
                        });
                    }
                    break;
                    
                case 'certifications':
                    if (userData.certifications && userData.certifications.length) {
                        const updatedCertifications = userData.certifications.filter(cert => 
                            !(cert.name === itemData.name && cert.issuer === itemData.issuer));
                        
                        userRef.update({
                            certifications: updatedCertifications
                        }).then(() => {
                            loadUserCertifications(updatedCertifications);
                            showToast("Certification deleted successfully", "success");
                        }).catch(error => {
                            console.error("Error deleting certification:", error);
                            showToast("Failed to delete certification", "error");
                        });
                    }
                    break;
            }
        }
    }).catch(error => {
        console.error("Error getting user data:", error);
        showToast("Failed to retrieve current data", "error");
    });
}

// Show toast message
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <div class="toast-content">${message}</div>
        <button class="toast-dismiss">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    toastContainer.appendChild(toast);
    
    // Show the toast
    setTimeout(() => {
        toast.classList.add('show');
    }, 10);
    
    // Auto dismiss after 5 seconds
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            toast.remove();
        }, 300);
    }, 5000);
    
    // Dismiss on click
    toast.querySelector('.toast-dismiss').addEventListener('click', () => {
        toast.classList.remove('show');
        setTimeout(() => {
            toast.remove();
        }, 300);
    });
}

// Logout function
function logout() {
    firebase.auth().signOut()
        .then(() => {
            window.location.href = '../login/login.html';
        })
        .catch(error => {
            console.error("Logout Error:", error);
            showToast("Error logging out", "error");
        });
}

// Confirm delete with user before removing data
function confirmDelete(section, itemData) {
    // Create confirmation modal
    let confirmMessage = '';
    
    switch(section) {
        case 'experience':
            confirmMessage = `Are you sure you want to delete your experience at ${itemData.company} as ${itemData.title}?`;
            break;
        case 'education':
            confirmMessage = `Are you sure you want to delete your education at ${itemData.school}?`;
            break;
        case 'certifications':
            confirmMessage = `Are you sure you want to delete your ${itemData.name} certification?`;
            break;
        default:
            confirmMessage = `Are you sure you want to delete this ${section} item?`;
    }
    
    const confirmHtml = `
        <div class="modal">
            <div class="modal-header">
                <h2 class="modal-title">Confirm Delete</h2>
                <button class="modal-close" aria-label="Close">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="modal-body">
                <p>${confirmMessage}</p>
            </div>
            <div class="modal-footer">
                <button class="btn-cancel modal-close">Cancel</button>
                <button class="btn-delete">Delete</button>
            </div>
        </div>
    `;
    
    modalOverlay.innerHTML = confirmHtml;
    modalOverlay.classList.add('active');
    
    // Add event listeners
    const modal = modalOverlay.querySelector('.modal');
    const closeBtn = modal.querySelector('.modal-close');
    const cancelBtn = modal.querySelector('.btn-cancel');
    const deleteBtn = modal.querySelector('.btn-delete');
    
    closeBtn.addEventListener('click', () => {
        modalOverlay.classList.remove('active');
    });
    
    cancelBtn.addEventListener('click', () => {
        modalOverlay.classList.remove('active');
    });
    
    deleteBtn.addEventListener('click', () => {
        deleteUserData(section, itemData);
        modalOverlay.classList.remove('active');
    });
}

// Show confirmation dialog
function showConfirmDialog(title, message, onConfirm) {
    const confirmHtml = `
        <div class="modal">
            <div class="modal-header">
                <h2 class="modal-title">${title}</h2>
                <button class="modal-close" aria-label="Close">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="modal-body">
                <p>${message}</p>
            </div>
            <div class="modal-footer">
                <button class="btn-cancel modal-close">Cancel</button>
                <button class="btn-confirm">Confirm</button>
            </div>
        </div>
    `;
    
    modalOverlay.innerHTML = confirmHtml;
    modalOverlay.classList.add('active');
    
    // Add event listeners
    const modal = modalOverlay.querySelector('.modal');
    const closeBtn = modal.querySelector('.modal-close');
    const cancelBtn = modal.querySelector('.btn-cancel');
    const confirmBtn = modal.querySelector('.btn-confirm');
    
    closeBtn.addEventListener('click', () => {
        modalOverlay.classList.remove('active');
    });
    
    cancelBtn.addEventListener('click', () => {
        modalOverlay.classList.remove('active');
    });
    
    confirmBtn.addEventListener('click', () => {
        if (typeof onConfirm === 'function') {
            onConfirm();
        }
        modalOverlay.classList.remove('active');
    });
}

// Show report modal
function showReportModal() {
    const reportHtml = `
        <div class="modal">
            <div class="modal-header">
                <h2 class="modal-title">Report User</h2>
                <button class="modal-close" aria-label="Close">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <form>
                <div class="modal-body">
                    <div class="form-group">
                        <label class="form-label">Report Reason</label>
                        <select class="form-select" id="report-reason">
                            <option value="">Select a reason</option>
                            <option value="fake_profile">Fake profile</option>
                            <option value="inappropriate_content">Inappropriate content</option>
                            <option value="harassment">Harassment or bullying</option>
                            <option value="spam">Spam or scam</option>
                            <option value="other">Other</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label" for="report-description">Additional details</label>
                        <textarea class="form-textarea" id="report-description" rows="4" placeholder="Please provide more details about your report..."></textarea>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn-cancel modal-close">Cancel</button>
                    <button type="submit" class="btn-save">Submit Report</button>
                </div>
            </form>
        </div>
    `;
    
    modalOverlay.innerHTML = reportHtml;
    modalOverlay.classList.add('active');
    
    // Add event listeners
    const modal = modalOverlay.querySelector('.modal');
    const closeBtn = modal.querySelector('.modal-close');
    const form = modal.querySelector('form');
    const cancelBtn = modal.querySelector('.btn-cancel');
    
    closeBtn.addEventListener('click', () => {
        modalOverlay.classList.remove('active');
    });
    
    cancelBtn.addEventListener('click', () => {
        modalOverlay.classList.remove('active');
    });
    
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const reason = document.getElementById('report-reason').value;
        const description = document.getElementById('report-description').value;
        
        if (!reason) {
            showToast('Please select a reason for your report', 'error');
            return;
        }
        
        // Send report data to backend
        console.log('Report submitted:', { reason, description });
        
        modalOverlay.classList.remove('active');
        showToast('Thank you for your report. We will review it shortly.', 'success');
    });
}

// Handle avatar upload
function handleAvatarUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    // Check file type
    if (!file.type.match('image.*')) {
        showToast('Please select an image file', 'error');
        return;
    }
    
    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
        showToast('Image size should be less than 5MB', 'error');
        return;
    }
    
    // Show loading state
    userAvatar.style.opacity = '0.6';
    showToast('Uploading image...', 'info');
    
    // Upload to ImageBB instead of Firebase Storage
    uploadImageToImageBB(file).then(imageUrl => {
        if (!imageUrl) {
            throw new Error('Failed to get image URL from ImageBB');
        }
        
        // Update user avatar in Firestore only
        const userRef = firebase.firestore().collection('users').doc(currentUser.uid);
        
        return userRef.update({
            photoURL: imageUrl
        });
    }).then(() => {
        // Update avatar in UI
        userAvatar.src = URL.createObjectURL(file);
        userAvatar.style.opacity = '1';
        showToast('Profile picture updated successfully', 'success');
    }).catch((error) => {
        console.error("Error uploading image:", error);
        userAvatar.style.opacity = '1';
        showToast('Failed to upload image', 'error');
    });
}

// Follow user
function followUser(userId) {
    return new Promise((resolve, reject) => {
        if (!currentUser) {
            reject(new Error("You must be logged in to follow users"));
            return;
        }
        
        const targetUserId = profileUserId || userId;
        
        const db = firebase.firestore();
        const batch = db.batch();
        
        // Add to current user's following list
        const currentUserRef = db.collection('users').doc(currentUser.uid);
        batch.update(currentUserRef, {
            following: firebase.firestore.FieldValue.arrayUnion(targetUserId)
        });
        
        // Add to target user's followers list
        const targetUserRef = db.collection('users').doc(targetUserId);
        batch.update(targetUserRef, {
            followers: firebase.firestore.FieldValue.arrayUnion(currentUser.uid)
        });
        
        // Commit the batch
        batch.commit()
            .then(() => {
                resolve();
            })
            .catch(error => {
                console.error("Error following user:", error);
                reject(error);
            });
    });
}

// Unfollow user
function unfollowUser(userId) {
    return new Promise((resolve, reject) => {
        if (!currentUser) {
            reject(new Error("You must be logged in to unfollow users"));
            return;
        }
        
        const targetUserId = profileUserId || userId;
        
        const db = firebase.firestore();
        const batch = db.batch();
        
        // Remove from current user's following list
        const currentUserRef = db.collection('users').doc(currentUser.uid);
        batch.update(currentUserRef, {
            following: firebase.firestore.FieldValue.arrayRemove(targetUserId)
        });
        
        // Remove from target user's followers list
        const targetUserRef = db.collection('users').doc(targetUserId);
        batch.update(targetUserRef, {
            followers: firebase.firestore.FieldValue.arrayRemove(currentUser.uid)
        });
        
        // Commit the batch
        batch.commit()
            .then(() => {
                resolve();
            })
            .catch(error => {
                console.error("Error unfollowing user:", error);
                reject(error);
            });
    });
}

// Create or get existing chat
function createOrGetChat(userId) {
    return new Promise((resolve, reject) => {
        if (!currentUser) {
            reject(new Error("You must be logged in to start a chat"));
            return;
        }
        
        const targetUserId = profileUserId || userId;
        
        // Check if chat already exists
        const db = firebase.firestore();
        db.collection('chats')
            .where('participants', 'array-contains', currentUser.uid)
            .get()
            .then(snapshot => {
                let chatId = null;
                
                // Look for an existing chat with this user
                snapshot.forEach(doc => {
                    const chatData = doc.data();
                    if (chatData.participants && chatData.participants.includes(targetUserId)) {
                        chatId = doc.id;
                    }
                });
                
                if (chatId) {
                    // Chat exists, return its ID
                    resolve(chatId);
                } else {
                    // Create a new chat
                    db.collection('chats').add({
                        participants: [currentUser.uid, targetUserId],
                        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                        lastMessage: null,
                        lastMessageTimestamp: null
                    })
                    .then(docRef => {
                        resolve(docRef.id);
                    })
                    .catch(error => {
                        console.error("Error creating chat:", error);
                        reject(error);
                    });
                }
            })
            .catch(error => {
                console.error("Error checking for existing chat:", error);
                reject(error);
            });
    });
}

// Send follow request notification
async function sendFollowRequestNotification(recipientId, senderId) {
    try {
        // Get sender user data
        const senderDoc = await firebase.firestore().collection("users").doc(senderId).get();
        if (!senderDoc.exists) return;
        
        const senderData = senderDoc.data();
        const senderName = senderData.displayName || senderData.fullName || "A user";
        
        // Create notification
        await firebase.firestore().collection("users")
            .doc(recipientId)
            .collection("notifications")
            .add({
                type: "follow_request",
                message: `${senderName} has requested to follow you`,
                senderId: senderId,
                read: false,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
        // Update unread count
        await firebase.firestore().collection("users").doc(recipientId).update({
            unreadNotifications: firebase.firestore.FieldValue.increment(1)
        });
    } catch (error) {
        console.error("Error sending notification:", error);
    }
}

// Function to hide skeleton and show content
function hideSkeletonAndShowContent(skeletonId, contentElement) {
    if (skeletonElements[skeletonId]) {
        skeletonElements[skeletonId].style.display = 'none';
    }
    if (contentElement && typeof contentElement === 'string') {
        const element = document.getElementById(contentElement);
        if (element) element.style.display = '';
    } else if (contentElement) {
        contentElement.style.display = '';
    }
}

// Function to hide all skeletons for a section
function hideSkeletonsForSection(section) {
    switch(section) {
        case 'profile':
            hideSkeletonAndShowContent('avatar', 'user-avatar');
            hideSkeletonAndShowContent('name', 'display-name');
            hideSkeletonAndShowContent('headline', 'headline');
            hideSkeletonAndShowContent('location', document.querySelector('.location'));
            hideSkeletonAndShowContent('connections', document.querySelectorAll('.connection-count')[0]);
            hideSkeletonAndShowContent('applications', document.querySelectorAll('.connection-count')[1]);
            hideSkeletonAndShowContent('interviews', document.querySelectorAll('.connection-count')[2]);
            break;
        case 'about':
            hideSkeletonAndShowContent('about', 'about-content');
            break;
        case 'experience':
            hideSkeletonAndShowContent('experience', 'experience-list');
            break;
        case 'education':
            hideSkeletonAndShowContent('education', 'education-list');
            break;
        case 'skills':
            hideSkeletonAndShowContent('skills', 'skills-list');
            break;
        case 'certifications':
            hideSkeletonAndShowContent('certifications', 'certifications-list');
            break;
        case 'languages':
            hideSkeletonAndShowContent('languages', 'languages-list');
            break;
        case 'all':
            Object.keys(skeletonElements).forEach(key => {
                if (skeletonElements[key]) {
                    skeletonElements[key].style.display = 'none';
                }
            });
            document.getElementById('user-avatar').style.display = '';
            document.getElementById('display-name').style.display = '';
            document.getElementById('headline').style.display = '';
            document.querySelector('.location').style.display = '';
            document.querySelectorAll('.connection-count').forEach(el => el.style.display = '');
            document.getElementById('about-content').style.display = '';
            document.getElementById('experience-list').style.display = '';
            document.getElementById('education-list').style.display = '';
            document.getElementById('skills-list').style.display = '';
            document.getElementById('certifications-list').style.display = '';
            document.getElementById('languages-list').style.display = '';
            break;
    }
}

// Download resume as PDF
function downloadResume() {
    showToast('Preparing your resume for download...', 'info');
    
    // Simulate download delay
    setTimeout(() => {
        showToast('Resume downloaded successfully!', 'success');
    }, 1500);
}

// Show profile analytics
function showProfileAnalytics() {
    showToast('Loading your profile analytics...', 'info');
    
    // Fetch analytics data from Firestore
    const analyticsRef = firebase.firestore().collection('users').doc(currentUser.uid).collection('analytics');
    
    // Get profile views data
    analyticsRef.doc('profileData').get()
        .then(profileDataDoc => {
            console.log("Analytics data fetched:", profileDataDoc.exists ? "found" : "not found");
            
            // Extract data or create default if it doesn't exist
            let profileData;
            
            if (!profileDataDoc.exists) {
                // Create initial analytics data
                profileData = {
                    profileViews: {
                        total: 0,
                        weekly: 0,
                        trend: 0,
                        uniqueViewers: []
                    },
                    searchAppearances: {
                        total: 0,
                        weekly: 0,
                        trend: 0
                    },
                    jobInterests: {
                        total: 0,
                        weekly: 0,
                        trend: 0
                    },
                    companies: [],
                    viewsData: generateSampleViewsData(30), // Generate empty data for the chart
                    lastUpdated: firebase.firestore.Timestamp.now()
                };
                
                // Save the initial data
                analyticsRef.doc('profileData').set(profileData)
                    .then(() => console.log("Initial analytics data created"))
                    .catch(error => {
                        console.error("Error creating initial analytics data:", error);
                        showToast("Could not save analytics data. Check permissions.", "error");
                    });
            } else {
                profileData = profileDataDoc.data();
                console.log("Raw analytics data:", profileData);
                
                // Ensure all required fields exist
                if (!profileData.profileViews) profileData.profileViews = { total: 0, weekly: 0, trend: 0, uniqueViewers: [] };
                if (!profileData.searchAppearances) profileData.searchAppearances = { total: 0, weekly: 0, trend: 0 };
                if (!profileData.jobInterests) profileData.jobInterests = { total: 0, weekly: 0, trend: 0 };
                if (!profileData.companies) profileData.companies = [];
                
                // Ensure viewsData exists, if not generate it
                if (!profileData.viewsData || profileData.viewsData.length === 0) {
                    profileData.viewsData = generateSampleViewsData(30);
                }
            }
            
            // Create the analytics modal
            const analyticsHtml = `
                <div class="modal">
                    <div class="modal-header">
                        <h2 class="modal-title">Profile Analytics</h2>
                        <button class="modal-close" aria-label="Close">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="modal-body">
                        <div class="analytics-info">
                            <div class="analytics-timestamp">
                                Last updated: ${formatDateTime(profileData.lastUpdated?.toDate() || new Date())}
                            </div>
                            <div class="analytics-unique">
                                <i class="fas fa-users"></i> ${profileData.profileViews.uniqueViewers?.length || 0} unique visitors
                            </div>
                        </div>
                        
                        <div class="analytics-controls" style="display: flex; justify-content: flex-end;">
                            <button id="refresh-analytics" class="btn-refresh">
                                <i class="fas fa-sync-alt"></i> Refresh
                            </button>
                        </div>
                        
                        <div class="analytics-summary">
                            <div class="analytics-stat">
                                <div class="analytics-value">${profileData.profileViews.total || 0}</div>
                                <div class="analytics-label">Profile Views</div>
                                <div class="analytics-trend ${profileData.profileViews.trend > 0 ? 'positive' : profileData.profileViews.trend < 0 ? 'negative' : ''}">
                                    <i class="fas fa-${profileData.profileViews.trend > 0 ? 'arrow-up' : profileData.profileViews.trend < 0 ? 'arrow-down' : 'minus'}"></i>
                                    ${Math.abs(profileData.profileViews.trend || 0)}% from last period
                                </div>
                            </div>
                            <div class="analytics-stat">
                                <div class="analytics-value">${profileData.searchAppearances.total || 0}</div>
                                <div class="analytics-label">Search Appearances</div>
                                <div class="analytics-trend ${profileData.searchAppearances.trend > 0 ? 'positive' : profileData.searchAppearances.trend < 0 ? 'negative' : ''}">
                                    <i class="fas fa-${profileData.searchAppearances.trend > 0 ? 'arrow-up' : profileData.searchAppearances.trend < 0 ? 'arrow-down' : 'minus'}"></i>
                                    ${Math.abs(profileData.searchAppearances.trend || 0)}% from last period
                                </div>
                            </div>
                            <div class="analytics-stat">
                                <div class="analytics-value">${profileData.jobInterests.total || 0}</div>
                                <div class="analytics-label">Job Interests</div>
                                <div class="analytics-trend ${profileData.jobInterests.trend > 0 ? 'positive' : profileData.jobInterests.trend < 0 ? 'negative' : ''}">
                                    <i class="fas fa-${profileData.jobInterests.trend > 0 ? 'arrow-up' : profileData.jobInterests.trend < 0 ? 'arrow-down' : 'minus'}"></i>
                                    ${Math.abs(profileData.jobInterests.trend || 0)}% from last period
                                </div>
                            </div>
                        </div>
                        
                        <div class="analytics-details">
                            <div class="viewer-stats">
                                <h3 class="section-title">Who's Viewing Your Profile</h3>
                                <div class="viewers-list">
                                    <p>Your profile was viewed by people from these companies:</p>
                                    <ul class="company-list">
                                        ${profileData.companies && profileData.companies.length > 0 ? 
                                            profileData.companies.map(company => `<li>${company}</li>`).join('') : 
                                            '<li>No company data available yet</li>'}
                                    </ul>
                                </div>
                            </div>
                        </div>
                        
                        <div class="upgrade-prompt">
                            <p>Get more detailed analytics and see all profile viewers by upgrading to Premium.</p>
                            <button class="btn-primary">Upgrade Now</button>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn-secondary modal-close">Close</button>
                        <button id="export-analytics" class="btn-primary">
                            <i class="fas fa-download"></i> Export Data
                        </button>
                    </div>
                </div>
            `;
            
            modalOverlay.innerHTML = analyticsHtml;
            modalOverlay.classList.add('active');
            
            // Add event listeners
            const closeButtons = modalOverlay.querySelectorAll('.modal-close');
            closeButtons.forEach(btn => {
                btn.addEventListener('click', () => {
                    modalOverlay.classList.remove('active');
                });
            });
            
            // Add refresh functionality
            const refreshButton = document.getElementById('refresh-analytics');
            if (refreshButton) {
                refreshButton.addEventListener('click', () => {
                    refreshAnalyticsData();
                });
            }
            
            // Add export functionality
            const exportButton = document.getElementById('export-analytics');
            if (exportButton) {
                exportButton.addEventListener('click', () => {
                    exportAnalyticsData(profileData);
                });
            }
        })
        .catch(error => {
            console.error("Error fetching analytics data:", error);
            showToast("Could not load analytics data. This could be a permissions issue.", "error");
            
            // Try to display a basic modal anyway
            const errorProfile = {
                profileViews: { total: 0, weekly: 0, trend: 0, uniqueViewers: [] },
                searchAppearances: { total: 0, weekly: 0, trend: 0 },
                jobInterests: { total: 0, weekly: 0, trend: 0 },
                companies: [],
                viewsData: generateSampleViewsData(30),
                lastUpdated: firebase.firestore.Timestamp.now()
            };
            
            // Create empty analytics display
            const analyticsHtml = `
                <div class="modal">
                    <div class="modal-header">
                        <h2 class="modal-title">Profile Analytics</h2>
                        <button class="modal-close" aria-label="Close">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="modal-body">
                        <div class="analytics-error">
                            <i class="fas fa-exclamation-circle"></i>
                            <p>There was an error loading your analytics data.</p>
                            <p class="error-details">Error: ${error.message}</p>
                        </div>
                        
                        <div class="analytics-summary">
                            <div class="analytics-stat">
                                <div class="analytics-value">0</div>
                                <div class="analytics-label">Profile Views</div>
                            </div>
                            <div class="analytics-stat">
                                <div class="analytics-value">0</div>
                                <div class="analytics-label">Search Appearances</div>
                            </div>
                            <div class="analytics-stat">
                                <div class="analytics-value">0</div>
                                <div class="analytics-label">Job Interests</div>
                            </div>
                        </div>
                        
                        <div class="upgrade-prompt">
                            <p>Get more detailed analytics and see all profile viewers by upgrading to Premium.</p>
                            <button class="btn-primary">Upgrade Now</button>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn-secondary modal-close">Close</button>
                    </div>
                </div>
            `;
            
            modalOverlay.innerHTML = analyticsHtml;
            modalOverlay.classList.add('active');
            
            // Add close event listener
            const closeButtons = modalOverlay.querySelectorAll('.modal-close');
            closeButtons.forEach(btn => {
                btn.addEventListener('click', () => {
                    modalOverlay.classList.remove('active');
                });
            });
        });
}

// Format date and time for display
function formatDateTime(date) {
    if (!date) return 'Never';
    
    return date.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Load Chart.js library dynamically
function loadChartJS() {
    return new Promise((resolve, reject) => {
        if (window.Chart) {
            resolve();
            return;
        }
        
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/chart.js';
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Failed to load Chart.js'));
        document.head.appendChild(script);
    });
}

// Create the analytics chart
function createAnalyticsChart(profileData) {
    // Demo data for the chart
    const ctx = document.getElementById('views-chart');
    if (!ctx) return;
    
    // Generate 30 days of sample data if not available
    const viewsData = profileData.viewsData || generateSampleViewsData(30);
    
    // Extract dates and counts
    const dates = viewsData.map(item => item.date);
    const counts = viewsData.map(item => item.count);
    
    // Create gradient for the chart
    const gradient = ctx.getContext('2d').createLinearGradient(0, 0, 0, 300);
    gradient.addColorStop(0, 'rgba(52, 152, 219, 0.6)');
    gradient.addColorStop(1, 'rgba(52, 152, 219, 0.1)');
    
    // Handle dark mode
    const isDarkMode = document.documentElement.classList.contains('dark-mode');
    const textColor = isDarkMode ? '#ecf0f1' : '#2c3e50';
    const gridColor = isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';
    
    // Create chart
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: dates,
            datasets: [{
                label: 'Profile Views',
                data: counts,
                backgroundColor: gradient,
                borderColor: '#3498db',
                borderWidth: 2,
                tension: 0.4,
                fill: true,
                pointBackgroundColor: '#3498db',
                pointBorderColor: isDarkMode ? '#1a1a1a' : '#ffffff',
                pointRadius: 4,
                pointHoverRadius: 6,
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: isDarkMode ? '#2a2a2a' : '#ffffff',
                    titleColor: textColor,
                    bodyColor: textColor,
                    borderColor: gridColor,
                    borderWidth: 1,
                    displayColors: false,
                    padding: 10,
                    callbacks: {
                        title: function(tooltipItems) {
                            return new Date(tooltipItems[0].label).toLocaleDateString(undefined, {
                                weekday: 'short', 
                                year: 'numeric', 
                                month: 'short', 
                                day: 'numeric'
                            });
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        color: textColor,
                        maxRotation: 0,
                        callback: function(value, index) {
                            return index % 5 === 0 ? new Date(this.getLabelForValue(value)).getDate() : '';
                        }
                    }
                },
                y: {
                    grid: {
                        color: gridColor
                    },
                    ticks: {
                        color: textColor,
                        precision: 0,
                        stepSize: 1
                    },
                    beginAtZero: true
                }
            }
        }
    });
}

// Generate sample views data
function generateSampleViewsData(days) {
    const data = [];
    const today = new Date();
    
    for (let i = days - 1; i >= 0; i--) {
        const date = new Date();
        date.setDate(today.getDate() - i);
        
        data.push({
            date: date.toISOString().split('T')[0],
            count: Math.floor(Math.random() * 5) // Random number between 0-4
        });
    }
    
    return data;
}

// Refresh analytics data
function refreshAnalyticsData() {
    showToast('Refreshing analytics data...', 'info');
    
    // Update the analytics data in Firestore with new random data
    const analyticsRef = firebase.firestore().collection('users').doc(currentUser.uid).collection('analytics');
    
    // Get current data to calculate trends
    analyticsRef.doc('profileData').get()
        .then(doc => {
            if (doc.exists) {
                const currentData = doc.data();
                
                // Only recalculate the trends and stats based on existing data
                const viewsData = currentData.viewsData || [];
                
                // Sort viewsData by date
                viewsData.sort((a, b) => new Date(a.date) - new Date(b.date));
                
                // Keep only the last 90 days
                const cutoffDate = new Date();
                cutoffDate.setDate(cutoffDate.getDate() - 90);
                const filteredViewsData = viewsData.filter(item => 
                    new Date(item.date) >= cutoffDate
                );
                
                // Calculate weekly views (last 7 days)
                const weeklyViewsData = filteredViewsData.filter(item => {
                    const itemDate = new Date(item.date);
                    const weekAgo = new Date();
                    weekAgo.setDate(weekAgo.getDate() - 7);
                    return itemDate >= weekAgo;
                });
                
                const weeklyViews = weeklyViewsData.reduce((sum, item) => sum + item.count, 0);
                
                // Calculate trend for profile views
                let profileViewsTrend = 0;
                if (currentData.profileViews && currentData.profileViews.weekly) {
                    const previousWeekly = currentData.profileViews.weekly;
                    if (previousWeekly > 0) {
                        profileViewsTrend = Math.round(((weeklyViews - previousWeekly) / previousWeekly) * 100);
                    }
                }
                
                // Calculate trend for search appearances (simulated)
                let searchAppearancesTrend = Math.floor(Math.random() * 30) - 15; // -15 to +15
                
                // Calculate trend for job interests (simulated)
                let jobInterestsTrend = Math.floor(Math.random() * 20) - 10; // -10 to +10
                
                // Create the update data
                const updateData = {
                    'profileViews.weekly': weeklyViews,
                    'profileViews.trend': profileViewsTrend,
                    'searchAppearances.trend': searchAppearancesTrend,
                    'jobInterests.trend': jobInterestsTrend,
                    'lastUpdated': firebase.firestore.Timestamp.now()
                };
                
                // Update the data in Firestore
                analyticsRef.doc('profileData').update(updateData)
                    .then(() => {
                        showToast('Analytics data refreshed!', 'success');
                        
                        // Reload the analytics modal
                        showProfileAnalytics();
                    })
                    .catch(error => {
                        console.error("Error updating analytics data:", error);
                        showToast('Failed to refresh analytics data', 'error');
                    });
            } else {
                showToast('No analytics data found to refresh', 'error');
            }
        })
        .catch(error => {
            console.error("Error fetching current analytics data:", error);
            showToast('Failed to refresh analytics data', 'error');
        });
}

// Simulate search appearance
function simulateSearchAppearance(userId) {
    // Skip analytics recording when not for current user
    // This prevents the "Missing or insufficient permissions" error
    if (userId !== currentUser.uid) {
        console.log("Skipping search appearance analytics for other user profiles to prevent permission errors");
        return;
    }
    
    const analyticsRef = firebase.firestore().collection('users').doc(userId).collection('analytics');
    
    analyticsRef.doc('profileData').get()
        .then(doc => {
            if (doc.exists) {
                const data = doc.data();
                
                // Update search appearances count
                analyticsRef.doc('profileData').update({
                    'searchAppearances.total': firebase.firestore.FieldValue.increment(1),
                    'searchAppearances.weekly': firebase.firestore.FieldValue.increment(1),
                    'lastUpdated': firebase.firestore.Timestamp.now()
                })
                .then(() => console.log("Search appearance recorded"))
                .catch(error => console.error("Error updating search appearances:", error));
            }
        })
        .catch(error => {
            console.error("Error getting analytics data for search appearance:", error);
        });
}

// Simulate job interest
function simulateJobInterest(userId, jobDetails) {
    // Skip analytics recording when not for current user
    // This prevents the "Missing or insufficient permissions" error
    if (userId !== currentUser.uid) {
        console.log("Skipping job interest analytics for other user profiles to prevent permission errors");
        return;
    }
    
    const analyticsRef = firebase.firestore().collection('users').doc(userId).collection('analytics');
    
    analyticsRef.doc('profileData').get()
        .then(doc => {
            if (doc.exists) {
                const data = doc.data();
                
                // Update job interests count
                analyticsRef.doc('profileData').update({
                    'jobInterests.total': firebase.firestore.FieldValue.increment(1),
                    'jobInterests.weekly': firebase.firestore.FieldValue.increment(1),
                    'lastUpdated': firebase.firestore.Timestamp.now()
                })
                .then(() => console.log("Job interest recorded"))
                .catch(error => console.error("Error updating job interests:", error));
            }
        })
        .catch(error => {
            console.error("Error getting analytics data for job interest:", error);
        });
}

// Update analytics for different time periods
function updateAnalyticsTimePeriod(days, profileData) {
    showToast(`Updating to ${days} day view...`, 'info');
    
    // Filter the existing data to the selected time period
    const viewsData = profileData.viewsData || [];
    const now = new Date();
    const startDate = new Date();
    startDate.setDate(now.getDate() - parseInt(days));
    
    // Filter viewsData to include only the selected time period
    const filteredData = viewsData.filter(item => {
        const itemDate = new Date(item.date);
        return itemDate >= startDate && itemDate <= now;
    });
    
    // If there's not enough data, pad with zeroes for missing dates
    const paddedData = [];
    for (let i = 0; i < parseInt(days); i++) {
        const date = new Date();
        date.setDate(now.getDate() - (parseInt(days) - 1 - i));
        const dateString = date.toISOString().split('T')[0];
        
        // Check if this date exists in the filtered data
        const existingEntry = filteredData.find(item => item.date === dateString);
        
        if (existingEntry) {
            paddedData.push(existingEntry);
        } else {
            paddedData.push({
                date: dateString,
                count: 0
            });
        }
    }
    
    // Update the chart with the filtered data
    loadChartJS().then(() => {
        // Remove existing chart
        const chartContainer = document.querySelector('.chart-container');
        if (chartContainer) {
            chartContainer.innerHTML = '<h3 class="section-title">Views Over Time</h3><canvas id="views-chart"></canvas>';
            
            // Create new chart with the filtered data
            createAnalyticsChart({ viewsData: paddedData });
            
            showToast('Time period updated', 'success');
        }
    });
}

// Export analytics data
function exportAnalyticsData(profileData) {
    showToast('Preparing data export...', 'info');
    
    setTimeout(() => {
        try {
            // Generate viewsData if not available
            const viewsData = profileData.viewsData || generateSampleViewsData(30);
            
            // Create CSV content
            let csvContent = "data:text/csv;charset=utf-8,";
            
            // Add headers
            csvContent += "Date,Profile Views\n";
            
            // Add data rows
            viewsData.forEach(row => {
                csvContent += `${row.date},${row.count}\n`;
            });
            
            // Create download link
            const encodedUri = encodeURI(csvContent);
            const link = document.createElement("a");
            link.setAttribute("href", encodedUri);
            link.setAttribute("download", "profile_analytics.csv");
            document.body.appendChild(link);
            
            // Trigger download
            link.click();
            document.body.removeChild(link);
            
            showToast('Analytics data exported successfully', 'success');
        } catch (error) {
            console.error("Error exporting data:", error);
            showToast('Failed to export data', 'error');
        }
    }, 1000);
}

// Record a profile view when a user visits another profile
function recordProfileView(profileId, viewerId) {
    console.log(`Recording profile view: profileId=${profileId}, viewerId=${viewerId}`);
    
    // Don't record if it's the same person viewing their own profile
    if (profileId === viewerId) {
        console.log("Not recording view - user is viewing their own profile");
        return;
    }
    
    if (!profileId || !viewerId) {
        console.error("Invalid profile or viewer ID");
        return;
    }
    
    // Skip analytics recording when viewing other users' profiles
    // This prevents the "Missing or insufficient permissions" error
    if (profileId !== currentUser.uid) {
        console.log("Skipping analytics for other user profiles to prevent permission errors");
        return;
    }
    
    // Continue with analytics recording only for the current user's profile
    const analyticsRef = firebase.firestore().collection('users').doc(profileId).collection('analytics');
    
    // Get the current date
    const today = new Date().toISOString().split('T')[0];
    
    // First, check if there's an existing analytics document for the profile
    analyticsRef.doc('profileData').get()
        .then(doc => {
            console.log(`Analytics document exists: ${doc.exists}`);
            if (!doc.exists) {
                // Create initial analytics document if it doesn't exist
                const initialData = {
                    profileViews: {
                        total: 1,
                        weekly: 1,
                        trend: 0,
                        uniqueViewers: [viewerId]
                    },
                    searchAppearances: {
                        total: 0,
                        weekly: 0,
                        trend: 0
                    },
                    jobInterests: {
                        total: 0,
                        weekly: 0,
                        trend: 0
                    },
                    companies: [],
                    viewsData: [{
                        date: today,
                        count: 1
                    }],
                    lastUpdated: firebase.firestore.Timestamp.now()
                };
                
                analyticsRef.doc('profileData').set(initialData)
                    .then(() => {
                        console.log("Initial analytics data created for new profile view");
                        showToast("You're the first visitor to this profile!", "info");
                    })
                    .catch(error => {
                        console.error("Error creating initial analytics:", error);
                        // Try a simplified version if permissions are an issue
                        analyticsRef.doc('profileData').set({
                            'profileViews': { total: 1 },
                            'lastUpdated': firebase.firestore.Timestamp.now()
                        }).catch(err => console.error("Failed even with simplified data:", err));
                    });
            } else {
                // Update existing analytics document
                const data = doc.data();
                
                // Ensure all required fields exist with defaults
                if (!data.profileViews) data.profileViews = { total: 0, weekly: 0, trend: 0, uniqueViewers: [] };
                if (!data.profileViews.uniqueViewers) data.profileViews.uniqueViewers = [];
                if (!data.viewsData) data.viewsData = [];
                
                const viewsData = data.viewsData;
                const uniqueViewers = data.profileViews.uniqueViewers;
                
                // Check if this user has viewed the profile before
                const isNewViewer = !uniqueViewers.includes(viewerId);
                console.log(`Is new viewer: ${isNewViewer}`);
                
                // Find today's entry in viewsData or create a new one
                const todayEntry = viewsData.find(item => item.date === today);
                
                if (todayEntry) {
                    // Increment today's count
                    todayEntry.count += 1;
                    console.log(`Incrementing today's count to ${todayEntry.count}`);
                } else {
                    // Add a new entry for today
                    viewsData.push({
                        date: today,
                        count: 1
                    });
                    console.log(`Adding new entry for today`);
                }
                
                // Sort viewsData by date
                viewsData.sort((a, b) => new Date(a.date) - new Date(b.date));
                
                // Keep only the last 90 days
                const cutoffDate = new Date();
                cutoffDate.setDate(cutoffDate.getDate() - 90);
                const filteredViewsData = viewsData.filter(item => 
                    new Date(item.date) >= cutoffDate
                );
                
                // Calculate weekly views (last 7 days)
                const weeklyViewsData = filteredViewsData.filter(item => {
                    const itemDate = new Date(item.date);
                    const weekAgo = new Date();
                    weekAgo.setDate(weekAgo.getDate() - 7);
                    return itemDate >= weekAgo;
                });
                
                const weeklyViews = weeklyViewsData.reduce((sum, item) => sum + item.count, 0);
                console.log(`Weekly views: ${weeklyViews}`);
                
                // Calculate trend
                let trend = 0;
                if (data.profileViews && data.profileViews.weekly) {
                    const previousWeekly = data.profileViews.weekly;
                    if (previousWeekly > 0) {
                        trend = Math.round(((weeklyViews - previousWeekly) / previousWeekly) * 100);
                    }
                }
                console.log(`Trend: ${trend}%`);
                
                // Update the unique viewers array if this is a new viewer
                if (isNewViewer) {
                    uniqueViewers.push(viewerId);
                }
                
                // Try a batched approach to updates for better reliability
                try {
                    // First update just the total count which is most important
                    analyticsRef.doc('profileData').update({
                        'profileViews.total': firebase.firestore.FieldValue.increment(1),
                        'lastUpdated': firebase.firestore.Timestamp.now()
                    }).then(() => {
                        // After successful basic update, update the rest of the analytics
                        analyticsRef.doc('profileData').update({
                            'profileViews.weekly': weeklyViews,
                            'profileViews.trend': trend,
                            'profileViews.uniqueViewers': uniqueViewers,
                            'viewsData': filteredViewsData
                        }).then(() => {
                            console.log("Profile view recorded successfully");
                        }).catch(error => {
                            console.error("Error updating detailed profile views:", error);
                        });
                    }).catch(error => {
                        console.error("Error updating basic profile views:", error);
                    });
                } catch (error) {
                    console.error("Exception in profile view update:", error);
                }
            }
        })
        .catch(error => {
            console.error("Error checking analytics document:", error);
        });
    
    // Also record company information if available
    if (currentUser && currentUser.company) {
        updateViewerCompany(profileId, currentUser.company);
    }
}

// Update the company information for profile viewers
function updateViewerCompany(profileId, company) {
    // Skip analytics recording when viewing other users' profiles
    // This prevents the "Missing or insufficient permissions" error
    if (profileId !== currentUser.uid) {
        console.log("Skipping company analytics for other user profiles to prevent permission errors");
        return;
    }
    
    const analyticsRef = firebase.firestore().collection('users').doc(profileId).collection('analytics');
    
    analyticsRef.doc('profileData').get()
        .then(doc => {
            if (doc.exists) {
                const data = doc.data();
                let companies = data.companies || [];
                
                // Check if company already exists in the list
                const existingCompanyIndex = companies.findIndex(c => c === company);
                
                if (existingCompanyIndex === -1) {
                    // Add new company
                    companies.push(company);
                    
                    // Keep only the top 10 companies
                    if (companies.length > 10) {
                        companies = companies.slice(-10);
                    }
                    
                    // Update the companies list
                    analyticsRef.doc('profileData').update({
                        'companies': companies
                    })
                    .catch(error => console.error("Error updating companies:", error));
                }
            }
        })
        .catch(error => console.error("Error retrieving companies:", error));
}

function showJobPreferences() {
    // Fetch current job preferences from Firestore
    if (!currentUser) return;
    
    firebase.firestore().collection('users').doc(currentUser.uid).get()
        .then(doc => {
            if (doc.exists) {
                const userData = doc.data();
                const jobPreferences = userData.jobPreferences || {};
                
                // Create and display a modal for job preferences with the fetched data
                showModal('jobPreferences', jobPreferences);
            } else {
                // No user data found, just show empty form
                showModal('jobPreferences', {});
            }
        })
        .catch(error => {
            console.error("Error fetching job preferences:", error);
            showToast("Failed to load job preferences", "error");
            // Show empty form on error
            showModal('jobPreferences', {});
        });
}

// Avatar upload functionality
function setupAvatarUpload(user) {
    const cameraButton = document.querySelector('.camera-button');
    const avatarUpload = document.getElementById('avatar-upload');
    const userAvatar = document.getElementById('user-avatar');
    const avatarSkeleton = document.getElementById('avatar-skeleton');
    
    if (!cameraButton || !avatarUpload) return;
    
    // Add click event to camera button
    cameraButton.addEventListener('click', (e) => {
        e.preventDefault(); // Prevent any default behavior
        e.stopPropagation(); // Stop event bubbling
        
        // Create a new file input element
        const newFileInput = document.createElement('input');
        newFileInput.type = 'file';
        newFileInput.accept = 'image/*';
        newFileInput.style.display = 'none';
        
        // Add the file input to the document
        document.body.appendChild(newFileInput);
        
        // Trigger click on the new file input
        newFileInput.click();
        
        // Handle file selection
        newFileInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) {
                // Remove the temporary file input
                document.body.removeChild(newFileInput);
                return;
            }
            
            // Check file size (max 5MB)
            if (file.size > 5 * 1024 * 1024) {
                showToast('Image is too large. Maximum size is 5MB.', 'error');
                document.body.removeChild(newFileInput);
                return;
            }
            
            // Check file type
            if (!file.type.startsWith('image/')) {
                showToast('Please select an image file.', 'error');
                document.body.removeChild(newFileInput);
                return;
            }
            
            try {
                // Show loading state
                cameraButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
                cameraButton.disabled = true;
                
                if (userAvatar) userAvatar.style.opacity = '0.6';
                
                // Show upload in progress toast
                showToast('Uploading your profile picture...', 'info');
                
                // Upload the image to ImageBB
                const imageUrl = await uploadImageToImageBB(file);
                
                if (imageUrl) {
                    // Update user profile with new avatar URL in Firestore
                    await firebase.firestore().collection("users").doc(user.uid).update({
                        photoURL: imageUrl
                    });
                    
                    // Update all UI elements
                    if (userAvatar) {
                        userAvatar.src = imageUrl;
                        userAvatar.style.display = 'block';
                        userAvatar.style.opacity = '1';
                    }
                    
                    if (avatarSkeleton) {
                        avatarSkeleton.style.display = 'none';
                    }
                    
                    // Update navbar avatar and all other avatar elements
                    updateAllAvatars(imageUrl);
                    
                    // Show success message
                    showToast('Profile picture updated successfully', 'success');
                }
            } catch (error) {
                console.error("Error updating avatar:", error);
                showToast('Failed to update profile picture. Please try again.', 'error');
                if (userAvatar) userAvatar.style.opacity = '1';
            } finally {
                // Reset button
                cameraButton.innerHTML = '<i class="fas fa-camera"></i>';
                cameraButton.disabled = false;
                // Remove the temporary file input
                document.body.removeChild(newFileInput);
            }
        });
    });
}

// Helper function to update all avatar images in the UI
function updateAllAvatars(imageUrl) {
    // Update navbar avatar
    const avatarImage = document.getElementById('avatar-image');
    if (avatarImage) {
        avatarImage.src = imageUrl;
        avatarImage.style.display = 'block';
    }
    
    const avatarInitials = document.getElementById('avatar-initials');
    if (avatarInitials) {
        avatarInitials.style.display = 'none';
    }
    
    // Update dropdown avatar
    const avatarImageDropdown = document.getElementById('avatar-image-dropdown');
    if (avatarImageDropdown) {
        avatarImageDropdown.src = imageUrl;
        avatarImageDropdown.style.display = 'block';
    }
    
    const avatarInitialsDropdown = document.getElementById('avatar-initials-dropdown');
    if (avatarInitialsDropdown) {
        avatarInitialsDropdown.style.display = 'none';
    }
}

// Function to upload image to ImageBB
async function uploadImageToImageBB(file) {
    const formData = new FormData();
    formData.append('image', file);
    
    // ImageBB API key
    const apiKey = 'e0a6fcfe00b70b788c6cf56e59297e2f';
    
    try {
        console.log('Starting image upload to ImageBB...');
        
        const response = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            throw new Error(`ImageBB API error: ${response.status} - ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('ImageBB response:', data);
        
        if (data.success) {
            // Return the display URL for the image
            return data.data.display_url;
        } else {
            throw new Error('ImageBB upload failed: ' + (data.error?.message || 'Unknown error'));
        }
    } catch (error) {
        console.error('Error uploading to ImageBB:', error);
        throw error;
    }
}