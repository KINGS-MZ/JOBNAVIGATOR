// Theme toggle functionality
document.addEventListener('DOMContentLoaded', () => {
    const themeToggle = document.getElementById('theme-toggle');
    const htmlEl = document.documentElement;
    const bodyEl = document.body;
    const themeIcon = themeToggle.querySelector('i');
    
    // Check for saved theme preference or respect OS preference
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
        htmlEl.classList.add('dark-mode');
        bodyEl.classList.add('dark-mode');
        themeIcon.classList.replace('fa-moon', 'fa-sun');
    }
    
    themeToggle.addEventListener('click', () => {
        htmlEl.classList.toggle('dark-mode');
        bodyEl.classList.toggle('dark-mode');
        
        if (htmlEl.classList.contains('dark-mode')) {
            themeIcon.classList.replace('fa-moon', 'fa-sun');
            localStorage.setItem('theme', 'dark');
        } else {
            themeIcon.classList.replace('fa-sun', 'fa-moon');
            localStorage.setItem('theme', 'light');
        }
    });
    
    // User dropdown menu toggle
    const userBtn = document.getElementById('user-menu-btn');
    const dropdownMenu = document.getElementById('user-dropdown');
    
    userBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdownMenu.classList.toggle('show');
    });
    
    document.addEventListener('click', (e) => {
        if (!dropdownMenu.contains(e.target) && !userBtn.contains(e.target)) {
            dropdownMenu.classList.remove('show');
        }
    });

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

    // Emoji collections by category
    const emojis = {
        smileys: ['😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃', '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😙', '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔', '🤐', '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '🤥', '😌', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕'],
        animals: ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🐔', '🐧', '🐦', '🐤', '🦆', '🦅', '🦉', '🦇', '🐺', '🐗', '🐴', '🦄', '🐝', '🐛', '🦋', '🐌', '🐞', '🐜', '🦟', '🦗', '🕷', '🕸', '🦂', '🐢', '🐍', '🦎', '🦖', '🦕'],
        food: ['🍎', '🍐', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🍈', '🍒', '🍑', '🥭', '🍍', '🥥', '🥝', '🍅', '🥑', '🍆', '🥔', '🥕', '🌽', '🌶️', '🥒', '🥬', '🥦', '🧄', '🧅', '🥜', '🌰', '🍞', '🥐', '🥖', '🥨', '🥯', '🥞', '🧇', '🧀', '🍖', '🍗', '🥩', '🥓'],
        activities: ['⚽', '🏀', '🏈', '⚾', '🥎', '🎾', '🏐', '🏉', '🥏', '🎱', '🏓', '🏸', '🏒', '🏑', '🥍', '🏏', '🥅', '⛳', '🏹', '🎣', '🤿', '🥊', '🥋', '🎽', '🛹', '🛼', '🛷', '⛸️', '🥌', '🎿', '⛷️', '🏂', '🪂', '🏋️', '🤼', '🤸', '⛹️', '🤺'],
        travel: ['🚗', '🚕', '🚙', '🚌', '🚎', '🏎️', '🚓', '🚑', '🚒', '🚐', '🚚', '🚛', '🚜', '🛴', '🚲', '🛵', '🏍️', '🚨', '🚔', '🚍', '🚘', '🚖', '🚡', '🚠', '🚟', '🚃', '🚋', '🚞', '🚝', '🚄', '🚅', '🚈', '🚂', '🚆', '🚇', '🚊', '🚉', '🛩️', '✈️'],
        objects: ['💡', '🔦', '🕯️', '📔', '📕', '📖', '📗', '📘', '📙', '📚', '📓', '📒', '📃', '📜', '📄', '📰', '🗞️', '📑', '🔖', '🏷️', '💰', '💴', '💵', '💶', '💷', '💸', '💳', '🧾', '💹', '✉️', '📧', '📨', '📩', '📤', '📥', '📦', '📫', '📪', '📬']
    };

    // Toggle emoji picker
    emojiBtn.addEventListener('click', function() {
        emojiPicker.classList.toggle('active');
        
        // Default to first category (smileys)
        if (emojiPicker.classList.contains('active')) {
            loadEmojiCategory('smileys');
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
        
        // Focus back on input
        messageInput.focus();
    }

    // Initialize with smileys category
    loadEmojiCategory('smileys');
});

// Rest of the chat functionality