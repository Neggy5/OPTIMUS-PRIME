/**
 * Tic-Tac-Toe Game - Play with friends or against bot
 */

// Store active games
const activeGames = new Map();

// Game board templates
const boardTemplates = {
  numbers: [
    ['1️⃣', '2️⃣', '3️⃣'],
    ['4️⃣', '5️⃣', '6️⃣'],
    ['7️⃣', '8️⃣', '9️⃣']
  ],
  emoji: [
    ['⬜', '⬜', '⬜'],
    ['⬜', '⬜', '⬜'],
    ['⬜', '⬜', '⬜']
  ]
};

module.exports = {
  name: 'tictactoe',
  aliases: ['ttt', 't3', 'xo'],
  category: 'fun',
  description: 'Play Tic-Tac-Toe with friends or against bot',
  usage: '.ttt <new/join/play/move>',
  
  async execute(sock, msg, args, extra) {
    try {
      const chatId = extra.from;
      const sender = extra.sender;
      const isGroup = extra.isGroup;
      
      if (!isGroup) {
        return extra.reply('❌ *Tic-Tac-Toe can only be played in groups!*');
      }
      
      const subCmd = args[0]?.toLowerCase();
      
      // Show help if no command
      if (!subCmd) {
        return extra.reply(`╔══════════════════════╗
║  🎮 *TIC-TAC-TOE*  🎮  ║
╚══════════════════════╝

📋 *Commands:*
• .ttt new - Start a new game
• .ttt join - Join a game
• .ttt play <1-9> - Make a move
• .ttt quit - End current game
• .ttt board - Show current board

🎯 *How to play:*
1. One person starts with .ttt new
2. Others join with .ttt join
3. Take turns with .ttt play 1-9
4. First to 3 in a row wins!

📌 *Board Positions:*
1️⃣ 2️⃣ 3️⃣
4️⃣ 5️⃣ 6️⃣
7️⃣ 8️⃣ 9️⃣

> *ᴘᴏᴡᴇʀᴇᴅ ʙʏ 𝑂𝑃𝑇𝐼𝑀𝑈𝑆 𝑃𝑅𝐼𝑀𝐸*`);
      }
      
      // Get or create game for this chat
      let game = activeGames.get(chatId) || {
        players: [],
        currentTurn: null,
        board: [
          ['', '', ''],
          ['', '', ''],
          ['', '', '']
        ],
        moves: 0,
        gameOver: false,
        winner: null,
        startedAt: Date.now()
      };
      
      // Handle: .ttt new
      if (subCmd === 'new') {
        // Check if game already exists
        if (game.players.length > 0) {
          return extra.reply('❌ *A game is already in progress!*\n\nUse .ttt join to play or .ttt quit to end it.');
        }
        
        // Initialize new game
        game = {
          players: [sender],
          currentTurn: sender,
          board: [
            ['', '', ''],
            ['', '', ''],
            ['', '', '']
          ],
          moves: 0,
          gameOver: false,
          winner: null,
          startedAt: Date.now()
        };
        
        activeGames.set(chatId, game);
        
        return extra.reply(`🎮 *Tic-Tac-Toe Game Started!*\n\n` +
          `👤 *Player 1 (❌):* @${sender.split('@')[0]}\n` +
          `👤 *Player 2:* Waiting for opponent...\n\n` +
          `📌 *Waiting for someone to join with:*\n` +
          `➜ .ttt join\n\n` +
          `*Board:*\n${renderBoard(game.board)}`,
          { mentions: [sender] }
        );
      }
      
      // Handle: .ttt join
      if (subCmd === 'join') {
        // Check if game exists
        if (game.players.length === 0) {
          return extra.reply('❌ *No game available!*\n\nStart one with: .ttt new');
        }
        
        // Check if already in game
        if (game.players.includes(sender)) {
          return extra.reply('❌ *You are already in this game!*');
        }
        
        // Check if game is full
        if (game.players.length >= 2) {
          return extra.reply('❌ *Game is already full!*\n\nWait for current game to finish.');
        }
        
        // Check if game already started
        if (game.moves > 0) {
          return extra.reply('❌ *Game has already started!*\n\nWait for it to finish.');
        }
        
        // Add player
        game.players.push(sender);
        game.currentTurn = game.players[0]; // First player starts
        activeGames.set(chatId, game);
        
        return extra.reply(`✅ *Player 2 Joined!*\n\n` +
          `👤 *Player 1 (❌):* @${game.players[0].split('@')[0]}\n` +
          `👤 *Player 2 (⭕):* @${sender.split('@')[0]}\n\n` +
          `🎯 *${game.players[0].split('@')[0]} goes first!*\n\n` +
          `*Board:*\n${renderBoard(game.board)}\n\n` +
          `*Make your move:*\n.ttt play <1-9>`,
          { mentions: game.players }
        );
      }
      
      // Handle: .ttt play <position>
      if (subCmd === 'play' || subCmd === 'move') {
        const position = parseInt(args[1]);
        
        // Validate game exists
        if (game.players.length < 2) {
          return extra.reply('❌ *Need 2 players!*\n\nUse .ttt join to join the game.');
        }
        
        // Validate game is not over
        if (game.gameOver) {
          return extra.reply('❌ *Game is already over!*\n\nStart a new game with .ttt new');
        }
        
        // Validate it's player's turn
        if (sender !== game.currentTurn) {
          const currentPlayer = game.currentTurn.split('@')[0];
          return extra.reply(`⏳ *It's @${currentPlayer}'s turn!*\n\nPlease wait.`,
            { mentions: [game.currentTurn] }
          );
        }
        
        // Validate position
        if (isNaN(position) || position < 1 || position > 9) {
          return extra.reply('❌ *Invalid position!*\n\nUse numbers 1-9:\n' +
            '1️⃣ 2️⃣ 3️⃣\n4️⃣ 5️⃣ 6️⃣\n7️⃣ 8️⃣ 9️⃣');
        }
        
        // Convert position to board coordinates
        const row = Math.floor((position - 1) / 3);
        const col = (position - 1) % 3;
        
        // Check if position is already taken
        if (game.board[row][col] !== '') {
          return extra.reply('❌ *That position is already taken!*\n\nChoose another number.');
        }
        
        // Determine player symbol
        const playerIndex = game.players.indexOf(sender);
        const symbol = playerIndex === 0 ? '❌' : '⭕';
        
        // Make move
        game.board[row][col] = symbol;
        game.moves++;
        
        // Check for win
        const winner = checkWinner(game.board);
        
        if (winner) {
          game.gameOver = true;
          game.winner = sender;
          activeGames.delete(chatId);
          
          return extra.reply(`🎉 *WE HAVE A WINNER!* 🎉\n\n` +
            `🏆 *Winner:* @${sender.split('@')[0]} (${symbol})\n\n` +
            `*Final Board:*\n${renderBoard(game.board)}\n\n` +
            `🎮 *Game Over!*\n\n` +
            `Play again with: .ttt new`,
            { mentions: [sender] }
          );
        }
        
        // Check for draw
        if (game.moves === 9) {
          game.gameOver = true;
          activeGames.delete(chatId);
          
          return extra.reply(`🤝 *IT'S A DRAW!* 🤝\n\n` +
            `*Final Board:*\n${renderBoard(game.board)}\n\n` +
            `🎮 *Game Over!*\n\n` +
            `Play again with: .ttt new`,
            { mentions: game.players }
          );
        }
        
        // Switch turn
        game.currentTurn = game.players.find(p => p !== sender);
        activeGames.set(chatId, game);
        
        return extra.reply(`✅ *Move made!*\n\n` +
          `*Board:*\n${renderBoard(game.board)}\n\n` +
          `⏳ *Next turn:* @${game.currentTurn.split('@')[0]} (${playerIndex === 0 ? '⭕' : '❌'})\n\n` +
          `*Make your move:* .ttt play <1-9>`,
          { mentions: [sender, game.currentTurn] }
        );
      }
      
      // Handle: .ttt board
      if (subCmd === 'board') {
        if (game.players.length === 0) {
          return extra.reply('❌ *No active game!*\n\nStart one with .ttt new');
        }
        
        let status = '';
        if (game.gameOver) {
          status = '🏁 *Game Over*';
        } else if (game.players.length < 2) {
          status = '⏳ *Waiting for player 2*';
        } else {
          status = `⏳ *${game.currentTurn.split('@')[0]}'s turn*`;
        }
        
        return extra.reply(`📋 *Game Status*\n\n` +
          `👤 *Player 1 (❌):* @${game.players[0]?.split('@')[0] || 'None'}\n` +
          `👤 *Player 2 (⭕):* @${game.players[1]?.split('@')[0] || 'None'}\n` +
          `📊 *Moves:* ${game.moves}/9\n` +
          `📍 *Status:* ${status}\n\n` +
          `*Board:*\n${renderBoard(game.board)}\n\n` +
          `*Positions:*\n1️⃣ 2️⃣ 3️⃣\n4️⃣ 5️⃣ 6️⃣\n7️⃣ 8️⃣ 9️⃣`,
          { mentions: game.players.filter(p => p) }
        );
      }
      
      // Handle: .ttt quit
      if (subCmd === 'quit' || subCmd === 'end') {
        if (game.players.length === 0) {
          return extra.reply('❌ *No active game to quit!*');
        }
        
        activeGames.delete(chatId);
        return extra.reply('✅ *Game ended!*\n\nStart a new game with .ttt new');
      }
      
      extra.reply('❌ *Invalid command!*\n\nUse .ttt for help');
      
    } catch (error) {
      console.error('TicTacToe error:', error);
      extra.reply(`❌ Error: ${error.message}`);
    }
  }
};

// Helper function to render board
function renderBoard(board) {
  const symbols = {
    '❌': '❌',
    '⭕': '⭕',
    '': '⬜'
  };
  
  let output = '';
  for (let i = 0; i < 3; i++) {
    let row = '';
    for (let j = 0; j < 3; j++) {
      row += symbols[board[i][j] || ''] + ' ';
    }
    output += row.trim() + '\n';
  }
  return output;
}

// Helper function to check winner
function checkWinner(board) {
  const lines = [
    // Rows
    [[0,0], [0,1], [0,2]],
    [[1,0], [1,1], [1,2]],
    [[2,0], [2,1], [2,2]],
    // Columns
    [[0,0], [1,0], [2,0]],
    [[0,1], [1,1], [2,1]],
    [[0,2], [1,2], [2,2]],
    // Diagonals
    [[0,0], [1,1], [2,2]],
    [[0,2], [1,1], [2,0]]
  ];
  
  for (const line of lines) {
    const [a, b, c] = line;
    if (board[a[0]][a[1]] && 
        board[a[0]][a[1]] === board[b[0]][b[1]] && 
        board[a[0]][a[1]] === board[c[0]][c[1]]) {
      return board[a[0]][a[1]];
    }
  }
  
  return null;
}