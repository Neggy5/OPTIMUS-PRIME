/**
 * Video Command - Download YouTube videos
 */

const ytdl = require('ytdl-core');
const ytSearch = require('yt-search');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

// Temporary directory for downloads
const tempDir = path.join(__dirname, '../temp');
if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
}

// Quality options
const qualityOptions = {
    low: { 
        label: '144p', 
        format: 'lowest',
        size: '~5-10MB/min'
    },
    medium: { 
        label: '360p', 
        format: '18',
        size: '~10-20MB/min'
    },
    high: { 
        label: '720p', 
        format: '22',
        size: '~20-40MB/min'
    },
    hd: { 
        label: '1080p', 
        format: '137+140',
        size: '~40-80MB/min'
    }
};

// Format file size
const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(2) + ' KB';
    if (bytes < 1073741824) return (bytes / 1048576).toFixed(2) + ' MB';
    return (bytes / 1073741824).toFixed(2) + ' GB';
};

// Format duration
const formatDuration = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hrs > 0) {
        return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    } else {
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }
};

// Clean up old files
const cleanup = () => {
    try {
        const files = fs.readdirSync(tempDir);
        const now = Date.now();
        files.forEach(file => {
            const filePath = path.join(tempDir, file);
            const stats = fs.statSync(filePath);
            // Delete files older than 1 hour
            if (now - stats.mtimeMs > 3600000) {
                fs.unlinkSync(filePath);
            }
        });
    } catch (error) {
        console.error('Cleanup error:', error);
    }
};

// Run cleanup every hour
setInterval(cleanup, 3600000);

