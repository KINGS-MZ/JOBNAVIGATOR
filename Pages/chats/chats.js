// Theme toggle functionality
document.addEventListener('DOMContentLoaded', () => {
    const themeToggle = document.getElementById('theme-toggle');
    const htmlEl = document.documentElement;
    const bodyEl = document.body;
    
    if (themeToggle) {
        const moonIcon = themeToggle.querySelector('.moon-icon');
        const sunIcon = themeToggle.querySelector('.sun-icon');
        
        // Check for saved theme preference or respect OS preference
        const savedTheme = localStorage.getItem('theme');
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        
        if (moonIcon && sunIcon) {
            if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
                htmlEl.classList.add('dark-mode');
                bodyEl.classList.add('dark-mode');
                moonIcon.style.opacity = '0';
                sunIcon.style.opacity = '1';
            } else {
                moonIcon.style.opacity = '1';
                sunIcon.style.opacity = '0';
            }
            
            themeToggle.addEventListener('click', () => {
                htmlEl.classList.toggle('dark-mode');
                bodyEl.classList.toggle('dark-mode');
                
                if (htmlEl.classList.contains('dark-mode')) {
                    moonIcon.style.opacity = '0';
                    sunIcon.style.opacity = '1';
                    localStorage.setItem('theme', 'dark');
                } else {
                    moonIcon.style.opacity = '1';
                    sunIcon.style.opacity = '0';
                    localStorage.setItem('theme', 'light');
                }
            });
        }
    }
    
    // User dropdown menu toggle
    const userBtn = document.getElementById('user-menu-btn');
    const dropdownMenu = document.getElementById('user-dropdown');
    
    if (userBtn && dropdownMenu) {
        userBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdownMenu.classList.toggle('show');
        });
        
        document.addEventListener('click', (e) => {
            if (!dropdownMenu.contains(e.target) && !userBtn.contains(e.target)) {
                dropdownMenu.classList.remove('show');
            }
        });
    }

    // Chat details panel close button
    const closeDetailsBtn = document.getElementById('close-details-btn');
    if (closeDetailsBtn) {
        closeDetailsBtn.addEventListener('click', () => {
            closeChatDetails();
        });
    }

    // Backdrop click to close details
    const detailsBackdrop = document.getElementById('details-backdrop');
    if (detailsBackdrop) {
        detailsBackdrop.addEventListener('click', () => {
            closeChatDetails();
        });
    }

    // Mobile chat functionality - UI only
    const friendsList = document.getElementById('friends-list');
    const messagesSection = document.getElementById('messages-section');
    const backBtn = document.getElementById('back-btn');
    const navbar = document.querySelector('nav');
    const bottomNav = document.querySelector('.bottom-nav');
    
    // Function to show messages section (for mobile)
    function showMessages() {
        friendsList.classList.add('hidden');
        messagesSection.classList.add('active');
        
        // On mobile, hide navbar and bottom nav for immersive chat
        if (window.innerWidth <= 768) {
            navbar.classList.add('hidden');
            bottomNav.classList.add('hidden');
            document.body.classList.add('chat-open');
        }
    }
    
    // Function to show contacts list (for mobile)
    function showContacts() {
        friendsList.classList.remove('hidden');
        messagesSection.classList.remove('active');
        
        // Show navbar and bottom nav again
        navbar.classList.remove('hidden');
        bottomNav.classList.remove('hidden');
        document.body.classList.remove('chat-open');
    }
    
    // Add click event to back button
    backBtn.addEventListener('click', showContacts);
    
    // Check window size on resize
    window.addEventListener('resize', () => {
        if (window.innerWidth > 768) {
            friendsList.classList.remove('hidden');
            messagesSection.classList.remove('active');
            navbar.classList.remove('hidden');
            bottomNav.classList.remove('hidden');
            document.body.classList.remove('chat-open');
        }
    });

    // Bottom navigation functionality
    function updateNavigation() {
        const bottomNav = document.querySelector('.bottom-nav');
        
        if (window.innerWidth <= 768) {
            // Mobile view: show bottom nav
            bottomNav.style.display = 'flex';
        } else {
            // Desktop view: hide bottom nav
            bottomNav.style.display = 'none';
        }
    }
    
    // Check on load
    updateNavigation();
    
    // Also update on window resize
    window.addEventListener('resize', updateNavigation);
});

