/**
 * Uptime Command - Check bot uptime with buttons
 */

module.exports = {
    name: 'uptime',
    aliases: ['runtime', 'online'],
    description: 'Check how long the bot has been running',
    usage: '.uptime',
    groupOnly: false,
    adminOnly: false,
    botAdminNeeded: false,
    
    async execute(sock, msg, args, extra) {
        try {
            const chatId = msg.key.remoteJid;
            const startTime = Date.now();
            const botName = '𝑂𝑃𝑇𝐼𝑀𝑈𝑆 𝑃𝑅𝐼𝑀𝐸';
            
            // Send initial message
            const testMsg = await sock.sendMessage(chatId, { 
                text: '⏳ *Calculating uptime...*' 
            });
            
            // Calculate uptime
            const uptimeSeconds = process.uptime();
            const days = Math.floor(uptimeSeconds / 86400);
            const hours = Math.floor(uptimeSeconds / 3600) % 24;
            const minutes = Math.floor(uptimeSeconds / 60) % 60;
            const seconds = Math.floor(uptimeSeconds % 60);
            
            const uptimeString = [];
            if (days > 0) uptimeString.push(`${days}d`);
            if (hours > 0) uptimeString.push(`${hours}h`);
            if (minutes > 0) uptimeString.push(`${minutes}m`);
            uptimeString.push(`${seconds}s`);
            
            const responseTime = Date.now() - startTime;
            
            // Create button message
            const uptimeButtons = {
                text: `╔══════════════════════╗
║  🤖 *${botName} UPTIME*  ║
╚══════════════════════╝

⏱️ *Runtime:* ${uptimeString.join(' ')}

📊 *Statistics:*
• Days: ${days}
• Hours: ${hours}
• Minutes: ${minutes}
• Seconds: ${seconds}

⚡ *Response Time:* ${responseTime}ms
🟢 *Status:* Online

━━━━━━━━━━━━━━━━━━━
> *ᴘᴏᴡᴇʀᴇᴅ ʙʏ ${botName}*`,
                footer: botName,
                buttons: [
                    {
                        buttonId: 'cmd_uptime',
                        buttonText: { displayText: '🔄 Refresh' },
                        type: 1
                    },
                    {
                        buttonId: 'cmd_ping',
                        buttonText: { displayText: '🏓 Ping' },
                        type: 1
                    },
                    {
                        buttonId: 'cmd_menu',
                        buttonText: { displayText: '📋 Menu' },
                        type: 1
                    }
                ],
                headerType: 1,
                contextInfo: {
                    forwardingScore: 999,
                    isForwarded: true,
                    forwardedNewsletterMessageInfo: {
                        newsletterJid: '120363405724402785@newsletter',
                        newsletterName: botName,
                        serverMessageId: -1
                    }
                }
            };
            
            // Send uptime info with buttons
            await sock.sendMessage(chatId, uptimeButtons);
            
        } catch (error) {
            await sock.sendMessage(msg.key.remoteJid, { 
                text: `❌ Error: ${error.message}`,
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