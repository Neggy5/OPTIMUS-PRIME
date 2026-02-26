/**
 * Welcome Command - Set welcome message for new members
 */

const fs = require('fs');
const path = require('path');

// Database path
const DB_PATH = path.join(__dirname, '../database/welcome.json');

// Default settings
const defaultSettings = {
    enabled: false,
    message: '👋 Welcome @user to @group!\nEnjoy your stay!',
    image: null,
    imageUrl: null,
    deleteAfter: 0, // 0 = don't delete, time in seconds
    mentionUser: true,
    mentionAdmins: false,
    showRules: false,
    rules: '',
    autoDeleteTime: 600, // 10 minutes
    stats: {
        welcomed: 0,
        lastWelcome: null
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
        console.error('Error loading welcome settings:', error);
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
        console.error('Error saving welcome settings:', error);
        return false;
    }
};

// Format welcome message
const formatMessage = (template, data) => {
    return template
        .replace(/@user/g, `@${data.userName || data.userNumber}`)
        .replace(/@group/g, data.groupName)
        .replace(/@count/g, data.memberCount)
        .replace(/@time/g, data.time)
        .replace(/@date/g, data.date)
        .replace(/@rules/g, data.rules || '');
};

module.exports = {
    name: 'welcome',
    aliases: ['welcomemsg', 'setwelcome'],
    category: 'admin',
    description: 'Configure welcome message for new members',
    usage: '.welcome [on/off/message/image/test]',
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
║  👋 *WELCOME SETTINGS*  👋 ║
╚══════════════════════╝

📊 *Status:* ${status}
📝 *Message:* ${messagePreview}
🖼️ *Image:* ${settings.image ? '✅ Set' : '❌ Not set'}
👤 *Mention User:* ${settings.mentionUser ? '✅' : '❌'}
👑 *Mention Admins:* ${settings.mentionAdmins ? '✅' : '❌'}
📋 *Show Rules:* ${settings.showRules ? '✅' : '❌'}
⏱️ *Auto Delete:* ${settings.deleteAfter > 0 ? settings.deleteAfter + 's' : 'Never'}

━━━━━━━━━━━━━━━━━━━
📋 *Commands:*
• .welcome on - Enable welcome
• .welcome off - Disable welcome
• .welcome set message <text> - Set welcome message
• .welcome set image - Set image (reply to image)
• .welcome set rules <text> - Set group rules
• .welcome set delete <seconds> - Auto-delete time
• .welcome set mention user on/off
• .welcome set mention admins on/off
• .welcome set rules on/off
• .welcome test - Test welcome message
• .welcome variables - Show available variables
• .welcome reset - Reset to default

━━━━━━━━━━━━━━━━━━━
📝 *Variables:*
• @user - Mentions new member
• @group - Group name
• @count - Member count
• @time - Current time
• @date - Current date
• @rules - Group rules

💡 *Example:*
.welcome set message 👋 Welcome @user to @group!

> *ᴘᴏᴡᴇʀᴇᴅ ʙʏ ZUKO-MD*`);
            }

            const opt = args[0].toLowerCase();

            // Handle on/off
            if (opt === 'on') {
                settings.enabled = true;
                saveSettings(chatId, settings);
                return extra.reply(`✅ *Welcome messages enabled!*\n\nNew members will be welcomed.`);
            }

            if (opt === 'off') {
                settings.enabled = false;
                saveSettings(chatId, settings);
                return extra.reply(`❌ *Welcome messages disabled!*`);
            }

            // Handle variables list
            if (opt === 'variables') {
                return extra.reply(`📝 *WELCOME VARIABLES*\n\n` +
                    `• @user - Mentions the new member\n` +
                    `• @group - Shows group name\n` +
                    `• @count - Shows total members\n` +
                    `• @time - Current time\n` +
                    `• @date - Current date\n` +
                    `• @rules - Shows group rules\n\n` +
                    `💡 *Example:*\n` +
                    `Welcome @user to @group! We now have @count members!`);
            }

            // Handle test
            if (opt === 'test') {
                const testData = {
                    userName: extra.sender.split('@')[0],
                    userNumber: extra.sender.split('@')[0],
                    groupName: groupMetadata.subject || 'Group',
                    memberCount: groupMetadata.participants?.length || 0,
                    time: new Date().toLocaleTimeString(),
                    date: new Date().toLocaleDateString(),
                    rules: settings.rules || 'No rules set'
                };

                const testMessage = formatMessage(settings.message, testData);
                
                return extra.reply(`🧪 *TEST WELCOME*\n\n${testMessage}`);
            }

            // Handle reset
            if (opt === 'reset') {
                const newSettings = { ...defaultSettings };
                saveSettings(chatId, newSettings);
                return extra.reply(`✅ *Welcome settings reset to default!*`);
            }

            // Handle set commands
            if (opt === 'set') {
                const subCmd = args[1]?.toLowerCase();

                if (!subCmd) {
                    return extra.reply('❌ *Please specify what to set!*\n\nOptions: message, image, rules, delete, mention');
                }

                // Set message
                if (subCmd === 'message') {
                    const message = args.slice(2).join(' ');
                    if (!message) {
                        return extra.reply('❌ *Please provide a welcome message!*\n\nExample: .welcome set message Welcome @user!');
                    }
                    
                    settings.message = message;
                    saveSettings(chatId, settings);
                    return extra.reply(`✅ *Welcome message set!*\n\nNew message: ${message}`);
                }

                // Set rules
                if (subCmd === 'rules') {
                    const rules = args.slice(2).join(' ');
                    if (!rules) {
                        return extra.reply('❌ *Please provide group rules!*\n\nExample: .welcome set rules 1. Be respectful');
                    }
                    
                    settings.rules = rules;
                    settings.showRules = true;
                    saveSettings(chatId, settings);
                    return extra.reply(`✅ *Group rules set!*\n\nRules: ${rules}`);
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
                        text: '🖼️ *Setting welcome image...*' 
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
                        await extra.reply(`✅ *Welcome image set successfully!*`);
                    } catch (error) {
                        await sock.sendMessage(chatId, { delete: processing.key });
                        await extra.reply(`❌ *Failed to set image:* ${error.message}`);
                    }
                    return;
                }

                // Handle mention settings
                if (subCmd === 'mention') {
                    const mentionType = args[2]?.toLowerCase();
                    const value = args[3]?.toLowerCase();

                    if (mentionType === 'user') {
                        settings.mentionUser = value === 'on';
                        saveSettings(chatId, settings);
                        return extra.reply(`✅ *Mention user ${value === 'on' ? 'enabled' : 'disabled'}!*`);
                    }

                    if (mentionType === 'admins') {
                        settings.mentionAdmins = value === 'on';
                        saveSettings(chatId, settings);
                        return extra.reply(`✅ *Mention admins ${value === 'on' ? 'enabled' : 'disabled'}!*`);
                    }
                }

                // Handle rules toggle
                if (subCmd === 'rules' && args[2]?.toLowerCase() === 'on') {
                    settings.showRules = true;
                    saveSettings(chatId, settings);
                    return extra.reply('✅ *Rules will be shown in welcome message!*');
                }

                if (subCmd === 'rules' && args[2]?.toLowerCase() === 'off') {
                    settings.showRules = false;
                    saveSettings(chatId, settings);
                    return extra.reply('❌ *Rules will NOT be shown in welcome message!*');
                }
            }

            extra.reply('❌ *Invalid option.* Use .welcome for help.');

        } catch (error) {
            console.error('Welcome Command Error:', error);
            await extra.reply(`❌ *Error:* ${error.message}`);
        }
    }
};