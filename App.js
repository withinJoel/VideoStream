const express = require('express');
const path = require('path');
const fs = require('fs').promises;
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const cron = require('node-cron');

const app = express();
const PORT = process.env.PORT || 3000;
const VIDEOS_DIR = path.join(__dirname, 'Videos');
const DATA_DIR = path.join(__dirname, 'data');

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static('public'));

// Ensure data directory exists
async function ensureDataDir() {
    try {
        await fs.access(DATA_DIR);
    } catch {
        await fs.mkdir(DATA_DIR, { recursive: true });
    }
}

// Data storage helpers
async function readJSONFile(filename) {
    try {
        const data = await fs.readFile(path.join(DATA_DIR, filename), 'utf8');
        return JSON.parse(data);
    } catch {
        return {};
    }
}

async function writeJSONFile(filename, data) {
    await fs.writeFile(path.join(DATA_DIR, filename), JSON.stringify(data, null, 2));
}

// AI Recommendation System
class AIRecommendationSystem {
    constructor() {
        this.userProfiles = new Map();
        this.videoAnalytics = new Map();
        this.globalStats = {
            totalViews: 0,
            totalRatings: 0,
            popularCategories: {},
            trendingPerformers: {}
        };
    }

    async initializeUserProfile(userId) {
        if (this.userProfiles.has(userId)) {
            return this.userProfiles.get(userId);
        }

        try {
            const profiles = await readJSONFile('user_profiles.json');
            const profile = profiles[userId] || {
                userId,
                watchHistory: [],
                favorites: [],
                subscriptions: [],
                ratings: [],
                categoryPreferences: {},
                performerPreferences: {},
                viewingPatterns: {
                    preferredDuration: null,
                    preferredQuality: null,
                    activeHours: {},
                    sessionLength: 0
                },
                lastActivity: Date.now(),
                totalWatchTime: 0,
                averageRating: 0
            };

            this.userProfiles.set(userId, profile);
            return profile;
        } catch (error) {
            console.error('Error initializing user profile:', error);
            return null;
        }
    }

    async updateUserProfile(userId, action, data) {
        const profile = await this.initializeUserProfile(userId);
        if (!profile) return;

        const now = Date.now();
        profile.lastActivity = now;

        switch (action) {
            case 'watch':
                this.handleWatchAction(profile, data);
                break;
            case 'favorite':
                this.handleFavoriteAction(profile, data);
                break;
            case 'rating':
                this.handleRatingAction(profile, data);
                break;
            case 'subscription':
                this.handleSubscriptionAction(profile, data);
                break;
        }

        // Update category and performer preferences
        this.updatePreferences(profile);

        // Save profile
        await this.saveUserProfile(userId, profile);
    }

    handleWatchAction(profile, data) {
        // Add to watch history
        profile.watchHistory.push({
            videoId: data.videoId,
            artist: data.artist,
            categories: data.categories || [],
            duration: data.duration,
            quality: data.quality,
            timestamp: data.timestamp,
            watchedAt: Date.now()
        });

        // Keep only last 100 watches
        if (profile.watchHistory.length > 100) {
            profile.watchHistory = profile.watchHistory.slice(-100);
        }

        // Update viewing patterns
        this.updateViewingPatterns(profile, data);
    }

    handleFavoriteAction(profile, data) {
        const existingIndex = profile.favorites.findIndex(fav => fav.videoId === data.videoId);
        
        if (existingIndex === -1) {
            profile.favorites.push({
                videoId: data.videoId,
                timestamp: data.timestamp
            });
        } else {
            // Remove from favorites
            profile.favorites.splice(existingIndex, 1);
        }
    }

    handleRatingAction(profile, data) {
        const existingIndex = profile.ratings.findIndex(rating => rating.videoId === data.videoId);
        
        if (existingIndex === -1) {
            profile.ratings.push({
                videoId: data.videoId,
                rating: data.rating,
                timestamp: data.timestamp
            });
        } else {
            profile.ratings[existingIndex].rating = data.rating;
            profile.ratings[existingIndex].timestamp = data.timestamp;
        }

        // Update average rating
        const totalRating = profile.ratings.reduce((sum, r) => sum + r.rating, 0);
        profile.averageRating = totalRating / profile.ratings.length;
    }

    handleSubscriptionAction(profile, data) {
        const existingIndex = profile.subscriptions.findIndex(sub => sub.performer === data.performer);
        
        if (existingIndex === -1) {
            profile.subscriptions.push({
                performer: data.performer,
                subscribedAt: data.timestamp
            });
        } else {
            profile.subscriptions.splice(existingIndex, 1);
        }
    }

