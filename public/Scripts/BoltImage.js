// Bolt Image functionality
function initializeBoltImage() {
    const boltContainer = document.getElementById('boltImageContainer');
    const boltImage = document.getElementById('boltImage');
    
    if (!boltContainer || !boltImage) {
        console.warn('Bolt image elements not found');
        return;
    }
    
    // Add click handler for Bolt image
    boltContainer.addEventListener('click', handleBoltImageClick);
    
    // Add error handler for image loading
    boltImage.addEventListener('error', handleBoltImageError);
    
    // Add load handler for successful image loading
    boltImage.addEventListener('load', handleBoltImageLoad);
    
    console.log('Bolt image initialized successfully');
}

function handleBoltImageClick() {
    // You can customize this behavior
    // For example, show information about Bolt, open a link, etc.
    showToast('Powered by Bolt - AI-powered development platform', 'info');
    
    // Optional: Add a subtle animation on click
    const boltContainer = document.getElementById('boltImageContainer');
    if (boltContainer) {
        boltContainer.style.transform = 'translateY(-4px) scale(1.1)';
        setTimeout(() => {
            boltContainer.style.transform = '';
        }, 200);
    }
}

function handleBoltImageError() {
    console.warn('Failed to load Bolt image');
    // Hide the container if image fails to load
    const boltContainer = document.getElementById('boltImageContainer');
    if (boltContainer) {
        boltContainer.style.display = 'none';
    }
}

function handleBoltImageLoad() {
    console.log('Bolt image loaded successfully');
    // Ensure container is visible
    const boltContainer = document.getElementById('boltImageContainer');
    if (boltContainer) {
        boltContainer.style.display = 'block';
    }
}

// Initialize when component is loaded
window.addEventListener('componentLoaded', function(event) {
    if (event.detail.componentName === 'bolt-image') {
        initializeBoltImage();
    }
});

// Fallback initialization
document.addEventListener('DOMContentLoaded', function() {
    // Wait a bit for components to load
    setTimeout(initializeBoltImage, 1000);
});

// Export functions for external use
window.BoltImage = {
    initialize: initializeBoltImage,
    handleClick: handleBoltImageClick
};