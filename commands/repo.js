/**
 * Repo Command - Displays Bot Repository Information
 */
const axios = require('axios');
const config = require('../config');

module.exports = {
  name: 'repo',
  aliases: ['script', 'sc', 'source'],
  description: 'Get the bot source code repository',
  category: 'system',

  async execute(sock, msg, args, extra) {
    try {
      const repoUrl = "https://github.com/Neggy5/OPTIMUS-PRIME";
      const apiUrl = "https://api.github.com/repos/Neggy5/OPTIMUS-PRIME";
      
      // Fetch real-time data from GitHub API
      const response = await axios.get(apiUrl).catch(() => null);
      const data = response ? response.data : {
        stargazers_count: '10+',
        forks_count: '5+',
        watchers_count: '10+'
      };

      const repoInfo = `
┌───『 *REPOSITORY* 』───┐
┆ 🤖 *Name:* OPTIMUS PRIME
┆ 👤 *Owner:* Neggy5
┆ ⭐ *Stars:* ${data.stargazers_count}
┆ 🍴 *Forks:* ${data.forks_count}
┆ 👁️ *Watchers:* ${data.watchers_count}
┆ 🛡️ *License:* Apache-2.0
└──────────────────────────┘

🔗 *Link:* ${repoUrl}.git

> 𝑃ᴏᴡᴇʀᴇᴅ ʙʏ 𝑂𝑃𝑇𝐼𝑀𝑈𝑆 𝑃𝑅𝐼𝑀𝐸`.trim();

      await sock.sendMessage(extra.from, {
        text: repoInfo,
        contextInfo: {
          forwardingScore: 999,
          isForwarded: true,
          externalAdReply: {
            title: "OPTIMUS PRIME - Official Script",
            body: "Multi-Device WhatsApp Bot",
            thumbnailUrl: "https://files.catbox.moe/h9bo62.jpg", // Replace with your repo logo
            mediaType: 1,
            renderLargerThumbnail: true,
            sourceUrl: repoUrl
          }
        }
      }, { quoted: msg });

      await extra.react('📂');

    } catch (error) {
      console.error('Repo Command Error:', error);
      await extra.reply(`❌ *Error:* ${repoUrl}.git`);
    }
  }
};
