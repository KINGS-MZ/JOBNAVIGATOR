// Firebase setup
const auth = window.auth || firebase.auth();
const db = window.db || firebase.firestore();

// Initial debug logging
console.log('Checking initial auth state...');
console.log('Initial auth check result:', auth.currentUser ? `User logged in: ${auth.currentUser.email}` : 'No user logged in');
console.log('Firebase auth initialized:', !!auth);
console.log('Firebase db initialized:', !!db);

// Global elements for the dropdown
const dropdownToggle = document.getElementById('user-menu-btn');
const dropdownMenu = document.getElementById('user-dropdown');
const userSettings = document.getElementById('user-settings');
const avatarPlaceholder = document.getElementById('avatar-placeholder');
const notificationCount = document.getElementById('notification-count');

// DOM Elements for the subscription page
const monthlyToggle = document.querySelector('.billing-option.monthly');
const annuallyToggle = document.querySelector('.billing-option.annually');
const billingSwitch = document.getElementById('billing-toggle');
const planCards = document.querySelectorAll('.plan-card');
const ctaButton = document.querySelector('.btn-cta');
const trialButtons = document.querySelectorAll('.btn-primary');
const faqQuestions = document.querySelectorAll('.faq-question');
const logoutLink = document.getElementById('logout-link');

// DOM Elements for the payment sidebar
const paymentSidebar = document.getElementById('payment-sidebar');
const sidebarOverlay = document.getElementById('sidebar-overlay');
const closeSidebarBtn = document.getElementById('close-sidebar');
const paymentForm = document.getElementById('payment-form');
const cardNumberInput = document.getElementById('card-number');
const expiryDateInput = document.getElementById('expiry-date');
const cvvInput = document.getElementById('cvv');
const selectedPlanName = document.querySelector('#selected-plan-info h4');
const trialLength = document.getElementById('trial-length');
const planPrice = document.getElementById('plan-price');
const billingPeriod = document.getElementById('billing-period');

// Prices - updated to MAD and lower amounts
const monthlyPrices = {
    premium: '29 MAD',
    professional: '69 MAD'
};

const annualPrices = {
    premium: '290 MAD',
    professional: '690 MAD'
};

// Helper function to update user information in the UI
function updateUserInfo(user) {
    console.log('Updating UI with user info:', user ? user.email : 'no user');
    
    if (!user) {
        // No user, show guest info
        document.getElementById('user-name').textContent = 'Guest User';
        document.getElementById('user-email').textContent = 'Not logged in';
        document.getElementById('avatar-initials-dropdown').textContent = 'G';
        document.getElementById('avatar-image-dropdown').style.display = 'none';
        document.getElementById('avatar-initials-dropdown').style.display = 'flex';
        notificationCount.style.display = 'none';
        return;
    }
    
    // Basic user info from Firebase Auth
    const displayName = user.displayName || user.email.split('@')[0] || 'User';
    document.getElementById('user-name').textContent = displayName;
    document.getElementById('user-email').textContent = user.email;
    
    // Handle avatar
    if (user.photoURL) {
        const avatarImg = document.getElementById('avatar-image-dropdown');
        avatarImg.src = user.photoURL;
        avatarImg.style.display = 'block';
        document.getElementById('avatar-initials-dropdown').style.display = 'none';
    } else {
        // Use initials avatar
        const initials = displayName.charAt(0).toUpperCase();
        document.getElementById('avatar-initials-dropdown').textContent = initials;
        document.getElementById('avatar-image-dropdown').style.display = 'none';
        document.getElementById('avatar-initials-dropdown').style.display = 'flex';
    }
}

