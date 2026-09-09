import express from 'express';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { Card, Dealer, OutcomeType, Player, PlayerStatus, RoomState, RoomSummary, RoundPhase, TableChatMessage } from './src/types';
import { calculateHandScore, createDeck } from './src/utils/blackjack';
import { generateUniqueBot, BOT_CHAT_GREETINGS, BOT_WIN_REACTIONS, BOT_BUST_REACTIONS } from './src/utils/botGenerator';

const app = express();

// Enable CORS for all origins (supports GitHub Pages, Vercel, Netlify, etc.)
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

const httpServer = createServer(app);
const PORT = 3000;

const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

interface RoomInternal {
  roomId: string;
  name?: string;
  isPublic?: boolean;
  hostId: string;
  phase: RoundPhase;
  players: Player[];
  activePlayerId: string | null;
  dealer: Dealer;
  shoe: Card[];
  roundNumber: number;
  messages: TableChatMessage[];
  turnTimeout: number;
  turnStartTime?: number;
  turnTimer?: NodeJS.Timeout;
  dealerTimer?: NodeJS.Timeout;
  autoNextTimer?: NodeJS.Timeout;
}

const rooms = new Map<string, RoomInternal>();

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

function initPublicRooms() {
  const publicConfigs = [
    { id: 'ROYALE', name: '🎰 Mesa Cassino Royale #1' },
    { id: 'VEGAS', name: '💎 Mesa Las Vegas VIP #2' },
    { id: 'MONTE', name: '🏆 Mesa High Rollers #3' }
  ];

  for (const cfg of publicConfigs) {
    if (!rooms.has(cfg.id)) {
      const room: RoomInternal = {
        roomId: cfg.id,
        name: cfg.name,
        isPublic: true,
        hostId: 'dealer-host',
        phase: 'betting',
        players: [],
        activePlayerId: null,
        dealer: {
          cards: [],
          score: 0,
          isBust: false,
          isBlackjack: false,
          statusText: 'Façam suas apostas na mesa'
        },
        shoe: createDeck(),
        roundNumber: 1,
        messages: [{
          id: `sys-${Date.now()}`,
          senderName: 'Dealer VIP',
          text: `Bem-vindo à ${cfg.name}! Esta é uma mesa pública multiplayer ao vivo. Escolha um assento livre para jogar com outros participantes!`,
          timestamp: Date.now(),
          isSystem: true
        }],
        turnTimeout: 20
      };

      // Populate 2 friendly bots so players have immediate casino atmosphere while waiting for other humans
      const bot1 = generateUniqueBot(1, []);
      bot1.status = 'ready';
      const bot2 = generateUniqueBot(5, [bot1.id]);
      bot2.status = 'ready';
      room.players = [bot1, bot2];

      rooms.set(cfg.id, room);
    }
  }
}

// Initialize on module load
initPublicRooms();

function getRoomsSummary(): RoomSummary[] {
  initPublicRooms();
  const summaries: RoomSummary[] = [];
  for (const room of rooms.values()) {
    const seatedCount = room.players.filter(p => !p.isSpectator).length;
    const spectatorCount = room.players.filter(p => p.isSpectator).length;
    summaries.push({
      roomId: room.roomId,
      name: room.name || `Mesa VIP #${room.roomId}`,
      isPublic: !!room.isPublic,
      totalPlayers: room.players.length,
      seatedCount,
      spectatorCount,
      maxSeats: 9,
      phase: room.phase,
      roundNumber: room.roundNumber
    });
  }
  return summaries;
}

function broadcastRoomsList() {
  io.emit('rooms:list', getRoomsSummary());
}

function getSafeRoomState(room: RoomInternal): RoomState {
  return {
    roomId: room.roomId,
    name: room.name,
    isPublic: room.isPublic,
    hostId: room.hostId,
    phase: room.phase,
    players: room.players,
    activePlayerId: room.activePlayerId,
    dealer: room.dealer,
    deckRemaining: room.shoe.length,
    roundNumber: room.roundNumber,
    messages: room.messages,
    turnTimeout: room.turnTimeout,
    turnStartTime: room.turnStartTime
  };
}

function broadcastRoom(roomId: string) {
  const room = rooms.get(roomId);
  if (!room) return;
  io.to(roomId).emit('room:state', getSafeRoomState(room));
  broadcastRoomsList();
}

function drawCard(room: RoomInternal, hidden: boolean = false): Card {
  if (room.shoe.length < 15) {
    room.shoe = createDeck();
  }
  const card = room.shoe.pop()!;
  return { ...card, hidden };
}

function clearTurnTimer(room: RoomInternal) {
  if (room.turnTimer) {
    clearTimeout(room.turnTimer);
    room.turnTimer = undefined;
  }
  room.turnStartTime = undefined;
}

function startTurnTimer(room: RoomInternal, playerId: string) {
  clearTurnTimer(room);
  room.turnTimeout = 15;
  room.turnStartTime = Date.now();

  room.turnTimer = setTimeout(() => {
    const player = room.players.find(p => p.id === playerId);
    if (player && player.status === 'playing') {
      player.status = 'stand';
      const score = calculateHandScore(player.cards);
      io.to(room.roomId).emit('game:event', {
        type: 'stand',
        message: `${player.name} excedeu o tempo limite de 15 segundos e parou automaticamente com ${score.total} pontos!`
      });
      advanceTurn(room);
    }
  }, 15000);
}

