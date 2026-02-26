/**
 * SnapChat Command - Download SnapChat stories and media
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Temporary directory for downloads
const tempDir = path.join(__dirname, '../temp');
if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
}

// SnapChat media patterns
const snapchatPatterns = [
    /https?:\/\/(?:www\.)?snapchat\.com\/add\/([a-zA-Z0-9_.-]+)/,
    /https?:\/\/(?:www\.)?snapchat\.com\/spotlight\/([a-zA-Z0-9_-]+)/,
    /https?:\/\/(?:www\.)?snapchat\.com\/story\/([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_-]+)/,
    /https?:\/\/(?:www\.)?snapchat\.com\/p\/([a-zA-Z0-9_-]+)/,
    /https?:\/\/(?:www\.)?snapchat\.com\/discover\/([a-zA-Z0-9_.-]+)/,
    /https?:\/\/(?:www\.)?t\.snapchat\.com\/([a-zA-Z0-9_-]+)/
];

// SnapChat API endpoints (using public APIs)
const apis = {
    story: 'https://api.snapchat.com/api/story',
    download: 'https://api.snapchat.com/api/download',
    user: 'https://api.snapchat.com/api/user'
};

// Headers to mimic browser
const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'en-US,en;q=0.9',
    'Origin': 'https://www.snapchat.com',
    'Referer': 'https://www.snapchat.com/'
};

// Format file size
const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(2) + ' KB';
    if (bytes < 1073741824) return (bytes / 1048576).toFixed(2) + ' MB';
    return (bytes / 1073741824).toFixed(2) + ' GB';
};

// Extract SnapChat username from URL
const extractUsername = (url) => {
    for (const pattern of snapchatPatterns) {
        const match = url.match(pattern);
        if (match) return match[1];
    }
    return null;
};

// Check if URL is a valid SnapChat link
const isValidSnapChatUrl = (url) => {
    return snapchatPatterns.some(pattern => pattern.test(url));
};

// Download SnapChat media
const downloadSnapChat = async (url) => {
    try {
        // Using public SnapChat download APIs (multiple fallbacks)
        const downloadApis = [
            `https://api.snapdownloader.com/api?url=${encodeURIComponent(url)}`,
            `https://snapsave.app/api/fetch?url=${encodeURIComponent(url)}`,
            `https://snapinsta.app/api/ajaxSearch?q=${encodeURIComponent(url)}`
        ];

        for (const apiUrl of downloadApis) {
            try {
                const response = await axios.get(apiUrl, { 
                    timeout: 10000,
                    headers
                });

                if (response.data) {
                    // Parse different API response formats
                    if (response.data.media) {
                        return {
                            success: true,
                            media: response.data.media,
                            title: response.data.title || 'SnapChat Media'
                        };
                    } else if (response.data.data) {
                        return {
                            success: true,
                            media: response.data.data,
                            title: response.data.title || 'SnapChat Media'
                        };
                    } else if (response.data.result) {
                        return {
                            success: true,
                            media: response.data.result,
                            title: response.data.title || 'SnapChat Media'
                        };
                    }
                }
            } catch (e) {
                console.log(`API ${apiUrl} failed:`, e.message);
                continue;
            }
        }

        throw new Error('All download sources failed');
    } catch (error) {
        console.error('SnapChat download error:', error);
        throw error;
    }
};

// Get user info from SnapChat
const getUserInfo = async (username) => {
    try {
        const response = await axios.get(`https://www.snapchat.com/add/${username}`, {
            timeout: 10000,
            headers
        });

        // Parse user info from HTML (simplified)
        const html = response.data;
        
        // Extract display name (simplified - would need proper parsing)
        const displayNameMatch = html.match(/<title>(.*?)<\/title>/);
        const displayName = displayNameMatch ? displayNameMatch[1].replace('Snapchat', '').trim() : username;

        // Extract bio if available
        const bioMatch = html.match(/<meta name="description" content="(.*?)"/);
        const bio = bioMatch ? bioMatch[1] : '';

        return {
            username,
            displayName,
            bio,
            url: `https://www.snapchat.com/add/${username}`
        };
    } catch (error) {
        console.error('User info error:', error);
        return null;
    }
};

module.exports = {
    name: 'snapchat',
    aliases: ['snap', 'sc', 'snapstory', 'snapdl'],
    category: 'download',
    description: 'Download SnapChat stories and media',
    usage: '.snapchat <URL> or .snapchat <username>',
    
    async execute(sock, msg, args, extra) {
        try {
            const chatId = extra.from;
            const query = args.join(' ').trim();

            if (!query) {
                return extra.reply(`╔══════════════════════╗
║  👻 *SNAPCHAT COMMAND*  👻 ║
╚══════════════════════╝

❌ *Please provide a SnapChat URL or username!*

📌 *Usage:*
• .snapchat <URL> - Download SnapChat media
• .snapchat <username> - Get user info
• .snapchat story <username> - Get user stories

💡 *Examples:*
• .snapchat https://www.snapchat.com/add/username
• .snapchat https://t.snapchat.com/xyz123
• .snapchat username
• .snapchat story username

━━━━━━━━━━━━━━━━━━━
📱 *Supported Links:*
• Profile: snapchat.com/add/username
• Story: snapchat.com/story/username/id
• Spotlight: snapchat.com/spotlight/id
• Direct: t.snapchat.com/code

⚠️ *Note:* Public content only
🔒 Respect privacy!

> *ᴘᴏᴡᴇʀᴇᴅ ʙʏ 𝑂𝑃𝑇𝐼𝑀𝑈𝑆 𝑃𝑅𝐼𝑀𝐸*`);
            }

            // Send searching message
            const searchingMsg = await sock.sendMessage(chatId, {
                text: `👻 *Processing SnapChat request...*\n\n⏳ Please wait`
            }, { quoted: msg });

            try {
                // Check if it's a story request
                if (query.startsWith('story ')) {
                    const username = query.replace('story ', '').trim();
                    
                    // Get user stories (simplified - would need proper API)
                    const userInfo = await getUserInfo(username);
                    
                    if (!userInfo) {
                        await sock.sendMessage(chatId, { delete: searchingMsg.key });
                        return extra.reply(`❌ *User not found:* ${username}`);
                    }

                    const storyText = `╔══════════════════════╗
║  👻 *SNAPCHAT STORIES*  👻 ║
╚══════════════════════╝

👤 *User:* ${userInfo.displayName} (@${userInfo.username})
📝 *Bio:* ${userInfo.bio || 'No bio'}

━━━━━━━━━━━━━━━━━━━
📱 *Recent Stories*
━━━━━━━━━━━━━━━━━━━

📌 *Public stories are not accessible via API*
💡 Try using the direct story link if available:

🔗 ${userInfo.url}

━━━━━━━━━━━━━━━━━━━
⚠️ *Note:* Due to SnapChat privacy, stories can only be downloaded with direct links.

> *ᴘᴏᴡᴇʀᴇᴅ ʙʏ 𝑂𝑃𝑇𝐼𝑀𝑈𝑆 𝑃𝑅𝐼𝑀𝐸*`;

                    await sock.sendMessage(chatId, { delete: searchingMsg.key });
                    return extra.reply(storyText);
                }

                // Check if it's a username (not URL)
                if (!query.includes('snapchat.com') && !query.includes('t.snapchat.com')) {
                    const userInfo = await getUserInfo(query);
                    
                    await sock.sendMessage(chatId, { delete: searchingMsg.key });

                    if (!userInfo) {
                        return extra.reply(`❌ *User not found:* ${query}`);
                    }

                    const userText = `╔══════════════════════╗
║  👻 *SNAPCHAT USER*  👻   ║
╚══════════════════════╝

👤 *Username:* @${userInfo.username}
📝 *Display Name:* ${userInfo.displayName}
📄 *Bio:* ${userInfo.bio || 'No bio available'}

━━━━━━━━━━━━━━━━━━━
🔗 *Profile Link:*
${userInfo.url}

━━━━━━━━━━━━━━━━━━━
💡 *To download content:*
• Use .snapchat <story URL>
• Use .snapchat <snap URL>

> *ᴘᴏᴡᴇʀᴇᴅ ʙʏ 𝑂𝑃𝑇𝐼𝑀𝑈𝑆 𝑃𝑅𝐼𝑀𝐸*`;

                    return extra.reply(userText);
                }

                // Check if URL is valid
                if (!isValidSnapChatUrl(query)) {
                    await sock.sendMessage(chatId, { delete: searchingMsg.key });
                    return extra.reply(`❌ *Invalid SnapChat URL!*\n\nPlease provide a valid SnapChat link.`);
                }

                // Download SnapChat media
                const result = await downloadSnapChat(query);

                if (!result.success || !result.media) {
                    throw new Error('No media found');
                }

                await sock.sendMessage(chatId, { delete: searchingMsg.key });

                // Handle multiple media items
                const mediaArray = Array.isArray(result.media) ? result.media : [result.media];

                for (let i = 0; i < Math.min(mediaArray.length, 5); i++) { // Limit to 5 items
                    const media = mediaArray[i];
                    const mediaUrl = media.url || media;
                    
                    try {
                        // Download media
                        const response = await axios.get(mediaUrl, {
                            responseType: 'arraybuffer',
                            timeout: 30000,
                            maxContentLength: 50 * 1024 * 1024, // 50MB limit
                            headers
                        });

                        const buffer = Buffer.from(response.data);
                        const fileSize = formatFileSize(buffer.length);

                        // Determine media type
                        const contentType = response.headers['content-type'];
                        const isVideo = contentType?.includes('video') || mediaUrl.includes('.mp4');
                        const isImage = contentType?.includes('image') || mediaUrl.includes('.jpg') || mediaUrl.includes('.png');

                        const caption = `╔══════════════════════╗
║  👻 *SNAPCHAT MEDIA*  👻 ║
╚══════════════════════╝

📌 *Media ${i+1}/${Math.min(mediaArray.length, 5)}*
📦 *Size:* ${fileSize}
🔗 *Source:* SnapChat

> *ᴘᴏᴡᴇʀᴇᴅ ʙʏ 𝑂𝑃𝑇𝐼𝑀𝑈𝑆 𝑃𝑅𝐼𝑀𝐸*`;

                        // Send media
                        if (isVideo) {
                            await sock.sendMessage(chatId, {
                                video: buffer,
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
                        } else if (isImage) {
                            await sock.sendMessage(chatId, {
                                image: buffer,
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

                        // Small delay between multiple items
                        if (i < mediaArray.length - 1) {
                            await new Promise(r => setTimeout(r, 1000));
                        }

                    } catch (mediaError) {
                        console.error(`Error downloading media ${i+1}:`, mediaError);
                        await sock.sendMessage(chatId, {
                            text: `⚠️ *Failed to download media ${i+1}*`
                        });
                    }
                }

            } catch (error) {
                console.error('SnapChat command error:', error);
                await sock.sendMessage(chatId, { delete: searchingMsg.key });
                
                let errorMessage = '❌ *Failed to process SnapChat request.*';
                if (error.message.includes('All download sources failed')) {
                    errorMessage = '❌ *Could not download media.*\n\nThis content may be private or unavailable.';
                } else if (error.message.includes('404')) {
                    errorMessage = '❌ *Content not found!*\n\nCheck if the URL is correct.';
                }
                
                await extra.reply(errorMessage);
            }

        } catch (error) {
            console.error('SnapChat Command Error:', error);
            await extra.reply(`❌ *Error:* ${error.message}`);
        }
    }
};