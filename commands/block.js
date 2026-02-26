/**
 * Block Command - Permanently block users on WhatsApp
 */

const config = require('../config');
const fs = require('fs');
const path = require('path');

// Database path for tracking blocked users
const BLOCKED_DB_PATH = path.join(__dirname, '../database/blocked_users.json');

// Load blocked users database
const loadBlockedDB = () => {
    try {
        const dir = path.dirname(BLOCKED_DB_PATH);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        
        if (fs.existsSync(BLOCKED_DB_PATH)) {
            const data = fs.readFileSync(BLOCKED_DB_PATH, 'utf8');
            return JSON.parse(data);
        } else {
            // Create empty database
            const defaultDB = {
                blockedUsers: [],
                lastUpdated: null
            };
            fs.writeFileSync(BLOCKED_DB_PATH, JSON.stringify(defaultDB, null, 2));
            return defaultDB;
        }
    } catch (error) {
        console.error('Error loading blocked database:', error);
        return { blockedUsers: [] };
    }
};

// Save blocked users database
const saveBlockedDB = (data) => {
    try {
        const dir = path.dirname(BLOCKED_DB_PATH);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(BLOCKED_DB_PATH, JSON.stringify(data, null, 2));
        return true;
    } catch (error) {
        console.error('Error saving blocked database:', error);
        return false;
    }
};

// Function to permanently block a user
const permanentlyBlockUser = async (sock, userJid) => {
    try {
        // Method 1: Standard block
        await sock.updateBlockStatus(userJid, 'block');
        console.log(`[Block] Standard block applied for ${userJid}`);
        
        // Method 2: Add to local database for tracking
        const blockedDB = loadBlockedDB();
        if (!blockedDB.blockedUsers.includes(userJid)) {
            blockedDB.blockedUsers.push(userJid);
            blockedDB.lastUpdated = Date.now();
            saveBlockedDB(blockedDB);
            console.log(`[Block] Added ${userJid} to permanent block database`);
        }
        
        // Method 3: Set up re-block timer (reapply block every 24 hours)
        // This ensures if WhatsApp auto-unblocks, we block again
        const reblockTimer = setInterval(async () => {
            try {
                // Check if user is still in our database
                const currentDB = loadBlockedDB();
                if (!currentDB.blockedUsers.includes(userJid)) {
                    clearInterval(reblockTimer);
                    return;
                }
                
                // Reapply block
                await sock.updateBlockStatus(userJid, 'block');
                console.log(`[Block] Re-blocked ${userJid} (24h maintenance)`);
            } catch (reblockError) {
                console.error(`[Block] Re-block error for ${userJid}:`, reblockError);
            }
        }, 24 * 60 * 60 * 1000); // Every 24 hours
        
        // Store timer reference (optional - you might want to manage these globally)
        
        return true;
    } catch (error) {
        console.error('Error in permanent block:', error);
        return false;
    }
};

// Function to unblock permanently
const permanentlyUnblockUser = async (sock, userJid) => {
    try {
        // Method 1: Standard unblock
        await sock.updateBlockStatus(userJid, 'unblock');
        
        // Method 2: Remove from database
        const blockedDB = loadBlockedDB();
        blockedDB.blockedUsers = blockedDB.blockedUsers.filter(jid => jid !== userJid);
        blockedDB.lastUpdated = Date.now();
        saveBlockedDB(blockedDB);
        
        console.log(`[Unblock] Removed ${userJid} from permanent block database`);
        return true;
    } catch (error) {
        console.error('Error in permanent unblock:', error);
        return false;
    }
};

// Initialize re-block timers for all previously blocked users on startup
const initializePermanentBlocks = (sock) => {
    try {
        const blockedDB = loadBlockedDB();
        console.log(`[Block] Initializing permanent blocks for ${blockedDB.blockedUsers.length} users`);
        
        blockedDB.blockedUsers.forEach(userJid => {
            // Set up re-block timer for each previously blocked user
            setInterval(async () => {
                try {
                    await sock.updateBlockStatus(userJid, 'block');
                    console.log(`[Block] Maintenance re-block for ${userJid}`);
                } catch (error) {
                    console.error(`[Block] Maintenance error for ${userJid}:`, error);
                }
            }, 24 * 60 * 60 * 1000); // Every 24 hours
        });
    } catch (error) {
        console.error('Error initializing permanent blocks:', error);
    }
};

