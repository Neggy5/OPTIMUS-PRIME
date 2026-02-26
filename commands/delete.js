/**
 * Delete Command - Delete bot messages or replied messages
 */

module.exports = {
    name: 'delete',
    aliases: ['del', 'remove', 'rm'],
    description: 'Delete bot messages or replied messages',
    usage: '.delete or reply to a message with .delete',
    groupOnly: false,
    adminOnly: false,
    botAdminNeeded: false,
    
    async execute(sock, msg, args, extra) {
        try {
            const chatId = msg.key.remoteJid;
            const sender = msg.key.participant || chatId;
            const isGroup = chatId.endsWith('@g.us');
            
            // Check if replying to a message
            const quotedMsg = msg.message?.extendedTextMessage?.contextInfo;
            const quotedMessage = quotedMsg?.quotedMessage;
            
            // If no quoted message, try to delete the command message itself after delay
            if (!quotedMsg) {
                const sentMsg = await sock.sendMessage(chatId, { 
                    text: '⌛ *This message will self-destruct in 3 seconds...*',
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
                
                // Delete after 3 seconds
                setTimeout(async () => {
                    try {
                        await sock.sendMessage(chatId, { delete: sentMsg.key });
                    } catch (err) {
                        console.error('Failed to delete message:', err);
                    }
                }, 3000);
                
                return;
            }
            
            // Get the message to delete
            const messageToDelete = {
                remoteJid: chatId,
                fromMe: quotedMsg.participant === sock.user.id.split(':')[0] + '@s.whatsapp.net',
                id: quotedMsg.stanzaId,
                participant: quotedMsg.participant
            };
            
            // Check permissions
            const isBotOwner = extra.isOwner;
            const isSenderAdmin = isGroup ? await extra.isAdmin : false;
            const isMessageFromBot = messageToDelete.fromMe;
            const isMessageFromSender = quotedMsg.participant === sender;
            
            // Permission rules:
            // 1. Anyone can delete their own messages
            // 2. Admins can delete any message in groups
            // 3. Bot owner can delete any message anywhere
            // 4. Anyone can delete bot messages (since bot is admin)
            
            let canDelete = false;
            let reason = '';
            
            if (isBotOwner) {
                canDelete = true;
                reason = 'Bot owner';
            } else if (isMessageFromBot) {
                canDelete = true;
                reason = 'Bot message';
            } else if (isMessageFromSender) {
                canDelete = true;
                reason = 'Your own message';
            } else if (isGroup && isSenderAdmin) {
                canDelete = true;
                reason = 'Group admin';
            } else {
                canDelete = false;
                reason = 'Insufficient permissions';
            }
            
            if (!canDelete) {
                return await sock.sendMessage(chatId, { 
                    text: `╔══════════════════════╗
║  ❌ *DELETE FAILED*   ║
╚══════════════════════╝

🔒 *Reason:* ${reason}

📌 *You can only delete:*
• Your own messages
• Bot messages
• Group messages (if admin)
• Any message (if bot owner)

💡 *Usage:* Reply to a message with .delete`,
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
            
            // Send processing message
            const processingMsg = await sock.sendMessage(chatId, { 
                text: '🗑️ *Deleting message...*',
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
            
            // Attempt to delete the message
            try {
                await sock.sendMessage(chatId, {
                    delete: messageToDelete
                });
                
                // Delete processing message
                await sock.sendMessage(chatId, { delete: processingMsg.key });
                
                // Send success notification (will auto-delete after 2 seconds)
                const successMsg = await sock.sendMessage(chatId, { 
                    text: `✅ *Message deleted successfully!*\n\n👤 *Action by:* @${sender.split('@')[0]}\n📋 *Reason:* ${reason}`,
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
                
            } catch (deleteError) {
                await sock.sendMessage(chatId, { delete: processingMsg.key });
                
                await sock.sendMessage(chatId, { 
                    text: `❌ *Failed to delete message:*\n${deleteError.message}`,
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
            
        } catch (error) {
            console.error('Delete Command Error:', error);
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