    updateViewingPatterns(profile, data) {
        // Update preferred duration
        if (data.duration) {
            const durationMinutes = this.parseDuration(data.duration);
            if (durationMinutes > 0) {
                if (!profile.viewingPatterns.preferredDuration) {
                    profile.viewingPatterns.preferredDuration = durationMinutes;
                } else {
                    // Moving average
                    profile.viewingPatterns.preferredDuration = 
                        (profile.viewingPatterns.preferredDuration * 0.8) + (durationMinutes * 0.2);
                }
            }
        }

        // Update preferred quality
        if (data.quality) {
            const qualityScores = { 'SD': 1, 'HD': 2, '4K': 3 };
            const currentScore = qualityScores[data.quality] || 1;
            
            if (!profile.viewingPatterns.preferredQuality) {
                profile.viewingPatterns.preferredQuality = data.quality;
            } else {
                const preferredScore = qualityScores[profile.viewingPatterns.preferredQuality] || 1;
                if (currentScore > preferredScore) {
                    profile.viewingPatterns.preferredQuality = data.quality;
                }
            }
        }

        // Update active hours
        const hour = new Date().getHours();
        profile.viewingPatterns.activeHours[hour] = (profile.viewingPatterns.activeHours[hour] || 0) + 1;
    }

    updatePreferences(profile) {
        // Update category preferences based on watch history and favorites
        const categoryScores = {};
        
        // From watch history
        profile.watchHistory.forEach(watch => {
            if (watch.categories) {
                watch.categories.forEach(category => {
                    categoryScores[category] = (categoryScores[category] || 0) + 0.1;
                });
            }
        });

        // From favorites (higher weight)
        profile.favorites.forEach(favorite => {
            const watch = profile.watchHistory.find(w => w.videoId === favorite.videoId);
            if (watch && watch.categories) {
                watch.categories.forEach(category => {
                    categoryScores[category] = (categoryScores[category] || 0) + 0.3;
                });
            }
        });

        // From ratings (weighted by rating value)
        profile.ratings.forEach(rating => {
            const watch = profile.watchHistory.find(w => w.videoId === rating.videoId);
            if (watch && watch.categories) {
                const weight = rating.rating / 5; // Normalize to 0-1
                watch.categories.forEach(category => {
                    categoryScores[category] = (categoryScores[category] || 0) + (0.2 * weight);
                });
            }
        });

        // Normalize scores
        const maxScore = Math.max(...Object.values(categoryScores));
        if (maxScore > 0) {
            Object.keys(categoryScores).forEach(category => {
                profile.categoryPreferences[category] = {
                    score: categoryScores[category] / maxScore,
                    frequency: this.calculateCategoryFrequency(profile, category)
                };
            });
        }

        // Update performer preferences
        const performerScores = {};
        
        profile.watchHistory.forEach(watch => {
            performerScores[watch.artist] = (performerScores[watch.artist] || 0) + 0.1;
        });

        profile.favorites.forEach(favorite => {
            const watch = profile.watchHistory.find(w => w.videoId === favorite.videoId);
            if (watch) {
                performerScores[watch.artist] = (performerScores[watch.artist] || 0) + 0.3;
            }
        });

        profile.subscriptions.forEach(sub => {
            performerScores[sub.performer] = (performerScores[sub.performer] || 0) + 0.5;
        });

        const maxPerformerScore = Math.max(...Object.values(performerScores));
        if (maxPerformerScore > 0) {
            Object.keys(performerScores).forEach(performer => {
                profile.performerPreferences[performer] = performerScores[performer] / maxPerformerScore;
            });
        }
    }

    calculateCategoryFrequency(profile, category) {
        const totalWatches = profile.watchHistory.length;
        if (totalWatches === 0) return 0;

        const categoryWatches = profile.watchHistory.filter(watch => 
            watch.categories && watch.categories.includes(category)
        ).length;

        return categoryWatches / totalWatches;
    }

    parseDuration(duration) {
        if (!duration) return 0;
        const parts = duration.split(':').map(Number);
        return parts.length === 2 ? parts[0] * 60 + parts[1] : 0;
    }

    async saveUserProfile(userId, profile) {
        try {
            const profiles = await readJSONFile('user_profiles.json');
            profiles[userId] = profile;
            await writeJSONFile('user_profiles.json', profiles);
            this.userProfiles.set(userId, profile);
        } catch (error) {
            console.error('Error saving user profile:', error);
        }
    }

