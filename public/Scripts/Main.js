// Global variables
let currentPage = 1;
let isLoading = false;
let hasMore = true;
let currentFilters = {
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
let currentSection = 'home';
let currentVideoId = null;
let isAuthenticated = false;
let currentUser = null;
let searchTimeout = null;
let hoverPreviewTimeout = null;
let currentHoverVideo = null;
let currentPlaylistVideos = [];

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    // Wait for all components to load before initializing
    if (window.componentLoader && window.componentLoader.loadedComponents.size > 0) {
        initializeApp();
    } else {
        window.addEventListener('allComponentsLoaded', initializeApp);
    }
});

function initializeApp() {
    console.log('Initializing CelebStream application...');
    
    // Setup event listeners after components are loaded
    setupEventListeners();
    
    // Load initial data
    loadInitialData();
    
    // Check authentication status
    checkAuthStatus();
    
    // Initialize view mode after a short delay to ensure DOM is ready
    setTimeout(() => {
        if (typeof initializeViewMode === 'function') {
            initializeViewMode();
        }
    }, 100);
    
    console.log('CelebStream application initialized successfully');
}

function loadInitialData() {
    loadCategories();
    loadPerformers();
    loadVideos(true);
}

function updateContentHeader(section) {
    const titles = {
        'home': 'All Videos',
        'trending': 'Trending Videos',
        'new': 'New Videos',
        'top-rated': 'Top Rated Videos',
        'ai': 'AI Recommendations',
        'categories': 'Categories',
        'performers': 'Celebs',
        'playlists': 'My Playlists',
        'subscriptions': 'My Subscriptions',
        'favorites': 'Favorite Videos',
        'watch-history': 'Watch History',
        'watch-later': 'Watch Later'
    };
    
    const breadcrumbs = {
        'home': 'Home',
        'trending': 'Home / Trending',
        'new': 'Home / New',
        'top-rated': 'Home / Top Rated',
        'ai': 'Home / AI Recommendations',
        'categories': 'Home / Categories',
        'performers': 'Home / Celebs',
        'playlists': 'Home / My Playlists',
        'subscriptions': 'Home / My Subscriptions',
        'favorites': 'Home / Favorites',
        'watch-history': 'Home / Watch History',
        'watch-later': 'Home / Watch Later'
    };
    
    const titleElement = document.getElementById('contentTitle');
    const breadcrumbElement = document.getElementById('contentBreadcrumb');
    
    if (titleElement) titleElement.textContent = titles[section] || 'Videos';
    if (breadcrumbElement) breadcrumbElement.innerHTML = breadcrumbs[section] || 'Home';
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
        favorites: false,
        duration: currentFilters.duration,
        minDuration: currentFilters.minDuration,
        maxDuration: currentFilters.maxDuration,
        quality: currentFilters.quality,
        minRating: currentFilters.minRating
    };
    
    // Clear search input and update UI
    const searchInput = document.getElementById('searchInput');
    if (searchInput) searchInput.value = '';
    
    // Update content header to show filtered content
    const titleElement = document.getElementById('contentTitle');
    const breadcrumbElement = document.getElementById('contentBreadcrumb');
    
    if (titleElement) titleElement.textContent = `Category: ${formatCategoryName(category)}`;
    if (breadcrumbElement) breadcrumbElement.innerHTML = `Home / Categories / ${formatCategoryName(category)}`;
    
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
        favorites: false,
        duration: currentFilters.duration,
        minDuration: currentFilters.minDuration,
        maxDuration: currentFilters.maxDuration,
        quality: currentFilters.quality,
        minRating: currentFilters.minRating
    };
    
    // Clear search input and update UI
    const searchInput = document.getElementById('searchInput');
    if (searchInput) searchInput.value = '';
    
    // Update content header to show filtered content
    const titleElement = document.getElementById('contentTitle');
    const breadcrumbElement = document.getElementById('contentBreadcrumb');
    
    if (titleElement) titleElement.textContent = `Performer: ${formatPerformerName(performer)}`;
    if (breadcrumbElement) breadcrumbElement.innerHTML = `Home / Performers / ${formatPerformerName(performer)}`;
    
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

