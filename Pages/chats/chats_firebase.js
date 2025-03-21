// Firebase Chat Functionality
document.addEventListener('DOMContentLoaded', () => {
    // Current user reference
    let currentUser = null;
    let currentUserID = null;
    let currentChatId = null;
    let currentContact = null;
    let isEditingMessage = false;
    let editingMessageId = null;
    let currentImageFile = null;
    
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
        
        // Get user initials
        const initials = displayName
            .split(' ')
            .map(name => name.charAt(0))
            .join('')
            .toUpperCase();
            
        if (user.photoURL || userData?.photoURL) {
            // Use actual profile photo if available
            const photoURL = userData?.photoURL || user.photoURL;
            if (avatarImg) {
                avatarImg.src = photoURL;
                avatarImg.style.display = 'block';
            }
            if (avatarInitials) {
                avatarInitials.style.display = 'none';
            }
        } else {
            // Use default avatar instead of initials
            const defaultAvatar = getDefaultAvatar(user.uid || userData?.id, displayName);
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
            
            // Create user data if it doesn't exist
            if (!userData) {
                userData = {
                    id: user.uid,
                    name: user.displayName || 'User',
                    fullName: user.displayName || 'User',
                    email: user.email,
                    photoURL: user.photoURL,
                    status: 'online',
                    createdAt: new Date()
                };
                
                // Save user data to Firestore
                await firebase.firestore().collection('users').doc(user.uid).set(userData);
            } else if (!userData.name && user.displayName) {
                // Update user data if name is missing but displayName exists
                userData.name = user.displayName;
                userData.fullName = user.displayName;
                await firebase.firestore().collection('users').doc(user.uid).update({
                    name: user.displayName,
                    fullName: user.displayName
                });
            }
            
            // Update online status
            await firebase.firestore().collection('users').doc(user.uid).update({
                status: 'online',
                lastActive: new Date()
            });
            
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
            
            if (userData) {
                // Update dropdown user info
                document.getElementById('user-name').textContent = userData.name || user.displayName || 'User';
                document.getElementById('user-email').textContent = userData.email || user.email || '';
                
                // Update avatar display with our new function
                const userAvatarContainer = document.querySelector('.user-avatar');
                updateUserAvatar(userAvatarContainer, user, userData);
                
                // Also update dropdown avatar
                const dropdownAvatarContainer = document.querySelector('.dropdown-header .user-avatar');
                updateUserAvatar(dropdownAvatarContainer, user, userData);
            }
            
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
        
        // Handle search input
        searchInput.addEventListener('input', () => {
            const query = searchInput.value.toLowerCase().trim();
            filterUsers(query);
        });
    }
    
    // Open the users list modal
    function openModal() {
        const modal = document.getElementById('usersListModal');
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
    
    // Close the users list modal
    function closeModal() {
        const modal = document.getElementById('usersListModal');
        modal.classList.remove('active');
        document.body.style.overflow = '';
        
        // Clear search input
        const searchInput = document.getElementById('user-search-input');
        searchInput.value = '';
        
        // Clear users list
        const usersList = document.getElementById('users-list');
        usersList.innerHTML = `
            <div class="loading-spinner">
                <i class="fas fa-spinner fa-spin"></i>
                <p>Loading users...</p>
            </div>
        `;
    }
    
    // Fetch users from Firestore and display them
    async function fetchAndDisplayUsers() {
        if (!currentUser) return;
        
        const usersList = document.getElementById('users-list');
        
        try {
            // Fetch all users except current user
            const usersSnapshot = await firebase.firestore().collection('users').get();
            const users = [];
            
            usersSnapshot.forEach(doc => {
                if (doc.id !== currentUser.uid) {
                    users.push({
                        id: doc.id,
                        ...doc.data()
                    });
                }
            });
            
            // Display users
            if (users.length === 0) {
                usersList.innerHTML = `
                    <div class="no-results">
                        <i class="fas fa-users-slash"></i>
                        <p>No other users found.</p>
                    </div>
                `;
            } else {
                usersList.innerHTML = '';
                users.forEach(user => {
                    usersList.appendChild(createUserElement(user));
                });
            }
        } catch (error) {
            console.error('Error fetching users:', error);
            usersList.innerHTML = `
                <div class="no-results">
                    <i class="fas fa-exclamation-circle"></i>
                    <p>Failed to load users. Please try again.</p>
                </div>
            `;
        }
    }
    
    // Create a user element for the list
    function createUserElement(user) {
        const userName = user.name || user.fullName || user.displayName || 'User';
        const userElement = document.createElement('div');
        userElement.className = 'user-item';
        userElement.dataset.userId = user.id;
        
        // Use getDefaultAvatar for a consistent avatar
        const avatarUrl = user.photoURL || getDefaultAvatar(user.id, userName);
        
        userElement.innerHTML = `
            <div class="user-avatar">
                <img src="${avatarUrl}" alt="${userName}">
                <span class="status-indicator ${user.status || 'offline'}"></span>
            </div>
            <div class="user-details">
                <h3>${userName}</h3>
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
    
    // Initiate chat with selected user
    async function initiateChat(otherUser) {
        if (!currentUser) {
            console.error('No current user found. Please login.');
            showToast('Please login to start a chat.', 'error');
            return;
        }
        
        try {
            // Close the modal
            closeModal();
            
            // Ensure the current user has full information
            if (!currentUser.displayName && !otherUser.name && !otherUser.fullName) {
                showToast('Please update your profile information in settings before starting a chat.', 'error');
                return;
            }

            // Check if chat already exists between these users
            const chatsRef = firebase.firestore().collection('chats');
            const q1 = await chatsRef
                .where('participants', 'array-contains', currentUser.uid)
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
                // Get the other user's name for the chat header
                const otherUserName = otherUser.name || otherUser.fullName || otherUser.displayName || 'User';
                const contact = {
                    id: otherUser.id,
                    name: otherUserName,
                    photoURL: otherUser.photoURL,
                    status: 'online' // Assume online for simplicity
                };
                
                loadChat(existingChatId, contact);
                
                // Show messages section on mobile devices
                if (window.innerWidth <= 768) {
                    showMessages();
                }
            } else {
                // Create a new chat with retry mechanism
                await createNewChat(otherUser);
            }
        } catch (error) {
            console.error("Error initiating chat:", error);
            
            // If this is a permissions error, handle it specially
            if (error.code === 'permission-denied') {
                showToast('Permission error. Please wait a moment and try again.', 'error');
                
                // Store the user info in localStorage for retry after refresh
                localStorage.setItem('pendingChatUser', JSON.stringify({
                    id: otherUser.id,
                    name: otherUser.name || otherUser.fullName || otherUser.displayName || 'User',
                    photoURL: otherUser.photoURL
                }));
            } else {
                showToast('Error starting chat. Please try again or update your profile in settings.', 'error');
            }
        }
    }
    
    // Helper function to create a new chat with better error handling
    async function createNewChat(otherUser) {
        // Create a new chat document
        const newChat = {
            participants: [currentUserID, otherUser.id],
            created: firebase.firestore.FieldValue.serverTimestamp(),
            lastMessage: null,
            lastMessageTime: null
        };
        
        // Try to create the chat document first
        const chatRef = await firebase.firestore().collection('chats').add(newChat);
        
        try {
            // Add this chat to current user's chats collection
            await firebase.firestore().collection('users').doc(currentUserID)
                .collection('chats').doc(chatRef.id).set({
                    chatId: chatRef.id,
                    with: otherUser.id,
                    withName: otherUser.name || otherUser.fullName || otherUser.displayName || 'User',
                    withPhoto: otherUser.photoURL || null,
                    lastRead: firebase.firestore.FieldValue.serverTimestamp()
                });
        } catch (error) {
            console.error("Error adding chat to current user:", error);
            // Continue despite error
        }
        
        try {
            // Add this chat to other user's chats collection
            await firebase.firestore().collection('users').doc(otherUser.id)
                .collection('chats').doc(chatRef.id).set({
                    chatId: chatRef.id,
                    with: currentUserID,
                    withName: currentUser.displayName || 'User',
                    withPhoto: currentUser.photoURL || null,
                    lastRead: firebase.firestore.FieldValue.serverTimestamp()
                });
        } catch (error) {
            console.error("Error adding chat to other user:", error);
            // Continue despite error - permissions might be an issue for writing to other user's collection
        }
        
        // Get the other user's name for the chat header
        const otherUserName = otherUser.name || otherUser.fullName || otherUser.displayName || 'User';
        const contact = {
            id: otherUser.id,
            name: otherUserName,
            photoURL: otherUser.photoURL,
            status: 'online' // Assume online for simplicity
        };
        
        // Load the chat regardless of potential errors above
        loadChat(chatRef.id, contact);
        
        // Show messages section on mobile devices
        if (window.innerWidth <= 768) {
            showMessages();
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
        try {
            // Fetch user's chats from Firestore
            const chatsSnapshot = await firebase.firestore()
                .collection('chats')
                .where('participants', 'array-contains', userId)
                .get();
            
            // Clear existing contacts
            const contactsList = document.querySelector('.contacts-list');
            contactsList.innerHTML = '';
            
            if (chatsSnapshot.empty) {
                // No chats found, show empty state
                showEmptyChatsState(contactsList);
                return;
            }
            
            // Process each chat
            const chats = [];
            for (const doc of chatsSnapshot.docs) {
                const chatData = doc.data();
                const otherUserId = chatData.participants.find(id => id !== userId);
                
                // Get the other user's info
                const otherUserDoc = await firebase.firestore().collection('users').doc(otherUserId).get();
                const otherUserData = otherUserDoc.data();
                
                // Get unread message count
                let unreadCount = 0;
                try {
                    const unreadMessagesQuery = await firebase.firestore()
                        .collection('chats')
                        .doc(doc.id)
                        .collection('messages')
                        .where('senderId', '==', otherUserId)
                        .where('read', '==', false)
                        .get();
                    
                    unreadCount = unreadMessagesQuery.size;
                } catch (error) {
                    console.error('Error getting unread count:', error);
                }
                
                // Get the last message
                const lastMessageQuery = await firebase.firestore()
                    .collection('chats')
                    .doc(doc.id)
                    .collection('messages')
                    .orderBy('timestamp', 'desc')
                    .limit(1)
                    .get();
                
                let lastMessage = {
                    text: 'No messages yet',
                    timestamp: new Date()
                };
                
                if (!lastMessageQuery.empty) {
                    const messageData = lastMessageQuery.docs[0].data();
                    lastMessage = {
                        text: messageData.text,
                        timestamp: messageData.timestamp?.toDate() || new Date(),
                        senderId: messageData.senderId,
                        read: messageData.read
                    };
                }
                
                chats.push({
                    id: doc.id,
                    otherUser: {
                        id: otherUserId,
                        name: otherUserData?.fullName || otherUserData?.name || otherUserData?.displayName || 'User',
                        photoURL: otherUserData?.photoURL || null,
                        status: otherUserData?.status || 'offline'
                    },
                    lastMessage,
                    unreadCount
                });
            }
            
            // Sort chats by last message time
            chats.sort((a, b) => b.lastMessage.timestamp - a.lastMessage.timestamp);
            
            // Create HTML for each chat
            chats.forEach((chat, index) => {
                const contactItem = createContactElement(chat, userId);
                contactsList.appendChild(contactItem);
                
                // CHANGE: Remove auto-selection of first contact
                // Instead, show the empty state by default
                
                // Add click handler
                contactItem.addEventListener('click', () => {
                    // Remove active class from all contacts
                    document.querySelectorAll('.contact-item').forEach(item => item.classList.remove('active'));
                    // Add active class to clicked contact
                    contactItem.classList.add('active');
                    
                    // Load the chat
                    loadChat(chat.id, chat.otherUser);
                    
                    // On mobile, show the messages section
                    if (window.innerWidth <= 768) {
                        showMessages();
                    }
                });
            });
            
            // Show empty message state since no chat is selected by default
            showEmptyMessagesState();
            
            // Set up real-time listeners for preview updates
            setupChatPreviewListeners(userId);
            
        } catch (error) {
            console.error('Error loading chats:', error);
            const contactsList = document.querySelector('.contacts-list');
            showEmptyChatsState(contactsList);
        }
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
        // Check if chat object is valid
        if (!chat || !chat.otherUser) {
            console.error("Invalid chat object provided to createContactElement");
            return;
        }
        
        // Format timestamp
        const timestamp = chat.lastMessage && chat.lastMessage.timestamp 
            ? formatTimestamp(chat.lastMessage.timestamp) 
            : '';
        
        // For message preview text
        let previewText = chat.lastMessage?.text || 'No messages yet';
        
        // Handle image messages in preview
        if (previewText.includes('<img')) {
            previewText = '📷 Image';
        } else if (previewText.length > 30) {
            // Truncate long messages
            previewText = previewText.substring(0, 30) + '...';
        }
        
        // Add "You: " prefix for messages sent by current user
        if (chat.lastMessage && chat.lastMessage.senderId === currentUserId) {
            previewText = 'You: ' + previewText;
        }
        
        // Create contact element
        const contactItem = document.createElement('div');
        contactItem.className = 'contact-item';
        contactItem.dataset.chatId = chat.id;
        
        // Get default avatar if no photo URL
        const avatarSrc = chat.otherUser.photoURL || getDefaultAvatar(chat.otherUser.id, chat.otherUser.name);
        
        // Determine if we should show the unread count
        // Only show for messages from the other user that aren't read
        const shouldShowUnread = chat.unreadCount > 0;
        
        contactItem.innerHTML = `
            <div class="contact-avatar">
                <img src="${avatarSrc}" alt="${chat.otherUser.name}">
                <span class="status-indicator ${chat.otherUser.status}"></span>
            </div>
            <div class="contact-info">
                <div class="contact-name-time">
                    <h3 class="contact-name">${chat.otherUser.name}</h3>
                    <span class="contact-time">${timestamp}</span>
                </div>
                <div class="contact-preview">
                    <p>${previewText}</p>
                    ${shouldShowUnread ? `<span class="unread-count">${chat.unreadCount}</span>` : ''}
                </div>
            </div>
        `;
        
        return contactItem;
    }
    
    // Load a chat from Firebase
    function loadChat(chatId, contact) {
        // Check if chatId and contact are valid
        if (!chatId || !contact) {
            console.error("Invalid chatId or contact provided to loadChat");
            return;
        }
        
        currentChatId = chatId;
        currentContact = contact;
        
        // Update chat header with contact info
        const header = document.querySelector('.chat-header');
        header.querySelector('.contact-details h3').textContent = contact.name;
        header.querySelector('.contact-details p').textContent = contact.status || 'Offline';
        
        const contactAvatar = header.querySelector('.contact-avatar img');
        const avatarSrc = contact.photoURL || getDefaultAvatar(contact.id, contact.name);
        contactAvatar.src = avatarSrc;
        contactAvatar.style.display = 'block';
        
        const statusIndicator = header.querySelector('.status-indicator');
        statusIndicator.className = 'status-indicator';
        statusIndicator.classList.add(contact.status || 'offline');
        
        // Clear messages container
        const messagesContainer = document.querySelector('.messages-container');
        messagesContainer.innerHTML = '';
        
        // Add a chat date
        const dateDiv = document.createElement('div');
        dateDiv.className = 'chat-date';
        dateDiv.textContent = 'Today';
        messagesContainer.appendChild(dateDiv);
        
        // We're removing the typing indicator element from the messages area
        // but keeping it in the header and contact list
        
        // Track message IDs to prevent duplicates
        window.loadedMessageIds = new Set();
        
        // Set up real-time listener for messages
        const messagesRef = firebase.firestore()
            .collection('chats')
            .doc(chatId)
            .collection('messages')
            .orderBy('timestamp', 'asc');
        
        // Store the unsubscribe function to clean up later
        if (window.currentMessageListener) {
            window.currentMessageListener();
        }
        
        window.currentMessageListener = messagesRef.onSnapshot(snapshot => {
            // Process new messages
            snapshot.docChanges().forEach(change => {
                if (change.type === 'added') {
                    const messageId = change.doc.id;
                    
                    // Only add the message if it hasn't been added before
                    // Use window.loadedMessageIds to check for temp IDs too
                    if (!window.loadedMessageIds.has(messageId)) {
                        window.loadedMessageIds.add(messageId);
                        const message = change.doc.data();
                        
                        // Check if this is a message we sent and is still displayed as a temp message
                        if (message.senderId === currentUserID) {
                            // Look for temp messages that might match this one
                            const tempMessages = document.querySelectorAll('.message.sent');
                            let tempFound = false;
                            
                            for (const tempMsg of tempMessages) {
                                const tempId = tempMsg.id.replace('message-', '');
                                // If it's a temp message
                                if (tempId.startsWith('temp-')) {
                                    // Get the text content
                                    const textElement = tempMsg.querySelector('p');
                                    if (textElement && textElement.textContent === message.text) {
                                        // This is probably the same message, replace the ID
                                        tempMsg.id = `message-${messageId}`;
                                        
                                        // Update the status icon to "sent"
                                        const statusElement = tempMsg.querySelector('.message-status');
                                        if (statusElement) {
                                            statusElement.innerHTML = '<i class="fas fa-check"></i>';
                                            statusElement.setAttribute('data-status', 'sent');
                                        }
                                        
                                        // Remove the temp ID from our records
                                        window.loadedMessageIds.delete(tempId);
                                        window.loadedMessageIds.add(messageId);
                                        
                                        tempFound = true;
                                        break;
                                    }
                                }
                            }
                            
                            // If no temp message was found, add it normally
                            if (!tempFound) {
                                addMessageToUI(messageId, message, currentUserID);
                            }
                        } else {
                            // Not our message, add normally
                            addMessageToUI(messageId, message, currentUserID);
                            
                            // Update the contact preview for messages from others
                            if (message.senderId !== currentUserID) {
                                updateContactPreview(chatId, message.text);
                            }
                        }
                    }
                }
                else if (change.type === 'modified') {
                    // Update an existing message (for edits or status changes)
                    const messageId = change.doc.id;
                    const message = change.doc.data();
                    updateMessageInUI(messageId, message);
                }
                else if (change.type === 'removed') {
                    // Remove the message from UI
                    const messageId = change.doc.id;
                    const messageElement = document.getElementById(`message-${messageId}`);
                    if (messageElement) {
                        // Add fade-out animation before removing
                        messageElement.classList.add('fade-out');
                        setTimeout(() => {
                            messageElement.remove();
                            window.loadedMessageIds.delete(messageId);
                        }, 300);
                    }
                }
            });
            
            // Scroll to bottom if we're already at the bottom
            if (isUserAtBottom()) {
                scrollToBottom();
            }
            
            // Mark messages as read
            markMessagesAsRead(chatId, currentUserID);
        });
        
        // Set up typing indicator listener
        setupTypingIndicator(chatId, contact);
    }
    
    // Update existing message in the UI (for edits or status changes)
    function updateMessageInUI(messageId, message) {
        const messageElement = document.getElementById(`message-${messageId}`);
        if (!messageElement) return;
        
        // Update message text if edited
        const messageParagraph = messageElement.querySelector('p');
        if (messageParagraph && message.text) {
            messageParagraph.innerHTML = message.text;
        }
        
        // Update edited status if needed
        if (message.edited) {
            const messageInfo = messageElement.querySelector('.message-info');
            let editedSpan = messageElement.querySelector('.message-edited');
            
            if (!editedSpan && messageInfo) {
                editedSpan = document.createElement('span');
                editedSpan.className = 'message-edited';
                editedSpan.textContent = 'Edited';
                messageInfo.appendChild(editedSpan);
            }
        }
        
        // Update read status if applicable
        if (message.read && message.senderId === currentUserID) {
            let readIndicator = messageElement.querySelector('.read-indicator');
            
            if (!readIndicator) {
                const messageInfo = messageElement.querySelector('.message-info');
                if (messageInfo) {
                    readIndicator = document.createElement('span');
                    readIndicator.className = 'read-indicator';
                    readIndicator.innerHTML = '<i class="fas fa-check-double"></i>';
                    messageInfo.appendChild(readIndicator);
                }
            }
        }
    }
    
    // Check if user is at the bottom of the messages container
    function isUserAtBottom() {
        const container = messagesContainer;
        const tolerance = 100; // pixels from bottom to consider as "at bottom"
        return container.scrollHeight - container.scrollTop - container.clientHeight < tolerance;
    }
    
    // Add a message to the UI
    function addMessageToUI(messageId, message, currentUserId) {
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
                    ${editedInfo}
                    ${messageStatus}
                </div>
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
        
        // Get messages container
        const messagesContainer = document.querySelector('.messages-container');
        if (!messagesContainer) return;
        
        messagesContainer.appendChild(messageDiv);
        
        // Add message appear animation
        messageDiv.classList.add('message-appear');
        setTimeout(() => messageDiv.classList.remove('message-appear'), 300);
        
        // Add event listeners for message actions
        if (isSentByCurrentUser) {
            const actionBtn = messageDiv.querySelector('.message-action-btn');
            const actionMenu = messageDiv.querySelector('.message-action-menu');
            const editBtn = messageDiv.querySelector('.message-action-item.edit');
            const deleteBtn = messageDiv.querySelector('.message-action-item.delete');
            
            // Toggle menu visibility when clicking the action button
            actionBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                actionMenu.classList.toggle('show');
                
                // Close other open menus
                document.querySelectorAll('.message-action-menu.show').forEach(menu => {
                    if (menu !== actionMenu) {
                        menu.classList.remove('show');
                    }
                });
            });
            
            // Close menu when clicking outside
            document.addEventListener('click', () => {
                actionMenu.classList.remove('show');
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
        
        // Update the contact preview if this is a new received message
        if (!isSentByCurrentUser && !isTemp) {
            updateContactPreview(currentChatId, message.text);
        }
    }
    
    // Variables for message editing
    let editingOriginalText = null;

    // Start editing a message
    function startEditingMessage(messageId, message) {
        // Get the main message input
        const messageInput = document.querySelector('.message-input input');
        const sendBtn = document.querySelector('.send-btn');
        
        // Switch to edit mode
        isEditingMessage = true;
        editingMessageId = messageId;
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
        const messageElement = document.getElementById(`message-${messageId}`);
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
                    const messageInfo = messageElement.querySelector('.message-info');
                    const editedSpan = document.createElement('span');
                    editedSpan.className = 'message-edited';
                    editedSpan.textContent = 'Edited';
                    messageInfo.appendChild(editedSpan);
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
            
            await firebase.firestore()
                .collection('chats')
                .doc(currentChatId)
                .collection('messages')
                .doc(messageId)
                .delete();
            
            console.log('Message deleted successfully');
            
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
            
            // Update the temporary message with the real ID and status
            const tempElement = document.getElementById(`message-${tempId}`);
            if (tempElement) {
                tempElement.id = `message-${messageRef.id}`;
                
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
            await firebase.firestore()
                .collection('chats')
                .doc(currentChatId)
                .update({
                    lastMessage: text,
                    lastMessageTime: firebase.firestore.FieldValue.serverTimestamp(),
                    lastMessageSender: currentUserID
                });
            
        } catch (error) {
            console.error('Error sending message:', error);
            
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
            
            showToast('Failed to send message', 'error');
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
        
        // Scroll to the bottom of messages
        scrollToBottom();
    }
    
    // Helper function to scroll to bottom of messages
    function scrollToBottom() {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
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
        const existingContacts = document.querySelectorAll('.contact-item');
        
        existingContacts.forEach(contact => {
            contact.addEventListener('click', function() {
                // Remove active class from all contacts
                existingContacts.forEach(item => item.classList.remove('active'));
                // Add active class to clicked contact
                this.classList.add('active');
                
                // Get contact ID
                const contactId = this.getAttribute('data-contact');
                
                // If this is a real contact (not a demo contact)
                if (contactId && !contactId.startsWith('demo')) {
                    // Find the chat for this contact
                    firebase.firestore().collection('chats').doc(contactId).get()
                        .then(doc => {
                            if (doc.exists) {
                                const chatData = doc.data();
                                const otherUserId = chatData.participants.find(id => id !== currentUserID);
                                
                                // Get the other user's info
                                firebase.firestore().collection('users').doc(otherUserId).get()
                                    .then(userDoc => {
                                        if (userDoc.exists) {
                                            const userData = userDoc.data();
                                            
                                            // Create contact object
                                            const contact = {
                                                id: otherUserId,
                                                name: userData.fullName || userData.name || userData.displayName || 'User',
                                                photoURL: userData.photoURL || null,
                                                status: userData.status || 'offline'
                                            };
                                            
                                            // Load the chat
                                            loadChat(contactId, contact);
                                            
                                            // On mobile, show the messages section
                                            if (window.innerWidth <= 768) {
                                                showMessages();
                                            }
                                        }
                                    });
                            }
                        })
                        .catch(error => {
                            console.error('Error getting contact info:', error);
                        });
                }
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

    // Initialize the chat UI
    function initializeChatsUI() {
        // Set up permissions and load data
        setupFirebasePermissions(currentUserID);
        loadUserChats(currentUserID);
        
        // Set up presence monitoring
        setupPresenceTracking(currentUserID);
        
        // Add click handlers for existing static contact items (for demo purposes)
        addContactClickHandlers();
        
        // Set up new chat button click handler
        setupNewChatButton();
        
        // Make sure to show empty state initially
        showEmptyMessagesState();
        
        // Check for pending chat requests (from failed attempts)
        checkPendingChatRequests();
    }
    
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
        // Only setup if we have a valid chat ID and contact
        if (!chatId || !contact) return;
        
        const typingRef = firebase.firestore()
            .collection('chats')
            .doc(chatId)
            .collection('typing');
        
        // Listen for typing status updates
        if (window.typingIndicatorListener) {
            window.typingIndicatorListener();
        }
        
        window.typingIndicatorListener = typingRef.onSnapshot(snapshot => {
            snapshot.docChanges().forEach(change => {
                if (change.type === 'added' || change.type === 'modified') {
                    const typingData = change.doc.data();
                    
                    // If the other user is typing
                    if (typingData.userId === contact.id && typingData.isTyping) {
                        showTypingIndicator(contact.name);
                    } else if (typingData.userId === contact.id && !typingData.isTyping) {
                        hideTypingIndicator();
                    }
                }
                
                if (change.type === 'removed' && change.doc.id === contact.id) {
                    hideTypingIndicator();
                }
            });
        });
        
        // Setup input listener to update our typing status
        setupTypingUpdates(chatId);
    }
    
    // Show typing indicator in the UI
    function showTypingIndicator(name) {
        // We're no longer showing the typing indicator in messages area
        // We only update the header and contacts list
        
        // Update the contact's status in the chat header to show "typing..."
        if (currentContact && currentContact.name === name) {
            const header = document.querySelector('.chat-header');
            const statusText = header.querySelector('.contact-details p');
            if (statusText) {
                statusText.textContent = 'typing...';
                statusText.classList.add('typing-text');
            }
        }
        
        // Also update typing status in contacts list
        updateContactTypingStatus(name, true);
    }
    
    // Hide typing indicator
    function hideTypingIndicator() {
        // We're no longer hiding the typing indicator in messages area
        // We only update the header and contacts list
        
        // Reset the contact's status in the chat header
        if (currentContact) {
            const header = document.querySelector('.chat-header');
            const statusText = header.querySelector('.contact-details p');
            if (statusText) {
                statusText.textContent = currentContact.status || 'Offline';
                statusText.classList.remove('typing-text');
            }
        }
        
        // Also update typing status in contacts list
        if (currentContact) {
            updateContactTypingStatus(currentContact.name, false);
        }
    }
    
    // Update typing status in the contacts list
    function updateContactTypingStatus(name, isTyping) {
        const contactItems = document.querySelectorAll('.contact-item');
        
        contactItems.forEach(contactItem => {
            const contactName = contactItem.querySelector('.contact-name');
            if (contactName && contactName.textContent === name) {
                const previewText = contactItem.querySelector('.contact-preview p');
                
                if (previewText) {
                    if (isTyping) {
                        // Store the original preview text if not already saved
                        if (!contactItem.dataset.originalPreview) {
                            contactItem.dataset.originalPreview = previewText.textContent;
                        }
                        previewText.textContent = 'typing...';
                        previewText.classList.add('typing-text');
                    } else {
                        // Restore original preview text if available
                        if (contactItem.dataset.originalPreview) {
                            previewText.textContent = contactItem.dataset.originalPreview;
                            delete contactItem.dataset.originalPreview;
                        }
                        previewText.classList.remove('typing-text');
                    }
                }
                
                // Also update status indicator
                const statusIndicator = contactItem.querySelector('.status-indicator');
                if (statusIndicator) {
                    if (isTyping) {
                        // Add typing class (will be styled with animation)
                        statusIndicator.classList.add('typing');
                    } else {
                        // Remove typing class
                        statusIndicator.classList.remove('typing');
                    }
                }
            }
        });
    }
    
    // Let's add a debounce function to limit how often we update typing status
    function debounce(func, wait) {
        let timeout;
        return function() {
            const context = this;
            const args = arguments;
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(context, args), wait);
        };
    }
    
    // Setup events to update our typing status
    function setupTypingUpdates(chatId) {
        if (!chatId || !currentUserID) return;
        
        const messageInput = document.querySelector('.message-input input');
        let isTyping = false;
        
        const updateTypingStatus = debounce(async (typing) => {
            if (isTyping === typing) return; // No change
            
            isTyping = typing;
            
            try {
                const typingRef = firebase.firestore()
                    .collection('chats')
                    .doc(chatId)
                    .collection('typing')
                    .doc(currentUserID);
                
                await typingRef.set({
                    userId: currentUserID,
                    isTyping: typing,
                    timestamp: firebase.firestore.FieldValue.serverTimestamp()
                });
            } catch (error) {
                console.error('Error updating typing status:', error);
                // Silently fail - typing indicator is not critical
            }
        }, 500);
        
        // Process keyup events to detect typing
        messageInput.addEventListener('keyup', () => {
            const isCurrentlyTyping = messageInput.value.trim().length > 0;
            updateTypingStatus(isCurrentlyTyping);
        });
        
        // When focus is lost, always set to not typing
        messageInput.addEventListener('blur', () => {
            updateTypingStatus(false);
        });
        
        // Clear typing status when message is sent
        const sendBtn = document.querySelector('.send-btn');
        sendBtn.addEventListener('click', () => {
            updateTypingStatus(false);
        });
    }

    // Helper function to add CSS to the page
    function addStyleToPage(css) {
        const style = document.createElement('style');
        style.textContent = css;
        document.head.appendChild(style);
    }
    
    // Add new styles for real-time features
    addStyleToPage(`
        /* Typing indicator */
        .typing-indicator {
            display: flex;
            align-items: center;
            margin: 10px 15px;
            animation: fadeIn 0.3s ease;
            color: var(--text-secondary);
        }
        
        .typing-bubble {
            display: flex;
            align-items: center;
            background-color: var(--bg-secondary);
            padding: 8px 12px;
            border-radius: 18px;
            margin-right: 8px;
            height: 24px;
        }
        
        .typing-dot {
            height: 8px;
            width: 8px;
            border-radius: 50%;
            background-color: var(--text-secondary);
            margin: 0 2px;
            animation: typingAnimation 1.5s infinite ease-in-out;
        }
        
        .typing-dot:nth-child(1) { animation-delay: 0s; }
        .typing-dot:nth-child(2) { animation-delay: 0.2s; }
        .typing-dot:nth-child(3) { animation-delay: 0.4s; }
        
        @keyframes typingAnimation {
            0% { transform: scale(1); opacity: 0.6; }
            50% { transform: scale(1.2); opacity: 1; }
            100% { transform: scale(1); opacity: 0.6; }
        }
        
        /* Typing text styling */
        .typing-text {
            color: #2196F3 !important;
            font-style: italic;
        }
        
        /* Status indicator when typing */
        .status-indicator.typing {
            background-color: #2196F3 !important;
            box-shadow: 0 0 0 2px rgba(33, 150, 243, 0.3);
            animation: typingPulse 1.5s infinite;
        }
        
        @keyframes typingPulse {
            0% { transform: scale(1); }
            50% { transform: scale(1.2); }
            100% { transform: scale(1); }
        }
        
        /* Message animations */
        .message {
            animation: messageAppear 0.3s ease;
            transition: opacity 0.3s, transform 0.3s;
        }
        
        .message.fade-out {
            opacity: 0;
            transform: translateY(10px);
        }
        
        @keyframes messageAppear {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }
        
        /* Read indicators */
        .read-indicator {
            color: #4caf50;
            margin-left: 5px;
            font-size: 12px;
        }
        
        /* Message status indicators */
        .message-status {
            margin-left: 5px;
            font-size: 12px;
        }
        
        .message-status[data-status="sending"] {
            color: #999;
        }
        
        .message-status[data-status="sent"] {
            color: #2196F3;
        }
        
        .message-status[data-status="read"] {
            color: #4CAF50;
        }
        
        .message-status[data-status="error"] {
            color: #F44336;
        }
        
        /* Improve scrolling */
        .messages-container {
            scroll-behavior: smooth;
        }
        
        /* Message appear animation */
        .message-appear {
            animation: messageAppear 0.3s ease;
        }
        
        /* Unread count styles */
        .unread-count {
            background-color: #FF5252;
            color: white;
            font-size: 12px;
            font-weight: bold;
            min-width: 18px;
            height: 18px;
            border-radius: 9px;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 0 5px;
            margin-left: 8px;
            box-shadow: 0 1px 2px rgba(0,0,0,0.2);
            animation: pulse 1s infinite;
        }
        
        @keyframes pulse {
            0% { transform: scale(1); }
            50% { transform: scale(1.05); }
            100% { transform: scale(1); }
        }
    `);

    // New function to update the contact preview in the contacts list
    function updateContactPreview(chatId, messageText, isSent = false) {
        if (!chatId || !messageText) return;
        
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
        
        // Move this contact to the top of the list if it's not already
        const contactsList = document.querySelector('.contacts-list');
        if (contactsList && contactsList.firstChild !== contactItem) {
            contactsList.insertBefore(contactItem, contactsList.firstChild);
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
        
        // Move this contact to the top of the list if it's not already
        const contactsList = document.querySelector('.contacts-list');
        if (contactsList && contactsList.firstChild !== contactItem) {
            contactsList.insertBefore(contactItem, contactsList.firstChild);
        }
    }
    
    // Update unread count badge
    function updateUnreadCount(chatId, count) {
        const contactItem = document.querySelector(`.contact-item[data-chat-id="${chatId}"]`);
        if (!contactItem) return;
        
        const unreadBadge = contactItem.querySelector('.unread-count');
        const previewContainer = contactItem.querySelector('.contact-preview');
        
        // If we already have a badge
        if (unreadBadge) {
            if (count > 0) {
                // Update count
                unreadBadge.textContent = count;
            } else {
                // Remove badge if count is 0
                unreadBadge.remove();
            }
        } 
        // If we need to add a badge
        else if (count > 0 && previewContainer) {
            const newBadge = document.createElement('span');
            newBadge.className = 'unread-count';
            newBadge.textContent = count;
            previewContainer.appendChild(newBadge);
        }
        
        // If this is the currently open chat, mark messages as read
        if (contactItem.classList.contains('active') && currentChatId === chatId) {
            markMessagesAsRead(chatId, currentUserID);
        }
    }
});
