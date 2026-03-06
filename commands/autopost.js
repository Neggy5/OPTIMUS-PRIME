/**
 * AutoPost Command - Automatically post to WhatsApp channels
 */

const fs = require('fs');
const path = require('path');
const cron = require('node-cron');
const axios = require('axios');

// Database path
const DB_PATH = path.join(__dirname, '../database/autopost.json');

// Default settings
const defaultSettings = {
  enabled: false,
  channels: [], // Array of channel JIDs
  posts: [], // Array of scheduled posts
  defaultInterval: 60, // minutes
  randomOrder: true,
  includeNewsletter: true,
  newsletterJid: '120363405724402785@newsletter',
  newsletterName: '𝑂𝑃𝑇𝐼𝑀𝑈𝑆 𝑃𝑅𝐼𝑀𝐸',
  stats: {
    totalPosts: 0,
    successfulPosts: 0,
    failedPosts: 0,
    lastPost: null
  }
};

// Load settings
const loadSettings = () => {
  try {
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    if (fs.existsSync(DB_PATH)) {
      const data = fs.readFileSync(DB_PATH, 'utf8');
      return { ...defaultSettings, ...JSON.parse(data) };
    } else {
      fs.writeFileSync(DB_PATH, JSON.stringify(defaultSettings, null, 2));
    }
  } catch (error) {
    console.error('Error loading autopost settings:', error);
  }
  return { ...defaultSettings };
};

// Save settings
const saveSettings = (settings) => {
  try {
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(DB_PATH, JSON.stringify(settings, null, 2));
    return true;
  } catch (error) {
    console.error('Error saving autopost settings:', error);
    return false;
  }
};

// Store active timers
const activeTimers = new Map();

// Post types
const postTypes = {
  text: 'text',
  image: 'image',
  video: 'video',
  audio: 'audio',
  poll: 'poll'
};

// Sample posts library
const samplePosts = [
  {
    type: 'text',
    content: '🌟 Good morning! Hope you have a wonderful day ahead!',
    interval: 1440 // daily
  },
  {
    type: 'text',
    content: '💡 Did you know? WhatsApp channels can reach unlimited subscribers!',
    interval: 480 // 8 hours
  },
  {
    type: 'text',
    content: '🤖 Powered by 𝑂𝑃𝑇𝐼𝑀𝑈𝑆 𝑃𝑅𝐼𝑀𝐸 - The best WhatsApp bot!',
    interval: 720 // 12 hours
  },
  {
    type: 'text',
    content: '📢 Stay tuned for more updates and features!',
    interval: 1440 // daily
  },
  {
    type: 'text',
    content: '🔥 New features coming soon! Follow for updates.',
    interval: 1440 // daily
  },
  {
    type: 'poll',
    content: {
      question: 'What type of content do you prefer?',
      options: ['Text updates', 'Images', 'Videos', 'Polls'],
      multiple: false
    },
    interval: 10080 // weekly
  }
];

// Schedule a post
const schedulePost = (sock, post, channelJid, settings) => {
  if (!post.enabled) return;
  
  const interval = post.interval || settings.defaultInterval;
  const timerId = setInterval(async () => {
    try {
      await executePost(sock, post, channelJid, settings);
      
      // Update stats
      settings.stats.totalPosts++;
      settings.stats.successfulPosts++;
      settings.stats.lastPost = Date.now();
      saveSettings(settings);
      
    } catch (error) {
      console.error('AutoPost execution error:', error);
      settings.stats.failedPosts++;
      saveSettings(settings);
    }
  }, interval * 60 * 1000);
  
  activeTimers.set(`${channelJid}_${post.id}`, timerId);
};

