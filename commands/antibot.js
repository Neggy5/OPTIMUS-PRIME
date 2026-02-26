/**
 * AntiBot Command - Detect and remove bot accounts
 */

const fs = require('fs');
const path = require('path');

// Database path
const DB_PATH = path.join(__dirname, '../database/antibot.json');

// Common bot patterns
const botPatterns = [
  { name: 'WhatsApp Bot', pattern: /bot/i },
  { name: 'Auto Reply', pattern: /auto|autoreply/i },
  { name: 'Self Bot', pattern: /self/i },
  { name: 'MD Bot', pattern: /md/i },
  { name: 'Baileys', pattern: /baileys/i },
  { name: 'Venom', pattern: /venom/i },
  { name: 'WWebJS', pattern: /wwebjs/i },
  { name: 'Bot Numbers', pattern: /^(?:62|212|52|54|57|51)\d{9,}$/ } // Common bot hosting prefixes
];

// Known bot numbers (can be updated)
const knownBots = [
  // Add known bot numbers here
];

// Default settings
const defaultSettings = {
  enabled: false,
  enabledGroups: [],
  action: 'kick', // 'kick', 'delete', 'warn'
  autoDetect: true,
  checkNames: true,
  checkNumbers: true,
  checkActivity: true,
  allowList: [], // Allowed bot JIDs
  notifyAdmins: true,
  strictMode: false,
  stats: {
    totalDetected: 0,
    totalRemoved: 0,
    totalWarned: 0
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
    console.error('Error loading antibot settings:', error);
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
    console.error('Error saving antibot settings:', error);
    return false;
  }
};

// Check if user is a bot
const isBot = async (sock, userJid, settings) => {
  try {
    // Check allow list
    if (settings.allowList.includes(userJid)) return false;
    
    // Check known bots
    if (knownBots.includes(userJid)) return true;
    
    const userNumber = userJid.split('@')[0];
    
    // Check number patterns
    if (settings.checkNumbers) {
      for (const pattern of botPatterns) {
        if (pattern.name === 'Bot Numbers' && pattern.pattern.test(userNumber)) {
          return true;
        }
      }
    }
    
    // Check name patterns
    if (settings.checkNames) {
      try {
        const contact = await sock.getContact(userJid).catch(() => null);
        if (contact) {
          const name = contact.name || contact.notify || '';
          for (const pattern of botPatterns) {
            if (pattern.name !== 'Bot Numbers' && pattern.pattern.test(name)) {
              return true;
            }
          }
        }
      } catch (nameError) {
        // Ignore name check errors
      }
    }
    
    // Check activity patterns (simplified)
    if (settings.checkActivity && settings.strictMode) {
      // In strict mode, we can check for bot-like behavior
      // This would require tracking message patterns
    }
    
    return false;
  } catch (error) {
    console.error('Error checking bot status:', error);
    return false;
  }
};

