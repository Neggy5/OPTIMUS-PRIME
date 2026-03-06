const axios = require('axios');
const config = require('../config');

module.exports = {
  name: 'fact',
  description: 'Get a random interesting fact',
  category: 'fun',

  async execute(sock, msg, args, extra) {
    try {
      const res = await axios.get('https://uselessfacts.jsph.pl/random.json?language=en');
      const fact = res.data.text;
      
      await extra.reply(`🧠 *DID YOU KNOW?*\n\n${fact}\n\n> 𝑃ᴏᴡᴇʀᴇᴅ ʙʏ 𝑂𝑃𝑇𝐼𝑀𝑈𝑆 𝑃𝑅𝐼𝑀𝐸`);
      await extra.react('💡');
    } catch (e) {
      await extra.reply('❌ Failed to fetch a fact.');
    }
  }
};