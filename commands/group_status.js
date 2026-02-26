/**
 * Group Status Command - Post announcements as status updates
 */

const fs = require('fs');
const path = require('path');

// Store group status settings
const groupStatusSettings = new Map();

// Database path for persistent storage
const DB_PATH = path.join(__dirname, '../database/groupstatus.json');

// Load settings
const loadSettings = () => {
  try {
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    if (fs.existsSync(DB_PATH)) {
      const data = fs.readFileSync(DB_PATH, 'utf8');
      const parsed = JSON.parse(data);
      // Convert array back to Map
      if (Array.isArray(parsed)) {
        parsed.forEach(([key, value]) => {
          groupStatusSettings.set(key, value);
        });
      }
    }
  } catch (error) {
    console.error('Error loading group status settings:', error);
  }
};

// Save settings
const saveSettings = () => {
  try {
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    // Convert Map to array for JSON serialization
    const data = Array.from(groupStatusSettings.entries());
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error('Error saving group status settings:', error);
    return false;
  }
};

// Initialize by loading settings
loadSettings();

// Store active status timers
const statusTimers = new Map();

module.exports = {
  name: 'groupstatus',
  aliases: ['gstatus', 'announce', 'statuspost'],
  category: 'admin',
  description: 'Post announcements as status updates',
  usage: '.gstatus <message/reply to media>',
  
  async execute(sock, msg, args, extra) {
    try {
      const chatId = extra.from;
      const sender = extra.sender;
      const isGroup = extra.isGroup;
      const isAdmin = extra.isAdmin;
      const isOwner = extra.isOwner;
      
      // Check permissions
      if (!isAdmin && !isOwner) {
        return extra.reply('❌ *Only group admins can use this command!*');
      }
      
      // Check if in group
      if (!isGroup) {
        return extra.reply('❌ *This command can only be used in groups!*');
      }
      
      // Get group info
      const groupMetadata = extra.groupMetadata;
      const groupName = groupMetadata?.subject || 'This group';
      const groupPic = await sock.profilePictureUrl(chatId, 'image').catch(() => null);
      
      // Check if replying to a message
      const quotedMsg = msg.message?.extendedTextMessage?.contextInfo;
      const quotedMessage = quotedMsg?.quotedMessage;
      
      // Get message content
      let text = args.join(' ').trim();
      
      if (!text && !quotedMessage) {
        // Show current group status settings
        const settings = groupStatusSettings.get(chatId) || {
          enabled: false,
          duration: 24, // hours
          template: 'default',
          lastPosted: null
        };
        
        const status = settings.enabled ? '✅ Enabled' : '❌ Disabled';
        const durationText = settings.duration === 24 ? '24 hours' : 
                            settings.duration === 12 ? '12 hours' : 
                            settings.duration === 6 ? '6 hours' : 'Custom';
        
        return extra.reply(`╔══════════════════════╗
║  📢 *GROUP STATUS*  📢  ║
╚══════════════════════╝

📊 *Status:* ${status}
👥 *Group:* ${groupName}
⏱️ *Duration:* ${durationText}
📝 *Last Posted:* ${settings.lastPosted ? new Date(settings.lastPosted).toLocaleString() : 'Never'}

━━━━━━━━━━━━━━━━━━━
📋 *Commands:*
• .gstatus on - Enable status posts
• .gstatus off - Disable status posts
• .gstatus <message> - Post text status
• Reply to image/video with .gstatus
• .gstatus duration <hours> - Set duration (1-48)
• .gstatus template - Show templates
• .gstatus preview - Preview current status

━━━━━━━━━━━━━━━━━━━
💡 *Examples:*
• .gstatus Group meeting tomorrow!
• Reply to image: .gstatus
• .gstatus duration 12
• .gstatus template announcement

> *ᴘᴏᴡᴇʀᴇᴅ ʙʏ 𝑂𝑃𝑇𝐼𝑀𝑈𝑆 𝑃𝑅𝐼𝑀𝐸*`);
      }
      
      // Handle subcommands
      if (args[0]?.toLowerCase() === 'on') {
        const settings = groupStatusSettings.get(chatId) || {
          enabled: false,
          duration: 24,
          template: 'default',
          lastPosted: null
        };
        settings.enabled = true;
        groupStatusSettings.set(chatId, settings);
        saveSettings();
        
        return extra.reply(`✅ *Group Status enabled!*\n\nGroup announcements will now be posted as status updates.\nDuration: ${settings.duration} hours`);
      }
      
      if (args[0]?.toLowerCase() === 'off') {
        const settings = groupStatusSettings.get(chatId);
        if (settings) {
          settings.enabled = false;
          groupStatusSettings.set(chatId, settings);
          saveSettings();
        }
        
        return extra.reply('❌ *Group Status disabled!*');
      }
      
      if (args[0]?.toLowerCase() === 'duration') {
        const hours = parseInt(args[1]);
        if (!hours || hours < 1 || hours > 48) {
          return extra.reply('❌ *Invalid duration!*\n\nPlease provide hours between 1 and 48.\nExample: .gstatus duration 24');
        }
        
        const settings = groupStatusSettings.get(chatId) || {
          enabled: false,
          duration: 24,
          template: 'default',
          lastPosted: null
        };
        settings.duration = hours;
        groupStatusSettings.set(chatId, settings);
        saveSettings();
        
        return extra.reply(`✅ *Status duration set to ${hours} hours!*`);
      }
      
      if (args[0]?.toLowerCase() === 'template') {
        const template = args[1]?.toLowerCase();
        
        if (!template) {
          return extra.reply(`📋 *Available Templates:*\n\n` +
            `1. *default* - 📢 [Group Name] Announcement\n` +
            `2. *announcement* - 📢 OFFICIAL ANNOUNCEMENT\n` +
            `3. *friendly* - 👋 Hey everyone!\n` +
            `4. *urgent* - ⚠️ URGENT MESSAGE\n` +
            `5. *event* - 🎉 Event Reminder\n\n` +
            `Usage: .gstatus template <name>\n` +
            `Example: .gstatus template announcement`);
        }
        
        const validTemplates = ['default', 'announcement', 'friendly', 'urgent', 'event'];
        if (!validTemplates.includes(template)) {
          return extra.reply('❌ *Invalid template!*\n\nUse .gstatus template to see available templates.');
        }
        
        const settings = groupStatusSettings.get(chatId) || {
          enabled: false,
          duration: 24,
          template: 'default',
          lastPosted: null
        };
        settings.template = template;
        groupStatusSettings.set(chatId, settings);
        saveSettings();
        
        return extra.reply(`✅ *Template set to "${template}"!*`);
      }
      
      if (args[0]?.toLowerCase() === 'preview') {
        const settings = groupStatusSettings.get(chatId) || {
          enabled: false,
          duration: 24,
          template: 'default',
          lastPosted: null
        };
        
        const previewText = generateStatusText({
          groupName,
          sender: sender.split('@')[0],
          message: 'This is a preview of your status message.',
          template: settings.template
        });
        
        return extra.reply(`📋 *PREVIEW*\n\n${previewText}\n\n*Template:* ${settings.template}`);
      }
      
      // Check if group status is enabled
      const settings = groupStatusSettings.get(chatId);
      if (!settings || !settings.enabled) {
        return extra.reply('❌ *Group Status is not enabled!*\n\nEnable it first with: .gstatus on');
      }
      
      // Send processing message
      const processingMsg = await sock.sendMessage(chatId, {
        text: '📤 *Posting to status...*'
      }, { quoted: msg });
      
      try {
        let statusContent;
        let statusType = 'text';
        let statusText = text;
        
        // Handle media status
        if (quotedMessage) {
          if (quotedMessage.imageMessage) {
            statusType = 'image';
            // Download image
            const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
            const stream = await downloadContentFromMessage(quotedMessage.imageMessage, 'image');
            let buffer = Buffer.from([]);
            for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);
            statusContent = buffer;
          } else if (quotedMessage.videoMessage) {
            statusType = 'video';
            // Download video
            const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
            const stream = await downloadContentFromMessage(quotedMessage.videoMessage, 'video');
            let buffer = Buffer.from([]);
            for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);
            statusContent = buffer;
          } else if (quotedMessage.conversation || quotedMessage.extendedTextMessage) {
            statusType = 'text';
            statusText = quotedMessage.conversation || quotedMessage.extendedTextMessage?.text || statusText;
          }
        }
        
        // Generate status text with template
        const finalStatusText = generateStatusText({
          groupName,
          sender: sender.split('@')[0],
          message: statusText,
          template: settings.template
        });
        
        // Post to status (this is the actual WhatsApp status)
        // Note: Posting to status requires special handling in Baileys
        // This is a simplified version - actual implementation may vary
        
        // For now, we'll simulate by sending to the group with special formatting
        const statusMessage = {
          text: `📱 *GROUP STATUS UPDATE*\n\n${finalStatusText}\n\n⏱️ *Posted:* ${new Date().toLocaleString()}\n👥 *Group:* ${groupName}`,
          contextInfo: {
            forwardingScore: 999,
            isForwarded: true,
            forwardedNewsletterMessageInfo: {
              newsletterJid: '120363405724402785@newsletter',
              newsletterName: '𝑂𝑃𝑇𝐼𝑀𝑈𝑆 𝑃𝑅𝐼𝑀𝐸',
              serverMessageId: -1
            }
          }
        };
        
        if (statusType === 'image') {
          await sock.sendMessage('status@broadcast', {
            image: statusContent,
            caption: finalStatusText
          });
          await sock.sendMessage(chatId, {
            image: statusContent,
            caption: statusMessage.text
          });
        } else if (statusType === 'video') {
          await sock.sendMessage('status@broadcast', {
            video: statusContent,
            caption: finalStatusText
          });
          await sock.sendMessage(chatId, {
            video: statusContent,
            caption: statusMessage.text
          });
        } else {
          await sock.sendMessage('status@broadcast', {
            text: finalStatusText
          });
          await sock.sendMessage(chatId, statusMessage);
        }
        
        // Update last posted time
        settings.lastPosted = Date.now();
        groupStatusSettings.set(chatId, settings);
        saveSettings();
        
        // Set timer to expire status (not directly possible, but we track it)
        if (statusTimers.has(chatId)) {
          clearTimeout(statusTimers.get(chatId));
        }
        
        const expiryTimer = setTimeout(() => {
          console.log(`[GroupStatus] Status expired for ${groupName}`);
          statusTimers.delete(chatId);
        }, settings.duration * 60 * 60 * 1000);
        
        statusTimers.set(chatId, expiryTimer);
        
        // Delete processing message
        await sock.sendMessage(chatId, { delete: processingMsg.key });
        
        // Send success message
        await sock.sendMessage(chatId, {
          text: `✅ *Status posted successfully!*\n\n📌 *Group:* ${groupName}\n⏱️ *Duration:* ${settings.duration} hours\n👤 *Posted by:* @${sender.split('@')[0]}`,
          mentions: [sender]
        });
        
      } catch (postError) {
        console.error('Status post error:', postError);
        await sock.sendMessage(chatId, { delete: processingMsg.key });
        await sock.sendMessage(chatId, {
          text: `❌ *Failed to post status:*\n${postError.message}`
        });
      }
      
    } catch (error) {
      console.error('GroupStatus error:', error);
      extra.reply(`❌ Error: ${error.message}`);
    }
  }
};

