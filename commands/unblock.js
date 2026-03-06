/**
 * Unblock Command - Remove permanent block
 */

const config = require('../config');
const fs = require('fs');
const path = require('path');

const BLOCKED_DB_PATH = path.join(__dirname, '../database/blocked_users.json');

const loadBlockedDB = () => {
    try {
        if (fs.existsSync(BLOCKED_DB_PATH)) {
            const data = fs.readFileSync(BLOCKED_DB_PATH, 'utf8');
            return JSON.parse(data);
        }
        return { blockedUsers: [] };
    } catch (error) {
        console.error('Error loading blocked database:', error);
        return { blockedUsers: [] };
    }
};

const saveBlockedDB = (data) => {
    try {
        fs.writeFileSync(BLOCKED_DB_PATH, JSON.stringify(data, null, 2));
        return true;
    } catch (error) {
        console.error('Error saving blocked database:', error);
        return false;
    }
};

module.exports = {
    name: 'unblock',
    aliases: ['unbanuser', 'unblockuser'],
    description: 'Remove permanent block from a user',
    usage: '.unblock @mention or reply to user',
    groupOnly: false,
    adminOnly: false,
    botAdminNeeded: false,
    ownerOnly: true,
    
    async execute(sock, msg, args, extra) {
        try {
            const chatId = msg.key.remoteJid;
            const sender = msg.key.participant || chatId;
            
            // Get user to unblock
            let userToUnblock = null;
            
            const mentionedJids = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
            if (mentionedJids.length > 0) {
                userToUnblock = mentionedJids[0];
            }
            
            const quotedParticipant = msg.message?.extendedTextMessage?.contextInfo?.participant;
            if (quotedParticipant && !userToUnblock) {
                userToUnblock = quotedParticipant;
            }
            
            if (args.length > 0 && !userToUnblock) {
                let num = args[0].replace(/[^0-9]/g, '');
                if (num) {
                    userToUnblock = num.includes('@') ? num : `${num}@s.whatsapp.net`;
                }
            }
            
            if (!userToUnblock) {
                return await sock.sendMessage(chatId, { 
                    text: `╔══════════════════════╗
║  🔓 *UNBLOCK COMMAND*  ║
╚══════════════════════╝

❌ *Please specify a user to unblock!*

📌 *Usage:*
• .unblock @mention
• Reply to user with .unblock
• .unblock 1234567890

⚠️ *Owner only command*`,
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
            
            const processingMsg = await sock.sendMessage(chatId, { 
                text: `🔓 *Removing permanent block...*\n\n👤 User: @${userToUnblock.split('@')[0]}`,
                mentions: [userToUnblock],
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
            
            // Unblock via WhatsApp
            await sock.updateBlockStatus(userToUnblock, 'unblock');
            
            // Remove from local database
            const blockedDB = loadBlockedDB();
            blockedDB.blockedUsers = blockedDB.blockedUsers.filter(jid => jid !== userToUnblock);
            blockedDB.lastUpdated = Date.now();
            saveBlockedDB(blockedDB);
            
            await sock.sendMessage(chatId, { delete: processingMsg.key });
            
            await sock.sendMessage(chatId, { 
                text: `╔══════════════════════╗
║  ✅ *PERMANENT BLOCK REMOVED*  ║
╚══════════════════════╝

🔓 *Unblocked user:* @${userToUnblock.split('@')[0]}

📌 *Details:*
• They can now message you
• They can see your status
• They can call you again
• They can be added to groups

👤 *Action by:* @${sender.split('@')[0]}`,
                mentions: [userToUnblock, sender],
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
            console.error('Unblock Command Error:', error);
            await sock.sendMessage(msg.key.remoteJid, { 
                text: `❌ *Error unblocking user:* ${error.message}`,
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