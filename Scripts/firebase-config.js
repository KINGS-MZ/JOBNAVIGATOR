// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyCb-WQn8hxetYE2wWMQ37y7vRAKl0hFbkI",
    authDomain: "jobnav-799f0.firebaseapp.com",
    projectId: "jobnav-799f0",
    storageBucket: "jobnav-799f0.firebasestorage.app",
    messagingSenderId: "908819629942",
    appId: "1:908819629942:web:e569e324a0959efaef1c57",
    measurementId: "G-58CZK5KRN4"
};

// Initialize Firebase
const app = firebase.initializeApp(firebaseConfig);
const analytics = firebase.analytics();
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

// Enable persistence
db.enablePersistence()
    .catch((err) => {
        if (err.code === 'failed-precondition') {
            console.warn('Multiple tabs open, persistence can only be enabled in one tab at a time.');
        } else if (err.code === 'unimplemented') {
            console.warn('The current browser does not support persistence.');
        }
    });

// Set auth persistence to LOCAL
auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);

// Auth state observer
auth.onAuthStateChanged((user) => {
    if (user) {
        console.log('User is signed in:', user.email);
        // Update last login
        db.collection('users').doc(user.uid).update({
            lastLogin: firebase.firestore.FieldValue.serverTimestamp()
        }).catch(console.error);
        
        // Update UI
        updateUIForUser(user);
        
        // Log event
        analytics.logEvent('user_login', {
            provider: user.providerData[0].providerId
        });
    } else {
        console.log('User is signed out');
        updateUIForGuest();
    }
});

// UI update functions
function updateUIForUser(user) {
    document.querySelectorAll('.auth-buttons').forEach(el => el.style.display = 'none');
    document.querySelectorAll('.user-profile').forEach(el => el.style.display = 'flex');
    document.querySelectorAll('.user-name').forEach(el => el.textContent = user.displayName || 'User');
    document.querySelectorAll('.user-email').forEach(el => el.textContent = user.email);
    document.querySelectorAll('.user-avatar').forEach(el => {
        el.src = user.photoURL || '../images/default-avatar.png';
        el.alt = user.displayName || 'User';
    });
}

function updateUIForGuest() {
    document.querySelectorAll('.auth-buttons').forEach(el => el.style.display = 'flex');
    document.querySelectorAll('.user-profile').forEach(el => el.style.display = 'none');
}

// Auth providers
const googleProvider = new firebase.auth.GoogleAuthProvider();
const microsoftProvider = new firebase.auth.OAuthProvider('microsoft.com');

// Configure Microsoft provider
microsoftProvider.setCustomParameters({
    prompt: 'select_account',
    tenant: 'common'
});

// Auth functions
async function signInWithGoogle() {
    try {
        const result = await auth.signInWithPopup(googleProvider);
        await createOrUpdateUser(result.user);
        window.location.href = '/home.html';
    } catch (error) {
        console.error('Google sign in error:', error);
        alert(error.message);
    }
}

async function signInWithMicrosoft() {
    try {
        const result = await auth.signInWithPopup(microsoftProvider);
        await createOrUpdateUser(result.user);
        window.location.href = '/home.html';
    } catch (error) {
        console.error('Microsoft sign in error:', error);
        alert(error.message);
    }
}

async function signInWithEmail(email, password) {
    try {
        const result = await auth.signInWithEmailAndPassword(email, password);
        await createOrUpdateUser(result.user);
        window.location.href = '/home.html';
    } catch (error) {
        console.error('Email sign in error:', error);
        alert(error.message);
    }
}

async function signUpWithEmail(email, password, name) {
    try {
        const result = await auth.createUserWithEmailAndPassword(email, password);
        await result.user.updateProfile({ displayName: name });
        await createOrUpdateUser(result.user);
        window.location.href = '/home.html';
    } catch (error) {
        console.error('Email sign up error:', error);
        alert(error.message);
    }
}

async function signOut() {
    try {
        await auth.signOut();
        window.location.href = '/login.html';
    } catch (error) {
        console.error('Sign out error:', error);
        alert(error.message);
    }
}

async function createOrUpdateUser(user) {
    const userRef = db.collection('users').doc(user.uid);
    const userData = {
        displayName: user.displayName,
        email: user.email,
        photoURL: user.photoURL,
        lastLogin: firebase.firestore.FieldValue.serverTimestamp(),
        provider: user.providerData[0].providerId
    };

    try {
        const doc = await userRef.get();
        if (!doc.exists) {
            // New user
            await userRef.set({
                ...userData,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                preferences: {
                    theme: 'light',
                    notifications: true
                },
                savedJobs: [],
                appliedJobs: [],
                enrolledCourses: []
            });
        } else {
            // Existing user
            await userRef.update(userData);
        }
    } catch (error) {
        console.error('Error creating/updating user:', error);
        throw error;
    }
}

// Export functions
window.firebaseAuth = {
    signInWithGoogle,
    signInWithMicrosoft,
    signInWithEmail,
    signUpWithEmail,
    signOut,
    auth,
    db,
    storage,
    analytics
};
