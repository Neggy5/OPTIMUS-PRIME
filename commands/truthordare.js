/**
 * Truth or Dare Game - Play with friends in groups
 */

// Store active games
const activeGames = new Map();

// Store player points
const playerPoints = new Map();

// Truth questions database
const truths = {
  normal: [
    "What's the most embarrassing thing you've done in public?",
    "Have you ever lied to your best friend? What about?",
    "What's your biggest fear in a relationship?",
    "Who was your first celebrity crush?",
    "What's the worst date you've ever been on?",
    "Have you ever stolen anything?",
    "What's the most childish thing you still do?",
    "Have you ever peed in a pool?",
    "What's the weirdest dream you've ever had?",
    "Have you ever pretended to be sick to avoid something?",
    "What's your guilty pleasure song?",
    "Have you ever read someone else's diary or messages?",
    "What's the most trouble you've ever gotten in at school?",
    "Have you ever had a crush on a friend's ex?",
    "What's the longest you've gone without showering?",
    "Have you ever been caught picking your nose?",
    "What's the most embarrassing purchase you've made?",
    "Have you ever farted in public and blamed someone else?",
    "What's the worst haircut you've ever had?",
    "Have you ever accidentally texted the wrong person?"
  ],
  
  spicy: [
    "Have you ever sent a risky photo to someone?",
    "What's the wildest thing you've done at a party?",
    "Have you ever been in a love triangle?",
    "What's the most number of dates you've been on with different people in one week?",
    "Have you ever been caught doing something you shouldn't?",
    "What's your biggest turn-on?",
    "Have you ever made out with someone you just met?",
    "What's the most adventurous place you've done it?",
    "Have you ever used a dating app? What's your worst story?",
    "What's the craziest pickup line that actually worked?",
    "Have you ever been attracted to your friend's parent?",
    "What's the most scandalous dream you've had?",
    "Have you ever been in a friends-with-benefits situation?",
    "What's the worst kiss you've ever had?",
    "Have you ever been rejected after confessing feelings?",
    "What's the most intimate thing you've done on a first date?",
    "Have you ever been seduced by someone? How?",
    "What's your secret fantasy?",
    "Have you ever had a one-night stand?",
    "What's the most inappropriate time you've been turned on?"
  ],
  
  funny: [
    "If you were a vegetable, what would you be and why?",
    "What's the weirdest food combination you actually like?",
    "Have you ever talked to your pet like they're a human?",
    "What's the most ridiculous fact you know?",
    "If you could be any animal, what would you be?",
    "What's the worst joke you know by heart?",
    "Have you ever walked into a glass door?",
    "What's your most useless talent?",
    "If you were a superhero, what would your lame power be?",
    "What's the strangest thing you've ever googled?",
    "Have you ever accidentally liked someone's old photo while stalking?",
    "What's the most awkward automatic correct text you've sent?",
    "If your life was a movie, what would be the title?",
    "What's the weirdest thing you believed as a kid?",
    "Have you ever laughed at the wrong moment?",
    "What's your spirit animal and why?",
    "If you were a ghost, who would you haunt?",
    "What's the most embarrassing thing your parents have caught you doing?",
    "Have you ever been caught singing and dancing alone?",
    "What would be your walk-up song?"
  ],
  
  deep: [
    "What's your biggest regret in life so far?",
    "If you could change one thing about yourself, what would it be?",
    "What's the most important lesson life has taught you?",
    "Who has influenced you the most and why?",
    "What's your definition of success?",
    "What's the biggest risk you've ever taken?",
    "If you had one year left to live, what would you do?",
    "What's something you've done that you're really proud of?",
    "What's your earliest memory?",
    "What's the most difficult thing you've ever experienced?",
    "If you could apologize to someone, who would it be?",
    "What's something you wish you could tell your younger self?",
    "What does love mean to you?",
    "What's your biggest insecurity?",
    "Have you ever lost someone important? How did you cope?",
    "What's a promise you made but couldn't keep?",
    "What's the most courageous thing you've ever done?",
    "If you could live anywhere in the world, where would it be?",
    "What's something you've never told anyone?",
    "What legacy do you want to leave behind?"
  ]
};

