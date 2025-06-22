// Global variables
let currentPage = 1;
let isLoading = false;
let hasMore = true;
let currentFilters = {
    search: '',
    celebrity: '',
    category: '',
    sort: 'random',
    favorites: false
};
let currentSection = 'home';
let currentVideoId = null;
let isAuthenticated = false;
let currentUser = null;
let searchTimeout = null;
let hoverPreviewTimeout = null;
let currentHoverVideo = null;

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    setupEventListeners();
    loadInitialData();
    checkAuthStatus();
}

function setupEventListeners() {
    // Header navigation
    document.getElementById('homeButton').addEventListener('click', () => navigateToSection('home'));
    
    // Main navigation
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const section = link.dataset.section;
            navigateToSection(section);
        });
    });
    
    // Mobile navigation
    document.getElementById('mobileMenuBtn').addEventListener('click', toggleMobileNav);
    document.getElementById('mobileNavClose').addEventListener('click', closeMobileNav);
    
    document.querySelectorAll('.mobile-nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const section = link.dataset.section;
            navigateToSection(section);
            closeMobileNav();
        });
    });
    
    // Search functionality
    const searchInput = document.getElementById('searchInput');
    const searchBtn = document.getElementById('searchBtn');
    
    searchInput.addEventListener('input', handleSearchInput);
    searchInput.addEventListener('focus', showSearchSuggestions);
    searchInput.addEventListener('blur', hideSearchSuggestions);
    searchBtn.addEventListener('click', performSearch);
    
    // Filter controls
    document.getElementById('sortSelect').addEventListener('change', handleSortChange);
    document.getElementById('shuffleBtn').addEventListener('click', shuffleVideos);
    
    // View options
    document.querySelectorAll('.view-option').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.view-option').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            toggleViewMode(e.target.dataset.view);
        });
    });
    
    // Modal controls
    document.getElementById('modalCloseBtn').addEventListener('click', closeVideoModal);
    document.getElementById('modalBackdrop').addEventListener('click', closeVideoModal);
    
    // Authentication
    document.getElementById('loginBtn').addEventListener('click', () => showAuthModal('login'));
    document.getElementById('registerBtn').addEventListener('click', () => showAuthModal('register'));
    document.getElementById('loginModalClose').addEventListener('click', () => hideAuthModal('login'));
    document.getElementById('registerModalClose').addEventListener('click', () => hideAuthModal('register'));
    document.getElementById('switchToRegister').addEventListener('click', () => switchAuthModal('register'));
    document.getElementById('switchToLogin').addEventListener('click', () => switchAuthModal('login'));
    
    // User menu
    document.getElementById('userAvatarContainer').addEventListener('click', toggleUserDropdown);
    document.getElementById('favoritesDropdownBtn').addEventListener('click', () => navigateToSection('favorites'));
    document.getElementById('watchHistoryBtn').addEventListener('click', () => navigateToSection('watch-history'));
    
    // Infinite scroll
    window.addEventListener('scroll', handleScroll);
    
    // Keyboard shortcuts
    document.addEventListener('keydown', handleKeyboardShortcuts);
    
    // Clear filters
    document.getElementById('clearFiltersBtn').addEventListener('click', clearAllFilters);
}

function loadInitialData() {
    loadCategories();
    loadPerformers();
    loadVideos(true);
}

function checkAuthStatus() {
    // Simulate authentication check
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        isAuthenticated = true;
        updateAuthUI();
    }
}

function updateAuthUI() {
    const authSection = document.getElementById('authSection');
    const userMenu = document.getElementById('userMenu');
    
    if (isAuthenticated && currentUser) {
        authSection.style.display = 'none';
        userMenu.style.display = 'block';
        
        document.getElementById('userName').textContent = currentUser.username;
        document.getElementById('userAvatarImg').src = currentUser.avatar || '/api/placeholder/32/32';
        
        // Show authenticated features
        document.getElementById('createPlaylistBtn').style.display = 'flex';
        document.getElementById('ratingSection').style.display = 'flex';
        document.getElementById('commentForm').style.display = 'block';
        document.getElementById('modalPlaylistBtn').style.display = 'flex';
    } else {
        authSection.style.display = 'flex';
        userMenu.style.display = 'none';
        
        // Hide authenticated features
        document.getElementById('createPlaylistBtn').style.display = 'none';
        document.getElementById('ratingSection').style.display = 'none';
        document.getElementById('commentForm').style.display = 'none';
        document.getElementById('modalPlaylistBtn').style.display = 'none';
    }
}

