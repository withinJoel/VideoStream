function handleVideoDownload(video) {
    // Create a temporary link to trigger download
    const link = document.createElement('a');
    link.href = `/api/video-download/${video.id}`;
    link.download = `${video.title || 'video'}.mp4`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}