// AI Recommendation Engine
class AIRecommendationEngine {
    constructor() {
        this.userProfile = null;
        this.recommendations = [];
        this.isLoading = false;
        this.lastUpdate = null;
        this.weights = {
            watchHistory: 0.3,
            favorites: 0.25,
            subscriptions: 0.2,
            ratings: 0.15,
            categories: 0.1
        };
    }

    async initializeUserProfile(userId) {
        if (!userId) return null;

        try {
            const response = await fetch(`/api/ai/user-profile/${userId}`);
            const data = await response.json();
            
            this.userProfile = {
                userId: userId,
                watchHistory: data.watchHistory || [],
                favorites: data.favorites || [],
                subscriptions: data.subscriptions || [],
                ratings: data.ratings || [],
                categoryPreferences: data.categoryPreferences || {},
                performerPreferences: data.performerPreferences || {},
                viewingPatterns: data.viewingPatterns || {},
                lastActivity: data.lastActivity || Date.now()
            };

            return this.userProfile;
        } catch (error) {
            console.error('Error initializing user profile:', error);
            return null;
        }
    }

    async generateRecommendations(userId, limit = 20) {
        if (this.isLoading) return this.recommendations;
        
        this.isLoading = true;
        showLoadingIndicator();

        try {
            // Initialize or update user profile
            await this.initializeUserProfile(userId);
            
            if (!this.userProfile) {
                // For new users, return trending/popular videos
                return await this.getDefaultRecommendations(limit);
            }

            // Generate personalized recommendations
            const recommendations = await this.calculatePersonalizedRecommendations(limit);
            
            // Apply diversity and freshness filters
            const diversifiedRecommendations = this.applyDiversityFilters(recommendations);
            
            // Cache recommendations
            this.recommendations = diversifiedRecommendations;
            this.lastUpdate = Date.now();
            
            return diversifiedRecommendations;

        } catch (error) {
            console.error('Error generating recommendations:', error);
            return await this.getDefaultRecommendations(limit);
        } finally {
            this.isLoading = false;
            hideLoadingIndicator();
        }
    }

    async calculatePersonalizedRecommendations(limit) {
        const scoredVideos = new Map();
        
        // Get all available videos
        const allVideosResponse = await fetch('/api/videos?page=1&limit=1000');
        const allVideosData = await allVideosResponse.json();
        const allVideos = allVideosData.videos || [];

        // Score each video based on different factors
        for (const video of allVideos) {
            let score = 0;
            
            // Skip videos user has already watched recently
            if (this.hasWatchedRecently(video.id)) continue;
            
            // 1. Watch History Based Scoring (30%)
            score += this.calculateWatchHistoryScore(video) * this.weights.watchHistory;
            
            // 2. Favorites Based Scoring (25%)
            score += this.calculateFavoritesScore(video) * this.weights.favorites;
            
            // 3. Subscription Based Scoring (20%)
            score += this.calculateSubscriptionScore(video) * this.weights.subscriptions;
            
            // 4. Rating Based Scoring (15%)
            score += this.calculateRatingScore(video) * this.weights.ratings;
            
            // 5. Category Preference Scoring (10%)
            score += this.calculateCategoryScore(video) * this.weights.categories;
            
            // Apply recency boost for newer videos
            score += this.calculateRecencyBoost(video);
            
            // Apply quality boost
            score += this.calculateQualityBoost(video);
            
            if (score > 0) {
                scoredVideos.set(video.id, { video, score });
            }
        }

        // Sort by score and return top recommendations
        const sortedRecommendations = Array.from(scoredVideos.values())
            .sort((a, b) => b.score - a.score)
            .slice(0, limit * 2) // Get more than needed for diversity filtering
            .map(item => item.video);

        return sortedRecommendations;
    }

    calculateWatchHistoryScore(video) {
        if (!this.userProfile.watchHistory.length) return 0;
        
        let score = 0;
        const recentWatches = this.userProfile.watchHistory.slice(-50); // Last 50 watches
        
        for (const watch of recentWatches) {
            // Same performer
            if (watch.artist === video.artist) {
                score += 0.4;
            }
            
            // Similar categories
            const commonCategories = video.categories.filter(cat => 
                watch.categories && watch.categories.includes(cat)
            );
            score += commonCategories.length * 0.2;
            
            // Similar duration preference
            if (this.isSimilarDuration(watch.duration, video.duration)) {
                score += 0.1;
            }
            
            // Similar quality preference
            if (watch.quality === video.quality) {
                score += 0.1;
            }
        }
        
        return Math.min(score, 1); // Cap at 1
    }

