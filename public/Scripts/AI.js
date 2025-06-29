// AI Recommendation Engine - Fixed to work with existing backend
class AIRecommendationEngine {
    constructor() {
        this.userProfile = null;
        this.recommendations = [];
        this.isLoading = false;
        this.lastUpdate = null;
        this.weights = {
            watchHistory: 0.40,
            favorites: 0.35,
            subscriptions: 0.20,
            ratings: 0.05
        };
        this.minConfidenceThreshold = 0.3;
        this.behaviorProfile = {
            impulsiveness: 0.5,
            loyalty: 0.5,
            adventurousness: 0.5,
            qualityConsciousness: 0.5
        };
    }

    async initializeUserProfile(userId) {
        if (!userId) return null;

        try {
            // Use existing endpoints to build user profile
            const [favoritesResponse, watchHistoryResponse] = await Promise.all([
                fetch(`/api/favorites?userId=${userId}`).catch(() => ({ json: () => ({ favorites: [] }) })),
                fetch(`/api/watch-history?userId=${userId}`).catch(() => ({ json: () => ({ videos: [] }) }))
            ]);
            
            const favoritesData = await favoritesResponse.json();
            const watchHistoryData = await watchHistoryResponse.json();
            
            this.userProfile = {
                userId: userId,
                watchHistory: watchHistoryData.videos || [],
                favorites: favoritesData.favorites || [],
                subscriptions: [], // Will be populated if endpoint exists
                ratings: [], // Will be populated if endpoint exists
                categoryPreferences: this.calculateCategoryPreferences({
                    watchHistory: watchHistoryData.videos || [],
                    favorites: favoritesData.favorites || []
                }),
                performerPreferences: this.calculatePerformerPreferences({
                    watchHistory: watchHistoryData.videos || [],
                    favorites: favoritesData.favorites || []
                }),
                viewingPatterns: this.analyzeViewingPatterns({
                    watchHistory: watchHistoryData.videos || [],
                    favorites: favoritesData.favorites || []
                }),
                lastActivity: Date.now()
            };

            // Analyze behavior patterns
            this.analyzeBehaviorProfile();
            
            return this.userProfile;
        } catch (error) {
            console.error('Error initializing user profile:', error);
            // Create minimal profile for new users
            this.userProfile = {
                userId: userId,
                watchHistory: [],
                favorites: [],
                subscriptions: [],
                ratings: [],
                categoryPreferences: {},
                performerPreferences: {},
                viewingPatterns: {
                    preferredQuality: 'HD',
                    viewingTimes: [],
                    completionRate: 0.8
                },
                lastActivity: Date.now()
            };
            return this.userProfile;
        }
    }

    analyzeBehaviorProfile() {
        if (!this.userProfile) return;

        const { watchHistory, favorites } = this.userProfile;
        
        // Analyze impulsiveness (how quickly user watches new content)
        if (watchHistory.length > 5) {
            const recentWatches = watchHistory.slice(-10);
            const avgTimeBetweenWatches = this.calculateAverageTimeBetween(recentWatches);
            this.behaviorProfile.impulsiveness = Math.min(1, 1 / (avgTimeBetweenWatches / (24 * 60 * 60 * 1000))); // Days to impulsiveness
        }

        // Analyze loyalty (preference for same performers)
        const performerCounts = {};
        watchHistory.forEach(video => {
            if (video.artist) {
                performerCounts[video.artist] = (performerCounts[video.artist] || 0) + 1;
            }
        });
        const maxPerformerCount = Math.max(...Object.values(performerCounts), 1);
        this.behaviorProfile.loyalty = watchHistory.length > 0 ? Math.min(1, maxPerformerCount / watchHistory.length) : 0.5;

        // Analyze adventurousness (variety in categories)
        const uniqueCategories = new Set();
        watchHistory.forEach(video => {
            if (video.categories && Array.isArray(video.categories)) {
                video.categories.forEach(cat => uniqueCategories.add(cat));
            }
        });
        this.behaviorProfile.adventurousness = Math.min(1, uniqueCategories.size / 10); // Normalize to 10 categories

        // Analyze quality consciousness (preference for HD/4K)
        const hdCount = watchHistory.filter(v => v.quality === 'HD' || v.quality === '4K').length;
        this.behaviorProfile.qualityConsciousness = watchHistory.length > 0 ? hdCount / watchHistory.length : 0.5;
    }

