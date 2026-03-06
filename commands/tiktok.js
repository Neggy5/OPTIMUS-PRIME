/**
 * TikTok Downloader - Download TikTok videos
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
    console.log('[TikTok-DEBUG]:', ...args);
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
    return (number / 1000000000000).toFixed(1) + 'T';
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

// Helper function to validate TikTok URL
function isValidTikTokUrl(url) {
  if (!url) return false;
  
  const tiktokPatterns = [
    /https?:\/\/(?:www\.)?tiktok\.com\//,
    /https?:\/\/(?:vm\.)?tiktok\.com\//,
    /https?:\/\/(?:vt\.)?tiktok\.com\//,
    /https?:\/\/(?:www\.)?tiktok\.com\/@/,
    /https?:\/\/(?:www\.)?tiktok\.com\/t\//
  ];
  
  return tiktokPatterns.some(pattern => pattern.test(url));
}

module.exports = {
  name: 'tiktok',
  aliases: ['tt', 'ttdl', 'tiktokdl'],
  category: 'media',
  description: 'Download TikTok videos and audio',
  usage: '<TikTok URL> or reply to a message containing a TikTok link',
  
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
            text: `*𝑂𝑃𝑇𝐼𝑀𝑈𝑆 𝑃𝑅𝐼𝑀𝐸 TikTok Downloader 🙂‍↕️*\n*IS ON COOL-DOWN 🥵*\n*YOU CAN USE THE COMMAND AGAIN IN ${timeLeft} SECS*`
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
                  text: `*𝑂𝑃𝑇𝐼𝑀𝑈𝑆 𝑃𝑅𝐼𝑀𝐸 TIKTOK DOWNLOADER*\n*IS ON COOL-DOWN 🥵*\n*YOU CAN USE THE COMMAND AGAIN IN ${newTimeLeft} SECS*`,
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
        
        let responseText = `❌ *Please provide a TikTok link*\n\n`;
        responseText += `*Ways to use:*\n`;
        responseText += `1️⃣ Type: ${config.prefix}tiktok <URL>\n`;
        responseText += `2️⃣ Reply to any message containing a TikTok link with ${config.prefix}tiktok\n\n`;
        responseText += `*Example:*\n`;
        responseText += `${config.prefix}tiktok https://vm.tiktok.com/ZS9e7JkyguuLp-Rbvk2/`;
        
        return await sock.sendMessage(msg.key.remoteJid, { 
          text: responseText
        }, { quoted: msg });
      }
      
      // Validate if it's a TikTok URL
      if (!isValidTikTokUrl(targetUrl)) {
        debugLog('Invalid TikTok URL:', targetUrl);
        return await sock.sendMessage(msg.key.remoteJid, { 
          text: '❌ *Invalid TikTok link*\nPlease provide a valid TikTok video link.' 
        }, { quoted: msg });
      }
      
      debugLog('Valid TikTok URL found from', urlSource, ':', targetUrl);
      
      // Send processing reaction
      await sock.sendMessage(msg.key.remoteJid, {
        react: { text: '👻', key: msg.key }
      });
      
      // Send initial processing message (will be deleted later)
      const processingMsg = await sock.sendMessage(msg.key.remoteJid, {
        text: '📥 *Downloading TikTok content...*'
      }, { quoted: msg });
      
      try {
        // Clean the URL - remove any extra text after the URL
        const cleanUrl = targetUrl.split(' ')[0].split('\n')[0];
        debugLog('Cleaned URL:', cleanUrl);
        
        // Use the new API
        const apiUrl = `https://arcane-nx-cipher-pol.hf.space/api/downloader/tiktok/v2?url=${encodeURIComponent(cleanUrl)}`;
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
        
        const videoId = data.id;
        const title = data.title || 'TikTok Video';
        
        // Stats
        const rawViews = data.stats?.views || 0;
        const rawLikes = data.stats?.likes || 0;
        const rawComments = data.stats?.comments || 0;
        const rawShares = data.stats?.shares || 0;
        
        // Format stats
        const views = formatNumber(rawViews);
        const likes = formatNumber(rawLikes);
        const comments = formatNumber(rawComments);
        const shares = formatNumber(rawShares);
        
        debugLog('Stats - Views:', rawViews, '→', views);
        debugLog('Stats - Likes:', rawLikes, '→', likes);
        debugLog('Stats - Comments:', rawComments, '→', comments);
        debugLog('Stats - Shares:', rawShares, '→', shares);
        
        // Creator info
        const creatorName = data.author?.nickname || 'Unknown';
        const creatorUsername = data.author?.username || 'unknown';
        const creatorAvatar = data.author?.avatar;
        
        debugLog('Creator:', creatorName, '@' + creatorUsername);
        
        // Video URLs
        const videoNowatermark = data.video_nowatermark;
        const videoWatermark = data.video_watermark;
        const musicUrl = data.music;
        const coverUrl = data.cover;
        
        // Prefer no-watermark video
        const videoUrl = videoNowatermark || videoWatermark;
        
        if (!videoUrl) {
          debugLog('No video URL found');
          throw new Error('No video URL found in API response');
        }
        
        debugLog('Video URL:', videoUrl);
        debugLog('Music URL:', musicUrl || 'Not available');
        
        // Download video as buffer
        debugLog('Downloading video...');
        const videoResponse = await axios.get(videoUrl, {
          responseType: 'arraybuffer',
          timeout: 60000,
          maxContentLength: 100 * 1024 * 1024, // 100MB limit
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'video/mp4,video/*,*/*;q=0.9',
            'Referer': 'https://www.tiktok.com/'
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
        
        let caption = `📝 *Title:* ${title}\n\n`;
        caption += `👤 *Creator:* \`${creatorName} (@${creatorUsername})\`\n\n`;
        caption += `📊 *Stats:*\n`;
        caption += `   👁️ Views: ${views} |--| 👑 Likes: ${likes}\n`;
        caption += `   💬 Comments: ${comments} |--| 🔄 Shares: ${shares}\n\n`;
        caption += `${trademark}`;
        
        debugLog('Caption created');
        
        // Send the video
        await sock.sendMessage(msg.key.remoteJid, {
          video: videoBuffer,
          mimetype: 'video/mp4',
          caption: caption
        }, { quoted: msg });
        
        debugLog('Video sent successfully');
        
        // Delete the "Downloading TikTok content..." message after 0.5 seconds
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
        
        // If music URL exists, wait 0.8 seconds then download and send audio
        if (musicUrl) {
          debugLog('Audio download scheduled in 0.8 seconds');
          
          setTimeout(async () => {
            try {
              debugLog('Starting audio download...');
              
              // Download audio as buffer
              const audioResponse = await axios.get(musicUrl, {
                responseType: 'arraybuffer',
                timeout: 30000,
                maxContentLength: 50 * 1024 * 1024, // 50MB limit
                headers: {
                  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                  'Accept': 'audio/mpeg,audio/*,*/*;q=0.9'
                }
              });
              
              const audioBuffer = Buffer.from(audioResponse.data);
              debugLog('Audio downloaded, size:', audioBuffer.length, 'bytes');
              
              if (audioBuffer.length > 0) {
                // Send audio as document with metadata
                const audioCaption = `🎵 *TikTok Audio*\n📝 *Title:* ${title}\n👤 *Creator:* \`${creatorName}\`\n\n${trademark}`;
                
                await sock.sendMessage(msg.key.remoteJid, {
                  audio: audioBuffer,
                  mimetype: 'audio/mpeg',
                  fileName: `tiktok_audio_${videoId || Date.now()}.mp3`,
                  ptt: false
                }, { quoted: msg });
                
                debugLog('Audio sent successfully');
              } else {
                debugLog('Audio buffer is empty');
              }
            } catch (audioError) {
              debugLog('Failed to download audio:', audioError.message);
              // Don't fail the whole command if audio fails
            }
          }, 800); // 0.8 seconds delay
        } else {
          debugLog('No music URL available');
        }
        
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
          text: '❌ *Failed to download TikTok content*\nPlease try again with a different link or check if the video exists.' 
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