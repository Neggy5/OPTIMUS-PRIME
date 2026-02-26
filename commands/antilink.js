/**
 * AntiLink Command - Block links in groups
 */

const fs = require('fs');
const path = require('path');

// Database path
const DB_PATH = path.join(__dirname, '../database/antilink.json');

// Default settings
const defaultSettings = {
  enabled: false,
  enabledGroups: [],
  action: 'delete', // 'delete', 'warn', 'kick'
  warnCount: 3, // Number of warnings before kick
  ignoreAdmins: true,
  ignoreOwner: true,
  allowedDomains: [], // Domains to always allow
  blockedDomains: [], // Domains to always block
  detectShortLinks: true,
  detectPhoneNumbers: false,
  detectAllLinks: true,
  customMessage: '❌ Links are not allowed in this group!',
  stats: {
    totalDeleted: 0,
    totalWarned: 0,
    totalKicked: 0
  }
};

// Common link patterns
const linkPatterns = [
  // Regular URLs
  /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/gi,
  
  // URLs without protocol
  /(?:^|\s)([-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*))/gi,
  
  // WhatsApp group links
  /(?:chat\.whatsapp\.com|whatsapp\.com)\/(?:invite\/)?([a-zA-Z0-9_-]{20,24})/gi,
  
  // Telegram links
  /t\.me\/([a-zA-Z0-9_]+)/gi,
  /telegram\.me\/([a-zA-Z0-9_]+)/gi,
  /telegram\.dog\/([a-zA-Z0-9_]+)/gi,
  
  // Discord links
  /discord\.(?:gg|com|me)\/(?:invite\/)?([a-zA-Z0-9_-]+)/gi,
  /discordapp\.com\/invite\/([a-zA-Z0-9_-]+)/gi,
  
  // Instagram links
  /instagram\.com\/(p|reel|tv|stories)\/([a-zA-Z0-9_-]+)/gi,
  /instagr\.am\/(p|reel|tv|stories)\/([a-zA-Z0-9_-]+)/gi,
  
  // Facebook links
  /facebook\.com\/([a-zA-Z0-9.]+)/gi,
  /fb\.com\/([a-zA-Z0-9.]+)/gi,
  /fb\.watch\/([a-zA-Z0-9_-]+)/gi,
  
  // Twitter/X links
  /twitter\.com\/([a-zA-Z0-9_]+)\/status\/([0-9]+)/gi,
  /x\.com\/([a-zA-Z0-9_]+)\/status\/([0-9]+)/gi,
  /t\.co\/([a-zA-Z0-9_]+)/gi,
  
  // TikTok links
  /tiktok\.com\/(@[a-zA-Z0-9_.]+\/video\/[0-9]+|@[a-zA-Z0-9_.]+)/gi,
  /vm\.tiktok\.com\/([a-zA-Z0-9_]+)/gi,
  /vt\.tiktok\.com\/([a-zA-Z0-9_]+)/gi,
  
  // YouTube links
  /youtube\.com\/watch\?v=([a-zA-Z0-9_-]+)/gi,
  /youtu\.be\/([a-zA-Z0-9_-]+)/gi,
  /youtube\.com\/shorts\/([a-zA-Z0-9_-]+)/gi,
  
  // Bitly and short links
  /bit\.ly\/([a-zA-Z0-9_]+)/gi,
  /tinyurl\.com\/([a-zA-Z0-9_]+)/gi,
  /shorturl\.at\/([a-zA-Z0-9_]+)/gi,
  /rb\.gy\/([a-zA-Z0-9_]+)/gi,
  /cutt\.ly\/([a-zA-Z0-9_]+)/gi,
  /ow\.ly\/([a-zA-Z0-9_]+)/gi,
  
  // Phone numbers (optional)
  /(?:\+?[\d-]{10,15})/g
];

// Common domains to always allow
const commonSafeDomains = [
  'google.com', 'youtube.com', 'facebook.com', 'instagram.com', 
  'twitter.com', 'whatsapp.com', 'github.com', 'stackoverflow.com',
  'medium.com', 'wikipedia.org', 'reddit.com', 't.me', 'telegram.org'
];

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
    console.error('Error loading antilink settings:', error);
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
    console.error('Error saving antilink settings:', error);
    return false;
  }
};