// Check if the user is already logged in
console.log('Checking if user is already logged in on page load...');
const initialUser = auth.currentUser;
if (initialUser) {
    console.log('User already logged in on page load:', initialUser.email);
    updateUserInfo(initialUser);
} else {
    console.log('No user found on page load');
    updateUserInfo(null);
    
    // Try to recover from localStorage
    try {
        const cachedUserData = localStorage.getItem('userData');
        if (cachedUserData) {
            const userData = JSON.parse(cachedUserData);
            console.log('Recovered user data from localStorage:', userData);
            
            // Update UI with cached data
            document.getElementById('user-name').textContent = userData.name || userData.displayName || 'User';
            document.getElementById('user-email').textContent = userData.email || 'Loading...';
            
            if (userData.photoURL) {
                const avatarImg = document.getElementById('avatar-image-dropdown');
                avatarImg.src = userData.photoURL;
                avatarImg.style.display = 'block';
                document.getElementById('avatar-initials-dropdown').style.display = 'none';
            } else {
                const initials = (userData.name || userData.displayName || 'U').charAt(0).toUpperCase();
                document.getElementById('avatar-initials-dropdown').textContent = initials;
                document.getElementById('avatar-image-dropdown').style.display = 'none';
                document.getElementById('avatar-initials-dropdown').style.display = 'flex';
            }
        }
    } catch (e) {
        console.warn('Error recovering user data from localStorage:', e);
    }
}

// Function to check and update UI based on user's current subscription
function checkUserSubscription(userId) {
    console.log('Checking subscription for user:', userId);
    
    // Reset all plan buttons to default state first
    planCards.forEach(card => {
        const button = card.querySelector('button');
        const planName = card.querySelector('.plan-name').textContent.toLowerCase();
        
        // Reset to default state - either "Try X Days Free" or "Current Plan" for free
        if (planName === 'free') {
            button.textContent = 'Current Plan';
            button.className = 'btn-current';
            button.disabled = true;
        } else {
            const trialDays = planName === 'premium' ? '7' : '14';
            button.textContent = `Try ${trialDays} Days Free`;
            button.className = 'btn-primary';
            button.disabled = false;
        }
    });
    
    // If no user ID, we're done (user is on free plan by default)
    if (!userId) {
        console.log('No user ID provided, defaulting to free plan');
        return;
    }
    
    // Query Firestore for active subscription
    db.collection('subscriptions')
        .where('userId', '==', userId)
        .where('status', 'in', ['active', 'trial'])
        .get()
        .then(snapshot => {
            if (snapshot.empty) {
                console.log('No active subscription found for user');
                return;
            }
            
            // Get the active subscription
            const subscription = snapshot.docs[0].data();
            console.log('Found active subscription:', subscription);
            
            // Find the matching plan card and update its button
            planCards.forEach(card => {
                const cardPlanName = card.querySelector('.plan-name').textContent.toLowerCase();
                const button = card.querySelector('button');
                
                if (cardPlanName === subscription.plan.toLowerCase()) {
                    // This is the user's current plan
                    button.textContent = 'Current Plan';
                    button.className = 'btn-current';
                    button.disabled = true;
                    
                    // Add a subtle highlight to the current plan card
                    card.classList.add('current-plan');
                } else if (cardPlanName === 'free') {
                    // If user has a paid plan, the free plan should show "Downgrade" instead of "Current Plan"
                    button.textContent = 'Downgrade';
                    button.className = 'btn-secondary';
                    button.disabled = false;
                } else {
                    // For other paid plans, if user is on a different paid plan, show "Upgrade" or "Downgrade"
                    const currentPlanIndex = ['free', 'premium', 'professional'].indexOf(subscription.plan.toLowerCase());
                    const thisPlanIndex = ['free', 'premium', 'professional'].indexOf(cardPlanName);
                    
                    if (thisPlanIndex > currentPlanIndex) {
                        button.textContent = 'Upgrade';
                        button.className = 'btn-primary';
                    } else {
                        button.textContent = 'Downgrade';
                        button.className = 'btn-secondary';
                    }
                    button.disabled = false;
                }
            });
        })
        .catch(error => {
            console.error('Error checking subscription:', error);
        });
}