function advanceTurn(room: RoomInternal) {
  clearTurnTimer(room);

  const activePlayers = room.players
    .filter(p => p.currentBet > 0)
    .sort((a, b) => (a.seatIndex ?? 0) - (b.seatIndex ?? 0));
  const currentIndex = activePlayers.findIndex(p => p.id === room.activePlayerId);

  // Find next player who still needs to play
  let nextPlayer: Player | null = null;
  for (let i = currentIndex + 1; i < activePlayers.length; i++) {
    const p = activePlayers[i];
    if (p.status === 'playing' || p.status === 'ready') {
      nextPlayer = p;
      break;
    }
  }

  if (nextPlayer) {
    room.activePlayerId = nextPlayer.id;
    nextPlayer.status = 'playing';

    // Check if next player already has natural blackjack
    const score = calculateHandScore(nextPlayer.cards);
    if (score.isBlackjack) {
      nextPlayer.status = 'blackjack';
      io.to(room.roomId).emit('game:event', {
        type: 'blackjack',
        message: `${nextPlayer.name} tem Blackjack natural (21)!`
      });
      // Immediately advance to next
      advanceTurn(room);
      return;
    }

    startTurnTimer(room, nextPlayer.id);
    broadcastRoom(room.roomId);

    // If next player is a bot, trigger their turn logic
    if (nextPlayer.isBot) {
      setTimeout(() => runServerBotTurn(room, nextPlayer!), 900);
    }

  } else {
    // All player turns are done -> Dealer turn
    room.activePlayerId = null;
    startDealerTurn(room);
  }
}

// Basic bot logic for the server side
function runServerBotTurn(room: RoomInternal, bot: Player) {
  if (room.phase !== 'player_turns' || room.activePlayerId !== bot.id || bot.status !== 'playing') return;

  const dealerVisibleCard = room.dealer.cards[0];
  const dealerUpVal = dealerVisibleCard 
    ? (dealerVisibleCard.rank === 'A' ? 11 : ['K','Q','J','10'].includes(dealerVisibleCard.rank) ? 10 : parseInt(dealerVisibleCard.rank, 10)) 
    : 10;

  const botScore = calculateHandScore(bot.cards);

  // Can bot double down? (2 cards, 9, 10 or 11 against dealer weak card)
  if (bot.cards.length === 2 && bot.chips >= bot.currentBet) {
    const isGoodDouble = (botScore.total === 11) || 
                         (botScore.total === 10 && dealerUpVal <= 9) || 
                         (botScore.total === 9 && dealerUpVal >= 3 && dealerUpVal <= 6 && (bot.botPersonality === 'aggressive' || bot.botPersonality === 'high_roller'));
    if (isGoodDouble) {
      bot.chips -= bot.currentBet;
      bot.currentBet *= 2;
      bot.status = 'doubled';
      const card = drawCard(room, false);
      bot.cards.push(card);
      
      const newScore = calculateHandScore(bot.cards);
      io.to(room.roomId).emit('game:event', {
        type: 'hit',
        message: `🤖 ${bot.name} dobrou a aposta e recebeu ${card.rank}${card.suit}`
      });

      if (newScore.isBust) {
        bot.status = 'busted';
        bot.outcome = 'bust';
        io.to(room.roomId).emit('game:event', {
          type: 'bust',
          message: `🤖 ${bot.name} dobrou e estourou com ${newScore.total}!`
        });
      }
      
      broadcastRoom(room.roomId);
      setTimeout(() => advanceTurn(room), 1000);
      return;
    }
  }

  // Strategy decision
  let shouldHit = false;

  if (botScore.isBust) {
    bot.status = 'busted';
    bot.outcome = 'bust';
    advanceTurn(room);
    return;
  }

  if (botScore.total >= 17 && !botScore.isSoft) {
    shouldHit = false;
  } else if (botScore.total <= 11) {
    shouldHit = true;
  } else if (botScore.total >= 12 && botScore.total <= 16) {
    if (botScore.isSoft) {
      shouldHit = true;
    } else {
      if (bot.botPersonality === 'aggressive' && botScore.total === 16 && dealerUpVal >= 7) {
        shouldHit = true;
      } else if (bot.botPersonality === 'conservative' && botScore.total >= 13) {
        shouldHit = dealerUpVal >= 8;
      } else {
        shouldHit = dealerUpVal >= 7;
      }
    }
  } else if (botScore.isSoft && botScore.total === 17) {
    shouldHit = true;
  } else {
    shouldHit = false;
  }

  if (shouldHit) {
    const card = drawCard(room, false);
    bot.cards.push(card);
    const newScore = calculateHandScore(bot.cards);

    io.to(room.roomId).emit('game:event', {
      type: 'hit',
      message: `🤖 ${bot.name} pediu carta e recebeu ${card.rank}${card.suit}`
    });
    
    broadcastRoom(room.roomId);

    if (newScore.isBust) {
      bot.status = 'busted';
      bot.outcome = 'bust';
      io.to(room.roomId).emit('game:event', {
        type: 'bust',
        message: `🤖 ${bot.name} estourou com ${newScore.total} pontos!`
      });
      setTimeout(() => advanceTurn(room), 1000);
    } else if (newScore.total === 21) {
      bot.status = 'stand';
      io.to(room.roomId).emit('game:event', {
        type: 'stand',
        message: `🤖 ${bot.name} atingiu 21 e parou.`
      });
      setTimeout(() => advanceTurn(room), 800);
    } else {
      setTimeout(() => runServerBotTurn(room, bot), 900);
    }
  } else {
    bot.status = 'stand';
    io.to(room.roomId).emit('game:event', {
      type: 'stand',
      message: `🤖 ${bot.name} parou com ${botScore.total} pontos.`
    });
    broadcastRoom(room.roomId);
    setTimeout(() => advanceTurn(room), 700);
  }
}

