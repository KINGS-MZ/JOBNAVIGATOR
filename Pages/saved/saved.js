// Import Firebase modules
import { 
    auth, 
    db, 
    doc, 
    getDoc, 
    collection, 
    query, 
    getDocs, 
    deleteDoc,
    where 
} from '../../Firebase/firebase-config.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js';
import { orderBy } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js';

// DOM elements for theme
const themeToggle = document.getElementById('theme-toggle');

// DOM elements for user menu
const userMenuBtn = document.getElementById('user-menu-btn');
const userDropdown = document.getElementById('user-dropdown');
const logoutLink = document.getElementById('logout-link');

// DOM elements for user info
const userNameElement = document.getElementById('user-name');
const userEmailElement = document.getElementById('user-email');
const avatarInitials = document.getElementById('avatar-initials');
const avatarInitialsDropdown = document.getElementById('avatar-initials-dropdown');
const avatarImage = document.getElementById('avatar-image');
const avatarImageDropdown = document.getElementById('avatar-image-dropdown');

// DOM elements for content
const loadingContainer = document.querySelector('.loading-container');
const emptyState = document.querySelector('.empty-state');
const postsContainer = document.querySelector('.posts-container');
const searchInput = document.getElementById('post-search');
const searchButton = document.querySelector('.search-btn');

// Variable to store saved items
let savedItems = [];

// Initialize theme
function initTheme() {
    console.log("Initializing theme...");
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.documentElement.classList.add('dark-mode');
        document.body.classList.add('dark-mode');
        if (themeToggle) themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
    } else {
        document.documentElement.classList.remove('dark-mode');
        document.body.classList.remove('dark-mode');
        if (themeToggle) themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
    }
}

// Toggle theme
if (themeToggle) {
    themeToggle.addEventListener('click', () => {
        console.log("Theme toggle clicked");
        if (document.documentElement.classList.contains('dark-mode')) {
            document.documentElement.classList.remove('dark-mode');
            document.body.classList.remove('dark-mode');
            localStorage.setItem('theme', 'light');
            themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
        } else {
            document.documentElement.classList.add('dark-mode');
            document.body.classList.add('dark-mode');
            localStorage.setItem('theme', 'dark');
            themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
        }
    });
}

// Toggle user dropdown
if (userMenuBtn) {
    userMenuBtn.addEventListener('click', (e) => {
        console.log("User menu clicked");
        e.preventDefault();
        e.stopPropagation();
        userDropdown.classList.toggle('show');
    });
}

// Close user dropdown when clicking outside
document.addEventListener('click', (e) => {
    if (userDropdown && !e.target.closest('.user-menu') && userDropdown.classList.contains('show')) {
        userDropdown.classList.remove('show');
    }
});

// Handle sign out
if (logoutLink) {
    logoutLink.addEventListener('click', async (e) => {
        e.preventDefault();
        try {
            await auth.signOut();
            window.location.href = '../login/login.html';
        } catch (error) {
            console.error('Error signing out: ', error);
        }
    });
}

// Get user initials for avatar
function getUserInitials(name) {
    if (!name) return 'U';
    const nameParts = name.split(' ').filter(part => part.length > 0);
    if (nameParts.length === 0) return 'U';
    if (nameParts.length === 1) return nameParts[0].charAt(0).toUpperCase();
    return (nameParts[0].charAt(0) + nameParts[nameParts.length - 1].charAt(0)).toUpperCase();
}

// Function to load saved items from Firebase
async function loadSavedItems() {
    if (!auth.currentUser) {
        console.error('User not authenticated');
        return [];
    }

    try {
        console.log("Loading saved items...");
        const userId = auth.currentUser.uid;
        const savedItemsRef = collection(db, 'users', userId, 'savedItems');
        const q = query(savedItemsRef, orderBy('savedAt', 'desc'));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            console.log('No saved items found');
            return [];
        }

        const items = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        console.log(`Loaded ${items.length} saved items`);
        return items;
    } catch (error) {
        console.error('Error loading saved items:', error);
        return [];
    }
}

// Function to remove a saved item
async function removeSavedItem(itemId) {
    if (!auth.currentUser) {
        console.error('User not authenticated');
        return false;
    }

    try {
        const userId = auth.currentUser.uid;
        const savedItemRef = doc(db, 'users', userId, 'savedItems', itemId);
        await deleteDoc(savedItemRef);
        console.log(`Item ${itemId} removed from saved items`);
        return true;
    } catch (error) {
        console.error('Error removing saved item:', error);
        return false;
    }
}

