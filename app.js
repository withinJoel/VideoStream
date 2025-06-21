import express from 'express';
import fs from 'fs';
import path from 'path';
import ffmpeg from 'fluent-ffmpeg';
import cors from 'cors';
import { fileURLToPath } from 'url';

// ESM workaround for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;
const VIDEOS_DIR = path.join(__dirname, 'Videos');
const THUMBNAILS_DIR = path.join(__dirname, 'public', 'thumbnails');
const PREVIEWS_DIR = path.join(__dirname, 'public', 'previews');

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));
app.use('/videos', express.static(VIDEOS_DIR));
app.use('/thumbnails', express.static(THUMBNAILS_DIR));
app.use('/previews', express.static(PREVIEWS_DIR));

// Ensure directories exist
[THUMBNAILS_DIR, PREVIEWS_DIR].forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

const VIDEO_EXTENSIONS = ['.mp4', '.avi', '.mov', '.mkv', '.webm', '.m4v'];

// Memory management
let videoCount = 0;
let lastScanTime = 0;
const watchers = new Map();
let randomSeed = Math.random();

// In-memory favorites storage (you can replace with database later)
let favorites = new Set();

// Memory-efficient random number generator
const seededRandom = (seed, index) => {
    const x = Math.sin(seed * index) * 10000;
    return x - Math.floor(x);
};

// Helper function to format names
const formatName = (name) => {
    return name.replace(/[_-]/g, ' ')
               .split(' ')
               .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
               .join(' ');
};

// Extract categories from filename
const extractCategories = (filename) => {
    const name = filename.toLowerCase();
    const categories = [];
    
    // Define category keywords
    const categoryMap = {
        'anal': ['anal', 'anal-sex'],
        'gangbang': ['gang-bang', 'gangbang', 'group'],
        'lesbian': ['lesbian', 'girl-girl'],
        'milf': ['milf', 'mature'],
        'teen': ['teen', '18+', 'young'],
        'hardcore': ['hardcore', 'rough'],
        'blowjob': ['blowjob', 'oral', 'bj'],
        'threesome': ['threesome', '3some', 'mmf', 'ffm'],
        'creampie': ['creampie', 'internal'],
        'big-tits': ['big-tits', 'busty', 'boobs'],
        'pov': ['pov', 'point-of-view'],
        'interracial': ['interracial', 'bbc', 'mixed']
    };
    
    for (const [category, keywords] of Object.entries(categoryMap)) {
        if (keywords.some(keyword => name.includes(keyword))) {
            categories.push(category);
        }
    }
    
    return categories.length > 0 ? categories : ['general'];
};

// Extract video quality and duration info from filename
const extractVideoInfo = (filename) => {
    const name = path.parse(filename).name;
    const qualityRegex = /(\d+p|\d+k|\d+m|4k|hd|fhd|uhd|720p|1080p|1440p|2160p)/gi;
    const durationRegex = /(\d+min|\d+m|\d+s|\d+:\d+)/gi;
    
    const qualities = name.match(qualityRegex) || [];
    const durations = name.match(durationRegex) || [];
    
    // Clean the title by removing quality and duration info
    let cleanTitle = name.replace(qualityRegex, '').replace(durationRegex, '');
    cleanTitle = formatName(cleanTitle.replace(/\s+/g, ' ').trim());
    
    return {
        title: cleanTitle,
        quality: qualities.length > 0 ? qualities[0].toUpperCase() : null,
        duration: durations.length > 0 ? durations[0] : null,
        categories: extractCategories(filename)
    };
};

// Get video duration using ffmpeg
const getVideoDuration = async (videoPath) => {
    return new Promise((resolve) => {
        ffmpeg.ffprobe(videoPath, (err, metadata) => {
            if (err || !metadata || !metadata.format) {
                resolve(null);
                return;
            }
            
            const duration = metadata.format.duration;
            if (duration) {
                const minutes = Math.floor(duration / 60);
                const seconds = Math.floor(duration % 60);
                resolve(`${minutes}:${seconds.toString().padStart(2, '0')}`);
            } else {
                resolve(null);
            }
        });
    });
};

