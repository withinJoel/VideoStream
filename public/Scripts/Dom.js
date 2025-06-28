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
    if (searchInput) {
        searchInput.addEventListener('input', handleSearchInput);
        searchInput.addEventListener('focus', showSearchSuggestions);
        searchInput.addEventListener('blur', hideSearchSuggestions);
    }
    if (searchBtn) searchBtn.addEventListener('click', performSearch);
    
    // Filter controls
    const sortSelect = document.getElementById('sortSelect');
    if (sortSelect) sortSelect.addEventListener('change', handleSortChange);
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
    
    // Video modal actions - Updated for favorites only (no separate likes)
    const modalFavBtn = document.getElementById('modalFavBtn');
    if (modalFavBtn) modalFavBtn.addEventListener('click', () => toggleVideoFavorite());
    const modalPlaylistBtn = document.getElementById('modalPlaylistBtn');
    if (modalPlaylistBtn) modalPlaylistBtn.addEventListener('click', () => showPlaylistModal());
    const subscribeBtn = document.getElementById('subscribeBtn');
    if (subscribeBtn) subscribeBtn.addEventListener('click', handleSubscribe);
    
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