
async function loadUserPlaylists() {
    if (!isAuthenticated) {
        showPlaylistsAuthRequired();
        return;
    }
    
    try {
        showLoadingIndicator();
        const response = await fetch(`/api/playlists/${currentUser.id}`);
        const data = await response.json();
        displayPlaylists(data.playlists);
    } catch (error) {
        console.error('Error loading playlists:', error);
        showToast('Failed to load playlists', 'error');
    } finally {
        hideLoadingIndicator();
    }
}

function showCreatePlaylistModal() {
    if (!isAuthenticated) {
        showToast('Please login to create playlists', 'error');
        return;
    }
    
    document.getElementById('playlistModalTitle').textContent = 'Create New Playlist';
    document.getElementById('newPlaylistName').value = '';
    document.getElementById('playlistModal').classList.add('active');
    document.body.style.overflow = 'hidden';
}

function showPlaylistModal() {
    if (!isAuthenticated) {
        showToast('Please login to add to playlists', 'error');
        return;
    }
    
    document.getElementById('playlistModalTitle').textContent = 'Add to Playlist';
    loadExistingPlaylists();
    document.getElementById('playlistModal').classList.add('active');
    document.body.style.overflow = 'hidden';
}

function hidePlaylistModal() {
    document.getElementById('playlistModal').classList.remove('active');
    document.body.style.overflow = '';
}

async function handleCreatePlaylist() {
    const name = document.getElementById('newPlaylistName').value.trim();
    
    if (!name) {
        showToast('Please enter a playlist name', 'error');
        return;
    }
    if (!currentUser || !currentUser.id) {
        showToast('You must be logged in to create a playlist', 'error');
        return;
    }
    try {
        const response = await fetch('/api/playlists', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name,
                userId: currentUser.id,
                description: '',
                isPrivate: false
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            document.getElementById('newPlaylistName').value = '';
            showToast('Playlist created successfully!', 'success');
            
            // If we're adding a video to playlist, add it to the new playlist
            if (currentVideoId) {
                await addVideoToPlaylist(data.playlist.id);
            }
            
            // Refresh playlists if we're on the playlists page
            if (currentSection === 'playlists') {
                loadUserPlaylists();
            }
        } else {
            showToast(data.error || 'Failed to create playlist', 'error');
        }
    } catch (error) {
        console.error('Create playlist error:', error);
        showToast('Failed to create playlist', 'error');
    }
}

async function loadExistingPlaylists() {
    try {
        const response = await fetch(`/api/playlists/${currentUser.id}`);
        const data = await response.json();
        
        const container = document.getElementById('existingPlaylists');
        
        if (data.playlists && data.playlists.length > 0) {
            container.innerHTML = data.playlists.map(playlist => `
                <div class="playlist-item">
                    <div class="playlist-info">
                        <div class="playlist-name">${playlist.name}</div>
                        <div class="playlist-count">${playlist.videos.length} videos</div>
                    </div>
                    <button class="add-to-playlist-btn" onclick="addVideoToPlaylist('${playlist.id}')">
                        <i class="fas fa-plus"></i>
                        Add
                    </button>
                </div>
            `).join('');
        } else {
            container.innerHTML = '<div class="no-playlists">No playlists found. Create one above!</div>';
        }
    } catch (error) {
        console.error('Error loading playlists:', error);
    }
}

async function addVideoToPlaylist(playlistId) {
    if (!currentVideoId) {
        showToast('No video selected', 'error');
        return;
    }
    
    try {
        const response = await fetch(`/api/playlists/${playlistId}/videos`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                videoId: currentVideoId,
                userId: currentUser.id
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showToast('Video added to playlist!', 'success');
            hidePlaylistModal();
        } else {
            showToast(data.error || 'Failed to add video to playlist', 'error');
        }
    } catch (error) {
        console.error('Add to playlist error:', error);
        showToast('Failed to add video to playlist', 'error');
    }
}

async function loadPlaylistVideos(playlistId) {
    try {
        showLoadingIndicator();
        const response = await fetch(`/api/playlists/${playlistId}/videos`);
        const data = await response.json();
        
        if (data.videos && data.videos.length > 0) {
            // Update content header
            document.getElementById('contentTitle').textContent = `Playlist: ${data.playlist.name}`;
            document.getElementById('contentBreadcrumb').innerHTML = `Home / Playlists / ${data.playlist.name}`;
            
            // Show videos
            showVideoGrid();
            displayVideos(data.videos, true);
            updateVideoCount(data.total);
        } else {
            showNoResults('Empty Playlist', 'This playlist doesn\'t have any videos yet');
        }
    } catch (error) {
        console.error('Error loading playlist videos:', error);
        showToast('Failed to load playlist videos', 'error');
    } finally {
        hideLoadingIndicator();
    }
}

async function deletePlaylist(playlistId) {
    if (!confirm('Are you sure you want to delete this playlist?')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/playlists/${playlistId}?userId=${currentUser.id}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            showToast('Playlist deleted successfully', 'success');
            loadUserPlaylists();
        } else {
            showToast('Failed to delete playlist', 'error');
        }
    } catch (error) {
        console.error('Delete playlist error:', error);
        showToast('Failed to delete playlist', 'error');
    }
}