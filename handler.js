/**
 * Message Handler - Processes incoming messages and executes commands
 */

const config = require('./config');
const database = require('./database');
const { loadCommands } = require('./utils/commandLoader');
const { addMessage } = require('./utils/groupstats');
const { jidDecode, jidEncode } = require('@whiskeysockets/baileys');
const fs = require('fs');
const path = require('path');

// Import handlers from command files
const { handleAntiTag } = require('./commands/antitag');
const { handleAntiLink } = require('./commands/antilink');
const { handleAutoReact } = require('./commands/autoreact'); // Imported from commands folder
const { handleAntiSticker } = require('./commands/antisticker');

// Group metadata cache to prevent rate limiting
const groupMetadataCache = new Map();
const CACHE_TTL = 60000; // 1 minute cache

// Store autoreact settings per chat
const autoReactSettings = new Map();

// Load all commands
const commands = loadCommands();

// Unwrap WhatsApp containers (ephemeral, view once, etc.)
const getMessageContent = (msg) => {
  if (!msg || !msg.message) return null;
  
  let m = msg.message;
  
  if (m.ephemeralMessage) m = m.ephemeralMessage.message;
  if (m.viewOnceMessageV2) m = m.viewOnceMessageV2.message;
  if (m.viewOnceMessage) m = m.viewOnceMessage.message;
  if (m.documentWithCaptionMessage) m = m.documentWithCaptionMessage.message;
  
  return m;
};

// Cached group metadata getter
const getGroupMetadata = async (sock, groupId) => {
  try {
    if (!groupId || !groupId.endsWith('@g.us')) return null;
    
    const cached = groupMetadataCache.get(groupId);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.data;
    }
    
    const metadata = await sock.groupMetadata(groupId);
    
    groupMetadataCache.set(groupId, {
      data: metadata,
      timestamp: Date.now()
    });
    
    return metadata;
  } catch (error) {
    const cached = groupMetadataCache.get(groupId);
    return cached ? cached.data : null;
  }
};

// Helper functions
const isOwner = (sender) => {
  if (!sender) return false;
  
  const normalizedSender = normalizeJidWithLid(sender);
  const senderNumber = normalizeJid(normalizedSender);
  
  return config.ownerNumber.some(owner => {
    const normalizedOwner = normalizeJidWithLid(owner.includes('@') ? owner : `${owner}@s.whatsapp.net`);
    const ownerNumber = normalizeJid(normalizedOwner);
    return ownerNumber === senderNumber;
  });
};

const isMod = (sender) => {
  const number = sender.split('@')[0];
  return database.isModerator ? database.isModerator(number) : false;
};

// LID mapping cache
const lidMappingCache = new Map();

const normalizeJid = (jid) => {
  if (!jid) return null;
  if (typeof jid !== 'string') return null;
  
  if (jid.includes(':')) return jid.split(':')[0];
  if (jid.includes('@')) return jid.split('@')[0];
  return jid;
};

const getLidMappingValue = (user, direction) => {
  if (!user) return null;
  
  const cacheKey = `${direction}:${user}`;
  if (lidMappingCache.has(cacheKey)) return lidMappingCache.get(cacheKey);
  
  const sessionPath = path.join(__dirname, config.sessionName || 'session');
  const suffix = direction === 'pnToLid' ? '.json' : '_reverse.json';
  const filePath = path.join(sessionPath, `lid-mapping-${user}${suffix}`);
  
  if (!fs.existsSync(filePath)) {
    lidMappingCache.set(cacheKey, null);
    return null;
  }
  
  try {
    const raw = fs.readFileSync(filePath, 'utf8').trim();
    const value = raw ? JSON.parse(raw) : null;
    lidMappingCache.set(cacheKey, value || null);
    return value || null;
  } catch (error) {
    lidMappingCache.set(cacheKey, null);
    return null;
  }
};

const normalizeJidWithLid = (jid) => {
  if (!jid) return jid;
  
  try {
    const decoded = jidDecode(jid);
    if (!decoded?.user) {
      return `${jid.split(':')[0].split('@')[0]}@s.whatsapp.net`;
    }
    
    let user = decoded.user;
    let server = decoded.server === 'c.us' ? 's.whatsapp.net' : decoded.server;
    
    if (server === 'lid' || server === 'hosted.lid') {
      const pnUser = getLidMappingValue(user, 'lidToPn');
      if (pnUser) {
        user = pnUser;
        server = server === 'hosted.lid' ? 'hosted' : 's.whatsapp.net';
      }
    }
    
    if (server === 'hosted') return jidEncode(user, 'hosted');
    return jidEncode(user, 's.whatsapp.net');
  } catch (error) {
    return jid;
  }
};

