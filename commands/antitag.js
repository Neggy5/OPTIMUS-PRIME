/**
 * AntiTag Command - Prevent mass mentions/tagging in groups
 */

const fs = require('fs');
const path = require('path');

// Database path
const DB_PATH = path.join(__dirname, '../database/antitag.json');

// Default settings
const defaultSettings = {
  enabled: false,
  enabledGroups: [],
  action: 'delete', // 'delete', 'warn', 'kick'
  warnCount: 3,
  maxMentions: 5, // Maximum mentions allowed per message
  ignoreAdmins: true,
  ignoreOwner: true,
  notifyAdmins: true,
  protectBot: true,
  trackStats: true,
  stats: {
    totalPrevented: 0,
    totalWarned: 0,
    totalKicked: 0,
    lastIncident: null
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
    console.error('Error loading antitag settings:', error);
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
    console.error('Error saving antitag settings:', error);
    return false;
  }
};

// Count mentions in message
const countMentions = (msg) => {
  let count = 0;
  
  // Check for mentioned JIDs
  const mentionedJid = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid;
  if (mentionedJid && Array.isArray(mentionedJid)) {
    count += mentionedJid.length;
  }
  
  // Check for text mentions (@username)
  const text = msg.message?.conversation || 
               msg.message?.extendedTextMessage?.text ||
               msg.message?.imageMessage?.caption ||
               msg.message?.videoMessage?.caption ||
               '';
  
  // Count @ mentions in text
  const textMentions = (text.match(/@\S+/g) || []).length;
  count += textMentions;
  
  return count;
};

// Warning tracking
const userWarnings = new Map();

// Handle antitag
async function handleAntiTag(sock, msg, extra) {
  try {
    const chatId = extra.from;
    const sender = extra.sender;
    const isGroup = extra.isGroup;
    const isAdmin = extra.isAdmin;
    const isOwner = extra.isOwner;
    const isBotAdmin = extra.isBotAdmin;
    
    // Only process in groups
    if (!isGroup) return false;
    
    // Load settings
    const settings = loadSettings();
    
    // Check if enabled for this group
    if (!settings.enabled) return false;
    if (!settings.enabledGroups || !settings.enabledGroups.includes(chatId)) return false;
    
    // Check if sender should be ignored
    if (settings.ignoreAdmins && isAdmin) return false;
    if (settings.ignoreOwner && isOwner) return false;
    
    // Count mentions in message
    const mentionCount = countMentions(msg);
    
    // If mentions are within limit, do nothing
    if (mentionCount <= settings.maxMentions) return false;
    
    // This is a tagall attempt
    console.log(`[AntiTag] Detected ${mentionCount} mentions from ${sender} in ${chatId}`);
    
    // Check if bot is admin (required for delete/kick actions)
    if ((settings.action === 'delete' || settings.action === 'kick') && !isBotAdmin) {
      await sock.sendMessage(chatId, {
        text: '⚠️ *AntiTag Warning:*\n\nI need to be admin to prevent mass mentions!'
      });
      return false;
    }
    
    // Update stats
    if (settings.trackStats) {
      settings.stats.totalPrevented++;
      settings.stats.lastIncident = {
        time: Date.now(),
        sender,
        mentionCount
      };
      saveSettings(settings);
    }
    
    // Handle based on action
    if (settings.action === 'delete') {
      // Delete the message
      await sock.sendMessage(chatId, { delete: msg.key });
      
      // Send notification
      if (settings.notifyAdmins) {
        await sock.sendMessage(chatId, {
          text: `🛡️ *AntiTag Triggered*\n\n` +
                `👤 *User:* @${sender.split('@')[0]}\n` +
                `📊 *Mentions:* ${mentionCount}\n` +
                `⚠️ *Action:* Message deleted\n\n` +
                `Max allowed: ${settings.maxMentions} mentions`,
          mentions: [sender]
        });
      }
      
      return true;
    }
    
    if (settings.action === 'warn') {
      // Get current warnings
      const key = `${chatId}_${sender}`;
      const current = userWarnings.get(key) || { count: 0, warnings: [] };
      
      current.count++;
      current.warnings.push({
        reason: 'Mass tagging',
        mentions: mentionCount,
        time: Date.now()
      });
      
      userWarnings.set(key, current);
      
      // Delete the message
      await sock.sendMessage(chatId, { delete: msg.key });
      
      // Update stats
      if (settings.trackStats) {
        settings.stats.totalWarned++;
        saveSettings(settings);
      }
      
      // Check if reached warning limit
      if (current.count >= settings.warnCount) {
        // Kick user
        if (isBotAdmin) {
          await sock.groupParticipantsUpdate(chatId, [sender], 'remove');
          
          if (settings.trackStats) {
            settings.stats.totalKicked++;
            saveSettings(settings);
          }
          
          await sock.sendMessage(chatId, {
            text: `👢 *User Kicked*\n\n` +
                  `👤 @${sender.split('@')[0]}\n` +
                  `📌 Reason: Reached ${settings.warnCount} mass tagging warnings`,
            mentions: [sender]
          });
          
          // Clear warnings
          userWarnings.delete(key);
        }
      } else {
        // Send warning
        await sock.sendMessage(chatId, {
          text: `⚠️ *Warning ${current.count}/${settings.warnCount}*\n\n` +
                `👤 @${sender.split('@')[0]}\n` +
                `❌ Mass tagging is not allowed!\n` +
                `📊 You used ${mentionCount} mentions (max: ${settings.maxMentions})\n\n` +
                `${current.count >= settings.warnCount ? '🚫 Next warning will result in kick!' : ''}`,
          mentions: [sender]
        });
      }
      
      return true;
    }
    
    if (settings.action === 'kick') {
      // Delete the message
      await sock.sendMessage(chatId, { delete: msg.key });
      
      // Kick user
      if (isBotAdmin) {
        await sock.groupParticipantsUpdate(chatId, [sender], 'remove');
        
        if (settings.trackStats) {
          settings.stats.totalKicked++;
          saveSettings(settings);
        }
        
        await sock.sendMessage(chatId, {
          text: `👢 *User Kicked*\n\n` +
                `👤 @${sender.split('@')[0]}\n` +
                `📌 Reason: Mass tagging (${mentionCount} mentions)`,
          mentions: [sender]
        });
      }
      
      return true;
    }
    
    return false;
    
  } catch (error) {
    console.error('AntiTag handler error:', error);
    return false;
  }
}

