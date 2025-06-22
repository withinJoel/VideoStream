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

// Data storage (simulating backend)
let userPlaylists = [];
let userSubscriptions = new Set();
let videoComments = {};

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    setupEventListeners();
    loadInitialData();
    checkAuthStatus();
    loadUserData();
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
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            performSearch();
        }
    });
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
    document.getElementById('modalFullscreenBtn').addEventListener('click', toggleFullscreen);
    document.getElementById('modalShareBtn').addEventListener('click', shareVideo);
    
    // Video modal actions
    document.getElementById('modalFavBtn').addEventListener('click', () => {
        if (currentVideoId) {
            const btn = document.getElementById('modalFavBtn');
            const isActive = btn.classList.contains('active');
            toggleFavoriteInModal(currentVideoId, !isActive);
        }
    });
    
    document.getElementById('modalLikeBtn').addEventListener('click', () => {
        if (currentVideoId) {
            toggleLike(currentVideoId);
        }
    });
    
    document.getElementById('modalDislikeBtn').addEventListener('click', () => {
        if (currentVideoId) {
            toggleDislike(currentVideoId);
        }
    });
    
    document.getElementById('modalPlaylistBtn').addEventListener('click', () => {
        if (currentVideoId) {
            showPlaylistModal(currentVideoId);
        }
    });
    
    document.getElementById('subscribeBtn').addEventListener('click', toggleSubscription);
    
    // Star rating
    document.querySelectorAll('#starRating i').forEach((star, index) => {
        star.addEventListener('click', () => rateVideo(currentVideoId, index + 1));
        star.addEventListener('mouseenter', () => highlightStars(index + 1));
        star.addEventListener('mouseleave', () => resetStars());
    });
    
    // Authentication
    document.getElementById('loginBtn').addEventListener('click', () => showAuthModal('login'));
    document.getElementById('registerBtn').addEventListener('click', () => showAuthModal('register'));
    document.getElementById('loginModalClose').addEventListener('click', () => hideAuthModal('login'));
    document.getElementById('registerModalClose').addEventListener('click', () => hideAuthModal('register'));
    document.getElementById('switchToRegister').addEventListener('click', (e) => {
        e.preventDefault();
        switchAuthModal('register');
    });
    document.getElementById('switchToLogin').addEventListener('click', (e) => {
        e.preventDefault();
        switchAuthModal('login');
    });
    
    // Auth forms
    document.getElementById('loginForm').addEventListener('submit', handleLogin);
    document.getElementById('registerForm').addEventListener('submit', handleRegister);
    
    // User menu
    document.getElementById('userAvatarContainer').addEventListener('click', toggleUserDropdown);
    document.getElementById('profileBtn').addEventListener('click', (e) => {
        e.preventDefault();
        showProfileModal();
        toggleUserDropdown();
    });
    document.getElementById('myPlaylistsBtn').addEventListener('click', (e) => {
        e.preventDefault();
        navigateToSection('playlists');
        toggleUserDropdown();
    });
    document.getElementById('subscriptionsBtn').addEventListener('click', (e) => {
        e.preventDefault();
        navigateToSection('subscriptions');
        toggleUserDropdown();
    });
    document.getElementById('favoritesDropdownBtn').addEventListener('click', (e) => {
        e.preventDefault();
        navigateToSection('favorites');
        toggleUserDropdown();
    });
    document.getElementById('watchHistoryBtn').addEventListener('click', (e) => {
        e.preventDefault();
        navigateToSection('watch-history');
        toggleUserDropdown();
    });
    document.getElementById('logoutBtn').addEventListener('click', (e) => {
        e.preventDefault();
        handleLogout();
        toggleUserDropdown();
    });
    
    // Profile modal
    document.getElementById('profileModalClose').addEventListener('click', () => hideProfileModal());
    document.getElementById('profileForm').addEventListener('submit', handleProfileUpdate);
    document.getElementById('changeAvatarBtn').addEventListener('click', () => {
        document.getElementById('avatarUpload').click();
    });
    document.getElementById('avatarUpload').addEventListener('change', handleAvatarUpload);
    
    // Playlist modal
    document.getElementById('playlistModalClose').addEventListener('click', () => hidePlaylistModal());
    document.getElementById('createNewPlaylistBtn').addEventListener('click', createNewPlaylist);
    document.getElementById('createPlaylistBtn').addEventListener('click', () => showCreatePlaylistModal());
    
    // Comment functionality
    document.getElementById('commentInput').addEventListener('focus', () => {
        if (!isAuthenticated) {
            showAuthModal('login');
            return;
        }
        document.getElementById('commentInput').style.minHeight = '100px';
        document.querySelector('.comment-actions').style.display = 'flex';
    });
    
    document.getElementById('commentCancelBtn').addEventListener('click', cancelComment);
    document.getElementById('commentSubmitBtn').addEventListener('click', submitComment);
    document.getElementById('commentSort').addEventListener('change', loadComments);
    document.getElementById('loadMoreComments').addEventListener('click', loadMoreComments);
    
    // Infinite scroll
    window.addEventListener('scroll', handleScroll);
    
    // Keyboard shortcuts
    document.addEventListener('keydown', handleKeyboardShortcuts);
    
    // Clear filters
    document.getElementById('clearFiltersBtn').addEventListener('click', clearAllFilters);
    
    // Close dropdowns when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.user-menu')) {
            document.getElementById('userDropdown').classList.remove('active');
        }
        if (!e.target.closest('.search-container')) {
            hideSearchSuggestions();
        }
    });
    
    // Modal backdrop clicks
    document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
        backdrop.addEventListener('click', (e) => {
            if (e.target === backdrop) {
                const modal = backdrop.closest('.auth-modal, .playlist-modal, .profile-modal');
                if (modal) {
                    modal.classList.remove('active');
                    document.body.style.overflow = '';
                }
            }
        });
    });
}

