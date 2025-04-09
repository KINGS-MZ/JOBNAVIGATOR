// DOM Elements
const fullNameInput = document.getElementById('fullName');
const emailInput = document.getElementById('email');
const phoneInput = document.getElementById('phone');
const locationInput = document.getElementById('location');
const saveChangesBtn = document.querySelector('.save-changes-btn');
const themeToggle = document.getElementById('theme-toggle');
const userMenuBtn = document.getElementById('user-menu-btn');
const userDropdown = document.getElementById('user-dropdown');
const logoutLink = document.getElementById('logout-link');
const avatarImage = document.getElementById('avatar-image');
const avatarImageDropdown = document.getElementById('avatar-image-dropdown');
const avatarInitials = document.getElementById('avatar-initials');
const avatarInitialsDropdown = document.getElementById('avatar-initials-dropdown');
const userName = document.getElementById('user-name');
const userEmail = document.getElementById('user-email');
const currentPasswordInput = document.getElementById('currentPassword');
const newPasswordInput = document.getElementById('newPassword');
const confirmPasswordInput = document.getElementById('confirmPassword');
const changePasswordBtn = document.getElementById('changePasswordBtn');
const passwordMessage = document.getElementById('passwordMessage');
const forgotPasswordLink = document.getElementById('forgotPasswordLink');

// Subscription Elements
const freeSubscriptionCard = document.getElementById('free-subscription-card');
const activeSubscriptionCard = document.getElementById('active-subscription-card');
const paymentHistoryCard = document.getElementById('payment-history-card');
const currentPlanName = document.getElementById('current-plan-name');
const subscriptionStatusBadge = document.getElementById('subscription-status-badge');
const subscriptionPeriodText = document.getElementById('subscription-period-text');
const nextPaymentDate = document.getElementById('next-payment-date');
const paymentAmount = document.getElementById('payment-amount');
const paymentMethod = document.getElementById('payment-method');
const changePlanBtn = document.getElementById('change-plan-btn');
const updatePaymentBtn = document.getElementById('update-payment-btn');
const cancelSubscriptionBtn = document.getElementById('cancel-subscription-btn');
const noPaymentHistory = document.getElementById('no-payment-history');
const paymentHistoryList = document.getElementById('payment-history-list');

// Modal Elements
const paymentUpdateModal = document.getElementById('payment-update-modal');
const modalOverlay = document.getElementById('modal-overlay');
const closeModalBtn = document.getElementById('close-modal-btn');
const paymentUpdateForm = document.getElementById('payment-update-form');
const cardHolderUpdate = document.getElementById('card-holder-update');
const cardNumberUpdate = document.getElementById('card-number-update');
const expiryDateUpdate = document.getElementById('expiry-date-update');
const cvvUpdate = document.getElementById('cvv-update');
const updateCardBtn = document.getElementById('update-card-btn');
const paymentUpdateMessage = document.getElementById('payment-update-message');

// User Menu Functionality
function toggleUserMenu(event) {
    event.stopPropagation();
    userDropdown.classList.toggle('show');
    userMenuBtn.classList.toggle('active');
}

// Theme Toggle Functionality
function toggleTheme() {
    const currentTheme = localStorage.getItem('theme') || 'light';
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    window.setTheme(newTheme);
}

// Theme management - update theme buttons only
function updateThemeButtons(theme) {
    const themeButtons = document.querySelectorAll('.theme-btn');
    
    // Remove active class from all buttons
    themeButtons.forEach(btn => btn.classList.remove('active'));
    
    // Add active class to the correct button
    const activeButton = document.querySelector(`.theme-btn[data-theme="${theme}"]`);
    if (activeButton) {
        activeButton.classList.add('active');
    }
}