// Get all celebrity folders (performers)
const getCelebrityFolders = () => {
    try {
        const items = fs.readdirSync(VIDEOS_DIR, { withFileTypes: true });
        const folders = items
            .filter(item => item.isDirectory())
            .map(item => ({
                name: item.name,
                displayName: formatName(item.name),
                videoCount: 0
            }));

        // Count videos in each folder
        folders.forEach(folder => {
            try {
                const folderPath = path.join(VIDEOS_DIR, folder.name);
                const subItems = fs.readdirSync(folderPath, { withFileTypes: true });
                folder.videoCount = subItems.filter(sub => 
                    sub.isFile() && VIDEO_EXTENSIONS.includes(path.extname(sub.name).toLowerCase())
                ).length;
            } catch (err) {
                folder.videoCount = 0;
            }
        });

        return folders.filter(folder => folder.videoCount > 0);
    } catch (err) {
        console.error('Error getting celebrity folders:', err);
        return [];
    }
};

// Get all categories from videos
const getAllCategories = () => {
    const categoryCount = {};
    const items = fs.readdirSync(VIDEOS_DIR, { withFileTypes: true });
    
    for (const item of items) {
        if (item.isFile() && VIDEO_EXTENSIONS.includes(path.extname(item.name).toLowerCase())) {
            const categories = extractCategories(item.name);
            categories.forEach(cat => {
                categoryCount[cat] = (categoryCount[cat] || 0) + 1;
            });
        } else if (item.isDirectory()) {
            try {
                const subItems = fs.readdirSync(path.join(VIDEOS_DIR, item.name), { withFileTypes: true });
                subItems.forEach(sub => {
                    if (sub.isFile() && VIDEO_EXTENSIONS.includes(path.extname(sub.name).toLowerCase())) {
                        const categories = extractCategories(sub.name);
                        categories.forEach(cat => {
                            categoryCount[cat] = (categoryCount[cat] || 0) + 1;
                        });
                    }
                });
            } catch (err) {
                // Skip problematic directories
            }
        }
    }
    
    return Object.entries(categoryCount).map(([name, count]) => ({
        name,
        displayName: formatName(name),
        count
    }));
};

// Quick file count
const countVideos = (celebrityFilter = '', categoryFilter = '') => {
    let count = 0;
    const items = fs.readdirSync(VIDEOS_DIR, { withFileTypes: true });
    
    for (const item of items) {
        if (item.isFile() && VIDEO_EXTENSIONS.includes(path.extname(item.name).toLowerCase())) {
            if (!celebrityFilter) {
                if (!categoryFilter || extractCategories(item.name).includes(categoryFilter)) {
                    count++;
                }
            }
        } else if (item.isDirectory()) {
            // Skip if celebrity filter is specified and doesn't match
            if (celebrityFilter && item.name !== celebrityFilter) {
                continue;
            }
            
            try {
                const subItems = fs.readdirSync(path.join(VIDEOS_DIR, item.name), { withFileTypes: true });
                subItems.forEach(sub => {
                    if (sub.isFile() && VIDEO_EXTENSIONS.includes(path.extname(sub.name).toLowerCase())) {
                        if (!categoryFilter || extractCategories(sub.name).includes(categoryFilter)) {
                            count++;
                        }
                    }
                });
            } catch (err) {
                // Skip problematic directories
            }
        }
    }
    return count;
};

