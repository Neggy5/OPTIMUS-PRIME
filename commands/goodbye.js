/**
 * Goodbye Command - Set goodbye message for leaving members
 */

const fs = require('fs');
const path = require('path');

// Database path
const DB_PATH = path.join(__dirname, '../database/goodbye.json');

// Default settings
const defaultSettings = {
    enabled: false,
    message: '👋 Goodbye @user! We will miss you!',
    image: null,
    imageUrl: null,
    deleteAfter: 0,
    mentionUser: true,
    showJoinDate: false,
    stats: {
        farewells: 0,
        lastGoodbye: null
    }
};

// Load settings
const loadSettings = (groupId) => {
    try {
        const dir = path.dirname(DB_PATH);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        
        let allSettings = {};
        if (fs.existsSync(DB_PATH)) {
            const data = fs.readFileSync(DB_PATH, 'utf8');
            allSettings = JSON.parse(data);
        }
        
        if (!allSettings[groupId]) {
            allSettings[groupId] = { ...defaultSettings };
            fs.writeFileSync(DB_PATH, JSON.stringify(allSettings, null, 2));
        }
        
        return allSettings[groupId];
    } catch (error) {
        console.error('Error loading goodbye settings:', error);
        return { ...defaultSettings };
    }
};

// Save settings
const saveSettings = (groupId, settings) => {
    try {
        const dir = path.dirname(DB_PATH);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        
        let allSettings = {};
        if (fs.existsSync(DB_PATH)) {
            const data = fs.readFileSync(DB_PATH, 'utf8');
            allSettings = JSON.parse(data);
        }
        
        allSettings[groupId] = settings;
        fs.writeFileSync(DB_PATH, JSON.stringify(allSettings, null, 2));
        return true;
    } catch (error) {
        console.error('Error saving goodbye settings:', error);
        return false;
    }
};

// Format goodbye message
const formatMessage = (template, data) => {
    return template
        .replace(/@user/g, `@${data.userName || data.userNumber}`)
        .replace(/@group/g, data.groupName)
        .replace(/@count/g, data.memberCount)
        .replace(/@time/g, data.time)
        .replace(/@date/g, data.date)
        .replace(/@joined/g, data.joinDate || 'Unknown');
};