// Update user info in UI
function updateUserInfo(userData, user) {
    // Update form fields
    fullNameInput.value = userData.fullName || '';
    emailInput.value = userData.email || user.email;
    phoneInput.value = userData.phone || '';
    locationInput.value = userData.location || '';
    
    // Update user info in dropdown
    if (userName) userName.textContent = userData.fullName || user.displayName || 'Guest User';
    if (userEmail) userEmail.textContent = user.email;
    
    // Handle avatar - first check for photoURL in Firestore
    if (userData.photoURL) {
        // User has a profile picture in Firestore
        if (avatarImage) {
            avatarImage.src = userData.photoURL;
            avatarImage.style.display = 'block';
        }
        if (avatarImageDropdown) {
            avatarImageDropdown.src = userData.photoURL;
            avatarImageDropdown.style.display = 'block';
        }
        if (avatarInitials) avatarInitials.style.display = 'none';
        if (avatarInitialsDropdown) avatarInitialsDropdown.style.display = 'none';
    } else if (user.photoURL) {
        // Fallback to Auth profile picture
        if (avatarImage) {
            avatarImage.src = user.photoURL;
            avatarImage.style.display = 'block';
        }
        if (avatarImageDropdown) {
            avatarImageDropdown.src = user.photoURL;
            avatarImageDropdown.style.display = 'block';
        }
        if (avatarInitials) avatarInitials.style.display = 'none';
        if (avatarInitialsDropdown) avatarInitialsDropdown.style.display = 'none';
    } else {
        // No profile picture, show initials
        if (avatarImage) avatarImage.style.display = 'none';
        if (avatarImageDropdown) avatarImageDropdown.style.display = 'none';
        if (avatarInitials) avatarInitials.style.display = 'flex';
        if (avatarInitialsDropdown) avatarInitialsDropdown.style.display = 'flex';
        
        const initials = userData.fullName 
            ? userData.fullName.split(' ').map(name => name[0]).join('').toUpperCase()
            : user.displayName 
                ? user.displayName.split(' ').map(name => name[0]).join('').toUpperCase()
                : user.email ? user.email[0].toUpperCase() : 'JN';
            
        if (avatarInitials) avatarInitials.textContent = initials;
        if (avatarInitialsDropdown) avatarInitialsDropdown.textContent = initials;
    }
}

// Load user profile data from Firestore
async function loadUserProfile() {
    const user = firebase.auth().currentUser;
    if (!user) {
        console.log('No user found, redirecting to login');
        window.location.href = '../../index.html';
        return;
    }

    try {
        console.log('Loading profile for user:', user.uid);
        // First try to get the user document
        const userRef = firebase.firestore().collection('users').doc(user.uid);
        const userDoc = await userRef.get();

        if (userDoc.exists) {
            console.log('User document found');
            const userData = userDoc.data();
            
            // If user has a photoURL in auth but not in Firestore, update Firestore
            if (user.photoURL && !userData.photoURL) {
                await userRef.update({
                    photoURL: user.photoURL
                });
                userData.photoURL = user.photoURL;
            }
            
            updateUserInfo(userData, user);
        } else {
            console.log('Creating new user document');
            // If no document exists, create one with default values
            const defaultUserData = {
                fullName: user.displayName || '',
                email: user.email,
                phone: '',
                location: '',
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                uid: user.uid
            };
            
            // If user has a photo URL from auth, save it to Firestore
            if (user.photoURL) {
                defaultUserData.photoURL = user.photoURL;
            }
            
            // Create the user document
            await userRef.set(defaultUserData);
            
            // Update the UI with default data
            updateUserInfo(defaultUserData, user);
        }
    } catch (error) {
        console.error('Error loading user profile:', error);
        // Show more detailed error message
        alert('Error loading profile data: ' + error.message);
    }
}

