/**
 * Set Profile Picture Command
 */
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');

module.exports = {
  name: 'setpp',
  aliases: ['setpic', 'setavatar'],
  category: 'owner',
  description: 'Change bot profile picture',
  ownerOnly: true,
  
  async execute(sock, msg, args, extra) {
    const chatId = extra.from;
    const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    const imageMessage = quoted?.imageMessage;

    try {
      if (!imageMessage) {
        return extra.reply('❌ Please reply to an image to set the profile picture.');
      }

      // Download the image
      const stream = await downloadContentFromMessage(imageMessage, 'image');
      let buffer = Buffer.from([]);
      for await (const chunk of stream) {
        buffer = Buffer.concat([buffer, chunk]);
      }

      // Update Profile Picture
      await sock.updateProfilePicture(sock.user.id, buffer);

      // Success message with newsletter context
      await sock.sendMessage(chatId, {
        text: `✅ *PROFILE UPDATED*\n\n` +
             `The bot profile picture has been changed successfully.\n` +
             `Updated by: @${extra.sender.split('@')[0]}`,
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

      // Confirm with reaction
      await sock.sendMessage(chatId, { react: { text: '📸', key: msg.key } });

    } catch (error) {
      console.error('SetPP Error:', error);
      await extra.reply(`❌ Failed to update profile picture: ${error.message}`);
    }
  }
};