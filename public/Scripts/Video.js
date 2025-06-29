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
    
    // Add to watch historyAdd commentMore actions
    addToWatchHistory(video.id);
    
    // Load related videos
    loadRelatedVideos(video);
    
    // Load comments
    loadComments(video.id);
}

function setupVideoPlayer(videoElement, video) {
    // Clear existing sources and controls
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
    
    // Setup custom video controls
    setupCustomVideoControls(videoElement, video);
    
    // Setup video events
    setupVideoEvents(videoElement, video);
    
    // Force the video element to reload the new source
    videoElement.load();
}

function setupCustomVideoControls(videoElement, video) {
    const videoContainer = videoElement.parentElement;
    
    // Remove existing custom controls
    const existingControls = videoContainer.querySelector('.custom-video-controls');
    if (existingControls) {
        existingControls.remove();
    }
    
    // Create custom controls container
    const controlsContainer = document.createElement('div');
    controlsContainer.className = 'custom-video-controls';
    
    controlsContainer.innerHTML = `
        <div class="video-controls-overlay">
            <!-- Progress Bar -->
            <div class="video-progress-container">
                <div class="video-progress-bar">
                    <div class="video-progress-buffer"></div>
                    <div class="video-progress-played"></div>
                    <div class="video-progress-handle"></div>
                </div>
                <div class="video-time-tooltip">0:00</div>
            </div>
            
            <!-- Main Controls -->
            <div class="video-controls-main">
                <div class="video-controls-left">
                    <button class="video-control-btn play-pause-btn" title="Play/Pause">
                        <i class="fas fa-play"></i>
                    </button>
                    <button class="video-control-btn volume-btn" title="Mute/Unmute">
                        <i class="fas fa-volume-up"></i>
                    </button>
                    <div class="volume-slider-container">
                        <div class="volume-slider">
                            <div class="volume-slider-track">
                                <div class="volume-slider-fill"></div>
                                <div class="volume-slider-handle"></div>
                            </div>
                        </div>
                    </div>
                    <div class="video-time-display">
                        <span class="current-time">0:00</span>
                        <span class="time-separator">/</span>
                        <span class="total-time">0:00</span>
                    </div>
                </div>
                
                <div class="video-controls-right">
                    <div class="speed-control-container">
                        <button class="video-control-btn speed-btn" title="Playback Speed">
                            <span class="speed-text">1x</span>
                        </button>
                        <div class="speed-menu">
                            <div class="speed-option" data-speed="0.25">0.25x</div>
                            <div class="speed-option" data-speed="0.5">0.5x</div>
                            <div class="speed-option" data-speed="0.75">0.75x</div>
                            <div class="speed-option active" data-speed="1">1x</div>
                            <div class="speed-option" data-speed="1.25">1.25x</div>
                            <div class="speed-option" data-speed="1.5">1.5x</div>
                            <div class="speed-option" data-speed="2">2x</div>
                        </div>
                    </div>
                    <button class="video-control-btn pip-btn" title="Picture in Picture">
                        <i class="fas fa-external-link-alt"></i>
                    </button>
                    <button class="video-control-btn theater-btn" title="Theater Mode">
                        <i class="fas fa-expand-arrows-alt"></i>
                    </button>
                    <button class="video-control-btn fullscreen-btn" title="Fullscreen">
                        <i class="fas fa-expand"></i>
                    </button>
                </div>
            </div>
        </div>
    `;
    
    videoContainer.appendChild(controlsContainer);
    
    // Setup control events
    setupControlEvents(controlsContainer, videoElement);
    
    // Auto-hide controls
    setupControlsAutoHide(videoContainer, controlsContainer);
}

