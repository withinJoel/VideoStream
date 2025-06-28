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
            'celebrity': 'Performers',
            'category': 'Categories',
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
        'celebrity': 'fa-user',
        'category': 'fa-tag',
        'history': 'fa-history'
    };
    return icons[type] || 'fa-search';
}

function applySuggestion(type, value, text) {
    if (type === 'celebrity') {
        handlePerformerClick(null, value);
    } else if (type === 'category') {
        handleCategoryClick(null, value);
    } else {
        currentFilters.search = text;
        document.getElementById('searchInput').value = text;
        currentPage = 1;
        hasMore = true;
        navigateToSection('home');
    }
    hideSearchSuggestions();
}