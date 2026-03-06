/**
 * Take Command - Change sticker metadata
 */
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const { Sticker, createSticker, StickerTypes } = require('wa-sticker-formatter');
const config = require('../config');

module.exports = {
  name: 'take',
  aliases: ['wm', 'steal', 'swm'],
  description: 'Change the metadata of a sticker',
  category: 'tools',

  async execute(sock, msg, args, extra) {
    const chatId = extra.from;
    const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;

    try {
      // 1. Check if replying to a sticker
      if (!quoted || !quoted.stickerMessage) {
        return extra.reply('❌ Please reply to a *sticker* to change its metadata.');
      }

      // 2. Define Pack and Author (Use arguments or default config)
      const packName = args.join(' ').split('|')[0] || config.botName || '𝑂𝑃𝑇𝐼𝑀𝑈𝑆 𝑃𝑅𝐼𝑀𝐸';
      const author = args.join(' ').split('|')[1] || '🤖 Bot';

      // 3. Download the sticker using Baileys utility
      const stream = await downloadContentFromMessage(quoted.stickerMessage, 'sticker');
      let buffer = Buffer.from([]);
      for await (const chunk of stream) {
        buffer = Buffer.concat([buffer, chunk]);
      }

      // 4. Re-create the sticker with new metadata
      const sticker = new Sticker(buffer, {
        pack: packName,
        author: author,
        type: StickerTypes.FULL,
        categories: ['🤩', '🎉'],
        id: msg.key.id,
        quality: 70,
      });

      const stickerBuffer = await sticker.toBuffer();

      // 5. Send the new sticker back
      await sock.sendMessage(chatId, { sticker: stickerBuffer }, { quoted: msg });
      
      // 6. Reaction feedback
      await sock.sendMessage(chatId, { react: { text: '✅', key: msg.key } });

    } catch (error) {
      console.error('Take Command Error:', error);
      await extra.reply(`❌ Failed to update sticker: ${error.message}`);
    }
  }
};