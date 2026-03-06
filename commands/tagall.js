/**
 * Tag All Command - Bullet point style
 */

module.exports = {
    name: 'tagall',
    aliases: ['mentionall', 'everyone'],
    category: 'admin',
    description: 'Tag all group members',
    usage: '.tagall <message>',
    groupOnly: true,
    adminOnly: true,
    botAdminNeeded: true,
    
    async execute(sock, msg, args, extra) {
      try {
        const message = args.join(' ') || 'New announcement!';
        const participants = extra.groupMetadata.participants.map(p => p.id);
        
        let text = `╔══════════════════════╗
║  📢 *GROUP TAGALL*  📢   ║
╚══════════════════════╝\n\n`;
        
        text += `👤 *Sender:* @${extra.sender.split('@')[0]}\n`;
        text += `💬 *Message:* "${message}"\n`;
        text += `👥 *Total:* ${participants.length} members\n\n`;
        
        text += `━━━━━━━━━━━━━━━━━━━━\n`;
        text += `📋 *MEMBERS LIST*\n`;
        text += `━━━━━━━━━━━━━━━━━━━━\n\n`;
        
        participants.forEach((p, i) => {
          text += `▸ @${p.split('@')[0]}\n`;
        });
        
        text += `\n━━━━━━━━━━━━━━━━━━━━\n`;
        text += `✅ All members notified\n`;
        text += `━━━━━━━━━━━━━━━━━━━━\n`;
        text += `> *ᴘᴏᴡᴇʀᴇᴅ ʙʏ ZUKO-MD*`;
        
        await sock.sendMessage(extra.from, {
          text,
          mentions: participants
        }, { quoted: msg });
        
      } catch (error) {
        await extra.reply(`❌ Error: ${error.message}`);
      }
    }
  };