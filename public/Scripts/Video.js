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

    // Add download button event listeners
    const downloadBtn = document.getElementById('modalDownloadBtn');
    if (downloadBtn) {
        downloadBtn.onclick = () => handleVideoDownload(video);
    }
    const downloadActionBtn = document.getElementById('modalDownloadActionBtn');
    if (downloadActionBtn) {
        downloadActionBtn.onclick = () => handleVideoDownload(video);
    }

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

function updateVideoCount(count) {
    document.getElementById('videoCount').textContent = `${formatNumber(count)} videos`;
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

// Infinite Scroll for Video Grid
(function setupInfiniteScroll() {
    const sentinel = document.getElementById('videoGridSentinel');
    const loadingSpinner = document.getElementById('videoGridLoading');
    if (!sentinel) return;

    let observer = new IntersectionObserver(async (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoading) {
            loadingSpinner.style.display = 'block';
            await loadVideos(false);
            loadingSpinner.style.display = 'none';
        }
    }, {
        root: null,
        rootMargin: '0px',
        threshold: 0.1
    });
    observer.observe(sentinel);

    // Reset observer on filter/search change
    window.addEventListener('videos:reset', () => {
        observer.disconnect();
        observer.observe(sentinel);
    });
})();