// Dares database
const dares = {
  normal: [
    "Do 10 push-ups right now",
    "Sing a song for 30 seconds",
    "Send a random emoji to your last text conversation",
    "Do a funny dance for 15 seconds",
    "Call a random contact and say 'I love you'",
    "Post an embarrassing photo of yourself as your profile pic for 5 minutes",
    "Speak in an accent for the next 3 rounds",
    "Let someone write a word on your forehead with a pen",
    "Do your best animal impression",
    "Make a paper plane and try to fly it across the room",
    "Tell a joke (if no one laughs, do it again)",
    "Do a handstand against the wall for 10 seconds",
    "Let someone give you a new hairstyle",
    "Imitate a famous celebrity",
    "Say the alphabet backwards",
    "Do a dramatic reading of your last text message",
    "Try to do a magic trick (it can fail)",
    "Make up a short rap about the person to your right",
    "Do 20 jumping jacks",
    "Let someone tickle you for 10 seconds"
  ],
  
  spicy: [
    "Do a sexy dance for 15 seconds",
    "Whisper something seductive to the person on your left",
    "Reveal your search history to the group",
    "Show the last photo in your camera roll",
    "Let someone look through your phone for 30 seconds",
    "Send a flirty text to your crush",
    "Describe your ideal date in detail",
    "Show your most recent chat with your ex (if applicable)",
    "Reveal the last dream you had about someone",
    "Do your best seductive pose",
    "Reveal who you think is the hottest person in the room",
    "Take a sip of something without using your hands",
    "Whisper your biggest turn-on to the person next to you",
    "Show your most recent DM conversation",
    "Reveal your body count or explain why you won't",
    "Do a body roll",
    "Let someone draw on your face with lipstick",
    "Reveal your most recent Google search",
    "Do a striptease with one item of clothing (jacket/shoes count)",
    "Share your most embarrassing sexting fail"
  ],
  
  funny: [
    "Talk like a pirate for the next 3 rounds",
    "Do your best chicken impression",
    "Wear your clothes backwards for the rest of the game",
    "Try to lick your elbow",
    "Do a dramatic reading of a random product label",
    "Make a funny face and hold it for 10 seconds",
    "Pretend to be a dog for 30 seconds",
    "Try to juggle with 3 items (they will probably drop)",
    "Do the worm dance",
    "Make up a song about the last thing you ate",
    "Try to touch your nose with your tongue",
    "Walk like a penguin for one minute",
    "Speak only in questions for the next 5 minutes",
    "Do a rap battle against yourself",
    "Try to drink water like a cat",
    "Make animal sounds every time you speak for 2 rounds",
    "Do your best robot dance",
    "Try to do a backflip (safely - on a bed or mat)",
    "Balance a book on your head and walk across the room",
    "Do 5 pushups while making weird noises"
  ],
  
  extreme: [
    "Eat a spoonful of something spicy (hot sauce, wasabi, etc.)",
    "Let someone slap your arm as hard as they can",
    "Do 50 pushups right now",
    "Take a cold shower for 30 seconds",
    "Let the group give you a new haircut (just a small trim)",
    "Eat a raw onion like an apple",
    "Let someone draw a tattoo on you with a pen (stays for 24h)",
    "Do a shot of something nasty (ketchup, mustard, etc.)",
    "Let someone tickle you for 30 seconds without fighting back",
    "Run around the block (or house) once",
    "Let the group choose a new profile picture for you for 24h",
    "Eat a combination of foods that don't go together",
    "Let someone wax a small part of your leg with tape",
    "Do 20 burpees",
    "Let the group give you a makeover with makeup",
    "Eat a spoonful of cinnamon without drinking water",
    "Let someone pour cold water on your head",
    "Do a handstand for as long as you can",
    "Let the group decide a dare for you (double dare)",
    "Have a staring contest with someone and you can't blink"
  ]
};

