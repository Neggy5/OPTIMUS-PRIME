/**
 * Unmute Command - Open group (all members can send)
 */

module.exports = {
    name: 'unmute',
    aliases: ['open', 'opengroup'],
    description: 'Open group (all members can send messages)',
    usage: '.unmute',
    groupOnly: true,
    adminOnly: true,
    botAdminNeeded: true,
    
    async execute(sock, msg, args, extra) {
        try {
            const chatId = msg.key.remoteJid;
            
            // Send processing message
            const processingMsg = await sock.sendMessage(chatId, { 
                text: '🔓 *Opening group...*',
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
            
            // Change group settings to open mode (everyone can send)
            await sock.groupSettingUpdate(chatId, 'not_announcement');
            
            // Delete processing message
            await sock.sendMessage(chatId, { delete: processingMsg.key });
            
            // Send success message
            await sock.sendMessage(chatId, { 
                text: `╔══════════════════╗
║  🔓 *GROUP UNMUTED*  ║
╚══════════════════╝

✅ Group has been *opened*!

━━━━━━━━━━━━━━━━━━━
👥 All *members* can send messages now
🔒 Use *.mute* to close the group
━━━━━━━━━━━━━━━━━━━

> *ᴘᴏᴡᴇʀᴇᴅ ʙʏ 𝑂𝑃𝑇𝐼𝑀𝑈𝑆 𝑃𝑅𝐼𝑀𝐸*`,
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
            
        } catch (error) {
            console.error('Unmute Error:', error);
            await sock.sendMessage(msg.key.remoteJid, { 
                text: `❌ *Error opening group:* ${error.message}`,
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
    }
};