// Extract domains from text
const extractDomains = (text) => {
  const domainRegex = /(?:https?:\/\/)?(?:www\.)?([a-zA-Z0-9][a-zA-Z0-9-]*\.[a-zA-Z]{2,})(?:\/|:|\s|$)/gi;
  const domains = [];
  let match;
  while ((match = domainRegex.exec(text)) !== null) {
    domains.push(match[1].toLowerCase());
  }
  return domains;
};

// Check if text contains links
const containsLinks = (text, settings) => {
  if (!text) return false;
  
  // Check if all links are disabled
  if (!settings.detectAllLinks && !settings.detectShortLinks && !settings.detectPhoneNumbers) {
    return false;
  }
  
  // Extract domains for whitelist/blacklist check
  const domains = extractDomains(text);
  
  // Check allowed domains
  const allowedDomains = [...(settings.allowedDomains || []), ...commonSafeDomains];
  for (const domain of domains) {
    if (allowedDomains.includes(domain)) {
      return false; // Domain is allowed
    }
  }
  
  // Check blocked domains
  for (const domain of domains) {
    if (settings.blockedDomains?.includes(domain)) {
      return true; // Domain is blocked
    }
  }
  
  // Check all link patterns
  for (let i = 0; i < linkPatterns.length; i++) {
    // Skip phone number pattern if disabled
    if (i === linkPatterns.length - 1 && !settings.detectPhoneNumbers) {
      continue;
    }
    
    // Skip short link patterns if disabled
    if (i >= linkPatterns.length - 6 && !settings.detectShortLinks) {
      continue;
    }
    
    if (linkPatterns[i].test(text)) {
      return true;
    }
  }
  
  return false;
};

// Warning tracking
const userWarnings = new Map();

