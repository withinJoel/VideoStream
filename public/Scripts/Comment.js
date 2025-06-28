
function showCommentActions() {
    if (!isAuthenticated) {
        showToast('Please login to comment', 'error');
        document.getElementById('commentInput').blur();
        return;
    }
    
    document.getElementById('commentActions').style.display = 'flex';
}

function hideCommentActions() {
    document.getElementById('commentActions').style.display = 'none';
    document.getElementById('commentInput').value = '';
}

async function submitComment() {
    if (!isAuthenticated) {
        showToast('Please login to comment', 'error');
        return;
    }
    
    const text = document.getElementById('commentInput').value.trim();
    
    if (!text) {
        showToast('Please enter a comment', 'error');
        return;
    }
    
    if (!currentVideoId) {
        showToast('No video selected', 'error');
        return;
    }
    
    try {
        const response = await fetch(`/api/comments/${currentVideoId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                userId: currentUser.id,
                text: text
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showToast('Comment posted successfully!', 'success');
            hideCommentActions();
            loadComments(currentVideoId); // Reload comments
        } else {
            showToast(data.error || 'Failed to post comment', 'error');
        }
    } catch (error) {
        console.error('Comment error:', error);
        showToast('Failed to post comment', 'error');
    }
}

async function loadComments(videoId) {
    try {
        const response = await fetch(`/api/comments/${videoId}?page=1&limit=10&sort=newest`);
        const data = await response.json();
        
        displayComments(data.comments);
        document.getElementById('commentCount').textContent = data.total;
    } catch (error) {
        console.error('Error loading comments:', error);
    }
}

function displayComments(comments) {
    const container = document.getElementById('commentsList');
    
    if (!comments || comments.length === 0) {
        container.innerHTML = '<div class="no-comments">No comments yet. Be the first to comment!</div>';
        return;
    }
    
    container.innerHTML = comments.map(comment => `
        <div class="comment">
            <img src="${comment.avatar}" alt="${comment.username}" class="comment-avatar">
            <div class="comment-content">
                <div class="comment-header">
                    <span class="comment-author">${comment.username}</span>
                    <span class="comment-date">${new Date(comment.createdAt).toLocaleDateString()}</span>
                </div>
                <p class="comment-text">${comment.text}</p>
                <div class="comment-actions">
                    <button class="comment-like-btn">
                        <i class="fas fa-thumbs-up"></i>
                        ${comment.likes}
                    </button>
                    <button class="comment-dislike-btn">
                        <i class="fas fa-thumbs-down"></i>
                        ${comment.dislikes}
                    </button>
                    <button class="comment-reply-btn">
                        <i class="fas fa-reply"></i>
                        Reply
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}