module.exports = {
    name: 'video',
    aliases: ['ytvideo', 'ytv', 'mp4', 'downloadvideo'],
    description: 'Download YouTube videos',
    usage: '.video <URL or search> [quality]',
    groupOnly: false,
    adminOnly: false,
    botAdminNeeded: false,
    
    async execute(sock, msg, args, extra) {
        try {
            const chatId = extra.from;
            const query = args.join(' ');
            
            // Parse quality from args
            let quality = 'medium';
            let searchQuery = query;
            
            const lastArg = args[args.length - 1]?.toLowerCase();
            if (lastArg && ['low', 'medium', 'high', 'hd'].includes(lastArg)) {
                quality = lastArg;
                searchQuery = args.slice(0, -1).join(' ');
            }
            
            if (!searchQuery) {
                return extra.reply(`╔══════════════════════╗
║  🎬 *VIDEO DOWNLOADER*  🎬 ║
╚══════════════════════╝

❌ *Please provide a video name or URL!*

📌 *Usage:*
• .video <YouTube URL>
• .video <search query>
• .video <query> [quality]

💡 *Examples:*
• .video https://youtu.be/...
• .video funny cats
• .video music video high
• .video tutorial hd

━━━━━━━━━━━━━━━━━━━
📊 *Quality Options:*
• low (144p) - ${qualityOptions.low.size}
• medium (360p) - ${qualityOptions.medium.size}
• high (720p) - ${qualityOptions.high.size}
• hd (1080p) - ${qualityOptions.hd.size}

⚠️ *Note:* Max file size: 100MB
⏱️ *Max duration:* 15 minutes

> *ᴘᴏᴡᴇʀᴇᴅ ʙʏ 𝑂𝑃𝑇𝐼𝑀𝑈𝑆 𝑃𝑅𝐼𝑀𝐸*`);
            }
            
            // Send searching message
            const searchingMsg = await sock.sendMessage(chatId, {
                text: `🔍 *Searching:* ${searchQuery}\n\n⏳ Please wait...`
            }, { quoted: msg });
            
            try {
                let videoUrl = searchQuery;
                let videoInfo = null;
                
                // Check if it's a valid YouTube URL
                const isUrl = ytdl.validateURL(searchQuery) || searchQuery.includes('youtu.be');
                
                if (!isUrl) {
                    // Search for the video
                    const searchResults = await ytSearch(searchQuery);
                    
                    if (!searchResults || !searchResults.videos || searchResults.videos.length === 0) {
                        await sock.sendMessage(chatId, { delete: searchingMsg.key });
                        return extra.reply(`❌ *No results found for:* "${searchQuery}"`);
                    }
                    
                    videoInfo = searchResults.videos[0];
                    videoUrl = videoInfo.url;
                    
                    await sock.sendMessage(chatId, {
                        text: `✅ *Found:* ${videoInfo.title}\n\n📥 *Downloading...*`,
                        edit: searchingMsg.key
                    });
                } else {
                    // Get video info from URL
                    videoInfo = await ytdl.getInfo(videoUrl);
                    
                    await sock.sendMessage(chatId, {
                        text: `📥 *Downloading:* ${videoInfo.videoDetails.title}\n\n⏳ Please wait...`,
                        edit: searchingMsg.key
                    });
                }
                
                // Check duration
                const duration = parseInt(videoInfo.seconds || videoInfo.videoDetails?.lengthSeconds);
                if (duration > 900) { // 15 minutes max
                    await sock.sendMessage(chatId, { delete: searchingMsg.key });
                    return extra.reply(`❌ *Video too long!*\n\nMax duration: 15 minutes\nThis video: ${formatDuration(duration)}`);
                }
                
                // Get video format
                const qualitySetting = qualityOptions[quality];
                let format;
                
                if (quality === 'hd') {
                    // For 1080p, we need video+audio separate
                    const videoFormat = ytdl.chooseFormat(videoInfo.formats, { quality: '137' });
                    const audioFormat = ytdl.chooseFormat(videoInfo.formats, { quality: '140' });
                    format = { video: videoFormat, audio: audioFormat };
                } else {
                    format = ytdl.chooseFormat(videoInfo.formats, { quality: qualitySetting.format });
                }
                
                // Estimate file size
                const estimatedSize = format.contentLength ? parseInt(format.contentLength) : duration * 500000; // Rough estimate
                
                if (estimatedSize > 100 * 1024 * 1024) { // 100MB limit
                    await sock.sendMessage(chatId, { delete: searchingMsg.key });
                    return extra.reply(`❌ *File too large!*\n\nEstimated size: ${formatFileSize(estimatedSize)}\nMax allowed: 100MB\n\nTry a lower quality.`);
                }
                
                // Download video
                const fileName = `video_${Date.now()}.mp4`;
                const filePath = path.join(tempDir, fileName);
                
                if (quality === 'hd') {
                    // Download video and audio separately then merge
                    const videoPath = path.join(tempDir, `video_${Date.now()}.mp4`);
                    const audioPath = path.join(tempDir, `audio_${Date.now()}.mp4`);
                    
                    // Download video
                    const videoStream = ytdl(videoUrl, { format: format.video });
                    const videoWriteStream = fs.createWriteStream(videoPath);
                    videoStream.pipe(videoWriteStream);
                    
                    await new Promise((resolve, reject) => {
                        videoWriteStream.on('finish', resolve);
                        videoWriteStream.on('error', reject);
                    });
                    
                    // Download audio
                    const audioStream = ytdl(videoUrl, { format: format.audio });
                    const audioWriteStream = fs.createWriteStream(audioPath);
                    audioStream.pipe(audioWriteStream);
                    
                    await new Promise((resolve, reject) => {
                        audioWriteStream.on('finish', resolve);
                        audioWriteStream.on('error', reject);
                    });
                    
                    // Merge using ffmpeg
                    await execPromise(`ffmpeg -i "${videoPath}" -i "${audioPath}" -c:v copy -c:a aac "${filePath}"`);
                    
                    // Cleanup
                    fs.unlinkSync(videoPath);
                    fs.unlinkSync(audioPath);
                } else {
                    // Download single format
                    const stream = ytdl(videoUrl, { format });
                    const writeStream = fs.createWriteStream(filePath);
                    stream.pipe(writeStream);
                    
                    await new Promise((resolve, reject) => {
                        writeStream.on('finish', resolve);
                        writeStream.on('error', reject);
                    });
                }
                
                // Get file stats
                const stats = fs.statSync(filePath);
                const fileSize = formatFileSize(stats.size);
                
                // Delete searching message
                await sock.sendMessage(chatId, { delete: searchingMsg.key });
                
                // Send uploading message
                const uploadingMsg = await sock.sendMessage(chatId, {
                    text: `📤 *Uploading video...*\n\n📦 Size: ${fileSize}`
                });
                
                // Get video details
                const title = videoInfo.title || videoInfo.videoDetails?.title;
                const author = videoInfo.author?.name || videoInfo.videoDetails?.author?.name;
                const views = videoInfo.views || videoInfo.videoDetails?.viewCount;
                
                // Create caption
                const caption = `╔══════════════════════╗
║  🎬 *VIDEO DOWNLOADED*  🎬 ║
╚══════════════════════╝

📌 *Title:* ${title}
👤 *Channel:* ${author || 'Unknown'}
⏱️ *Duration:* ${formatDuration(duration)}
📊 *Quality:* ${qualityOptions[quality].label}
📦 *Size:* ${fileSize}
👁️ *Views:* ${views ? parseInt(views).toLocaleString() : 'N/A'}

📥 *Downloaded by:* @${extra.sender.split('@')[0]}

> *ᴘᴏᴡᴇʀᴇᴅ ʙʏ 𝑂𝑃𝑇𝐼𝑀𝑈𝑆 𝑃𝑅𝐼𝑀𝐸*`;
                
                // Send the video
                await sock.sendMessage(chatId, {
                    video: fs.readFileSync(filePath),
                    caption: caption,
                    mentions: [extra.sender],
                    contextInfo: {
                        forwardingScore: 999,
                        isForwarded: true,
                        forwardedNewsletterMessageInfo: {
                            newsletterJid: '120363405724402785@newsletter',
                            newsletterName: '𝑂𝑃𝑇𝐼𝑀𝑈𝑆 𝑃𝑅𝐼𝑀𝐸',
                            serverMessageId: -1
                        }
                    }
                });
                
                // Delete uploading message
                await sock.sendMessage(chatId, { delete: uploadingMsg.key });
                
                // Clean up file (will be deleted by cleanup function)
                
            } catch (downloadError) {
                console.error('Download error:', downloadError);
                await sock.sendMessage(chatId, { delete: searchingMsg.key });
                await extra.reply(`❌ *Download failed:* ${downloadError.message}`);
            }
            
        } catch (error) {
            console.error('Video Command Error:', error);
            await extra.reply(`❌ *Error:* ${error.message}`);
        }
    }
};