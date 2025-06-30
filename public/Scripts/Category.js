function getCategoryIcon(category) {
    const icons = {
        'food': 'fa-utensils',
        'travel': 'fa-plane-departure',
        'fitness': 'fa-dumbbell',
        'education': 'fa-user-graduate',
        'technology': 'fa-microchip',
        'fashion': 'fa-shirt',
        'health': 'fa-notes-medical',
        'romance': 'fa-heart',
        'sports': 'fa-football',
        'entertainment': 'fa-film',
        'nature': 'fa-tree',
        'party': 'fa-champagne-glasses',
        'holiday': 'fa-snowflake',
        'culture': 'fa-globe',
        'art': 'fa-palette',
        'music': 'fa-music',
        'photography': 'fa-camera-retro',
        'animals': 'fa-paw',
        'science': 'fa-flask',
        'history': 'fa-landmark',
        'fiction': 'fa-hat-wizard',
        'space': 'fa-user-astronaut',
        'language': 'fa-language',
        'friends': 'fa-people-group',
        'vehicle': 'fa-car-side',
        'residence': 'fa-house-chimney',
        'event': 'fa-calendar-day',
        'mindfulness': 'fa-person-praying',
        'gaming': 'fa-gamepad',
        'reading': 'fa-book',
        'news': 'fa-newspaper',
        'general': 'fa-tag'
    };

    return icons[category] || 'fa-tag';
}