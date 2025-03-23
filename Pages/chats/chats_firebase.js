// Firebase Chat Functionality
document.addEventListener('DOMContentLoaded', async () => {
    // Current user reference
    let currentUser = null;
    let currentUserID = null;
    let currentChatId = null;
    let currentContact = null;
    let isEditingMessage = false;
    let editingMessageId = null;
    let editingOriginalText = null;
    let currentImageFile = null;
    
    // Message tracking
    window.renderedMessageIds = new Set();
    window.loadedMessageIds = new Set();
    window.tempToRealIdMap = new Map();
    
    // Get DOM elements
    const messagesSection = document.getElementById('messages-section');
    const friendsList = document.getElementById('friends-list');
    const contactsList = document.querySelector('.contacts-list');
    const navbar = document.querySelector('nav');
    const backBtn = document.getElementById('back-btn');
    
    // Default avatar images for users who don't have profile photos
    const defaultAvatars = [
        'https://ui-avatars.com/api/?background=4e54c8&color=fff&bold=true&size=128',
        'https://ui-avatars.com/api/?background=ff4757&color=fff&bold=true&size=128',
        'https://ui-avatars.com/api/?background=2ed573&color=fff&bold=true&size=128',
        'https://ui-avatars.com/api/?background=1e90ff&color=fff&bold=true&size=128',
        'https://ui-avatars.com/api/?background=ff6b81&color=fff&bold=true&size=128',
        'https://ui-avatars.com/api/?background=ffa502&color=fff&bold=true&size=128',
        'https://ui-avatars.com/api/?background=7bed9f&color=fff&bold=true&size=128',
        'https://ui-avatars.com/api/?background=70a1ff&color=fff&bold=true&size=128'
    ];
    
    // Function to get a consistent avatar for a user based on their ID or name
    function getDefaultAvatar(userId, userName) {
        // Use the userId or userName to consistently select the same avatar
        const seed = userId || userName || '';
        // Sum the character codes to create a number
        let sum = 0;
        for (let i = 0; i < seed.length; i++) {
            sum += seed.charCodeAt(i);
        }
        // Use modulo to get an index within the avatar array
        const index = sum % defaultAvatars.length;
        
        // Get the base URL
        let avatarUrl = defaultAvatars[index];
        
        // Add user's initials to the URL
        const name = userName || 'User';
        const initials = name
            .split(' ')
            .map(part => part.charAt(0))
            .join('')
            .toUpperCase();
            
        // Add initials to the URL
        avatarUrl += `&name=${encodeURIComponent(initials)}`;
        
        return avatarUrl;
    }
    
    // Function to update user avatar display
    function updateUserAvatar(element, user, userData) {
        const avatarImg = element.querySelector('img');
        const avatarInitials = element.querySelector('.avatar-initials');
        
        // Get the display name from available fields
        const displayName = userData?.name || userData?.fullName || user?.displayName || 'User';
        
        // Get user id from either id or uid
        const userId = userData?.id || userData?.uid || user?.uid || '';
        
        // Get user initials
        const initials = displayName
            .split(' ')
            .map(name => name.charAt(0))
            .join('')
            .toUpperCase();
            
        if (user?.photoURL || userData?.photoURL) {
            // Use actual profile photo if available
            const photoURL = userData?.photoURL || user?.photoURL;
            if (avatarImg) {
                avatarImg.src = photoURL;
                avatarImg.style.display = 'block';
            }
            if (avatarInitials) {
                avatarInitials.style.display = 'none';
            }
        } else {
            // Use default avatar instead of initials
            const defaultAvatar = getDefaultAvatar(userId, displayName);
            if (avatarImg) {
                avatarImg.src = defaultAvatar;
                avatarImg.style.display = 'block';
            }
            if (avatarInitials) {
                avatarInitials.style.display = 'none';
            }
        }
    }
    
    // Initialize messages section with empty state
    showEmptyMessagesState();
    
    // Firebase Authentication Listener
    firebase.auth().onAuthStateChanged(async (user) => {
        if (!user) {
            // User is signed out, redirect to login
            window.location.href = '../login/login.html';
            return;
        }
        
        try {
            currentUser = user;
            currentUserID = user.uid;
            
            // Get user data from Firestore
            const userDoc = await firebase.firestore().collection('users').doc(user.uid).get();
            let userData = userDoc.exists ? userDoc.data() : null;
            
            if (userData) {
                // Update dropdown user info
                document.getElementById('user-name').textContent = userData.name || user.displayName || 'User';
                document.getElementById('user-email').textContent = userData.email || user.email || '';
                
                // Update avatar display with our function
                const userAvatarContainer = document.querySelector('.user-avatar');
                updateUserAvatar(userAvatarContainer, user, userData);
                
                // Also update dropdown avatar
                const dropdownAvatarContainer = document.querySelector('.dropdown-header .user-avatar');
                updateUserAvatar(dropdownAvatarContainer, user, userData);
            }
            
            // Set status to offline when user leaves
            window.addEventListener('beforeunload', async () => {
                if (currentUserID) {
                    try {
                        await firebase.firestore().collection('users').doc(currentUserID).update({
                            status: 'offline',
                            lastActive: new Date()
                        });
                    } catch (error) {
                        console.error("Error updating status on page unload:", error);
                    }
                }
            });
            
            // Initialize the chat UI
            initializeChatsUI();
        } catch (error) {
            console.error("Error in auth state change:", error);
        }
    });

    // Set up new chat button
    function setupNewChatButton() {
        const newChatBtn = document.querySelector('.new-chat-btn');
        const modal = document.getElementById('usersListModal');
        const closeBtn = modal.querySelector('.modal-close');
        const searchInput = document.getElementById('user-search-input');
        
        // Open modal when clicking new chat button
        newChatBtn.addEventListener('click', () => {
            openModal();
            // Only fetch users when button is clicked
            fetchAndDisplayUsers();
        });
        
        // Close modal when clicking close button
        closeBtn.addEventListener('click', () => {
            closeModal();
        });
        
        // Close modal when clicking outside
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeModal();
            }
        });
        
        // Filter users when typing in search
        searchInput.addEventListener('input', (e) => {
            filterUsers(e.target.value);
        });
    }
    
    // Function to open the users list modal
    function openModal() {
        const modal = document.getElementById('usersListModal');
        modal.classList.add('active');
        document.body.classList.add('modal-open');
        
        // Clear any previous search input
        const searchInput = document.getElementById('user-search-input');
        if (searchInput) {
            searchInput.value = '';
            searchInput.focus();
        }
    }
    
    // Function to close the modal
    function closeModal() {
        const modal = document.getElementById('usersListModal');
        modal.classList.remove('active');
        document.body.classList.remove('modal-open');
        
        // Clear the users list to save memory and avoid stale data
        const usersList = document.getElementById('users-list');
        if (usersList) {
            usersList.innerHTML = '';
        }
    }
    
    // Fetch users from Firestore and display them
    async function fetchAndDisplayUsers() {
        if (!currentUser) return;
        
        const usersList = document.getElementById('users-list');
        usersList.innerHTML = `
            <div class="loading-spinner">
                <i class="fas fa-spinner fa-spin"></i>
                <p>Loading users...</p>
            </div>
        `;
        
        try {
            // Get the current user's document to access following and followers
            const currentUserDoc = await firebase.firestore().collection('users').doc(currentUser.uid).get();
            const currentUserData = currentUserDoc.exists ? currentUserDoc.data() : {};
            
            // Get users the current user is following
            const followingList = currentUserData.following || [];
            
            // Get users who are following the current user
            const followersList = currentUserData.followers || [];
            
            // First get all chats where the current user is a participant
            const chatsSnapshot = await firebase.firestore().collection('chats')
                .where('participants', 'array-contains', currentUser.uid)
                .get();
            
            // Extract the IDs of users the current user has chatted with
            const chatParticipantIds = new Set();
            
            chatsSnapshot.forEach(doc => {
                const chatData = doc.data();
                // Add all participants except the current user
                chatData.participants.forEach(participantId => {
                    if (participantId !== currentUser.uid) {
                        chatParticipantIds.add(participantId);
                    }
                });
            });

            // Combine users from all three sources
            const relevantUserIds = new Set([
                ...chatParticipantIds,
                ...followingList,
                ...followersList
            ]);
            
            // If we have no users to display, show empty state
            if (relevantUserIds.size === 0) {
                usersList.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-user-friends"></i>
                        <p>No connections found</p>
                        <p class="subtext">No active connections. Please visit the Users page to connect with colleagues or respond to pending connection requests.</p>
                    </div>
                `;
                return;
            }
            
            // Fetch details for these users
            const users = [];
            
            // Use Promise.all to fetch user details in parallel
            const userPromises = Array.from(relevantUserIds).map(async (userId) => {
                try {
                    const userDoc = await firebase.firestore().collection('users').doc(userId).get();
                    if (userDoc.exists) {
                        const userData = userDoc.data();
                        // Add relationship info to the user data
                        return {
                            ...userData,
                            id: userId,
                            isFollowing: followingList.includes(userId),
                            isFollower: followersList.includes(userId),
                            hasChat: chatParticipantIds.has(userId)
                        };
                    }
                    return null;
                } catch (error) {
                    console.error(`Error fetching user ${userId}:`, error);
                    return null;
                }
            });
            
            const userResults = await Promise.all(userPromises);
            userResults.forEach(userData => {
                if (userData) {
                    users.push(userData);
                }
            });
            
            // Clear the loading spinner
            usersList.innerHTML = '';
            
            if (users.length === 0) {
                usersList.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-user-friends"></i>
                        <p>No users found</p>
                    </div>
                `;
                return;
            }
            
            // Sort users: first show users with mutual connections, then following, then followers, then others
            users.sort((a, b) => {
                // First prioritize users with existing chats
                if (a.hasChat && !b.hasChat) return -1;
                if (!a.hasChat && b.hasChat) return 1;
                
                // Then prioritize mutual connections (both following and followers)
                const aMutual = a.isFollowing && a.isFollower;
                const bMutual = b.isFollowing && b.isFollower;
                if (aMutual && !bMutual) return -1;
                if (!aMutual && bMutual) return 1;
                
                // Then prioritize users the current user is following
                if (a.isFollowing && !b.isFollowing) return -1;
                if (!a.isFollowing && b.isFollowing) return 1;
                
                // Then prioritize users who are following the current user
                if (a.isFollower && !b.isFollower) return -1;
                if (!a.isFollower && b.isFollower) return 1;
                
                // Alphabetical by name as final sorting
                const aName = a.name || a.fullName || a.displayName || '';
                const bName = b.name || b.fullName || b.displayName || '';
                return aName.localeCompare(bName);
            });
            
            // Add section headers
            let currentSection = null;
            const sections = [];
            
            users.forEach(user => {
                let section;
                
                if (user.hasChat) {
                    section = "Recent Chats";
                } else if (user.isFollowing && user.isFollower) {
                    section = "Mutual Connections";
                } else if (user.isFollowing) {
                    section = "People You Follow";
                } else if (user.isFollower) {
                    section = "People Following You";
                } else {
                    section = "Other Users";
                }
                
                if (section !== currentSection) {
                    currentSection = section;
                    sections.push(section);
                    
                    const sectionHeader = document.createElement('div');
                    sectionHeader.className = 'user-section-header';
                    sectionHeader.textContent = section;
                    usersList.appendChild(sectionHeader);
                }
                
                const userElement = createUserElement(user);
                usersList.appendChild(userElement);
            });
        } catch (error) {
            console.error("Error fetching users:", error);
            usersList.innerHTML = `
                <div class="empty-state error">
                    <i class="fas fa-exclamation-circle"></i>
                    <p>Error loading users</p>
                    <p class="subtext">Please try again later</p>
                </div>
            `;
        }
    }
    
    // Create a user element for the list
    function createUserElement(user) {
        const userName = user.name || user.fullName || user.displayName || 'User';
        const userId = user.id || user.uid || ''; // Handle both id and uid
        
        const userElement = document.createElement('div');
        userElement.className = 'user-item';
        userElement.dataset.userId = userId;
        
        // Use getDefaultAvatar for a consistent avatar
        const avatarUrl = user.photoURL || getDefaultAvatar(userId, userName);
        
        // Create relationship indicators
        let relationshipLabel = '';
        
        if (user.hasChat) {
            relationshipLabel = `<span class="relationship-badge chat">Chat</span>`;
        } else if (user.isFollowing && user.isFollower) {
            relationshipLabel = `<span class="relationship-badge mutual">Mutual</span>`;
        } else if (user.isFollowing) {
            relationshipLabel = `<span class="relationship-badge following">Following</span>`;
        } else if (user.isFollower) {
            relationshipLabel = `<span class="relationship-badge follower">Follower</span>`;
        }
        
        userElement.innerHTML = `
            <div class="user-avatar">
                <img src="${avatarUrl}" alt="${userName}">
                <span class="status-indicator ${user.status || 'offline'}"></span>
            </div>
            <div class="user-details">
                <div class="user-name-row">
                    <h3>${userName}</h3>
                    ${relationshipLabel}
                </div>
                <p>${user.email || ''}</p>
            </div>
        `;
        
        // Add click handler to initiate chat
        userElement.addEventListener('click', () => {
            initiateChat(user);
        });
        
        return userElement;
    }
    
    // Filter users based on search query
    function filterUsers(query) {
        const userItems = document.querySelectorAll('.user-item');
        const usersList = document.getElementById('users-list');
        let hasVisibleUsers = false;
        
        userItems.forEach(item => {
            const name = item.querySelector('.user-details h3').textContent.toLowerCase();
            const email = item.querySelector('.user-details p').textContent.toLowerCase();
            
            if (name.includes(query) || email.includes(query)) {
                item.style.display = 'flex';
                hasVisibleUsers = true;
            } else {
                item.style.display = 'none';
            }
        });
        
        // Show no results message if no users match the query
        const noResultsElement = usersList.querySelector('.no-results');
        if (!hasVisibleUsers) {
            if (!noResultsElement) {
                const noResults = document.createElement('div');
                noResults.className = 'no-results';
                noResults.innerHTML = `
                    <i class="fas fa-search"></i>
                    <p>No users found for "${query}"</p>
                `;
                usersList.appendChild(noResults);
            }
        } else if (noResultsElement) {
            noResultsElement.remove();
        }
    }
    
    // Handle clicking on a user to start a chat
    async function initiateChat(otherUser) {
        if (!otherUser) {
            console.error("No user data provided to initiateChat");
            return;
        }
        
        const otherUserId = otherUser.id || otherUser.uid;
        if (!otherUserId) {
            console.error("User has no ID:", otherUser);
            return;
        }
        
        console.log(`Initiating chat with user: ${otherUserId}`, otherUser);
        
        try {
            // Close the modal first to improve perceived performance
            closeModal();
            
            // Check if there's an existing chat with this user
            const chatsRef = firebase.firestore().collection('chats');
            
            const q1 = await chatsRef
                .where('participants', 'array-contains', currentUserID)
                .get();
                
            let existingChatId = null;
            
            q1.forEach(doc => {
                const chatData = doc.data();
                if (chatData.participants.includes(otherUserId)) {
                    existingChatId = doc.id;
                }
            });
            
            if (existingChatId) {
                console.log("Chat already exists, loading existing chat");
                // Clean up any empty state UI first
                const contactsList = document.querySelector('.contacts-list');
                if (contactsList.querySelector('.empty-contacts-state')) {
                    contactsList.innerHTML = '';
                }
                
                // Get contact info to load the chat
                const contact = {
                    id: otherUserId,
                    name: otherUser.name || otherUser.fullName || otherUser.displayName || 'User',
                    photoURL: otherUser.photoURL || null,
                    status: otherUser.status || 'offline'
                };
                
                // Load the existing chat
                loadChat(existingChatId, contact);
                
                // Show messages section on mobile
                if (window.innerWidth <= 768) {
                    showMessages();
                }
            } else {
                // Create new chat
                await createNewChat(otherUser);
                
                // Refresh contacts list to show the new chat
                await loadUserChats(currentUserID);
            }
        } catch (error) {
            console.error("Error initiating chat:", error);
            showToast('Error starting chat. Please try again or update your profile in settings.', 'error');
        }
    }
    
    // Helper function to create a new chat with better error handling
    async function createNewChat(otherUser) {
        if (!otherUser) {
            console.error("Invalid user data provided to createNewChat", otherUser);
            showToast('Error: Invalid user data. Please try again.', 'error');
            return;
        }

        // Check for id or uid property
        const otherUserId = otherUser.id || otherUser.uid;
        
        if (!otherUserId) {
            console.error("User has no id or uid:", otherUser);
            showToast('Error: User has no ID. Please try again.', 'error');
            return;
        }

        // Before creating a new chat, check if chat already exists
        const existingChatQuery = await firebase.firestore().collection('chats')
            .where('participants', 'array-contains', currentUserID)
            .get();
            
        let existingChatId = null;
        
        existingChatQuery.forEach(doc => {
            const chatData = doc.data();
            if (chatData.participants.includes(otherUserId)) {
                existingChatId = doc.id;
            }
        });
        
        // If chat already exists, just load it instead of creating a duplicate
        if (existingChatId) {
            console.log("Chat already exists, loading existing chat:", existingChatId);
            
            // Get the contact info for the other user
            const otherUserDoc = await firebase.firestore().collection('users').doc(otherUserId).get();
            const otherUserData = otherUserDoc.exists ? otherUserDoc.data() : {};
            
            const contact = {
                id: otherUserId,
                name: otherUserData.name || otherUserData.fullName || otherUser.displayName || 'User',
                photoURL: otherUserData.photoURL || otherUser.photoURL || null,
                status: otherUserData.status || 'offline'
            };
            
            // Load the existing chat
            loadChat(existingChatId, contact);
            
            // Show messages section on mobile devices
            if (window.innerWidth <= 768) {
                showMessages();
            }
            
            return;
        }

        // Get current user info from Firestore for consistency
        const currentUserDoc = await firebase.firestore().collection('users').doc(currentUserID).get();
        const currentUserData = currentUserDoc.exists ? currentUserDoc.data() : {};
        
        const currentUserName = currentUserData.name || currentUserData.fullName || currentUser.displayName || 'User';
        const currentUserPhoto = currentUserData.photoURL || currentUser.photoURL || null;
        
        // Ensure otherUser has all required properties
        const otherUserName = otherUser.name || otherUser.fullName || otherUser.displayName || 'User';
        const otherUserPhoto = otherUser.photoURL || null;
        
        // Create a new chat document with validated data
        const newChat = {
            participants: [currentUserID, otherUserId],
            created: firebase.firestore.FieldValue.serverTimestamp(),
            lastUpdated: firebase.firestore.FieldValue.serverTimestamp(),
            lastMessage: {
                text: "",
                sender: "",
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            },
            lastMessageTime: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        console.log("Creating new chat with data:", newChat);
        
        try {
            // Try to create the chat document first
            const chatRef = await firebase.firestore().collection('chats').add(newChat);
            console.log("Created new chat with ID:", chatRef.id);
            
            // Add this chat to current user's chats collection
            await firebase.firestore().collection('users').doc(currentUserID)
                .collection('chats').doc(chatRef.id).set({
                    chatId: chatRef.id,
                    with: otherUserId,
                    withName: otherUserName,
                    withPhoto: otherUserPhoto,
                    lastRead: firebase.firestore.FieldValue.serverTimestamp()
                });
        
            console.log("Added chat reference to current user's chats collection");
                
            // Also add to the other user's chats collection for consistency
            await firebase.firestore().collection('users').doc(otherUserId)
                .collection('chats').doc(chatRef.id).set({
                    chatId: chatRef.id,
                    with: currentUserID,
                    withName: currentUserName,
                    withPhoto: currentUserPhoto,
                    lastRead: firebase.firestore.FieldValue.serverTimestamp()
                });
                
            // Get the other user's name for the chat header
            const contact = {
                id: otherUserId,
                name: otherUserName,
                photoURL: otherUserPhoto,
                status: 'online' // Assume online for simplicity
            };
            
            // Load the chat regardless of potential errors above
            loadChat(chatRef.id, contact);
            
            // Show messages section on mobile devices
            if (window.innerWidth <= 768) {
                showMessages();
            }
        } catch (error) {
            console.error("Error creating new chat:", error);
            showToast('Error creating chat. Please try again.', 'error');
        }
    }
    
    // Update user info in the navbar
    async function updateUserInfo(user) {
        try {
            const userDoc = await firebase.firestore().collection('users').doc(user.uid).get();
            const userData = userDoc.data();
            
            if (userData) {
                // Update dropdown user info
                document.getElementById('user-name').textContent = userData.fullName || user.displayName || 'User';
                document.getElementById('user-email').textContent = userData.email || user.email || '';
                
                // Update avatar display
                updateUserAvatar(document.getElementById('avatar-container'), user, userData);
            }
        } catch (error) {
            console.error('Error loading user data:', error);
        }
    }

    // Chat variables
    const messagesContainer = document.querySelector('.messages-container');
    const messageInput = document.querySelector('.message-input input');
    const sendBtn = document.querySelector('.send-btn');
    
    // Load user's chats from Firebase
    async function loadUserChats(userId) {
        if (!userId) {
            console.error("No user ID provided to loadUserChats");
            return Promise.resolve();
        }
        
        console.log(`Loading chats for user: ${userId}`);
        
        const contactsList = document.querySelector('.contacts-list');
        if (!contactsList) {
            console.error("Could not find contacts list element");
            return Promise.resolve();
        }
        
        // Show loading state
        contactsList.innerHTML = `
            <div class="loading-chats">
                <div class="skeleton-contact"></div>
                <div class="skeleton-contact"></div>
                <div class="skeleton-contact"></div>
            </div>
        `;
        
        return new Promise((resolve, reject) => {
            try {
                // Clean up previous listener if it exists
                if (window.chatsListener) {
                    window.chatsListener();
                    window.chatsListener = null;
                }
                
                // Set up real-time listener for chat updates
                window.chatsListener = firebase.firestore().collection('chats')
                    .where('participants', 'array-contains', userId)
                    .orderBy('lastUpdated', 'desc')
                    .limit(10) // Limit to recent 10 chats for faster loading
                    .onSnapshot(async (snapshot) => {
                        // Clear loading skeleton on first load
                        if (contactsList.querySelector('.loading-chats')) {
                            contactsList.innerHTML = '';
                        }
                        
                        console.log(`Real-time update: ${snapshot.docs.length} chats`);
                        
                        if (snapshot.empty) {
                            showEmptyChatsState(contactsList);
                            resolve(); // Resolve the promise here for empty chats
                            return;
                        }
                        
                        // Create a map of current chat elements
                        const currentChatElements = {};
                        document.querySelectorAll('.contact-item').forEach(el => {
                            const chatId = el.getAttribute('data-chat-id');
                            if (chatId) {
                                currentChatElements[chatId] = el;
                            }
                        });
                        
                        try {
                            // Process each chat
                            for (const doc of snapshot.docs) {
                                try {
                                    const chatData = doc.data();
                                    const chatId = doc.id;
                                    
                                    // Get the other participant (not current user)
                                    const otherUserId = chatData.participants.find(id => id !== userId);
                                    if (!otherUserId) {
                                        console.error("Could not find other user ID in participants", chatData.participants);
                                        continue;
                                    }
                                    
                                    // Get basic user data
                                    const otherUserDoc = await firebase.firestore().collection('users').doc(otherUserId).get();
                                    const otherUser = otherUserDoc.exists ? otherUserDoc.data() : { id: otherUserId, name: 'User' };
                                    
                                    // Get last message for preview
                                    const lastMessageQuery = await firebase.firestore()
                                        .collection('chats')
                                        .doc(chatId)
                                        .collection('messages')
                                        .orderBy('timestamp', 'desc')
                                        .limit(1)
                                        .get();
                                    
                                    let lastMessage = null;
                                    if (!lastMessageQuery.empty) {
                                        const messageData = lastMessageQuery.docs[0].data();
                                        lastMessage = {
                                            text: messageData.text || 'No message content',
                                            timestamp: messageData.timestamp?.toDate() || new Date(),
                                            senderId: messageData.senderId || '',
                                            read: messageData.read || false
                                        };
                                    }
                                    
                                    // Get unread count
                                    const unreadQuery = await firebase.firestore()
                                        .collection('chats')
                                        .doc(chatId)
                                        .collection('messages')
                                        .where('senderId', '==', otherUserId)
                                        .where('read', '==', false)
                                        .get();
                                        
                                    const unreadCount = unreadQuery.size || 0;
                                    
                                    // Create the chat preview object
                                    const chatPreview = {
                                        id: chatId,
                                        otherUser: {
                                            id: otherUserId,
                                            name: otherUser.fullName || otherUser.name || otherUser.displayName || 'User',
                                            photoURL: otherUser.photoURL || null,
                                            status: otherUser.status || 'offline'
                                        },
                                        lastMessage: lastMessage,
                                        unreadCount: unreadCount
                                    };
                                    
                                    // Check if we already have an element for this chat
                                    if (currentChatElements[chatId]) {
                                        // Update existing element
                                        updateChatPreview(currentChatElements[chatId], chatPreview, userId);
                                        delete currentChatElements[chatId]; // Remove from map so we don't delete it later
                                    } else {
                                        // Create new element
                                        const contactElement = createContactElement(chatPreview, userId);
                                        if (contactElement) {
                                            contactsList.appendChild(contactElement);
                                        }
                                    }
                                } catch (error) {
                                    console.error("Error processing individual chat:", error);
                                }
                            }
                            
                            // Remove any elements that weren't updated (they're not in the new data)
                            Object.values(currentChatElements).forEach(element => {
                                element.remove();
                            });
                            
                            // Sort the chat elements by timestamp (newest first)
                            sortChatElements(contactsList);
                            
                            // Make sure all contacts have click handlers
                            addContactClickHandlers();
                            
                            // If no chats were displayed, show empty state
                            if (contactsList.children.length === 0) {
                                showEmptyChatsState(contactsList);
                            }
                            
                            // Resolve the promise after first load
                            resolve();
                        } catch (error) {
                            console.error("Error processing chats:", error);
                            reject(error);
                        }
                    }, error => {
                        console.error("Error loading chats:", error);
                        contactsList.innerHTML = `<p class="error">Error loading chats: ${error.message}</p>`;
                        reject(error);
                    });
            } catch (error) {
                console.error("Error in loadUserChats:", error);
                contactsList.innerHTML = `<p class="error">Error loading chats: ${error.message}</p>`;
                reject(error);
            }
        });
    }
    
    // New function to update existing chat preview
    function updateChatPreview(element, chatPreview, currentUserId) {
        // Update timestamp for sorting
        if (chatPreview.lastMessage?.timestamp) {
            element.setAttribute('data-timestamp', chatPreview.lastMessage.timestamp.getTime());
        }
        
        // Update name
        const nameEl = element.querySelector('.contact-name');
        if (nameEl) nameEl.textContent = chatPreview.otherUser.name;
        
        // Update status indicator
        const statusEl = element.querySelector('.status-indicator');
        if (statusEl) {
            statusEl.className = 'status-indicator';
            statusEl.classList.add(chatPreview.otherUser.status || 'offline');
        }
        
        // Update avatar
        const avatarEl = element.querySelector('.contact-avatar img');
        if (avatarEl) {
            avatarEl.src = chatPreview.otherUser.photoURL || 
                           getDefaultAvatar(chatPreview.otherUser.id, chatPreview.otherUser.name);
        }
        
        // Update message preview text
        const previewEl = element.querySelector('.contact-preview-text');
        if (previewEl && chatPreview.lastMessage) {
            let messageText = chatPreview.lastMessage.text || '';
            
            // Format message preview
            if (chatPreview.lastMessage.senderId === currentUserId) {
                messageText = `You: ${messageText}`;
            }
            
            if (messageText.startsWith('IMG:')) {
                previewEl.innerHTML = '<i class="fas fa-image"></i> Photo';
            } else {
                previewEl.textContent = messageText.length > 40 
                    ? messageText.substring(0, 40) + '...' 
                    : messageText;
            }
        }
        
        // Update time
        const timeEl = element.querySelector('.contact-time');
        if (timeEl && chatPreview.lastMessage?.timestamp) {
            timeEl.textContent = formatMessageTime(chatPreview.lastMessage.timestamp);
        }
        
        // Update unread badge
        const badgeEl = element.querySelector('.unread-badge');
        if (badgeEl) {
            if (chatPreview.unreadCount > 0) {
                badgeEl.textContent = chatPreview.unreadCount > 99 ? '99+' : chatPreview.unreadCount;
                badgeEl.style.display = 'flex';
            } else {
                badgeEl.style.display = 'none';
            }
        }
    }
    
    // New function to sort chat elements by timestamp
    function sortChatElements(container) {
        const elements = Array.from(container.querySelectorAll('.contact-item'));
        
        // Sort by timestamp (newest first)
        elements.sort((a, b) => {
            const timeA = parseInt(a.getAttribute('data-timestamp') || '0');
            const timeB = parseInt(b.getAttribute('data-timestamp') || '0');
            return timeB - timeA;
        });
        
        // Reorder elements in the DOM
        elements.forEach(element => {
            container.appendChild(element);
        });
    }
    
    // Function to show empty chats state
    function showEmptyChatsState(contactsList) {
        // Clear the messages section
        messagesContainer.innerHTML = `
            <div class="empty-chat-state">
                <i class="fas fa-comments"></i>
                <h3>No Conversations Yet</h3>
                <p>Click the + button to start a new conversation</p>
            </div>
        `;
        
        // Add empty state to contacts list
        contactsList.innerHTML = `
            <div class="empty-contacts-state">
                <i class="fas fa-user-friends"></i>
                <p>No conversations yet</p>
                <p>Click the + button to start chatting</p>
            </div>
        `;
    }
    
    // Function to create a contact element
    function createContactElement(chat, currentUserId) {
        try {
        // Check if chat object is valid
            if (!chat) {
                console.error("No chat object provided to createContactElement");
                return null;
            }
            
            if (!chat.id) {
                console.error("Chat object missing ID", chat);
                return null;
            }
            
            if (!chat.otherUser) {
                console.error("Chat object missing otherUser", chat);
                return null;
            }
            
            // Check if this chat element already exists to prevent duplicates
            const existingElement = document.querySelector(`.contact-item[data-chat-id="${chat.id}"]`);
            if (existingElement) {
                return null; // Skip creation if already exists
            }
            
            // Create contact element
            const contactItem = document.createElement('div');
            contactItem.className = 'contact-item';
            contactItem.dataset.chatId = chat.id;
            contactItem.dataset.userId = chat.otherUser.id;
            contactItem.dataset.status = chat.otherUser.status || 'offline';
            
            // Set timestamp for sorting (important for real-time updates)
            if (chat.lastMessage && chat.lastMessage.timestamp) {
                contactItem.dataset.timestamp = chat.lastMessage.timestamp.getTime();
            } else {
                // Default to current time if no message timestamp
                contactItem.dataset.timestamp = Date.now();
            }
            
            // Get avatar source
            const userName = chat.otherUser.name || 'User';
            const avatarSrc = chat.otherUser.photoURL || getDefaultAvatar(chat.otherUser.id, userName);
            
            // Format timestamp if available
            let timestamp = '';
            if (chat.lastMessage && chat.lastMessage.timestamp) {
                try {
                    timestamp = formatTimestamp(chat.lastMessage.timestamp);
                } catch (e) {
                    console.warn("Error formatting timestamp", e);
                    timestamp = '';
                }
            }
        
        // For message preview text
            let previewText = 'No messages yet';
            if (chat.lastMessage && chat.lastMessage.text) {
                previewText = chat.lastMessage.text;
        
                // Handle image messages
        if (previewText.includes('<img')) {
            previewText = '📷 Image';
        } else if (previewText.length > 30) {
            // Truncate long messages
            previewText = previewText.substring(0, 30) + '...';
        }
        
        // Add "You: " prefix for messages sent by current user
                if (chat.lastMessage.senderId === currentUserId) {
            previewText = 'You: ' + previewText;
                }
            }
        
        // Determine if we should show the unread count
            const shouldShowUnread = chat.unreadCount && chat.unreadCount > 0;
            const unreadBadge = shouldShowUnread ? 
                `<span class="unread-count">${chat.unreadCount}</span>` : '';
        
            // Set HTML content
        contactItem.innerHTML = `
            <div class="contact-avatar">
                    <img src="${avatarSrc}" alt="${userName}">
                    <span class="status-indicator ${chat.otherUser.status || 'offline'}"></span>
            </div>
            <div class="contact-info">
                <div class="contact-name-time">
                        <h3 class="contact-name">${userName}</h3>
                    <span class="contact-time">${timestamp}</span>
                </div>
                <div class="contact-preview">
                    <p>${previewText}</p>
                        ${unreadBadge}
                </div>
            </div>
        `;
        
            console.log("Contact element created for chat:", chat.id);
        return contactItem;
        } catch (error) {
            console.error("Error creating contact element:", error);
            return null;
        }
    }
    
    // Load a chat from Firebase
    function loadChat(chatId, contact) {
        if (!chatId || !currentUserID) return;
        
        // Store the current chat ID for validation later
        const requestedChatId = chatId;
        
        // Update current chat ID and contact
        currentChatId = chatId;
        currentContact = contact;
        
        // Remove any existing event listeners to prevent memory leaks
        cleanupChatListeners();
        
        // Show loading state
        const messagesContainer = document.querySelector('.messages-container');
        messagesContainer.innerHTML = `
            <div class="messages-loading">
                <div class="loading-spinner">
                    <i class="fas fa-spinner fa-spin"></i>
                </div>
                <p>Loading messages...</p>
            </div>
        `;
        
        // Update chat header with contact info
        updateChatHeader(contact);
        
        // Show the messages section (especially important on mobile)
        showMessages();
        
        // Mark messages as read
        markMessagesAsRead(chatId, currentUserID);
        
        // Get the message input
        const messageInput = document.querySelector('.message-input input');
        if (messageInput) {
            messageInput.value = ''; // Clear input when switching chats
            messageInput.focus();
        }
        
        // Now lazily load the messages
        loadChatMessages(chatId, requestedChatId);
    }
    
    // Clean up any existing listeners before loading a new chat
    function cleanupChatListeners() {
        // Clean up scroll listeners
        const messagesContainer = document.querySelector('.messages-container');
        if (messagesContainer) {
            // Create a new clone to remove all event listeners
            const newContainer = messagesContainer.cloneNode(true);
            messagesContainer.parentNode.replaceChild(newContainer, messagesContainer);
        }
        
        // Clear any other real-time listeners that might be active
        if (window.currentMessageListener) {
            window.currentMessageListener();
            window.currentMessageListener = null;
        }
        
        if (window.currentTypingListener) {
            window.currentTypingListener();
            window.currentTypingListener = null;
        }
    }
    
    // Add a global set to track message IDs that have been rendered
    window.renderedMessageIds = new Set();

    // New function to check if a message is already rendered
    function isMessageRendered(messageId) {
        return window.renderedMessageIds.has(messageId);
    }

    // Modified loadChatMessages function to reset tracking when loading a new chat
    async function loadChatMessages(chatId, requestedChatId) {
        if (!chatId) return;
        
        // Clear the message tracking set when loading a new chat
        window.renderedMessageIds.clear();
        
        const messagesContainer = document.querySelector('.messages-container');
        
        try {
            // Load limited number of most recent messages first
            const messagesSnapshot = await firebase.firestore()
            .collection('chats')
            .doc(chatId)
            .collection('messages')
                .orderBy('timestamp', 'desc') // Descending to get most recent
                .limit(20) // Start with just 20 messages
                .get();
            
            // Validate that we're still on the same chat
            // This prevents race conditions when switching chats quickly
            if (currentChatId !== requestedChatId) {
                console.log("Chat changed while loading messages, aborting");
                return;
            }
            
            // Clear the container before adding new messages
            messagesContainer.innerHTML = '';
            
            // If no messages, show empty state
            if (messagesSnapshot.empty) {
                messagesContainer.innerHTML = `
                    <div class="empty-messages">
                        <div class="empty-icon">
                            <i class="fas fa-comments"></i>
                        </div>
                        <p>No messages yet</p>
                        <p class="empty-subtitle">Start the conversation!</p>
                    </div>
                `;
                
                // Set up real-time listener for the first message
                setupFirstMessageListener(chatId, requestedChatId);
                return;
            }
            
            const messages = [];
            messagesSnapshot.forEach(doc => {
                messages.push({
                    id: doc.id,
                    ...doc.data()
                });
                // Track this message as rendered
                window.renderedMessageIds.add(doc.id);
            });
            
            // Display messages in correct order (oldest first)
            messages.reverse().forEach(message => {
                const messageElement = addMessageToUI(message.id, message, currentUserID, true);
                if (messageElement) {
                    messagesContainer.appendChild(messageElement);
                }
            });
            
            // Ensure scroll to bottom happens after messages are rendered
            setTimeout(scrollToBottom, 0);
            
            // Set up scroll listener for loading more messages when needed
            setupScrollListener(chatId, messagesSnapshot.docs[0], requestedChatId);
            
            // Set up real-time listener for new messages
            setupNewMessageListener(chatId, requestedChatId);
            
        } catch (error) {
            console.error("Error loading messages:", error);
            
            // Only update the UI if we're still on the same chat
            if (currentChatId === requestedChatId) {
                messagesContainer.innerHTML = `<p class="error">Error loading messages. Please try again.</p>`;
            }
        }
    }
    
    // Modified setupFirstMessageListener to check for duplicates
    function setupFirstMessageListener(chatId, requestedChatId) {
        // Clean up any existing listener
        if (window.currentMessageListener) {
            window.currentMessageListener();
        }
        
        // Set up a real-time listener for new messages
        window.currentMessageListener = firebase.firestore()
            .collection('chats')
            .doc(chatId)
            .collection('messages')
            .orderBy('timestamp', 'desc')
            .limit(1)
            .onSnapshot(snapshot => {
                // Check if we're still on the same chat
                if (currentChatId !== requestedChatId) {
                    // If not, clean up and return
                    if (window.currentMessageListener) {
                        window.currentMessageListener();
                        window.currentMessageListener = null;
                    }
                    return;
                }
                
                // If there's a new message, reload the entire chat
                if (!snapshot.empty) {
                    // Get the message document
                    const doc = snapshot.docs[0];
                    const messageId = doc.id;
                    
                    // Skip if already rendered
                    if (isMessageRendered(messageId)) {
                        return;
                    }
                    
                    // Clear the empty state and load the message
                    const messagesContainer = document.querySelector('.messages-container');
                    messagesContainer.innerHTML = '';
                    
                    const message = {
                        id: messageId,
                        ...doc.data()
                    };
                    
                    // Track this message as rendered
                    window.renderedMessageIds.add(messageId);
                    
                    const messageElement = addMessageToUI(message.id, message, currentUserID, true);
                    if (messageElement) {
                        messagesContainer.appendChild(messageElement);
                    }
                    
                    // Ensure scroll to bottom with a slight delay to allow rendering
                    setTimeout(scrollToBottom, 0);
                    
                    // Switch to regular message listener since we now have messages
                    setupNewMessageListener(chatId, requestedChatId);
                }
            }, error => {
                console.error("Error listening for first message:", error);
            });
    }
    
    // Modified setupNewMessageListener to check for duplicates
    function setupNewMessageListener(chatId, requestedChatId) {
        // Clean up any existing listener
        if (window.currentMessageListener) {
            window.currentMessageListener();
        }
        
        // Get the timestamp of the most recent message to use as a starting point
        const mostRecentElement = document.querySelector('.message:last-child');
        let startAfterTimestamp = new Date(0); // Default to epoch start
        
        if (mostRecentElement) {
            const timeElement = mostRecentElement.querySelector('.message-time');
            if (timeElement) {
                try {
                    // Try to parse the displayed time, fallback to now if it fails
                    startAfterTimestamp = new Date();
                } catch (e) {
                    console.warn("Could not parse time from UI, using current time");
                }
            }
        }
        
        // Set up a real-time listener for new messages
        window.currentMessageListener = firebase.firestore()
            .collection('chats')
            .doc(chatId)
            .collection('messages')
            .where('timestamp', '>', startAfterTimestamp)
            .orderBy('timestamp')
            .onSnapshot(snapshot => {
                // Check if we're still on the same chat
                if (currentChatId !== requestedChatId) {
                    // If not, clean up and return
                    if (window.currentMessageListener) {
                        window.currentMessageListener();
                        window.currentMessageListener = null;
                    }
                    return;
                }
                
                // Process new messages
                snapshot.docChanges().forEach(change => {
                    if (change.type === 'added') {
                        const messageId = change.doc.id;
                        
                        // Skip if already rendered
                        if (isMessageRendered(messageId)) return;
                        
                        // Add to our tracking set
                        window.renderedMessageIds.add(messageId);
                        
                        const message = {
                            id: messageId,
                            ...change.doc.data()
                        };
                        
                        // Add the message to UI
                        addMessageToUI(message.id, message, currentUserID);
                        
                        // Ensure scroll to bottom happens consistently
                        setTimeout(scrollToBottom, 0);
                    }
                });
            }, error => {
                console.error("Error listening for new messages:", error);
            });
    }
    
    // Setup infinite scroll for messages (modified to include requestedChatId validation)
    function setupScrollListener(chatId, firstVisibleDoc, requestedChatId) {
        const messagesContainer = document.querySelector('.messages-container');
        let loadingMore = false;
        let noMoreMessages = false;
        
        messagesContainer.addEventListener('scroll', async () => {
            // Validate that we're still on the same chat
            if (currentChatId !== requestedChatId) {
                return;
            }
            
            // If we're near the top and not already loading and have more to load
            if (messagesContainer.scrollTop < 100 && !loadingMore && !noMoreMessages) {
                loadingMore = true;
                
                try {
                    // Add loading indicator at the top
                    const loadingIndicator = document.createElement('div');
                    loadingIndicator.className = 'loading-more-messages';
                    loadingIndicator.innerHTML = `<i class="fas fa-spinner fa-spin"></i>`;
                    messagesContainer.prepend(loadingIndicator);
                    
                    // Get the current scroll height to maintain position later
                    const scrollHeight = messagesContainer.scrollHeight;
                    
                    // Load more messages
                    const moreMessagesSnapshot = await firebase.firestore()
                        .collection('chats')
                        .doc(chatId)
                        .collection('messages')
                        .orderBy('timestamp', 'desc')
                        .startAfter(firstVisibleDoc)
                        .limit(10)
                        .get();
                    
                    // Remove loading indicator
                    loadingIndicator.remove();
                    
                    // Validate again that we're still on the same chat
                    if (currentChatId !== requestedChatId) {
                        loadingMore = false;
                        return;
                    }
                    
                    if (moreMessagesSnapshot.empty) {
                        noMoreMessages = true;
                        return;
                    }
                    
                    const moreMessages = [];
                    moreMessagesSnapshot.forEach(doc => {
                        const messageId = doc.id;
                        // Only add messages that haven't been rendered yet
                        if (!isMessageRendered(messageId)) {
                            moreMessages.push({
                                id: messageId,
                                ...doc.data()
                            });
                            // Add to tracking set
                            window.renderedMessageIds.add(messageId);
                        }
                    });
                    
                    // Update the first visible doc reference for next pagination
                    firstVisibleDoc = moreMessagesSnapshot.docs[moreMessagesSnapshot.docs.length - 1];
                    
                    // Add messages to the top in reverse order (only if we have new messages)
                    if (moreMessages.length > 0) {
                        moreMessages.forEach(message => {
                            const messageElement = addMessageToUI(message.id, message, currentUserID, true);
                            if (messageElement) {
                                messagesContainer.prepend(messageElement);
                            }
                        });
                        
                        // Maintain scroll position
                        messagesContainer.scrollTop = messagesContainer.scrollHeight - scrollHeight;
                    }
                    
                } catch (error) {
                    console.error("Error loading more messages:", error);
                } finally {
                    loadingMore = false;
                }
            }
        });
    }
    
    
    // Modified addMessageToUI to support prepending for history loading
    function addMessageToUI(messageId, message, currentUserId, returnElementOnly = false) {
        const isSentByCurrentUser = message.senderId === currentUserId;
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${isSentByCurrentUser ? 'sent' : 'received'}`;
        messageDiv.id = `message-${messageId}`;
        
        const formattedTime = message.timestamp ? formatMessageTime(message.timestamp) : 'Now';
        
        // Check if message has been edited
        const editedInfo = message.edited ? `<span class="message-edited">Edited</span>` : '';
        
        // Check if this is a temporary message (still sending)
        const isTemp = messageId.toString().startsWith('temp-');
        const messageStatus = isTemp ? 
            `<span class="message-status" data-status="sending"><i class="fas fa-clock"></i></span>` : 
            message.read && isSentByCurrentUser ? 
                `<span class="message-status" data-status="read"><i class="fas fa-check-double"></i></span>` : 
                isSentByCurrentUser ? 
                    `<span class="message-status" data-status="sent"><i class="fas fa-check"></i></span>` : '';
        
        // Check if this is an image message
        const isImage = message.isImage || (message.text && message.text.includes('<img'));
        
        // For image messages, we add a special class
        if (isImage) {
            messageDiv.classList.add('image-message');
        }
        
        messageDiv.innerHTML = `
            <div class="message-content">
                <p>${message.text || ''}</p>
                <div class="message-info">
                    <span class="message-time">${formattedTime}</span>
                    ${messageStatus}
                </div>
                ${editedInfo}
                ${isSentByCurrentUser ? `
                    <div class="message-actions">
                        <button class="message-action-btn" aria-label="Message actions">
                            <i class="fas fa-ellipsis-v"></i>
                        </button>
                        <div class="message-action-menu">
                            ${!isImage ? `
                            <div class="message-action-item edit">
                                <i class="fas fa-edit"></i>
                                <span>Edit</span>
                            </div>
                            ` : ''}
                            <div class="message-action-item delete">
                                <i class="fas fa-trash"></i>
                                <span>Delete</span>
                            </div>
                        </div>
                    </div>
                ` : ''}
            </div>
        `;
        
        // Add event listeners for message actions - ALWAYS add these regardless of returnElementOnly
        if (isSentByCurrentUser) {
            const actionBtn = messageDiv.querySelector('.message-action-btn');
            const actionMenu = messageDiv.querySelector('.message-action-menu');
            const editBtn = messageDiv.querySelector('.message-action-item.edit');
            const deleteBtn = messageDiv.querySelector('.message-action-item.delete');
            
            // Toggle menu visibility when clicking the action button
            actionBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                
                // Toggle this menu
                const isCurrentlyShown = actionMenu.classList.contains('show');
                
                // First close all menus
                document.querySelectorAll('.message-action-menu.show').forEach(menu => {
                    menu.classList.remove('show');
                });
                
                // Then open this one if it wasn't already open
                if (!isCurrentlyShown) {
                    actionMenu.classList.add('show');
                }
            });
            
            // Prevent menu from closing when clicking inside it
            actionMenu.addEventListener('click', (e) => {
                e.stopPropagation();
            });
            
            // Edit action (only for text messages)
            if (editBtn) {
                editBtn.addEventListener('click', () => {
                    startEditingMessage(messageId, message);
                    actionMenu.classList.remove('show');
                });
            }
            
            // Delete action
            deleteBtn.addEventListener('click', () => {
                deleteMessage(messageId);
                actionMenu.classList.remove('show');
            });
        }
        
        // Add this message ID to our tracking set
        if (window.loadedMessageIds) {
            window.loadedMessageIds.add(messageId);
        }
        
        // For infinite scroll, if only returning the element, exit now that all listeners are added
        if (returnElementOnly) {
            return messageDiv;
        }
        
        // Check if messagesContainer exists before adding message
        const messagesContainer = document.querySelector('.messages-container');
        if (!messagesContainer) {
            console.warn('Messages container not found. Cannot add message to UI.');
            return messageDiv; // Still return the element in case it's needed
        }
        
        // Function to check if user is at bottom of messages container
        function isUserAtBottom() {
            if (!messagesContainer) return true;
            const tolerance = 100; // pixels from bottom to consider as "at bottom"
            return messagesContainer.scrollHeight - messagesContainer.scrollTop - messagesContainer.clientHeight < tolerance;
        }
        
        // Save current scroll position and check if user was at bottom
        const wasAtBottom = isUserAtBottom();
        
        
        messagesContainer.appendChild(messageDiv);
        
        // Add message appear animation
        messageDiv.classList.add('message-appear');
        setTimeout(() => messageDiv.classList.remove('message-appear'), 300);
        
        // Update the contact preview if this is a new received message
        if (!isSentByCurrentUser && !isTemp) {
            updateContactPreview(currentChatId, message.text);
        }
        
        // If user was at bottom before adding message, scroll to bottom
        if (wasAtBottom || isSentByCurrentUser) {
            scrollToBottom();
        }
        
        return messageDiv;
    }
    
    // Global document click handler for message menus (define this once in the outer scope)
    if (!window.messageMenuHandlerAdded) {
        document.addEventListener('click', (e) => {
            // If the click is outside any message with an open menu, close all menus
            const clickedInsideMenu = e.target.closest('.message-action-menu') || 
                                     e.target.closest('.message-action-btn');
            
            if (!clickedInsideMenu) {
                document.querySelectorAll('.message-action-menu.show').forEach(menu => {
                    menu.classList.remove('show');
                });
            }
        });
        
        window.messageMenuHandlerAdded = true;
    }
    
    // Variables for message editing
    // Note: editingOriginalText is already declared at the top of the file

    // Start editing a message
    function startEditingMessage(messageId, message) {
        // Get the main message input
        const messageInput = document.querySelector('.message-input input');
        const sendBtn = document.querySelector('.send-btn');
        
        // Check if we have a temporary ID that was replaced with a real ID
        let actualMessageId = messageId;
        
        // If this is a temporary ID and we have a map of temp to real IDs
        if (messageId.toString().startsWith('temp-') && window.tempToRealIdMap && window.tempToRealIdMap.has(messageId)) {
            actualMessageId = window.tempToRealIdMap.get(messageId);
            console.log(`Using real ID ${actualMessageId} instead of temp ID ${messageId}`);
        }
        
        // Get the message element first
        let messageElement = document.getElementById(`message-${actualMessageId}`);
        
        // If not found with the actual ID, try the original ID
        if (!messageElement && actualMessageId !== messageId) {
            messageElement = document.getElementById(`message-${messageId}`);
        }
        
        // If still not found, try finding by data-temp-id attribute
        if (!messageElement && messageId.toString().startsWith('temp-')) {
            messageElement = document.querySelector(`[data-temp-id="${messageId}"]`);
        }
        
        // Check if message element exists, if not, return early
        if (!messageElement) {
            console.warn(`Cannot edit message: Element with ID message-${messageId} not found`);
            return;
        }
        
        // Update the editing message ID to use the actual ID
        editingMessageId = actualMessageId;
        
        // Switch to edit mode
        isEditingMessage = true;
        editingOriginalText = message.text;
        
        // Set the message text in the input field
        messageInput.value = message.text;
        messageInput.focus();
        
        // Change the send button to an edit button
        sendBtn.innerHTML = `<i class="fas fa-check"></i>`;
        sendBtn.classList.add('edit-mode');
        
        // Add a cancel button next to the input
        let cancelBtn = document.querySelector('.cancel-edit-btn');
        if (!cancelBtn) {
            cancelBtn = document.createElement('button');
            cancelBtn.className = 'input-action-btn cancel-edit-btn';
            cancelBtn.innerHTML = `<i class="fas fa-times"></i>`;
            const inputContainer = document.querySelector('.message-input-container');
            inputContainer.insertBefore(cancelBtn, sendBtn);
        } else {
            cancelBtn.style.display = 'flex';
        }
        
        // Add event listener for cancel button
        cancelBtn.addEventListener('click', cancelEditingMessage);
        
        // Highlight the message being edited
        messageElement.classList.add('editing');
        
        // Show editing indicator
        const editingIndicator = document.createElement('div');
        editingIndicator.className = 'editing-indicator';
        editingIndicator.textContent = 'Editing...';
        messageElement.appendChild(editingIndicator);
    }

    // Cancel message editing
    function cancelEditingMessage() {
        // Get the main message input
        const messageInput = document.querySelector('.message-input input');
        const sendBtn = document.querySelector('.send-btn');
        
        // Reset the input field
        messageInput.value = '';
        
        // Change the edit button back to a send button
        sendBtn.innerHTML = `<i class="fas fa-paper-plane"></i>`;
        sendBtn.classList.remove('edit-mode');
        
        // Hide the cancel button
        const cancelBtn = document.querySelector('.cancel-edit-btn');
        if (cancelBtn) {
            cancelBtn.style.display = 'none';
        }
        
        // Remove highlighting from the message being edited
        const messageElement = document.getElementById(`message-${editingMessageId}`);
        if (messageElement) {
            messageElement.classList.remove('editing');
            const editingIndicator = messageElement.querySelector('.editing-indicator');
            if (editingIndicator) {
                editingIndicator.remove();
            }
        }
        
        // Reset editing variables
        isEditingMessage = false;
        editingMessageId = null;
        editingOriginalText = null;
    }

    // Save edited message to Firebase
    async function saveEditedMessage(messageId, newText) {
        if (!newText.trim()) return;
        
        try {
            await firebase.firestore()
                .collection('chats')
                .doc(currentChatId)
                .collection('messages')
                .doc(messageId)
                .update({
                    text: newText,
                    edited: true,
                    editedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            
            // Update the message element
            const messageElement = document.getElementById(`message-${messageId}`);
            if (messageElement) {
                const messageParagraph = messageElement.querySelector('p');
                messageParagraph.textContent = newText;
                
                // Add edited tag if not already present
                if (!messageElement.querySelector('.message-edited')) {
                    const messageContent = messageElement.querySelector('.message-content');
                    const editedSpan = document.createElement('span');
                    editedSpan.className = 'message-edited';
                    editedSpan.textContent = 'Edited';
                    
                    // Append after the message-info
                    messageContent.appendChild(editedSpan);
                }
            }
            
            // Check if this was the last message and update chat document if needed
            const lastMessageQuery = await firebase.firestore()
                .collection('chats')
                .doc(currentChatId)
                .get();
            
            const chatData = lastMessageQuery.data();
            
            if (chatData.lastMessageSender === currentUserID) {
                await firebase.firestore()
                    .collection('chats')
                    .doc(currentChatId)
                    .update({
                        lastMessage: newText
                    });
            }
            
        } catch (error) {
            console.error('Error editing message:', error);
            showToast('Failed to edit message. Please try again.', 'error');
        }
    }
    
    // Delete a message
    async function deleteMessage(messageId) {
        if (!currentChatId || !messageId) return;
        
        try {
            // Add loading state to the message
            const messageElement = document.getElementById(`message-${messageId}`);
            if (messageElement) {
                messageElement.classList.add('deleting');
                messageElement.querySelector('.message-content').style.opacity = '0.5';
            }
            
            // Delete the message from Firestore
            await firebase.firestore()
                .collection('chats')
                .doc(currentChatId)
                .collection('messages')
                .doc(messageId)
                .delete();
            
            console.log('Message deleted successfully');
            
            // Remove the message from the UI immediately
            if (messageElement) {
                messageElement.remove();
            }
            
            // Update last message in chat if needed
            const lastMessagesQuery = await firebase.firestore()
                .collection('chats')
                .doc(currentChatId)
                .collection('messages')
                .orderBy('timestamp', 'desc')
                .limit(1)
                .get();
            
            if (!lastMessagesQuery.empty) {
                const lastMessage = lastMessagesQuery.docs[0].data();
                
                await firebase.firestore()
                    .collection('chats')
                    .doc(currentChatId)
                    .update({
                        lastMessage: lastMessage.text,
                        lastMessageTime: lastMessage.timestamp,
                        lastMessageSender: lastMessage.senderId
                    });
            } else {
                // No messages left, clear last message
                await firebase.firestore()
                    .collection('chats')
                    .doc(currentChatId)
                    .update({
                        lastMessage: null,
                        lastMessageTime: null,
                        lastMessageSender: null
                    });
            }
            
            // Show success toast
            showToast('Message deleted successfully', 'success');
            
        } catch (error) {
            console.error('Error deleting message:', error);
            
            // Remove loading state if error occurs
            const messageElement = document.getElementById(`message-${messageId}`);
            if (messageElement) {
                messageElement.classList.remove('deleting');
                messageElement.querySelector('.message-content').style.opacity = '1';
                
                // Show error toast
                showToast('Failed to delete message. Check your permissions.', 'error');
            }
        }
    }
    
    // Show a toast message
    function showToast(message, type = 'error') {
        // Create toast element if it doesn't exist
        let toast = document.querySelector('.toast-message');
        if (!toast) {
            toast = document.createElement('div');
            toast.className = 'toast-message';
            document.body.appendChild(toast);
        }
        
        // Set toast content and type
        toast.textContent = message;
        toast.className = `toast-message ${type}`;
        
        // Show the toast
        toast.classList.add('show');
        
        // Hide after 3 seconds
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }
    
    // Mark messages as read
    async function markMessagesAsRead(chatId, userId) {
        if (!chatId || chatId.startsWith('demo') || !userId) {
            return; // Skip for demo chats or invalid chatId
        }
        
        try {
            // Try to get unread messages from other users
            // This query requires a composite index that might still be building
            try {
                const unreadMessagesQuery = await firebase.firestore()
                    .collection('chats')
                    .doc(chatId)
                    .collection('messages')
                    .where('senderId', '!=', userId)
                    .where('read', '==', false)
                    .get();
                
                if (unreadMessagesQuery.empty) {
                    return; // No unread messages
                }
                
                // Create a batch to update unread messages
                const batch = firebase.firestore().batch();
                
                unreadMessagesQuery.docs.forEach(doc => {
                    batch.update(doc.ref, { read: true });
                });
                
                // Commit the batch
                await batch.commit();
                
                // Update the chat document to trigger real-time updates
                try {
                    await firebase.firestore()
                        .collection('chats')
                        .doc(chatId)
                        .update({
                            lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
                        });
                } catch (err) {
                    console.warn("Error updating chat lastUpdated:", err);
                    // Non-critical error, can continue
                }
                
                // Update the UI to show messages as read
                unreadMessagesQuery.docs.forEach(doc => {
                    const messageId = doc.id;
                    const message = doc.data();
                    message.read = true;
                    updateMessageInUI(messageId, message);
                });
                
                // Update unread count to 0 for this chat immediately in the UI
                updateUnreadCount(chatId, 0);
            } catch (indexError) {
                // If we get an index error (still building), use a fallback approach
                if (indexError.code === 'failed-precondition') {
                    console.log("Index still building. Using fallback method to mark messages as read.");
                    
                    // Fallback: Get all messages and filter in memory
                    // This is less efficient but doesn't require the index
                    const allMessagesQuery = await firebase.firestore()
                        .collection('chats')
                        .doc(chatId)
                        .collection('messages')
                        .orderBy('timestamp', 'desc')
                        .limit(50) // Limit to recent messages for performance
                        .get();
                    
                    if (allMessagesQuery.empty) {
                        return; // No messages
                    }
                    
                    // Filter unread messages from other users
                    const unreadDocs = allMessagesQuery.docs.filter(doc => {
                        const data = doc.data();
                        return data.senderId !== userId && data.read === false;
                    });
                    
                    if (unreadDocs.length === 0) {
                        return; // No unread messages
                    }
                    
                    // Create a batch to update unread messages
                    const batch = firebase.firestore().batch();
                    
                    unreadDocs.forEach(doc => {
                        batch.update(doc.ref, { read: true });
                    });
                    
                    // Commit the batch
                    await batch.commit();
                    
                    // Update the chat document to trigger real-time updates
                    try {
                        await firebase.firestore()
                            .collection('chats')
                            .doc(chatId)
                            .update({
                                lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
                            });
                    } catch (err) {
                        console.warn("Error updating chat lastUpdated:", err);
                        // Non-critical error, can continue
                    }
                    
                    // Update the UI to show messages as read
                    unreadDocs.forEach(doc => {
                        const messageId = doc.id;
                        const message = doc.data();
                        message.read = true;
                        updateMessageInUI(messageId, message);
                    });
                    
                    // Update unread count to 0 for this chat in the UI
                    updateUnreadCount(chatId, 0);
                } else {
                    // It's a different error, rethrow it
                    throw indexError;
                }
            }
        } catch (error) {
            console.error('Error marking messages as read:', error);
            // Don't show an error toast for this as it's not critical
        }
    }
    
    // Update the chat document when sending a message
    async function updateChatWithNewMessage(chatId, text) {
        if (!chatId) return;
        
        try {
            await firebase.firestore()
                .collection('chats')
                .doc(chatId)
                .update({
                    lastMessage: text,
                    lastMessageTime: firebase.firestore.FieldValue.serverTimestamp(),
                    lastMessageSender: currentUserID,
                    lastUpdated: firebase.firestore.FieldValue.serverTimestamp() // Add this line
                });
            
            console.log(`Updated chat ${chatId} with new message`);
        } catch (error) {
            console.error('Error updating chat with new message:', error);
            throw error;
        }
    }
    
    // Send a message or save edit
    async function sendMessage(text) {
        if (!text.trim()) return;
        
        // If we're in edit mode, update the existing message
        if (isEditingMessage && editingMessageId) {
            await saveEditedMessage(editingMessageId, text);
            cancelEditingMessage();
            return;
        }
        
        // Otherwise send a new message
        if (!currentChatId) return;
        
        // Store the chat ID we're sending to for verification later
        const targetChatId = currentChatId;
        
        // Generate a temporary ID for this message
        const tempId = 'temp-' + Date.now();
        
        try {
            // Update typing status to false
            const typingRef = firebase.firestore()
                .collection('chats')
                .doc(currentChatId)
                .collection('typing')
                .doc(currentUserID);
            
            typingRef.set({
                userId: currentUserID,
                isTyping: false,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            }).catch(err => console.error("Error updating typing status", err));
            
            // Create the message object
            const messageObj = {
                senderId: currentUserID,
                text: text,
                timestamp: new Date(), // Use client date temporarily
                read: false,
                edited: false,
                status: 'sending' // Add a status for UI feedback
            };
            
            // Remove empty state if it exists (for first message in a chat)
            const emptyState = document.querySelector('.empty-messages');
            if (emptyState) {
                emptyState.remove();
            }
            
            // Add message to UI immediately with temporary ID
            addMessageToUI(tempId, messageObj, currentUserID);
            scrollToBottom();
            
            // Clear input immediately for better UX
            messageInput.value = '';
            
            // Update contact preview immediately
            updateContactPreview(currentChatId, text, true);
            
            // Add message to Firestore
            const messageRef = await firebase.firestore()
                .collection('chats')
                .doc(currentChatId)
                .collection('messages')
                .add({
                    senderId: currentUserID,
                    text: text,
                    timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                    read: false,
                    edited: false
                });
            
            console.log(`Message sent with ID: ${messageRef.id}`);
            
            // Verify we're still in the same chat
            if (currentChatId !== targetChatId) {
                console.log("Chat changed while sending message, not updating UI");
                return;
            }
            
            // Track this message as rendered to prevent duplicates from real-time listeners
            window.renderedMessageIds.add(messageRef.id);
            
            // Map temporary ID to real ID for future reference
            if (!window.tempToRealIdMap) {
                window.tempToRealIdMap = new Map();
            }
            window.tempToRealIdMap.set(tempId, messageRef.id);
            
            // Update the temporary message with the real ID and status
            const tempElement = document.getElementById(`message-${tempId}`);
            if (tempElement) {
                tempElement.id = `message-${messageRef.id}`;
                
                // Add a data attribute for the temp ID for backward compatibility
                tempElement.setAttribute('data-temp-id', tempId);
                
                // Update status to "sent"
                const messageInfo = tempElement.querySelector('.message-info');
                const statusElement = tempElement.querySelector('.message-status');
                if (statusElement) {
                    statusElement.innerHTML = '<i class="fas fa-check"></i>';
                    statusElement.setAttribute('data-status', 'sent');
                }
                
                // Update our tracking set
                if (window.loadedMessageIds) {
                    window.loadedMessageIds.delete(tempId);
                    window.loadedMessageIds.add(messageRef.id);
                }
            }
            
            // Update last message in chat document
            await updateChatWithNewMessage(currentChatId, text);
            
            // After sending message, refresh chat list to show updated preview
            // We no longer need this with real-time updates
            // setTimeout(() => {
            //     loadUserChats(currentUserID);
            // }, 500);
            
        } catch (error) {
            console.error('Error sending message:', error);
            
            // Only update UI if still in same chat
            if (currentChatId !== targetChatId) {
                return;
            }
            
            // Show error in the UI for the temporary message
            const tempElement = document.getElementById(`message-${tempId}`);
            if (tempElement) {
                const statusElement = tempElement.querySelector('.message-status');
                if (statusElement) {
                    statusElement.innerHTML = '<i class="fas fa-exclamation-circle"></i>';
                    statusElement.setAttribute('data-status', 'error');
                    statusElement.setAttribute('title', 'Failed to send - click to retry');
                    
                    // Add click handler to retry
                    statusElement.style.cursor = 'pointer';
                    statusElement.addEventListener('click', () => {
                        // Remove the failed message and try again
                        tempElement.remove();
                        if (window.loadedMessageIds) {
                            window.loadedMessageIds.delete(tempId);
                        }
                        sendMessage(text);
                    });
                }
            }
        }
    }
    
    // Send button click handler
    sendBtn.addEventListener('click', () => {
        sendMessage(messageInput.value);
    });
    
    // Input keypress handler (send on Enter)
    messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendMessage(messageInput.value);
        }
    });
    
    // Helper functions
    function showMessages() {
        const friendsList = document.getElementById('friends-list');
        const messagesSection = document.getElementById('messages-section');
        const navbar = document.querySelector('nav');
        const bottomNav = document.querySelector('.bottom-nav');
        
        friendsList.classList.add('hidden');
        messagesSection.classList.add('active');
        
        // On mobile, hide navbar and bottom nav for immersive chat
        if (window.innerWidth <= 768) {
            navbar.classList.add('hidden');
            bottomNav.classList.add('hidden');
            document.body.classList.add('chat-open');
        }
        
        // Set a short timeout to ensure the DOM has updated
        // before attempting to scroll
        setTimeout(() => {
            scrollToBottom();
        }, 50);
    }
    
    // Helper function to scroll to bottom of messages
    function scrollToBottom() {
        // Use requestAnimationFrame to ensure DOM is updated before scrolling
        requestAnimationFrame(() => {
            const messagesContainer = document.querySelector('.messages-container');
            if (messagesContainer) {
                messagesContainer.scrollTop = messagesContainer.scrollHeight;
                
                // For mobile issues, sometimes we need to force the scroll again after a small delay
                setTimeout(() => {
                    messagesContainer.scrollTop = messagesContainer.scrollHeight;
                }, 100);
                
                // Add a second timeout with a longer delay for cases where images are loading
                // which could change the scrollHeight after initial scroll
                setTimeout(() => {
                    messagesContainer.scrollTop = messagesContainer.scrollHeight;
                }, 500);
            }
        });
    }
    
    // Helper function to format timestamps for contact list
    function formatTimestamp(timestamp) {
        if (!timestamp) return '';
        
        const date = timestamp instanceof Date ? timestamp : timestamp.toDate();
        const now = new Date();
        const diff = now - date;
        
        // Today - show time
        if (diff < 24 * 60 * 60 * 1000) {
            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }
        // Yesterday
        else if (diff < 48 * 60 * 60 * 1000) {
            return 'Yesterday';
        }
        // Within a week - show day name
        else if (diff < 7 * 24 * 60 * 60 * 1000) {
            const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
            return days[date.getDay()];
        }
        // Older - show date
        else {
            return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
        }
    }
    
    // Helper function to format message time
    function formatMessageTime(timestamp) {
        if (!timestamp) return '';
        
        const date = timestamp instanceof Date ? timestamp : timestamp.toDate();
        const now = new Date();
        const diff = now - date;
        
        // Less than a day ago
        if (diff < 24 * 60 * 60 * 1000) {
            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }
        // Less than a week ago
        else if (diff < 7 * 24 * 60 * 60 * 1000) {
            const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
            return days[date.getDay()];
        }
        // Otherwise show date
        else {
            return date.toLocaleDateString();
        }
    }
    
    // Helper function to capitalize first letter
    function capitalizeFirstLetter(string) {
        return string.charAt(0).toUpperCase() + string.slice(1);
    }
    
    // Logout link handler
    document.getElementById('logout-link').addEventListener('click', (e) => {
        e.preventDefault();
        
        firebase.auth().signOut().then(() => {
            window.location.href = '../login/login.html';
        }).catch((error) => {
            console.error('Error signing out:', error);
        });
    });

    // Add click handlers to the existing contacts in the HTML
    function addContactClickHandlers() {
        const contacts = document.querySelectorAll('.contact-item');
        
        contacts.forEach(contactItem => {
            // Skip if we already added a handler (check for data attribute)
            if (contactItem.dataset.hasClickHandler === 'true') return;
            
            // Mark as having a handler to avoid duplicates
            contactItem.dataset.hasClickHandler = 'true';
            
            contactItem.addEventListener('click', () => {
                // Get chat ID and contact info from data attributes
                const chatId = contactItem.dataset.chatId;
                if (!chatId) return;
                
                // Get contact details
                const contactName = contactItem.querySelector('.contact-name').textContent;
                const contactStatus = contactItem.dataset.status || 'offline';
                const contactId = contactItem.dataset.userId;
                let contactPhoto = null;
                
                // Try to get photo from image if it exists
                const avatarImg = contactItem.querySelector('.contact-avatar img');
                if (avatarImg && avatarImg.src) {
                    contactPhoto = avatarImg.src;
                }
                                            
                                            // Create contact object
                                            const contact = {
                    id: contactId,
                    name: contactName,
                    status: contactStatus,
                    photoURL: contactPhoto
                };
                
                // Remove active class from all contacts
                document.querySelectorAll('.contact-item').forEach(item => 
                    item.classList.remove('active')
                );
                
                // Add active class to clicked contact
                contactItem.classList.add('active');
                
                // Remove unread badge when clicking on contact
                const unreadBadge = contactItem.querySelector('.unread-count');
                if (unreadBadge) {
                    unreadBadge.remove();
                }
                
                // Load the chat
                loadChat(chatId, contact);
            });
        });
    }

    // Show empty state for messages when no chat is selected
    function showEmptyMessagesState() {
        const messagesSection = document.getElementById('messages-section');
        const messagesContainer = messagesSection.querySelector('.messages-container');
        const chatHeader = messagesSection.querySelector('.chat-header');
        
        // Clear current messages
        messagesContainer.innerHTML = '';
        
        // Reset header
        chatHeader.querySelector('.contact-details h3').textContent = '';
        chatHeader.querySelector('.contact-details p').textContent = '';
        chatHeader.querySelector('.contact-avatar img').style.display = 'none';
        
        // Add empty state message
        const emptyState = document.createElement('div');
        emptyState.className = 'empty-state';
        emptyState.innerHTML = `
            <div class="empty-icon">
                <i class="fas fa-comments"></i>
            </div>
            <h3>No conversation selected</h3>
            <p>Choose a conversation from the list or start a new chat</p>
        `;
        messagesContainer.appendChild(emptyState);
        
        // Add styles for empty state if not already added
        if (!document.getElementById('empty-state-styles')) {
            const styleTag = document.createElement('style');
            styleTag.id = 'empty-state-styles';
            styleTag.textContent = `
                .empty-state {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    height: 100%;
                    padding: 20px;
                    text-align: center;
                    color: var(--text-secondary);
                }
                
                .empty-icon {
                    font-size: 60px;
                    margin-bottom: 20px;
                    color: var(--bg-tertiary);
                }
                
                .empty-state h3 {
                    margin: 0 0 10px;
                    font-size: 20px;
                    color: var(--text-primary);
                }
                
                .empty-state p {
                    margin: 0;
                    font-size: 14px;
                }
            `;
            document.head.appendChild(styleTag);
        }
    }

    // Set up back button for mobile view
    if (backBtn) {
        backBtn.addEventListener('click', () => {
            showContacts();
        });
    }
    
    // Function to show contacts and hide messages on mobile
    function showContacts() {
        const friendsList = document.getElementById('friends-list');
        const messagesSection = document.getElementById('messages-section');
        const navbar = document.querySelector('nav');
        const bottomNav = document.querySelector('.bottom-nav');
        
        friendsList.classList.remove('hidden');
        messagesSection.classList.remove('active');
        
        // On mobile, show navbar and bottom nav again
        if (window.innerWidth <= 768) {
            navbar.classList.remove('hidden');
            bottomNav.classList.remove('hidden');
            document.body.classList.remove('chat-open');
        }
    }

    // Set up Firebase permissions
    async function setupFirebasePermissions(userId) {
        try {
            // First check if we have access to our own user document
            const testUserAccess = await firebase.firestore()
                .collection('users')
                .doc(userId)
                .get();
            
            // Check if we have access to write to it
            await firebase.firestore()
                .collection('users')
                .doc(userId)
                .set({ lastActive: firebase.firestore.FieldValue.serverTimestamp() }, { merge: true });
            
            console.log("Firebase permissions verified successfully");
        } catch (error) {
            console.error("Firebase permissions issue:", error);
            showPermissionsAlert();
            throw error;
        }
    }

    // Show permissions alert modal
    function showPermissionsAlert() {
        // Create alert modal
        const modal = document.createElement('div');
        modal.className = 'permissions-alert-modal';
        modal.innerHTML = `
            <div class="permissions-alert-content">
                <h3>Firebase Permissions Issue</h3>
                <p>Your app is encountering Firebase permissions issues. You need to update your Firestore security rules.</p>
                <div class="code-block">
                    <pre>
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Basic rule for authenticated users
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
                    </pre>
                </div>
                <p>Please update your security rules in the <a href="https://console.firebase.google.com/project/jobnav-799f0/firestore/rules" target="_blank">Firebase Console</a></p>
                <button class="close-alert-btn">Close</button>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Close button functionality
        const closeBtn = modal.querySelector('.close-alert-btn');
        closeBtn.addEventListener('click', () => {
            modal.remove();
        });
    }

    // Set up real-time presence tracking
    function setupPresenceTracking(userId) {
        // Get a reference to the user's status
        const userStatusRef = firebase.firestore().collection('users').doc(userId);
        
        // Reference to the user's online status in Realtime Database
        const userStatusRTDBRef = firebase.database().ref('/status/' + userId);
        
        // Check if the user is connected to the database
        const isOfflineForFirestore = {
            status: 'offline',
            lastSeen: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        const isOnlineForFirestore = {
            status: 'online',
            lastSeen: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        // Create a reference to the '.info/connected' path in Realtime Database
        const connectedRef = firebase.database().ref('.info/connected');
        
        // When the connection state changes, update the status in Firestore
        connectedRef.on('value', (snapshot) => {
            if (snapshot.val() === false) {
                // If we're not currently connected, there's nothing to do
                return;
            }
            
            // If we are connected, first set the status to offline when disconnect happens
            userStatusRTDBRef.onDisconnect().set({
                status: 'offline',
                lastSeen: firebase.database.ServerValue.TIMESTAMP
            }).then(() => {
                // Then set the user as online
                userStatusRTDBRef.set({
                    status: 'online',
                    lastSeen: firebase.database.ServerValue.TIMESTAMP
                });
                
                // Update in Firestore as well
                userStatusRef.update(isOnlineForFirestore)
                    .catch((error) => {
                        console.error("Error updating online status:", error);
                    });
            });
        });
        
        // Set up real-time listeners for contacts' online status
        setupContactStatusListeners();
    }

    // Listen for contact status changes
    function setupContactStatusListeners() {
        // Get all contact elements
        const contactsList = document.querySelector('.contacts-list');
        
        // Set up a listener for all users' statuses
        firebase.firestore().collection('users')
            .where('status', '==', 'online')
            .onSnapshot(snapshot => {
                // Create a Set of online user IDs for quick lookup
                const onlineUsers = new Set();
                
                snapshot.forEach(doc => {
                    onlineUsers.add(doc.id);
                });
                
                // Update all contact status indicators
                updateContactStatuses(onlineUsers);
                
                // If we have a current contact, update their status in the header too
                if (currentContact) {
                    updateCurrentContactStatus(onlineUsers.has(currentContact.id));
                }
            });
    }

    // Update the status indicators for all contacts
    function updateContactStatuses(onlineUsers) {
        const contactItems = document.querySelectorAll('.contact-item');
        
        contactItems.forEach(contactItem => {
            const contactId = contactItem.getAttribute('data-contact');
            if (!contactId) return;
            
            // Get the other user ID from the chat participants
            firebase.firestore().collection('chats').doc(contactId).get()
                .then(doc => {
                    if (doc.exists) {
                        const chatData = doc.data();
                        const otherUserId = chatData.participants.find(id => id !== currentUserID);
                        
                        // Update the status indicator
                        if (otherUserId) {
                            const statusIndicator = contactItem.querySelector('.status-indicator');
                            if (statusIndicator) {
                                statusIndicator.className = 'status-indicator';
                                statusIndicator.classList.add(onlineUsers.has(otherUserId) ? 'online' : 'offline');
                            }
                        }
                    }
                })
                .catch(error => {
                    console.error('Error updating contact status:', error);
                });
        });
    }

    // Update the current contact's status in chat header
    function updateCurrentContactStatus(isOnline) {
        if (!currentContact) return;
        
        // Update the contact object
        currentContact.status = isOnline ? 'online' : 'offline';
        
        // Update UI
        const header = document.querySelector('.chat-header');
        const statusText = header.querySelector('.contact-details p');
        const statusIndicator = header.querySelector('.status-indicator');
        
        if (statusText) {
            statusText.textContent = isOnline ? 'Online' : 'Offline';
        }
        
        if (statusIndicator) {
            statusIndicator.className = 'status-indicator';
            statusIndicator.classList.add(isOnline ? 'online' : 'offline');
        }
    }

    // Upload Image to ImageBB function
    async function uploadImageToImageBB(file) {
        const formData = new FormData();
        formData.append('image', file);
        
        // ImageBB API key
        const apiKey = 'e0a6fcfe00b70b788c6cf56e59297e2f';
        
        try {
            // Show loading state
            showToast('Uploading image...', 'info');
            
            const response = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
                method: 'POST',
                body: formData
            });
            
            if (!response.ok) {
                throw new Error(`ImageBB API error: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.success) {
                return data.data.url;
            } else {
                throw new Error('ImageBB upload failed');
            }
        } catch (error) {
            console.error('Error uploading to ImageBB:', error);
            showToast('Failed to upload image', 'error');
            throw error;
        }
    }

    // Send image message
    async function sendImageMessage(imageUrl) {
        if (!currentChatId) return;
        
        try {
            // Create HTML for image message
            const imageHtml = `<img src="${imageUrl}" alt="Shared image" style="max-width: 100%; border-radius: 8px;">`;
            
            // Add message to Firestore
            const messageRef = await firebase.firestore()
                .collection('chats')
                .doc(currentChatId)
                .collection('messages')
                .add({
                    senderId: currentUserID,
                    text: imageHtml,
                    isImage: true,
                    imageUrl: imageUrl,
                    timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                    read: false,
                    edited: false
                });
            
            // Update last message in chat document
            await firebase.firestore()
                .collection('chats')
                .doc(currentChatId)
                .update({
                    lastMessage: '📷 Image',
                    lastMessageTime: firebase.firestore.FieldValue.serverTimestamp(),
                    lastMessageSender: currentUserID
                });
            
            showToast('Image sent successfully', 'success');
            
        } catch (error) {
            console.error('Error sending image message:', error);
            showToast('Failed to send image', 'error');
        }
    }

    // Set up image upload button
    const imageUploadBtn = document.getElementById('image-upload-btn');
    const imageUploadInput = document.getElementById('image-upload');
    const imagePreviewModal = document.getElementById('imagePreviewModal');
    const imagePreview = document.getElementById('imagePreview');
    const closePreviewBtn = document.getElementById('closePreviewBtn');
    const cancelImageBtn = document.getElementById('cancelImageBtn');
    const sendImageBtn = document.getElementById('sendImageBtn');
    
    // Open file picker when clicking the image button
    imageUploadBtn.addEventListener('click', () => {
        imageUploadInput.click();
    });
    
    // When a file is selected, show the preview
    imageUploadInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            
            // Check file type
            if (!file.type.startsWith('image/')) {
                showToast('Please select an image file', 'error');
                return;
            }
            
            // Check file size (max 5MB)
            if (file.size > 5 * 1024 * 1024) {
                showToast('Image is too large (max 5MB)', 'error');
                return;
            }
            
            // Store the file reference
            currentImageFile = file;
            
            // Show preview
            const reader = new FileReader();
            reader.onload = (e) => {
                imagePreview.src = e.target.result;
                openImagePreviewModal();
            };
            reader.readAsDataURL(file);
        }
    });
    
    // Open image preview modal
    function openImagePreviewModal() {
        imagePreviewModal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
    
    // Close image preview modal
    function closeImagePreviewModal() {
        imagePreviewModal.classList.remove('active');
        document.body.style.overflow = '';
        currentImageFile = null;
        imageUploadInput.value = '';
    }
    
    // Close preview when clicking close button
    closePreviewBtn.addEventListener('click', closeImagePreviewModal);
    
    // Close preview when clicking cancel button
    cancelImageBtn.addEventListener('click', closeImagePreviewModal);
    
    // Close preview when clicking outside modal
    imagePreviewModal.addEventListener('click', (e) => {
        if (e.target === imagePreviewModal) {
            closeImagePreviewModal();
        }
    });
    
    // Send image when clicking send button
    sendImageBtn.addEventListener('click', async () => {
        if (!currentImageFile) {
            closeImagePreviewModal();
            return;
        }
        
        try {
            // Upload to ImageBB
            const imageUrl = await uploadImageToImageBB(currentImageFile);
            
            // Send as message
            await sendImageMessage(imageUrl);
            
            // Close modal
            closeImagePreviewModal();
        } catch (error) {
            console.error('Image upload and send error:', error);
            // Error already handled in the functions
            closeImagePreviewModal();
        }
    });

    // Function to initialize the chat UI
    function initializeChatsUI() {
        if (!currentUserID) return;
        
        // Set up the new chat button
        setupNewChatButton();
        
        // Check for URL parameters to load a specific chat
        const urlParams = new URLSearchParams(window.location.search);
        const chatId = urlParams.get('chatId');
        const contactId = urlParams.get('contact');
        const showMessages = urlParams.get('showMessages');
        
        // Check if this is a direct navigation or page reload
        const isDirectNavigation = sessionStorage.getItem('directNavigation') === 'true';
        
        // Load chat previews only (lazy load messages)
        loadUserChats(currentUserID).then(async (chats) => {
            // Set up chat preview listeners after chats are loaded
            setupChatPreviewListeners(currentUserID);
            
            // Process URL parameters only if this is a direct navigation
            if (isDirectNavigation) {
                try {
                    if (chatId) {
                        // Direct navigation with chatId parameter
                        console.log("Direct navigation with chatId parameter:", chatId);
                        await loadSpecificChat(chatId, showMessages);
                    } else if (contactId) {
                        // Direct navigation with contactId parameter
                        console.log("Direct navigation with contact parameter:", contactId);
                        await handleContactNavigation(contactId);
                    }
                } catch (error) {
                    console.error("Error processing URL parameters:", error);
                } finally {
                    // Clear the directNavigation flag regardless of success or failure
                    sessionStorage.removeItem('directNavigation');
                    
                    // Clean up URL parameters (to prevent reload issues)
                    if (history.pushState) {
                        const newUrl = window.location.pathname;
                        window.history.pushState({ path: newUrl }, '', newUrl);
                    }
                }
            } else if (chatId || contactId) {
                // This is a page reload with parameters, clean up the URL
                if (history.pushState) {
                    const newUrl = window.location.pathname;
                    window.history.pushState({ path: newUrl }, '', newUrl);
                }
            }
        });
    }
    
    // ... rest of existing code ...

    // Check for any pending chat requests and retry them
    async function checkPendingChatRequests() {
        const pendingChatUser = localStorage.getItem('pendingChatUser');
        
        if (pendingChatUser) {
            try {
                // Parse the stored user data
                const otherUser = JSON.parse(pendingChatUser);
                
                // Clear the pending chat from localStorage
                localStorage.removeItem('pendingChatUser');
                
                // Wait a second to ensure Firebase is ready
                setTimeout(async () => {
                    try {
                        console.log("Retrying pending chat creation with user:", otherUser);
                        // Check if chat already exists (might have been created but error shown)
                        const chatsRef = firebase.firestore().collection('chats');
                        const q1 = await chatsRef
                            .where('participants', 'array-contains', currentUserID)
                            .get();
                        
                        let existingChatId = null;
                        
                        q1.forEach(doc => {
                            const chatData = doc.data();
                            if (chatData.participants.includes(otherUser.id)) {
                                existingChatId = doc.id;
                            }
                        });
                        
                        if (existingChatId) {
                            // Chat already exists, load it
                            const contact = {
                                id: otherUser.id,
                                name: otherUser.name,
                                photoURL: otherUser.photoURL,
                                status: 'online'
                            };
                            
                            loadChat(existingChatId, contact);
                            
                            // Show messages section on mobile devices
                            if (window.innerWidth <= 768) {
                                showMessages();
                            }
                            
                            showToast('Chat conversation loaded successfully', 'success');
                        } else {
                            // Try to create the chat again
                            await createNewChat(otherUser);
                        }
                    } catch (error) {
                        console.error("Error retrying chat creation:", error);
                        // Quietly fail, don't show another error
                    }
                }, 1000);
            } catch (error) {
                console.error("Error parsing pending chat user:", error);
                localStorage.removeItem('pendingChatUser');
            }
        }
    }

    // Set up typing indicator
    function setupTypingIndicator(chatId, contact) {
        if (!chatId || !contact) return;
        
        // Clean up previous listener
        if (window.typingListener) {
            window.typingListener();
        }
        
        // Listen for typing status changes
        window.typingListener = firebase.firestore()
            .collection('chats')
            .doc(chatId)
            .collection('typing')
            .onSnapshot(snapshot => {
                let isOtherUserTyping = false;
                
                snapshot.docChanges().forEach(change => {
                    const typingData = change.doc.data();
                    
                    // Only care about the other user's typing status
                    if (typingData.userId !== currentUserID) {
                        isOtherUserTyping = typingData.isTyping;
                        
                        // Update typing indicator in chat header
                        updateHeaderTypingStatus(isOtherUserTyping);
                        
                        // Update typing indicator in contact list
                        updateContactTypingStatus(contact.name, isOtherUserTyping);
                    }
                });
                
                // If no typing data, ensure typing indicators are removed
                if (snapshot.empty) {
                    updateHeaderTypingStatus(false);
                    updateContactTypingStatus(contact.name, false);
                }
            }, error => {
                console.error('Error monitoring typing status:', error);
            });
    }

    // Update typing status in chat header
    function updateHeaderTypingStatus(isTyping) {
        const header = document.querySelector('.chat-header');
        if (!header) return;
        
        const statusText = header.querySelector('.contact-details p');
        const statusIndicator = header.querySelector('.status-indicator');
        
        if (statusText && statusIndicator && currentContact) {
            if (isTyping) {
                statusText.textContent = 'Typing...';
                statusText.classList.add('typing-text');
                statusIndicator.classList.add('typing');
                statusIndicator.classList.remove('online', 'offline');
            } else {
                const isOnline = statusIndicator.classList.contains('online');
                statusText.textContent = isOnline ? 'Online' : 'Offline';
                statusText.classList.remove('typing-text');
                statusIndicator.classList.remove('typing');
                
                // Restore online/offline status
                if (currentContact.status === 'online') {
                    statusIndicator.classList.add('online');
                } else {
                    statusIndicator.classList.add('offline');
                }
            }
        }
    }

    // Set up online status monitoring for all users
    function setupOnlineStatusMonitoring() {
        // Create a collection of users we're chatting with
        const chatContacts = new Set();
        
        // Add all users from contact list
        document.querySelectorAll('.contact-item').forEach(item => {
            const userName = item.querySelector('.contact-name')?.textContent;
            if (userName) {
                chatContacts.add(userName);
            }
        });
        
        // Set up a listener for online status changes in the users collection
        if (window.onlineStatusListener) {
            window.onlineStatusListener();
        }
        
        window.onlineStatusListener = firebase.firestore()
            .collection('users')
            .onSnapshot(snapshot => {
                snapshot.docChanges().forEach(change => {
                    const userData = change.doc.data();
                    const userId = change.doc.id;
                    const userName = userData.name || userData.fullName || userData.displayName;
                    
                    if (!userName) return;
                    
                    // Update status for this user in all places
                    updateUserOnlineStatus(userName, userData.status === 'online');
                    
                    // If this is a user we're chatting with, also update the chat header
                    if (currentContact && userId === currentContact.id) {
                        updateCurrentContactStatus(userData.status === 'online');
                    }
                });
            }, error => {
                console.error('Error monitoring online status:', error);
            });
    }

    // Update a user's online status in the contacts list
    function updateUserOnlineStatus(userName, isOnline) {
        // Update in contacts list
        const contactItems = document.querySelectorAll('.contact-item');
        
        contactItems.forEach(contactItem => {
            const contactName = contactItem.querySelector('.contact-name');
            if (contactName && contactName.textContent === userName) {
                const statusIndicator = contactItem.querySelector('.status-indicator');
                if (statusIndicator) {
                    // Remove all status classes first
                    statusIndicator.classList.remove('online', 'offline', 'typing');
                    
                    // Add appropriate class
                    statusIndicator.classList.add(isOnline ? 'online' : 'offline');
                }
            }
        });
        
        // Also update in users list modal if open
        const userItems = document.querySelectorAll('.user-item');
        userItems.forEach(userItem => {
            const userNameEl = userItem.querySelector('.user-details h3');
            if (userNameEl && userNameEl.textContent === userName) {
                const statusIndicator = userItem.querySelector('.status-indicator');
                if (statusIndicator) {
                    // Remove all status classes first
                    statusIndicator.classList.remove('online', 'offline');
                    
                    // Add appropriate class
                    statusIndicator.classList.add(isOnline ? 'online' : 'offline');
                }
            }
        });
    }

    // Update the current contact's status in the chat header
    function updateCurrentContactStatus(isOnline) {
        if (!currentContact) return;
        
        const header = document.querySelector('.chat-header');
        if (!header) return;
        
        const statusText = header.querySelector('.contact-details p');
        if (statusText) {
            statusText.textContent = isOnline ? 'Online' : 'Offline';
        }
        
        const statusIndicator = header.querySelector('.status-indicator');
        if (statusIndicator) {
            // Remove all status classes
            statusIndicator.classList.remove('online', 'offline', 'typing');
            
            // Add appropriate class
            statusIndicator.classList.add(isOnline ? 'online' : 'offline');
        }
    }

    // Set up typing indicator for a specific chat
    function setupTypingIndicator(chatId, contact) {
        if (!chatId || !contact) return;
        
        // Clean up previous listener
        if (window.typingListener) {
            window.typingListener();
        }
        
        // Listen for typing status changes
        window.typingListener = firebase.firestore()
            .collection('chats')
            .doc(chatId)
            .collection('typing')
            .onSnapshot(snapshot => {
                let isOtherUserTyping = false;
                
                snapshot.docChanges().forEach(change => {
                    const typingData = change.doc.data();
                    
                    // Only care about the other user's typing status
                    if (typingData.userId !== currentUserID) {
                        isOtherUserTyping = typingData.isTyping;
                        
                        // Update typing indicator in chat header
                        updateHeaderTypingStatus(isOtherUserTyping);
                        
                        // Update typing indicator in contact list
                        updateContactTypingStatus(contact.name, isOtherUserTyping);
                    }
                });
                
                // If no typing data, ensure typing indicators are removed
                if (snapshot.empty) {
                    updateHeaderTypingStatus(false);
                    updateContactTypingStatus(contact.name, false);
                }
            }, error => {
                console.error('Error monitoring typing status:', error);
            });
    }

    // Update typing status in chat header
    function updateHeaderTypingStatus(isTyping) {
        const header = document.querySelector('.chat-header');
        if (!header) return;
        
        const statusText = header.querySelector('.contact-details p');
        const statusIndicator = header.querySelector('.status-indicator');
        
        if (statusText && statusIndicator && currentContact) {
            if (isTyping) {
                statusText.textContent = 'Typing...';
                statusText.classList.add('typing-text');
                statusIndicator.classList.add('typing');
                statusIndicator.classList.remove('online', 'offline');
            } else {
                const isOnline = statusIndicator.classList.contains('online');
                statusText.textContent = isOnline ? 'Online' : 'Offline';
                statusText.classList.remove('typing-text');
                statusIndicator.classList.remove('typing');
                
                // Restore online/offline status
                if (currentContact.status === 'online') {
                    statusIndicator.classList.add('online');
                } else {
                    statusIndicator.classList.add('offline');
                }
            }
        }
    }

    // Set up real-time listeners for preview updates
    function setupChatPreviewListeners(userId) {
        // Get all chat IDs from contact items
        const contactItems = document.querySelectorAll('.contact-item');
        const chatIds = Array.from(contactItems).map(item => item.dataset.chatId).filter(Boolean);
        
        // Clean up previous listeners
        if (window.chatPreviewListeners) {
            window.chatPreviewListeners.forEach(listener => listener());
            window.chatPreviewListeners = [];
        } else {
            window.chatPreviewListeners = [];
        }
        
        // Set up listeners for each chat
        chatIds.forEach(chatId => {
            // Listen for new/updated messages to update preview
            const messagesListener = firebase.firestore()
                .collection('chats')
                .doc(chatId)
                .collection('messages')
                .orderBy('timestamp', 'desc')
                .limit(1)
                .onSnapshot(snapshot => {
                    if (snapshot.empty) return;
                    
                    snapshot.docChanges().forEach(change => {
                        if (change.type === 'added' || change.type === 'modified') {
                            const message = change.doc.data();
                            
                            // Update the chat preview
                            updateChatPreview(chatId, {
                                text: message.text,
                                timestamp: message.timestamp?.toDate() || new Date(),
                                senderId: message.senderId,
                                read: message.read
                            }, userId);
                        }
                    });
                }, error => {
                    console.error('Error listening to message updates:', error);
                });
            
            // Listen for typing status
            const typingListener = firebase.firestore()
                .collection('chats')
                .doc(chatId)
                .collection('typing')
                .onSnapshot(snapshot => {
                    let isTyping = false;
                    let typingUserId = null;
                    
                    snapshot.forEach(doc => {
                        const typingData = doc.data();
                        if (typingData.userId !== userId && typingData.isTyping) {
                            isTyping = true;
                            typingUserId = typingData.userId;
                        }
                    });
                    
                    if (isTyping && typingUserId) {
                        // Find the contact item for this chat
                        const contactItem = document.querySelector(`.contact-item[data-chat-id="${chatId}"]`);
                        if (contactItem) {
                            // Get the contact name
                            const contactName = contactItem.querySelector('.contact-name')?.textContent;
                            if (contactName) {
                                // Update the typing indicator in the contact list
                                updateContactTypingStatus(contactName, true);
                            }
                        }
                    } else {
                        // Find the contact item for this chat
                        const contactItem = document.querySelector(`.contact-item[data-chat-id="${chatId}"]`);
                        if (contactItem) {
                            // Get the contact name
                            const contactName = contactItem.querySelector('.contact-name')?.textContent;
                            if (contactName) {
                                // Remove typing indicator
                                updateContactTypingStatus(contactName, false);
                            }
                        }
                    }
                }, error => {
                    console.error('Error in typing listener:', error);
                    // Don't rethrow - typing indicators are not critical
                });
            
            // Store the typing listener
            window.chatPreviewListeners.push(typingListener);
            
            // Listen for unread messages count (with error handling for index building)
            try {
                const unreadListener = firebase.firestore()
                    .collection('chats')
                    .doc(chatId)
                    .collection('messages')
                    .where('senderId', '!=', userId)
                    .where('read', '==', false)
                    .onSnapshot(snapshot => {
                        const unreadCount = snapshot.size;
                        updateUnreadCount(chatId, unreadCount);
                    }, error => {
                        // If index is still building, just log it and don't update unread counts
                        // They'll start working once the index is built
                        if (error.code === 'failed-precondition') {
                            console.log('Unread count index is still building. This will work once the index is ready.');
                        } else {
                            console.error('Error in unread count listener:', error);
                        }
                    });
                
                window.chatPreviewListeners.push(unreadListener);
            } catch (error) {
                console.log('Could not set up unread count listener:', error);
            }
            
            // Store the listener unsubscribe functions
            window.chatPreviewListeners.push(messagesListener);
        });
    }

    // Update chat preview with latest message
    function updateChatPreview(chatId, message, currentUserId) {
        const contactItem = document.querySelector(`.contact-item[data-chat-id="${chatId}"]`);
        if (!contactItem) return;
        
        const previewText = contactItem.querySelector('.contact-preview p');
        const timeElement = contactItem.querySelector('.contact-time');
        
        if (previewText && message) {
            let displayText = message.text;
            
            // Handle image messages
            if (displayText && displayText.includes('<img')) {
                displayText = '📷 Image';
            } else if (displayText && displayText.length > 30) {
                // Truncate long messages
                displayText = displayText.substring(0, 30) + '...';
            }
            
            // Add "You: " prefix for messages sent by current user
            if (message.senderId === currentUserId) {
                displayText = 'You: ' + displayText;
            }
            
            // Update the preview text
            previewText.textContent = displayText;
            
            // Save this as the originalPreview in case typing indicators need it
            contactItem.dataset.originalPreview = displayText;
        }
        
        if (timeElement && message.timestamp) {
            // Update the time
            timeElement.textContent = formatTimestamp(message.timestamp);
        }
        
        // Update the timestamp for sorting
        contactItem.dataset.timestamp = message.timestamp ? message.timestamp.getTime() : Date.now();
        
        // Move this contact to the top of the list if it's not already
        const contactsList = document.querySelector('.contacts-list');
        if (contactsList) {
            // Don't just move to top - resort all contacts properly
            sortChatElements(contactsList);
        }
    }
    
    // Update unread count badge
    function updateUnreadCount(chatId, count) {
        if (!chatId) return;
        
        console.log(`Updating unread count for chat ${chatId} to ${count}`);
        
        const contactItem = document.querySelector(`.contact-item[data-chat-id="${chatId}"]`);
        if (!contactItem) {
            console.log(`Contact item not found for chat ${chatId}`);
            return;
        }
        
        const previewContainer = contactItem.querySelector('.contact-preview');
        let unreadBadge = contactItem.querySelector('.unread-count');
        
        // Handle count > 0
        if (count > 0) {
            if (unreadBadge) {
                // Update existing badge
                unreadBadge.textContent = count;
                console.log(`Updated existing unread badge to ${count}`);
            } else if (previewContainer) {
                // Create new badge
                unreadBadge = document.createElement('span');
                unreadBadge.className = 'unread-count';
                unreadBadge.textContent = count;
                previewContainer.appendChild(unreadBadge);
                console.log(`Created new unread badge with count ${count}`);
            }
            
            // Apply a subtle animation to highlight the change
            if (unreadBadge) {
                unreadBadge.classList.remove('pulse');
                // Force reflow
                void unreadBadge.offsetWidth;
                unreadBadge.classList.add('pulse');
            }
        } 
        // Handle count = 0
        else if (unreadBadge) {
            // Remove the badge
            unreadBadge.remove();
            console.log(`Removed unread badge for chat ${chatId}`);
        }
        
        // If this is the currently open chat, mark messages as read
        if (contactItem.classList.contains('active') && currentChatId === chatId) {
            console.log(`Marking messages as read in currently open chat ${chatId}`);
            markMessagesAsRead(chatId, currentUserID);
        }
    }

    // Function to add dynamic CSS styles
    function addStyleToPage(css) {
        const styleElement = document.createElement('style');
        styleElement.textContent = css;
        document.head.appendChild(styleElement);
        return styleElement;
    }

    // Add CSS styles for proper message display in mobile view
    addStyleToPage(`
        /* Improved messages container styling for mobile */
        .messages-container {
            display: flex;
            flex-direction: column;
            overflow-y: auto;
            height: calc(100% - 60px);
            padding: 1rem;
            -webkit-overflow-scrolling: touch; /* Smoother scrolling on iOS */
        }
        
        /* Fix for message ordering issues */
        .message {
            position: relative;
            max-width: 80%;
            margin-bottom: 0.75rem;
            order: 0; /* Ensure proper ordering */
        }
        
        /* Loading indicator for messages */
        .messages-loading {
            display: flex;
            justify-content: center;
            align-items: center;
            padding: 1rem;
            height: 60px;
        }
        
        .loading-spinner {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 0.5rem;
            color: var(--primary-blue);
        }
        
        .loading-spinner i {
            font-size: 1.5rem;
        }
        
        /* Error message */
        .error-message {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 2rem;
            text-align: center;
            color: #e74c3c;
        }
        
        .error-message i {
            font-size: 2rem;
            margin-bottom: 1rem;
        }
        
        /* Improved mobile specific styles */
        @media (max-width: 768px) {
            .messages-container {
                height: calc(100vh - 120px); /* Adjust for mobile header and input */
            }
            
            .chat-open .messages-container {
                padding-bottom: 2rem; /* Extra space to ensure all messages are visible */
            }
            
            /* Fix for iOS momentum scrolling issues */
            body.chat-open {
                overflow: hidden;
            }
            
            .message-input-container {
                position: sticky;
                bottom: 0;
                background: var(--bg-light);
                z-index: 5;
            }
            
            .dark-mode .message-input-container {
                background: var(--bg-dark);
            }
        }
    `);

    // New function to update the contact preview in the contacts list
    function updateContactPreview(chatId, messageText, isSent = false) {
        if (!chatId || !messageText) return;
        
        console.log(`Updating contact preview for chat ${chatId}`);
        
        const contactItem = document.querySelector(`.contact-item[data-chat-id="${chatId}"]`);
        if (!contactItem) return;
        
        const previewText = contactItem.querySelector('.contact-preview p');
        const timeElement = contactItem.querySelector('.contact-time');
        
        if (previewText) {
            // Truncate message if it's too long
            const maxLength = 30;
            let previewMessage = messageText;
            
            // Handle image messages
            if (messageText.includes('<img')) {
                previewMessage = '📷 Image';
            } else if (messageText.length > maxLength) {
                previewMessage = messageText.substring(0, maxLength) + '...';
            }
            
            // If message is from current user, add "You: " prefix
            if (isSent) {
                previewMessage = 'You: ' + previewMessage;
            }
            
            // Update the preview text
            previewText.textContent = previewMessage;
            
            // Save this as the originalPreview in case typing indicators need it
            contactItem.dataset.originalPreview = previewMessage;
        }
        
        if (timeElement) {
            // Update the time to "now"
            timeElement.textContent = 'now';
        }
        
        // Update the timestamp for sorting
        contactItem.dataset.timestamp = Date.now();
        
        // Move this contact to the top of the list if it's not already
        const contactsList = document.querySelector('.contacts-list');
        if (contactsList) {
            // Don't just move to top - resort all contacts properly
            sortChatElements(contactsList);
        }
    }

    // Update typing status in contacts list
    function updateContactTypingStatus(name, isTyping) {
        // Find all matching contacts
        const contactItems = document.querySelectorAll('.contact-item');
        
        contactItems.forEach(item => {
            const contactName = item.querySelector('.contact-name')?.textContent;
            if (contactName === name) {
                const previewText = item.querySelector('.contact-preview p');
                const statusIndicator = item.querySelector('.status-indicator');
                
                if (previewText) {
                    if (isTyping) {
                        // Store original text if not already stored
                        if (!previewText.dataset.originalText) {
                            previewText.dataset.originalText = previewText.textContent;
                        }
                        previewText.textContent = 'Typing...';
                        previewText.classList.add('typing-text');
                    } else {
                        // Restore original text if it exists
                        if (previewText.dataset.originalText) {
                            previewText.textContent = previewText.dataset.originalText;
                            delete previewText.dataset.originalText;
                        }
                        previewText.classList.remove('typing-text');
                    }
                }
                
                if (statusIndicator) {
                    if (isTyping) {
                        // Store original status if not already stored
                        if (!statusIndicator.dataset.originalStatus) {
                            statusIndicator.dataset.originalStatus = 
                                statusIndicator.classList.contains('online') ? 'online' : 'offline';
                        }
                        statusIndicator.classList.remove('online', 'offline');
                        statusIndicator.classList.add('typing');
                    } else {
                        // Restore original status if it exists
                        statusIndicator.classList.remove('typing');
                        if (statusIndicator.dataset.originalStatus) {
                            statusIndicator.classList.add(statusIndicator.dataset.originalStatus);
                            delete statusIndicator.dataset.originalStatus;
                        } else {
                            // Default to offline if no stored status
                            statusIndicator.classList.add('offline');
                        }
                    }
                }
            }
        });
    }

    // Add CSS styles for status indicators and typing animations
    document.head.insertAdjacentHTML('beforeend', `
    <style>
        /* Status indicators improvements */
        .status-indicator {
            display: inline-block;
            width: 10px;
            height: 10px;
            border-radius: 50%;
            position: absolute;
            bottom: 2px;
            right: 2px;
            border: 2px solid var(--bg-light);
            transition: background-color 0.3s ease;
            box-shadow: 0 0 0 1px rgba(0,0,0,0.1);
            z-index: 2;
        }
        
        .dark-mode .status-indicator {
            border-color: var(--bg-dark);
        }
        
        
        .status-indicator.online {
            background-color: #2ecc71;
        }
        
        .status-indicator.offline {
            background-color: #95a5a6;
        }
        
        .status-indicator.typing {
            background-color: #3498db;
            animation: pulse 1.5s infinite;
        }
        
        /* Typing animation */
        @keyframes pulse {
            0% { transform: scale(1); opacity: 1; }
            50% { transform: scale(1.2); opacity: 0.8; }
            100% { transform: scale(1); opacity: 1; }
        }
        
        /* Typing text in previews */
        .contact-preview p.typing-text {
            color: #3498db;
            font-style: italic;
        }
        
        /* Typing text in chat header */
        .contact-details p.typing-text {
            color: #3498db;
            font-style: italic;
        }
    </style>
    `);

    // Add helper function to inject CSS for fixing message position swaps
    function addFixedPositioningStyles() {
        const styleEl = document.createElement('style');
        styleEl.id = 'fixed-positioning-styles';
        styleEl.textContent = `
            /* Fix message positions in mobile view */
            @media (max-width: 768px) {
                .messages-container {
                    display: flex !important;
                    flex-direction: column !important;
                    height: calc(100% - 60px) !important;
                    width: 100% !important;
                    padding: 1rem !important;
                    position: relative !important;
                    overflow-y: auto !important;
                }
                
                .messages-container .message {
                    width: 100% !important;
                    position: relative !important;
                    display: flex !important;
                    flex-direction: column !important;
                    order: unset !important;
                }
                
                .messages-container .message.sent {
                    align-self: flex-end !important;
                    margin-left: auto !important;
                }
                
                .messages-container .message.received {
                    align-self: flex-start !important;
                    margin-right: auto !important;
                }
            }
            
            /* Improve typing indicator appearance */
            .typing-text {
                color: #3498db !important;
                font-style: italic !important;
                animation: fade 1.5s infinite !important;
            }
            
            @keyframes fade {
                0% { opacity: 0.7; }
                50% { opacity: 1; }
                100% { opacity: 0.7; }
            }
            
            .status-indicator.typing {
                background-color: #3498db !important;
                animation: pulse 1.5s infinite !important;
            }
            
            @keyframes pulse {
                0% { transform: scale(1); opacity: 1; }
                50% { transform: scale(1.2); opacity: 0.8; }
                100% { transform: scale(1); opacity: 1; }
            }
        `;
        document.head.appendChild(styleEl);
    }

    // Call this function after DOM is ready
    document.addEventListener('DOMContentLoaded', () => {
        // Add the fixed positioning styles
        addFixedPositioningStyles();
    });

    // Also add these styles immediately in case DOMContentLoaded already fired
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        addFixedPositioningStyles();
    }

    // Add updateChatHeader function
    function updateChatHeader(contact) {
        if (!contact) return;
        
        const header = document.querySelector('.chat-header');
        header.querySelector('.contact-details h3').textContent = contact.name || 'User';
        header.querySelector('.contact-details p').textContent = contact.status || 'Offline';
        
        const contactAvatar = header.querySelector('.contact-avatar img');
        const avatarSrc = contact.photoURL || getDefaultAvatar(contact.id, contact.name);
        contactAvatar.src = avatarSrc;
        contactAvatar.style.display = 'block';
        
        const statusIndicator = header.querySelector('.status-indicator');
        statusIndicator.className = 'status-indicator';
        statusIndicator.classList.add(contact.status || 'offline');
        
        // Update message input placeholder
        const messageInput = document.querySelector('.message-input input');
        if (messageInput) {
            messageInput.placeholder = `Message ${contact.name}...`;
        }
        
        // Add click event to the contact avatar and contact details to redirect to profile page
        const contactAvatarContainer = header.querySelector('.contact-avatar');
        const contactDetails = header.querySelector('.contact-details');
        
        // Add pointer cursor style to indicate clickable elements
        contactAvatarContainer.style.cursor = 'pointer';
        contactDetails.style.cursor = 'pointer';
        
        // Add click event listeners to both elements
        contactAvatarContainer.onclick = function() {
            navigateToUserProfile(contact.id);
        };
        
        contactDetails.onclick = function() {
            navigateToUserProfile(contact.id);
        };
    }

    // Function to navigate to user profile with the user ID parameter
    function navigateToUserProfile(userId) {
        if (!userId) return;
        
        // Redirect to the profile page with the user ID as a parameter
        window.location.href = `../profile/profile.html?id=${userId}`;
    }

    // Function to add debugging tools to the UI
    function addDebugTools() {
        // Only add these in development environments
        if (window.location.hostname !== 'localhost' && 
            window.location.hostname !== '127.0.0.1' &&
            !window.location.hostname.includes('5503')) {
            return;
        }
        
        console.log("Adding debug tools to UI");
        
        // Create debug panel
        const debugPanel = document.createElement('div');
        debugPanel.style.position = 'fixed';
        debugPanel.style.bottom = '80px';
        debugPanel.style.right = '20px';
        debugPanel.style.zIndex = '9999';
        debugPanel.style.background = 'rgba(0, 0, 0, 0.8)';
        debugPanel.style.color = 'white';
        debugPanel.style.padding = '10px';
        debugPanel.style.borderRadius = '5px';
        debugPanel.style.fontFamily = 'monospace';
        debugPanel.style.fontSize = '12px';
        debugPanel.style.maxWidth = '300px';
        
        // Create test chat button
        const createTestChatBtn = document.createElement('button');
        createTestChatBtn.innerText = 'Create Test Chat';
        createTestChatBtn.style.padding = '8px';
        createTestChatBtn.style.marginBottom = '8px';
        createTestChatBtn.style.width = '100%';
        createTestChatBtn.style.cursor = 'pointer';
        
        // Create refresh button
        const refreshBtn = document.createElement('button');
        refreshBtn.innerText = 'Refresh Chats';
        refreshBtn.style.padding = '8px';
        refreshBtn.style.width = '100%';
        refreshBtn.style.cursor = 'pointer';
        
        // Add click handlers
        createTestChatBtn.addEventListener('click', createTestChat);
        refreshBtn.addEventListener('click', () => {
            if (currentUserID) {
                loadUserChats(currentUserID);
            } else {
                console.error("No current user ID available");
            }
        });
        
        // Add elements to panel
        debugPanel.appendChild(createTestChatBtn);
        debugPanel.appendChild(refreshBtn);
        
        // Add panel to body
        document.body.appendChild(debugPanel);
    }

    // Function to create a test chat for debugging
    async function createTestChat() {
        if (!currentUserID) {
            console.error("No current user ID available");
            return;
        }
        
        try {
            console.log("Creating test chat for user:", currentUserID);
            
            // Create a test user if needed
            const testUserID = "test_user_" + Date.now();
            const testUser = {
                id: testUserID,
                name: "Test User",
                status: "offline",
                lastActive: new Date()
            };
            
            // Save test user to Firestore
            await firebase.firestore().collection('users').doc(testUserID).set(testUser);
            
            // Create a chat document
            const chatData = {
                participants: [currentUserID, testUserID],
                lastUpdated: new Date(),
                createdAt: new Date()
            };
            
            // Save chat to Firestore
            const chatRef = await firebase.firestore().collection('chats').add(chatData);
            console.log("Created test chat with ID:", chatRef.id);
            
            // Add a test message
            const messageData = {
                text: "This is a test message",
                timestamp: new Date(),
                senderId: testUserID,
                read: false
            };
            
            // Save message to Firestore
            await firebase.firestore().collection('chats').doc(chatRef.id)
                .collection('messages').add(messageData);
            
            console.log("Test chat created successfully");
            
            // Refresh chat list
            loadUserChats(currentUserID);
            
        } catch (error) {
            console.error("Error creating test chat:", error);
        }
    }

    // Call the debug tools function at the end
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(addDebugTools, 2000); // Add after a short delay to ensure other initialization is complete
    });

    // Function to update message status in the UI
    function updateMessageInUI(messageId, message) {
        const messageElement = document.getElementById(`message-${messageId}`);
        if (!messageElement) {
            return; // Message element not found
        }
        
        const statusElement = messageElement.querySelector('.message-status');
        if (statusElement && message.senderId === currentUserID) {
            // Update read status for sent messages
            if (message.read) {
                statusElement.innerHTML = '<i class="fas fa-check-double"></i>';
                statusElement.setAttribute('data-status', 'read');
            } else {
                statusElement.innerHTML = '<i class="fas fa-check"></i>';
                statusElement.setAttribute('data-status', 'sent');
            }
        }
    }
});
