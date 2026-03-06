/**
 * ViewOnce Command - Extract and reveal view-once media
 */

const fs = require('fs');
const path = require('path');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');

module.exports = {
    name: 'viewonce',
    aliases: ['vv', 'reveal', 'view', 'once'],
    description: 'Extract and reveal view-once media',
    usage: '.viewonce (reply to view-once message)',
    groupOnly: false,
    adminOnly: false,
    botAdminNeeded: false,
    
    async execute(sock, msg, args, extra) {
        try {
            const chatId = msg.key.remoteJid;
            const sender = msg.key.participant || chatId;
            
            // Check if replying to a message
            const quotedMsg = msg.message?.extendedTextMessage?.contextInfo;
            const quotedMessage = quotedMsg?.quotedMessage;
            
            if (!quotedMsg || !quotedMessage) {
                return await sock.sendMessage(chatId, { 
                    text: `╔══════════════════════╗
║  👁️ *VIEW ONCE EXTRACTOR*  ║
╚══════════════════════╝

❌ *Please reply to a view-once message!*

📌 *How to use:*
1. Wait for a view-once message
2. Reply to it with .viewonce
3. Bot will reveal and forward it

⚠️ *Note:* Works on images, videos & audio
Only works on view-once media!`,
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
            
            // Check if it's a view-once message
            const isViewOnce = 
                quotedMessage?.imageMessage?.viewOnce || 
                quotedMessage?.videoMessage?.viewOnce || 
                quotedMessage?.audioMessage?.viewOnce ||
                quotedMessage?.viewOnceMessageV2 ||
                quotedMessage?.viewOnceMessage;
            
            if (!isViewOnce) {
                return await sock.sendMessage(chatId, { 
                    text: `❌ *This is not a view-once message!*\n\nReply to a view-once image/video/audio.`,
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
                text: '👁️ *Extracting view-once media...*',
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
            
            // Determine media type and extract
            let mediaType = null;
            let mediaMessage = null;
            let caption = '';
            
            if (quotedMessage.imageMessage) {
                mediaType = 'image';
                mediaMessage = quotedMessage.imageMessage;
                caption = quotedMessage.imageMessage.caption || '';
            } else if (quotedMessage.videoMessage) {
                mediaType = 'video';
                mediaMessage = quotedMessage.videoMessage;
                caption = quotedMessage.videoMessage.caption || '';
            } else if (quotedMessage.audioMessage) {
                mediaType = 'audio';
                mediaMessage = quotedMessage.audioMessage;
            } else if (quotedMessage.viewOnceMessageV2) {
                const voMsg = quotedMessage.viewOnceMessageV2.message;
                if (voMsg.imageMessage) {
                    mediaType = 'image';
                    mediaMessage = voMsg.imageMessage;
                    caption = voMsg.imageMessage.caption || '';
                } else if (voMsg.videoMessage) {
                    mediaType = 'video';
                    mediaMessage = voMsg.videoMessage;
                    caption = voMsg.videoMessage.caption || '';
                } else if (voMsg.audioMessage) {
                    mediaType = 'audio';
                    mediaMessage = voMsg.audioMessage;
                }
            } else if (quotedMessage.viewOnceMessage) {
                const voMsg = quotedMessage.viewOnceMessage.message;
                if (voMsg.imageMessage) {
                    mediaType = 'image';
                    mediaMessage = voMsg.imageMessage;
                    caption = voMsg.imageMessage.caption || '';
                } else if (voMsg.videoMessage) {
                    mediaType = 'video';
                    mediaMessage = voMsg.videoMessage;
                    caption = voMsg.videoMessage.caption || '';
                } else if (voMsg.audioMessage) {
                    mediaType = 'audio';
                    mediaMessage = voMsg.audioMessage;
                }
            }
            
            if (!mediaType || !mediaMessage) {
                await sock.sendMessage(chatId, { delete: processingMsg.key });
                return await sock.sendMessage(chatId, { 
                    text: `❌ *Could not extract media!*\n\nUnsupported view-once type.`,
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
            
            try {
                // Download the media
                const stream = await downloadContentFromMessage(mediaMessage, mediaType);
                let buffer = Buffer.from([]);
                
                for await (const chunk of stream) {
                    buffer = Buffer.concat([buffer, chunk]);
                }
                
                // Prepare the message to send
                const messageOptions = {
                    contextInfo: {
                        forwardingScore: 999,
                        isForwarded: true,
                        forwardedNewsletterMessageInfo: {
                            newsletterJid: '120363405724402785@newsletter',
                            newsletterName: '𝑂𝑃𝑇𝐼𝑀𝑈𝑆 𝑃𝑅𝐼𝑀𝐸',
                            serverMessageId: -1
                        }
                    }
                };
                
                // Add caption if present
                const finalCaption = `👁️ *REVEALED VIEW-ONCE*\n\n${caption ? `📝 *Caption:* ${caption}\n\n` : ''}👤 *Original sender:* @${quotedMsg.participant.split('@')[0]}\n⏱️ *Extracted at:* ${new Date().toLocaleTimeString()}`;
                
                // Send based on media type
                if (mediaType === 'image') {
                    await sock.sendMessage(chatId, {
                        image: buffer,
                        caption: finalCaption,
                        mentions: [quotedMsg.participant],
                        ...messageOptions
                    });
                } else if (mediaType === 'video') {
                    await sock.sendMessage(chatId, {
                        video: buffer,
                        caption: finalCaption,
                        mentions: [quotedMsg.participant],
                        ...messageOptions
                    });
                } else if (mediaType === 'audio') {
                    await sock.sendMessage(chatId, {
                        audio: buffer,
                        mimetype: 'audio/mp4',
                        ptt: mediaMessage.ptt || false,
                        contextInfo: {
                            ...messageOptions.contextInfo,
                            quotedMessage: null
                        }
                    });
                    
                    // Send text separately for audio
                    await sock.sendMessage(chatId, {
                        text: `👁️ *REVEALED VIEW-ONCE AUDIO*\n\n👤 *Original sender:* @${quotedMsg.participant.split('@')[0]}`,
                        mentions: [quotedMsg.participant],
                        ...messageOptions
                    });
                }
                
                // Delete processing message
                await sock.sendMessage(chatId, { delete: processingMsg.key });
                
                // Notify in private if in group (optional)
                if (chatId.endsWith('@g.us')) {
                    await sock.sendMessage(sender, {
                        text: `👁️ *View-once extracted successfully!*\n\n📌 The media has been revealed in the group.\n\n⚠️ *Note:* Use this feature responsibly!`,
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
                
            } catch (downloadError) {
                console.error('Download error:', downloadError);
                await sock.sendMessage(chatId, { delete: processingMsg.key });
                await sock.sendMessage(chatId, { 
                    text: `❌ *Failed to download view-once media:*\n${downloadError.message}`,
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
            console.error('ViewOnce Command Error:', error);
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