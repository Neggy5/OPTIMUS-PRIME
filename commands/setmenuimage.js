/**
 * Set Menu Image Command - Change menu background image
 */

const fs = require('fs');
const path = require('path');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');

module.exports = {
  name: 'setmenuimage',
  aliases: ['setmenu', 'menupic'],
  category: 'owner',
  description: 'Change menu background image',
  usage: '.setmenuimage (reply to image)',
  ownerOnly: true,
  
  async execute(sock, msg, args, extra) {
    try {
      const chatId = extra.from;
      
      // Check if replying to an image
      const quotedMsg = msg.message?.extendedTextMessage?.contextInfo;
      const quotedMessage = quotedMsg?.quotedMessage;
      
      if (!quotedMessage?.imageMessage) {
        return extra.reply(`╔══════════════════════╗
║  🖼️ *SET MENU IMAGE*  ║
╚══════════════════════╝

❌ *Please reply to an image!*

📌 *Usage:*
• Reply to any image with .setmenuimage

💡 *The image will be used as menu background*

✅ *Supported formats:* JPG, PNG, JPEG
📏 *Recommended size:* 800x400 pixels

> *ᴘᴏᴡᴇʀᴇᴅ ʙʏ 𝑂𝑃𝑇𝐼𝑀𝑈𝑆 𝑃𝑅𝐼𝑀𝐸*`);
      }
      
      // Send processing message
      const processingMsg = await sock.sendMessage(chatId, {
        text: '🖼️ *Setting menu image...*'
      }, { quoted: msg });
      
      try {
        // Download image
        const stream = await downloadContentFromMessage(quotedMessage.imageMessage, 'image');
        let buffer = Buffer.from([]);
        
        for await (const chunk of stream) {
          buffer = Buffer.concat([buffer, chunk]);
        }
        
        if (buffer.length === 0) {
          throw new Error('Downloaded buffer is empty');
        }
        
        // Save as menu image
        const menuImagePath = path.join(__dirname, '../utils/menu_image.jpg');
        const botImagePath = path.join(__dirname, '../utils/bot_image.jpg');
        
        // Save as menu image
        fs.writeFileSync(menuImagePath, buffer);
        
        // Also save as bot image for fallback
        fs.writeFileSync(botImagePath, buffer);
        
        // Delete processing message
        await sock.sendMessage(chatId, { delete: processingMsg.key });
        
        // Send success message with preview
        await sock.sendMessage(chatId, {
          image: buffer,
          caption: `✅ *Menu image set successfully!*\n\n📏 Size: ${(buffer.length / 1024).toFixed(2)} KB\n🖼️ Resolution: ${quotedMessage.imageMessage.width || '?'}x${quotedMessage.imageMessage.height || '?'}\n\nUse .menu to see the new image.`,
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
        
      } catch (downloadError) {
        console.error('Download error:', downloadError);
        await sock.sendMessage(chatId, { delete: processingMsg.key });
        await extra.reply(`❌ *Failed to set menu image:*\n${downloadError.message}`);
      }
      
    } catch (error) {
      console.error('SetMenuImage Error:', error);
      await extra.reply(`❌ Error: ${error.message}`);
    }
  }
};