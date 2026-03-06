/**
 * Weather Command - Get current weather for any location
 */

const axios = require('axios');

// Free weather API (you can replace with your preferred API)
const WEATHER_API_KEY = '4902c0f2550f58298ad4146a92b65e10'; // Sign up at https://openweathermap.org/api
const WEATHER_API_URL = 'https://api.openweathermap.org/data/2.5/weather';

// Alternative free API (no key required - for demo purposes)
const ALT_WEATHER_API = 'https://wttr.in';

module.exports = {
    name: 'weather',
    aliases: ['w', 'temp', 'forecast', 'climate'],
    description: 'Get current weather for any location',
    usage: '.weather <city/country>',
    groupOnly: false,
    adminOnly: false,
    botAdminNeeded: false,
    
    async execute(sock, msg, args, extra) {
        try {
            const chatId = msg.key.remoteJid;
            
            // Check if location is provided
            if (args.length === 0) {
                return await sock.sendMessage(chatId, { 
                    text: `╔══════════════════════╗
║  ☀️ *WEATHER COMMAND*  ║
╚══════════════════════╝

❌ *Please provide a location!*

📌 *Usage:*
• .weather <city>
• .weather <city>, <country>
• .weather <city> <state> <country>

💡 *Examples:*
• .weather London
• .weather New York
• .weather Tokyo, Japan
• .weather Paris, France

🌍 *Get current weather anywhere!*`,
                    contextInfo: {
                        forwardingScore: 999,
                        isForwarded: true,
                        forwardedNewsletterMessageInfo: {
                            newsletterJid: '120363405724402785@newsletter',
                            newsletterName: '𝑂𝑃𝑇𝐼𝑀𝑈𝑆 𝑃𝑅𝐼𝑀𝐸',
                            serverMessageId: -1
                        }
                    }
                });
            }
            
            const location = args.join(' ');
            
            // Send processing message
            const processingMsg = await sock.sendMessage(chatId, { 
                text: `🌤️ *Fetching weather for* ${location}...`,
                contextInfo: {
                    forwardingScore: 999,
                    isForwarded: true,
                    forwardedNewsletterMessageInfo: {
                        newsletterJid: '120363405724402785@newsletter',
                        newsletterName: '𝑂𝑃𝑇𝐼𝑀𝑈𝑆 𝑃𝑅𝐼𝑀𝐸',
                        serverMessageId: -1
                    }
                }
            });
            
            try {
                // Method 1: Using wttr.in (no API key required)
                const response = await axios.get(`${ALT_WEATHER_API}/${encodeURIComponent(location)}?format=j1`);
                const data = response.data;
                
                if (!data || !data.current_condition || data.current_condition.length === 0) {
                    throw new Error('Location not found');
                }
                
                const current = data.current_condition[0];
                const nearest = data.nearest_area?.[0] || {};
                const area = nearest.areaName?.[0]?.value || location;
                const country = nearest.country?.[0]?.value || '';
                const region = nearest.region?.[0]?.value || '';
                
                // Parse weather data
                const temp = current.temp_C || 'N/A';
                const feelsLike = current.FeelsLikeC || 'N/A';
                const humidity = current.humidity || 'N/A';
                const windSpeed = current.windspeedKmph || 'N/A';
                const windDir = current.winddir16Point || 'N/A';
                const pressure = current.pressure || 'N/A';
                const visibility = current.visibility || 'N/A';
                const uvIndex = current.uvIndex || 'N/A';
                const cloudCover = current.cloudcover || 'N/A';
                const weatherDesc = current.weatherDesc?.[0]?.value || 'Unknown';
                const weatherCode = current.weatherCode || 'unknown';
                
                // Get weather icon based on condition
                const getWeatherIcon = (code) => {
                    const iconMap = {
                        '113': '☀️', // Sunny
                        '116': '🌤️', // Partly cloudy
                        '119': '☁️', // Cloudy
                        '122': '☁️', // Overcast
                        '143': '🌫️', // Mist
                        '176': '🌦️', // Patchy rain
                        '179': '🌨️', // Patchy snow
                        '182': '🌨️', // Patchy sleet
                        '185': '🌧️', // Patchy freezing drizzle
                        '200': '⛈️', // Thundery outbreaks
                        '227': '🌨️', // Blowing snow
                        '230': '🌨️', // Blizzard
                        '248': '🌫️', // Fog
                        '260': '🌫️', // Freezing fog
                        '263': '🌧️', // Patchy light drizzle
                        '266': '🌧️', // Light drizzle
                        '281': '🌧️', // Freezing drizzle
                        '284': '🌧️', // Heavy freezing drizzle
                        '293': '🌧️', // Patchy light rain
                        '296': '🌧️', // Light rain
                        '299': '🌧️', // Moderate rain at times
                        '302': '🌧️', // Moderate rain
                        '305': '🌧️', // Heavy rain at times
                        '308': '🌧️', // Heavy rain
                        '311': '🌧️', // Light freezing rain
                        '314': '🌧️', // Moderate or heavy freezing rain
                        '317': '🌨️', // Light sleet
                        '320': '🌨️', // Moderate or heavy sleet
                        '323': '🌨️', // Patchy light snow
                        '326': '🌨️', // Light snow
                        '329': '🌨️', // Patchy moderate snow
                        '332': '🌨️', // Moderate snow
                        '335': '🌨️', // Patchy heavy snow
                        '338': '🌨️', // Heavy snow
                        '350': '🧊', // Ice pellets
                        '353': '🌧️', // Light rain shower
                        '356': '🌧️', // Moderate or heavy rain shower
                        '359': '🌧️', // Torrential rain shower
                        '362': '🌨️', // Light sleet showers
                        '365': '🌨️', // Moderate or heavy sleet showers
                        '368': '🌨️', // Light snow showers
                        '371': '🌨️', // Moderate or heavy snow showers
                        '374': '🧊', // Light showers of ice pellets
                        '377': '🧊', // Moderate or heavy showers of ice pellets
                        '386': '⛈️', // Patchy light rain with thunder
                        '389': '⛈️', // Moderate or heavy rain with thunder
                        '392': '⛈️', // Patchy light snow with thunder
                        '395': '⛈️'  // Moderate or heavy snow with thunder
                    };
                    return iconMap[code] || '🌡️';
                };
                
                const weatherIcon = getWeatherIcon(weatherCode);
                
                // Build weather message
                const weatherText = `╔══════════════════════╗
║  ${weatherIcon} *WEATHER REPORT*  ${weatherIcon} ║
╠══════════════════════╣
║ 📍 *Location:* ${area}${region ? `, ${region}` : ''}${country ? `, ${country}` : ''}
║ 🕐 *Time:* ${current.observation_time || 'N/A'}
╚══════════════════════╝

━━━━━━━━━━━━━━━━━━━
🌡️ *TEMPERATURE*
━━━━━━━━━━━━━━━━━━━
• Current: ${temp}°C ${weatherIcon}
• Feels like: ${feelsLike}°C
• Min/Max: ${current.tempMin_C || 'N/A'}°C / ${current.tempMax_C || 'N/A'}°C

━━━━━━━━━━━━━━━━━━━
💧 *HUMIDITY & PRESSURE*
━━━━━━━━━━━━━━━━━━━
• Humidity: ${humidity}%
• Pressure: ${pressure} mb

━━━━━━━━━━━━━━━━━━━
💨 *WIND*
━━━━━━━━━━━━━━━━━━━
• Speed: ${windSpeed} km/h
• Direction: ${windDir}

━━━━━━━━━━━━━━━━━━━
👁️ *VISIBILITY & CLOUDS*
━━━━━━━━━━━━━━━━━━━
• Visibility: ${visibility} km
• Cloud Cover: ${cloudCover}%

━━━━━━━━━━━━━━━━━━━
☀️ *UV INDEX*
━━━━━━━━━━━━━━━━━━━
• UV Level: ${uvIndex} ${uvIndex > 7 ? '🔴 High' : uvIndex > 4 ? '🟡 Moderate' : '🟢 Low'}

━━━━━━━━━━━━━━━━━━━
📝 *DESCRIPTION*
━━━━━━━━━━━━━━━━━━━
• ${weatherDesc}

━━━━━━━━━━━━━━━━━━━
> *ᴘᴏᴡᴇʀᴇᴅ ʙʏ 𝑂𝑃𝑇𝐼𝑀𝑈𝑆 𝑃𝑅𝐼𝑀𝐸*`;

                // Delete processing message
                await sock.sendMessage(chatId, { delete: processingMsg.key });
                
                // Send weather info
                await sock.sendMessage(chatId, { 
                    text: weatherText,
                    contextInfo: {
                        forwardingScore: 999,
                        isForwarded: true,
                        forwardedNewsletterMessageInfo: {
                            newsletterJid: '120363405724402785@newsletter',
                            newsletterName: '𝑂𝑃𝑇𝐼𝑀𝑈𝑆 𝑃𝑅𝐼𝑀𝐸',
                            serverMessageId: -1
                        }
                    }
                });
                
            } catch (apiError) {
                console.error('Weather API error:', apiError);
                
                // Fallback to simple text response
                await sock.sendMessage(chatId, { delete: processingMsg.key });
                
                await sock.sendMessage(chatId, { 
                    text: `❌ *Could not fetch weather for "${location}"*\n\n` +
                          `💡 *Try:*\n` +
                          `• Check the spelling\n` +
                          `• Use city name only\n` +
                          `• Add country (e.g., "London, UK")\n` +
                          `• Try a nearby city`,
                    contextInfo: {
                        forwardingScore: 999,
                        isForwarded: true,
                        forwardedNewsletterMessageInfo: {
                            newsletterJid: '120363405724402785@newsletter',
                            newsletterName: '𝑂𝑃𝑇𝐼𝑀𝑈𝑆 𝑃𝑅𝐼𝑀𝐸',
                            serverMessageId: -1
                        }
                    }
                });
            }
            
        } catch (error) {
            console.error('Weather Command Error:', error);
            await sock.sendMessage(msg.key.remoteJid, { 
                text: `❌ *Error:* ${error.message}`,
                contextInfo: {
                    forwardingScore: 999,
                    isForwarded: true,
                    forwardedNewsletterMessageInfo: {
                        newsletterJid: '120363405724402785@newsletter',
                        newsletterName: '𝑂𝑃𝑇𝐼𝑀𝑈𝑆 𝑃𝑅𝐼𝑀𝐸',
                        serverMessageId: -1
                    }
                }
            });
        }
    }
};