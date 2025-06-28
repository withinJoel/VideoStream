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