/**
 * Kickall Command - Removes all members from the group
 */
const config = require('../config');

module.exports = {
  name: 'kickall',
  aliases: ['clearparticipants', 'masskick'],
  description: 'Remove all members from the group (Owner Only)',
  category: 'owner',
  ownerOnly: true,
  groupOnly: true,
  botAdminNeeded: true,

  async execute(sock, msg, args, extra) {
    const chatId = extra.from;

    try {
      // 1. Get all participants
      const groupMetadata = await sock.groupMetadata(chatId);
      const participants = groupMetadata.participants;
      
      // 2. Filter out the Bot and the Owner to prevent self-kicking
      const toKick = participants.filter(p => 
        p.id !== sock.user.id.split(':')[0] + '@s.whatsapp.net' && 
        !config.ownerNumber.includes(p.id.split('@')[0])
      ).map(p => p.id);

      if (toKick.length === 0) {
        return extra.reply('❌ No members found to kick.');
      }

      // 3. Confirmation message
      await extra.reply(`⚠️ *MASS KICK INITIATED*\n\nRemoving *${toKick.length}* members...\n\n> 𝑃ᴏᴡᴇʀᴇᴅ ʙʏ 𝑂𝑃𝑇𝐼𝑀𝑈𝑆 𝑃𝑅𝐼𝑀𝐸`);

      // 4. Execute kicking in small batches to avoid WhatsApp rate limits
      for (const jid of toKick) {
        await sock.groupParticipantsUpdate(chatId, [jid], 'remove');
        // Small delay to prevent crashing/banning
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      await sock.sendMessage(chatId, { text: '✅ *Group cleared successfully.*' });

    } catch (error) {
      console.error('Kickall Error:', error);
      await extra.reply(`❌ Failed to execute kickall: ${error.message}`);
    }
  }
};