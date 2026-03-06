/**
 * Ping command - Check bot latency with style
 */

module.exports = {
  name: 'ping',
  aliases: ['pong', 'latency'],
  description: 'Check bot response time',
  
  async execute(sock, msg, args, extra) {
    const start = Date.now();
    const chatId = extra.from || msg.key.remoteJid;
    
    try {
      // Initial state
      await sock.sendMessage(chatId, { 
        react: { text: '⏳', key: msg.key } 
      });

      const latency = Date.now() - start;
      
      // Stylish text-only response
      await sock.sendMessage(chatId, {
        text: `✦ *PONG* ✦\n\n` +
                `╭───────────────╮\n` +
                `│  📡 ${latency}ms  │\n` +
                `│  🟢 Online     │\n` +
                `╰───────────────╯\n\n` +
                `_${new Date().toLocaleTimeString()}_`,
        footer: '𝑂𝑃𝑇𝐼𝑀𝑈𝑆 𝑃𝑅𝐼𝑀𝐸',
        contextInfo: {
          forwardingScore: 999,
          isForwarded: true,
          forwardedNewsletterMessageInfo: {
            newsletterJid: '120363405724402785@newsletter',
            newsletterName: '𝑂𝑃𝑇𝐼𝑀𝑈𝑆 𝑃𝑅𝐼𝑀𝐸',
            serverMessageId: -1
          }
        }
      }, { quoted: msg });

      // Final reaction
      await sock.sendMessage(chatId, { 
        react: { text: '⚡', key: msg.key } 
      });
      
    } catch (error) {
      console.error('Ping error:', error);
      await extra.reply(`❌ ${error.message}`);
    }
  }
};