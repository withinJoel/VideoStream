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
    document.getElementById('profileBtn').addEventListener('click', () => showProfileModal());
    document.getElementById('myPlaylistsBtn').addEventListener('click', () => navigateToSection('playlists'));
    document.getElementById('subscriptionsBtn').addEventListener('click', () => navigateToSection('subscriptions'));
    document.getElementById('favoritesDropdownBtn').addEventListener('click', () => navigateToSection('favorites'));
    document.getElementById('watchHistoryBtn').addEventListener('click', () => navigateToSection('watch-history'));
    document.getElementById('logoutBtn').addEventListener('click', handleLogout);
    
    // Profile modal
    document.getElementById('profileModalClose').addEventListener('click', () => hideProfileModal());
    document.getElementById('profileForm').addEventListener('submit', handleProfileUpdate);
    document.getElementById('changeAvatarBtn').addEventListener('click', () => {
        document.getElementById('avatarUpload').click();
    });
    document.getElementById('avatarUpload').addEventListener('change', handleAvatarUpload);
    
    // Playlist modal
    document.getElementById('playlistModalClose').addEventListener('click', () => hidePlaylistModal());
    document.getElementById('createNewPlaylistBtn').addEventListener('click', handleCreatePlaylist);
    document.getElementById('createPlaylistBtn').addEventListener('click', () => showCreatePlaylistModal());
    
    // Video modal actions - Updated for favorites only (no separate likes)
    document.getElementById('modalFavBtn').addEventListener('click', () => toggleVideoFavorite());
    document.getElementById('modalPlaylistBtn').addEventListener('click', () => showPlaylistModal());
    document.getElementById('subscribeBtn').addEventListener('click', handleSubscribe);
    
    // Star rating
    document.querySelectorAll('#starRating i').forEach((star, index) => {
        star.addEventListener('click', () => rateVideo(index + 1));
        star.addEventListener('mouseenter', () => highlightStars(index + 1));
        star.addEventListener('mouseleave', () => resetStars());
    });
    
    // Comments
    document.getElementById('commentInput').addEventListener('focus', showCommentActions);
    document.getElementById('commentCancelBtn').addEventListener('click', hideCommentActions);
    document.getElementById('commentSubmitBtn').addEventListener('click', submitComment);
    
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
        currentUser = JSON.parse(savedUser);
        isAuthenticated = true;
        updateAuthUI();
        updateFavoritesCount();
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
        document.getElementById('subscribeBtn').style.display = 'flex';
        
        // Update comment form avatar
        document.getElementById('commentUserAvatar').src = currentUser.avatar || '/api/placeholder/40/40';
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
}

// Authentication functions
async function handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    
    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            currentUser = data.user;
            isAuthenticated = true;
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            updateAuthUI();
            hideAuthModal('login');
            showToast('Login successful!', 'success');
        } else {
            showToast(data.error || 'Login failed', 'error');
        }
    } catch (error) {
        console.error('Login error:', error);
        showToast('Login failed', 'error');
    }
}

async function handleRegister(e) {
    e.preventDefault();
    
    const username = document.getElementById('registerUsername').value;
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    const confirmPassword = document.getElementById('registerConfirmPassword').value;
    
    if (password !== confirmPassword) {
        showToast('Passwords do not match', 'error');
        return;
    }
    
    try {
        const response = await fetch('/api/auth/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, email, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            currentUser = data.user;
            isAuthenticated = true;
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            updateAuthUI();
            hideAuthModal('register');
            showToast('Registration successful!', 'success');
        } else {
            showToast(data.error || 'Registration failed', 'error');
        }
    } catch (error) {
        console.error('Registration error:', error);
        showToast('Registration failed', 'error');
    }
}

function handleLogout() {
    currentUser = null;
    isAuthenticated = false;
    localStorage.removeItem('currentUser');
    updateAuthUI();
    navigateToSection('home');
    showToast('Logged out successfully', 'success');
}

// Profile functions
function showProfileModal() {
    if (!isAuthenticated) {
        showToast('Please login first', 'error');
        return;
    }
    
    // Populate form with current user data
    document.getElementById('profileUsername').value = currentUser.username;
    document.getElementById('profileEmail').value = currentUser.email;
    document.getElementById('profileBio').value = currentUser.bio || '';
    document.getElementById('profileAvatar').src = currentUser.avatar;
    
    document.getElementById('profileModal').classList.add('active');
    document.body.style.overflow = 'hidden';
}

