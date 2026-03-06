/**
 * Pair Command - Generate WhatsApp pairing code
 */
const axios = require('axios');
const config = require('../config');

module.exports = {
  name: 'pair',
  aliases: ['pairing', 'getcode', 'paircode'],
  category: 'utility',
  description: 'Get WhatsApp pairing code',

  async execute(sock, msg, args, extra) {
    const { from, reply } = extra;

    try {
      // 1. Validation
      let phoneNumber = args[0]?.replace(/[^0-9]/g, '');

      if (!phoneNumber) {
        return await reply(
          `┌───『 *PAIRING SYSTEM* 』───┐\n` +
          `┆ 📱 *Usage:* ${config.prefix}pair 234xxx\n` +
          `┆ 💡 *Note:* Country code required\n` +
          `└──────────────────────────┘`
        );
      }

      if (phoneNumber.length < 10) {
        return await reply('❌ *Invalid Number:* Include your country code (e.g., 234...)');
      }

      // 2. Loading State
      await extra.react('⏳');
      const { key } = await reply(`📡 *Requesting code for* \`+${phoneNumber}\`...`);

      // 3. API Request (Cleaned up)
      // Using a more robust URL construction
      const API_URL = `https://zuko-pair-6ib1.onrender.com/pair?number=${phoneNumber}`;

      const response = await axios.get(API_URL, { 
        timeout: 20000,
        headers: { 'User-Agent': 'Optimus-Prime-Bot' }
      }).catch(() => null);

      if (!response || !response.data) {
        await extra.react('❌');
        return await reply('❌ *Server Error:* The pairing API is currently offline. Try again later.');
      }

      // 4. Extract Code (Handles multiple API formats)
      const pairCode = response.data.code || response.data.pairingCode || response.data.pair_code || (typeof response.data === 'string' ? response.data : null);

      if (pairCode) {
        // 5. Success UI
        const successMessage = 
          `┌───『 *CONNECTION CODE* 』───┐\n` +
          `┆  📱 *Phone:* ${phoneNumber}\n` +
          `┆  🔑 *Code:* ${pairCode}\n` +
          `└──────────────────────────┘\n\n` +
          `*Instructions:*\n` +
          `1. Open WhatsApp > Linked Devices\n` +
          `2. Link with Phone Number\n` +
          `3. Enter the code above.\n\n` +
          `> 𝑃ᴏᴡᴇʀᴇᴅ ʙʏ 𝑂𝑃𝑇𝐼𝑀𝑈𝑆 𝑃𝑅𝐼𝑀𝐸`;

        // Update the loading message with the code
        await sock.sendMessage(from, { text: successMessage, edit: key });
        await extra.react('✅');
      } else {
        await extra.react('⚠️');
        await reply('❌ *Error:* Could not retrieve a valid code. Ensure the number is not already linked.');
      }

    } catch (error) {
      console.error('Pair Command Error:', error);
      await extra.react('❌');
      await reply('❌ *Critical Error:* Connection to the API failed.');
    }
  }
};