async function loadCategories() {
    try {
        const response = await fetch('/api/categories');
        const data = await response.json();
        displayCategories(data.categories);
        displayMobileCategories(data.categories);
        populateAdvancedSearchCategories(data.categories);
    } catch (error) {
        console.error('Error loading categories:', error);
    }
}

function populateAdvancedSearchCategories(categories) {
    const select = document.getElementById('searchCategory');
    if (select) {
        select.innerHTML = '<option value="">Any Category</option>';
        categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category.name;
            option.textContent = category.displayName;
            select.appendChild(option);
        });
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

// Video interaction functions
function toggleVideoFavorite() {
    if (!isAuthenticated) {
        showToast('Please login to favorite videos', 'error');
        return;
    }
    
    if (!currentVideoId) return;
    
    const btn = document.getElementById('modalFavBtn');
    if (!btn) return;
    
    const isFavorite = btn.classList.contains('active');
    
    const method = isFavorite ? 'DELETE' : 'POST';
    const url = `/api/favorites/${currentVideoId}`;
    const body = method === 'POST' ? JSON.stringify({ userId: currentUser.id }) : null;
    const queryParam = method === 'DELETE' ? `?userId=${currentUser.id}` : '';
    
    fetch(url + queryParam, { 
        method,
        headers: method === 'POST' ? { 'Content-Type': 'application/json' } : {},
        body
    })
    .then(response => response.json())
    .then(data => {
        btn.classList.toggle('active');
        const action = isFavorite ? 'removed from' : 'added to';
        showToast(`Video ${action} favorites`, 'success');
        updateFavoritesCount();
    })
    .catch(error => {
        console.error('Error toggling favorite:', error);
        showToast('Failed to update favorites', 'error');
    });
}

function toggleVideoLike() {
    if (!isAuthenticated) {
        showToast('Please login to like videos', 'error');
        return;
    }
    
    if (!currentVideoId) return;
    
    const likeBtn = document.getElementById('modalLikeBtn');
    const dislikeBtn = document.getElementById('modalDislikeBtn');
    if (!likeBtn || !dislikeBtn) return;
    
    const isLiked = likeBtn.classList.contains('active');
    
    const method = isLiked ? 'DELETE' : 'POST';
    const url = `/api/likes/${currentVideoId}`;
    const body = method === 'POST' ? JSON.stringify({ userId: currentUser.id, type: 'like' }) : null;
    const queryParam = method === 'DELETE' ? `?userId=${currentUser.id}` : '';
    
    fetch(url + queryParam, { 
        method,
        headers: method === 'POST' ? { 'Content-Type': 'application/json' } : {},
        body
    })
    .then(response => response.json())
    .then(data => {
        likeBtn.classList.toggle('active');
        dislikeBtn.classList.remove('active'); // Remove dislike if present
        
        // Update counts
        const likeCountElement = document.getElementById('likeCount');
        const dislikeCountElement = document.getElementById('dislikeCount');
        if (likeCountElement) likeCountElement.textContent = data.likeCount || 0;
        if (dislikeCountElement) dislikeCountElement.textContent = data.dislikeCount || 0;
        
        const action = isLiked ? 'removed like from' : 'liked';
        showToast(`Video ${action}`, 'success');
    })
    .catch(error => {
        console.error('Error toggling like:', error);
        showToast('Failed to update like', 'error');
    });
}