// Function to format date
function formatDate(timestamp) {
    if (!timestamp) return 'Unknown date';
    
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    
    // Check if date is valid
    if (isNaN(date.getTime())) return 'Invalid date';
    
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

// Function to create a saved item card
function createSavedItemCard(item) {
    const card = document.createElement('div');
    card.className = 'saved-item';
    card.dataset.id = item.id;
    
    let iconClass = 'fa-briefcase';
    if (item.icon) {
        iconClass = item.icon;
    }
    
    const tagsHtml = item.tags && item.tags.length > 0 
        ? `<div class="item-tags">${item.tags.map(tag => `<span class="item-tag">${tag}</span>`).join('')}</div>` 
        : '';
    
    card.innerHTML = `
        <div class="item-header">
            <div class="item-icon">
                <i class="fas ${iconClass}"></i>
            </div>
            <div class="item-info">
                <h3 class="item-title">${item.title || 'Untitled'}</h3>
                <div class="item-meta">
                    <span class="item-company">${item.company || ''}</span>
                    ${item.location ? `<span class="item-dot">•</span><span class="item-location">${item.location}</span>` : ''}
                    ${item.postType ? `<span class="item-dot">•</span><span class="item-type">${item.postType}</span>` : ''}
                </div>
            </div>
            <div class="item-actions">
                <button class="remove-btn" title="Remove from saved">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        </div>
        <div class="item-content">
            ${item.description ? `<p class="item-description">${item.description}</p>` : ''}
            ${tagsHtml}
        </div>
        <div class="item-footer">
            <span class="item-saved-date">Saved ${formatDate(item.savedAt)}</span>
            <a href="${item.url || '#'}" class="view-details">View Details</a>
        </div>
    `;
    
    // Add event listener for remove button
    const removeBtn = card.querySelector('.remove-btn');
    if (removeBtn) {
        removeBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            const success = await removeSavedItem(item.id);
            if (success) {
                // Remove from UI
                card.classList.add('removing');
                setTimeout(() => {
                    card.remove();
                    
                    // Update savedItems array
                    savedItems = savedItems.filter(savedItem => savedItem.id !== item.id);
                    
                    // Show empty state if no items left
                    if (savedItems.length === 0) {
                        postsContainer.style.display = 'none';
                        emptyState.style.display = 'flex';
                    }
                    
                    // Update badge count in menu
                    updateSavedItemsCount();
                }, 300);
            }
        });
    }
    
    // Make the card clickable to view details
    card.addEventListener('click', (e) => {
        // Don't navigate if clicking on action buttons
        if (!e.target.closest('.remove-btn')) {
            window.location.href = item.url || '#';
        }
    });
    
    return card;
}

// Function to update saved items count in menu
function updateSavedItemsCount() {
    // First try to find the badge in the menu sections
    let badge = document.querySelector('.menu-sections a[href="../saved/saved.html"] .badge');
    
    // If not found, try alternative paths
    if (!badge) {
        badge = document.querySelector('.menu-sections a[href="SavedJobs.html"] .badge');
    }
    
    if (!badge) {
        badge = document.querySelector('.menu-sections a[href="../saved/saved.html"] .badge');
    }
    
    if (!badge) {
        badge = document.querySelector('.menu-sections a[href="saved.html"] .badge');
    }
    
    console.log("Found badge element:", badge);
    
    if (badge) {
        badge.textContent = savedItems.length;
        console.log("Updated badge count to:", savedItems.length);
    } else {
        console.error("Badge element not found!");
    }
}

// Function to display saved items
function displaySavedItems(items, searchQuery = '') {
    if (!postsContainer) return;
    
    // Clear container
    postsContainer.innerHTML = '';
    
    // Filter items if search query provided
    const filteredItems = searchQuery 
        ? items.filter(item => 
            item.title?.toLowerCase().includes(searchQuery.toLowerCase()) || 
            item.company?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.description?.toLowerCase().includes(searchQuery.toLowerCase()))
        : items;
    
    if (filteredItems.length === 0) {
        // Show empty state
        if (loadingContainer) loadingContainer.style.display = 'none';
        if (postsContainer) postsContainer.style.display = 'none';
        
        if (searchQuery) {
            // Show search empty state
            if (emptyState) {
                emptyState.style.display = 'flex';
                emptyState.innerHTML = `
                    <div class="empty-illustration">
                        <i class="fas fa-search"></i>
                    </div>
                    <h2>No matching results</h2>
                    <p>We couldn't find any saved posts matching "${searchQuery}"</p>
                    <button class="btn-primary" onclick="document.getElementById('post-search').value = ''; document.querySelector('.search-btn').click();">Clear Search</button>
                `;
            }
        } else {
            // Show regular empty state
            if (emptyState) {
                emptyState.style.display = 'flex';
                emptyState.innerHTML = `
                    <div class="empty-illustration">
                        <i class="fas fa-bookmark"></i>
                    </div>
                    <h2>No saved posts yet</h2>
                    <p>When you save posts, they'll appear here for easy access</p>
                    <a href="../jobs/jobs.html" class="btn-primary">Explore Posts</a>
                `;
            }
        }
    } else {
        // Create and append cards
        filteredItems.forEach(item => {
            const card = createSavedItemCard(item);
            postsContainer.appendChild(card);
        });
        
        // Show posts container
        if (loadingContainer) loadingContainer.style.display = 'none';
        if (emptyState) emptyState.style.display = 'none';
        if (postsContainer) postsContainer.style.display = 'grid';
    }
}