    calculateFavoritesScore(video) {
        if (!this.userProfile.favorites.length) return 0;
        
        let score = 0;
        
        for (const favorite of this.userProfile.favorites) {
            // Same performer
            if (favorite.artist === video.artist) {
                score += 0.5;
            }
            
            // Similar categories
            const commonCategories = video.categories.filter(cat => 
                favorite.categories && favorite.categories.includes(cat)
            );
            score += commonCategories.length * 0.3;
        }
        
        return Math.min(score, 1);
    }

    calculateSubscriptionScore(video) {
        if (!this.userProfile.subscriptions.length) return 0;
        
        const isSubscribed = this.userProfile.subscriptions.some(sub => 
            sub.name === video.artist
        );
        
        return isSubscribed ? 1 : 0;
    }

    calculateRatingScore(video) {
        if (!this.userProfile.ratings.length) return 0;
        
        let score = 0;
        let totalRatings = 0;
        
        for (const rating of this.userProfile.ratings) {
            if (rating.artist === video.artist) {
                score += rating.rating / 5; // Normalize to 0-1
                totalRatings++;
            }
            
            // Check category ratings
            const commonCategories = video.categories.filter(cat => 
                rating.categories && rating.categories.includes(cat)
            );
            if (commonCategories.length > 0) {
                score += (rating.rating / 5) * 0.5;
                totalRatings++;
            }
        }
        
        return totalRatings > 0 ? score / totalRatings : 0;
    }

    calculateCategoryScore(video) {
        if (!this.userProfile.categoryPreferences) return 0;
        
        let score = 0;
        
        for (const category of video.categories) {
            const preference = this.userProfile.categoryPreferences[category];
            if (preference) {
                score += preference.score * preference.frequency;
            }
        }
        
        return Math.min(score, 1);
    }

    calculateRecencyBoost(video) {
        if (!video.uploadDate) return 0;
        
        const daysSinceUpload = (Date.now() - new Date(video.uploadDate).getTime()) / (1000 * 60 * 60 * 24);
        
        // Boost newer videos (within 30 days)
        if (daysSinceUpload <= 30) {
            return (30 - daysSinceUpload) / 30 * 0.2;
        }
        
        return 0;
    }

    calculateQualityBoost(video) {
        const qualityScores = {
            '4K': 0.3,
            'HD': 0.2,
            'SD': 0.1
        };
        
        return qualityScores[video.quality] || 0;
    }

    applyDiversityFilters(recommendations) {
        const diversified = [];
        const performerCount = new Map();
        const categoryCount = new Map();
        
        for (const video of recommendations) {
            // Limit videos per performer
            const performerVideos = performerCount.get(video.artist) || 0;
            if (performerVideos >= 3) continue;
            
            // Ensure category diversity
            let categoryOverload = false;
            for (const category of video.categories) {
                const categoryVideos = categoryCount.get(category) || 0;
                if (categoryVideos >= 5) {
                    categoryOverload = true;
                    break;
                }
            }
            if (categoryOverload) continue;
            
            // Add to diversified list
            diversified.push(video);
            
            // Update counts
            performerCount.set(video.artist, performerVideos + 1);
            for (const category of video.categories) {
                categoryCount.set(category, (categoryCount.get(category) || 0) + 1);
            }
            
            // Stop when we have enough
            if (diversified.length >= 20) break;
        }
        
        return diversified;
    }

    async getDefaultRecommendations(limit) {
        try {
            // For new users, get trending and highly rated videos
            const trendingResponse = await fetch(`/api/trending?page=1&limit=${Math.ceil(limit/2)}`);
            const trendingData = await trendingResponse.json();
            
            const topRatedResponse = await fetch(`/api/videos?page=1&limit=${Math.ceil(limit/2)}&sort=highest-rated`);
            const topRatedData = await topRatedResponse.json();
            
            const combined = [
                ...(trendingData.videos || []),
                ...(topRatedData.videos || [])
            ];
            
            // Remove duplicates and shuffle
            const unique = combined.filter((video, index, self) => 
                index === self.findIndex(v => v.id === video.id)
            );
            
            return this.shuffleArray(unique).slice(0, limit);
        } catch (error) {
            console.error('Error getting default recommendations:', error);
            return [];
        }
    }

    hasWatchedRecently(videoId) {
        if (!this.userProfile.watchHistory.length) return false;
        
        const recentWatches = this.userProfile.watchHistory.slice(-20);
        return recentWatches.some(watch => watch.id === videoId);
    }

