// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = window.auth;

// Function to show error messages
function showError(message) {
    const errorDiv = document.querySelector('.error-message') || (() => {
        const div = document.createElement('div');
        div.className = 'error-message';
        document.querySelector('.form-container').prepend(div);
        return div;
    })();

    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
    setTimeout(() => errorDiv.style.display = 'none', 5000);
}

// Function to show success toast and redirect
function showToastAndRedirect(user) {
    const overlay = document.querySelector('.toast-overlay');
    const toast = document.querySelector('.toast-notification');
    const userInfo = document.querySelector('.toast-user');
    
    if (!overlay || !toast || !userInfo) {
        window.location.replace('/Pages/Home.html');
        return;
    }
    
    userInfo.textContent = `Signed in as ${user.email}`;
    overlay.style.display = 'block';
    toast.style.display = 'block';
    
    setTimeout(() => {
        window.location.replace('/Pages/Home.html');
    }, 2000);
}

// Function to determine if current page is public
function isPublicPage() {
    const path = window.location.pathname;
    return path.includes('/Auth/') || 
           path.endsWith('index.html') || 
           path === '/' || 
           path.endsWith('index');
}

// Initialize auth state handler
let authInitialized = false;

// Auth state change handler
auth.onAuthStateChanged((user) => {
    // Prevent handling auth state changes while signing in/out
    if (!authInitialized) {
        authInitialized = true;
        
        if (user) {
            // User is signed in
            if (window.location.pathname.includes('/Auth/')) {
                showToastAndRedirect(user);
            }
        } else {
            // User is signed out
            if (!isPublicPage()) {
                window.location.replace('/Auth/auth.html');
            }
        }
    }
});

// DOM Content Loaded Event Handler
document.addEventListener('DOMContentLoaded', () => {
    const signInForm = document.querySelector('.sign-in-form');
    const signUpForm = document.querySelector('.sign-up-form');
    
    if (!signInForm || !signUpForm) return;

    // Handle form switching
    const setupFormSwitching = () => {
        const switchFormLinks = document.querySelectorAll('.switch-form-link');
        const welcomeTitle = document.querySelector('.welcome-content h1');
        const welcomeText = document.querySelector('.welcome-content p');
        
        switchFormLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                signInForm.classList.toggle('active-form');
                signUpForm.classList.toggle('active-form');
                
                if (signUpForm.classList.contains('active-form')) {
                    welcomeTitle.textContent = 'Join Our Community!';
                    welcomeText.textContent = 'Create an account to unlock personalized job recommendations and start your career journey.';
                } else {
                    welcomeTitle.textContent = 'Welcome Back!';
                    welcomeText.textContent = 'Your journey to the perfect job starts here. Sign in to access personalized job recommendations and track your applications.';
                }
            });
        });
    };

    // Handle sign in
    signInForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('signInEmail').value;
        const password = document.getElementById('signInPassword').value;
        const rememberMe = document.querySelector('.remember-me input[type="checkbox"]').checked;

        try {
            await auth.setPersistence(
                rememberMe 
                    ? firebase.auth.Auth.Persistence.LOCAL
                    : firebase.auth.Auth.Persistence.SESSION
            );
            await auth.signInWithEmailAndPassword(email, password);
            authInitialized = false; // Reset auth state to handle the new sign-in
        } catch (error) {
            showError(error.message);
        }
    });

    // Handle sign up
    signUpForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('signUpEmail').value;
        const password = document.getElementById('signUpPassword').value;
        const confirmPassword = document.getElementById('signUpConfirmPassword').value;
        const fullName = document.getElementById('signUpName').value;

        if (password !== confirmPassword) {
            showError('Passwords do not match');
            return;
        }

        if (password.length < 6) {
            showError('Password should be at least 6 characters long');
            return;
        }

        try {
            const userCredential = await auth.createUserWithEmailAndPassword(email, password);
            await userCredential.user.updateProfile({ displayName: fullName });
            authInitialized = false; // Reset auth state to handle the new sign-up
        } catch (error) {
            showError(error.message);
        }
    });

    // Handle social sign-in
    const setupSocialSignIn = () => {
        const googleBtn = document.querySelector('.google-btn');
        if (googleBtn) {
            googleBtn.addEventListener('click', async () => {
                try {
                    const provider = new firebase.auth.GoogleAuthProvider();
                    authInitialized = false; // Reset auth state before sign-in
                    await auth.signInWithPopup(provider);
                } catch (error) {
                    showError(error.message);
                }
            });
        }

        const microsoftBtn = document.querySelector('.microsoft-btn');
        if (microsoftBtn) {
            microsoftBtn.addEventListener('click', async () => {
                try {
                    const provider = new firebase.auth.OAuthProvider('microsoft.com');
                    authInitialized = false; // Reset auth state before sign-in
                    await auth.signInWithPopup(provider);
                } catch (error) {
                    showError(error.message);
                }
            });
        }
    };

    // Initialize the auth page
    setupFormSwitching();
    setupSocialSignIn();

    // Handle signup action from URL
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('action') === 'signup') {
        signInForm.classList.remove('active-form');
        signUpForm.classList.add('active-form');
        document.querySelector('.welcome-content h1').textContent = 'Join Our Community!';
        document.querySelector('.welcome-content p').textContent = 'Create an account to unlock personalized job recommendations and start your career journey.';
    }

    // Initialize floating menu if it exists
    const floatingMenu = document.querySelector('.floating-menu');
    if (floatingMenu) {
        const mainBtn = document.querySelector('.floating-menu .main-btn');
        const menuItems = document.querySelector('.floating-menu .menu-items');
        const floatingThemeToggle = document.getElementById('floating-theme-toggle');

        mainBtn.addEventListener('click', () => {
            menuItems.classList.toggle('active');
            mainBtn.classList.toggle('active');
        });

        // Close menu when clicking outside
        document.addEventListener('click', (e) => {
            if (!document.querySelector('.floating-menu').contains(e.target)) {
                menuItems.classList.remove('active');
                mainBtn.classList.remove('active');
            }
        });

        // Theme toggle functionality for floating menu
        floatingThemeToggle.addEventListener('click', () => {
            document.body.classList.toggle('dark-mode');
            const icon = floatingThemeToggle.querySelector('i');
            if (document.body.classList.contains('dark-mode')) {
                icon.classList.remove('fa-moon');
                icon.classList.add('fa-sun');
            } else {
                icon.classList.remove('fa-sun');
                icon.classList.add('fa-moon');
            }
            menuItems.classList.remove('active');
        });
    }
});