// Setting up the auth state change listener
console.log('Setting up auth state change listener...');
auth.onAuthStateChanged(user => {
    console.log('Auth state changed:', user ? `User logged in: ${user.email}` : 'No user logged in');
    
    if (user) {
        console.log('User is logged in:', user.email);
        console.log('User ID:', user.uid);
        console.log('User display name:', user.displayName);
        
        // Update basic user info immediately
        updateUserInfo(user);
        
        // Check and update subscription UI
        checkUserSubscription(user.uid);
        
        // Store basic user data in localStorage for recovery
        try {
            localStorage.setItem('userData', JSON.stringify({
                email: user.email,
                displayName: user.displayName,
                uid: user.uid
            }));
        } catch (e) {
            console.warn('Could not save user data to localStorage:', e);
        }
        
        // User is logged in, fetch more detailed user data
        db.collection('users').doc(user.uid).get().then(doc => {
            if (doc.exists) {
                const userData = doc.data();
                console.log('User data found:', userData);
                
                // Store more detailed user data
                try {
                    localStorage.setItem('userData', JSON.stringify({
                        ...userData,
                        uid: user.uid,
                        email: userData.email || user.email,
                        lastUpdated: new Date().toISOString()
                    }));
                } catch (e) {
                    console.warn('Could not save detailed user data to localStorage:', e);
                }
                
                // Update user info in dropdown with Firestore data
                document.getElementById('user-name').textContent = userData.name || userData.displayName || user.displayName || 'User';
                document.getElementById('user-email').textContent = userData.email || user.email;
                
                // Set avatar
                if (userData.photoURL || user.photoURL) {
                    const avatarImg = document.getElementById('avatar-image-dropdown');
                    avatarImg.src = userData.photoURL || user.photoURL;
                    avatarImg.style.display = 'block';
                    document.getElementById('avatar-initials-dropdown').style.display = 'none';
                } else {
                    // Use initials avatar
                    const userName = userData.name || userData.displayName || user.displayName || user.email || 'User';
                    const initials = userName.charAt(0).toUpperCase();
                    document.getElementById('avatar-initials-dropdown').textContent = initials;
                    document.getElementById('avatar-image-dropdown').style.display = 'none';
                    document.getElementById('avatar-initials-dropdown').style.display = 'flex';
                }
                
                // Update notification count
                db.collection('notifications')
                    .where('userId', '==', user.uid)
                    .where('read', '==', false)
                    .get()
                    .then(snapshot => {
                        notificationCount.textContent = snapshot.size;
                        if (snapshot.size > 0) {
                            notificationCount.style.display = 'flex';
                        } else {
                            notificationCount.style.display = 'none';
                        }
                    })
                    .catch(error => {
                        console.error('Error fetching notifications:', error);
                        notificationCount.style.display = 'none';
                    });
            } else {
                console.log('No user document found for uid:', user.uid);
                // No user data in Firestore, use Firebase auth data
                updateUserInfo(user);
                notificationCount.style.display = 'none';
            }
        }).catch(error => {
            console.error("Error fetching user data:", error);
            // Still show something even if there's an error
            updateUserInfo(user);
            notificationCount.style.display = 'none';
        });
    } else {
        console.log('No user is signed in');
        // Clear cached user data
        try {
            localStorage.removeItem('userData');
        } catch (e) {
            console.warn('Could not clear userData from localStorage:', e);
        }
        
        // User is not logged in
        updateUserInfo(null);
        
        // Reset to free plan 
        checkUserSubscription(null);
    }
});

// Function to check if Firebase is properly initialized
function checkFirebaseInitialization() {
    try {
        console.log('Checking Firebase initialization...');
        const firebaseApp = firebase.app();
        console.log('Firebase initialized successfully:', firebaseApp.name);
        
        // Verify authentication
        if (auth) {
            console.log('Firebase auth is available');
        } else {
            console.error('Firebase auth is not available');
        }
        
        // Verify firestore
        if (db) {
            console.log('Firebase Firestore is available');
        } else {
            console.error('Firebase Firestore is not available');
        }
    } catch (error) {
        console.error('Firebase initialization check failed:', error);
    }
}

// Load theme from localStorage
function loadTheme() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
        document.body.classList.toggle('dark-mode', savedTheme === 'dark');
    } else {
        // Check system preference
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        document.body.classList.toggle('dark-mode', prefersDark);
    }
}

