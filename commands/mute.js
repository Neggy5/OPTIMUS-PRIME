/**
 * Mute Command - Close group (only admins can send)
 */

module.exports = {
    name: 'mute',
    aliases: ['close', 'lock', 'lockgroup'],
    description: 'Close group (only admins can send messages)',
    usage: '.mute',
    groupOnly: true,
    adminOnly: true,
    botAdminNeeded: true,
    
    async execute(sock, msg, args, extra) {
        try {
            const chatId = msg.key.remoteJid;
            
            // Send processing message
            const processingMsg = await sock.sendMessage(chatId, { 
                text: '🔒 *Closing group...*',
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
            
            // Change group settings to announcement mode (only admins can send)
            await sock.groupSettingUpdate(chatId, 'announcement');
            
            // Delete processing message
            await sock.sendMessage(chatId, { delete: processingMsg.key });
            
            // Send success message
            await sock.sendMessage(chatId, { 
                text: `╔══════════════════╗
║  🔒 *GROUP MUTED*  ║
╚══════════════════╝

✅ Group has been *closed*!

━━━━━━━━━━━━━━━━━━━
👥 Only *admins* can send messages now
🔓 Use *.unmute* to open the group
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
            console.error('Mute Error:', error);
            await sock.sendMessage(msg.key.remoteJid, { 
                text: `❌ *Error muting group:* ${error.message}`,
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