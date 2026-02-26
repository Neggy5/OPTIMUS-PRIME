/**
 * Bible Command - Read Bible verses and chapters
 */

const axios = require('axios');

// Bible API endpoints
const bibleApis = {
  // Free Bible API
  getVerse: 'https://bible-api.com/',
  search: 'https://bible-api.com/search/',
  random: 'https://bible-api.com/random',
  
  // Alternative API
  getChapter: 'https://cdn.jsdelivr.net/gh/wldeh/bible-api/bibles/en/books.json'
};

// Bible translations
const translations = {
  'kjv': 'King James Version',
  'web': 'World English Bible',
  'bbe': 'Bible in Basic English',
  'ylt': 'Young\'s Literal Translation',
  'asv': 'American Standard Version'
};

// Book names mapping
const bookNames = {
  'gen': 'Genesis', 'exo': 'Exodus', 'lev': 'Leviticus', 'num': 'Numbers',
  'deu': 'Deuteronomy', 'jos': 'Joshua', 'jdg': 'Judges', 'rut': 'Ruth',
  '1sa': '1 Samuel', '2sa': '2 Samuel', '1ki': '1 Kings', '2ki': '2 Kings',
  '1ch': '1 Chronicles', '2ch': '2 Chronicles', 'ezr': 'Ezra', 'neh': 'Nehemiah',
  'est': 'Esther', 'job': 'Job', 'psa': 'Psalms', 'pro': 'Proverbs',
  'ecc': 'Ecclesiastes', 'sos': 'Song of Solomon', 'isa': 'Isaiah',
  'jer': 'Jeremiah', 'lam': 'Lamentations', 'ezk': 'Ezekiel', 'dan': 'Daniel',
  'hos': 'Hosea', 'joe': 'Joel', 'amo': 'Amos', 'oba': 'Obadiah',
  'jon': 'Jonah', 'mic': 'Micah', 'nah': 'Nahum', 'hab': 'Habakkuk',
  'zep': 'Zephaniah', 'hag': 'Haggai', 'zec': 'Zechariah', 'mal': 'Malachi',
  'mat': 'Matthew', 'mar': 'Mark', 'luk': 'Luke', 'joh': 'John',
  'act': 'Acts', 'rom': 'Romans', '1co': '1 Corinthians', '2co': '2 Corinthians',
  'gal': 'Galatians', 'eph': 'Ephesians', 'phi': 'Philippians', 'col': 'Colossians',
  '1th': '1 Thessalonians', '2th': '2 Thessalonians', '1ti': '1 Timothy',
  '2ti': '2 Timothy', 'tit': 'Titus', 'phm': 'Philemon', 'heb': 'Hebrews',
  'jam': 'James', '1pe': '1 Peter', '2pe': '2 Peter', '1jn': '1 John',
  '2jn': '2 John', '3jn': '3 John', 'jud': 'Jude', 'rev': 'Revelation'
};

