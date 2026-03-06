/**
 * Mode Command - Toggle between Public and Self mode
 */
const config = require('../config');
const fs = require('fs');
const path = require('path');

module.exports = {
  name: 'mode',
  aliases: ['botmode', 'status'],
  description: 'Toggle bot between Public and Self mode',
  ownerOnly: true, // Only the owner can change the bot's visibility

  async execute(sock, msg, args, extra) {
    const targetMode = args[0]?.toLowerCase();
    
    if (targetMode !== 'public' && targetMode !== 'self') {
      return extra.reply(`*Usage:* .mode public / self\n*Current Mode:* ${config.selfMode ? 'Self 👤' : 'Public 🌐'}`);
    }

    try {
      const isSelf = targetMode === 'self';
      
      // Update config file for persistence
      const configPath = path.join(__dirname, '../config.js');
      let configContent = fs.readFileSync(configPath, 'utf8');
      
      // Use regex to find and replace the selfMode value
      configContent = configContent.replace(/(selfMode:\s*)(true|false)/g, `$1${isSelf}`);
      fs.writeFileSync(configPath, configContent, 'utf8');

      // Update runtime config
      config.selfMode = isSelf;

      const responseText = `🤖 *BOT MODE UPDATED*\n\n` +
                          `*Mode:* ${isSelf ? 'SELF (Private) 👤' : 'PUBLIC (Global) 🌐'}\n` +
                          `*Status:* ${isSelf ? 'Only the owner can use commands.' : 'Everyone can use commands.'}\n\n` +
                          `> 𝑃ᴏᴡᴇʀᴇᴅ ʙʏ 𝑂𝑃𝑇𝐼𝑀𝑈𝑆 𝑃𝑅𝐼𝑀𝐸`;

      await sock.sendMessage(extra.from, {
        text: responseText,
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

      // Visual confirmation reaction
      await extra.react(isSelf ? '👤' : '🌐');

    } catch (error) {
      console.error('Mode Command Error:', error);
      await extra.reply(`❌ Error updating mode: ${error.message}`);
    }
  }
};