    async generateRecommendations(userId, videos, limit = 20) {
        const profile = await this.initializeUserProfile(userId);
        if (!profile) return [];

        const scoredVideos = [];
        const recentWatches = new Set(profile.watchHistory.slice(-20).map(w => w.videoId));

        for (const video of videos) {
            // Skip recently watched videos
            if (recentWatches.has(video.id)) continue;

            let score = 0;

            // Subscription boost (highest priority)
            if (profile.subscriptions.some(sub => sub.performer === video.artist)) {
                score += 1.0;
            }

            // Performer preference
            const performerScore = profile.performerPreferences[video.artist] || 0;
            score += performerScore * 0.8;

            // Category preferences
            let categoryScore = 0;
            video.categories.forEach(category => {
                const pref = profile.categoryPreferences[category];
                if (pref) {
                    categoryScore += pref.score * pref.frequency;
                }
            });
            score += categoryScore * 0.6;

            // Quality preference
            if (profile.viewingPatterns.preferredQuality === video.quality) {
                score += 0.3;
            }

            // Duration preference
            if (profile.viewingPatterns.preferredDuration && video.duration) {
                const videoDuration = this.parseDuration(video.duration);
                const durationDiff = Math.abs(videoDuration - profile.viewingPatterns.preferredDuration);
                const durationScore = Math.max(0, 1 - (durationDiff / 60)); // Normalize by hour
                score += durationScore * 0.2;
            }

            // Rating boost
            score += (video.rating / 5) * 0.3;

            // Recency boost
            if (video.uploadDate) {
                const daysSinceUpload = (Date.now() - new Date(video.uploadDate).getTime()) / (1000 * 60 * 60 * 24);
                if (daysSinceUpload <= 7) {
                    score += 0.2;
                } else if (daysSinceUpload <= 30) {
                    score += 0.1;
                }
            }

            if (score > 0) {
                scoredVideos.push({ video, score });
            }
        }

        // Sort by score and apply diversity
        scoredVideos.sort((a, b) => b.score - a.score);
        
        return this.applyDiversityFilter(scoredVideos, limit);
    }

    applyDiversityFilter(scoredVideos, limit) {
        const result = [];
        const performerCount = new Map();
        const categoryCount = new Map();

        for (const { video } of scoredVideos) {
            // Limit videos per performer
            const performerVideos = performerCount.get(video.artist) || 0;
            if (performerVideos >= 3) continue;

            // Ensure category diversity
            let categoryOverload = false;
            for (const category of video.categories) {
                const categoryVideos = categoryCount.get(category) || 0;
                if (categoryVideos >= 4) {
                    categoryOverload = true;
                    break;
                }
            }
            if (categoryOverload) continue;

            // Add to result
            result.push(video);

            // Update counts
            performerCount.set(video.artist, performerVideos + 1);
            for (const category of video.categories) {
                categoryCount.set(category, (categoryCount.get(category) || 0) + 1);
            }

            if (result.length >= limit) break;
        }

        return result;
    }
}

// Initialize AI system
const aiSystem = new AIRecommendationSystem();

// Initialize data directory
ensureDataDir();

// Video scanning and caching
let videoCache = [];
let categoriesCache = [];
let performersCache = [];
let lastScanTime = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

async function scanVideosDirectory() {
    try {
        const stats = await fs.stat(VIDEOS_DIR);
        if (stats.mtime.getTime() <= lastScanTime) {
            return; // No changes since last scan
        }

        console.log('Scanning videos directory...');
        const videos = [];
        const categories = new Set();
        const performers = new Set();

        const items = await fs.readdir(VIDEOS_DIR);
        
        for (const item of items) {
            const itemPath = path.join(VIDEOS_DIR, item);
            const itemStats = await fs.stat(itemPath);
            
            if (itemStats.isDirectory()) {
                // This is a performer/category folder
                const folderVideos = await scanFolder(itemPath, item);
                videos.push(...folderVideos);
                performers.add(item);
                
                // Extract categories from folder videos
                folderVideos.forEach(video => {
                    video.categories.forEach(cat => categories.add(cat));
                });
            } else if (isVideoFile(item)) {
                // This is a video file in the root directory
                const video = await processVideoFile(itemPath, item);
                if (video) {
                    videos.push(video);
                    video.categories.forEach(cat => categories.add(cat));
                    performers.add(video.artist);
                }
            }
        }

        videoCache = videos;
        categoriesCache = Array.from(categories).map(name => ({
            name: name.toLowerCase().replace(/\s+/g, '-'),
            displayName: formatDisplayName(name),
            count: videos.filter(v => v.categories.some(c => c.toLowerCase() === name.toLowerCase())).length
        }));
        
        performersCache = Array.from(performers).map(name => ({
            name: name.toLowerCase().replace(/\s+/g, '-'),
            displayName: formatDisplayName(name),
            videoCount: videos.filter(v => v.artist.toLowerCase() === name.toLowerCase()).length,
            hasImage: false, // You can implement image detection logic here
            imageUrl: `/api/placeholder/200/300`
        }));

        lastScanTime = Date.now();
        console.log(`Scanned ${videos.length} videos, ${categories.size} categories, ${performers.size} performers`);
    } catch (error) {
        console.error('Error scanning videos directory:', error);
    }
}

