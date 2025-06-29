function setupEventListeners() {
    // Header navigation
    const homeButton = document.getElementById('homeButton');
    if (homeButton) homeButton.addEventListener('click', () => navigateToSection('home'));
    
    // Main navigation
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const section = link.dataset.section;
            navigateToSection(section);
        });
    });
    
    // Mobile navigation
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    if (mobileMenuBtn) mobileMenuBtn.addEventListener('click', toggleMobileNav);
    const mobileNavClose = document.getElementById('mobileNavClose');
    if (mobileNavClose) mobileNavClose.addEventListener('click', closeMobileNav);
    
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
    const advancedSearchBtn = document.getElementById('advancedSearchBtn');
    
    if (searchInput) {
        searchInput.addEventListener('input', handleSearchInput);
        searchInput.addEventListener('focus', showSearchSuggestions);
        searchInput.addEventListener('blur', hideSearchSuggestions);
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                performSearch();
            }
        });
    }
    if (searchBtn) searchBtn.addEventListener('click', performSearch);
    if (advancedSearchBtn) advancedSearchBtn.addEventListener('click', showAdvancedSearch);
    
    // Filter controls
    const sortSelect = document.getElementById('sortSelect');
    if (sortSelect) sortSelect.addEventListener('change', handleSortChange);
    
    const durationFilter = document.getElementById('durationFilter');
    if (durationFilter) durationFilter.addEventListener('change', handleDurationFilter);
    
    const qualityFilter = document.getElementById('qualityFilter');
    if (qualityFilter) qualityFilter.addEventListener('change', handleQualityFilter);
    
    const shuffleBtn = document.getElementById('shuffleBtn');
    if (shuffleBtn) shuffleBtn.addEventListener('click', shuffleVideos);
    
    // View options
    document.querySelectorAll('.view-option').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.view-option').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            toggleViewMode(e.target.dataset.view);
        });
    });
    
    // Modal controls
    const modalCloseBtn = document.getElementById('modalCloseBtn');
    if (modalCloseBtn) modalCloseBtn.addEventListener('click', closeVideoModal);
    const modalBackdrop = document.getElementById('modalBackdrop');
    if (modalBackdrop) modalBackdrop.addEventListener('click', closeVideoModal);
    
    // Authentication
    const loginBtn = document.getElementById('loginBtn');
    if (loginBtn) loginBtn.addEventListener('click', () => showAuthModal('login'));
    const registerBtn = document.getElementById('registerBtn');
    if (registerBtn) registerBtn.addEventListener('click', () => showAuthModal('register'));
    const loginModalClose = document.getElementById('loginModalClose');
    if (loginModalClose) loginModalClose.addEventListener('click', () => hideAuthModal('login'));
    const registerModalClose = document.getElementById('registerModalClose');
    if (registerModalClose) registerModalClose.addEventListener('click', () => hideAuthModal('register'));
    const switchToRegister = document.getElementById('switchToRegister');
    if (switchToRegister) switchToRegister.addEventListener('click', (e) => {
        e.preventDefault();
        switchAuthModal('register');
    });
    const switchToLogin = document.getElementById('switchToLogin');
    if (switchToLogin) switchToLogin.addEventListener('click', (e) => {
        e.preventDefault();
        switchAuthModal('login');
    });
    
    // Auth forms
    const loginForm = document.getElementById('loginForm');
    if (loginForm) loginForm.addEventListener('submit', handleLogin);
    const registerForm = document.getElementById('registerForm');
    if (registerForm) registerForm.addEventListener('submit', handleRegister);
    
    // User menu
    const userAvatarContainer = document.getElementById('userAvatarContainer');
    if (userAvatarContainer) userAvatarContainer.addEventListener('click', toggleUserDropdown);
    const profileBtn = document.getElementById('profileBtn');
    if (profileBtn) profileBtn.addEventListener('click', () => showProfileModal());
    const myPlaylistsBtn = document.getElementById('myPlaylistsBtn');
    if (myPlaylistsBtn) myPlaylistsBtn.addEventListener('click', () => navigateToSection('playlists'));
    const subscriptionsBtn = document.getElementById('subscriptionsBtn');
    if (subscriptionsBtn) subscriptionsBtn.addEventListener('click', () => navigateToSection('subscriptions'));
    const favoritesDropdownBtn = document.getElementById('favoritesDropdownBtn');
    if (favoritesDropdownBtn) favoritesDropdownBtn.addEventListener('click', () => navigateToSection('favorites'));
    const watchHistoryBtn = document.getElementById('watchHistoryBtn');
    if (watchHistoryBtn) watchHistoryBtn.addEventListener('click', () => navigateToSection('watch-history'));
    const watchLaterBtn = document.getElementById('watchLaterBtn');
    if (watchLaterBtn) watchLaterBtn.addEventListener('click', () => navigateToSection('watch-later'));
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);
    
    // Profile modal
    const profileModalClose = document.getElementById('profileModalClose');
    if (profileModalClose) profileModalClose.addEventListener('click', () => hideProfileModal());
    const profileForm = document.getElementById('profileForm');
    if (profileForm) profileForm.addEventListener('submit', handleProfileUpdate);
    const changeAvatarBtn = document.getElementById('changeAvatarBtn');
    if (changeAvatarBtn) changeAvatarBtn.addEventListener('click', () => {
        const avatarUpload = document.getElementById('avatarUpload');
        if (avatarUpload) avatarUpload.click();
    });
    const avatarUpload = document.getElementById('avatarUpload');
    if (avatarUpload) avatarUpload.addEventListener('change', handleAvatarUpload);
    
    // Playlist modal
    const playlistModalClose = document.getElementById('playlistModalClose');
    if (playlistModalClose) playlistModalClose.addEventListener('click', () => hidePlaylistModal());
    const createNewPlaylistBtn = document.getElementById('createNewPlaylistBtn');
    if (createNewPlaylistBtn) createNewPlaylistBtn.addEventListener('click', handleCreatePlaylist);
    const createPlaylistBtn = document.getElementById('createPlaylistBtn');
    if (createPlaylistBtn) createPlaylistBtn.addEventListener('click', () => showCreatePlaylistModal());
    
    // Advanced Search Modal
    const advancedSearchClose = document.getElementById('advancedSearchClose');
    if (advancedSearchClose) advancedSearchClose.addEventListener('click', hideAdvancedSearch);
    const applyAdvancedSearchBtn = document.getElementById('applyAdvancedSearch');
    if (applyAdvancedSearchBtn) applyAdvancedSearchBtn.addEventListener('click', applyAdvancedSearch);
    const clearAdvancedSearchBtn = document.getElementById('clearAdvancedSearch');
    if (clearAdvancedSearchBtn) clearAdvancedSearchBtn.addEventListener('click', clearAdvancedSearch);
    
    // Video modal actions
    const modalFavBtn = document.getElementById('modalFavBtn');
    if (modalFavBtn) modalFavBtn.addEventListener('click', () => toggleVideoFavorite());
    const modalPlaylistBtn = document.getElementById('modalPlaylistBtn');
    if (modalPlaylistBtn) modalPlaylistBtn.addEventListener('click', () => showPlaylistModal());
    const subscribeBtn = document.getElementById('subscribeBtn');
    if (subscribeBtn) subscribeBtn.addEventListener('click', handleSubscribe);
    
    // Like/Dislike buttons
    const modalLikeBtn = document.getElementById('modalLikeBtn');
    if (modalLikeBtn) modalLikeBtn.addEventListener('click', () => toggleVideoLike());
    const modalDislikeBtn = document.getElementById('modalDislikeBtn');
    if (modalDislikeBtn) modalDislikeBtn.addEventListener('click', () => toggleVideoDislike());
    
    // Star rating
    document.querySelectorAll('#starRating i').forEach((star, index) => {
        star.addEventListener('click', () => rateVideo(index + 1));
        star.addEventListener('mouseenter', () => highlightStars(index + 1));
        star.addEventListener('mouseleave', () => resetStars());
    });
    
    // Comments
    const commentInput = document.getElementById('commentInput');
    if (commentInput) commentInput.addEventListener('focus', showCommentActions);
    const commentCancelBtn = document.getElementById('commentCancelBtn');
    if (commentCancelBtn) commentCancelBtn.addEventListener('click', hideCommentActions);
    const commentSubmitBtn = document.getElementById('commentSubmitBtn');
    if (commentSubmitBtn) commentSubmitBtn.addEventListener('click', submitComment);
    
    // Sidebar tabs
    document.querySelectorAll('.sidebar-tab').forEach(tab => {
        tab.addEventListener('click', (e) => {
            const tabName = e.target.dataset.tab;
            switchSidebarTab(tabName);
        });
    });
    
    // Description toggle
    const descriptionToggle = document.getElementById('descriptionToggle');
    if (descriptionToggle) descriptionToggle.addEventListener('click', toggleDescription);
    
    // Infinite scroll
    window.addEventListener('scroll', handleScroll);
    
    // Keyboard shortcuts
    document.addEventListener('keydown', handleKeyboardShortcuts);
    
    // Clear filters
    const clearFiltersBtn = document.getElementById('clearFiltersBtn');
    if (clearFiltersBtn) clearFiltersBtn.addEventListener('click', clearAllFilters);
    
    // Close dropdowns when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.user-menu')) {
            const userDropdown = document.getElementById('userDropdown');
            if (userDropdown) userDropdown.classList.remove('active');
        }
    });
}

function switchSidebarTab(tabName) {
    // Remove active class from all tabs and content
    document.querySelectorAll('.sidebar-tab').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    
    // Add active class to selected tab and content
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    document.getElementById(`${tabName}Tab`).classList.add('active');
    
    // Load content based on tab
    switch(tabName) {
        case 'related':
            // Related videos are already loaded
            break;
        case 'playlist':
            loadPlaylistVideos();
            break;
        case 'recommended':
            loadRecommendedVideos();
            break;
    }
}

function toggleDescription() {
    const content = document.getElementById('descriptionContent');
    const toggle = document.getElementById('descriptionToggle');
    const span = toggle.querySelector('span');
    const icon = toggle.querySelector('i');
    
    content.classList.toggle('expanded');
    
    if (content.classList.contains('expanded')) {
        span.textContent = 'Show less';
        icon.className = 'fas fa-chevron-up';
    } else {
        span.textContent = 'Show more';
        icon.className = 'fas fa-chevron-down';
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