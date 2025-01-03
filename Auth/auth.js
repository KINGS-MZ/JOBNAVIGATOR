// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();

// Function to show toast and redirect
function showToastAndRedirect(user) {
    const overlay = document.querySelector('.toast-overlay');
    const toast = document.querySelector('.toast-notification');
    const userInfo = document.querySelector('.toast-user');
    
    if (!overlay || !toast || !userInfo) return;
    
    // Update user info in toast
    userInfo.textContent = `Signed in as ${user.email}`;
    
    // Show overlay and toast
    overlay.style.display = 'block';
    toast.style.display = 'block';
    
    // Redirect after 2 seconds
    setTimeout(() => {
        window.location.replace('/Pages/Home.html');
    }, 2000);
}

// Function to handle page access based on auth state
function handlePageAccess(user) {
    const currentPath = window.location.pathname;
    
    // Define protected and public paths
    const publicPaths = ['/Auth/auth.html', '/Auth/auth', '/index.html', '/', '/index'];
    const isPublicPath = publicPaths.some(path => currentPath.endsWith(path));
    
    if (user) {
        // User is signed in
        if (currentPath.includes('/Auth/')) {
            // If on auth page, redirect to home
            showToastAndRedirect(user);
        }
    } else {
        // User is signed out
        if (!isPublicPath) {
            // If not on a public page, redirect to auth
            window.location.replace('/Auth/auth.html');
        }
    }
}

// Keep track of the initial auth state check
let initialAuthCheckDone = false;

// Auth state change listener
auth.onAuthStateChanged((user) => {
    console.log('Auth state changed:', user ? 'signed in' : 'signed out');
    
    // Only handle page access after initial auth check
    if (!initialAuthCheckDone) {
        initialAuthCheckDone = true;
        handlePageAccess(user);
    }
    
    // Update localStorage
    if (user) {
        localStorage.setItem('user', JSON.stringify({
            email: user.email,
            displayName: user.displayName,
            uid: user.uid
        }));
    } else {
        localStorage.removeItem('user');
    }
});

// DOM Content Loaded Event Handler
document.addEventListener('DOMContentLoaded', function() {
    // Initialize auth form elements if they exist
    const signInForm = document.querySelector('.sign-in-form');
    const signUpForm = document.querySelector('.sign-up-form');
    
    if (signInForm && signUpForm) {
        const switchFormLinks = document.querySelectorAll('.switch-form-link');
        const welcomeTitle = document.querySelector('.welcome-content h1');
        const welcomeText = document.querySelector('.welcome-content p');

        // Check URL parameters for action
        const urlParams = new URLSearchParams(window.location.search);
        const action = urlParams.get('action');
        if (action === 'signup') {
            signInForm.classList.remove('active-form');
            signUpForm.classList.add('active-form');
            welcomeTitle.textContent = 'Join Our Community!';
            welcomeText.textContent = 'Create an account to unlock personalized job recommendations and start your career journey.';
        }

        // Form switch functionality
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

        // Sign In Form Submission
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
            } catch (error) {
                showError(error.message);
            }
        });

        // Sign Up Form Submission
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
                await userCredential.user.updateProfile({
                    displayName: fullName
                });
            } catch (error) {
                showError(error.message);
            }
        });

        // Social Sign In Buttons
        const googleBtn = document.querySelector('.google-btn');
        if (googleBtn) {
            googleBtn.addEventListener('click', async () => {
                try {
                    const provider = new firebase.auth.GoogleAuthProvider();
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
                    await auth.signInWithPopup(provider);
                } catch (error) {
                    showError(error.message);
                }
            });
        }
    }

    // Initialize floating menu if it exists
    const floatingMenu = document.querySelector('.floating-menu');
    if (floatingMenu) {
        initFloatingMenu();
    }
});

// Function to initialize floating menu
function initFloatingMenu() {
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

// Error handling
function showError(message) {
    let errorDiv = document.querySelector('.error-message');
    if (!errorDiv) {
        errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        document.querySelector('.form-container').prepend(errorDiv);
    }

    errorDiv.textContent = message;
    errorDiv.style.display = 'block';

    setTimeout(() => {
        errorDiv.style.display = 'none';
    }, 5000);
}