async function scanFolder(folderPath, folderName) {
    const videos = [];
    try {
        const files = await fs.readdir(folderPath);
        
        for (const file of files) {
            const filePath = path.join(folderPath, file);
            const stats = await fs.stat(filePath);
            
            if (stats.isFile() && isVideoFile(file)) {
                const video = await processVideoFile(filePath, file, folderName);
                if (video) {
                    videos.push(video);
                }
            }
        }
    } catch (error) {
        console.error(`Error scanning folder ${folderName}:`, error);
    }
    return videos;
}

async function processVideoFile(filePath, fileName, folderName = null) {
    try {
        const stats = await fs.stat(filePath);
        const fileSize = stats.size;
        const uploadDate = stats.birthtime;
        
        // Extract metadata from filename
        const metadata = extractMetadataFromFilename(fileName);
        
        const video = {
            id: generateVideoId(filePath),
            title: metadata.title || fileName.replace(/\.[^/.]+$/, ""),
            artist: folderName || metadata.artist || 'Unknown',
            categories: metadata.categories || (folderName ? [folderName] : ['uncategorized']),
            duration: metadata.duration || null,
            quality: metadata.quality || 'HD',
            rating: metadata.rating || (3.5 + Math.random() * 1.5), // Random rating between 3.5-5
            views: Math.floor(Math.random() * 10000) + 100,
            uploadDate: uploadDate.toISOString(),
            fileSize: fileSize,
            filePath: filePath,
            thumbnailExists: false,
            thumbnailUrl: `/api/placeholder/400/225`,
            isNew: (Date.now() - uploadDate.getTime()) < (7 * 24 * 60 * 60 * 1000), // New if less than 7 days old
            isWatched: false,
            isFavorite: false
        };
        
        return video;
    } catch (error) {
        console.error(`Error processing video file ${fileName}:`, error);
        return null;
    }
}

function extractMetadataFromFilename(fileName) {
    const metadata = {
        categories: [],
        quality: 'HD',
        duration: null,
        rating: null
    };
    
    const lowerFileName = fileName.toLowerCase();
    
    // Extract quality
    if (lowerFileName.includes('4k')) metadata.quality = '4K';
    else if (lowerFileName.includes('hd')) metadata.quality = 'HD';
    else if (lowerFileName.includes('sd')) metadata.quality = 'SD';
    
    // Extract categories from common patterns
    const categoryPatterns = [
        'amateur', 'anal', 'asian', 'bbc', 'bdsm', 'big-ass', 'big-tits', 'blonde', 'blowjob',
        'brunette', 'casting', 'compilation', 'creampie', 'cumshot', 'deepthroat', 'ebony',
        'facial', 'fetish', 'gangbang', 'hardcore', 'interracial', 'latina', 'lesbian',
        'masturbation', 'milf', 'oral', 'pov', 'public', 'redhead', 'small-tits', 'teen',
        'threesome', 'vintage'
    ];
    
    categoryPatterns.forEach(pattern => {
        if (lowerFileName.includes(pattern)) {
            metadata.categories.push(pattern);
        }
    });
    
    // If no categories found, try to extract from folder structure or filename
    if (metadata.categories.length === 0) {
        const parts = fileName.split(/[-_\s]+/);
        parts.forEach(part => {
            const cleanPart = part.toLowerCase().replace(/[^a-z]/g, '');
            if (cleanPart.length > 2 && categoryPatterns.includes(cleanPart)) {
                metadata.categories.push(cleanPart);
            }
        });
    }
    
    return metadata;
}

