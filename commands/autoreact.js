/**
 * AutoReact Command - Automatically react to messages with emojis
 */

const fs = require('fs');
const path = require('path');

// Database path
const DB_PATH = path.join(__dirname, '../database/autoreact.json');

// Default settings
const defaultSettings = {
    enabled: false,
    enabledChats: [],
    mode: 'random', // random, sequential, sentiment, keyword, command, mixed
    reactMode: 'all', // all, bot, mentions, images, videos, links
    emojis: ['❤️', '🔥', '👍', '😂', '😊', '🥰', '😍', '🎉', '✨', '🌟', '👌', '🤝', '💯', '⚡', '💫', '⭐'],
    customEmojis: null,
    specific: '❤️',
    sequenceIndex: 0,
    probability: 80, // Percentage chance to react (1-100)
    ignoreBots: true,
    ignoreSelf: true,
    ignoreCommands: false,
    ignoreGroups: false,
    ignorePrivate: false,
    cooldown: 2000, // ms between reactions per chat
    maxReactionsPerMinute: 20,
    sentimentThreshold: 0.5, // For sentiment analysis
    keywordMap: {
        'love': '❤️',
        'like': '👍',
        'hate': '👎',
        'funny': '😂',
        'sad': '😢',
        'angry': '😠',
        'cool': '😎',
        'wow': '😮',
        'fire': '🔥',
        'good': '✅',
        'bad': '❌',
        'question': '❓',
        'idea': '💡',
        'party': '🎉',
        'congrats': '🎊',
        'thank': '🙏',
        'welcome': '👋',
        'hello': '👋',
        'bye': '👋',
        'morning': '☀️',
        'night': '🌙',
        'food': '🍔',
        'drink': '🥤',
        'music': '🎵',
        'dance': '💃',
        'sport': '⚽',
        'game': '🎮'
    },
    stats: {
        totalReactions: 0,
        reactionsByEmoji: {},
        lastReaction: null
    }
};

// Cooldown tracking
const reactionCooldown = new Map();
const reactionRateLimit = new Map();

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
        console.error('Error loading autoreact settings:', error);
        return { ...defaultSettings };
    }
};

