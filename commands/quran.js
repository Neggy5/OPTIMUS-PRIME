/**
 * Quran Command - Read Quran verses and chapters
 */

const axios = require('axios');

// Quran API endpoints
const quranApis = {
  // Al-Quran Cloud API
  getVerse: 'https://api.alquran.cloud/v1/ayah/',
  getSurah: 'https://api.alquran.cloud/v1/surah/',
  getRandom: 'https://api.alquran.cloud/v1/ayah/random',
  search: 'https://api.alquran.cloud/v1/search/',
  
  // Alternative API
  edip: 'https://api.quran.com/api/v4/'
};

// Surah names (chapters)
const surahNames = {
  1: 'Al-Fatihah (The Opening)',
  2: 'Al-Baqarah (The Cow)',
  3: 'Ali \'Imran (Family of Imran)',
  4: 'An-Nisa (The Women)',
  5: 'Al-Ma\'idah (The Table Spread)',
  6: 'Al-An\'am (The Cattle)',
  7: 'Al-A\'raf (The Heights)',
  8: 'Al-Anfal (The Spoils of War)',
  9: 'At-Tawbah (The Repentance)',
  10: 'Yunus (Jonah)',
  11: 'Hud (Hud)',
  12: 'Yusuf (Joseph)',
  13: 'Ar-Ra\'d (The Thunder)',
  14: 'Ibrahim (Abraham)',
  15: 'Al-Hijr (The Rocky Tract)',
  16: 'An-Nahl (The Bee)',
  17: 'Al-Isra (The Night Journey)',
  18: 'Al-Kahf (The Cave)',
  19: 'Maryam (Mary)',
  20: 'Ta-Ha (Ta-Ha)',
  21: 'Al-Anbiya (The Prophets)',
  22: 'Al-Hajj (The Pilgrimage)',
  23: 'Al-Mu\'minun (The Believers)',
  24: 'An-Nur (The Light)',
  25: 'Al-Furqan (The Criterion)',
  26: 'Ash-Shu\'ara (The Poets)',
  27: 'An-Naml (The Ant)',
  28: 'Al-Qasas (The Stories)',
  29: 'Al-\'Ankabut (The Spider)',
  30: 'Ar-Rum (The Romans)',
  31: 'Luqman (Luqman)',
  32: 'As-Sajdah (The Prostration)',
  33: 'Al-Ahzab (The Combined Forces)',
  34: 'Saba (Sheba)',
  35: 'Fatir (The Originator)',
  36: 'Ya-Sin (Ya Sin)',
  37: 'As-Saffat (Those Who Set the Ranks)',
  38: 'Sad (Sad)',
  39: 'Az-Zumar (The Groups)',
  40: 'Ghafir (The Forgiver)',
  41: 'Fussilat (Explained in Detail)',
  42: 'Ash-Shura (The Consultation)',
  43: 'Az-Zukhruf (The Gold Adornments)',
  44: 'Ad-Dukhan (The Smoke)',
  45: 'Al-Jathiyah (The Crouching)',
  46: 'Al-Ahqaf (The Wind-Curved Sandhills)',
  47: 'Muhammad (Muhammad)',
  48: 'Al-Fath (The Victory)',
  49: 'Al-Hujurat (The Rooms)',
  50: 'Qaf (Qaf)',
  51: 'Adh-Dhariyat (The Winnowing Winds)',
  52: 'At-Tur (The Mount)',
  53: 'An-Najm (The Star)',
  54: 'Al-Qamar (The Moon)',
  55: 'Ar-Rahman (The Beneficent)',
  56: 'Al-Waqi\'ah (The Event)',
  57: 'Al-Hadid (The Iron)',
  58: 'Al-Mujadila (The Pleading Woman)',
  59: 'Al-Hashr (The Exile)',
  60: 'Al-Mumtahanah (The Examined One)',
  61: 'As-Saff (The Ranks)',
  62: 'Al-Jumu\'ah (The Congregation)',
  63: 'Al-Munafiqun (The Hypocrites)',
  64: 'At-Taghabun (The Mutual Disillusion)',
  65: 'At-Talaq (The Divorce)',
  66: 'At-Tahrim (The Prohibition)',
  67: 'Al-Mulk (The Sovereignty)',
  68: 'Al-Qalam (The Pen)',
  69: 'Al-Haqqah (The Reality)',
  70: 'Al-Ma\'arij (The Ascending Stairways)',
  71: 'Nuh (Noah)',
  72: 'Al-Jinn (The Jinn)',
  73: 'Al-Muzzammil (The Enshrouded One)',
  74: 'Al-Muddaththir (The Cloaked One)',
  75: 'Al-Qiyamah (The Resurrection)',
  76: 'Al-Insan (The Man)',
  77: 'Al-Mursalat (Those Sent Forth)',
  78: 'An-Naba (The Great News)',
  79: 'An-Nazi\'at (Those Who Drag Forth)',
  80: 'Abasa (He Frowned)',
  81: 'At-Takwir (The Overthrowing)',
  82: 'Al-Infitar (The Cleaving)',
  83: 'Al-Mutaffifin (The Defrauding)',
  84: 'Al-Inshiqaq (The Splitting Asunder)',
  85: 'Al-Buruj (The Mansions of the Stars)',
  86: 'At-Tariq (The Nightcomer)',
  87: 'Al-A\'la (The Most High)',
  88: 'Al-Ghashiyah (The Overwhelming)',
  89: 'Al-Fajr (The Dawn)',
  90: 'Al-Balad (The City)',
  91: 'Ash-Shams (The Sun)',
  92: 'Al-Layl (The Night)',
  93: 'Ad-Duha (The Morning Hours)',
  94: 'Ash-Sharh (The Relief)',
  95: 'At-Tin (The Fig)',
  96: 'Al-\'Alaq (The Clot)',
  97: 'Al-Qadr (The Power)',
  98: 'Al-Bayyinah (The Clear Proof)',
  99: 'Az-Zalzalah (The Earthquake)',
  100: 'Al-\'Adiyat (The Chargers)',
  101: 'Al-Qari\'ah (The Calamity)',
  102: 'At-Takathur (The Rivalry)',
  103: 'Al-\'Asr (The Declining Day)',
  104: 'Al-Humazah (The Traducer)',
  105: 'Al-Fil (The Elephant)',
  106: 'Quraysh (Quraysh)',
  107: 'Al-Ma\'un (The Small Kindnesses)',
  108: 'Al-Kawthar (The Abundance)',
  109: 'Al-Kafirun (The Disbelievers)',
  110: 'An-Nasr (The Divine Support)',
  111: 'Al-Masad (The Palm Fiber)',
  112: 'Al-Ikhlas (The Sincerity)',
  113: 'Al-Falaq (The Daybreak)',
  114: 'An-Nas (Mankind)'
};

