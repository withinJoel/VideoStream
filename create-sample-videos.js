const fs = require('fs');
const path = require('path');

// Create sample video files (empty files for demonstration)
const sampleVideos = [
    'Videos/sample-video-1-720p-15min.mp4',
    'Videos/sample-video-2-1080p-20min.mp4',
    'Videos/sample-video-3-4k-25min.mp4',
    'Videos/SamplePerformer1/performer1-video1-hardcore-anal-720p.mp4',
    'Videos/SamplePerformer1/performer1-video2-blowjob-pov-1080p.mp4',
    'Videos/SamplePerformer1/performer1-video3-threesome-gangbang-4k.mp4',
    'Videos/SamplePerformer2/performer2-video1-lesbian-massage-720p.mp4',
    'Videos/SamplePerformer2/performer2-video2-milf-creampie-1080p.mp4',
    'Videos/SamplePerformer2/performer2-video3-amateur-homemade-720p.mp4'
];

console.log('Creating sample video files...');

sampleVideos.forEach(videoPath => {
    const dir = path.dirname(videoPath);
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    
    // Create empty video file
    fs.writeFileSync(videoPath, '');
    console.log(`Created: ${videoPath}`);
});

console.log('Sample video files created successfully!');
console.log('\nDirectory structure:');
console.log('Videos/');
console.log('├── sample-video-1-720p-15min.mp4');
console.log('├── sample-video-2-1080p-20min.mp4');
console.log('├── sample-video-3-4k-25min.mp4');
console.log('├── SamplePerformer1/');
console.log('│   ├── performer1-video1-hardcore-anal-720p.mp4');
console.log('│   ├── performer1-video2-blowjob-pov-1080p.mp4');
console.log('│   └── performer1-video3-threesome-gangbang-4k.mp4');
console.log('└── SamplePerformer2/');
console.log('    ├── performer2-video1-lesbian-massage-720p.mp4');
console.log('    ├── performer2-video2-milf-creampie-1080p.mp4');
console.log('    └── performer2-video3-amateur-homemade-720p.mp4');