function setupControlEvents(controlsContainer, videoElement) {
    // Play/Pause button
    const playPauseBtn = controlsContainer.querySelector('.play-pause-btn');
    const playPauseIcon = playPauseBtn.querySelector('i');
    
    playPauseBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (videoElement.paused) {
            videoElement.play();
            playPauseIcon.className = 'fas fa-pause';
        } else {
            videoElement.pause();
            playPauseIcon.className = 'fas fa-play';
        }
    });
    
    // Volume controls
    const volumeBtn = controlsContainer.querySelector('.volume-btn');
    const volumeIcon = volumeBtn.querySelector('i');
    const volumeSlider = controlsContainer.querySelector('.volume-slider');
    const volumeSliderFill = controlsContainer.querySelector('.volume-slider-fill');
    const volumeSliderHandle = controlsContainer.querySelector('.volume-slider-handle');
    
    volumeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        videoElement.muted = !videoElement.muted;
        updateVolumeIcon();
    });
    
    function updateVolumeIcon() {
        if (videoElement.muted || videoElement.volume === 0) {
            volumeIcon.className = 'fas fa-volume-mute';
        } else if (videoElement.volume < 0.5) {
            volumeIcon.className = 'fas fa-volume-down';
        } else {
            volumeIcon.className = 'fas fa-volume-up';
        }
    }
    
    // Volume slider
    let isDraggingVolume = false;
    
    volumeSlider.addEventListener('mousedown', (e) => {
        isDraggingVolume = true;
        updateVolume(e);
    });
    
    document.addEventListener('mousemove', (e) => {
        if (isDraggingVolume) {
            updateVolume(e);
        }
    });
    
    document.addEventListener('mouseup', () => {
        isDraggingVolume = false;
    });
    
    function updateVolume(e) {
        const rect = volumeSlider.getBoundingClientRect();
        const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        videoElement.volume = percent;
        videoElement.muted = false;
        volumeSliderFill.style.width = `${percent * 100}%`;
        volumeSliderHandle.style.left = `${percent * 100}%`;
        updateVolumeIcon();
    }
    
    // Progress bar
    const progressContainer = controlsContainer.querySelector('.video-progress-container');
    const progressBar = controlsContainer.querySelector('.video-progress-bar');
    const progressPlayed = controlsContainer.querySelector('.video-progress-played');
    const progressHandle = controlsContainer.querySelector('.video-progress-handle');
    const timeTooltip = controlsContainer.querySelector('.video-time-tooltip');
    
    let isDraggingProgress = false;
    
    progressBar.addEventListener('mousedown', (e) => {
        isDraggingProgress = true;
        updateProgress(e);
    });
    
    progressBar.addEventListener('mousemove', (e) => {
        if (!isDraggingProgress) {
            showTimeTooltip(e);
        }
    });
    
    progressBar.addEventListener('mouseleave', () => {
        timeTooltip.style.display = 'none';
    });
    
    document.addEventListener('mousemove', (e) => {
        if (isDraggingProgress) {
            updateProgress(e);
        }
    });
    
    document.addEventListener('mouseup', () => {
        isDraggingProgress = false;
    });
    
    function updateProgress(e) {
        const rect = progressBar.getBoundingClientRect();
        const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        const newTime = percent * videoElement.duration;
        
        if (!isNaN(newTime)) {
            videoElement.currentTime = newTime;
            updateProgressDisplay();
        }
    }
    
    function showTimeTooltip(e) {
        const rect = progressBar.getBoundingClientRect();
        const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        const time = percent * videoElement.duration;
        
        if (!isNaN(time)) {
            timeTooltip.textContent = formatTime(time);
            timeTooltip.style.display = 'block';
            timeTooltip.style.left = `${e.clientX - rect.left}px`;
        }
    }
    
    function updateProgressDisplay() {
        if (videoElement.duration) {
            const percent = (videoElement.currentTime / videoElement.duration) * 100;
            progressPlayed.style.width = `${percent}%`;
            progressHandle.style.left = `${percent}%`;
        }
    }
    
    // Time display
    const currentTimeDisplay = controlsContainer.querySelector('.current-time');
    const totalTimeDisplay = controlsContainer.querySelector('.total-time');
    
    function updateTimeDisplay() {
        currentTimeDisplay.textContent = formatTime(videoElement.currentTime);
        totalTimeDisplay.textContent = formatTime(videoElement.duration);
    }
    
    // Speed control
    const speedBtn = controlsContainer.querySelector('.speed-btn');
    const speedMenu = controlsContainer.querySelector('.speed-menu');
    const speedText = speedBtn.querySelector('.speed-text');
    
    speedBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        speedMenu.classList.toggle('active');
    });
    
    speedMenu.addEventListener('click', (e) => {
        e.stopPropagation();
        if (e.target.classList.contains('speed-option')) {
            const speed = parseFloat(e.target.dataset.speed);
            videoElement.playbackRate = speed;
            speedText.textContent = `${speed}x`;
            
            // Update active state
            speedMenu.querySelectorAll('.speed-option').forEach(opt => opt.classList.remove('active'));
            e.target.classList.add('active');
            
            speedMenu.classList.remove('active');
        }
    });
    
    // Picture in Picture
    const pipBtn = controlsContainer.querySelector('.pip-btn');
    pipBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        togglePictureInPicture(videoElement);
    });
    
    // Theater Mode
    const theaterBtn = controlsContainer.querySelector('.theater-btn');
    theaterBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleTheaterMode();
    });
    
    // Fullscreen
    const fullscreenBtn = controlsContainer.querySelector('.fullscreen-btn');
    const fullscreenIcon = fullscreenBtn.querySelector('i');
    fullscreenBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleFullscreen(videoElement);
    });
    
    // Update fullscreen icon
    document.addEventListener('fullscreenchange', () => {
        if (document.fullscreenElement) {
            fullscreenIcon.className = 'fas fa-compress';
        } else {
            fullscreenIcon.className = 'fas fa-expand';
        }
    });
    
    // Video event listeners
    videoElement.addEventListener('loadedmetadata', () => {
        updateTimeDisplay();
        updateProgressDisplay();
        // Set initial volume
        volumeSliderFill.style.width = `${videoElement.volume * 100}%`;
        volumeSliderHandle.style.left = `${videoElement.volume * 100}%`;
        updateVolumeIcon();
    });
    
    videoElement.addEventListener('timeupdate', () => {
        updateTimeDisplay();
        updateProgressDisplay();
    });
    
    videoElement.addEventListener('play', () => {
        playPauseIcon.className = 'fas fa-pause';
    });
    
    videoElement.addEventListener('pause', () => {
        playPauseIcon.className = 'fas fa-play';
    });
    
    videoElement.addEventListener('volumechange', () => {
        updateVolumeIcon();
    });
    
    // Close speed menu when clicking outside
    document.addEventListener('click', () => {
        speedMenu.classList.remove('active');
    });
}