// Navigation functions
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

function hideAllSections() {
    document.getElementById('videoGrid').innerHTML = '';
    document.getElementById('categoriesGrid').style.display = 'none';
    document.getElementById('performersGrid').style.display = 'none';
    document.getElementById('playlistsGrid').style.display = 'none';
    document.getElementById('noResults').style.display = 'none';
}

function showVideoGrid() {
    document.getElementById('categoriesGrid').style.display = 'none';
    document.getElementById('performersGrid').style.display = 'none';
    document.getElementById('playlistsGrid').style.display = 'none';
    document.getElementById('filterBar').style.display = 'block';
}

function showCategoriesGrid() {
    document.getElementById('categoriesGrid').style.display = 'grid';
    document.getElementById('performersGrid').style.display = 'none';
    document.getElementById('playlistsGrid').style.display = 'none';
    document.getElementById('filterBar').style.display = 'none';
}

function showPerformersGrid() {
    document.getElementById('categoriesGrid').style.display = 'none';
    document.getElementById('performersGrid').style.display = 'grid';
    document.getElementById('playlistsGrid').style.display = 'none';
    document.getElementById('filterBar').style.display = 'none';
}

function showPlaylistsGrid() {
    document.getElementById('categoriesGrid').style.display = 'none';
    document.getElementById('performersGrid').style.display = 'none';
    document.getElementById('playlistsGrid').style.display = 'grid';
    document.getElementById('filterBar').style.display = 'none';
}

function updateContentHeader(section) {
    const titles = {
        'home': 'All Videos',
        'trending': 'Trending Videos',
        'new': 'New Videos',
        'top-rated': 'Top Rated Videos',
        'categories': 'Categories',
        'performers': 'Performers',
        'playlists': 'Playlists',
        'favorites': 'Favorite Videos',
        'watch-history': 'Watch History'
    };
    
    const breadcrumbs = {
        'home': 'Home',
        'trending': 'Home / Trending',
        'new': 'Home / New',
        'top-rated': 'Home / Top Rated',
        'categories': 'Home / Categories',
        'performers': 'Home / Performers',
        'playlists': 'Home / Playlists',
        'favorites': 'Home / Favorites',
        'watch-history': 'Home / Watch History'
    };
    
    document.getElementById('contentTitle').textContent = titles[section] || 'Videos';
    document.getElementById('contentBreadcrumb').innerHTML = breadcrumbs[section] || 'Home';
}

// Search functionality
function handleSearchInput(e) {
    const query = e.target.value.trim();
    
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
        if (query.length >= 2) {
            loadSearchSuggestions(query);
            showSearchSuggestions();
        } else {
            hideSearchSuggestions();
        }
    }, 300);
}

function showSearchSuggestions() {
    document.getElementById('searchSuggestions').style.display = 'block';
}

function hideSearchSuggestions() {
    setTimeout(() => {
        document.getElementById('searchSuggestions').style.display = 'none';
    }, 200);
}

function performSearch() {
    const query = document.getElementById('searchInput').value.trim();
    if (query) {
        currentFilters.search = query;
        currentPage = 1;
        hasMore = true;
        
        // Add to search history
        addToSearchHistory(query);
        
        navigateToSection('home');
        hideSearchSuggestions();
    }
}

function addToSearchHistory(query) {
    fetch('/api/search-history', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ query })
    }).catch(console.error);
}

async function loadSearchSuggestions(query) {
    try {
        const response = await fetch(`/api/search/suggestions?q=${encodeURIComponent(query)}`);
        const data = await response.json();
        displaySearchSuggestions(data.suggestions);
    } catch (error) {
        console.error('Error loading search suggestions:', error);
    }
}

