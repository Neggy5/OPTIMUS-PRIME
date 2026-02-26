/**
 * URL Command - Get direct URL of images and media
 */

const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const FormData = require('form-data');

// Temporary storage for uploaded files
const tempDir = path.join(__dirname, '../temp');
if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

// File hosting services (you can add more)
const hostingServices = {
  telegraph: 'https://telegra.ph/upload',
  imgbb: 'https://api.imgbb.com/1/upload',
  // Add more as needed
};

// Upload to Telegraph
const uploadToTelegraph = async (buffer) => {
  try {
    const form = new FormData();
    form.append('file', buffer, { filename: 'image.jpg' });
    
    const response = await axios.post('https://telegra.ph/upload', form, {
      headers: {
        ...form.getHeaders(),
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    if (response.data && response.data[0] && response.data[0].src) {
      return `https://telegra.ph${response.data[0].src}`;
    }
    throw new Error('Invalid response from Telegraph');
  } catch (error) {
    console.error('Telegraph upload error:', error);
    throw error;
  }
};

// Upload to ImgBB (requires API key)
const uploadToImgBB = async (buffer, apiKey) => {
  try {
    const form = new FormData();
    form.append('image', buffer.toString('base64'));
    
    const response = await axios.post(`https://api.imgbb.com/1/upload?key=${apiKey}`, form, {
      headers: form.getHeaders()
    });
    
    if (response.data && response.data.data && response.data.data.url) {
      return response.data.data.url;
    }
    throw new Error('Invalid response from ImgBB');
  } catch (error) {
    console.error('ImgBB upload error:', error);
    throw error;
  }
};

// Detect media type from buffer
const detectMediaType = (buffer) => {
  const signatures = {
    'ffd8ffe': 'jpg',
    '89504e47': 'png',
    '47494638': 'gif',
    '424d': 'bmp',
    '49492a00': 'tiff',
    '00000018': 'mp4',
    '00000020': 'mp4',
    '66747970': 'mp4',
    '1a45dfa3': 'mkv',
    '52494646': 'webp',
    '494433': 'mp3',
    'fffb': 'mp3',
    'fff3': 'mp3',
    'fff2': 'mp3'
  };
  
  const hex = buffer.toString('hex', 0, Math.min(12, buffer.length));
  
  for (const [sig, type] of Object.entries(signatures)) {
    if (hex.startsWith(sig)) return type;
  }
  
  // Check for text
  const textSample = buffer.toString('utf8', 0, Math.min(100, buffer.length));
  if (/^[\w\s\.,!?"'()-]+$/.test(textSample)) return 'txt';
  
  return 'bin';
};

// Format file size
const formatFileSize = (bytes) => {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(2) + ' KB';
  return (bytes / 1048576).toFixed(2) + ' MB';
};

module.exports = {
  name: 'url',
  aliases: ['link', 'direct', 'getlink', 'upload'],
  category: 'tools',
  description: 'Get direct URL of images and media',
  usage: '.url (reply to image/video/audio/file)',
  
  async execute(sock, msg, args, extra) {
    try {
      const chatId = extra.from;
      
      // Check if replying to a message
      const quotedMsg = msg.message?.extendedTextMessage?.contextInfo;
      const quotedMessage = quotedMsg?.quotedMessage;
      
      if (!quotedMsg || !quotedMessage) {
        return extra.reply(`╔══════════════════════╗
║  🔗 *URL GENERATOR*   ║
╚══════════════════════╝

❌ *Please reply to an image or media!*

📌 *Supported formats:*
• Images (jpg, png, gif, webp)
• Videos (mp4, mkv, mov)
• Audio (mp3, m4a, ogg)
• Documents (pdf, txt, etc.)
• Stickers

💡 *How to use:*
1. Send or forward any media
2. Reply to it with .url
3. Get direct link instantly

⚡ *Links are valid for:*
• Telegraph: ~30 days
• Temporary: 24 hours

> *ᴘᴏᴡᴇʀᴇᴅ ʙʏ 𝑂𝑃𝑇𝐼𝑀𝑈𝑆 𝑃𝑅𝐼𝑀𝐸*`);
      }
      
      // Determine media type
      let mediaMessage = null;
      let mediaType = null;
      let fileName = 'file';
      
      if (quotedMessage.imageMessage) {
        mediaMessage = quotedMessage.imageMessage;
        mediaType = 'image';
        fileName = quotedMessage.imageMessage.caption || 'image.jpg';
      } else if (quotedMessage.videoMessage) {
        mediaMessage = quotedMessage.videoMessage;
        mediaType = 'video';
        fileName = quotedMessage.videoMessage.caption || 'video.mp4';
      } else if (quotedMessage.audioMessage) {
        mediaMessage = quotedMessage.audioMessage;
        mediaType = 'audio';
        fileName = 'audio.mp3';
      } else if (quotedMessage.stickerMessage) {
        mediaMessage = quotedMessage.stickerMessage;
        mediaType = 'sticker';
        fileName = 'sticker.webp';
      } else if (quotedMessage.documentMessage) {
        mediaMessage = quotedMessage.documentMessage;
        mediaType = 'document';
        fileName = mediaMessage.fileName || 'document.bin';
      } else if (quotedMessage.conversation || quotedMessage.extendedTextMessage) {
        const text = quotedMessage.conversation || quotedMessage.extendedTextMessage?.text;
        return extra.reply(`📝 *Text URL*\n\nJust copy the text directly:\n\n"${text}"`);
      } else {
        return extra.reply('❌ *Unsupported media type!*\n\nPlease reply to an image, video, audio, or document.');
      }
      
      // Send processing message
      const processingMsg = await sock.sendMessage(chatId, {
        text: `🔄 *Generating URL...*\n\n📁 Type: ${mediaType}\n⏳ Please wait`
      }, { quoted: msg });
      
      try {
        // Download media
        const stream = await downloadContentFromMessage(mediaMessage, mediaType === 'sticker' ? 'sticker' : mediaType);
        let buffer = Buffer.from([]);
        
        for await (const chunk of stream) {
          buffer = Buffer.concat([buffer, chunk]);
        }
        
        if (buffer.length === 0) {
          throw new Error('Downloaded buffer is empty');
        }
        
        // Detect actual file type
        const detectedType = detectMediaType(buffer);
        const fileSize = formatFileSize(buffer.length);
        
        // Save temporarily
        const tempFile = path.join(tempDir, `url_${Date.now()}.${detectedType}`);
        fs.writeFileSync(tempFile, buffer);
        
        let url = '';
        let hostingService = '';
        
        // Try Telegraph first (no API key needed)
        try {
          url = await uploadToTelegraph(buffer);
          hostingService = 'Telegraph';
        } catch (telegraphError) {
          console.log('Telegraph upload failed, using temp file instead');
          // If Telegraph fails, we can use a local server or other service
          // For now, we'll just use the temp file path
          url = `file://${tempFile}`;
          hostingService = 'Local (temporary)';
        }
        
        // Generate QR code URL (optional)
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(url)}`;
        
        // Create response message
        const response = `╔══════════════════════╗
║  🔗 *DIRECT URL*  🔗   ║
╚══════════════════════╝

📁 *File Info:*
• Type: ${mediaType} (${detectedType})
• Size: ${fileSize}
• Name: ${fileName}

🌐 *Hosting:* ${hostingService}

━━━━━━━━━━━━━━━━━━━
🔗 *URL:* 
${url}

━━━━━━━━━━━━━━━━━━━
📌 *Quick Actions:*
• Copy: Select and copy the URL
• Share: Send this link to anyone
• Download: Open in browser

📱 *QR Code:* 
${qrUrl}

⚠️ *Note:* ${hostingService === 'Telegraph' ? 'Links expire after ~30 days' : 'This is a temporary local link'}

> *ᴘᴏᴡᴇʀᴇᴅ ʙʏ 𝑂𝑃𝑇𝐼𝑀𝑈𝑆 𝑃𝑅𝐼𝑀𝐸*`;

        // Send the URL
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
        });
        
        // Also try to send QR code as image
        try {
          const qrResponse = await axios.get(qrUrl, { responseType: 'arraybuffer' });
          await sock.sendMessage(chatId, {
            image: Buffer.from(qrResponse.data),
            caption: '📱 *QR Code*\nScan to access the link directly',
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
        } catch (qrError) {
          // Ignore QR errors
        }
        
        // Delete processing message
        await sock.sendMessage(chatId, { delete: processingMsg.key });
        
        // Clean up temp file after 5 minutes
        setTimeout(() => {
          try {
            if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
          } catch (e) {
            // Ignore cleanup errors
          }
        }, 5 * 60 * 1000);
        
      } catch (downloadError) {
        console.error('Download/Upload error:', downloadError);
        await sock.sendMessage(chatId, { delete: processingMsg.key });
        await sock.sendMessage(chatId, {
          text: `❌ *Failed to generate URL:*\n${downloadError.message}`,
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
      console.error('URL Command Error:', error);
      await extra.reply(`❌ *Error:* ${error.message}`);
    }
  }
};