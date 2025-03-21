import { 
    auth
} from '../../Firebase/firebase-config.js';
import { 
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    GoogleAuthProvider,
    signInWithPopup,
    sendPasswordResetEmail,
    setPersistence,
    browserSessionPersistence,
    browserLocalPersistence,
    updateProfile,
    onAuthStateChanged,
    signInAnonymously
} from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js';
import { 
    db, 
    doc, 
    setDoc 
} from '../../Firebase/firebase-config.js';

// Check if user is already logged in
onAuthStateChanged(auth, (user) => {
    if (user) {
        // User is signed in, redirect to home page
        window.location.href = '/Pages/home/home.html';
        return;
    }
});

document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');
    const loginButton = document.getElementById('loginButton');
    const emailInput = document.getElementById('loginEmail');
    const passwordInput = document.getElementById('loginPassword');
    const rememberMeCheckbox = document.getElementById('rememberMe');
    const termsCheckbox = document.getElementById('termsCheckbox');
    const signupButton = signupForm?.querySelector('button[type="submit"]');
    const passwordFields = document.querySelectorAll('.password-field');
    const initialStepElements = document.querySelectorAll('.initial-step');
    const togglePasswordBtns = document.querySelectorAll('.toggle-password');
    const googleButtons = document.querySelectorAll('.google-btn');
    const forgotPasswordLink = document.querySelector('.forgot-password');
    const guestButton = document.querySelector('.guest-btn');

    // Disable signup button initially
    if (signupButton) {
        signupButton.disabled = true;
        signupButton.style.opacity = '0.6';
        signupButton.style.cursor = 'not-allowed';
    }

    // Handle terms checkbox change
    termsCheckbox?.addEventListener('change', function() {
        if (signupButton) {
            signupButton.disabled = !this.checked;
            signupButton.style.opacity = this.checked ? '1' : '0.6';
            signupButton.style.cursor = this.checked ? 'pointer' : 'not-allowed';
        }
    });

    let isFirstStep = true;

    // Check if user was remembered
    const rememberedEmail = localStorage.getItem('rememberedEmail');
    if (rememberedEmail) {
        emailInput.value = rememberedEmail;
        rememberMeCheckbox.checked = true;
    }

    // Function to show error message
    function showError(elementId, message) {
        const errorElement = document.getElementById(elementId);
        const inputGroup = errorElement.closest('.input-group');
        errorElement.textContent = message;
        inputGroup.classList.add('error');
    }

    // Function to clear error message
    function clearError(elementId) {
        const errorElement = document.getElementById(elementId);
        const inputGroup = errorElement.closest('.input-group');
        errorElement.textContent = '';
        inputGroup.classList.remove('error');
    }

    // Clear errors when input changes
    emailInput.addEventListener('input', () => clearError('loginEmailError'));
    passwordInput?.addEventListener('input', () => clearError('loginPasswordError'));

    // Theme toggle functionality
    const themeToggle = document.getElementById('themeToggle');
    const body = document.body;
    
    // Check for saved theme preference
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        body.classList.add('dark-mode');
    }

    // Handle theme toggle click
    themeToggle.addEventListener('click', () => {
        body.classList.toggle('dark-mode');
        localStorage.setItem('theme', body.classList.contains('dark-mode') ? 'dark' : 'light');
    });

    // Function to handle login
    async function handleLogin() {
        if (isFirstStep) {
            const email = emailInput.value.trim();
            if (!email) {
                showError('loginEmailError', 'Please enter your email address');
                return;
            }

            // Show password field
            clearError('loginEmailError');
            passwordFields.forEach(el => el.style.display = 'block');
            initialStepElements.forEach(el => el.style.display = 'none');
            passwordInput.focus();
            isFirstStep = false;
        } else {
            const email = emailInput.value.trim();
            const password = passwordInput.value;

            if (!password) {
                showError('loginPasswordError', 'Please enter your password');
                return;
            }

            try {
                // Set persistence based on remember me checkbox
                const persistenceType = rememberMeCheckbox.checked ? browserLocalPersistence : browserSessionPersistence;
                await setPersistence(auth, persistenceType);

                const userCredential = await signInWithEmailAndPassword(auth, email, password);
                
                // Handle remember me
                if (rememberMeCheckbox.checked) {
                    localStorage.setItem('rememberedEmail', email);
                } else {
                    localStorage.removeItem('rememberedEmail');
                }

                console.log('Logged in successfully:', userCredential.user);
                window.location.href = '/Pages/home/home.html';
            } catch (error) {
                console.error('Login error:', error);
                if (error.code === 'auth/wrong-password') {
                    showError('loginPasswordError', 'Incorrect password');
                } else if (error.code === 'auth/user-not-found') {
                    showError('loginEmailError', 'No account found with this email');
                } else if (error.code === 'auth/too-many-requests') {
                    showError('loginPasswordError', 'Too many failed attempts. Please try again later');
                } else {
                    showError('loginPasswordError', 'Invalid email or password');
                }
            }
        }
    }

    // Handle Enter key press
    emailInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleLogin();
        }
    });

    passwordInput?.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleLogin();
        }
    });

    // Handle login button click
    loginButton.addEventListener('click', handleLogin);

    // Handle form submission (prevent default)
    loginForm.addEventListener('submit', function(e) {
        e.preventDefault();
    });

    // Handle signup form submission
    signupForm?.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const firstName = document.getElementById('firstName').value.trim();
        const lastName = document.getElementById('lastName').value.trim();
        const email = document.getElementById('signupEmail').value.trim();
        const password = document.getElementById('signupPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        
        // Validate inputs
        if (!firstName) {
            showError('firstNameError', 'Please enter your first name');
            return;
        }
        
        if (!lastName) {
            showError('lastNameError', 'Please enter your last name');
            return;
        }
        
        if (!email) {
            showError('signupEmailError', 'Please enter your email address');
            return;
        }
        
        if (!password) {
            showError('signupPasswordError', 'Please create a password');
            return;
        }
        
        if (password.length < 6) {
            showError('signupPasswordError', 'Password must be at least 6 characters long');
            return;
        }
        
        if (password !== confirmPassword) {
            showError('confirmPasswordError', 'Passwords do not match');
            return;
        }

        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            // Update user profile with display name
            await updateProfile(userCredential.user, {
                displayName: `${firstName} ${lastName}`
            });
            
            // Create user document in Firestore with name info
            try {
                await setDoc(doc(db, 'users', userCredential.user.uid), {
                    fullName: `${firstName} ${lastName}`,
                    name: `${firstName} ${lastName}`,
                    email: email,
                    createdAt: new Date(),
                    status: 'online',
                    uid: userCredential.user.uid
                });
            } catch (firestoreError) {
                console.error('Error creating user document:', firestoreError);
                // Continue even if Firestore creation fails
            }
            
            // Redirect to home page on success
            window.location.href = '/Pages/home/home.html';
            return; // Stop execution here
        } catch (error) {
            console.error('Signup error:', error);
            if (error.code === 'auth/email-already-in-use') {
                showError('signupEmailError', 'This email is already registered');
            } else if (error.code === 'auth/invalid-email') {
                showError('signupEmailError', 'Invalid email format');
            } else if (error.code === 'auth/weak-password') {
                showError('signupPasswordError', 'Password is too weak');
            } else {
                showError('signupEmailError', 'An error occurred. Please try again');
            }
        }
    });

    // Handle guest login
    guestButton.addEventListener('click', () => {
        // Directly redirect to home page without creating an anonymous account
        window.location.href = '/Pages/home/home.html';
    });

    // Handle Google sign-in
    googleButtons.forEach(button => {
        button.addEventListener('click', async () => {
            try {
                const provider = new GoogleAuthProvider();
                provider.addScope('profile');
                provider.addScope('email');
                const result = await signInWithPopup(auth, provider);
                console.log('Google sign-in successful');
                window.location.href = '/Pages/home/home.html';
            } catch (error) {
                console.error('Google sign-in error:', error);
                showError('loginEmailError', 'Google sign-in failed. Please try again');
            }
        });
    });

    // Handle forgot password
    forgotPasswordLink?.addEventListener('click', async (e) => {
        e.preventDefault();
        const email = emailInput.value.trim();
        
        if (!email) {
            showError('loginEmailError', 'Please enter your email address');
            return;
        }

        try {
            await sendPasswordResetEmail(auth, email);
            alert('Password reset email sent. Please check your inbox.');
        } catch (error) {
            console.error('Password reset error:', error);
            if (error.code === 'auth/user-not-found') {
                showError('loginEmailError', 'No account found with this email');
            } else {
                showError('loginEmailError', 'Failed to send reset email. Please try again');
            }
        }
    });

    // Toggle password visibility
    togglePasswordBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const input = this.previousElementSibling;
            const icon = this.querySelector('i');
            
            if (input.type === 'password') {
                input.type = 'text';
                icon.classList.remove('fa-eye');
                icon.classList.add('fa-eye-slash');
            } else {
                input.type = 'password';
                icon.classList.remove('fa-eye-slash');
                icon.classList.add('fa-eye');
            }
        });
    });

    // Form toggle functionality
    const toggleBtns = document.querySelectorAll('.toggle-btn');
    const formSections = document.querySelectorAll('.form-section');
    
    toggleBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const targetForm = this.dataset.form;
            formSections.forEach(section => {
                section.classList.remove('active');
                if (section.id === `${targetForm}Section`) {
                    section.classList.add('active');
                }
            });

            // Reset login form to first step when switching forms
            if (targetForm === 'login') {
                isFirstStep = true;
                passwordFields.forEach(el => el.style.display = 'none');
                initialStepElements.forEach(el => el.style.display = 'block');
            }
        });
    });

    // Handle form section switching based on URL parameter
    const urlParams = new URLSearchParams(window.location.search);
    const section = urlParams.get('section');
    
    if (section === 'signup') {
        document.getElementById('loginSection').classList.remove('active');
        document.getElementById('signupSection').classList.add('active');
    }
});