    isSimilarDuration(duration1, duration2) {
        if (!duration1 || !duration2) return false;
        
        const parseTime = (timeStr) => {
            const parts = timeStr.split(':').map(Number);
            return parts.length === 2 ? parts[0] * 60 + parts[1] : 0;
        };
        
        const time1 = parseTime(duration1);
        const time2 = parseTime(duration2);
        
        return Math.abs(time1 - time2) <= 300; // Within 5 minutes
    }

    shuffleArray(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }

    async updateUserProfile(userId, action, data) {
        try {
            await fetch(`/api/ai/user-profile/${userId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ action, data })
            });
            
            // Invalidate cached recommendations
            this.recommendations = [];
            this.lastUpdate = null;
        } catch (error) {
            console.error('Error updating user profile:', error);
        }
    }

    getRecommendationExplanation(video) {
        if (!this.userProfile) return "Trending video";
        
        const reasons = [];
        
        // Check subscription
        if (this.userProfile.subscriptions.some(sub => sub.name === video.artist)) {
            reasons.push(`You're subscribed to ${video.artist}`);
        }
        
        // Check favorites
        const favoritesByArtist = this.userProfile.favorites.filter(fav => fav.artist === video.artist);
        if (favoritesByArtist.length > 0) {
            reasons.push(`You've favorited ${favoritesByArtist.length} videos by ${video.artist}`);
        }
        
        // Check categories
        const preferredCategories = video.categories.filter(cat => 
            this.userProfile.categoryPreferences[cat]?.score > 0.5
        );
        if (preferredCategories.length > 0) {
            reasons.push(`You enjoy ${preferredCategories.slice(0, 2).join(', ')} content`);
        }
        
        // Check watch history
        const similarWatches = this.userProfile.watchHistory.filter(watch => 
            watch.artist === video.artist || 
            video.categories.some(cat => watch.categories?.includes(cat))
        );
        if (similarWatches.length > 0) {
            reasons.push("Based on your viewing history");
        }
        
        return reasons.length > 0 ? reasons[0] : "Recommended for you";
    }
}

// Global AI engine instance
window.aiEngine = new AIRecommendationEngine();

// AI recommendation functions
async function loadAIRecommendations() {
    if (!isAuthenticated) {
        showAIAuthRequired();
        return;
    }

    if (isLoading) return;
    
    isLoading = true;
    showLoadingIndicator();
    
    try {
        const recommendations = await window.aiEngine.generateRecommendations(currentUser.id, 20);
        
        if (recommendations && recommendations.length > 0) {
            displayAIRecommendations(recommendations);
            updateVideoCount(recommendations.length);
        } else {
            showNoResults('No AI recommendations available', 'Start watching and rating videos to get personalized recommendations');
        }
    } catch (error) {
        console.error('Error loading AI recommendations:', error);
        showToast('Failed to load AI recommendations', 'error');
    } finally {
        isLoading = false;
        hideLoadingIndicator();
    }
}

function displayAIRecommendations(recommendations) {
    const container = document.getElementById('videoGrid');
    container.innerHTML = '';
    
    recommendations.forEach(video => {
        const videoCard = createAIVideoCard(video);
        container.appendChild(videoCard);
        
        // Setup hover preview for this card
        setupVideoHoverPreview(videoCard, video);
    });
}

function createAIVideoCard(video) {
    const card = document.createElement('div');
    card.className = 'video-card ai-recommended';
    card.onclick = () => {
        // Track AI recommendation click
        trackAIRecommendationClick(video.id);
        openVideoModal(video);
    };
    
    const thumbnailUrl = video.thumbnailExists ? video.thumbnailUrl : '/api/placeholder/400/225';
    const explanation = window.aiEngine.getRecommendationExplanation(video);
    
    card.innerHTML = `
        <div class="video-thumbnail">
            <img src="${thumbnailUrl}" alt="${video.title}" loading="lazy">
            <div class="video-overlay">
                <button class="play-btn">
                    <i class="fas fa-play"></i>
                </button>
            </div>
            <button class="video-favorite-btn ${video.isFavorite ? 'active' : ''}" onclick="toggleFavorite(event, '${video.id}')">
                <i class="fas fa-heart"></i>
            </button>
            <div class="ai-recommendation-badge">
                <i class="fas fa-robot"></i>
                AI
            </div>
            ${video.duration ? `<div class="video-duration">${video.duration}</div>` : ''}
            ${video.quality ? `<div class="video-quality">${video.quality}</div>` : ''}
            <div class="video-rating">
                <i class="fas fa-star"></i>
                ${video.rating.toFixed(1)}
            </div>
            ${video.isNew ? '<div class="video-new-badge">NEW</div>' : ''}
            ${video.isWatched ? '<div class="video-watched-badge"><i class="fas fa-check"></i></div>' : ''}
        </div>
        <div class="video-info">
            <h3 class="video-title">${video.title}</h3>
            <a href="#" class="video-performer" onclick="handlePerformerClick(event, '${video.artist}')">${video.artist}</a>
            <div class="ai-explanation">
                <i class="fas fa-lightbulb"></i>
                ${explanation}
            </div>
            <div class="video-stats">
                <span class="video-stat">
                    <i class="fas fa-eye"></i>
                    ${formatNumber(video.views)}
                </span>
                <span class="video-stat">
                    <i class="fas fa-heart"></i>
                    ${video.isFavorite ? 'Favorited' : 'Favorite'}
                </span>
                <span class="video-stat">
                    <i class="fas fa-star"></i>
                    ${video.rating.toFixed(1)}
                </span>
                ${video.duration ? `
                <span class="video-stat">
                    <i class="fas fa-clock"></i>
                    ${video.duration}
                </span>
                ` : ''}
                ${video.uploadDate ? `
                <span class="video-stat">
                    <i class="fas fa-calendar"></i>
                    ${new Date(video.uploadDate).toLocaleDateString()}
                </span>
                ` : ''}
            </div>
            <div class="video-categories">
                ${video.categories.map(cat => 
                    `<span class="category-tag" onclick="handleCategoryClick(event, '${cat}')">${cat}</span>`
                ).join('')}
            </div>
        </div>
    `;
    
    return card;
}

function showAIAuthRequired() {
    const container = document.getElementById('videoGrid');
    container.innerHTML = `
        <div class="ai-auth-required">
            <div class="ai-icon">
                <i class="fas fa-robot"></i>
            </div>
            <h3>AI Recommendations</h3>
            <p>Login to get personalized video recommendations powered by AI. Our system learns from your viewing habits, favorites, and subscriptions to suggest content you'll love.</p>
            <div class="ai-features">
                <div class="ai-feature">
                    <i class="fas fa-brain"></i>
                    <span>Smart Learning</span>
                </div>
                <div class="ai-feature">
                    <i class="fas fa-target"></i>
                    <span>Personalized</span>
                </div>
                <div class="ai-feature">
                    <i class="fas fa-chart-line"></i>
                    <span>Improves Over Time</span>
                </div>
            </div>
            <button class="auth-submit-btn" onclick="showAuthModal('login')">
                <i class="fas fa-sign-in-alt"></i>
                Login for AI Recommendations
            </button>
        </div>
    `;
}

async function trackAIRecommendationClick(videoId) {
    if (!isAuthenticated) return;
    
    try {
        await fetch('/api/ai/track-click', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                userId: currentUser.id,
                videoId: videoId,
                timestamp: Date.now()
            })
        });
    } catch (error) {
        console.error('Error tracking AI recommendation click:', error);
    }
}