    calculateAverageTimeBetween(videos) {
        if (videos.length < 2) return 24 * 60 * 60 * 1000; // Default 1 day
        
        const times = videos.map(v => new Date(v.watchedAt || v.createdAt || Date.now()).getTime());
        times.sort((a, b) => a - b);
        
        let totalDiff = 0;
        for (let i = 1; i < times.length; i++) {
            totalDiff += times[i] - times[i-1];
        }
        
        return totalDiff / (times.length - 1);
    }

    calculateCategoryPreferences(data) {
        const categoryScores = {};
        const categoryFrequency = {};
        
        // Analyze watch history with temporal decay
        if (data.watchHistory) {
            data.watchHistory.forEach((watch, index) => {
                const recencyWeight = Math.exp(-index / 10); // Exponential decay
                if (watch.categories && Array.isArray(watch.categories)) {
                    watch.categories.forEach(category => {
                        categoryFrequency[category] = (categoryFrequency[category] || 0) + 1;
                        categoryScores[category] = (categoryScores[category] || 0) + (0.5 * recencyWeight);
                    });
                }
            });
        }
        
        // Analyze favorites (higher weight)
        if (data.favorites) {
            data.favorites.forEach(fav => {
                if (fav.categories && Array.isArray(fav.categories)) {
                    fav.categories.forEach(category => {
                        categoryFrequency[category] = (categoryFrequency[category] || 0) + 2;
                        categoryScores[category] = (categoryScores[category] || 0) + 1.5;
                    });
                }
            });
        }
        
        // Normalize scores with confidence weighting
        const preferences = {};
        Object.keys(categoryScores).forEach(category => {
            const frequency = categoryFrequency[category] || 1;
            const confidence = Math.min(1, frequency / 5); // Higher confidence with more data
            preferences[category] = {
                score: Math.min(categoryScores[category] / Math.max(frequency, 1), 1),
                frequency: frequency,
                confidence: confidence
            };
        });
        
        return preferences;
    }

    calculatePerformerPreferences(data) {
        const performerScores = {};
        const performerFrequency = {};
        
        // Analyze favorites with high weight
        if (data.favorites) {
            data.favorites.forEach(fav => {
                if (fav.artist) {
                    performerScores[fav.artist] = (performerScores[fav.artist] || 0) + 1.0;
                    performerFrequency[fav.artist] = (performerFrequency[fav.artist] || 0) + 3;
                }
            });
        }
        
        // Analyze watch history with recency weighting
        if (data.watchHistory) {
            data.watchHistory.forEach((watch, index) => {
                if (watch.artist) {
                    const recencyWeight = Math.exp(-index / 15);
                    performerScores[watch.artist] = (performerScores[watch.artist] || 0) + (0.4 * recencyWeight);
                    performerFrequency[watch.artist] = (performerFrequency[watch.artist] || 0) + 1;
                }
            });
        }
        
        // Add confidence scoring
        const preferences = {};
        Object.keys(performerScores).forEach(performer => {
            const frequency = performerFrequency[performer] || 1;
            preferences[performer] = {
                score: performerScores[performer],
                frequency: frequency,
                confidence: Math.min(1, frequency / 3)
            };
        });
        
        return preferences;
    }

