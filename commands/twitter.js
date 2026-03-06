/**
 * Twitter/X Downloader - Download Twitter/X videos
 */

const axios = require('axios');
const config = require('../config');

// Debug mode (default: true)
const DEBUG_MODE = true;

// Store processed message IDs to prevent duplicates
const processedMessages = new Set();

// Rate limiting store
const userCooldowns = new Map();

// Helper function for debug logging
function debugLog(...args) {
  if (DEBUG_MODE) {
    console.log('[Twitter-DEBUG]:', ...args);
  }
}

// Helper function to format numbers
function formatNumber(num) {
  if (!num) return '0';
  
  const number = parseInt(num);
  if (isNaN(number)) return '0';
  
  if (number >= 1000000000000) {
    return (number / 1000000000000).toFixed(1) + 'T';
  } else if (number >= 1000000000) {
    return (number / 1000000000).toFixed(1) + 'B';
  } else if (number >= 1000000) {
    return (number / 1000000).toFixed(1) + 'M';
  } else if (number >= 1000) {
    return (number / 1000).toFixed(1) + 'K';
  } else {
    return number.toString();
  }
}

// Helper function to extract URL from text
function extractUrlFromText(text) {
  if (!text) return null;
  
  // Regular expression to find URLs
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const matches = text.match(urlRegex);
  
  if (matches && matches.length > 0) {
    return matches[0]; // Return the first URL found
  }
  
  return null;
}

// Helper function to validate Twitter/X URL
function isValidTwitterUrl(url) {
  if (!url) return false;
  
  const twitterPatterns = [
    /https?:\/\/(?:www\.)?twitter\.com\//,
    /https?:\/\/(?:www\.)?x\.com\//,
    /https?:\/\/(?:www\.)?twitter\.com\/[^/]+\/status\//,
    /https?:\/\/(?:www\.)?x\.com\/[^/]+\/status\//
  ];
  
  return twitterPatterns.some(pattern => pattern.test(url));
}

// Helper function to get best quality video URL
function getBestQualityVideo(downloads) {
  if (!downloads || !Array.isArray(downloads) || downloads.length === 0) {
    return null;
  }
  
  // Sort by quality (highest first) and return the URL
  // Quality strings like "1080x1920p" - we extract the width number
  const sorted = [...downloads].sort((a, b) => {
    const aWidth = parseInt(a.quality.split('x')[0]) || 0;
    const bWidth = parseInt(b.quality.split('x')[0]) || 0;
    return bWidth - aWidth;
  });
  
  return sorted[0].url;
}