// Category descriptions
const categoryDesc = {
  normal: '🟢 Normal',
  spicy: '🔥 Spicy',
  funny: '😂 Funny',
  deep: '💭 Deep',
  extreme: '⚡ Extreme'
};

module.exports = {
  name: 'truthordare',
  aliases: ['tod', 'truth', 'dare', 'truthtordare'],
  category: 'fun',
  description: 'Play Truth or Dare with friends',
  usage: '.tod <new/join/truth/dare/points>',
  
  async execute(sock, msg, args, extra) {
    try {
      const chatId = extra.from;
      const sender = extra.sender;
      const isGroup = extra.isGroup;
      const senderName = sender.split('@')[0];
      
      if (!isGroup) {
        return extra.reply('❌ *Truth or Dare can only be played in groups!*');
      }
      
      const subCmd = args[0]?.toLowerCase();
      
      // Get or create game for this chat
      let game = activeGames.get(chatId) || {
        players: [],
        currentTurn: null,
        category: 'normal',
        mode: 'mixed',
        gameStarted: false,
        lastPlayer: null,
        stats: {
          totalGames: 0,
          totalTruths: 0,
          totalDares: 0
        }
      };
      
      // Show help if no command
      if (!subCmd) {
        const activePlayers = game.players.length;
        
        return extra.reply(`╔══════════════════════╗
║  🎮 *TRUTH OR DARE*  🎮 ║
╚══════════════════════╝

👥 *Players:* ${activePlayers}
🎯 *Category:* ${categoryDesc[game.category] || '🟢 Normal'}
⚙️ *Mode:* ${game.mode === 'mixed' ? '🔄 Mixed' : '🎯 Selected'}

━━━━━━━━━━━━━━━━━━━
📋 *Commands:*
• .tod new - Start new game
• .tod join - Join the game
• .tod truth - Answer a truth
• .tod dare - Do a dare
• .tod category <normal/spicy/funny/deep/extreme>
• .tod mode mixed - Mix all categories
• .tod mode select - Use selected category
• .tod players - Show current players
• .tod points - Show leaderboard
• .tod end - End current game
• .tod rules - Show game rules

━━━━━━━━━━━━━━━━━━━
🎯 *Categories:*
• 🟢 Normal - Safe for everyone
• 🔥 Spicy - 18+ content
• 😂 Funny - Hilarious challenges
• 💭 Deep - Thoughtful questions
• ⚡ Extreme - Physical challenges

━━━━━━━━━━━━━━━━━━━
💡 *How to play:*
1. Start with .tod new
2. Players join with .tod join
3. Take turns with .tod truth or .tod dare
4. Have fun and be honest!

> *ᴘᴏᴡᴇʀᴇᴅ ʙʏ 𝑂𝑃𝑇𝐼𝑀𝑈𝑆 𝑃𝑅𝐼𝑀𝐸*`);
      }
      
      // Handle: .tod new
      if (subCmd === 'new') {
        if (game.players.length > 0 && game.gameStarted) {
          return extra.reply('❌ *A game is already in progress!*\n\nUse .tod end to finish it.');
        }
        
        game = {
          players: [sender],
          currentTurn: sender,
          category: 'normal',
          mode: 'mixed',
          gameStarted: true,
          lastPlayer: null,
          stats: {
            totalGames: (game.stats?.totalGames || 0) + 1,
            totalTruths: 0,
            totalDares: 0
          }
        };
        
        activeGames.set(chatId, game);
        
        return extra.reply(`🎮 *TRUTH OR DARE STARTED!*\n\n` +
          `👤 *Host:* @${senderName}\n` +
          `🎯 *Category:* ${categoryDesc.normal}\n\n` +
          `📌 *Other players can join with:*\n` +
          `➜ .tod join\n\n` +
          `*Game will start when ready!*`,
          { mentions: [sender] });
      }
      
      // Handle: .tod join
      if (subCmd === 'join') {
        if (!game.gameStarted) {
          return extra.reply('❌ *No active game!*\n\nStart one with: .tod new');
        }
        
        if (game.players.includes(sender)) {
          return extra.reply('❌ *You are already in the game!*');
        }
        
        game.players.push(sender);
        activeGames.set(chatId, game);
        
        const playerMentions = game.players.map(p => `@${p.split('@')[0]}`).join(', ');
        
        return extra.reply(`✅ *@${senderName} joined the game!*\n\n` +
          `👥 *Current players:* ${playerMentions}\n\n` +
          `*First turn:* @${game.players[0].split('@')[0]}\n` +
          `Use .tod truth or .tod dare to start!`,
          { mentions: game.players });
      }
      
      // Handle: .tod truth
      if (subCmd === 'truth') {
        if (!game.gameStarted || game.players.length < 2) {
          return extra.reply('❌ *Need at least 2 players to play!*\n\nUse .tod join to join the game.');
        }
        
        if (sender !== game.currentTurn) {
          const currentPlayer = game.currentTurn.split('@')[0];
          return extra.reply(`⏳ *It's @${currentPlayer}'s turn!*\n\nPlease wait.`,
            { mentions: [game.currentTurn] });
        }
        
        // Get truth based on category
        let truthPool = [];
        if (game.mode === 'mixed') {
          truthPool = [
            ...truths.normal,
            ...truths.spicy,
            ...truths.funny,
            ...truths.deep
          ];
        } else {
          truthPool = truths[game.category] || truths.normal;
        }
        
        const randomTruth = truthPool[Math.floor(Math.random() * truthPool.length)];
        
        // Update stats
        game.stats.totalTruths++;
        game.lastPlayer = sender;
        
        // Move to next player
        const currentIndex = game.players.indexOf(sender);
        game.currentTurn = game.players[(currentIndex + 1) % game.players.length];
        activeGames.set(chatId, game);
        
        return extra.reply(`❓ *TRUTH FOR @${senderName}*\n\n` +
          `"${randomTruth}"\n\n` +
          `⏳ *Next turn:* @${game.currentTurn.split('@')[0]}`,
          { mentions: [sender, game.currentTurn] });
      }
      
      // Handle: .tod dare
      if (subCmd === 'dare') {
        if (!game.gameStarted || game.players.length < 2) {
          return extra.reply('❌ *Need at least 2 players to play!*\n\nUse .tod join to join the game.');
        }
        
        if (sender !== game.currentTurn) {
          const currentPlayer = game.currentTurn.split('@')[0];
          return extra.reply(`⏳ *It's @${currentPlayer}'s turn!*\n\nPlease wait.`,
            { mentions: [game.currentTurn] });
        }
        
        // Get dare based on category
        let darePool = [];
        if (game.mode === 'mixed') {
          darePool = [
            ...dares.normal,
            ...dares.spicy,
            ...dares.funny,
            ...dares.extreme
          ];
        } else {
          darePool = dares[game.category] || dares.normal;
        }
        
        const randomDare = darePool[Math.floor(Math.random() * darePool.length)];
        
        // Award points for completing dare
        let points = playerPoints.get(sender) || 0;
        points += 10;
        playerPoints.set(sender, points);
        
        // Update stats
        game.stats.totalDares++;
        game.lastPlayer = sender;
        
        // Move to next player
        const currentIndex = game.players.indexOf(sender);
        game.currentTurn = game.players[(currentIndex + 1) % game.players.length];
        activeGames.set(chatId, game);
        
        return extra.reply(`⚡ *DARE FOR @${senderName}*\n\n` +
          `"${randomDare}"\n\n` +
          `🏆 *Points:* +10\n\n` +
          `⏳ *Next turn:* @${game.currentTurn.split('@')[0]}`,
          { mentions: [sender, game.currentTurn] });
      }
      
      // Handle: .tod category
      if (subCmd === 'category') {
        const category = args[1]?.toLowerCase();
        
        if (!category || !['normal', 'spicy', 'funny', 'deep', 'extreme'].includes(category)) {
          return extra.reply('❌ *Invalid category!*\n\nAvailable: normal, spicy, funny, deep, extreme');
        }
        
        if (game.gameStarted) {
          game.category = category;
          activeGames.set(chatId, game);
        }
        
        return extra.reply(`✅ *Category set to ${categoryDesc[category]}!*`);
      }
      
      // Handle: .tod mode
      if (subCmd === 'mode') {
        const mode = args[1]?.toLowerCase();
        
        if (!mode || !['mixed', 'select'].includes(mode)) {
          return extra.reply('❌ *Invalid mode!*\n\nAvailable: mixed, select');
        }
        
        if (game.gameStarted) {
          game.mode = mode;
          activeGames.set(chatId, game);
        }
        
        const modeDesc = mode === 'mixed' ? 'Mixed (all categories)' : 'Selected category only';
        return extra.reply(`✅ *Mode set to ${modeDesc}!*`);
      }
      
      // Handle: .tod players
      if (subCmd === 'players') {
        if (game.players.length === 0) {
          return extra.reply('📭 *No players in current game.*');
        }
        
        const playerList = game.players.map((p, i) => {
          const isCurrent = p === game.currentTurn ? '👉 ' : '   ';
          return `${isCurrent}${i+1}. @${p.split('@')[0]}`;
        }).join('\n');
        
        return extra.reply(`👥 *CURRENT PLAYERS (${game.players.length})*\n\n${playerList}\n\n👉 = Current turn`,
          { mentions: game.players });
      }
      
      // Handle: .tod points
      if (subCmd === 'points') {
        if (playerPoints.size === 0) {
          return extra.reply('📭 *No points recorded yet.*\n\nPlay some dares to earn points!');
        }
        
        const leaderboard = Array.from(playerPoints.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 10)
          .map(([player, points], i) => {
            const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '📌';
            return `${medal} ${i+1}. @${player.split('@')[0]} - ${points} points`;
          }).join('\n');
        
        return extra.reply(`🏆 *LEADERBOARD*\n\n${leaderboard}\n\n*Keep playing to earn more points!*`,
          { mentions: Array.from(playerPoints.keys()).slice(0, 10) });
      }
      
      // Handle: .tod end
      if (subCmd === 'end') {
        if (!game.gameStarted) {
          return extra.reply('❌ *No active game to end!*');
        }
        
        activeGames.delete(chatId);
        
        return extra.reply('✅ *Game ended!*\n\nStart a new game with .tod new');
      }
      
      // Handle: .tod rules
      if (subCmd === 'rules') {
        return extra.reply(`📋 *TRUTH OR DARE RULES*\n\n` +
          `1️⃣ *How to Start*\n` +
          `   • One person starts with .tod new\n` +
          `   • Others join with .tod join\n\n` +
          `2️⃣ *Gameplay*\n` +
          `   • Players take turns\n` +
          `   • Choose .tod truth or .tod dare\n` +
          `   • Complete the challenge honestly!\n\n` +
          `3️⃣ *Categories*\n` +
          `   • 🟢 Normal - Family friendly\n` +
          `   • 🔥 Spicy - Adult content\n` +
          `   • 😂 Funny - Hilarious moments\n` +
          `   • 💭 Deep - Thoughtful questions\n` +
          `   • ⚡ Extreme - Physical challenges\n\n` +
          `4️⃣ *Points*\n` +
          `   • Dares earn 10 points\n` +
          `   • Truths don't earn points\n` +
          `   • Top players appear on leaderboard\n\n` +
          `5️⃣ *Fair Play*\n` +
          `   • Be honest with truths\n` +
          `   • Attempt all dares\n` +
          `   • Respect other players\n` +
          `   • Have fun! 🎉`);
      }
      
      extra.reply('❌ *Invalid command.* Use .tod for help.');
      
    } catch (error) {
      console.error('TruthOrDare error:', error);
      extra.reply(`❌ Error: ${error.message}`);
    }
  }
};