/**
 * AutoStatusReact Command - Automatically react to status updates
 */

const fs = require('fs');
const path = require('path');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');

// Database path
const DB_PATH = path.join(__dirname, '../database/autostatreact.json');

// Default settings
const defaultSettings = {
    enabled: false,
    autoReact: true,
    autoView: true,
    autoSave: false,
    reactMode: 'random', // random, sequential, sentiment, specific
    emojis: ['❤️', '🔥', '👍', '😂', '😊', '🥰', '😍', '🎉', '✨', '🌟', '👏', '💯'],
    customEmojis: null,
    specific: '❤️',
    sequenceIndex: 0,
    probability: 90, // Percentage chance to react
    reactToText: true,
    reactToImage: true,
    reactToVideo: true,
    reactToAudio: true,
    ignoreContacts: [], // Contacts to ignore
    favoriteContacts: [], // Always react to these contacts
    saveLocation: 'status_downloads',
    maxStatusPerDay: 100, // Max reactions per day
    stats: {
        totalReactions: 0,
        totalViewed: 0,
        totalSaved: 0,
        reactionsByEmoji: {},
        lastReaction: null,
        todayCount: 0,
        lastReset: Date.now()
    }
};

// Cooldown tracking
const statusCooldown = new Map();
const dailyCount = new Map();

// Load settings
const loadSettings = () => {
    try {
        const dir = path.dirname(DB_PATH);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        
        if (fs.existsSync(DB_PATH)) {
            const data = fs.readFileSync(DB_PATH, 'utf8');
            return { ...defaultSettings, ...JSON.parse(data) };
        } else {
            fs.writeFileSync(DB_PATH, JSON.stringify(defaultSettings, null, 2));
            return { ...defaultSettings };
        }
    } catch (error) {
        console.error('Error loading auto status react settings:', error);
        return { ...defaultSettings };
    }
};

// Save settings
const saveSettings = (settings) => {
    try {
        fs.writeFileSync(DB_PATH, JSON.stringify(settings, null, 2));
        return true;
    } catch (error) {
        console.error('Error saving auto status react settings:', error);
        return false;
    }
};

// Ensure save directory exists
const ensureSaveDir = (settings) => {
    const saveDir = path.join(__dirname, `../${settings.saveLocation}`);
    if (!fs.existsSync(saveDir)) {
        fs.mkdirSync(saveDir, { recursive: true });
    }
    return saveDir;
};

// Reset daily counter if needed
const checkDailyReset = (settings) => {
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;
    
    if (now - settings.stats.lastReset > oneDay) {
        settings.stats.todayCount = 0;
        settings.stats.lastReset = now;
        saveSettings(settings);
    }
    return settings;
};

// Check if can react based on daily limit
const canReactToday = (settings) => {
    checkDailyReset(settings);
    return settings.stats.todayCount < settings.maxStatusPerDay;
};

// Get random emoji
const getRandomEmoji = (settings) => {
    const emojis = settings.customEmojis || settings.emojis;
    return emojis[Math.floor(Math.random() * emojis.length)];
};

// Get sequential emoji
const getSequentialEmoji = (settings) => {
    const emojis = settings.customEmojis || settings.emojis;
    const emoji = emojis[settings.sequenceIndex % emojis.length];
    settings.sequenceIndex++;
    saveSettings(settings);
    return emoji;
};