function loadInitialData() {
    loadCategories();
    loadPerformers();
    loadVideos(true);
}

function checkAuthStatus() {
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
        try {
            currentUser = JSON.parse(savedUser);
            isAuthenticated = true;
            updateAuthUI();
        } catch (error) {
            console.error('Error parsing saved user:', error);
            localStorage.removeItem('currentUser');
        }
    }
}

function loadUserData() {
    if (isAuthenticated) {
        const savedPlaylists = localStorage.getItem(`playlists_${currentUser.id}`);
        const savedSubscriptions = localStorage.getItem(`subscriptions_${currentUser.id}`);
        
        if (savedPlaylists) {
            try {
                userPlaylists = JSON.parse(savedPlaylists);
            } catch (error) {
                console.error('Error loading playlists:', error);
                userPlaylists = [];
            }
        }
        
        if (savedSubscriptions) {
            try {
                userSubscriptions = new Set(JSON.parse(savedSubscriptions));
            } catch (error) {
                console.error('Error loading subscriptions:', error);
                userSubscriptions = new Set();
            }
        }
    }
}

function saveUserData() {
    if (isAuthenticated && currentUser) {
        localStorage.setItem(`playlists_${currentUser.id}`, JSON.stringify(userPlaylists));
        localStorage.setItem(`subscriptions_${currentUser.id}`, JSON.stringify([...userSubscriptions]));
    }
}

function updateAuthUI() {
    const authSection = document.getElementById('authSection');
    const userMenu = document.getElementById('userMenu');
    
    if (isAuthenticated && currentUser) {
        authSection.style.display = 'none';
        userMenu.style.display = 'block';
        
        document.getElementById('userName').textContent = currentUser.username;
        document.getElementById('userAvatarImg').src = currentUser.avatar || generateAvatar(currentUser.username);
        
        // Show authenticated features
        document.getElementById('createPlaylistBtn').style.display = 'flex';
        document.getElementById('ratingSection').style.display = 'flex';
        document.getElementById('commentForm').style.display = 'block';
        document.getElementById('modalPlaylistBtn').style.display = 'flex';
        document.getElementById('subscribeBtn').style.display = 'flex';
        
        // Update comment avatar
        const commentAvatar = document.getElementById('commentUserAvatar');
        if (commentAvatar) {
            commentAvatar.src = currentUser.avatar || generateAvatar(currentUser.username);
        }
    } else {
        authSection.style.display = 'flex';
        userMenu.style.display = 'none';
        
        // Hide authenticated features
        document.getElementById('createPlaylistBtn').style.display = 'none';
        document.getElementById('ratingSection').style.display = 'none';
        document.getElementById('commentForm').style.display = 'none';
        document.getElementById('modalPlaylistBtn').style.display = 'none';
        document.getElementById('subscribeBtn').style.display = 'none';
    }
    
    updateFavoritesCount();
}

// Navigation functions
function navigateToSection(section) {
    // Check authentication for protected sections
    if ((section === 'favorites' || section === 'watch-history' || section === 'playlists' || section === 'subscriptions') && !isAuthenticated) {
        showToast('Please login to access this feature', 'warning');
        showAuthModal('login');
        return;
    }
    
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
            loadAndDisplayPlaylists();
            break;
        case 'subscriptions':
            showVideoGrid();
            loadSubscriptionVideos();
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
        'playlists': 'My Playlists',
        'subscriptions': 'Subscriptions',
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
        'playlists': 'Home / My Playlists',
        'subscriptions': 'Home / Subscriptions',
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
        currentFilters.celebrity = '';
        currentFilters.category = '';
        currentPage = 1;
        hasMore = true;
        
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
        currentFilters.category = '';
        document.getElementById('searchInput').value = text;
    } else if (type === 'category') {
        currentFilters.category = value;
        currentFilters.search = '';
        currentFilters.celebrity = '';
        document.getElementById('searchInput').value = text;
    } else {
        currentFilters.search = text;
        currentFilters.celebrity = '';
        currentFilters.category = '';
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
    
    currentFilters = {
        search: '',
        celebrity: '',
        category: category,
        sort: currentFilters.sort,
        favorites: false
    };
    
    document.getElementById('searchInput').value = '';
    document.getElementById('contentTitle').textContent = `Category: ${formatCategoryName(category)}`;
    document.getElementById('contentBreadcrumb').innerHTML = `Home / Categories / ${formatCategoryName(category)}`;
    
    currentPage = 1;
    hasMore = true;
    
    showVideoGrid();
    loadVideos(true);
    
    showToast(`Showing videos in category: ${formatCategoryName(category)}`, 'success');
}

