/**
 * Ping Command - Check bot response time with button
 */

module.exports = {
  name: 'ping',
  aliases: ['pong', 'latency'],
  category: 'general',
  description: 'Check bot response time',
  usage: '.ping',
  
  async execute(sock, msg, args, extra) {
    try {
      const start = Date.now();
      const chatId = extra.from || msg.key.remoteJid;
      
      // Send initial message
      const sentMsg = await sock.sendMessage(chatId, { 
        text: '📊 *Calculating ping...*' 
      }, { quoted: msg });
      
      const latency = Date.now() - start;
      
      // Create button message with proper button IDs
      const buttonMessage = {
        text: `🏓 *PONG!*\n\n📡 *Response Time:* ${latency}ms\n🟢 *Status:* Online\n⏱️ *Time:* ${new Date().toLocaleTimeString()}`,
        footer: '𝑂𝑃𝑇𝐼𝑀𝑈𝑆 𝑃𝑅𝐼𝑀𝐸 Bot',
        buttons: [
          {
            buttonId: 'cmd_ping', // MUST start with 'cmd_' for the handler to recognize it
            buttonText: { displayText: '🔄 Ping Again' },
            type: 1
          },
          {
            buttonId: 'cmd_menu', // This will open menu
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
            newsletterName: '𝑂𝑃𝑇𝐼𝑀𝑈𝑆 𝑃𝑅𝐼𝑀𝐸',
            serverMessageId: -1
          }
        }
      };
      
      // Send button message
      await sock.sendMessage(chatId, buttonMessage);
      
    } catch (error) {
      console.error('Ping command error:', error);
      await extra.reply(`❌ Error: ${error.message}`);
    }
  }
};