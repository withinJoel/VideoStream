class VideoApp {
    constructor() {
        this.currentPage = 1;
        this.isLoading = false;
        this.hasMore = true;
        this.currentFilter = {
            search: '',
            celebrity: '',
            category: '',
            section: 'home'
        };
        this.isGridView = true;
        this.favorites = new Set();
        
        this.init();
    }

    async init() {
        this.setupEventListeners();
        await this.loadFavorites();
        await this.loadCategories();
        await this.loadPerformers();
        await this.loadVideos(true);
    }

    setupEventListeners() {
        // Menu toggle
        document.getElementById('menuToggle').addEventListener('click', () => {
            document.getElementById('sidebar').classList.toggle('collapsed');
        });

        // Home button
        document.getElementById('homeButton').addEventListener('click', () => {
            this.resetFilters();
            this.loadVideos(true);
        });

        // Search functionality
        const searchInput = document.getElementById('searchInput');
        const searchBtn = document.getElementById('searchBtn');
        
        searchInput.addEventListener('input', this.debounce(() => {
            this.handleSearch();
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

        // View toggle
        document.getElementById('viewToggle').addEventListener('click', () => {
            this.toggleView();
        });

        // Shuffle button
        document.getElementById('shuffleBtn').addEventListener('click', () => {
            this.shuffleVideos();
        });

        // Load more button
        document.getElementById('loadMoreBtn').addEventListener('click', () => {
            this.loadVideos(false);
        });

        // Navigation items
        document.addEventListener('click', (e) => {
            if (e.target.closest('.nav-item')) {
                e.preventDefault();
                const navItem = e.target.closest('.nav-item');
                this.handleNavigation(navItem);
            }
        });

        // Video modal
        document.getElementById('modalOverlay').addEventListener('click', () => {
            this.closeVideoModal();
        });
        
        document.getElementById('modalClose').addEventListener('click', () => {
            this.closeVideoModal();
        });

        // Modal favorite button
        document.getElementById('modalFavoriteBtn').addEventListener('click', () => {
            this.toggleModalFavorite();
        });

        // Close modal with Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeVideoModal();
            }
        });

        // Click outside search suggestions to close
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.search-container')) {
                document.getElementById('searchSuggestions').style.display = 'none';
            }
        });
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

    resetFilters() {
        this.currentFilter = {
            search: '',
            celebrity: '',
            category: '',
            section: 'home'
        };
        this.currentPage = 1;
        this.hasMore = true;
        
        // Clear search input
        document.getElementById('searchInput').value = '';
        
        // Update active nav item
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        document.querySelector('[data-section="home"]').classList.add('active');
        
        // Update content title
        document.getElementById('contentTitle').textContent = 'All Videos';
        document.getElementById('currentFilter').textContent = 'All';
    }

    async handleSearch() {
        const searchTerm = document.getElementById('searchInput').value.trim();
        this.currentFilter.search = searchTerm;
        this.currentFilter.celebrity = '';
        this.currentFilter.category = '';
        this.currentFilter.section = 'search';
        this.currentPage = 1;
        this.hasMore = true;
        
        // Update UI
        document.getElementById('contentTitle').textContent = searchTerm ? `Search: "${searchTerm}"` : 'All Videos';
        document.getElementById('currentFilter').textContent = searchTerm || 'All';
        
        // Update active nav
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        
        await this.loadVideos(true);
        
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

    handleNavigation(navItem) {
        // Remove active class from all nav items
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        
        // Add active class to clicked item
        navItem.classList.add('active');
        
        // Handle different navigation types
        if (navItem.dataset.section) {
            this.filterBySection(navItem.dataset.section);
        } else if (navItem.dataset.category) {
            this.filterByCategory(navItem.dataset.category);
        } else if (navItem.dataset.performer) {
            this.filterByPerformer(navItem.dataset.performer);
        }
    }

    filterBySection(section) {
        this.currentFilter = {
            search: '',
            celebrity: '',
            category: '',
            section: section
        };
        this.currentPage = 1;
        this.hasMore = true;
        
        // Update UI based on section
        let title = 'All Videos';
        let filter = 'All';
        
        switch (section) {
            case 'favorites':
                title = 'Favorite Videos';
                filter = 'Favorites';
                break;
            case 'trending':
                title = 'Trending Videos';
                filter = 'Trending';
                break;
            case 'new':
                title = 'New Videos';
                filter = 'New';
                break;
        }
        
        document.getElementById('contentTitle').textContent = title;
        document.getElementById('currentFilter').textContent = filter;
        document.getElementById('searchInput').value = '';
        
        this.loadVideos(true);
    }

    filterByCategory(category) {
        this.currentFilter = {
            search: '',
            celebrity: '',
            category: category === 'all' ? '' : category,
            section: 'category'
        };
        this.currentPage = 1;
        this.hasMore = true;
        
        const title = category === 'all' ? 'All Videos' : `Category: ${this.formatName(category)}`;
        const filter = category === 'all' ? 'All' : this.formatName(category);
        
        document.getElementById('contentTitle').textContent = title;
        document.getElementById('currentFilter').textContent = filter;
        document.getElementById('searchInput').value = '';
        
        this.loadVideos(true);
    }

    filterByPerformer(performer) {
        this.currentFilter = {
            search: '',
            celebrity: performer,
            category: '',
            section: 'performer'
        };
        this.currentPage = 1;
        this.hasMore = true;
        
        document.getElementById('contentTitle').textContent = `Performer: ${this.formatName(performer)}`;
        document.getElementById('currentFilter').textContent = this.formatName(performer);
        document.getElementById('searchInput').value = '';
        
        this.loadVideos(true);
    }

    toggleView() {
        this.isGridView = !this.isGridView;
        const videoGrid = document.getElementById('videoGrid');
        const viewToggle = document.getElementById('viewToggle');
        
        if (this.isGridView) {
            videoGrid.classList.remove('list-view');
            viewToggle.innerHTML = '<i class="fas fa-list"></i>';
            viewToggle.title = 'List View';
        } else {
            videoGrid.classList.add('list-view');
            viewToggle.innerHTML = '<i class="fas fa-th-large"></i>';
            viewToggle.title = 'Grid View';
        }
    }

    async shuffleVideos() {
        try {
            await fetch('/api/reshuffle', { method: 'POST' });
            this.currentPage = 1;
            this.hasMore = true;
            await this.loadVideos(true);
            
            // Show feedback
            const shuffleBtn = document.getElementById('shuffleBtn');
            shuffleBtn.innerHTML = '<i class="fas fa-check"></i>';
            setTimeout(() => {
                shuffleBtn.innerHTML = '<i class="fas fa-random"></i>';
            }, 1000);
        } catch (error) {
            console.error('Error shuffling videos:', error);
        }
    }

    async loadFavorites() {
        try {
            const response = await fetch('/api/favorites');
            const data = await response.json();
            this.favorites = new Set(data.favorites || []);
        } catch (error) {
            console.error('Error loading favorites:', error);
        }
    }

    async loadCategories() {
        try {
            const response = await fetch('/api/categories');
            const data = await response.json();
            
            const categoriesList = document.getElementById('categoriesList');
            const existingAll = categoriesList.querySelector('[data-category="all"]').parentElement;
            
            // Clear existing categories except "All Videos"
            categoriesList.innerHTML = '';
            categoriesList.appendChild(existingAll);
            
            // Add categories
            data.categories.forEach(category => {
                const li = document.createElement('li');
                li.innerHTML = `
                    <a href="#" class="nav-item" data-category="${category.name}">
                        <i class="fas fa-tag"></i> 
                        ${category.displayName} 
                        <span class="count">(${category.count})</span>
                    </a>
                `;
                categoriesList.appendChild(li);
            });
        } catch (error) {
            console.error('Error loading categories:', error);
        }
    }

    async loadPerformers() {
        try {
            const response = await fetch('/api/celebrities');
            const data = await response.json();
            
            const performersList = document.getElementById('performersList');
            performersList.innerHTML = '';
            
            data.celebrities.forEach(performer => {
                const li = document.createElement('li');
                li.innerHTML = `
                    <a href="#" class="nav-item" data-performer="${performer.name}">
                        <i class="fas fa-user"></i> 
                        ${performer.displayName} 
                        <span class="count">(${performer.videoCount})</span>
                    </a>
                `;
                performersList.appendChild(li);
            });
        } catch (error) {
            console.error('Error loading performers:', error);
        }
    }

    async loadVideos(reset = false) {
        if (this.isLoading) return;
        
        this.isLoading = true;
        const loading = document.getElementById('loading');
        const loadMoreBtn = document.getElementById('loadMoreBtn');
        const noResults = document.getElementById('noResults');
        
        if (reset) {
            this.currentPage = 1;
            document.getElementById('videoGrid').innerHTML = '';
            noResults.style.display = 'none';
        }
        
        loading.style.display = 'flex';
        loadMoreBtn.style.display = 'none';
        
        try {
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
            
            const response = await fetch(`/api/videos?${params}`);
            const data = await response.json();
            
            if (data.videos && data.videos.length > 0) {
                this.renderVideos(data.videos, reset);
                this.hasMore = data.hasMore;
                this.currentPage++;
                
                // Update video count
                document.getElementById('videoCount').textContent = `${data.total} videos`;
                
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
        } finally {
            this.isLoading = false;
            loading.style.display = 'none';
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
        
        card.innerHTML = `
            <div class="video-thumbnail">
                <img src="${video.thumbnailExists ? video.thumbnailUrl : '/placeholder-thumbnail.jpg'}" 
                     alt="${video.title}" 
                     loading="lazy"
                     onerror="this.src='/placeholder-thumbnail.jpg'">
                <div class="video-overlay">
                    <button class="play-btn">
                        <i class="fas fa-play"></i>
                    </button>
                    <button class="favorite-btn ${isFavorite ? 'active' : ''}" data-video-id="${video.id}">
                        <i class="fas fa-heart"></i>
                    </button>
                </div>
                ${video.duration ? `<div class="video-duration">${video.duration}</div>` : ''}
                ${video.quality ? `<div class="video-quality">${video.quality}</div>` : ''}
            </div>
            <div class="video-info">
                <h3 class="video-title">${video.title}</h3>
                <p class="video-artist">${video.artist}</p>
                ${video.categories ? `
                    <div class="video-categories">
                        ${video.categories.map(cat => `<span class="category-tag">${this.formatName(cat)}</span>`).join('')}
                    </div>
                ` : ''}
            </div>
        `;
        
        // Add event listeners
        const playBtn = card.querySelector('.play-btn');
        const thumbnail = card.querySelector('.video-thumbnail img');
        const favoriteBtn = card.querySelector('.favorite-btn');
        
        [playBtn, thumbnail].forEach(element => {
            element.addEventListener('click', () => {
                this.openVideoModal(video);
            });
        });
        
        favoriteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleFavorite(video.id, favoriteBtn);
        });
        
        return card;
    }

    async toggleFavorite(videoId, button) {
        try {
            const isFavorite = this.favorites.has(videoId);
            
            if (isFavorite) {
                await fetch(`/api/favorites/${videoId}`, { method: 'DELETE' });
                this.favorites.delete(videoId);
                button.classList.remove('active');
            } else {
                await fetch(`/api/favorites/${videoId}`, { method: 'POST' });
                this.favorites.add(videoId);
                button.classList.add('active');
            }
        } catch (error) {
            console.error('Error toggling favorite:', error);
        }
    }

    openVideoModal(video) {
        const modal = document.getElementById('videoModal');
        const modalVideo = document.getElementById('modalVideo');
        const modalTitle = document.getElementById('modalTitle');
        const modalArtist = document.getElementById('modalArtist');
        const modalDuration = document.getElementById('modalDuration');
        const modalQuality = document.getElementById('modalQuality');
        const modalCategories = document.getElementById('modalCategories');
        const modalFavoriteBtn = document.getElementById('modalFavoriteBtn');
        
        // Set video source
        modalVideo.src = video.videoUrl;
        modalVideo.load();
        
        // Set video info
        modalTitle.textContent = video.title;
        modalArtist.textContent = video.artist;
        modalDuration.textContent = video.duration || 'Unknown';
        modalQuality.textContent = video.quality || 'Unknown';
        
        // Set categories
        if (video.categories && video.categories.length > 0) {
            modalCategories.innerHTML = video.categories.map(cat => 
                `<span class="category-tag">${this.formatName(cat)}</span>`
            ).join('');
        } else {
            modalCategories.innerHTML = '';
        }
        
        // Set favorite button
        const isFavorite = this.favorites.has(video.id);
        modalFavoriteBtn.classList.toggle('active', isFavorite);
        modalFavoriteBtn.innerHTML = `
            <i class="fas fa-heart"></i>
            <span>${isFavorite ? 'Remove from Favorites' : 'Add to Favorites'}</span>
        `;
        modalFavoriteBtn.dataset.videoId = video.id;
        
        // Show modal
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    closeVideoModal() {
        const modal = document.getElementById('videoModal');
        const modalVideo = document.getElementById('modalVideo');
        
        modal.classList.remove('active');
        modalVideo.pause();
        modalVideo.src = '';
        document.body.style.overflow = '';
    }

    async toggleModalFavorite() {
        const modalFavoriteBtn = document.getElementById('modalFavoriteBtn');
        const videoId = modalFavoriteBtn.dataset.videoId;
        
        try {
            const isFavorite = this.favorites.has(videoId);
            
            if (isFavorite) {
                await fetch(`/api/favorites/${videoId}`, { method: 'DELETE' });
                this.favorites.delete(videoId);
                modalFavoriteBtn.classList.remove('active');
                modalFavoriteBtn.innerHTML = `
                    <i class="fas fa-heart"></i>
                    <span>Add to Favorites</span>
                `;
            } else {
                await fetch(`/api/favorites/${videoId}`, { method: 'POST' });
                this.favorites.add(videoId);
                modalFavoriteBtn.classList.add('active');
                modalFavoriteBtn.innerHTML = `
                    <i class="fas fa-heart"></i>
                    <span>Remove from Favorites</span>
                `;
            }
            
            // Update the corresponding card in the grid
            const videoCard = document.querySelector(`[data-video-id="${videoId}"]`);
            if (videoCard) {
                const cardFavoriteBtn = videoCard.querySelector('.favorite-btn');
                cardFavoriteBtn.classList.toggle('active', this.favorites.has(videoId));
            }
            
        } catch (error) {
            console.error('Error toggling favorite:', error);
        }
    }

    formatName(name) {
        return name.replace(/[_-]/g, ' ')
                   .split(' ')
                   .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                   .join(' ');
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new VideoApp();
});