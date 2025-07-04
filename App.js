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
const THUMBNAILS_DIR = path.join(__dirname, 'Thumbnails');
const DATA_DIR = path.join(__dirname, 'data');

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' })); // Increased limit for base64 images
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(express.static('public'));
app.use('/videos', express.static(VIDEOS_DIR));
app.use('/thumbnails', express.static(THUMBNAILS_DIR));

// Ensure directories exist
[THUMBNAILS_DIR, DATA_DIR].forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

// Initialize data files
const initDataFiles = () => {
    const dataFiles = {
        'users.json': [],
        'favorites.json': {},
        'playlists.json': [],
        'subscriptions.json': {},
        'comments.json': {}
    };
    
    Object.entries(dataFiles).forEach(([filename, defaultData]) => {
        const filePath = path.join(DATA_DIR, filename);
        if (!fs.existsSync(filePath)) {
            fs.writeFileSync(filePath, JSON.stringify(defaultData, null, 2));
        }
    });
};

initDataFiles();

const VIDEO_EXTENSIONS = ['.mp4', '.avi', '.mov', '.mkv', '.webm', '.m4v'];
const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];

// Memory management
let videoCount = 0;
let videoCache = new Map();
let lastScanTime = 0;
const watchers = new Map();
let randomSeed = Math.random();

// Enhanced storage with watch history
let favorites = new Set();
let watchHistory = [];
let videoRatings = new Map();
let videoViews = new Map();
let searchHistory = [];

// Performance optimization - cache frequently accessed data
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
let categoriesCache = null;
let performersCache = null;
let lastCacheUpdate = 0;

// Helper functions for data persistence
const loadDataFromFile = (filename) => {
    try {
        const filePath = path.join(DATA_DIR, filename);
        if (fs.existsSync(filePath)) {
            const data = fs.readFileSync(filePath, 'utf8');
            return JSON.parse(data);
        }
    } catch (error) {
        console.error(`Error loading ${filename}:`, error);
    }
    return filename === 'users.json' || filename === 'playlists.json' ? [] : {};
};

const saveDataToFile = (filename, data) => {
    try {
        const filePath = path.join(DATA_DIR, filename);
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
        return true;
    } catch (error) {
        console.error(`Error saving ${filename}:`, error);
        return false;
    }
};

// Helper function to format names
const formatName = (name) => {
    return name.replace(/[_-]/g, ' ')
               .split(' ')
               .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
               .join(' ');
};

// Helper function to find performer image
const findPerformerImage = (folderPath) => {
    try {
        const items = fs.readdirSync(folderPath, { withFileTypes: true });
        const imageFile = items.find(item => 
            item.isFile() && IMAGE_EXTENSIONS.includes(path.extname(item.name).toLowerCase())
        );
        return imageFile ? imageFile.name : null;
    } catch (err) {
        return null;
    }
};

