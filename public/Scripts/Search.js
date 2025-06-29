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
    document.getElementById('searchSuggestions').style.display = 'block';
}

function hideSearchSuggestions() {
    setTimeout(() => {
        document.getElementById('searchSuggestions').style.display = 'none';
    }, 200);
}

function performSearch() {
    const query = document.getElementById('searchInput').value.trim();
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
        document.getElementById('searchInput').value = text;
        currentPage = 1;
        hasMore = true;
        navigateToSection('home');
    } else {
        currentFilters.search = text;
        document.getElementById('searchInput').value = text;
        currentPage = 1;
        hasMore = true;
        navigateToSection('home');
    }
    hideSearchSuggestions();
}

// Advanced search filters
function showAdvancedSearch() {
    const modal = document.getElementById('advancedSearchModal');
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function hideAdvancedSearch() {
    const modal = document.getElementById('advancedSearchModal');
    modal.classList.remove('active');
    document.body.style.overflow = '';
}

function applyAdvancedSearch() {
    const form = document.getElementById('advancedSearchForm');
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

// Voice search functionality
function initVoiceSearch() {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'en-US';
        
        recognition.onresult = function(event) {
            const transcript = event.results[0][0].transcript;
            document.getElementById('searchInput').value = transcript;
            performSearch();
        };
        
        recognition.onerror = function(event) {
            console.error('Speech recognition error:', event.error);
            showToast('Voice search failed. Please try again.', 'error');
        };
        
        // Add voice search button
        const voiceBtn = document.createElement('button');
        voiceBtn.className = 'voice-search-btn';
        voiceBtn.innerHTML = '<i class="fas fa-microphone"></i>';
        voiceBtn.title = 'Voice Search';
        voiceBtn.onclick = () => {
            recognition.start();
            voiceBtn.classList.add('listening');
            setTimeout(() => voiceBtn.classList.remove('listening'), 3000);
        };
        
        const searchContainer = document.querySelector('.search-container');
        searchContainer.appendChild(voiceBtn);
    }
}

// Search filters and sorting
function addSearchFilters() {
    const filterContainer = document.createElement('div');
    filterContainer.className = 'search-filters';
    filterContainer.innerHTML = `
        <div class="search-filter-group">
            <label>Duration:</label>
            <select id="durationFilter">
                <option value="">Any</option>
                <option value="short">Short (< 10 min)</option>
                <option value="medium">Medium (10-30 min)</option>
                <option value="long">Long (> 30 min)</option>
            </select>
        </div>
        <div class="search-filter-group">
            <label>Quality:</label>
            <select id="qualityFilter">
                <option value="">Any</option>
                <option value="HD">HD</option>
                <option value="4K">4K</option>
                <option value="VR">VR</option>
            </select>
        </div>
        <div class="search-filter-group">
            <label>Rating:</label>
            <select id="ratingFilter">
                <option value="">Any</option>
                <option value="4+">4+ Stars</option>
                <option value="3+">3+ Stars</option>
                <option value="2+">2+ Stars</option>
            </select>
        </div>
    `;
    
    const contentHeader = document.querySelector('.content-header');
    contentHeader.appendChild(filterContainer);
}

// Initialize search enhancements
document.addEventListener('DOMContentLoaded', function() {
    initVoiceSearch();
    addSearchFilters();
});