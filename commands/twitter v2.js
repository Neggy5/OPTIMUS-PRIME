/**
 * Twitter Downloader - Download Twitter/X videos and media
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Temporary directory for downloads
const tempDir = path.join(__dirname, '../temp');
if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
}

// Twitter URL patterns
const twitterPatterns = [
    /https?:\/\/(?:www\.)?(?:twitter|x)\.com\/\w+\/status\/(\d+)/i,
    /https?:\/\/(?:www\.)?(?:twitter|x)\.com\/\w+\/status\/(\d+)\/\w+/i,
    /https?:\/\/(?:www\.)?(?:twitter|x)\.com\/i\/status\/(\d+)/i,
    /https?:\/\/(?:www\.)?(?:twitter|x)\.com\/\w+\/status\/(\d+)\/photo\/\d+/i,
    /https?:\/\/(?:www\.)?(?:twitter|x)\.com\/\w+\/status\/(\d+)\/video\/\d+/i,
    /https?:\/\/(?:www\.)?t\.co\/[A-Za-z0-9]+/i
];

// API endpoints (multiple fallbacks)
const apis = [
    {
        name: 'Twitter API',
        url: 'https://api.twitterdownloader.xyz/api',
        params: { url: null }
    },
    {
        name: 'SaveTweet',
        url: 'https://api.savetweet.com/download',
        params: { url: null }
    },
    {
        name: 'TwDownloader',
        url: 'https://twdownload.com/api/download',
        params: { url: null }
    },
    {
        name: 'TwitterSaver',
        url: 'https://twittersaver.com/api/fetch',
        params: { url: null }
    }
];

// Headers to mimic browser
const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'en-US,en;q=0.9',
    'Origin': 'https://twitter.com',
    'Referer': 'https://twitter.com/'
};

// Format file size
const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(2) + ' KB';
    if (bytes < 1073741824) return (bytes / 1048576).toFixed(2) + ' MB';
    return (bytes / 1073741824).toFixed(2) + ' GB';
};

// Extract tweet ID from URL
const extractTweetId = (url) => {
    for (const pattern of twitterPatterns) {
        const match = url.match(pattern);
        if (match && match[1]) {
            return match[1];
        }
    }
    return null;
};

// Check if URL is a valid Twitter link
const isValidTwitterUrl = (url) => {
    return twitterPatterns.some(pattern => pattern.test(url));
};

// Download media from URL
const downloadMedia = async (mediaUrl) => {
    try {
        const response = await axios.get(mediaUrl, {
            responseType: 'arraybuffer',
            timeout: 60000,
            maxContentLength: 100 * 1024 * 1024, // 100MB limit
            headers: {
                'User-Agent': headers['User-Agent'],
                'Referer': 'https://twitter.com/'
            }
        });
        
        return Buffer.from(response.data);
    } catch (error) {
        console.error('Media download error:', error);
        throw error;
    }
};

// Main download function with multiple API fallbacks
const downloadTwitter = async (url) => {
    const tweetId = extractTweetId(url);
    
    // Try multiple APIs
    for (const api of apis) {
        try {
            console.log(`Trying ${api.name}...`);
            
            const apiUrl = `${api.url}?url=${encodeURIComponent(url)}`;
            const response = await axios.get(apiUrl, {
                timeout: 15000,
                headers
            });
            
            if (response.data) {
                // Parse different API response formats
                let mediaUrls = [];
                let title = '';
                let author = '';
                
                // Format 1: { success: true, media: [{ url: '...', type: 'video' }] }
                if (response.data.media && Array.isArray(response.data.media)) {
                    mediaUrls = response.data.media.map(m => m.url);
                    title = response.data.title || response.data.text || '';
                    author = response.data.author || response.data.username || '';
                }
                // Format 2: { videos: [{ url: '...' }] }
                else if (response.data.videos && Array.isArray(response.data.videos)) {
                    mediaUrls = response.data.videos.map(v => v.url);
                    title = response.data.title || response.data.text || '';
                }
                // Format 3: { download_url: '...' }
                else if (response.data.download_url) {
                    mediaUrls = [response.data.download_url];
                }
                // Format 4: { url: '...' }
                else if (response.data.url) {
                    mediaUrls = [response.data.url];
                }
                // Format 5: Array of media
                else if (Array.isArray(response.data)) {
                    mediaUrls = response.data.map(item => item.url || item);
                }
                
                if (mediaUrls.length > 0) {
                    return {
                        success: true,
                        mediaUrls,
                        title: title || 'Twitter Media',
                        author: author || 'Unknown',
                        tweetId,
                        api: api.name
                    };
                }
            }
        } catch (error) {
            console.log(`${api.name} failed:`, error.message);
            continue; // Try next API
        }
    }
    
    throw new Error('All download sources failed');
};

// Alternative method using vxtwitter.com
const downloadViaVxTwitter = async (url) => {
    try {
        // Convert to vxtwitter.com
        const vxUrl = url.replace('twitter.com', 'vxtwitter.com').replace('x.com', 'vxtwitter.com');
        
        const response = await axios.get(vxUrl, {
            timeout: 10000,
            headers: {
                'User-Agent': headers['User-Agent']
            }
        });
        
        const html = response.data;
        
        // Extract video URL from HTML
        const videoMatch = html.match(/<video[^>]*>.*?<source[^>]*src="([^"]+)"[^>]*>/i) || 
                          html.match(/"video_url":"([^"]+)"/i) ||
                          html.match(/property="og:video"[^>]*content="([^"]+)"/i);
        
        if (videoMatch && videoMatch[1]) {
            const videoUrl = videoMatch[1].replace(/\\u0026/g, '&');
            
            // Extract title
            const titleMatch = html.match(/<meta[^>]*property="og:title"[^>]*content="([^"]+)"[^>]*>/i);
            const title = titleMatch ? titleMatch[1] : 'Twitter Video';
            
            // Extract author
            const authorMatch = html.match(/<meta[^>]*name="twitter:creator"[^>]*content="([^"]+)"[^>]*>/i) ||
                               html.match(/<meta[^>]*name="twitter:title"[^>]*content="([^"]+)"[^>]*>/i);
            const author = authorMatch ? authorMatch[1] : 'Twitter User';
            
            return {
                success: true,
                mediaUrls: [videoUrl],
                title,
                author,
                api: 'VxTwitter'
            };
        }
    } catch (error) {
        console.log('VxTwitter method failed:', error.message);
    }
    
    return null;
};

module.exports = {
    name: 'twitter',
    aliases: ['twt', 'x', 'twdl', 'twitterdl', 'tweet'],
    category: 'download',
    description: 'Download Twitter/X videos and media',
    usage: '.twitter <URL>',
    
    async execute(sock, msg, args, extra) {
        try {
            const chatId = extra.from;
            const url = args.join(' ').trim();

            if (!url) {
                return extra.reply(`╔══════════════════════╗
║  🐦 *TWITTER DOWNLOADER*  🐦 ║
╚══════════════════════╝

❌ *Please provide a Twitter/X URL!*

📌 *Usage:*
• .twitter <URL>
• .twt <URL>
• .x <URL>

💡 *Supported URLs:*
• https://twitter.com/user/status/123456789
• https://x.com/user/status/123456789
• https://twitter.com/i/status/123456789
• https://t.co/abc123 (short link)

━━━━━━━━━━━━━━━━━━━
📱 *Examples:*
• .twitter https://twitter.com/elonmusk/status/123456789
• .twt https://x.com/NASA/status/987654321

⚠️ *Note:* Public tweets only
📹 *Supports:* Videos, GIFs, Images

> *ᴘᴏᴡᴇʀᴇᴅ ʙʏ 𝑂𝑃𝑇𝐼𝑀𝑈𝑆 𝑃𝑅𝐼𝑀𝐸*`);
            }

            // Validate URL
            if (!isValidTwitterUrl(url)) {
                return extra.reply(`❌ *Invalid Twitter/X URL!*\n\nPlease provide a valid tweet URL.`);
            }

            // Send searching message
            const searchingMsg = await sock.sendMessage(chatId, {
                text: `🐦 *Processing Twitter URL...*\n\n⏳ Fetching media...`
            }, { quoted: msg });

            try {
                // Try main API first
                let result = await downloadTwitter(url).catch(() => null);
                
                // If main API fails, try vxtwitter
                if (!result) {
                    result = await downloadViaVxTwitter(url);
                }
                
                if (!result || !result.mediaUrls || result.mediaUrls.length === 0) {
                    throw new Error('Could not fetch media');
                }

                await sock.sendMessage(chatId, { delete: searchingMsg.key });

                // Send media info
                const infoText = `╔══════════════════════╗
║  🐦 *TWITTER MEDIA*  🐦   ║
╚══════════════════════╝

📌 *Title:* ${result.title}
👤 *Author:* @${result.author}
🔗 *Tweet ID:* ${result.tweetId || 'N/A'}
📊 *Media Count:* ${result.mediaUrls.length}
⚙️ *Source:* ${result.api}

━━━━━━━━━━━━━━━━━━━
📥 *Downloading...*

> *ᴘᴏᴡᴇʀᴇᴅ ʙʏ 𝑂𝑃𝑇𝐼𝑀𝑈𝑆 𝑃𝑅𝐼𝑀𝐸*`;

                await sock.sendMessage(chatId, { text: infoText }, { quoted: msg });

                // Download and send each media
                for (let i = 0; i < result.mediaUrls.length; i++) {
                    const mediaUrl = result.mediaUrls[i];
                    
                    try {
                        const mediaBuffer = await downloadMedia(mediaUrl);
                        const fileSize = formatFileSize(mediaBuffer.length);

                        // Determine media type from URL
                        const isVideo = mediaUrl.includes('.mp4') || mediaUrl.includes('/video/') || mediaUrl.includes('video');
                        const isGif = mediaUrl.includes('.gif') || mediaUrl.includes('/tweet_video/');
                        const isImage = mediaUrl.includes('.jpg') || mediaUrl.includes('.jpeg') || 
                                       mediaUrl.includes('.png') || mediaUrl.includes('/photo/');

                        const caption = `📌 *Media ${i+1}/${result.mediaUrls.length}*\n📦 *Size:* ${fileSize}`;

                        if (isVideo) {
                            await sock.sendMessage(chatId, {
                                video: mediaBuffer,
                                caption: caption,
                                contextInfo: {
                                    forwardingScore: 999,
                                    isForwarded: true,
                                    forwardedNewsletterMessageInfo: {
                                        newsletterJid: '120363405724402785@newsletter',
                                        newsletterName: '𝑂𝑃𝑇𝐼𝑀𝑈𝑆 𝑃𝑅𝐼𝑀𝐸',
                                        serverMessageId: -1
                                    }
                                }
                            }, { quoted: msg });
                        } 
                        else if (isGif) {
                            await sock.sendMessage(chatId, {
                                video: mediaBuffer,
                                caption: caption,
                                gifPlayback: true,
                                contextInfo: {
                                    forwardingScore: 999,
                                    isForwarded: true,
                                    forwardedNewsletterMessageInfo: {
                                        newsletterJid: '120363405724402785@newsletter',
                                        newsletterName: '𝑂𝑃𝑇𝐼𝑀𝑈𝑆 𝑃𝑅𝐼𝑀𝐸',
                                        serverMessageId: -1
                                    }
                                }
                            }, { quoted: msg });
                        }
                        else if (isImage) {
                            await sock.sendMessage(chatId, {
                                image: mediaBuffer,
                                caption: caption,
                                contextInfo: {
                                    forwardingScore: 999,
                                    isForwarded: true,
                                    forwardedNewsletterMessageInfo: {
                                        newsletterJid: '120363405724402785@newsletter',
                                        newsletterName: '𝑂𝑃𝑇𝐼𝑀𝑈𝑆 𝑃𝑅𝐼𝑀𝐸',
                                        serverMessageId: -1
                                    }
                                }
                            }, { quoted: msg });
                        }

                        // Small delay between multiple media
                        if (i < result.mediaUrls.length - 1) {
                            await new Promise(r => setTimeout(r, 1000));
                        }

                    } catch (mediaError) {
                        console.error(`Error downloading media ${i+1}:`, mediaError);
                        await sock.sendMessage(chatId, {
                            text: `⚠️ *Failed to download media ${i+1}*\n\n${mediaError.message}`
                        });
                    }
                }

                // Send completion message
                await sock.sendMessage(chatId, {
                    text: `✅ *Download complete!*\n\n📊 *Total media:* ${result.mediaUrls.length}`
                });

            } catch (error) {
                console.error('Twitter download error:', error);
                await sock.sendMessage(chatId, { delete: searchingMsg.key });
                
                let errorMessage = '❌ *Failed to download media.*';
                if (error.message.includes('All download sources failed')) {
                    errorMessage = '❌ *Could not download media.*\n\nThis content may be private, deleted, or unavailable.';
                } else if (error.message.includes('404')) {
                    errorMessage = '❌ *Tweet not found!*\n\nCheck if the URL is correct and the tweet is public.';
                } else if (error.message.includes('private')) {
                    errorMessage = '❌ *This tweet is private!*\n\nCan only download public tweets.';
                }
                
                await extra.reply(errorMessage);
            }

        } catch (error) {
            console.error('Twitter Command Error:', error);
            await extra.reply(`❌ *Error:* ${error.message}`);
        }
    }
};