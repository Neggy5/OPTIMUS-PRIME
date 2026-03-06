/**
 * AutoView Command - Automatically view and save status updates
 */

const fs = require('fs');
const path = require('path');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');

// Database path
const DB_PATH = path.join(__dirname, '../database/autoview.json');

// Default settings
const defaultSettings = {
  enabled: false,
  autoView: true,
  autoSave: false,
  autoReply: false,
  saveContacts: true,
  saveMedia: true,
  viewDelay: 2000, // ms between viewing statuses
  ignoredContacts: [],
  allowedContacts: [], // empty = all
  saveLocation: 'status_downloads',
  stats: {
    totalViewed: 0,
    totalSaved: 0,
    lastView: null,
    contactsSeen: []
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
    }
  } catch (error) {
    console.error('Error loading autoview settings:', error);
  }
  return { ...defaultSettings };
};

// Save settings
const saveSettings = (settings) => {
  try {
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(DB_PATH, JSON.stringify(settings, null, 2));
    return true;
  } catch (error) {
    console.error('Error saving autoview settings:', error);
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

// Track processed statuses
const processedStatuses = new Set();

// Handle status updates
async function handleStatusUpdate(sock, status, settings) {
  try {
    const statusId = status.key.id;
    const statusJid = status.key.remoteJid;
    const sender = status.key.participant || statusJid;
    const senderNumber = sender.split('@')[0];
    
    // Check if already processed
    if (processedStatuses.has(statusId)) return;
    processedStatuses.add(statusId);
    
    // Clean up old entries after 1 hour
    setTimeout(() => processedStatuses.delete(statusId), 3600000);
    
    // Check if contact is ignored
    if (settings.ignoredContacts.includes(sender)) return;
    
    // Check if contact is allowed (if allowed list is not empty)
    if (settings.allowedContacts.length > 0 && !settings.allowedContacts.includes(sender)) return;
    
    console.log(`[AutoView] Processing status from ${senderNumber}`);
    
    // Update stats
    settings.stats.totalViewed++;
    settings.stats.lastView = Date.now();
    
    // Add to contacts seen
    if (!settings.stats.contactsSeen.includes(sender)) {
      settings.stats.contactsSeen.push(sender);
    }
    
    saveSettings(settings);
    
    // Auto view the status
    if (settings.autoView) {
      await sock.readMessages([status.key]);
    }
    
    // Auto save status
    if (settings.autoSave) {
      await saveStatusMedia(sock, status, settings, senderNumber);
    }
    
    // Auto reply to status
    if (settings.autoReply) {
      await sock.sendMessage(sender, {
        text: `👋 Thanks for your status update!`
      });
    }
    
  } catch (error) {
    console.error('Error handling status update:', error);
  }
}

// Save status media
async function saveStatusMedia(sock, status, settings, senderNumber) {
  try {
    const content = status.message;
    if (!content) return;
    
    let mediaType = null;
    let mediaMessage = null;
    let fileName = '';
    
    if (content.imageMessage) {
      mediaType = 'image';
      mediaMessage = content.imageMessage;
      fileName = `status_${senderNumber}_${Date.now()}.jpg`;
    } else if (content.videoMessage) {
      mediaType = 'video';
      mediaMessage = content.videoMessage;
      fileName = `status_${senderNumber}_${Date.now()}.mp4`;
    } else if (content.audioMessage) {
      mediaType = 'audio';
      mediaMessage = content.audioMessage;
      fileName = `status_${senderNumber}_${Date.now()}.mp3`;
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
    
    console.log(`[AutoView] Saved ${mediaType} from ${senderNumber}`);
    
  } catch (error) {
    console.error('Error saving status media:', error);
  }
}

// Initialize auto-view listener
const initializeAutoView = (sock) => {
  try {
    const settings = loadSettings();
    
    if (!settings.enabled) return;
    
    // Listen for status updates
    sock.ev.on('messages.upsert', async ({ messages }) => {
      for (const msg of messages) {
        // Check if it's a status update
        if (msg.key && msg.key.remoteJid === 'status@broadcast') {
          await handleStatusUpdate(sock, msg, settings);
        }
      }
    });
    
    console.log('[AutoView] Listener initialized');
    
  } catch (error) {
    console.error('Error initializing AutoView:', error);
  }
};

// Command execute
async function execute(sock, msg, args, extra) {
  try {
    const chatId = extra.from;
    const isOwner = extra.isOwner;
    
    if (!isOwner) {
      return extra.reply('❌ *Only the bot owner can use this command!*');
    }
    
    const settings = loadSettings();
    
    if (!args[0]) {
      const status = settings.enabled ? '✅ Enabled' : '❌ Disabled';
      
      return extra.reply(`╔══════════════════════╗
║  👁️ *AUTO VIEW STATUS*  👁️ ║
╚══════════════════════╝

📊 *Status:* ${status}
👁️ *Auto View:* ${settings.autoView ? '✅' : '❌'}
💾 *Auto Save:* ${settings.autoSave ? '✅' : '❌'}
💬 *Auto Reply:* ${settings.autoReply ? '✅' : '❌'}
📁 *Save Location:* ${settings.saveLocation}
⏱️ *View Delay:* ${settings.viewDelay}ms

━━━━━━━━━━━━━━━━━━━
📊 *Statistics:*
👁️ Viewed: ${settings.stats.totalViewed}
💾 Saved: ${settings.stats.totalSaved}
👥 Contacts: ${settings.stats.contactsSeen.length}
⏰ Last View: ${settings.stats.lastView ? new Date(settings.stats.lastView).toLocaleString() : 'Never'}

━━━━━━━━━━━━━━━━━━━
📋 *Commands:*
• .autoview on - Enable auto view
• .autoview off - Disable auto view
• .autoview view on/off - Toggle auto viewing
• .autoview save on/off - Toggle auto saving
• .autoview reply on/off - Toggle auto reply
• .autoview delay <ms> - Set view delay
• .autoview ignore add @user - Ignore contact
• .autoview ignore remove @user - Unignore
• .autoview ignore list - Show ignored
• .autoview stats - Show statistics
• .autoview reset - Reset statistics
• .autoview clear - Clear saved files

━━━━━━━━━━━━━━━━━━━
💡 *Examples:*
• .autoview save on
• .autoview delay 3000
• .autoview ignore add @spammer

> *ᴘᴏᴡᴇʀᴇᴅ ʙʏ 𝑂𝑃𝑇𝐼𝑀𝑈𝑆 𝑃𝑅𝐼𝑀𝐸*`);
    }
    
    const opt = args[0].toLowerCase();
    
    // Handle on/off
    if (opt === 'on') {
      settings.enabled = true;
      saveSettings(settings);
      return extra.reply(`✅ *AutoView enabled!*\n\nI will now automatically view status updates.`);
    }
    
    if (opt === 'off') {
      settings.enabled = false;
      saveSettings(settings);
      return extra.reply(`❌ *AutoView disabled!*`);
    }
    
    // Handle view toggle
    if (opt === 'view') {
      const value = args[1]?.toLowerCase();
      if (value === 'on') {
        settings.autoView = true;
        saveSettings(settings);
        return extra.reply('✅ *Auto viewing enabled*');
      } else if (value === 'off') {
        settings.autoView = false;
        saveSettings(settings);
        return extra.reply('❌ *Auto viewing disabled*');
      }
    }
    
    // Handle save toggle
    if (opt === 'save') {
      const value = args[1]?.toLowerCase();
      if (value === 'on') {
        settings.autoSave = true;
        saveSettings(settings);
        return extra.reply('✅ *Auto saving enabled*\n\nStatuses will be saved to: ' + settings.saveLocation);
      } else if (value === 'off') {
        settings.autoSave = false;
        saveSettings(settings);
        return extra.reply('❌ *Auto saving disabled*');
      }
    }
    
    // Handle reply toggle
    if (opt === 'reply') {
      const value = args[1]?.toLowerCase();
      if (value === 'on') {
        settings.autoReply = true;
        saveSettings(settings);
        return extra.reply('✅ *Auto reply enabled*\n\nWill reply to statuses');
      } else if (value === 'off') {
        settings.autoReply = false;
        saveSettings(settings);
        return extra.reply('❌ *Auto reply disabled*');
      }
    }
    
    // Handle delay
    if (opt === 'delay') {
      const delay = parseInt(args[1]);
      if (!delay || delay < 500 || delay > 30000) {
        return extra.reply('❌ *Invalid delay!*\n\nPlease provide a value between 500 and 30000 milliseconds.');
      }
      settings.viewDelay = delay;
      saveSettings(settings);
      return extra.reply(`✅ *View delay set to ${delay}ms*`);
    }
    
    // Handle ignore
    if (opt === 'ignore') {
      const subCmd = args[1]?.toLowerCase();
      
      if (subCmd === 'list') {
        const ignored = settings.ignoredContacts;
        if (ignored.length === 0) {
          return extra.reply('📋 *Ignored Contacts*\n\nNo contacts ignored.');
        }
        
        const list = ignored.map((jid, i) => `${i+1}. @${jid.split('@')[0]}`).join('\n');
        return extra.reply(`📋 *Ignored Contacts (${ignored.length})*\n\n${list}`);
      }
      
      if (subCmd === 'add') {
        const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid;
        if (!mentioned || mentioned.length === 0) {
          return extra.reply('❌ *Please mention a user to ignore!*');
        }
        
        const userJid = mentioned[0];
        if (!settings.ignoredContacts.includes(userJid)) {
          settings.ignoredContacts.push(userJid);
          saveSettings(settings);
          return extra.reply(`✅ *Added @${userJid.split('@')[0]} to ignored list*`);
        } else {
          return extra.reply(`❌ *This user is already ignored!*`);
        }
      }
      
      if (subCmd === 'remove') {
        const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid;
        if (!mentioned || mentioned.length === 0) {
          return extra.reply('❌ *Please mention a user to remove!*');
        }
        
        const userJid = mentioned[0];
        const index = settings.ignoredContacts.indexOf(userJid);
        if (index > -1) {
          settings.ignoredContacts.splice(index, 1);
          saveSettings(settings);
          return extra.reply(`✅ *Removed @${userJid.split('@')[0]} from ignored list*`);
        } else {
          return extra.reply(`❌ *This user is not in ignored list!*`);
        }
      }
    }
    
    // Handle stats
    if (opt === 'stats') {
      const contacts = settings.stats.contactsSeen.map(jid => `@${jid.split('@')[0]}`).join(', ');
      
      return extra.reply(`📊 *AUTO VIEW STATISTICS*\n\n` +
        `👁️ Total Viewed: ${settings.stats.totalViewed}\n` +
        `💾 Total Saved: ${settings.stats.totalSaved}\n` +
        `👥 Unique Contacts: ${settings.stats.contactsSeen.length}\n` +
        `⏰ Last View: ${settings.stats.lastView ? new Date(settings.stats.lastView).toLocaleString() : 'Never'}\n\n` +
        `📋 *Recent Contacts:*\n${contacts || 'None'}`);
    }
    
    // Handle reset stats
    if (opt === 'reset') {
      if (args[1] === 'confirm') {
        settings.stats = {
          totalViewed: 0,
          totalSaved: 0,
          lastView: null,
          contactsSeen: []
        };
        saveSettings(settings);
        return extra.reply('✅ *Statistics reset!*');
      } else {
        return extra.reply('⚠️ *Reset confirmation*\n\nType: .autoview reset confirm\nto reset statistics.');
      }
    }
    
    // Handle clear saved files
    if (opt === 'clear') {
      if (args[1] === 'confirm') {
        const saveDir = path.join(__dirname, `../${settings.saveLocation}`);
        if (fs.existsSync(saveDir)) {
          const files = fs.readdirSync(saveDir);
          let deleted = 0;
          
          files.forEach(file => {
            try {
              fs.unlinkSync(path.join(saveDir, file));
              deleted++;
            } catch (e) {}
          });
          
          return extra.reply(`✅ *Cleared ${deleted} saved status files!*`);
        } else {
          return extra.reply('✅ *No saved files found!*');
        }
      } else {
        return extra.reply('⚠️ *Clear confirmation*\n\nType: .autoview clear confirm\nto delete all saved status files.');
      }
    }
    
    extra.reply('❌ *Invalid option.* Use .autoview for help.');
    
  } catch (error) {
    console.error('[AutoView] error:', error);
    extra.reply(`❌ Error: ${error.message}`);
  }
}

// Export
module.exports = {
  name: 'autoview',
  aliases: ['av', 'autostatus', 'viewstatus'],
  category: 'owner',
  description: 'Automatically view and save status updates',
  usage: '.autoview <on/off/save/ignore>',
  ownerOnly: true,
  
  async execute(sock, msg, args, extra) {
    return execute(sock, msg, args, extra);
  },
  
  initializeAutoView
};