const isAdmin = async (sock, participant, groupId, groupMetadata = null) => {
  if (!participant || !groupId || !groupId.endsWith('@g.us')) return false;
  
  let metadata = groupMetadata;
  if (!metadata || !metadata.participants) {
    metadata = await getGroupMetadata(sock, groupId);
  }
  
  if (!metadata || !metadata.participants) return false;
  
  const participantNorm = normalizeJidWithLid(participant);
  const participantNum = normalizeJid(participantNorm);
  
  const found = metadata.participants.find(p => {
    const pNorm = normalizeJidWithLid(p.id);
    const pNum = normalizeJid(pNorm);
    return pNum === participantNum;
  });
  
  return found ? (found.admin === 'admin' || found.admin === 'superadmin') : false;
};

const isBotAdmin = async (sock, groupId, groupMetadata = null) => {
  if (!sock.user || !groupId || !groupId.endsWith('@g.us')) return false;
  
  try {
    const botId = sock.user.id;
    const botNorm = normalizeJidWithLid(botId);
    const botNum = normalizeJid(botNorm);
    
    let metadata = groupMetadata;
    if (!metadata || !metadata.participants) {
      metadata = await getGroupMetadata(sock, groupId);
    }
    
    if (!metadata || !metadata.participants) return false;
    
    const found = metadata.participants.find(p => {
      const pNorm = normalizeJidWithLid(p.id);
      const pNum = normalizeJid(pNorm);
      return pNum === botNum;
    });
    
    return found ? (found.admin === 'admin' || found.admin === 'superadmin') : false;
  } catch (error) {
    return false;
  }
};

const isSystemJid = (jid) => {
  if (!jid) return true;
  return jid.includes('@broadcast') || 
         jid.includes('status.broadcast') || 
         jid.includes('@newsletter') ||
         jid.includes('@newsletter.');
};

// ==================== WELCOME HANDLER ====================
async function handleWelcome(sock, update) {
    try {
        const { id: groupId, participants, action } = update;
        
        if (action !== 'add') return;
        
        // Load welcome settings
        const welcomePath = path.join(__dirname, 'database/welcome.json');
        if (!fs.existsSync(welcomePath)) return;
        
        const welcomeData = JSON.parse(fs.readFileSync(welcomePath, 'utf8'));
        const settings = welcomeData[groupId];
        
        if (!settings || !settings.enabled) return;
        
        // Get group metadata
        const groupMetadata = await getGroupMetadata(sock, groupId);
        if (!groupMetadata) return;
        
        for (const participant of participants) {
            const participantJid = typeof participant === 'string' ? participant : participant.id;
            
            // Get user info
            const userNumber = participantJid.split('@')[0];
            
            // Format welcome message
            let message = settings.message
                .replace(/@user/g, `@${userNumber}`)
                .replace(/@group/g, groupMetadata.subject || 'Group')
                .replace(/@count/g, groupMetadata.participants?.length || 0)
                .replace(/@time/g, new Date().toLocaleTimeString())
                .replace(/@date/g, new Date().toLocaleDateString());
            
            if (settings.showRules && settings.rules) {
                message += `\n\n📋 *Group Rules:*\n${settings.rules}`;
            }
            
            // Send welcome message
            const mentions = [participantJid];
            if (settings.mentionAdmins) {
                const admins = groupMetadata.participants
                    .filter(p => p.admin)
                    .map(p => p.id);
                mentions.push(...admins);
            }
            
            if (settings.image) {
                // Send with image
                await sock.sendMessage(groupId, {
                    image: Buffer.from(settings.image, 'base64'),
                    caption: message,
                    mentions: settings.mentionUser ? mentions : []
                });
            } else {
                // Send text only
                await sock.sendMessage(groupId, {
                    text: message,
                    mentions: settings.mentionUser ? mentions : []
                });
            }
            
            // Update stats
            settings.stats.welcomed++;
            settings.stats.lastWelcome = Date.now();
            welcomeData[groupId] = settings;
            fs.writeFileSync(welcomePath, JSON.stringify(welcomeData, null, 2));
        }
    } catch (error) {
        console.error('Welcome handler error:', error);
    }
}

