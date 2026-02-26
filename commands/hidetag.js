/**
 * HideTag Command - Send message tagging all members without visible mention
 */

module.exports = {
    name: 'hidetag',
    aliases: ['ht', 'hidetagall', 'tagallhidden', 'ghosttag'],
    description: 'Send message tagging all members without visible mention',
    usage: '.hidetag [message]',
    groupOnly: true,
    adminOnly: true,
    botAdminNeeded: true,
    
    async execute(sock, msg, args, extra) {
        try {
            const chatId = msg.key.remoteJid;
            const sender = msg.key.participant || chatId;
            
            // Get group metadata for participants
            const groupMetadata = extra.groupMetadata || await sock.groupMetadata(chatId);
            const participants = groupMetadata.participants || [];
            
            if (participants.length === 0) {
                return await sock.sendMessage(chatId, { 
                    text: `❌ *Could not fetch group participants!*`,
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
            
            // Get all participant JIDs
            const allJids = participants.map(p => p.id);
            
            // Get the message to send
            let messageText = args.length > 0 ? args.join(' ') : '';
            
            // If replying to a message, use that message's text
            const quotedMsg = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
            if (quotedMsg) {
                if (quotedMsg.conversation) {
                    messageText = quotedMsg.conversation;
                } else if (quotedMsg.extendedTextMessage?.text) {
                    messageText = quotedMsg.extendedTextMessage.text;
                } else if (quotedMsg.imageMessage?.caption) {
                    messageText = quotedMsg.imageMessage.caption;
                } else if (quotedMsg.videoMessage?.caption) {
                    messageText = quotedMsg.videoMessage.caption;
                }
            }
            
            // If still no message, use default
            if (!messageText) {
                messageText = '👥 *Attention all members!*';
            }
            
            // Send processing message
            const processingMsg = await sock.sendMessage(chatId, { 
                text: `🔄 *Sending hidden tag...*\n\n👥 Members: ${participants.length}`,
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
            
            // Prepare the message with mentions in contextInfo but not visible in text
            const taggedMessage = {
                text: messageText,
                mentions: allJids, // This makes the tag happen but mentions aren't visible
                contextInfo: {
                    mentionedJid: allJids, // Explicitly set mentionedJid
                    forwardingScore: 999,
                    isForwarded: true,
                    forwardedNewsletterMessageInfo: {
                        newsletterJid: '120363405724402785@newsletter',
                        newsletterName: '𝑂𝑃𝑇𝐼𝑀𝑈𝑆 𝑃𝑅𝐼𝑀𝐸',
                        serverMessageId: -1
                    }
                }
            };
            
            // Send the hidetag message
            await sock.sendMessage(chatId, taggedMessage);
            
            // Delete processing message
            await sock.sendMessage(chatId, { delete: processingMsg.key });
            
            // Send success notification (optional, will auto-delete)
            const successMsg = await sock.sendMessage(chatId, { 
                text: `✅ *Hidden tag sent!*\n\n👥 *Total:* ${participants.length} members\n👤 *Sender:* @${sender.split('@')[0]}`,
                mentions: [sender],
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
            
            // Auto-delete success message after 3 seconds
            setTimeout(async () => {
                try {
                    await sock.sendMessage(chatId, { delete: successMsg.key });
                } catch (err) {
                    // Ignore deletion errors
                }
            }, 3000);
            
        } catch (error) {
            console.error('HideTag Error:', error);
            await sock.sendMessage(msg.key.remoteJid, { 
                text: `❌ *Error:* ${error.message}`,
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