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
    setupVideoPlayer(videoElement, video);
    
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
    
    // Setup video analytics
    setupVideoAnalytics(video);
}

function setupVideoPlayer(videoElement, video) {
    // Clear existing sources
    videoElement.innerHTML = '';
    
    // Add single video source (since you only have one resolution)
    const source = document.createElement('source');
    source.src = `/api/video-stream/${video.id}`;
    source.type = 'video/mp4';
    videoElement.appendChild(source);
    
    // Add subtitles if available
    if (video.subtitles) {
        video.subtitles.forEach(subtitle => {
            const track = document.createElement('track');
            track.kind = 'subtitles';
            track.src = subtitle.url;
            track.srclang = subtitle.lang;
            track.label = subtitle.label;
            videoElement.appendChild(track);
        });
    }
    
    // Remove default controls and add custom controls
    videoElement.controls = false;
    
    // Setup video events
    setupVideoEvents(videoElement, video);
}

function setupVideoEvents(videoElement, video) {
    let watchTime = 0;
    let totalWatchTime = 0;
    
    // Track watch time
    videoElement.addEventListener('timeupdate', () => {
        watchTime = videoElement.currentTime;
        totalWatchTime += 0.25; // Approximate time increment
        
        // Save progress every 10 seconds
        if (Math.floor(watchTime) % 10 === 0) {
            saveWatchProgress(video.id, watchTime, videoElement.duration);
        }
    });
    
    // Track video completion
    videoElement.addEventListener('ended', () => {
        markVideoAsWatched(video.id);
        autoplayNextVideo();
    });
    
    // Track video interactions
    videoElement.addEventListener('play', () => {
        trackVideoEvent('play', video.id);
    });
    
    videoElement.addEventListener('pause', () => {
        trackVideoEvent('pause', video.id);
    });
    
    // Keyboard shortcuts
    videoElement.addEventListener('keydown', (e) => {
        handleVideoKeyboardShortcuts(e, videoElement);
    });
    
    // Double-click to fullscreen
    videoElement.addEventListener('dblclick', () => {
        toggleFullscreen(videoElement);
    });
    
    // Click to play/pause
    videoElement.addEventListener('click', () => {
        if (videoElement.paused) {
            videoElement.play();
        } else {
            videoElement.pause();
        }
    });
}

function handleVideoKeyboardShortcuts(e, videoElement) {
    switch(e.key) {
        case ' ':
        case 'k':
            e.preventDefault();
            if (videoElement.paused) {
                videoElement.play();
            } else {
                videoElement.pause();
            }
            break;
        case 'ArrowLeft':
            e.preventDefault();
            videoElement.currentTime = Math.max(0, videoElement.currentTime - 10);
            break;
        case 'ArrowRight':
            e.preventDefault();
            videoElement.currentTime = Math.min(videoElement.duration, videoElement.currentTime + 10);
            break;
        case 'ArrowUp':
            e.preventDefault();
            videoElement.volume = Math.min(1, videoElement.volume + 0.1);
            break;
        case 'ArrowDown':
            e.preventDefault();
            videoElement.volume = Math.max(0, videoElement.volume - 0.1);
            break;
        case 'm':
            e.preventDefault();
            videoElement.muted = !videoElement.muted;
            break;
        case 'f':
            e.preventDefault();
            toggleFullscreen(videoElement);
            break;
    }
}

function toggleFullscreen(videoElement) {
    if (!document.fullscreenElement) {
        videoElement.parentElement.requestFullscreen().catch(err => {
            console.error('Error attempting to enable fullscreen:', err);
        });
    } else {
        document.exitFullscreen();
    }
}

function togglePictureInPicture(videoElement) {
    if (document.pictureInPictureElement) {
        document.exitPictureInPicture();
    } else if (document.pictureInPictureEnabled) {
        videoElement.requestPictureInPicture().catch(error => {
            console.error('Failed to enter picture-in-picture mode:', error);
            showToast('Picture-in-picture not supported', 'error');
        });
    }
}

function toggleTheaterMode() {
    const modal = document.getElementById('videoModal');
    modal.classList.toggle('theater-mode');
    
    const theaterBtn = document.querySelector('.theater-btn i');
    if (modal.classList.contains('theater-mode')) {
        theaterBtn.className = 'fas fa-compress-arrows-alt';
    } else {
        theaterBtn.className = 'fas fa-expand-arrows-alt';
    }
}

function setupVideoAnalytics(video) {
    // Track video view
    fetch(`/api/analytics/view/${video.id}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            userId: isAuthenticated ? currentUser.id : null,
            timestamp: Date.now(),
            referrer: document.referrer,
            userAgent: navigator.userAgent
        })
    }).catch(console.error);
}

function trackVideoEvent(event, videoId) {
    fetch(`/api/analytics/event`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            event,
            videoId,
            userId: isAuthenticated ? currentUser.id : null,
            timestamp: Date.now()
        })
    }).catch(console.error);
}

function saveWatchProgress(videoId, currentTime, duration) {
    if (isAuthenticated) {
        fetch(`/api/watch-progress/${videoId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                userId: currentUser.id,
                currentTime,
                duration,
                percentage: (currentTime / duration) * 100
            })
        }).catch(console.error);
    }
}

function markVideoAsWatched(videoId) {
    if (isAuthenticated) {
        fetch(`/api/watched/${videoId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                userId: currentUser.id,
                completedAt: Date.now()
            })
        }).catch(console.error);
    }
}

function autoplayNextVideo() {
    if (currentSection === 'playlists' && currentPlaylistVideos.length > 0) {
        const currentIndex = currentPlaylistVideos.findIndex(v => v.id === currentVideoId);
        if (currentIndex < currentPlaylistVideos.length - 1) {
            const nextVideo = currentPlaylistVideos[currentIndex + 1];
            setTimeout(() => {
                closeVideoModal();
                setTimeout(() => openVideoModal(nextVideo), 500);
            }, 3000);
        }
    }
}

function closeVideoModal() {
    const modal = document.getElementById('videoModal');
    const video = document.getElementById('modalVideo');
    
    modal.classList.remove('active', 'theater-mode');
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
            userId: isAuthenticated ? currentUser.id : '',
            minDuration: currentFilters.minDuration || '',
            maxDuration: currentFilters.maxDuration || '',
            quality: currentFilters.quality || '',
            minRating: currentFilters.minRating || ''
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
    
    // Calculate watch progress
    const watchProgress = video.watchProgress || 0;
    const progressBar = watchProgress > 0 ? `<div class="watch-progress" style="width: ${watchProgress}%"></div>` : '';
    
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
            ${video.isNew ? '<div class="video-new-badge">NEW</div>' : ''}
            ${video.isWatched ? '<div class="video-watched-badge"><i class="fas fa-check"></i></div>' : ''}
            ${progressBar ? `<div class="video-progress-bar">${progressBar}</div>` : ''}
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
                ${video.uploadDate ? `
                <span class="video-stat">
                    <i class="fas fa-calendar"></i>
                    ${new Date(video.uploadDate).toLocaleDateString()}
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