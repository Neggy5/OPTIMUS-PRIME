const axios = require('axios');
const config = require('../config');

module.exports = {
  name: 'joke',
  description: 'Get a random joke',
  category: 'fun',

  async execute(sock, msg, args, extra) {
    try {
      const res = await axios.get('https://v2.jokeapi.dev/joke/Any?blacklistFlags=nsfw,religious,political,racist,sexist,explicit&type=single');
      const joke = res.data.joke || `${res.data.setup}\n\n*${res.data.delivery}*`;
      
      await extra.reply(`🎭 *JOKE TIME*\n\n${joke}\n\n> 𝑃ᴏᴡᴇʀᴇᴅ ʙʏ 𝑂𝑃𝑇𝐼𝑀𝑈𝑆 𝑃𝑅𝐼𝑀𝐸`);
      await extra.react('😂');
    } catch (e) {
      await extra.reply('❌ Failed to fetch a joke.');
    }
  }
};