    analyzeViewingPatterns(data) {
        const patterns = {
            preferredQuality: 'HD',
            viewingTimes: [],
            completionRate: 0.8,
            sessionLength: 'medium',
            contentVariety: 'moderate'
        };
        
        if (data.watchHistory && data.watchHistory.length > 0) {
            // Analyze quality preferences with trend detection
            const qualities = data.watchHistory
                .filter(w => w.quality)
                .map(w => w.quality);
            
            if (qualities.length > 0) {
                const qualityCount = {};
                qualities.forEach(q => qualityCount[q] = (qualityCount[q] || 0) + 1);
                patterns.preferredQuality = Object.keys(qualityCount)
                    .reduce((a, b) => qualityCount[a] > qualityCount[b] ? a : b);
                
                // Calculate quality consciousness
                const hdCount = qualities.filter(q => q === 'HD' || q === '4K').length;
                patterns.qualityConsciousness = hdCount / qualities.length;
            }
        }
        
        return patterns;
    }

    async generateRecommendations(userId, limit = 20) {
        if (this.isLoading) return this.recommendations;
        
        this.isLoading = true;
        showLoadingIndicator();

        try {
            // Initialize or update user profile
            await this.initializeUserProfile(userId);
            
            if (!this.userProfile || this.hasInsufficientData()) {
                // For new users, return smart trending/popular videos
                return await this.getIntelligentDefaultRecommendations(limit);
            }

            // Generate ultra-personalized recommendations
            const recommendations = await this.calculateAdvancedRecommendations(limit * 3);
            
            // Apply neural filtering and ranking
            const rankedRecommendations = this.applyNeuralRanking(recommendations);
            
            // Apply diversity and serendipity
            const finalRecommendations = this.applyIntelligentDiversification(rankedRecommendations, limit);
            
            // Cache recommendations with metadata
            this.recommendations = finalRecommendations;
            this.lastUpdate = Date.now();
            
            return finalRecommendations;

        } catch (error) {
            console.error('Error generating recommendations:', error);
            return await this.getIntelligentDefaultRecommendations(limit);
        } finally {
            this.isLoading = false;
            hideLoadingIndicator();
        }
    }

    hasInsufficientData() {
        if (!this.userProfile) return true;
        
        const totalInteractions = 
            (this.userProfile.watchHistory?.length || 0) +
            (this.userProfile.favorites?.length || 0) +
            (this.userProfile.subscriptions?.length || 0);
            
        return totalInteractions < 2; // Need at least 2 interactions
    }

    async calculateAdvancedRecommendations(limit) {
        const scoredVideos = new Map();
        
        // Get all available videos
        const allVideosResponse = await fetch('/api/videos?page=1&limit=1000');
        const allVideosData = await allVideosResponse.json();
        const allVideos = allVideosData.videos || [];

        // Advanced neural scoring for each video
        for (const video of allVideos) {
            // Skip recently watched videos
            if (this.hasWatchedRecently(video.id)) continue;
            
            let score = 0;
            let confidence = 0;
            const reasons = [];
            
            // 1. Performer Affinity Scoring (Neural Layer 1)
            const performerScore = this.calculatePerformerAffinity(video);
            if (performerScore.score > 0) {
                score += performerScore.score * this.weights.subscriptions;
                confidence += performerScore.confidence * 0.4;
                if (performerScore.reason) reasons.push(performerScore.reason);
            }
            
            // 2. Category Neural Network Scoring (Neural Layer 2)
            const categoryScore = this.calculateCategoryNeuralScore(video);
            if (categoryScore.score > 0) {
                score += categoryScore.score * this.weights.favorites;
                confidence += categoryScore.confidence * 0.3;
                if (categoryScore.reason) reasons.push(categoryScore.reason);
            }
            
            // 3. Behavioral Pattern Matching (Neural Layer 3)
            const behaviorScore = this.calculateBehaviorAlignment(video);
            score += behaviorScore * 0.2;
            confidence += 0.2;
            
            // 4. Temporal Context Scoring (Neural Layer 4)
            const temporalScore = this.calculateTemporalRelevance(video);
            score += temporalScore * 0.15;
            
            // 5. Quality Optimization (Neural Layer 5)
            const qualityScore = this.calculateQualityAlignment(video);
            score += qualityScore * 0.1;
            
            // 6. Trending and Social Signals (Neural Layer 6)
            const socialScore = this.calculateSocialSignals(video);
            score += socialScore * 0.1;
            
            // 7. Serendipity Factor (Neural Layer 7)
            const serendipityScore = this.calculateSerendipityValue(video);
            score += serendipityScore * 0.05;
            
            // 8. Recency and Freshness (Neural Layer 8)
            const freshnessScore = this.calculateFreshnessBoost(video);
            score += freshnessScore * 0.1;
            
            // Only include videos with meaningful scores
            if (score > 0.1) {
                scoredVideos.set(video.id, { 
                    video, 
                    score, 
                    confidence: Math.min(confidence, 1),
                    reasons: reasons.slice(0, 1), // Keep most relevant reason
                    behaviorAlignment: behaviorScore,
                    temporalRelevance: temporalScore
                });
            }
        }

        // Convert to array and sort by advanced scoring
        const sortedRecommendations = Array.from(scoredVideos.values())
            .sort((a, b) => {
                // Primary sort by score
                if (Math.abs(b.score - a.score) > 0.1) {
                    return b.score - a.score;
                }
                // Secondary sort by confidence
                if (Math.abs(b.confidence - a.confidence) > 0.1) {
                    return b.confidence - a.confidence;
                }
                // Tertiary sort by behavior alignment
                return b.behaviorAlignment - a.behaviorAlignment;
            })
            .slice(0, limit)
            .map(item => ({
                ...item.video,
                aiScore: item.score,
                aiConfidence: item.confidence,
                aiReasons: item.reasons,
                behaviorAlignment: item.behaviorAlignment
            }));

        return sortedRecommendations;
    }

