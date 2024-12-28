// Load Lottie animations
const animations = {
    hero: {
        container: 'hero-animation',
        path: 'https://assets5.lottiefiles.com/packages/lf20_bujdzzfn.json'
    },
    search: {
        container: 'search-animation',
        path: 'https://assets8.lottiefiles.com/packages/lf20_kkflmtur.json'
    },
    mentor: {
        container: 'mentor-animation',
        path: 'https://assets5.lottiefiles.com/packages/lf20_xyadoh9h.json'
    },
    network: {
        container: 'network-animation',
        path: 'https://assets3.lottiefiles.com/private_files/lf30_obidsi0t.json'
    }
};

Object.entries(animations).forEach(([key, config]) => {
    lottie.loadAnimation({
        container: document.getElementById(config.container),
        renderer: 'svg',
        loop: true,
        autoplay: true,
        path: config.path
    });
});

// Theme toggle
const themeToggle = document.getElementById('theme-toggle');
themeToggle.addEventListener('click', () => {
    document.body.classList.toggle('dark-theme');
    document.body.classList.toggle('light-theme');
});

// Language selector
const languageSelect = document.getElementById('language-select');
languageSelect.addEventListener('change', (e) => {
    // Add language change logic here
    console.log('Language changed to:', e.target.value);
});

// Add smooth scrolling for navigation
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        document.querySelector(this.getAttribute('href')).scrollIntoView({
            behavior: 'smooth'
        });
    });
});

// DOM Elements
const searchInput = document.querySelector('input[placeholder="Job title, keywords, or company"]');
const locationInput = document.querySelector('input[placeholder="City or region"]');
const searchBtn = document.querySelector('.search-btn');
const jobCards = document.querySelector('.job-cards');
const logoutBtn = document.getElementById('logout-btn');

// Firebase services
const auth = firebase.auth();
const db = firebase.firestore();
const analytics = firebase.analytics();

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    loadFeaturedJobs();
    updateCategoryCount();
});

searchBtn.addEventListener('click', handleSearch);
logoutBtn.addEventListener('click', handleLogout);

// Load featured jobs
async function loadFeaturedJobs() {
    try {
        const snapshot = await db.collection('jobs')
            .where('featured', '==', true)
            .limit(6)
            .get();

        jobCards.innerHTML = '';
        
        if (snapshot.empty) {
            jobCards.innerHTML = '<p class="no-jobs">No featured jobs available at the moment.</p>';
            return;
        }

        snapshot.forEach(doc => {
            const job = doc.data();
            const card = createJobCard(job, doc.id);
            jobCards.appendChild(card);
        });

    } catch (error) {
        console.error('Error loading featured jobs:', error);
        jobCards.innerHTML = '<p class="error">Error loading jobs. Please try again later.</p>';
    }
}

// Update category counts
async function updateCategoryCount() {
    try {
        const categories = document.querySelectorAll('.category-card p');
        
        for (const category of categories) {
            const categoryName = category.previousElementSibling.textContent;
            const count = await db.collection('jobs')
                .where('category', '==', categoryName)
                .get()
                .then(snapshot => snapshot.size);
                
            category.textContent = `${count} jobs`;
        }
    } catch (error) {
        console.error('Error updating category counts:', error);
    }
}

// Handle job search
async function handleSearch() {
    const query = searchInput.value.toLowerCase();
    const location = locationInput.value.toLowerCase();
    
    try {
        let jobsRef = db.collection('jobs');
        
        if (query) {
            jobsRef = jobsRef.where('keywords', 'array-contains', query);
        }
        
        if (location) {
            jobsRef = jobsRef.where('location', '==', location);
        }
        
        const snapshot = await jobsRef.get();
        
        // Track search analytics
        analytics.logEvent('job_search', {
            search_term: query,
            location: location,
            results_count: snapshot.size
        });
        
        // Redirect to jobs page with search parameters
        const params = new URLSearchParams({
            q: query,
            l: location
        });
        
        window.location.href = `jobs.html?${params.toString()}`;
        
    } catch (error) {
        console.error('Error performing search:', error);
        alert('Error performing search. Please try again.');
    }
}

// Create job card element
function createJobCard(job, jobId) {
    const card = document.createElement('div');
    card.className = 'job-card';
    
    card.innerHTML = `
        <div class="job-card-header">
            <img src="${job.companyLogo || '../images/default-company.png'}" alt="${job.company}" class="company-logo">
            <div class="job-card-title">
                <h3>${job.title}</h3>
                <p class="company-name">${job.company}</p>
            </div>
        </div>
        <div class="job-card-body">
            <p class="job-location"><i class="fas fa-map-marker-alt"></i> ${job.location}</p>
            <p class="job-type"><i class="fas fa-briefcase"></i> ${job.type}</p>
            ${job.salary ? `<p class="job-salary"><i class="fas fa-money-bill-wave"></i> ${job.salary}</p>` : ''}
        </div>
        <div class="job-card-footer">
            <a href="job-details.html?id=${jobId}" class="btn btn-primary">View Details</a>
            <button onclick="saveJob('${jobId}')" class="btn btn-outline save-job">
                <i class="far fa-bookmark"></i>
            </button>
        </div>
    `;
    
    return card;
}

// Handle logout
async function handleLogout() {
    try {
        await firebase.auth().signOut();
        window.location.href = 'login.html';
    } catch (error) {
        console.error('Error signing out:', error);
        alert('Error signing out. Please try again.');
    }
}

// Save job to user's saved jobs
async function saveJob(jobId) {
    try {
        const user = auth.currentUser;
        
        if (!user) {
            window.location.href = 'login.html';
            return;
        }
        
        const userRef = db.collection('users').doc(user.uid);
        await userRef.update({
            savedJobs: firebase.firestore.FieldValue.arrayUnion(jobId)
        });
        
        // Track job save analytics
        analytics.logEvent('save_job', {
            job_id: jobId,
            user_id: user.uid
        });
        
        alert('Job saved successfully!');
    } catch (error) {
        console.error('Error saving job:', error);
        alert('Error saving job. Please try again.');
    }
}