// Execute a single post
const executePost = async (sock, post, channelJid, settings) => {
  try {
    const contextInfo = {
      forwardingScore: 999,
      isForwarded: true
    };
    
    if (settings.includeNewsletter) {
      contextInfo.forwardedNewsletterMessageInfo = {
        newsletterJid: settings.newsletterJid,
        newsletterName: settings.newsletterName,
        serverMessageId: -1
      };
    }
    
    switch (post.type) {
      case 'text':
        await sock.sendMessage(channelJid, {
          text: post.content,
          contextInfo
        });
        break;
        
      case 'image':
        if (post.imageUrl) {
          const response = await axios.get(post.imageUrl, { responseType: 'arraybuffer' });
          await sock.sendMessage(channelJid, {
            image: Buffer.from(response.data),
            caption: post.caption || '',
            contextInfo
          });
        }
        break;
        
      case 'poll':
        // Note: Polls in channels might have different structure
        await sock.sendMessage(channelJid, {
          text: `📊 *${post.content.question}*\n\n${post.content.options.map((opt, i) => `${i+1}. ${opt}`).join('\n')}`,
          contextInfo
        });
        break;
        
      default:
        console.log(`Unsupported post type: ${post.type}`);
    }
    
    console.log(`[AutoPost] Posted to channel ${channelJid}`);
    
  } catch (error) {
    console.error(`[AutoPost] Failed to post to ${channelJid}:`, error);
    throw error;
  }
};

// Initialize all scheduled posts
const initializeAutoPost = (sock) => {
  try {
    // Clear existing timers
    activeTimers.forEach(timer => clearInterval(timer));
    activeTimers.clear();
    
    const settings = loadSettings();
    
    if (!settings.enabled) return;
    
    // Schedule posts for each channel
    settings.channels.forEach(channel => {
      settings.posts.forEach(post => {
        if (post.enabled) {
          schedulePost(sock, post, channel.jid, settings);
        }
      });
    });
    
    console.log(`[AutoPost] Initialized with ${settings.posts.length} posts for ${settings.channels.length} channels`);
    
  } catch (error) {
    console.error('[AutoPost] Initialization error:', error);
  }
};

