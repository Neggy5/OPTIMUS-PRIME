/**
 * Unmute Command - Open group
 */

module.exports = {
    name: 'unmute',
    aliases: ['open', 'unlock'],
    description: 'Allow everyone to send messages',
    groupOnly: true,
    adminOnly: true,
    botAdminNeeded: true,
    
    async execute(sock, msg, args, extra) {
        const chatId = extra.from;
        
        try {
            // Update group settings to allow everyone
            await sock.groupSettingUpdate(chatId, 'not_announcement');

            // Send clean success message
            await sock.sendMessage(chatId, { 
                text: `🔓 *GROUP OPENED*\n\n` +
                     `Everyone can now send messages.\n` +
                     `Use *.mute* to close the group.`,
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
            await sock.sendMessage(chatId, { react: { text: '🔊', key: msg.key } });

        } catch (error) {
            console.error('Unmute Error:', error);
            await extra.reply(`❌ Failed to open group: ${error.message}`);
        }
    }
};