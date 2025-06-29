function handleSearchInput(e) {
    const query = e.target.value.trim();
    
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
        if (query.length >= 2) {
            loadSearchSuggestions(query);
            showSearchSuggestions();
        } else {
            hideSearchSuggestions();
        }
    }, 300);
}

function showSearchSuggestions() {
    const suggestions = document.getElementById('searchSuggestions');
    if (suggestions) {
        suggestions.style.display = 'block';
    }
}

function hideSearchSuggestions() {
    setTimeout(() => {
        const suggestions = document.getElementById('searchSuggestions');
        if (suggestions) {
            suggestions.style.display = 'none';
        }
    }, 200);
}

function performSearch() {
    const searchInput = document.getElementById('searchInput');
    if (!searchInput) return;
    
    const query = searchInput.value.trim();
    if (query) {
        currentFilters.search = query;
        currentPage = 1;
        hasMore = true;
        
        // Add to search history
        addToSearchHistory(query);
        
        navigateToSection('home');
        hideSearchSuggestions();
        window.dispatchEvent(new Event('videos:reset'));
    }
}

function addToSearchHistory(query) {
    fetch('/api/search-history', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ query })
    }).catch(console.error);
}

async function loadSearchSuggestions(query) {
    try {
        const response = await fetch(`/api/search/suggestions?q=${encodeURIComponent(query)}`);
        const data = await response.json();
        displaySearchSuggestions(data.suggestions);
    } catch (error) {
        console.error('Error loading search suggestions:', error);
    }
}

function displaySearchSuggestions(suggestions) {
    const container = document.getElementById('searchSuggestions');
    if (!container) return;
    
    if (suggestions.length === 0) {
        container.innerHTML = '<div class="suggestion-item">No suggestions found</div>';
        return;
    }
    
    const groupedSuggestions = suggestions.reduce((groups, suggestion) => {
        if (!groups[suggestion.type]) {
            groups[suggestion.type] = [];
        }
        groups[suggestion.type].push(suggestion);
        return groups;
    }, {});
    
    let html = '';
    
    Object.entries(groupedSuggestions).forEach(([type, items]) => {
        const typeLabels = {
            'video': 'Videos',
            'celebrity': 'Performers',
            'category': 'Categories',
            'tag': 'Tags',
            'history': 'Recent Searches'
        };
        
        html += `<div class="suggestion-header">${typeLabels[type] || type}</div>`;
        
        items.forEach(item => {
            html += `
                <div class="suggestion-item" onclick="applySuggestion('${item.type}', '${item.value}', '${item.text}')">
                    <div>
                        <i class="fas ${getSuggestionIcon(item.type)}"></i>
                        ${item.text}
                    </div>
                    ${item.count ? `<span class="suggestion-count">${item.count}</span>` : ''}
                </div>
            `;
        });
    });
    
    container.innerHTML = html;
}

function getSuggestionIcon(type) {
    const icons = {
        'video': 'fa-play',
        'celebrity': 'fa-user',
        'category': 'fa-tag',
        'tag': 'fa-hashtag',
        'history': 'fa-history'
    };
    return icons[type] || 'fa-search';
}

function applySuggestion(type, value, text) {
    if (type === 'celebrity') {
        handlePerformerClick(null, value);
    } else if (type === 'category' || type === 'tag') {
        handleCategoryClick(null, value);
    } else if (type === 'video') {
        // Search for specific video
        currentFilters.search = text;
        const searchInput = document.getElementById('searchInput');
        if (searchInput) searchInput.value = text;
        currentPage = 1;
        hasMore = true;
        navigateToSection('home');
    } else {
        currentFilters.search = text;
        const searchInput = document.getElementById('searchInput');
        if (searchInput) searchInput.value = text;
        currentPage = 1;
        hasMore = true;
        navigateToSection('home');
    }
    hideSearchSuggestions();
}

// Advanced search filters
function showAdvancedSearch() {
    const modal = document.getElementById('advancedSearchModal');
    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}

function hideAdvancedSearch() {
    const modal = document.getElementById('advancedSearchModal');
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }
}

function applyAdvancedSearch() {
    const form = document.getElementById('advancedSearchForm');
    if (!form) return;
    
    const formData = new FormData(form);
    
    // Build advanced search filters
    const advancedFilters = {
        search: formData.get('keywords') || '',
        celebrity: formData.get('performer') || '',
        category: formData.get('category') || '',
        minDuration: formData.get('minDuration') || '',
        maxDuration: formData.get('maxDuration') || '',
        quality: formData.get('quality') || '',
        minRating: formData.get('minRating') || '',
        dateRange: formData.get('dateRange') || '',
        sort: formData.get('sort') || 'random'
    };
    
    // Apply filters
    Object.assign(currentFilters, advancedFilters);
    currentPage = 1;
    hasMore = true;
    
    hideAdvancedSearch();
    navigateToSection('home');
    window.dispatchEvent(new Event('videos:reset'));
}

// Voice search functionality - Fixed with proper error handling
function initVoiceSearch() {
    // Check if speech recognition is supported
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
        console.log('Speech recognition not supported in this browser');
        return;
    }
    
    // Wait for DOM to be ready and search container to exist
    const searchContainer = document.querySelector('.search-container');
    if (!searchContainer) {
        console.log('Search container not found, voice search not initialized');
        return;
    }
    
    try {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'en-US';
        
        recognition.onresult = function(event) {
            const transcript = event.results[0][0].transcript;
            const searchInput = document.getElementById('searchInput');
            if (searchInput) {
                searchInput.value = transcript;
                performSearch();
            }
        };
        
        recognition.onerror = function(event) {
            console.error('Speech recognition error:', event.error);
            showToast('Voice search failed. Please try again.', 'error');
        };
        
        // Create voice search button
        const voiceBtn = document.createElement('button');
        voiceBtn.className = 'voice-search-btn';
        voiceBtn.innerHTML = '<i class="fas fa-microphone"></i>';
        voiceBtn.title = 'Voice Search';
        voiceBtn.onclick = () => {
            try {
                recognition.start();
                voiceBtn.classList.add('listening');
                setTimeout(() => voiceBtn.classList.remove('listening'), 3000);
            } catch (error) {
                console.error('Error starting voice recognition:', error);
                showToast('Voice search failed to start', 'error');
            }
        };
        
        // Safely append to search container
        searchContainer.appendChild(voiceBtn);
        console.log('Voice search initialized successfully');
        
    } catch (error) {
        console.error('Error initializing voice search:', error);
    }
}

// Initialize search enhancements - Fixed with proper timing
document.addEventListener('DOMContentLoaded', function() {
    // Wait for components to load before initializing voice search
    setTimeout(() => {
        initVoiceSearch();
    }, 1000);
});

// Also try to initialize when components are loaded
window.addEventListener('allComponentsLoaded', function() {
    setTimeout(() => {
        initVoiceSearch();
    }, 500);
});