function startDealerTurn(room: RoomInternal) {
  room.phase = 'dealer_turn';
  room.dealer.statusText = 'Dealer virando a carta...';
  broadcastRoom(room.roomId);

  io.to(room.roomId).emit('game:event', {
    type: 'dealer_flip',
    message: 'Dealer virando carta oculta...'
  });

  room.dealerTimer = setTimeout(() => {
    // Reveal dealer's hole card
    room.dealer.cards = room.dealer.cards.map(c => ({ ...c, hidden: false }));
    const initialScore = calculateHandScore(room.dealer.cards);
    room.dealer.score = initialScore.total;
    room.dealer.isBlackjack = initialScore.isBlackjack;
    room.dealer.isBust = initialScore.isBust;
    room.dealer.statusText = `Mesa revelou: ${initialScore.total} pontos`;

    broadcastRoom(room.roomId);

    // Check if all players busted
    const playersWithBets = room.players.filter(p => p.currentBet > 0);
    const allBusted = playersWithBets.every(p => p.status === 'busted');

    if (allBusted) {
      setTimeout(() => {
        finishRound(room, 'Todos os jogadores estouraram. Dealer vence!');
      }, 1000);
      return;
    }

    // Dealer drawing routine (Standard Blackjack: Dealer draws to 16, stands on 17)
    const runDealerDraw = () => {
      const currentScore = calculateHandScore(room.dealer.cards);
      room.dealer.score = currentScore.total;

      if (currentScore.total < 17) {
        // Announce dealer preparing to turn next card
        room.dealer.statusText = 'Dealer virando próxima carta...';
        broadcastRoom(room.roomId);

        io.to(room.roomId).emit('game:event', {
          type: 'dealer_flip',
          message: 'Dealer virando próxima carta...'
        });

        room.dealerTimer = setTimeout(() => {
          // Draw a card
          const newCard = drawCard(room, false);
          room.dealer.cards.push(newCard);
          const updated = calculateHandScore(room.dealer.cards);
          room.dealer.score = updated.total;
          room.dealer.isBust = updated.isBust;
          room.dealer.statusText = `Mesa comprou ${newCard.rank}${newCard.suit} (Total: ${updated.total})`;

          io.to(room.roomId).emit('game:event', {
            type: 'dealer_hit',
            message: `Mesa comprou ${newCard.rank}${newCard.suit}`
          });

          broadcastRoom(room.roomId);

          // Continue drawing after delay to appreciate the card animation
          room.dealerTimer = setTimeout(runDealerDraw, 1300);
        }, 750);
      } else {
        // Dealer stands or busted
        if (currentScore.isBust) {
          room.dealer.isBust = true;
          room.dealer.statusText = `Mesa estourou com ${currentScore.total}!`;
        } else {
          room.dealer.statusText = `Mesa parou com ${currentScore.total}.`;
        }
        broadcastRoom(room.roomId);
        setTimeout(() => {
          finishRound(room);
        }, 900);
      }
    };

    room.dealerTimer = setTimeout(runDealerDraw, 1200);
  }, 600);
}

function startNewRoundInternal(room: RoomInternal) {
  if (room.phase !== 'round_over') return;

  if (room.dealerTimer) {
    clearTimeout(room.dealerTimer);
    room.dealerTimer = undefined;
  }
  if (room.autoNextTimer) {
    clearTimeout(room.autoNextTimer);
    room.autoNextTimer = undefined;
  }

  room.phase = 'betting';
  room.roundNumber += 1;
  room.activePlayerId = null;
  room.dealer = {
    cards: [],
    score: 0,
    isBust: false,
    isBlackjack: false,
    statusText: 'Aguardando apostas para a nova rodada...'
  };

  room.players.forEach(p => {
    if (p.isSpectator) {
      p.status = 'spectator';
      p.cards = [];
      p.currentBet = 0;
      return;
    }
    p.cards = [];
    p.outcome = null;
    p.payout = 0;
    p.isReady = false;

    // Recharge chips if zero
    if (p.chips <= 0) {
      p.chips = 500;
      room.messages.push({
        id: `sys-${Date.now()}-${p.id}`,
        senderName: 'Mesa',
        text: `${p.name} recebeu recarga de fichas do cassino!`,
        timestamp: Date.now(),
        isSystem: true
      });
    }

    if (p.isBot) {
      p.currentBet = Math.min(p.chips, [25, 50, 100][Math.floor(Math.random() * 3)]);
      p.isReady = true;
      p.status = 'ready';
    } else {
      p.currentBet = Math.min(p.currentBet, p.chips);
      p.status = 'betting';
    }
  });

  broadcastRoom(room.roomId);
}

function finishRound(room: RoomInternal, customSummary?: string) {
  room.phase = 'round_over';
  const dealerScore = calculateHandScore(room.dealer.cards);

  let winCount = 0;

  room.players.forEach(player => {
    if (player.currentBet === 0) return;

    const playerScore = calculateHandScore(player.cards);
    let outcome: OutcomeType = null;
    let payout = 0;

    if (player.status === 'busted' || playerScore.isBust) {
      outcome = 'bust';
      payout = 0;
    } else if (playerScore.isBlackjack) {
      if (dealerScore.isBlackjack) {
        outcome = 'push';
        payout = player.currentBet;
      } else {
        outcome = 'blackjack';
        // Blackjack pays 3:2 (bet * 2.5)
        payout = Math.floor(player.currentBet * 2.5);
        winCount++;
      }
    } else if (dealerScore.isBlackjack) {
      outcome = 'lose';
      payout = 0;
    } else if (dealerScore.isBust) {
      outcome = 'win';
      payout = player.currentBet * 2;
      winCount++;
    } else {
      if (playerScore.total > dealerScore.total) {
        outcome = 'win';
        payout = player.currentBet * 2;
        winCount++;
      } else if (playerScore.total < dealerScore.total) {
        outcome = 'lose';
        payout = 0;
      } else {
        outcome = 'push';
        payout = player.currentBet;
      }
    }

    player.outcome = outcome;
    player.payout = payout;
    player.chips = Math.min(250000, player.chips + payout);
    
    if (outcome === 'win' || outcome === 'blackjack') {
      player.wins = (player.wins || 0) + 1;
      
      // Bot winning reactions
      if (player.isBot && Math.random() < 0.4) {
        const winReaction = BOT_WIN_REACTIONS[Math.floor(Math.random() * BOT_WIN_REACTIONS.length)];
        room.messages.push({
          id: `bot-react-${Date.now()}-${Math.random()}`,
          senderName: player.name,
          text: winReaction,
          timestamp: Date.now(),
        });
      }
    } else if (outcome === 'bust' || outcome === 'lose') {
      // Bot losing reactions
      if (player.isBot && Math.random() < 0.25) {
        const bustReaction = BOT_BUST_REACTIONS[Math.floor(Math.random() * BOT_BUST_REACTIONS.length)];
        room.messages.push({
          id: `bot-react-${Date.now()}-${Math.random()}`,
          senderName: player.name,
          text: bustReaction,
          timestamp: Date.now(),
        });
      }
    }
  });

  const summary = customSummary || (
    dealerScore.isBust 
      ? 'A Mesa estourou! Pagando apostas aos jogadores ativos.' 
      : `Rodada finalizada. Mesa terminou com ${dealerScore.total} pontos.`
  );

  io.to(room.roomId).emit('game:event', {
    type: 'round_end',
    message: summary
  });

  broadcastRoom(room.roomId);

  // In public rooms, auto-restart round after 6s so action is continuous
  if (room.isPublic) {
    if (room.autoNextTimer) clearTimeout(room.autoNextTimer);
    room.autoNextTimer = setTimeout(() => {
      const curr = rooms.get(room.roomId);
      if (curr && curr.phase === 'round_over') {
        startNewRoundInternal(curr);
      }
    }, 6000);
  }
}

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', activeRooms: rooms.size });
});

