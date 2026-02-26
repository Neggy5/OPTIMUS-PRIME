/**
 * Reaction Command - Send anime reaction GIFs
 */

const axios = require('axios');

// Anime GIF API endpoints
const gifApis = {
  slap: 'https://api.otakugifs.xyz/gif?reaction=slap&format=gif',
  hug: 'https://api.otakugifs.xyz/gif?reaction=hug&format=gif',
  kiss: 'https://api.otakugifs.xyz/gif?reaction=kiss&format=gif',
  pat: 'https://api.otakugifs.xyz/gif?reaction=pat&format=gif',
  poke: 'https://api.otakugifs.xyz/gif?reaction=poke&format=gif',
  punch: 'https://api.otakugifs.xyz/gif?reaction=punch&format=gif',
  kick: 'https://api.otakugifs.xyz/gif?reaction=kick&format=gif',
  cuddle: 'https://api.otakugifs.xyz/gif?reaction=cuddle&format=gif',
  tickle: 'https://api.otakugifs.xyz/gif?reaction=tickle&format=gif',
  bite: 'https://api.otakugifs.xyz/gif?reaction=bite&format=gif',
  stab: 'https://api.otakugifs.xyz/gif?reaction=stab&format=gif',
  shoot: 'https://api.otakugifs.xyz/gif?reaction=shoot&format=gif',
  bully: 'https://api.otakugifs.xyz/gif?reaction=bully&format=gif',
  handhold: 'https://api.otakugifs.xyz/gif?reaction=handhold&format=gif',
  highfive: 'https://api.otakugifs.xyz/gif?reaction=highfive&format=gif',
  wave: 'https://api.otakugifs.xyz/gif?reaction=wave&format=gif',
  wink: 'https://api.otakugifs.xyz/gif?reaction=wink&format=gif',
  blush: 'https://api.otakugifs.xyz/gif?reaction=blush&format=gif',
  cry: 'https://api.otakugifs.xyz/gif?reaction=cry&format=gif',
  dance: 'https://api.otakugifs.xyz/gif?reaction=dance&format=gif',
  happy: 'https://api.otakugifs.xyz/gif?reaction=happy&format=gif',
  sad: 'https://api.otakugifs.xyz/gif?reaction=sad&format=gif',
  angry: 'https://api.otakugifs.xyz/gif?reaction=angry&format=gif',
  scared: 'https://api.otakugifs.xyz/gif?reaction=scared&format=gif',
  confused: 'https://api.otakugifs.xyz/gif?reaction=confused&format=gif',
  smug: 'https://api.otakugifs.xyz/gif?reaction=smug&format=gif',
  thinking: 'https://api.otakugifs.xyz/gif?reaction=thinking&format=gif',
  yeet: 'https://api.otakugifs.xyz/gif?reaction=yeet&format=gif'
};

// Reaction descriptions and emojis
const reactionInfo = {
  slap: { emoji: '👋', description: 'slaps' },
  hug: { emoji: '🤗', description: 'hugs' },
  kiss: { emoji: '💋', description: 'kisses' },
  pat: { emoji: '👋', description: 'pats' },
  poke: { emoji: '👉', description: 'pokes' },
  punch: { emoji: '👊', description: 'punches' },
  kick: { emoji: '🦶', description: 'kicks' },
  cuddle: { emoji: '🤗', description: 'cuddles' },
  tickle: { emoji: '🪶', description: 'tickles' },
  bite: { emoji: '🦷', description: 'bites' },
  stab: { emoji: '🔪', description: 'stabs' },
  shoot: { emoji: '🔫', description: 'shoots' },
  bully: { emoji: '👿', description: 'bullies' },
  handhold: { emoji: '🤝', description: 'holds hands with' },
  highfive: { emoji: '🖐️', description: 'high-fives' },
  wave: { emoji: '👋', description: 'waves at' },
  wink: { emoji: '😉', description: 'winks at' },
  blush: { emoji: '😊', description: 'blushes at' },
  cry: { emoji: '😢', description: 'cries with' },
  dance: { emoji: '💃', description: 'dances with' },
  happy: { emoji: '😊', description: 'is happy with' },
  sad: { emoji: '😢', description: 'is sad with' },
  angry: { emoji: '😠', description: 'is angry at' },
  scared: { emoji: '😱', description: 'is scared of' },
  confused: { emoji: '😕', description: 'is confused with' },
  smug: { emoji: '😏', description: 'smirks at' },
  thinking: { emoji: '🤔', description: 'thinks about' },
  yeet: { emoji: '🚀', description: 'YEETS' }
};

// Alternative API for fallback
const nekoApi = {
  slap: 'https://nekos.life/api/v2/img/slap',
  hug: 'https://nekos.life/api/v2/img/hug',
  kiss: 'https://nekos.life/api/v2/img/kiss',
  pat: 'https://nekos.life/api/v2/img/pat',
  poke: 'https://nekos.life/api/v2/img/poke',
  cuddle: 'https://nekos.life/api/v2/img/cuddle',
  tickle: 'https://nekos.life/api/v2/img/tickle'
};