module.exports = {
    name: 'block',
    aliases: ['banuser', 'blockuser', 'permanentblock'],
    description: 'Permanently block users on WhatsApp',
    usage: '.block @mention or reply to user',
    groupOnly: false,
    adminOnly: false,
    botAdminNeeded: false,
    ownerOnly: true,
    
    async execute(sock, msg, args, extra) {
        try {
            const chatId = msg.key.remoteJid;
            const sender = msg.key.participant || chatId;
            
            // Get user to block
            let userToBlock = null;
            
            // Check for mentions
            const mentionedJids = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
            if (mentionedJids.length > 0) {
                userToBlock = mentionedJids[0];
            }
            
            // Check if replying to a message
            const quotedParticipant = msg.message?.extendedTextMessage?.contextInfo?.participant;
            if (quotedParticipant && !userToBlock) {
                userToBlock = quotedParticipant;
            }
            
            // Check if providing number in args
            if (args.length > 0 && !userToBlock) {
                let num = args[0].replace(/[^0-9]/g, '');
                if (num) {
                    userToBlock = num.includes('@') ? num : `${num}@s.whatsapp.net`;
                }
            }
            
            if (!userToBlock) {
                return await sock.sendMessage(chatId, { 
                    text: `╔══════════════════════╗
║  🚫 *PERMANENT BLOCK*   ║
╚══════════════════════╝

❌ *Please specify a user to block!*

📌 *Usage:*
• .block @mention
• Reply to user with .block
• .block 1234567890

⚠️ *Owner only command*
🔒 *Blocks are PERMANENT and maintained daily*

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
            }
            
            // Don't allow blocking self
            const botJid = sock.user.id.split(':')[0] + '@s.whatsapp.net';
            if (userToBlock === botJid) {
                return await sock.sendMessage(chatId, { 
                    text: `🤖 *I can't block myself!*`,
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
            
            // Don't allow blocking owner
            const ownerNumbers = Array.isArray(config.ownerNumber) ? config.ownerNumber : [config.ownerNumber];
            
            const isOwner = ownerNumbers.some(owner => {
                const ownerJid = owner.includes('@') ? owner : `${owner}@s.whatsapp.net`;
                return userToBlock === ownerJid;
            });
            
            if (isOwner) {
                return await sock.sendMessage(chatId, { 
                    text: `👑 *Cannot block the bot owner!*`,
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
                text: `🚫 *Applying permanent block...*\n\n👤 User: @${userToBlock.split('@')[0]}`,
                mentions: [userToBlock],
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
            
            // Check current block status
            const blockList = await sock.fetchBlocklist();
            const isAlreadyBlocked = blockList && blockList.includes(userToBlock);
            
            // Check local database
            const blockedDB = loadBlockedDB();
            const isInLocalDB = blockedDB.blockedUsers.includes(userToBlock);
            
            if (isAlreadyBlocked && isInLocalDB) {
                await sock.sendMessage(chatId, { delete: processingMsg.key });
                return await sock.sendMessage(chatId, { 
                    text: `⚠️ *User @${userToBlock.split('@')[0]} is already permanently blocked!*`,
                    mentions: [userToBlock],
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
            
            // Perform permanent block (multiple layers)
            const blockSuccess = await permanentlyBlockUser(sock, userToBlock);
            
            if (!blockSuccess) {
                throw new Error('Failed to apply permanent block');
            }
            
            // Delete processing message
            await sock.sendMessage(chatId, { delete: processingMsg.key });
            
            // Send success message with permanent block info
            await sock.sendMessage(chatId, { 
                text: `╔══════════════════════╗
║  ✅ *PERMANENT BLOCK*  ║
╚══════════════════════╝

🚫 *Blocked user:* @${userToBlock.split('@')[0]}

📌 *Details:*
• They cannot message you
• They cannot see your status
• They cannot call you
• They will be removed from groups
• 🔒 *Block is PERMANENT*
• ⏱️ *Auto-maintained every 24h*

👤 *Action by:* @${sender.split('@')[0]}

💡 *Use .unblock to remove permanent block*`,
                mentions: [userToBlock, sender],
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
            
            // Notify in private if command used in group
            if (chatId.endsWith('@g.us')) {
                await sock.sendMessage(sender, {
                    text: `✅ *Permanent block applied!*\n\n👤 User: @${userToBlock.split('@')[0]}\n\nThis user will remain blocked forever.`,
                    mentions: [userToBlock],
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
            console.error('Block Command Error:', error);
            await sock.sendMessage(msg.key.remoteJid, { 
                text: `❌ *Error blocking user:* ${error.message}`,
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

// Export initialization function
module.exports.initializePermanentBlocks = initializePermanentBlocks;