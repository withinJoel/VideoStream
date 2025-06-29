let watchLaterVideos = [];

function loadWatchLaterVideos() {
    if (!isAuthenticated) {
        showNoResults('Login Required', 'Please login to view your watch later list');
        return;
    }
    
    fetch(`/api/watch-later/${currentUser.id}`)
        .then(response => response.json())
        .then(data => {
            watchLaterVideos = data.videos || [];
            if (watchLaterVideos.length > 0) {
                displayVideos(watchLaterVideos, true);
                updateVideoCount(watchLaterVideos.length);
            } else {
                showNoResults('No videos in watch later', 'Add videos to your watch later list to see them here');
            }
        })
        .catch(error => {
            console.error('Error loading watch later videos:', error);
            showToast('Failed to load watch later videos', 'error');
        });
}

function addToWatchLater(videoId) {
    if (!isAuthenticated) {
        showToast('Please login to add videos to watch later', 'error');
        return;
    }
    
    fetch(`/api/watch-later/${videoId}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ userId: currentUser.id })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showToast('Added to watch later', 'success');
            updateWatchLaterButton(videoId, true);
        } else {
            showToast(data.error || 'Failed to add to watch later', 'error');
        }
    })
    .catch(error => {
        console.error('Error adding to watch later:', error);
        showToast('Failed to add to watch later', 'error');
    });
}

function removeFromWatchLater(videoId) {
    if (!isAuthenticated) {
        return;
    }
    
    fetch(`/api/watch-later/${videoId}?userId=${currentUser.id}`, {
        method: 'DELETE'
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showToast('Removed from watch later', 'success');
            updateWatchLaterButton(videoId, false);
            
            // If we're on the watch later page, remove the video from the grid
            if (currentSection === 'watch-later') {
                const videoCard = document.querySelector(`[data-video-id="${videoId}"]`);
                if (videoCard) {
                    videoCard.remove();
                }
                watchLaterVideos = watchLaterVideos.filter(v => v.id !== videoId);
                updateVideoCount(watchLaterVideos.length);
            }
        } else {
            showToast(data.error || 'Failed to remove from watch later', 'error');
        }
    })
    .catch(error => {
        console.error('Error removing from watch later:', error);
        showToast('Failed to remove from watch later', 'error');
    });
}

function toggleWatchLater(videoId) {
    if (!isAuthenticated) {
        showToast('Please login to use watch later', 'error');
        return;
    }
    
    const btn = document.getElementById('modalWatchLaterBtn');
    const isInWatchLater = btn.classList.contains('active');
    
    if (isInWatchLater) {
        removeFromWatchLater(videoId);
    } else {
        addToWatchLater(videoId);
    }
}

function updateWatchLaterButton(videoId, isInWatchLater) {
    const btn = document.getElementById('modalWatchLaterBtn');
    if (btn && currentVideoId === videoId) {
        btn.classList.toggle('active', isInWatchLater);
        btn.title = isInWatchLater ? 'Remove from Watch Later' : 'Add to Watch Later';
    }
}

function checkWatchLaterStatus(videoId) {
    if (!isAuthenticated) return;
    
    fetch(`/api/watch-later/check/${videoId}?userId=${currentUser.id}`)
        .then(response => response.json())
        .then(data => {
            updateWatchLaterButton(videoId, data.isInWatchLater);
        })
        .catch(console.error);
}

// Setup watch later event listeners
document.addEventListener('DOMContentLoaded', function() {
    const modalWatchLaterBtn = document.getElementById('modalWatchLaterBtn');
    if (modalWatchLaterBtn) {
        modalWatchLaterBtn.addEventListener('click', () => {
            if (currentVideoId) {
                toggleWatchLater(currentVideoId);
            }
        });
    }
    
    const watchLaterBtn = document.getElementById('watchLaterBtn');
    if (watchLaterBtn) {
        watchLaterBtn.addEventListener('click', () => navigateToSection('watch-later'));
    }
});