function displaySearchSuggestions(suggestions) {
    const container = document.getElementById('searchSuggestions');
    
    if (suggestions.length === 0) {
        container.innerHTML = '<div class="suggestion-item">No suggestions found</div>';
        return;
    }
    
    const groupedSuggestions = suggestions.reduce((groups, suggestion) => {
        if (!groups[suggestion.type]) {
            groups[suggestion.type] = [];
        }
        groups[suggestion.type].push(suggestion);
        return groups;
    }, {});
    
    let html = '';
    
    Object.entries(groupedSuggestions).forEach(([type, items]) => {
        const typeLabels = {
            'celebrity': 'Performers',
            'category': 'Categories',
            'history': 'Recent Searches'
        };
        
        html += `<div class="suggestion-header">${typeLabels[type] || type}</div>`;
        
        items.forEach(item => {
            html += `
                <div class="suggestion-item" onclick="applySuggestion('${item.type}', '${item.value}', '${item.text}')">
                    <div>
                        <i class="fas ${getSuggestionIcon(item.type)}"></i>
                        ${item.text}
                    </div>
                    ${item.count ? `<span class="suggestion-count">${item.count}</span>` : ''}
                </div>
            `;
        });
    });
    
    container.innerHTML = html;
}

function getSuggestionIcon(type) {
    const icons = {
        'celebrity': 'fa-user',
        'category': 'fa-tag',
        'history': 'fa-history'
    };
    return icons[type] || 'fa-search';
}

function applySuggestion(type, value, text) {
    if (type === 'celebrity') {
        currentFilters.celebrity = value;
        currentFilters.search = '';
        document.getElementById('searchInput').value = text;
    } else if (type === 'category') {
        currentFilters.category = value;
        currentFilters.search = '';
        document.getElementById('searchInput').value = text;
    } else {
        currentFilters.search = text;
        document.getElementById('searchInput').value = text;
    }
    
    currentPage = 1;
    hasMore = true;
    navigateToSection('home');
    hideSearchSuggestions();
}

// Filter functions
function handleSortChange(e) {
    currentFilters.sort = e.target.value;
    currentPage = 1;
    hasMore = true;
    loadVideos(true);
}

function shuffleVideos() {
    fetch('/api/reshuffle', { method: 'POST' })
        .then(response => response.json())
        .then(data => {
            showToast('Videos reshuffled!', 'success');
            currentPage = 1;
            hasMore = true;
            loadVideos(true);
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
}

function toggleViewMode(view) {
    const videoGrid = document.getElementById('videoGrid');
    if (view === 'list') {
        videoGrid.classList.add('list-view');
    } else {
        videoGrid.classList.remove('list-view');
    }
}

// Enhanced filter functions with proper event handling
function handleCategoryClick(event, category) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }
    
    console.log('Filtering by category:', category);
    
    // Clear other filters and set category
    currentFilters = {
        search: '',
        celebrity: '',
        category: category,
        sort: currentFilters.sort,
        favorites: false
    };
    
    // Clear search input and update UI
    document.getElementById('searchInput').value = '';
    
    // Update content header to show filtered content
    document.getElementById('contentTitle').textContent = `Category: ${formatCategoryName(category)}`;
    document.getElementById('contentBreadcrumb').innerHTML = `Home / Categories / ${formatCategoryName(category)}`;
    
    // Reset pagination and load filtered videos
    currentPage = 1;
    hasMore = true;
    
    // Show video grid and load filtered videos
    showVideoGrid();
    loadVideos(true);
    
    // Show success message
    showToast(`Showing videos in category: ${formatCategoryName(category)}`, 'success');
}

function handlePerformerClick(event, performer) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }
    
    console.log('Filtering by performer:', performer);
    
    // Clear other filters and set performer
    currentFilters = {
        search: '',
        celebrity: performer,
        category: '',
        sort: currentFilters.sort,
        favorites: false
    };
    
    // Clear search input and update UI
    document.getElementById('searchInput').value = '';
    
    // Update content header to show filtered content
    document.getElementById('contentTitle').textContent = `Performer: ${formatPerformerName(performer)}`;
    document.getElementById('contentBreadcrumb').innerHTML = `Home / Performers / ${formatPerformerName(performer)}`;
    
    // Reset pagination and load filtered videos
    currentPage = 1;
    hasMore = true;
    
    // Show video grid and load filtered videos
    showVideoGrid();
    loadVideos(true);
    
    // Show success message
    showToast(`Showing videos by: ${formatPerformerName(performer)}`, 'success');
}

