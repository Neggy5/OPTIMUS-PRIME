/**
 * Join Command - Join a WhatsApp group using invite link
 */

const { downloadContentFromMessage } = require('@whiskeysockets/baileys');

module.exports = {
    name: 'join',
    aliases: ['joingroup', 'joinlink', 'accept'],
    category: 'owner',
    description: 'Join a WhatsApp group using invite link',
    usage: '.join <group link>',
    ownerOnly: true, // Only bot owner can use this
    
    async execute(sock, msg, args, extra) {
        try {
            const chatId = extra.from;
            const link = args.join(' ').trim();
            
            if (!link) {
                return extra.reply(`╔══════════════════════╗
║  🔗 *JOIN GROUP COMMAND*  🔗 ║
╚══════════════════════╝

❌ *Please provide a group invite link!*

📌 *Usage:*
• .join <group link>
• .joingroup <link>
• .accept <link>

💡 *Examples:*
• .join https://chat.whatsapp.com/AbCdEfGhIjKl
• .joingroup https://chat.whatsapp.com/XYZ123

⚠️ *Owner only command*

📝 *Note:* The bot will automatically join the group.

> *ᴘᴏᴡᴇʀᴇᴅ ʙʏ 𝑂𝑃𝑇𝐼𝑀𝑈𝑆 𝑃𝑅𝐼𝑀𝐸*`);
            }

            // Extract invite code from various link formats
            let inviteCode = '';
            
            if (link.includes('chat.whatsapp.com/')) {
                inviteCode = link.split('chat.whatsapp.com/')[1].split(' ')[0].split('?')[0];
            } else if (link.includes('whatsapp.com/')) {
                inviteCode = link.split('whatsapp.com/')[1].split(' ')[0].split('?')[0];
            } else {
                // Assume it's just the code
                inviteCode = link.replace(/[^a-zA-Z0-9]/g, '');
            }

            if (!inviteCode || inviteCode.length < 10) {
                return extra.reply('❌ *Invalid invite link!*\n\nPlease provide a valid WhatsApp group invite link.');
            }

            // Send processing message
            const processingMsg = await sock.sendMessage(chatId, {
                text: `🔍 *Processing invite link...*\n\n⏳ Attempting to join group...`
            });

            try {
                // Try to join the group
                const groupId = await sock.groupAcceptInvite(inviteCode);
                
                // Get group metadata to verify
                const groupMetadata = await sock.groupMetadata(groupId);
                const groupName = groupMetadata.subject || 'Unknown Group';
                const memberCount = groupMetadata.participants?.length || 0;

                // Delete processing message
                await sock.sendMessage(chatId, { delete: processingMsg.key });

                // Send success message
                await sock.sendMessage(chatId, {
                    text: `╔══════════════════════╗
║  ✅ *JOINED GROUP SUCCESSFULLY*  ✅ ║
╚══════════════════════╝

📌 *Group Name:* ${groupName}
🆔 *Group ID:* ${groupId}
👥 *Members:* ${memberCount}
🔗 *Invite Code:* ${inviteCode}

━━━━━━━━━━━━━━━━━━━
📋 *Available commands for this group:*
• Use .leave to leave this group
• Use .groupinfo to see group details
• Use .members to list members

> *ᴘᴏᴡᴇʀᴇᴅ ʙʏ 𝑂𝑃𝑇𝐼𝑀𝑈𝑆 𝑃𝑅𝐼𝑀𝐸`,
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

                // Send notification in the joined group
                await sock.sendMessage(groupId, {
                    text: `🤖 *Hello everyone!*\n\nI'm 𝑂𝑃𝑇𝐼𝑀𝑈𝑆 𝑃𝑅𝐼𝑀𝐸 Bot. I've joined this group.\nUse .menu to see my commands.`,
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

                console.log(`[Join] Bot joined group: ${groupName} (${groupId})`);

            } catch (error) {
                console.error('Join error:', error);
                await sock.sendMessage(chatId, { delete: processingMsg.key });

                let errorMessage = '❌ *Failed to join group.*';
                
                if (error.message.includes('404')) {
                    errorMessage = '❌ *Invalid invite link!*\n\nThe link may be expired or invalid.';
                } else if (error.message.includes('403')) {
                    errorMessage = '❌ *Cannot join group!*\n\nThe bot may be banned or blocked.';
                } else if (error.message.includes('409')) {
                    errorMessage = '❌ *Already in group!*\n\nThe bot is already a member of this group.';
                }

                await extra.reply(errorMessage);
            }

        } catch (error) {
            console.error('Join Command Error:', error);
            await extra.reply(`❌ *Error:* ${error.message}`);
        }
    }
};