/**
 * Set Profile Picture Command - Change bot's profile picture
 */

const axios = require('axios');

module.exports = {
  name: 'setpp',
  aliases: ['setpic', 'setavatar', 'changepic'],
  category: 'owner',
  description: 'Change bot profile picture',
  usage: '.setpp (reply to image)',
  
  async execute(sock, msg, args, extra) {
    try {
      // Check if user is owner
      if (!extra.isOwner) {
        return extra.reply('❌ *Owner only command!*\n\nOnly the bot owner can change the profile picture.');
      }
      
      // Check if it's a reply
      const quotedMessage = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
      
      if (!quotedMessage) {
        return extra.reply(`╔══════════════════════╗
║  🖼️ *SET PROFILE PIC*  ║
╚══════════════════════╝

❌ *Please reply to an image!*

📌 *Usage:*
• Reply to an image with .setpp

💡 *Example:*
• Send an image and reply with .setpp

⚠️ *Note:*
• Image will be used as bot's profile picture
• Recommended size: 640x640
• Max size: 5MB`);
      }
      
      // Check if replied message contains an image
      const imageMessage = quotedMessage.imageMessage;
      
      if (!imageMessage) {
        return extra.reply('❌ *Reply to an image!*\n\nThe message you replied to does not contain an image.');
      }
      
      // Send processing message
      const processingMsg = await sock.sendMessage(extra.from, { 
        text: '🔄 *Updating profile picture...*',
        contextInfo: {
          forwardingScore: 999,
          isForwarded: true,
          forwardedNewsletterMessageInfo: {
            newsletterJid: '120363405724402785@newsletter',
            newsletterName: '𝑂𝑃𝑇𝐼𝑀𝑈𝑆 𝑃𝑅𝐼𝑀𝐸',
            serverMessageId: -1
          }
        }
      }, { quoted: msg });
      
      try {
        // Download the image using Baileys' downloadContentFromMessage
        const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
        
        const stream = await downloadContentFromMessage(imageMessage, 'image');
        let buffer = Buffer.from([]);
        
        for await (const chunk of stream) {
          buffer = Buffer.concat([buffer, chunk]);
        }
        
        // Check file size (max 5MB)
        if (buffer.length > 5 * 1024 * 1024) {
          await sock.sendMessage(extra.from, { delete: processingMsg.key });
          return extra.reply('❌ *Image too large!*\n\nMaximum size: 5MB');
        }
        
        // Update profile picture
        await sock.updateProfilePicture(sock.user.id, buffer);
        
        // Delete processing message
        await sock.sendMessage(extra.from, { delete: processingMsg.key });
        
        // Send success message
        await sock.sendMessage(extra.from, { 
          text: `╔══════════════════════╗
║  ✅ *PROFILE UPDATED*  ║
╚══════════════════════╝

🖼️ *Profile picture changed successfully!*

👤 *Updated by:* @${extra.sender.split('@')[0]}
⏱️ *Time:* ${new Date().toLocaleTimeString()}

> *ᴘᴏᴡᴇʀᴇᴅ ʙʏ 𝑂𝑃𝑇𝐼𝑀𝑈𝑆 𝑃𝑅𝐼𝑀𝐸*`,
          mentions: [extra.sender],
          contextInfo: {
            forwardingScore: 999,
            isForwarded: true,
            forwardedNewsletterMessageInfo: {
              newsletterJid: '120363405724402785@newsletter',
              newsletterName: '𝑂𝑃𝑇𝐼𝑀𝑈𝑆 𝑃𝑅𝐼𝑀𝐸',
              serverMessageId: -1
            }
          }
        }, { quoted: msg });
        
      } catch (downloadError) {
        console.error('Download error:', downloadError);
        await sock.sendMessage(extra.from, { delete: processingMsg.key });
        return extra.reply('❌ *Failed to process image!*\n\nPlease try with a different image.');
      }
      
    } catch (error) {
      console.error('SetPP Error:', error);
      extra.reply(`❌ *Error:* ${error.message}`);
    }
  }
};