function toggleVideoDislike() {
    if (!isAuthenticated) {
        showToast('Please login to dislike videos', 'error');
        return;
    }
    
    if (!currentVideoId) return;
    
    const likeBtn = document.getElementById('modalLikeBtn');
    const dislikeBtn = document.getElementById('modalDislikeBtn');
    if (!likeBtn || !dislikeBtn) return;
    
    const isDisliked = dislikeBtn.classList.contains('active');
    
    const method = isDisliked ? 'DELETE' : 'POST';
    const url = `/api/likes/${currentVideoId}`;
    const body = method === 'POST' ? JSON.stringify({ userId: currentUser.id, type: 'dislike' }) : null;
    const queryParam = method === 'DELETE' ? `?userId=${currentUser.id}` : '';
    
    fetch(url + queryParam, { 
        method,
        headers: method === 'POST' ? { 'Content-Type': 'application/json' } : {},
        body
    })
    .then(response => response.json())
    .then(data => {
        dislikeBtn.classList.toggle('active');
        likeBtn.classList.remove('active'); // Remove like if present
        
        // Update counts
        const likeCountElement = document.getElementById('likeCount');
        const dislikeCountElement = document.getElementById('dislikeCount');
        if (likeCountElement) likeCountElement.textContent = data.likeCount || 0;
        if (dislikeCountElement) dislikeCountElement.textContent = data.dislikeCount || 0;
        
        const action = isDisliked ? 'removed dislike from' : 'disliked';
        showToast(`Video ${action}`, 'success');
    })
    .catch(error => {
        console.error('Error toggling dislike:', error);
        showToast('Failed to update dislike', 'error');
    });
}

function highlightStars(rating) {
    document.querySelectorAll('#starRating i').forEach((star, index) => {
        if (index < rating) {
            star.classList.add('highlighted');
        } else {
            star.classList.remove('highlighted');
        }
    });
}

function resetStars() {
    document.querySelectorAll('#starRating i').forEach(star => {
        star.classList.remove('highlighted');
    });
}

