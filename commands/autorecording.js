/**
 * AutoRecord Command - Show fake recording notification
 */

module.exports = {
    name: 'autorecord',
    aliases: ['record', 'recording', 'voice'],
    description: 'Show fake recording notification',
    usage: '.autorecord [duration]',
    groupOnly: false,
    adminOnly: false,
    botAdminNeeded: false,
    
    async execute(sock, msg, args, extra) {
        try {
            const chatId = extra.from;
            const isGroup = extra.isGroup;
            
            // Parse duration (default 30 seconds)
            let duration = 30;
            if (args[0] && !isNaN(args[0])) {
                duration = parseInt(args[0]);
                if (duration < 5) duration = 5;
                if (duration > 300) duration = 300; // Max 5 minutes
            }
            
            // Send initial recording message
            const recordingMsg = await sock.sendMessage(chatId, {
                text: `🎙️ *Recording...* 0:00 / ${formatDuration(duration)}`
            }, { quoted: msg });
            
            // Update counter every second
            let seconds = 0;
            const interval = setInterval(async () => {
                seconds++;
                
                if (seconds <= duration) {
                    // Update the recording message
                    await sock.sendMessage(chatId, {
                        text: `🎙️ *Recording...* ${formatDuration(seconds)} / ${formatDuration(duration)}`,
                        edit: recordingMsg.key
                    });
                } else {
                    // Recording finished
                    clearInterval(interval);
                    
                    // Send completed message
                    await sock.sendMessage(chatId, {
                        text: `✅ *Recording completed!*\n\n⏱️ Duration: ${formatDuration(duration)}\n📁 File: voice_${Date.now()}.mp3\n\n💾 *Saved to recordings folder*`,
                        edit: recordingMsg.key,
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
                    
                    // Send voice note simulation (just a dot)
                    await sock.sendMessage(chatId, {
                        audio: Buffer.from(''), // Empty buffer
                        mimetype: 'audio/mp4',
                        ptt: true // Play as voice note
                    }).catch(() => {}); // Ignore error
                }
            }, 1000);
            
        } catch (error) {
            console.error('AutoRecord Error:', error);
            await extra.reply(`❌ Error: ${error.message}`);
        }
    }
};

// Helper function to format duration
function formatDuration(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}