module.exports = {
    name: 'goodbye',
    aliases: ['byemsg', 'setgoodbye', 'farewell'],
    category: 'admin',
    description: 'Configure goodbye message for leaving members',
    usage: '.goodbye [on/off/message/image/test]',
    groupOnly: true,
    adminOnly: true,
    botAdminNeeded: false,
    
    async execute(sock, msg, args, extra) {
        try {
            const chatId = extra.from;
            const groupMetadata = extra.groupMetadata;
            const settings = loadSettings(chatId);
            
            if (!args[0]) {
                const status = settings.enabled ? '✅ Enabled' : '❌ Disabled';
                const messagePreview = settings.message.length > 50 
                    ? settings.message.substring(0, 50) + '...' 
                    : settings.message;
                
                return extra.reply(`╔══════════════════════╗
║  👋 *GOODBYE SETTINGS*  👋 ║
╚══════════════════════╝

📊 *Status:* ${status}
📝 *Message:* ${messagePreview}
🖼️ *Image:* ${settings.image ? '✅ Set' : '❌ Not set'}
👤 *Mention User:* ${settings.mentionUser ? '✅' : '❌'}
📅 *Show Join Date:* ${settings.showJoinDate ? '✅' : '❌'}
⏱️ *Auto Delete:* ${settings.deleteAfter > 0 ? settings.deleteAfter + 's' : 'Never'}

━━━━━━━━━━━━━━━━━━━
📋 *Commands:*
• .goodbye on - Enable goodbye
• .goodbye off - Disable goodbye
• .goodbye set message <text> - Set goodbye message
• .goodbye set image - Set image (reply to image)
• .goodbye set delete <seconds> - Auto-delete time
• .goodbye set mention user on/off
• .goodbye set joindate on/off
• .goodbye test - Test goodbye message
• .goodbye variables - Show available variables
• .goodbye reset - Reset to default

━━━━━━━━━━━━━━━━━━━
📝 *Variables:*
• @user - Mentions leaving member
• @group - Group name
• @count - Member count
• @time - Current time
• @date - Current date
• @joined - Join date (if available)

💡 *Example:*
.goodbye set message 😢 Goodbye @user! We'll miss you!

> *ᴘᴏᴡᴇʀᴇᴅ ʙʏ 𝑂𝑃𝑇𝐼𝑀𝑈𝑆 𝑃𝑅𝐼𝑀𝐸*`);
            }

            const opt = args[0].toLowerCase();

            // Handle on/off
            if (opt === 'on') {
                settings.enabled = true;
                saveSettings(chatId, settings);
                return extra.reply(`✅ *Goodbye messages enabled!*\n\nLeaving members will be farewelled.`);
            }

            if (opt === 'off') {
                settings.enabled = false;
                saveSettings(chatId, settings);
                return extra.reply(`❌ *Goodbye messages disabled!*`);
            }

            // Handle variables list
            if (opt === 'variables') {
                return extra.reply(`📝 *GOODBYE VARIABLES*\n\n` +
                    `• @user - Mentions the leaving member\n` +
                    `• @group - Shows group name\n` +
                    `• @count - Shows remaining members\n` +
                    `• @time - Current time\n` +
                    `• @date - Current date\n` +
                    `• @joined - Shows when they joined\n\n` +
                    `💡 *Example:*\n` +
                    `Goodbye @user! You were with us since @joined.`);
            }

            // Handle test
            if (opt === 'test') {
                const testData = {
                    userName: extra.sender.split('@')[0],
                    userNumber: extra.sender.split('@')[0],
                    groupName: groupMetadata.subject || 'Group',
                    memberCount: (groupMetadata.participants?.length || 0) - 1,
                    time: new Date().toLocaleTimeString(),
                    date: new Date().toLocaleDateString(),
                    joinDate: new Date().toLocaleDateString()
                };

                const testMessage = formatMessage(settings.message, testData);
                
                return extra.reply(`🧪 *TEST GOODBYE*\n\n${testMessage}`);
            }

            // Handle reset
            if (opt === 'reset') {
                const newSettings = { ...defaultSettings };
                saveSettings(chatId, newSettings);
                return extra.reply(`✅ *Goodbye settings reset to default!*`);
            }

            // Handle set commands
            if (opt === 'set') {
                const subCmd = args[1]?.toLowerCase();

                if (!subCmd) {
                    return extra.reply('❌ *Please specify what to set!*\n\nOptions: message, image, delete, mention, joindate');
                }

                // Set message
                if (subCmd === 'message') {
                    const message = args.slice(2).join(' ');
                    if (!message) {
                        return extra.reply('❌ *Please provide a goodbye message!*\n\nExample: .goodbye set message Goodbye @user!');
                    }
                    
                    settings.message = message;
                    saveSettings(chatId, settings);
                    return extra.reply(`✅ *Goodbye message set!*\n\nNew message: ${message}`);
                }

                // Set delete time
                if (subCmd === 'delete') {
                    const seconds = parseInt(args[2]);
                    if (!seconds || seconds < 0 || seconds > 3600) {
                        return extra.reply('❌ *Invalid time!*\n\nPlease provide seconds between 0 and 3600 (1 hour).');
                    }
                    
                    settings.deleteAfter = seconds;
                    saveSettings(chatId, settings);
                    return extra.reply(`✅ *Auto-delete time set to ${seconds} seconds!*`);
                }

                // Set image
                if (subCmd === 'image') {
                    const quotedMsg = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
                    if (!quotedMsg?.imageMessage) {
                        return extra.reply('❌ *Please reply to an image!*');
                    }

                    const processing = await sock.sendMessage(chatId, { 
                        text: '🖼️ *Setting goodbye image...*' 
                    });

                    try {
                        const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
                        const stream = await downloadContentFromMessage(quotedMsg.imageMessage, 'image');
                        let buffer = Buffer.from([]);
                        
                        for await (const chunk of stream) {
                            buffer = Buffer.concat([buffer, chunk]);
                        }

                        // Save image as base64
                        settings.image = buffer.toString('base64');
                        saveSettings(chatId, settings);

                        await sock.sendMessage(chatId, { delete: processing.key });
                        await extra.reply(`✅ *Goodbye image set successfully!*`);
                    } catch (error) {
                        await sock.sendMessage(chatId, { delete: processing.key });
                        await extra.reply(`❌ *Failed to set image:* ${error.message}`);
                    }
                    return;
                }

                // Handle mention settings
                if (subCmd === 'mention') {
                    const value = args[2]?.toLowerCase();
                    settings.mentionUser = value === 'on';
                    saveSettings(chatId, settings);
                    return extra.reply(`✅ *Mention user ${value === 'on' ? 'enabled' : 'disabled'}!*`);
                }

                // Handle join date toggle
                if (subCmd === 'joindate') {
                    const value = args[2]?.toLowerCase();
                    settings.showJoinDate = value === 'on';
                    saveSettings(chatId, settings);
                    return extra.reply(`✅ *Show join date ${value === 'on' ? 'enabled' : 'disabled'}!*`);
                }
            }

            extra.reply('❌ *Invalid option.* Use .goodbye for help.');

        } catch (error) {
            console.error('Goodbye Command Error:', error);
            await extra.reply(`❌ *Error:* ${error.message}`);
        }
    }
};