// ==================== GOODBYE HANDLER ====================
async function handleGoodbye(sock, update) {
    try {
        const { id: groupId, participants, action } = update;
        
        if (action !== 'remove') return;
        
        // Load goodbye settings
        const goodbyePath = path.join(__dirname, 'database/goodbye.json');
        if (!fs.existsSync(goodbyePath)) return;
        
        const goodbyeData = JSON.parse(fs.readFileSync(goodbyePath, 'utf8'));
        const settings = goodbyeData[groupId];
        
        if (!settings || !settings.enabled) return;
        
        // Get group metadata
        const groupMetadata = await getGroupMetadata(sock, groupId);
        if (!groupMetadata) return;
        
        for (const participant of participants) {
            const participantJid = typeof participant === 'string' ? participant : participant.id;
            
            // Get user info
            const userNumber = participantJid.split('@')[0];
            
            // Format goodbye message
            let message = settings.message
                .replace(/@user/g, `@${userNumber}`)
                .replace(/@group/g, groupMetadata.subject || 'Group')
                .replace(/@count/g, groupMetadata.participants?.length || 0)
                .replace(/@time/g, new Date().toLocaleTimeString())
                .replace(/@date/g, new Date().toLocaleDateString())
                .replace(/@joined/g, 'Unknown'); // Would need join date tracking
            
            // Send goodbye message
            const mentions = settings.mentionUser ? [participantJid] : [];
            
            if (settings.image) {
                await sock.sendMessage(groupId, {
                    image: Buffer.from(settings.image, 'base64'),
                    caption: message,
                    mentions
                });
            } else {
                await sock.sendMessage(groupId, {
                    text: message,
                    mentions
                });
            }
            
            // Update stats
            settings.stats.farewells++;
            settings.stats.lastGoodbye = Date.now();
            goodbyeData[groupId] = settings;
            fs.writeFileSync(goodbyePath, JSON.stringify(goodbyeData, null, 2));
        }
    } catch (error) {
        console.error('Goodbye handler error:', error);
    }
}