function hideProfileModal() {
    document.getElementById('profileModal').classList.remove('active');
    document.body.style.overflow = '';
}

async function handleProfileUpdate(e) {
    e.preventDefault();
    
    const username = document.getElementById('profileUsername').value;
    const email = document.getElementById('profileEmail').value;
    const bio = document.getElementById('profileBio').value;
    
    try {
        const response = await fetch(`/api/user/profile/${currentUser.id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, email, bio, avatar: currentUser.avatar })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            currentUser = data.user;
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            updateAuthUI();
            hideProfileModal();
            showToast('Profile updated successfully!', 'success');
        } else {
            showToast(data.error || 'Profile update failed', 'error');
        }
    } catch (error) {
        console.error('Profile update error:', error);
        showToast('Profile update failed', 'error');
    }
}

function handleAvatarUpload(e) {
    const file = e.target.files[0];
    if (file) {
        // Check file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            showToast('Image too large. Please choose a file under 5MB.', 'error');
            return;
        }
        
        // Check file type
        if (!file.type.startsWith('image/')) {
            showToast('Please select an image file.', 'error');
            return;
        }
        
        const reader = new FileReader();
        reader.onload = function(e) {
            currentUser.avatar = e.target.result;
            document.getElementById('profileAvatar').src = e.target.result;
            document.getElementById('userAvatarImg').src = e.target.result;
            document.getElementById('commentUserAvatar').src = e.target.result;
            
            // Save to localStorage immediately
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            
            showToast('Profile picture updated!', 'success');
        };
        reader.readAsDataURL(file);
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
        'performers': 'Home / Performers',
        'playlists': 'Home / My Playlists',
        'subscriptions': 'Home / My Subscriptions',
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
        handlePerformerClick(null, value);
    } else if (type === 'category') {
        handleCategoryClick(null, value);
    } else {
        currentFilters.search = text;
        document.getElementById('searchInput').value = text;
        currentPage = 1;
        hasMore = true;
        navigateToSection('home');
    }
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

// Subscription functions
async function handleSubscribe(e) {
    e.preventDefault();
    e.stopPropagation();
    
    if (!isAuthenticated) {
        showToast('Please login to subscribe', 'error');
        return;
    }
    
    const performerName = document.getElementById('modalVideoPerformer').textContent;
    const btn = document.getElementById('subscribeBtn');
    const isSubscribed = btn.classList.contains('active');
    
    try {
        if (isSubscribed) {
            // Unsubscribe
            const response = await fetch(`/api/subscriptions/${performerName}?userId=${currentUser.id}`, {
                method: 'DELETE'
            });
            
            if (response.ok) {
                btn.classList.remove('active');
                btn.innerHTML = '<i class="fas fa-bell"></i><span>Subscribe</span>';
                showToast('Unsubscribed successfully', 'success');
            }
        } else {
            // Subscribe
            const response = await fetch(`/api/subscriptions/${performerName}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ userId: currentUser.id })
            });
            
            if (response.ok) {
                btn.classList.add('active');
                btn.innerHTML = '<i class="fas fa-bell-slash"></i><span>Unsubscribe</span>';
                showToast('Subscribed successfully', 'success');
            }
        }
    } catch (error) {
        console.error('Subscription error:', error);
        showToast('Failed to update subscription', 'error');
    }
}

