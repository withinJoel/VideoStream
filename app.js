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

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));
app.use('/videos', express.static(VIDEOS_DIR));
app.use('/thumbnails', express.static(THUMBNAILS_DIR));

// Ensure directories exist
[THUMBNAILS_DIR].forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

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

// Extract categories from filename with more categories
const extractCategories = (filename) => {
    const name = filename.toLowerCase();
    const categories = [];
    
    const categoryMap = {
    'anal': ['anal', 'anal-sex', 'ass-fuck'],
    'gangbang': ['gang-bang', 'gangbang', 'group-sex', 'orgy'],
    'lesbian': ['lesbian', 'girl-girl', 'lez', 'sapphic'],
    'milf': ['milf', 'mature', 'mom', 'mommy', 'cougar'],
    'teen': ['teen', '18+', 'young', 'college', 'schoolgirl'],
    'hardcore': ['hardcore', 'rough', 'hard', 'roughsex', 'rough-sex', 'hard-core', 'extreme'],
    'blowjob': ['blowjob', 'oral', 'bj', 'deepthroat', 'blow-job', 'fellatio', 'head'],
    'threesome': ['threesome', '3some', 'mmf', 'ffm', 'mfm', 'fmf'],
    'creampie': ['creampie', 'internal', 'cum-inside', 'cream-pie'],
    'big-tits': ['big-tits', 'busty', 'boobs', 'big-boobs', 'huge-tits', 'massive-tits'],
    'pov': ['pov', 'point-of-view', 'first-person'],
    'interracial': ['interracial', 'bbc', 'mixed', 'ir'],
    'amateur': ['amateur', 'homemade', 'real', 'home-video'],
    'fetish': ['fetish', 'kink', 'bdsm', 'bondage', 'domination'],
    'latina': ['latina', 'latin', 'hispanic', 'spanish'],
    'asian': ['asian', 'japanese', 'chinese', 'korean', 'thai', 'vietnamese','desi'],
    'ebony': ['ebony', 'black', 'african', 'bbc'],
    'blonde': ['blonde', 'blond', 'fair-hair'],
    'brunette': ['brunette', 'brown-hair', 'dark-hair'],
    'redhead': ['redhead', 'ginger', 'red-hair'],
    'big-ass': ['big-ass', 'big-butt', 'pawg', 'bubble-butt', 'thick'],
    'small-tits': ['small-tits', 'petite', 'tiny', 'flat-chest'],
    'squirting': ['squirting', 'squirt', 'female-ejaculation'],
    'masturbation': ['masturbation', 'solo', 'self', 'fingering'],
    'public': ['public', 'outdoor', 'outside', 'exhibitionist'],
    'vintage': ['vintage', 'retro', 'classic', 'old-school'],
    'compilation': ['compilation', 'comp', 'best-of'],
    'facial': ['facial', 'cum-shot', 'cumshot', 'money-shot'],
    'handjob': ['handjob', 'hand-job', 'hj', 'manual'],
    'footjob': ['footjob', 'foot-job', 'feet', 'foot-fetish'],
    'titjob': ['titjob', 'tit-job', 'boob-job', 'titty-fuck'],
    'doggystyle': ['doggystyle', 'doggy', 'from-behind', 'rear-entry'],
    'missionary': ['missionary', 'face-to-face', 'vanilla'],
    'cowgirl': ['cowgirl', 'riding', 'on-top', 'reverse-cowgirl'],
    'double-penetration': ['dp', 'double-penetration', 'double-p', 'dvp'],
    'office' : ['office', 'workplace'],
    'bbc': ['bbc', 'big-black-cock', 'interracial-bbc'],
    'casting': ['casting', 'audition', 'first-time', 'interview'],
    'massage': ['massage', 'sensual-massage', 'oil', 'spa'],
    'shower': ['shower', 'bathroom', 'wet', 'bath'],
    'kitchen': ['kitchen', 'cooking', 'chef'],
    'office': ['office', 'secretary', 'boss', 'workplace'],
    'car': ['car', 'vehicle', 'driving', 'backseat'],
    'beach': ['beach', 'sand', 'ocean', 'vacation'],
    'pool': ['pool', 'swimming', 'poolside', 'water'],
    'hotel': ['hotel', 'motel', 'room', 'vacation'],
    'party': ['party', 'celebration', 'drunk', 'wild'],
    'wedding': ['wedding', 'bride', 'married', 'honeymoon'],
    'christmas': ['christmas', 'xmas', 'holiday', 'santa'],
    'halloween': ['halloween', 'costume', 'spooky', 'trick'],
    'valentine': ['valentine', 'romantic', 'love', 'hearts'],
    'hijab' : ['muslim', 'hijab'],
    'muslim' : ['arab', 'muslim'],
    'arab' : ['arab','muslim','hijab'],
    'nurse': ['nurse', 'hospital', 'medical-play', 'scrubs'],
    'maid': ['maid', 'french-maid', 'uniform', 'housekeeper'],
    'cheerleader': ['cheerleader', 'pom-poms', 'uniform', 'pep-rally'],
    'teacher': ['teacher', 'classroom', 'professor', 'chalkboard'],
    'student': ['student', 'schoolgirl', 'college-girl', 'homework'],
    'cosplay': ['cosplay', 'costume', 'anime-outfit', 'fantasy-dress'],
    'superhero': ['superhero', 'costume', 'cape', 'mask'],
    'zombie': ['zombie', 'undead', 'horror-play', 'apocalypse'],
    'alien': ['alien', 'tentacle', 'sci-fi', 'outer-space'],
    'furry': ['furry', 'anthro', 'animal-suit', 'fur-suit']
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
const generateRandomVideos = function* (startIndex, limit, searchTerm = '', celebrityFilter = '', categoryFilter = '', favoritesOnly = false, sortBy = 'random') {
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
    
    if (favoritesOnly) {
        filtered = filtered.filter(p => {
            const videoId = p.isRoot ? 
                `root_${path.parse(p.name).name}` : 
                `${p.folder}_${path.parse(p.name).name}`;
            return favorites.has(videoId);
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
                actualDuration = await getVideoDuration(fullVideoPath);
            } catch (err) {
                actualDuration = null;
            }
        }
        
        // Get or generate stats
        const views = videoViews.get(videoId) || Math.floor(Math.random() * 1000000) + 1000;
        const rating = videoRatings.get(videoId) || (Math.random() * 2 + 3); // 3-5 stars
        
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
            isFavorite: favorites.has(videoId),
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
            sort = 'random'
        } = req.query;
        
        const startIndex = (parseInt(page) - 1) * parseInt(limit);
        const favoritesOnly = favorites === 'true';
        
        const videos = [];
        const generator = generateRandomVideos(startIndex, parseInt(limit), search, celebrity, category, favoritesOnly, sort);
        
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
        favorites.add(id);
        res.json({ message: 'Added to favorites', id, total: favorites.size });
    } catch (err) {
        res.status(500).json({ error: 'Failed to add to favorites' });
    }
});

app.delete('/api/favorites/:id', (req, res) => {
    try {
        const { id } = req.params;
        favorites.delete(id);
        res.json({ message: 'Removed from favorites', id, total: favorites.size });
    } catch (err) {
        res.status(500).json({ error: 'Failed to remove from favorites' });
    }
});

app.get('/api/favorites', (req, res) => {
    try {
        res.json({ favorites: Array.from(favorites), total: favorites.size });
    } catch (err) {
        res.status(500).json({ error: 'Failed to get favorites' });
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
});