/**
 * Sticker to Image Command
 * Converts a sticker back into a viewable photo
 */

const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const { getRandom } = require('../utils/helpers'); // Ensure you have a helper for random filenames

module.exports = {
  name: 'toimg',
  aliases: ['stoimg', 'toimage'],
  description: 'Convert a sticker to an image',
  category: 'tools',

  async execute(sock, msg, args, extra) {
    const chatId = extra.from;
    const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;

    try {
      // 1. Check if the user replied to a sticker
      if (!quoted || !quoted.stickerMessage) {
        return extra.reply('❌ Please reply to a *sticker* to convert it to an image.');
      }

      // 2. Prevent converting animated stickers (they require GIF conversion)
      if (quoted.stickerMessage.isAnimated) {
        return extra.reply('❌ This is an animated sticker. Please use a static sticker.');
      }

      // 3. Download the sticker
      const stream = await downloadContentFromMessage(quoted.stickerMessage, 'sticker');
      let buffer = Buffer.from([]);
      for await (const chunk of stream) {
        buffer = Buffer.concat([buffer, chunk]);
      }

      // 4. Temporary file paths
      const inputPath = path.join(__dirname, `../temp/${Date.now()}.webp`);
      const outputPath = path.join(__dirname, `../temp/${Date.now()}.png`);

      if (!fs.existsSync(path.join(__dirname, '../temp'))) {
        fs.mkdirSync(path.join(__dirname, '../temp'));
      }

      fs.writeFileSync(inputPath, buffer);

      // 5. Convert WebP to PNG using ffmpeg or similar tools usually pre-installed on servers
      exec(`ffmpeg -i ${inputPath} ${outputPath}`, async (err) => {
        if (err) {
          console.error(err);
          fs.unlinkSync(inputPath);
          return extra.reply('❌ Failed to convert sticker to image.');
        }

        const imageBuffer = fs.readFileSync(outputPath);

        // 6. Send the image with your signature branding
        await sock.sendMessage(chatId, {
          image: imageBuffer,
          caption: `✅ *CONVERTED TO IMAGE*\n\n> 𝑃ᴏᴡᴇʀᴇᴅ ʙʏ 𝑂𝑃𝑇𝐼𝑀𝑈𝑆 𝑃𝑅𝐼𝑀𝐸`,
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

        // 7. Cleanup temp files
        fs.unlinkSync(inputPath);
        fs.unlinkSync(outputPath);
      });

      // Confirm with reaction
      await sock.sendMessage(chatId, { react: { text: '🖼️', key: msg.key } });

    } catch (error) {
      console.error('ToImg Error:', error);
      await extra.reply(`❌ Error: ${error.message}`);
    }
  }
};