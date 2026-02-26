/**
 * LiveScore Command - Get live football scores
 */

const axios = require('axios');
const cheerio = require('cheerio');

// Football data APIs (free sources)
const sources = {
  // API-FOOTBALL (requires API key)
  apiFootball: {
    url: 'https://v3.football.api-sports.io',
    key: 'YOUR_API_KEY' // Get from https://www.api-football.com/
  },
  // Free alternative - web scraping
  livescore: {
    url: 'https://www.livescore.com/en/football/',
    selector: '.match-row'
  },
  flashscore: {
    url: 'https://www.flashscore.com/football/',
    selector: '.event__match'
  },
  soccer24: {
    url: 'https://www.soccer24.com',
    selector: '.event'
  }
};

// League icons
const leagueIcons = {
  'Premier League': '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
  'La Liga': '🇪🇸',
  'Bundesliga': '🇩🇪',
  'Serie A': '🇮🇹',
  'Ligue 1': '🇫🇷',
  'Champions League': '🏆',
  'Europa League': '🏆',
  'World Cup': '🌍',
  'Euro': '🏆',
  'Copa America': '🏆',
  'Africa Cup': '🌍',
  'MLS': '🇺🇸',
  'Eredivisie': '🇳🇱',
  'Primeira Liga': '🇵🇹',
  'Russian Premier': '🇷🇺',
  'Turkish Super Lig': '🇹🇷'
};

// Cache for match data
let matchesCache = {
  data: [],
  timestamp: 0
};

const CACHE_DURATION = 30000; // 30 seconds

// Format match time
const formatMatchTime = (match) => {
  if (match.status === 'Live') {
    return `🔴 LIVE ${match.minute || ''}`;
  } else if (match.status === 'Finished') {
    return '✅ FT';
  } else if (match.status === 'Halftime') {
    return '⏸️ HT';
  } else {
    return `⏰ ${match.time || 'Upcoming'}`;
  }
};

// Get league icon
const getLeagueIcon = (league) => {
  for (const [key, icon] of Object.entries(leagueIcons)) {
    if (league.includes(key)) return icon;
  }
  return '⚽';
};

// Fetch live scores from API-Football
const fetchFromAPIFootball = async () => {
  try {
    const response = await axios.get(`${sources.apiFootball.url}/fixtures?live=all`, {
      headers: {
        'x-rapidapi-host': 'v3.football.api-sports.io',
        'x-rapidapi-key': sources.apiFootball.key
      },
      timeout: 5000
    });
    
    const fixtures = response.data.response || [];
    const matches = [];
    
    for (const fixture of fixtures) {
      matches.push({
        league: fixture.league.name,
        country: fixture.league.country,
        homeTeam: fixture.teams.home.name,
        awayTeam: fixture.teams.away.name,
        homeScore: fixture.goals.home || 0,
        awayScore: fixture.goals.away || 0,
        status: fixture.fixture.status.short === 'LIVE' ? 'Live' : 
                fixture.fixture.status.short === 'FT' ? 'Finished' : 
                fixture.fixture.status.short === 'HT' ? 'Halftime' : 'Scheduled',
        minute: fixture.fixture.status.elapsed ? `${fixture.fixture.status.elapsed}'` : '',
        time: fixture.fixture.date
      });
    }
    
    return matches;
  } catch (error) {
    console.log('API-Football error:', error.message);
    return [];
  }
};

// Fetch from web scraping (free alternative)
const fetchFromWeb = async () => {
  try {
    const response = await axios.get('https://www.livescore.com/en/football/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 5000
    });
    
    const $ = cheerio.load(response.data);
    const matches = [];
    
    $('.match-row').each((i, el) => {
      if (i < 20) { // Limit to 20 matches
        const homeTeam = $(el).find('.home-team').text().trim();
        const awayTeam = $(el).find('.away-team').text().trim();
        const homeScore = $(el).find('.home-score').text().trim();
        const awayScore = $(el).find('.away-score').text().trim();
        const league = $(el).find('.league-name').text().trim();
        const status = $(el).find('.match-status').text().trim();
        
        if (homeTeam && awayTeam) {
          matches.push({
            league,
            homeTeam,
            awayTeam,
            homeScore: homeScore || '0',
            awayScore: awayScore || '0',
            status: status.includes('LIVE') ? 'Live' : 
                    status.includes('FT') ? 'Finished' : 'Scheduled',
            minute: status
          });
        }
      }
    });
    
    return matches;
  } catch (error) {
    console.log('Web scraping error:', error.message);
    return [];
  }
};