// Main message handler
const handleMessage = async (sock, msg) => {
  try {
    if (!msg.message) return;
    
    const from = msg.key.remoteJid;
    
    if (isSystemJid(from)) return;
    
    // Handle autoreact - using imported function
    await handleAutoReact(sock, msg);
    
    const content = getMessageContent(msg);
    
    let actualMessageTypes = [];
    if (content) {
      const allKeys = Object.keys(content);
      const protocolMessages = ['protocolMessage', 'senderKeyDistributionMessage', 'messageContextInfo'];
      actualMessageTypes = allKeys.filter(key => !protocolMessages.includes(key));
    }
    
    const sender = msg.key.fromMe ? sock.user.id.split(':')[0] + '@s.whatsapp.net' : msg.key.participant || msg.key.remoteJid;
    const isGroup = from.endsWith('@g.us');
    
    const groupMetadata = isGroup ? await getGroupMetadata(sock, from) : null;
    
    if (isGroup) {
      addMessage(from, sender);
    }
    
    if (!content || actualMessageTypes.length === 0) return;
    
    // Handle anti-sticker (before command processing)
    if (isGroup) {
      await handleAntiSticker(sock, msg, {
        from,
        sender,
        isGroup,
        groupMetadata,
        isAdmin: await isAdmin(sock, sender, from, groupMetadata),
        isOwner: isOwner(sender),
        isBotAdmin: await isBotAdmin(sock, from, groupMetadata)
      });
    }

    // ===== ANTI-LINK HANDLER =====
    if (isGroup) {
      try {
        await handleAntiLink(sock, msg, {
          from,
          sender,
          isGroup,
          groupMetadata,
          isAdmin: await isAdmin(sock, sender, from, groupMetadata),
          isOwner: isOwner(sender),
          isBotAdmin: await isBotAdmin(sock, from, groupMetadata)
        });
      } catch (alError) {
        console.error('AntiLink error:', alError);
      }
    }
    
    // ===== ANTI-TAG HANDLER =====
    if (isGroup) {
      try {
        await handleAntiTag(sock, msg, {
          from,
          sender,
          isGroup,
          groupMetadata,
          isAdmin: await isAdmin(sock, sender, from, groupMetadata),
          isOwner: isOwner(sender),
          isBotAdmin: await isBotAdmin(sock, from, groupMetadata)
        });
      } catch (atError) {
        console.error('AntiTag error:', atError);
      }
    } 
    
    // Button response handler
    const btn = content.buttonsResponseMessage || msg.message?.buttonsResponseMessage;
    if (btn) {
      const buttonId = btn.selectedButtonId;
      const displayText = btn.selectedDisplayText;
      
      console.log(`🔘 Button clicked: ${buttonId} - ${displayText}`);
      
      // Handle special button prefixes
      if (buttonId.startsWith('cmd_')) {
        const cmdName = buttonId.replace('cmd_', '');
        const command = commands.get(cmdName);
        
        if (command) {
          await command.execute(sock, msg, [], {
            from,
            sender,
            isGroup,
            groupMetadata,
            isOwner: isOwner(sender),
            isAdmin: await isAdmin(sock, sender, from, groupMetadata),
            isBotAdmin: await isBotAdmin(sock, from, groupMetadata),
            isMod: isMod(sender),
            reply: (text) => sock.sendMessage(from, { text }, { quoted: msg }),
            react: (emoji) => sock.sendMessage(from, { react: { text: emoji, key: msg.key } })
          });
        }
        return;
      }
      else if (buttonId.startsWith('page_')) {
        const page = parseInt(buttonId.replace('page_', '')) || 0;
        const menuCmd = commands.get('menu');
        if (menuCmd) {
          await menuCmd.execute(sock, msg, [page.toString()], {
            from,
            sender,
            isGroup,
            groupMetadata,
            isOwner: isOwner(sender),
            isAdmin: await isAdmin(sock, sender, from, groupMetadata),
            isBotAdmin: await isBotAdmin(sock, from, groupMetadata),
            isMod: isMod(sender),
            reply: (text) => sock.sendMessage(from, { text }, { quoted: msg }),
            react: (emoji) => sock.sendMessage(from, { react: { text: emoji, key: msg.key } })
          });
        }
        return;
      }
      else if (buttonId === 'back_to_menu') {
        const menuCmd = commands.get('menu');
        if (menuCmd) {
          await menuCmd.execute(sock, msg, ['0'], {
            from,
            sender,
            isGroup,
            groupMetadata,
            isOwner: isOwner(sender),
            isAdmin: await isAdmin(sock, sender, from, groupMetadata),
            isBotAdmin: await isBotAdmin(sock, from, groupMetadata),
            isMod: isMod(sender),
            reply: (text) => sock.sendMessage(from, { text }, { quoted: msg }),
            react: (emoji) => sock.sendMessage(from, { react: { text: emoji, key: msg.key } })
          });
        }
        return;
      }
      
      return;
    }
    
    // Get message body
    let body = '';
    if (content.conversation) {
      body = content.conversation;
    } else if (content.extendedTextMessage) {
      body = content.extendedTextMessage.text || '';
    } else if (content.imageMessage) {
      body = content.imageMessage.caption || '';
    } else if (content.videoMessage) {
      body = content.videoMessage.caption || '';
    }
    
    body = (body || '').trim();
    
    // Check if message starts with prefix
    if (!body.startsWith(config.prefix)) return;
    
    // Parse command
    const args = body.slice(config.prefix.length).trim().split(/\s+/);
    const commandName = args.shift().toLowerCase();
    
    const command = commands.get(commandName);
    if (!command) return;
    
    // Permission checks
    if (config.selfMode && !isOwner(sender)) return;
    
    if (command.ownerOnly && !isOwner(sender)) {
      return sock.sendMessage(from, { text: config.messages.ownerOnly }, { quoted: msg });
    }
    
    if (command.modOnly && !isMod(sender) && !isOwner(sender)) {
      return sock.sendMessage(from, { text: '🔒 This command is only for moderators!' }, { quoted: msg });
    }
    
    if (command.groupOnly && !isGroup) {
      return sock.sendMessage(from, { text: config.messages.groupOnly }, { quoted: msg });
    }
    
    if (command.privateOnly && isGroup) {
      return sock.sendMessage(from, { text: config.messages.privateOnly }, { quoted: msg });
    }
    
    if (command.adminOnly && !(await isAdmin(sock, sender, from, groupMetadata)) && !isOwner(sender)) {
      return sock.sendMessage(from, { text: config.messages.adminOnly }, { quoted: msg });
    }
    
    if (command.botAdminNeeded) {
      const botIsAdmin = await isBotAdmin(sock, from, groupMetadata);
      if (!botIsAdmin) {
        return sock.sendMessage(from, { text: config.messages.botAdminNeeded }, { quoted: msg });
      }
    }
    
    if (config.autoTyping) {
      await sock.sendPresenceUpdate('composing', from);
    }
    
    console.log(`Executing command: ${commandName} from ${sender}`);
    
    await command.execute(sock, msg, args, {
      from,
      sender,
      isGroup,
      groupMetadata,
      isOwner: isOwner(sender),
      isAdmin: await isAdmin(sock, sender, from, groupMetadata),
      isBotAdmin: await isBotAdmin(sock, from, groupMetadata),
      isMod: isMod(sender),
      reply: (text) => sock.sendMessage(from, { text }, { quoted: msg }),
      react: (emoji) => sock.sendMessage(from, { react: { text: emoji, key: msg.key } })
    });
    
  } catch (error) {
    console.error('Error in message handler:', error);
    
    if (error.message && error.message.includes('rate-overlimit')) {
      console.warn('⚠️ Rate limit reached. Skipping error message.');
      return;
    }
    
    try {
      await sock.sendMessage(msg.key.remoteJid, { 
        text: `${config.messages.error}\n\n${error.message}` 
      }, { quoted: msg });
    } catch (e) {
      if (!e.message || !e.message.includes('rate-overlimit')) {
        console.error('Error sending error message:', e);
      }
    }
  }
};

