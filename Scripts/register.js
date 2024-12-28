// DOM Elements
const registerForm = document.getElementById('register-form');
const nameInput = document.getElementById('name');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const confirmPasswordInput = document.getElementById('confirm-password');
const termsCheckbox = document.getElementById('terms');
const togglePasswordBtns = document.querySelectorAll('.toggle-password');
const googleBtn = document.getElementById('googleSignIn');
const microsoftBtn = document.getElementById('microsoftSignIn');

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    console.log('Register page loaded');
    
    // Debug element existence
    console.log('Form exists:', !!registerForm);
    console.log('Google button exists:', !!googleBtn);
    console.log('Microsoft button exists:', !!microsoftBtn);

    if (registerForm) {
        registerForm.addEventListener('submit', handleRegister);
        console.log('Added submit listener to form');
    }

    togglePasswordBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const input = this.previousElementSibling;
            togglePasswordVisibility(input, this);
        });
    });

    if (googleBtn) {
        googleBtn.addEventListener('click', handleGoogleSignUp);
        console.log('Added click listener to Google button');
    }

    if (microsoftBtn) {
        microsoftBtn.addEventListener('click', handleMicrosoftSignUp);
        console.log('Added click listener to Microsoft button');
    }
});

// Handle Google Sign Up
async function handleGoogleSignUp(e) {
    e.preventDefault();
    console.log('Google sign-up clicked');
    showLoader();
    
    try {
        await window.firebaseAuth.signInWithGoogle();
        console.log('Google sign-up successful');
    } catch (error) {
        console.error('Google sign-up error:', error);
        hideLoader();
        showToast(error.message);
    }
}

// Handle Microsoft Sign Up
async function handleMicrosoftSignUp(e) {
    e.preventDefault();
    console.log('Microsoft sign-up clicked');
    showLoader();
    
    try {
        await window.firebaseAuth.signInWithMicrosoft();
        console.log('Microsoft sign-up successful');
    } catch (error) {
        console.error('Microsoft sign-up error:', error);
        hideLoader();
        showToast(error.message);
    }
}

// Handle form submission
async function handleRegister(e) {
    e.preventDefault();
    console.log('Form submitted');
    
    if (!validateForm()) {
        console.log('Form validation failed');
        return;
    }
    
    showLoader();
    
    const name = nameInput.value.trim();
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    
    try {
        console.log('Creating user account...');
        await window.firebaseAuth.signUpWithEmail(email, password, name);
        console.log('User account created successfully');
    } catch (error) {
        console.error('Registration error:', error);
        hideLoader();
        showToast(error.message);
    }
}

// Form validation
function validateForm() {
    clearErrors();
    let isValid = true;
    
    // Validate name
    if (nameInput.value.trim().length < 2) {
        showError(nameInput, 'Name must be at least 2 characters long');
        isValid = false;
    }
    
    // Validate email
    if (!isValidEmail(emailInput.value)) {
        showError(emailInput, 'Please enter a valid email address');
        isValid = false;
    }
    
    // Validate password
    if (!isValidPassword(passwordInput.value)) {
        showError(passwordInput, 'Password must be at least 8 characters long and include uppercase, lowercase, number, and special character');
        isValid = false;
    }
    
    // Validate password confirmation
    if (passwordInput.value !== confirmPasswordInput.value) {
        showError(confirmPasswordInput, 'Passwords do not match');
        isValid = false;
    }
    
    // Validate terms acceptance
    if (!termsCheckbox.checked) {
        showError(termsCheckbox, 'You must accept the terms and conditions');
        isValid = false;
    }
    
    return isValid;
}

// Email validation
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// Password validation
function isValidPassword(password) {
    const passwordRegex = {
        uppercase: /[A-Z]/,
        lowercase: /[a-z]/,
        number: /[0-9]/,
        special: /[!@#$%^&*(),.?":{}|<>]/
    };

    return password.length >= 8 &&
           passwordRegex.uppercase.test(password) &&
           passwordRegex.lowercase.test(password) &&
           passwordRegex.number.test(password) &&
           passwordRegex.special.test(password);
}

// Toggle password visibility
function togglePasswordVisibility(input, button) {
    const type = input.type === 'password' ? 'text' : 'password';
    input.type = type;
    
    const icon = button.querySelector('i');
    icon.className = type === 'password' ? 'far fa-eye' : 'far fa-eye-slash';
}

// UI Helpers
function showError(element, message) {
    console.log('Showing error:', message);
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;
    
    element.classList.add('error');
    element.parentElement.appendChild(errorDiv);
}

function clearErrors() {
    document.querySelectorAll('.error-message').forEach(error => error.remove());
    document.querySelectorAll('.error').forEach(element => element.classList.remove('error'));
}

function showLoader() {
    const loader = document.querySelector('.loader');
    if (loader) {
        loader.style.display = 'flex';
        console.log('Loader shown');
    }
}

function hideLoader() {
    const loader = document.querySelector('.loader');
    if (loader) {
        loader.style.display = 'none';
        console.log('Loader hidden');
    }
}

function showToast(message, type = 'error') {
    console.log('Showing toast:', message);
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
