/**
 * Auto Status React Command - Toggle automatic status reactions
 */
const config = require('../config');
const fs = require('fs');
const path = require('path');

module.exports = {
  name: 'autostatreact',
  aliases: ['statusreact', 'autoreactstatus'],
  description: 'Toggle automatic reactions to status updates',
  ownerOnly: true,

  async execute(sock, msg, args, extra) {
    const isEnable = args[0]?.toLowerCase() === 'on';
    const isDisable = args[0]?.toLowerCase() === 'off';

    try {
      if (!isEnable && !isDisable) {
        return extra.reply(`*Usage:* .autostatreact on / off\n*Current:* ${config.autoStatusReact ? 'ON ✅' : 'OFF ❌'}`);
      }

      const status = isEnable;
      
      // Update config file for persistence
      const configPath = path.join(__dirname, '../config.js');
      let configContent = fs.readFileSync(configPath, 'utf8');
      configContent = configContent.replace(/(autoStatusReact:\s*)(true|false)/g, `$1${status}`);
      fs.writeFileSync(configPath, configContent, 'utf8');

      // Update runtime config
      config.autoStatusReact = status;

      await sock.sendMessage(extra.from, {
        text: `✨ *AUTO STATUS REACT*\n\n` +
             `Status: *${status ? 'ENABLED' : 'DISABLED'}*\n` +
             `The bot will ${status ? 'now' : 'no longer'} react to status updates.`,
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

      await sock.sendMessage(extra.from, { react: { text: status ? '✨' : '💤', key: msg.key } });

    } catch (error) {
      await extra.reply(`❌ Error: ${error.message}`);
    }
  }
};