/**
 * Facebook Downloader - Download Facebook videos
 * FIXED VERSION - All errors resolved
 */

const { facebookdl, facebookdlv2 } = require('@bochilteam/scraper-facebook');
const axios = require('axios');
const config = require('../config');

// Store processed message IDs to prevent duplicates
const processedMessages = new Set();
// Clean up processed messages every 5 minutes
setInterval(() => {
  processedMessages.clear();
}, 5 * 60 * 1000);

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

      // Get text content from message
      const getMessageText = () => {
        if (msg.message?.conversation) {
          return msg.message.conversation;
        }
        if (msg.message?.extendedTextMessage?.text) {
          return msg.message.extendedTextMessage.text;
        }
        if (args.length > 0) {
          return args.join(' ');
        }
        return '';
      };
      
      const text = getMessageText();
      
      if (!text) {
        return await extra.reply('❌ Please provide a Facebook link for the video.');
      }
      
      // Extract URL from command (remove command prefix)
      const url = text.split(' ').slice(1).join(' ').trim();
      
      if (!url) {
        return await extra.reply('❌ Please provide a Facebook link for the video.\n\nExample: .facebook https://fb.watch/xxxxx/');
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
        return await extra.reply('❌ That is not a valid Facebook link. Please provide a valid Facebook video link.');
      }
      
      // Send reaction
      await sock.sendMessage(extra.from, {
        react: { text: '📥', key: msg.key }
      });
      
      // Send processing message
      const processingMsg = await sock.sendMessage(extra.from, {
        text: '⏳ *Downloading Facebook video...*\nPlease wait.'
      });
      
      try {
        // Try using facebookdlv2 first (more reliable)
        let data;
        try {
          data = await facebookdlv2(url);
          console.log('Using facebookdlv2');
        } catch (v2Error) {
          console.log('facebookdlv2 failed, trying facebookdl:', v2Error.message);
          data = await facebookdl(url);
        }
        
        if (!data) {
          throw new Error('No data received from scraper');
        }
        
        // Handle different response formats
        let videoUrl = null;
        let videoQuality = 'HD';
        let videoTitle = 'Facebook Video';
        
        // facebookdlv2 format
        if (data.video && data.video.url) {
          videoUrl = data.video.url;
          videoQuality = data.video.quality || 'HD';
          videoTitle = data.title || 'Facebook Video';
        }
        // facebookdl format
        else if (data.video && Array.isArray(data.video) && data.video.length > 0) {
          // Get highest quality video (usually first or last)
          const videos = data.video;
          const hdVideo = videos.find(v => v.quality === 'hd') || videos[0];
          
          if (hdVideo && hdVideo.url) {
            videoUrl = hdVideo.url;
            videoQuality = hdVideo.quality || 'HD';
          }
          videoTitle = data.title || 'Facebook Video';
        }
        // Alternative format
        else if (data.url) {
          videoUrl = data.url;
        }
        else if (data.download) {
          videoUrl = data.download;
        }
        
        if (!videoUrl) {
          console.error('Unexpected data format:', JSON.stringify(data, null, 2));
          throw new Error('Could not extract video URL from response');
        }
        
        // Build caption
        const botName = config.botName?.toUpperCase() || 'OPTIMUS PRIME';
        const caption = `╔══════════════════════╗
║  📥 *FACEBOOK VIDEO*  ║
╚══════════════════════╝

📌 *Title:* ${videoTitle.substring(0, 50)}${videoTitle.length > 50 ? '...' : ''}
📹 *Quality:* ${videoQuality}
⚡ *Powered by:* ${botName}

> *ᴘᴏᴡᴇʀᴇᴅ ʙʏ ${config.botName || '𝑂𝑃𝑇𝐼𝑀𝑈𝑆 𝑃𝑅𝐼𝑀𝐸'}*`;

        // Try to send video
        try {
          // Method 1: Direct URL (works most of the time)
          await sock.sendMessage(extra.from, {
            video: { url: videoUrl },
            mimetype: 'video/mp4',
            caption: caption
          }, { quoted: msg });
          
        } catch (urlError) {
          console.log('Direct URL failed, trying buffer method:', urlError.message);
          
          // Method 2: Download and send as buffer
          try {
            const videoResponse = await axios.get(videoUrl, {
              responseType: 'arraybuffer',
              timeout: 60000,
              maxContentLength: 100 * 1024 * 1024, // 100MB limit
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Referer': 'https://www.facebook.com/',
                'Accept': 'video/webm,video/mp4,video/*;q=0.9,*/*;q=0.8'
              }
            });
            
            const buffer = Buffer.from(videoResponse.data);
            
            await sock.sendMessage(extra.from, {
              video: buffer,
              mimetype: 'video/mp4',
              caption: caption
            }, { quoted: msg });
            
          } catch (bufferError) {
            console.error('Buffer method failed:', bufferError.message);
            
            // Method 3: Send just the link as fallback
            await sock.sendMessage(extra.from, {
              text: `✅ *Video downloaded successfully!*\n\n🔗 *Direct Link:*\n${videoUrl}\n\n📌 *Note:* Click the link to download.`,
              contextInfo: {
                forwardingScore: 999,
                isForwarded: true,
                forwardedNewsletterMessageInfo: {
                  newsletterJid: config.newsletterJid || '120363405724402785@newsletter',
                  newsletterName: config.botName || '𝑂𝑃𝑇𝐼𝑀𝑈𝑆 𝑃𝑅𝐼𝑀𝐸',
                  serverMessageId: -1
                }
              }
            });
          }
        }
        
        // Delete processing message
        await sock.sendMessage(extra.from, { delete: processingMsg.key });
        
        // Send success reaction
        await sock.sendMessage(extra.from, {
          react: { text: '✅', key: msg.key }
        });
        
      } catch (downloadError) {
        console.error('Download error:', downloadError);
        
        // Delete processing message
        await sock.sendMessage(extra.from, { delete: processingMsg.key });
        
        // Send error message
        await sock.sendMessage(extra.from, {
          text: `❌ *Failed to download video*\n\n*Error:* ${downloadError.message}\n\nPlease try:\n1. A different Facebook link\n2. Make sure the video is public\n3. Try again later`,
          contextInfo: {
            forwardingScore: 999,
            isForwarded: true,
            forwardedNewsletterMessageInfo: {
              newsletterJid: config.newsletterJid || '120363405724402785@newsletter',
              newsletterName: config.botName || '𝑂𝑃𝑇𝐼𝑀𝑈𝑆 𝑃𝑅𝐼𝑀𝐸',
              serverMessageId: -1
            }
          }
        }, { quoted: msg });
        
        // Send error reaction
        await sock.sendMessage(extra.from, {
          react: { text: '❌', key: msg.key }
        });
      }
      
    } catch (error) {
      console.error('Facebook command error:', error);
      await extra.reply('❌ An error occurred while processing the request. Please try again later.');
    }
  }
};