// Handle anti-link
async function handleAntiLink(sock, msg, extra) {
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
    
    // Get message content
    const content = msg.message?.conversation || 
                   msg.message?.extendedTextMessage?.text ||
                   msg.message?.imageMessage?.caption ||
                   msg.message?.videoMessage?.caption ||
                   '';
    
    if (!content) return false;
    
    // Check if message contains links
    if (!containsLinks(content, settings)) return false;
    
    // Check if sender should be ignored
    if (settings.ignoreAdmins && isAdmin) return false;
    if (settings.ignoreOwner && isOwner) return false;
    
    // Check if bot is admin (required for delete/kick actions)
    if ((settings.action === 'delete' || settings.action === 'kick') && !isBotAdmin) {
      await sock.sendMessage(chatId, {
        text: '⚠️ *Anti-Link Warning:*\n\nI need to be admin to delete messages!'
      });
      return false;
    }
    
    // Handle based on action
    if (settings.action === 'delete') {
      // Delete the message
      await sock.sendMessage(chatId, { delete: msg.key });
      
      // Update stats
      settings.stats.totalDeleted++;
      saveSettings(settings);
      
      return true;
    }
    
    if (settings.action === 'warn') {
      // Get current warnings
      const key = `${chatId}_${sender}`;
      const current = userWarnings.get(key) || { count: 0, warnings: [] };
      
      current.count++;
      current.warnings.push({
        reason: 'Link sent',
        time: Date.now()
      });
      
      userWarnings.set(key, current);
      
      // Delete the message
      await sock.sendMessage(chatId, { delete: msg.key });
      
      // Check if reached warning limit
      if (current.count >= settings.warnCount) {
        // Kick user
        if (isBotAdmin) {
          await sock.groupParticipantsUpdate(chatId, [sender], 'remove');
          settings.stats.totalKicked++;
          
          await sock.sendMessage(chatId, {
            text: `👢 *User Kicked*\n\n👤 @${sender.split('@')[0]}\n📌 Reason: Reached ${settings.warnCount} link warnings`,
            mentions: [sender]
          });
          
          // Clear warnings
          userWarnings.delete(key);
        }
      } else {
        // Send warning
        settings.stats.totalWarned++;
        await sock.sendMessage(chatId, {
          text: `⚠️ *Warning ${current.count}/${settings.warnCount}*\n\n👤 @${sender.split('@')[0]}\n❌ Links are not allowed!\n\n${current.count >= settings.warnCount ? '🚫 Next warning will result in kick!' : ''}`,
          mentions: [sender]
        });
      }
      
      saveSettings(settings);
      return true;
    }
    
    if (settings.action === 'kick') {
      // Delete the message
      await sock.sendMessage(chatId, { delete: msg.key });
      
      // Kick user
      if (isBotAdmin) {
        await sock.groupParticipantsUpdate(chatId, [sender], 'remove');
        settings.stats.totalKicked++;
        saveSettings(settings);
        
        await sock.sendMessage(chatId, {
          text: `👢 *User Kicked*\n\n👤 @${sender.split('@')[0]}\n📌 Reason: Links not allowed in this group`,
          mentions: [sender]
        });
      }
      
      return true;
    }
    
    return false;
    
  } catch (error) {
    console.error('AntiLink handler error:', error);
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
    
    // Check if in group
    if (!isGroup) {
      return extra.reply('❌ *Anti-Link can only be used in groups!*');
    }
    
    // Check permissions
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
║  🔗 *ANTI-LINK*  🔗    ║
╚══════════════════════╝

📊 *Status:* ${isEnabled ? '✅ Enabled' : '❌ Disabled'}
⚙️ *Action:* ${actionText}
⚠️ *Warn Count:* ${settings.warnCount}
👑 *Ignore Admins:* ${settings.ignoreAdmins ? '✅' : '❌'}
👤 *Ignore Owner:* ${settings.ignoreOwner ? '✅' : '❌'}
🔍 *Detect Short Links:* ${settings.detectShortLinks ? '✅' : '❌'}
📞 *Detect Phone Numbers:* ${settings.detectPhoneNumbers ? '✅' : '❌'}

━━━━━━━━━━━━━━━━━━━
📋 *Commands:*
• .al on - Enable anti-link
• .al off - Disable anti-link
• .al action delete - Delete messages
• .al action warn - Warn users
• .al action kick - Kick users
• .al warncount 3 - Set warnings before kick
• .al allow <domain> - Allow a domain
• .al block <domain> - Block a domain
• .al domains - Show allowed/blocked domains
• .al short on/off - Detect short links
• .al phone on/off - Detect phone numbers
• .al ignore admins on/off
• .al ignore owner on/off
• .al stats - Show statistics

━━━━━━━━━━━━━━━━━━━
💡 *Examples:*
• .al allow google.com
• .al block facebook.com
• .al short on

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
      return extra.reply(`✅ *Anti-Link enabled for this group!*\n\nAction: ${settings.action}\nI will ${settings.action} any links sent.`);
    }
    
    if (opt === 'off') {
      settings.enabledGroups = (settings.enabledGroups || []).filter(id => id !== chatId);
      settings.enabled = settings.enabledGroups.length > 0;
      saveSettings(settings);
      return extra.reply(`❌ *Anti-Link disabled for this group!*`);
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
    
    // Handle allow domain
    if (opt === 'allow') {
      const domain = args[1]?.toLowerCase();
      if (!domain) {
        return extra.reply('❌ *Please provide a domain to allow!*\n\nExample: .al allow google.com');
      }
      
      settings.allowedDomains = settings.allowedDomains || [];
      if (!settings.allowedDomains.includes(domain)) {
        settings.allowedDomains.push(domain);
        saveSettings(settings);
        return extra.reply(`✅ *Domain ${domain} added to allow list!*`);
      } else {
        return extra.reply(`❌ *Domain ${domain} is already in allow list!*`);
      }
    }
    
    // Handle block domain
    if (opt === 'block') {
      const domain = args[1]?.toLowerCase();
      if (!domain) {
        return extra.reply('❌ *Please provide a domain to block!*\n\nExample: .al block spam.com');
      }
      
      settings.blockedDomains = settings.blockedDomains || [];
      if (!settings.blockedDomains.includes(domain)) {
        settings.blockedDomains.push(domain);
        saveSettings(settings);
        return extra.reply(`✅ *Domain ${domain} added to block list!*`);
      } else {
        return extra.reply(`❌ *Domain ${domain} is already in block list!*`);
      }
    }
    
    // Handle domains list
    if (opt === 'domains') {
      const allowed = settings.allowedDomains || [];
      const blocked = settings.blockedDomains || [];
      
      return extra.reply(`📋 *Domain Lists*\n\n` +
        `✅ *Allowed Domains (${allowed.length}):*\n${allowed.length ? allowed.join('\n') : 'None'}\n\n` +
        `❌ *Blocked Domains (${blocked.length}):*\n${blocked.length ? blocked.join('\n') : 'None'}`);
    }
    
    // Handle short links toggle
    if (opt === 'short') {
      const value = args[1]?.toLowerCase();
      if (value === 'on') {
        settings.detectShortLinks = true;
        saveSettings(settings);
        return extra.reply('✅ *Short link detection enabled!*');
      } else if (value === 'off') {
        settings.detectShortLinks = false;
        saveSettings(settings);
        return extra.reply('❌ *Short link detection disabled!*');
      } else {
        return extra.reply('❌ *Use: .al short on  or  .al short off*');
      }
    }
    
    // Handle phone numbers toggle
    if (opt === 'phone') {
      const value = args[1]?.toLowerCase();
      if (value === 'on') {
        settings.detectPhoneNumbers = true;
        saveSettings(settings);
        return extra.reply('✅ *Phone number detection enabled!*');
      } else if (value === 'off') {
        settings.detectPhoneNumbers = false;
        saveSettings(settings);
        return extra.reply('❌ *Phone number detection disabled!*');
      } else {
        return extra.reply('❌ *Use: .al phone on  or  .al phone off*');
      }
    }
    
    // Handle ignore settings
    if (opt === 'ignore') {
      const target = args[1]?.toLowerCase();
      const value = args[2]?.toLowerCase();
      
      if (target === 'admins') {
        if (value === 'on' || value === 'true') {
          settings.ignoreAdmins = true;
          saveSettings(settings);
          return extra.reply('✅ *Admins will now be ignored*');
        } else if (value === 'off' || value === 'false') {
          settings.ignoreAdmins = false;
          saveSettings(settings);
          return extra.reply('❌ *Admins will now be checked*');
        }
      }
      
      if (target === 'owner') {
        if (value === 'on' || value === 'true') {
          settings.ignoreOwner = true;
          saveSettings(settings);
          return extra.reply('✅ *Owner will now be ignored*');
        } else if (value === 'off' || value === 'false') {
          settings.ignoreOwner = false;
          saveSettings(settings);
          return extra.reply('❌ *Owner will now be checked*');
        }
      }
      
      return extra.reply('❌ *Invalid ignore option!*\n\nUse: .al ignore admins on/off\n.al ignore owner on/off');
    }
    
    // Handle stats
    if (opt === 'stats') {
      return extra.reply(`📊 *ANTI-LINK STATISTICS*\n\n` +
        `🗑️ Deleted: ${settings.stats.totalDeleted}\n` +
        `⚠️ Warnings: ${settings.stats.totalWarned}\n` +
        `👢 Kicked: ${settings.stats.totalKicked}\n\n` +
        `📌 *Group Status:* ${isEnabled ? '✅ Active' : '❌ Inactive'}`);
    }
    
    extra.reply('❌ *Invalid option.* Use .al for help.');
    
  } catch (error) {
    console.error('[AntiLink] error:', error);
    extra.reply(`❌ Error: ${error.message}`);
  }
}

// Export
module.exports = {
  name: 'antilink',
  aliases: ['al', 'nolink'],
  category: 'admin',
  description: 'Block links in groups',
  usage: '.al <on/off/action/allow/block>',
  
  async execute(sock, msg, args, extra) {
    return execute(sock, msg, args, extra);
  },
  
  handleAntiLink
};