// Streaming random video generator with proper randomization
const generateRandomVideos = function* (startIndex, limit, searchTerm = '', celebrityFilter = '', categoryFilter = '', favoritesOnly = false) {
    const items = fs.readdirSync(VIDEOS_DIR, { withFileTypes: true });
    const allPaths = [];
    
    // Collect paths only (minimal memory)
    for (const item of items) {
        if (item.isFile() && VIDEO_EXTENSIONS.includes(path.extname(item.name).toLowerCase())) {
            // Skip root files if celebrity filter is specified
            if (celebrityFilter) continue;
            allPaths.push({ name: item.name, artist: 'Random', isRoot: true });
        } else if (item.isDirectory()) {
            // Skip if celebrity filter is specified and doesn't match
            if (celebrityFilter && item.name !== celebrityFilter) {
                continue;
            }
            
            try {
                const subItems = fs.readdirSync(path.join(VIDEOS_DIR, item.name), { withFileTypes: true });
                for (const sub of subItems) {
                    if (sub.isFile() && VIDEO_EXTENSIONS.includes(path.extname(sub.name).toLowerCase())) {
                        allPaths.push({ 
                            name: sub.name, 
                            artist: formatName(item.name), 
                            isRoot: false, 
                            folder: item.name 
                        });
                    }
                }
            } catch (err) {
                // Skip
            }
        }
    }
    
    // Apply filters
    let filtered = allPaths;
    
    // Search filter
    if (searchTerm) {
        filtered = filtered.filter(p => {
            const searchLower = searchTerm.toLowerCase();
            const videoInfo = extractVideoInfo(p.name);
            const titleFormatted = videoInfo.title;
            const artistFormatted = formatName(p.artist);
            
            return titleFormatted.toLowerCase().includes(searchLower) ||
                   artistFormatted.toLowerCase().includes(searchLower) ||
                   p.name.toLowerCase().includes(searchLower);
        });
    }
    
    // Category filter
    if (categoryFilter) {
        filtered = filtered.filter(p => {
            const categories = extractCategories(p.name);
            return categories.includes(categoryFilter);
        });
    }
    
    // Favorites filter
    if (favoritesOnly) {
        filtered = filtered.filter(p => {
            const videoId = p.isRoot ? 
                `root_${path.parse(p.name).name}` : 
                `${p.folder}_${path.parse(p.name).name}`;
            return favorites.has(videoId);
        });
    }
    
    // Always randomize the order for better variety
    const randomIndexes = [];
    for (let i = 0; i < filtered.length; i++) {
        // Use current time + index for better randomization
        const randomValue = Math.sin((randomSeed + Date.now() / 1000) * (i + 1)) * 10000;
        randomIndexes.push({ index: i, random: randomValue - Math.floor(randomValue) });
    }
    randomIndexes.sort((a, b) => a.random - b.random);
    
    // Yield videos in random order
    let yielded = 0;
    for (let i = startIndex; i < randomIndexes.length && yielded < limit; i++, yielded++) {
        const pathData = filtered[randomIndexes[i].index];
        const videoInfo = extractVideoInfo(pathData.name);
        const thumbnailName = pathData.isRoot ? 
            `${path.parse(pathData.name).name}.jpg` : 
            `${pathData.folder}_${path.parse(pathData.name).name}.jpg`;
        
        const previewName = pathData.isRoot ? 
            `${path.parse(pathData.name).name}_preview.mp4` : 
            `${pathData.folder}_${path.parse(pathData.name).name}_preview.mp4`;
        
        const videoId = pathData.isRoot ? 
            `root_${path.parse(pathData.name).name}` : 
            `${pathData.folder}_${path.parse(pathData.name).name}`;
        
        yield {
            id: videoId,
            title: videoInfo.title,
            artist: pathData.artist,
            quality: videoInfo.quality,
            duration: videoInfo.duration,
            categories: videoInfo.categories,
            videoUrl: pathData.isRoot ? 
                `/videos/${pathData.name}` : 
                `/videos/${pathData.folder}/${pathData.name}`,
            thumbnailUrl: `/thumbnails/${thumbnailName}`,
            previewUrl: `/previews/${previewName}`,
            thumbnailExists: fs.existsSync(path.join(THUMBNAILS_DIR, thumbnailName)),
            previewExists: fs.existsSync(path.join(PREVIEWS_DIR, previewName)),
            isFavorite: favorites.has(videoId)
        };
    }
};

// File system watching
const setupWatchers = () => {
    // Clear existing watchers
    watchers.forEach(watcher => watcher.close());
    watchers.clear();
    
    try {
        // Watch main directory
        const mainWatcher = fs.watch(VIDEOS_DIR, { recursive: false }, (eventType, filename) => {
            if (filename && VIDEO_EXTENSIONS.some(ext => filename.toLowerCase().endsWith(ext))) {
                console.log(`📹 Video ${eventType}: ${filename}`);
                videoCount = countVideos();
                randomSeed = Math.random(); // Re-randomize order
            }
        });
        watchers.set('main', mainWatcher);
        
        // Watch subdirectories
        const items = fs.readdirSync(VIDEOS_DIR, { withFileTypes: true });
        items.forEach(item => {
            if (item.isDirectory()) {
                try {
                    const subWatcher = fs.watch(path.join(VIDEOS_DIR, item.name), (eventType, filename) => {
                        if (filename && VIDEO_EXTENSIONS.some(ext => filename.toLowerCase().endsWith(ext))) {
                            console.log(`📹 Video ${eventType} in ${item.name}: ${filename}`);
                            videoCount = countVideos();
                            randomSeed = Math.random();
                        }
                    });
                    watchers.set(item.name, subWatcher);
                } catch (err) {
                    // Skip problematic directories
                }
            }
        });
        
        console.log(`👀 Watching ${watchers.size} directories for changes`);
    } catch (err) {
        console.error('Error setting up watchers:', err);
    }
};