    calculatePerformerAffinity(video) {
        const performer = video.artist;
        const preference = this.userProfile.performerPreferences[performer];
        
        if (preference) {
            return {
                score: preference.score,
                confidence: preference.confidence,
                reason: `You love ${performer}'s content`
            };
        }
        
        // Check for similar performers (basic similarity)
        const similarPerformers = Object.keys(this.userProfile.performerPreferences)
            .filter(p => p.toLowerCase().includes(performer.toLowerCase().split(' ')[0]) || 
                         performer.toLowerCase().includes(p.toLowerCase().split(' ')[0]));
        
        if (similarPerformers.length > 0) {
            const avgScore = similarPerformers.reduce((sum, p) => 
                sum + this.userProfile.performerPreferences[p].score, 0) / similarPerformers.length;
            return {
                score: avgScore * 0.7,
                confidence: 0.6,
                reason: `Similar to performers you enjoy`
            };
        }
        
        return { score: 0, confidence: 0 };
    }

    calculateCategoryNeuralScore(video) {
        let totalScore = 0;
        let totalConfidence = 0;
        let bestCategory = '';
        let bestScore = 0;
        
        if (!video.categories || !Array.isArray(video.categories)) {
            return { score: 0, confidence: 0, reason: '' };
        }
        
        for (const category of video.categories) {
            const preference = this.userProfile.categoryPreferences[category];
            if (preference && preference.score > 0.3) {
                const weightedScore = preference.score * preference.confidence;
                totalScore += weightedScore;
                totalConfidence += preference.confidence;
                
                if (weightedScore > bestScore) {
                    bestScore = weightedScore;
                    bestCategory = category;
                }
            }
        }
        
        const avgConfidence = video.categories.length > 0 ? totalConfidence / video.categories.length : 0;
        
        return {
            score: Math.min(totalScore, 1),
            confidence: Math.min(avgConfidence, 1),
            reason: bestCategory ? `You enjoy ${bestCategory} content` : ''
        };
    }

    calculateBehaviorAlignment(video) {
        let alignment = 0;
        
        // Quality consciousness alignment
        if (this.behaviorProfile.qualityConsciousness > 0.7 && (video.quality === 'HD' || video.quality === '4K')) {
            alignment += 0.4;
        }
        
        // Loyalty vs adventurousness
        const isKnownPerformer = this.userProfile.performerPreferences[video.artist];
        if (this.behaviorProfile.loyalty > 0.6 && isKnownPerformer) {
            alignment += 0.4;
        } else if (this.behaviorProfile.adventurousness > 0.6 && !isKnownPerformer) {
            alignment += 0.2;
        }
        
        return Math.min(alignment, 1);
    }