// Command execute
async function execute(sock, msg, args, extra) {
  try {
    const chatId = extra.from;
    const isGroup = extra.isGroup;
    const isAdmin = extra.isAdmin;
    const isOwner = extra.isOwner;
    
    if (!isGroup) {
      return extra.reply('❌ *AntiTag can only be used in groups!*');
    }
    
    if (!isAdmin && !isOwner) {
      return extra.reply('❌ *Only group admins can use this command!*');
    }
    
    const settings = loadSettings();
    const isEnabled = settings.enabled && settings.enabledGroups?.includes(chatId);
    
    if (!args[0]) {
      const actionText = {
        'delete': '🗑️ Delete',
        'warn': '⚠️ Warn',
        'kick': '👢 Kick'
      }[settings.action] || settings.action;
      
      return extra.reply(`╔══════════════════════╗
║  🛡️ *ANTI-TAG COMMAND*  🛡️ ║
╚══════════════════════╝

📊 *Status:* ${isEnabled ? '✅ Enabled' : '❌ Disabled'}
⚙️ *Action:* ${actionText}
⚠️ *Warn Count:* ${settings.warnCount}
📊 *Max Mentions:* ${settings.maxMentions}
👑 *Ignore Admins:* ${settings.ignoreAdmins ? '✅' : '❌'}
👤 *Ignore Owner:* ${settings.ignoreOwner ? '✅' : '❌'}
📈 *Total Prevented:* ${settings.stats.totalPrevented}

━━━━━━━━━━━━━━━━━━━
📋 *Commands:*
• .antitag on - Enable antitag
• .antitag off - Disable antitag
• .antitag action <delete/warn/kick>
• .antitag max <number> - Set max mentions allowed
• .antitag warncount <number>
• .antitag ignore admins on/off
• .antitag ignore owner on/off
• .antitag stats - Show statistics
• .antitag reset - Reset stats

━━━━━━━━━━━━━━━━━━━
💡 *Examples:*
• .antitag max 3
• .antitag action kick
• .antitag ignore admins on

> *ᴘᴏᴡᴇʀᴇᴅ ʙʏ 𝑂𝑃𝑇𝐼𝑀𝑈𝑆 𝑃𝑅𝐼𝑀𝐸*`);
    }
    
    const opt = args[0].toLowerCase();
    
    // Handle on/off
    if (opt === 'on') {
      settings.enabled = true;
      settings.enabledGroups = settings.enabledGroups || [];
      if (!settings.enabledGroups.includes(chatId)) {
        settings.enabledGroups.push(chatId);
      }
      saveSettings(settings);
      return extra.reply(`✅ *AntiTag enabled for this group!*\n\nMax mentions: ${settings.maxMentions}\nAction: ${settings.action}`);
    }
    
    if (opt === 'off') {
      settings.enabledGroups = (settings.enabledGroups || []).filter(id => id !== chatId);
      settings.enabled = settings.enabledGroups.length > 0;
      saveSettings(settings);
      return extra.reply(`❌ *AntiTag disabled for this group!*`);
    }
    
    // Handle action
    if (opt === 'action') {
      const action = args[1]?.toLowerCase();
      if (!action || !['delete', 'warn', 'kick'].includes(action)) {
        return extra.reply('❌ *Invalid action!*\n\nAvailable: delete, warn, kick');
      }
      settings.action = action;
      saveSettings(settings);
      return extra.reply(`✅ *Action set to ${action}!*`);
    }
    
    // Handle max mentions
    if (opt === 'max') {
      const max = parseInt(args[1]);
      if (!max || max < 1 || max > 50) {
        return extra.reply('❌ *Invalid max mentions!*\n\nPlease provide a value between 1 and 50.');
      }
      settings.maxMentions = max;
      saveSettings(settings);
      return extra.reply(`✅ *Max mentions set to ${max}!*`);
    }
    
    // Handle warncount
    if (opt === 'warncount') {
      const count = parseInt(args[1]);
      if (!count || count < 1 || count > 10) {
        return extra.reply('❌ *Invalid warn count!*\n\nPlease provide a value between 1 and 10.');
      }
      settings.warnCount = count;
      saveSettings(settings);
      return extra.reply(`✅ *Warn count set to ${count}!*`);
    }
    
    // Handle ignore settings
    if (opt === 'ignore') {
      const target = args[1]?.toLowerCase();
      const value = args[2]?.toLowerCase();
      
      if (target === 'admins') {
        if (value === 'on') {
          settings.ignoreAdmins = true;
          saveSettings(settings);
          return extra.reply('✅ *Admins will now be ignored*');
        } else if (value === 'off') {
          settings.ignoreAdmins = false;
          saveSettings(settings);
          return extra.reply('❌ *Admins will now be monitored*');
        }
      }
      
      if (target === 'owner') {
        if (value === 'on') {
          settings.ignoreOwner = true;
          saveSettings(settings);
          return extra.reply('✅ *Owner will now be ignored*');
        } else if (value === 'off') {
          settings.ignoreOwner = false;
          saveSettings(settings);
          return extra.reply('❌ *Owner will now be monitored*');
        }
      }
      
      return extra.reply('❌ *Invalid ignore option!*\n\nUse: .antitag ignore admins on/off\n.antitag ignore owner on/off');
    }
    
    // Handle stats
    if (opt === 'stats') {
      return extra.reply(`📊 *ANTI-TAG STATISTICS*\n\n` +
        `🛡️ Prevented: ${settings.stats.totalPrevented}\n` +
        `⚠️ Warnings: ${settings.stats.totalWarned}\n` +
        `👢 Kicked: ${settings.stats.totalKicked}\n` +
        `⏰ Last Incident: ${settings.stats.lastIncident ? new Date(settings.stats.lastIncident.time).toLocaleString() : 'Never'}\n` +
        `👤 Last Offender: ${settings.stats.lastIncident ? '@' + settings.stats.lastIncident.sender.split('@')[0] : 'None'}`);
    }
    
    // Handle reset stats
    if (opt === 'reset') {
      if (args[1] === 'confirm') {
        settings.stats = {
          totalPrevented: 0,
          totalWarned: 0,
          totalKicked: 0,
          lastIncident: null
        };
        saveSettings(settings);
        return extra.reply('✅ *Statistics reset!*');
      } else {
        return extra.reply('⚠️ *Reset confirmation*\n\nType: .antitag reset confirm\nto reset statistics.');
      }
    }
    
    extra.reply('❌ *Invalid option.* Use .antitag for help.');
    
  } catch (error) {
    console.error('[AntiTag] error:', error);
    extra.reply(`❌ Error: ${error.message}`);
  }
}

// Export
module.exports = {
  name: 'antitag',
  aliases: ['atag', 'notag', 'antitagall'],
  category: 'admin',
  description: 'Prevent mass mentions/tagging in groups',
  usage: '.antitag <on/off/action/max>',
  
  async execute(sock, msg, args, extra) {
    return execute(sock, msg, args, extra);
  },
  
  handleAntiTag
};