// Translations available
const translations = {
  'en.asad': 'Muhammad Asad',
  'en.ahmedali': 'Ahmed Ali',
  'en.arberry': 'A. J. Arberry',
  'en.pickthall': 'Pickthall',
  'en.yusufali': 'Yusuf Ali',
  'en.sahih': 'Sahih International',
  'en.maududi': 'Maududi'
};

module.exports = {
  name: 'quran',
  aliases: ['q', 'qurans', 'koran'],
  category: 'tools',
  description: 'Read Quran verses and chapters',
  usage: '.quran <surah>:<verse(s)>',
  
  async execute(sock, msg, args, extra) {
    try {
      const chatId = extra.from;
      const query = args.join(' ').trim();
      
      if (!query) {
        return extra.reply(`╔══════════════════════╗
║  📖 *QURAN COMMAND*  📖  ║
╚══════════════════════╝

📌 *Usage:*
• .quran <surah>:<verse>
• .quran <surah>
• .quran random
• .quran search <word>
• .quran juz <number>

💡 *Examples:*
• .quran 1:1
• .quran 36
• .quran 112:1-4
• .quran random
• .quran search mercy

━━━━━━━━━━━━━━━━━━━
📚 *Translations:*
• en.sahih - Sahih International
• en.yusufali - Yusuf Ali
• en.pickthall - Pickthall

Use: .quran 1:1 --en.sahih

━━━━━━━━━━━━━━━━━━━
🔍 *Surah Numbers:*
• 1-114 (total 114 surahs)
• Juz: 1-30

> *ᴘᴏᴡᴇʀᴇᴅ ʙʏ 𝑂𝑃𝑇𝐼𝑀𝑈𝑆 𝑃𝑅𝐼𝑀𝐸*`);
      }
      
      // Send loading message
      const loadingMsg = await sock.sendMessage(chatId, {
        text: '📖 *Reading Quran...*'
      }, { quoted: msg });
      
      try {
        // Handle random verse
        if (query === 'random') {
          const response = await axios.get('https://api.alquran.cloud/v1/ayah/random/en.sahih', { timeout: 5000 });
          
          await sock.sendMessage(chatId, { delete: loadingMsg.key });
          
          const data = response.data.data;
          const surahNum = data.surah.number;
          const ayahNum = data.numberInSurah;
          
          const verseText = `╔══════════════════════╗
║  📖 *RANDOM AYAH*  📖   ║
╚══════════════════════╝

📌 *Surah ${surahNum}:${ayahNum} - ${surahNames[surahNum]}*
━━━━━━━━━━━━━━━━━━━

"${data.text}"

━━━━━━━━━━━━━━━━━━━
📚 ${data.edition.name}

> *ᴘᴏᴡᴇʀᴇᴅ ʙʏ 𝑂𝑃𝑇𝐼𝑀𝑈𝑆 𝑃𝑅𝐼𝑀𝐸*`;
          
          return await sock.sendMessage(chatId, { text: verseText }, { quoted: msg });
        }
        
        // Parse reference
        let reference = query;
        let translation = 'en.sahih';
        
        // Check for translation flag
        if (query.includes('--')) {
          const parts = query.split('--');
          reference = parts[0].trim();
          translation = parts[1].trim();
        }
        
        // Handle different formats
        if (reference.includes(':')) {
          // Verse reference: surah:verse
          const [surah, verse] = reference.split(':');
          
          let url = `https://api.alquran.cloud/v1/ayah/${surah}:${verse}/${translation}`;
          
          if (verse.includes('-')) {
            // Range of verses
            const [start, end] = verse.split('-').map(v => parseInt(v));
            let resultText = `╔══════════════════════╗
║  📖 *SURAH ${surah}:${start}-${end}*  📖 ║
╚══════════════════════╝
📌 *${surahNames[surah]}*
━━━━━━━━━━━━━━━━━━━\n\n`;
            
            for (let i = start; i <= end; i++) {
              const verseResponse = await axios.get(`https://api.alquran.cloud/v1/ayah/${surah}:${i}/${translation}`, { timeout: 5000 });
              resultText += `*${i}.* ${verseResponse.data.data.text}\n\n`;
            }
            
            resultText += `━━━━━━━━━━━━━━━━━━━\n`;
            resultText += `📚 ${translations[translation] || translation}\n`;
            resultText += `> *ᴘᴏᴡᴇʀᴇᴅ ʙʏ 𝑂𝑃𝑇𝐼𝑀𝑈𝑆 𝑃𝑅𝐼𝑀𝐸*`;
            
            await sock.sendMessage(chatId, { delete: loadingMsg.key });
            return await sock.sendMessage(chatId, { text: resultText }, { quoted: msg });
          }
          
          // Single verse
          const response = await axios.get(url, { timeout: 5000 });
          
          await sock.sendMessage(chatId, { delete: loadingMsg.key });
          
          const data = response.data.data;
          
          const verseText = `╔══════════════════════╗
║  📖 *SURAH ${surah}:${verse}*  📖  ║
╚══════════════════════╝
📌 *${surahNames[data.surah.number]}*
━━━━━━━━━━━━━━━━━━━

"${data.text}"

━━━━━━━━━━━━━━━━━━━
📚 ${data.edition.name}

> *ᴘᴏᴡᴇʀᴇᴅ ʙʏ 𝑂𝑃𝑇𝐼𝑀𝑈𝑆 𝑃𝑅𝐼𝑀𝐸*`;
          
          await sock.sendMessage(chatId, { text: verseText }, { quoted: msg });
          
        } else if (!isNaN(parseInt(reference))) {
          // Entire surah
          const surahNum = parseInt(reference);
          
          if (surahNum < 1 || surahNum > 114) {
            await sock.sendMessage(chatId, { delete: loadingMsg.key });
            return extra.reply('❌ *Invalid surah number!*\n\nSurah numbers are 1-114.');
          }
          
          const response = await axios.get(`https://api.alquran.cloud/v1/surah/${surahNum}/${translation}`, { timeout: 5000 });
          
          await sock.sendMessage(chatId, { delete: loadingMsg.key });
          
          const data = response.data.data;
          const ayahs = data.ayahs.slice(0, 10); // First 10 verses to avoid long messages
          
          let surahText = `╔══════════════════════╗
║  📖 *SURAH ${surahNum}*  📖   ║
╚══════════════════════╝
📌 *${surahNames[surahNum]}*
━━━━━━━━━━━━━━━━━━━
📊 *Total Verses:* ${data.numberOfAyahs}
📜 *Revealed:* ${data.revelationType}
━━━━━━━━━━━━━━━━━━━\n\n`;
          
          ayahs.forEach(ayah => {
            surahText += `*${ayah.numberInSurah}.* ${ayah.text}\n\n`;
          });
          
          if (data.numberOfAyahs > 10) {
            surahText += `*... and ${data.numberOfAyahs - 10} more verses*\n\n`;
          }
          
          surahText += `━━━━━━━━━━━━━━━━━━━\n`;
          surahText += `📚 ${data.edition.name}\n`;
          surahText += `> *ᴘᴏᴡᴇʀᴇᴅ ʙʏ 𝑂𝑃𝑇𝐼𝑀𝑈𝑆 𝑃𝑅𝐼𝑀𝐸*`;
          
          await sock.sendMessage(chatId, { text: surahText }, { quoted: msg });
          
        } else {
          await sock.sendMessage(chatId, { delete: loadingMsg.key });
          return extra.reply(`❌ *Invalid format!*\n\nUse: .quran <surah>:<verse>\nExample: .quran 1:1`);
        }
        
      } catch (apiError) {
        console.error('Quran API error:', apiError);
        await sock.sendMessage(chatId, { delete: loadingMsg.key });
        
        if (apiError.response && apiError.response.status === 404) {
          return extra.reply(`❌ *Verse not found:* "${query}"\n\nCheck format or surah/verse number.`);
        }
        
        return extra.reply(`❌ *Failed to fetch Quran.*\n\nPlease try again later.`);
      }
      
    } catch (error) {
      console.error('Quran Command Error:', error);
      await extra.reply(`❌ *Error:* ${error.message}`);
    }
  }
};