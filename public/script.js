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
        this.relatedVideosPage = 1;
        this.relatedVideosLoading = false;
        this.relatedVideosHasMore = true;
        
        // Statistics
        this.stats = {
            totalVideos: 0,
            totalPerformers: 0,
            totalCategories: 0
        };
        
        this.init();
    }

    async init() {
        this.loadFromLocalStorage();
        this.setupEventListeners();
        await this.loadInitialData();
        this.updateUI();
    }

    loadFromLocalStorage() {
        try {
            const savedFavorites = localStorage.getItem('loveporn_favorites');
            if (savedFavorites) {
                this.favorites = new Set(JSON.parse(savedFavorites));
            }
            
            const savedWatchHistory = localStorage.getItem('loveporn_watch_history');
            if (savedWatchHistory) {
                this.watchHistory = JSON.parse(savedWatchHistory);
            }
            
            const savedSearchHistory = localStorage.getItem('loveporn_search_history');
            if (savedSearchHistory) {
                this.searchHistory = JSON.parse(savedSearchHistory);
            }
        } catch (error) {
            console.error('Error loading from localStorage:', error);
        }
    }

    saveToLocalStorage() {
        try {
            localStorage.setItem('loveporn_favorites', JSON.stringify(Array.from(this.favorites)));
            localStorage.setItem('loveporn_watch_history', JSON.stringify(this.watchHistory));
            localStorage.setItem('loveporn_search_history', JSON.stringify(this.searchHistory));
        } catch (error) {
            console.error('Error saving to localStorage:', error);
        }
    }

    async loadInitialData() {
        try {
            await Promise.all([
                this.loadCategories(),
                this.loadPerformers(),
                this.loadStats()
            ]);
            
            await this.loadVideos(true);
        } catch (error) {
            console.error('Error loading initial data:', error);
            this.showToast('Error loading data', 'error');
        }
    }

    setupEventListeners() {
        // Mobile menu
        document.getElementById('mobileMenuBtn').addEventListener('click', () => {
            document.getElementById('mobileNav').classList.add('active');
        });

        document.getElementById('mobileNavClose').addEventListener('click', () => {
            document.getElementById('mobileNav').classList.remove('active');
        });

        // Home button
        document.getElementById('homeButton').addEventListener('click', () => {
            this.navigateToSection('home');
        });

        // Search functionality with history
        const searchInput = document.getElementById('searchInput');
        const searchBtn = document.getElementById('searchBtn');
        
        searchInput.addEventListener('input', this.debounce(() => {
            this.handleSearchInput();
        }, 300));
        
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.handleSearch();
            }
        });
        
        searchBtn.addEventListener('click', () => {
            this.handleSearch();
        });

        // Search suggestions
        searchInput.addEventListener('focus', () => {
            if (searchInput.value.length >= 2) {
                this.showSearchSuggestions(searchInput.value);
            } else {
                this.showSearchHistory();
            }
        });

        // Navigation
        document.addEventListener('click', (e) => {
            const navLink = e.target.closest('.nav-link, .mobile-nav-link');
            if (navLink) {
                e.preventDefault();
                const section = navLink.dataset.section;
                if (section) {
                    this.navigateToSection(section);
                    document.getElementById('mobileNav').classList.remove('active');
                }
            }
        });

        // Filter controls
        document.getElementById('sortSelect').addEventListener('change', (e) => {
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
        document.getElementById('shuffleBtn').addEventListener('click', () => {
            this.shuffleVideos();
        });

        // Favorites dropdown button
        document.getElementById('favoritesDropdownBtn').addEventListener('click', (e) => {
            e.preventDefault();
            this.navigateToSection('favorites');
            document.getElementById('userDropdown').classList.remove('active');
        });

        // Watch history button
        document.getElementById('watchHistoryBtn').addEventListener('click', (e) => {
            e.preventDefault();
            this.navigateToSection('watch-history');
            document.getElementById('userDropdown').classList.remove('active');
        });

        // User menu
        document.getElementById('userMenuBtn').addEventListener('click', (e) => {
            e.stopPropagation();
            const dropdown = document.getElementById('userDropdown');
            dropdown.classList.toggle('active');
        });

        // Clear filters
        document.getElementById('clearFiltersBtn').addEventListener('click', () => {
            this.clearAllFilters();
        });

        // Video modal
        document.getElementById('modalBackdrop').addEventListener('click', () => {
            this.closeVideoModal();
        });
        
        document.getElementById('modalCloseBtn').addEventListener('click', () => {
            this.closeVideoModal();
        });

        // Modal actions
        document.getElementById('modalFavoriteBtn').addEventListener('click', () => {
            this.toggleModalFavorite();
        });

        document.getElementById('modalFavBtn').addEventListener('click', () => {
            this.toggleModalFavorite();
        });

        // Modal performer click
        document.addEventListener('click', (e) => {
            if (e.target.id === 'modalVideoPerformer') {
                const performerName = e.target.dataset.performer;
                if (performerName) {
                    this.closeVideoModal();
                    this.filterByPerformer(performerName);
                }
            }
        });

        // Close dropdowns when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.search-container')) {
                document.getElementById('searchSuggestions').style.display = 'none';
            }
            
            if (!e.target.closest('.user-menu')) {
                document.getElementById('userDropdown').classList.remove('active');
            }
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeVideoModal();
                document.getElementById('mobileNav').classList.remove('active');
            }
            
            if (e.key === '/' && !e.target.matches('input, textarea')) {
                e.preventDefault();
                document.getElementById('searchInput').focus();
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

        // Related videos infinite scroll
        const relatedVideosGrid = document.getElementById('relatedVideosGrid');
        relatedVideosGrid.addEventListener('scroll', this.debounce(() => {
            if (relatedVideosGrid.scrollTop + relatedVideosGrid.clientHeight >= relatedVideosGrid.scrollHeight - 100) {
                if (this.relatedVideosHasMore && !this.relatedVideosLoading) {
                    this.loadMoreRelatedVideos();
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
                document.getElementById('mobileNav').classList.remove('active');
            });
        });
    }

    renderMobilePerformers(performers) {
        const mobilePerformers = document.getElementById('mobilePerformersList');
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
                document.getElementById('mobileNav').classList.remove('active');
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
        document.getElementById('searchInput').value = '';
        
        if (section === 'categories') {
            this.showCategoriesGrid();
        } else if (section === 'performers') {
            this.showPerformersGrid();
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
        }
        
        document.getElementById('contentTitle').textContent = title;
        document.getElementById('contentBreadcrumb').innerHTML = breadcrumb.split(' / ').map(crumb => `<span>${crumb}</span>`).join('');
    }

    showCategoriesGrid() {
        document.getElementById('filterBar').style.display = 'none';
        document.getElementById('videoGrid').style.display = 'none';
        document.getElementById('performersGrid').style.display = 'none';
        document.getElementById('categoriesGrid').style.display = 'grid';
        document.getElementById('noResults').style.display = 'none';
    }

    showPerformersGrid() {
        document.getElementById('filterBar').style.display = 'none';
        document.getElementById('videoGrid').style.display = 'none';
        document.getElementById('categoriesGrid').style.display = 'none';
        document.getElementById('performersGrid').style.display = 'grid';
        document.getElementById('noResults').style.display = 'none';
    }

    showVideoGrid() {
        document.getElementById('filterBar').style.display = 'block';
        document.getElementById('categoriesGrid').style.display = 'none';
        document.getElementById('performersGrid').style.display = 'none';
        document.getElementById('videoGrid').style.display = 'grid';
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
        document.getElementById('contentTitle').textContent = `Category: ${this.formatName(category)}`;
        document.getElementById('contentBreadcrumb').innerHTML = `<span>Home</span><span>Categories</span><span>${this.formatName(category)}</span>`;
        
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
        document.getElementById('contentTitle').textContent = `Performer: ${this.formatName(performer)}`;
        document.getElementById('contentBreadcrumb').innerHTML = `<span>Home</span><span>Performers</span><span>${this.formatName(performer)}</span>`;
        
        this.showVideoGrid();
        this.loadVideos(true);
    }

    handleSearchInput() {
        const searchTerm = document.getElementById('searchInput').value.trim();
        if (searchTerm.length >= 2) {
            this.showSearchSuggestions(searchTerm);
        } else if (searchTerm.length === 0) {
            this.showSearchHistory();
        } else {
            document.getElementById('searchSuggestions').style.display = 'none';
        }
    }

    async handleSearch() {
        const searchTerm = document.getElementById('searchInput').value.trim();
        
        if (searchTerm) {
            this.addToSearchHistory(searchTerm);
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
        
        document.getElementById('contentTitle').textContent = title;
        document.getElementById('contentBreadcrumb').innerHTML = breadcrumb;
        
        document.querySelectorAll('.nav-link, .mobile-nav-link').forEach(item => {
            item.classList.remove('active');
        });
        
        this.showVideoGrid();
        this.loadVideos(true);
        
        document.getElementById('searchSuggestions').style.display = 'none';
    }

    addToSearchHistory(query) {
        // Remove if already exists
        this.searchHistory = this.searchHistory.filter(item => item.query !== query);
        
        // Add to beginning
        this.searchHistory.unshift({ query, timestamp: Date.now() });
        
        // Keep only last 50 items
        this.searchHistory = this.searchHistory.slice(0, 50);
        
        this.saveToLocalStorage();
    }

    showSearchHistory() {
        if (this.searchHistory.length === 0) return;
        
        const suggestionsContainer = document.getElementById('searchSuggestions');
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
                document.getElementById('searchInput').value = item.dataset.value;
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
                            document.getElementById('searchInput').value = value;
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
        
        document.getElementById('searchInput').value = '';
        document.getElementById('sortSelect').value = 'random';
        
        this.navigateToSection('home');
    }

    setView(view) {
        this.currentView = view;
        const videoGrid = document.getElementById('videoGrid');
        const viewOptions = document.querySelectorAll('.view-option');
        
        if (view === 'list') {
            videoGrid.classList.add('list-view');
        } else {
            videoGrid.classList.remove('list-view');
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
                const originalHTML = shuffleBtn.innerHTML;
                shuffleBtn.innerHTML = '<i class="fas fa-check"></i>';
                setTimeout(() => {
                    shuffleBtn.innerHTML = originalHTML;
                }, 1000);
                
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
            document.getElementById('videoGrid').innerHTML = '';
            noResults.style.display = 'none';
        }
        
        loadingContainer.style.display = 'flex';
        
        try {
            if (this.currentFilter.section === 'favorites') {
                await this.loadFavoriteVideos(reset);
                return;
            }
            
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
            
            if (this.currentFilter.sort && this.currentFilter.sort !== 'random') {
                params.append('sort', this.currentFilter.sort);
            }
            
            const response = await fetch(`/api/videos?${params}`);
            const data = await response.json();
            
            if (data.videos && data.videos.length > 0) {
                this.renderVideos(data.videos, reset);
                this.hasMore = data.hasMore;
                this.currentPage++;
                
                document.getElementById('videoCount').textContent = `${this.formatNumber(data.total)} videos`;
            } else if (reset) {
                this.showNoResults();
                document.getElementById('videoCount').textContent = '0 videos';
            }
            
        } catch (error) {
            console.error('Error loading videos:', error);
            if (reset) {
                this.showNoResults();
            }
            this.showToast('Error loading videos', 'error');
        } finally {
            this.isLoading = false;
            loadingContainer.style.display = 'none';
        }
    }

    async loadFavoriteVideos(reset = false) {
        try {
            if (reset) {
                document.getElementById('videoGrid').innerHTML = '';
            }
            
            if (this.favorites.size === 0) {
                if (reset) {
                    this.showNoResults('No favorite videos', 'Add videos to your favorites to see them here');
                    document.getElementById('videoCount').textContent = '0 videos';
                }
                return;
            }
            
            const params = new URLSearchParams({
                page: this.currentPage,
                limit: 20,
                favorites: 'true'
            });
            
            const response = await fetch(`/api/videos?${params}`);
            const data = await response.json();
            
            if (data.videos && data.videos.length > 0) {
                this.renderVideos(data.videos, reset);
                this.hasMore = data.hasMore;
                this.currentPage++;
                
                document.getElementById('videoCount').textContent = `${this.formatNumber(data.total)} videos`;
            } else if (reset) {
                this.showNoResults('No favorite videos', 'Add videos to your favorites to see them here');
                document.getElementById('videoCount').textContent = '0 videos';
            }
            
        } catch (error) {
            console.error('Error loading favorite videos:', error);
        }
    }

    async loadWatchHistoryVideos(reset = false) {
        try {
            if (reset) {
                document.getElementById('videoGrid').innerHTML = '';
            }
            
            if (this.watchHistory.length === 0) {
                if (reset) {
                    this.showNoResults('No watch history', 'Videos you watch will appear here');
                    document.getElementById('videoCount').textContent = '0 videos';
                }
                return;
            }
            
            const startIndex = (this.currentPage - 1) * 20;
            const endIndex = startIndex + 20;
            const historySlice = this.watchHistory.slice(startIndex, endIndex);
            
            if (historySlice.length === 0) {
                if (reset) {
                    this.showNoResults('No watch history', 'Videos you watch will appear here');
                    document.getElementById('videoCount').textContent = '0 videos';
                }
                return;
            }
            
            // For now, show placeholder since we need to implement proper video lookup
            if (reset) {
                document.getElementById('videoCount').textContent = `${this.watchHistory.length} videos in history`;
                const videoGrid = document.getElementById('videoGrid');
                videoGrid.innerHTML = `
                    <div class="watch-history-placeholder">
                        <div class="placeholder-icon">
                            <i class="fas fa-history"></i>
                        </div>
                        <h3>Watch History</h3>
                        <p>Your recently watched videos will appear here.</p>
                        <p>Currently tracking ${this.watchHistory.length} videos.</p>
                    </div>
                `;
            }
            
        } catch (error) {
            console.error('Error loading watch history videos:', error);
        }
    }

    showNoResults(title = 'No videos found', text = 'Try adjusting your search terms or filters') {
        const noResults = document.getElementById('noResults');
        const noResultsTitle = document.getElementById('noResultsTitle');
        const noResultsText = document.getElementById('noResultsText');
        
        noResultsTitle.textContent = title;
        noResultsText.textContent = text;
        noResults.style.display = 'block';
        
        // Hide clear filters button if no filters are active
        const clearFiltersBtn = document.getElementById('clearFiltersBtn');
        const hasActiveFilters = this.currentFilter.search || this.currentFilter.celebrity || this.currentFilter.category;
        clearFiltersBtn.style.display = hasActiveFilters ? 'inline-flex' : 'none';
    }

    renderVideos(videos, reset = false) {
        const videoGrid = document.getElementById('videoGrid');
        
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

    addToWatchHistory(videoId) {
        // Remove if already exists
        this.watchHistory = this.watchHistory.filter(item => item.id !== videoId);
        
        // Add to beginning
        this.watchHistory.unshift({ id: videoId, timestamp: Date.now() });
        
        // Keep only last 100 items
        this.watchHistory = this.watchHistory.slice(0, 100);
        
        this.saveToLocalStorage();
    }

    async toggleFavorite(videoId, button) {
        try {
            const isFavorite = this.favorites.has(videoId);
            
            if (isFavorite) {
                this.favorites.delete(videoId);
                button.classList.remove('active');
                this.showToast('Removed from favorites', 'success');
            } else {
                this.favorites.add(videoId);
                button.classList.add('active');
                this.showToast('Added to favorites', 'success');
            }
            
            this.saveToLocalStorage();
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
        
        modalVideo.src = `/api/video-stream/${video.id}`;
        modalVideo.load();
        
        modalVideoTitle.textContent = video.title;
        modalVideoPerformer.textContent = video.artist;
        modalVideoPerformer.dataset.performer = video.artist;
        modalVideoViews.textContent = this.formatNumber(video.views || 0);
        modalVideoRating.textContent = (video.rating || 4.2).toFixed(1);
        modalVideoDuration.textContent = video.duration || 'Unknown';
        modalVideoQuality.textContent = video.quality || 'HD';
        
        if (video.categories && video.categories.length > 0) {
            modalVideoCategories.innerHTML = video.categories.map(cat => 
                `<span class="category-tag" data-category="${cat}">${this.formatName(cat)}</span>`
            ).join('');
            
            modalVideoCategories.querySelectorAll('.category-tag').forEach(tag => {
                tag.addEventListener('click', () => {
                    this.closeVideoModal();
                    this.filterByCategory(tag.dataset.category);
                });
            });
        } else {
            modalVideoCategories.innerHTML = '';
        }
        
        this.updateModalActionButtons();
        this.loadRelatedVideos(video);
        
        modal.classList.add('active');
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

    async loadRelatedVideos(currentVideo) {
        try {
            this.relatedVideosPage = 1;
            this.relatedVideosLoading = false;
            this.relatedVideosHasMore = true;
            
            const relatedVideosGrid = document.getElementById('relatedVideosGrid');
            relatedVideosGrid.innerHTML = '';
            
            await this.loadMoreRelatedVideos(currentVideo);
        } catch (error) {
            console.error('Error loading related videos:', error);
        }
    }

    async loadMoreRelatedVideos(currentVideo = null) {
        if (this.relatedVideosLoading || !this.relatedVideosHasMore) return;
        
        this.relatedVideosLoading = true;
        
        try {
            const params = new URLSearchParams({
                page: this.relatedVideosPage,
                limit: 12
            });
            
            if (currentVideo) {
                if (currentVideo.categories && currentVideo.categories.length > 0) {
                    params.append('category', currentVideo.categories[0]);
                } else if (currentVideo.artist) {
                    params.append('celebrity', currentVideo.artist);
                }
            }
            
            const response = await fetch(`/api/videos?${params}`);
            const data = await response.json();
            
            if (data.videos) {
                const relatedVideos = data.videos.filter(v => v.id !== this.currentVideoId);
                this.renderRelatedVideos(relatedVideos, this.relatedVideosPage === 1);
                
                this.relatedVideosHasMore = data.hasMore && relatedVideos.length > 0;
                this.relatedVideosPage++;
            }
        } catch (error) {
            console.error('Error loading more related videos:', error);
        } finally {
            this.relatedVideosLoading = false;
        }
    }

    renderRelatedVideos(videos, reset = false) {
        const relatedVideosGrid = document.getElementById('relatedVideosGrid');
        
        if (reset) {
            relatedVideosGrid.innerHTML = '';
        }
        
        videos.forEach(video => {
            const thumbnailUrl = video.thumbnailExists ? video.thumbnailUrl : 'https://images.pexels.com/photos/1181467/pexels-photo-1181467.jpeg?auto=compress&cs=tinysrgb&w=300';
            
            const relatedCard = document.createElement('div');
            relatedCard.className = 'related-video-card';
            relatedCard.dataset.videoId = video.id;
            relatedCard.innerHTML = `
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
            `;
            
            relatedCard.addEventListener('click', () => {
                this.openVideoModal(video);
                this.addToWatchHistory(video.id);
            });
            
            relatedVideosGrid.appendChild(relatedCard);
        });
    }

    closeVideoModal() {
        const modal = document.getElementById('videoModal');
        const modalVideo = document.getElementById('modalVideo');
        
        modal.classList.remove('active');
        modalVideo.pause();
        modalVideo.src = '';
        document.body.style.overflow = '';
        this.currentVideoId = null;
    }

    async toggleModalFavorite() {
        if (!this.currentVideoId) return;
        
        try {
            const isFavorite = this.favorites.has(this.currentVideoId);
            
            if (isFavorite) {
                this.favorites.delete(this.currentVideoId);
                this.showToast('Removed from favorites', 'success');
            } else {
                this.favorites.add(this.currentVideoId);
                this.showToast('Added to favorites', 'success');
            }
            
            this.saveToLocalStorage();
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

    updateUI() {
        this.updateFavoritesCount();
        this.setView(this.currentView);
        
        document.getElementById('sortSelect').value = this.currentFilter.sort;
    }

    showToast(message, type = 'info') {
        const toastContainer = document.getElementById('toastContainer');
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
        if (num >= 1000000) {
            return (num / 1000000).toFixed(1) + 'M';
        } else if (num >= 1000) {
            return (num / 1000).toFixed(1) + 'K';
        }
        return num.toString();
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new VideoApp();
});