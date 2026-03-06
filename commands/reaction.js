/**
 * Dynamic Reaction Command - Directly handles .slap, .hug, .kiss, etc.
 */
const config = require('../config');

module.exports = {
  name: 'slap', // Default name
  aliases: ['hug', 'kiss', 'pat', 'cry', 'laugh', 'angry', 'dance', 'blush', 'kill', 'kick'],
  description: 'Send anime reaction GIFs directly',
  category: 'fun',

  async execute(sock, msg, args, extra) {
    const chatId = extra.from || msg.key.remoteJid;
    
    // Determine which command was actually typed (e.g., "slap" or "hug")
    const body = msg.message?.conversation || msg.message?.extendedTextMessage?.text || "";
    const usedPrefix = config.prefix || '.';
    const commandName = body.slice(usedPrefix.length).trim().split(/\s+/)[0].toLowerCase();

    const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0] || null;

    // High-quality Anime GIF collection
    const gifs = {
      hug: 'https://media.tenor.com/7o_70_vH6S8AAAAC/anime-hug.gif',
      kiss: 'https://media.tenor.com/7T079HnZ5nkAAAAC/anime-kiss.gif',
      slap: 'https://media.tenor.com/f9GAn83G_OIAAAAC/slap-anime.gif',
      pat: 'https://media.tenor.com/E6f9i3rz40IAAAAC/anime-pat.gif',
      cry: 'https://media.tenor.com/eb_S9YS9G_IAAAAC/anime-cry.gif',
      laugh: 'https://media.tenor.com/al_f9Xf9S_IAAAAC/anime-laugh.gif',
      angry: 'https://media.tenor.com/fb_f9Xf9S_IAAAAC/anime-angry.gif',
      dance: 'https://media.tenor.com/S9f9Xf9S_IAAAAC/anime-dance.gif',
      blush: 'https://media.tenor.com/G9f9Xf9S_IAAAAC/anime-blush.gif',
      kill: 'https://media.tenor.com/K9f9Xf9S_IAAAAC/anime-kill.gif',
      kick: 'https://media.tenor.com/Y-9f9Xf9S_IAAAAC/anime-kick.gif'
    };

    // Pick the GIF based on the command used
    const activeGif = gifs[commandName];
    
    // Safety check: if somehow a non-existent alias triggers this
    if (!activeGif) return extra.reply(`🎭 Available: ${Object.keys(gifs).join(', ')}`);

    try {
      const senderName = `@${extra.sender.split('@')[0]}`;
      const targetName = mentioned ? `@${mentioned.split('@')[0]}` : 'themselves';
      
      const caption = `🎭 *${senderName}* is *${commandName.toUpperCase()}ING* *${targetName}*!`;

      await sock.sendMessage(chatId, {
        video: { url: activeGif },
        gifPlayback: true,
        caption: caption,
        mentions: mentioned ? [extra.sender, mentioned] : [extra.sender],
        contextInfo: {
          forwardingScore: 999,
          isForwarded: true,
          externalAdReply: {
            title: `𝑂𝑃𝑇𝐼𝑀𝑈𝑆 𝑃𝑅𝐼𝑀𝐸 - ${commandName.toUpperCase()}`,
            body: `Expressing emotions via Anime`,
            thumbnailUrl: activeGif,
            mediaType: 1,
            renderLargerThumbnail: false,
            sourceUrl: config.channelUrl
          }
        }
      }, { quoted: msg });

      await extra.react('🎬');

    } catch (error) {
      console.error('Reaction error:', error);
      await extra.reply(`❌ Failed to send GIF.`);
    }
  }
};