// Save settings
const saveSettings = (settings) => {
    try {
        fs.writeFileSync(DB_PATH, JSON.stringify(settings, null, 2));
        return true;
    } catch (error) {
        console.error('Error saving autoreact settings:', error);
        return false;
    }
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

// Get emoji based on sentiment (simplified)
const getSentimentEmoji = (text) => {
    const positiveWords = ['love', 'like', 'good', 'great', 'awesome', 'amazing', 'wonderful', 'fantastic', 'excellent', 'happy', 'joy', 'glad', 'best', 'perfect', 'nice', 'cool', 'thanks', 'thank'];
    const negativeWords = ['hate', 'bad', 'terrible', 'awful', 'worst', 'sad', 'angry', 'mad', 'upset', 'dislike', 'horrible', 'cry', 'depressed', 'hurt', 'pain'];
    const excitementWords = ['wow', 'omg', 'oh', 'crazy', 'insane', 'unbelievable', 'amazing', 'epic', 'legendary', 'fire', 'lit'];
    
    const lowerText = text.toLowerCase();
    
    let score = 0;
    positiveWords.forEach(word => {
        if (lowerText.includes(word)) score += 1;
    });
    negativeWords.forEach(word => {
        if (lowerText.includes(word)) score -= 1;
    });
    
    excitementWords.forEach(word => {
        if (lowerText.includes(word)) score += 0.5;
    });
    
    if (score > 2) return '🎉';
    if (score > 1) return '❤️';
    if (score > 0) return '👍';
    if (score < -1) return '😢';
    if (score < 0) return '👎';
    
    // Check for questions
    if (text.includes('?')) return '❓';
    
    return null;
};

// Get emoji based on keywords
const getKeywordEmoji = (text, keywordMap) => {
    const lowerText = text.toLowerCase();
    
    for (const [keyword, emoji] of Object.entries(keywordMap)) {
        if (lowerText.includes(keyword)) {
            return emoji;
        }
    }
    return null;
};

// Get emoji based on message type
const getMessageTypeEmoji = (msg) => {
    if (msg.imageMessage) return '📸';
    if (msg.videoMessage) return '🎥';
    if (msg.audioMessage) return '🎵';
    if (msg.stickerMessage) return '🎨';
    if (msg.documentMessage) return '📄';
    if (msg.locationMessage) return '📍';
    if (msg.contactMessage) return '👤';
    return null;
};

// Check rate limit
const checkRateLimit = (chatId, settings) => {
    const now = Date.now();
    const minute = Math.floor(now / 60000);
    const key = `${chatId}_${minute}`;
    
    const count = reactionRateLimit.get(key) || 0;
    if (count >= settings.maxReactionsPerMinute) {
        return false;
    }
    
    reactionRateLimit.set(key, count + 1);
    
    // Clean up old entries
    setTimeout(() => {
        reactionRateLimit.delete(key);
    }, 60000);
    
    return true;
};

// Check cooldown
const checkCooldown = (chatId, settings) => {
    const now = Date.now();
    const lastReact = reactionCooldown.get(chatId) || 0;
    
    if (now - lastReact < settings.cooldown) {
        return false;
    }
    
    reactionCooldown.set(chatId, now);
    return true;
};

// Handle auto react
const handleAutoReact = async (sock, msg) => {
    try {
        const chatId = msg.key.remoteJid;
        const sender = msg.key.participant || chatId;
        const botJid = sock.user.id.split(':')[0] + '@s.whatsapp.net';
        
        // Ignore system messages
        if (!msg.message || msg.key.fromMe) return;
        
        // Ignore system JIDs
        if (chatId.includes('@broadcast') || 
            chatId.includes('status.broadcast') || 
            chatId.includes('@newsletter')) return;
        
        const isGroup = chatId.endsWith('@g.us');
        
        // Load settings
        const settings = loadSettings();
        
        // Check if enabled
        if (!settings.enabled) return;
        
        // Check if enabled for this chat
        if (!settings.enabledChats || !settings.enabledChats.includes(chatId)) return;
        
        // Check group/private settings
        if (isGroup && settings.ignoreGroups) return;
        if (!isGroup && settings.ignorePrivate) return;
        
        // Check ignore settings
        if (settings.ignoreSelf && sender === botJid) return;
        if (settings.ignoreBots && sender.includes('bot')) return; // Simple bot detection
        
        // Check probability
        if (Math.random() * 100 > settings.probability) return;
        
        // Check rate limits
        if (!checkRateLimit(chatId, settings)) return;
        if (!checkCooldown(chatId, settings)) return;
        
        // Get message content
        const messageContent = msg.message;
        const text = messageContent.conversation || 
                    messageContent.extendedTextMessage?.text ||
                    messageContent.imageMessage?.caption ||
                    messageContent.videoMessage?.caption ||
                    '';
        
        // Check react mode
        if (settings.reactMode === 'bot' && !text.startsWith('.')) return;
        if (settings.reactMode === 'mentions' && !text.includes('@')) return;
        if (settings.reactMode === 'images' && !messageContent.imageMessage) return;
        if (settings.reactMode === 'videos' && !messageContent.videoMessage) return;
        if (settings.reactMode === 'links' && !text.match(/https?:\/\/[^\s]+/g)) return;
        
        // Check ignore commands
        if (settings.ignoreCommands && text.startsWith('.')) return;
        
        // Determine which emoji to use
        let emoji = null;
        
        // Try based on mode
        switch (settings.mode) {
            case 'random':
                emoji = getRandomEmoji(settings);
                break;
                
            case 'sequential':
                emoji = getSequentialEmoji(settings);
                break;
                
            case 'sentiment':
                emoji = getSentimentEmoji(text);
                break;
                
            case 'keyword':
                emoji = getKeywordEmoji(text, settings.keywordMap);
                break;
                
            case 'mixed':
                // Try different methods in order
                emoji = getMessageTypeEmoji(messageContent) ||
                       getKeywordEmoji(text, settings.keywordMap) ||
                       getSentimentEmoji(text) ||
                       getRandomEmoji(settings);
                break;
                
            case 'command':
                if (text.startsWith('.')) {
                    emoji = '⚡';
                }
                break;
                
            default:
                emoji = getRandomEmoji(settings);
        }
        
        // Fallback to specific or random
        if (!emoji) {
            if (settings.mode === 'specific') {
                emoji = settings.specific;
            } else {
                emoji = getRandomEmoji(settings);
            }
        }
        
        // Send the reaction
        await sock.sendMessage(chatId, {
            react: { text: emoji, key: msg.key }
        });
        
        // Update stats
        settings.stats.totalReactions++;
        settings.stats.reactionsByEmoji[emoji] = (settings.stats.reactionsByEmoji[emoji] || 0) + 1;
        settings.stats.lastReaction = {
            emoji,
            chatId,
            timestamp: Date.now()
        };
        saveSettings(settings);
        
        console.log(`[AutoReact] ✅ Reacted with ${emoji} in ${chatId}`);
        
    } catch (error) {
        console.error('[AutoReact] ❌ Handler error:', error);
    }
};

// Command execute
async function execute(sock, msg, args, extra) {
    try {
        const chatId = extra.from;
        const isGroup = extra.isGroup;
        const settings = loadSettings();
        
        // Check if enabled for this chat
        const isEnabled = settings.enabled && settings.enabledChats?.includes(chatId);
        
        if (!args[0]) {
            const emojiCount = (settings.customEmojis || settings.emojis).length;
            
            return extra.reply(`╔══════════════════════╗
║  🤖 *AUTOREACT - SMART*  🤖 ║
╚══════════════════════╝

📊 *Status:* ${isEnabled ? '✅ Enabled' : '❌ Disabled'}
📍 *Chat:* ${isGroup ? '👥 Group' : '👤 Private'}
🎮 *Mode:* ${settings.mode}
🎯 *React Mode:* ${settings.reactMode}
🎨 *Emojis:* ${emojiCount} available
⚡ *Probability:* ${settings.probability}%
⏱️ *Cooldown:* ${settings.cooldown / 1000}s
📊 *Rate Limit:* ${settings.maxReactionsPerMinute}/min

━━━━━━━━━━━━━━━━━━━
📊 *STATISTICS*
━━━━━━━━━━━━━━━━━━━
📈 Total Reactions: ${settings.stats.totalReactions}
⏱️ Last Reaction: ${settings.stats.lastReaction ? new Date(settings.stats.lastReaction.timestamp).toLocaleTimeString() : 'Never'}

━━━━━━━━━━━━━━━━━━━
📋 *Commands:*
• .ar on - Enable for this chat
• .ar off - Disable for this chat
• .ar mode <mode> - Set reaction mode
• .ar reactmode <mode> - Set trigger mode
• .ar set probability <1-100>
• .ar set cooldown <seconds>
• .ar set limit <number>
• .ar emojis list - Show emojis
• .ar emojis add ❤️🔥 - Add emojis
• .ar emojis remove ❤️ - Remove emojis
• .ar emojis reset - Reset to default
• .ar keywords list - Show keywords
• .ar keyword add <word> <emoji>
• .ar keyword remove <word>
• .ar stats - Show detailed stats
• .ar reset - Reset statistics

━━━━━━━━━━━━━━━━━━━
🎮 *Modes:*
• random - Random emojis
• sequential - Cycle through emojis
• sentiment - Based on message feeling
• keyword - Based on keywords
• mixed - Smart combination
• specific - One specific emoji
• command - React to commands only

━━━━━━━━━━━━━━━━━━━
🎯 *React Modes:*
• all - All messages
• bot - Commands only
• mentions - Messages with @
• images - Images only
• videos - Videos only
• links - Links only

> *ᴘᴏᴡᴇʀᴇᴅ ʙʏ ZUKO-MD*`);
        }
        
        const opt = args[0].toLowerCase();
        
        // Handle on/off
        if (opt === 'on') {
            settings.enabled = true;
            settings.enabledChats = settings.enabledChats || [];
            if (!settings.enabledChats.includes(chatId)) {
                settings.enabledChats.push(chatId);
            }
            saveSettings(settings);
            return extra.reply(`✅ *AutoReact enabled for this chat!*\n\nMode: ${settings.mode}\nProbability: ${settings.probability}%`);
        }
        
        if (opt === 'off') {
            settings.enabledChats = (settings.enabledChats || []).filter(id => id !== chatId);
            settings.enabled = settings.enabledChats.length > 0;
            saveSettings(settings);
            return extra.reply(`❌ *AutoReact disabled for this chat!*`);
        }
        
        // Handle mode
        if (opt === 'mode') {
            const mode = args[1]?.toLowerCase();
            const validModes = ['random', 'sequential', 'sentiment', 'keyword', 'mixed', 'specific', 'command'];
            
            if (!mode || !validModes.includes(mode)) {
                return extra.reply(`❌ *Invalid mode!*\n\nAvailable: ${validModes.join(', ')}`);
            }
            
            if (mode === 'specific') {
                const specificEmoji = args[2];
                if (!specificEmoji) {
                    return extra.reply('❌ *Please provide an emoji!*\n\nExample: .ar mode specific ❤️');
                }
                settings.mode = 'specific';
                settings.specific = specificEmoji;
                saveSettings(settings);
                return extra.reply(`✅ *Mode set to specific: ${specificEmoji}*`);
            }
            
            settings.mode = mode;
            saveSettings(settings);
            return extra.reply(`✅ *Mode set to ${mode}!*`);
        }
        
        // Handle react mode
        if (opt === 'reactmode') {
            const reactMode = args[1]?.toLowerCase();
            const validModes = ['all', 'bot', 'mentions', 'images', 'videos', 'links'];
            
            if (!reactMode || !validModes.includes(reactMode)) {
                return extra.reply(`❌ *Invalid react mode!*\n\nAvailable: ${validModes.join(', ')}`);
            }
            
            settings.reactMode = reactMode;
            saveSettings(settings);
            return extra.reply(`✅ *React mode set to ${reactMode}!*`);
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
            
            if (subCmd === 'cooldown') {
                const seconds = parseInt(args[2]);
                if (!seconds || seconds < 0 || seconds > 30) {
                    return extra.reply('❌ *Invalid cooldown!*\n\nPlease provide a value between 0 and 30 seconds.');
                }
                settings.cooldown = seconds * 1000;
                saveSettings(settings);
                return extra.reply(`✅ *Cooldown set to ${seconds} seconds!*`);
            }
            
            if (subCmd === 'limit') {
                const limit = parseInt(args[2]);
                if (!limit || limit < 1 || limit > 100) {
                    return extra.reply('❌ *Invalid limit!*\n\nPlease provide a value between 1 and 100.');
                }
                settings.maxReactionsPerMinute = limit;
                saveSettings(settings);
                return extra.reply(`✅ *Rate limit set to ${limit} per minute!*`);
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
        
        // Handle keywords
        if (opt === 'keywords' || opt === 'keyword') {
            const subCmd = args[1]?.toLowerCase();
            
            if (subCmd === 'list') {
                const keywords = Object.entries(settings.keywordMap)
                    .map(([word, emoji], i) => `${i+1}. ${word} → ${emoji}`)
                    .join('\n');
                return extra.reply(`📋 *KEYWORD MAPPINGS*\n\n${keywords}\n\nTotal: ${Object.keys(settings.keywordMap).length}`);
            }
            
            if (subCmd === 'add') {
                const word = args[2]?.toLowerCase();
                const emoji = args[3];
                
                if (!word || !emoji) {
                    return extra.reply('❌ *Please provide a word and emoji!*\n\nExample: .ar keyword add love ❤️');
                }
                
                settings.keywordMap[word] = emoji;
                saveSettings(settings);
                return extra.reply(`✅ *Added keyword mapping: ${word} → ${emoji}*`);
            }
            
            if (subCmd === 'remove') {
                const word = args[2]?.toLowerCase();
                
                if (!word) {
                    return extra.reply('❌ *Please provide a word to remove!*\n\nExample: .ar keyword remove love');
                }
                
                if (settings.keywordMap[word]) {
                    delete settings.keywordMap[word];
                    saveSettings(settings);
                    return extra.reply(`✅ *Removed keyword: ${word}*`);
                } else {
                    return extra.reply(`❌ *Keyword '${word}' not found!*`);
                }
            }
        }
        
        // Handle stats
        if (opt === 'stats') {
            const topEmojis = Object.entries(settings.stats.reactionsByEmoji)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5)
                .map(([emoji, count], i) => `${i+1}. ${emoji} - ${count} times`)
                .join('\n');
            
            return extra.reply(`📊 *AUTOREACT STATISTICS*\n\n` +
                `📈 Total Reactions: ${settings.stats.totalReactions}\n` +
                `🎯 Most Used:\n${topEmojis || 'None yet'}\n\n` +
                `⏱️ Last Reaction: ${settings.stats.lastReaction ? new Date(settings.stats.lastReaction.timestamp).toLocaleString() : 'Never'}`);
        }
        
        // Handle reset
        if (opt === 'reset') {
            if (args[1] === 'confirm') {
                settings.stats = {
                    totalReactions: 0,
                    reactionsByEmoji: {},
                    lastReaction: null
                };
                saveSettings(settings);
                return extra.reply('✅ *Statistics reset!*');
            }
            return extra.reply('⚠️ *Use .ar reset confirm to reset statistics*');
        }
        
        extra.reply('❌ *Invalid option.* Use .ar for help.');
        
    } catch (error) {
        console.error('[AutoReact] Command error:', error);
        extra.reply(`❌ Error: ${error.message}`);
    }
}

// Export
module.exports = {
    name: 'autoreact',
    aliases: ['ar', 'react', 'autoreaction'],
    category: 'fun',
    description: 'Automatically react to messages with emojis',
    usage: '.ar <on/off/mode/emojis/keywords/stats>',
    ownerOnly: true,
    
    async execute(sock, msg, args, extra) {
        return execute(sock, msg, args, extra);
    },
    
    handleAutoReact
};