// Socket connection
io.on('connection', (socket: Socket) => {
  let currentRoomId: string | null = null;
  let playerRefId = socket.id;

  // Send initial room list on connection
  socket.emit('rooms:list', getRoomsSummary());

  socket.on('rooms:get_list', () => {
    socket.emit('rooms:list', getRoomsSummary());
  });

  // Quick Play - auto join active public table with free seat
  socket.on('rooms:quick_play', ({ playerName, wins, chips, avatarUrl }, callback) => {
    initPublicRooms();
    const publicRooms = Array.from(rooms.values()).filter(r => r.isPublic);
    publicRooms.sort((a, b) => {
      const aSeated = a.players.filter(p => !p.isSpectator).length;
      const bSeated = b.players.filter(p => !p.isSpectator).length;
      return bSeated - aSeated;
    });

    const target = publicRooms.find(r => r.players.filter(p => !p.isSpectator).length < 9) || publicRooms[0];
    if (!target) {
      callback?.({ success: false, error: 'Nenhuma mesa disponível no momento.' });
      return;
    }

    joinRoomInternal(target.roomId, playerName, wins, chips, avatarUrl, callback);
  });

  // Create room
  socket.on('room:create', ({ playerName, wins, chips, avatarUrl }, callback) => {
    const roomId = generateRoomCode();
    currentRoomId = roomId;

    const newPlayer: Player = {
      id: socket.id,
      name: playerName.trim() || 'Jogador 1',
      chips: typeof chips === 'number' ? Math.min(250000, chips) : 500,
      currentBet: 0,
      cards: [],
      status: 'betting',
      outcome: null,
      payout: 0,
      isHost: true,
      isReady: false,
      seatIndex: 0, // Seat 1
      isSpectator: false,
      debts: {},
      wins: typeof wins === 'number' ? wins : 0,
      avatarUrl: typeof avatarUrl === 'string' ? avatarUrl : undefined
    };

    const newRoom: RoomInternal = {
      roomId,
      hostId: socket.id,
      phase: 'betting',
      players: [newPlayer],
      activePlayerId: null,
      dealer: {
        cards: [],
        score: 0,
        isBust: false,
        isBlackjack: false,
        statusText: 'Aguardando apostas...'
      },
      shoe: createDeck(),
      roundNumber: 1,
      messages: [{
        id: `sys-${Date.now()}`,
        senderName: 'Mesa',
        text: `Mesa VIP criada com código ${roomId}! Compartilhe este código com seus amigos para jogarem juntos.`,
        timestamp: Date.now(),
        isSystem: true
      }],
      turnTimeout: 30
    };

    rooms.set(roomId, newRoom);
    socket.join(roomId);
    callback({ success: true, roomId });
    broadcastRoom(roomId);
  });

  function joinRoomInternal(roomId: string, playerName: string, wins?: number, chips?: number, avatarUrl?: string, callback?: Function) {
    const upperId = roomId.trim().toUpperCase();
    const room = rooms.get(upperId);

    if (!room) {
      callback?.({ success: false, error: 'Sala não encontrada. Verifique se o código está correto e se o host continua com a mesa aberta.' });
      return;
    }

    currentRoomId = upperId;
    socket.join(upperId);

    let existing = room.players.find(p => p.id === socket.id);
    if (!existing) {
      // Find the first available seat (0 to 8)
      const occupiedSeats = new Set(room.players.filter(p => !p.isSpectator).map(p => p.seatIndex));
      let availableSeat = -1;
      for (let s = 0; s < 9; s++) {
        if (!occupiedSeats.has(s)) {
          availableSeat = s;
          break;
        }
      }

      const isSeated = availableSeat !== -1;

      const newPlayer: Player = {
        id: socket.id,
        name: playerName.trim() || `Jogador ${room.players.length + 1}`,
        chips: typeof chips === 'number' && chips > 0 ? Math.min(250000, chips) : 500,
        currentBet: 0,
        cards: [],
        status: isSeated ? (room.phase === 'betting' ? 'betting' : 'waiting') : 'spectator',
        outcome: null,
        payout: 0,
        isHost: room.players.filter(p => !p.isBot).length === 0,
        isReady: false,
        seatIndex: availableSeat,
        isSpectator: !isSeated,
        debts: {},
        wins: typeof wins === 'number' ? wins : 0,
        avatarUrl: typeof avatarUrl === 'string' ? avatarUrl : undefined
      };

      room.players.push(newPlayer);

      room.messages.push({
        id: `sys-${Date.now()}`,
        senderName: 'Mesa',
        text: isSeated
          ? `🎉 ${newPlayer.name} entrou e sentou no Assento ${availableSeat + 1}!`
          : `${newPlayer.name} entrou na sala como espectador (todos os 9 assentos estão ocupados).`,
        timestamp: Date.now(),
        isSystem: true
      });
    } else {
      existing.name = playerName.trim() || existing.name;
      if (typeof avatarUrl === 'string') existing.avatarUrl = avatarUrl;
    }

    callback?.({ success: true, roomId: upperId });
    broadcastRoom(upperId);
  }

  // Join room - Always enters as spectator initially as requested
  socket.on('room:join', ({ roomId, playerName, wins, chips, avatarUrl }, callback) => {
    joinRoomInternal(roomId, playerName, wins, chips, avatarUrl, callback);
  });

  // Take a seat or change seat
  socket.on('player:take_seat', ({ seatIndex }, callback) => {
    if (!currentRoomId) return;
    const room = rooms.get(currentRoomId);
    if (!room) return;

    if (typeof seatIndex !== 'number' || seatIndex < 0 || seatIndex >= 9) {
      callback?.({ success: false, error: 'Assento inválido (escolha de 1 a 9).' });
      return;
    }

    // Check if seat is occupied by another seated player
    const occupiedIndex = room.players.findIndex(p => !p.isSpectator && p.seatIndex === seatIndex && p.id !== socket.id);
    if (occupiedIndex !== -1) {
      const occupant = room.players[occupiedIndex];
      if (occupant.isBot) {
        // Human player takes precedence over bot!
        occupant.isSpectator = true;
        occupant.seatIndex = -1;
        occupant.status = 'spectator';
        occupant.isReady = false;
        room.messages.push({
          id: `sys-${Date.now()}`,
          senderName: 'Mesa',
          text: `🤖 ${occupant.name} cedeu o Assento ${seatIndex + 1} para o jogador real!`,
          timestamp: Date.now(),
          isSystem: true
        });
      } else {
        callback?.({ success: false, error: `O Assento ${seatIndex + 1} já está ocupado.` });
        return;
      }
    }

    const player = room.players.find(p => p.id === socket.id);
    if (!player) return;

    if (player.status === 'playing') {
      callback?.({ success: false, error: 'Termine a sua jogada antes de trocar de assento.' });
      return;
    }

    const prevSeat = player.seatIndex;
    player.isSpectator = false;
    player.seatIndex = seatIndex;
    player.status = room.phase === 'betting' ? 'betting' : 'waiting';
    player.isReady = false;
    player.currentBet = 0;

    room.messages.push({
      id: `sys-${Date.now()}`,
      senderName: 'Mesa',
      text: prevSeat >= 0 && prevSeat !== seatIndex
        ? `${player.name} mudou para o Assento ${seatIndex + 1}.`
        : `${player.name} sentou no Assento ${seatIndex + 1}!`,
      timestamp: Date.now(),
      isSystem: true
    });

    callback?.({ success: true, seatIndex });
    broadcastRoom(currentRoomId);
    checkStartDeal(room);
  });

  // Stand up to spectator mode
  socket.on('player:stand_up', (callback) => {
    if (!currentRoomId) return;
    const room = rooms.get(currentRoomId);
    if (!room) return;

    const player = room.players.find(p => p.id === socket.id);
    if (!player || player.isSpectator) return;

    if (player.status === 'playing') {
      callback?.({ success: false, error: 'Termine sua rodada antes de se levantar.' });
      return;
    }

    // Refund bet if in betting phase
    if (room.phase === 'betting' && player.currentBet > 0) {
      player.chips += player.currentBet;
      player.currentBet = 0;
    }

    const prevSeat = player.seatIndex;
    player.isSpectator = true;
    player.seatIndex = -1;
    player.status = 'spectator';
    player.isReady = false;
    player.cards = [];

    room.messages.push({
      id: `sys-${Date.now()}`,
      senderName: 'Mesa',
      text: `${player.name} levantou do Assento ${prevSeat + 1} e agora está assistindo como espectador.`,
      timestamp: Date.now(),
      isSystem: true
    });

    callback?.({ success: true });
    broadcastRoom(currentRoomId);
    checkStartDeal(room);
  });

  // Update name
  socket.on('player:update_name', ({ name }) => {
    if (!currentRoomId) return;
    const room = rooms.get(currentRoomId);
    if (!room) return;

    const player = room.players.find(p => p.id === socket.id);
    if (player && name.trim()) {
      const oldName = player.name;
      player.name = name.trim().slice(0, 18);
      room.messages.push({
        id: `sys-${Date.now()}`,
        senderName: 'Mesa',
        text: `${oldName} mudou o nome para ${player.name}.`,
        timestamp: Date.now(),
        isSystem: true
      });
      broadcastRoom(currentRoomId);
    }
  });

  // Update profile (name and avatarUrl)
  socket.on('player:update_profile', ({ name, avatarUrl }) => {
    if (!currentRoomId) return;
    const room = rooms.get(currentRoomId);
    if (!room) return;

    const player = room.players.find(p => p.id === socket.id);
    if (player) {
      let changed = false;
      if (name && name.trim()) {
        const trimmedName = name.trim().slice(0, 18);
        if (player.name !== trimmedName) {
          const oldName = player.name;
          player.name = trimmedName;
          room.messages.push({
            id: `sys-${Date.now()}`,
            senderName: 'Mesa',
            text: `${oldName} alterou o perfil de jogador para ${player.name}.`,
            timestamp: Date.now(),
            isSystem: true
          });
          changed = true;
        }
      }
      if (typeof avatarUrl === 'string') {
        player.avatarUrl = avatarUrl;
        changed = true;
      }
      if (changed) {
        broadcastRoom(currentRoomId);
      }
    }
  });

  // Bet amount
  socket.on('player:bet', ({ amount }) => {
    if (!currentRoomId) return;
    const room = rooms.get(currentRoomId);
    if (!room || room.phase !== 'betting') return;

    const player = room.players.find(p => p.id === socket.id);
    if (player && !player.isSpectator) {
      const validAmount = Math.max(0, Math.min(amount, player.chips));
      player.currentBet = validAmount;
      broadcastRoom(currentRoomId);
    }
  });

  function checkStartDeal(room: RoomInternal) {
    if (room.phase !== 'betting') return;
    const seatedPlayers = room.players.filter(p => !p.isSpectator);
    const allReady = seatedPlayers.every(p => p.isReady || p.chips === 0);
    if (allReady && seatedPlayers.some(p => p.isReady)) {
      startGameDeal(room);
    }
  }

  // Player ready / place bet
  socket.on('player:ready', () => {
    if (!currentRoomId) return;
    const room = rooms.get(currentRoomId);
    if (!room || room.phase !== 'betting') return;

    const player = room.players.find(p => p.id === socket.id);
    if (player && !player.isSpectator && player.currentBet > 0 && player.currentBet <= player.chips) {
      player.isReady = !player.isReady;
      player.status = player.isReady ? 'ready' : 'betting';
      broadcastRoom(currentRoomId);
      checkStartDeal(room);
    }
  });

  // Host starts deal manually
  socket.on('game:start_deal', () => {
    if (!currentRoomId) return;
    const room = rooms.get(currentRoomId);
    if (!room || room.phase !== 'betting') return;

    const player = room.players.find(p => p.id === socket.id);
    if (player && player.isHost) {
      const seatedPlayers = room.players.filter(p => !p.isSpectator);
      const allReady = seatedPlayers.every(p => p.isReady || p.chips === 0);
      
      if (!allReady) {
        socket.emit('room:error', { message: 'Todos os jogadores na mesa precisam confirmar sua aposta (clicar em Pronto) para começar!' });
        return;
      }
      
      startGameDeal(room);
    }
  });

  function startGameDeal(room: RoomInternal) {
    const readyPlayers = room.players
      .filter(p => !p.isSpectator && p.isReady && p.currentBet > 0)
      .sort((a, b) => (a.seatIndex ?? 0) - (b.seatIndex ?? 0));
    if (readyPlayers.length === 0) return;

    room.phase = 'dealing';

    // Deduct bets from players
    readyPlayers.forEach(p => {
      p.chips -= p.currentBet;
      p.cards = [];
      p.outcome = null;
      p.payout = 0;
      p.status = 'playing';
    });

    room.dealer.cards = [];
    room.dealer.score = 0;
    room.dealer.isBust = false;
    room.dealer.isBlackjack = false;
    room.dealer.statusText = 'Distribuindo as cartas...';

    broadcastRoom(room.roomId);

    // Deal sequence: Card 1 to each player, Card 1 to dealer (hidden), Card 2 to each player, Card 2 to dealer (face up)
    setTimeout(() => {
      // Round 1
      readyPlayers.forEach(p => {
        p.cards.push(drawCard(room, false));
      });
      // Dealer hole card (hidden)
      room.dealer.cards.push(drawCard(room, true));

      broadcastRoom(room.roomId);

      setTimeout(() => {
        // Round 2
        readyPlayers.forEach(p => {
          p.cards.push(drawCard(room, false));
        });
        // Dealer face up card
        const dealerUpCard = drawCard(room, false);
        room.dealer.cards.push(dealerUpCard);
        room.dealer.score = calculateHandScore([dealerUpCard]).total;
        room.dealer.statusText = `Mesa mostrando ${dealerUpCard.rank}${dealerUpCard.suit}`;

        // Check for naturals
        readyPlayers.forEach(p => {
          const score = calculateHandScore(p.cards);
          if (score.isBlackjack) {
            p.status = 'blackjack';
            io.to(room.roomId).emit('game:event', {
              type: 'blackjack',
              message: `${p.name} conseguiu Blackjack!`
            });
          }
        });

        // Set active player
        room.phase = 'player_turns';
        const firstActive = readyPlayers.find(p => p.status === 'playing');
        if (firstActive) {
          room.activePlayerId = firstActive.id;
          startTurnTimer(room, firstActive.id);
          if (firstActive.isBot) {
            setTimeout(() => runServerBotTurn(room, firstActive!), 900);
          }
        } else {
          // All ready players had Blackjack
          room.activePlayerId = null;
          startDealerTurn(room);
          return;
        }

        io.to(room.roomId).emit('game:event', {
          type: 'deal',
          message: 'Cartas distribuídas na mesa.'
        });

        broadcastRoom(room.roomId);
      }, 700);
    }, 600);
  }

  // Hit
  socket.on('player:hit', () => {
    if (!currentRoomId) return;
    const room = rooms.get(currentRoomId);
    if (!room || room.phase !== 'player_turns' || room.activePlayerId !== socket.id) return;

    const player = room.players.find(p => p.id === socket.id);
    if (!player || player.status !== 'playing') return;

    const card = drawCard(room, false);
    player.cards.push(card);

    const score = calculateHandScore(player.cards);

    io.to(room.roomId).emit('game:event', {
      type: 'hit',
      message: `${player.name} pediu carta: ${card.rank}${card.suit}`
    });

    if (score.isBust) {
      player.status = 'busted';
      io.to(room.roomId).emit('game:event', {
        type: 'bust',
        message: `${player.name} estourou com ${score.total} pontos!`
      });
      advanceTurn(room);
    } else if (score.total === 21) {
      player.status = 'stand';
      advanceTurn(room);
    } else {
      startTurnTimer(room, socket.id);
      broadcastRoom(currentRoomId);
    }
  });

  // Stand
  socket.on('player:stand', () => {
    if (!currentRoomId) return;
    const room = rooms.get(currentRoomId);
    if (!room || room.phase !== 'player_turns' || room.activePlayerId !== socket.id) return;

    const player = room.players.find(p => p.id === socket.id);
    if (!player || player.status !== 'playing') return;

    player.status = 'stand';
    const score = calculateHandScore(player.cards);
    io.to(room.roomId).emit('game:event', {
      type: 'stand',
      message: `${player.name} parou com ${score.total} pontos.`
    });

    advanceTurn(room);
  });

  // Double down
  socket.on('player:double', () => {
    if (!currentRoomId) return;
    const room = rooms.get(currentRoomId);
    if (!room || room.phase !== 'player_turns' || room.activePlayerId !== socket.id) return;

    const player = room.players.find(p => p.id === socket.id);
    if (!player || player.status !== 'playing' || player.cards.length !== 2) return;

    if (player.chips < player.currentBet) {
      socket.emit('room:error', { message: 'Fichas insuficientes para dobrar a aposta.' });
      return;
    }

    // Deduct additional bet
    player.chips -= player.currentBet;
    player.currentBet *= 2;

    const card = drawCard(room, false);
    player.cards.push(card);
    const score = calculateHandScore(player.cards);

    if (score.isBust) {
      player.status = 'busted';
      io.to(room.roomId).emit('game:event', {
        type: 'bust',
        message: `${player.name} dobrou e estourou com ${score.total}!`
      });
    } else {
      player.status = 'doubled';
      io.to(room.roomId).emit('game:event', {
        type: 'hit',
        message: `${player.name} dobrou a aposta e recebeu ${card.rank}${card.suit} (Total: ${score.total})`
      });
    }

    advanceTurn(room);
  });

  // New Round - Host in private or any seated player in public
  socket.on('game:new_round', () => {
    if (!currentRoomId) return;
    const room = rooms.get(currentRoomId);
    if (!room || room.phase !== 'round_over') return;

    const player = room.players.find(p => p.id === socket.id);
    if (!player) return;

    if (!room.isPublic && !player.isHost) {
      socket.emit('room:error', { message: 'Apenas o Criador da Sala pode iniciar a nova rodada!' });
      return;
    }

    startNewRoundInternal(room);
  });

  // Loan Request
  socket.on('loan:request', ({ targetPlayerId, amount }) => {
    if (!currentRoomId) return;
    const room = rooms.get(currentRoomId);
    if (!room) return;

    const requester = room.players.find(p => p.id === socket.id);
    const target = room.players.find(p => p.id === targetPlayerId);

    if (requester && target) {
      // Send notification to target
      io.to(target.id).emit('loan:requested', {
        requesterId: requester.id,
        requesterName: requester.name,
        amount
      });
      room.messages.push({
        id: `sys-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        senderName: 'Mesa',
        text: `${requester.name} pediu $${amount} emprestado para ${target.name}.`,
        timestamp: Date.now(),
        isSystem: true
      });
      io.to(currentRoomId).emit('chat:message', room.messages[room.messages.length - 1]);
    }
  });

  // Loan Respond
  socket.on('loan:respond', ({ requesterId, accept, amount }) => {
    if (!currentRoomId) return;
    const room = rooms.get(currentRoomId);
    if (!room) return;

    const lender = room.players.find(p => p.id === socket.id);
    const requester = room.players.find(p => p.id === requesterId);

    if (lender && requester) {
      if (accept && lender.chips >= amount) {
        lender.chips -= amount;
        requester.chips = Math.min(250000, requester.chips + amount);
        
        // Update debts
        if (!requester.debts[lender.id]) {
          requester.debts[lender.id] = 0;
        }
        requester.debts[lender.id] += amount;

        room.messages.push({
          id: `sys-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          senderName: 'Mesa',
          text: `${lender.name} emprestou $${amount} para ${requester.name}.`,
          timestamp: Date.now(),
          isSystem: true
        });
        
        io.to(currentRoomId).emit('game:event', {
          type: 'loan',
          message: `${lender.name} te emprestou $${amount}.`
        });
      } else if (!accept) {
        room.messages.push({
          id: `sys-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          senderName: 'Mesa',
          text: `${lender.name} recusou o empréstimo para ${requester.name}.`,
          timestamp: Date.now(),
          isSystem: true
        });
      }
      io.to(currentRoomId).emit('chat:message', room.messages[room.messages.length - 1]);
      broadcastRoom(currentRoomId);
    }
  });

  // Loan Repay
  socket.on('loan:repay', ({ targetPlayerId, amount }) => {
    if (!currentRoomId) return;
    const room = rooms.get(currentRoomId);
    if (!room) return;

    const repayer = room.players.find(p => p.id === socket.id);
    const lender = room.players.find(p => p.id === targetPlayerId);

    if (repayer && lender && repayer.chips >= amount) {
      const currentDebt = repayer.debts[lender.id] || 0;
      if (currentDebt > 0) {
        const repayAmount = Math.min(amount, currentDebt);
        repayer.chips -= repayAmount;
        lender.chips = Math.min(250000, lender.chips + repayAmount);
        repayer.debts[lender.id] -= repayAmount;

        if (repayer.debts[lender.id] <= 0) {
          delete repayer.debts[lender.id];
        }

        room.messages.push({
          id: `sys-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          senderName: 'Mesa',
          text: `${repayer.name} pagou $${repayAmount} de sua dívida para ${lender.name}.`,
          timestamp: Date.now(),
          isSystem: true
        });
        io.to(currentRoomId).emit('chat:message', room.messages[room.messages.length - 1]);
        
        io.to(currentRoomId).emit('game:event', {
          type: 'loan',
          message: `Você pagou $${repayAmount} para ${lender.name}.`
        });

        broadcastRoom(currentRoomId);
      }
    }
  });

  // Toggle Bots on server (multiplayer)
  socket.on('room:toggle_bots', () => {
    if (!currentRoomId) return;
    const room = rooms.get(currentRoomId);
    if (!room || room.phase !== 'betting') return;

    const player = room.players.find(p => p.id === socket.id);
    if (player && player.isHost) {
      const bots = room.players.filter(p => p.isBot);
      
      if (bots.length > 0) {
        // Remove all bots
        room.players = room.players.filter(p => !p.isBot);
        room.messages.push({
          id: `sys-${Date.now()}`,
          senderName: 'Mesa',
          text: 'Todos os bots foram removidos da mesa.',
          timestamp: Date.now(),
          isSystem: true
        });
      } else {
        // Add 3 bots
        for (let i = 0; i < 3; i++) {
          addBotToServerRoom(room);
        }
        room.messages.push({
          id: `sys-${Date.now()}`,
          senderName: 'Mesa',
          text: '3 novos jogadores Bots de IA entraram na mesa!',
          timestamp: Date.now(),
          isSystem: true
        });
      }
      broadcastRoom(currentRoomId);
      checkStartDeal(room);
    }
  });

  // Helper function to add a bot
  function addBotToServerRoom(room: RoomInternal) {
    const seatedCount = room.players.filter(p => !p.isSpectator).length;
    if (seatedCount >= 9) return; // Max 9 seated players

    const takenSeats = new Set(room.players.filter(p => !p.isSpectator).map(p => p.seatIndex));
    let availableSeat = -1;
    for (let s = 0; s < 9; s++) {
      if (!takenSeats.has(s)) {
        availableSeat = s;
        break;
      }
    }
    if (availableSeat === -1) return;
    
    const excludedIds = room.players.map(p => p.id);
    const newBot = generateUniqueBot(availableSeat, excludedIds);
    newBot.status = room.phase === 'betting' ? 'ready' : 'waiting';
    newBot.isReady = room.phase === 'betting';
    
    // Automatically place a bet for the bot if added during betting phase
    if (room.phase === 'betting') {
       newBot.currentBet = Math.max(10, Math.floor(newBot.chips * 0.1));
    }
    
    room.players.push(newBot);
    
    // Bot greeting reaction
    if (Math.random() < 0.6) {
      const greeting = BOT_CHAT_GREETINGS[Math.floor(Math.random() * BOT_CHAT_GREETINGS.length)];
      room.messages.push({
        id: `bot-greet-${Date.now()}-${Math.random()}`,
        senderName: newBot.name,
        text: greeting,
        timestamp: Date.now()
      });
    }
  }

  // Remove Bot
  socket.on('room:remove_bot', ({ botId }) => {
    if (!currentRoomId) return;
    const room = rooms.get(currentRoomId);
    if (!room) return;
    
    const player = room.players.find(p => p.id === socket.id);
    if (player && player.isHost) {
       const bots = room.players.filter(p => p.isBot);
       if (bots.length === 0) return;
       
       const targetBot = botId ? bots.find(b => b.id === botId) : bots[bots.length - 1];
       if (targetBot) {
         room.players = room.players.filter(p => p.id !== targetBot.id);
         broadcastRoom(currentRoomId);
         checkStartDeal(room);
       }
    }
  });

  // Add a single Bot
  socket.on('room:add_bot', () => {
    if (!currentRoomId) return;
    const room = rooms.get(currentRoomId);
    if (!room || room.phase !== 'betting') return;
    
    const player = room.players.find(p => p.id === socket.id);
    if (player && player.isHost && room.players.length < 9) {
       addBotToServerRoom(room);
       broadcastRoom(currentRoomId);
       checkStartDeal(room);
    }
  });

  // Chat message
  socket.on('chat:send', ({ text }) => {
    if (!currentRoomId || !text || !text.trim()) return;
    const room = rooms.get(currentRoomId);
    if (!room) return;

    const player = room.players.find(p => p.id === socket.id);
    const senderName = player ? player.name : 'Espectador';

    const msg: TableChatMessage = {
      id: `chat-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      senderName,
      text: text.trim().slice(0, 140),
      timestamp: Date.now()
    };

    room.messages.push(msg);
    if (room.messages.length > 50) {
      room.messages.shift();
    }

    io.to(currentRoomId).emit('chat:message', msg);
  });

  // Leave room or disconnect
  const handleLeave = () => {
    if (!currentRoomId) return;
    const room = rooms.get(currentRoomId);
    if (!room) return;

    const leavingPlayer = room.players.find(p => p.id === socket.id);
    const wasActive = room.activePlayerId === socket.id;

    room.players = room.players.filter(p => p.id !== socket.id);

    if (leavingPlayer) {
      room.messages.push({
        id: `sys-${Date.now()}`,
        senderName: 'Mesa',
        text: `${leavingPlayer.name} saiu da sala.`,
        timestamp: Date.now(),
        isSystem: true
      });
    }

    if (room.isPublic) {
      if (wasActive && room.phase === 'player_turns') {
        advanceTurn(room);
      }
      broadcastRoom(currentRoomId);
      broadcastRoomsList();
    } else if (room.players.length === 0 || room.players.every(p => p.isBot)) {
      const closingRoomId = currentRoomId;
      setTimeout(() => {
        const checkRoom = rooms.get(closingRoomId);
        if (checkRoom && (checkRoom.players.length === 0 || checkRoom.players.every(p => p.isBot))) {
          if (checkRoom.dealerTimer) clearTimeout(checkRoom.dealerTimer);
          clearTurnTimer(checkRoom);
          rooms.delete(closingRoomId);
          broadcastRoomsList();
        }
      }, 45000);
      broadcastRoomsList();
    } else {
      // Reassign host if host left
      if (room.hostId === socket.id) {
        const nextRealPlayer = room.players.find(p => !p.isBot);
        if (nextRealPlayer) {
            room.hostId = nextRealPlayer.id;
            nextRealPlayer.isHost = true;
        }
      }

      // If leaving player was currently taking a turn, advance
      if (wasActive && room.phase === 'player_turns') {
        advanceTurn(room);
      }

      broadcastRoom(currentRoomId);
      broadcastRoomsList();
    }

    socket.leave(currentRoomId);
    currentRoomId = null;
  };

  socket.on('room:leave', handleLeave);
  socket.on('disconnect', handleLeave);
});

// Vite middleware & static serving
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`♠♥♦♣ Blackjack Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
