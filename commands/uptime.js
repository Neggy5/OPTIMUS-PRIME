/**
 * Uptime Command - Displays how long the bot has been active
 */
const config = require('../config');

module.exports = {
  name: 'uptime',
  aliases: ['runtime', 'up'],
  description: 'Shows the bot active duration',
  category: 'system',

  async execute(sock, msg, args, extra) {
    try {
      const uptimeSeconds = process.uptime();
      
      // Calculate time components
      const days = Math.floor(uptimeSeconds / (3600 * 24));
      const hours = Math.floor((uptimeSeconds % (3600 * 24)) / 3600);
      const minutes = Math.floor((uptimeSeconds % 3600) / 60);
      const seconds = Math.floor(uptimeSeconds % 60);

      // Clean, structured display
      const uptimeDisplay = `
┌───『 *${config.botName?.toUpperCase() || 'SYSTEM'}* 』───┐
┆  ⏳ *Uptime:* ${days}d ${hours}h ${minutes}m ${seconds}s
┆  📊 *Status:* Online & Stable
┆  📡 *Host:* Active Node
└──────────────────────────┘
      `.trim();

      await sock.sendMessage(extra.from, {
        text: uptimeDisplay,
        contextInfo: {
          forwardingScore: 999,
          isForwarded: true,
          externalAdReply: {
            title: `${config.botName} Runtime Statistics`,
            body: `Operational for ${days} days`,
            thumbnailUrl: config.thumb || 'https://files.catbox.moe/h9bo62.jpg',
            sourceUrl: config.channelUrl || 'https://whatsapp.com/channel/0029VbCUOf389inrrurd6n1z',
            mediaType: 1,
            renderLargerThumbnail: true
          }
        }
      }, { quoted: msg });

      await extra.react(' Ready to link... 🔋'); // Using reaction logic from provided context

    } catch (error) {
      console.error('Uptime Error:', error); // Log error
      await extra.reply('❌ Failed to retrieve runtime data.');
    }
  }
};