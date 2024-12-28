// DOM Elements
const loginForm = document.getElementById('login-form');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const togglePasswordBtn = document.querySelector('.toggle-password');
const rememberMeCheckbox = document.getElementById('remember');
const googleBtn = document.getElementById('googleSignIn');
const microsoftBtn = document.getElementById('microsoftSignIn');

// Firebase services
const auth = firebase.auth();
const analytics = firebase.analytics();

// Initialize providers
const googleProvider = new firebase.auth.GoogleAuthProvider();
const microsoftProvider = new firebase.auth.OAuthProvider('microsoft.com');

// Configure Microsoft provider
microsoftProvider.setCustomParameters({
    prompt: 'select_account',
    tenant: 'common'
});

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    // Check if user was previously logged in
    const rememberedEmail = localStorage.getItem('rememberedEmail');
    if (rememberedEmail) {
        emailInput.value = rememberedEmail;
        rememberMeCheckbox.checked = true;
    }

    // Add event listeners
    loginForm?.addEventListener('submit', handleLogin);
    togglePasswordBtn?.addEventListener('click', togglePasswordVisibility);
    googleBtn?.addEventListener('click', () => firebaseAuth.signInWithGoogle());
    microsoftBtn?.addEventListener('click', () => firebaseAuth.signInWithMicrosoft());
});

// Handle login form submission
async function handleLogin(e) {
    e.preventDefault();
    showLoader();

    const email = emailInput.value;
    const password = passwordInput.value;

    try {
        // Remember email if checkbox is checked
        if (rememberMeCheckbox.checked) {
            localStorage.setItem('rememberedEmail', email);
        } else {
            localStorage.removeItem('rememberedEmail');
        }

        await firebaseAuth.signInWithEmail(email, password);
    } catch (error) {
        console.error('Login error:', error);
        showToast(error.message, 'error');
    } finally {
        hideLoader();
    }
}

// Toggle password visibility
function togglePasswordVisibility() {
    const type = passwordInput.type === 'password' ? 'text' : 'password';
    passwordInput.type = type;
    
    const icon = togglePasswordBtn.querySelector('i');
    icon.className = type === 'password' ? 'far fa-eye' : 'far fa-eye-slash';
}

// UI Helpers
function showLoader() {
    const loader = document.querySelector('.loader');
    if (loader) loader.style.display = 'flex';
}

function hideLoader() {
    const loader = document.querySelector('.loader');
    if (loader) loader.style.display = 'none';
}

function showToast(message, type = 'error') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.add('show');
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }, 100);
}

// Firebase Auth
const firebaseAuth = {
    async signInWithEmail(email, password) {
        try {
            const userCredential = await auth.signInWithEmailAndPassword(email, password);
            
            // Log analytics event
            analytics.logEvent('login', {
                method: 'email'
            });

            // Redirect to home page
            window.location.href = 'home.html';
        } catch (error) {
            throw error;
        }
    },

    async signInWithGoogle() {
        try {
            const result = await auth.signInWithPopup(googleProvider);
            
            // Log analytics event
            analytics.logEvent('login', {
                method: 'google'
            });

            // Create or update user document
            await createUserDocument(result.user);

            // Redirect to home page
            window.location.href = 'home.html';
        } catch (error) {
            throw error;
        }
    },

    async signInWithMicrosoft() {
        try {
            const result = await auth.signInWithPopup(microsoftProvider);
            
            // Log analytics event
            analytics.logEvent('login', {
                method: 'microsoft'
            });

            // Create or update user document
            await createUserDocument(result.user);

            // Redirect to home page
            window.location.href = 'home.html';
        } catch (error) {
            throw error;
        }
    }
};

// Create user document in Firestore
async function createUserDocument(user) {
    const userRef = firebase.firestore().collection('users').doc(user.uid);
    const snapshot = await userRef.get();

    if (!snapshot.exists) {
        try {
            await userRef.set({
                displayName: user.displayName,
                email: user.email,
                photoURL: user.photoURL,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                provider: user.providerData[0].providerId,
                preferences: {
                    theme: 'light'
                },
                notifications: {
                    emailNotifications: true,
                    jobAlerts: true,
                    applicationUpdates: true,
                    courseRecommendations: true
                },
                savedJobs: [],
                appliedJobs: [],
                enrolledCourses: []
            });
        } catch (error) {
            console.error('Error creating user document:', error);
            throw error;
        }
    }
}