// Helper functions for formatting names
function formatCategoryName(category) {
    return category.replace(/[-_]/g, ' ')
                  .split(' ')
                  .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                  .join(' ');
}

function formatPerformerName(performer) {
    return performer.replace(/[-_]/g, ' ')
                   .split(' ')
                   .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                   .join(' ');
}

// Legacy filter functions for backward compatibility
function filterByCategory(event, category) {
    handleCategoryClick(event, category);
}

function filterByPerformer(event, performer) {
    handlePerformerClick(event, performer);
}

// Data loading functions
async function loadVideos(reset = false) {
    if (isLoading) return;
    
    if (reset) {
        currentPage = 1;
        document.getElementById('videoGrid').innerHTML = '';
        document.getElementById('noResults').style.display = 'none';
    }
    
    isLoading = true;
    showLoadingIndicator();
    
    try {
        const params = new URLSearchParams({
            page: currentPage,
            limit: 20,
            search: currentFilters.search,
            celebrity: currentFilters.celebrity,
            category: currentFilters.category,
            sort: currentFilters.sort,
            favorites: currentFilters.favorites.toString()
        });
        
        console.log('Loading videos with filters:', currentFilters);
        
        const response = await fetch(`/api/videos?${params}`);
        const data = await response.json();
        
        console.log('Received videos:', data.videos?.length || 0, 'Total:', data.total);
        
        if (data.videos && data.videos.length > 0) {
            displayVideos(data.videos, reset);
            hasMore = data.hasMore;
            updateVideoCount(data.total);
        } else if (reset) {
            let noResultsTitle = 'No videos found';
            let noResultsText = 'Try adjusting your search terms or filters';
            
            if (currentFilters.celebrity) {
                noResultsTitle = `No videos found for ${formatPerformerName(currentFilters.celebrity)}`;
                noResultsText = 'This performer may not have any videos in your collection';
            } else if (currentFilters.category) {
                noResultsTitle = `No videos found in ${formatCategoryName(currentFilters.category)} category`;
                noResultsText = 'Try browsing other categories or clear the filter';
            }
            
            showNoResults(noResultsTitle, noResultsText);
        }
        
        currentPage++;
    } catch (error) {
        console.error('Error loading videos:', error);
        showToast('Failed to load videos', 'error');
    } finally {
        isLoading = false;
        hideLoadingIndicator();
    }
}

async function loadTrendingVideos() {
    if (isLoading) return;
    
    isLoading = true;
    showLoadingIndicator();
    
    try {
        const response = await fetch(`/api/trending?page=${currentPage}&limit=20`);
        const data = await response.json();
        
        if (data.videos && data.videos.length > 0) {
            displayVideos(data.videos, currentPage === 1);
            hasMore = data.hasMore;
            updateVideoCount(data.total);
        } else if (currentPage === 1) {
            showNoResults();
        }
        
        currentPage++;
    } catch (error) {
        console.error('Error loading trending videos:', error);
        showToast('Failed to load trending videos', 'error');
    } finally {
        isLoading = false;
        hideLoadingIndicator();
    }
}

async function loadWatchHistory() {
    if (isLoading) return;
    
    isLoading = true;
    showLoadingIndicator();
    
    try {
        const response = await fetch(`/api/watch-history?page=${currentPage}&limit=20`);
        const data = await response.json();
        
        if (data.videos && data.videos.length > 0) {
            displayVideos(data.videos, currentPage === 1);
            hasMore = data.hasMore;
            updateVideoCount(data.total);
        } else if (currentPage === 1) {
            showNoResults('No watch history found', 'Start watching videos to see your history here');
        }
        
        currentPage++;
    } catch (error) {
        console.error('Error loading watch history:', error);
        showToast('Failed to load watch history', 'error');
    } finally {
        isLoading = false;
        hideLoadingIndicator();
    }
}

async function loadCategories() {
    try {
        const response = await fetch('/api/categories');
        const data = await response.json();
        displayCategories(data.categories);
        displayMobileCategories(data.categories);
    } catch (error) {
        console.error('Error loading categories:', error);
    }
}