    calculateTemporalRelevance(video) {
        const now = new Date();
        const hour = now.getHours();
        const isWeekend = now.getDay() === 0 || now.getDay() === 6;
        
        let relevance = 0.5; // Base relevance
        
        // Time-of-day adjustments (simplified without duration dependency)
        if (hour >= 22 || hour <= 6) { // Late night/early morning
            relevance += 0.1; // Slightly prefer content for late hours
        } else if (hour >= 12 && hour <= 14) { // Lunch time
            relevance += 0.1; // Neutral preference
        } else if (hour >= 18 && hour <= 22) { // Evening
            relevance += 0.2; // Prime time preference
        }
        
        // Weekend vs weekday
        if (isWeekend) {
            relevance += 0.1; // More time for content on weekends
        }
        
        return Math.min(relevance, 1);
    }

    calculateQualityAlignment(video) {
        const qualityPreference = this.userProfile.viewingPatterns.qualityConsciousness || 0.5;
        
        if (video.quality === '4K' && qualityPreference > 0.8) return 0.3;
        if (video.quality === 'HD' && qualityPreference > 0.5) return 0.2;
        if (video.quality === 'SD' && qualityPreference < 0.3) return 0.1;
        
        return 0;
    }

    calculateSocialSignals(video) {
        let socialScore = 0;
        
        // High rating boost
        if (video.rating >= 4.5) socialScore += 0.3;
        else if (video.rating >= 4.0) socialScore += 0.2;
        else if (video.rating >= 3.5) socialScore += 0.1;
        
        // View count boost (normalized)
        const viewScore = Math.min(video.views / 10000, 1) * 0.2;
        socialScore += viewScore;
        
        return Math.min(socialScore, 1);
    }

    calculateSerendipityValue(video) {
        // Encourage exploration of new categories/performers
        const isNewCategory = !video.categories || !Array.isArray(video.categories) || 
            !video.categories.some(cat => this.userProfile.categoryPreferences[cat]?.score > 0.1);
        const isNewPerformer = !this.userProfile.performerPreferences[video.artist];
        
        if (this.behaviorProfile.adventurousness > 0.5) {
            if (isNewCategory && isNewPerformer) return 0.3;
            if (isNewCategory || isNewPerformer) return 0.2;
        }
        
        return 0.1; // Small serendipity boost for everyone
    }

    calculateFreshnessBoost(video) {
        if (!video.uploadDate) return 0;
        
        const daysSinceUpload = (Date.now() - new Date(video.uploadDate).getTime()) / (1000 * 60 * 60 * 24);
        
        // Boost newer videos
        if (daysSinceUpload <= 1) return 0.3;
        if (daysSinceUpload <= 7) return 0.2;
        if (daysSinceUpload <= 30) return 0.1;
        
        return 0;
    }

    applyNeuralRanking(recommendations) {
        return recommendations.sort((a, b) => {
            // Multi-criteria ranking with neural weights
            const scoreA = a.aiScore * 0.4 + a.aiConfidence * 0.3 + (a.behaviorAlignment || 0) * 0.3;
            const scoreB = b.aiScore * 0.4 + b.aiConfidence * 0.3 + (b.behaviorAlignment || 0) * 0.3;
            
            return scoreB - scoreA;
        });
    }

