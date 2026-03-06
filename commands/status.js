/**
 * Status Downloader - Save WhatsApp status updates
 */

const { downloadContentFromMessage } = require('@whiskeysockets/baileys');

module.exports = {
  name: 'status',
  aliases: ['save', 'dlstatus'],
  description: 'Download WhatsApp status updates',
  
  async execute(sock, msg, args, extra) {
    const chatId = extra.from;
    const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;

    try {
      if (!quoted) {
        return extra.reply('❌ Please reply to a status update to download it.');
      }

      // Identify media type
      let mediaMessage = quoted.imageMessage || quoted.videoMessage || quoted.audioMessage;
      let type = quoted.imageMessage ? 'image' : quoted.videoMessage ? 'video' : quoted.audioMessage ? 'audio' : null;
      
      // Handle Text Status
      if (!mediaMessage && (quoted.conversation || quoted.extendedTextMessage)) {
        const text = quoted.conversation || quoted.extendedTextMessage?.text;
        return await sock.sendMessage(chatId, {
          text: `📝 *TEXT STATUS*\n\n${text}\n\n> 𝑃ᴏᴡᴇʀᴇᴅ ʙʏ 𝑂𝑃𝑇𝐼𝑀𝑈𝑆 𝑃𝑅𝐼𝑀𝐸`,
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
      }

      if (!mediaMessage) return extra.reply('❌ Could not find any status media to download.');

      // Download content
      const stream = await downloadContentFromMessage(mediaMessage, type);
      let buffer = Buffer.from([]);
      for await (const chunk of stream) {
        buffer = Buffer.concat([buffer, chunk]);
      }

      const caption = `✅ *STATUS DOWNLOADED*\n\n> 𝑃ᴏᴡᴇʀᴇᴅ ʙʏ 𝑂𝑃𝑇𝐼𝑀𝑈𝑆 𝑃𝑅𝐼𝑀𝐸`;
      const context = {
        forwardingScore: 999,
        isForwarded: true,
        forwardedNewsletterMessageInfo: {
          newsletterJid: '120363405724402785@newsletter',
          newsletterName: '𝑂𝑃𝑇𝐼𝑀𝑈𝑆 𝑃𝑅𝐼𝑀𝐸',
          serverMessageId: -1
        }
      };

      // Send the downloaded media
      if (type === 'image') {
        await sock.sendMessage(chatId, { image: buffer, caption, contextInfo: context }, { quoted: msg });
      } else if (type === 'video') {
        await sock.sendMessage(chatId, { video: buffer, caption, contextInfo: context }, { quoted: msg });
      } else if (type === 'audio') {
        await sock.sendMessage(chatId, { audio: buffer, mimetype: 'audio/mp4', contextInfo: context }, { quoted: msg });
      }

      // Confirm with reaction
      await sock.sendMessage(chatId, { react: { text: '📥', key: msg.key } });

    } catch (error) {
      console.error('Status Error:', error);
      await extra.reply(`❌ Failed to download status: ${error.message}`);
    }
  }
};