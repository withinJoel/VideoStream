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

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));
app.use('/videos', express.static(VIDEOS_DIR));
app.use('/thumbnails', express.static(THUMBNAILS_DIR));

// Ensure thumbnails directory exists
if (!fs.existsSync(THUMBNAILS_DIR)) {
    fs.mkdirSync(THUMBNAILS_DIR, { recursive: true });
}

const VIDEO_EXTENSIONS = ['.mp4', '.avi', '.mov', '.mkv', '.webm', '.m4v'];

// 🚀 ULTRA-LIGHTWEIGHT MEMORY MANAGEMENT
let videoCount = 0;
let lastScanTime = 0;
const watchers = new Map();
let randomSeed = Math.random();

// Memory-efficient random number generator (no arrays stored)
const seededRandom = (seed, index) => {
    const x = Math.sin(seed * index) * 10000;
    return x - Math.floor(x);
};

// Helper function to format names (replace _ with space and capitalize)
const formatName = (name) => {
    return name.replace(/_/g, ' ')
               .split(' ')
               .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
               .join(' ');
};

// Get all celebrity folders
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

// Get random celebrity folders
const getRandomCelebrities = (count = 10) => {
    const allFolders = getCelebrityFolders();
    const shuffled = allFolders.sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
};

// Quick file count (no metadata stored)
const countVideos = () => {
    let count = 0;
    const items = fs.readdirSync(VIDEOS_DIR, { withFileTypes: true });
    
    for (const item of items) {
        if (item.isFile() && VIDEO_EXTENSIONS.includes(path.extname(item.name).toLowerCase())) {
            count++;
        } else if (item.isDirectory()) {
            try {
                const subItems = fs.readdirSync(path.join(VIDEOS_DIR, item.name), { withFileTypes: true });
                count += subItems.filter(sub => 
                    sub.isFile() && VIDEO_EXTENSIONS.includes(path.extname(sub.name).toLowerCase())
                ).length;
            } catch (err) {
                // Skip problematic directories
            }
        }
    }
    return count;
};

