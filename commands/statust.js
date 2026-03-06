const os = require('os');
const config = require('../config');

module.exports = {
  name: 'status',
  aliases: ['info', 'botstat'],
  category: 'system',
  description: 'Show bot hardware status',

  async execute(sock, msg, args, extra) {
    const uptime = process.uptime();
    const ram = (process.memoryUsage().rss / 1024 / 1024).toFixed(2);
    const totalRam = (os.totalmem() / 1024 / 1024 / 1024).toFixed(2);
    const platform = os.platform();

    const statusMsg = `
┌───『 *BOT SYSTEM INFO* 』───┐
┆ ⏳ *Uptime:* ${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m
┆ 💾 *RAM:* ${ram}MB / ${totalRam}GB
┆ ⚙️ *Platform:* ${platform}
┆ 🛰️ *Node:* ${process.version}
┆ 🔋 *Status:* Stable
└──────────────────────────┘
\n> 𝑃ᴏᴡᴇʀᴇᴅ ʙʏ 𝑂𝑃𝑇𝐼𝑀𝑈𝑆 𝑃𝑅𝐼𝑀𝐸`.trim();

    await sock.sendMessage(extra.from, { 
        text: statusMsg,
        contextInfo: {
            externalAdReply: {
                title: `${config.botName} System Monitor`,
                body: `Memory Usage: ${ram}MB`,
                thumbnailUrl: 'https://files.catbox.moe/h9bo62.jpg', // Replace with your logo
                mediaType: 1,
                sourceUrl: config.channelUrl
            }
        }
    }, { quoted: msg });
  }
};