/**
 * AntiCall Command - Permanently block and reject all incoming calls
 */

const fs = require('fs');
const path = require('path');

// Database path
const DB_PATH = path.join(__dirname, '../database/anticall.json');

// Default settings
const defaultSettings = {
  enabled: true, // Enabled by default for maximum protection
  action: 'block', // 'reject', 'block', 'ignore'
  permanentBlock: true, // Permanently block callers
  autoReject: true, // Automatically reject all calls
  blockUnknown: true, // Block numbers not in contacts
  whitelist: [], // Numbers to never block
  blacklist: [], // Numbers to always block
  message: '🚫 Calls are not allowed. You have been blocked permanently.',
  stats: {
    totalCalls: 0,
    rejectedCalls: 0,
    blockedCallers: 0,
    lastCall: null
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
    console.error('Error loading anticall settings:', error);
    return { ...defaultSettings };
  }
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
    console.error('Error saving anticall settings:', error);
    return false;
  }
};

// Blocked callers database for permanent blocking
const BLOCKED_CALLERS_PATH = path.join(__dirname, '../database/blocked_callers.json');

// Load blocked callers
const loadBlockedCallers = () => {
  try {
    const dir = path.dirname(BLOCKED_CALLERS_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    if (fs.existsSync(BLOCKED_CALLERS_PATH)) {
      const data = fs.readFileSync(BLOCKED_CALLERS_PATH, 'utf8');
      return JSON.parse(data);
    } else {
      const defaultData = { blockedCallers: [], lastUpdated: null };
      fs.writeFileSync(BLOCKED_CALLERS_PATH, JSON.stringify(defaultData, null, 2));
      return defaultData;
    }
  } catch (error) {
    console.error('Error loading blocked callers:', error);
    return { blockedCallers: [] };
  }
};

// Save blocked callers
const saveBlockedCallers = (data) => {
  try {
    fs.writeFileSync(BLOCKED_CALLERS_PATH, JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error('Error saving blocked callers:', error);
    return false;
  }
};

// Permanently block a caller
const permanentlyBlockCaller = async (sock, callerJid) => {
  try {
    // Method 1: WhatsApp block
    await sock.updateBlockStatus(callerJid, 'block');
    console.log(`[AntiCall] Blocked caller: ${callerJid}`);
    
    // Method 2: Add to permanent database
    const blockedDB = loadBlockedCallers();
    if (!blockedDB.blockedCallers.includes(callerJid)) {
      blockedDB.blockedCallers.push(callerJid);
      blockedDB.lastUpdated = Date.now();
      saveBlockedCallers(blockedDB);
    }
    
    // Method 3: Set up re-block timer (24 hours)
    const reblockTimer = setInterval(async () => {
      try {
        const currentDB = loadBlockedCallers();
        if (!currentDB.blockedCallers.includes(callerJid)) {
          clearInterval(reblockTimer);
          return;
        }
        await sock.updateBlockStatus(callerJid, 'block');
        console.log(`[AntiCall] Re-blocked ${callerJid} (maintenance)`);
      } catch (error) {
        console.error(`[AntiCall] Re-block error:`, error);
      }
    }, 24 * 60 * 60 * 1000); // Every 24 hours
    
    return true;
  } catch (error) {
    console.error('[AntiCall] Permanent block error:', error);
    return false;
  }
};

// Initialize permanent blocks on startup
const initializePermanentCallBlocks = (sock) => {
  try {
    const blockedDB = loadBlockedCallers();
    console.log(`[AntiCall] Initializing ${blockedDB.blockedCallers.length} permanent call blocks`);
    
    blockedDB.blockedCallers.forEach(callerJid => {
      // Re-apply block
      sock.updateBlockStatus(callerJid, 'block').catch(() => {});
      
      // Set up maintenance timer
      setInterval(async () => {
        try {
          await sock.updateBlockStatus(callerJid, 'block');
          console.log(`[AntiCall] Maintenance block for ${callerJid}`);
        } catch (error) {
          // Ignore errors
        }
      }, 24 * 60 * 60 * 1000);
    });
  } catch (error) {
    console.error('[AntiCall] Initialization error:', error);
  }
};

// Handle incoming calls
const handleCall = async (sock, call) => {
  try {
    const settings = loadSettings();
    
    if (!settings.enabled) return false;
    
    const callerJid = call.from;
    const callerNumber = callerJid.split('@')[0];
    
    console.log(`[AntiCall] 📞 Incoming call from: ${callerNumber} (${call.status})`);
    
    // Update stats
    settings.stats.totalCalls++;
    settings.stats.lastCall = {
      from: callerJid,
      timestamp: Date.now(),
      type: 'incoming'
    };
    saveSettings(settings);
    
    // Check whitelist
    if (settings.whitelist.includes(callerNumber)) {
      console.log(`[AntiCall] ✅ Whitelisted caller: ${callerNumber}`);
      return false;
    }
    
    // Check blacklist
    if (settings.blacklist.includes(callerNumber)) {
      console.log(`[AntiCall] 🔴 Blacklisted caller: ${callerNumber}`);
      await permanentlyBlockCaller(sock, callerJid);
      return true;
    }
    
    // Handle based on action
    switch (settings.action) {
      case 'reject':
        try {
          await sock.rejectCall(call.id, call.from);
          settings.stats.rejectedCalls++;
          console.log(`[AntiCall] Call rejected: ${callerNumber}`);
          
          // Send rejection message
          await sock.sendMessage(call.from, {
            text: settings.message,
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
        } catch (rejectError) {
          console.error('[AntiCall] Reject error:', rejectError);
        }
        break;
        
      case 'block':
        try {
          // Reject first
          await sock.rejectCall(call.id, call.from);
          
          // Then permanently block
          await permanentlyBlockCaller(sock, callerJid);
          
          settings.stats.rejectedCalls++;
          settings.stats.blockedCallers++;
          console.log(`[AntiCall] Caller permanently blocked: ${callerNumber}`);
          
          // Send block message
          await sock.sendMessage(call.from, {
            text: `${settings.message}\n\n⚠️ You have been permanently blocked for calling.`,
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
        } catch (blockError) {
          console.error('[AntiCall] Block error:', blockError);
        }
        break;
        
      case 'ignore':
        console.log(`[AntiCall] Call ignored: ${callerNumber}`);
        break;
    }
    
    saveSettings(settings);
    return true;
    
  } catch (error) {
    console.error('[AntiCall] Handler error:', error);
    return false;
  }
};

// Initialize anticall listener
const initializeAntiCall = (sock) => {
  try {
    // Remove any existing listeners
    sock.ev.removeAllListeners('call');
    
    // Listen for incoming calls
    sock.ev.on('call', async (calls) => {
      console.log(`[AntiCall] 📞 Call event received: ${calls.length} call(s)`);
      
      for (const call of calls) {
        // Process all call statuses
        if (call.status === 'offer') {
          await handleCall(sock, call);
        }
      }
    });
    
    console.log('[AntiCall] ✅ Listener initialized - All calls will be blocked');
    
    // Initialize permanent blocks
    initializePermanentCallBlocks(sock);
    
    const settings = loadSettings();
    console.log(`[AntiCall] Status: ${settings.enabled ? '✅ Enabled' : '❌ Disabled'}`);
    console.log(`[AntiCall] Action: ${settings.action}`);
    console.log(`[AntiCall] Permanent blocking: ${settings.permanentBlock ? '✅ Yes' : '❌ No'}`);
    
  } catch (error) {
    console.error('[AntiCall] ❌ Initialization error:', error);
  }
};

// Command execute
async function execute(sock, msg, args, extra) {
  try {
    const settings = loadSettings();
    const isEnabled = settings.enabled;
    
    if (!args[0]) {
      const actionEmoji = {
        'reject': '🔄',
        'block': '🚫',
        'ignore': '👻'
      }[settings.action] || '🔄';
      
      return extra.reply(`╔══════════════════════╗
║  📞 *ANTICALL - PERMANENT*  📞 ║
╚══════════════════════╝

📊 *Status:* ${isEnabled ? '✅ Enabled' : '❌ Disabled'}
${actionEmoji} *Action:* ${settings.action}
🔒 *Permanent Block:* ${settings.permanentBlock ? '✅ Yes' : '❌ No'}
📝 *Message:* ${settings.message}
👥 *Whitelist:* ${settings.whitelist.length} numbers
🚫 *Blacklist:* ${settings.blacklist.length} numbers

━━━━━━━━━━━━━━━━━━━
📊 *STATISTICS*
━━━━━━━━━━━━━━━━━━━
📞 Total Calls: ${settings.stats.totalCalls}
❌ Rejected: ${settings.stats.rejectedCalls}
🚫 Permanently Blocked: ${settings.stats.blockedCallers}
⏱️ Last Call: ${settings.stats.lastCall ? new Date(settings.stats.lastCall.timestamp).toLocaleString() : 'Never'}

━━━━━━━━━━━━━━━━━━━
📋 *Commands:*
• .anticall on - Enable anticall
• .anticall off - Disable anticall
• .anticall set action <reject/block/ignore>
• .anticall set message <text>
• .anticall whitelist add <number>
• .anticall whitelist remove <number>
• .anticall whitelist list
• .anticall blacklist add <number>
• .anticall blacklist remove <number>
• .anticall blacklist list
• .anticall stats - Show statistics
• .anticall reset - Reset statistics

━━━━━━━━━━━━━━━━━━━
💡 *Actions:*
• reject - Reject call, send message
• block - Permanently block caller
• ignore - Silently ignore calls

🔒 *Permanent blocking ensures callers stay blocked FOREVER!*

> *ᴘᴏᴡᴇʀᴇᴅ ʙʏ 𝑂𝑃𝑇𝐼𝑀𝑈𝑆 𝑃𝑅𝐼𝑀𝐸*`);
    }
    
    const opt = args[0].toLowerCase();
    
    // Handle on/off
    if (opt === 'on') {
      settings.enabled = true;
      saveSettings(settings);
      return extra.reply(`✅ *AntiCall enabled!*\n\nAll calls will be ${settings.action === 'block' ? 'permanently blocked' : settings.action + 'ed'}.`);
    }
    
    if (opt === 'off') {
      settings.enabled = false;
      saveSettings(settings);
      return extra.reply(`❌ *AntiCall disabled!*\n\nCalls will now ring normally.`);
    }
    
    // Handle set commands
    if (opt === 'set') {
      const subCmd = args[1]?.toLowerCase();
      
      if (subCmd === 'action') {
        const action = args[2]?.toLowerCase();
        if (!action || !['reject', 'block', 'ignore'].includes(action)) {
          return extra.reply('❌ *Invalid action!*\n\nAvailable: reject, block, ignore');
        }
        
        settings.action = action;
        saveSettings(settings);
        
        const actionMessages = {
          reject: 'Calls will be rejected.',
          block: 'Callers will be PERMANENTLY BLOCKED.',
          ignore: 'Calls will be silently ignored.'
        };
        
        return extra.reply(`✅ *Action set to ${action}!*\n\n${actionMessages[action]}`);
      }
      
      if (subCmd === 'message') {
        const message = args.slice(2).join(' ');
        if (!message) {
          return extra.reply('❌ *Please provide a message!*\n\nExample: .anticall set message 🚫 No calls!');
        }
        
        settings.message = message;
        saveSettings(settings);
        return extra.reply(`✅ *Message set!*\n\n📝 ${message}`);
      }
    }
    
    // Handle whitelist
    if (opt === 'whitelist') {
      const subCmd = args[1]?.toLowerCase();
      
      if (!subCmd || subCmd === 'list') {
        const list = settings.whitelist;
        if (list.length === 0) return extra.reply('📋 *Whitelist is empty*');
        return extra.reply(`📋 *WHITELIST (${list.length})*\n\n${list.map((n, i) => `${i+1}. ${n}`).join('\n')}`);
      }
      
      if (subCmd === 'add') {
        let number = args[2]?.replace(/[^0-9]/g, '');
        if (!number) return extra.reply('❌ *Please provide a number!*');
        
        if (!settings.whitelist.includes(number)) {
          settings.whitelist.push(number);
          saveSettings(settings);
          return extra.reply(`✅ *Added ${number} to whitelist*`);
        }
        return extra.reply(`❌ *${number} already in whitelist*`);
      }
      
      if (subCmd === 'remove') {
        let number = args[2]?.replace(/[^0-9]/g, '');
        if (!number) return extra.reply('❌ *Please provide a number!*');
        
        settings.whitelist = settings.whitelist.filter(n => n !== number);
        saveSettings(settings);
        return extra.reply(`✅ *Removed ${number} from whitelist*`);
      }
    }
    
    // Handle blacklist
    if (opt === 'blacklist') {
      const subCmd = args[1]?.toLowerCase();
      
      if (!subCmd || subCmd === 'list') {
        const list = settings.blacklist;
        if (list.length === 0) return extra.reply('📋 *Blacklist is empty*');
        return extra.reply(`📋 *BLACKLIST (${list.length})*\n\n${list.map((n, i) => `${i+1}. ${n}`).join('\n')}`);
      }
      
      if (subCmd === 'add') {
        let number = args[2]?.replace(/[^0-9]/g, '');
        if (!number) return extra.reply('❌ *Please provide a number!*');
        
        if (!settings.blacklist.includes(number)) {
          settings.blacklist.push(number);
          saveSettings(settings);
          return extra.reply(`✅ *Added ${number} to blacklist*\n\nThis number will be permanently blocked.`);
        }
        return extra.reply(`❌ *${number} already in blacklist*`);
      }
      
      if (subCmd === 'remove') {
        let number = args[2]?.replace(/[^0-9]/g, '');
        if (!number) return extra.reply('❌ *Please provide a number!*');
        
        settings.blacklist = settings.blacklist.filter(n => n !== number);
        saveSettings(settings);
        return extra.reply(`✅ *Removed ${number} from blacklist*`);
      }
    }
    
    // Handle stats
    if (opt === 'stats') {
      const last = settings.stats.lastCall;
      return extra.reply(`📊 *ANTICALL STATISTICS*\n\n` +
        `📞 Total Calls: ${settings.stats.totalCalls}\n` +
        `❌ Rejected: ${settings.stats.rejectedCalls}\n` +
        `🚫 Permanently Blocked: ${settings.stats.blockedCallers}\n` +
        `⏱️ Last Call: ${last ? new Date(last.timestamp).toLocaleString() : 'Never'}\n` +
        `👤 Last Caller: ${last ? last.from.split('@')[0] : 'N/A'}`);
    }
    
    // Handle reset
    if (opt === 'reset') {
      if (args[1] === 'confirm') {
        settings.stats = { totalCalls: 0, rejectedCalls: 0, blockedCallers: 0, lastCall: null };
        saveSettings(settings);
        return extra.reply('✅ *Statistics reset!*');
      }
      return extra.reply('⚠️ *Use .anticall reset confirm to reset stats*');
    }
    
    extra.reply('❌ *Invalid option.* Use .anticall for help.');
    
  } catch (error) {
    console.error('[AntiCall] Command error:', error);
    extra.reply(`❌ Error: ${error.message}`);
  }
}

// Export
module.exports = {
  name: 'anticall',
  aliases: ['ac', 'blockcalls', 'rejectcalls', 'nocalls'],
  category: 'owner',
  description: 'Permanently block and reject all incoming calls',
  usage: '.anticall <on/off/set/whitelist/blacklist/stats>',
  ownerOnly: true,
  
  async execute(sock, msg, args, extra) {
    return execute(sock, msg, args, extra);
  },
  
  initializeAntiCall,
  handleCall
};