// Emoji Picker Functionality
document.addEventListener('DOMContentLoaded', function() {
    const emojiBtn = document.getElementById('emoji-btn');
    const emojiPicker = document.getElementById('emoji-picker');
    const closeEmojiPickerBtn = document.getElementById('close-emoji-picker');
    const emojiList = document.getElementById('emoji-list');
    const emojiCategories = document.querySelectorAll('.emoji-category');
    const messageInput = document.querySelector('.message-input input');
    const emojiSearchInput = document.getElementById('emoji-search-input');

    // Emoji collections by category
    const emojis = {
        smileys: ['😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃', '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😙', '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔', '🤐', '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '🤥', '😌', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕'],
        animals: ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🐔', '🐧', '🐦', '🐤', '🦆', '🦅', '🦉', '🦇', '🐺', '🐗', '🐴', '🦄', '🐝', '🐛', '🦋', '🐌', '🐞', '🐜', '🦟', '🦗', '🕷', '🕸', '🦂', '🐢', '🐍', '🦎', '🦖', '🦕'],
        food: ['🍎', '🍐', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🍈', '🍒', '🍑', '🥭', '🍍', '🥥', '🥝', '🍅', '🥑', '🍆', '🥔', '🥕', '🌽', '🌶️', '🥒', '🥬', '🥦', '🧄', '🧅', '🥜', '🌰', '🍞', '🥐', '🥖', '🥨', '🥯', '🥞', '🧇', '🧀', '🍖', '🍗', '🥩', '🥓'],
        activities: ['⚽', '🏀', '🏈', '⚾', '🥎', '🎾', '🏐', '🏉', '🥏', '🎱', '🏓', '🏸', '🏒', '🏑', '🥍', '🏏', '🥅', '⛳', '🏹', '🎣', '🤿', '🥊', '🥋', '🎽', '🛹', '🛼', '🛷', '⛸️', '🥌', '🎿', '⛷️', '🏂', '🪂', '🏋️', '🤼', '🤸', '⛹️', '🤺'],
        travel: ['🚗', '🚕', '🚙', '🚌', '🚎', '🏎️', '🚓', '🚑', '🚒', '🚐', '🚚', '🚛', '🚜', '🛴', '🚲', '🛵', '🏍️', '🚨', '🚔', '🚍', '🚘', '🚖', '🚡', '🚠', '🚟', '🚃', '🚋', '🚞', '🚝', '🚄', '🚅', '🚈', '🚂', '🚆', '🚇', '🚊', '🚉', '🛩️', '✈️'],
        objects: ['💡', '🔦', '🕯️', '📔', '📕', '📖', '📗', '📘', '📙', '📚', '📓', '📒', '📃', '📜', '📄', '📰', '🗞️', '📑', '🔖', '🏷️', '💰', '💴', '💵', '💶', '💷', '💸', '💳', '🧾', '💹', '✉️', '📧', '📨', '📩', '📤', '📥', '📦', '📫', '📪', '📬'],
        symbols: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '☮️', '✝️', '☪️', '🕉️', '☸️', '✡️', '🔯', '🕎', '☯️', '☦️', '🛐', '⛎', '♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏'],
        flags: ['🏳️', '🏴', '🏁', '🚩', '🏳️‍🌈', '🏳️‍⚧️', '🇦🇨', '🇦🇩', '🇦🇪', '🇦🇫', '🇦🇬', '🇦🇮', '🇦🇱', '🇦🇲', '🇦🇴', '🇦🇶', '🇦🇷', '🇦🇸', '🇦🇹', '🇦🇺', '🇦🇼', '🇦🇽', '🇦🇿', '🇧🇦', '🇧🇧', '🇧🇩', '🇧🇪', '🇧🇫', '🇧🇬', '🇧🇭', '🇧🇮', '🇧🇯', '🇧🇱']
    };

    // Emoji names for search functionality
    const emojiNames = {
        smileys: ['grinning', 'smile', 'laughing', 'joy', 'smiley', 'happy', 'wink', 'blush', 'innocent', 'love', 'heart eyes', 'star struck', 'kiss', 'kissing', 'yum', 'tongue', 'crazy', 'money', 'hug', 'thinking', 'neutral', 'expressionless', 'no mouth', 'smirk', 'unamused', 'rolling eyes', 'grimacing', 'lying', 'relieved', 'sad', 'sleepy', 'drooling', 'sleeping', 'mask', 'sick', 'injured'],
        animals: ['dog', 'cat', 'mouse', 'hamster', 'rabbit', 'fox', 'bear', 'panda', 'koala', 'tiger', 'lion', 'cow', 'pig', 'frog', 'monkey', 'chicken', 'penguin', 'bird', 'duck', 'eagle', 'owl', 'bat', 'wolf', 'boar', 'horse', 'unicorn', 'bee', 'bug', 'butterfly', 'snail', 'lady bug', 'ant', 'mosquito', 'cricket', 'spider', 'web', 'scorpion', 'turtle', 'snake', 'lizard', 'dinosaur', 't-rex'],
        food: ['apple', 'pear', 'orange', 'lemon', 'banana', 'watermelon', 'grapes', 'strawberry', 'melon', 'cherries', 'peach', 'mango', 'pineapple', 'coconut', 'kiwi', 'tomato', 'avocado', 'eggplant', 'potato', 'carrot', 'corn', 'pepper', 'cucumber', 'leafy green', 'broccoli', 'garlic', 'onion', 'peanuts', 'chestnut', 'bread', 'croissant', 'baguette', 'pretzel', 'bagel', 'pancakes', 'waffle', 'cheese', 'meat', 'poultry', 'steak', 'bacon'],
        activities: ['soccer', 'basketball', 'football', 'baseball', 'softball', 'tennis', 'volleyball', 'rugby', 'frisbee', 'billiards', 'ping pong', 'badminton', 'hockey', 'field hockey', 'lacrosse', 'cricket', 'goal', 'golf', 'archery', 'fishing', 'diving', 'boxing', 'martial arts', 'running', 'skateboard', 'rollerskate', 'sled', 'ice skate', 'curling', 'ski', 'skier', 'snowboard', 'parachute', 'weight lifting', 'wrestling', 'gymnastics', 'basketball player', 'fencing'],
        travel: ['car', 'taxi', 'suv', 'bus', 'trolleybus', 'racing car', 'police car', 'ambulance', 'fire engine', 'minibus', 'truck', 'lorry', 'tractor', 'scooter', 'bicycle', 'motorbike', 'motorcycle', 'police light', 'police', 'oncoming bus', 'oncoming car', 'oncoming taxi', 'aerial tramway', 'mountain cable car', 'suspension railway', 'railway car', 'tram car', 'mountain railway', 'monorail', 'high-speed train', 'bullet train', 'light rail', 'locomotive', 'train', 'metro', 'tram', 'station', 'airplane', 'airplane small'],
        objects: ['light bulb', 'flashlight', 'candle', 'notebook cover', 'closed book', 'open book', 'green book', 'blue book', 'orange book', 'books', 'notebook', 'ledger', 'page', 'scroll', 'document', 'newspaper', 'rolled-up newspaper', 'bookmark', 'label', 'tag', 'money bag', 'yen', 'dollar', 'euro', 'pound', 'money with wings', 'credit card', 'receipt', 'chart', 'envelope', 'email', 'incoming envelope', 'envelope with arrow', 'outbox tray', 'inbox tray', 'package', 'closed mailbox', 'mailbox closed', 'mailbox open'],
        symbols: ['red heart', 'orange heart', 'yellow heart', 'green heart', 'blue heart', 'purple heart', 'black heart', 'white heart', 'brown heart', 'broken heart', 'heart exclamation', 'two hearts', 'revolving hearts', 'beating heart', 'growing heart', 'sparkling heart', 'cupid', 'gift heart', 'heart decoration', 'peace', 'cross', 'star and crescent', 'om', 'wheel of dharma', 'star of david', 'six pointed star', 'menorah', 'yin yang', 'orthodox cross', 'place of worship', 'ophiuchus', 'aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo', 'libra', 'scorpio'],
        flags: ['white flag', 'black flag', 'chequered flag', 'triangular flag', 'rainbow flag', 'transgender flag', 'ascension island', 'andorra', 'united arab emirates', 'afghanistan', 'antigua & barbuda', 'anguilla', 'albania', 'armenia', 'angola', 'antarctica', 'argentina', 'american samoa', 'austria', 'australia', 'aruba', 'åland islands', 'azerbaijan', 'bosnia', 'barbados', 'bangladesh', 'belgium', 'burkina faso', 'bulgaria', 'bahrain', 'burundi', 'benin', 'st. barthélemy']
    };

    // All emojis combined for search
    const allEmojis = Object.values(emojis).flat();
    const allEmojiNames = Object.values(emojiNames).flat();
    
    // Create a mapping between emoji names and emoji characters
    const emojiMapping = {};
    
    // For each category, map the name to the emoji
    Object.keys(emojis).forEach(category => {
        emojis[category].forEach((emoji, index) => {
            // Use the corresponding name if it exists, or use a default index-based name
            const name = emojiNames[category] && emojiNames[category][index] ? 
                         emojiNames[category][index] : `${category}_emoji_${index}`;
            
            // Some emoji names might refer to the same emoji, so we handle it as an array
            if (!emojiMapping[name]) {
                emojiMapping[name] = emoji;
            }
        });
    });

    // Toggle emoji picker
    emojiBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        emojiPicker.classList.toggle('active');
        
        // Position the emoji picker above the emoji button
        positionEmojiPicker();
        
        // Default to first category (smileys)
        if (emojiPicker.classList.contains('active')) {
            loadEmojiCategory('smileys');
            emojiSearchInput.value = '';
            emojiSearchInput.focus();
        }
    });

    // Position the emoji picker correctly
    function positionEmojiPicker() {
        const emojiButton = document.getElementById('emoji-btn');
        if (!emojiButton) return;
        
        // Get emoji button position
        const buttonRect = emojiButton.getBoundingClientRect();
        
        // Calculate position based on the emoji button's position
        const pickerWidth = parseInt(window.getComputedStyle(emojiPicker).width);
        const leftPosition = buttonRect.left + (buttonRect.width / 2) - (pickerWidth / 2);
        
        // Ensure the picker doesn't go off-screen on the left
        const adjustedLeft = Math.max(10, leftPosition);
        // Ensure the picker doesn't go off-screen on the right
        const rightEdge = adjustedLeft + pickerWidth;
        const finalLeft = rightEdge > window.innerWidth - 10 
            ? window.innerWidth - pickerWidth - 10 
            : adjustedLeft;
        
        // Position the picker above the button with some spacing
        emojiPicker.style.left = `${finalLeft}px`;
        emojiPicker.style.bottom = `${window.innerHeight - buttonRect.top + 10}px`;
        emojiPicker.style.position = 'fixed';
    }

    // Make the function available globally
    window.positionEmojiPicker = positionEmojiPicker;

    // Add resize event to reposition emoji picker when window is resized
    window.addEventListener('resize', function() {
        if (emojiPicker.classList.contains('active')) {
            positionEmojiPicker();
        }
    });

    // Close emoji picker
    closeEmojiPickerBtn.addEventListener('click', function() {
        emojiPicker.classList.remove('active');
    });

    // Click outside to close emoji picker
    document.addEventListener('click', function(e) {
        if (!emojiPicker.contains(e.target) && e.target !== emojiBtn) {
            emojiPicker.classList.remove('active');
        }
    });

    // Switch emoji categories
    emojiCategories.forEach(category => {
        category.addEventListener('click', function() {
            // Remove active class from all categories
            emojiCategories.forEach(cat => cat.classList.remove('active'));
            
            // Add active class to clicked category
            this.classList.add('active');
            
            // Load emojis for the selected category
            const categoryName = this.getAttribute('data-category');
            loadEmojiCategory(categoryName);
            
            // Clear search when switching categories
            emojiSearchInput.value = '';
        });
    });

    // Search emojis
    emojiSearchInput.addEventListener('input', function() {
        const searchTerm = this.value.toLowerCase().trim();
        
        if (searchTerm === '') {
            // If search is cleared, show the active category
            const activeCategory = document.querySelector('.emoji-category.active');
            if (activeCategory) {
                loadEmojiCategory(activeCategory.getAttribute('data-category'));
            } else {
                loadEmojiCategory('smileys');
            }
            return;
        }
        
        // Find emoji names that match the search term
        const foundEmojis = [];
        
        // Search through all emoji names
        allEmojiNames.forEach((name, index) => {
            if (name.toLowerCase().includes(searchTerm)) {
                // Find which category this name belongs to
                for (const category in emojiNames) {
                    const nameIndex = emojiNames[category].indexOf(name);
                    if (nameIndex !== -1 && emojis[category][nameIndex]) {
                        // Add the corresponding emoji to results
                        foundEmojis.push(emojis[category][nameIndex]);
                        break;
                    }
                }
            }
        });
        
        // Also search directly through emoji category names
        Object.keys(emojis).forEach(category => {
            if (category.toLowerCase().includes(searchTerm)) {
                // Add all emojis from this category
                foundEmojis.push(...emojis[category]);
            }
        });
        
        // Remove duplicates from the results
        const uniqueEmojis = [...new Set(foundEmojis)];
        
        // Display filtered results
        emojiList.innerHTML = '';
        
        if (uniqueEmojis.length === 0) {
            emojiList.innerHTML = '<div class="no-results">No emojis found</div>';
            return;
        }
        
        uniqueEmojis.forEach(emoji => {
            const emojiItem = document.createElement('div');
            emojiItem.classList.add('emoji-item');
            emojiItem.textContent = emoji;
            
            emojiItem.addEventListener('click', function() {
                insertEmoji(emoji);
            });
            
            emojiList.appendChild(emojiItem);
        });
    });

    // Load emojis for a specific category
    function loadEmojiCategory(category) {
        emojiList.innerHTML = '';
        
        emojis[category].forEach(emoji => {
            const emojiItem = document.createElement('div');
            emojiItem.classList.add('emoji-item');
            emojiItem.textContent = emoji;
            
            emojiItem.addEventListener('click', function() {
                insertEmoji(emoji);
            });
            
            emojiList.appendChild(emojiItem);
        });
    }

    // Insert emoji at cursor position in message input
    function insertEmoji(emoji) {
        const cursorPos = messageInput.selectionStart;
        const textBefore = messageInput.value.substring(0, cursorPos);
        const textAfter = messageInput.value.substring(cursorPos);
        
        messageInput.value = textBefore + emoji + textAfter;
        
        // Move cursor position after the inserted emoji
        const newCursorPos = cursorPos + emoji.length;
        messageInput.setSelectionRange(newCursorPos, newCursorPos);
        
        // Focus back on input but keep emoji picker open
        messageInput.focus();
    }

    // Initialize with smileys category
    loadEmojiCategory('smileys');
});