// Extract clean categories from filename
const extractCategories = (filename) => {
    const name = filename.toLowerCase();
    const categories = [];

    const categoryMap = {
        'food': ['food', 'cooking', 'kitchen', 'recipe', 'chef'],
        'travel': ['travel', 'vacation', 'tour', 'trip', 'journey'],
        'fitness': ['fitness', 'gym', 'workout', 'trainer', 'exercise'],
        'education': ['education', 'student', 'school', 'teacher', 'classroom', 'college', 'homework'],
        'technology': ['tech', 'technology', 'gadget', 'device', 'innovation'],
        'fashion': ['fashion', 'outfit', 'style', 'clothes', 'clothing', 'lingerie', 'uniform'],
        'health': ['health', 'medical', 'nurse', 'hospital', 'doctor'],
        'romance': ['romance', 'valentine', 'love', 'hearts', 'kiss', 'kissing'],
        'sports': ['sports', 'football', 'soccer', 'basketball', 'cricket'],
        'entertainment': ['movie', 'film', 'hollywood', 'celebrity', 'star'],
        'nature': ['nature', 'beach', 'mountain', 'forest', 'ocean', 'pool'],
        'party': ['party', 'celebration', 'event', 'festival'],
        'holiday': ['holiday', 'christmas', 'xmas', 'halloween', 'new-year', 'santa'],
        'culture': ['culture', 'tradition', 'festival', 'costume', 'heritage'],
        'art': ['art', 'drawing', 'painting', 'sketch', 'illustration'],
        'music': ['music', 'song', 'instrument', 'band', 'concert'],
        'photography': ['photography', 'camera', 'photo', 'picture', 'snapshot'],
        'animals': ['animals', 'pets', 'wildlife', 'zoo', 'dog', 'cat'],
        'science': ['science', 'experiment', 'lab', 'biology', 'chemistry'],
        'history': ['history', 'ancient', 'medieval', 'timeline', 'historical'],
        'fiction': ['fiction', 'fantasy', 'sci-fi', 'alien', 'zombie', 'superhero'],
        'space': ['space', 'nasa', 'planet', 'astronomy', 'outer-space'],
        'language': ['language', 'english', 'spanish', 'japanese', 'german', 'hindi'],
        'friends': ['friend', 'friends', 'buddy', 'pal'],
        'vehicle': ['car', 'vehicle', 'automobile', 'bike', 'driving'],
        'residence': ['home', 'house', 'room', 'hotel', 'motel'],
        'event': ['wedding', 'marriage', 'bride', 'groom', 'ceremony'],
        'mindfulness': ['yoga', 'meditation', 'calm', 'relax', 'mental-health'],
        'culture': ['arab', 'muslim', 'hijab', 'indian', 'desi', 'bharat'],
        'gaming': ['game', 'gaming', 'console', 'playstation', 'xbox', 'pc'],
        'reading': ['book', 'reading', 'novel', 'literature'],
        'news': ['news', 'journalism', 'media', 'press'],
        'general': ['general', 'misc', 'random']
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
    
    let cleanTitle = name.replace(qualityRegex, '').replace(durationRegex, '');
    cleanTitle = formatName(cleanTitle.replace(/\s+/g, ' ').trim());
    
    return {
        title: cleanTitle,
        quality: qualities.length > 0 ? qualities[0].toUpperCase() : null,
        duration: durations.length > 0 ? durations[0] : null,
        categories: extractCategories(filename)
    };
};

// Get video duration using ffmpeg (cached)
const getVideoDuration = async (videoPath) => {
    const cacheKey = `duration_${videoPath}`;
    if (videoCache.has(cacheKey)) {
        return videoCache.get(cacheKey);
    }
    
    return new Promise((resolve) => {
        ffmpeg.ffprobe(videoPath, (err, metadata) => {
            let duration = null;
            if (!err && metadata && metadata.format && metadata.format.duration) {
                const dur = metadata.format.duration;
                const minutes = Math.floor(dur / 60);
                const seconds = Math.floor(dur % 60);
                duration = `${minutes}:${seconds.toString().padStart(2, '0')}`;
            }
            
            videoCache.set(cacheKey, duration);
            resolve(duration);
        });
    });
};

// Get file creation/modification date
const getFileDate = (pathData) => {
    try {
        const filePath = pathData.isRoot ? 
            path.join(VIDEOS_DIR, pathData.name) : 
            path.join(VIDEOS_DIR, pathData.folder, pathData.name);
        const stats = fs.statSync(filePath);
        return stats.mtime;
    } catch (err) {
        return new Date();
    }
};

// Get all celebrity folders (performers) with caching and images
const getCelebrityFolders = () => {
    const now = Date.now();
    if (performersCache && (now - lastCacheUpdate) < CACHE_DURATION) {
        return performersCache;
    }
    
    try {
        const items = fs.readdirSync(VIDEOS_DIR, { withFileTypes: true });
        const folders = items
            .filter(item => item.isDirectory())
            .map(item => {
                const folderPath = path.join(VIDEOS_DIR, item.name);
                const imageFile = findPerformerImage(folderPath);
                
                return {
                    name: item.name,
                    displayName: formatName(item.name),
                    videoCount: 0,
                    imageUrl: imageFile ? `/videos/${item.name}/${imageFile}` : null,
                    hasImage: !!imageFile
                };
            });

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

        performersCache = folders.filter(folder => folder.videoCount > 0);
        lastCacheUpdate = now;
        return performersCache;
    } catch (err) {
        console.error('Error getting celebrity folders:', err);
        return [];
    }
};

// Get all categories from videos with caching
const getAllCategories = () => {
    const now = Date.now();
    if (categoriesCache && (now - lastCacheUpdate) < CACHE_DURATION) {
        return categoriesCache;
    }
    
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
    
    categoriesCache = Object.entries(categoryCount).map(([name, count]) => ({
        name,
        displayName: formatName(name),
        count
    }));
    
    return categoriesCache;
};

// Quick file count with caching
const countVideos = (celebrityFilter = '', categoryFilter = '') => {
    const cacheKey = `count_${celebrityFilter}_${categoryFilter}`;
    if (videoCache.has(cacheKey)) {
        return videoCache.get(cacheKey);
    }
    
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
    
    videoCache.set(cacheKey, count);
    return count;
};

// Enhanced video generator with better performance
const generateRandomVideos = function* (startIndex, limit, searchTerm = '', celebrityFilter = '', categoryFilter = '', favoritesOnly = false, sortBy = 'random', userId = '') {
    const items = fs.readdirSync(VIDEOS_DIR, { withFileTypes: true });
    const allPaths = [];
    
    for (const item of items) {
        if (item.isFile() && VIDEO_EXTENSIONS.includes(path.extname(item.name).toLowerCase())) {
            if (celebrityFilter) continue;
            allPaths.push({ name: item.name, artist: 'Random', isRoot: true });
        } else if (item.isDirectory()) {
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
    
    if (categoryFilter) {
        filtered = filtered.filter(p => {
            const categories = extractCategories(p.name);
            return categories.includes(categoryFilter);
        });
    }
    
    if (favoritesOnly && userId) {
        const favoritesData = loadDataFromFile('favorites.json');
        const userFavorites = favoritesData[userId] || [];
        
        filtered = filtered.filter(p => {
            const videoId = p.isRoot ? 
                `root_${path.parse(p.name).name}` : 
                `${p.folder}_${path.parse(p.name).name}`;
            return userFavorites.includes(videoId);
        });
    }
    
    // Enhanced sorting
    if (sortBy === 'newest') {
        filtered.sort((a, b) => {
            const aDate = getFileDate(a);
            const bDate = getFileDate(b);
            return bDate - aDate;
        });
    } else if (sortBy === 'oldest') {
        filtered.sort((a, b) => {
            const aDate = getFileDate(a);
            const bDate = getFileDate(b);
            return aDate - bDate;
        });
    } else if (sortBy === 'most-viewed') {
        filtered.sort((a, b) => {
            const aId = a.isRoot ? `root_${path.parse(a.name).name}` : `${a.folder}_${path.parse(a.name).name}`;
            const bId = b.isRoot ? `root_${path.parse(b.name).name}` : `${b.folder}_${path.parse(b.name).name}`;
            const aViews = videoViews.get(aId) || 0;
            const bViews = videoViews.get(bId) || 0;
            return bViews - aViews;
        });
    } else if (sortBy === 'highest-rated') {
        filtered.sort((a, b) => {
            const aId = a.isRoot ? `root_${path.parse(a.name).name}` : `${a.folder}_${path.parse(a.name).name}`;
            const bId = b.isRoot ? `root_${path.parse(b.name).name}` : `${b.folder}_${path.parse(b.name).name}`;
            const aRating = videoRatings.get(aId) || 4.0;
            const bRating = videoRatings.get(bId) || 4.0;
            return bRating - aRating;
        });
    } else if (sortBy === 'random') {
        // Randomize
        const randomIndexes = [];
        for (let i = 0; i < filtered.length; i++) {
            const randomValue = Math.sin((randomSeed + Date.now() / 1000) * (i + 1)) * 10000;
            randomIndexes.push({ index: i, random: randomValue - Math.floor(randomValue) });
        }
        randomIndexes.sort((a, b) => a.random - b.random);
        filtered = randomIndexes.map(item => filtered[item.index]);
    }
    
    // Yield videos
    let yielded = 0;
    for (let i = startIndex; i < filtered.length && yielded < limit; i++, yielded++) {
        const pathData = filtered[i];
        const videoInfo = extractVideoInfo(pathData.name);
        const thumbnailName = pathData.isRoot ? 
            `${path.parse(pathData.name).name}.jpg` : 
            `${pathData.folder}_${path.parse(pathData.name).name}.jpg`;
        
        const videoId = pathData.isRoot ? 
            `root_${path.parse(pathData.name).name}` : 
            `${pathData.folder}_${path.parse(pathData.name).name}`;
        
        const videoPath = pathData.isRoot ? 
            `/videos/${pathData.name}` : 
            `/videos/${pathData.folder}/${pathData.name}`;
        
        // Get actual duration from ffmpeg if not available from filename
        let actualDuration = videoInfo.duration;
        if (!actualDuration) {
            const fullVideoPath = pathData.isRoot ? 
                path.join(VIDEOS_DIR, pathData.name) : 
                path.join(VIDEOS_DIR, pathData.folder, pathData.name);
            try {
                actualDuration = getVideoDuration(fullVideoPath);
            } catch (err) {
                actualDuration = null;
            }
        }
        
        // Get or generate stats
        const views = videoViews.get(videoId) || Math.floor(Math.random() * 1000000) + 1000;
        const rating = videoRatings.get(videoId) || (Math.random() * 2 + 3); // 3-5 stars
        
        // Check if favorited by user
        let isFavorite = false;
        if (userId) {
            const favoritesData = loadDataFromFile('favorites.json');
            const userFavorites = favoritesData[userId] || [];
            isFavorite = userFavorites.includes(videoId);
        }
        
        yield {
            id: videoId,
            title: videoInfo.title,
            artist: pathData.artist,
            quality: videoInfo.quality,
            duration: actualDuration,
            categories: videoInfo.categories,
            videoUrl: videoPath,
            thumbnailUrl: `/thumbnails/${thumbnailName}`,
            thumbnailExists: fs.existsSync(path.join(THUMBNAILS_DIR, thumbnailName)),
            isFavorite: isFavorite,
            views: views,
            rating: rating,
            uploadDate: getFileDate(pathData)
        };
    }
};

// Background thumbnail generation (optimized)
const thumbnailQueue = new Set();

const processThumbnailQueue = async () => {
    if (thumbnailQueue.size === 0) return;
    
    const batch = Array.from(thumbnailQueue).slice(0, 2); // Reduced batch size
    batch.forEach(item => thumbnailQueue.delete(item));
    
    const promises = batch.map(async ({ videoPath, thumbnailPath }) => {
        try {
            if (!fs.existsSync(videoPath)) return;

            const timestamp = ['5%', '10%', '15%', '20%', '25%'][Math.floor(Math.random() * 5)];
            await new Promise((resolve, reject) => {
                ffmpeg(videoPath)
                    .screenshots({
                        timestamps: [timestamp],
                        filename: path.basename(thumbnailPath),
                        folder: path.dirname(thumbnailPath),
                        size: '1280x720'
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

// Process thumbnail queue less frequently to save resources
setInterval(processThumbnailQueue, 3000);

// File system watching (optimized)
const setupWatchers = () => {
    watchers.forEach(watcher => watcher.close());
    watchers.clear();
    
    try {
        const mainWatcher = fs.watch(VIDEOS_DIR, { recursive: false }, (eventType, filename) => {
            if (filename && VIDEO_EXTENSIONS.some(ext => filename.toLowerCase().endsWith(ext))) {
                console.log(`📹 Video ${eventType}: ${filename}`);
                videoCount = countVideos();
                randomSeed = Math.random();
                // Clear caches
                videoCache.clear();
                categoriesCache = null;
                performersCache = null;
            }
        });
        watchers.set('main', mainWatcher);
        
        const items = fs.readdirSync(VIDEOS_DIR, { withFileTypes: true });
        items.forEach(item => {
            if (item.isDirectory()) {
                try {
                    const subWatcher = fs.watch(path.join(VIDEOS_DIR, item.name), (eventType, filename) => {
                        if (filename && VIDEO_EXTENSIONS.some(ext => filename.toLowerCase().endsWith(ext))) {
                            console.log(`📹 Video ${eventType} in ${item.name}: ${filename}`);
                            videoCount = countVideos();
                            randomSeed = Math.random();
                            videoCache.clear();
                            categoriesCache = null;
                            performersCache = null;
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

// API ENDPOINTS

// Authentication endpoints
app.post('/api/auth/register', (req, res) => {
    try {
        const { username, email, password } = req.body;
        
        if (!username || !email || !password) {
            return res.status(400).json({ error: 'All fields are required' });
        }
        
        const users = loadDataFromFile('users.json');
        
        // Check if user already exists
        if (users.find(u => u.email === email)) {
            return res.status(400).json({ error: 'User already exists' });
        }
        
        const newUser = {
            id: Date.now().toString(),
            username,
            email,
            password, // In production, hash this!
            avatar: '/api/placeholder/32/32',
            bio: '',
            createdAt: new Date().toISOString()
        };
        
        users.push(newUser);
        saveDataToFile('users.json', users);
        
        // Remove password from response
        const { password: _, ...userResponse } = newUser;
        
        res.json({ user: userResponse });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Registration failed' });
    }
});

app.post('/api/auth/login', (req, res) => {
    try {
        const { email, password } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }
        
        const users = loadDataFromFile('users.json');
        const user = users.find(u => u.email === email && u.password === password);
        
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        // Remove password from response
        const { password: _, ...userResponse } = user;
        
        res.json({ user: userResponse });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
});

// User profile endpoints
app.put('/api/user/profile/:userId', (req, res) => {
    try {
        const { userId } = req.params;
        const { username, email, bio, avatar } = req.body;
        
        const users = loadDataFromFile('users.json');
        const userIndex = users.findIndex(u => u.id === userId);
        
        if (userIndex === -1) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        users[userIndex] = {
            ...users[userIndex],
            username,
            email,
            bio,
            avatar,
            updatedAt: new Date().toISOString()
        };
        
        saveDataToFile('users.json', users);
        
        // Remove password from response
        const { password: _, ...userResponse } = users[userIndex];
        
        res.json({ user: userResponse });
    } catch (error) {
        console.error('Profile update error:', error);
        res.status(500).json({ error: 'Profile update failed' });
    }
});

// Main videos endpoint with enhanced features
app.get('/api/videos', (req, res) => {
    try {
        const { 
            page = 1, 
            limit = 20, 
            search = '', 
            celebrity = '', 
            category = '', 
            favorites = 'false',
            sort = 'random',
            userId = ''
        } = req.query;
        
        const startIndex = (parseInt(page) - 1) * parseInt(limit);
        const favoritesOnly = favorites === 'true';
        
        const videos = [];
        const generator = generateRandomVideos(startIndex, parseInt(limit), search, celebrity, category, favoritesOnly, sort, userId);
        
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
        }
        
        const totalCount = favoritesOnly && userId ? 
            (loadDataFromFile('favorites.json')[userId] || []).length : 
            countVideos(celebrity, category);
        
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

// Video download endpoint
app.get('/api/video-download/:id', (req, res) => {
    try {
        const { id } = req.params;
        const [type, ...nameParts] = id.split('_');
        const videoName = nameParts.join('_');
        let videoPath;
        if (type === 'root') {
            videoPath = path.join(VIDEOS_DIR, `${videoName}.mp4`);
            if (!fs.existsSync(videoPath)) {
                for (const ext of VIDEO_EXTENSIONS) {
                    const testPath = path.join(VIDEOS_DIR, `${videoName}${ext}`);
                    if (fs.existsSync(testPath)) {
                        videoPath = testPath;
                        break;
                    }
                }
            }
        } else {
            const folder = type;
            videoPath = path.join(VIDEOS_DIR, folder, `${videoName}.mp4`);
            if (!fs.existsSync(videoPath)) {
                for (const ext of VIDEO_EXTENSIONS) {
                    const testPath = path.join(VIDEOS_DIR, folder, `${videoName}${ext}`);
                    if (fs.existsSync(testPath)) {
                        videoPath = testPath;
                        break;
                    }
                }
            }
        }
        if (!fs.existsSync(videoPath)) {
            return res.status(404).json({ error: 'Video not found' });
        }
        res.download(videoPath, `${videoName}.mp4`);
    } catch (err) {
        console.error('Error downloading video:', err);
        res.status(500).json({ error: 'Failed to download video' });
    }
});

// Get video stream with range support for better performance
app.get('/api/video-stream/:id', (req, res) => {
    try {
        const { id } = req.params;
        const [type, ...nameParts] = id.split('_');
        const videoName = nameParts.join('_');
        
        let videoPath;
        if (type === 'root') {
            videoPath = path.join(VIDEOS_DIR, `${videoName}.mp4`);
            // Try other extensions if mp4 doesn't exist
            if (!fs.existsSync(videoPath)) {
                for (const ext of VIDEO_EXTENSIONS) {
                    const testPath = path.join(VIDEOS_DIR, `${videoName}${ext}`);
                    if (fs.existsSync(testPath)) {
                        videoPath = testPath;
                        break;
                    }
                }
            }
        } else {
            const folder = type;
            videoPath = path.join(VIDEOS_DIR, folder, `${videoName}.mp4`);
            if (!fs.existsSync(videoPath)) {
                for (const ext of VIDEO_EXTENSIONS) {
                    const testPath = path.join(VIDEOS_DIR, folder, `${videoName}${ext}`);
                    if (fs.existsSync(testPath)) {
                        videoPath = testPath;
                        break;
                    }
                }
            }
        }
        
        if (!fs.existsSync(videoPath)) {
            return res.status(404).json({ error: 'Video not found' });
        }
        
        const stat = fs.statSync(videoPath);
        const fileSize = stat.size;
        const range = req.headers.range;
        
        if (range) {
            const parts = range.replace(/bytes=/, "").split("-");
            const start = parseInt(parts[0], 10);
            const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
            const chunksize = (end - start) + 1;
            const file = fs.createReadStream(videoPath, { start, end });
            const head = {
                'Content-Range': `bytes ${start}-${end}/${fileSize}`,
                'Accept-Ranges': 'bytes',
                'Content-Length': chunksize,
                'Content-Type': 'video/mp4',
            };
            res.writeHead(206, head);
            file.pipe(res);
        } else {
            const head = {
                'Content-Length': fileSize,
                'Content-Type': 'video/mp4',
            };
            res.writeHead(200, head);
            fs.createReadStream(videoPath).pipe(res);
        }
        
        // Track view
        const currentViews = videoViews.get(id) || 0;
        videoViews.set(id, currentViews + 1);
        
    } catch (err) {
        console.error('Error streaming video:', err);
        res.status(500).json({ error: 'Failed to stream video' });
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

// Enhanced favorites management
app.post('/api/favorites/:id', (req, res) => {
    try {
        const { id } = req.params;
        const { userId } = req.body;
        
        if (!userId) {
            return res.status(400).json({ error: 'User ID is required' });
        }
        
        const favoritesData = loadDataFromFile('favorites.json');
        
        if (!favoritesData[userId]) {
            favoritesData[userId] = [];
        }
        
        if (!favoritesData[userId].includes(id)) {
            favoritesData[userId].push(id);
            saveDataToFile('favorites.json', favoritesData);
        }
        
        res.json({ message: 'Added to favorites', id, total: favoritesData[userId].length });
    } catch (err) {
        console.error('Error adding to favorites:', err);
        res.status(500).json({ error: 'Failed to add to favorites' });
    }
});

app.delete('/api/favorites/:id', (req, res) => {
    try {
        const { id } = req.params;
        const { userId } = req.query;
        
        if (!userId) {
            return res.status(400).json({ error: 'User ID is required' });
        }
        
        const favoritesData = loadDataFromFile('favorites.json');
        
        if (favoritesData[userId]) {
            favoritesData[userId] = favoritesData[userId].filter(fav => fav !== id);
            saveDataToFile('favorites.json', favoritesData);
        }
        
        res.json({ message: 'Removed from favorites', id, total: favoritesData[userId]?.length || 0 });
    } catch (err) {
        console.error('Error removing from favorites:', err);
        res.status(500).json({ error: 'Failed to remove from favorites' });
    }
});

app.get('/api/favorites', (req, res) => {
    try {
        const { userId } = req.query;
        
        if (!userId) {
            return res.json({ favorites: [], total: 0 });
        }
        
        const favoritesData = loadDataFromFile('favorites.json');
        const userFavorites = favoritesData[userId] || [];
        
        res.json({ favorites: userFavorites, total: userFavorites.length });
    } catch (err) {
        console.error('Error getting favorites:', err);
        res.status(500).json({ error: 'Failed to get favorites' });
    }
});

// Subscription management
app.post('/api/subscriptions/:performerName', (req, res) => {
    try {
        const { performerName } = req.params;
        const { userId } = req.body;
        
        if (!userId) {
            return res.status(400).json({ error: 'User ID is required' });
        }
        
        const subscriptionsData = loadDataFromFile('subscriptions.json');
        
        if (!subscriptionsData[userId]) {
            subscriptionsData[userId] = [];
        }
        
        // Check if already subscribed
        if (!subscriptionsData[userId].find(sub => sub.name === performerName)) {
            // Get performer info
            const performers = getCelebrityFolders();
            const performer = performers.find(p => p.name === performerName);
            
            if (performer) {
                subscriptionsData[userId].push({
                    name: performer.name,
                    displayName: performer.displayName,
                    imageUrl: performer.imageUrl,
                    hasImage: performer.hasImage,
                    subscribedAt: new Date().toISOString()
                });
                
                saveDataToFile('subscriptions.json', subscriptionsData);
            }
        }
        
        res.json({ message: 'Subscribed successfully', performerName });
    } catch (err) {
        console.error('Error subscribing:', err);
        res.status(500).json({ error: 'Failed to subscribe' });
    }
});

app.delete('/api/subscriptions/:performerName', (req, res) => {
    try {
        const { performerName } = req.params;
        const { userId } = req.query;
        
        if (!userId) {
            return res.status(400).json({ error: 'User ID is required' });
        }
        
        const subscriptionsData = loadDataFromFile('subscriptions.json');
        
        if (subscriptionsData[userId]) {
            subscriptionsData[userId] = subscriptionsData[userId].filter(sub => sub.name !== performerName);
            saveDataToFile('subscriptions.json', subscriptionsData);
        }
        
        res.json({ message: 'Unsubscribed successfully', performerName });
    } catch (err) {
        console.error('Error unsubscribing:', err);
        res.status(500).json({ error: 'Failed to unsubscribe' });
    }
});

app.get('/api/subscriptions/:userId', (req, res) => {
    try {
        const { userId } = req.params;
        
        const subscriptionsData = loadDataFromFile('subscriptions.json');
        const userSubscriptions = subscriptionsData[userId] || [];
        
        res.json({ subscriptions: userSubscriptions });
    } catch (err) {
        console.error('Error getting subscriptions:', err);
        res.status(500).json({ error: 'Failed to get subscriptions' });
    }
});

// Playlist management
app.post('/api/playlists', (req, res) => {
    try {
        const { name, userId, description = '', isPrivate = false } = req.body;
        
        if (!name || !userId) {
            return res.status(400).json({ error: 'Name and user ID are required' });
        }
        
        const playlists = loadDataFromFile('playlists.json');
        
        const newPlaylist = {
            id: Date.now().toString(),
            name,
            description,
            userId,
            isPrivate,
            videos: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        playlists.push(newPlaylist);
        saveDataToFile('playlists.json', playlists);
        
        res.json({ playlist: newPlaylist });
    } catch (err) {
        console.error('Error creating playlist:', err);
        res.status(500).json({ error: 'Failed to create playlist' });
    }
});

app.get('/api/playlists/:userId', (req, res) => {
    try {
        const { userId } = req.params;
        
        const playlists = loadDataFromFile('playlists.json');
        const userPlaylists = playlists.filter(p => p.userId === userId);
        
        res.json({ playlists: userPlaylists });
    } catch (err) {
        console.error('Error getting playlists:', err);
        res.status(500).json({ error: 'Failed to get playlists' });
    }
});

app.post('/api/playlists/:playlistId/videos', (req, res) => {
    try {
        const { playlistId } = req.params;
        const { videoId, userId } = req.body;
        
        if (!videoId || !userId) {
            return res.status(400).json({ error: 'Video ID and user ID are required' });
        }
        
        const playlists = loadDataFromFile('playlists.json');
        const playlistIndex = playlists.findIndex(p => p.id === playlistId && p.userId === userId);
        
        if (playlistIndex === -1) {
            return res.status(404).json({ error: 'Playlist not found' });
        }
        
        // Check if video already in playlist
        if (!playlists[playlistIndex].videos.includes(videoId)) {
            playlists[playlistIndex].videos.push(videoId);
            playlists[playlistIndex].updatedAt = new Date().toISOString();
            saveDataToFile('playlists.json', playlists);
        }
        
        res.json({ message: 'Video added to playlist', playlistId, videoId });
    } catch (err) {
        console.error('Error adding video to playlist:', err);
        res.status(500).json({ error: 'Failed to add video to playlist' });
    }
});

app.get('/api/playlists/:playlistId/videos', (req, res) => {
    try {
        const { playlistId } = req.params;
        
        const playlists = loadDataFromFile('playlists.json');
        const playlist = playlists.find(p => p.id === playlistId);
        
        if (!playlist) {
            return res.status(404).json({ error: 'Playlist not found' });
        }
        
        // Get video details for each video ID in the playlist
        const videos = [];
        const generator = generateRandomVideos(0, 1000); // Get all videos to find matches
        
        for (const video of generator) {
            if (playlist.videos.includes(video.id)) {
                videos.push(video);
            }
        }
        
        res.json({ 
            playlist: {
                id: playlist.id,
                name: playlist.name,
                description: playlist.description
            },
            videos: videos,
            total: videos.length 
        });
    } catch (err) {
        console.error('Error getting playlist videos:', err);
        res.status(500).json({ error: 'Failed to get playlist videos' });
    }
});

app.delete('/api/playlists/:playlistId', (req, res) => {
    try {
        const { playlistId } = req.params;
        const { userId } = req.query;
        
        if (!userId) {
            return res.status(400).json({ error: 'User ID is required' });
        }
        
        const playlists = loadDataFromFile('playlists.json');
        const filteredPlaylists = playlists.filter(p => !(p.id === playlistId && p.userId === userId));
        
        if (filteredPlaylists.length === playlists.length) {
            return res.status(404).json({ error: 'Playlist not found' });
        }
        
        saveDataToFile('playlists.json', filteredPlaylists);
        
        res.json({ message: 'Playlist deleted successfully' });
    } catch (err) {
        console.error('Error deleting playlist:', err);
        res.status(500).json({ error: 'Failed to delete playlist' });
    }
});

// Comments management
app.post('/api/comments/:videoId', (req, res) => {
    try {
        const { videoId } = req.params;
        const { userId, text } = req.body;
        
        if (!userId || !text) {
            return res.status(400).json({ error: 'User ID and text are required' });
        }
        
        // Get user info
        const users = loadDataFromFile('users.json');
        const user = users.find(u => u.id === userId);
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        const commentsData = loadDataFromFile('comments.json');
        
        if (!commentsData[videoId]) {
            commentsData[videoId] = [];
        }
        
        const newComment = {
            id: Date.now().toString(),
            userId,
            username: user.username,
            avatar: user.avatar,
            text,
            likes: 0,
            dislikes: 0,
            createdAt: new Date().toISOString(),
            replies: []
        };
        
        commentsData[videoId].push(newComment);
        saveDataToFile('comments.json', commentsData);
        
        res.json({ comment: newComment });
    } catch (err) {
        console.error('Error posting comment:', err);
        res.status(500).json({ error: 'Failed to post comment' });
    }
});

app.get('/api/comments/:videoId', (req, res) => {
    try {
        const { videoId } = req.params;
        const { page = 1, limit = 10, sort = 'newest' } = req.query;
        
        const commentsData = loadDataFromFile('comments.json');
        let comments = commentsData[videoId] || [];
        
        // Sort comments
        if (sort === 'newest') {
            comments.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        } else if (sort === 'oldest') {
            comments.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        } else if (sort === 'most-liked') {
            comments.sort((a, b) => b.likes - a.likes);
        }
        
        const startIndex = (parseInt(page) - 1) * parseInt(limit);
        const paginatedComments = comments.slice(startIndex, startIndex + parseInt(limit));
        
        res.json({ 
            comments: paginatedComments,
            total: comments.length,
            hasMore: startIndex + paginatedComments.length < comments.length
        });
    } catch (err) {
        console.error('Error getting comments:', err);
        res.status(500).json({ error: 'Failed to get comments' });
    }
});

// Watch history management - Enhanced to return actual video data
app.post('/api/watch-history/:id', (req, res) => {
    try {
        const { id } = req.params;
        const { timestamp = Date.now() } = req.body;
        
        // Remove if already exists
        watchHistory = watchHistory.filter(item => item.id !== id);
        
        // Add to beginning
        watchHistory.unshift({ id, timestamp });
        
        // Keep only last 100 items
        watchHistory = watchHistory.slice(0, 100);
        
        res.json({ message: 'Added to watch history', id });
    } catch (err) {
        res.status(500).json({ error: 'Failed to add to watch history' });
    }
});

app.get('/api/watch-history', (req, res) => {
    try {
        const { page = 1, limit = 20 } = req.query;
        const startIndex = (parseInt(page) - 1) * parseInt(limit);
        const endIndex = startIndex + parseInt(limit);
        
        const paginatedHistory = watchHistory.slice(startIndex, endIndex);
        
        // Get video details for each history item
        const historyWithVideos = [];
        
        for (const historyItem of paginatedHistory) {
            // Find the video by ID
            const generator = generateRandomVideos(0, 1000); // Get all videos to find the one
            for (const video of generator) {
                if (video.id === historyItem.id) {
                    historyWithVideos.push({
                        ...video,
                        watchedAt: historyItem.timestamp
                    });
                    break;
                }
            }
        }
        
        res.json({ 
            videos: historyWithVideos,
            total: watchHistory.length,
            hasMore: endIndex < watchHistory.length
        });
    } catch (err) {
        res.status(500).json({ error: 'Failed to get watch history' });
    }
});

app.delete('/api/watch-history/:id', (req, res) => {
    try {
        const { id } = req.params;
        watchHistory = watchHistory.filter(item => item.id !== id);
        res.json({ message: 'Removed from watch history', id });
    } catch (err) {
        res.status(500).json({ error: 'Failed to remove from watch history' });
    }
});

app.delete('/api/watch-history', (req, res) => {
    try {
        watchHistory = [];
        res.json({ message: 'Watch history cleared' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to clear watch history' });
    }
});

// Video rating system
app.post('/api/rate/:id', (req, res) => {
    try {
        const { id } = req.params;
        const { rating } = req.body;
        
        if (rating < 1 || rating > 5) {
            return res.status(400).json({ error: 'Rating must be between 1 and 5' });
        }
        
        videoRatings.set(id, rating);
        res.json({ message: 'Video rated', id, rating });
    } catch (err) {
        res.status(500).json({ error: 'Failed to rate video' });
    }
});

// Search history
app.post('/api/search-history', (req, res) => {
    try {
        const { query } = req.body;
        
        if (!query || query.trim().length === 0) {
            return res.status(400).json({ error: 'Query is required' });
        }
        
        // Remove if already exists
        searchHistory = searchHistory.filter(item => item.query !== query);
        
        // Add to beginning
        searchHistory.unshift({ query, timestamp: Date.now() });
        
        // Keep only last 50 items
        searchHistory = searchHistory.slice(0, 50);
        
        res.json({ message: 'Added to search history', query });
    } catch (err) {
        res.status(500).json({ error: 'Failed to add to search history' });
    }
});

app.get('/api/search-history', (req, res) => {
    try {
        res.json({ history: searchHistory });
    } catch (err) {
        res.status(500).json({ error: 'Failed to get search history' });
    }
});

// Trending videos (based on views)
app.get('/api/trending', (req, res) => {
    try {
        const { page = 1, limit = 20 } = req.query;
        const startIndex = (parseInt(page) - 1) * parseInt(limit);
        
        const videos = [];
        const generator = generateRandomVideos(0, 100, '', '', '', false, 'most-viewed');
        
        for (const video of generator) {
            videos.push(video);
        }
        
        const paginatedVideos = videos.slice(startIndex, startIndex + parseInt(limit));
        
        res.json({
            videos: paginatedVideos,
            hasMore: startIndex + paginatedVideos.length < videos.length,
            total: videos.length
        });
    } catch (err) {
        res.status(500).json({ error: 'Failed to get trending videos' });
    }
});

// Random video
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
    videoCache.clear(); // Clear cache to force refresh
    res.json({ message: 'Order reshuffled!', total: videoCount });
});

// Enhanced stats
app.get('/api/stats', (req, res) => {
    res.json({
        totalVideos: videoCount,
        totalFavorites: favorites.size,
        totalWatchHistory: watchHistory.length,
        watchedDirectories: watchers.size,
        pendingThumbnails: thumbnailQueue.size,
        cacheSize: videoCache.size,
        memoryUsage: process.memoryUsage()
    });
});

// Search suggestions with enhanced results
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
                value: celebrity.name,
                count: celebrity.videoCount
            }));

        const categorySuggestions = categories
            .filter(category => 
                category.displayName.toLowerCase().includes(q.toLowerCase())
            )
            .slice(0, 5)
            .map(category => ({
                type: 'category',
                text: category.displayName,
                value: category.name,
                count: category.count
            }));

        // Add search history suggestions
        const historySuggestions = searchHistory
            .filter(item => item.query.toLowerCase().includes(q.toLowerCase()))
            .slice(0, 3)
            .map(item => ({
                type: 'history',
                text: item.query,
                value: item.query
            }));

        res.json({ 
            suggestions: [...celebritySuggestions, ...categorySuggestions, ...historySuggestions].slice(0, 10) 
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

// Refresh watchers and clear cache periodically
setInterval(() => {
    setupWatchers();
    // Clear old cache entries
    if (videoCache.size > 1000) {
        videoCache.clear();
    }
}, 60000); // Every minute

app.listen(PORT, () => {
    console.log(`⚡ Ultra-Fast Celebrity Video Server: http://localhost:${PORT}`);
    console.log(`📹 Found ${videoCount} videos`);
    console.log(`🔥 Real-time updates enabled`);
    console.log(`💾 Memory-optimized streaming with hover preview`);
    console.log(`⭐ Enhanced features: Watch History, Favorites, Ratings, Trending`);
    console.log(`🖼️ Performer images support enabled`);
    console.log(`📁 Data directory: ${DATA_DIR}`);
});
