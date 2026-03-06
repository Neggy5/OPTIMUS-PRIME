/**
 * Llama AI Command - Chat with Llama AI
 */

const axios = require('axios');
const config = require('../config');

// Debug mode
const DEBUG_MODE = true;

// Store processed message IDs to prevent duplicates
const processedMessages = new Set();

// Rate limiting store
const userCooldowns = new Map();

// Session store for conversations
const userSessions = new Map();

// Helper function for debug logging
function debugLog(...args) {
  if (DEBUG_MODE) {
    console.log('[Llama-DEBUG]:', ...args);
  }
}

module.exports = {
  name: 'llama',
  aliases: ['ai', 'ask', 'chat'],
  category: 'ai',
  description: 'Chat with Llama AI',
  usage: '<your question>',
  
  async execute(sock, msg, args, extra) {
    try {
      const userId = msg.key.participant || msg.key.remoteJid;
      const currentTime = Date.now();
      const chatId = msg.key.remoteJid;
      
      debugLog('Command executed by:', userId);
      
      // Check rate limiting for the user (5 seconds between questions)
      if (userCooldowns.has(userId)) {
        const cooldownExpiry = userCooldowns.get(userId);
        const timeLeft = Math.ceil((cooldownExpiry - currentTime) / 1000);
        
        if (timeLeft > 0) {
          debugLog('User on cooldown:', timeLeft, 'seconds left');
          
          const cooldownMsg = await sock.sendMessage(chatId, {
            text: `*𝑂𝑃𝑇𝐼𝑀𝑈𝑆 𝑃𝑅𝐼𝑀𝐸 Llama AI 🙂‍↕️*\n*PLEASE WAIT ${timeLeft} SECONDS BEFORE ASKING ANOTHER QUESTION*`
          }, { quoted: msg });
          
          // Update timer
          const interval = setInterval(async () => {
            const newTimeLeft = Math.ceil((cooldownExpiry - Date.now()) / 1000);
            
            if (newTimeLeft <= 0) {
              clearInterval(interval);
              try {
                await sock.sendMessage(chatId, {
                  delete: cooldownMsg.key
                });
              } catch (e) {
                debugLog('Error deleting cooldown message:', e.message);
              }
            } else {
              try {
                await sock.sendMessage(chatId, {
                  text: `*𝑂𝑃𝑇𝐼𝑀𝑈𝑆 𝑃𝑅𝐼𝑀𝐸 LLAMA AI*\n*PLEASE WAIT ${newTimeLeft} SECONDS BEFORE ASKING ANOTHER QUESTION*`,
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
      
      // Check for duplicate messages
      if (processedMessages.has(msg.key.id)) {
        debugLog('Duplicate message detected:', msg.key.id);
        return;
      }
      
      processedMessages.add(msg.key.id);
      setTimeout(() => {
        processedMessages.delete(msg.key.id);
      }, 5 * 60 * 1000);
      
      // Get question from args or quoted message
      let question = args.join(' ').trim();
      let questionSource = 'command';
      
      // Check if replying to a message
      const isReply = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage ? true : false;
      
      if (isReply && !question) {
        // Get quoted message text
        const quotedMsg = msg.message.extendedTextMessage.contextInfo.quotedMessage;
        
        if (quotedMsg.conversation) {
          question = quotedMsg.conversation;
          questionSource = 'reply';
        } else if (quotedMsg.extendedTextMessage?.text) {
          question = quotedMsg.extendedTextMessage.text;
          questionSource = 'reply';
        }
      }
      
      if (!question) {
        return await sock.sendMessage(chatId, {
          text: `❌ *Please ask a question*\n\n` +
                `*Ways to use:*\n` +
                `1️⃣ Type: ${config.prefix}llama <your question>\n` +
                `2️⃣ Type: ${config.prefix}ask <your question>\n` +
                `3️⃣ Reply to any message with ${config.prefix}llama\n\n` +
                `*Example:*\n` +
                `${config.prefix}llama What is the capital of France?`
        }, { quoted: msg });
      }
      
      // Send processing reaction
      await sock.sendMessage(chatId, {
        react: { text: '🤔', key: msg.key }
      });
      
      // Send "thinking" message
      const thinkingMsg = await sock.sendMessage(chatId, {
        text: '🧠 *Llama AI is thinking...*'
      }, { quoted: msg });
      
      try {
        // Clean and encode the question
        const cleanQuestion = question.trim();
        debugLog('Question:', cleanQuestion);
        
        // Get or create session ID
        let sessionId = userSessions.get(userId);
        
        // Call the API
        const apiUrl = `https://arcane-nx-cipher-pol.hf.space/api/ai/llama?q=${encodeURIComponent(cleanQuestion)}`;
        debugLog('API URL:', apiUrl);
        
        const response = await axios.get(apiUrl, {
          timeout: 30000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'application/json'
          }
        });
        
        debugLog('API Response received');
        
        const data = response.data;
        
        if (!data || !data.success) {
          debugLog('Invalid API response:', data);
          throw new Error('Invalid API response');
        }
        
        const answer = data.result;
        const newSessionId = data.session_id;
        
        // Store session ID for continuity
        if (newSessionId) {
          userSessions.set(userId, newSessionId);
          debugLog('Session ID:', newSessionId);
        }
        
        if (!answer) {
          throw new Error('No answer received');
        }
        
        debugLog('Answer:', answer);
        
        // Delete thinking message
        await sock.sendMessage(chatId, {
          delete: thinkingMsg.key
        });
        
        // Format response with question and answer
        const trademark = '🏹𝑂𝑃𝑇𝐼𝑀𝑈𝑆 𝑃𝑅𝐼𝑀𝐸';
        
        const responseText = `🧠 *Llama AI*\n\n` +
                            `❓ *Q:* ${cleanQuestion}\n\n` +
                            `💬 *A:* ${answer}\n\n` +
                            `${trademark}`;
        
        // Send answer
        await sock.sendMessage(chatId, {
          text: responseText
        }, { quoted: msg });
        
        debugLog('Answer sent successfully');
        
        // Set cooldown (5 seconds)
        userCooldowns.set(userId, currentTime + 5000);
        
        setTimeout(() => {
          userCooldowns.delete(userId);
        }, 5000);
        
        // Update reaction to ✅
        setTimeout(async () => {
          try {
            await sock.sendMessage(chatId, {
              react: { text: '✅', key: msg.key }
            });
          } catch (e) {}
        }, 500);
        
      } catch (error) {
        debugLog('Error:', error.message);
        
        // Delete thinking message
        try {
          await sock.sendMessage(chatId, {
            delete: thinkingMsg.key
          });
        } catch (e) {}
        
        // Update reaction to ❌
        await sock.sendMessage(chatId, {
          react: { text: '❌', key: msg.key }
        });
        
        await sock.sendMessage(chatId, {
          text: '❌ *Failed to get response from Llama AI*\nPlease try again later.'
        }, { quoted: msg });
      }
      
    } catch (error) {
      debugLog('Fatal error:', error.message);
      
      await sock.sendMessage(msg.key.remoteJid, {
        text: '❌ An error occurred while processing your request.'
      }, { quoted: msg });
    }
  }
};