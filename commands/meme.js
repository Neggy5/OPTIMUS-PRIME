const axios = require('axios');
const config = require('../config');

module.exports = {
  name: 'meme',
  description: 'Get a random meme',
  category: 'fun',

  async execute(sock, msg, args, extra) {
    try {
      const res = await axios.get('https://meme-api.com/gimme');
      const { url, title, postLink } = res.data;

      await sock.sendMessage(extra.from, {
        image: { url: url },
        caption: `🖼️ *${title}*\n\n🔗 Source: ${postLink}\n\n> 𝑃ᴏᴡᴇʀᴇᴅ ʙʏ 𝑂𝑃𝑇𝐼𝑀𝑈𝑆 𝑃𝑅𝐼𝑀𝐸`,
        contextInfo: {
          forwardingScore: 999,
          isForwarded: true,
          forwardedNewsletterMessageInfo: {
            newsletterJid: '120363405724402785@newsletter',
            newsletterName: config.botName,
            serverMessageId: -1
          }
        }
      }, { quoted: msg });
      
      await extra.react('🤣');
    } catch (e) {
      await extra.reply('❌ Failed to fetch a meme.');
    }
  }
};