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
        'categories': 'Categories',
        'performers': 'Pornstars',
        'playlists': 'My Playlists',
        'subscriptions': 'My Subscriptions',
        'favorites': 'Favorite Videos',
        'watch-history': 'Watch History'
    };
    
    const breadcrumbs = {
        'home': 'Home',
        'trending': 'Home / Trending',
        'new': 'Home / New',
        'top-rated': 'Home / Top Rated',
        'categories': 'Home / Categories',
        'performers': 'Home / Pornstars',
        'playlists': 'Home / My Playlists',
        'subscriptions': 'Home / My Subscriptions',
        'favorites': 'Home / Favorites',
        'watch-history': 'Home / Watch History'
    };
    
    document.getElementById('contentTitle').textContent = titles[section] || 'Videos';
    document.getElementById('contentBreadcrumb').innerHTML = breadcrumbs[section] || 'Home';
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
            favorites: currentFilters.favorites.toString(),
            userId: isAuthenticated ? currentUser.id : ''
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

async function loadSubscriptions() {
    if (!isAuthenticated) {
        showNoResults('Login Required', 'Please login to view your subscriptions');
        return;
    }
    
    if (isLoading) return;
    
    isLoading = true;
    showLoadingIndicator();
    
    try {
        // Get user's subscriptions
        const subscriptionsResponse = await fetch(`/api/subscriptions/${currentUser.id}`);
        const subscriptionsData = await subscriptionsResponse.json();
        
        if (subscriptionsData.subscriptions && subscriptionsData.subscriptions.length > 0) {
            // Display only the subscribed performers (not their videos)
            displaySubscribedPerformers(subscriptionsData.subscriptions);
        } else {
            showNoResults('No subscriptions', 'Subscribe to performers to see them here');
        }
    } catch (error) {
        console.error('Error loading subscriptions:', error);
        showToast('Failed to load subscriptions', 'error');
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



// Video interaction functions - Updated for favorites only
function toggleVideoFavorite() {
    if (!isAuthenticated) {
        showToast('Please login to favorite videos', 'error');
        return;
    }
    
    if (!currentVideoId) return;
    
    const btn = document.getElementById('modalFavBtn');
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

function rateVideo(rating) {
    if (!isAuthenticated) {
        showToast('Please login to rate videos', 'error');
        return;
    }
    
    if (!currentVideoId) return;
    
    fetch(`/api/rate/${currentVideoId}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ rating })
    })
    .then(response => response.json())
    .then(data => {
        // Update star display
        document.querySelectorAll('#starRating i').forEach((star, index) => {
            if (index < rating) {
                star.classList.add('active');
            } else {
                star.classList.remove('active');
            }
        });
        
        showToast(`Rated ${rating} stars!`, 'success');
    })
    .catch(error => {
        console.error('Rating error:', error);
        showToast('Failed to rate video', 'error');
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
                    <i class="fas fa-heart"></i>
                    ${video.isFavorite ? 'Favorited' : 'Favorite'}
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

function displayPlaylists(playlists) {
    const container = document.getElementById('playlistsGrid');
    container.innerHTML = '';
    
    if (!playlists || playlists.length === 0) {
        container.innerHTML = `
            <div class="no-playlists-message">
                <i class="fas fa-list"></i>
                <h3>No Playlists Found</h3>
                <p>You haven't created any playlists yet.</p>
                <button class="auth-submit-btn" onclick="showCreatePlaylistModal()">
                    <i class="fas fa-plus"></i>
                    Create Your First Playlist
                </button>
            </div>
        `;
        return;
    }
    
    playlists.forEach(playlist => {
        const playlistCard = document.createElement('div');
        playlistCard.className = 'playlist-card';
        playlistCard.onclick = () => loadPlaylistVideos(playlist.id);
        
        playlistCard.innerHTML = `
            <div class="playlist-thumbnail">
                <i class="fas fa-list"></i>
                <div class="playlist-video-count">${playlist.videos.length} videos</div>
            </div>
            <div class="playlist-info">
                <h3 class="playlist-name">${playlist.name}</h3>
                <p class="playlist-description">${playlist.description || 'No description'}</p>
                <div class="playlist-meta">
                    <span class="playlist-privacy">
                        <i class="fas ${playlist.isPrivate ? 'fa-lock' : 'fa-globe'}"></i>
                        ${playlist.isPrivate ? 'Private' : 'Public'}
                    </span>
                    <span>${new Date(playlist.createdAt).toLocaleDateString()}</span>
                </div>
            </div>
            <div class="playlist-actions">
                <button class="playlist-action-btn" onclick="event.stopPropagation(); loadPlaylistVideos('${playlist.id}')">
                    <i class="fas fa-play"></i>
                    Play
                </button>
                <button class="playlist-action-btn" onclick="event.stopPropagation(); deletePlaylist('${playlist.id}')">
                    <i class="fas fa-trash"></i>
                    Delete
                </button>
            </div>
        `;
        
        container.appendChild(playlistCard);
    });
}

function showPlaylistsAuthRequired() {
    const container = document.getElementById('playlistsGrid');
    container.innerHTML = `
        <div class="auth-required">
            <i class="fas fa-lock"></i>
            <h3>Login Required</h3>
            <p>Please login to view and manage your playlists.</p>
            <button class="auth-submit-btn" onclick="showAuthModal('login')">
                <i class="fas fa-sign-in-alt"></i>
                Login Now
            </button>
        </div>
    `;
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
                document.querySelector('.favorites-count').textContent = data.total;
            })
            .catch(console.error);
    } else {
        document.querySelector('.favorites-count').textContent = '0';
    }
}

// Video modal functions
async function openVideoModal(video) {
    currentVideoId = video.id;
    
    // Update modal content
    document.getElementById('modalVideoTitle').textContent = video.title;
    
    // Make performer name clickable in modal
    const performerElement = document.getElementById('modalVideoPerformer');
    performerElement.textContent = video.artist;
    performerElement.style.cursor = 'pointer';
    performerElement.onclick = (e) => {
        e.preventDefault();
        closeVideoModal();
        setTimeout(() => handlePerformerClick(null, video.artist), 100);
    };
    
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
    
    // Update favorite action button
    const favBtn = document.getElementById('modalFavBtn');
    favBtn.classList.toggle('active', video.isFavorite);
    
    // Check subscription status
    if (isAuthenticated) {
        checkSubscriptionStatus(video.artist);
    }
    
    // Show modal
    document.getElementById('videoModal').classList.add('active');
    document.body.style.overflow = 'hidden';
    
    // Add to watch history
    addToWatchHistory(video.id);
    
    // Load related videos
    loadRelatedVideos(video);
    
    // Load comments
    loadComments(video.id);
}

async function checkSubscriptionStatus(performerName) {
    try {
        const response = await fetch(`/api/subscriptions/${currentUser.id}`);
        const data = await response.json();
        
        const isSubscribed = data.subscriptions.some(sub => sub.name === performerName);
        const subscribeBtn = document.getElementById('subscribeBtn');
        
        if (isSubscribed) {
            subscribeBtn.classList.add('active');
            subscribeBtn.innerHTML = '<i class="fas fa-bell-slash"></i><span>Unsubscribe</span>';
        } else {
            subscribeBtn.classList.remove('active');
            subscribeBtn.innerHTML = '<i class="fas fa-bell"></i><span>Subscribe</span>';
        }
    } catch (error) {
        console.error('Error checking subscription status:', error);
    }
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
        } else if (document.getElementById('profileModal').classList.contains('active')) {
            hideProfileModal();
        } else if (document.getElementById('playlistModal').classList.contains('active')) {
            hidePlaylistModal();
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