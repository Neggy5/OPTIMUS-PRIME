/**
 * AntiPromote Command - Prevent unauthorized promotions/demotions
 */

const fs = require('fs');
const path = require('path');

// Database path
const DB_PATH = path.join(__dirname, '../database/antipromote.json');

// Default settings
const defaultSettings = {
  enabled: false,
  enabledGroups: [],
  action: 'delete', // 'delete', 'warn', 'kick', 'demote'
  warnCount: 3,
  ignoreOwner: true,
  allowedAdmins: [], // Admins allowed to promote/demote
  trackChanges: true,
  notifyOwner: true,
  stats: {
    totalPrevented: 0,
    totalWarned: 0,
    totalKicked: 0,
    lastAction: null
  }
};

// Store tracked admins
const adminTracking = new Map();

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
    console.error('Error loading antipromote settings:', error);
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
    console.error('Error saving antipromote settings:', error);
    return false;
  }
};

// Check if user is allowed to promote
const isAllowedToPromote = (userId, settings, isOwner) => {
  if (isOwner) return true;
  if (settings.allowedAdmins.includes(userId)) return true;
  return false;
};

// Handle promote/demote events
async function handleAntiPromote(sock, update, extra) {
  try {
    const { id: groupId, participants, actor } = update;
    const settings = loadSettings();
    
    // Check if enabled for this group
    if (!settings.enabled) return;
    if (!settings.enabledGroups || !settings.enabledGroups.includes(groupId)) return;
    
    // Get actor info
    const actorJid = actor;
    const actorNumber = actorJid.split('@')[0];
    
    // Check if actor is owner
    const isOwner = extra.isOwner(actorJid);
    
    // If actor is owner and we ignore owner, skip
    if (settings.ignoreOwner && isOwner) return;
    
    // Check if actor is allowed
    if (isAllowedToPromote(actorJid, settings, isOwner)) return;
    
    // Process each participant affected
    for (const participant of participants) {
      const participantJid = participant;
      
      // Track the change
      if (settings.trackChanges) {
        const key = `${groupId}_${participantJid}`;
        const current = adminTracking.get(key) || {
          changes: [],
          lastChange: null
        };
        
        current.changes.push({
          actor: actorJid,
          time: Date.now(),
          type: 'promote_attempt'
        });
        current.lastChange = Date.now();
        
        adminTracking.set(key, current);
      }
      
      // Perform action
      if (settings.action === 'delete') {
        // Try to reverse the promotion/demotion
        try {
          // Get current participant info to determine what to do
          const groupMetadata = await sock.groupMetadata(groupId);
          const isCurrentlyAdmin = groupMetadata.participants.find(
            p => p.id === participantJid && (p.admin === 'admin' || p.admin === 'superadmin')
          );
          
          // If they were made admin, demote them
          if (isCurrentlyAdmin) {
            await sock.groupParticipantsUpdate(groupId, [participantJid], 'demote');
          }
          
          settings.stats.totalPrevented++;
          
          // Send notification
          await sock.sendMessage(groupId, {
            text: `🛡️ *Anti-Promote Triggered*\n\n` +
                  `👤 *Actor:* @${actorNumber}\n` +
                  `👥 *Target:* @${participantJid.split('@')[0]}\n` +
                  `📌 *Action:* Promotion attempt prevented\n` +
                  `⚡ *Result:* Change reverted`,
            mentions: [actorJid, participantJid]
          });
          
        } catch (revertError) {
          console.error('Failed to revert promotion:', revertError);
        }
      }
      
      else if (settings.action === 'warn') {
        // Track warnings
        const warnKey = `${groupId}_${actorJid}`;
        const warnings = adminTracking.get(warnKey) || { count: 0 };
        warnings.count = (warnings.count || 0) + 1;
        adminTracking.set(warnKey, warnings);
        
        settings.stats.totalWarned++;
        
        // Check if reached warn limit
        if (warnings.count >= settings.warnCount) {
          // Kick the user
          try {
            await sock.groupParticipantsUpdate(groupId, [actorJid], 'remove');
            settings.stats.totalKicked++;
            
            await sock.sendMessage(groupId, {
              text: `👢 *User Kicked*\n\n👤 @${actorNumber}\n📌 Reason: Reached ${settings.warnCount} promotion attempts`,
              mentions: [actorJid]
            });
            
            // Clear warnings
            adminTracking.delete(warnKey);
            
          } catch (kickError) {
            console.error('Failed to kick user:', kickError);
          }
        } else {
          // Send warning
          await sock.sendMessage(groupId, {
            text: `⚠️ *Warning ${warnings.count}/${settings.warnCount}*\n\n` +
                  `👤 @${actorNumber}\n` +
                  `❌ You are not authorized to promote/demote members!\n\n` +
                  `${warnings.count >= settings.warnCount ? '🚫 Next attempt will result in kick!' : ''}`,
            mentions: [actorJid]
          });
        }
      }
      
      else if (settings.action === 'kick') {
        // Immediately kick the actor
        try {
          await sock.groupParticipantsUpdate(groupId, [actorJid], 'remove');
          settings.stats.totalKicked++;
          
          await sock.sendMessage(groupId, {
            text: `👢 *User Kicked*\n\n👤 @${actorNumber}\n📌 Reason: Unauthorized promotion attempt`,
            mentions: [actorJid]
          });
          
        } catch (kickError) {
          console.error('Failed to kick user:', kickError);
        }
      }
      
      else if (settings.action === 'demote') {
        // Demote the actor if they are admin
        try {
          const groupMetadata = await sock.groupMetadata(groupId);
          const isActorAdmin = groupMetadata.participants.find(
            p => p.id === actorJid && (p.admin === 'admin' || p.admin === 'superadmin')
          );
          
          if (isActorAdmin) {
            await sock.groupParticipantsUpdate(groupId, [actorJid], 'demote');
            
            await sock.sendMessage(groupId, {
              text: `⬇️ *Admin Demoted*\n\n👤 @${actorNumber}\n📌 Reason: Unauthorized promotion attempt`,
              mentions: [actorJid]
            });
          }
          
        } catch (demoteError) {
          console.error('Failed to demote user:', demoteError);
        }
      }
      
      // Save stats
      saveSettings(settings);
      
      // Notify owner if enabled
      if (settings.notifyOwner) {
        const ownerJid = extra.getOwnerJid();
        if (ownerJid) {
          await sock.sendMessage(ownerJid, {
            text: `👑 *Owner Alert*\n\n` +
                  `📍 *Group:* ${groupId}\n` +
                  `👤 *Actor:* @${actorNumber}\n` +
                  `👥 *Target:* @${participantJid.split('@')[0]}\n` +
                  `📌 *Action:* Promotion attempt blocked\n` +
                  `⚡ *Result:* ${settings.action} applied`,
            mentions: [actorJid, participantJid]
          });
        }
      }
    }
    
  } catch (error) {
    console.error('AntiPromote handler error:', error);
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
      return extra.reply('❌ *Anti-Promote can only be used in groups!*');
    }
    
    if (!isAdmin && !isOwner) {
      return extra.reply('❌ *Only group admins can use this command!*');
    }
    
    const settings = loadSettings();
    const isEnabled = settings.enabled && settings.enabledGroups?.includes(chatId);
    
    if (!args[0]) {
      const actionText = {
        'delete': '🔄 Revert',
        'warn': '⚠️ Warn',
        'kick': '👢 Kick',
        'demote': '⬇️ Demote'
      }[settings.action] || settings.action;
      
      return extra.reply(`╔══════════════════════╗
║  🛡️ *ANTI-PROMOTE*  🛡️  ║
╚══════════════════════╝

📊 *Status:* ${isEnabled ? '✅ Enabled' : '❌ Disabled'}
⚙️ *Action:* ${actionText}
⚠️ *Warn Count:* ${settings.warnCount}
👑 *Ignore Owner:* ${settings.ignoreOwner ? '✅' : '❌'}
👥 *Allowed Admins:* ${settings.allowedAdmins.length}

━━━━━━━━━━━━━━━━━━━
📋 *Commands:*
• .apm on - Enable anti-promote
• .apm off - Disable anti-promote
• .apm action <delete/warn/kick/demote>
• .apm warncount <number>
• .apm allow @admin - Add allowed admin
• .apm remove @admin - Remove allowed admin
• .apm list - Show allowed admins
• .apm ignoreowner <on/off>
• .apm stats - Show statistics

━━━━━━━━━━━━━━━━━━━
💡 *Actions:*
• delete - Revert promotion/demotion
• warn - Warn unauthorized users
• kick - Kick unauthorized users
• demote - Demote the actor

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
      return extra.reply(`✅ *Anti-Promote enabled for this group!*`);
    }
    
    if (opt === 'off') {
      settings.enabledGroups = (settings.enabledGroups || []).filter(id => id !== chatId);
      settings.enabled = settings.enabledGroups.length > 0;
      saveSettings(settings);
      return extra.reply(`❌ *Anti-Promote disabled for this group!*`);
    }
    
    // Handle action
    if (opt === 'action') {
      const action = args[1]?.toLowerCase();
      if (!action || !['delete', 'warn', 'kick', 'demote'].includes(action)) {
        return extra.reply('❌ *Invalid action!*\n\nAvailable: delete, warn, kick, demote');
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
    
    // Handle allow admin
    if (opt === 'allow') {
      const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid;
      if (!mentioned || mentioned.length === 0) {
        return extra.reply('❌ *Please mention an admin to allow!*\n\nExample: .apm allow @admin');
      }
      
      const adminJid = mentioned[0];
      settings.allowedAdmins = settings.allowedAdmins || [];
      
      if (!settings.allowedAdmins.includes(adminJid)) {
        settings.allowedAdmins.push(adminJid);
        saveSettings(settings);
        return extra.reply(`✅ *Added @${adminJid.split('@')[0]} to allowed admins!*`);
      } else {
        return extra.reply(`❌ *This admin is already allowed!*`);
      }
    }
    
    // Handle remove admin
    if (opt === 'remove') {
      const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid;
      if (!mentioned || mentioned.length === 0) {
        return extra.reply('❌ *Please mention an admin to remove!*\n\nExample: .apm remove @admin');
      }
      
      const adminJid = mentioned[0];
      settings.allowedAdmins = settings.allowedAdmins || [];
      
      const index = settings.allowedAdmins.indexOf(adminJid);
      if (index > -1) {
        settings.allowedAdmins.splice(index, 1);
        saveSettings(settings);
        return extra.reply(`✅ *Removed @${adminJid.split('@')[0]} from allowed admins!*`);
      } else {
        return extra.reply(`❌ *This admin is not in the allowed list!*`);
      }
    }
    
    // Handle list allowed admins
    if (opt === 'list') {
      const allowed = settings.allowedAdmins || [];
      if (allowed.length === 0) {
        return extra.reply('📋 *Allowed Admins*\n\nNo admins in allow list.\n\nUse .apm allow @admin to add.');
      }
      
      const list = allowed.map((jid, i) => `${i+1}. @${jid.split('@')[0]}`).join('\n');
      return extra.reply(`📋 *Allowed Admins (${allowed.length})*\n\n${list}`);
    }
    
    // Handle ignoreowner
    if (opt === 'ignoreowner') {
      const value = args[1]?.toLowerCase();
      if (value === 'on') {
        settings.ignoreOwner = true;
        saveSettings(settings);
        return extra.reply('✅ *Owner will now be ignored*');
      } else if (value === 'off') {
        settings.ignoreOwner = false;
        saveSettings(settings);
        return extra.reply('❌ *Owner will now be monitored*');
      } else {
        return extra.reply('❌ *Use: .apm ignoreowner on  or  .apm ignoreowner off*');
      }
    }
    
    // Handle stats
    if (opt === 'stats') {
      return extra.reply(`📊 *ANTI-PROMOTE STATISTICS*\n\n` +
        `🛡️ Prevented: ${settings.stats.totalPrevented}\n` +
        `⚠️ Warnings: ${settings.stats.totalWarned}\n` +
        `👢 Kicked: ${settings.stats.totalKicked}\n` +
        `⏰ Last Action: ${settings.stats.lastAction ? new Date(settings.stats.lastAction).toLocaleString() : 'Never'}`);
    }
    
    extra.reply('❌ *Invalid option.* Use .apm for help.');
    
  } catch (error) {
    console.error('[AntiPromote] error:', error);
    extra.reply(`❌ Error: ${error.message}`);
  }
}

module.exports = {
  name: 'antipromote',
  aliases: ['apm', 'nopromote'],
  category: 'admin',
  description: 'Prevent unauthorized promotions/demotions',
  usage: '.apm <on/off/action/allow>',
  
  async execute(sock, msg, args, extra) {
    return execute(sock, msg, args, extra);
  },
  
  handleAntiPromote
};