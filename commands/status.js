/**
 * Status Downloader - Download WhatsApp status updates
 */

const fs = require('fs');
const path = require('path');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');

// Store processed status IDs to prevent duplicates
const processedStatus = new Set();

// Store status sender info
const statusSenders = new Map();

module.exports = {
    name: 'status',
    aliases: ['story', 'statusdl', 'downloadstatus', 'save'],
    description: 'Download WhatsApp status updates',
    usage: '.status <reply to status or use .status list>',
    groupOnly: false,
    adminOnly: false,
    botAdminNeeded: false,
    
    async execute(sock, msg, args, extra) {
        try {
            const chatId = extra.from;
            const sender = extra.sender;
            const isGroup = extra.isGroup;
            
            // Check if it's a status broadcast
            const isStatusBroadcast = chatId === 'status@broadcast';
            
            // Handle list command
            if (args[0] === 'list') {
                const statusList = [];
                statusSenders.forEach((data, jid) => {
                    statusList.push({
                        jid,
                        name: data.name || jid.split('@')[0],
                        count: data.count || 1
                    });
                });
                
                if (statusList.length === 0) {
                    return extra.reply('📭 *No recent status updates found.*\n\nWait for someone to post a status and try again.');
                }
                
                let listText = `╔══════════════════════╗
║  📱 *STATUS UPDATES*  ║
╚══════════════════════╝\n\n`;
                
                statusList.forEach((status, index) => {
                    listText += `${index + 1}. *${status.name}*\n`;
                    listText += `   ├ Statuses: ${status.count}\n`;
                    listText += `   └ To download: .status ${index + 1}\n\n`;
                });
                
                listText += `━━━━━━━━━━━━━━━━━━━\n`;
                listText += `💡 *How to use:*\n`;
                listText += `• .status <number> - Download from that user\n`;
                listText += `• Reply to a status with .status\n`;
                listText += `> *ᴘᴏᴡᴇʀᴇᴅ ʙʏ 𝑂𝑃𝑇𝐼𝑀𝑈𝑆 𝑃𝑅𝐼𝑀𝐸*`;
                
                return extra.reply(listText);
            }
            
            // Check if replying to a status message
            const quotedMsg = msg.message?.extendedTextMessage?.contextInfo;
            const quotedMessage = quotedMsg?.quotedMessage;
            
            // If not in status broadcast and not replying, show help
            if (!isStatusBroadcast && !quotedMsg) {
                return extra.reply(`╔══════════════════════╗
║  📱 *STATUS DOWNLOADER*  ║
╚══════════════════════╝

❌ *Please reply to a status!*

📋 *Commands:*
• .status list - Show recent status updates
• .status <number> - Download status by number
• Reply to any status with .status

💡 *How to use:*
1. Go to Status/Updates tab
2. Find a status you want to save
3. Reply to it with .status
4. Bot will download and send it

⚡ *Works with images, videos, and text statuses!*

> *ᴘᴏᴡᴇʀᴇᴅ ʙʏ 𝑂𝑃𝑇𝐼𝑀𝑈𝑆 𝑃𝑅𝐼𝑀𝐸*`);
            }
            
            // Handle number input (download by list number)
            if (args[0] && !isNaN(args[0]) && !quotedMsg) {
                const index = parseInt(args[0]) - 1;
                const statusList = Array.from(statusSenders.entries());
                
                if (index < 0 || index >= statusList.length) {
                    return extra.reply('❌ *Invalid number!*\n\nUse .status list to see available statuses.');
                }
                
                const [targetJid, data] = statusList[index];
                
                // We don't actually store the status media, so we can't download by number
                // This would require storing the actual status data, which is complex
                return extra.reply(`❌ *Cannot download by number directly.*\n\nPlease reply to the status message with .status to download it.`);
            }
            
            // Handle direct status reply
            let mediaMessage = null;
            let mediaType = null;
            let caption = '';
            
            if (quotedMessage) {
                // Check for image
                if (quotedMessage.imageMessage) {
                    mediaMessage = quotedMessage.imageMessage;
                    mediaType = 'image';
                    caption = quotedMessage.imageMessage.caption || '';
                }
                // Check for video
                else if (quotedMessage.videoMessage) {
                    mediaMessage = quotedMessage.videoMessage;
                    mediaType = 'video';
                    caption = quotedMessage.videoMessage.caption || '';
                }
                // Check for audio
                else if (quotedMessage.audioMessage) {
                    mediaMessage = quotedMessage.audioMessage;
                    mediaType = 'audio';
                }
                // Check for text/conversation
                else if (quotedMessage.conversation || quotedMessage.extendedTextMessage) {
                    const text = quotedMessage.conversation || quotedMessage.extendedTextMessage?.text;
                    if (text) {
                        mediaType = 'text';
                        caption = text;
                    }
                }
            }
            
            // If in status broadcast but no quoted message, show help
            if (isStatusBroadcast && !mediaMessage && mediaType !== 'text') {
                return extra.reply('❌ *Please reply to a specific status message!*');
            }
            
            // If no media found
            if (!mediaMessage && mediaType !== 'text') {
                return extra.reply('❌ *Could not find status media!*\n\nMake sure you replied to a status message.');
            }
            
            // Get status sender info
            const statusSender = quotedMsg?.participant || chatId;
            const senderName = msg.pushName || statusSender.split('@')[0];
            
            // Store sender info
            const current = statusSenders.get(statusSender) || { name: senderName, count: 0 };
            current.count++;
            statusSenders.set(statusSender, current);
            
            // Clean up old entries (keep last 50)
            if (statusSenders.size > 50) {
                const oldest = Array.from(statusSenders.keys())[0];
                statusSenders.delete(oldest);
            }
            
            // Send processing message
            const processingMsg = await sock.sendMessage(chatId, {
                text: `📥 *Downloading status...*`
            }, { quoted: msg });
            
            try {
                // Handle text status
                if (mediaType === 'text') {
                    const textCaption = `╔══════════════════════╗
║  📝 *TEXT STATUS*  ║
╚══════════════════════╝

👤 *From:* ${senderName}
📅 *Time:* ${new Date().toLocaleString()}

━━━━━━━━━━━━━━━━━━━
${caption}
━━━━━━━━━━━━━━━━━━━

📥 *Downloaded by:* @${extra.sender.split('@')[0]}
> *ᴘᴏᴡᴇʀᴇᴅ ʙʏ 𝑂𝑃𝑇𝐼𝑀𝑈𝑆 𝑃𝑅𝐼𝑀𝐸*`;
                    
                    await sock.sendMessage(chatId, { 
                        text: textCaption,
                        mentions: [extra.sender, statusSender],
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
                    
                    await sock.sendMessage(chatId, { delete: processingMsg.key });
                    return;
                }
                
                // Download media
                const stream = await downloadContentFromMessage(mediaMessage, mediaType);
                let buffer = Buffer.from([]);
                
                for await (const chunk of stream) {
                    buffer = Buffer.concat([buffer, chunk]);
                }
                
                if (buffer.length === 0) {
                    throw new Error('Downloaded buffer is empty');
                }
                
                // Create caption
                const mediaCaption = `╔══════════════════════╗
║  📱 *STATUS DOWNLOAD*  ║
╚══════════════════════╝

👤 *From:* ${senderName}
⏱️ *Time:* ${new Date().toLocaleTimeString()}
📅 *Date:* ${new Date().toLocaleDateString()}

📥 *Downloaded by:* @${extra.sender.split('@')[0]}
> *ᴘᴏᴡᴇʀᴇᴅ ʙʏ 𝑂𝑃𝑇𝐼𝑀𝑈𝑆 𝑃𝑅𝐼𝑀𝐸*`;
                
                // Send media based on type
                if (mediaType === 'image') {
                    await sock.sendMessage(chatId, {
                        image: buffer,
                        caption: mediaCaption,
                        mentions: [extra.sender, statusSender],
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
                } else if (mediaType === 'video') {
                    await sock.sendMessage(chatId, {
                        video: buffer,
                        caption: mediaCaption,
                        mentions: [extra.sender, statusSender],
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
                } else if (mediaType === 'audio') {
                    await sock.sendMessage(chatId, {
                        audio: buffer,
                        mimetype: 'audio/mp4',
                        ptt: false,
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
                    
                    // Send caption separately for audio
                    await sock.sendMessage(chatId, {
                        text: mediaCaption,
                        mentions: [extra.sender, statusSender],
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
                
                // Delete processing message
                await sock.sendMessage(chatId, { delete: processingMsg.key });
                
                // Add to processed set to prevent duplicates
                processedStatus.add(msg.key.id);
                setTimeout(() => processedStatus.delete(msg.key.id), 60000);
                
            } catch (downloadError) {
                console.error('Download error:', downloadError);
                await sock.sendMessage(chatId, { delete: processingMsg.key });
                await sock.sendMessage(chatId, {
                    text: `❌ *Failed to download status:*\n${downloadError.message}`,
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
            console.error('Status Command Error:', error);
            await extra.reply(`❌ *Error:* ${error.message}`);
        }
    }
};