function setupControlsAutoHide(videoContainer, controlsContainer) {
    let hideTimeout;
    let isControlsVisible = true;
    
    function showControls() {
        controlsContainer.classList.add('visible');
        isControlsVisible = true;
        clearTimeout(hideTimeout);
        
        hideTimeout = setTimeout(() => {
            if (!videoContainer.matches(':hover') && !document.querySelector('.speed-menu.active')) {
                hideControls();
            }
        }, 3000);
    }
    
    function hideControls() {
        controlsContainer.classList.remove('visible');
        isControlsVisible = false;
    }
    
    // Show controls on mouse move
    videoContainer.addEventListener('mousemove', showControls);
    videoContainer.addEventListener('mouseenter', showControls);
    
    // Keep controls visible when hovering over them
    controlsContainer.addEventListener('mouseenter', () => {
        clearTimeout(hideTimeout);
    });
    
    controlsContainer.addEventListener('mouseleave', () => {
        hideTimeout = setTimeout(hideControls, 1000);
    });
    
    // Show controls initially
    showControls();
}

function formatTime(seconds) {
    if (isNaN(seconds)) return '0:00';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    } else {
        return `${minutes}:${secs.toString().padStart(2, '0')}`;
    }
}

function setupVideoEvents(videoElement, video) {    
    // Track video completion
    videoElement.addEventListener('ended', () => {
        markVideoAsWatched(video.id);
        autoplayNextVideo();
    });
    
    // Keyboard shortcuts
    videoElement.addEventListener('keydown', (e) => {
        handleVideoKeyboardShortcuts(e, videoElement);
    });
    
    // Double-click to fullscreen
    videoElement.addEventListener('dblclick', () => {
        toggleFullscreen(videoElement);
    });
    
    // Click to play/pause (only if not clicking on controls)
    videoElement.addEventListener('click', (e) => {
        if (!e.target.closest('.custom-video-controls')) {
            if (videoElement.paused) {
                videoElement.play();
            } else {
                videoElement.pause();
            }
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
    // Do not set video.src = ''
    
    // Remove custom controls
    const customControls = modal.querySelector('.custom-video-controls');
    if (customControls) {
        customControls.remove();
    }
    
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

// Video hover preview functionality - Enhanced for AI recommendations
function setupVideoHoverPreview(card, video) {
    const thumbnail = card.querySelector('.video-thumbnail');
    const img = thumbnail.querySelector('img');
    
    let previewVideo = null;
    let isHovering = false;
    let previewTimeout = null;
    
    const startPreview = () => {
        if (previewVideo || !isHovering) return;
        
        // Create video element for preview
        previewVideo = document.createElement('video');
        previewVideo.className = 'hover-preview-video';
        previewVideo.muted = true;
        previewVideo.loop = true;
        previewVideo.preload = 'metadata';
        previewVideo.style.opacity = '0';
        previewVideo.style.transition = 'opacity 0.3s ease';
        
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
        if (previewTimeout) {
            clearTimeout(previewTimeout);
            previewTimeout = null;
        }
        
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
        
        // Start preview after a delay (longer for AI recommendations to show explanation)
        const delay = card.classList.contains('ai-recommended') ? 1200 : 800;
        previewTimeout = setTimeout(startPreview, delay);
    });
    
    // Mouse leave event
    card.addEventListener('mouseleave', () => {
        isHovering = false;
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
            ${video.isNew ? '<div class="video-new-badge">NEW</div>' : ''}
            ${video.isWatched ? '<div class="video-watched-badge"><i class="fas fa-check"></i></div>' : ''}
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