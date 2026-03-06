/**
 * Hidetag Command - Mentions all members invisibly
 */
module.exports = {
  name: 'hidetag',
  aliases: ['htag', 'tagall'],
  description: 'Tag all group members with a message',
  category: 'admin',
  adminOnly: true,
  groupOnly: true,

  async execute(sock, msg, args, extra) {
    const groupMetadata = await sock.groupMetadata(extra.from);
    const participants = groupMetadata.participants.map(v => v.id);
    const text = args.join(' ') || 'Attention Everyone! 📢';

    await sock.sendMessage(extra.from, {
      text: text,
      mentions: participants,
      contextInfo: {
        forwardingScore: 999,
        isForwarded: true,
        forwardedNewsletterMessageInfo: {
          newsletterJid: '120363405724402785@newsletter',
          newsletterName: '𝑂𝑃𝑇𝐼𝑀𝑈𝑆 𝑃𝑅𝐼𝑀𝐸',
          serverMessageId: -1
        }
      }
    });
  }
};