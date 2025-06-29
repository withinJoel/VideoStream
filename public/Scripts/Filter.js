function handleSortChange(e) {
    currentFilters.sort = e.target.value;
    currentPage = 1;
    hasMore = true;
    loadVideos(true);
    window.dispatchEvent(new Event('videos:reset'));
}

function handleDurationFilter(e) {
    const value = e.target.value;
    switch(value) {
        case 'short':
            currentFilters.minDuration = '';
            currentFilters.maxDuration = '10';
            break;
        case 'medium':
            currentFilters.minDuration = '10';
            currentFilters.maxDuration = '30';
            break;
        case 'long':
            currentFilters.minDuration = '30';
            currentFilters.maxDuration = '';
            break;
        default:
            currentFilters.minDuration = '';
            currentFilters.maxDuration = '';
    }
    currentFilters.duration = value;
    currentPage = 1;
    hasMore = true;
    loadVideos(true);
    window.dispatchEvent(new Event('videos:reset'));
}

function handleQualityFilter(e) {
    currentFilters.quality = e.target.value;
    currentPage = 1;
    hasMore = true;
    loadVideos(true);
    window.dispatchEvent(new Event('videos:reset'));
}

function shuffleVideos() {
    fetch('/api/reshuffle', { method: 'POST' })
        .then(response => response.json())
        .then(data => {
            showToast('Videos reshuffled!', 'success');
            currentPage = 1;
            hasMore = true;
            loadVideos(true);
            window.dispatchEvent(new Event('videos:reset'));
        })
        .catch(error => {
            console.error('Error shuffling videos:', error);
            showToast('Failed to shuffle videos', 'error');
        });
}

function clearAllFilters() {
    currentFilters = {
        search: '',
        celebrity: '',
        category: '',
        sort: 'random',
        favorites: false,
        duration: '',
        minDuration: '',
        maxDuration: '',
        quality: '',
        minRating: ''
    };
    
    document.getElementById('searchInput').value = '';
    document.getElementById('sortSelect').value = 'random';
    const durationFilter = document.getElementById('durationFilter');
    if (durationFilter) durationFilter.value = '';
    const qualityFilter = document.getElementById('qualityFilter');
    if (qualityFilter) qualityFilter.value = '';
    
    currentPage = 1;
    hasMore = true;
    
    navigateToSection('home');
    window.dispatchEvent(new Event('videos:reset'));
}

// View toggle functionality
function toggleViewMode(view) {
    const videoGrid = document.getElementById('videoGrid');
    if (!videoGrid) return;
    
    // Remove all view classes
    videoGrid.classList.remove('list-view', 'large-view', 'grid-view');
    
    // Add the selected view class
    switch(view) {
        case 'list':
            videoGrid.classList.add('list-view');
            break;
        case 'large':
            videoGrid.classList.add('large-view');
            break;
        case 'grid':
        default:
            videoGrid.classList.add('grid-view');
            break;
    }
    
    // Update active state on buttons
    updateViewButtonStates(view);
    
    // Store preference in localStorage
    localStorage.setItem('preferredView', view);
    
    // Show feedback
    showToast(`Switched to ${view} view`, 'success');
}

function updateViewButtonStates(activeView) {
    const viewButtons = document.querySelectorAll('.view-option');
    
    viewButtons.forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.view === activeView) {
            btn.classList.add('active');
        }
    });
}

// Initialize view mode from localStorage or default to grid
function initializeViewMode() {
    const savedView = localStorage.getItem('preferredView') || 'grid';
    toggleViewMode(savedView);
}

// Setup view toggle event listeners
function setupViewToggleListeners() {
    const viewButtons = document.querySelectorAll('.view-option');
    
    viewButtons.forEach(btn => {
        // Remove any existing listeners to prevent duplicates
        btn.removeEventListener('click', handleViewToggle);
        // Add the event listener
        btn.addEventListener('click', handleViewToggle);
    });
}

function handleViewToggle(e) {
    e.preventDefault();
    e.stopPropagation();
    
    const button = e.currentTarget;
    const view = button.dataset.view;
    
    if (!view) {
        console.error('View option button missing data-view attribute');
        return;
    }
    
    toggleViewMode(view);
}

// Initialize on DOM content loaded
document.addEventListener('DOMContentLoaded', function() {
    // Setup view toggle listeners
    setupViewToggleListeners();
    
    // Initialize view mode
    initializeViewMode();
    
    // Re-setup listeners when navigating between sections
    window.addEventListener('section:changed', setupViewToggleListeners);
});

// Export functions for use in other scripts
window.toggleViewMode = toggleViewMode;
window.setupViewToggleListeners = setupViewToggleListeners;