// Update user profile when user performs actions
async function updateAIProfile(action, data) {
    if (!isAuthenticated || !window.aiEngine) return;
    
    await window.aiEngine.updateUserProfile(currentUser.id, action, data);
}

// Hook into existing functions to update AI profile
const originalToggleFavorite = window.toggleFavorite || toggleFavorite;
window.toggleFavorite = function(event, videoId) {
    const result = originalToggleFavorite.call(this, event, videoId);
    updateAIProfile('favorite', { videoId, timestamp: Date.now() });
    return result;
};

const originalOpenVideoModal = window.openVideoModal || openVideoModal;
window.openVideoModal = function(video) {
    const result = originalOpenVideoModal.call(this, video);
    updateAIProfile('watch', { 
        videoId: video.id, 
        artist: video.artist,
        categories: video.categories,
        duration: video.duration,
        quality: video.quality,
        timestamp: Date.now() 
    });
    return result;
};

const originalRateVideo = window.rateVideo || rateVideo;
window.rateVideo = function(rating) {
    const result = originalRateVideo.call(this, rating);
    if (currentVideoId) {
        updateAIProfile('rating', { 
            videoId: currentVideoId, 
            rating: rating,
            timestamp: Date.now() 
        });
    }
    return result;
};

// Export functions for use in other scripts
window.loadAIRecommendations = loadAIRecommendations;
window.displayAIRecommendations = displayAIRecommendations;
window.trackAIRecommendationClick = trackAIRecommendationClick;
window.updateAIProfile = updateAIProfile;