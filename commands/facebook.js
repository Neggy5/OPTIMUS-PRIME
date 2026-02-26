/**
 * Facebook Downloader - Download Facebook videos
 */

const axios = require('axios');
const config = require('../config');

// Store processed message IDs to prevent duplicates
const processedMessages = new Set();

module.exports = {
  name: 'facebook',
  aliases: ['fb', 'fbdl', 'facebookdl'],
  category: 'media',
  description: 'Download Facebook videos',
  usage: '.facebook <Facebook URL>',
  
  async execute(sock, msg, args, extra) {
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
        return await extra.reply('Please provide a Facebook link for the video.');
      }
      
      // Extract URL from command
      const url = text.split(' ').slice(1).join(' ').trim();
      
      if (!url) {
        return await extra.reply('Please provide a Facebook link for the video.');
      }
      
      // Check for various Facebook URL formats
      const facebookPatterns = [
        /https?:\/\/(?:www\.|m\.)?facebook\.com\//,
        /https?:\/\/(?:www\.|m\.)?fb\.com\//,
        /https?:\/\/fb\.watch\//,
        /https?:\/\/(?:www\.)?facebook\.com\/watch/,
        /https?:\/\/(?:www\.)?facebook\.com\/.*\/videos\//
      ];
      
      const isValidUrl = facebookPatterns.some(pattern => pattern.test(url));
      
      if (!isValidUrl) {
        return await extra.reply('That is not a valid Facebook link. Please provide a valid Facebook video link.');
      }
      
      await sock.sendMessage(extra.from, {
        react: { text: '🔄', key: msg.key }
      });
      
      // Send processing message
      const processingMsg = await sock.sendMessage(extra.from, {
        text: '📥 *Downloading Facebook video...*'
      }, { quoted: msg });
      
      try {
        // Try multiple Facebook download APIs
        
        let videoUrl = null;
        let videoQuality = null;
        let videoTitle = null;
        
        // API 1: Siputzx API
        try {
          const apiUrl = `https://api.siputzx.my.id/api/d/fb?url=${encodeURIComponent(url)}`;
          const response = await axios.get(apiUrl, { timeout: 15000 });
          
          if (response.data && response.data.status && response.data.data) {
            const data = response.data.data;
            
            if (data.hd) {
              videoUrl = data.hd;
              videoQuality = 'HD';
            } else if (data.sd) {
              videoUrl = data.sd;
              videoQuality = 'SD';
            } else if (data.videoUrl) {
              videoUrl = data.videoUrl;
            }
            
            videoTitle = data.title || 'Facebook Video';
          }
        } catch (apiError) {
          console.error('Siputzx API failed:', apiError.message);
        }
        
        // API 2: Alternative API if first fails
        if (!videoUrl) {
          try {
            const apiUrl = `https://api.akuari.my.id/downloader/fbdown?link=${encodeURIComponent(url)}`;
            const response = await axios.get(apiUrl, { timeout: 15000 });
            
            if (response.data && response.data.status && response.data.result) {
              const result = response.data.result;
              
              if (result.hd) {
                videoUrl = result.hd;
                videoQuality = 'HD';
              } else if (result.sd) {
                videoUrl = result.sd;
                videoQuality = 'SD';
              }
              
              videoTitle = result.title || 'Facebook Video';
            }
          } catch (apiError) {
            console.error('Alternative API failed:', apiError.message);
          }
        }
        
        // API 3: Another fallback
        if (!videoUrl) {
          try {
            const apiUrl = `https://ferial-api.vercel.app/download/facebook?url=${encodeURIComponent(url)}`;
            const response = await axios.get(apiUrl, { timeout: 15000 });
            
            if (response.data && response.data.result) {
              const result = response.data.result;
              
              if (result.hd) {
                videoUrl = result.hd;
                videoQuality = 'HD';
              } else if (result.sd) {
                videoUrl = result.sd;
                videoQuality = 'SD';
              }
            }
          } catch (apiError) {
            console.error('Ferial API failed:', apiError.message);
          }
        }
        
        if (!videoUrl) {
          await sock.sendMessage(extra.from, { delete: processingMsg.key });
          throw new Error('Could not extract video URL from any API');
        }
        
        // Delete processing message
        await sock.sendMessage(extra.from, { delete: processingMsg.key });
        
        // Build caption
        const botName = config.botName.toUpperCase();
        let caption = `╔══════════════════════╗
║  📘 *FACEBOOK VIDEO*  ║
╚══════════════════════╝\n\n`;
        
        if (videoTitle) caption += `📝 *Title:* ${videoTitle}\n`;
        if (videoQuality) caption += `🎬 *Quality:* ${videoQuality}\n`;
        
        caption += `\n📥 *Downloaded by:* ${botName}\n`;
        caption += `> *ᴘᴏᴡᴇʀᴇᴅ ʙʏ ${config.botName}*`;
        
        // Try to download and send video
        try {
          const videoResponse = await axios.get(videoUrl, {
            responseType: 'arraybuffer',
            timeout: 60000,
            maxContentLength: 100 * 1024 * 1024, // 100MB limit
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
              'Referer': 'https://www.facebook.com/'
            }
          });
          
          const videoBuffer = Buffer.from(videoResponse.data);
          
          if (videoBuffer.length > 0) {
            await sock.sendMessage(extra.from, {
              video: videoBuffer,
              mimetype: 'video/mp4',
              caption: caption
            }, { quoted: msg });
          } else {
            // Fallback to URL
            await sock.sendMessage(extra.from, {
              video: { url: videoUrl },
              mimetype: 'video/mp4',
              caption: caption
            }, { quoted: msg });
          }
        } catch (downloadError) {
          console.error('Download error, sending URL instead:', downloadError.message);
          // Fallback to URL
          await sock.sendMessage(extra.from, {
            video: { url: videoUrl },
            mimetype: 'video/mp4',
            caption: caption
          }, { quoted: msg });
        }
        
      } catch (error) {
        console.error('Error in Facebook download:', error);
        if (processingMsg) {
          await sock.sendMessage(extra.from, { delete: processingMsg.key }).catch(() => {});
        }
        await extra.reply(`❌ *Failed to download Facebook video.*\n\nError: ${error.message}\n\nPlease try again with a different link.`);
      }
    } catch (error) {
      console.error('Error in Facebook command:', error);
      await extra.reply('An error occurred while processing the request. Please try again later.');
    }
  }
};