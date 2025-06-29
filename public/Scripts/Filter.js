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
    document.getElementById('durationFilter').value = '';
    document.getElementById('qualityFilter').value = '';
    
    currentPage = 1;
    hasMore = true;
    
    navigateToSection('home');
    window.dispatchEvent(new Event('videos:reset'));
}