/**
 * Twitter Downloader - Download Twitter/X videos
 */

const axios = require('axios');
const APIs = require('../utils/api');
const config = require('../config');

// Store processed message IDs to prevent duplicates
const processedMessages = new Set();

module.exports = {
  name: 'twitter',
  aliases: ['twt', 'x', 'twdl', 'twitterdl'],
  category: 'media',
  description: 'Download Twitter/X videos',
  usage: '.twitter <Twitter/X URL>',
  
  async execute(sock, msg, args) {
    try {
      // Check if message has already been processed
      if (processedMessages.has(msg.key.id)) {
        return;
      }
      
      // Add message ID to processed set
      processedMessages.add(msg.key.id);
      
      // Clean up old message IDs after 5 minutes
      setTimeout(() => {
        processedMessages.delete(msg.key.id);
      }, 5 * 60 * 1000);
      
      const text = msg.message?.conversation || 
                   msg.message?.extendedTextMessage?.text ||
                   args.join(' ');
      
      if (!text) {
        return await sock.sendMessage(msg.key.remoteJid, { 
          text: '❌ *Please provide a Twitter/X link!*\n\nExample: .twitter https://twitter.com/username/status/123456789' 
        }, { quoted: msg });
      }
      
      // Extract URL from command
      const url = text.split(' ').slice(1).join(' ').trim();
      
      if (!url) {
        return await sock.sendMessage(msg.key.remoteJid, { 
          text: '❌ *Please provide a Twitter/X link!*\n\nExample: .twitter https://twitter.com/username/status/123456789' 
        }, { quoted: msg });
      }
      
      // Check for various Twitter URL formats
      const twitterPatterns = [
        /https?:\/\/(?:www\.)?twitter\.com\/\w+\/status\/\d+/,
        /https?:\/\/(?:www\.)?x\.com\/\w+\/status\/\d+/,
        /https?:\/\/(?:www\.)?twitter\.com\/\w+\/status\/\d+\/\w+/,
        /https?:\/\/(?:www\.)?x\.com\/\w+\/status\/\d+\/\w+/,
        /https?:\/\/(?:www\.)?twitter\.com\/i\/status\/\d+/,
        /https?:\/\/(?:www\.)?x\.com\/i\/status\/\d+/
      ];
      
      const isValidUrl = twitterPatterns.some(pattern => pattern.test(url));
      
      if (!isValidUrl) {
        return await sock.sendMessage(msg.key.remoteJid, { 
          text: '❌ *Invalid Twitter/X link!*\n\nPlease provide a valid Twitter/X video link.' 
        }, { quoted: msg });
      }
      
      await sock.sendMessage(msg.key.remoteJid, {
        react: { text: '🔄', key: msg.key }
      });
      
      try {
        let videoUrl = null;
        let videoQuality = null;
        let title = null;
        let username = null;
        
        // Try multiple APIs/methods - FIXED: Check if methods exist
        
        // Method 1: Try Siputzx API
        try {
          if (APIs.getTwitterDownload) {
            const result = await APIs.getTwitterDownload(url);
            if (result && result.videoUrl) {
              videoUrl = result.videoUrl;
              videoQuality = result.quality || 'HD';
              title = result.title || 'Twitter Video';
              username = result.username || 'Unknown';
            }
          }
        } catch (apiError) {
          console.error(`Siputzx API failed: ${apiError.message}`);
        }
        
        // Method 2: Try vxtwitter.com API
        if (!videoUrl) {
          try {
            // Convert twitter.com to vxtwitter.com for better download
            const vxUrl = url.replace('twitter.com', 'vxtwitter.com').replace('x.com', 'vxtwitter.com');
            const response = await axios.get(vxUrl, {
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
              }
            });
            
            // Extract video URL from response
            const html = response.data;
            const videoMatch = html.match(/<video[^>]*>.*?<source[^>]*src="([^"]+)"[^>]*>/i) || 
                              html.match(/"video_url":"([^"]+)"/i) ||
                              html.match(/property="og:video"[^>]*content="([^"]+)"/i);
            
            if (videoMatch && videoMatch[1]) {
              videoUrl = videoMatch[1].replace(/\\u0026/g, '&');
              
              // Extract title
              const titleMatch = html.match(/<meta[^>]*property="og:title"[^>]*content="([^"]+)"[^>]*>/i);
              title = titleMatch ? titleMatch[1] : 'Twitter Video';
              
              // Extract username
              const userMatch = html.match(/<meta[^>]*name="twitter:creator"[^>]*content="([^"]+)"[^>]*>/i) ||
                               html.match(/<meta[^>]*name="twitter:title"[^>]*content="([^"]+)"[^>]*>/i);
              username = userMatch ? userMatch[1] : 'Twitter User';
            }
          } catch (vxError) {
            console.error('vxtwitter method failed:', vxError.message);
          }
        }
        
        // Method 3: Try direct API
        if (!videoUrl) {
          try {
            const apiUrl = `https://api.douyin.wtf/api/convert?url=${encodeURIComponent(url)}`;
            const response = await axios.get(apiUrl);
            
            if (response.data && response.data.media && response.data.media[0]) {
              videoUrl = response.data.media[0];
              videoQuality = response.data.quality || 'HD';
              title = response.data.title || 'Twitter Video';
            }
          } catch (directError) {
            console.error('Direct API failed:', directError.message);
          }
        }
        
        // Method 4: Try fixupx API
        if (!videoUrl) {
          try {
            const fixupUrl = `https://api.fixupx.com/api/twitter?url=${encodeURIComponent(url)}`;
            const response = await axios.get(fixupUrl);
            
            if (response.data && response.data.video_url) {
              videoUrl = response.data.video_url;
              videoQuality = response.data.quality || 'HD';
              title = response.data.title || 'Twitter Video';
              username = response.data.author || 'Unknown';
            }
          } catch (fixupError) {
            console.error('FixupX API failed:', fixupError.message);
          }
        }
        
        // Send the video if we got a URL
        if (videoUrl) {
          try {
            // Download video as buffer
            const videoResponse = await axios.get(videoUrl, {
              responseType: 'arraybuffer',
              timeout: 60000,
              maxContentLength: 100 * 1024 * 1024, // 100MB limit
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'video/mp4,video/*,*/*;q=0.9',
                'Accept-Language': 'en-US,en;q=0.9',
                'Connection': 'keep-alive',
                'Referer': 'https://twitter.com/'
              }
            });
            
            const videoBuffer = Buffer.from(videoResponse.data);
            
            if (videoBuffer.length === 0) {
              throw new Error('Video buffer is empty');
            }
            
            const botName = config.botName.toUpperCase();
            
            let caption = `╔══════════════════════╗
║  🐦 *TWITTER VIDEO*  ║
╚══════════════════════╝\n\n`;
            
            if (title) caption += `📝 *Title:* ${title}\n`;
            if (username) caption += `👤 *User:* @${username}\n`;
            if (videoQuality) caption += `🎬 *Quality:* ${videoQuality}\n`;
            
            caption += `\n📥 *Downloaded by:* ${botName}\n`;
            caption += `> *ᴘᴏᴡᴇʀᴇᴅ ʙʏ ${config.botName}*`;
            
            await sock.sendMessage(msg.key.remoteJid, {
              video: videoBuffer,
              mimetype: 'video/mp4',
              caption: caption
            }, { quoted: msg });
            
            return;
          } catch (downloadError) {
            console.error(`Failed to download video: ${downloadError.message}`);
            // Fallback to URL method
            try {
              const botName = config.botName.toUpperCase();
              
              let caption = `╔══════════════════════╗
║  🐦 *TWITTER VIDEO*  ║
╚══════════════════════╝\n\n`;
              
              if (title) caption += `📝 *Title:* ${title}\n`;
              if (username) caption += `👤 *User:* @${username}\n`;
              if (videoQuality) caption += `🎬 *Quality:* ${videoQuality}\n`;
              
              caption += `\n📥 *Downloaded by:* ${botName}\n`;
              caption += `> *ᴘᴏᴡᴇʀᴇᴅ ʙʏ ${config.botName}*`;
              
              await sock.sendMessage(msg.key.remoteJid, {
                video: { url: videoUrl },
                mimetype: 'video/mp4',
                caption: caption
              }, { quoted: msg });
              return;
            } catch (urlError) {
              console.error(`URL method also failed: ${urlError.message}`);
            }
          }
        }
        
        // If we reach here, no method worked
        return await sock.sendMessage(msg.key.remoteJid, { 
          text: '❌ *Failed to download Twitter video!*\n\nAll download methods failed. Please try again with a different link.' 
        }, { quoted: msg });
        
      } catch (error) {
        console.error('Error in Twitter download:', error);
        await sock.sendMessage(msg.key.remoteJid, { 
          text: '❌ *Failed to download Twitter video!*\n\nPlease try again with a different link.' 
        }, { quoted: msg });
      }
    } catch (error) {
      console.error('Error in Twitter command:', error);
      await sock.sendMessage(msg.key.remoteJid, { 
        text: '❌ *An error occurred while processing your request.*\n\nPlease try again later.' 
      }, { quoted: msg });
    }
  }
};