// Function to toggle between light and dark themes
function toggleTheme() {
    const currentTheme = localStorage.getItem('theme') || 'light';
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    
    // Use the global updateTheme function from theme-loader.js
    if (window.updateTheme) {
        window.updateTheme(newTheme);
    } else {
        // Fallback if updateTheme is not available
        localStorage.setItem('theme', newTheme);
        document.body.classList.toggle('dark-mode', newTheme === 'dark');
        document.documentElement.classList.toggle('dark-mode', newTheme === 'dark');
    }
}

// Update prices based on billing period
function updatePrices(prices, period) {
    // Get price elements
    const premiumPrice = document.querySelector('.plan-card.highlight .price');
    const professionalPrice = document.querySelector('.plan-card:last-child .price');

    // Get period elements
    const premiumPeriod = document.querySelector('.plan-card.highlight .period');
    const professionalPeriod = document.querySelector('.plan-card:last-child .period');

    // Update prices and periods
    premiumPrice.textContent = prices.premium;
    professionalPrice.textContent = prices.professional;

    premiumPeriod.textContent = period;
    professionalPeriod.textContent = period;
}

// Load event listeners for payment sidebar
window.addEventListener('DOMContentLoaded', function() {
    console.log('DOMContentLoaded event fired');
    
    // Load theme first to prevent flickering
    loadTheme();
    
    // Set initial prices
    updatePrices(monthlyPrices, '/month');
    
    // Add theme toggle button listener
    const themeToggleBtn = document.getElementById('theme-toggle');
    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', toggleTheme);
    }
    
    // Open first FAQ by default
    if (faqQuestions.length > 0) {
        const firstFaqItem = faqQuestions[0].parentElement;
        firstFaqItem.classList.add('active');
        faqQuestions[0].classList.add('active');
    }
    
    // Re-query elements that might not have been available
    const dropdownElements = document.querySelectorAll('.dropdown-element');
    console.log('Found dropdown elements:', dropdownElements.length);
    
    // Add click event to toggle dropdown
    if (dropdownToggle) {
        console.log('Adding click listener to dropdown toggle');
        dropdownToggle.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            dropdownMenu.classList.toggle('show');
            console.log('Dropdown toggled:', dropdownMenu.classList.contains('show'));
        });
    } else {
        console.error('Dropdown toggle element not found!');
    }
    
    // Close the dropdown when clicking outside
    document.addEventListener('click', function(e) {
        if (dropdownMenu && dropdownMenu.classList.contains('show') && 
            !dropdownMenu.contains(e.target) && 
            !dropdownToggle.contains(e.target)) {
            dropdownMenu.classList.remove('show');
            console.log('Dropdown closed by outside click');
        }
    });
    
    // Toggle billing period
    if (billingSwitch) {
        billingSwitch.addEventListener('change', function() {
            if (this.checked) {
                // Annually
                updatePrices(annualPrices, '/year');
                monthlyToggle.classList.remove('active');
                annuallyToggle.classList.add('active');
            } else {
                // Monthly
                updatePrices(monthlyPrices, '/month');
                annuallyToggle.classList.remove('active');
                monthlyToggle.classList.add('active');
            }
        });
    }
    
    // Toggle FAQ answers
    faqQuestions.forEach(question => {
        question.addEventListener('click', () => {
            const faqItem = question.parentElement;
            
            // Check if already active
            const isActive = faqItem.classList.contains('active');
            
            // Close all other FAQs
            document.querySelectorAll('.faq-item').forEach(item => {
                item.classList.remove('active');
                item.querySelector('.faq-question').classList.remove('active');
            });
            
            // Toggle current FAQ
            if (!isActive) {
                faqItem.classList.add('active');
                question.classList.add('active');
            }
        });
    });
    
    // Remove duplicate event listeners for trial buttons
    trialButtons.forEach(button => {
        // Clone the element to remove all event listeners
        const newButton = button.cloneNode(true);
        button.parentNode.replaceChild(newButton, button);
    });
    
    // Re-query the buttons after replacing them - only select buttons within plan cards
    const updatedTrialButtons = document.querySelectorAll('.plan-card .btn-primary');
    
    // Add event listeners for opening the payment sidebar
    updatedTrialButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            
            // Check if user is authenticated first
            if (auth.currentUser) {
                const buttonText = button.textContent.trim().toLowerCase();
                const planCard = button.closest('.plan-card');
                
                // Add null check for planCard
                if (!planCard) {
                    console.error('Error: Could not find parent plan card element');
                    return;
                }
                
                const planNameEl = planCard.querySelector('.plan-name');
                const planName = planNameEl ? planNameEl.textContent : '';
                
                // Handle different button states
                if (buttonText === 'current plan') {
                    // Do nothing for current plan
                    return;
                } else if (buttonText === 'upgrade' || buttonText === 'downgrade') {
                    // Handle plan change
                    if (confirm(`Are you sure you want to ${buttonText} to the ${planName} plan? This will change your billing immediately.`)) {
                        // Show loading state
                        const originalText = button.textContent;
                        button.textContent = 'Processing...';
                        button.disabled = true;
                        
                        // In a real implementation, you would call your backend to process the plan change
                        // For now, we'll simulate it
                        setTimeout(() => {
                            // Get the user's current subscription
                db.collection('subscriptions')
                    .where('userId', '==', auth.currentUser.uid)
                    .where('status', 'in', ['active', 'trial'])
                    .get()
                    .then(snapshot => {
                                    if (snapshot.empty) {
                                        throw new Error('No active subscription found');
                                    }
                                    
                                    const subscriptionDoc = snapshot.docs[0];
                                    const subscription = subscriptionDoc.data();
                                    
                                    // Update the subscription
                                    return subscriptionDoc.ref.update({
                                        plan: planName.toLowerCase(),
                            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                        });
                    })
                                .then(() => {
                                    // Update the UI
                                    checkUserSubscription(auth.currentUser.uid);
                        
                        // Show success message
                        const successMessage = document.createElement('div');
                        successMessage.className = 'subscription-success';
                        successMessage.innerHTML = `
                                        <i class="fas fa-check-circle success-icon"></i>
                                        <h3>Plan Updated Successfully!</h3>
                                        <p>You have successfully ${buttonText}d to the ${planName} plan.</p>
                                        <p>Your new plan benefits are now active.</p>
                                    `;
                                    
                                    // Insert message and scroll to it
                                    const subscriptionContainer = document.querySelector('.subscription-container');
                                    subscriptionContainer.insertBefore(successMessage, subscriptionContainer.firstChild);
                                    window.scrollTo({ top: 0, behavior: 'smooth' });
                                    
                                    // Remove the message after 5 seconds
                                    setTimeout(() => {
                                        successMessage.style.opacity = '0';
                                        successMessage.style.transform = 'translateY(-10px)';
                                        successMessage.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
                                        
                                        setTimeout(() => {
                                            successMessage.remove();
                                        }, 500);
                                    }, 5000);
                                })
                                .catch(error => {
                                    console.error('Error updating subscription:', error);
                                    alert(`Error updating your plan: ${error.message}. Please try again.`);
                                })
                                .finally(() => {
                                    // Reset button state
                                    button.textContent = originalText;
                                    button.disabled = false;
                                });
                        }, 1000);
                    }
                    return;
                } else {
                    // This is a trial button, proceed with payment sidebar
                    if (planNameEl) {
                        selectedPlanName.textContent = planName + ' Plan';
                        
                        // Get trial length (7 or 14 days)
                        const trialText = button.textContent;
                        const trialDays = trialText.includes('7') ? '7' : '14';
                        trialLength.textContent = trialDays;
                        
                        // Get plan price based on plan name and current billing cycle
                        const isPremium = planName && planName.toLowerCase() === 'premium';
                        const isAnnual = billingSwitch && billingSwitch.checked;
                        
                        if (isAnnual) {
                            planPrice.textContent = isPremium ? annualPrices.premium : annualPrices.professional;
                            billingPeriod.textContent = 'year';
                        } else {
                            planPrice.textContent = isPremium ? monthlyPrices.premium : monthlyPrices.professional;
                            billingPeriod.textContent = 'month';
                        }
                    }
                    
                    // Show the sidebar and overlay
                    paymentSidebar.classList.add('active');
                    sidebarOverlay.classList.add('active');
                    document.body.style.overflow = 'hidden'; // Prevent body scrolling
                }
            } else {
                // Redirect to login
                window.location.href = '../authentication/login.html?redirect=subscription&plan=' + 
                    encodeURIComponent(button.closest('.plan-card')?.querySelector('.plan-name')?.textContent?.toLowerCase() || 'premium');
            }
        });
    });
    
    // Close payment sidebar when close button or overlay is clicked
    if (closeSidebarBtn) {
        closeSidebarBtn.addEventListener('click', closeSidebar);
    }
    
    if (sidebarOverlay) {
        sidebarOverlay.addEventListener('click', closeSidebar);
    }
    
    // Close sidebar with Escape key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && paymentSidebar.classList.contains('active')) {
            closeSidebar();
        }
    });
    
    // Handle payment form submission
    if (paymentForm) {
        paymentForm.addEventListener('submit', handlePaymentSubmission);
    }
    
    // Format card inputs if they exist
    if (cardNumberInput) {
        cardNumberInput.addEventListener('input', formatCardNumber);
    }
    
    if (expiryDateInput) {
        expiryDateInput.addEventListener('input', formatExpiryDate);
    }
    
    if (cvvInput) {
        cvvInput.addEventListener('input', formatCVV);
    }
    
    // CTA button event listener
    if (ctaButton) {
        ctaButton.addEventListener('click', () => {
            // Smooth scroll to plans section
            document.querySelector('.subscription-plans').scrollIntoView({
                behavior: 'smooth'
            });
        });
    }
    
    // Logout functionality
    if (logoutLink) {
        logoutLink.addEventListener('click', function(e) {
            e.preventDefault();
            console.log('Logout clicked');
            
            auth.signOut().then(() => {
                console.log('User signed out successfully');
                window.location.href = '../authentication/login.html';
            }).catch(error => {
                console.error('Sign out error:', error);
            });
        });
    }
    
    // Re-check auth state
    const currentAuthUser = auth.currentUser;
    console.log('Auth state on DOMContentLoaded:', currentAuthUser ? `User logged in: ${currentAuthUser.email}` : 'No user logged in');
    
    // Force UI update
    if (currentAuthUser) {
        updateUserInfo(currentAuthUser);
    }
    
    // Check Firebase initialization
    checkFirebaseInitialization();
}); 

