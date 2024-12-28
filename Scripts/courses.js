// DOM Elements
const coursesGrid = document.getElementById('courses-grid');
const courseSearch = document.getElementById('course-search');
const themeToggle = document.getElementById('theme-toggle');
const logoutBtn = document.getElementById('logout-btn');

// Sample courses data - Replace with actual data from your backend
const courses = [
    {
        id: 1,
        title: 'Web Development Fundamentals',
        description: 'Learn the basics of web development including HTML, CSS, and JavaScript.',
        duration: '8 weeks',
        image: '../images/web-dev.jpg'
    },
    {
        id: 2,
        title: 'Digital Marketing Essentials',
        description: 'Master the core concepts of digital marketing and social media strategies.',
        duration: '6 weeks',
        image: '../images/digital-marketing.jpg'
    },
    {
        id: 3,
        title: 'Data Analysis with Python',
        description: 'Learn data analysis techniques using Python and popular libraries.',
        duration: '10 weeks',
        image: '../images/data-analysis.jpg'
    }
];

// Function to create a course card
function createCourseCard(course) {
    const card = document.createElement('div');
    card.className = 'course-card';
    card.innerHTML = `
        <img src="${course.image}" alt="${course.title}" class="course-image">
        <div class="course-content">
            <h3 class="course-title">${course.title}</h3>
            <p class="course-description">${course.description}</p>
            <div class="course-meta">
                <div class="course-duration">
                    <i class="fas fa-clock"></i>
                    <span>${course.duration}</span>
                </div>
            </div>
            <button class="enroll-btn" onclick="enrollCourse(${course.id})">Enroll Now</button>
        </div>
    `;
    return card;
}

// Function to display courses
function displayCourses(coursesToShow = courses) {
    coursesGrid.innerHTML = '';
    coursesToShow.forEach(course => {
        coursesGrid.appendChild(createCourseCard(course));
    });
}

// Function to filter courses
function filterCourses(searchTerm) {
    const filteredCourses = courses.filter(course => 
        course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        course.description.toLowerCase().includes(searchTerm.toLowerCase())
    );
    displayCourses(filteredCourses);
}

// Function to enroll in a course
function enrollCourse(courseId) {
    // Add your enrollment logic here
    console.log(`Enrolling in course ${courseId}`);
    // You might want to:
    // 1. Check if user is authenticated
    // 2. Make an API call to your backend
    // 3. Show a confirmation dialog
    // 4. Update UI accordingly
}

// Event Listeners
courseSearch.addEventListener('input', (e) => {
    filterCourses(e.target.value);
});

// Theme toggle functionality
themeToggle.addEventListener('click', () => {
    document.body.classList.toggle('dark-theme');
    const icon = themeToggle.querySelector('i');
    if (document.body.classList.contains('dark-theme')) {
        icon.classList.replace('fa-moon', 'fa-sun');
    } else {
        icon.classList.replace('fa-sun', 'fa-moon');
    }
});

// Logout functionality
logoutBtn.addEventListener('click', (e) => {
    e.preventDefault();
    // Add your logout logic here
    // For example:
    firebase.auth().signOut()
        .then(() => {
            window.location.href = 'login.html';
        })
        .catch((error) => {
            console.error('Error signing out:', error);
        });
});

// Initialize the page
document.addEventListener('DOMContentLoaded', () => {
    displayCourses();
});