function handlePerformerClick(event, performer) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }
    
    console.log('Filtering by performer:', performer);
    
    currentFilters = {
        search: '',
        celebrity: performer,
        category: '',
        sort: currentFilters.sort,
        favorites: false
    };
    
    document.getElementById('searchInput').value = '';
    document.getElementById('contentTitle').textContent = `Performer: ${formatPerformerName(performer)}`;
    document.getElementById('contentBreadcrumb').innerHTML = `Home / Performers / ${formatPerformerName(performer)}`;
    
    currentPage = 1;
    hasMore = true;
    
    showVideoGrid();
    loadVideos(true);
    
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

async function loadSubscriptionVideos() {
    if (isLoading) return;
    
    isLoading = true;
    showLoadingIndicator();
    
    try {
        if (userSubscriptions.size === 0) {
            showNoResults('No subscriptions found', 'Subscribe to performers to see their latest videos here');
            return;
        }
        
        // Get videos from subscribed performers
        const subscribedPerformers = [...userSubscriptions];
        const allVideos = [];
        
        for (const performer of subscribedPerformers) {
            const params = new URLSearchParams({
                page: 1,
                limit: 50,
                celebrity: performer,
                sort: 'newest'
            });
            
            const response = await fetch(`/api/videos?${params}`);
            const data = await response.json();
            
            if (data.videos) {
                allVideos.push(...data.videos);
            }
        }
        
        // Sort by newest
        allVideos.sort((a, b) => new Date(b.uploadDate) - new Date(a.uploadDate));
        
        // Paginate
        const startIndex = (currentPage - 1) * 20;
        const endIndex = startIndex + 20;
        const paginatedVideos = allVideos.slice(startIndex, endIndex);
        
        if (paginatedVideos.length > 0) {
            displayVideos(paginatedVideos, currentPage === 1);
            hasMore = endIndex < allVideos.length;
            updateVideoCount(allVideos.length);
        } else if (currentPage === 1) {
            showNoResults('No videos from subscriptions', 'Your subscribed performers haven\'t uploaded any videos yet');
        }
        
        currentPage++;
    } catch (error) {
        console.error('Error loading subscription videos:', error);
        showToast('Failed to load subscription videos', 'error');
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

async function loadAndDisplayPlaylists() {
    try {
        showLoadingIndicator();
        displayPlaylists(userPlaylists);
    } catch (error) {
        console.error('Error loading playlists:', error);
        showToast('Failed to load playlists', 'error');
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
        
        previewVideo = document.createElement('video');
        previewVideo.className = 'hover-preview-video';
        previewVideo.muted = true;
        previewVideo.loop = true;
        previewVideo.preload = 'metadata';
        previewVideo.style.opacity = '0';
        
        previewVideo.src = `/api/video-stream/${video.id}#t=10`;
        
        thumbnail.appendChild(previewVideo);
        
        previewVideo.addEventListener('loadeddata', () => {
            if (isHovering && previewVideo) {
                previewVideo.currentTime = 10;
                previewVideo.play().then(() => {
                    if (previewVideo && isHovering) {
                        previewVideo.style.opacity = '1';
                        img.style.opacity = '0';
                    }
                }).catch(() => {
                    if (previewVideo) {
                        previewVideo.remove();
                        previewVideo = null;
                    }
                });
            }
        });
        
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
    
    card.addEventListener('mouseenter', () => {
        isHovering = true;
        clearTimeout(hoverPreviewTimeout);
        hoverPreviewTimeout = setTimeout(startPreview, 800);
    });
    
    card.addEventListener('mouseleave', () => {
        isHovering = false;
        clearTimeout(hoverPreviewTimeout);
        stopPreview();
    });
    
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
        
        const isSubscribed = userSubscriptions.has(performer.name);
        
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
                    <button class="performer-subscribe-btn ${isSubscribed ? 'subscribed' : ''}" 
                            onclick="togglePerformerSubscription(event, '${performer.name}')">
                        <i class="fas ${isSubscribed ? 'fa-bell-slash' : 'fa-bell'}"></i>
                        ${isSubscribed ? 'Unsubscribe' : 'Subscribe'}
                    </button>
                ` : ''}
            </div>
        `;
        
        container.appendChild(performerCard);
    });
}

function displayPlaylists(playlists) {
    const container = document.getElementById('playlistsGrid');
    container.innerHTML = '';
    
    if (!isAuthenticated) {
        container.innerHTML = `
            <div class="auth-required">
                <i class="fas fa-lock"></i>
                <h3>Login Required</h3>
                <p>Please login to view and manage your playlists.</p>
                <button class="auth-btn login-btn" onclick="showAuthModal('login')">
                    <i class="fas fa-sign-in-alt"></i>
                    Login
                </button>
            </div>
        `;
        return;
    }
    
    if (!playlists || playlists.length === 0) {
        container.innerHTML = `
            <div class="no-playlists-message">
                <i class="fas fa-list"></i>
                <h3>No Playlists Found</h3>
                <p>You haven't created any playlists yet. Create your first playlist to organize your favorite videos.</p>
                <button class="create-playlist-btn" onclick="showCreatePlaylistModal()">
                    <i class="fas fa-plus"></i>
                    Create Playlist
                </button>
            </div>
        `;
        return;
    }
    
    playlists.forEach(playlist => {
        const playlistCard = document.createElement('div');
        playlistCard.className = 'playlist-card';
        playlistCard.onclick = () => openPlaylist(playlist.id);
        
        playlistCard.innerHTML = `
            <div class="playlist-thumbnail">
                <i class="fas fa-list"></i>
                <div class="playlist-video-count">${playlist.videos.length} videos</div>
            </div>
            <div class="playlist-info">
                <h3 class="playlist-name">${playlist.name}</h3>
                <p class="playlist-description">${playlist.description || 'No description'}</p>
                <div class="playlist-meta">
                    <span class="playlist-created">Created ${formatDate(playlist.createdAt)}</span>
                    <div class="playlist-privacy">
                        <i class="fas ${playlist.isPrivate ? 'fa-lock' : 'fa-globe'}"></i>
                        ${playlist.isPrivate ? 'Private' : 'Public'}
                    </div>
                </div>
            </div>
            <div class="playlist-actions">
                <button class="playlist-action-btn" onclick="editPlaylist(event, '${playlist.id}')">
                    <i class="fas fa-edit"></i>
                    Edit
                </button>
                <button class="playlist-action-btn" onclick="deletePlaylist(event, '${playlist.id}')">
                    <i class="fas fa-trash"></i>
                    Delete
                </button>
            </div>
        `;
        
        container.appendChild(playlistCard);
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

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString();
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
    
    if (!isAuthenticated) {
        showToast('Please login to add favorites', 'warning');
        showAuthModal('login');
        return;
    }
    
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
            updateFavoritesCount();
        })
        .catch(error => {
            console.error('Error toggling favorite:', error);
            showToast('Failed to update favorites', 'error');
        });
}

function toggleFavoriteInModal(videoId, isFavorite) {
    if (!isAuthenticated) {
        showToast('Please login to add favorites', 'warning');
        showAuthModal('login');
        return;
    }
    
    const method = isFavorite ? 'POST' : 'DELETE';
    const url = `/api/favorites/${videoId}`;
    
    fetch(url, { method })
        .then(response => response.json())
        .then(data => {
            const btn = document.getElementById('modalFavBtn');
            btn.classList.toggle('active', isFavorite);
            
            // Update the heart button in video overlay too
            const overlayBtn = document.getElementById('modalFavoriteBtn');
            if (overlayBtn) {
                overlayBtn.classList.toggle('active', isFavorite);
            }
            
            const action = isFavorite ? 'added to' : 'removed from';
            showToast(`Video ${action} favorites`, 'success');
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

// Subscription functions
function toggleSubscription() {
    if (!isAuthenticated) {
        showToast('Please login to subscribe', 'warning');
        showAuthModal('login');
        return;
    }
    
    const btn = document.getElementById('subscribeBtn');
    const performer = document.getElementById('modalVideoPerformer').textContent;
    const isSubscribed = userSubscriptions.has(performer);
    
    if (isSubscribed) {
        userSubscriptions.delete(performer);
        btn.classList.remove('active');
        btn.innerHTML = '<i class="fas fa-bell"></i><span>Subscribe</span>';
        showToast(`Unsubscribed from ${performer}`, 'success');
    } else {
        userSubscriptions.add(performer);
        btn.classList.add('active');
        btn.innerHTML = '<i class="fas fa-bell-slash"></i><span>Subscribed</span>';
        showToast(`Subscribed to ${performer}`, 'success');
    }
    
    saveUserData();
}

function togglePerformerSubscription(event, performer) {
    event.preventDefault();
    event.stopPropagation();
    
    if (!isAuthenticated) {
        showToast('Please login to subscribe', 'warning');
        showAuthModal('login');
        return;
    }
    
    const btn = event.target.closest('.performer-subscribe-btn');
    const isSubscribed = userSubscriptions.has(performer);
    
    if (isSubscribed) {
        userSubscriptions.delete(performer);
        btn.classList.remove('subscribed');
        btn.innerHTML = '<i class="fas fa-bell"></i>Subscribe';
        showToast(`Unsubscribed from ${formatPerformerName(performer)}`, 'success');
    } else {
        userSubscriptions.add(performer);
        btn.classList.add('subscribed');
        btn.innerHTML = '<i class="fas fa-bell-slash"></i>Unsubscribe';
        showToast(`Subscribed to ${formatPerformerName(performer)}`, 'success');
    }
    
    saveUserData();
}

// Like/Dislike functions
function toggleLike(videoId) {
    if (!isAuthenticated) {
        showToast('Please login to rate videos', 'warning');
        showAuthModal('login');
        return;
    }
    
    const likeBtn = document.getElementById('modalLikeBtn');
    const dislikeBtn = document.getElementById('modalDislikeBtn');
    const isLiked = likeBtn.classList.contains('active');
    
    if (isLiked) {
        likeBtn.classList.remove('active');
        showToast('Like removed', 'success');
    } else {
        likeBtn.classList.add('active');
        dislikeBtn.classList.remove('active');
        showToast('Video liked!', 'success');
    }
}

function toggleDislike(videoId) {
    if (!isAuthenticated) {
        showToast('Please login to rate videos', 'warning');
        showAuthModal('login');
        return;
    }
    
    const likeBtn = document.getElementById('modalLikeBtn');
    const dislikeBtn = document.getElementById('modalDislikeBtn');
    const isDisliked = dislikeBtn.classList.contains('active');
    
    if (isDisliked) {
        dislikeBtn.classList.remove('active');
        showToast('Dislike removed', 'success');
    } else {
        dislikeBtn.classList.add('active');
        likeBtn.classList.remove('active');
        showToast('Video disliked', 'success');
    }
}

// Rating functions
function rateVideo(videoId, rating) {
    if (!isAuthenticated) {
        showToast('Please login to rate videos', 'warning');
        showAuthModal('login');
        return;
    }
    
    fetch(`/api/rate/${videoId}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ rating })
    })
    .then(response => response.json())
    .then(data => {
        updateStarRating(rating);
        showToast(`Rated ${rating} stars`, 'success');
    })
    .catch(error => {
        console.error('Error rating video:', error);
        showToast('Failed to rate video', 'error');
    });
}

function highlightStars(rating) {
    document.querySelectorAll('#starRating i').forEach((star, index) => {
        star.classList.toggle('highlighted', index < rating);
    });
}

function resetStars() {
    document.querySelectorAll('#starRating i').forEach(star => {
        star.classList.remove('highlighted');
    });
}

function updateStarRating(rating) {
    document.querySelectorAll('#starRating i').forEach((star, index) => {
        star.classList.toggle('active', index < rating);
    });
}

// Video modal functions
function openVideoModal(video) {
    currentVideoId = video.id;
    
    document.getElementById('modalVideoTitle').textContent = video.title;
    document.getElementById('modalVideoPerformer').textContent = video.artist;
    document.getElementById('modalVideoViews').textContent = formatNumber(video.views);
    document.getElementById('modalVideoRating').textContent = video.rating.toFixed(1);
    document.getElementById('modalVideoDuration').textContent = video.duration || 'Unknown';
    document.getElementById('modalVideoQuality').textContent = video.quality || 'HD';
    
    const videoElement = document.getElementById('modalVideo');
    videoElement.src = `/api/video-stream/${video.id}`;
    
    const categoriesContainer = document.getElementById('modalVideoCategories');
    categoriesContainer.innerHTML = video.categories.map(cat => 
        `<span class="category-tag" onclick="handleCategoryClick(event, '${cat}')">${cat}</span>`
    ).join('');
    
    const favoriteBtn = document.getElementById('modalFavBtn');
    favoriteBtn.classList.toggle('active', video.isFavorite);
    
    const overlayFavoriteBtn = document.getElementById('modalFavoriteBtn');
    if (overlayFavoriteBtn) {
        overlayFavoriteBtn.classList.toggle('active', video.isFavorite);
    }
    
    // Update subscription button
    if (isAuthenticated) {
        const subscribeBtn = document.getElementById('subscribeBtn');
        const isSubscribed = userSubscriptions.has(video.artist);
        subscribeBtn.classList.toggle('active', isSubscribed);
        subscribeBtn.innerHTML = isSubscribed ? 
            '<i class="fas fa-bell-slash"></i><span>Subscribed</span>' : 
            '<i class="fas fa-bell"></i><span>Subscribe</span>';
    }
    
    document.getElementById('videoModal').classList.add('active');
    document.body.style.overflow = 'hidden';
    
    addToWatchHistory(video.id);
    loadRelatedVideos(video);
    loadComments();
}

function closeVideoModal() {
    const modal = document.getElementById('videoModal');
    const video = document.getElementById('modalVideo');
    
    modal.classList.remove('active');
    document.body.style.overflow = '';
    
    video.pause();
    video.currentTime = 0;
    video.src = '';
    
    currentVideoId = null;
}

function toggleFullscreen() {
    const video = document.getElementById('modalVideo');
    if (video.requestFullscreen) {
        video.requestFullscreen();
    } else if (video.webkitRequestFullscreen) {
        video.webkitRequestFullscreen();
    } else if (video.msRequestFullscreen) {
        video.msRequestFullscreen();
    }
}

function shareVideo() {
    if (navigator.share && currentVideoId) {
        navigator.share({
            title: document.getElementById('modalVideoTitle').textContent,
            url: window.location.href
        }).catch(console.error);
    } else {
        // Fallback: copy to clipboard
        navigator.clipboard.writeText(window.location.href).then(() => {
            showToast('Link copied to clipboard', 'success');
        }).catch(() => {
            showToast('Failed to copy link', 'error');
        });
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

async function loadRelatedVideos(currentVideo) {
    try {
        const params = new URLSearchParams({
            page: 1,
            limit: 10,
            celebrity: currentVideo.artist,
            sort: 'random'
        });
        
        const response = await fetch(`/api/videos?${params}`);
        const data = await response.json();
        
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

// Comment functions
function loadComments() {
    const videoId = currentVideoId;
    if (!videoId) return;
    
    const comments = videoComments[videoId] || [];
    displayComments(comments);
    document.getElementById('commentCount').textContent = comments.length;
}

function displayComments(comments) {
    const container = document.getElementById('commentsList');
    container.innerHTML = '';
    
    if (comments.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #666; padding: 20px;">No comments yet. Be the first to comment!</p>';
        return;
    }
    
    comments.forEach(comment => {
        const commentElement = document.createElement('div');
        commentElement.className = 'comment';
        commentElement.innerHTML = `
            <img src="${comment.avatar}" alt="${comment.author}" class="comment-avatar">
            <div class="comment-content">
                <div class="comment-header">
                    <span class="comment-author">${comment.author}</span>
                    <span class="comment-date">${formatDate(comment.date)}</span>
                </div>
                <p class="comment-text">${comment.text}</p>
                <div class="comment-actions">
                    <button class="comment-like-btn">
                        <i class="fas fa-thumbs-up"></i>
                        ${comment.likes || 0}
                    </button>
                    <button class="comment-dislike-btn">
                        <i class="fas fa-thumbs-down"></i>
                        ${comment.dislikes || 0}
                    </button>
                    <button class="comment-reply-btn">
                        <i class="fas fa-reply"></i>
                        Reply
                    </button>
                </div>
            </div>
        `;
        container.appendChild(commentElement);
    });
}

function submitComment() {
    if (!isAuthenticated) {
        showToast('Please login to comment', 'warning');
        showAuthModal('login');
        return;
    }
    
    const input = document.getElementById('commentInput');
    const text = input.value.trim();
    
    if (!text) {
        showToast('Please enter a comment', 'warning');
        return;
    }
    
    const comment = {
        id: Date.now().toString(),
        author: currentUser.username,
        avatar: currentUser.avatar || generateAvatar(currentUser.username),
        text: text,
        date: new Date().toISOString(),
        likes: 0,
        dislikes: 0
    };
    
    if (!videoComments[currentVideoId]) {
        videoComments[currentVideoId] = [];
    }
    
    videoComments[currentVideoId].unshift(comment);
    
    input.value = '';
    cancelComment();
    loadComments();
    
    showToast('Comment added successfully', 'success');
}

function cancelComment() {
    const input = document.getElementById('commentInput');
    input.style.minHeight = '80px';
    document.querySelector('.comment-actions').style.display = 'none';
    input.blur();
}

function loadMoreComments() {
    // Placeholder for loading more comments
    showToast('No more comments to load', 'info');
}

// Playlist functions
function showPlaylistModal(videoId) {
    if (!isAuthenticated) {
        showToast('Please login to create playlists', 'warning');
        showAuthModal('login');
        return;
    }
    
    document.getElementById('playlistModal').classList.add('active');
    document.body.style.overflow = 'hidden';
    
    displayExistingPlaylists(videoId);
}

function hidePlaylistModal() {
    document.getElementById('playlistModal').classList.remove('active');
    document.body.style.overflow = '';
}

function showCreatePlaylistModal() {
    if (!isAuthenticated) {
        showToast('Please login to create playlists', 'warning');
        showAuthModal('login');
        return;
    }
    
    const name = prompt('Enter playlist name:');
    if (name && name.trim()) {
        createPlaylist(name.trim());
    }
}

function createNewPlaylist() {
    const input = document.getElementById('newPlaylistName');
    const name = input.value.trim();
    
    if (!name) {
        showToast('Please enter a playlist name', 'warning');
        return;
    }
    
    createPlaylist(name);
    input.value = '';
}

function createPlaylist(name, description = '') {
    const playlist = {
        id: Date.now().toString(),
        name: name,
        description: description,
        videos: [],
        createdAt: new Date().toISOString(),
        isPrivate: false
    };
    
    userPlaylists.push(playlist);
    saveUserData();
    
    showToast(`Playlist "${name}" created successfully`, 'success');
    
    if (currentSection === 'playlists') {
        loadAndDisplayPlaylists();
    }
}

function displayExistingPlaylists(videoId) {
    const container = document.getElementById('existingPlaylists');
    
    if (userPlaylists.length === 0) {
        container.innerHTML = '<p class="no-playlists">No playlists found. Create one above!</p>';
        return;
    }
    
    container.innerHTML = '';
    
    userPlaylists.forEach(playlist => {
        const playlistItem = document.createElement('div');
        playlistItem.className = 'playlist-item';
        
        const isVideoInPlaylist = playlist.videos.includes(videoId);
        
        playlistItem.innerHTML = `
            <div class="playlist-info">
                <div class="playlist-name">${playlist.name}</div>
                <div class="playlist-count">${playlist.videos.length} videos</div>
            </div>
            <button class="add-to-playlist-btn ${isVideoInPlaylist ? 'added' : ''}" 
                    onclick="toggleVideoInPlaylist('${playlist.id}', '${videoId}')">
                <i class="fas ${isVideoInPlaylist ? 'fa-check' : 'fa-plus'}"></i>
                ${isVideoInPlaylist ? 'Added' : 'Add'}
            </button>
        `;
        
        container.appendChild(playlistItem);
    });
}

function toggleVideoInPlaylist(playlistId, videoId) {
    const playlist = userPlaylists.find(p => p.id === playlistId);
    if (!playlist) return;
    
    const videoIndex = playlist.videos.indexOf(videoId);
    
    if (videoIndex > -1) {
        playlist.videos.splice(videoIndex, 1);
        showToast(`Removed from "${playlist.name}"`, 'success');
    } else {
        playlist.videos.push(videoId);
        showToast(`Added to "${playlist.name}"`, 'success');
    }
    
    saveUserData();
    displayExistingPlaylists(videoId);
}

function openPlaylist(playlistId) {
    const playlist = userPlaylists.find(p => p.id === playlistId);
    if (!playlist) return;
    
    // This would load and display videos from the playlist
    showToast(`Opening playlist: ${playlist.name}`, 'info');
}

function editPlaylist(event, playlistId) {
    event.preventDefault();
    event.stopPropagation();
    
    const playlist = userPlaylists.find(p => p.id === playlistId);
    if (!playlist) return;
    
    const newName = prompt('Enter new playlist name:', playlist.name);
    if (newName && newName.trim() && newName !== playlist.name) {
        playlist.name = newName.trim();
        saveUserData();
        loadAndDisplayPlaylists();
        showToast('Playlist updated successfully', 'success');
    }
}

function deletePlaylist(event, playlistId) {
    event.preventDefault();
    event.stopPropagation();
    
    const playlist = userPlaylists.find(p => p.id === playlistId);
    if (!playlist) return;
    
    if (confirm(`Are you sure you want to delete "${playlist.name}"?`)) {
        userPlaylists = userPlaylists.filter(p => p.id !== playlistId);
        saveUserData();
        loadAndDisplayPlaylists();
        showToast('Playlist deleted successfully', 'success');
    }
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

function handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    
    if (!email || !password) {
        showToast('Please fill in all fields', 'warning');
        return;
    }
    
    // Simulate login (in real app, this would be an API call)
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    const user = users.find(u => u.email === email && u.password === password);
    
    if (user) {
        currentUser = user;
        isAuthenticated = true;
        localStorage.setItem('currentUser', JSON.stringify(user));
        
        updateAuthUI();
        loadUserData();
        hideAuthModal('login');
        
        showToast(`Welcome back, ${user.username}!`, 'success');
    } else {
        showToast('Invalid email or password', 'error');
    }
}

function handleRegister(e) {
    e.preventDefault();
    
    const username = document.getElementById('registerUsername').value.trim();
    const email = document.getElementById('registerEmail').value.trim();
    const password = document.getElementById('registerPassword').value;
    const confirmPassword = document.getElementById('registerConfirmPassword').value;
    
    if (!username || !email || !password || !confirmPassword) {
        showToast('Please fill in all fields', 'warning');
        return;
    }
    
    if (password !== confirmPassword) {
        showToast('Passwords do not match', 'error');
        return;
    }
    
    if (password.length < 6) {
        showToast('Password must be at least 6 characters', 'error');
        return;
    }
    
    // Check if user already exists
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    if (users.find(u => u.email === email)) {
        showToast('Email already registered', 'error');
        return;
    }
    
    if (users.find(u => u.username === username)) {
        showToast('Username already taken', 'error');
        return;
    }
    
    // Create new user
    const newUser = {
        id: Date.now().toString(),
        username: username,
        email: email,
        password: password,
        avatar: generateAvatar(username),
        bio: '',
        createdAt: new Date().toISOString()
    };
    
    users.push(newUser);
    localStorage.setItem('users', JSON.stringify(users));
    
    // Auto-login
    currentUser = newUser;
    isAuthenticated = true;
    localStorage.setItem('currentUser', JSON.stringify(newUser));
    
    updateAuthUI();
    loadUserData();
    hideAuthModal('register');
    
    showToast(`Welcome, ${username}! Your account has been created.`, 'success');
}

function handleLogout() {
    currentUser = null;
    isAuthenticated = false;
    userPlaylists = [];
    userSubscriptions = new Set();
    
    localStorage.removeItem('currentUser');
    
    updateAuthUI();
    
    // Redirect to home if on protected page
    if (['favorites', 'watch-history', 'playlists', 'subscriptions'].includes(currentSection)) {
        navigateToSection('home');
    }
    
    showToast('Logged out successfully', 'success');
}

function toggleUserDropdown() {
    document.getElementById('userDropdown').classList.toggle('active');
}

// Profile functions
function showProfileModal() {
    if (!isAuthenticated) {
        showToast('Please login to access profile', 'warning');
        showAuthModal('login');
        return;
    }
    
    // Populate form with current user data
    document.getElementById('profileUsername').value = currentUser.username;
    document.getElementById('profileEmail').value = currentUser.email;
    document.getElementById('profileBio').value = currentUser.bio || '';
    document.getElementById('profileAvatar').src = currentUser.avatar || generateAvatar(currentUser.username);
    
    document.getElementById('profileModal').classList.add('active');
    document.body.style.overflow = 'hidden';
}

function hideProfileModal() {
    document.getElementById('profileModal').classList.remove('active');
    document.body.style.overflow = '';
}

function handleProfileUpdate(e) {
    e.preventDefault();
    
    const username = document.getElementById('profileUsername').value.trim();
    const email = document.getElementById('profileEmail').value.trim();
    const bio = document.getElementById('profileBio').value.trim();
    
    if (!username || !email) {
        showToast('Username and email are required', 'warning');
        return;
    }
    
    // Check if username/email is taken by another user
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    const existingUser = users.find(u => u.id !== currentUser.id && (u.username === username || u.email === email));
    
    if (existingUser) {
        showToast('Username or email already taken', 'error');
        return;
    }
    
    // Update current user
    currentUser.username = username;
    currentUser.email = email;
    currentUser.bio = bio;
    
    // Update in users array
    const userIndex = users.findIndex(u => u.id === currentUser.id);
    if (userIndex > -1) {
        users[userIndex] = currentUser;
        localStorage.setItem('users', JSON.stringify(users));
    }
    
    localStorage.setItem('currentUser', JSON.stringify(currentUser));
    
    updateAuthUI();
    hideProfileModal();
    
    showToast('Profile updated successfully', 'success');
}

function handleAvatarUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
        showToast('Please select an image file', 'error');
        return;
    }
    
    if (file.size > 5 * 1024 * 1024) { // 5MB limit
        showToast('Image size must be less than 5MB', 'error');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = (e) => {
        const avatarUrl = e.target.result;
        currentUser.avatar = avatarUrl;
        
        document.getElementById('profileAvatar').src = avatarUrl;
        
        // Update in storage
        const users = JSON.parse(localStorage.getItem('users') || '[]');
        const userIndex = users.findIndex(u => u.id === currentUser.id);
        if (userIndex > -1) {
            users[userIndex] = currentUser;
            localStorage.setItem('users', JSON.stringify(users));
        }
        
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        updateAuthUI();
        
        showToast('Avatar updated successfully', 'success');
    };
    
    reader.readAsDataURL(file);
}

function generateAvatar(username) {
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F'];
    const color = colors[username.length % colors.length];
    const initial = username.charAt(0).toUpperCase();
    
    const svg = `
        <svg width="100" height="100" xmlns="http://www.w3.org/2000/svg">
            <circle cx="50" cy="50" r="50" fill="${color}"/>
            <text x="50" y="50" font-family="Arial, sans-serif" font-size="40" font-weight="bold" 
                  text-anchor="middle" dominant-baseline="central" fill="white">${initial}</text>
        </svg>
    `;
    
    return `data:image/svg+xml;base64,${btoa(svg)}`;
}

// Scroll handling
function handleScroll() {
    if (currentSection === 'home' || currentSection === 'trending' || currentSection === 'favorites' || currentSection === 'watch-history' || currentSection === 'subscriptions') {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const windowHeight = window.innerHeight;
        const documentHeight = document.documentElement.scrollHeight;
        
        if (scrollTop + windowHeight >= documentHeight - 1000 && hasMore && !isLoading) {
            if (currentSection === 'trending') {
                loadTrendingVideos();
            } else if (currentSection === 'watch-history') {
                loadWatchHistory();
            } else if (currentSection === 'subscriptions') {
                loadSubscriptionVideos();
            } else {
                loadVideos();
            }
        }
    }
}

// Keyboard shortcuts
function handleKeyboardShortcuts(e) {
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
    
    setTimeout(() => {
        toast.remove();
    }, 3000);
}

// Initialize favorites count on load
updateFavoritesCount();