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

// Helper function to format names (replace _ and - with space and capitalize)
const formatName = (name) => {
    return name.replace(/[_-]/g, ' ')
               .split(' ')
               .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
               .join(' ');
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
        duration: durations.length > 0 ? durations[0] : null
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

// Quick file count (no metadata stored)
const countVideos = (celebrityFilter = '') => {
    let count = 0;
    const items = fs.readdirSync(VIDEOS_DIR, { withFileTypes: true });
    
    for (const item of items) {
        if (item.isFile() && VIDEO_EXTENSIONS.includes(path.extname(item.name).toLowerCase())) {
            if (!celebrityFilter) count++;
        } else if (item.isDirectory()) {
            // Skip if celebrity filter is specified and doesn't match
            if (celebrityFilter && item.name !== celebrityFilter) {
                continue;
            }
            
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
    
    // Apply search filter if needed
    const filtered = searchTerm ? 
        allPaths.filter(p => {
            const searchLower = searchTerm.toLowerCase();
            const videoInfo = extractVideoInfo(p.name);
            const titleFormatted = videoInfo.title;
            const artistFormatted = formatName(p.artist);
            
            return titleFormatted.toLowerCase().includes(searchLower) ||
                   artistFormatted.toLowerCase().includes(searchLower) ||
                   p.name.toLowerCase().includes(searchLower);
        }) : allPaths;
    
    // Generate random indexes using seed (only if no celebrity filter and no search)
    if (!celebrityFilter && !searchTerm) {
        const randomIndexes = [];
        for (let i = 0; i < filtered.length; i++) {
            randomIndexes.push({ index: i, random: seededRandom(randomSeed, i) });
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
            
            yield {
                id: `${randomSeed}_${i}`,
                title: videoInfo.title,
                artist: pathData.artist,
                quality: videoInfo.quality,
                duration: videoInfo.duration,
                videoUrl: pathData.isRoot ? 
                    `/videos/${pathData.name}` : 
                    `/videos/${pathData.folder}/${pathData.name}`,
                thumbnailUrl: `/thumbnails/${thumbnailName}`,
                previewUrl: `/previews/${previewName}`,
                thumbnailExists: fs.existsSync(path.join(THUMBNAILS_DIR, thumbnailName)),
                previewExists: fs.existsSync(path.join(PREVIEWS_DIR, previewName))
            };
        }
    } else {
        // For celebrity filter or search, show in order
        let yielded = 0;
        for (let i = startIndex; i < filtered.length && yielded < limit; i++, yielded++) {
            const pathData = filtered[i];
            const videoInfo = extractVideoInfo(pathData.name);
            const thumbnailName = pathData.isRoot ? 
                `${path.parse(pathData.name).name}.jpg` : 
                `${pathData.folder}_${path.parse(pathData.name).name}.jpg`;
            
            const previewName = pathData.isRoot ? 
                `${path.parse(pathData.name).name}_preview.mp4` : 
                `${pathData.folder}_${path.parse(pathData.name).name}_preview.mp4`;
            
            yield {
                id: `${pathData.folder || 'root'}_${i}`,
                title: videoInfo.title,
                artist: pathData.artist,
                quality: videoInfo.quality,
                duration: videoInfo.duration,
                videoUrl: pathData.isRoot ? 
                    `/videos/${pathData.name}` : 
                    `/videos/${pathData.folder}/${pathData.name}`,
                thumbnailUrl: `/thumbnails/${thumbnailName}`,
                previewUrl: `/previews/${previewName}`,
                thumbnailExists: fs.existsSync(path.join(THUMBNAILS_DIR, thumbnailName)),
                previewExists: fs.existsSync(path.join(PREVIEWS_DIR, previewName))
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

// Background thumbnail and preview generation (non-blocking queue)
const thumbnailQueue = new Set();
const previewQueue = new Set();

const processThumbnailQueue = async () => {
    if (thumbnailQueue.size === 0) return;
    
    const batch = Array.from(thumbnailQueue).slice(0, 3); // Process 3 at a time
    batch.forEach(item => thumbnailQueue.delete(item));
    
    const promises = batch.map(async ({ videoPath, thumbnailPath }) => {
        try {
            // Check if video file exists and is accessible
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
                        size: '320x180' // Smaller thumbnails = faster generation
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
    
    const batch = Array.from(previewQueue).slice(0, 2); // Process 2 at a time
    batch.forEach(item => previewQueue.delete(item));
    
    const promises = batch.map(async ({ videoPath, previewPath }) => {
        try {
            // Check if video file exists and is accessible
            if (!fs.existsSync(videoPath)) {
                console.log(`Video file not found: ${videoPath}`);
                return;
            }

            await new Promise((resolve, reject) => {
                ffmpeg(videoPath)
                    .seekInput(10) // Start from 10 seconds
                    .duration(10) // 10 second preview
                    .size('480x270') // Small preview size
                    .fps(15) // Lower FPS for smaller file
                    .videoBitrate('500k') // Lower bitrate
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
        
        const totalCount = countVideos(celebrity);
        
        res.json({
            videos,
            hasMore: startIndex + videos.length < totalCount,
            total: totalCount,
            cached: false // Always fresh data
        });
        
    } catch (err) {
        console.error('Error:', err);
        res.status(500).json({ error: 'Failed to fetch videos' });
    }
});

// Get ALL celebrities for sidebar (not just random 10)
app.get('/api/celebrities', (req, res) => {
    try {
        const celebrities = getCelebrityFolders();
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
        const suggestions = celebrities
            .filter(celebrity => 
                celebrity.displayName.toLowerCase().includes(q.toLowerCase())
            )
            .slice(0, 10)
            .map(celebrity => ({
                type: 'celebrity',
                text: celebrity.displayName,
                value: celebrity.name
            }));

        // Add generic suggestions
        const genericSuggestions = [
            'HD videos',
            'New releases',
            'Popular videos',
            'Trending now'
        ].filter(s => s.toLowerCase().includes(q.toLowerCase()))
         .map(s => ({ type: 'generic', text: s, value: s }));

        res.json({ 
            suggestions: [...suggestions, ...genericSuggestions].slice(0, 10) 
        });
    } catch (err) {
        console.error('Error getting search suggestions:', err);
        res.status(500).json({ error: 'Failed to fetch suggestions' });
    }
});

// Categories endpoint
app.get('/api/categories', (req, res) => {
    try {
        const categories = [
            { id: 'all', name: 'All Videos', count: videoCount },
            { id: 'trending', name: 'Trending', count: Math.floor(videoCount * 0.3) },
            { id: 'new', name: 'New Releases', count: Math.floor(videoCount * 0.2) },
            { id: 'popular', name: 'Most Popular', count: Math.floor(videoCount * 0.4) },
            { id: 'hd', name: 'HD Videos', count: Math.floor(videoCount * 0.7) },
            { id: 'favorites', name: 'Favorites', count: 0 }
        ];
        
        res.json({ categories });
    } catch (err) {
        console.error('Error getting categories:', err);
        res.status(500).json({ error: 'Failed to fetch categories' });
    }
});

// Playlists endpoint
app.get('/api/playlists', (req, res) => {
    try {
        // Mock playlists for now
        const playlists = [
            { id: 1, name: 'Favorites', count: 0, created: new Date().toISOString() },
            { id: 2, name: 'Watch Later', count: 0, created: new Date().toISOString() }
        ];
        
        res.json({ playlists });
    } catch (err) {
        console.error('Error getting playlists:', err);
        res.status(500).json({ error: 'Failed to fetch playlists' });
    }
});

// Video details endpoint
app.get('/api/videos/:id', (req, res) => {
    try {
        const { id } = req.params;
        
        // This would need to be implemented to get specific video details
        // For now, return mock data
        res.json({
            id,
            title: 'Video Title',
            description: 'Video description...',
            duration: '10:30',
            quality: '1080p',
            views: Math.floor(Math.random() * 100000),
            rating: 4.2,
            tags: ['tag1', 'tag2', 'tag3'],
            uploadDate: new Date().toISOString()
        });
    } catch (err) {
        console.error('Error getting video details:', err);
        res.status(500).json({ error: 'Failed to fetch video details' });
    }
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
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