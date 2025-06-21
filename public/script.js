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
            sort: 'random',
            duration: '',
            quality: ''
        };
        this.currentView = 'grid';
        this.favorites = new Set();
        this.likes = new Set();
        this.dislikes = new Set();
        this.viewHistory = [];
        this.currentVideoId = null;
        
        // Statistics
        this.stats = {
            totalVideos: 0,
            totalPerformers: 0,
            totalCategories: 0
        };
        
        this.init();
    }

    async init() {
        this.setupEventListeners();
        await this.loadInitialData();
        this.updateUI();
    }

    async loadInitialData() {
        try {
            await Promise.all([
                this.loadFavorites(),
                this.loadCategories(),
                this.loadPerformers(),
                this.loadStats()
            ]);
            
            // Load videos after initial data is loaded
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

        // Search functionality
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
                    // Close mobile nav if open
                    document.getElementById('mobileNav').classList.remove('active');
                }
            }
        });

        // Filter controls
        document.getElementById('sortSelect').addEventListener('change', (e) => {
            this.currentFilter.sort = e.target.value;
            this.applyFilters();
        });

        document.getElementById('durationSelect').addEventListener('change', (e) => {
            this.currentFilter.duration = e.target.value;
            this.applyFilters();
        });

        document.getElementById('qualitySelect').addEventListener('change', (e) => {
            this.currentFilter.quality = e.target.value;
            this.applyFilters();
        });

        // View toggle
        document.getElementById('viewToggleBtn').addEventListener('click', () => {
            this.toggleView();
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

        // Load more button
        document.getElementById('loadMoreBtn').addEventListener('click', () => {
            this.loadVideos(false);
        });

        // Favorites button
        document.getElementById('favoritesBtn').addEventListener('click', () => {
            this.navigateToSection('favorites');
        });

        // Favorites dropdown button
        document.getElementById('favoritesDropdownBtn').addEventListener('click', (e) => {
            e.preventDefault();
            this.navigateToSection('favorites');
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

        document.getElementById('modalLikeBtn').addEventListener('click', () => {
            this.toggleModalLike();
        });

        document.getElementById('modalDislikeBtn').addEventListener('click', () => {
            this.toggleModalDislike();
        });

        document.getElementById('modalFavBtn').addEventListener('click', () => {
            this.toggleModalFavorite();
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

        // Infinite scroll (optional)
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

    async loadStats() {
        try {
            const response = await fetch('/api/stats');
            const data = await response.json();
            
            this.stats.totalVideos = data.totalVideos || 0;
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

        // Add click handlers
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

        // Add click handlers
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

        // Add click handlers
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

        // Add click handlers
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
        // Update active nav items
        document.querySelectorAll('.nav-link, .mobile-nav-link').forEach(link => {
            link.classList.remove('active');
        });
        
        document.querySelectorAll(`[data-section="${section}"]`).forEach(link => {
            link.classList.add('active');
        });

        // Reset filters and set section
        this.currentFilter = {
            search: '',
            celebrity: '',
            category: '',
            section: section,
            sort: 'random',
            duration: '',
            quality: ''
        };
        
        this.currentPage = 1;
        this.hasMore = true;

        // Update UI based on section
        this.updateContentForSection(section);
        
        // Clear search input
        document.getElementById('searchInput').value = '';
        
        // Load content
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
                break;
            case 'new':
                title = 'New Videos';
                breadcrumb = 'Home / New';
                break;
            case 'top-rated':
                title = 'Top Rated Videos';
                breadcrumb = 'Home / Top Rated';
                break;
            case 'favorites':
                title = 'Favorite Videos';
                breadcrumb = 'Home / Favorites';
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
        document.getElementById('loadMoreBtn').style.display = 'none';
        document.getElementById('noResults').style.display = 'none';
    }

    showPerformersGrid() {
        document.getElementById('filterBar').style.display = 'none';
        document.getElementById('videoGrid').style.display = 'none';
        document.getElementById('categoriesGrid').style.display = 'none';
        document.getElementById('performersGrid').style.display = 'grid';
        document.getElementById('loadMoreBtn').style.display = 'none';
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
            sort: this.currentFilter.sort,
            duration: this.currentFilter.duration,
            quality: this.currentFilter.quality
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
            sort: this.currentFilter.sort,
            duration: this.currentFilter.duration,
            quality: this.currentFilter.quality
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
        } else {
            document.getElementById('searchSuggestions').style.display = 'none';
        }
    }

    handleSearch() {
        const searchTerm = document.getElementById('searchInput').value.trim();
        
        this.currentFilter = {
            search: searchTerm,
            celebrity: '',
            category: '',
            section: 'search',
            sort: this.currentFilter.sort,
            duration: this.currentFilter.duration,
            quality: this.currentFilter.quality
        };
        
        this.currentPage = 1;
        this.hasMore = true;
        
        // Update UI
        const title = searchTerm ? `Search: "${searchTerm}"` : 'All Videos';
        const breadcrumb = searchTerm ? `<span>Home</span><span>Search</span><span>"${searchTerm}"</span>` : '<span>Home</span>';
        
        document.getElementById('contentTitle').textContent = title;
        document.getElementById('contentBreadcrumb').innerHTML = breadcrumb;
        
        // Update active nav
        document.querySelectorAll('.nav-link, .mobile-nav-link').forEach(item => {
            item.classList.remove('active');
        });
        
        this.showVideoGrid();
        this.loadVideos(true);
        
        // Hide search suggestions
        document.getElementById('searchSuggestions').style.display = 'none';
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
                        <i class="fas fa-${suggestion.type === 'celebrity' ? 'user' : 'tag'}"></i>
                        <span>${suggestion.text}</span>
                    </div>
                `).join('');
                
                suggestionsContainer.style.display = 'block';
                
                // Add click handlers to suggestions
                suggestionsContainer.querySelectorAll('.suggestion-item').forEach(item => {
                    item.addEventListener('click', () => {
                        const type = item.dataset.type;
                        const value = item.dataset.value;
                        
                        if (type === 'celebrity') {
                            this.filterByPerformer(value);
                        } else if (type === 'category') {
                            this.filterByCategory(value);
                        } else {
                            document.getElementById('searchInput').value = item.textContent.trim();
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
            sort: 'random',
            duration: '',
            quality: ''
        };
        
        // Reset UI
        document.getElementById('searchInput').value = '';
        document.getElementById('sortSelect').value = 'random';
        document.getElementById('durationSelect').value = '';
        document.getElementById('qualitySelect').value = '';
        
        this.navigateToSection('home');
    }

    toggleView() {
        this.currentView = this.currentView === 'grid' ? 'list' : 'grid';
        this.setView(this.currentView);
    }

    setView(view) {
        this.currentView = view;
        const videoGrid = document.getElementById('videoGrid');
        const viewOptions = document.querySelectorAll('.view-option');
        const viewToggleBtn = document.getElementById('viewToggleBtn');
        
        // Update grid class
        if (view === 'list') {
            videoGrid.classList.add('list-view');
            viewToggleBtn.innerHTML = '<i class="fas fa-th"></i>';
        } else {
            videoGrid.classList.remove('list-view');
            viewToggleBtn.innerHTML = '<i class="fas fa-list"></i>';
        }
        
        // Update view option buttons
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
                
                // Show feedback
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
        const loadMoreBtn = document.getElementById('loadMoreBtn');
        const noResults = document.getElementById('noResults');
        
        if (reset) {
            this.currentPage = 1;
            document.getElementById('videoGrid').innerHTML = '';
            noResults.style.display = 'none';
        }
        
        loadingContainer.style.display = 'flex';
        loadMoreBtn.style.display = 'none';
        
        try {
            const params = new URLSearchParams({
                page: this.currentPage,
                limit: 20
            });
            
            // Add filters
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
            
            // Add sorting and filtering
            if (this.currentFilter.sort && this.currentFilter.sort !== 'random') {
                params.append('sort', this.currentFilter.sort);
            }
            
            if (this.currentFilter.duration) {
                params.append('duration', this.currentFilter.duration);
            }
            
            if (this.currentFilter.quality) {
                params.append('quality', this.currentFilter.quality);
            }
            
            const response = await fetch(`/api/videos?${params}`);
            const data = await response.json();
            
            if (data.videos && data.videos.length > 0) {
                this.renderVideos(data.videos, reset);
                this.hasMore = data.hasMore;
                this.currentPage++;
                
                // Update video count
                document.getElementById('videoCount').textContent = `${this.formatNumber(data.total)} videos`;
                
                if (this.hasMore) {
                    loadMoreBtn.style.display = 'block';
                }
            } else if (reset) {
                noResults.style.display = 'block';
                document.getElementById('videoCount').textContent = '0 videos';
            }
            
        } catch (error) {
            console.error('Error loading videos:', error);
            if (reset) {
                noResults.style.display = 'block';
            }
            this.showToast('Error loading videos', 'error');
        } finally {
            this.isLoading = false;
            loadingContainer.style.display = 'none';
        }
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
        
        // Generate random stats for demo
        const views = Math.floor(Math.random() * 1000000) + 1000;
        const likes = Math.floor(Math.random() * 10000) + 100;
        
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
            </div>
            <div class="video-info">
                <h3 class="video-title">${video.title}</h3>
                <a href="#" class="video-performer" data-performer="${video.artist}">${video.artist}</a>
                <div class="video-stats">
                    <span class="video-stat">
                        <i class="fas fa-eye"></i>
                        ${this.formatNumber(views)}
                    </span>
                    <span class="video-stat">
                        <i class="fas fa-thumbs-up"></i>
                        ${this.formatNumber(likes)}
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
        
        // Add event listeners
        const playBtn = card.querySelector('.play-btn');
        const thumbnail = card.querySelector('.video-thumbnail img');
        const favoriteBtn = card.querySelector('.video-favorite-btn');
        const performerLink = card.querySelector('.video-performer');
        
        [playBtn, thumbnail].forEach(element => {
            element.addEventListener('click', () => {
                this.openVideoModal(video, views, likes);
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
        document.getElementById('favoritesBtn').querySelector('.favorites-count').textContent = this.favorites.size;
    }

    openVideoModal(video, views = 0, likes = 0) {
        this.currentVideoId = video.id;
        
        const modal = document.getElementById('videoModal');
        const modalVideo = document.getElementById('modalVideo');
        const modalVideoTitle = document.getElementById('modalVideoTitle');
        const modalVideoPerformer = document.getElementById('modalVideoPerformer');
        const modalVideoViews = document.getElementById('modalVideoViews');
        const modalVideoLikes = document.getElementById('modalVideoLikes');
        const modalVideoDuration = document.getElementById('modalVideoDuration');
        const modalVideoQuality = document.getElementById('modalVideoQuality');
        const modalVideoCategories = document.getElementById('modalVideoCategories');
        
        // Set video source
        modalVideo.src = video.videoUrl;
        modalVideo.load();
        
        // Set video info
        modalVideoTitle.textContent = video.title;
        modalVideoPerformer.textContent = video.artist;
        modalVideoPerformer.dataset.performer = video.artist;
        modalVideoViews.textContent = this.formatNumber(views);
        modalVideoLikes.textContent = this.formatNumber(likes);
        modalVideoDuration.textContent = video.duration || 'Unknown';
        modalVideoQuality.textContent = video.quality || 'HD';
        
        // Set categories
        if (video.categories && video.categories.length > 0) {
            modalVideoCategories.innerHTML = video.categories.map(cat => 
                `<span class="category-tag" data-category="${cat}">${this.formatName(cat)}</span>`
            ).join('');
            
            // Add click handlers to category tags
            modalVideoCategories.querySelectorAll('.category-tag').forEach(tag => {
                tag.addEventListener('click', () => {
                    this.closeVideoModal();
                    this.filterByCategory(tag.dataset.category);
                });
            });
        } else {
            modalVideoCategories.innerHTML = '';
        }
        
        // Update action buttons
        this.updateModalActionButtons();
        
        // Load related videos
        this.loadRelatedVideos(video);
        
        // Show modal
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
        
        // Add to view history
        this.addToViewHistory(video.id);
    }

    updateModalActionButtons() {
        const videoId = this.currentVideoId;
        const isFavorite = this.favorites.has(videoId);
        const isLiked = this.likes.has(videoId);
        const isDisliked = this.dislikes.has(videoId);
        
        // Update favorite buttons
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
        
        // Update like/dislike buttons
        const likeBtn = document.getElementById('modalLikeBtn');
        const dislikeBtn = document.getElementById('modalDislikeBtn');
        
        likeBtn.classList.toggle('active', isLiked);
        dislikeBtn.classList.toggle('active', isDisliked);
    }

    async loadRelatedVideos(currentVideo) {
        try {
            // Load videos from the same category or performer
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
                // Filter out current video
                const relatedVideos = data.videos.filter(v => v.id !== currentVideo.id).slice(0, 10);
                this.renderRelatedVideos(relatedVideos);
            }
        } catch (error) {
            console.error('Error loading related videos:', error);
        }
    }

    renderRelatedVideos(videos) {
        const relatedVideosGrid = document.getElementById('relatedVideosGrid');
        relatedVideosGrid.innerHTML = videos.map(video => {
            const thumbnailUrl = video.thumbnailExists ? video.thumbnailUrl : 'https://images.pexels.com/photos/1181467/pexels-photo-1181467.jpeg?auto=compress&cs=tinysrgb&w=300';
            
            return `
                <div class="related-video-card" data-video-id="${video.id}">
                    <div class="related-video-thumbnail">
                        <img src="${thumbnailUrl}" alt="${video.title}" loading="lazy">
                        ${video.duration ? `<div class="video-duration">${video.duration}</div>` : ''}
                    </div>
                    <div class="related-video-info">
                        <div class="related-video-title">${video.title}</div>
                        <div class="related-video-performer">${video.artist}</div>
                    </div>
                </div>
            `;
        }).join('');
        
        // Add click handlers
        relatedVideosGrid.querySelectorAll('.related-video-card').forEach(card => {
            card.addEventListener('click', () => {
                const videoId = card.dataset.videoId;
                const video = videos.find(v => v.id === videoId);
                if (video) {
                    this.openVideoModal(video, Math.floor(Math.random() * 1000000) + 1000, Math.floor(Math.random() * 10000) + 100);
                }
            });
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
            
            // Update the corresponding card in the grid
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

    toggleModalLike() {
        if (!this.currentVideoId) return;
        
        const isLiked = this.likes.has(this.currentVideoId);
        
        if (isLiked) {
            this.likes.delete(this.currentVideoId);
        } else {
            this.likes.add(this.currentVideoId);
            // Remove from dislikes if present
            this.dislikes.delete(this.currentVideoId);
        }
        
        this.updateModalActionButtons();
        this.showToast(isLiked ? 'Like removed' : 'Video liked', 'success');
    }

    toggleModalDislike() {
        if (!this.currentVideoId) return;
        
        const isDisliked = this.dislikes.has(this.currentVideoId);
        
        if (isDisliked) {
            this.dislikes.delete(this.currentVideoId);
        } else {
            this.dislikes.add(this.currentVideoId);
            // Remove from likes if present
            this.likes.delete(this.currentVideoId);
        }
        
        this.updateModalActionButtons();
        this.showToast(isDisliked ? 'Dislike removed' : 'Video disliked', 'success');
    }

    addToViewHistory(videoId) {
        // Remove if already exists
        this.viewHistory = this.viewHistory.filter(id => id !== videoId);
        // Add to beginning
        this.viewHistory.unshift(videoId);
        // Keep only last 50 items
        this.viewHistory = this.viewHistory.slice(0, 50);
    }

    updateUI() {
        // Update any UI elements that need initial state
        this.updateFavoritesCount();
        
        // Set initial view
        this.setView(this.currentView);
        
        // Update filter selects
        document.getElementById('sortSelect').value = this.currentFilter.sort;
        document.getElementById('durationSelect').value = this.currentFilter.duration;
        document.getElementById('qualitySelect').value = this.currentFilter.quality;
    }

    showToast(message, type = 'info') {
        const toastContainer = document.getElementById('toastContainer');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        
        toastContainer.appendChild(toast);
        
        // Remove after 3 seconds
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