// Global variables to store media listeners for cleanup
let mediaListener = null;
let filesListener = null;
let linksListener = null;
    
// Function to load shared media
function loadSharedMedia(chatId) {
    const mediaGrid = document.querySelector('.shared-media-grid');
    if (!mediaGrid) return;
    
    try {
        console.log("Setting up real-time listener for images in chat:", chatId);
        
        // Clean up existing listener if any
        if (mediaListener) {
            mediaListener();
            mediaListener = null;
        }
        
        // Set up real-time listener for messages with images
        mediaListener = firebase.firestore()
            .collection('chats')
            .doc(chatId)
            .collection('messages')
            .orderBy('timestamp', 'desc')
            .limit(50) // Increased limit to check for more images
            .onSnapshot((snapshot) => {
                console.log("Real-time media update received");
        
        // Filter for messages with image URLs after retrieval
        const imageMessages = [];
                snapshot.forEach(doc => {
            const message = doc.data();
            
            // Look for image URLs in various possible fields
            if ((message.type === 'image') || 
                (message.imageUrl) || 
                (message.content && (
                    message.content.includes('http') && 
                    (message.content.includes('.jpg') || 
                     message.content.includes('.jpeg') || 
                     message.content.includes('.png') || 
                     message.content.includes('.gif'))
                ))) {
                imageMessages.push(doc);
            }
        });
        
        console.log("Filtered image messages found:", imageMessages.length);
        
        // Clear existing content first
        mediaGrid.innerHTML = '';
        
                // Show/hide appropriate containers
                const emptyMediaContainer = document.querySelector('.chat-details-section:first-of-type .empty-state-container');
                if (emptyMediaContainer) {
        if (imageMessages.length === 0) {
                        emptyMediaContainer.style.display = 'flex';
            return;
                    } else {
                        emptyMediaContainer.style.display = 'none';
                    }
        }
        
        // Calculate how many images to show
        const showSeeMore = imageMessages.length > 5;
        const imagesToShow = imageMessages.slice(0, showSeeMore ? 5 : 5);
        
        // Add actual images to the grid
        imagesToShow.forEach(doc => {
            const message = doc.data();
            const mediaItem = document.createElement('div');
            mediaItem.className = 'shared-media-item';
            
            // Create image element
            const img = document.createElement('img');
            
            // Determine the image URL from available fields
            const imageUrl = message.imageUrl || 
                             (message.content && message.content.includes('http') ? message.content : null);
            
            if (!imageUrl) {
                console.log("No image URL found in message:", message);
                return;
            }
            
            img.src = imageUrl;
            img.alt = 'Shared image';
            img.loading = 'lazy';
            
            // Add click event to view full image
            mediaItem.addEventListener('click', () => {
                // You could implement a lightbox or modal here
                window.open(imageUrl, '_blank');
            });
            
            mediaItem.appendChild(img);
            mediaGrid.appendChild(mediaItem);
        });
        
        // Add "See More" button as the last item in the grid if there are more than 5 images
        if (showSeeMore) {
            const seeMoreItem = document.createElement('div');
            seeMoreItem.className = 'shared-media-item see-more-item';
            
            // Check for dark mode
            const isDarkMode = document.documentElement.classList.contains('dark-mode');
            
            seeMoreItem.style.cssText = `
                background-color: ${isDarkMode ? '#2c3e50' : '#f2f2f2'};
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                transition: background-color 0.2s ease;
            `;
            
            // Calculate remaining images count
            const remainingCount = imageMessages.length - 5;
            
            // Simple + sign and count
            seeMoreItem.innerHTML = `
                <span style="font-size: 18px; font-weight: 500; color: ${isDarkMode ? '#ecf0f1' : '#333'};">+${remainingCount}</span>
            `;
            
            // Add hover effect
            seeMoreItem.onmouseover = function() {
                this.style.backgroundColor = isDarkMode ? '#34495e' : '#e5e5e5';
            };
            seeMoreItem.onmouseout = function() {
                this.style.backgroundColor = isDarkMode ? '#2c3e50' : '#f2f2f2';
            };
            
            // Add click event to view all media
            seeMoreItem.addEventListener('click', () => {
                alert(`This feature will show all ${imageMessages.length} media items in a gallery view. Coming soon!`);
            });
            
            mediaGrid.appendChild(seeMoreItem);
        }
            }, (error) => {
                console.error("Error in real-time media listener:", error);
            });
        
    } catch (error) {
        console.error("Error setting up shared media listener:", error);
    }
}
    