// Format card number as user types (add spaces after every 4 digits)
function formatCardNumber(e) {
    let value = e.target.value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    let formattedValue = '';
    
    for (let i = 0; i < value.length; i++) {
        if (i > 0 && i % 4 === 0) {
            formattedValue += ' ';
        }
        formattedValue += value[i];
    }
    
    e.target.value = formattedValue;
}

// Format expiry date as MM/YY
function formatExpiryDate(e) {
    let value = e.target.value.replace(/\D/g, '');
    
    if (value.length > 0) {
        if (value.length <= 2) {
            e.target.value = value;
        } else {
            e.target.value = value.slice(0, 2) + '/' + value.slice(2, 4);
        }
    }
}

// Only allow numbers in CVV
function formatCVV(e) {
    e.target.value = e.target.value.replace(/\D/g, '');
}

// Close the sidebar
function closeSidebar() {
    if (paymentSidebar) {
        paymentSidebar.classList.remove('active');
    }
    
    if (sidebarOverlay) {
        sidebarOverlay.classList.remove('active');
    }
    
    document.body.style.overflow = ''; // Restore body scrolling
    
    if (paymentForm) {
        paymentForm.reset(); // Reset form fields
    }
}

// Update payment form handling to create subscription after successful payment
function handlePaymentSubmission(e) {
    e.preventDefault();
    
    // Basic validation
    const cardholderName = document.getElementById('card-holder').value.trim();
    const cardNumber = document.getElementById('card-number').value.replace(/\s/g, '');
    const expiryDate = document.getElementById('expiry-date').value;
    const cvv = document.getElementById('cvv').value;
    const termsAgreed = document.getElementById('terms-agree').checked;
    
    // Simple validation
    if (!cardholderName || cardholderName.length < 3) {
        alert('Please enter a valid cardholder name');
        return;
    }
    
    if (!cardNumber || cardNumber.length < 15) {
        alert('Please enter a valid card number');
        return;
    }
    
    if (!expiryDate || !expiryDate.includes('/')) {
        alert('Please enter a valid expiry date (MM/YY)');
        return;
    }
    
    if (!cvv || cvv.length < 3) {
        alert('Please enter a valid CVV code');
        return;
    }
    
    if (!termsAgreed) {
        alert('Please agree to the terms and conditions');
        return;
    }
    
    // Show loading state
    const submitBtn = paymentForm.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Processing...';
    submitBtn.disabled = true;
    
    // Get selected plan info
    const planName = selectedPlanName.textContent.split(' ')[0];
    const trialDays = parseInt(trialLength.textContent);
    const isAnnual = billingPeriod.textContent === 'year';
    
    // Calculate trial end date
    const trialEndDate = new Date();
    trialEndDate.setDate(trialEndDate.getDate() + trialDays);
    
    // Simulate server request (in real app, this would be an API call)
    setTimeout(() => {
        // In a real app, you would validate the card and process the payment here
        
        // Check if user is authenticated
        if (!auth.currentUser) {
            alert('You must be logged in to subscribe');
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
            return;
        }
        
        // Check if user already has an active subscription
        db.collection('subscriptions')
            .where('userId', '==', auth.currentUser.uid)
            .where('status', 'in', ['active', 'trial'])
            .get()
            .then(snapshot => {
                if (!snapshot.empty) {
                    throw new Error('You already have an active subscription');
                }
                
                // Create subscription document in Firestore
                return db.collection('subscriptions').add({
                    userId: auth.currentUser.uid,
                    plan: planName.toLowerCase(),
                    status: 'trial',
                    trialStarted: firebase.firestore.FieldValue.serverTimestamp(),
                    trialEnds: firebase.firestore.Timestamp.fromDate(trialEndDate),
                    billingPeriod: isAnnual ? 'annually' : 'monthly',
                    price: parseFloat(planPrice.textContent.split(' ')[0]),
                    currency: 'MAD',
                    autoRenew: true,
                    paymentMethod: {
                        type: 'credit_card',
                        last4: cardNumber.slice(-4),
                        holderName: cardholderName
                    },
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            })
            .then((docRef) => {
                console.log("Subscription created with ID: ", docRef.id);
                
                // Update user record to track subscription
                return db.collection('users').doc(auth.currentUser.uid).update({
                    currentSubscription: {
                        id: docRef.id,
                        plan: planName.toLowerCase(),
                        status: 'trial',
                        trialEnds: firebase.firestore.Timestamp.fromDate(trialEndDate)
                    },
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            })
            .then(() => {
                // Close the sidebar
                closeSidebar();
                
                // Update subscription UI
                checkUserSubscription(auth.currentUser.uid);
                
                // Show success message 
                const successMessage = document.createElement('div');
                successMessage.className = 'subscription-success';
                successMessage.innerHTML = `
                    <i class="fas fa-check-circle success-icon"></i>
                    <h3>Your free trial has started!</h3>
                    <p>You now have access to all ${selectedPlanName.textContent.toLowerCase()} features.</p>
                    <p>We'll remind you before your trial ends on ${trialEndDate.toLocaleDateString()}.</p>
                `;
                
                // Insert success message at the top of the subscription container
                const subscriptionContainer = document.querySelector('.subscription-container');
                subscriptionContainer.insertBefore(successMessage, subscriptionContainer.firstChild);
                
                // Scroll to the top to show the message
                window.scrollTo({ top: 0, behavior: 'smooth' });
                
                // Reset the button
                submitBtn.textContent = originalText;
                submitBtn.disabled = false;
                
                // After 5 seconds, fade out the success message
                setTimeout(() => {
                    successMessage.style.opacity = '0';
                    successMessage.style.transform = 'translateY(-10px)';
                    successMessage.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
                    
                    // Remove the message after animation completes
                    setTimeout(() => {
                        successMessage.remove();
                    }, 500);
                }, 5000);
            })
            .catch(error => {
                console.error("Error creating subscription: ", error);
                alert(error.message || "Failed to create subscription. Please try again.");
                submitBtn.textContent = originalText;
                submitBtn.disabled = false;
            });
    }, 1500);
} 