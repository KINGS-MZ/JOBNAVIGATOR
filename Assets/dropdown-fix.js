/**
 * Dropdown menu fix - ensures consistent dropdown menu behavior across all pages
 * This script should be loaded after the navbar script
 */
document.addEventListener('DOMContentLoaded', () => {
    // Get dropdown elements
    const userMenuBtn = document.getElementById('user-menu-btn');
    const userDropdown = document.getElementById('user-dropdown');
    
    if (!userMenuBtn || !userDropdown) {
        console.warn('Dropdown elements not found');
        return;
    }

    // If nav.js has already set up the menu functions, we don't need to do anything
    if (window.navMenuFunctions) {
        console.log('Global dropdown functions detected - using them');
        return;
    }

    // Otherwise, set up a simple implementation to ensure dropdowns work
    console.log('Setting up dropdown fix');
    
    // Make sure the dropdown menu is initially hidden
    userDropdown.style.display = 'none';
    userDropdown.style.opacity = '0';
    userDropdown.style.visibility = 'hidden';
    userDropdown.classList.remove('show');
    
    let isDropdownOpen = false;
    
    // Simple toggle function
    function toggleDropdown(e) {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        
        isDropdownOpen = !isDropdownOpen;
        
        if (isDropdownOpen) {
            userDropdown.style.display = 'block';
            userDropdown.style.opacity = '1';
            userDropdown.style.visibility = 'visible';
            userDropdown.classList.add('show');
        } else {
            userDropdown.classList.remove('show');
            setTimeout(() => {
                if (!isDropdownOpen) {
                    userDropdown.style.display = 'none';
                    userDropdown.style.visibility = 'hidden';
                }
            }, 300);
        }
    }
    
    // Add straightforward event listeners
    userMenuBtn.addEventListener('click', toggleDropdown);
    
    // Close when clicking outside
    document.addEventListener('click', (e) => {
        if (isDropdownOpen && !userMenuBtn.contains(e.target) && !userDropdown.contains(e.target)) {
            isDropdownOpen = false;
            userDropdown.classList.remove('show');
            setTimeout(() => {
                if (!isDropdownOpen) {
                    userDropdown.style.display = 'none';
                    userDropdown.style.visibility = 'hidden';
                }
            }, 300);
        }
    });
    
    // Close when pressing Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && isDropdownOpen) {
            isDropdownOpen = false;
            userDropdown.classList.remove('show');
            setTimeout(() => {
                if (!isDropdownOpen) {
                    userDropdown.style.display = 'none';
                    userDropdown.style.visibility = 'hidden';
                }
            }, 300);
        }
    });
}); 