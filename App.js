const express = require('express');
const path = require('path');
const fs = require('fs').promises;
const fsSync = require('fs');
const cors = require('cors');
const multer = require('multer');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const cron = require('node-cron');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.static('public'));

// Data directories
const DATA_DIR = path.join(__dirname, 'data');
const USERS_DIR = path.join(DATA_DIR, 'users');
const WATCH_HISTORY_DIR = path.join(DATA_DIR, 'watch-history');
const FAVORITES_DIR = path.join(DATA_DIR, 'favorites');
const PLAYLISTS_DIR = path.join(DATA_DIR, 'playlists');
const SUBSCRIPTIONS_DIR = path.join(DATA_DIR, 'subscriptions');
const RATINGS_DIR = path.join(DATA_DIR, 'ratings');

// Ensure data directories exist
const ensureDirectories = async () => {
    const dirs = [DATA_DIR, USERS_DIR, WATCH_HISTORY_DIR, FAVORITES_DIR, PLAYLISTS_DIR, SUBSCRIPTIONS_DIR, RATINGS_DIR];
    for (const dir of dirs) {
        try {
            await fs.access(dir);
        } catch {
            await fs.mkdir(dir, { recursive: true });
            console.log(`Created directory: ${dir}`);
        }
    }
};

// Initialize directories
ensureDirectories();

// Helper functions for JSON file operations
const readJsonFile = async (filePath, defaultValue = []) => {
    try {
        const data = await fs.readFile(filePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        if (error.code === 'ENOENT') {
            return defaultValue;
        }
        throw error;
    }
};

const writeJsonFile = async (filePath, data) => {
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
};

// Watch History Functions
const getUserWatchHistoryPath = (userId) => {
    return path.join(WATCH_HISTORY_DIR, `${userId}.json`);
};

const addToWatchHistory = async (userId, videoData) => {
    try {
        const watchHistoryPath = getUserWatchHistoryPath(userId);
        const watchHistory = await readJsonFile(watchHistoryPath, []);
        
        // Create watch entry
        const watchEntry = {
            id: uuidv4(),
            videoId: videoData.videoId || videoData.id,
            title: videoData.title,
            artist: videoData.artist,
            thumbnailUrl: videoData.thumbnailUrl,
            duration: videoData.duration,
            quality: videoData.quality,
            categories: videoData.categories || [],
            watchedAt: new Date().toISOString(),
            timestamp: Date.now(),
            progress: videoData.progress || 0,
            completed: videoData.completed || false
        };
        
        // Remove existing entry for same video (to avoid duplicates)
        const filteredHistory = watchHistory.filter(entry => entry.videoId !== watchEntry.videoId);
        
        // Add new entry at the beginning
        filteredHistory.unshift(watchEntry);
        
        // Keep only last 1000 entries
        const limitedHistory = filteredHistory.slice(0, 1000);
        
        await writeJsonFile(watchHistoryPath, limitedHistory);
        
        console.log(`Added to watch history for user ${userId}: ${videoData.title}`);
        return watchEntry;
    } catch (error) {
        console.error('Error adding to watch history:', error);
        throw error;
    }
};

const getUserWatchHistory = async (userId, page = 1, limit = 20) => {
    try {
        const watchHistoryPath = getUserWatchHistoryPath(userId);
        const watchHistory = await readJsonFile(watchHistoryPath, []);
        
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + limit;
        const paginatedHistory = watchHistory.slice(startIndex, endIndex);
        
        return {
            videos: paginatedHistory,
            total: watchHistory.length,
            page: parseInt(page),
            limit: parseInt(limit),
            hasMore: endIndex < watchHistory.length
        };
    } catch (error) {
        console.error('Error getting watch history:', error);
        return { videos: [], total: 0, page: 1, limit: 20, hasMore: false };
    }
};

const clearUserWatchHistory = async (userId) => {
    try {
        const watchHistoryPath = getUserWatchHistoryPath(userId);
        await writeJsonFile(watchHistoryPath, []);
        console.log(`Cleared watch history for user ${userId}`);
    } catch (error) {
        console.error('Error clearing watch history:', error);
        throw error;
    }
};

const removeFromWatchHistory = async (userId, videoId) => {
    try {
        const watchHistoryPath = getUserWatchHistoryPath(userId);
        const watchHistory = await readJsonFile(watchHistoryPath, []);
        
        const filteredHistory = watchHistory.filter(entry => entry.videoId !== videoId);
        await writeJsonFile(watchHistoryPath, filteredHistory);
        
        console.log(`Removed video ${videoId} from watch history for user ${userId}`);
    } catch (error) {
        console.error('Error removing from watch history:', error);
        throw error;
    }
};

// Watch History API Routes
app.post('/api/watch-history/:videoId', async (req, res) => {
    try {
        const { videoId } = req.params;
        const { userId, title, artist, thumbnailUrl, duration, quality, categories, progress, completed } = req.body;
        
        if (!userId) {
            return res.status(400).json({ error: 'User ID is required' });
        }
        
        const videoData = {
            videoId,
            title: title || 'Unknown Title',
            artist: artist || 'Unknown Artist',
            thumbnailUrl: thumbnailUrl || '',
            duration: duration || '0:00',
            quality: quality || 'HD',
            categories: categories || [],
            progress: progress || 0,
            completed: completed || false
        };
        
        const watchEntry = await addToWatchHistory(userId, videoData);
        
        res.json({
            success: true,
            message: 'Added to watch history',
            entry: watchEntry
        });
    } catch (error) {
        console.error('Error adding to watch history:', error);
        res.status(500).json({ error: 'Failed to add to watch history' });
    }
});

app.get('/api/watch-history', async (req, res) => {
    try {
        const { userId, page = 1, limit = 20 } = req.query;
        
        if (!userId) {
            return res.status(400).json({ error: 'User ID is required' });
        }
        
        const watchHistory = await getUserWatchHistory(userId, page, limit);
        res.json(watchHistory);
    } catch (error) {
        console.error('Error getting watch history:', error);
        res.status(500).json({ error: 'Failed to get watch history' });
    }
});

app.delete('/api/watch-history/:videoId', async (req, res) => {
    try {
        const { videoId } = req.params;
        const { userId } = req.query;
        
        if (!userId) {
            return res.status(400).json({ error: 'User ID is required' });
        }
        
        await removeFromWatchHistory(userId, videoId);
        
        res.json({
            success: true,
            message: 'Removed from watch history'
        });
    } catch (error) {
        console.error('Error removing from watch history:', error);
        res.status(500).json({ error: 'Failed to remove from watch history' });
    }
});

app.delete('/api/watch-history', async (req, res) => {
    try {
        const { userId } = req.query;
        
        if (!userId) {
            return res.status(400).json({ error: 'User ID is required' });
        }
        
        await clearUserWatchHistory(userId);
        
        res.json({
            success: true,
            message: 'Watch history cleared'
        });
    } catch (error) {
        console.error('Error clearing watch history:', error);
        res.status(500).json({ error: 'Failed to clear watch history' });
    }
});

// Existing routes and functionality would continue here...
// (The rest of your existing App.js code)

// Start server
app.listen(PORT, () => {
    console.log(`CelebStream server running on port ${PORT}`);
    console.log(`Data directories initialized in: ${DATA_DIR}`);
});