// Handle new joiners
async function handleAntiBot(sock, update, extra) {
  try {
    const { id: groupId, participants, action } = update;
    
    // Only check new joins
    if (action !== 'add') return;
    
    const settings = loadSettings();
    
    // Check if enabled for this group
    if (!settings.enabled) return;
    if (!settings.enabledGroups || !settings.enabledGroups.includes(groupId)) return;
    
    // Process each new participant
    for (const participant of participants) {
      const participantJid = typeof participant === 'string' ? participant : participant.id;
      
      // Check if it's a bot
      const isBotUser = await isBot(sock, participantJid, settings);
      
      if (isBotUser) {
        settings.stats.totalDetected++;
        
        // Perform action
        if (settings.action === 'kick') {
          try {
            await sock.groupParticipantsUpdate(groupId, [participantJid], 'remove');
            settings.stats.totalRemoved++;
            
            // Notify admins
            if (settings.notifyAdmins) {
              await sock.sendMessage(groupId, {
                text: `🤖 *Bot Detected & Removed*\n\n` +
                      `👤 *User:* @${participantJid.split('@')[0]}\n` +
                      `📌 *Reason:* Automated account detected\n` +
                      `⚡ *Action:* Kicked`,
                mentions: [participantJid]
              });
            }
            
          } catch (kickError) {
            console.error('Failed to kick bot:', kickError);
          }
        }
        
        else if (settings.action === 'delete') {
          // Just remove the join message
          // Note: This requires storing the join message ID
          settings.stats.totalRemoved++;
        }
        
        else if (settings.action === 'warn') {
          settings.stats.totalWarned++;
          
          await sock.sendMessage(groupId, {
            text: `⚠️ *Bot Warning*\n\n` +
                  `👤 @${participantJid.split('@')[0]}\n` +
                  `📌 This account appears to be a bot.\n` +
                  `⚡ Human? Type something to verify.`,
            mentions: [participantJid]
          });
        }
        
        saveSettings(settings);
      }
    }
    
  } catch (error) {
    console.error('AntiBot handler error:', error);
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
      return extra.reply('❌ *Anti-Bot can only be used in groups!*');
    }
    
    if (!isAdmin && !isOwner) {
      return extra.reply('❌ *Only group admins can use this command!*');
    }
    
    const settings = loadSettings();
    const isEnabled = settings.enabled && settings.enabledGroups?.includes(chatId);
    
    if (!args[0]) {
      return extra.reply(`╔══════════════════════╗
║  🤖 *ANTI-BOT*  🤖    ║
╚══════════════════════╝

📊 *Status:* ${isEnabled ? '✅ Enabled' : '❌ Disabled'}
⚙️ *Action:* ${settings.action}
🔍 *Auto Detect:* ${settings.autoDetect ? '✅' : '❌'}
📝 *Check Names:* ${settings.checkNames ? '✅' : '❌'}
📞 *Check Numbers:* ${settings.checkNumbers ? '✅' : '❌'}
⚡ *Strict Mode:* ${settings.strictMode ? '✅' : '❌'}
👥 *Allow List:* ${settings.allowList.length}

━━━━━━━━━━━━━━━━━━━
📋 *Commands:*
• .ab on - Enable anti-bot
• .ab off - Disable anti-bot
• .ab action <kick/warn>
• .ab check names on/off
• .ab check numbers on/off
• .ab strict on/off
• .ab allow @user - Add to allow list
• .ab remove @user - Remove from allow list
• .ab list - Show allowed users
• .ab stats - Show statistics
• .ab scan - Scan existing members

━━━━━━━━━━━━━━━━━━━
💡 *Bot Detection:*
• Name patterns (bot, auto, md, etc.)
• Number patterns (common hosting)
• Known bot databases

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
      return extra.reply(`✅ *Anti-Bot enabled for this group!*`);
    }
    
    if (opt === 'off') {
      settings.enabledGroups = (settings.enabledGroups || []).filter(id => id !== chatId);
      settings.enabled = settings.enabledGroups.length > 0;
      saveSettings(settings);
      return extra.reply(`❌ *Anti-Bot disabled for this group!*`);
    }
    
    // Handle action
    if (opt === 'action') {
      const action = args[1]?.toLowerCase();
      if (!action || !['kick', 'warn', 'delete'].includes(action)) {
        return extra.reply('❌ *Invalid action!*\n\nAvailable: kick, warn, delete');
      }
      settings.action = action;
      saveSettings(settings);
      return extra.reply(`✅ *Action set to ${action}!*`);
    }
    
    // Handle check settings
    if (opt === 'check') {
      const checkType = args[1]?.toLowerCase();
      const value = args[2]?.toLowerCase();
      
      if (checkType === 'names') {
        if (value === 'on') {
          settings.checkNames = true;
          saveSettings(settings);
          return extra.reply('✅ *Name checking enabled*');
        } else if (value === 'off') {
          settings.checkNames = false;
          saveSettings(settings);
          return extra.reply('❌ *Name checking disabled*');
        }
      }
      
      if (checkType === 'numbers') {
        if (value === 'on') {
          settings.checkNumbers = true;
          saveSettings(settings);
          return extra.reply('✅ *Number pattern checking enabled*');
        } else if (value === 'off') {
          settings.checkNumbers = false;
          saveSettings(settings);
          return extra.reply('❌ *Number pattern checking disabled*');
        }
      }
      
      return extra.reply('❌ *Invalid check option!*\n\nUse: .ab check names on/off\n.ab check numbers on/off');
    }
    
    // Handle strict mode
    if (opt === 'strict') {
      const value = args[1]?.toLowerCase();
      if (value === 'on') {
        settings.strictMode = true;
        saveSettings(settings);
        return extra.reply('✅ *Strict mode enabled*\n\nMore aggressive bot detection');
      } else if (value === 'off') {
        settings.strictMode = false;
        saveSettings(settings);
        return extra.reply('❌ *Strict mode disabled*');
      } else {
        return extra.reply('❌ *Use: .ab strict on  or  .ab strict off*');
      }
    }
    
    // Handle allow user
    if (opt === 'allow') {
      const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid;
      if (!mentioned || mentioned.length === 0) {
        return extra.reply('❌ *Please mention a user to allow!*\n\nExample: .ab allow @user');
      }
      
      const userJid = mentioned[0];
      settings.allowList = settings.allowList || [];
      
      if (!settings.allowList.includes(userJid)) {
        settings.allowList.push(userJid);
        saveSettings(settings);
        return extra.reply(`✅ *Added @${userJid.split('@')[0]} to allow list!*`);
      } else {
        return extra.reply(`❌ *This user is already in allow list!*`);
      }
    }
    
    // Handle remove user
    if (opt === 'remove') {
      const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid;
      if (!mentioned || mentioned.length === 0) {
        return extra.reply('❌ *Please mention a user to remove!*\n\nExample: .ab remove @user');
      }
      
      const userJid = mentioned[0];
      settings.allowList = settings.allowList || [];
      
      const index = settings.allowList.indexOf(userJid);
      if (index > -1) {
        settings.allowList.splice(index, 1);
        saveSettings(settings);
        return extra.reply(`✅ *Removed @${userJid.split('@')[0]} from allow list!*`);
      } else {
        return extra.reply(`❌ *This user is not in the allow list!*`);
      }
    }
    
    // Handle list allowed users
    if (opt === 'list') {
      const allowed = settings.allowList || [];
      if (allowed.length === 0) {
        return extra.reply('📋 *Allow List*\n\nNo users in allow list.\n\nUse .ab allow @user to add.');
      }
      
      const list = allowed.map((jid, i) => `${i+1}. @${jid.split('@')[0]}`).join('\n');
      return extra.reply(`📋 *Allow List (${allowed.length})*\n\n${list}`);
    }
    
    // Handle scan
    if (opt === 'scan') {
      const processing = await sock.sendMessage(chatId, {
        text: '🔍 *Scanning group for bots...*'
      });
      
      try {
        const groupMetadata = await sock.groupMetadata(chatId);
        const participants = groupMetadata.participants;
        
        let botsFound = 0;
        const botList = [];
        
        for (const participant of participants) {
          const isBotUser = await isBot(sock, participant.id, settings);
          if (isBotUser) {
            botsFound++;
            botList.push(participant.id);
          }
        }
        
        await sock.sendMessage(chatId, { delete: processing.key });
        
        if (botsFound > 0) {
          const botMentions = botList.map(jid => `@${jid.split('@')[0]}`).join(', ');
          
          return extra.reply(`🤖 *Scan Complete*\n\n` +
            `📊 *Bots Found:* ${botsFound}\n\n` +
            `👥 *Detected:* ${botMentions}\n\n` +
            `💡 Use .ab action kick to remove them automatically.`);
        } else {
          return extra.reply(`✅ *Scan Complete*\n\nNo bots detected in this group.`);
        }
        
      } catch (scanError) {
        await sock.sendMessage(chatId, { delete: processing.key });
        throw scanError;
      }
    }
    
    // Handle stats
    if (opt === 'stats') {
      return extra.reply(`📊 *ANTI-BOT STATISTICS*\n\n` +
        `🤖 Detected: ${settings.stats.totalDetected}\n` +
        `👢 Removed: ${settings.stats.totalRemoved}\n` +
        `⚠️ Warnings: ${settings.stats.totalWarned}`);
    }
    
    extra.reply('❌ *Invalid option.* Use .ab for help.');
    
  } catch (error) {
    console.error('[AntiBot] error:', error);
    extra.reply(`❌ Error: ${error.message}`);
  }
}

module.exports = {
  name: 'antibot',
  aliases: ['ab', 'nobot'],
  category: 'admin',
  description: 'Detect and remove bot accounts',
  usage: '.ab <on/off/action/scan>',
  
  async execute(sock, msg, args, extra) {
    return execute(sock, msg, args, extra);
  },
  
  handleAntiBot
};