// Get emoji based on status type/content
const getSmartEmoji = (status, settings) => {
    const content = status.message;
    
    // Text status
    if (content.conversation || content.extendedTextMessage) {
        const text = content.conversation || content.extendedTextMessage?.text || '';
        const lowerText = text.toLowerCase();
        
        if (lowerText.includes('love') || lowerText.includes('❤️')) return '❤️';
        if (lowerText.includes('happy') || lowerText.includes('😊')) return '😊';
        if (lowerText.includes('sad') || lowerText.includes('😢')) return '😢';
        if (lowerText.includes('fire') || lowerText.includes('🔥')) return '🔥';
        if (lowerText.includes('good') || lowerText.includes('👍')) return '👍';
        if (lowerText.includes('funny') || lowerText.includes('😂')) return '😂';
        if (lowerText.includes('cool') || lowerText.includes('😎')) return '😎';
        if (lowerText.includes('party') || lowerText.includes('🎉')) return '🎉';
        if (lowerText.includes('wow') || lowerText.includes('😮')) return '😮';
        if (lowerText.includes('pray') || lowerText.includes('🙏')) return '🙏';
        if (lowerText.includes('clap') || lowerText.includes('👏')) return '👏';
        if (lowerText.includes('💯')) return '💯';
    }
    
    // Image/Video status
    if (content.imageMessage) return '📸';
    if (content.videoMessage) return '🎥';
    if (content.audioMessage) return '🎵';
    
    return null;
};

// Save status media
const saveStatusMedia = async (sock, status, settings, sender) => {
    try {
        const content = status.message;
        if (!content) return;
        
        let mediaType = null;
        let mediaMessage = null;
        let fileName = '';
        let caption = '';
        
        if (content.imageMessage) {
            mediaType = 'image';
            mediaMessage = content.imageMessage;
            caption = mediaMessage.caption || '';
            fileName = `status_image_${sender.split('@')[0]}_${Date.now()}.jpg`;
        } else if (content.videoMessage) {
            mediaType = 'video';
            mediaMessage = content.videoMessage;
            caption = mediaMessage.caption || '';
            fileName = `status_video_${sender.split('@')[0]}_${Date.now()}.mp4`;
        } else if (content.audioMessage) {
            mediaType = 'audio';
            mediaMessage = content.audioMessage;
            fileName = `status_audio_${sender.split('@')[0]}_${Date.now()}.mp3`;
        } else {
            return; // Text status, no media to save
        }
        
        // Download media
        const stream = await downloadContentFromMessage(mediaMessage, mediaType);
        let buffer = Buffer.from([]);
        
        for await (const chunk of stream) {
            buffer = Buffer.concat([buffer, chunk]);
        }
        
        if (buffer.length === 0) return;
        
        // Save to file
        const saveDir = ensureSaveDir(settings);
        const filePath = path.join(saveDir, fileName);
        fs.writeFileSync(filePath, buffer);
        
        settings.stats.totalSaved++;
        saveSettings(settings);
        
        console.log(`[AutoStatusReact] Saved ${mediaType} from ${sender.split('@')[0]}`);
        
    } catch (error) {
        console.error('Error saving status media:', error);
    }
};

