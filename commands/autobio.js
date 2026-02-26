/**
 * AutoBio Command - Automatically update bot profile status/bio
 */

const fs = require('fs');
const path = require('path');
const moment = require('moment-timezone');

// Database path
const DB_PATH = path.join(__dirname, '../database/autobio.json');

// Default settings
const defaultSettings = {
    enabled: false,
    interval: 60, // minutes
    timezone: 'UTC',
    style: 'default', // default, time, date, uptime, rotating, custom, quote, fact, weather, random
    customText: '🤖 𝑂𝑃𝑇𝐼𝑀𝑈𝑆 𝑃𝑅𝐼𝑀𝐸 Bot | Online 24/7',
    rotatingMessages: [
        '🤖 𝑂𝑃𝑇𝐼𝑀𝑈𝑆 𝑃𝑅𝐼𝑀𝐸 Bot - Always Active',
        '⚡ Powered by 𝑂𝑃𝑇𝐼𝑀𝑈𝑆 𝑃𝑅𝐼𝑀𝐸',
        '🌟 Multi-Command WhatsApp Bot',
        '📱 24/7 Online',
        '🎮 Type .menu for commands',
        '🔥 Best WhatsApp Bot Ever',
        '💫 Created by ZUKO',
        '🚀 Fast & Reliable',
        '✨ Making WhatsApp Better',
        '🌈 Spread Love & Joy'
    ],
    quotes: [
        'The best way to predict the future is to create it.',
        'Success is not final, failure is not fatal.',
        'Dream big. Start small. Act now.',
        'Stay positive, work hard, make it happen.',
        'Every moment is a fresh beginning.',
        'Believe you can and you\'re halfway there.',
        'Make today so awesome that yesterday gets jealous.',
        'Your only limit is your mind.',
        'Do something today that your future self will thank you for.',
        'Small steps every day lead to big results.'
    ],
    facts: [
        'Honey never spoils.',
        'A day on Venus is longer than a year on Venus.',
        'Octopuses have three hearts.',
        'Bananas are berries, but strawberries aren\'t.',
        'There are more stars than grains of sand on Earth.',
        'A group of flamingos is called a "flamboyance".',
        'The Eiffel Tower can be 15 cm taller during summer.',
        'Cows have best friends.',
        'Your brain is constantly eating itself.',
        'The universe is about 13.8 billion years old.'
    ],
    includeEmoji: true,
    includeUptime: true,
    includeTime: true,
    includeDate: true,
    lastUpdate: 0,
    lastMessage: '',
    stats: {
        totalUpdates: 0,
        lastStyle: 'default',
        lastUpdateTime: null
    }
};

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
        console.error('Error loading autobio settings:', error);
        return { ...defaultSettings };
    }
};

// Save settings
const saveSettings = (settings) => {
    try {
        fs.writeFileSync(DB_PATH, JSON.stringify(settings, null, 2));
        return true;
    } catch (error) {
        console.error('Error saving autobio settings:', error);
        return false;
    }
};

// Format uptime
const formatUptime = (seconds) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);
    
    return parts.join(' ');
};

// Get current time in specified timezone
const getCurrentTime = (timezone) => {
    return moment().tz(timezone).format('hh:mm:ss A');
};

// Get current date in specified timezone
const getCurrentDate = (timezone) => {
    return moment().tz(timezone).format('dddd, MMMM Do YYYY');
};

// Get random item from array
const getRandomItem = (array) => {
    return array[Math.floor(Math.random() * array.length)];
};