async function handlePerformerSubscribe(e, performerName) {
    e.preventDefault();
    e.stopPropagation();
    
    if (!isAuthenticated) {
        showToast('Please login to subscribe', 'error');
        return;
    }
    
    const btn = e.target;
    const isSubscribed = btn.classList.contains('subscribed');
    
    try {
        if (isSubscribed) {
            // Unsubscribe
            const response = await fetch(`/api/subscriptions/${performerName}?userId=${currentUser.id}`, {
                method: 'DELETE'
            });
            
            if (response.ok) {
                btn.classList.remove('subscribed');
                btn.innerHTML = '<i class="fas fa-bell"></i> Subscribe';
                showToast('Unsubscribed successfully', 'success');
            }
        } else {
            // Subscribe
            const response = await fetch(`/api/subscriptions/${performerName}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ userId: currentUser.id })
            });
            
            if (response.ok) {
                btn.classList.add('subscribed');
                btn.innerHTML = '<i class="fas fa-bell-slash"></i> Unsubscribe';
                showToast('Subscribed successfully', 'success');
            }
        }
    } catch (error) {
        console.error('Subscription error:', error);
        showToast('Failed to update subscription', 'error');
    }
}

// Playlist functions
async function loadUserPlaylists() {
    if (!isAuthenticated) {
        showPlaylistsAuthRequired();
        return;
    }
    
    try {
        showLoadingIndicator();
        const response = await fetch(`/api/playlists/${currentUser.id}`);
        const data = await response.json();
        displayPlaylists(data.playlists);
    } catch (error) {
        console.error('Error loading playlists:', error);
        showToast('Failed to load playlists', 'error');
    } finally {
        hideLoadingIndicator();
    }
}

function showCreatePlaylistModal() {
    if (!isAuthenticated) {
        showToast('Please login to create playlists', 'error');
        return;
    }
    
    document.getElementById('playlistModalTitle').textContent = 'Create New Playlist';
    document.getElementById('newPlaylistName').value = '';
    document.getElementById('playlistModal').classList.add('active');
    document.body.style.overflow = 'hidden';
}

function showPlaylistModal() {
    if (!isAuthenticated) {
        showToast('Please login to add to playlists', 'error');
        return;
    }
    
    document.getElementById('playlistModalTitle').textContent = 'Add to Playlist';
    loadExistingPlaylists();
    document.getElementById('playlistModal').classList.add('active');
    document.body.style.overflow = 'hidden';
}

function hidePlaylistModal() {
    document.getElementById('playlistModal').classList.remove('active');
    document.body.style.overflow = '';
}

async function handleCreatePlaylist() {
    const name = document.getElementById('newPlaylistName').value.trim();
    
    if (!name) {
        showToast('Please enter a playlist name', 'error');
        return;
    }
    
    try {
        const response = await fetch('/api/playlists', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name,
                userId: currentUser.id,
                description: '',
                isPrivate: false
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            document.getElementById('newPlaylistName').value = '';
            showToast('Playlist created successfully!', 'success');
            
            // If we're adding a video to playlist, add it to the new playlist
            if (currentVideoId) {
                await addVideoToPlaylist(data.playlist.id);
            }
            
            // Refresh playlists if we're on the playlists page
            if (currentSection === 'playlists') {
                loadUserPlaylists();
            }
        } else {
            showToast(data.error || 'Failed to create playlist', 'error');
        }
    } catch (error) {
        console.error('Create playlist error:', error);
        showToast('Failed to create playlist', 'error');
    }
}

async function loadExistingPlaylists() {
    try {
        const response = await fetch(`/api/playlists/${currentUser.id}`);
        const data = await response.json();
        
        const container = document.getElementById('existingPlaylists');
        
        if (data.playlists && data.playlists.length > 0) {
            container.innerHTML = data.playlists.map(playlist => `
                <div class="playlist-item">
                    <div class="playlist-info">
                        <div class="playlist-name">${playlist.name}</div>
                        <div class="playlist-count">${playlist.videos.length} videos</div>
                    </div>
                    <button class="add-to-playlist-btn" onclick="addVideoToPlaylist('${playlist.id}')">
                        <i class="fas fa-plus"></i>
                        Add
                    </button>
                </div>
            `).join('');
        } else {
            container.innerHTML = '<div class="no-playlists">No playlists found. Create one above!</div>';
        }
    } catch (error) {
        console.error('Error loading playlists:', error);
    }
}

async function addVideoToPlaylist(playlistId) {
    if (!currentVideoId) {
        showToast('No video selected', 'error');
        return;
    }
    
    try {
        const response = await fetch(`/api/playlists/${playlistId}/videos`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                videoId: currentVideoId,
                userId: currentUser.id
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showToast('Video added to playlist!', 'success');
            hidePlaylistModal();
        } else {
            showToast(data.error || 'Failed to add video to playlist', 'error');
        }
    } catch (error) {
        console.error('Add to playlist error:', error);
        showToast('Failed to add video to playlist', 'error');
    }
}

async function loadPlaylistVideos(playlistId) {
    try {
        showLoadingIndicator();
        const response = await fetch(`/api/playlists/${playlistId}/videos`);
        const data = await response.json();
        
        if (data.videos && data.videos.length > 0) {
            // Update content header
            document.getElementById('contentTitle').textContent = `Playlist: ${data.playlist.name}`;
            document.getElementById('contentBreadcrumb').innerHTML = `Home / Playlists / ${data.playlist.name}`;
            
            // Show videos
            showVideoGrid();
            displayVideos(data.videos, true);
            updateVideoCount(data.total);
        } else {
            showNoResults('Empty Playlist', 'This playlist doesn\'t have any videos yet');
        }
    } catch (error) {
        console.error('Error loading playlist videos:', error);
        showToast('Failed to load playlist videos', 'error');
    } finally {
        hideLoadingIndicator();
    }
}

async function deletePlaylist(playlistId) {
    if (!confirm('Are you sure you want to delete this playlist?')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/playlists/${playlistId}?userId=${currentUser.id}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            showToast('Playlist deleted successfully', 'success');
            loadUserPlaylists();
        } else {
            showToast('Failed to delete playlist', 'error');
        }
    } catch (error) {
        console.error('Delete playlist error:', error);
        showToast('Failed to delete playlist', 'error');
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

// Comments functions
function showCommentActions() {
    if (!isAuthenticated) {
        showToast('Please login to comment', 'error');
        document.getElementById('commentInput').blur();
        return;
    }
    
    document.getElementById('commentActions').style.display = 'flex';
}

function hideCommentActions() {
    document.getElementById('commentActions').style.display = 'none';
    document.getElementById('commentInput').value = '';
}

async function submitComment() {
    if (!isAuthenticated) {
        showToast('Please login to comment', 'error');
        return;
    }
    
    const text = document.getElementById('commentInput').value.trim();
    
    if (!text) {
        showToast('Please enter a comment', 'error');
        return;
    }
    
    if (!currentVideoId) {
        showToast('No video selected', 'error');
        return;
    }
    
    try {
        const response = await fetch(`/api/comments/${currentVideoId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                userId: currentUser.id,
                text: text
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showToast('Comment posted successfully!', 'success');
            hideCommentActions();
            loadComments(currentVideoId); // Reload comments
        } else {
            showToast(data.error || 'Failed to post comment', 'error');
        }
    } catch (error) {
        console.error('Comment error:', error);
        showToast('Failed to post comment', 'error');
    }
}

async function loadComments(videoId) {
    try {
        const response = await fetch(`/api/comments/${videoId}?page=1&limit=10&sort=newest`);
        const data = await response.json();
        
        displayComments(data.comments);
        document.getElementById('commentCount').textContent = data.total;
    } catch (error) {
        console.error('Error loading comments:', error);
    }
}

function displayComments(comments) {
    const container = document.getElementById('commentsList');
    
    if (!comments || comments.length === 0) {
        container.innerHTML = '<div class="no-comments">No comments yet. Be the first to comment!</div>';
        return;
    }
    
    container.innerHTML = comments.map(comment => `
        <div class="comment">
            <img src="${comment.avatar}" alt="${comment.username}" class="comment-avatar">
            <div class="comment-content">
                <div class="comment-header">
                    <span class="comment-author">${comment.username}</span>
                    <span class="comment-date">${new Date(comment.createdAt).toLocaleDateString()}</span>
                </div>
                <p class="comment-text">${comment.text}</p>
                <div class="comment-actions">
                    <button class="comment-like-btn">
                        <i class="fas fa-thumbs-up"></i>
                        ${comment.likes}
                    </button>
                    <button class="comment-dislike-btn">
                        <i class="fas fa-thumbs-down"></i>
                        ${comment.dislikes}
                    </button>
                    <button class="comment-reply-btn">
                        <i class="fas fa-reply"></i>
                        Reply
                    </button>
                </div>
            </div>
        </div>
    `).join('');
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
    
    const btn = event.target.closest('.video-favorite-btn');
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