// Handle status updates
const handleStatusUpdate = async (sock, statusMsg) => {
    try {
        const settings = loadSettings();
        
        if (!settings.enabled) return;
        
        const statusId = statusMsg.key.id;
        const statusJid = statusMsg.key.remoteJid;
        const sender = statusMsg.key.participant || statusJid;
        const senderNumber = sender.split('@')[0];
        
        // Check if already processed (prevent duplicates)
        if (statusCooldown.has(statusId)) return;
        statusCooldown.set(statusId, Date.now());
        
        // Clean up old entries
        setTimeout(() => statusCooldown.delete(statusId), 60000);
        
        // Check daily limit
        if (!canReactToday(settings)) {
            console.log('[AutoStatusReact] Daily limit reached');
            return;
        }
        
        // Check if contact is ignored
        if (settings.ignoreContacts.includes(sender)) {
            console.log(`[AutoStatusReact] Ignored contact: ${senderNumber}`);
            return;
        }
        
        // Check if contact is favorite (always react)
        const isFavorite = settings.favoriteContacts.includes(sender);
        
        // Auto view status
        if (settings.autoView) {
            await sock.readMessages([statusMsg.key]);
            settings.stats.totalViewed++;
        }
        
        // Auto react to status
        if (settings.autoReact) {
            // Check probability
            if (!isFavorite && Math.random() * 100 > settings.probability) return;
            
            // Determine which emoji to use
            let emoji = '❤️';
            
            switch (settings.reactMode) {
                case 'random':
                    emoji = getRandomEmoji(settings);
                    break;
                    
                case 'sequential':
                    emoji = getSequentialEmoji(settings);
                    break;
                    
                case 'sentiment':
                    const smartEmoji = getSmartEmoji(statusMsg, settings);
                    emoji = smartEmoji || getRandomEmoji(settings);
                    break;
                    
                case 'specific':
                    emoji = settings.specific;
                    break;
                    
                default:
                    emoji = getRandomEmoji(settings);
            }
            
            // Send reaction to status
            await sock.sendMessage('status@broadcast', {
                react: { text: emoji, key: statusMsg.key }
            });
            
            // Update stats
            settings.stats.totalReactions++;
            settings.stats.todayCount++;
            settings.stats.reactionsByEmoji[emoji] = (settings.stats.reactionsByEmoji[emoji] || 0) + 1;
            settings.stats.lastReaction = {
                emoji,
                sender,
                timestamp: Date.now()
            };
            
            console.log(`[AutoStatusReact] Reacted with ${emoji} to ${senderNumber}'s status`);
        }
        
        // Auto save status
        if (settings.autoSave) {
            await saveStatusMedia(sock, statusMsg, settings, sender);
        }
        
        saveSettings(settings);
        
    } catch (error) {
        console.error('[AutoStatusReact] Handler error:', error);
    }
};

// Initialize status listener
const initializeAutoStatusReact = (sock) => {
    try {
        // Listen for status updates
        sock.ev.on('messages.upsert', async ({ messages, type }) => {
            if (type !== 'notify') return;
            
            for (const msg of messages) {
                // Check if it's a status update
                if (msg.key && msg.key.remoteJid === 'status@broadcast') {
                    await handleStatusUpdate(sock, msg);
                }
            }
        });
        
        console.log('[AutoStatusReact] ✅ Status reaction listener initialized');
        
    } catch (error) {
        console.error('[AutoStatusReact] Initialization error:', error);
    }
};