async function loadPerformers() {
    try {
        const response = await fetch('/api/celebrities');
        const data = await response.json();
        displayMobilePerformers(data.celebrities);
        return data.celebrities;
    } catch (error) {
        console.error('Error loading performers:', error);
        return [];
    }
}

async function loadAndDisplayPerformers() {
    try {
        showLoadingIndicator();
        const response = await fetch('/api/celebrities');
        const data = await response.json();
        displayPerformers(data.celebrities);
    } catch (error) {
        console.error('Error loading performers:', error);
        showToast('Failed to load performers', 'error');
    } finally {
        hideLoadingIndicator();
    }
}

// Video hover preview functionality
function setupVideoHoverPreview(card, video) {
    const thumbnail = card.querySelector('.video-thumbnail');
    const img = thumbnail.querySelector('img');
    
    let previewVideo = null;
    let isHovering = false;
    
    const startPreview = () => {
        if (previewVideo || !isHovering) return;
        
        // Create video element for preview
        previewVideo = document.createElement('video');
        previewVideo.className = 'hover-preview-video';
        previewVideo.muted = true;
        previewVideo.loop = true;
        previewVideo.preload = 'metadata';
        previewVideo.style.opacity = '0';
        
        // Set video source
        previewVideo.src = `/api/video-stream/${video.id}#t=10`;
        
        // Add to thumbnail
        thumbnail.appendChild(previewVideo);
        
        // Start playing when loaded
        previewVideo.addEventListener('loadeddata', () => {
            if (isHovering && previewVideo) {
                previewVideo.currentTime = 10; // Start at 10 seconds
                previewVideo.play().then(() => {
                    if (previewVideo && isHovering) {
                        previewVideo.style.opacity = '1';
                        img.style.opacity = '0';
                    }
                }).catch(() => {
                    // Fallback if autoplay fails
                    if (previewVideo) {
                        previewVideo.remove();
                        previewVideo = null;
                    }
                });
            }
        });
        
        // Handle errors
        previewVideo.addEventListener('error', () => {
            if (previewVideo) {
                previewVideo.remove();
                previewVideo = null;
            }
        });
    };
    
    const stopPreview = () => {
        if (previewVideo) {
            previewVideo.pause();
            previewVideo.remove();
            previewVideo = null;
        }
        img.style.opacity = '1';
    };
    
    // Mouse enter event
    card.addEventListener('mouseenter', () => {
        isHovering = true;
        clearTimeout(hoverPreviewTimeout);
        
        // Start preview after a short delay
        hoverPreviewTimeout = setTimeout(startPreview, 800);
    });
    
    // Mouse leave event
    card.addEventListener('mouseleave', () => {
        isHovering = false;
        clearTimeout(hoverPreviewTimeout);
        stopPreview();
    });
    
    // Cleanup on card removal
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            mutation.removedNodes.forEach((node) => {
                if (node === card) {
                    stopPreview();
                    observer.disconnect();
                }
            });
        });
    });
    
    observer.observe(card.parentNode, { childList: true });
}

// Display functions
function displayVideos(videos, reset = false) {
    const container = document.getElementById('videoGrid');
    
    if (reset) {
        container.innerHTML = '';
    }
    
    videos.forEach(video => {
        const videoCard = createVideoCard(video);
        container.appendChild(videoCard);
        
        // Setup hover preview for this card
        setupVideoHoverPreview(videoCard, video);
    });
}