// Function to load shared files
function loadSharedFiles(chatId) {
    const filesList = document.querySelector('.shared-files-list');
    if (!filesList) return;
    
    try {
        console.log("Setting up real-time listener for files in chat:", chatId);
        
        // Clean up existing listener if any
        if (filesListener) {
            filesListener();
            filesListener = null;
        }
        
        // Set up real-time listener for messages with files
        filesListener = firebase.firestore()
            .collection('chats')
            .doc(chatId)
            .collection('messages')
            .where('type', '==', 'file')
            .orderBy('timestamp', 'desc')
            .limit(3)
            .onSnapshot((snapshot) => {
                console.log("Real-time files update received");
                
                // Clear existing content first
                filesList.innerHTML = '';
                
                // Show/hide appropriate containers
                const emptyFilesContainer = document.querySelector('.chat-details-section:nth-of-type(2) .empty-state-container');
                if (emptyFilesContainer) {
                    if (snapshot.empty) {
                        emptyFilesContainer.style.display = 'flex';
            return;
                    } else {
                        emptyFilesContainer.style.display = 'none';
                    }
        }
        
        // Add each file to the list
                snapshot.forEach(doc => {
            const message = doc.data();
            const fileItem = document.createElement('div');
            fileItem.className = 'shared-file-item';
            
            // Determine file icon based on extension
            let fileIcon = 'fas fa-file';
            const fileName = message.fileName || 'Unknown file';
            const extension = fileName.split('.').pop().toLowerCase();
            
            if (['pdf'].includes(extension)) fileIcon = 'fas fa-file-pdf';
            else if (['doc', 'docx'].includes(extension)) fileIcon = 'fas fa-file-word';
            else if (['xls', 'xlsx'].includes(extension)) fileIcon = 'fas fa-file-excel';
            else if (['ppt', 'pptx'].includes(extension)) fileIcon = 'fas fa-file-powerpoint';
            else if (['txt', 'rtf'].includes(extension)) fileIcon = 'fas fa-file-alt';
            else if (['jpg', 'jpeg', 'png', 'gif'].includes(extension)) fileIcon = 'fas fa-file-image';
            else if (['mp4', 'avi', 'mov'].includes(extension)) fileIcon = 'fas fa-file-video';
            else if (['mp3', 'wav'].includes(extension)) fileIcon = 'fas fa-file-audio';
            else if (['zip', 'rar'].includes(extension)) fileIcon = 'fas fa-file-archive';
            
            fileItem.innerHTML = `
                <i class="${fileIcon}"></i>
                <span>${fileName}</span>
            `;
            
            // Add click event to download file
            fileItem.addEventListener('click', () => {
                if (message.fileUrl) {
                    window.open(message.fileUrl, '_blank');
                }
            });
            
            filesList.appendChild(fileItem);
                });
            }, (error) => {
                console.error("Error in real-time files listener:", error);
        });
        
    } catch (error) {
        console.error("Error setting up shared files listener:", error);
    }
}
    