// Command execute
async function execute(sock, msg, args, extra) {
    try {
        const settings = loadSettings();
        const isEnabled = settings.enabled;
        
        if (!args[0]) {
            const emojiCount = (settings.customEmojis || settings.emojis).length;
            const todayUsed = settings.stats.todayCount;
            const dailyLimit = settings.maxStatusPerDay;
            
            return extra.reply(`╔══════════════════════╗
║  📱 *AUTO STATUS REACT*  📱 ║
╚══════════════════════╝

📊 *Status:* ${isEnabled ? '✅ Enabled' : '❌ Disabled'}
🎮 *React Mode:* ${settings.reactMode}
👁️ *Auto View:* ${settings.autoView ? '✅' : '❌'}
💾 *Auto Save:* ${settings.autoSave ? '✅' : '❌'}
🎨 *Emojis:* ${emojiCount} available
⚡ *Probability:* ${settings.probability}%
📊 *Daily Limit:* ${todayUsed}/${dailyLimit}

━━━━━━━━━━━━━━━━━━━
📊 *STATISTICS*
━━━━━━━━━━━━━━━━━━━
📈 Total Reactions: ${settings.stats.totalReactions}
👁️ Total Viewed: ${settings.stats.totalViewed}
💾 Total Saved: ${settings.stats.totalSaved}
⏱️ Last Reaction: ${settings.stats.lastReaction ? new Date(settings.stats.lastReaction.timestamp).toLocaleTimeString() : 'Never'}

━━━━━━━━━━━━━━━━━━━
📋 *Commands:*
• .asr on - Enable auto status react
• .asr off - Disable auto status react
• .asr mode <random/sequential/sentiment/specific>
• .asr view on/off - Toggle auto view
• .asr save on/off - Toggle auto save
• .asr set probability <1-100>
• .asr set limit <number> - Daily reaction limit
• .asr emojis list - Show emojis
• .asr emojis add ❤️🔥 - Add emojis
• .asr emojis remove ❤️ - Remove emojis
• .asr emojis reset - Reset to default
• .asr ignore add @user - Ignore contact
• .asr ignore remove @user - Unignore
• .asr favorite add @user - Add favorite
• .asr favorite remove @user - Remove favorite
• .asr stats - Show detailed stats
• .asr reset - Reset statistics

━━━━━━━━━━━━━━━━━━━
🎮 *Modes:*
• random - Random emojis
• sequential - Cycle through emojis
• sentiment - Based on status content
• specific - One specific emoji

> *ᴘᴏᴡᴇʀᴇᴅ ʙʏ ZUKO-MD*`);
        }
        
        const opt = args[0].toLowerCase();
        
        // Handle on/off
        if (opt === 'on') {
            settings.enabled = true;
            saveSettings(settings);
            return extra.reply(`✅ *Auto Status React enabled!*\n\nMode: ${settings.reactMode}\nProbability: ${settings.probability}%`);
        }
        
        if (opt === 'off') {
            settings.enabled = false;
            saveSettings(settings);
            return extra.reply(`❌ *Auto Status React disabled!*`);
        }
        
        // Handle mode
        if (opt === 'mode') {
            const mode = args[1]?.toLowerCase();
            const validModes = ['random', 'sequential', 'sentiment', 'specific'];
            
            if (!mode || !validModes.includes(mode)) {
                return extra.reply(`❌ *Invalid mode!*\n\nAvailable: ${validModes.join(', ')}`);
            }
            
            if (mode === 'specific') {
                const specificEmoji = args[2];
                if (!specificEmoji) {
                    return extra.reply('❌ *Please provide an emoji!*\n\nExample: .asr mode specific ❤️');
                }
                settings.reactMode = 'specific';
                settings.specific = specificEmoji;
                saveSettings(settings);
                return extra.reply(`✅ *Mode set to specific: ${specificEmoji}*`);
            }
            
            settings.reactMode = mode;
            saveSettings(settings);
            return extra.reply(`✅ *Mode set to ${mode}!*`);
        }
        
        // Handle view toggle
        if (opt === 'view') {
            const value = args[1]?.toLowerCase();
            if (value === 'on') {
                settings.autoView = true;
                saveSettings(settings);
                return extra.reply('✅ *Auto view enabled*');
            } else if (value === 'off') {
                settings.autoView = false;
                saveSettings(settings);
                return extra.reply('❌ *Auto view disabled*');
            }
        }
        
        // Handle save toggle
        if (opt === 'save') {
            const value = args[1]?.toLowerCase();
            if (value === 'on') {
                settings.autoSave = true;
                saveSettings(settings);
                return extra.reply(`✅ *Auto save enabled*\n\nStatuses will be saved to: ${settings.saveLocation}`);
            } else if (value === 'off') {
                settings.autoSave = false;
                saveSettings(settings);
                return extra.reply('❌ *Auto save disabled*');
            }
        }
        
        // Handle set commands
        if (opt === 'set') {
            const subCmd = args[1]?.toLowerCase();
            
            if (subCmd === 'probability') {
                const prob = parseInt(args[2]);
                if (!prob || prob < 1 || prob > 100) {
                    return extra.reply('❌ *Invalid probability!*\n\nPlease provide a value between 1 and 100.');
                }
                settings.probability = prob;
                saveSettings(settings);
                return extra.reply(`✅ *Probability set to ${prob}%!*`);
            }
            
            if (subCmd === 'limit') {
                const limit = parseInt(args[2]);
                if (!limit || limit < 1 || limit > 1000) {
                    return extra.reply('❌ *Invalid limit!*\n\nPlease provide a value between 1 and 1000.');
                }
                settings.maxStatusPerDay = limit;
                saveSettings(settings);
                return extra.reply(`✅ *Daily limit set to ${limit}!*`);
            }
        }
        
        // Handle emojis
        if (opt === 'emojis') {
            const subCmd = args[1]?.toLowerCase();
            
            if (subCmd === 'list') {
                const emojis = settings.customEmojis || settings.emojis;
                const list = emojis.map((e, i) => `${i+1}. ${e}`).join('\n');
                return extra.reply(`📋 *EMOJI LIST*\n\n${list}\n\nTotal: ${emojis.length}`);
            }
            
            if (subCmd === 'add') {
                const newEmojis = args.slice(2).join('').split('');
                if (newEmojis.length === 0) {
                    return extra.reply('❌ *Please provide emojis to add!*');
                }
                
                settings.customEmojis = settings.customEmojis || [...settings.emojis];
                const added = [];
                newEmojis.forEach(emoji => {
                    if (emoji.trim() && !settings.customEmojis.includes(emoji)) {
                        settings.customEmojis.push(emoji);
                        added.push(emoji);
                    }
                });
                
                saveSettings(settings);
                return extra.reply(`✅ *Added ${added.length} emojis!*\n\n${added.join(' ')}`);
            }
            
            if (subCmd === 'remove') {
                const removeEmojis = args.slice(2).join('').split('');
                if (removeEmojis.length === 0) {
                    return extra.reply('❌ *Please provide emojis to remove!*');
                }
                
                settings.customEmojis = settings.customEmojis || [...settings.emojis];
                const removed = [];
                removeEmojis.forEach(emoji => {
                    const index = settings.customEmojis.indexOf(emoji);
                    if (index > -1) {
                        settings.customEmojis.splice(index, 1);
                        removed.push(emoji);
                    }
                });
                
                saveSettings(settings);
                return extra.reply(`✅ *Removed ${removed.length} emojis!*\n\n${removed.join(' ')}`);
            }
            
            if (subCmd === 'reset') {
                delete settings.customEmojis;
                saveSettings(settings);
                return extra.reply('✅ *Reset to default emojis!*');
            }
        }
        
        // Handle ignore list
        if (opt === 'ignore') {
            const subCmd = args[1]?.toLowerCase();
            const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid;
            
            if (subCmd === 'add') {
                if (!mentioned || mentioned.length === 0) {
                    return extra.reply('❌ *Please mention a user to ignore!*');
                }
                
                const userJid = mentioned[0];
                if (!settings.ignoreContacts.includes(userJid)) {
                    settings.ignoreContacts.push(userJid);
                    saveSettings(settings);
                    return extra.reply(`✅ *Added @${userJid.split('@')[0]} to ignore list*`);
                }
                return extra.reply(`❌ *User already in ignore list!*`);
            }
            
            if (subCmd === 'remove') {
                if (!mentioned || mentioned.length === 0) {
                    return extra.reply('❌ *Please mention a user to remove!*');
                }
                
                const userJid = mentioned[0];
                settings.ignoreContacts = settings.ignoreContacts.filter(jid => jid !== userJid);
                saveSettings(settings);
                return extra.reply(`✅ *Removed @${userJid.split('@')[0]} from ignore list*`);
            }
            
            if (subCmd === 'list') {
                if (settings.ignoreContacts.length === 0) {
                    return extra.reply('📋 *Ignore list is empty*');
                }
                const list = settings.ignoreContacts.map((jid, i) => `${i+1}. @${jid.split('@')[0]}`).join('\n');
                return extra.reply(`📋 *Ignore List (${settings.ignoreContacts.length})*\n\n${list}`);
            }
        }
        
        // Handle favorite list
        if (opt === 'favorite') {
            const subCmd = args[1]?.toLowerCase();
            const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid;
            
            if (subCmd === 'add') {
                if (!mentioned || mentioned.length === 0) {
                    return extra.reply('❌ *Please mention a user to favorite!*');
                }
                
                const userJid = mentioned[0];
                if (!settings.favoriteContacts.includes(userJid)) {
                    settings.favoriteContacts.push(userJid);
                    saveSettings(settings);
                    return extra.reply(`✅ *Added @${userJid.split('@')[0]} to favorites*\n\nWill always react to their statuses!`);
                }
                return extra.reply(`❌ *User already in favorites!*`);
            }
            
            if (subCmd === 'remove') {
                if (!mentioned || mentioned.length === 0) {
                    return extra.reply('❌ *Please mention a user to remove!*');
                }
                
                const userJid = mentioned[0];
                settings.favoriteContacts = settings.favoriteContacts.filter(jid => jid !== userJid);
                saveSettings(settings);
                return extra.reply(`✅ *Removed @${userJid.split('@')[0]} from favorites*`);
            }
            
            if (subCmd === 'list') {
                if (settings.favoriteContacts.length === 0) {
                    return extra.reply('📋 *Favorites list is empty*');
                }
                const list = settings.favoriteContacts.map((jid, i) => `${i+1}. @${jid.split('@')[0]}`).join('\n');
                return extra.reply(`📋 *Favorites List (${settings.favoriteContacts.length})*\n\n${list}`);
            }
        }
        
        // Handle stats
        if (opt === 'stats') {
            const topEmojis = Object.entries(settings.stats.reactionsByEmoji)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5)
                .map(([emoji, count], i) => `${i+1}. ${emoji} - ${count} times`)
                .join('\n');
            
            const todayReset = new Date(settings.stats.lastReset).toLocaleDateString();
            
            return extra.reply(`📊 *AUTO STATUS REACT STATISTICS*\n\n` +
                `📈 Total Reactions: ${settings.stats.totalReactions}\n` +
                `👁️ Total Viewed: ${settings.stats.totalViewed}\n` +
                `💾 Total Saved: ${settings.stats.totalSaved}\n` +
                `📊 Today's Count: ${settings.stats.todayCount}/${settings.maxStatusPerDay}\n` +
                `📅 Since: ${todayReset}\n\n` +
                `🎯 Top Emojis:\n${topEmojis || 'None yet'}\n\n` +
                `⏱️ Last Reaction: ${settings.stats.lastReaction ? 
                    `${settings.stats.lastReaction.emoji} to @${settings.stats.lastReaction.sender.split('@')[0]} at ${new Date(settings.stats.lastReaction.timestamp).toLocaleTimeString()}` : 
                    'Never'}`);
        }
        
        // Handle reset
        if (opt === 'reset') {
            if (args[1] === 'confirm') {
                settings.stats = {
                    totalReactions: 0,
                    totalViewed: 0,
                    totalSaved: 0,
                    reactionsByEmoji: {},
                    lastReaction: null,
                    todayCount: 0,
                    lastReset: Date.now()
                };
                saveSettings(settings);
                return extra.reply('✅ *Statistics reset!*');
            }
            return extra.reply('⚠️ *Use .asr reset confirm to reset statistics*');
        }
        
        extra.reply('❌ *Invalid option.* Use .asr for help.');
        
    } catch (error) {
        console.error('[AutoStatusReact] Command error:', error);
        extra.reply(`❌ Error: ${error.message}`);
    }
}

// Export
module.exports = {
    name: 'autostatreact',
    aliases: ['asr', 'statusreact', 'autoreactstatus'],
    category: 'fun',
    description: 'Automatically react to status updates',
    usage: '.asr <on/off/mode/emojis/ignore/favorite>',
    ownerOnly: true,
    
    async execute(sock, msg, args, extra) {
        return execute(sock, msg, args, extra);
    },
    
    initializeAutoStatusReact,
    handleStatusUpdate
};