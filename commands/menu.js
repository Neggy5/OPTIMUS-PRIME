/**
 * Menu Command - Display all available commands
 */

const config = require('../config');
const { loadCommands } = require('../utils/commandLoader');

module.exports = {
  name: 'menu',
  aliases: ['help', 'commands'],
  category: 'general',
  description: 'Show all available commands',
  usage: '.menu',
  
  async execute(sock, msg, args, extra) {
    try {
      const commands = loadCommands();
      const categories = {};
      
      // Group commands by category
      commands.forEach((cmd, name) => {
        if (cmd.name === name) { // Only count main command names, not aliases
          if (!categories[cmd.category]) {
            categories[cmd.category] = [];
          }
          categories[cmd.category].push(cmd);
        }
      });
      
      const ownerNames = Array.isArray(config.ownerName) ? config.ownerName : [config.ownerName];
      const displayOwner = ownerNames[0] || config.ownerName || 'Bot Owner';
      
      let menuText = `╭━━『 *${config.botName}* 』━━╮\n\n`;
      menuText += `👋 Hello @${extra.sender.split('@')[0]}!\n\n`;
      menuText += `⚡ Prefix: ${config.prefix}\n`;
      menuText += `📦 Total Commands: ${commands.size}\n`;
      menuText += `👑 Owner: ${displayOwner}\n\n`;
      
      // General Commands
      if (categories.general) {
        menuText += `┏━━━━━━━━━━━━━━━━━\n`;
        menuText += `┃  *GENERAL COMMANDS*\n`;
        menuText += `┗━━━━━━━━━━━━━━━━━\n`;
        categories.general.forEach(cmd => {
          menuText += `│ ➜ ${config.prefix}${cmd.name}\n`;
        });
        menuText += `\n`;
      }
      
      // Admin Commands
      if (categories.admin) {
        menuText += `┏━━━━━━━━━━━━━━━━━\n`;
        menuText += `┃  *ADMIN COMMANDS*\n`;
        menuText += `┗━━━━━━━━━━━━━━━━━\n`;
        categories.admin.forEach(cmd => {
          menuText += `│ ➜ ${config.prefix}${cmd.name}\n`;
        });
        menuText += `\n`;
      }
      
      // Group Commands
      if (categories.group) {
        menuText += `┏━━━━━━━━━━━━━━━━━\n`;
        menuText += `┃ *GROUP COMMANDS*\n`;
        menuText += `┗━━━━━━━━━━━━━━━━━\n`;
        categories.group.forEach(cmd => {
          menuText += `│ ➜ ${config.prefix}${cmd.name}\n`;
        });
        menuText += `\n`;
      }
      
      // Media Commands
      if (categories.media) {
        menuText += `┏━━━━━━━━━━━━━━━━━\n`;
        menuText += `┃ *MEDIA COMMANDS*\n`;
        menuText += `┗━━━━━━━━━━━━━━━━━\n`;
        categories.media.forEach(cmd => {
          menuText += `│ ➜ ${config.prefix}${cmd.name}\n`;
        });
        menuText += `\n`;
      }
      
      // Download Commands
      if (categories.download) {
        menuText += `┏━━━━━━━━━━━━━━━━━\n`;
        menuText += `┃  *DOWNLOAD COMMANDS*\n`;
        menuText += `┗━━━━━━━━━━━━━━━━━\n`;
        categories.download.forEach(cmd => {
          menuText += `│ ➜ ${config.prefix}${cmd.name}\n`;
        });
        menuText += `\n`;
      }
      
      // Tools/Utility Commands
      if (categories.tools || categories.utility) {
        menuText += `┏━━━━━━━━━━━━━━━━━\n`;
        menuText += `┃ *TOOLS COMMANDS*\n`;
        menuText += `┗━━━━━━━━━━━━━━━━━\n`;
        
        const tools = [...(categories.tools || []), ...(categories.utility || [])];
        tools.forEach(cmd => {
          menuText += `│ ➜ ${config.prefix}${cmd.name}\n`;
        });
        menuText += `\n`;
      }
      
      // Fun Commands
      if (categories.fun) {
        menuText += `┏━━━━━━━━━━━━━━━━━\n`;
        menuText += `┃  *FUN COMMANDS*\n`;
        menuText += `┗━━━━━━━━━━━━━━━━━\n`;
        categories.fun.forEach(cmd => {
          menuText += `│ ➜ ${config.prefix}${cmd.name}\n`;
        });
        menuText += `\n`;
      }
      
      // Games Commands
      if (categories.games) {
        menuText += `┏━━━━━━━━━━━━━━━━━\n`;
        menuText += `┃  *GAMES COMMANDS*\n`;
        menuText += `┗━━━━━━━━━━━━━━━━━\n`;
        categories.games.forEach(cmd => {
          menuText += `│ ➜ ${config.prefix}${cmd.name}\n`;
        });
        menuText += `\n`;
      }
      
      // Reaction Commands (NEW)
      if (categories.reaction) {
        menuText += `┏━━━━━━━━━━━━━━━━━\n`;
        menuText += `┃  *REACTION COMMANDS*\n`;
        menuText += `┗━━━━━━━━━━━━━━━━━\n`;
        categories.reaction.forEach(cmd => {
          menuText += `│ ➜ ${config.prefix}${cmd.name}\n`;
        });
        menuText += `\n`;
      }
      
      // Religion Commands (NEW - Bible/Quran)
      if (categories.religion) {
        menuText += `┏━━━━━━━━━━━━━━━━━\n`;
        menuText += `┃  *RELIGION COMMANDS*\n`;
        menuText += `┗━━━━━━━━━━━━━━━━━\n`;
        categories.religion.forEach(cmd => {
          menuText += `│ ➜ ${config.prefix}${cmd.name}\n`;
        });
        menuText += `\n`;
      }
      
      // Sports Commands (NEW - LiveScore)
      if (categories.sports) {
        menuText += `┏━━━━━━━━━━━━━━━━━\n`;
        menuText += `┃  *SPORTS COMMANDS*\n`;
        menuText += `┗━━━━━━━━━━━━━━━━━\n`;
        categories.sports.forEach(cmd => {
          menuText += `│ ➜ ${config.prefix}${cmd.name}\n`;
        });
        menuText += `\n`;
      }
      
      // Owner Commands
      if (categories.owner) {
        menuText += `┏━━━━━━━━━━━━━━━━━\n`;
        menuText += `┃  *OWNER COMMANDS*\n`;
        menuText += `┗━━━━━━━━━━━━━━━━━\n`;
        categories.owner.forEach(cmd => {
          menuText += `│ ➜ ${config.prefix}${cmd.name}\n`;
        });
        menuText += `\n`;
      }
      
      // Anti-Features Commands
      if (categories.anti) {
        menuText += `┏━━━━━━━━━━━━━━━━━\n`;
        menuText += `┃  *ANTI-FEATURES*\n`;
        menuText += `┗━━━━━━━━━━━━━━━━━\n`;
        categories.anti.forEach(cmd => {
          menuText += `│ ➜ ${config.prefix}${cmd.name}\n`;
        });
        menuText += `\n`;
      }
      
      // Banking Commands
      if (categories.banking) {
        menuText += `┏━━━━━━━━━━━━━━━━━\n`;
        menuText += `┃  *BANKING COMMANDS*\n`;
        menuText += `┗━━━━━━━━━━━━━━━━━\n`;
        categories.banking.forEach(cmd => {
          menuText += `│ ➜ ${config.prefix}${cmd.name}\n`;
        });
        menuText += `\n`;
      }
      
      // Anime Commands
      if (categories.anime) {
        menuText += `┏━━━━━━━━━━━━━━━━━\n`;
        menuText += `┃  *ANIME COMMANDS*\n`;
        menuText += `┗━━━━━━━━━━━━━━━━━\n`;
        categories.anime.forEach(cmd => {
          menuText += `│ ➜ ${config.prefix}${cmd.name}\n`;
        });
        menuText += `\n`;
      }

      // Textmaker Commands
      if (categories.textmaker) {
        menuText += `┏━━━━━━━━━━━━━━━━━\n`;
        menuText += `┃ *TEXTMAKER COMMANDS*\n`;
        menuText += `┗━━━━━━━━━━━━━━━━━\n`;
        categories.textmaker.forEach(cmd => {
          menuText += `│ ➜ ${config.prefix}${cmd.name}\n`;
        });
        menuText += `\n`;
      }
      
      // AI Commands
      if (categories.ai) {
        menuText += `┏━━━━━━━━━━━━━━━━━\n`;
        menuText += `┃  *AI COMMANDS*\n`;
        menuText += `┗━━━━━━━━━━━━━━━━━\n`;
        categories.ai.forEach(cmd => {
          menuText += `│ ➜ ${config.prefix}${cmd.name}\n`;
        });
        menuText += `\n`;
      }
      
      menuText += `╰━━━━━━━━━━━━━━━━━\n\n`;
      menuText += `💡 Type ${config.prefix}help <command> for more info\n`;
      menuText += `🌟 Bot Version: 1.0.0\n`;
      menuText += `> *ᴘᴏᴡᴇʀᴇᴅ ʙʏ ${config.botName}*`;
      
      // Send menu with image
      const fs = require('fs');
      const path = require('path');
      const imagePath = path.join(__dirname, '../utils/bot_image.jpg');
      
      if (fs.existsSync(imagePath)) {
        // Send image with newsletter forwarding context
        const imageBuffer = fs.readFileSync(imagePath);
        await sock.sendMessage(extra.from, {
          image: imageBuffer,
          caption: menuText,
          mentions: [extra.sender],
          contextInfo: {
            forwardingScore: 999,
            isForwarded: true,
            forwardedNewsletterMessageInfo: {
              newsletterJid: config.newsletterJid || '120363405724402785@newsletter',
              newsletterName: config.botName,
              serverMessageId: -1
            }
          }
        }, { quoted: msg });
      } else {
        await sock.sendMessage(extra.from, {
          text: menuText,
          mentions: [extra.sender],
          contextInfo: {
            forwardingScore: 999,
            isForwarded: true,
            forwardedNewsletterMessageInfo: {
              newsletterJid: config.newsletterJid || '120363405724402785@newsletter',
              newsletterName: config.botName,
              serverMessageId: -1
            }
          }
        }, { quoted: msg });
      }
      
    } catch (error) {
      console.error('Menu Error:', error);
      await extra.reply(`❌ Error: ${error.message}`);
    }
  }
};