// Background thumbnail and preview generation
const thumbnailQueue = new Set();
const previewQueue = new Set();

const processThumbnailQueue = async () => {
    if (thumbnailQueue.size === 0) return;
    
    const batch = Array.from(thumbnailQueue).slice(0, 3);
    batch.forEach(item => thumbnailQueue.delete(item));
    
    const promises = batch.map(async ({ videoPath, thumbnailPath }) => {
        try {
            if (!fs.existsSync(videoPath)) {
                console.log(`Video file not found: ${videoPath}`);
                return;
            }

            const timestamp = ['8%', '15%', '25%', '35%', '45%'][Math.floor(Math.random() * 5)];
            await new Promise((resolve, reject) => {
                ffmpeg(videoPath)
                    .screenshots({
                        timestamps: [timestamp],
                        filename: path.basename(thumbnailPath),
                        folder: path.dirname(thumbnailPath),
                        size: '320x180'
                    })
                    .on('end', resolve)
                    .on('error', (err) => {
                        console.log(`Thumbnail generation failed for ${videoPath}:`, err.message);
                        reject(err);
                    });
            });
        } catch (err) {
            // Silent fail for thumbnail generation
        }
    });
    
    await Promise.allSettled(promises);
};

const processPreviewQueue = async () => {
    if (previewQueue.size === 0) return;
    
    const batch = Array.from(previewQueue).slice(0, 2);
    batch.forEach(item => previewQueue.delete(item));
    
    const promises = batch.map(async ({ videoPath, previewPath }) => {
        try {
            if (!fs.existsSync(videoPath)) {
                console.log(`Video file not found: ${videoPath}`);
                return;
            }

            await new Promise((resolve, reject) => {
                ffmpeg(videoPath)
                    .seekInput(10)
                    .duration(10)
                    .size('480x270')
                    .fps(15)
                    .videoBitrate('500k')
                    .audioCodec('aac')
                    .videoCodec('libx264')
                    .output(previewPath)
                    .on('end', resolve)
                    .on('error', (err) => {
                        console.log(`Preview generation failed for ${videoPath}:`, err.message);
                        reject(err);
                    })
                    .run();
            });
        } catch (err) {
            // Silent fail for preview generation
        }
    });
    
    await Promise.allSettled(promises);
};

// Process queues
setInterval(processThumbnailQueue, 2000);
setInterval(processPreviewQueue, 5000);

// API ENDPOINTS

// Main videos endpoint
app.get('/api/videos', (req, res) => {
    try {
        const { page = 1, limit = 20, search = '', celebrity = '', category = '', favorites = 'false' } = req.query;
        const startIndex = (parseInt(page) - 1) * parseInt(limit);
        const favoritesOnly = favorites === 'true';
        
        const videos = [];
        const generator = generateRandomVideos(startIndex, parseInt(limit), search, celebrity, category, favoritesOnly);
        
        for (const video of generator) {
            videos.push(video);
            
            // Queue thumbnail generation if missing
            if (!video.thumbnailExists) {
                const videoPath = video.videoUrl.startsWith('/videos/') ? 
                    path.join(VIDEOS_DIR, video.videoUrl.slice(8)) : '';
                const thumbnailPath = path.join(THUMBNAILS_DIR, video.thumbnailUrl.split('/').pop());
                
                if (videoPath && fs.existsSync(videoPath)) {
                    thumbnailQueue.add({ videoPath, thumbnailPath });
                }
            }
            
            // Queue preview generation if missing
            if (!video.previewExists) {
                const videoPath = video.videoUrl.startsWith('/videos/') ? 
                    path.join(VIDEOS_DIR, video.videoUrl.slice(8)) : '';
                const previewPath = path.join(PREVIEWS_DIR, video.previewUrl.split('/').pop());
                
                if (videoPath && fs.existsSync(videoPath)) {
                    previewQueue.add({ videoPath, previewPath });
                }
            }
        }
        
        const totalCount = favoritesOnly ? favorites.size : countVideos(celebrity, category);
        
        res.json({
            videos,
            hasMore: startIndex + videos.length < totalCount,
            total: totalCount,
            cached: false
        });
        
    } catch (err) {
        console.error('Error:', err);
        res.status(500).json({ error: 'Failed to fetch videos' });
    }
});