// Save profile changes to Firestore
async function saveProfileChanges() {
    const user = firebase.auth().currentUser;
    if (!user) {
        alert('You must be logged in to save changes');
        return;
    }

    try {
        // Show loading state
        saveChangesBtn.disabled = true;
        saveChangesBtn.textContent = 'Saving...';
        
        // Prepare data to update
        const updatedData = {
            fullName: fullNameInput.value,
            email: emailInput.value,
            phone: phoneInput.value,
            location: locationInput.value,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        // Update Firestore
        await firebase.firestore().collection('users').doc(user.uid).update(updatedData);
        
        // Get the updated user data
        const userDoc = await firebase.firestore().collection('users').doc(user.uid).get();
        const userData = userDoc.data();
        
        // Update UI
        updateUserInfo(userData, user);
        
        // Show success message
        alert('Profile updated successfully!');
    } catch (error) {
        console.error('Error saving profile:', error);
        alert('Error saving profile: ' + error.message);
    } finally {
        // Reset button state
        saveChangesBtn.disabled = false;
        saveChangesBtn.textContent = 'Save Changes';
    }
}

// Show message function
function showMessage(message, type) {
    passwordMessage.textContent = message;
    passwordMessage.className = `message-container ${type}`;
    passwordMessage.innerHTML = `<i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i>${message}`;
    
    // Clear message after 5 seconds
    setTimeout(() => {
        passwordMessage.className = 'message-container';
    }, 5000);
}

// Change password function
async function changePassword() {
    const currentPassword = currentPasswordInput.value;
    const newPassword = newPasswordInput.value;
    const confirmPassword = confirmPasswordInput.value;

    // Validate inputs
    if (!currentPassword || !newPassword || !confirmPassword) {
        showMessage('Please fill in all password fields', 'error');
        return;
    }

    if (newPassword !== confirmPassword) {
        showMessage('New passwords do not match', 'error');
        return;
    }

    if (newPassword.length < 6) {
        showMessage('New password must be at least 6 characters long', 'error');
        return;
    }

    const user = firebase.auth().currentUser;
    if (!user) {
        showMessage('You must be logged in to change your password', 'error');
        return;
    }

    try {
        // Reauthenticate user
        const credential = firebase.auth.EmailAuthProvider.credential(
            user.email,
            currentPassword
        );
        await user.reauthenticateWithCredential(credential);

        // Update password
        await user.updatePassword(newPassword);

        // Clear form
        currentPasswordInput.value = '';
        newPasswordInput.value = '';
        confirmPasswordInput.value = '';

        showMessage('Password updated successfully!', 'success');
    } catch (error) {
        console.error('Error changing password:', error);
        let errorMessage = 'Error changing password';
        
        switch (error.code) {
            case 'auth/wrong-password':
                errorMessage = 'Current password is incorrect';
                break;
            case 'auth/weak-password':
                errorMessage = 'New password is too weak';
                break;
            case 'auth/requires-recent-login':
                errorMessage = 'Please log in again to change your password';
                break;
            default:
                errorMessage = error.message;
        }
        
        showMessage(errorMessage, 'error');
    }
}

// Forgot password function
function handleForgotPassword(event) {
    event.preventDefault();
    const email = firebase.auth().currentUser?.email;
    
    if (!email) {
        showMessage('Please log in to reset your password', 'error');
        return;
    }

    firebase.auth().sendPasswordResetEmail(email)
        .then(() => {
            showMessage('Password reset email sent! Please check your inbox.', 'success');
        })
        .catch((error) => {
            console.error('Error sending password reset email:', error);
            showMessage('Error sending password reset email: ' + error.message, 'error');
        });
}

// Subscription related functions
async function loadSubscriptionData(userId) {
    if (!userId) {
        console.log('No user ID provided, defaulting to free plan');
        showFreeSubscription();
        return;
    }

    try {
        console.log('Checking subscription for user:', userId);
        // Query Firestore for active subscription
        const subscriptionsRef = firebase.firestore().collection('subscriptions');
        const snapshot = await subscriptionsRef
            .where('userId', '==', userId)
            .where('status', 'in', ['active', 'trial'])
            .get();

        if (snapshot.empty) {
            console.log('No active subscription found for user');
            showFreeSubscription();
            return;
        }

        // Get the active subscription data
        const subscription = snapshot.docs[0].data();
        const subscriptionId = snapshot.docs[0].id;
        console.log('Found active subscription:', subscription);

        // Load payment history
        loadPaymentHistory(userId, subscriptionId);

        // Display active subscription
        displayActiveSubscription(subscription);
    } catch (error) {
        console.error('Error loading subscription data:', error);
        showFreeSubscription(); // Default to free plan view on error
    }
}

function showFreeSubscription() {
    if (freeSubscriptionCard) freeSubscriptionCard.style.display = 'block';
    if (activeSubscriptionCard) activeSubscriptionCard.style.display = 'none';
    if (paymentHistoryCard) paymentHistoryCard.style.display = 'none';
}

function displayActiveSubscription(subscription) {
    if (!activeSubscriptionCard) return;

    // Show active subscription card, hide free subscription card
    freeSubscriptionCard.style.display = 'none';
    activeSubscriptionCard.style.display = 'block';
    paymentHistoryCard.style.display = 'block';

    // Update plan name with proper capitalization
    const planDisplayName = subscription.plan.charAt(0).toUpperCase() + subscription.plan.slice(1);
    currentPlanName.textContent = planDisplayName;

    // Update status badge
    subscriptionStatusBadge.textContent = subscription.status === 'trial' ? 'Trial' : 'Active';
    if (subscription.status === 'trial') {
        subscriptionStatusBadge.classList.add('trial');
    } else {
        subscriptionStatusBadge.classList.remove('trial');
    }

    // Update subscription period
    const periodText = subscription.billingPeriod === 'annually' ? 'Annual billing' : 'Monthly billing';
    subscriptionPeriodText.textContent = periodText;

    // Calculate and display next payment date
    let nextPaymentDateObj;
    if (subscription.status === 'trial') {
        // If in trial, next payment is when trial ends
        nextPaymentDateObj = subscription.trialEnds.toDate();
    } else {
        // If active, calculate from last payment date + period
        const lastPayment = subscription.lastBillingDate 
            ? subscription.lastBillingDate.toDate() 
            : subscription.createdAt.toDate();
        
        nextPaymentDateObj = new Date(lastPayment);
        if (subscription.billingPeriod === 'annually') {
            nextPaymentDateObj.setFullYear(nextPaymentDateObj.getFullYear() + 1);
        } else {
            nextPaymentDateObj.setMonth(nextPaymentDateObj.getMonth() + 1);
        }
    }
    
    // Format the date for display
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    nextPaymentDate.textContent = nextPaymentDateObj.toLocaleDateString(undefined, options);

    // Set payment amount
    const isAnnual = subscription.billingPeriod === 'annually';
    const priceDisplayValue = isAnnual 
        ? (subscription.plan === 'premium' ? '290 MAD' : '690 MAD')
        : (subscription.plan === 'premium' ? '29 MAD' : '69 MAD');
    paymentAmount.textContent = priceDisplayValue;

    // Set payment method if available
    if (subscription.paymentMethod) {
        const method = subscription.paymentMethod;
        if (method.type === 'credit_card' && method.last4) {
            paymentMethod.textContent = `Card ending in ${method.last4}`;
        } else {
            paymentMethod.textContent = 'Credit/Debit Card';
        }
    } else {
        paymentMethod.textContent = 'Credit/Debit Card';
    }
}

async function loadPaymentHistory(userId, subscriptionId) {
    if (!paymentHistoryList || !noPaymentHistory) return;

    try {
        const paymentsRef = firebase.firestore().collection('payments');
        const snapshot = await paymentsRef
            .where('userId', '==', userId)
            .where('subscriptionId', '==', subscriptionId)
            .orderBy('timestamp', 'desc')
            .limit(5)
            .get();

        if (snapshot.empty) {
            noPaymentHistory.style.display = 'block';
            paymentHistoryList.innerHTML = '';
            return;
        }

        // Hide the no history message
        noPaymentHistory.style.display = 'none';

        // Clear existing payment history
        paymentHistoryList.innerHTML = '';

        // Add payment history items
        snapshot.forEach(doc => {
            const payment = doc.data();
            const paymentDate = payment.timestamp.toDate();
            const dateOptions = { year: 'numeric', month: 'long', day: 'numeric' };
            
            const historyItem = document.createElement('div');
            historyItem.className = 'payment-history-item';
            historyItem.innerHTML = `
                <div class="payment-details">
                    <span class="payment-plan">${payment.plan.charAt(0).toUpperCase() + payment.plan.slice(1)} Plan</span>
                    <span class="payment-date">${paymentDate.toLocaleDateString(undefined, dateOptions)}</span>
                    <span class="payment-id">ID: ${doc.id.slice(-8)}</span>
                </div>
                <span class="payment-amount">${payment.amount} ${payment.currency}</span>
            `;
            
            paymentHistoryList.appendChild(historyItem);
        });
    } catch (error) {
        console.error('Error loading payment history:', error);
        noPaymentHistory.style.display = 'block';
        paymentHistoryList.innerHTML = '';
    }
}

// Function to handle subscription cancellation
async function cancelSubscription() {
    if (!confirm('Are you sure you want to cancel your subscription? You will lose access to premium features at the end of your current billing period.')) {
        return;
    }

    const user = firebase.auth().currentUser;
    if (!user) {
        alert('You must be logged in to cancel your subscription');
        return;
    }

    try {
        // First get the active subscription
        const subscriptionsRef = firebase.firestore().collection('subscriptions');
        const snapshot = await subscriptionsRef
            .where('userId', '==', user.uid)
            .where('status', 'in', ['active', 'trial'])
            .get();

        if (snapshot.empty) {
            alert('No active subscription found to cancel');
            return;
        }

        const subscriptionDoc = snapshot.docs[0];
        const subscription = subscriptionDoc.data();
        
        // Update subscription status to cancelled
        await subscriptionDoc.ref.update({
            status: 'cancelled',
            cancelledAt: firebase.firestore.FieldValue.serverTimestamp(),
            autoRenew: false,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        // Update the UI to reflect cancellation
        subscriptionStatusBadge.textContent = 'Cancelled';
        subscriptionStatusBadge.classList.add('cancelled');
        
        // Update user record
        await firebase.firestore().collection('users').doc(user.uid).update({
            'currentSubscription.status': 'cancelled'
        });

        alert('Your subscription has been cancelled. You will have access to premium features until the end of your current billing period.');
    } catch (error) {
        console.error('Error cancelling subscription:', error);
        alert('Error cancelling subscription: ' + error.message);
    }
}

// Function to redirect to subscription page to change plan
function changePlan() {
    window.location.href = '../subscription/subscription.html';
}

// Function to show payment update form
function updatePaymentMethod() {
    // Show the modal
    openModal();
    
    // Get a fresh reference to the DOM element
    const cardHolderUpdate = document.getElementById('card-holder-update');
    
    // Pre-populate cardholder name if available
    const user = firebase.auth().currentUser;
    if (user && cardHolderUpdate) {
        firebase.firestore().collection('users').doc(user.uid).get()
            .then(doc => {
                if (doc.exists) {
                    const userData = doc.data();
                    if (userData.fullName) {
                        cardHolderUpdate.value = userData.fullName;
                    }
                }
            })
            .catch(error => {
                console.error('Error fetching user data:', error);
            });
    }
}

// Function to open the modal
function openModal() {
    // Get fresh references to DOM elements
    const paymentUpdateModal = document.getElementById('payment-update-modal');
    const modalOverlay = document.getElementById('modal-overlay');
    
    if (paymentUpdateModal && modalOverlay) {
        paymentUpdateModal.classList.add('active');
        modalOverlay.classList.add('active');
        document.body.style.overflow = 'hidden'; // Prevent scrolling
    } else {
        console.error('Modal elements not found');
    }
}

// Function to close the modal
function closeModal() {
    // Get fresh references to DOM elements
    const paymentUpdateModal = document.getElementById('payment-update-modal');
    const modalOverlay = document.getElementById('modal-overlay');
    
    console.log('Closing modal, elements found:', !!paymentUpdateModal, !!modalOverlay);
    
    if (paymentUpdateModal && modalOverlay) {
        paymentUpdateModal.classList.remove('active');
        modalOverlay.classList.remove('active');
        document.body.style.overflow = ''; // Restore scrolling
        
        // Reset form and messages
        const paymentUpdateForm = document.getElementById('payment-update-form');
        const paymentUpdateMessage = document.getElementById('payment-update-message');
        
        if (paymentUpdateForm) {
            paymentUpdateForm.reset();
        }
        if (paymentUpdateMessage) {
            paymentUpdateMessage.className = 'message-container';
            paymentUpdateMessage.textContent = '';
        }
    }
}

// Format card number input (add spaces after every 4 digits)
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
    
    // Highlight card type icon based on first digit
    updateCardTypeIcon(value);
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

// Validate and update card icon based on first digits
function updateCardTypeIcon(number) {
    // Remove all active classes first
    document.querySelectorAll('.card-icons i').forEach(icon => {
        icon.classList.remove('active');
    });
    
    // Get first digit
    const firstDigit = number.charAt(0);
    
    // Simple card type detection
    if (firstDigit === '4') {
        // Visa
        document.querySelector('.card-icons .fa-cc-visa').classList.add('active');
    } else if (['5', '2'].includes(firstDigit)) {
        // Mastercard
        document.querySelector('.card-icons .fa-cc-mastercard').classList.add('active');
    } else if (['3'].includes(firstDigit)) {
        // Amex
        document.querySelector('.card-icons .fa-cc-amex').classList.add('active');
    }
}

// Show message in payment update modal
function showPaymentUpdateMessage(message, type) {
    // Get fresh reference to the message element
    const paymentUpdateMessage = document.getElementById('payment-update-message');
    
    if (paymentUpdateMessage) {
        paymentUpdateMessage.className = `message-container ${type}`;
        paymentUpdateMessage.innerHTML = `<i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i>${message}`;
    } else {
        console.error('Payment update message element not found');
    }
}

// Handle payment form submission
async function handlePaymentUpdateSubmission(e) {
    e.preventDefault();
    
    // Get fresh references to DOM elements
    const cardHolderUpdate = document.getElementById('card-holder-update');
    const cardNumberUpdate = document.getElementById('card-number-update');
    const expiryDateUpdate = document.getElementById('expiry-date-update');
    const cvvUpdate = document.getElementById('cvv-update');
    const updateCardBtn = document.getElementById('update-card-btn');
    const paymentMethod = document.getElementById('payment-method');
    
    // Verify elements exist
    if (!cardHolderUpdate || !cardNumberUpdate || !expiryDateUpdate || !cvvUpdate || !updateCardBtn) {
        showPaymentUpdateMessage('Error: Form elements not found', 'error');
        return;
    }
    
    // Basic validation
    const cardholderName = cardHolderUpdate.value.trim();
    const cardNumber = cardNumberUpdate.value.replace(/\s/g, '');
    const expiryDate = expiryDateUpdate.value;
    const cvv = cvvUpdate.value;
    
    // Simple validation
    if (!cardholderName || cardholderName.length < 3) {
        showPaymentUpdateMessage('Please enter a valid cardholder name', 'error');
        return;
    }
    
    if (!cardNumber || cardNumber.length < 15) {
        showPaymentUpdateMessage('Please enter a valid card number', 'error');
        return;
    }
    
    if (!expiryDate || !expiryDate.includes('/')) {
        showPaymentUpdateMessage('Please enter a valid expiry date (MM/YY)', 'error');
        return;
    }
    
    // Parse expiry date
    const [month, year] = expiryDate.split('/');
    const expiryMonth = parseInt(month, 10);
    const expiryYear = parseInt('20' + year, 10);
    
    // Check if card is expired
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1; // JavaScript months are 0-indexed
    
    if (
        isNaN(expiryMonth) || 
        isNaN(expiryYear) || 
        expiryMonth < 1 || 
        expiryMonth > 12 ||
        expiryYear < currentYear || 
        (expiryYear === currentYear && expiryMonth < currentMonth)
    ) {
        showPaymentUpdateMessage('Card is expired or expiry date is invalid', 'error');
        return;
    }
    
    if (!cvv || cvv.length < 3) {
        showPaymentUpdateMessage('Please enter a valid CVV code', 'error');
        return;
    }
    
    // Get user
    const user = firebase.auth().currentUser;
    if (!user) {
        showPaymentUpdateMessage('You must be logged in to update payment method', 'error');
        return;
    }
    
    // Show loading state
    updateCardBtn.disabled = true;
    updateCardBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
    
    try {
        // Get the current subscription
        const subscriptionsRef = firebase.firestore().collection('subscriptions');
        const snapshot = await subscriptionsRef
            .where('userId', '==', user.uid)
            .where('status', 'in', ['active', 'trial'])
            .get();
        
        if (snapshot.empty) {
            throw new Error('No active subscription found');
        }
        
        const subscriptionDoc = snapshot.docs[0];
        
        // In a real app, you would validate the card with a payment processor here
        // For this demo, we'll just update the payment method record in Firestore
        await subscriptionDoc.ref.update({
            paymentMethod: {
                type: 'credit_card',
                last4: cardNumber.slice(-4),
                holderName: cardholderName,
                expiryMonth: expiryMonth,
                expiryYear: expiryYear,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            },
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        // Update displayed card info in the UI
        paymentMethod.textContent = `Card ending in ${cardNumber.slice(-4)}`;
        
        // Show success message
        showPaymentUpdateMessage('Payment method updated successfully!', 'success');
        
        // Close modal after delay
        setTimeout(() => {
            closeModal();
        }, 2000);
    } catch (error) {
        console.error('Error updating payment method:', error);
        showPaymentUpdateMessage(error.message || 'Failed to update payment method', 'error');
    } finally {
        // Reset button state
        updateCardBtn.disabled = false;
        updateCardBtn.textContent = 'Update Payment Method';
    }
}

// Document Ready
document.addEventListener('DOMContentLoaded', () => {
    // Close dropdown when clicking outside
    document.addEventListener('click', (event) => {
        if (userDropdown.classList.contains('show') && 
            !userMenuBtn.contains(event.target) && 
            !userDropdown.contains(event.target)) {
            userDropdown.classList.remove('show');
            userMenuBtn.classList.remove('active');
        }
    });

    // Theme button initialization
    const themeButtons = document.querySelectorAll('.theme-btn');
    const savedTheme = localStorage.getItem('theme') || 'system';
    
    // Initialize theme
    setTheme(savedTheme);
    
    // Theme button click handlers
    themeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const theme = btn.dataset.theme;
            setTheme(theme);
        });
    });

    // System theme change listener
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        if (localStorage.getItem('theme') === 'system') {
            setTheme('system');
        }
    });

    // Event Listeners
    if (themeToggle) {
        themeToggle.addEventListener('click', toggleTheme);
    }
    
    if (userMenuBtn) {
        userMenuBtn.addEventListener('click', toggleUserMenu);
    }

    if (saveChangesBtn) {
        saveChangesBtn.addEventListener('click', saveProfileChanges);
    }

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

    // Listen for auth state changes
    firebase.auth().onAuthStateChanged((user) => {
        if (user) {
            console.log('User is signed in:', user.email);
            console.log('User display name:', user.displayName);
            console.log('User photo URL:', user.photoURL);
            loadUserProfile();
            
            // Load subscription data
            loadSubscriptionData(user.uid);
            
            // Update menu content for signed-in users
            const menuSections = document.querySelector('.menu-sections');
            if (menuSections) {
                menuSections.innerHTML = `
                    <a href="../home/home.html">
                        <i class="fas fa-home"></i>
                        Home
                    </a>
                    <a href="../jobs/jobs.html">
                        <i class="fas fa-briefcase"></i>
                        Jobs
                    </a>
                    <a href="../posts/posts.html">
                        <i class="fas fa-newspaper"></i>
                        Posts
                    </a>
                    <div class="menu-divider"></div>
                    <a href="../saved/saved.html">
                        <i class="fas fa-heart"></i>
                        Saved Jobs
                        <span class="badge">0</span>
                    </a>
                    <a href="../chats/chats.html">
                        <i class="fas fa-comments"></i>
                        Chats
                    </a>
                    <div class="menu-divider"></div>
                    <a href="../user-account/account.html">
                        <i class="fas fa-user"></i>
                        My Profile
                    </a>
                    <a href="settings.html">
                        <i class="fas fa-cog"></i>
                        Settings
                    </a>
                    <div class="menu-divider"></div>
                    <a href="#" id="logout-link" class="logout-link">
                        <i class="fas fa-sign-out-alt"></i>
                        Sign Out
                    </a>
                `;
                
                // Reattach logout event listener
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
        } else {
            console.log('No user is signed in, redirecting to login');
            window.location.href = '../login/login.html';
        }
    });

    // Add event listeners for password change
    if (changePasswordBtn) {
        changePasswordBtn.addEventListener('click', changePassword);
    }

    if (forgotPasswordLink) {
        forgotPasswordLink.addEventListener('click', handleForgotPassword);
    }
    
    // Add event listeners for subscription management
    if (changePlanBtn) {
        changePlanBtn.addEventListener('click', changePlan);
    }
    
    if (updatePaymentBtn) {
        updatePaymentBtn.addEventListener('click', updatePaymentMethod);
    }
    
    if (cancelSubscriptionBtn) {
        cancelSubscriptionBtn.addEventListener('click', cancelSubscription);
    }
    
    // Add event listeners for payment update modal - using document delegation
    document.addEventListener('click', function(e) {
        // Check if the close button was clicked
        if (e.target.closest('#close-modal-btn') || e.target.id === 'close-modal-btn') {
            console.log('Close button clicked');
            closeModal();
            return;
        }
        
        // Check if clicked outside the modal content
        const modalContent = document.querySelector('.modal-content');
        const modal = document.getElementById('payment-update-modal');
        
        if (modal && modal.classList.contains('active')) {
            if (e.target === modal || e.target.id === 'modal-overlay') {
                console.log('Clicked outside modal content');
                closeModal();
            }
        }
    });
    
    // Add event listeners for payment form inputs
    if (cardNumberUpdate) {
        cardNumberUpdate.addEventListener('input', formatCardNumber);
    }
    
    if (expiryDateUpdate) {
        expiryDateUpdate.addEventListener('input', formatExpiryDate);
    }
    
    if (cvvUpdate) {
        cvvUpdate.addEventListener('input', formatCVV);
    }
    
    // Add event listener for payment form submission
    if (paymentUpdateForm) {
        paymentUpdateForm.addEventListener('submit', handlePaymentUpdateSubmission);
    }
    
    // Close modal with Escape key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && paymentUpdateModal && paymentUpdateModal.classList.contains('active')) {
            closeModal();
        }
    });

    // Close button direct function
    document.body.addEventListener('click', function(e) {
        const closeBtn = document.getElementById('close-modal-btn');
        if (closeBtn && (e.target === closeBtn || closeBtn.contains(e.target))) {
            console.log('Close button clicked directly');
            e.preventDefault();
            e.stopPropagation();
            closeModal();
        }
        
        // Also handle overlay clicks
        const overlay = document.getElementById('modal-overlay');
        if (overlay && e.target === overlay) {
            console.log('Overlay clicked directly');
            closeModal();
        }
    }, true); // Use capture phase to ensure this runs first
});
