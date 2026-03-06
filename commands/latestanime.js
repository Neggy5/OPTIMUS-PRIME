/**
 * Latest Anime - Get recently updated anime episodes
 */

const axios = require('axios');
const config = require('../config');

// Store processed message IDs to prevent duplicates
const processedMessages = new Set();

module.exports = {
  name: 'latestanime',
  aliases: ['recentanime', 'animenews'],
  category: 'media',
  description: 'Show the latest anime episode updates',
  usage: '.latestanime',
  
  async execute(sock, msg, args, extra) {
    try {
      // Check if message has already been processed
      if (processedMessages.has(msg.key.id)) {
        return;
      }
      
      processedMessages.add(msg.key.id);
      
      // Clean up old message IDs after 5 minutes
      setTimeout(() => {
        processedMessages.delete(msg.key.id);
      }, 5 * 60 * 1000);

      // React to show processing
      await sock.sendMessage(extra.from, {
        react: { text: '✨', key: msg.key }
      });

      try {
        // Fetch page 1 by default, or use args if user provides a page number
        const page = args[0] || 1;
        const apiUrl = `https://arcane-nx-cipher-pol.hf.space/api/anime/latest?page=${page}`;
        
        const response = await axios.get(apiUrl);
        const res = response.data;

        if (!res.status || !res.result || !Array.isArray(res.result) || res.result.length === 0) {
          throw new Error('Could not fetch the latest anime updates.');
        }

        const botName = config.botName.toUpperCase();
        let caption = `*LATEST ANIME UPDATES*\n*POWERED BY ${botName}*\n\n`;

        // Loop through results
        res.result.forEach((anime, index) => {
          caption += `*${index + 1}. ${anime.title}*\n`;
          if (anime.episode) caption += `▶️ Episode: ${anime.episode}\n`;
          if (anime.type) caption += `🏷️ Type: ${anime.type}\n`;
          // IDs provided here can be used for your animedl command
          if (anime.id) caption += `🆔 ID: \`${anime.id}\`\n`;
          caption += `\n`;
        });

        caption += `_Use .latestanime 2 for the next page._\n`;
        caption += `_To download, use the ID with your download command._`;

        // Send the list
        await extra.reply(caption);

      } catch (error) {
        console.error('Error in Latest Anime command:', error);
        await extra.reply(`❌ Failed to fetch updates.\n\nError: ${error.message}`);
      }
    } catch (error) {
      console.error('General Error in Latest Anime:', error);
      await extra.reply('An error occurred while fetching anime updates.');
    }
  }
};