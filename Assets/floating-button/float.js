document.addEventListener('DOMContentLoaded', () => {
    const floatingBtn = document.querySelector('.floating-btn');
    const floatingMenu = document.querySelector('.floating-menu');
    
    // Toggle menu on button click
    floatingBtn.addEventListener('click', () => {
        floatingBtn.classList.toggle('active');
        floatingMenu.classList.toggle('active');
    });

    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.floating-container')) {
            floatingBtn.classList.remove('active');
            floatingMenu.classList.remove('active');
        }
    });

    // Handle menu item clicks
    const menuItems = document.querySelectorAll('.menu-item');
    menuItems.forEach(item => {
        item.addEventListener('click', () => {
            floatingBtn.classList.remove('active');
            floatingMenu.classList.remove('active');
            // Add your navigation logic here
        });
    });
});