module.exports = {
  name: 'livescore',
  aliases: ['scores', 'football', 'matches', 'livefootball'],
  category: 'tools',
  description: 'Get live football scores',
  usage: '.livescore [league/country]',
  groupOnly: false,
  adminOnly: false,
  botAdminNeeded: false,
  
  async execute(sock, msg, args, extra) {
    try {
      const chatId = extra.from;
      const filter = args.join(' ').toLowerCase();
      
      // Send loading message
      const loadingMsg = await sock.sendMessage(chatId, {
        text: '⚽ *Fetching live scores...*\n\n⏳ Please wait'
      }, { quoted: msg });
      
      try {
        // Try API-Football first if key is set
        let matches = [];
        if (sources.apiFootball.key !== 'YOUR_API_KEY') {
          matches = await fetchFromAPIFootball();
        }
        
        // If no matches, try web scraping
        if (matches.length === 0) {
          matches = await fetchFromWeb();
        }
        
        // Delete loading message
        await sock.sendMessage(chatId, { delete: loadingMsg.key });
        
        if (matches.length === 0) {
          return extra.reply('❌ *No live matches found*\n\nTry again later or check back during major tournaments.');
        }
        
        // Filter matches if requested
        let filteredMatches = matches;
        if (filter) {
          filteredMatches = matches.filter(m => 
            m.league?.toLowerCase().includes(filter) ||
            m.country?.toLowerCase().includes(filter) ||
            m.homeTeam?.toLowerCase().includes(filter) ||
            m.awayTeam?.toLowerCase().includes(filter)
          );
          
          if (filteredMatches.length === 0) {
            return extra.reply(`❌ *No matches found for "${filter}"*`);
          }
        }
        
        // Limit to 15 matches to avoid message too long
        filteredMatches = filteredMatches.slice(0, 15);
        
        // Build response
        let response = `╔══════════════════════╗
║  ⚽ *LIVE FOOTBALL SCORES*  ║
╚══════════════════════╝

📅 *${new Date().toLocaleDateString('en-US', { 
  weekday: 'long', 
  year: 'numeric', 
  month: 'long', 
  day: 'numeric' 
})}*
🕐 *${new Date().toLocaleTimeString()}*

━━━━━━━━━━━━━━━━━━━\n\n`;
        
        let currentLeague = '';
        
        filteredMatches.forEach((match, index) => {
          const leagueIcon = getLeagueIcon(match.league || '');
          const matchTime = formatMatchTime(match);
          const isLive = match.status === 'Live';
          const isFinished = match.status === 'Finished';
          
          // Add league header if new league
          if (match.league !== currentLeague) {
            currentLeague = match.league;
            response += `\n${leagueIcon} *${match.league || 'Other'}*\n`;
            response += `━━━━━━━━━━━━━━━━━━━\n`;
          }
          
          // Match line
          response += `${index + 1}. `;
          
          if (isLive) response += `🔴 `;
          else if (isFinished) response += `✅ `;
          
          response += `${match.homeTeam} `;
          
          // Score with appropriate formatting
          if (match.homeScore !== undefined && match.awayScore !== undefined) {
            if (isLive || isFinished) {
              response += `**${match.homeScore} - ${match.awayScore}** `;
            } else {
              response += `vs `;
            }
          } else {
            response += `vs `;
          }
          
          response += `${match.awayTeam}\n`;
          response += `   ⏱️ ${matchTime}\n\n`;
        });
        
        response += `━━━━━━━━━━━━━━━━━━━\n`;
        response += `💡 *Commands:*\n`;
        response += `• .livescore <league> - Filter by league\n`;
        response += `• .livescore <team> - Filter by team\n`;
        response += `• .scores - Same command\n\n`;
        response += `⚡ *Auto-refreshes every 30 seconds*\n`;
        response += `> *ᴘᴏᴡᴇʀᴇᴅ ʙʏ 𝑂𝑃𝑇𝐼𝑀𝑈𝑆 𝑃𝑅𝐼𝑀𝐸*`;
        
        // Send response
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
        
      } catch (fetchError) {
        console.error('Fetch error:', fetchError);
        await sock.sendMessage(chatId, { delete: loadingMsg.key });
        await extra.reply(`❌ *Failed to fetch live scores*\n\nPlease try again later.`);
      }
      
    } catch (error) {
      console.error('LiveScore Command Error:', error);
      await extra.reply(`❌ *Error:* ${error.message}`);
    }
  }
};