function displayCategories(categories) {
    const container = document.getElementById('categoriesGrid');
    if (!container) return;
    
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
    if (!container) return;
    
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
        performerCard.onclick = (e) => {
            // Don't trigger if clicking on subscribe button
            if (!e.target.closest('.performer-subscribe-btn')) {
                handlePerformerClick(null, performer.name);
            }
        };
        
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
                ${isAuthenticated ? `
                    <button class="performer-subscribe-btn" onclick="handlePerformerSubscribe(event, '${performer.name}')">
                        <i class="fas fa-bell"></i> Subscribe
                    </button>
                ` : ''}
            </div>
        `;
        
        container.appendChild(performerCard);
    });
}

// New function to display subscribed performers only
function displaySubscribedPerformers(subscriptions) {
    const container = document.getElementById('performersGrid');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (!subscriptions || subscriptions.length === 0) {
        container.innerHTML = `
            <div class="no-performers-message">
                <i class="fas fa-bell"></i>
                <h3>No Subscriptions</h3>
                <p>You haven't subscribed to any performers yet.</p>
            </div>
        `;
        return;
    }
    
    subscriptions.forEach(subscription => {
        const performerCard = document.createElement('div');
        performerCard.className = 'performer-card';
        performerCard.onclick = (e) => {
            // Don't trigger if clicking on unsubscribe button
            if (!e.target.closest('.performer-subscribe-btn')) {
                handlePerformerClick(null, subscription.name);
            }
        };
        
        performerCard.innerHTML = `
            <div class="performer-avatar">
                ${subscription.hasImage ? 
                    `<img src="${subscription.imageUrl}" alt="${subscription.displayName}" loading="lazy">` :
                    `<i class="fas fa-user"></i>`
                }
            </div>
            <div class="performer-info">
                <h3 class="performer-name">${subscription.displayName}</h3>
                <p class="performer-video-count">Subscribed on ${new Date(subscription.subscribedAt).toLocaleDateString()}</p>
                <button class="performer-subscribe-btn subscribed" onclick="handlePerformerSubscribe(event, '${subscription.name}')">
                    <i class="fas fa-bell-slash"></i> Unsubscribe
                </button>
            </div>
        `;
        
        container.appendChild(performerCard);
    });
}

function displayMobileCategories(categories) {
    const container = document.getElementById('mobileCategoriesList');
    if (!container) return;
    
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
    if (!container) return;
    
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
function formatNumber(num) {
    if (num >= 1000000) {
        return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
}

function showLoadingIndicator() {
    const loadingContainer = document.getElementById('loadingContainer');
    if (loadingContainer) loadingContainer.style.display = 'flex';
}

function hideLoadingIndicator() {
    const loadingContainer = document.getElementById('loadingContainer');
    if (loadingContainer) loadingContainer.style.display = 'none';
}

function showNoResults(title = 'No videos found', text = 'Try adjusting your search terms or filters') {
    const noResultsTitle = document.getElementById('noResultsTitle');
    const noResultsText = document.getElementById('noResultsText');
    const noResults = document.getElementById('noResults');
    
    if (noResultsTitle) noResultsTitle.textContent = title;
    if (noResultsText) noResultsText.textContent = text;
    if (noResults) noResults.style.display = 'block';
}

// Favorite functions (merged with likes)
function toggleFavorite(event, videoId) {
    event.preventDefault();
    event.stopPropagation();
    
    if (!isAuthenticated) {
        showToast('Please login to favorite videos', 'error');
        return;
    }
    // Support both grid and modal favorite buttons
    let btn = event.target.closest('.video-favorite-btn') || event.target.closest('.favorite-video-btn');
    if (!btn) return; // If not found, exit gracefully
    const isCurrentlyFavorite = btn.classList.contains('active');
    
    const method = isCurrentlyFavorite ? 'DELETE' : 'POST';
    const url = `/api/favorites/${videoId}`;
    const body = method === 'POST' ? JSON.stringify({ userId: currentUser.id }) : null;
    const queryParam = method === 'DELETE' ? `?userId=${currentUser.id}` : '';
    
    fetch(url + queryParam, { 
        method,
        headers: method === 'POST' ? { 'Content-Type': 'application/json' } : {},
        body
    })
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
    if (isAuthenticated) {
        fetch(`/api/favorites?userId=${currentUser.id}`)
            .then(response => response.json())
            .then(data => {
                const favoritesCount = document.querySelector('.favorites-count');
                if (favoritesCount) favoritesCount.textContent = data.total;
            })
            .catch(console.error);
    } else {
        const favoritesCount = document.querySelector('.favorites-count');
        if (favoritesCount) favoritesCount.textContent = '0';
    }
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

// Mobile navigation
function toggleMobileNav() {
    const mobileNav = document.getElementById('mobileNav');
    if (mobileNav) mobileNav.classList.toggle('active');
}

function closeMobileNav() {
    const mobileNav = document.getElementById('mobileNav');
    if (mobileNav) mobileNav.classList.remove('active');
}

// Scroll handling
function handleScroll() {
    if (currentSection === 'home' || currentSection === 'trending' || currentSection === 'favorites' || currentSection === 'watch-history' || currentSection === 'watch-later' || currentSection === 'ai') {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const windowHeight = window.innerHeight;
        const documentHeight = document.documentElement.scrollHeight;
        
        if (scrollTop + windowHeight >= documentHeight - 1000 && hasMore && !isLoading) {
            if (currentSection === 'trending') {
                loadTrendingVideos();
            } else if (currentSection === 'watch-history') {
                loadWatchHistory();
            } else if (currentSection === 'watch-later') {
                loadWatchLaterVideos();
            } else if (currentSection === 'ai') {
                // AI recommendations don't support pagination yet
                return;
            } else {
                loadVideos();
            }
        }
    }
}

// Advanced search functions
function showAdvancedSearch() {
    const modal = document.getElementById('advancedSearchModal');
    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}

function hideAdvancedSearch() {
    const modal = document.getElementById('advancedSearchModal');
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }
}

function applyAdvancedSearch() {
    const form = document.getElementById('advancedSearchForm');
    if (!form) return;
    
    const formData = new FormData(form);
    
    // Build advanced search filters
    const advancedFilters = {
        search: formData.get('keywords') || '',
        celebrity: formData.get('performer') || '',
        category: formData.get('category') || '',
        minDuration: formData.get('minDuration') || '',
        maxDuration: formData.get('maxDuration') || '',
        quality: formData.get('quality') || '',
        minRating: formData.get('minRating') || '',
        sort: formData.get('sort') || 'random'
    };
    
    // Apply filters
    Object.assign(currentFilters, advancedFilters);
    currentPage = 1;
    hasMore = true;
    
    hideAdvancedSearch();
    navigateToSection('home');
    window.dispatchEvent(new Event('videos:reset'));
    
    showToast('Advanced search applied', 'success');
}

function clearAdvancedSearch() {
    const form = document.getElementById('advancedSearchForm');
    if (form) form.reset();
}

// Initialize favorites count on load
updateFavoritesCount();