function createVideoCard(video) {
    const card = document.createElement('div');
    card.className = 'video-card';
    card.onclick = () => openVideoModal(video);
    
    const thumbnailUrl = video.thumbnailExists ? video.thumbnailUrl : '/api/placeholder/400/225';
    
    card.innerHTML = `
        <div class="video-thumbnail">
            <img src="${thumbnailUrl}" alt="${video.title}" loading="lazy">
            <div class="video-overlay">
                <button class="play-btn">
                    <i class="fas fa-play"></i>
                </button>
            </div>
            <button class="video-favorite-btn ${video.isFavorite ? 'active' : ''}" onclick="toggleFavorite(event, '${video.id}')">
                <i class="fas fa-heart"></i>
            </button>
            ${video.duration ? `<div class="video-duration">${video.duration}</div>` : ''}
            ${video.quality ? `<div class="video-quality">${video.quality}</div>` : ''}
            <div class="video-rating">
                <i class="fas fa-star"></i>
                ${video.rating.toFixed(1)}
            </div>
        </div>
        <div class="video-info">
            <h3 class="video-title">${video.title}</h3>
            <a href="#" class="video-performer" onclick="handlePerformerClick(event, '${video.artist}')">${video.artist}</a>
            <div class="video-stats">
                <span class="video-stat">
                    <i class="fas fa-eye"></i>
                    ${formatNumber(video.views)}
                </span>
                <span class="video-stat">
                    <i class="fas fa-star"></i>
                    ${video.rating.toFixed(1)}
                </span>
                ${video.duration ? `
                <span class="video-stat">
                    <i class="fas fa-clock"></i>
                    ${video.duration}
                </span>
                ` : ''}
            </div>
            <div class="video-categories">
                ${video.categories.map(cat => 
                    `<span class="category-tag" onclick="handleCategoryClick(event, '${cat}')">${cat}</span>`
                ).join('')}
            </div>
        </div>
    `;
    
    return card;
}

function displayCategories(categories) {
    const container = document.getElementById('categoriesGrid');
    container.innerHTML = '';
    
    categories.forEach(category => {
        const categoryCard = document.createElement('div');
        categoryCard.className = 'category-card';
        categoryCard.onclick = () => handleCategoryClick(null, category.name);
        
        categoryCard.innerHTML = `
            <div class="category-icon">
                <i class="fas ${getCategoryIcon(category.name)}"></i>
            </div>
            <h3 class="category-name">${category.displayName}</h3>
            <p class="category-count">${category.count} videos</p>
        `;
        
        container.appendChild(categoryCard);
    });
}

function displayPerformers(performers) {
    const container = document.getElementById('performersGrid');
    container.innerHTML = '';
    
    if (!performers || performers.length === 0) {
        container.innerHTML = `
            <div class="no-performers-message">
                <i class="fas fa-users"></i>
                <h3>No Performers Found</h3>
                <p>No performer folders were found in your video directory.</p>
            </div>
        `;
        return;
    }
    
    performers.forEach(performer => {
        const performerCard = document.createElement('div');
        performerCard.className = 'performer-card';
        performerCard.onclick = () => handlePerformerClick(null, performer.name);
        
        performerCard.innerHTML = `
            <div class="performer-avatar">
                ${performer.hasImage ? 
                    `<img src="${performer.imageUrl}" alt="${performer.displayName}" loading="lazy">` :
                    `<i class="fas fa-user"></i>`
                }
            </div>
            <div class="performer-info">
                <h3 class="performer-name">${performer.displayName}</h3>
                <p class="performer-video-count">${performer.videoCount} videos</p>
            </div>
        `;
        
        container.appendChild(performerCard);
    });
}

function displayMobileCategories(categories) {
    const container = document.getElementById('mobileCategoriesList');
    container.innerHTML = '';
    
    categories.slice(0, 10).forEach(category => {
        const categoryItem = document.createElement('a');
        categoryItem.href = '#';
        categoryItem.className = 'mobile-category-item';
        categoryItem.onclick = (e) => {
            e.preventDefault();
            handleCategoryClick(null, category.name);
            closeMobileNav();
        };
        
        categoryItem.innerHTML = `
            ${category.displayName}
            <span class="mobile-item-count">${category.count}</span>
        `;
        
        container.appendChild(categoryItem);
    });
}

function displayMobilePerformers(performers) {
    const container = document.getElementById('mobilePerformersList');
    container.innerHTML = '';
    
    performers.slice(0, 10).forEach(performer => {
        const performerItem = document.createElement('a');
        performerItem.href = '#';
        performerItem.className = 'mobile-performer-item';
        performerItem.onclick = (e) => {
            e.preventDefault();
            handlePerformerClick(null, performer.name);
            closeMobileNav();
        };
        
        performerItem.innerHTML = `
            ${performer.displayName}
            <span class="mobile-item-count">${performer.videoCount}</span>
        `;
        
        container.appendChild(performerItem);
    });
}