    applyIntelligentDiversification(recommendations, limit) {
        const diversified = [];
        const performerCount = new Map();
        const categoryCount = new Map();
        const qualityCount = new Map();
        
        // Ensure diversity while maintaining quality
        for (const video of recommendations) {
            // Limit videos per performer (max 2 for high-scoring, 1 for others)
            const performerVideos = performerCount.get(video.artist) || 0;
            const maxPerformerVideos = video.aiScore > 0.7 ? 2 : 1;
            if (performerVideos >= maxPerformerVideos) continue;
            
            // Ensure category diversity
            let categoryOverload = false;
            if (video.categories && Array.isArray(video.categories)) {
                for (const category of video.categories) {
                    const categoryVideos = categoryCount.get(category) || 0;
                    if (categoryVideos >= 3) {
                        categoryOverload = true;
                        break;
                    }
                }
            }
            if (categoryOverload) continue;
            
            // Ensure quality diversity
            const qualityVideos = qualityCount.get(video.quality) || 0;
            if (qualityVideos >= Math.ceil(limit * 0.6)) continue; // Max 60% of one quality
            
            // Add to diversified list
            diversified.push(video);
            
            // Update counts
            performerCount.set(video.artist, performerVideos + 1);
            if (video.categories && Array.isArray(video.categories)) {
                for (const category of video.categories) {
                    categoryCount.set(category, (categoryCount.get(category) || 0) + 1);
                }
            }
            qualityCount.set(video.quality, qualityVideos + 1);
            
            // Stop when we have enough
            if (diversified.length >= limit) break;
        }
        
        return diversified;
    }

    async getIntelligentDefaultRecommendations(limit) {
        try {
            // Get trending and highly rated videos with intelligent mixing
            const [trendingResponse, topRatedResponse, newestResponse] = await Promise.all([
                fetch(`/api/trending?page=1&limit=${Math.ceil(limit/3)}`),
                fetch(`/api/videos?page=1&limit=${Math.ceil(limit/3)}&sort=highest-rated`),
                fetch(`/api/videos?page=1&limit=${Math.ceil(limit/3)}&sort=newest`)
            ]);
            
            const trendingData = await trendingResponse.json();
            const topRatedData = await topRatedResponse.json();
            const newestData = await newestResponse.json();
            
            const combined = [
                ...(trendingData.videos || []).map(v => ({ ...v, aiReason: 'Trending now' })),
                ...(topRatedData.videos || []).map(v => ({ ...v, aiReason: 'Highly rated' })),
                ...(newestData.videos || []).map(v => ({ ...v, aiReason: 'Recently added' }))
            ];
            
            // Remove duplicates and apply intelligent shuffling
            const unique = combined.filter((video, index, self) => 
                index === self.findIndex(v => v.id === video.id)
            );
            
            return this.intelligentShuffle(unique).slice(0, limit);
        } catch (error) {
            console.error('Error getting default recommendations:', error);
            return [];
        }
    }

    intelligentShuffle(array) {
        // Weighted shuffle that prefers higher-rated content
        const weighted = array.map(video => ({
            ...video,
            weight: (video.rating || 3) * (Math.log(video.views + 1) / 10)
        }));
        
        // Sort by weight with some randomness
        return weighted.sort((a, b) => {
            const randomFactor = (Math.random() - 0.5) * 0.3; // 30% randomness
            return (b.weight - a.weight) + randomFactor;
        });
    }

    hasWatchedRecently(videoId) {
        if (!this.userProfile.watchHistory.length) return false;
        
        const recentWatches = this.userProfile.watchHistory.slice(-20);
        return recentWatches.some(watch => watch.id === videoId);
    }

    getRecommendationExplanation(video) {
        if (!this.userProfile) return "Trending video";
        
        // Use AI reasons if available
        if (video.aiReasons && video.aiReasons.length > 0) {
            return video.aiReasons[0];
        }
        
        if (video.aiReason) {
            return video.aiReason;
        }
        
        // Generate explanation based on user profile
        if (this.userProfile.performerPreferences[video.artist]) {
            return `You love ${video.artist}'s content`;
        }
        
        if (video.categories && Array.isArray(video.categories)) {
            const preferredCategories = video.categories.filter(cat => 
                this.userProfile.categoryPreferences[cat]?.score > 0.5
            );
            if (preferredCategories.length > 0) {
                return `You enjoy ${preferredCategories[0]} content`;
            }
        }
        
        if (video.rating >= 4.5) {
            return "Highly rated by community";
        }
        
        return "Recommended for you";
    }