// Handle search
if (searchButton && searchInput) {
    searchButton.addEventListener('click', () => {
        const query = searchInput.value.trim();
        displaySavedItems(savedItems, query);
    });
    
    // Search on Enter key
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            const query = searchInput.value.trim();
            displaySavedItems(savedItems, query);
        }
    });
}

// When DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM loaded, initializing saved.js...");
    
    // Log DOM elements
    console.log("Theme toggle element:", themeToggle);
    console.log("User menu button:", userMenuBtn);
    console.log("User dropdown:", userDropdown);
    console.log("Loading container:", loadingContainer);
    console.log("Posts container:", postsContainer);
    
    // Initialize theme
    initTheme();
    
    // Show loading state
    if (loadingContainer) {
        console.log("Showing loading state");
        loadingContainer.style.display = 'flex';
    } else {
        console.error("Loading container not found!");
    }
    
    if (emptyState) emptyState.style.display = 'none';
    if (postsContainer) postsContainer.style.display = 'none';
    
    // Authenticate user
    console.log("Checking authentication state...");
    onAuthStateChanged(auth, async (user) => {
        console.log("Auth state changed:", user ? `User found: ${user.uid}` : "No user");
        
        if (user) {
            // User is signed in, update UI
            try {
                console.log("Fetching user data from Firestore...");
                // Get user data from Firestore
                const userDoc = await getDoc(doc(db, "users", user.uid));
                console.log("User document exists:", userDoc.exists());
                const userData = userDoc.exists() ? userDoc.data() : {};
                console.log("User data:", userData);
                
                // Update user name
                if (userNameElement) {
                    userNameElement.textContent = userData.fullName || user.displayName || 'User';
                    console.log("Updated user name:", userNameElement.textContent);
                } else {
                    console.error("User name element not found!");
                }
                
                // Update user email
                if (userEmailElement) {
                    userEmailElement.textContent = user.email || '';
                    console.log("Updated user email:", userEmailElement.textContent);
                } else {
                    console.error("User email element not found!");
                }
                
                // Update avatar
                console.log("Updating avatar...");
                console.log("Photo URL:", userData.photoURL || user.photoURL);
                if (userData.photoURL || user.photoURL) {
                    const photoURL = userData.photoURL || user.photoURL;
                    
                    if (avatarImage) {
                        avatarImage.src = photoURL;
                        avatarImage.style.display = 'block';
                        if (avatarInitials) avatarInitials.style.display = 'none';
                        console.log("Avatar image updated");
                    } else {
                        console.error("Avatar image element not found!");
                    }
                    
                    if (avatarImageDropdown) {
                        avatarImageDropdown.src = photoURL;
                        avatarImageDropdown.style.display = 'block';
                        if (avatarInitialsDropdown) avatarInitialsDropdown.style.display = 'none';
                        console.log("Dropdown avatar image updated");
                    } else {
                        console.error("Avatar image dropdown element not found!");
                    }
                } else {
                    // Use initials
                    const initials = getUserInitials(userData.fullName || user.displayName || user.email || 'User');
                    console.log("Using initials:", initials);
                    
                    if (avatarInitials) {
                        avatarInitials.textContent = initials;
                        avatarInitials.style.display = 'flex';
                        if (avatarImage) avatarImage.style.display = 'none';
                        console.log("Avatar initials updated");
                    } else {
                        console.error("Avatar initials element not found!");
                    }
                    
                    if (avatarInitialsDropdown) {
                        avatarInitialsDropdown.textContent = initials;
                        avatarInitialsDropdown.style.display = 'flex';
                        if (avatarImageDropdown) avatarImageDropdown.style.display = 'none';
                        console.log("Dropdown avatar initials updated");
                    } else {
                        console.error("Avatar initials dropdown element not found!");
                    }
                }
                
                // Load saved items
                console.log("Loading saved items...");
                savedItems = await loadSavedItems();
                console.log(`Loaded ${savedItems.length} saved items:`, savedItems);
                
                // Update saved items count in menu
                updateSavedItemsCount();
                
                // Display saved items
                console.log("Displaying saved items...");
                displaySavedItems(savedItems);
                
            } catch (error) {
                console.error('Error loading user data:', error);
                // Show error state
                if (loadingContainer) loadingContainer.style.display = 'none';
                if (emptyState) {
                    emptyState.style.display = 'flex';
                    emptyState.innerHTML = `
                        <div class="empty-illustration">
                            <i class="fas fa-exclamation-triangle"></i>
                        </div>
                        <h2>Something went wrong</h2>
                        <p>We couldn't load your saved posts. Please try again later.</p>
                    `;
                }
            }
        } else {
            // User is not signed in, redirect to login
            console.log("No user found, redirecting to login page...");
            window.location.href = '../login/login.html';
        }
    });
}); 