// Utility functions
function getCategoryIcon(category) {
    const icons = {
        'anal': 'fa-circle',
        'lesbian': 'fa-venus-double',
        'milf': 'fa-female',
        'teen': 'fa-user-graduate',
        'hardcore': 'fa-fire',
        'blowjob': 'fa-kiss',
        'threesome': 'fa-users',
        'big-tits': 'fa-heart',
        'pov': 'fa-eye',
        'amateur': 'fa-home',
        'fetish': 'fa-mask',
        'compilation': 'fa-film'
    };
    return icons[category] || 'fa-tag';
}

function formatNumber(num) {
    if (num >= 1000000) {
        return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
}

function updateVideoCount(count) {
    document.getElementById('videoCount').textContent = `${formatNumber(count)} videos`;
}

function showLoadingIndicator() {
    document.getElementById('loadingContainer').style.display = 'flex';
}

function hideLoadingIndicator() {
    document.getElementById('loadingContainer').style.display = 'none';
}

function showNoResults(title = 'No videos found', text = 'Try adjusting your search terms or filters') {
    document.getElementById('noResultsTitle').textContent = title;
    document.getElementById('noResultsText').textContent = text;
    document.getElementById('noResults').style.display = 'block';
}

// Favorite functions
function toggleFavorite(event, videoId) {
    event.preventDefault();
    event.stopPropagation();
    
    const btn = event.target.closest('.video-favorite-btn');
    const isCurrentlyFavorite = btn.classList.contains('active');
    
    const method = isCurrentlyFavorite ? 'DELETE' : 'POST';
    const url = `/api/favorites/${videoId}`;
    
    fetch(url, { method })
        .then(response => response.json())
        .then(data => {
            btn.classList.toggle('active');
            const action = isCurrentlyFavorite ? 'removed from' : 'added to';
            showToast(`Video ${action} favorites`, 'success');
            
            // Update favorites count in dropdown
            updateFavoritesCount();
        })
        .catch(error => {
            console.error('Error toggling favorite:', error);
            showToast('Failed to update favorites', 'error');
        });
}

function updateFavoritesCount() {
    fetch('/api/favorites')
        .then(response => response.json())
        .then(data => {
            document.querySelector('.favorites-count').textContent = data.total;
        })
        .catch(console.error);
}

// Video modal functions
function openVideoModal(video) {
    currentVideoId = video.id;
    
    // Update modal content
    document.getElementById('modalVideoTitle').textContent = video.title;
    document.getElementById('modalVideoPerformer').textContent = video.artist;
    document.getElementById('modalVideoViews').textContent = formatNumber(video.views);
    document.getElementById('modalVideoRating').textContent = video.rating.toFixed(1);
    document.getElementById('modalVideoDuration').textContent = video.duration || 'Unknown';
    document.getElementById('modalVideoQuality').textContent = video.quality || 'HD';
    
    // Update video source
    const videoElement = document.getElementById('modalVideo');
    videoElement.src = `/api/video-stream/${video.id}`;
    
    // Update categories
    const categoriesContainer = document.getElementById('modalVideoCategories');
    categoriesContainer.innerHTML = video.categories.map(cat => 
        `<span class="category-tag" onclick="handleCategoryClick(event, '${cat}')">${cat}</span>`
    ).join('');
    
    // Update favorite button
    const favoriteBtn = document.getElementById('modalFavoriteBtn');
    favoriteBtn.classList.toggle('active', video.isFavorite);
    favoriteBtn.onclick = (e) => toggleFavorite(e, video.id);
    
    // Show modal
    document.getElementById('videoModal').classList.add('active');
    document.body.style.overflow = 'hidden';
    
    // Add to watch history
    addToWatchHistory(video.id);
    
    // Load related videos
    loadRelatedVideos(video);
}

function closeVideoModal() {
    const modal = document.getElementById('videoModal');
    const video = document.getElementById('modalVideo');
    
    modal.classList.remove('active');
    document.body.style.overflow = '';
    
    // Pause and reset video
    video.pause();
    video.currentTime = 0;
    video.src = '';
    
    currentVideoId = null;
}

function addToWatchHistory(videoId) {
    fetch(`/api/watch-history/${videoId}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ timestamp: Date.now() })
    }).catch(console.error);
}

async function loadRelatedVideos(currentVideo) {
    try {
        // Load videos from same performer or category
        const params = new URLSearchParams({
            page: 1,
            limit: 10,
            celebrity: currentVideo.artist,
            sort: 'random'
        });
        
        const response = await fetch(`/api/videos?${params}`);
        const data = await response.json();
        
        // Filter out current video
        const relatedVideos = data.videos.filter(v => v.id !== currentVideo.id);
        
        displayRelatedVideos(relatedVideos);
    } catch (error) {
        console.error('Error loading related videos:', error);
    }
}

function displayRelatedVideos(videos) {
    const container = document.getElementById('relatedVideosGrid');
    container.innerHTML = '';
    
    videos.slice(0, 8).forEach(video => {
        const videoCard = document.createElement('a');
        videoCard.href = '#';
        videoCard.className = 'related-video-card';
        videoCard.onclick = (e) => {
            e.preventDefault();
            closeVideoModal();
            setTimeout(() => openVideoModal(video), 100);
        };
        
        const thumbnailUrl = video.thumbnailExists ? video.thumbnailUrl : '/api/placeholder/200/113';
        
        videoCard.innerHTML = `
            <div class="related-video-thumbnail">
                <img src="${thumbnailUrl}" alt="${video.title}" loading="lazy">
                ${video.duration ? `<div class="video-duration">${video.duration}</div>` : ''}
                <div class="video-rating-small">
                    <i class="fas fa-star"></i>
                    ${video.rating.toFixed(1)}
                </div>
            </div>
            <div class="related-video-info">
                <h4 class="related-video-title">${video.title}</h4>
                <p class="related-video-performer">${video.artist}</p>
                <p class="related-video-views">${formatNumber(video.views)} views</p>
            </div>
        `;
        
        container.appendChild(videoCard);
    });
}

// Mobile navigation
function toggleMobileNav() {
    document.getElementById('mobileNav').classList.toggle('active');
}

function closeMobileNav() {
    document.getElementById('mobileNav').classList.remove('active');
}

// Authentication functions
function showAuthModal(type) {
    document.getElementById(`${type}Modal`).classList.add('active');
    document.body.style.overflow = 'hidden';
}

function hideAuthModal(type) {
    document.getElementById(`${type}Modal`).classList.remove('active');
    document.body.style.overflow = '';
}

function switchAuthModal(type) {
    hideAuthModal(type === 'login' ? 'register' : 'login');
    showAuthModal(type);
}

function toggleUserDropdown() {
    document.getElementById('userDropdown').classList.toggle('active');
}

// Scroll handling
function handleScroll() {
    if (currentSection === 'home' || currentSection === 'trending' || currentSection === 'favorites' || currentSection === 'watch-history') {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const windowHeight = window.innerHeight;
        const documentHeight = document.documentElement.scrollHeight;
        
        if (scrollTop + windowHeight >= documentHeight - 1000 && hasMore && !isLoading) {
            if (currentSection === 'trending') {
                loadTrendingVideos();
            } else if (currentSection === 'watch-history') {
                loadWatchHistory();
            } else {
                loadVideos();
            }
        }
    }
}

// Keyboard shortcuts
function handleKeyboardShortcuts(e) {
    // Escape key to close modals
    if (e.key === 'Escape') {
        if (document.getElementById('videoModal').classList.contains('active')) {
            closeVideoModal();
        } else if (document.getElementById('loginModal').classList.contains('active')) {
            hideAuthModal('login');
        } else if (document.getElementById('registerModal').classList.contains('active')) {
            hideAuthModal('register');
        }
    }
    
    // Search shortcut (Ctrl/Cmd + K)
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        document.getElementById('searchInput').focus();
    }
}

// Toast notifications
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    
    document.getElementById('toastContainer').appendChild(toast);
    
    // Remove toast after 3 seconds
    setTimeout(() => {
        toast.remove();
    }, 3000);
}

// Initialize favorites count on load
updateFavoritesCount();