module.exports = {
  name: 'bible',
  aliases: ['b', 'verse', 'scripture'],
  category: 'tools',
  description: 'Read Bible verses and chapters',
  usage: '.bible <book> <chapter>:<verse(s)>',
  
  async execute(sock, msg, args, extra) {
    try {
      const chatId = extra.from;
      const query = args.join(' ').trim();
      
      if (!query) {
        return extra.reply(`╔══════════════════════╗
║  📖 *BIBLE COMMAND*  📖  ║
╚══════════════════════╝

📌 *Usage:*
• .bible <book> <chapter>:<verse>
• .bible <book> <chapter>
• .bible random
• .bible search <word>
• .bible today

💡 *Examples:*
• .bible John 3:16
• .bible Psalms 23
• .bible Genesis 1:1-5
• .bible random
• .bible search love

━━━━━━━━━━━━━━━━━━━
📚 *Translations:*
• kjv - King James Version
• web - World English Bible
• bbe - Bible in Basic English

Use: .bible John 3:16 --web

━━━━━━━━━━━━━━━━━━━
🔍 *Book Abbreviations:*
• gen, exo, lev, num, deu
• psa, pro, ecc, isa, jer
• mat, mar, luk, joh, act
• rom, 1co, 2co, gal, eph

> *ᴘᴏᴡᴇʀᴇᴅ ʙʏ ZUKO-MD*`);
      }
      
      // Send loading message
      const loadingMsg = await sock.sendMessage(chatId, {
        text: '📖 *Searching scriptures...*'
      }, { quoted: msg });
      
      try {
        // Handle random verse
        if (query === 'random') {
          const response = await axios.get('https://bible-api.com/random', { timeout: 5000 });
          
          await sock.sendMessage(chatId, { delete: loadingMsg.key });
          
          const data = response.data;
          const verseText = `╔══════════════════════╗
║  📖 *RANDOM VERSE*  📖  ║
╚══════════════════════╝

📌 *${data.reference}*
━━━━━━━━━━━━━━━━━━━

"${data.text.replace(/\n/g, ' ').trim()}"

━━━━━━━━━━━━━━━━━━━
📚 ${data.translation_name || 'King James Version'}

> *ᴘᴏᴡᴇʀᴇᴅ ʙʏ ZUKO-MD*`;
          
          return await sock.sendMessage(chatId, { text: verseText }, { quoted: msg });
        }
        
        // Handle search
        if (query.startsWith('search ')) {
          const searchTerm = query.replace('search ', '');
          const response = await axios.get(`https://bible-api.com/search/${encodeURIComponent(searchTerm)}`, { timeout: 5000 });
          
          await sock.sendMessage(chatId, { delete: loadingMsg.key });
          
          const data = response.data;
          if (!data.verses || data.verses.length === 0) {
            return extra.reply(`❌ *No results found for "${searchTerm}"*`);
          }
          
          let resultText = `╔══════════════════════╗
║  🔍 *SEARCH RESULTS*  🔍  ║
╚══════════════════════╝

📌 *Search:* "${searchTerm}"
📊 *Found:* ${data.verses.length} verses

━━━━━━━━━━━━━━━━━━━\n\n`;
          
          data.verses.slice(0, 5).forEach((verse, i) => {
            resultText += `${i+1}. *${verse.reference}*\n`;
            resultText += `"${verse.text.replace(/\n/g, ' ').substring(0, 100)}..."\n\n`;
          });
          
          resultText += `━━━━━━━━━━━━━━━━━━━\n`;
          resultText += `💡 Use .bible <reference> to read full verse\n`;
          resultText += `> *ᴘᴏᴡᴇʀᴇᴅ ʙʏ ZUKO-MD*`;
          
          return await sock.sendMessage(chatId, { text: resultText }, { quoted: msg });
        }
        
        // Handle today's verse
        if (query === 'today') {
          // Get a verse based on current day of year
          const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);
          const verses = [
            'John 3:16', 'Psalms 23:1', 'Philippians 4:13', 'Romans 8:28',
            'Jeremiah 29:11', 'Proverbs 3:5', 'Isaiah 40:31', 'Joshua 1:9'
          ];
          const todayVerse = verses[dayOfYear % verses.length];
          
          const response = await axios.get(`https://bible-api.com/${todayVerse}`, { timeout: 5000 });
          
          await sock.sendMessage(chatId, { delete: loadingMsg.key });
          
          const data = response.data;
          const verseText = `╔══════════════════════╗
║  📅 *VERSE OF THE DAY*  📅 ║
╚══════════════════════╝

📌 *${data.reference}*
━━━━━━━━━━━━━━━━━━━

"${data.text.replace(/\n/g, ' ').trim()}"

━━━━━━━━━━━━━━━━━━━
📚 ${data.translation_name || 'King James Version'}
📅 ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}

> *ᴘᴏᴡᴇʀᴇᴅ ʙʏ ZUKO-MD*`;
          
          return await sock.sendMessage(chatId, { text: verseText }, { quoted: msg });
        }
        
        // Parse reference
        let reference = query;
        let translation = 'kjv';
        
        // Check for translation flag
        if (query.includes('--')) {
          const parts = query.split('--');
          reference = parts[0].trim();
          translation = parts[1].trim();
        }
        
        // Normalize book names
        let normalizedRef = reference;
        const firstWord = reference.split(' ')[0].toLowerCase();
        if (bookNames[firstWord]) {
          normalizedRef = reference.replace(new RegExp(firstWord, 'i'), bookNames[firstWord]);
        }
        
        // Fetch verse
        const response = await axios.get(`https://bible-api.com/${encodeURIComponent(normalizedRef)}?translation=${translation}`, { timeout: 5000 });
        
        await sock.sendMessage(chatId, { delete: loadingMsg.key });
        
        const data = response.data;
        
        if (!data.verses || data.verses.length === 0) {
          return extra.reply(`❌ *Verse not found:* "${reference}"`);
        }
        
        // Build response
        let verseText = `╔══════════════════════╗
║  📖 *${data.reference}*  📖  ║
╚══════════════════════╝

━━━━━━━━━━━━━━━━━━━\n\n`;
        
        if (data.verses.length === 1) {
          verseText += `"${data.text.replace(/\n/g, ' ').trim()}"\n\n`;
        } else {
          data.verses.forEach(verse => {
            verseText += `*${verse.verse}.* ${verse.text.replace(/\n/g, ' ').trim()}\n\n`;
          });
        }
        
        verseText += `━━━━━━━━━━━━━━━━━━━\n`;
        verseText += `📚 ${data.translation_name || translations[translation] || 'King James Version'}\n`;
        verseText += `> *ᴘᴏᴡᴇʀᴇᴅ ʙʏ ZUKO-MD*`;
        
        await sock.sendMessage(chatId, { text: verseText }, { quoted: msg });
        
      } catch (apiError) {
        console.error('Bible API error:', apiError);
        await sock.sendMessage(chatId, { delete: loadingMsg.key });
        
        if (apiError.response && apiError.response.status === 404) {
          return extra.reply(`❌ *Verse not found:* "${query}"\n\nCheck spelling or format.`);
        }
        
        return extra.reply(`❌ *Failed to fetch scripture.*\n\nPlease try again later.`);
      }
      
    } catch (error) {
      console.error('Bible Command Error:', error);
      await extra.reply(`❌ *Error:* ${error.message}`);
    }
  }
};