// Generate bio based on style
const generateBio = (settings) => {
    const uptime = process.uptime();
    const uptimeStr = formatUptime(uptime);
    const timeStr = getCurrentTime(settings.timezone);
    const dateStr = getCurrentDate(settings.timezone);
    
    let bio = '';
    let style = settings.style;
    
    // If random style, pick one randomly
    if (style === 'random') {
        const styles = ['default', 'time', 'date', 'uptime', 'rotating', 'custom', 'quote', 'fact'];
        style = getRandomItem(styles);
    }
    
    switch (style) {
        case 'time':
            bio = `🕐 ${timeStr}`;
            if (settings.includeDate) bio += ` | ${dateStr}`;
            break;
            
        case 'date':
            bio = `📅 ${dateStr}`;
            if (settings.includeTime) bio += ` | ${timeStr}`;
            break;
            
        case 'uptime':
            bio = `⏱️ Uptime: ${uptimeStr}`;
            if (settings.includeTime) bio += ` | ${timeStr}`;
            if (settings.includeDate) bio += ` | ${dateStr}`;
            break;
            
        case 'rotating':
            const currentIndex = settings.rotatingIndex || 0;
            bio = settings.rotatingMessages[currentIndex % settings.rotatingMessages.length];
            settings.rotatingIndex = (currentIndex + 1) % settings.rotatingMessages.length;
            break;
            
        case 'custom':
            bio = settings.customText;
            break;
            
        case 'quote':
            bio = `💭 "${getRandomItem(settings.quotes)}"`;
            break;
            
        case 'fact':
            bio = `💡 ${getRandomItem(settings.facts)}`;
            break;
            
        case 'default':
        default:
            bio = `🤖 𝑂𝑃𝑇𝐼𝑀𝑈𝑆 𝑃𝑅𝐼𝑀𝐸 Bot`;
            if (settings.includeUptime) bio += ` | ⏱️ ${uptimeStr}`;
            if (settings.includeTime) bio += ` | 🕐 ${timeStr}`;
            if (settings.includeDate) bio += ` | 📅 ${dateStr}`;
            break;
    }
    
    // Add emoji if enabled and not already present
    if (settings.includeEmoji && !bio.includes('🤖') && !bio.includes('⚡') && !bio.includes('🌟')) {
        const emojis = ['🤖', '⚡', '🌟', '🔥', '💫', '✨', '🚀', '💎'];
        bio = `${getRandomItem(emojis)} ${bio}`;
    }
    
    return bio.trim();
};

// Update bio function
const updateBio = async (sock, settings) => {
    try {
        if (!settings.enabled) return false;
        
        const now = Date.now();
        const minutesSinceLastUpdate = (now - settings.lastUpdate) / (60 * 1000);
        
        if (settings.lastUpdate > 0 && minutesSinceLastUpdate < settings.interval) {
            return false; // Not time to update yet
        }
        
        const newBio = generateBio(settings);
        
        // Don't update if it's the same as last message
        if (newBio === settings.lastMessage) {
            return false;
        }
        
        // Update WhatsApp profile status
        await sock.updateProfileStatus(newBio);
        
        // Update tracking
        settings.lastUpdate = now;
        settings.lastMessage = newBio;
        settings.stats.totalUpdates++;
        settings.stats.lastStyle = settings.style;
        settings.stats.lastUpdateTime = now;
        
        saveSettings(settings);
        
        console.log(`[AutoBio] ✅ Updated to: ${newBio}`);
        return true;
        
    } catch (error) {
        console.error('[AutoBio] ❌ Update error:', error);
        return false;
    }
};

// Start autobio interval
let bioInterval = null;

const startAutoBio = (sock, settings) => {
    if (bioInterval) {
        clearInterval(bioInterval);
        bioInterval = null;
    }
    
    if (settings.enabled) {
        // Update immediately
        updateBio(sock, settings);
        
        // Then set interval
        bioInterval = setInterval(() => {
            updateBio(sock, settings);
        }, settings.interval * 60 * 1000);
        
        console.log(`[AutoBio] ✅ Started - Interval: ${settings.interval} minutes, Style: ${settings.style}`);
    }
};

const stopAutoBio = () => {
    if (bioInterval) {
        clearInterval(bioInterval);
        bioInterval = null;
        console.log('[AutoBio] ⏸️ Stopped');
    }
};

// Restore autobio on startup
const restoreAutoBio = (sock) => {
    const settings = loadSettings();
    if (settings.enabled) {
        startAutoBio(sock, settings);
    }
};

