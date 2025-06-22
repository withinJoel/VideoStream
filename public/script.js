class VideoApp {
    constructor() {
        this.currentPage = 1;
        this.isLoading = false;
        this.hasMore = true;
        this.currentFilter = {
            search: '',
            celebrity: '',
            category: '',
            section: 'home',
            sort: 'random'
        };
        this.currentView = 'grid';
        this.favorites = new Set();
        this.watchHistory = [];
        this.searchHistory = [];
        this.currentVideoId = null;
        this.hoverTimeout = null;
        this.hoverVideo = null;
        this.currentUser = null;
        this.playlists = [];
        this.subscriptions = new Set();
        this.videoLikes = new Map();
        this.videoDislikes = new Map();
        this.videoRatings = new Map();
        this.comments = new Map();
        
        // Statistics
        this.stats = {
            totalVideos: 0,
            totalPerformers: 0,
            totalCategories: 0
        };
        
        this.init();
    }

    async init() {
        this.loadUserSession();
        this.setupEventListeners();
        await this.loadInitialData();
        this.updateUI();
    }

    // Helper function to safely add event listeners
    safeAddEventListener(elementId, event, handler) {
        const element = document.getElementById(elementId);
        if (element) {
            element.addEventListener(event, handler);
            return true;
        }
        return false;
    }

    // Helper function to safely query elements
    safeQuerySelector(selector) {
        return document.querySelector(selector);
    }

    async loadInitialData() {
        try {
            await Promise.all([
                this.loadFavorites(),
                this.loadCategories(),
                this.loadPerformers(),
                this.loadWatchHistory(),
                this.loadSearchHistory(),
                this.loadStats(),
                this.loadPlaylists()
            ]);
            
            await this.loadVideos(true);
        } catch (error) {
            console.error('Error loading initial data:', error);
            this.showToast('Error loading data', 'error');
        }
    }

    setupEventListeners() {
        // Mobile menu
        this.safeAddEventListener('mobileMenuBtn', 'click', () => {
            const mobileNav = document.getElementById('mobileNav');
            if (mobileNav) mobileNav.classList.add('active');
        });

        this.safeAddEventListener('mobileNavClose', 'click', () => {
            const mobileNav = document.getElementById('mobileNav');
            if (mobileNav) mobileNav.classList.remove('active');
        });

        // Home button
        this.safeAddEventListener('homeButton', 'click', () => {
            this.navigateToSection('home');
        });

        // Authentication buttons
        this.safeAddEventListener('loginBtn', 'click', () => {
            this.showLoginModal();
        });

        this.safeAddEventListener('registerBtn', 'click', () => {
            this.showRegisterModal();
        });

        this.safeAddEventListener('logoutBtn', 'click', () => {
            this.logout();
        });

        // Modal close buttons
        this.safeAddEventListener('loginModalClose', 'click', () => {
            this.hideLoginModal();
        });

        this.safeAddEventListener('registerModalClose', 'click', () => {
            this.hideRegisterModal();
        });

        this.safeAddEventListener('profileModalClose', 'click', () => {
            this.hideProfileModal();
        });

        this.safeAddEventListener('playlistModalClose', 'click', () => {
            this.hidePlaylistModal();
        });

        // Auth form submissions
        this.safeAddEventListener('loginForm', 'submit', (e) => {
            e.preventDefault();
            this.handleLogin();
        });

        this.safeAddEventListener('registerForm', 'submit', (e) => {
            e.preventDefault();
            this.handleRegister();
        });

        this.safeAddEventListener('profileForm', 'submit', (e) => {
            e.preventDefault();
            this.handleProfileUpdate();
        });

        // Auth modal switches
        this.safeAddEventListener('switchToRegister', 'click', (e) => {
            e.preventDefault();
            this.hideLoginModal();
            this.showRegisterModal();
        });

        this.safeAddEventListener('switchToLogin', 'click', (e) => {
            e.preventDefault();
            this.hideRegisterModal();
            this.showLoginModal();
        });

        // Profile and playlist buttons
        this.safeAddEventListener('profileBtn', 'click', (e) => {
            e.preventDefault();
            this.showProfileModal();
        });

        this.safeAddEventListener('myPlaylistsBtn', 'click', (e) => {
            e.preventDefault();
            this.navigateToSection('playlists');
            const userDropdown = document.getElementById('userDropdown');
            if (userDropdown) userDropdown.classList.remove('active');
        });

        this.safeAddEventListener('createPlaylistBtn', 'click', () => {
            this.showCreatePlaylistModal();
        });

        this.safeAddEventListener('createNewPlaylistBtn', 'click', () => {
            this.createNewPlaylist();
        });

        // Avatar upload
        this.safeAddEventListener('changeAvatarBtn', 'click', () => {
            const avatarUpload = document.getElementById('avatarUpload');
            if (avatarUpload) avatarUpload.click();
        });

        this.safeAddEventListener('avatarUpload', 'change', (e) => {
            this.handleAvatarUpload(e);
        });

        // Search functionality with history
        const searchInput = document.getElementById('searchInput');
        const searchBtn = document.getElementById('searchBtn');
        
        if (searchInput) {
            searchInput.addEventListener('input', this.debounce(() => {
                this.handleSearchInput();
            }, 300));
            
            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.handleSearch();
                }
            });
            
            searchInput.addEventListener('focus', () => {
                if (searchInput.value.length >= 2) {
                    this.showSearchSuggestions(searchInput.value);
                } else {
                    this.showSearchHistory();
                }
            });
        }
        
        if (searchBtn) {
            searchBtn.addEventListener('click', () => {
                this.handleSearch();
            });
        }

        // Navigation
        document.addEventListener('click', (e) => {
            const navLink = e.target.closest('.nav-link, .mobile-nav-link');
            if (navLink) {
                e.preventDefault();
                const section = navLink.dataset.section;
                if (section) {
                    this.navigateToSection(section);
                    const mobileNav = document.getElementById('mobileNav');
                    if (mobileNav) mobileNav.classList.remove('active');
                }
            }
        });

        // Filter controls
        this.safeAddEventListener('sortSelect', 'change', (e) => {
            this.currentFilter.sort = e.target.value;
            this.applyFilters();
        });

        // View options
        document.querySelectorAll('.view-option').forEach(btn => {
            btn.addEventListener('click', () => {
                this.setView(btn.dataset.view);
            });
        });

        // Shuffle button
        this.safeAddEventListener('shuffleBtn', 'click', () => {
            this.shuffleVideos();
        });

        // Favorites dropdown button
        this.safeAddEventListener('favoritesDropdownBtn', 'click', (e) => {
            e.preventDefault();
            this.navigateToSection('favorites');
            const userDropdown = document.getElementById('userDropdown');
            if (userDropdown) userDropdown.classList.remove('active');
        });

        // Watch history button
        this.safeAddEventListener('watchHistoryBtn', 'click', (e) => {
            e.preventDefault();
            this.navigateToSection('watch-history');
            const userDropdown = document.getElementById('userDropdown');
            if (userDropdown) userDropdown.classList.remove('active');
        });

        // User menu
        this.safeAddEventListener('userAvatarContainer', 'click', (e) => {
            e.stopPropagation();
            const dropdown = document.getElementById('userDropdown');
            if (dropdown) dropdown.classList.toggle('active');
        });

        // Clear filters
        this.safeAddEventListener('clearFiltersBtn', 'click', () => {
            this.clearAllFilters();
        });

        // Video modal
        this.safeAddEventListener('modalBackdrop', 'click', () => {
            this.closeVideoModal();
        });
        
        this.safeAddEventListener('modalCloseBtn', 'click', () => {
            this.closeVideoModal();
        });

        // Modal actions
        this.safeAddEventListener('modalFavoriteBtn', 'click', () => {
            this.toggleModalFavorite();
        });

        this.safeAddEventListener('modalFavBtn', 'click', () => {
            this.toggleModalFavorite();
        });

        this.safeAddEventListener('modalLikeBtn', 'click', () => {
            this.toggleVideoLike();
        });

        this.safeAddEventListener('modalDislikeBtn', 'click', () => {
            this.toggleVideoDislike();
        });

        this.safeAddEventListener('modalPlaylistBtn', 'click', () => {
            this.showAddToPlaylistModal();
        });

        this.safeAddEventListener('subscribeBtn', 'click', () => {
            this.toggleSubscription();
        });

        // Star rating
        document.addEventListener('click', (e) => {
            if (e.target.closest('.star-rating i')) {
                const star = e.target.closest('.star-rating i');
                const rating = parseInt(star.dataset.rating);
                this.rateVideo(rating);
            }
        });

        // Star rating hover
        document.addEventListener('mouseover', (e) => {
            if (e.target.closest('.star-rating i')) {
                const star = e.target.closest('.star-rating i');
                const rating = parseInt(star.dataset.rating);
                this.highlightStars(rating);
            }
        });

        document.addEventListener('mouseout', (e) => {
            if (e.target.closest('.star-rating')) {
                this.resetStarHighlight();
            }
        });

        // Comment functionality
        this.safeAddEventListener('commentInput', 'focus', () => {
            this.showCommentActions();
        });

        this.safeAddEventListener('commentCancelBtn', 'click', () => {
            this.hideCommentActions();
        });

        this.safeAddEventListener('commentSubmitBtn', 'click', () => {
            this.submitComment();
        });

        this.safeAddEventListener('loadMoreComments', 'click', () => {
            this.loadMoreComments();
        });

        // Close dropdowns when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.search-container')) {
                const searchSuggestions = document.getElementById('searchSuggestions');
                if (searchSuggestions) searchSuggestions.style.display = 'none';
            }
            
            if (!e.target.closest('.user-menu')) {
                const userDropdown = document.getElementById('userDropdown');
                if (userDropdown) userDropdown.classList.remove('active');
            }

            // Close auth modals when clicking backdrop
            if (e.target.classList.contains('modal-backdrop')) {
                this.hideLoginModal();
                this.hideRegisterModal();
                this.hideProfileModal();
                this.hidePlaylistModal();
            }
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeVideoModal();
                this.hideLoginModal();
                this.hideRegisterModal();
                this.hideProfileModal();
                this.hidePlaylistModal();
                const mobileNav = document.getElementById('mobileNav');
                if (mobileNav) mobileNav.classList.remove('active');
            }
            
            if (e.key === '/' && !e.target.matches('input, textarea')) {
                e.preventDefault();
                const searchInput = document.getElementById('searchInput');
                if (searchInput) searchInput.focus();
            }
        });

        // Infinite scroll
        window.addEventListener('scroll', this.debounce(() => {
            if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 1000) {
                if (this.hasMore && !this.isLoading) {
                    this.loadVideos(false);
                }
            }
        }, 200));
    }

    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // User Authentication
    loadUserSession() {
        const userData = localStorage.getItem('currentUser');
        if (userData) {
            this.currentUser = JSON.parse(userData);
            this.updateAuthUI();
        }
    }

    updateAuthUI() {
        const authSection = document.getElementById('authSection');
        const userMenu = document.getElementById('userMenu');
        const createPlaylistBtn = document.getElementById('createPlaylistBtn');
        const ratingSection = document.getElementById('ratingSection');
        const commentForm = document.getElementById('commentForm');
        const modalPlaylistBtn = document.getElementById('modalPlaylistBtn');
        const subscribeBtn = document.getElementById('subscribeBtn');

        if (this.currentUser) {
            // Hide auth buttons, show user menu
            if (authSection) authSection.style.display = 'none';
            if (userMenu) userMenu.style.display = 'flex';
            
            // Show logged-in features
            if (createPlaylistBtn) createPlaylistBtn.style.display = 'flex';
            if (ratingSection) ratingSection.style.display = 'flex';
            if (commentForm) commentForm.style.display = 'block';
            if (modalPlaylistBtn) modalPlaylistBtn.style.display = 'flex';
            if (subscribeBtn) subscribeBtn.style.display = 'flex';

            // Update user info
            const userName = document.getElementById('userName');
            const userAvatarImg = document.getElementById('userAvatarImg');
            const commentUserAvatar = document.getElementById('commentUserAvatar');
            const profileAvatar = document.getElementById('profileAvatar');

            if (userName) userName.textContent = this.currentUser.username;
            if (userAvatarImg) userAvatarImg.src = this.currentUser.avatar || 'https://images.pexels.com/photos/771742/pexels-photo-771742.jpeg?auto=compress&cs=tinysrgb&w=100';
            if (commentUserAvatar) commentUserAvatar.src = this.currentUser.avatar || 'https://images.pexels.com/photos/771742/pexels-photo-771742.jpeg?auto=compress&cs=tinysrgb&w=100';
            if (profileAvatar) profileAvatar.src = this.currentUser.avatar || 'https://images.pexels.com/photos/771742/pexels-photo-771742.jpeg?auto=compress&cs=tinysrgb&w=100';
        } else {
            // Show auth buttons, hide user menu
            if (authSection) authSection.style.display = 'flex';
            if (userMenu) userMenu.style.display = 'none';
            
            // Hide logged-in features
            if (createPlaylistBtn) createPlaylistBtn.style.display = 'none';
            if (ratingSection) ratingSection.style.display = 'none';
            if (commentForm) commentForm.style.display = 'none';
            if (modalPlaylistBtn) modalPlaylistBtn.style.display = 'none';
            if (subscribeBtn) subscribeBtn.style.display = 'none';
        }
    }

    showLoginModal() {
        const loginModal = document.getElementById('loginModal');
        if (loginModal) loginModal.classList.add('active');
    }

    hideLoginModal() {
        const loginModal = document.getElementById('loginModal');
        if (loginModal) loginModal.classList.remove('active');
    }

    showRegisterModal() {
        const registerModal = document.getElementById('registerModal');
        if (registerModal) registerModal.classList.add('active');
    }

    hideRegisterModal() {
        const registerModal = document.getElementById('registerModal');
        if (registerModal) registerModal.classList.remove('active');
    }

    showProfileModal() {
        if (!this.currentUser) {
            this.showToast('Please login to access your profile', 'warning');
            return;
        }

        const profileModal = document.getElementById('profileModal');
        const profileUsername = document.getElementById('profileUsername');
        const profileEmail = document.getElementById('profileEmail');
        const profileBio = document.getElementById('profileBio');

        if (profileUsername) profileUsername.value = this.currentUser.username || '';
        if (profileEmail) profileEmail.value = this.currentUser.email || '';
        if (profileBio) profileBio.value = this.currentUser.bio || '';

        if (profileModal) profileModal.classList.add('active');
    }

    hideProfileModal() {
        const profileModal = document.getElementById('profileModal');
        if (profileModal) profileModal.classList.remove('active');
    }

    async handleLogin() {
        const email = document.getElementById('loginEmail')?.value;
        const password = document.getElementById('loginPassword')?.value;

        if (!email || !password) {
            this.showToast('Please fill in all fields', 'error');
            return;
        }

        // Simulate login (in real app, this would be an API call)
        const userData = {
            id: Date.now(),
            username: email.split('@')[0],
            email: email,
            avatar: 'https://images.pexels.com/photos/771742/pexels-photo-771742.jpeg?auto=compress&cs=tinysrgb&w=100',
            bio: ''
        };

        this.currentUser = userData;
        localStorage.setItem('currentUser', JSON.stringify(userData));
        
        this.updateAuthUI();
        this.hideLoginModal();
        this.showToast('Login successful!', 'success');
    }

    async handleRegister() {
        const username = document.getElementById('registerUsername')?.value;
        const email = document.getElementById('registerEmail')?.value;
        const password = document.getElementById('registerPassword')?.value;
        const confirmPassword = document.getElementById('registerConfirmPassword')?.value;

        if (!username || !email || !password || !confirmPassword) {
            this.showToast('Please fill in all fields', 'error');
            return;
        }

        if (password !== confirmPassword) {
            this.showToast('Passwords do not match', 'error');
            return;
        }

        // Simulate registration (in real app, this would be an API call)
        const userData = {
            id: Date.now(),
            username: username,
            email: email,
            avatar: 'https://images.pexels.com/photos/771742/pexels-photo-771742.jpeg?auto=compress&cs=tinysrgb&w=100',
            bio: ''
        };

        this.currentUser = userData;
        localStorage.setItem('currentUser', JSON.stringify(userData));
        
        this.updateAuthUI();
        this.hideRegisterModal();
        this.showToast('Registration successful!', 'success');
    }

    async handleProfileUpdate() {
        if (!this.currentUser) return;

        const username = document.getElementById('profileUsername')?.value;
        const email = document.getElementById('profileEmail')?.value;
        const bio = document.getElementById('profileBio')?.value;

        this.currentUser.username = username;
        this.currentUser.email = email;
        this.currentUser.bio = bio;

        localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
        
        this.updateAuthUI();
        this.hideProfileModal();
        this.showToast('Profile updated successfully!', 'success');
    }

    async handleAvatarUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        // In a real app, you would upload to a server
        // For demo, we'll use a placeholder
        const reader = new FileReader();
        reader.onload = (e) => {
            this.currentUser.avatar = e.target.result;
            localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
            this.updateAuthUI();
            this.showToast('Avatar updated!', 'success');
        };
        reader.readAsDataURL(file);
    }

    logout() {
        this.currentUser = null;
        localStorage.removeItem('currentUser');
        this.updateAuthUI();
        this.showToast('Logged out successfully', 'success');
        
        // Redirect to home if on user-specific pages
        if (['playlists', 'favorites', 'watch-history'].includes(this.currentFilter.section)) {
            this.navigateToSection('home');
        }
    }

    async loadStats() {
        try {
            const response = await fetch('/api/stats');
            const data = await response.json();
            
            this.stats.totalVideos = data.totalVideos || 0;
            this.stats.totalFavorites = data.totalFavorites || 0;
            this.stats.totalWatchHistory = data.totalWatchHistory || 0;
        } catch (error) {
            console.error('Error loading stats:', error);
        }
    }

    async loadFavorites() {
        try {
            const response = await fetch('/api/favorites');
            const data = await response.json();
            this.favorites = new Set(data.favorites || []);
            this.updateFavoritesCount();
        } catch (error) {
            console.error('Error loading favorites:', error);
        }
    }

    async loadWatchHistory() {
        try {
            const response = await fetch('/api/watch-history');
            const data = await response.json();
            this.watchHistory = data.history || [];
        } catch (error) {
            console.error('Error loading watch history:', error);
        }
    }

    async loadSearchHistory() {
        try {
            const response = await fetch('/api/search-history');
            const data = await response.json();
            this.searchHistory = data.history || [];
        } catch (error) {
            console.error('Error loading search history:', error);
        }
    }

    async loadPlaylists() {
        if (!this.currentUser) return;
        
        // Simulate loading playlists (in real app, this would be an API call)
        const savedPlaylists = localStorage.getItem(`playlists_${this.currentUser.id}`);
        this.playlists = savedPlaylists ? JSON.parse(savedPlaylists) : [];
    }

    async loadCategories() {
        try {
            const response = await fetch('/api/categories');
            const data = await response.json();
            
            this.stats.totalCategories = data.categories.length;
            this.renderCategories(data.categories);
            this.renderMobileCategories(data.categories);
        } catch (error) {
            console.error('Error loading categories:', error);
        }
    }

    async loadPerformers() {
        try {
            const response = await fetch('/api/celebrities');
            const data = await response.json();
            
            this.stats.totalPerformers = data.celebrities.length;
            this.renderPerformers(data.celebrities);
            this.renderMobilePerformers(data.celebrities);
        } catch (error) {
            console.error('Error loading performers:', error);
        }
    }

    renderCategories(categories) {
        const categoriesGrid = document.getElementById('categoriesGrid');
        if (!categoriesGrid) return;

        categoriesGrid.innerHTML = categories.map(category => `
            <div class="category-card" data-category="${category.name}">
                <div class="category-icon">
                    <i class="fas fa-tag"></i>
                </div>
                <div class="category-name">${category.displayName}</div>
                <div class="category-count">${this.formatNumber(category.count)} videos</div>
            </div>
        `).join('');

        categoriesGrid.querySelectorAll('.category-card').forEach(card => {
            card.addEventListener('click', () => {
                const categoryName = card.dataset.category;
                this.filterByCategory(categoryName);
            });
        });
    }

    renderPerformers(performers) {
        const performersGrid = document.getElementById('performersGrid');
        if (!performersGrid) return;

        performersGrid.innerHTML = performers.map(performer => `
            <div class="performer-card" data-performer="${performer.name}">
                <div class="performer-avatar">
                    <i class="fas fa-user"></i>
                </div>
                <div class="performer-info">
                    <div class="performer-name">${performer.displayName}</div>
                    <div class="performer-video-count">${this.formatNumber(performer.videoCount)} videos</div>
                </div>
            </div>
        `).join('');

        performersGrid.querySelectorAll('.performer-card').forEach(card => {
            card.addEventListener('click', () => {
                const performerName = card.dataset.performer;
                this.filterByPerformer(performerName);
            });
        });
    }

    renderMobileCategories(categories) {
        const mobileCategories = document.getElementById('mobileCategoriesList');
        if (!mobileCategories) return;

        mobileCategories.innerHTML = categories.slice(0, 10).map(category => `
            <a href="#" class="mobile-category-item" data-category="${category.name}">
                <span>${category.displayName}</span>
                <span class="mobile-item-count">${category.count}</span>
            </a>
        `).join('');

        mobileCategories.querySelectorAll('.mobile-category-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const categoryName = item.dataset.category;
                this.filterByCategory(categoryName);
                const mobileNav = document.getElementById('mobileNav');
                if (mobileNav) mobileNav.classList.remove('active');
            });
        });
    }

    renderMobilePerformers(performers) {
        const mobilePerformers = document.getElementById('mobilePerformersList');
        if (!mobilePerformers) return;

        mobilePerformers.innerHTML = performers.slice(0, 10).map(performer => `
            <a href="#" class="mobile-performer-item" data-performer="${performer.name}">
                <span>${performer.displayName}</span>
                <span class="mobile-item-count">${performer.videoCount}</span>
            </a>
        `).join('');

        mobilePerformers.querySelectorAll('.mobile-performer-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const performerName = item.dataset.performer;
                this.filterByPerformer(performerName);
                const mobileNav = document.getElementById('mobileNav');
                if (mobileNav) mobileNav.classList.remove('active');
            });
        });
    }

    navigateToSection(section) {
        document.querySelectorAll('.nav-link, .mobile-nav-link').forEach(link => {
            link.classList.remove('active');
        });
        
        document.querySelectorAll(`[data-section="${section}"]`).forEach(link => {
            link.classList.add('active');
        });

        this.currentFilter = {
            search: '',
            celebrity: '',
            category: '',
            section: section,
            sort: 'random'
        };
        
        this.currentPage = 1;
        this.hasMore = true;

        this.updateContentForSection(section);
        const searchInput = document.getElementById('searchInput');
        if (searchInput) searchInput.value = '';
        
        if (section === 'categories') {
            this.showCategoriesGrid();
        } else if (section === 'performers') {
            this.showPerformersGrid();
        } else if (section === 'playlists') {
            this.showPlaylistsGrid();
        } else {
            this.showVideoGrid();
            this.loadVideos(true);
        }
    }

    updateContentForSection(section) {
        let title = 'All Videos';
        let breadcrumb = 'Home';
        
        switch (section) {
            case 'home':
                title = 'All Videos';
                breadcrumb = 'Home';
                break;
            case 'trending':
                title = 'Trending Videos';
                breadcrumb = 'Home / Trending';
                this.currentFilter.sort = 'most-viewed';
                break;
            case 'new':
                title = 'New Videos';
                breadcrumb = 'Home / New';
                this.currentFilter.sort = 'newest';
                break;
            case 'top-rated':
                title = 'Top Rated Videos';
                breadcrumb = 'Home / Top Rated';
                this.currentFilter.sort = 'highest-rated';
                break;
            case 'favorites':
                title = 'Favorite Videos';
                breadcrumb = 'Home / Favorites';
                break;
            case 'watch-history':
                title = 'Watch History';
                breadcrumb = 'Home / Watch History';
                break;
            case 'categories':
                title = 'All Categories';
                breadcrumb = 'Home / Categories';
                break;
            case 'performers':
                title = 'All Performers';
                breadcrumb = 'Home / Performers';
                break;
            case 'playlists':
                title = 'My Playlists';
                breadcrumb = 'Home / Playlists';
                break;
        }
        
        const contentTitle = document.getElementById('contentTitle');
        const contentBreadcrumb = document.getElementById('contentBreadcrumb');
        
        if (contentTitle) contentTitle.textContent = title;
        if (contentBreadcrumb) contentBreadcrumb.innerHTML = breadcrumb.split(' / ').map(crumb => `<span>${crumb}</span>`).join('');
    }

    showCategoriesGrid() {
        const filterBar = document.getElementById('filterBar');
        const videoGrid = document.getElementById('videoGrid');
        const performersGrid = document.getElementById('performersGrid');
        const playlistsGrid = document.getElementById('playlistsGrid');
        const categoriesGrid = document.getElementById('categoriesGrid');
        const noResults = document.getElementById('noResults');

        if (filterBar) filterBar.style.display = 'none';
        if (videoGrid) videoGrid.style.display = 'none';
        if (performersGrid) performersGrid.style.display = 'none';
        if (playlistsGrid) playlistsGrid.style.display = 'none';
        if (categoriesGrid) categoriesGrid.style.display = 'grid';
        if (noResults) noResults.style.display = 'none';
    }

    showPerformersGrid() {
        const filterBar = document.getElementById('filterBar');
        const videoGrid = document.getElementById('videoGrid');
        const categoriesGrid = document.getElementById('categoriesGrid');
        const playlistsGrid = document.getElementById('playlistsGrid');
        const performersGrid = document.getElementById('performersGrid');
        const noResults = document.getElementById('noResults');

        if (filterBar) filterBar.style.display = 'none';
        if (videoGrid) videoGrid.style.display = 'none';
        if (categoriesGrid) categoriesGrid.style.display = 'none';
        if (playlistsGrid) playlistsGrid.style.display = 'none';
        if (performersGrid) performersGrid.style.display = 'grid';
        if (noResults) noResults.style.display = 'none';
    }

    showPlaylistsGrid() {
        const filterBar = document.getElementById('filterBar');
        const videoGrid = document.getElementById('videoGrid');
        const categoriesGrid = document.getElementById('categoriesGrid');
        const performersGrid = document.getElementById('performersGrid');
        const playlistsGrid = document.getElementById('playlistsGrid');
        const noResults = document.getElementById('noResults');

        if (filterBar) filterBar.style.display = 'none';
        if (videoGrid) videoGrid.style.display = 'none';
        if (categoriesGrid) categoriesGrid.style.display = 'none';
        if (performersGrid) performersGrid.style.display = 'none';
        if (playlistsGrid) playlistsGrid.style.display = 'grid';
        if (noResults) noResults.style.display = 'none';

        this.renderPlaylists();
    }

    showVideoGrid() {
        const filterBar = document.getElementById('filterBar');
        const categoriesGrid = document.getElementById('categoriesGrid');
        const performersGrid = document.getElementById('performersGrid');
        const playlistsGrid = document.getElementById('playlistsGrid');
        const videoGrid = document.getElementById('videoGrid');

        if (filterBar) filterBar.style.display = 'block';
        if (categoriesGrid) categoriesGrid.style.display = 'none';
        if (performersGrid) performersGrid.style.display = 'none';
        if (playlistsGrid) playlistsGrid.style.display = 'none';
        if (videoGrid) videoGrid.style.display = 'grid';
    }

    renderPlaylists() {
        const playlistsGrid = document.getElementById('playlistsGrid');
        if (!playlistsGrid) return;

        if (!this.currentUser) {
            playlistsGrid.innerHTML = `
                <div class="auth-required">
                    <i class="fas fa-user-lock"></i>
                    <h3>Login Required</h3>
                    <p>Please login to view and manage your playlists</p>
                    <button class="auth-submit-btn" onclick="app.showLoginModal()">Login Now</button>
                </div>
            `;
            return;
        }

        if (this.playlists.length === 0) {
            playlistsGrid.innerHTML = `
                <div class="no-playlists-message">
                    <i class="fas fa-list"></i>
                    <h3>No Playlists Yet</h3>
                    <p>Create your first playlist to organize your favorite videos</p>
                    <button class="auth-submit-btn" onclick="app.showCreatePlaylistModal()">Create Playlist</button>
                </div>
            `;
            return;
        }

        playlistsGrid.innerHTML = this.playlists.map(playlist => `
            <div class="playlist-card" data-playlist-id="${playlist.id}">
                <div class="playlist-thumbnail">
                    <i class="fas fa-list"></i>
                    <div class="playlist-video-count">${playlist.videos.length} videos</div>
                </div>
                <div class="playlist-info">
                    <div class="playlist-name">${playlist.name}</div>
                    <div class="playlist-description">${playlist.description || 'No description'}</div>
                    <div class="playlist-meta">
                        <div class="playlist-privacy">
                            <i class="fas fa-${playlist.isPrivate ? 'lock' : 'globe'}"></i>
                            ${playlist.isPrivate ? 'Private' : 'Public'}
                        </div>
                        <div class="playlist-created">
                            ${new Date(playlist.createdAt).toLocaleDateString()}
                        </div>
                    </div>
                </div>
                <div class="playlist-actions">
                    <button class="playlist-action-btn" onclick="app.viewPlaylist('${playlist.id}')">
                        <i class="fas fa-play"></i>
                        View
                    </button>
                    <button class="playlist-action-btn" onclick="app.editPlaylist('${playlist.id}')">
                        <i class="fas fa-edit"></i>
                        Edit
                    </button>
                    <button class="playlist-action-btn" onclick="app.deletePlaylist('${playlist.id}')">
                        <i class="fas fa-trash"></i>
                        Delete
                    </button>
                </div>
            </div>
        `).join('');
    }

    filterByCategory(category) {
        this.currentFilter = {
            search: '',
            celebrity: '',
            category: category,
            section: 'category',
            sort: this.currentFilter.sort
        };
        
        this.currentPage = 1;
        this.hasMore = true;
        
        this.updateContentForSection('category');
        const contentTitle = document.getElementById('contentTitle');
        const contentBreadcrumb = document.getElementById('contentBreadcrumb');
        
        if (contentTitle) contentTitle.textContent = `Category: ${this.formatName(category)}`;
        if (contentBreadcrumb) contentBreadcrumb.innerHTML = `<span>Home</span><span>Categories</span><span>${this.formatName(category)}</span>`;
        
        this.showVideoGrid();
        this.loadVideos(true);
    }

    filterByPerformer(performer) {
        this.currentFilter = {
            search: '',
            celebrity: performer,
            category: '',
            section: 'performer',
            sort: this.currentFilter.sort
        };
        
        this.currentPage = 1;
        this.hasMore = true;
        
        this.updateContentForSection('performer');
        const contentTitle = document.getElementById('contentTitle');
        const contentBreadcrumb = document.getElementById('contentBreadcrumb');
        
        if (contentTitle) contentTitle.textContent = `Performer: ${this.formatName(performer)}`;
        if (contentBreadcrumb) contentBreadcrumb.innerHTML = `<span>Home</span><span>Performers</span><span>${this.formatName(performer)}</span>`;
        
        this.showVideoGrid();
        this.loadVideos(true);
    }

    handleSearchInput() {
        const searchInput = document.getElementById('searchInput');
        if (!searchInput) return;

        const searchTerm = searchInput.value.trim();
        if (searchTerm.length >= 2) {
            this.showSearchSuggestions(searchTerm);
        } else if (searchTerm.length === 0) {
            this.showSearchHistory();
        } else {
            const searchSuggestions = document.getElementById('searchSuggestions');
            if (searchSuggestions) searchSuggestions.style.display = 'none';
        }
    }

    async handleSearch() {
        const searchInput = document.getElementById('searchInput');
        if (!searchInput) return;

        const searchTerm = searchInput.value.trim();
        
        if (searchTerm) {
            await this.addToSearchHistory(searchTerm);
        }
        
        this.currentFilter = {
            search: searchTerm,
            celebrity: '',
            category: '',
            section: 'search',
            sort: this.currentFilter.sort
        };
        
        this.currentPage = 1;
        this.hasMore = true;
        
        const title = searchTerm ? `Search: "${searchTerm}"` : 'All Videos';
        const breadcrumb = searchTerm ? `<span>Home</span><span>Search</span><span>"${searchTerm}"</span>` : '<span>Home</span>';
        
        const contentTitle = document.getElementById('contentTitle');
        const contentBreadcrumb = document.getElementById('contentBreadcrumb');
        
        if (contentTitle) contentTitle.textContent = title;
        if (contentBreadcrumb) contentBreadcrumb.innerHTML = breadcrumb;
        
        document.querySelectorAll('.nav-link, .mobile-nav-link').forEach(item => {
            item.classList.remove('active');
        });
        
        this.showVideoGrid();
        this.loadVideos(true);
        
        const searchSuggestions = document.getElementById('searchSuggestions');
        if (searchSuggestions) searchSuggestions.style.display = 'none';
    }

    async addToSearchHistory(query) {
        try {
            await fetch('/api/search-history', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query })
            });
            await this.loadSearchHistory();
        } catch (error) {
            console.error('Error adding to search history:', error);
        }
    }

    showSearchHistory() {
        if (this.searchHistory.length === 0) return;
        
        const suggestionsContainer = document.getElementById('searchSuggestions');
        if (!suggestionsContainer) return;

        suggestionsContainer.innerHTML = `
            <div class="suggestion-header">Recent Searches</div>
            ${this.searchHistory.slice(0, 5).map(item => `
                <div class="suggestion-item" data-type="history" data-value="${item.query}">
                    <i class="fas fa-history"></i>
                    <span>${item.query}</span>
                </div>
            `).join('')}
        `;
        
        suggestionsContainer.style.display = 'block';
        
        suggestionsContainer.querySelectorAll('.suggestion-item').forEach(item => {
            item.addEventListener('click', () => {
                const searchInput = document.getElementById('searchInput');
                if (searchInput) searchInput.value = item.dataset.value;
                this.handleSearch();
                suggestionsContainer.style.display = 'none';
            });
        });
    }

    async showSearchSuggestions(query) {
        if (query.length < 2) return;
        
        try {
            const response = await fetch(`/api/search/suggestions?q=${encodeURIComponent(query)}`);
            const data = await response.json();
            
            const suggestionsContainer = document.getElementById('searchSuggestions');
            if (!suggestionsContainer) return;
            
            if (data.suggestions && data.suggestions.length > 0) {
                suggestionsContainer.innerHTML = data.suggestions.map(suggestion => `
                    <div class="suggestion-item" data-type="${suggestion.type}" data-value="${suggestion.value}">
                        <i class="fas fa-${this.getSuggestionIcon(suggestion.type)}"></i>
                        <span>${suggestion.text}</span>
                        ${suggestion.count ? `<span class="suggestion-count">${suggestion.count}</span>` : ''}
                    </div>
                `).join('');
                
                suggestionsContainer.style.display = 'block';
                
                suggestionsContainer.querySelectorAll('.suggestion-item').forEach(item => {
                    item.addEventListener('click', () => {
                        const type = item.dataset.type;
                        const value = item.dataset.value;
                        
                        if (type === 'celebrity') {
                            this.filterByPerformer(value);
                        } else if (type === 'category') {
                            this.filterByCategory(value);
                        } else {
                            const searchInput = document.getElementById('searchInput');
                            if (searchInput) searchInput.value = value;
                            this.handleSearch();
                        }
                        
                        suggestionsContainer.style.display = 'none';
                    });
                });
            } else {
                suggestionsContainer.style.display = 'none';
            }
        } catch (error) {
            console.error('Error fetching search suggestions:', error);
        }
    }

    getSuggestionIcon(type) {
        switch (type) {
            case 'celebrity': return 'user';
            case 'category': return 'tag';
            case 'history': return 'history';
            default: return 'search';
        }
    }

    applyFilters() {
        this.currentPage = 1;
        this.hasMore = true;
        this.loadVideos(true);
    }

    clearAllFilters() {
        this.currentFilter = {
            search: '',
            celebrity: '',
            category: '',
            section: 'home',
            sort: 'random'
        };
        
        const searchInput = document.getElementById('searchInput');
        const sortSelect = document.getElementById('sortSelect');
        
        if (searchInput) searchInput.value = '';
        if (sortSelect) sortSelect.value = 'random';
        
        this.navigateToSection('home');
    }

    setView(view) {
        this.currentView = view;
        const videoGrid = document.getElementById('videoGrid');
        const viewOptions = document.querySelectorAll('.view-option');
        
        if (videoGrid) {
            if (view === 'list') {
                videoGrid.classList.add('list-view');
            } else {
                videoGrid.classList.remove('list-view');
            }
        }
        
        viewOptions.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === view);
        });
    }

    async shuffleVideos() {
        try {
            const response = await fetch('/api/reshuffle', { method: 'POST' });
            if (response.ok) {
                this.currentPage = 1;
                this.hasMore = true;
                await this.loadVideos(true);
                
                const shuffleBtn = document.getElementById('shuffleBtn');
                if (shuffleBtn) {
                    const originalHTML = shuffleBtn.innerHTML;
                    shuffleBtn.innerHTML = '<i class="fas fa-check"></i>';
                    setTimeout(() => {
                        shuffleBtn.innerHTML = originalHTML;
                    }, 1000);
                }
                
                this.showToast('Videos shuffled!', 'success');
            }
        } catch (error) {
            console.error('Error shuffling videos:', error);
            this.showToast('Error shuffling videos', 'error');
        }
    }

    async loadVideos(reset = false) {
        if (this.isLoading) return;
        
        this.isLoading = true;
        const loadingContainer = document.getElementById('loadingContainer');
        const noResults = document.getElementById('noResults');
        
        if (reset) {
            this.currentPage = 1;
            const videoGrid = document.getElementById('videoGrid');
            if (videoGrid) videoGrid.innerHTML = '';
            if (noResults) noResults.style.display = 'none';
        }
        
        if (loadingContainer) loadingContainer.style.display = 'flex';
        
        try {
            // Handle watch history separately
            if (this.currentFilter.section === 'watch-history') {
                await this.loadWatchHistoryVideos(reset);
                return;
            }
            
            const params = new URLSearchParams({
                page: this.currentPage,
                limit: 20
            });
            
            if (this.currentFilter.search) {
                params.append('search', this.currentFilter.search);
            }
            
            if (this.currentFilter.celebrity) {
                params.append('celebrity', this.currentFilter.celebrity);
            }
            
            if (this.currentFilter.category) {
                params.append('category', this.currentFilter.category);
            }
            
            if (this.currentFilter.section === 'favorites') {
                params.append('favorites', 'true');
            }
            
            if (this.currentFilter.sort && this.currentFilter.sort !== 'random') {
                params.append('sort', this.currentFilter.sort);
            }
            
            const response = await fetch(`/api/videos?${params}`);
            const data = await response.json();
            
            if (data.videos && data.videos.length > 0) {
                this.renderVideos(data.videos, reset);
                this.hasMore = data.hasMore;
                this.currentPage++;
                
                const videoCount = document.getElementById('videoCount');
                if (videoCount) videoCount.textContent = `${this.formatNumber(data.total)} videos`;
            } else if (reset) {
                if (noResults) noResults.style.display = 'block';
                const videoCount = document.getElementById('videoCount');
                const noResultsTitle = document.getElementById('noResultsTitle');
                const noResultsText = document.getElementById('noResultsText');
                
                if (videoCount) videoCount.textContent = '0 videos';
                if (noResultsTitle) noResultsTitle.textContent = 'No videos found';
                if (noResultsText) noResultsText.textContent = 'Try adjusting your search terms or filters';
            }
            
        } catch (error) {
            console.error('Error loading videos:', error);
            if (reset) {
                if (noResults) noResults.style.display = 'block';
                const noResultsTitle = document.getElementById('noResultsTitle');
                const noResultsText = document.getElementById('noResultsText');
                
                if (noResultsTitle) noResultsTitle.textContent = 'Error loading videos';
                if (noResultsText) noResultsText.textContent = 'Please check your connection and try again';
            }
            this.showToast('Error loading videos', 'error');
        } finally {
            this.isLoading = false;
            if (loadingContainer) loadingContainer.style.display = 'none';
        }
    }

    async loadWatchHistoryVideos(reset = false) {
        try {
            const response = await fetch(`/api/watch-history?page=${this.currentPage}&limit=20`);
            const data = await response.json();
            
            if (data.videos && data.videos.length > 0) {
                this.renderVideos(data.videos, reset);
                this.hasMore = data.hasMore;
                this.currentPage++;
                
                const videoCount = document.getElementById('videoCount');
                if (videoCount) videoCount.textContent = `${this.formatNumber(data.total)} videos in history`;
            } else if (reset) {
                const noResults = document.getElementById('noResults');
                const videoCount = document.getElementById('videoCount');
                const noResultsTitle = document.getElementById('noResultsTitle');
                const noResultsText = document.getElementById('noResultsText');
                
                if (noResults) noResults.style.display = 'block';
                if (videoCount) videoCount.textContent = '0 videos in history';
                if (noResultsTitle) noResultsTitle.textContent = 'No watch history';
                if (noResultsText) noResultsText.textContent = 'Videos you watch will appear here';
            }
            
        } catch (error) {
            console.error('Error loading watch history videos:', error);
            if (reset) {
                const noResults = document.getElementById('noResults');
                const noResultsTitle = document.getElementById('noResultsTitle');
                const noResultsText = document.getElementById('noResultsText');
                
                if (noResults) noResults.style.display = 'block';
                if (noResultsTitle) noResultsTitle.textContent = 'Error loading watch history';
                if (noResultsText) noResultsText.textContent = 'Please try again later';
            }
        }
    }

    renderVideos(videos, reset = false) {
        const videoGrid = document.getElementById('videoGrid');
        if (!videoGrid) return;
        
        if (reset) {
            videoGrid.innerHTML = '';
        }
        
        videos.forEach(video => {
            const videoCard = this.createVideoCard(video);
            videoGrid.appendChild(videoCard);
        });
    }

    createVideoCard(video) {
        const card = document.createElement('div');
        card.className = 'video-card';
        card.dataset.videoId = video.id;
        
        const isFavorite = this.favorites.has(video.id);
        const thumbnailUrl = video.thumbnailExists ? video.thumbnailUrl : 'https://images.pexels.com/photos/1181467/pexels-photo-1181467.jpeg?auto=compress&cs=tinysrgb&w=400';
        
        // Get engagement data
        const likes = this.videoLikes.get(video.id) || Math.floor(Math.random() * 1000) + 100;
        const dislikes = this.videoDislikes.get(video.id) || Math.floor(Math.random() * 50) + 10;
        
        card.innerHTML = `
            <div class="video-thumbnail">
                <img src="${thumbnailUrl}" 
                     alt="${video.title}" 
                     loading="lazy"
                     onerror="this.src='https://images.pexels.com/photos/1181467/pexels-photo-1181467.jpeg?auto=compress&cs=tinysrgb&w=400'">
                <div class="video-overlay">
                    <button class="play-btn">
                        <i class="fas fa-play"></i>
                    </button>
                </div>
                <button class="video-favorite-btn ${isFavorite ? 'active' : ''}" data-video-id="${video.id}">
                    <i class="fas fa-heart"></i>
                </button>
                ${video.duration ? `<div class="video-duration">${video.duration}</div>` : ''}
                ${video.quality ? `<div class="video-quality">${video.quality}</div>` : ''}
                <div class="video-rating">
                    ${this.renderStars(video.rating || 4.2)}
                </div>
                <div class="video-engagement">
                    <div class="like-count">
                        <i class="fas fa-thumbs-up"></i>
                        ${this.formatNumber(likes)}
                    </div>
                </div>
            </div>
            <div class="video-info">
                <h3 class="video-title">${video.title}</h3>
                <a href="#" class="video-performer" data-performer="${video.artist}">${video.artist}</a>
                <div class="video-stats">
                    <span class="video-stat">
                        <i class="fas fa-eye"></i>
                        ${this.formatNumber(video.views || 0)}
                    </span>
                    <span class="video-stat">
                        <i class="fas fa-star"></i>
                        ${(video.rating || 4.2).toFixed(1)}
                    </span>
                    ${video.duration ? `
                        <span class="video-stat">
                            <i class="fas fa-clock"></i>
                            ${video.duration}
                        </span>
                    ` : ''}
                    <span class="video-stat">
                        <i class="fas fa-thumbs-up"></i>
                        ${this.formatNumber(likes)}
                    </span>
                </div>
                ${video.categories ? `
                    <div class="video-categories">
                        ${video.categories.slice(0, 3).map(cat => `<span class="category-tag">${this.formatName(cat)}</span>`).join('')}
                    </div>
                ` : ''}
            </div>
        `;
        
        // Add hover preview functionality
        const thumbnail = card.querySelector('.video-thumbnail');
        const img = thumbnail.querySelector('img');
        
        thumbnail.addEventListener('mouseenter', () => {
            this.hoverTimeout = setTimeout(() => {
                this.startHoverPreview(video, img);
            }, 500);
        });
        
        thumbnail.addEventListener('mouseleave', () => {
            if (this.hoverTimeout) {
                clearTimeout(this.hoverTimeout);
                this.hoverTimeout = null;
            }
            this.stopHoverPreview(img, thumbnailUrl);
        });
        
        // Add event listeners
        const playBtn = card.querySelector('.play-btn');
        const favoriteBtn = card.querySelector('.video-favorite-btn');
        const performerLink = card.querySelector('.video-performer');
        
        [playBtn, img].forEach(element => {
            element.addEventListener('click', () => {
                this.openVideoModal(video);
                this.addToWatchHistory(video.id);
            });
        });
        
        favoriteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleFavorite(video.id, favoriteBtn);
        });
        
        performerLink.addEventListener('click', (e) => {
            e.preventDefault();
            this.filterByPerformer(performerLink.dataset.performer);
        });
        
        return card;
    }

    startHoverPreview(video, imgElement) {
        if (this.hoverVideo) {
            this.hoverVideo.remove();
        }
        
        this.hoverVideo = document.createElement('video');
        this.hoverVideo.className = 'hover-preview-video';
        this.hoverVideo.src = `/api/video-stream/${video.id}#t=10`;
        this.hoverVideo.muted = true;
        this.hoverVideo.loop = true;
        this.hoverVideo.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            object-fit: cover;
            z-index: 2;
        `;
        
        imgElement.parentElement.appendChild(this.hoverVideo);
        
        this.hoverVideo.play().catch(() => {
            if (this.hoverVideo) {
                this.hoverVideo.remove();
                this.hoverVideo = null;
            }
        });
    }

    stopHoverPreview(imgElement, originalSrc) {
        if (this.hoverVideo) {
            this.hoverVideo.pause();
            this.hoverVideo.remove();
            this.hoverVideo = null;
        }
    }

    renderStars(rating) {
        const fullStars = Math.floor(rating);
        const hasHalfStar = rating % 1 >= 0.5;
        const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
        
        let stars = '';
        for (let i = 0; i < fullStars; i++) {
            stars += '<i class="fas fa-star"></i>';
        }
        if (hasHalfStar) {
            stars += '<i class="fas fa-star-half-alt"></i>';
        }
        for (let i = 0; i < emptyStars; i++) {
            stars += '<i class="far fa-star"></i>';
        }
        
        return stars;
    }

    async addToWatchHistory(videoId) {
        try {
            await fetch(`/api/watch-history/${videoId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ timestamp: Date.now() })
            });
            
            // Update local watch history
            await this.loadWatchHistory();
        } catch (error) {
            console.error('Error adding to watch history:', error);
        }
    }

    async toggleFavorite(videoId, button) {
        try {
            const isFavorite = this.favorites.has(videoId);
            
            if (isFavorite) {
                const response = await fetch(`/api/favorites/${videoId}`, { method: 'DELETE' });
                if (response.ok) {
                    this.favorites.delete(videoId);
                    button.classList.remove('active');
                    this.showToast('Removed from favorites', 'success');
                }
            } else {
                const response = await fetch(`/api/favorites/${videoId}`, { method: 'POST' });
                if (response.ok) {
                    this.favorites.add(videoId);
                    button.classList.add('active');
                    this.showToast('Added to favorites', 'success');
                }
            }
            
            this.updateFavoritesCount();
        } catch (error) {
            console.error('Error toggling favorite:', error);
            this.showToast('Error updating favorites', 'error');
        }
    }

    updateFavoritesCount() {
        const favoritesCount = document.querySelector('.favorites-count');
        if (favoritesCount) {
            favoritesCount.textContent = this.favorites.size;
        }
    }

    openVideoModal(video) {
        this.currentVideoId = video.id;
        
        const modal = document.getElementById('videoModal');
        const modalVideo = document.getElementById('modalVideo');
        const modalVideoTitle = document.getElementById('modalVideoTitle');
        const modalVideoPerformer = document.getElementById('modalVideoPerformer');
        const modalVideoViews = document.getElementById('modalVideoViews');
        const modalVideoRating = document.getElementById('modalVideoRating');
        const modalVideoDuration = document.getElementById('modalVideoDuration');
        const modalVideoQuality = document.getElementById('modalVideoQuality');
        const modalVideoCategories = document.getElementById('modalVideoCategories');
        
        if (modalVideo) {
            modalVideo.src = `/api/video-stream/${video.id}`;
            modalVideo.load();
        }
        
        if (modalVideoTitle) modalVideoTitle.textContent = video.title;
        if (modalVideoPerformer) {
            modalVideoPerformer.textContent = video.artist;
            modalVideoPerformer.dataset.performer = video.artist;
        }
        if (modalVideoViews) modalVideoViews.textContent = this.formatNumber(video.views || 0);
        if (modalVideoRating) modalVideoRating.textContent = (video.rating || 4.2).toFixed(1);
        if (modalVideoDuration) modalVideoDuration.textContent = video.duration || 'Unknown';
        if (modalVideoQuality) modalVideoQuality.textContent = video.quality || 'HD';
        
        // Add click handler for performer link in modal
        if (modalVideoPerformer) {
            modalVideoPerformer.addEventListener('click', (e) => {
                e.preventDefault();
                this.closeVideoModal();
                this.filterByPerformer(modalVideoPerformer.dataset.performer);
            });
        }
        
        if (video.categories && video.categories.length > 0 && modalVideoCategories) {
            modalVideoCategories.innerHTML = video.categories.map(cat => 
                `<span class="category-tag" data-category="${cat}">${this.formatName(cat)}</span>`
            ).join('');
            
            modalVideoCategories.querySelectorAll('.category-tag').forEach(tag => {
                tag.addEventListener('click', () => {
                    this.closeVideoModal();
                    this.filterByCategory(tag.dataset.category);
                });
            });
        } else if (modalVideoCategories) {
            modalVideoCategories.innerHTML = '';
        }
        
        this.updateModalActionButtons();
        this.updateModalEngagement();
        this.loadRelatedVideos(video);
        this.loadComments(video.id);
        
        if (modal) modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    updateModalActionButtons() {
        const videoId = this.currentVideoId;
        const isFavorite = this.favorites.has(videoId);
        
        const favoriteButtons = [
            document.getElementById('modalFavoriteBtn'),
            document.getElementById('modalFavBtn')
        ];
        
        favoriteButtons.forEach(btn => {
            if (btn) {
                btn.classList.toggle('active', isFavorite);
                const span = btn.querySelector('span');
                if (span) {
                    span.textContent = isFavorite ? 'Remove from Favorites' : 'Add to Favorites';
                }
            }
        });
    }

    updateModalEngagement() {
        const videoId = this.currentVideoId;
        const likes = this.videoLikes.get(videoId) || Math.floor(Math.random() * 1000) + 100;
        const dislikes = this.videoDislikes.get(videoId) || Math.floor(Math.random() * 50) + 10;
        
        const modalLikeCount = document.getElementById('modalLikeCount');
        const modalDislikeCount = document.getElementById('modalDislikeCount');
        
        if (modalLikeCount) modalLikeCount.textContent = this.formatNumber(likes);
        if (modalDislikeCount) modalDislikeCount.textContent = this.formatNumber(dislikes);
    }

    async loadRelatedVideos(currentVideo) {
        try {
            const params = new URLSearchParams({
                page: 1,
                limit: 12
            });
            
            if (currentVideo.categories && currentVideo.categories.length > 0) {
                params.append('category', currentVideo.categories[0]);
            } else if (currentVideo.artist) {
                params.append('celebrity', currentVideo.artist);
            }
            
            const response = await fetch(`/api/videos?${params}`);
            const data = await response.json();
            
            if (data.videos) {
                const relatedVideos = data.videos.filter(v => v.id !== currentVideo.id).slice(0, 10);
                this.renderRelatedVideos(relatedVideos);
            }
        } catch (error) {
            console.error('Error loading related videos:', error);
        }
    }

    renderRelatedVideos(videos) {
        const relatedVideosGrid = document.getElementById('relatedVideosGrid');
        if (!relatedVideosGrid) return;

        relatedVideosGrid.innerHTML = videos.map(video => {
            const thumbnailUrl = video.thumbnailExists ? video.thumbnailUrl : 'https://images.pexels.com/photos/1181467/pexels-photo-1181467.jpeg?auto=compress&cs=tinysrgb&w=300';
            
            return `
                <div class="related-video-card" data-video-id="${video.id}">
                    <div class="related-video-thumbnail">
                        <img src="${thumbnailUrl}" alt="${video.title}" loading="lazy">
                        ${video.duration ? `<div class="video-duration">${video.duration}</div>` : ''}
                        <div class="video-rating-small">
                            <i class="fas fa-star"></i>
                            ${(video.rating || 4.2).toFixed(1)}
                        </div>
                    </div>
                    <div class="related-video-info">
                        <div class="related-video-title">${video.title}</div>
                        <div class="related-video-performer">${video.artist}</div>
                        <div class="related-video-views">${this.formatNumber(video.views || 0)} views</div>
                    </div>
                </div>
            `;
        }).join('');
        
        relatedVideosGrid.querySelectorAll('.related-video-card').forEach(card => {
            card.addEventListener('click', () => {
                const videoId = card.dataset.videoId;
                const video = videos.find(v => v.id === videoId);
                if (video) {
                    this.openVideoModal(video);
                    this.addToWatchHistory(video.id);
                }
            });
        });
    }

    closeVideoModal() {
        const modal = document.getElementById('videoModal');
        const modalVideo = document.getElementById('modalVideo');
        
        if (modal) modal.classList.remove('active');
        if (modalVideo) {
            modalVideo.pause();
            modalVideo.src = '';
        }
        document.body.style.overflow = '';
        this.currentVideoId = null;
    }

    async toggleModalFavorite() {
        if (!this.currentVideoId) return;
        
        try {
            const isFavorite = this.favorites.has(this.currentVideoId);
            
            if (isFavorite) {
                const response = await fetch(`/api/favorites/${this.currentVideoId}`, { method: 'DELETE' });
                if (response.ok) {
                    this.favorites.delete(this.currentVideoId);
                    this.showToast('Removed from favorites', 'success');
                }
            } else {
                const response = await fetch(`/api/favorites/${this.currentVideoId}`, { method: 'POST' });
                if (response.ok) {
                    this.favorites.add(this.currentVideoId);
                    this.showToast('Added to favorites', 'success');
                }
            }
            
            this.updateModalActionButtons();
            this.updateFavoritesCount();
            
            const videoCard = document.querySelector(`[data-video-id="${this.currentVideoId}"]`);
            if (videoCard) {
                const cardFavoriteBtn = videoCard.querySelector('.video-favorite-btn');
                if (cardFavoriteBtn) {
                    cardFavoriteBtn.classList.toggle('active', this.favorites.has(this.currentVideoId));
                }
            }
            
        } catch (error) {
            console.error('Error toggling favorite:', error);
            this.showToast('Error updating favorites', 'error');
        }
    }

    toggleVideoLike() {
        if (!this.currentUser) {
            this.showToast('Please login to like videos', 'warning');
            return;
        }

        const videoId = this.currentVideoId;
        const currentLikes = this.videoLikes.get(videoId) || Math.floor(Math.random() * 1000) + 100;
        
        // Toggle like
        this.videoLikes.set(videoId, currentLikes + 1);
        
        const modalLikeBtn = document.getElementById('modalLikeBtn');
        if (modalLikeBtn) modalLikeBtn.classList.add('active');
        
        this.updateModalEngagement();
        this.showToast('Video liked!', 'success');
    }

    toggleVideoDislike() {
        if (!this.currentUser) {
            this.showToast('Please login to dislike videos', 'warning');
            return;
        }

        const videoId = this.currentVideoId;
        const currentDislikes = this.videoDislikes.get(videoId) || Math.floor(Math.random() * 50) + 10;
        
        // Toggle dislike
        this.videoDislikes.set(videoId, currentDislikes + 1);
        
        const modalDislikeBtn = document.getElementById('modalDislikeBtn');
        if (modalDislikeBtn) modalDislikeBtn.classList.add('active');
        
        this.updateModalEngagement();
        this.showToast('Video disliked', 'success');
    }

    toggleSubscription() {
        if (!this.currentUser) {
            this.showToast('Please login to subscribe', 'warning');
            return;
        }

        const modalVideoPerformer = document.getElementById('modalVideoPerformer');
        if (!modalVideoPerformer) return;

        const performer = modalVideoPerformer.dataset.performer;
        const subscribeBtn = document.getElementById('subscribeBtn');
        
        if (this.subscriptions.has(performer)) {
            this.subscriptions.delete(performer);
            if (subscribeBtn) {
                subscribeBtn.classList.remove('active');
                subscribeBtn.querySelector('span').textContent = 'Subscribe';
            }
            this.showToast(`Unsubscribed from ${this.formatName(performer)}`, 'success');
        } else {
            this.subscriptions.add(performer);
            if (subscribeBtn) {
                subscribeBtn.classList.add('active');
                subscribeBtn.querySelector('span').textContent = 'Subscribed';
            }
            this.showToast(`Subscribed to ${this.formatName(performer)}!`, 'success');
        }
    }

    highlightStars(rating) {
        const stars = document.querySelectorAll('.star-rating i');
        stars.forEach((star, index) => {
            if (index < rating) {
                star.classList.add('highlighted');
            } else {
                star.classList.remove('highlighted');
            }
        });
    }

    resetStarHighlight() {
        const stars = document.querySelectorAll('.star-rating i');
        stars.forEach(star => {
            star.classList.remove('highlighted');
        });
    }

    rateVideo(rating) {
        if (!this.currentUser) {
            this.showToast('Please login to rate videos', 'warning');
            return;
        }

        const videoId = this.currentVideoId;
        this.videoRatings.set(videoId, rating);
        
        const stars = document.querySelectorAll('.star-rating i');
        stars.forEach((star, index) => {
            if (index < rating) {
                star.classList.add('active');
            } else {
                star.classList.remove('active');
            }
        });
        
        this.showToast(`Rated ${rating} stars!`, 'success');
    }

    // Comments functionality
    showCommentActions() {
        const commentActions = document.querySelector('.comment-actions');
        if (commentActions) commentActions.style.display = 'flex';
    }

    hideCommentActions() {
        const commentActions = document.querySelector('.comment-actions');
        const commentInput = document.getElementById('commentInput');
        
        if (commentActions) commentActions.style.display = 'none';
        if (commentInput) commentInput.value = '';
    }

    submitComment() {
        if (!this.currentUser) {
            this.showToast('Please login to comment', 'warning');
            return;
        }

        const commentInput = document.getElementById('commentInput');
        if (!commentInput) return;

        const commentText = commentInput.value.trim();
        if (!commentText) {
            this.showToast('Please enter a comment', 'warning');
            return;
        }

        const videoId = this.currentVideoId;
        const comment = {
            id: Date.now(),
            author: this.currentUser.username,
            avatar: this.currentUser.avatar,
            text: commentText,
            timestamp: Date.now(),
            likes: 0,
            dislikes: 0,
            replies: []
        };

        if (!this.comments.has(videoId)) {
            this.comments.set(videoId, []);
        }
        
        this.comments.get(videoId).unshift(comment);
        this.renderComments(videoId);
        this.hideCommentActions();
        this.showToast('Comment added!', 'success');
    }

    loadComments(videoId) {
        // Simulate loading comments
        if (!this.comments.has(videoId)) {
            this.comments.set(videoId, []);
        }
        this.renderComments(videoId);
    }

    renderComments(videoId) {
        const commentsList = document.getElementById('commentsList');
        const commentCount = document.getElementById('commentCount');
        
        if (!commentsList || !commentCount) return;

        const comments = this.comments.get(videoId) || [];
        commentCount.textContent = comments.length;

        if (comments.length === 0) {
            commentsList.innerHTML = `
                <div class="no-comments">
                    <p>No comments yet. Be the first to comment!</p>
                </div>
            `;
            return;
        }

        commentsList.innerHTML = comments.map(comment => `
            <div class="comment" data-comment-id="${comment.id}">
                <img src="${comment.avatar}" alt="${comment.author}" class="comment-avatar">
                <div class="comment-content">
                    <div class="comment-header">
                        <span class="comment-author">${comment.author}</span>
                        <span class="comment-date">${this.formatDate(comment.timestamp)}</span>
                    </div>
                    <div class="comment-text">${comment.text}</div>
                    <div class="comment-actions">
                        <button class="comment-like-btn" onclick="app.likeComment('${videoId}', '${comment.id}')">
                            <i class="fas fa-thumbs-up"></i>
                            ${comment.likes}
                        </button>
                        <button class="comment-dislike-btn" onclick="app.dislikeComment('${videoId}', '${comment.id}')">
                            <i class="fas fa-thumbs-down"></i>
                            ${comment.dislikes}
                        </button>
                        <button class="comment-reply-btn" onclick="app.replyToComment('${videoId}', '${comment.id}')">
                            <i class="fas fa-reply"></i>
                            Reply
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
    }

    likeComment(videoId, commentId) {
        if (!this.currentUser) {
            this.showToast('Please login to like comments', 'warning');
            return;
        }

        const comments = this.comments.get(videoId);
        const comment = comments.find(c => c.id == commentId);
        if (comment) {
            comment.likes++;
            this.renderComments(videoId);
        }
    }

    dislikeComment(videoId, commentId) {
        if (!this.currentUser) {
            this.showToast('Please login to dislike comments', 'warning');
            return;
        }

        const comments = this.comments.get(videoId);
        const comment = comments.find(c => c.id == commentId);
        if (comment) {
            comment.dislikes++;
            this.renderComments(videoId);
        }
    }

    replyToComment(videoId, commentId) {
        if (!this.currentUser) {
            this.showToast('Please login to reply', 'warning');
            return;
        }

        this.showToast('Reply functionality coming soon!', 'info');
    }

    loadMoreComments() {
        this.showToast('Load more comments functionality coming soon!', 'info');
    }

    // Playlist functionality
    showCreatePlaylistModal() {
        if (!this.currentUser) {
            this.showToast('Please login to create playlists', 'warning');
            return;
        }

        const playlistModal = document.getElementById('playlistModal');
        const playlistModalTitle = document.getElementById('playlistModalTitle');
        
        if (playlistModalTitle) playlistModalTitle.textContent = 'Create New Playlist';
        if (playlistModal) playlistModal.classList.add('active');
    }

    showAddToPlaylistModal() {
        if (!this.currentUser) {
            this.showToast('Please login to add to playlists', 'warning');
            return;
        }

        const playlistModal = document.getElementById('playlistModal');
        const playlistModalTitle = document.getElementById('playlistModalTitle');
        
        if (playlistModalTitle) playlistModalTitle.textContent = 'Add to Playlist';
        this.renderExistingPlaylists();
        if (playlistModal) playlistModal.classList.add('active');
    }

    hidePlaylistModal() {
        const playlistModal = document.getElementById('playlistModal');
        if (playlistModal) playlistModal.classList.remove('active');
    }

    createNewPlaylist() {
        const newPlaylistName = document.getElementById('newPlaylistName');
        if (!newPlaylistName) return;

        const name = newPlaylistName.value.trim();
        if (!name) {
            this.showToast('Please enter a playlist name', 'warning');
            return;
        }

        const playlist = {
            id: Date.now(),
            name: name,
            description: '',
            videos: [],
            isPrivate: false,
            createdAt: Date.now()
        };

        this.playlists.push(playlist);
        this.savePlaylists();
        
        newPlaylistName.value = '';
        this.showToast('Playlist created!', 'success');
        
        // If we're adding a video to playlist, add it now
        if (this.currentVideoId) {
            this.addVideoToPlaylist(playlist.id, this.currentVideoId);
        }
        
        this.hidePlaylistModal();
    }

    renderExistingPlaylists() {
        const existingPlaylists = document.getElementById('existingPlaylists');
        if (!existingPlaylists) return;

        if (this.playlists.length === 0) {
            existingPlaylists.innerHTML = '<div class="no-playlists">No playlists yet. Create one above!</div>';
            return;
        }

        existingPlaylists.innerHTML = this.playlists.map(playlist => `
            <div class="playlist-item">
                <div class="playlist-info">
                    <div class="playlist-name">${playlist.name}</div>
                    <div class="playlist-count">${playlist.videos.length} videos</div>
                </div>
                <button class="add-to-playlist-btn" onclick="app.addVideoToPlaylist('${playlist.id}', '${this.currentVideoId}')">
                    <i class="fas fa-plus"></i>
                    Add
                </button>
            </div>
        `).join('');
    }

    addVideoToPlaylist(playlistId, videoId) {
        const playlist = this.playlists.find(p => p.id == playlistId);
        if (!playlist) return;

        if (playlist.videos.includes(videoId)) {
            this.showToast('Video already in playlist', 'warning');
            return;
        }

        playlist.videos.push(videoId);
        this.savePlaylists();
        this.showToast(`Added to ${playlist.name}!`, 'success');
        this.hidePlaylistModal();
    }

    savePlaylists() {
        if (this.currentUser) {
            localStorage.setItem(`playlists_${this.currentUser.id}`, JSON.stringify(this.playlists));
        }
    }

    viewPlaylist(playlistId) {
        this.showToast('View playlist functionality coming soon!', 'info');
    }

    editPlaylist(playlistId) {
        this.showToast('Edit playlist functionality coming soon!', 'info');
    }

    deletePlaylist(playlistId) {
        if (confirm('Are you sure you want to delete this playlist?')) {
            this.playlists = this.playlists.filter(p => p.id != playlistId);
            this.savePlaylists();
            this.renderPlaylists();
            this.showToast('Playlist deleted', 'success');
        }
    }

    updateUI() {
        this.updateFavoritesCount();
        this.setView(this.currentView);
        this.updateAuthUI();
        
        const sortSelect = document.getElementById('sortSelect');
        if (sortSelect) sortSelect.value = this.currentFilter.sort;
    }

    showToast(message, type = 'info') {
        const toastContainer = document.getElementById('toastContainer');
        if (!toastContainer) return;

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        
        toastContainer.appendChild(toast);
        
        setTimeout(() => {
            toast.remove();
        }, 3000);
    }

    formatName(name) {
        return name.replace(/[_-]/g, ' ')
                   .split(' ')
                   .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                   .join(' ');
    }

    formatNumber(num) {
        // Ensure num is a valid number
        if (num === null || num === undefined || isNaN(num)) {
            return '0';
        }
        
        const number = Number(num);
        
        if (number >= 1000000) {
            return (number / 1000000).toFixed(1) + 'M';
        } else if (number >= 1000) {
            return (number / 1000).toFixed(1) + 'K';
        }
        return number.toString();
    }

    formatDate(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now - date;
        
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);
        
        if (minutes < 60) {
            return `${minutes} minutes ago`;
        } else if (hours < 24) {
            return `${hours} hours ago`;
        } else if (days < 7) {
            return `${days} days ago`;
        } else {
            return date.toLocaleDateString();
        }
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new VideoApp();
});