// 🎲 STREAMING RANDOM VIDEO GENERATOR (zero memory storage)
const generateRandomVideos = function* (startIndex, limit, searchTerm = '', celebrityFilter = '') {
    const items = fs.readdirSync(VIDEOS_DIR, { withFileTypes: true });
    const allPaths = [];
    
    // Collect paths only (minimal memory)
    for (const item of items) {
        if (item.isFile() && VIDEO_EXTENSIONS.includes(path.extname(item.name).toLowerCase())) {
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
    
    // Apply search filter if needed
    const filtered = searchTerm ? 
        allPaths.filter(p => {
            const searchLower = searchTerm.toLowerCase();
            const titleFormatted = formatName(path.parse(p.name).name);
            const artistFormatted = formatName(p.artist);
            
            return titleFormatted.toLowerCase().includes(searchLower) ||
                   artistFormatted.toLowerCase().includes(searchLower) ||
                   p.name.toLowerCase().includes(searchLower);
        }) : allPaths;
    
    // Generate random indexes using seed (only if no celebrity filter)
    if (!celebrityFilter) {
        const randomIndexes = [];
        for (let i = 0; i < filtered.length; i++) {
            randomIndexes.push({ index: i, random: seededRandom(randomSeed, i) });
        }
        randomIndexes.sort((a, b) => a.random - b.random);
        
        // Yield videos in random order
        let yielded = 0;
        for (let i = startIndex; i < randomIndexes.length && yielded < limit; i++, yielded++) {
            const pathData = filtered[randomIndexes[i].index];
            const videoName = formatName(path.parse(pathData.name).name);
            const thumbnailName = pathData.isRoot ? 
                `${path.parse(pathData.name).name}.jpg` : 
                `${pathData.folder}_${path.parse(pathData.name).name}.jpg`;
            
            yield {
                id: `${randomSeed}_${i}`,
                title: videoName,
                artist: pathData.artist,
                videoUrl: pathData.isRoot ? 
                    `/videos/${pathData.name}` : 
                    `/videos/${pathData.folder}/${pathData.name}`,
                thumbnailUrl: `/thumbnails/${thumbnailName}`,
                thumbnailExists: fs.existsSync(path.join(THUMBNAILS_DIR, thumbnailName))
            };
        }
    } else {
        // For celebrity filter, show in order
        let yielded = 0;
        for (let i = startIndex; i < filtered.length && yielded < limit; i++, yielded++) {
            const pathData = filtered[i];
            const videoName = formatName(path.parse(pathData.name).name);
            const thumbnailName = pathData.isRoot ? 
                `${path.parse(pathData.name).name}.jpg` : 
                `${pathData.folder}_${path.parse(pathData.name).name}.jpg`;
            
            yield {
                id: `${pathData.folder || 'root'}_${i}`,
                title: videoName,
                artist: pathData.artist,
                videoUrl: pathData.isRoot ? 
                    `/videos/${pathData.name}` : 
                    `/videos/${pathData.folder}/${pathData.name}`,
                thumbnailUrl: `/thumbnails/${thumbnailName}`,
                thumbnailExists: fs.existsSync(path.join(THUMBNAILS_DIR, thumbnailName))
            };
        }
    }
};

// 🔥 REAL-TIME FILE SYSTEM WATCHING
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

// Background thumbnail generation (non-blocking queue)
const thumbnailQueue = new Set();
const processThumbnailQueue = async () => {
    if (thumbnailQueue.size === 0) return;
    
    const batch = Array.from(thumbnailQueue).slice(0, 3); // Process 3 at a time
    batch.forEach(item => thumbnailQueue.delete(item));
    
    const promises = batch.map(async ({ videoPath, thumbnailPath }) => {
        try {
            const timestamp = ['8%', '15%', '25%', '35%', '45%'][Math.floor(Math.random() * 5)];
            await new Promise((resolve, reject) => {
                ffmpeg(videoPath)
                    .screenshots({
                        timestamps: [timestamp],
                        filename: path.basename(thumbnailPath),
                        folder: path.dirname(thumbnailPath),
                        size: '320x180' // Smaller thumbnails = faster generation
                    })
                    .on('end', resolve)
                    .on('error', reject);
            });
        } catch (err) {
            // Silent fail
        }
    });
    
    await Promise.allSettled(promises);
};

// Process thumbnail queue every 2 seconds
setInterval(processThumbnailQueue, 2000);

// ⚡ ULTRA-FAST API ENDPOINTS
app.get('/api/videos', (req, res) => {
    try {
        const { page = 1, limit = 20, search = '', celebrity = '' } = req.query;
        const startIndex = (parseInt(page) - 1) * parseInt(limit);
        
        const videos = [];
        const generator = generateRandomVideos(startIndex, parseInt(limit), search, celebrity);
        
        for (const video of generator) {
            videos.push(video);
            
            // Queue thumbnail generation if missing
            if (!video.thumbnailExists) {
                const videoPath = video.videoUrl.startsWith('/videos/') ? 
                    path.join(VIDEOS_DIR, video.videoUrl.slice(8)) : '';
                const thumbnailPath = path.join(THUMBNAILS_DIR, video.thumbnailUrl.split('/').pop());
                
                if (videoPath) {
                    thumbnailQueue.add({ videoPath, thumbnailPath });
                }
            }
        }
        
        res.json({
            videos,
            hasMore: startIndex + videos.length < videoCount,
            total: videoCount,
            cached: false // Always fresh data
        });
        
    } catch (err) {
        console.error('Error:', err);
        res.status(500).json({ error: 'Failed to fetch videos' });
    }
});

// Get random celebrities for sidebar
app.get('/api/celebrities', (req, res) => {
    try {
        const celebrities = getRandomCelebrities(10);
        res.json({ celebrities });
    } catch (err) {
        console.error('Error getting celebrities:', err);
        res.status(500).json({ error: 'Failed to fetch celebrities' });
    }
});

// Get all celebrities (for search suggestions)
app.get('/api/celebrities/all', (req, res) => {
    try {
        const celebrities = getCelebrityFolders();
        res.json({ celebrities });
    } catch (err) {
        console.error('Error getting all celebrities:', err);
        res.status(500).json({ error: 'Failed to fetch all celebrities' });
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
        memoryUsage: process.memoryUsage()
    });
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'Public', 'Index.html'));
});

// Initialize
console.log('🚀 Initializing ultra-fast celebrity video server...');
videoCount = countVideos();
setupWatchers();

// Refresh watchers every 30 seconds (catch new directories)
setInterval(() => {
    setupWatchers();
}, 30000);

app.listen(PORT, () => {
    console.log(`⚡ Ultra-Fast Celebrity Video Server: http://localhost:${PORT}`);
    console.log(`📹 Found ${videoCount} videos`);
    console.log(`🔥 Real-time updates enabled`);
    console.log(`💾 Memory-optimized streaming`);
});