module.exports = {
  name: 'twitter',
  aliases: ['tw', 'x', 'xdl', 'twdl'],
  category: 'media',
  description: 'Download Twitter/X videos',
  usage: '<Twitter/X URL> or reply to a message containing a Twitter/X link',
  
  async execute(sock, msg, args, extra) {
    try {
      const userId = msg.key.participant || msg.key.remoteJid;
      const currentTime = Date.now();
      
      debugLog('Command executed by:', userId);
      
      // Check rate limiting for the user
      if (userCooldowns.has(userId)) {
        const cooldownExpiry = userCooldowns.get(userId);
        const timeLeft = Math.ceil((cooldownExpiry - currentTime) / 1000);
        
        if (timeLeft > 0) {
          debugLog('User on cooldown:', timeLeft, 'seconds left');
          
          // Send cooldown message with timer
          const cooldownMsg = await sock.sendMessage(msg.key.remoteJid, {
            text: `*𝑂𝑃𝑇𝐼𝑀𝑈𝑆 𝑃𝑅𝐼𝑀𝐸 Twitter/X Downloader 🙂‍↕️*\n*IS ON COOL-DOWN 🥵*\n*YOU CAN USE THE COMMAND AGAIN IN ${timeLeft} SECS*`
          }, { quoted: msg });
          
          // Update the timer every second until cooldown expires
          const interval = setInterval(async () => {
            const newTimeLeft = Math.ceil((cooldownExpiry - Date.now()) / 1000);
            
            if (newTimeLeft <= 0) {
              clearInterval(interval);
              try {
                await sock.sendMessage(msg.key.remoteJid, {
                  delete: cooldownMsg.key
                });
              } catch (e) {
                debugLog('Error deleting cooldown message:', e.message);
              }
            } else {
              try {
                await sock.sendMessage(msg.key.remoteJid, {
                  text: `*𝑂𝑃𝑇𝐼𝑀𝑈𝑆 𝑃𝑅𝐼𝑀𝐸 TWITTER/X DOWNLOADER*\n*IS ON COOL-DOWN 🥵*\n*YOU CAN USE THE COMMAND AGAIN IN ${newTimeLeft} SECS*`,
                  edit: cooldownMsg.key
                });
              } catch (e) {
                debugLog('Error updating cooldown message:', e.message);
              }
            }
          }, 1000);
          
          return;
        }
      }
      
      // Check if message has already been processed
      if (processedMessages.has(msg.key.id)) {
        debugLog('Duplicate message detected:', msg.key.id);
        return;
      }
      
      // Add message ID to processed set
      processedMessages.add(msg.key.id);
      
      // Clean up old message IDs after 5 minutes
      setTimeout(() => {
        processedMessages.delete(msg.key.id);
      }, 5 * 60 * 1000);
      
      // Get the text from the command
      const commandText = msg.message?.conversation || 
                          msg.message?.extendedTextMessage?.text ||
                          args.join(' ');
      
      debugLog('Command text:', commandText);
      
      // Check if this is a reply to another message
      const isReply = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage ? true : false;
      let targetUrl = null;
      let urlSource = 'command';
      
      if (isReply) {
        // Get the quoted message
        const quotedMsg = msg.message.extendedTextMessage.contextInfo.quotedMessage;
        debugLog('Replying to a message');
        
        // Extract text from quoted message
        let quotedText = null;
        
        if (quotedMsg.conversation) {
          quotedText = quotedMsg.conversation;
        } else if (quotedMsg.extendedTextMessage?.text) {
          quotedText = quotedMsg.extendedTextMessage.text;
        } else if (quotedMsg.imageMessage?.caption) {
          quotedText = quotedMsg.imageMessage.caption;
        } else if (quotedMsg.videoMessage?.caption) {
          quotedText = quotedMsg.videoMessage.caption;
        } else if (quotedMsg.documentMessage?.caption) {
          quotedText = quotedMsg.documentMessage.caption;
        }
        
        debugLog('Quoted text:', quotedText);
        
        if (quotedText) {
          // Try to extract URL from quoted message
          targetUrl = extractUrlFromText(quotedText);
          if (targetUrl) {
            urlSource = 'reply';
            debugLog('URL extracted from reply:', targetUrl);
          }
        }
      }
      
      // If no URL found in reply, try to get from command arguments
      if (!targetUrl) {
        // Extract URL from command arguments (skip the command name)
        const argsText = args.join(' ');
        targetUrl = extractUrlFromText(argsText);
        if (targetUrl) {
          urlSource = 'command';
          debugLog('URL extracted from command:', targetUrl);
        }
      }
      
      // If still no URL, prompt user
      if (!targetUrl) {
        debugLog('No URL found');
        
        let responseText = `❌ *Please provide a Twitter/X link*\n\n`;
        responseText += `*Ways to use:*\n`;
        responseText += `1️⃣ Type: ${config.prefix}twitter <URL>\n`;
        responseText += `2️⃣ Type: ${config.prefix}x <URL>\n`;
        responseText += `3️⃣ Reply to any message containing a Twitter/X link with ${config.prefix}twitter\n\n`;
        responseText += `*Example:*\n`;
        responseText += `${config.prefix}twitter https://x.com/rihanna/status/2011124388280877122`;
        
        return await sock.sendMessage(msg.key.remoteJid, { 
          text: responseText
        }, { quoted: msg });
      }
      
      // Validate if it's a Twitter/X URL
      if (!isValidTwitterUrl(targetUrl)) {
        debugLog('Invalid Twitter/X URL:', targetUrl);
        return await sock.sendMessage(msg.key.remoteJid, { 
          text: '❌ *Invalid Twitter/X link*\nPlease provide a valid Twitter or X video link.' 
        }, { quoted: msg });
      }
      
      debugLog('Valid Twitter/X URL found from', urlSource, ':', targetUrl);
      
      // Send processing reaction
      await sock.sendMessage(msg.key.remoteJid, {
        react: { text: '🐦', key: msg.key }
      });
      
      // Send initial processing message (will be deleted later)
      const processingMsg = await sock.sendMessage(msg.key.remoteJid, {
        text: '📥 *Downloading Twitter/X content...*'
      }, { quoted: msg });
      
      try {
        // Clean the URL - remove any extra text after the URL
        const cleanUrl = targetUrl.split(' ')[0].split('\n')[0];
        debugLog('Cleaned URL:', cleanUrl);
        
        // Use the API
        const apiUrl = `https://arcane-nx-cipher-pol.hf.space/api/downloader/twitter?url=${encodeURIComponent(cleanUrl)}`;
        debugLog('API URL:', apiUrl);
        
        const response = await axios.get(apiUrl, {
          timeout: 30000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'application/json'
          }
        });
        
        debugLog('API Response received');
        
        const data = response.data;
        
        // Extract data from the API response
        if (!data || !data.success) {
          debugLog('Invalid API response:', data);
          throw new Error('Invalid API response');
        }
        
        const result = data.result;
        
        // Thumbnail
        const thumbnailUrl = result.thumbnail;
        
        // Creator info
        const creatorName = result.author?.name || 'Unknown';
        const creatorUsername = result.author?.username || 'unknown';
        const creatorAvatar = result.author?.avatar;
        const creatorFollowers = formatNumber(result.author?.followers || 0);
        
        debugLog('Creator:', creatorName, '@' + creatorUsername);
        debugLog('Followers:', creatorFollowers);
        
        // Video URLs - get best quality
        const downloads = result.downloads || [];
        const videoUrl = getBestQualityVideo(downloads);
        const availableQualities = downloads.map(d => d.quality).join(', ');
        
        if (!videoUrl) {
          debugLog('No video URL found');
          throw new Error('No video URL found in API response');
        }
        
        debugLog('Video URL (best quality):', videoUrl);
        debugLog('Available qualities:', availableQualities);
        
        // Download video as buffer
        debugLog('Downloading video...');
        const videoResponse = await axios.get(videoUrl, {
          responseType: 'arraybuffer',
          timeout: 60000,
          maxContentLength: 100 * 1024 * 1024, // 100MB limit
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'video/mp4,video/*,*/*;q=0.9',
            'Referer': 'https://x.com/'
          }
        });
        
        const videoBuffer = Buffer.from(videoResponse.data);
        debugLog('Video downloaded, size:', videoBuffer.length, 'bytes');
        
        if (videoBuffer.length === 0) {
          throw new Error('Video buffer is empty');
        }
        
        // Create caption with writings at top and trademark at bottom
        const botName = config.botName || '𝑂𝑃𝑇𝐼𝑀𝑈𝑆 𝑃𝑅𝐼𝑀𝐸';
        const trademark = '🏹𝑂𝑃𝑇𝐼𝑀𝑈𝑆 𝑃𝑅𝐼𝑀𝐸';
        
        let caption = `🐦 *Twitter/X Video*\n\n`;
        caption += `👤 *Creator:* \`${creatorName} (@${creatorUsername})\`\n`;
        caption += `👥 *Followers:* ${creatorFollowers}\n\n`;
        caption += `🎬 *Available Qualities:*\n`;
        caption += `   ${availableQualities}\n\n`;
        caption += `📥 *Downloaded:* Best quality available\n\n`;
        caption += `${trademark}`;
        
        debugLog('Caption created');
        
        // Send the video
        await sock.sendMessage(msg.key.remoteJid, {
          video: videoBuffer,
          mimetype: 'video/mp4',
          caption: caption
        }, { quoted: msg });
        
        debugLog('Video sent successfully');
        
        // Delete the "Downloading Twitter/X content..." message after 0.5 seconds
        setTimeout(async () => {
          try {
            await sock.sendMessage(msg.key.remoteJid, {
              delete: processingMsg.key
            });
            debugLog('Processing message deleted');
          } catch (deleteError) {
            debugLog('Failed to delete processing message:', deleteError.message);
          }
        }, 500);
        
        // Set cooldown for user (10 seconds)
        userCooldowns.set(userId, currentTime + 10000);
        debugLog('Cooldown set for user until:', new Date(currentTime + 10000).toLocaleTimeString());
        
        // Clean up cooldown after it expires
        setTimeout(() => {
          userCooldowns.delete(userId);
          debugLog('Cooldown removed for user');
        }, 10000);
        
        // Wait 0.9 seconds then change reaction to 🏹
        setTimeout(async () => {
          try {
            await sock.sendMessage(msg.key.remoteJid, {
              react: { text: '🏹', key: msg.key }
            });
            debugLog('Reaction updated to 🏹');
          } catch (reactError) {
            debugLog('Failed to update reaction:', reactError.message);
          }
        }, 900); // 0.9 seconds delay
        
      } catch (error) {
        debugLog('Error in download process:', error.message);
        if (error.stack) debugLog('Stack:', error.stack);
        
        // Change reaction to ❌ on error
        await sock.sendMessage(msg.key.remoteJid, {
          react: { text: '❌', key: msg.key }
        });
        
        // Delete processing message if it exists
        try {
          await sock.sendMessage(msg.key.remoteJid, {
            delete: processingMsg.key
          });
        } catch (e) {}
        
        await sock.sendMessage(msg.key.remoteJid, { 
          text: '❌ *Failed to download Twitter/X content*\nPlease try again with a different link or check if the video exists.' 
        }, { quoted: msg });
      }
    } catch (error) {
      debugLog('Fatal error in command:', error.message);
      if (error.stack) debugLog('Stack:', error.stack);
      
      await sock.sendMessage(msg.key.remoteJid, { 
        text: '❌ An error occurred while processing the request. Please try again later.' 
      }, { quoted: msg });
    }
  }
};