// Function to load shared links
function loadSharedLinks(chatId) {
    const linksList = document.querySelector('.shared-links-list');
    if (!linksList) return;
    
    try {
        console.log("Setting up real-time listener for links in chat:", chatId);
        
        // Clean up existing listener if any
        if (linksListener) {
            linksListener();
            linksListener = null;
        }
        
        // Set up real-time listener for messages that might contain links
        linksListener = firebase.firestore()
            .collection('chats')
            .doc(chatId)
            .collection('messages')
            .orderBy('timestamp', 'desc')
            .limit(50)
            .onSnapshot((snapshot) => {
                console.log("Real-time links update received");
                
                // Clear existing content first
                linksList.innerHTML = '';
            
        // Filter for messages with links
        const messages = [];
                snapshot.forEach(doc => {
            const message = doc.data();
            
            // Check if the message contains a URL
            if (message.content && 
                message.content.includes('http') && 
                !message.content.includes('.jpg') && 
                !message.content.includes('.jpeg') && 
                !message.content.includes('.png') && 
                !message.content.includes('.gif')) {
                
                messages.push({
                    id: doc.id,
                    ...message
                });
            }
        });
        
                // Show/hide appropriate containers
                const emptyLinksContainer = document.querySelector('.chat-details-section:nth-of-type(3) .empty-state-container');
                if (emptyLinksContainer) {
        if (messages.length === 0) {
                        emptyLinksContainer.style.display = 'flex';
            return;
                    } else {
                        emptyLinksContainer.style.display = 'none';
                    }
        }
        
        // Display up to 3 links
        const linksToShow = messages.slice(0, 3);
        
        linksToShow.forEach(message => {
            // Extract URLs from the message content
            const urlRegex = /(https?:\/\/[^\s]+)/g;
            const urls = message.content.match(urlRegex);
            
            if (urls && urls.length > 0) {
                urls.forEach(url => {
                    // Create link item
                    const linkItem = document.createElement('div');
                    linkItem.className = 'shared-link-item';
                    
                    // Clean up URL for display
                    let displayUrl = url;
                    try {
                        const urlObj = new URL(url);
                        displayUrl = urlObj.hostname + urlObj.pathname;
                        if (displayUrl.length > 30) {
                            displayUrl = displayUrl.substring(0, 30) + '...';
                        }
                    } catch (e) {
                        console.log('Invalid URL:', url);
                    }
                    
                    linkItem.innerHTML = `
                        <i class="fas fa-link"></i>
                        <span>${displayUrl}</span>
                    `;
                    
                    // Add click event to open link
                    linkItem.addEventListener('click', () => {
                        window.open(url, '_blank');
                    });
                    
                    linksList.appendChild(linkItem);
                });
            }
                });
            }, (error) => {
                console.error("Error in real-time links listener:", error);
        });
        
    } catch (error) {
        console.error("Error setting up shared links listener:", error);
    }
}

