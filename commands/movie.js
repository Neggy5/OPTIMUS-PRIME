/**
 * Movie Search - Search for movies and details
 */

const axios = require('axios');
const config = require('../config');

// Store processed message IDs to prevent duplicates
const processedMessages = new Set();

module.exports = {
  name: 'movie',
  aliases: ['moviesearch', 'film'],
  category: 'media',
  description: 'Search for movie information',
  usage: '.movie <movie name>',
  
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
        return await extra.reply('Please provide a movie name (e.g., .movie Avengers).');
      }

      // React to show processing
      await sock.sendMessage(extra.from, {
        react: { text: '🎬', key: msg.key }
      });

      try {
        // Movie Search API Endpoint
        const movieApiUrl = `https://arcane-nx-cipher-pol.hf.space/api/movie/search?q=${encodeURIComponent(query)}`;
        
        const response = await axios.get(movieApiUrl);
        const res = response.data;

        // Check if results exist
        if (!res.status || !res.result || !Array.isArray(res.result) || res.result.length === 0) {
          throw new Error('No movies found with that name.');
        }

        const botName = config.botName.toUpperCase();
        let caption = `*MOVIE SEARCH RESULTS*\n*POWERED BY ${botName}*\n\n`;

        // Limit to top 5-7 results to prevent long messages
        const movies = res.result.slice(0, 7);
        
        movies.forEach((movie, index) => {
          caption += `*${index + 1}. ${movie.title}*\n`;
          if (movie.release_date) caption += `📅 Release: ${movie.release_date}\n`;
          if (movie.rating) caption += `⭐ Rating: ${movie.rating}\n`;
          if (movie.id) caption += `🆔 ID: ${movie.id}\n`;
          caption += `\n`;
        });

        caption += `_Type .movieinfo <ID> for more details (if your bot supports it)._`;

        // Send the list of results
        await extra.reply(caption);

      } catch (error) {
        console.error('Error in Movie search:', error);
        await extra.reply(`❌ Movie search failed.\n\nError: ${error.message}`);
      }
    } catch (error) {
      console.error('Error in Movie command:', error);
      await extra.reply('An error occurred while searching for the movie.');
    }
  }
};