// Group participant update handler (with welcome/goodbye)
const handleGroupUpdate = async (sock, update) => {
  try {
    const { id, participants, action } = update;
    
    if (!id || !id.endsWith('@g.us')) return;
    
    // Handle welcome messages
    await handleWelcome(sock, update);
    
    // Handle goodbye messages
    await handleGoodbye(sock, update);
    
    // Original group settings (keep for backward compatibility)
    const groupSettings = database.getGroupSettings(id);
    if (!groupSettings.welcome && !groupSettings.goodbye) return;
    
    const groupMetadata = await getGroupMetadata(sock, id);
    if (!groupMetadata) return;
    
    for (const participant of participants) {
      const participantJid = typeof participant === 'string' ? participant : participant.id;
      if (!participantJid) continue;
      
      const participantNumber = participantJid.split('@')[0];
      
      if (action === 'add' && groupSettings.welcome) {
        let message = groupSettings.welcomeMessage || 'Welcome @user to @group! 👋';
        message = message.replace('@user', `@${participantNumber}`);
        message = message.replace('@group', groupMetadata.subject || 'the group');
        
        await sock.sendMessage(id, { 
          text: message, 
          mentions: [participantJid] 
        });
      } else if (action === 'remove' && groupSettings.goodbye) {
        const goodbyeMsg = groupSettings.goodbyeMessage || 'Goodbye @user 👋';
        const message = goodbyeMsg.replace('@user', `@${participantNumber}`);
        
        await sock.sendMessage(id, { 
          text: message, 
          mentions: [participantJid] 
        });
      }
    }
  } catch (error) {
    console.error('Error handling group update:', error);
  }
};

// Anti-call feature
const initializeAntiCall = (sock) => {
  sock.ev.on('call', async (calls) => {
    try {
      delete require.cache[require.resolve('./config')];
      const config = require('./config');
      
      if (!config.defaultGroupSettings.anticall) return;

      for (const call of calls) {
        if (call.status === 'offer') {
          await sock.rejectCall(call.id, call.from);
          await sock.updateBlockStatus(call.from, 'block');
          await sock.sendMessage(call.from, {
            text: '🚫 Calls are not allowed. You have been blocked.'
          });
        }
      }
    } catch (err) {
      console.error('[ANTICALL ERROR]', err);
    }
  });
};

module.exports = {
  handleMessage,
  handleGroupUpdate,
  initializeAntiCall,
  isOwner,
  isAdmin,
  isBotAdmin,
  isMod,
  getGroupMetadata,
  autoReactSettings
};