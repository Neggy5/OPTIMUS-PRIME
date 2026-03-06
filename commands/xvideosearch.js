/**
 * XVideo Search - Search for videos on XVideo
 */

const axios = require('axios');
const config = require('../config');

// Store processed message IDs to prevent duplicates
const processedMessages = new Set();

module.exports = {
  name: 'xsearch',
  aliases: ['xvsearch', 'xvs'],
  category: 'nsfw',
  description: 'Search for videos on XVideo',
  usage: '.xsearch <query>',
  
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
      
      const query = args.join(' ');
      
      if (!query) {
        return await extra.reply('Please provide a search term (e.g., .xsearch anime).');
      }

      // React to show processing
      await sock.sendMessage(extra.from, {
        react: { text: '🔍', key: msg.key }
      });

      try {
        // Search API Endpoint
        const searchUrl = `https://arcane-nx-cipher-pol.hf.space/api/nsfw/xsearch?q=${encodeURIComponent(query)}`;
        
        const response = await axios.get(searchUrl);
        const res = response.data;

        // Check if results exist and is an array
        if (!res.status || !res.result || !Array.isArray(res.result) || res.result.length === 0) {
          throw new Error('No results found for that query.');
        }

        const botName = config.botName.toUpperCase();
        let caption = `*XVIDEO SEARCH RESULTS*\n*POWERED BY ${botName}*\n\n`;

        // Loop through the first 10 results to keep the message readable
        const results = res.result.slice(0, 10);
        
        results.forEach((video, index) => {
          caption += `*${index + 1}.* ${video.title}\n`;
          caption += `   ⏱️ Duration: ${video.duration || 'N/A'}\n`;
          caption += `   🔗 URL: ${video.url}\n\n`;
        });

        caption += `_Tip: Copy a URL and use the .xvideo command to download it._`;

        // Send the list of results
        await extra.reply(caption);

      } catch (error) {
        console.error('Error in XVideo search:', error);
        await extra.reply(`❌ Search failed.\n\nError: ${error.message}`);
      }
    } catch (error) {
      console.error('Error in XSearch command:', error);
      await extra.reply('An error occurred while searching. Please try again later.');
    }
  }
};