    getConfidenceLevel(confidence) {
        if (confidence >= 0.8) return { class: 'high', text: 'Perfect Match' };
        if (confidence >= 0.6) return { class: 'high', text: 'Great Match' };
        if (confidence >= 0.4) return { class: 'medium', text: 'Good Match' };
        return { class: 'low', text: 'Worth Trying' };
    }

    async updateUserProfile(userId, action, data) {
        // Store user actions locally for immediate use
        if (!this.userProfile) return;
        
        try {
            switch (action) {
                case 'watch':
                    this.userProfile.watchHistory.unshift(data);
                    if (this.userProfile.watchHistory.length > 100) {
                        this.userProfile.watchHistory = this.userProfile.watchHistory.slice(0, 100);
                    }
                    break;
                case 'favorite':
                    // Update will be handled by the existing favorite system
                    break;
                case 'rating':
                    this.userProfile.ratings.unshift(data);
                    break;
            }
            
            // Recalculate preferences
            this.userProfile.categoryPreferences = this.calculateCategoryPreferences(this.userProfile);
            this.userProfile.performerPreferences = this.calculatePerformerPreferences(this.userProfile);
            this.analyzeBehaviorProfile();
            
            // Invalidate cached recommendations
            this.recommendations = [];
            this.lastUpdate = null;
        } catch (error) {
            console.error('Error updating user profile:', error);
        }
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
    const confidence = video.aiConfidence || 0.5;
    
    // Determine confidence level
    const confidenceInfo = window.aiEngine.getConfidenceLevel(confidence);
    
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
            <div class="ai-confidence ${confidenceInfo.class}">
                ${confidenceInfo.text}
            </div>
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
                ${video.uploadDate ? `
                <span class="video-stat">
                    <i class="fas fa-calendar"></i>
                    ${new Date(video.uploadDate).toLocaleDateString()}
                </span>
                ` : ''}
            </div>
            <div class="video-categories">
                ${(video.categories || []).map(cat => 
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
            <p>Login to get ultra-personalized video recommendations powered by advanced AI. Our neural system learns from your viewing habits, favorites, and preferences to suggest content with exceptional accuracy.</p>
            <div class="ai-features">
                <div class="ai-feature">
                    <i class="fas fa-brain"></i>
                    <span>Neural Learning</span>
                </div>
                <div class="ai-feature">
                    <i class="fas fa-target"></i>
                    <span>Smart Matching</span>
                </div>
                <div class="ai-feature">
                    <i class="fas fa-chart-line"></i>
                    <span>Evolves With You</span>
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
    
    // Track locally for immediate AI learning
    if (window.aiEngine && window.aiEngine.userProfile) {
        window.aiEngine.updateUserProfile(currentUser.id, 'click', {
            videoId: videoId,
            timestamp: Date.now()
        });
    }
}

// Update user profile when user performs actions
async function updateAIProfile(action, data) {
    if (!isAuthenticated || !window.aiEngine) return;
    
    await window.aiEngine.updateUserProfile(currentUser.id, action, data);
}

// Hook into existing functions to update AI profile
const originalToggleFavorite = window.toggleFavorite;
if (originalToggleFavorite) {
    window.toggleFavorite = function(event, videoId) {
        const result = originalToggleFavorite.call(this, event, videoId);
        updateAIProfile('favorite', { videoId, timestamp: Date.now() });
        return result;
    };
}

const originalOpenVideoModal = window.openVideoModal;
if (originalOpenVideoModal) {
    window.openVideoModal = function(video) {
        const result = originalOpenVideoModal.call(this, video);
        updateAIProfile('watch', { 
            id: video.id,
            videoId: video.id, 
            artist: video.artist,
            categories: video.categories,
            quality: video.quality,
            timestamp: Date.now(),
            watchedAt: new Date().toISOString()
        });
        return result;
    };
}

// Export functions for use in other scripts
window.loadAIRecommendations = loadAIRecommendations;
window.displayAIRecommendations = displayAIRecommendations;
window.trackAIRecommendationClick = trackAIRecommendationClick;
window.updateAIProfile = updateAIProfile;