// Command execute
async function execute(sock, msg, args, extra) {
    try {
        const settings = loadSettings();
        const isEnabled = settings.enabled;
        
        if (!args[0]) {
            const nextUpdate = settings.lastUpdate + (settings.interval * 60 * 1000);
            const timeUntilNext = Math.max(0, nextUpdate - Date.now());
            const minutesUntil = Math.floor(timeUntilNext / 60000);
            const secondsUntil = Math.floor((timeUntilNext % 60000) / 1000);
            
            return extra.reply(`╔══════════════════════╗
║  🤖 *AUTOBIO - STATUS*  🤖 ║
╚══════════════════════╝

📊 *Status:* ${isEnabled ? '✅ Enabled' : '❌ Disabled'}
⏱️ *Interval:* ${settings.interval} minutes
🎨 *Style:* ${settings.style}
🌍 *Timezone:* ${settings.timezone}
📝 *Current:* ${settings.lastMessage || 'Not set yet'}

━━━━━━━━━━━━━━━━━━━
⏰ *Next Update:* ${minutesUntil}m ${secondsUntil}s

━━━━━━━━━━━━━━━━━━━
📊 *STATISTICS*
━━━━━━━━━━━━━━━━━━━
📈 Total Updates: ${settings.stats.totalUpdates}
🎨 Last Style: ${settings.stats.lastStyle}
⏱️ Last Update: ${settings.stats.lastUpdateTime ? new Date(settings.stats.lastUpdateTime).toLocaleString() : 'Never'}

━━━━━━━━━━━━━━━━━━━
📋 *Commands:*
• .autobio on - Enable autobio
• .autobio off - Disable autobio
• .autobio set interval <minutes>
• .autobio set style <style>
• .autobio set timezone <zone>
• .autobio set custom <text>
• .autobio set messages <msg1,msg2>
• .autobio toggle emoji on/off
• .autobio toggle uptime on/off
• .autobio toggle time on/off
• .autobio toggle date on/off
• .autobio test - Preview next bio
• .autobio now - Update now
• .autobio list - Show all styles

━━━━━━━━━━━━━━━━━━━
🎨 *Available Styles:*
• default - Bot name + uptime + time + date
• time - Current time only
• date - Current date only
• uptime - Bot uptime only
• rotating - Rotating messages
• custom - Custom text
• quote - Random quotes
• fact - Random facts
• random - Random style each time

💡 *Examples:*
• .autobio set interval 30
• .autobio set style rotating
• .autobio set custom 🚀 My Bot

> *ᴘᴏᴡᴇʀᴇᴅ ʙʏ 𝑂𝑃𝑇𝐼𝑀𝑈𝑆 𝑃𝑅𝐼𝑀𝐸*`);
        }
        
        const opt = args[0].toLowerCase();
        
        // Handle on/off
        if (opt === 'on') {
            settings.enabled = true;
            saveSettings(settings);
            startAutoBio(sock, settings);
            return extra.reply(`✅ *AutoBio enabled!*\n\n⏱️ Interval: ${settings.interval} minutes\n🎨 Style: ${settings.style}\n\nBio will update automatically.`);
        }
        
        if (opt === 'off') {
            settings.enabled = false;
            saveSettings(settings);
            stopAutoBio();
            return extra.reply('❌ *AutoBio disabled!*');
        }
        
        // Handle list
        if (opt === 'list') {
            return extra.reply(`🎨 *AVAILABLE STYLES*\n\n` +
                `• default - Bot info + uptime + time + date\n` +
                `• time - Current time only\n` +
                `• date - Current date only\n` +
                `• uptime - Bot uptime only\n` +
                `• rotating - Rotating messages\n` +
                `• custom - Your custom text\n` +
                `• quote - Random inspirational quotes\n` +
                `• fact - Random interesting facts\n` +
                `• random - Random style each update\n\n` +
                `💡 Use: .autobio set style <name>`);
        }
        
        // Handle test
        if (opt === 'test') {
            const testBio = generateBio(settings);
            return extra.reply(`🧪 *TEST BIO*\n\n${testBio}\n\n*Style:* ${settings.style}`);
        }
        
        // Handle update now
        if (opt === 'now') {
            const updated = await updateBio(sock, settings);
            if (updated) {
                return extra.reply(`✅ *Bio updated!*\n\n📝 New bio: ${settings.lastMessage}`);
            } else {
                return extra.reply('❌ *Failed to update bio.*');
            }
        }
        
        // Handle set commands
        if (opt === 'set') {
            const subCmd = args[1]?.toLowerCase();
            
            if (!subCmd) {
                return extra.reply('❌ *Please specify what to set!*\n\nOptions: interval, style, timezone, custom, messages');
            }
            
            // Set interval
            if (subCmd === 'interval') {
                const minutes = parseInt(args[2]);
                if (!minutes || minutes < 1 || minutes > 1440) {
                    return extra.reply('❌ *Invalid interval!*\n\nPlease provide a value between 1 and 1440 minutes (24 hours).');
                }
                
                settings.interval = minutes;
                saveSettings(settings);
                
                if (settings.enabled) {
                    startAutoBio(sock, settings);
                }
                
                return extra.reply(`✅ *Interval set to ${minutes} minutes!*`);
            }
            
            // Set style
            if (subCmd === 'style') {
                const style = args[2]?.toLowerCase();
                const validStyles = ['default', 'time', 'date', 'uptime', 'rotating', 'custom', 'quote', 'fact', 'random'];
                
                if (!style || !validStyles.includes(style)) {
                    return extra.reply(`❌ *Invalid style!*\n\nAvailable: ${validStyles.join(', ')}`);
                }
                
                settings.style = style;
                saveSettings(settings);
                
                // Update bio immediately
                if (settings.enabled) {
                    await updateBio(sock, settings);
                }
                
                return extra.reply(`✅ *Style set to ${style}!*`);
            }
            
            // Set timezone
            if (subCmd === 'timezone') {
                const timezone = args.slice(2).join(' ').trim();
                if (!timezone || !moment.tz.zone(timezone)) {
                    return extra.reply(`❌ *Invalid timezone!*\n\nUse a valid timezone like: UTC, America/New_York, Europe/London, Asia/Tokyo`);
                }
                
                settings.timezone = timezone;
                saveSettings(settings);
                return extra.reply(`✅ *Timezone set to ${timezone}!*`);
            }
            
            // Set custom text
            if (subCmd === 'custom') {
                const customText = args.slice(2).join(' ');
                if (!customText) {
                    return extra.reply('❌ *Please provide custom text!*\n\nExample: .autobio set custom 🤖 My Awesome Bot');
                }
                
                settings.customText = customText;
                settings.style = 'custom';
                saveSettings(settings);
                
                return extra.reply(`✅ *Custom text set!*\n\n📝 ${customText}`);
            }
            
            // Set rotating messages
            if (subCmd === 'messages') {
                const messagesText = args.slice(2).join(' ');
                if (!messagesText) {
                    return extra.reply('❌ *Please provide messages separated by commas!*\n\nExample: .autobio set messages Hello,World,Hi');
                }
                
                const messages = messagesText.split(',').map(m => m.trim());
                if (messages.length < 2) {
                    return extra.reply('❌ *Please provide at least 2 messages!*');
                }
                
                settings.rotatingMessages = messages;
                settings.rotatingIndex = 0;
                saveSettings(settings);
                
                return extra.reply(`✅ *${messages.length} rotating messages set!*\n\n${messages.map((m, i) => `${i+1}. ${m}`).join('\n')}`);
            }
        }
        
        // Handle toggle commands
        if (opt === 'toggle') {
            const subCmd = args[1]?.toLowerCase();
            const value = args[2]?.toLowerCase();
            
            if (subCmd === 'emoji') {
                if (value === 'on') {
                    settings.includeEmoji = true;
                    saveSettings(settings);
                    return extra.reply('✅ *Emojis enabled in bio*');
                } else if (value === 'off') {
                    settings.includeEmoji = false;
                    saveSettings(settings);
                    return extra.reply('❌ *Emojis disabled in bio*');
                }
            }
            
            if (subCmd === 'uptime') {
                if (value === 'on') {
                    settings.includeUptime = true;
                    saveSettings(settings);
                    return extra.reply('✅ *Uptime shown in bio*');
                } else if (value === 'off') {
                    settings.includeUptime = false;
                    saveSettings(settings);
                    return extra.reply('❌ *Uptime hidden in bio*');
                }
            }
            
            if (subCmd === 'time') {
                if (value === 'on') {
                    settings.includeTime = true;
                    saveSettings(settings);
                    return extra.reply('✅ *Time shown in bio*');
                } else if (value === 'off') {
                    settings.includeTime = false;
                    saveSettings(settings);
                    return extra.reply('❌ *Time hidden in bio*');
                }
            }
            
            if (subCmd === 'date') {
                if (value === 'on') {
                    settings.includeDate = true;
                    saveSettings(settings);
                    return extra.reply('✅ *Date shown in bio*');
                } else if (value === 'off') {
                    settings.includeDate = false;
                    saveSettings(settings);
                    return extra.reply('❌ *Date hidden in bio*');
                }
            }
        }
        
        extra.reply('❌ *Invalid option.* Use .autobio for help.');
        
    } catch (error) {
        console.error('[AutoBio] Command error:', error);
        extra.reply(`❌ Error: ${error.message}`);
    }
}

// Export
module.exports = {
    name: 'autobio',
    aliases: ['ab', 'autostatus', 'bio', 'statusauto'],
    category: 'owner',
    description: 'Automatically update bot profile status/bio',
    usage: '.autobio <on/off/set/toggle/test/now>',
    ownerOnly: true,
    
    async execute(sock, msg, args, extra) {
        return execute(sock, msg, args, extra);
    },
    
    startAutoBio,
    stopAutoBio,
    restoreAutoBio,
    updateBio
};