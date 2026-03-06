/**
 * URL Command - Get direct URL of images and media
 * UPDATED VERSION - Uses Catbox.moe for hosting
 */

const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const FormData = require('form-data');

// Temporary storage for uploaded files
const tempDir = path.join(__dirname, '../temp');
if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

// Upload to Catbox.moe (matches screenshot)
const uploadToCatbox = async (buffer, filename) => {
  try {
    const form = new FormData();
    form.append('fileToUpload', buffer, { filename: filename });
    form.append('reqtype', 'fileupload');
    form.append('userhash', '');
    
    const response = await axios.post('https://catbox.moe/user/api.php', form, {
      headers: {
        ...form.getHeaders(),
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    if (response.data && response.data.startsWith('https://')) {
      return response.data.trim();
    }
    throw new Error('Invalid response from Catbox');
  } catch (error) {
    console.error('Catbox upload error:', error);
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

⚡ *Powered by Catbox.moe*

> *ᴘᴏᴡᴇʀᴇᴅ ʙʏ 𝑂𝑃𝑇𝐼𝑀𝑈𝑆 𝑃𝑅𝐼𝑀𝐸*`);
      }
      
      // Determine media type
      let mediaMessage = null;
      let mediaType = null;
      let fileName = 'file';
      
      if (quotedMessage.imageMessage) {
        mediaMessage = quotedMessage.imageMessage;
        mediaType = 'image';
        fileName = 'image.jpg';
      } else if (quotedMessage.videoMessage) {
        mediaMessage = quotedMessage.videoMessage;
        mediaType = 'video';
        fileName = 'video.mp4';
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
      } else {
        return extra.reply('❌ *Unsupported media type!*\n\nPlease reply to an image, video, audio, or document.');
      }
      
      // Send processing message
      await sock.sendMessage(chatId, {
        text: '⏳ *Uploading to Catbox.moe...*'
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
        
        // Generate filename with timestamp
        const timestamp = Date.now();
        const finalFileName = `${timestamp}.${detectedType}`;
        
        // Save temporarily (optional, for backup)
        const tempFile = path.join(tempDir, finalFileName);
        fs.writeFileSync(tempFile, buffer);
        
        // Upload to Catbox.moe
        const url = await uploadToCatbox(buffer, finalFileName);
        
        // Send ONLY the URL as plain text (matches screenshot)
        await sock.sendMessage(chatId, {
          text: url
        });
        
        // Also send a simple success message with file info (optional)
        await sock.sendMessage(chatId, {
          text: `✅ *Uploaded successfully:*\n📁 Size: ${fileSize}\n📌 Type: ${mediaType}`
        });
        
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
        await sock.sendMessage(chatId, {
          text: `❌ *Upload failed:* ${downloadError.message}`
        });
      }
      
    } catch (error) {
      console.error('URL Command Error:', error);
      await extra.reply(`❌ *Error:* ${error.message}`);
    }
  }
};