// Get the chat details element
const chatDetails = document.getElementById('chat-details');

// Hide chat details by default
if (chatDetails) {
    chatDetails.classList.remove('active');
}

// Add event listener for show details button
document.addEventListener('DOMContentLoaded', () => {
    const showDetailsBtn = document.getElementById('show-details-btn');
    if (showDetailsBtn) {
        showDetailsBtn.addEventListener('click', () => {
            openChatDetails();
        });
    }
});

function openChatDetails() {
    const chatDetails = document.getElementById('chat-details');
    const messagesSection = document.getElementById('messages-section');
    const detailsBackdrop = document.getElementById('details-backdrop');
    const emojiPicker = document.getElementById('emoji-picker');
    
    if (!chatDetails || !messagesSection) return;
    
    chatDetails.classList.add('active');
    messagesSection.classList.add('with-details');
    
    if (window.innerWidth <= 992) {
        detailsBackdrop.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
    
    // Update details panel with chat data
    if (window.currentChatId) {
        // Clean up any existing listeners first
        cleanupChatDetailsListeners();
        
        // Then set up new real-time listeners for the current chat
        updateChatDetails();
    }
    
    // Reposition emoji picker if it's open
    if (emojiPicker && emojiPicker.classList.contains('active')) {
        setTimeout(positionEmojiPicker, 300); // Wait for transition to complete
    }
}

// Make the function available to other scripts
window.openChatDetails = openChatDetails;

// Function to clean up all real-time listeners
function cleanupChatDetailsListeners() {
    console.log("Cleaning up chat details listeners");
    
    if (mediaListener) {
        mediaListener();
        mediaListener = null;
    }
    if (filesListener) {
        filesListener();
        filesListener = null;
    }
    if (linksListener) {
        linksListener();
        linksListener = null;
    }
}

// Make cleanup function available to other scripts
window.cleanupChatDetailsListeners = cleanupChatDetailsListeners;

// Handle cleanup when chat details are closed
function closeChatDetails() {
    const chatDetails = document.getElementById('chat-details');
    const messagesSection = document.getElementById('messages-section');
    const detailsBackdrop = document.getElementById('details-backdrop');
    const emojiPicker = document.getElementById('emoji-picker');
    
    if (!chatDetails || !messagesSection) return;
    
    chatDetails.classList.remove('active');
    messagesSection.classList.remove('with-details');
    
    if (detailsBackdrop) {
        detailsBackdrop.classList.remove('active');
    }
    
    document.body.style.overflow = '';
    
    if (window.innerWidth > 992) {
        chatDetails.classList.add('manually-closed');
    }
    
    // Reposition emoji picker if it's open
    if (emojiPicker && emojiPicker.classList.contains('active')) {
        setTimeout(positionEmojiPicker, 300); // Wait for transition to complete
    }
    
    // Don't cleanup listeners here, keep them active for real-time updates in background
}

// Make the function available to other scripts
window.closeChatDetails = closeChatDetails;

// Make updateChatDetails function available to other scripts
window.updateChatDetails = updateChatDetails;

// Rest of the chat functionality
function updateChatDetails() {
    // If no chat is selected, don't try to load details
    if (!window.currentChatId) return;
    
    // Clean up existing listeners
    if (mediaListener) {
        mediaListener();
        mediaListener = null;
    }
    if (filesListener) {
        filesListener();
        filesListener = null;
    }
    if (linksListener) {
        linksListener();
        linksListener = null;
    }
    
    // Load media items from the current chat with real-time updates
    loadSharedMedia(window.currentChatId);
    
    // Load files from the current chat with real-time updates
    loadSharedFiles(window.currentChatId);
    
    // Load links from the current chat with real-time updates
    loadSharedLinks(window.currentChatId);
}