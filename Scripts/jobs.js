// Sample job data (in a real application, this would come from an API)
const sampleJobs = [
    {
        id: 1,
        title: "Frontend Developer",
        company: "TechCorp Morocco",
        location: "Casablanca",
        salary: "15,000 - 20,000 MAD",
        type: "Full-time",
        experience: "2-3 years",
        description: "We are looking for a skilled Frontend Developer to join our team...",
        tags: ["React", "JavaScript", "CSS", "HTML5"]
    },
    {
        id: 2,
        title: "Network Technician",
        company: "NetworkSolutions",
        location: "Rabat",
        salary: "12,000 - 16,000 MAD",
        type: "Full-time",
        experience: "1-2 years",
        description: "Join our team as a Network Technician to maintain and optimize network infrastructure...",
        tags: ["Networking", "CCNA", "Troubleshooting"]
    },
    // Add more sample jobs as needed
];

// Function to create a job card
function createJobCard(job) {
    return `
        <div class="job-card" data-job-id="${job.id}">
            <div class="job-header">
                <div>
                    <h3 class="job-title">${job.title}</h3>
                    <p class="company-name">${job.company}</p>
                </div>
                <span class="job-salary">${job.salary}</span>
            </div>
            <div class="job-details">
                <span class="job-detail">
                    <i class="fas fa-map-marker-alt"></i>
                    ${job.location}
                </span>
                <span class="job-detail">
                    <i class="fas fa-briefcase"></i>
                    ${job.type}
                </span>
                <span class="job-detail">
                    <i class="fas fa-clock"></i>
                    ${job.experience}
                </span>
            </div>
            <p class="job-description">${job.description}</p>
            <div class="job-tags">
                ${job.tags.map(tag => `<span class="job-tag">${tag}</span>`).join('')}
            </div>
        </div>
    `;
}

// Function to render jobs
function renderJobs(jobs) {
    const jobsList = document.querySelector('.jobs-list');
    jobsList.innerHTML = jobs.map(job => createJobCard(job)).join('');
}

// Function to handle job search
function handleSearch() {
    const searchInput = document.querySelector('.search-input input').value.toLowerCase();
    const locationInput = document.querySelector('.search-location input').value.toLowerCase();

    const filteredJobs = sampleJobs.filter(job => {
        const matchesSearch = job.title.toLowerCase().includes(searchInput) ||
                            job.company.toLowerCase().includes(searchInput) ||
                            job.description.toLowerCase().includes(searchInput);
        
        const matchesLocation = !locationInput || job.location.toLowerCase().includes(locationInput);

        return matchesSearch && matchesLocation;
    });

    renderJobs(filteredJobs);
}

// Function to handle salary range filter
function handleSalaryRange() {
    const salaryRange = document.getElementById('salary-range');
    const minSalary = document.getElementById('min-salary');
    const maxSalary = document.getElementById('max-salary');

    salaryRange.addEventListener('input', (e) => {
        const value = e.target.value;
        maxSalary.textContent = `${value.toLocaleString()} MAD`;
    });
}

// Function to handle job type filters
function handleJobTypeFilters() {
    const typeCheckboxes = document.querySelectorAll('input[type="checkbox"]');
    const selectedTypes = new Set();

    typeCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', () => {
            if (checkbox.checked) {
                selectedTypes.add(checkbox.value);
            } else {
                selectedTypes.delete(checkbox.value);
            }

            const filteredJobs = selectedTypes.size > 0
                ? sampleJobs.filter(job => selectedTypes.has(job.type.toLowerCase()))
                : sampleJobs;

            renderJobs(filteredJobs);
        });
    });
}

// Function to handle sorting
function handleSorting() {
    const sortSelect = document.getElementById('sort-jobs');
    
    sortSelect.addEventListener('change', (e) => {
        const sortValue = e.target.value;
        let sortedJobs = [...sampleJobs];

        switch(sortValue) {
            case 'salary-high':
                sortedJobs.sort((a, b) => {
                    const aValue = parseInt(a.salary.split('-')[1].replace(/[^0-9]/g, ''));
                    const bValue = parseInt(b.salary.split('-')[1].replace(/[^0-9]/g, ''));
                    return bValue - aValue;
                });
                break;
            case 'salary-low':
                sortedJobs.sort((a, b) => {
                    const aValue = parseInt(a.salary.split('-')[0].replace(/[^0-9]/g, ''));
                    const bValue = parseInt(b.salary.split('-')[0].replace(/[^0-9]/g, ''));
                    return aValue - bValue;
                });
                break;
            case 'recent':
                // In a real application, you would sort by date
                break;
            default:
                break;
        }

        renderJobs(sortedJobs);
    });
}

// Initialize the page
document.addEventListener('DOMContentLoaded', () => {
    // Initial render
    renderJobs(sampleJobs);

    // Setup event listeners
    const searchBtn = document.querySelector('.search-btn');
    searchBtn.addEventListener('click', handleSearch);

    // Setup filters
    handleSalaryRange();
    handleJobTypeFilters();
    handleSorting();

    // Handle job card clicks
    document.querySelector('.jobs-list').addEventListener('click', (e) => {
        const jobCard = e.target.closest('.job-card');
        if (jobCard) {
            const jobId = jobCard.dataset.jobId;
            // Navigate to job details page (implement this based on your routing setup)
            console.log(`Navigating to job ${jobId}`);
        }
    });

    // Handle clear filters
    const clearFiltersBtn = document.querySelector('.clear-filters');
    clearFiltersBtn.addEventListener('click', () => {
        // Reset all filters
        document.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false);
        document.getElementById('salary-range').value = 0;
        document.getElementById('city-filter').value = '';
        document.querySelector('.search-input input').value = '';
        document.querySelector('.search-location input').value = '';
        
        // Reset jobs list
        renderJobs(sampleJobs);
    });
});