// Get all celebrities/performers
app.get('/api/celebrities', (req, res) => {
    try {
        const celebrities = getCelebrityFolders();
        res.json({ celebrities });
    } catch (err) {
        console.error('Error getting celebrities:', err);
        res.status(500).json({ error: 'Failed to fetch celebrities' });
    }
});

// Get all categories
app.get('/api/categories', (req, res) => {
    try {
        const categories = getAllCategories();
        res.json({ categories });
    } catch (err) {
        console.error('Error getting categories:', err);
        res.status(500).json({ error: 'Failed to fetch categories' });
    }
});

// Favorites management
app.post('/api/favorites/:id', (req, res) => {
    try {
        const { id } = req.params;
        favorites.add(id);
        res.json({ message: 'Added to favorites', id });
    } catch (err) {
        res.status(500).json({ error: 'Failed to add to favorites' });
    }
});

app.delete('/api/favorites/:id', (req, res) => {
    try {
        const { id } = req.params;
        favorites.delete(id);
        res.json({ message: 'Removed from favorites', id });
    } catch (err) {
        res.status(500).json({ error: 'Failed to remove from favorites' });
    }
});

// Get favorites
app.get('/api/favorites', (req, res) => {
    try {
        res.json({ favorites: Array.from(favorites) });
    } catch (err) {
        res.status(500).json({ error: 'Failed to get favorites' });
    }
});

// Instant random video
app.get('/api/random-video', (req, res) => {
    try {
        const randomIndex = Math.floor(Math.random() * videoCount);
        const generator = generateRandomVideos(randomIndex, 1);
        const video = generator.next().value;
        
        if (video) {
            res.json(video);
        } else {
            res.status(404).json({ error: 'No videos found' });
        }
    } catch (err) {
        res.status(500).json({ error: 'Failed to get random video' });
    }
});

// Re-randomize order
app.post('/api/reshuffle', (req, res) => {
    randomSeed = Math.random();
    res.json({ message: 'Order reshuffled!', total: videoCount });
});

// Get stats
app.get('/api/stats', (req, res) => {
    res.json({
        totalVideos: videoCount,
        watchedDirectories: watchers.size,
        pendingThumbnails: thumbnailQueue.size,
        pendingPreviews: previewQueue.size,
        memoryUsage: process.memoryUsage()
    });
});

// Search suggestions endpoint
app.get('/api/search/suggestions', (req, res) => {
    try {
        const { q } = req.query;
        if (!q || q.length < 2) {
            return res.json({ suggestions: [] });
        }

        const celebrities = getCelebrityFolders();
        const categories = getAllCategories();
        
        const celebritySuggestions = celebrities
            .filter(celebrity => 
                celebrity.displayName.toLowerCase().includes(q.toLowerCase())
            )
            .slice(0, 5)
            .map(celebrity => ({
                type: 'celebrity',
                text: celebrity.displayName,
                value: celebrity.name
            }));

        const categorySuggestions = categories
            .filter(category => 
                category.displayName.toLowerCase().includes(q.toLowerCase())
            )
            .slice(0, 5)
            .map(category => ({
                type: 'category',
                text: category.displayName,
                value: category.name
            }));

        res.json({ 
            suggestions: [...celebritySuggestions, ...categorySuggestions].slice(0, 10) 
        });
    } catch (err) {
        console.error('Error getting search suggestions:', err);
        res.status(500).json({ error: 'Failed to fetch suggestions' });
    }
});

// Serve main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Initialize
console.log('🚀 Initializing ultra-fast celebrity video server...');
videoCount = countVideos();
setupWatchers();

// Refresh watchers every 30 seconds
setInterval(() => {
    setupWatchers();
}, 30000);

app.listen(PORT, () => {
    console.log(`⚡ Ultra-Fast Celebrity Video Server: http://localhost:${PORT}`);
    console.log(`📹 Found ${videoCount} videos`);
    console.log(`🔥 Real-time updates enabled`);
    console.log(`💾 Memory-optimized streaming`);
});