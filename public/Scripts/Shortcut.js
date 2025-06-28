function handleKeyboardShortcuts(e) {
    // Escape key to close modals
    if (e.key === 'Escape') {
        if (document.getElementById('videoModal').classList.contains('active')) {
            closeVideoModal();
        } else if (document.getElementById('loginModal').classList.contains('active')) {
            hideAuthModal('login');
        } else if (document.getElementById('registerModal').classList.contains('active')) {
            hideAuthModal('register');
        } else if (document.getElementById('profileModal').classList.contains('active')) {
            hideProfileModal();
        } else if (document.getElementById('playlistModal').classList.contains('active')) {
            hidePlaylistModal();
        }
    }
    
    // Search shortcut (Ctrl/Cmd + K)
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        document.getElementById('searchInput').focus();
    }
}