function isVideoFile(fileName) {
    const videoExtensions = ['.mp4', '.avi', '.mkv', '.mov', '.wmv', '.flv', '.webm', '.m4v', '.3gp', '.ogv'];
    const ext = path.extname(fileName).toLowerCase();
    return videoExtensions.includes(ext);
}

function generateVideoId(filePath) {
    return Buffer.from(filePath).toString('base64').replace(/[^a-zA-Z0-9]/g, '').substring(0, 16);
}

function formatDisplayName(name) {
    return name.replace(/[-_]/g, ' ')
              .split(' ')
              .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
              .join(' ');
}

// API Routes

// AI Recommendation Routes
app.get('/api/ai/user-profile/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const profile = await aiSystem.initializeUserProfile(userId);
        
        if (!profile) {
            return res.status(404).json({ error: 'User profile not found' });
        }

        res.json({
            watchHistory: profile.watchHistory,
            favorites: profile.favorites,
            subscriptions: profile.subscriptions,
            ratings: profile.ratings,
            categoryPreferences: profile.categoryPreferences,
            performerPreferences: profile.performerPreferences,
            viewingPatterns: profile.viewingPatterns,
            lastActivity: profile.lastActivity
        });
    } catch (error) {
        console.error('Error getting user profile:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.post('/api/ai/user-profile/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const { action, data } = req.body;
        
        await aiSystem.updateUserProfile(userId, action, data);
        res.json({ success: true });
    } catch (error) {
        console.error('Error updating user profile:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/api/ai/recommendations/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const limit = parseInt(req.query.limit) || 20;
        
        // Ensure videos are scanned
        if (Date.now() - lastScanTime > CACHE_DURATION) {
            await scanVideosDirectory();
        }
        
        const recommendations = await aiSystem.generateRecommendations(userId, videoCache, limit);
        
        res.json({
            videos: recommendations,
            total: recommendations.length,
            hasMore: false
        });
    } catch (error) {
        console.error('Error generating recommendations:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.post('/api/ai/track-click', async (req, res) => {
    try {
        const { userId, videoId, timestamp } = req.body;
        
        // Track recommendation click for improving future recommendations
        const analytics = await readJSONFile('recommendation_analytics.json');
        if (!analytics.clicks) analytics.clicks = [];
        
        analytics.clicks.push({
            userId,
            videoId,
            timestamp,
            clickedAt: Date.now()
        });
        
        // Keep only last 10000 clicks
        if (analytics.clicks.length > 10000) {
            analytics.clicks = analytics.clicks.slice(-10000);
        }
        
        await writeJSONFile('recommendation_analytics.json', analytics);
        res.json({ success: true });
    } catch (error) {
        console.error('Error tracking recommendation click:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Existing API routes (keeping all the original functionality)
app.get('/api/videos', async (req, res) => {
    try {
        if (Date.now() - lastScanTime > CACHE_DURATION) {
            await scanVideosDirectory();
        }

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const search = req.query.search || '';
        const celebrity = req.query.celebrity || '';
        const category = req.query.category || '';
        const sort = req.query.sort || 'random';
        const favorites = req.query.favorites === 'true';
        const userId = req.query.userId || '';
        const minDuration = req.query.minDuration || '';
        const maxDuration = req.query.maxDuration || '';
        const quality = req.query.quality || '';
        const minRating = req.query.minRating || '';

        let filteredVideos = [...videoCache];

        // Apply filters
        if (search) {
            const searchLower = search.toLowerCase();
            filteredVideos = filteredVideos.filter(video =>
                video.title.toLowerCase().includes(searchLower) ||
                video.artist.toLowerCase().includes(searchLower) ||
                video.categories.some(cat => cat.toLowerCase().includes(searchLower))
            );
        }

        if (celebrity) {
            filteredVideos = filteredVideos.filter(video =>
                video.artist.toLowerCase().includes(celebrity.toLowerCase())
            );
        }

        if (category) {
            filteredVideos = filteredVideos.filter(video =>
                video.categories.some(cat => cat.toLowerCase().includes(category.toLowerCase()))
            );
        }

        if (quality) {
            filteredVideos = filteredVideos.filter(video => video.quality === quality);
        }

        if (minRating) {
            const minRatingNum = parseFloat(minRating);
            filteredVideos = filteredVideos.filter(video => video.rating >= minRatingNum);
        }

        if (minDuration || maxDuration) {
            filteredVideos = filteredVideos.filter(video => {
                if (!video.duration) return false;
                const duration = parseDurationToMinutes(video.duration);
                if (minDuration && duration < parseInt(minDuration)) return false;
                if (maxDuration && duration > parseInt(maxDuration)) return false;
                return true;
            });
        }

        if (favorites && userId) {
            const userFavorites = await readJSONFile('favorites.json');
            const userFavList = userFavorites[userId] || [];
            filteredVideos = filteredVideos.filter(video => userFavList.includes(video.id));
        }

        // Apply sorting
        switch (sort) {
            case 'newest':
                filteredVideos.sort((a, b) => new Date(b.uploadDate) - new Date(a.uploadDate));
                break;
            case 'oldest':
                filteredVideos.sort((a, b) => new Date(a.uploadDate) - new Date(b.uploadDate));
                break;
            case 'most-viewed':
                filteredVideos.sort((a, b) => b.views - a.views);
                break;
            case 'highest-rated':
                filteredVideos.sort((a, b) => b.rating - a.rating);
                break;
            case 'longest':
                filteredVideos.sort((a, b) => {
                    const aDuration = parseDurationToMinutes(a.duration) || 0;
                    const bDuration = parseDurationToMinutes(b.duration) || 0;
                    return bDuration - aDuration;
                });
                break;
            case 'shortest':
                filteredVideos.sort((a, b) => {
                    const aDuration = parseDurationToMinutes(a.duration) || 999;
                    const bDuration = parseDurationToMinutes(b.duration) || 999;
                    return aDuration - bDuration;
                });
                break;
            case 'random':
            default:
                filteredVideos = shuffleArray(filteredVideos);
                break;
        }

        // Add user-specific data
        if (userId) {
            const userFavorites = await readJSONFile('favorites.json');
            const userFavList = userFavorites[userId] || [];
            
            filteredVideos = filteredVideos.map(video => ({
                ...video,
                isFavorite: userFavList.includes(video.id)
            }));
        }

        // Pagination
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + limit;
        const paginatedVideos = filteredVideos.slice(startIndex, endIndex);

        res.json({
            videos: paginatedVideos,
            total: filteredVideos.length,
            page: page,
            limit: limit,
            hasMore: endIndex < filteredVideos.length
        });
    } catch (error) {
        console.error('Error fetching videos:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

function parseDurationToMinutes(duration) {
    if (!duration) return 0;
    const parts = duration.split(':').map(Number);
    return parts.length === 2 ? parts[0] * 60 + parts[1] : 0;
}

function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

// Categories API
app.get('/api/categories', async (req, res) => {
    try {
        if (Date.now() - lastScanTime > CACHE_DURATION) {
            await scanVideosDirectory();
        }
        res.json({ categories: categoriesCache });
    } catch (error) {
        console.error('Error fetching categories:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Celebrities/Performers API
app.get('/api/celebrities', async (req, res) => {
    try {
        if (Date.now() - lastScanTime > CACHE_DURATION) {
            await scanVideosDirectory();
        }
        res.json({ celebrities: performersCache });
    } catch (error) {
        console.error('Error fetching celebrities:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Video streaming
app.get('/api/video-stream/:id', async (req, res) => {
    try {
        const videoId = req.params.id;
        const video = videoCache.find(v => v.id === videoId);
        
        if (!video) {
            return res.status(404).json({ error: 'Video not found' });
        }

        const videoPath = video.filePath;
        const stat = await fs.stat(videoPath);
        const fileSize = stat.size;
        const range = req.headers.range;

        if (range) {
            const parts = range.replace(/bytes=/, "").split("-");
            const start = parseInt(parts[0], 10);
            const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
            const chunksize = (end - start) + 1;
            
            res.writeHead(206, {
                'Content-Range': `bytes ${start}-${end}/${fileSize}`,
                'Accept-Ranges': 'bytes',
                'Content-Length': chunksize,
                'Content-Type': 'video/mp4',
            });
            
            const stream = require('fs').createReadStream(videoPath, { start, end });
            stream.pipe(res);
        } else {
            res.writeHead(200, {
                'Content-Length': fileSize,
                'Content-Type': 'video/mp4',
            });
            
            const stream = require('fs').createReadStream(videoPath);
            stream.pipe(res);
        }
    } catch (error) {
        console.error('Error streaming video:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Trending videos
app.get('/api/trending', async (req, res) => {
    try {
        if (Date.now() - lastScanTime > CACHE_DURATION) {
            await scanVideosDirectory();
        }

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;

        // Sort by views and recent upload date
        const trendingVideos = [...videoCache]
            .sort((a, b) => {
                const aScore = b.views + (b.isNew ? 1000 : 0);
                const bScore = a.views + (a.isNew ? 1000 : 0);
                return aScore - bScore;
            });

        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + limit;
        const paginatedVideos = trendingVideos.slice(startIndex, endIndex);

        res.json({
            videos: paginatedVideos,
            total: trendingVideos.length,
            page: page,
            limit: limit,
            hasMore: endIndex < trendingVideos.length
        });
    } catch (error) {
        console.error('Error fetching trending videos:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// User authentication
app.post('/api/auth/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;
        
        const users = await readJSONFile('users.json');
        
        if (users[email]) {
            return res.status(400).json({ error: 'User already exists' });
        }
        
        const hashedPassword = await bcrypt.hash(password, 10);
        const userId = uuidv4();
        
        users[email] = {
            id: userId,
            username,
            email,
            password: hashedPassword,
            avatar: `/api/placeholder/32/32`,
            bio: '',
            createdAt: new Date().toISOString()
        };
        
        await writeJSONFile('users.json', users);
        
        const token = jwt.sign({ userId, email }, 'secret_key', { expiresIn: '7d' });
        
        res.json({
            user: {
                id: userId,
                username,
                email,
                avatar: users[email].avatar,
                bio: users[email].bio
            },
            token
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        const users = await readJSONFile('users.json');
        const user = users[email];
        
        if (!user || !await bcrypt.compare(password, user.password)) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        const token = jwt.sign({ userId: user.id, email }, 'secret_key', { expiresIn: '7d' });
        
        res.json({
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                avatar: user.avatar,
                bio: user.bio
            },
            token
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Favorites
app.post('/api/favorites/:videoId', async (req, res) => {
    try {
        const { videoId } = req.params;
        const { userId } = req.body;
        
        const favorites = await readJSONFile('favorites.json');
        if (!favorites[userId]) favorites[userId] = [];
        
        if (!favorites[userId].includes(videoId)) {
            favorites[userId].push(videoId);
            await writeJSONFile('favorites.json', favorites);
            
            // Update AI profile
            await aiSystem.updateUserProfile(userId, 'favorite', { videoId, timestamp: Date.now() });
        }
        
        res.json({ success: true });
    } catch (error) {
        console.error('Error adding favorite:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.delete('/api/favorites/:videoId', async (req, res) => {
    try {
        const { videoId } = req.params;
        const { userId } = req.query;
        
        const favorites = await readJSONFile('favorites.json');
        if (favorites[userId]) {
            favorites[userId] = favorites[userId].filter(id => id !== videoId);
            await writeJSONFile('favorites.json', favorites);
        }
        
        res.json({ success: true });
    } catch (error) {
        console.error('Error removing favorite:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/api/favorites', async (req, res) => {
    try {
        const { userId } = req.query;
        const favorites = await readJSONFile('favorites.json');
        const userFavorites = favorites[userId] || [];
        
        res.json({ 
            favorites: userFavorites,
            total: userFavorites.length 
        });
    } catch (error) {
        console.error('Error fetching favorites:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Subscriptions
app.post('/api/subscriptions/:performer', async (req, res) => {
    try {
        const { performer } = req.params;
        const { userId } = req.body;
        
        const subscriptions = await readJSONFile('subscriptions.json');
        if (!subscriptions[userId]) subscriptions[userId] = [];
        
        const subscription = {
            name: performer,
            displayName: formatDisplayName(performer),
            subscribedAt: new Date().toISOString()
        };
        
        if (!subscriptions[userId].find(sub => sub.name === performer)) {
            subscriptions[userId].push(subscription);
            await writeJSONFile('subscriptions.json', subscriptions);
            
            // Update AI profile
            await aiSystem.updateUserProfile(userId, 'subscription', { performer, timestamp: Date.now() });
        }
        
        res.json({ success: true });
    } catch (error) {
        console.error('Error adding subscription:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.delete('/api/subscriptions/:performer', async (req, res) => {
    try {
        const { performer } = req.params;
        const { userId } = req.query;
        
        const subscriptions = await readJSONFile('subscriptions.json');
        if (subscriptions[userId]) {
            subscriptions[userId] = subscriptions[userId].filter(sub => sub.name !== performer);
            await writeJSONFile('subscriptions.json', subscriptions);
        }
        
        res.json({ success: true });
    } catch (error) {
        console.error('Error removing subscription:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/api/subscriptions/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const subscriptions = await readJSONFile('subscriptions.json');
        const userSubscriptions = subscriptions[userId] || [];
        
        res.json({ 
            subscriptions: userSubscriptions,
            total: userSubscriptions.length 
        });
    } catch (error) {
        console.error('Error fetching subscriptions:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Ratings
app.post('/api/rate/:videoId', async (req, res) => {
    try {
        const { videoId } = req.params;
        const { rating } = req.body;
        
        const ratings = await readJSONFile('ratings.json');
        if (!ratings[videoId]) ratings[videoId] = [];
        
        ratings[videoId].push({
            rating: rating,
            timestamp: Date.now()
        });
        
        await writeJSONFile('ratings.json', ratings);
        
        res.json({ success: true });
    } catch (error) {
        console.error('Error saving rating:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Playlists
app.get('/api/playlists/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const playlists = await readJSONFile('playlists.json');
        const userPlaylists = playlists[userId] || [];
        
        res.json({ 
            playlists: userPlaylists,
            total: userPlaylists.length 
        });
    } catch (error) {
        console.error('Error fetching playlists:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.post('/api/playlists', async (req, res) => {
    try {
        const { name, userId, description, isPrivate } = req.body;
        
        const playlists = await readJSONFile('playlists.json');
        if (!playlists[userId]) playlists[userId] = [];
        
        const playlist = {
            id: uuidv4(),
            name,
            description: description || '',
            isPrivate: isPrivate || false,
            videos: [],
            createdAt: new Date().toISOString()
        };
        
        playlists[userId].push(playlist);
        await writeJSONFile('playlists.json', playlists);
        
        res.json({ playlist });
    } catch (error) {
        console.error('Error creating playlist:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Search suggestions
app.get('/api/search/suggestions', async (req, res) => {
    try {
        const query = req.query.q || '';
        if (query.length < 2) {
            return res.json({ suggestions: [] });
        }

        if (Date.now() - lastScanTime > CACHE_DURATION) {
            await scanVideosDirectory();
        }

        const suggestions = [];
        const queryLower = query.toLowerCase();

        // Video suggestions
        const videoMatches = videoCache
            .filter(video => video.title.toLowerCase().includes(queryLower))
            .slice(0, 3)
            .map(video => ({
                type: 'video',
                value: video.id,
                text: video.title,
                count: null
            }));

        // Performer suggestions
        const performerMatches = performersCache
            .filter(performer => performer.displayName.toLowerCase().includes(queryLower))
            .slice(0, 3)
            .map(performer => ({
                type: 'celebrity',
                value: performer.name,
                text: performer.displayName,
                count: performer.videoCount
            }));

        // Category suggestions
        const categoryMatches = categoriesCache
            .filter(category => category.displayName.toLowerCase().includes(queryLower))
            .slice(0, 3)
            .map(category => ({
                type: 'category',
                value: category.name,
                text: category.displayName,
                count: category.count
            }));

        suggestions.push(...videoMatches, ...performerMatches, ...categoryMatches);

        res.json({ suggestions });
    } catch (error) {
        console.error('Error fetching search suggestions:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Reshuffle videos
app.post('/api/reshuffle', async (req, res) => {
    try {
        // Force rescan and shuffle
        await scanVideosDirectory();
        res.json({ success: true });
    } catch (error) {
        console.error('Error reshuffling:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Placeholder image endpoint
app.get('/api/placeholder/:width/:height', (req, res) => {
    const { width, height } = req.params;
    const color = req.query.color || '333333';
    const textColor = req.query.text || 'ffffff';
    
    // Generate a simple SVG placeholder
    const svg = `
        <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
            <rect width="100%" height="100%" fill="#${color}"/>
            <text x="50%" y="50%" font-family="Arial, sans-serif" font-size="14" fill="#${textColor}" text-anchor="middle" dy=".3em">${width}×${height}</text>
        </svg>
    `;
    
    res.setHeader('Content-Type', 'image/svg+xml');
    res.send(svg);
});

// Serve main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Periodic video scanning
cron.schedule('*/5 * * * *', () => {
    console.log('Running periodic video scan...');
    scanVideosDirectory();
});

// Initial scan on startup
scanVideosDirectory();

app.listen(PORT, () => {
    console.log(`CelebStream server running on port ${PORT}`);
    console.log(`Videos directory: ${VIDEOS_DIR}`);
    console.log(`Data directory: ${DATA_DIR}`);
});