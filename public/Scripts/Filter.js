function handleSortChange(e) {
    currentFilters.sort = e.target.value;
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
        favorites: false
    };
    
    document.getElementById('searchInput').value = '';
    document.getElementById('sortSelect').value = 'random';
    
    currentPage = 1;
    hasMore = true;
    
    navigateToSection('home');
    window.dispatchEvent(new Event('videos:reset'));
}