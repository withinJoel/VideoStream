function showShareModal(video) {
    const modal = document.getElementById('shareModal');
    const shareLink = document.getElementById('shareLink');
    const embedCode = document.getElementById('embedCode');
    
    // Generate share link
    const videoUrl = `${window.location.origin}/video/${video.id}`;
    shareLink.value = videoUrl;
    
    // Generate embed code
    const embedHtml = `<iframe src="${window.location.origin}/embed/${video.id}" width="560" height="315" frameborder="0" allowfullscreen></iframe>`;
    embedCode.value = embedHtml;
    
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function hideShareModal() {
    const modal = document.getElementById('shareModal');
    modal.classList.remove('active');
    document.body.style.overflow = '';
}

function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        showToast('Copied to clipboard!', 'success');
    }).catch(() => {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        showToast('Copied to clipboard!', 'success');
    });
}

function shareOnSocial(platform, url, title) {
    const encodedUrl = encodeURIComponent(url);
    const encodedTitle = encodeURIComponent(title);
    let shareUrl = '';
    
    switch(platform) {
        case 'twitter':
            shareUrl = `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`;
            break;
        case 'facebook':
            shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
            break;
        case 'reddit':
            shareUrl = `https://reddit.com/submit?url=${encodedUrl}&title=${encodedTitle}`;
            break;
        case 'telegram':
            shareUrl = `https://t.me/share/url?url=${encodedUrl}&text=${encodedTitle}`;
            break;
    }
    
    if (shareUrl) {
        window.open(shareUrl, '_blank', 'width=600,height=400');
    }
}

// Setup share event listeners
document.addEventListener('DOMContentLoaded', function() {
    const shareModalClose = document.getElementById('shareModalClose');
    if (shareModalClose) {
        shareModalClose.addEventListener('click', hideShareModal);
    }
    
    const copyLinkBtn = document.getElementById('copyLinkBtn');
    if (copyLinkBtn) {
        copyLinkBtn.addEventListener('click', () => {
            const shareLink = document.getElementById('shareLink');
            copyToClipboard(shareLink.value);
        });
    }
    
    const copyEmbedBtn = document.getElementById('copyEmbedBtn');
    if (copyEmbedBtn) {
        copyEmbedBtn.addEventListener('click', () => {
            const embedCode = document.getElementById('embedCode');
            copyToClipboard(embedCode.value);
        });
    }
    
    // Social share buttons
    const shareTwitter = document.getElementById('shareTwitter');
    if (shareTwitter) {
        shareTwitter.addEventListener('click', () => {
            const url = document.getElementById('shareLink').value;
            const title = document.getElementById('modalVideoTitle').textContent;
            shareOnSocial('twitter', url, title);
        });
    }
    
    const shareFacebook = document.getElementById('shareFacebook');
    if (shareFacebook) {
        shareFacebook.addEventListener('click', () => {
            const url = document.getElementById('shareLink').value;
            shareOnSocial('facebook', url, '');
        });
    }
    
    const shareReddit = document.getElementById('shareReddit');
    if (shareReddit) {
        shareReddit.addEventListener('click', () => {
            const url = document.getElementById('shareLink').value;
            const title = document.getElementById('modalVideoTitle').textContent;
            shareOnSocial('reddit', url, title);
        });
    }
    
    const shareTelegram = document.getElementById('shareTelegram');
    if (shareTelegram) {
        shareTelegram.addEventListener('click', () => {
            const url = document.getElementById('shareLink').value;
            const title = document.getElementById('modalVideoTitle').textContent;
            shareOnSocial('telegram', url, title);
        });
    }
    
    // Modal share buttons
    const modalShareBtn = document.getElementById('modalShareBtn');
    if (modalShareBtn) {
        modalShareBtn.addEventListener('click', () => {
            if (currentVideoId) {
                const video = {
                    id: currentVideoId,
                    title: document.getElementById('modalVideoTitle').textContent
                };
                showShareModal(video);
            }
        });
    }
    
    const modalShareActionBtn = document.getElementById('modalShareActionBtn');
    if (modalShareActionBtn) {
        modalShareActionBtn.addEventListener('click', () => {
            if (currentVideoId) {
                const video = {
                    id: currentVideoId,
                    title: document.getElementById('modalVideoTitle').textContent
                };
                showShareModal(video);
            }
        });
    }
});