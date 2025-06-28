function getCategoryIcon(category) {
    const icons = {
        'facefuck': 'fa-face-grimace',              // Suggestive facial expression
        'celebrity': 'fa-star',                     // Represents fame and stardom
        'drunk': 'fa-wine-bottle',                  // Alcohol/drunkenness
        'gloryhole': 'fa-circle-notch',             // Metaphorically a hole
        'bdsm': 'fa-handcuffs',                     // Perfect match for bondage
        'outfit': 'fa-shirt',                       // Represents costume/dressup
        'fingering': 'fa-hand-point-up',            // Finger gesture
        'spycam': 'fa-video-slash',                 // Hidden video / surveillance
        'twerk': 'fa-drum',                         // Rhythmic movement / shaking
        'dirty-talk': 'fa-comment-dots',            // Symbol for talking
        'uncensored': 'fa-eye',                     // Unfiltered / visible
        'caught': 'fa-person-rays',                 // Being caught in the act
        'oil': 'fa-droplet',                        // Massage oil / slipperiness
        'indian': 'fa-flag',                        // General fallback (flag 🇮🇳 via CSS possible)
        'neighbor': 'fa-house-chimney-user',        // Person living next door
        'nude-yoga': 'fa-person-praying',           // Yoga / spiritual pose
        'roleplay': 'fa-theater-masks',             // Acting / skit
        'lingerie': 'fa-person-dress',              // Lingerie/feminine wear
        'trainer': 'fa-dumbbell',                   // Gym/fitness
        'cuckold': 'fa-binoculars',                 // Watching / voyeur
        'step-family': 'fa-people-roof',            // Family group / household
        'anal': 'fa-circle-dot',
        'gangbang': 'fa-people-group',
        'lesbian': 'fa-venus-double',
        'milf': 'fa-person-dress',
        'teen': 'fa-user-graduate',
        'hardcore': 'fa-fire-flame-curved',
        'blowjob': 'fa-kiss-wink-heart',
        'threesome': 'fa-people-arrows',
        'creampie': 'fa-egg',
        'big-tits': 'fa-heart',
        'pov': 'fa-eye',
        'interracial': 'fa-globe',
        'amateur': 'fa-house-chimney',
        'fetish': 'fa-mask-ventilator',
        'latina': 'fa-pepper-hot',
        'asian': 'fa-fan',
        'ebony': 'fa-moon',
        'blonde': 'fa-sun',
        'brunette': 'fa-mug-hot',
        'redhead': 'fa-fire',
        'big-ass': 'fa-person-dress',
        'small-tits': 'fa-leaf',
        'squirting': 'fa-droplet',
        'masturbation': 'fa-hand-back-fist',
        'public': 'fa-city',
        'vintage': 'fa-film',
        'compilation': 'fa-clapperboard',
        'facial': 'fa-face-smile-beam',
        'handjob': 'fa-hand-sparkles',
        'footjob': 'fa-shoe-prints',
        'titjob': 'fa-hand-holding-heart',
        'doggystyle': 'fa-dog',
        'missionary': 'fa-bed',
        'cowgirl': 'fa-horse-head',
        'double-penetration': 'fa-arrows-split-up-and-left',
        'office': 'fa-briefcase',
        'bbc': 'fa-drum',
        'casting': 'fa-microphone-lines',
        'massage': 'fa-spa',
        'shower': 'fa-shower',
        'kitchen': 'fa-utensils',
        'car': 'fa-car-side',
        'beach': 'fa-umbrella-beach',
        'pool': 'fa-water-ladder',
        'hotel': 'fa-hotel',
        'party': 'fa-champagne-glasses',
        'wedding': 'fa-ring',
        'christmas': 'fa-snowflake',
        'halloween': 'fa-ghost',
        'valentine': 'fa-heart-circle-check',
        'hijab': 'fa-person-dress',
        'friends': 'fa-people-group',
        'German': 'fa-flag',
        'Japan': 'fa-flag',
        'homemade': 'fa-camera-retro',
        'Kissing': 'fa-kiss-wink-heart',
        'muslim': 'fa-mosque',
        'arab': 'fa-kaaba',
        'nurse': 'fa-user-nurse',
        'maid': 'fa-broom',
        'cheerleader': 'fa-star',
        'teacher': 'fa-chalkboard-user',
        'student': 'fa-user-graduate',
        'cosplay': 'fa-hat-wizard',
        'superhero': 'fa-user-ninja',
        'zombie': 'fa-skull-crossbones',
        'alien': 'fa-user-astronaut',
        'furry': 'fa-paw'
    };

    return icons[category] || 'fa-tag';
}