// Helper function to generate status text with templates
function generateStatusText({ groupName, sender, message, template }) {
  const now = new Date();
  const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  const dateStr = now.toLocaleDateString('en-US', { 
    weekday: 'short', 
    month: 'short', 
    day: 'numeric' 
  });
  
  const templates = {
    default: `📢 *${groupName} Announcement*\n\n${message}\n\n─\nPosted by: ${sender}\n🕐 ${timeStr} • ${dateStr}`,
    
    announcement: `📢 *OFFICIAL ANNOUNCEMENT*\n\nFrom: *${groupName}*\n\n${message}\n\n─\nAdmin: ${sender}\n📅 ${dateStr} at ${timeStr}`,
    
    friendly: `👋 Hey everyone from *${groupName}*!\n\n${message}\n\n─\nSent by: ${sender}\n💬 ${timeStr} • ${dateStr}`,
    
    urgent: `⚠️ *URGENT MESSAGE*\n\nGroup: *${groupName}*\n\n${message}\n\n─\n⚠️ Please read carefully\nFrom: ${sender}\n⏰ ${timeStr} • ${dateStr}`,
    
    event: `🎉 *EVENT REMINDER*\n\n📍 *${groupName}*\n\n${message}\n\n─\nHosted by: ${sender}\n📅 ${dateStr} at ${timeStr}`
  };
  
  return templates[template] || templates.default;
}