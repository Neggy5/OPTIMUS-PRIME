/**
 * Leave Command - Leave a WhatsApp group
 */

module.exports = {
    name: 'leave',
    aliases: ['leavegroup', 'exit', 'quit'],
    category: 'owner',
    description: 'Leave a WhatsApp group',
    usage: '.leave [group id or reply]',
    ownerOnly: true, // Only bot owner can use this
    
    async execute(sock, msg, args, extra) {
        try {
            const chatId = extra.from;
            const isGroup = extra.isGroup;
            
            let targetGroup = null;
            let groupName = '';
            let groupMetadata = null;

            // Check if command is used in a group
            if (isGroup && args.length === 0) {
                // Leave the current group
                targetGroup = chatId;
                groupMetadata = extra.groupMetadata;
                groupName = groupMetadata?.subject || 'this group';
            } 
            // Check if replying to a message from a group
            else if (msg.message?.extendedTextMessage?.contextInfo?.participant) {
                const quotedJid = msg.message.extendedTextMessage.contextInfo.participant;
                const quotedGroup = msg.key.remoteJid;
                
                if (quotedGroup.endsWith('@g.us')) {
                    targetGroup = quotedGroup;
                    groupMetadata = await sock.groupMetadata(targetGroup).catch(() => null);
                    groupName = groupMetadata?.subject || 'the group';
                }
            }
            // Check if group ID provided in args
            else if (args.length > 0) {
                let potentialGroup = args[0];
                
                // Clean up the group ID
                if (!potentialGroup.includes('@g.us')) {
                    potentialGroup = potentialGroup.replace(/[^a-zA-Z0-9]/g, '');
                    if (potentialGroup.length > 10) {
                        potentialGroup = `${potentialGroup}@g.us`;
                    }
                }
                
                try {
                    groupMetadata = await sock.groupMetadata(potentialGroup).catch(() => null);
                    if (groupMetadata) {
                        targetGroup = potentialGroup;
                        groupName = groupMetadata.subject || 'the group';
                    }
                } catch (e) {
                    // Invalid group ID
                }
            }

            // If no target group found, show help
            if (!targetGroup) {
                // List all groups bot is in
                try {
                    const groups = await sock.groupFetchAllParticipating();
                    const groupList = Object.values(groups).map((g, i) => 
                        `${i+1}. *${g.subject}*\n   ID: \`${g.id}\`\n   Members: ${g.participants.length}`
                    ).join('\n\n');

                    return extra.reply(`╔══════════════════════╗
║  🚪 *LEAVE GROUP COMMAND*  🚪 ║
╚══════════════════════╝

❌ *Please specify which group to leave!*

📌 *Usage:*
• In a group: .leave - Leave current group
• Reply to any group message: .leave
• .leave <group ID> - Leave specific group

━━━━━━━━━━━━━━━━━━━
📋 *Groups bot is in:*
${groupList || 'No groups found'}

━━━━━━━━━━━━━━━━━━━
💡 *Example:* .leave 123456789@g.us

⚠️ *Owner only command*

> *ᴘᴏᴡᴇʀᴇᴅ ʙʏ 𝑂𝑃𝑇𝐼𝑀𝑈𝑆 𝑃𝑅𝐼𝑀𝐸*`);
                } catch (e) {
                    return extra.reply('❌ *Please specify a group to leave!*\n\nUse .leave in a group or provide group ID.');
                }
            }

            // Confirm before leaving
            if (!args.includes('--force')) {
                const confirmMsg = await sock.sendMessage(chatId, {
                    text: `⚠️ *Are you sure you want to leave ${groupName}?*\n\nType: .leave --force to confirm.`
                });

                // Set a timeout to delete confirmation
                setTimeout(async () => {
                    try {
                        await sock.sendMessage(chatId, { delete: confirmMsg.key });
                    } catch (e) {}
                }, 30000);

                return;
            }

            // Send processing message
            const processingMsg = await sock.sendMessage(chatId, {
                text: `🚪 *Leaving ${groupName}...*`
            });

            try {
                // Say goodbye before leaving
                await sock.sendMessage(targetGroup, {
                    text: `👋 *Goodbye everyone!*\n\nI'm leaving this group as requested by my owner.\n\nThank you for having me! 🤖`,
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

                // Small delay to ensure message is sent
                await new Promise(resolve => setTimeout(resolve, 2000));

                // Leave the group
                await sock.groupLeave(targetGroup);

                // Delete processing message
                await sock.sendMessage(chatId, { delete: processingMsg.key });

                // Send success message
                await sock.sendMessage(chatId, {
                    text: `✅ *Successfully left ${groupName}!*`,
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

                console.log(`[Leave] Bot left group: ${groupName} (${targetGroup})`);

            } catch (error) {
                console.error('Leave error:', error);
                await sock.sendMessage(chatId, { delete: processingMsg.key });

                let errorMessage = '❌ *Failed to leave group.*';
                
                if (error.message.includes('404')) {
                    errorMessage = '❌ *Group not found!*\n\nThe group may no longer exist.';
                } else if (error.message.includes('403')) {
                    errorMessage = '❌ *Cannot leave group!*\n\nThe bot may already be out of the group.';
                }

                await extra.reply(errorMessage);
            }

        } catch (error) {
            console.error('Leave Command Error:', error);
            await extra.reply(`❌ *Error:* ${error.message}`);
        }
    }
};