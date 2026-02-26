/**
 * OpenTime Command - Open group for a specific duration then auto-close
 */

const fs = require('fs');
const path = require('path');

// Store active timers for groups
const activeTimers = new Map();

// Database path for persistent storage
const DB_PATH = path.join(__dirname, '../database/opentime.json');

// Load scheduled openings
const loadScheduled = () => {
  try {
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    if (fs.existsSync(DB_PATH)) {
      const data = fs.readFileSync(DB_PATH, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error loading opentime settings:', error);
  }
  return {};
};

// Save scheduled openings
const saveScheduled = (scheduled) => {
  try {
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(DB_PATH, JSON.stringify(scheduled, null, 2));
    return true;
  } catch (error) {
    console.error('Error saving opentime settings:', error);
    return false;
  }
};

// Load scheduled openings on startup
let scheduledOpenings = loadScheduled();

// Format time duration
const formatDuration = (ms) => {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) return `${days} day${days > 1 ? 's' : ''}`;
  if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''}`;
  if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''}`;
  return `${seconds} second${seconds > 1 ? 's' : ''}`;
};

// Format time
const formatTime = (timestamp) => {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit',
    second: '2-digit',
    hour12: true 
  });
};

module.exports = {
    name: 'opentime',
    aliases: ['openfor', 'tempopen', 'scheduleopen'],
    description: 'Open group for a specific duration then auto-close',
    usage: '.opentime <duration> or .opentime stop',
    groupOnly: true,
    adminOnly: true,
    botAdminNeeded: true,
    
    async execute(sock, msg, args, extra) {
        try {
            const chatId = extra.from;
            const isGroup = extra.isGroup;
            const isAdmin = extra.isAdmin;
            const isOwner = extra.isOwner;
            const groupMetadata = extra.groupMetadata;
            
            if (!isGroup) {
                return extra.reply('❌ *This command can only be used in groups!*');
            }
            
            // Check if user is admin
            if (!isAdmin && !isOwner) {
                return extra.reply('❌ *Only group admins can use this command!*');
            }
            
            // Check if bot is admin
            const botIsAdmin = extra.isBotAdmin;
            if (!botIsAdmin) {
                return extra.reply('❌ *I need to be an admin to open/close the group!*');
            }
            
            // Check current group settings
            const isMuted = groupMetadata.announce === true;
            const currentStatus = isMuted ? '🔒 *Closed* (only admins can send)' : '🔓 *Open* (everyone can send)';
            
            // No arguments - show current status and active timers
            if (!args[0]) {
                const activeTimer = activeTimers.get(chatId);
                let timerInfo = '';
                
                if (activeTimer) {
                    const timeLeft = activeTimer.endTime - Date.now();
                    if (timeLeft > 0) {
                        timerInfo = `\n⏱️ *Auto-close in:* ${formatDuration(timeLeft)}\n   at ${formatTime(activeTimer.endTime)}`;
                    }
                }
                
                // Check if there's a scheduled opening
                const scheduled = scheduledOpenings[chatId];
                let scheduledInfo = '';
                if (scheduled && scheduled.endTime > Date.now()) {
                    const timeLeft = scheduled.endTime - Date.now();
                    scheduledInfo = `\n📅 *Scheduled:* Group will close in ${formatDuration(timeLeft)}`;
                }
                
                return extra.reply(`╔══════════════════════╗
║  ⏰ *OPEN TIME*  ⏰    ║
╚══════════════════════╝

📊 *Current Status:* ${currentStatus}
${timerInfo}${scheduledInfo}

━━━━━━━━━━━━━━━━━━━
📋 *Usage:*
• .opentime <duration> - Open group for a specific time
• .opentime stop - Cancel auto-close timer
• .opentime status - Show current status

💡 *Duration formats:*
• 30s - 30 seconds
• 5m - 5 minutes
• 2h - 2 hours
• 1d - 1 day
• 30m 30 minutes

📌 *Examples:*
• .opentime 30m - Open for 30 minutes
• .opentime 2h - Open for 2 hours
• .opentime 1d - Open for 1 day
• .opentime 5m 30s - Open for 5 minutes 30 seconds

> *ᴘᴏᴡᴇʀᴇᴅ ʙʏ 𝑂𝑃𝑇𝐼𝑀𝑈𝑆 𝑃𝑅𝐼𝑀𝐸*`);
            }
            
            const command = args[0].toLowerCase();
            
            // Handle stop command
            if (command === 'stop' || command === 'cancel') {
                if (activeTimers.has(chatId)) {
                    clearTimeout(activeTimers.get(chatId).timer);
                    activeTimers.delete(chatId);
                    
                    // Remove from scheduled
                    delete scheduledOpenings[chatId];
                    saveScheduled(scheduledOpenings);
                    
                    return extra.reply('✅ *Auto-close timer cancelled!*\n\nGroup will remain in its current state.');
                } else {
                    return extra.reply('❌ *No active timer to cancel!*');
                }
            }
            
            // Handle status command
            if (command === 'status') {
                const activeTimer = activeTimers.get(chatId);
                let timerInfo = '';
                
                if (activeTimer) {
                    const timeLeft = activeTimer.endTime - Date.now();
                    if (timeLeft > 0) {
                        timerInfo = `\n⏱️ *Auto-close in:* ${formatDuration(timeLeft)}\n   at ${formatTime(activeTimer.endTime)}`;
                    } else {
                        timerInfo = '\n⏱️ *Timer expired*';
                    }
                } else {
                    timerInfo = '\n⏱️ *No active timer*';
                }
                
                return extra.reply(`📊 *GROUP STATUS*\n\n${currentStatus}${timerInfo}`);
            }
            
            // Parse duration from arguments
            let totalSeconds = 0;
            
            // Parse the duration string (e.g., "30m", "2h", "1d", "5m30s")
            const durationStr = args.join('').toLowerCase();
            
            // Match patterns like 30s, 5m, 2h, 1d
            const matches = durationStr.match(/(\d+)([smhd])/g);
            
            if (!matches) {
                return extra.reply('❌ *Invalid duration format!*\n\nUse formats like: 30s, 5m, 2h, 1d, or combine them: 5m30s');
            }
            
            matches.forEach(match => {
                const value = parseInt(match.match(/\d+/)[0]);
                const unit = match.match(/[smhd]/)[0];
                
                switch(unit) {
                    case 's': totalSeconds += value; break;
                    case 'm': totalSeconds += value * 60; break;
                    case 'h': totalSeconds += value * 3600; break;
                    case 'd': totalSeconds += value * 86400; break;
                }
            });
            
            if (totalSeconds < 10) {
                return extra.reply('❌ *Duration too short!*\n\nMinimum duration is 10 seconds.');
            }
            
            if (totalSeconds > 604800) { // 7 days
                return extra.reply('❌ *Duration too long!*\n\nMaximum duration is 7 days.');
            }
            
            const durationMs = totalSeconds * 1000;
            const endTime = Date.now() + durationMs;
            const formattedDuration = formatDuration(durationMs);
            
            // Send processing message
            const processingMsg = await sock.sendMessage(chatId, {
                text: `⏳ *Opening group for ${formattedDuration}...*`
            });
            
            try {
                // Open the group (allow all members to send)
                await sock.groupSettingUpdate(chatId, 'not_announcement');
                
                // Clear any existing timer for this group
                if (activeTimers.has(chatId)) {
                    clearTimeout(activeTimers.get(chatId).timer);
                }
                
                // Set timer to close the group
                const timer = setTimeout(async () => {
                    try {
                        // Check if group still exists and bot is still admin
                        const currentMetadata = await sock.groupMetadata(chatId).catch(() => null);
                        if (!currentMetadata) return;
                        
                        // Close the group
                        await sock.groupSettingUpdate(chatId, 'announcement');
                        
                        // Notify the group
                        await sock.sendMessage(chatId, {
                            text: `🔒 *Group Closed*\n\nThe ${formattedDuration} opening period has ended.\n\nOnly admins can now send messages.`
                        });
                        
                        // Remove from active timers
                        activeTimers.delete(chatId);
                        delete scheduledOpenings[chatId];
                        saveScheduled(scheduledOpenings);
                        
                    } catch (closeError) {
                        console.error('Failed to auto-close group:', closeError);
                    }
                }, durationMs);
                
                // Store timer info
                activeTimers.set(chatId, {
                    timer,
                    endTime,
                    duration: formattedDuration,
                    openedAt: Date.now()
                });
                
                // Store in persistent storage
                scheduledOpenings[chatId] = {
                    endTime,
                    duration: formattedDuration,
                    openedAt: Date.now()
                };
                saveScheduled(scheduledOpenings);
                
                // Delete processing message
                await sock.sendMessage(chatId, { delete: processingMsg.key });
                
                // Send success message
                const closeTime = formatTime(endTime);
                
                await sock.sendMessage(chatId, {
                    text: `╔══════════════════════╗
║  🔓 *GROUP OPENED*  🔓  ║
╚══════════════════════╝

📊 *Group has been opened for:*
⏱️ *${formattedDuration}*

⏰ *Opened at:* ${formatTime(Date.now())}
🔒 *Auto-closes at:* ${closeTime}

━━━━━━━━━━━━━━━━━━━
👥 *All members can now send messages*

💡 *The group will automatically close at the specified time.*

📌 *To cancel:*
• Use .opentime stop

> *ᴘᴏᴡᴇʀᴇᴅ ʙʏ 𝑂𝑃𝑇𝐼𝑀𝑈𝑆 𝑃𝑅𝐼𝑀𝐸*`,
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
                
            } catch (error) {
                await sock.sendMessage(chatId, { delete: processingMsg.key });
                throw error;
            }
            
        } catch (error) {
            console.error('OpenTime Error:', error);
            await extra.reply(`❌ *Error:* ${error.message}`);
        }
    }
};