module.exports = {
  name: 'reaction',
  aliases: ['react', 'r', ...Object.keys(reactionInfo)],
  category: 'fun',
  description: 'Send anime reaction GIFs',
  usage: '.reaction <type> @user or .<type> @user',
  
  async execute(sock, msg, args, extra) {
    try {
      const chatId = extra.from;
      const sender = extra.sender;
      const commandName = msg.message?.extendedTextMessage?.text?.split(' ')[0]?.toLowerCase().replace('.', '') || 'reaction';
      
      // Determine reaction type
      let reactionType = commandName;
      let targetUser = null;
      
      // If using .reaction command, first arg is type
      if (reactionType === 'reaction' || reactionType === 'react' || reactionType === 'r') {
        if (args.length === 0) {
          // Show help
          const reactionsList = Object.keys(reactionInfo).map(r => `• .${r}`).join('\n');
          return extra.reply(`╔══════════════════════╗
║  🎭 *REACTION COMMANDS*  🎭 ║
╚══════════════════════╝

📌 *Available Reactions:*
${reactionsList}

💡 *Usage:*
• .slap @user
• .hug @user
• .kiss @user
• .pat @user
• .cuddle @user

⚡ *Examples:*
• .slap @john
• .hug @jane
• .kiss @love

> *ᴘᴏᴡᴇʀᴇᴅ ʙʏ 𝑂𝑃𝑇𝐼𝑀𝑈𝑆 𝑃𝑅𝐼𝑀𝐸*`);
        }
        
        reactionType = args[0].toLowerCase();
        if (!reactionInfo[reactionType]) {
          return extra.reply(`❌ *Invalid reaction!*\n\nAvailable: ${Object.keys(reactionInfo).join(', ')}`);
        }
        
        // Get target user from remaining args
        const remainingArgs = args.slice(1).join(' ');
        targetUser = await extractTargetUser(sock, msg, remainingArgs);
      } else {
        // Direct command like .slap
        targetUser = await extractTargetUser(sock, msg, args.join(' '));
      }
      
      // Get sender name
      const senderName = msg.pushName || sender.split('@')[0];
      
      // Get reaction info
      const reaction = reactionInfo[reactionType];
      if (!reaction) {
        return extra.reply(`❌ *Invalid reaction!*\n\nUse .reaction to see available reactions.`);
      }
      
      // Send typing indicator
      await sock.sendPresenceUpdate('composing', chatId);
      
      // Try primary API
      let gifUrl = null;
      try {
        if (gifApis[reactionType]) {
          const response = await axios.get(gifApis[reactionType], { 
            timeout: 5000,
            responseType: 'arraybuffer'
          });
          gifUrl = response.data ? Buffer.from(response.data) : null;
        }
      } catch (primaryError) {
        console.log(`Primary API failed for ${reactionType}:`, primaryError.message);
      }
      
      // Try fallback API if primary failed
      if (!gifUrl && nekoApi[reactionType]) {
        try {
          const response = await axios.get(nekoApi[reactionType], { timeout: 5000 });
          if (response.data && response.data.url) {
            const imgResponse = await axios.get(response.data.url, { 
              responseType: 'arraybuffer',
              timeout: 5000
            });
            gifUrl = Buffer.from(imgResponse.data);
          }
        } catch (fallbackError) {
          console.log(`Fallback API failed for ${reactionType}:`, fallbackError.message);
        }
      }
      
      // If no GIF, use a random anime GIF from a free source
      if (!gifUrl) {
        try {
          const response = await axios.get('https://api.waifu.pics/sfw/' + reactionType, { 
            timeout: 5000,
            responseType: 'arraybuffer'
          });
          gifUrl = Buffer.from(response.data);
        } catch (error) {
          console.log('All APIs failed, using fallback URL');
        }
      }
      
      // Build message
      let message = '';
      if (targetUser) {
        const targetName = targetUser.split('@')[0];
        message = `${reaction.emoji} *${senderName}* ${reaction.description} *@${targetName}*`;
      } else {
        message = `${reaction.emoji} *${senderName}* ${reaction.description}`;
      }
      
      message += `\n\n> *ᴘᴏᴡᴇʀᴇᴅ ʙʏ 𝑂𝑃𝑇𝐼𝑀𝑈𝑆 𝑃𝑅𝐼𝑀𝐸*`;
      
      // Send the reaction
      if (gifUrl) {
        await sock.sendMessage(chatId, {
          video: gifUrl,
          caption: message,
          gifPlayback: true,
          mentions: targetUser ? [targetUser, sender] : [sender],
          contextInfo: {
            forwardingScore: 999,
            isForwarded: true,
            forwardedNewsletterMessageInfo: {
              newsletterJid: '120363405724402785@newsletter',
              newsletterName: '𝑂𝑃𝑇𝐼𝑀𝑈𝑆 𝑃𝑅𝐼𝑀𝐸',
              serverMessageId: -1
            }
          }
        }, { quoted: msg });
      } else {
        // Send text only if no GIF
        await sock.sendMessage(chatId, {
          text: message,
          mentions: targetUser ? [targetUser, sender] : [sender],
          contextInfo: {
            forwardingScore: 999,
            isForwarded: true,
            forwardedNewsletterMessageInfo: {
              newsletterJid: '120363405724402785@newsletter',
              newsletterName: '𝑂𝑃𝑇𝐼𝑀𝑈𝑆 𝑃𝑅𝐼𝑀𝐸',
              serverMessageId: -1
            }
          }
        }, { quoted: msg });
      }
      
    } catch (error) {
      console.error('Reaction Command Error:', error);
      await extra.reply(`❌ *Error:* ${error.message}`);
    }
  }
};

// Helper function to extract target user from message
async function extractTargetUser(sock, msg, text) {
  try {
    // Check for mentions
    const mentionedJids = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid;
    if (mentionedJids && mentionedJids.length > 0) {
      return mentionedJids[0];
    }
    
    // Check if replying to a message
    const quotedParticipant = msg.message?.extendedTextMessage?.contextInfo?.participant;
    if (quotedParticipant) {
      return quotedParticipant;
    }
    
    // Extract number from text
    const numberMatch = text.match(/\d{10,}/);
    if (numberMatch) {
      return numberMatch[0].includes('@') ? numberMatch[0] : `${numberMatch[0]}@s.whatsapp.net`;
    }
    
    return null;
  } catch (error) {
    return null;
  }
}