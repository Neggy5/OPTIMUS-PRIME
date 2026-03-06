/**
 * Menu Command - Full 75+ Grouped Commands with Local Image Support
 */

const config = require('../config');
const fs = require('fs');
const path = require('path');

module.exports = {
  name: 'menu',
  aliases: ['help', 'list'],
  description: 'Show all bot commands grouped with a local image',
  
  async execute(sock, msg, args, extra) {
    const prefix = config.prefix;
    
    // Grouped command text in thin vertical format
    const menuText = `╭───────────────╮\n` +
                   `│   🤖 *${config.botName}* │\n` +
                   `╰───────────────╯\n\n` +
                   `*User:* @${extra.sender.split('@')[0]}\n` +
                   `*Prefix:* [ ${prefix} ]\n\n` +
                   `*┌──『 🛡️ ADMIN & GROUP 』*\n` +
                   `*│* ✧ ${prefix}block\n*│* ✧ ${prefix}unblock\n*│* ✧ ${prefix}kick\n*│* ✧ ${prefix}kickall\n*│* ✧ ${prefix}promote\n*│* ✧ ${prefix}demote\n` +
                   `*│* ✧ ${prefix}mute\n*│* ✧ ${prefix}unmute\n*│* ✧ ${prefix}hidetag\n*│* ✧ ${prefix}tagall\n*│* ✧ ${prefix}opentime\n` +
                   `*│* ✧ ${prefix}welcome\n*│* ✧ ${prefix}goodbye\n*│* ✧ ${prefix}join\n*│* ✧ ${prefix}leave\n` +
                   `*│* ✧ ${prefix}group_status\n*│* ✧ ${prefix}groupstats\n` +
                   `*└──『 🛠️ SECURITY 』*\n` +
                   `*│* ✧ ${prefix}antibio\n*│* ✧ ${prefix}antibot\n*│* ✧ ${prefix}anticall\n*│* ✧ ${prefix}antidelete\n` +
                   `*│* ✧ ${prefix}antilink\n*│* ✧ ${prefix}antivirus\n*│* ✧ ${prefix}antipromote\n*│* ✧ ${prefix}antisticker\n` +
                   `*│* ✧ ${prefix}antitag\n*│* ✧ ${prefix}antigroupmention\n` +
                   `*└──『 📱 SOCIAL & DL 』*\n` +
                   `*│* ✧ ${prefix}facebook\n*│* ✧ ${prefix}instagram\n*│* ✧ ${prefix}igs\n*│* ✧ ${prefix}tiktok\n*│* ✧ ${prefix}twitter\n` +
                   `*│* ✧ ${prefix}video\n*│* ✧ ${prefix}song\n*│* ✧ ${prefix}lyrics\n*│* ✧ ${prefix}url\n` +
                   `*└──『 🤖 BOT SETTINGS 』*\n` +
                   `*│* ✧ ${prefix}autobio\n*│* ✧ ${prefix}autopost\n*│* ✧ ${prefix}autoreact\n*│* ✧ ${prefix}autorecording\n` +
                   `*│* ✧ ${prefix}autostatreact\n*│* ✧ ${prefix}autoview\n*│* ✧ ${prefix}mode\n*│* ✧ ${prefix}restart\n` +
                   `*│* ✧ ${prefix}setprefix\n*│* ✧ ${prefix}setbotpp\n*│* ✧ ${prefix}setpp\n*│* ✧ ${prefix}setmenuimage\n` +
                   `*│* ✧ ${prefix}resetmenuimage\n` +
                   `*└──『 🎮 GAMES & FUN 』*\n` +
                   `*│* ✧ ${prefix}tic-tac-toe\n*│* ✧ ${prefix}truthordare\n*│* ✧ ${prefix}joke\n*│* ✧ ${prefix}fact\n*│* ✧ ${prefix}meme\n` +
                   `*│* ✧ ${prefix}reaction\n*│* ✧ ${prefix}sticker\n*│* ✧ ${prefix}take\n*│* ✧ ${prefix}animated\n` +
                   `*│* ✧ ${prefix}llama\n*│* ✧ ${prefix}latestanime\n` +
                   `*└──『 📖 UTILS & INFO 』*\n` +
                   `*│* ✧ ${prefix}bible\n*│* ✧ ${prefix}quran\n*│* ✧ ${prefix}wikipedia\n*│* ✧ ${prefix}translate\n` +
                   `*│* ✧ ${prefix}weather\n*│* ✧ ${prefix}calc\n*│* ✧ ${prefix}livescore\n*│* ✧ ${prefix}movie\n` +
                   `*│* ✧ ${prefix}aza\n*│* ✧ ${prefix}setaza\n*│* ✧ ${prefix}resetaza\n*│* ✧ ${prefix}vcf\n` +
                   `*└──『 ⚙️ SYSTEM 』*\n` +
                   `*│* ✧ ${prefix}ping\n*│* ✧ ${prefix}uptime\n*│* ✧ ${prefix}status\n*│* ✧ ${prefix}repo\n` +
                   `*│* ✧ ${prefix}newsletter\n*│* ✧ ${prefix}broadcast\n*│* ✧ ${prefix}viewonce\n*│* ✧ ${prefix}delete\n` +
                   `*└──『 🔞 NSFW 』*\n` +
                   `*│* ✧ ${prefix}xvideo\n*│* ✧ ${prefix}xvideosearch\n` +
                   `*└───────────────*\n\n` +
                   `> 𝑃ᴏᴡᴇʀᴇᴅ ʙʏ 𝑂𝑃𝑇𝐼𝑀𝑈𝑆 𝑃𝑅𝐼𝑀𝐸`;

    try {
      const imagePath = path.join(__dirname, '../utils/bot_image.jpg');
      
      const commonContext = {
        forwardingScore: 999,
        isForwarded: true,
        forwardedNewsletterMessageInfo: {
          newsletterJid: config.newsletterJid || '120363405724402785@newsletter',
          newsletterName: config.botName,
          serverMessageId: -1
        }
      };

      if (fs.existsSync(imagePath)) {
        // Send image with text caption
        const imageBuffer = fs.readFileSync(imagePath);
        await sock.sendMessage(extra.from, {
          image: imageBuffer,
          caption: menuText,
          mentions: [extra.sender],
          contextInfo: commonContext
        }, { quoted: msg });
      } else {
        // Fallback to text only if image is missing
        await sock.sendMessage(extra.from, {
          text: menuText,
          mentions: [extra.sender],
          contextInfo: commonContext
        }, { quoted: msg });
      }

      await sock.sendMessage(extra.from, { react: { text: '📜', key: msg.key } });

    } catch (error) {
      console.error('Menu Error:', error);
      await extra.reply(`❌ Error: ${error.message}`);
    }
  }
};