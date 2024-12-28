document.addEventListener('DOMContentLoaded', () => {
    const signInForm = document.querySelector('.sign-in-form');
    const signUpForm = document.querySelector('.sign-up-form');
    const toggleButtons = document.querySelectorAll('.toggle-btn');

    toggleButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            signInForm.classList.toggle('active-form');
            signUpForm.classList.toggle('active-form');
        });
    });

    // Handle form submissions
    const forms = document.querySelectorAll('form');
    forms.forEach(form => {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            console.log('Form submitted:', form.classList.contains('sign-in-form') ? 'Sign In' : 'Sign Up');
        });
    });
});
