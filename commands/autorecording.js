/**
 * AutoRecord Command - Show fake recording indicator
 */

module.exports = {
    name: 'autorecord',
    aliases: ['record', 'rec', 'recording', 'voice'],
    category: 'fun',
    description: 'Show fake recording indicator',
    usage: '.autorecord [duration]',
    
    async execute(sock, msg, args, extra) {
        try {
            const chatId = extra.from;
            
            // Default 10 seconds, max 60 seconds
            let duration = 10;
            if (args[0] && !isNaN(args[0])) {
                duration = Math.min(Math.max(parseInt(args[0]), 3), 60);
            }
            
            // Send initial recording message
            const recordMsg = await sock.sendMessage(chatId, {
                text: `🎙️ *Recording* 0:00 / ${formatTime(duration)} 🔴`
            }, { quoted: msg });
            
            // Update counter every second
            for (let i = 1; i <= duration; i++) {
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                // Change indicator based on time
                let indicator = '🔴';
                if (i > duration * 0.7) indicator = '⏺️';
                else if (i > duration * 0.4) indicator = '🎙️';
                
                await sock.sendMessage(chatId, {
                    text: `🎙️ *Recording* ${formatTime(i)} / ${formatTime(duration)} ${indicator}`,
                    edit: recordMsg.key
                });
            }
            
            // Recording finished
            await sock.sendMessage(chatId, {
                text: `✅ *Recording saved!*\n\n⏱️ Duration: ${formatTime(duration)}\n📁 File: voice_${Date.now()}.mp3`,
                edit: recordMsg.key,
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
            console.error('AutoRecord error:', error);
            await extra.reply(`❌ Error: ${error.message}`);
        }
    }
};

function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}