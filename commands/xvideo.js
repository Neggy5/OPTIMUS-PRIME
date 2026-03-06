/**
 * XVideo Downloader/Search - Download videos from XVideo
 */

const axios = require('axios');
const config = require('../config');

// Store processed message IDs to prevent duplicates
const processedMessages = new Set();

module.exports = {
  name: 'xvideo',
  aliases: ['xv', 'xvdul'],
  category: 'nsfw',
  description: 'Download XVideo videos via URL',
  usage: '.xvideo <URL>',
  
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
      
      const text = args.join(' ');
      
      if (!text) {
        return await extra.reply('Please provide an XVideo link.');
      }

      // React to show processing
      await sock.sendMessage(extra.from, {
        react: { text: '🎬', key: msg.key }
      });

      try {
        // API Endpoint provided
        const apiUrl = `https://arcane-nx-cipher-pol.hf.space/api/nsfw/xvideo?url=${encodeURIComponent(text)}`;
        
        const response = await axios.get(apiUrl);
        const res = response.data;

        if (!res.status || !res.result) {
          throw new Error('Could not find video data. Ensure the link is valid.');
        }

        const videoData = res.result;
        const botName = config.botName.toUpperCase();

        // Build caption 
        let caption = `*DOWNLOADED BY ${botName}*\n\n`;
        caption += `📌 *Title:* ${videoData.title || 'N/A'}\n`;
        caption += `⏱️ *Duration:* ${videoData.duration || 'N/A'}\n`;
        caption += `👁️ *Views:* ${videoData.views || 'N/A'}\n`;
        caption += `🔗 *Source:* XVideos`;

        // Send Video via URL
        if (videoData.url) {
          await sock.sendMessage(extra.from, {
            video: { url: videoData.url },
            mimetype: 'video/mp4',
            caption: caption
          }, { quoted: msg });
        } else {
          throw new Error('No downloadable URL found in API response.');
        }

      } catch (error) {
        console.error('Error in XVideo download:', error);
        await extra.reply(`❌ Failed to process request.\n\nError: ${error.message}`);
      }
    } catch (error) {
      console.error('Error in XVideo command:', error);
      await extra.reply('An error occurred. Please try again later.');
    }
  }
};