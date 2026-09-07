import express from 'express';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { Card, Dealer, OutcomeType, Player, PlayerStatus, RoomState, RoundPhase, TableChatMessage } from './src/types';
import { calculateHandScore, createDeck } from './src/utils/blackjack';

const app = express();
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

function getSafeRoomState(room: RoomInternal): RoomState {
  return {
    roomId: room.roomId,
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

  const activePlayers = room.players.filter(p => p.currentBet > 0);
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
  } else {
    // All player turns are done -> Dealer turn
    room.activePlayerId = null;
    startDealerTurn(room);
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
}

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', activeRooms: rooms.size });
});

// Socket connection
io.on('connection', (socket: Socket) => {
  let currentRoomId: string | null = null;
  let playerRefId = socket.id;

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
      seatIndex: 0,
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
        text: `Sala criada com código ${roomId}. Boa sorte!`,
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

  // Join room
  socket.on('room:join', ({ roomId, playerName, wins, chips, avatarUrl }, callback) => {
    const upperId = roomId.trim().toUpperCase();
    const room = rooms.get(upperId);

    if (!room) {
      callback({ success: false, error: 'Sala não encontrada. Verifique o código digitado.' });
      return;
    }

    const nonSpectators = room.players.filter(p => !p.isSpectator);
    const isSpectator = nonSpectators.length >= 8;

    currentRoomId = upperId;
    socket.join(upperId);

    // Determine available seat if not spectator
    let availableSeat = -1;
    if (!isSpectator) {
      const takenSeats = new Set(nonSpectators.map(p => p.seatIndex));
      availableSeat = 0;
      while (takenSeats.has(availableSeat)) {
        availableSeat++;
      }
    }

    const newPlayer: Player = {
      id: socket.id,
      name: playerName.trim() || `Jogador ${room.players.length + 1}`,
      chips: isSpectator ? 0 : (typeof chips === 'number' ? Math.min(250000, chips) : 500),
      currentBet: 0,
      cards: [],
      status: isSpectator ? 'spectator' : (room.phase === 'betting' ? 'betting' : 'waiting'),
      outcome: null,
      payout: 0,
      isHost: false,
      isReady: false,
      seatIndex: availableSeat,
      isSpectator,
      debts: {},
      wins: typeof wins === 'number' ? wins : 0,
      avatarUrl: typeof avatarUrl === 'string' ? avatarUrl : undefined
    };

    room.players.push(newPlayer);

    room.messages.push({
      id: `sys-${Date.now()}`,
      senderName: 'Mesa',
      text: `${newPlayer.name} entrou na sala${isSpectator ? ' como espectador' : ''}.`,
      timestamp: Date.now(),
      isSystem: true
    });

    callback({ success: true });
    broadcastRoom(upperId);
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

      // Check if all seated players are ready
      const seatedPlayers = room.players.filter(p => !p.isSpectator);
      const allReady = seatedPlayers.every(p => p.isReady || p.chips === 0);
      if (allReady && seatedPlayers.some(p => p.isReady)) {
        startGameDeal(room);
      }
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
    const readyPlayers = room.players.filter(p => !p.isSpectator && p.isReady && p.currentBet > 0);
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

  // New Round - Host only
  socket.on('game:new_round', () => {
    if (!currentRoomId) return;
    const room = rooms.get(currentRoomId);
    if (!room || room.phase !== 'round_over') return;

    const player = room.players.find(p => p.id === socket.id);
    if (!player || !player.isHost) {
      socket.emit('room:error', { message: 'Apenas o Criador da Sala pode iniciar a nova rodada!' });
      return;
    }

    if (room.dealerTimer) {
      clearTimeout(room.dealerTimer);
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
        return;
      }
      p.cards = [];
      p.outcome = null;
      p.payout = 0;
      p.isReady = false;

      // Adjust bet if exceeds chips
      p.currentBet = Math.min(p.currentBet, p.chips);
      p.status = 'betting';
    });

    broadcastRoom(currentRoomId);
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

    if (room.players.length === 0) {
      if (room.dealerTimer) clearTimeout(room.dealerTimer);
      clearTurnTimer(room);
      rooms.delete(currentRoomId);
    } else {
      // Reassign host if host left
      if (room.hostId === socket.id) {
        room.hostId = room.players[0].id;
        room.players[0].isHost = true;
      }

      // If leaving player was currently taking a turn, advance
      if (wasActive && room.phase === 'player_turns') {
        advanceTurn(room);
      }

      broadcastRoom(currentRoomId);
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
