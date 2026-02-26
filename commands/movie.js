/**
 * Movie Command - Search and get movie download links
 */

const axios = require('axios');
const cheerio = require('cheerio');

// Common movie streaming/download sites (for educational purposes)
const sources = [
  {
    name: 'O2TVSeries',
    searchUrl: 'https://o2tvseries.com/search/',
    parse: (html) => {
      const $ = cheerio.load(html);
      const results = [];
      $('.search-results .item').each((i, el) => {
        results.push({
          title: $(el).find('.title').text().trim(),
          link: $(el).find('a').attr('href'),
          quality: $(el).find('.quality').text().trim(),
          year: $(el).find('.year').text().trim()
        });
      });
      return results;
    }
  },
  {
    name: 'Naijavault',
    searchUrl: 'https://naijavault.com/?s=',
    parse: (html) => {
      const $ = cheerio.load(html);
      const results = [];
      $('article').each((i, el) => {
        results.push({
          title: $(el).find('.entry-title').text().trim(),
          link: $(el).find('.entry-title a').attr('href'),
          quality: $(el).find('.quality').text().trim() || 'HD',
          year: $(el).find('.year').text().trim()
        });
      });
      return results;
    }
  }
];

// Movie database (for quick searches)
const movieDB = {
  api: 'https://www.omdbapi.com/',
  key: '6c6460af' // Get from http://www.omdbapi.com/
};

module.exports = {
  name: 'movie',
  aliases: ['movies', 'film', 'watch', 'downloadmovie'],
  category: 'download',
  description: 'Search and get movie download links',
  usage: '.movie <movie name>',
  groupOnly: false,
  adminOnly: false,
  botAdminNeeded: false,
  
  async execute(sock, msg, args, extra) {
    try {
      const chatId = extra.from;
      const query = args.join(' ');
      
      if (!query) {
        return extra.reply(`╔══════════════════════╗
║  🎬 *MOVIE COMMAND*  🎬 ║
╚══════════════════════╝

❌ *Please provide a movie name!*

📌 *Usage:*
• .movie <movie name>
• .movies <movie name>
• .film <movie name>

💡 *Examples:*
• .movie Avengers Endgame
• .movies John Wick 4
• .film The Dark Knight

⚡ *Searches for download links*

> *ᴘᴏᴡᴇʀᴇᴅ ʙʏ 𝑂𝑃𝑇𝐼𝑀𝑈𝑆 𝑃𝑅𝐼𝑀𝐸*`);
      }
      
      // Send searching message
      const searchingMsg = await sock.sendMessage(chatId, {
        text: `🔍 *Searching for:* ${query}\n\n⏳ Please wait...`
      }, { quoted: msg });
      
      try {
        // Try to get movie info from OMDb API
        let movieInfo = null;
        if (movieDB.key !== 'YOUR_OMDB_API_KEY') {
          try {
            const response = await axios.get(`${movieDB.api}?apikey=${movieDB.key}&t=${encodeURIComponent(query)}`);
            if (response.data && response.data.Response === 'True') {
              movieInfo = response.data;
            }
          } catch (apiError) {
            console.log('OMDb API error:', apiError.message);
          }
        }
        
        // Search for download links
        const searchResults = [];
        
        // Try multiple sources
        for (const source of sources) {
          try {
            const response = await axios.get(`${source.searchUrl}${encodeURIComponent(query)}`, {
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
              },
              timeout: 10000
            });
            
            const results = source.parse(response.data);
            if (results.length > 0) {
              searchResults.push({
                source: source.name,
                results: results.slice(0, 5) // Limit to 5 results per source
              });
            }
          } catch (sourceError) {
            console.log(`${source.name} search failed:`, sourceError.message);
          }
        }
        
        // Delete searching message
        await sock.sendMessage(chatId, { delete: searchingMsg.key });
        
        // Build response
        let response = `╔══════════════════════╗
║  🎬 *MOVIE RESULTS*  🎬 ║
╚══════════════════════╝

📌 *Search:* ${query}\n\n`;
        
        if (movieInfo) {
          response += `━━━━━━━━━━━━━━━━━━━\n`;
          response += `📽️ *${movieInfo.Title}* (${movieInfo.Year})\n`;
          response += `⭐ *IMDB:* ${movieInfo.imdbRating}/10\n`;
          response += `🎭 *Genre:* ${movieInfo.Genre}\n`;
          response += `⏱️ *Runtime:* ${movieInfo.Runtime}\n`;
          response += `📝 *Plot:* ${movieInfo.Plot}\n`;
          response += `━━━━━━━━━━━━━━━━━━━\n\n`;
        }
        
        if (searchResults.length === 0) {
          response += `❌ *No download links found!*\n\n`;
          response += `💡 *Try:*\n`;
          response += `• Check spelling\n`;
          response += `• Use different keywords\n`;
          response += `• Try with year (e.g., "Avengers 2019")\n\n`;
        } else {
          response += `📥 *DOWNLOAD LINKS*\n`;
          response += `━━━━━━━━━━━━━━━━━━━\n\n`;
          
          searchResults.forEach(source => {
            response += `📌 *${source.source}:*\n`;
            source.results.forEach((result, i) => {
              response += `${i+1}. *${result.title}*\n`;
              if (result.quality) response += `   🎬 Quality: ${result.quality}\n`;
              if (result.year) response += `   📅 Year: ${result.year}\n`;
              response += `   🔗 Link: ${result.link}\n\n`;
            });
          });
          
          response += `⚠️ *Note:* These are external links. Use at your own discretion.\n`;
          response += `💡 Use VPN if needed.\n\n`;
        }
        
        response += `━━━━━━━━━━━━━━━━━━━\n`;
        response += `> *ᴘᴏᴡᴇʀᴇᴅ ʙʏ 𝑂𝑃𝑇𝐼𝑀𝑈𝑆 𝑃𝑅𝐼𝑀𝐸*`;
        
        // Check if response is too long
        if (response.length > 4000) {
          // Split into multiple messages
          const parts = response.match(/[\s\S]{1,4000}/g) || [];
          
          for (let i = 0; i < parts.length; i++) {
            await sock.sendMessage(chatId, {
              text: parts[i],
              contextInfo: {
                forwardingScore: 999,
                isForwarded: true,
                forwardedNewsletterMessageInfo: {
                  newsletterJid: '120363405724402785@newsletter',
                  newsletterName: '𝑂𝑃𝑇𝐼𝑀𝑈𝑆 𝑃𝑅𝐼𝑀𝐸',
                  serverMessageId: -1
                }
              }
            }, { quoted: i === 0 ? msg : null });
          }
        } else {
          await sock.sendMessage(chatId, {
            text: response,
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
        }
        
      } catch (searchError) {
        console.error('Movie search error:', searchError);
        await sock.sendMessage(chatId, { delete: searchingMsg.key });
        await sock.sendMessage(chatId, {
          text: `❌ *Error searching for movie:*\n${searchError.message}`
        }, { quoted: msg });
      }
      
    } catch (error) {
      console.error('Movie Command Error:', error);
      await extra.reply(`❌ *Error:* ${error.message}`);
    }
  }
};