// Command execute
async function execute(sock, msg, args, extra) {
  try {
    const settings = loadSettings();
    const isEnabled = settings.enabled;
    
    if (!args[0]) {
      const channelCount = settings.channels.length;
      const postCount = settings.posts.length;
      
      return extra.reply(`╔══════════════════════╗
║  📢 *AUTOPOST*  📢    ║
╚══════════════════════╝

📊 *Status:* ${isEnabled ? '✅ Enabled' : '❌ Disabled'}
📌 *Channels:* ${channelCount}
📝 *Posts:* ${postCount}
⏱️ *Default Interval:* ${settings.defaultInterval} min
🔄 *Random Order:* ${settings.randomOrder ? '✅' : '❌'}
📈 *Total Posts:* ${settings.stats.totalPosts}
✅ *Successful:* ${settings.stats.successfulPosts}
❌ *Failed:* ${settings.stats.failedPosts}
⏰ *Last Post:* ${settings.stats.lastPost ? new Date(settings.stats.lastPost).toLocaleString() : 'Never'}

━━━━━━━━━━━━━━━━━━━
📋 *Commands:*
• .ap on - Enable autopost
• .ap off - Disable autopost
• .ap channels - Manage channels
• .ap posts - Manage posts
• .ap add channel <jid> <name>
• .ap remove channel <index>
• .ap add post <type>
• .ap remove post <index>
• .ap interval <minutes>
• .ap test - Test post now
• .ap stats - Show detailed stats
• .ap samples - Load sample posts

━━━━━━━━━━━━━━━━━━━
💡 *Examples:*
• .ap add channel 123456@newsletter My Channel
• .ap add post text "Hello channel!"
• .ap interval 120
• .ap samples

> *ᴘᴏᴡᴇʀᴇᴅ ʙʏ 𝑂𝑃𝑇𝐼𝑀𝑈𝑆 𝑃𝑅𝐼𝑀𝐸*`);
    }
    
    const opt = args[0].toLowerCase();
    
    // Handle on/off
    if (opt === 'on') {
      settings.enabled = true;
      saveSettings(settings);
      
      // Restart scheduler
      initializeAutoPost(sock);
      
      return extra.reply(`✅ *AutoPost enabled!*\n\nPosts will be sent to ${settings.channels.length} channels.`);
    }
    
    if (opt === 'off') {
      settings.enabled = false;
      saveSettings(settings);
      
      // Clear all timers
      activeTimers.forEach(timer => clearInterval(timer));
      activeTimers.clear();
      
      return extra.reply('❌ *AutoPost disabled!*');
    }
    
    // Handle interval
    if (opt === 'interval') {
      const minutes = parseInt(args[1]);
      if (!minutes || minutes < 5 || minutes > 43200) {
        return extra.reply('❌ *Invalid interval!*\n\nPlease provide minutes between 5 and 43200 (30 days).');
      }
      
      settings.defaultInterval = minutes;
      saveSettings(settings);
      
      return extra.reply(`✅ *Default interval set to ${minutes} minutes!*`);
    }
    
    // Handle channels
    if (opt === 'channels') {
      if (!args[1]) {
        if (settings.channels.length === 0) {
          return extra.reply('📭 *No channels configured.*\n\nAdd a channel with: .ap add channel <jid> <name>');
        }
        
        let channelList = '📋 *CONFIGURED CHANNELS*\n\n';
        settings.channels.forEach((ch, i) => {
          channelList += `${i+1}. *${ch.name}*\n   └ JID: ${ch.jid}\n`;
        });
        
        return extra.reply(channelList);
      }
      
      const subCmd = args[1].toLowerCase();
      
      if (subCmd === 'add') {
        const channelJid = args[2];
        const channelName = args.slice(3).join(' ') || 'Unnamed Channel';
        
        if (!channelJid || !channelJid.includes('@newsletter')) {
          return extra.reply('❌ *Invalid channel JID!*\n\nChannel JID should end with @newsletter\nExample: 123456789@newsletter');
        }
        
        settings.channels.push({
          jid: channelJid,
          name: channelName,
          added: Date.now()
        });
        
        saveSettings(settings);
        
        // Restart if enabled
        if (settings.enabled) {
          initializeAutoPost(sock);
        }
        
        return extra.reply(`✅ *Channel added!*\n\n📌 ${channelName}\n📍 ${channelJid}`);
      }
      
      if (subCmd === 'remove') {
        const index = parseInt(args[2]) - 1;
        if (isNaN(index) || index < 0 || index >= settings.channels.length) {
          return extra.reply('❌ *Invalid channel number!*\n\nUse .ap channels to see numbers.');
        }
        
        const removed = settings.channels.splice(index, 1);
        saveSettings(settings);
        
        // Restart if enabled
        if (settings.enabled) {
          initializeAutoPost(sock);
        }
        
        return extra.reply(`✅ *Removed channel: ${removed[0].name}*`);
      }
    }
    
    // Handle posts
    if (opt === 'posts') {
      if (!args[1]) {
        if (settings.posts.length === 0) {
          return extra.reply('📭 *No posts configured.*\n\nAdd posts with: .ap add post <type>\nOr load samples: .ap samples');
        }
        
        let postList = '📋 *SCHEDULED POSTS*\n\n';
        settings.posts.forEach((post, i) => {
          const status = post.enabled ? '✅' : '❌';
          const type = post.type.toUpperCase();
          const content = post.type === 'text' ? post.content.substring(0, 30) : `[${post.type}]`;
          postList += `${status} ${i+1}. *${type}* - ${content}...\n   └ Interval: ${post.interval || settings.defaultInterval} min\n`;
        });
        
        return extra.reply(postList);
      }
      
      const subCmd = args[1].toLowerCase();
      
      if (subCmd === 'add') {
        const type = args[2]?.toLowerCase();
        
        if (!type || !Object.keys(postTypes).includes(type)) {
          return extra.reply(`❌ *Invalid post type!*\n\nAvailable types: ${Object.keys(postTypes).join(', ')}`);
        }
        
        if (type === 'text') {
          const content = args.slice(3).join(' ');
          if (!content) {
            return extra.reply('❌ *Please provide text content!*\n\nExample: .ap add post text "Hello channel!"');
          }
          
          const newPost = {
            id: Date.now().toString(),
            type: 'text',
            content: content,
            interval: settings.defaultInterval,
            enabled: true,
            created: Date.now()
          };
          
          settings.posts.push(newPost);
          saveSettings(settings);
          
          // Restart if enabled
          if (settings.enabled) {
            initializeAutoPost(sock);
          }
          
          return extra.reply(`✅ *Text post added!*\n\n"${content.substring(0, 50)}${content.length > 50 ? '...' : ''}"`);
        }
        
        // Add more post types as needed
        return extra.reply(`❌ *${type} post creation not implemented yet!*`);
      }
      
      if (subCmd === 'remove') {
        const index = parseInt(args[2]) - 1;
        if (isNaN(index) || index < 0 || index >= settings.posts.length) {
          return extra.reply('❌ *Invalid post number!*\n\nUse .ap posts to see numbers.');
        }
        
        const removed = settings.posts.splice(index, 1);
        saveSettings(settings);
        
        // Restart if enabled
        if (settings.enabled) {
          initializeAutoPost(sock);
        }
        
        return extra.reply(`✅ *Removed post ${index+1}!*`);
      }
      
      if (subCmd === 'toggle') {
        const index = parseInt(args[2]) - 1;
        if (isNaN(index) || index < 0 || index >= settings.posts.length) {
          return extra.reply('❌ *Invalid post number!*');
        }
        
        settings.posts[index].enabled = !settings.posts[index].enabled;
        saveSettings(settings);
        
        // Restart if enabled
        if (settings.enabled) {
          initializeAutoPost(sock);
        }
        
        const status = settings.posts[index].enabled ? 'enabled' : 'disabled';
        return extra.reply(`✅ *Post ${index+1} ${status}!*`);
      }
    }
    
    // Handle samples
    if (opt === 'samples') {
      settings.posts = samplePosts.map((post, i) => ({
        ...post,
        id: Date.now() + i,
        interval: post.interval || settings.defaultInterval,
        enabled: true,
        created: Date.now()
      }));
      
      saveSettings(settings);
      
      // Restart if enabled
      if (settings.enabled) {
        initializeAutoPost(sock);
      }
      
      return extra.reply(`✅ *Loaded ${samplePosts.length} sample posts!*\n\nUse .ap posts to view them.`);
    }
    
    // Handle test
    if (opt === 'test') {
      if (settings.channels.length === 0) {
        return extra.reply('❌ *No channels configured!*\n\nAdd a channel first with: .ap add channel');
      }
      
      const processingMsg = await sock.sendMessage(extra.from, {
        text: '🧪 *Testing auto-post...*'
      });
      
      try {
        // Use first channel for test
        const testChannel = settings.channels[0];
        const testPost = settings.posts[0] || samplePosts[0];
        
        await executePost(sock, testPost, testChannel.jid, settings);
        
        await sock.sendMessage(extra.from, { delete: processingMsg.key });
        
        return extra.reply(`✅ *Test post sent to ${testChannel.name}!*`);
        
      } catch (error) {
        await sock.sendMessage(extra.from, { delete: processingMsg.key });
        return extra.reply(`❌ *Test failed:* ${error.message}`);
      }
    }
    
    // Handle stats
    if (opt === 'stats') {
      return extra.reply(`📊 *AUTOPOST STATISTICS*\n\n` +
        `📈 *Total Posts:* ${settings.stats.totalPosts}\n` +
        `✅ *Successful:* ${settings.stats.successfulPosts}\n` +
        `❌ *Failed:* ${settings.stats.failedPosts}\n` +
        `⏰ *Last Post:* ${settings.stats.lastPost ? new Date(settings.stats.lastPost).toLocaleString() : 'Never'}\n\n` +
        `📌 *Channels:* ${settings.channels.length}\n` +
        `📝 *Active Posts:* ${settings.posts.filter(p => p.enabled).length}/${settings.posts.length}\n` +
        `⏱️ *Interval:* ${settings.defaultInterval} minutes`);
    }
    
    extra.reply('❌ *Invalid option.* Use .ap for help.');
    
  } catch (error) {
    console.error('[AutoPost] error:', error);
    extra.reply(`❌ Error: ${error.message}`);
  }
}

// Export
module.exports = {
  name: 'autopost',
  aliases: ['ap', 'channelpost', 'autochannel'],
  category: 'owner',
  description: 'Automatically post to WhatsApp channels',
  usage: '.ap <on/off/channels/posts>',
  ownerOnly: true,
  
  async execute(sock, msg, args, extra) {
    return execute(sock, msg, args, extra);
  },
  
  initializeAutoPost
};