/**
 * Mute Command - Close group
 */

module.exports = {
    name: 'mute',
    aliases: ['close', 'lock'],
    description: 'Only admins can send messages',
    groupOnly: true,
    adminOnly: true,
    botAdminNeeded: true,
    
    async execute(sock, msg, args, extra) {
        const chatId = extra.from;
        
        try {
            // Update group settings immediately
            await sock.groupSettingUpdate(chatId, 'announcement');

            // Send clean success message
            await sock.sendMessage(chatId, { 
                text: `🔒 *GROUP CLOSED*\n\n` +
                     `Only admins can send messages now.\n` +
                     `Use *.unmute* to open the group.`,
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

            // Add a confirming reaction
            await sock.sendMessage(chatId, { react: { text: '🔇', key: msg.key } });

        } catch (error) {
            console.error('Mute Error:', error);
            await extra.reply(`❌ Failed to mute group: ${error.message}`);
        }
    }
};