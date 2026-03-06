/**
 * Kick Command - Remove members from group
 */

module.exports = {
    name: 'kick',
    aliases: ['remove', 'ban', 'out'],
    description: 'Remove members from the group',
    usage: '.kick @mention or reply to message',
    groupOnly: true,
    adminOnly: true,
    botAdminNeeded: true,
    
    async execute(sock, msg, args, extra) {
        try {
            const chatId = msg.key.remoteJid;
            const sender = msg.key.participant || chatId;
            
            // Get users to kick
            let usersToKick = [];
            
            // Check for mentions
            const mentionedJids = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
            if (mentionedJids.length > 0) {
                usersToKick = mentionedJids;
            }
            
            // Check if replying to a message
            const quotedParticipant = msg.message?.extendedTextMessage?.contextInfo?.participant;
            if (quotedParticipant && usersToKick.length === 0) {
                usersToKick = [quotedParticipant];
            }
            
            // Check if providing numbers in args
            if (args.length > 0 && usersToKick.length === 0) {
                // Extract numbers from args (remove @ if present)
                const numbers = args.map(arg => {
                    let num = arg.replace('@', '');
                    if (!num.includes('@')) {
                        num = `${num}@s.whatsapp.net`;
                    }
                    return num;
                });
                usersToKick = numbers;
            }
            
            if (usersToKick.length === 0) {
                return await sock.sendMessage(chatId, { 
                    text: `╔══════════════════════╗
║  ❌ *KICK COMMAND*   ║
╚══════════════════════╝

*Usage:* .kick @mention
*Or:* Reply to user's message

📌 *Examples:*
• .kick @user
• Reply to a message with .kick

*Options:*
• Multiple mentions: .kick @user1 @user2
• Remove multiple: Reply to multiple messages`,
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
                text: `🔄 *Processing kick request...*\n\n👥 Users: ${usersToKick.length}`,
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
            
            // Get group metadata to check if users are in group
            const groupMetadata = await sock.groupMetadata(chatId);
            const groupParticipants = groupMetadata.participants.map(p => p.id);
            
            // Filter users that are actually in the group
            const validUsers = usersToKick.filter(user => 
                groupParticipants.includes(user)
            );
            
            const invalidUsers = usersToKick.filter(user => 
                !groupParticipants.includes(user)
            );
            
            if (validUsers.length === 0) {
                await sock.sendMessage(chatId, { delete: processingMsg.key });
                return await sock.sendMessage(chatId, { 
                    text: `❌ *None of the specified users are in this group!*`,
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
            
            // Check if trying to kick bot itself
            const botJid = sock.user.id.split(':')[0] + '@s.whatsapp.net';
            if (validUsers.includes(botJid)) {
                await sock.sendMessage(chatId, { delete: processingMsg.key });
                return await sock.sendMessage(chatId, { 
                    text: `🤖 *I can't kick myself!*\n\nIf you want me to leave, use *.leave* command.`,
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
            
            // Check if trying to kick group owner
            const groupOwner = groupMetadata.owner;
            if (groupOwner && validUsers.includes(groupOwner)) {
                await sock.sendMessage(chatId, { delete: processingMsg.key });
                return await sock.sendMessage(chatId, { 
                    text: `👑 *Cannot kick the group owner!*`,
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
            
            // Check if trying to kick admins (except if sender is owner)
            const isSenderOwner = extra.isOwner || false;
            const admins = groupMetadata.participants
                .filter(p => p.admin === 'admin' || p.admin === 'superadmin')
                .map(p => p.id);
            
            const adminToKick = validUsers.filter(user => admins.includes(user));
            
            if (adminToKick.length > 0 && !isSenderOwner) {
                await sock.sendMessage(chatId, { delete: processingMsg.key });
                return await sock.sendMessage(chatId, { 
                    text: `👮 *Only the group owner can kick admins!*`,
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
            
            // Perform the kick
            const results = {
                success: [],
                failed: []
            };
            
            for (const user of validUsers) {
                try {
                    await sock.groupParticipantsUpdate(chatId, [user], 'remove');
                    results.success.push(user);
                } catch (err) {
                    results.failed.push({ user, reason: err.message });
                }
            }
            
            // Delete processing message
            await sock.sendMessage(chatId, { delete: processingMsg.key });
            
            // Build result message
            let resultText = `╔══════════════════════╗
║  👢 *KICK RESULTS*   ║
╚══════════════════════╝\n\n`;
            
            if (results.success.length > 0) {
                const successMentions = results.success.map(u => `@${u.split('@')[0]}`).join(', ');
                resultText += `✅ *Successfully kicked:*\n${successMentions}\n\n`;
            }
            
            if (results.failed.length > 0) {
                resultText += `❌ *Failed to kick:*\n`;
                results.failed.forEach(f => {
                    resultText += `• @${f.user.split('@')[0]}: ${f.reason}\n`;
                });
                resultText += `\n`;
            }
            
            if (invalidUsers.length > 0) {
                const invalidMentions = invalidUsers.map(u => `@${u.split('@')[0]}`).join(', ');
                resultText += `⚠️ *Not in group:*\n${invalidMentions}\n\n`;
            }
            
            resultText += `━━━━━━━━━━━━━━━━━━━\n`;
            resultText += `👤 *Action by:* @${sender.split('@')[0]}\n`;
            resultText += `📊 *Total kicked:* ${results.success.length}\n`;
            resultText += `━━━━━━━━━━━━━━━━━━━\n\n`;
            resultText += `> *ᴘᴏᴡᴇʀᴇᴅ ʙʏ 𝑂𝑃𝑇𝐼𝑀𝑈𝑆 𝑃𝑅𝐼𝑀𝐸*`;
            
            // Collect all mentions for the message
            const allMentions = [
                ...results.success,
                ...results.failed.map(f => f.user),
                ...invalidUsers,
                sender
            ];
            
            await sock.sendMessage(chatId, { 
                text: resultText,
                mentions: allMentions,
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
            console.error('Kick Error:', error);
            await sock.sendMessage(msg.key.remoteJid, { 
                text: `❌ *Error kicking user:* ${error.message}`,
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