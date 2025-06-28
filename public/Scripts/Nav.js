function navigateToSection(section) {
    currentSection = section;
    currentPage = 1;
    hasMore = true;
    
    // Update navigation active states
    document.querySelectorAll('.nav-link, .mobile-nav-link').forEach(link => {
        link.classList.remove('active');
        if (link.dataset.section === section) {
            link.classList.add('active');
        }
    });
    
    // Update content
    hideAllSections();
    updateContentHeader(section);
    
    switch (section) {
        case 'home':
            currentFilters = { ...currentFilters, celebrity: '', category: '', favorites: false };
            showVideoGrid();
            loadVideos(true);
            break;
        case 'trending':
            currentFilters = { ...currentFilters, sort: 'most-viewed', celebrity: '', category: '', favorites: false };
            showVideoGrid();
            loadTrendingVideos();
            break;
        case 'new':
            currentFilters = { ...currentFilters, sort: 'newest', celebrity: '', category: '', favorites: false };
            showVideoGrid();
            loadVideos(true);
            break;
        case 'top-rated':
            currentFilters = { ...currentFilters, sort: 'highest-rated', celebrity: '', category: '', favorites: false };
            showVideoGrid();
            loadVideos(true);
            break;
        case 'categories':
            showCategoriesGrid();
            break;
        case 'performers':
            showPerformersGrid();
            loadAndDisplayPerformers();
            break;
        case 'playlists':
            showPlaylistsGrid();
            loadUserPlaylists();
            break;
        case 'subscriptions':
            showPerformersGrid(); // Show performers grid for subscriptions
            loadSubscriptions();
            break;
        case 'favorites':
            currentFilters = { ...currentFilters, favorites: true, celebrity: '', category: '' };
            showVideoGrid();
            loadVideos(true);
            break;
        case 'watch-history':
            showVideoGrid();
            loadWatchHistory();
            break;
    }
}