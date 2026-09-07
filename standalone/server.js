const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const PORT = process.env.PORT || 3000;

// Servir arquivos estáticos (HTML, CSS, JS)
app.use(express.static(__dirname));

// Lógica de Blackjack
const SUITS = ['♠', '♥', '♦', '♣'];
const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

function createDeck() {
  const deck = [];
  for (let shoe = 0; shoe < 4; shoe++) {
    for (const suit of SUITS) {
      for (const rank of RANKS) {
        deck.push({ suit, rank, id: `${suit}-${rank}-${shoe}-${Math.random()}` });
      }
    }
  }
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

function calculateHand(cards) {
  const visible = cards.filter(c => !c.hidden);
  let total = 0;
  let aces = 0;

  for (const c of visible) {
    if (c.rank === 'A') {
      aces++;
      total += 11;
    } else if (['K', 'Q', 'J'].includes(c.rank)) {
      total += 10;
    } else {
      total += parseInt(c.rank, 10);
    }
  }

  while (total > 21 && aces > 0) {
    total -= 10;
    aces--;
  }

  return {
    total,
    isBust: total > 21,
    isBlackjack: visible.length === 2 && total === 21 && cards.length === 2
  };
}

const rooms = new Map();

function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let res = '';
  for (let i = 0; i < 6; i++) res += chars[Math.floor(Math.random() * chars.length)];
  return res;
}

function broadcastState(roomId) {
  const room = rooms.get(roomId);
  if (!room) return;
  io.to(roomId).emit('room:state', {
    roomId: room.roomId,
    hostId: room.hostId,
    phase: room.phase,
    players: room.players,
    activePlayerId: room.activePlayerId,
    dealer: room.dealer,
    roundNumber: room.roundNumber,
    messages: room.messages
  });
}

function advanceTurn(room) {
  const active = room.players.filter(p => p.currentBet > 0);
  const idx = active.findIndex(p => p.id === room.activePlayerId);

  let next = null;
  for (let i = idx + 1; i < active.length; i++) {
    if (active[i].status === 'playing' || active[i].status === 'ready') {
      next = active[i];
      break;
    }
  }

  if (next) {
    room.activePlayerId = next.id;
    next.status = 'playing';
    const score = calculateHand(next.cards);
    if (score.isBlackjack) {
      next.status = 'blackjack';
      advanceTurn(room);
      return;
    }
    broadcastState(room.roomId);
  } else {
    room.activePlayerId = null;
    playDealerTurn(room);
  }
}

function playDealerTurn(room) {
  room.phase = 'dealer_turn';
  room.dealer.cards = room.dealer.cards.map(c => ({ ...c, hidden: false }));
  broadcastState(room.roomId);

  const drawDealer = () => {
    const score = calculateHand(room.dealer.cards);
    room.dealer.score = score.total;

    if (score.total < 17) {
      room.dealer.cards.push(room.deck.pop());
      broadcastState(room.roomId);
      setTimeout(drawDealer, 900);
    } else {
      room.dealer.isBust = score.total > 21;
      finishRound(room);
    }
  };

  setTimeout(drawDealer, 1000);
}

function finishRound(room) {
  room.phase = 'round_over';
  const dealerScore = calculateHand(room.dealer.cards);

  room.players.forEach(p => {
    if (p.currentBet === 0) return;
    const pScore = calculateHand(p.cards);

    if (p.status === 'busted' || pScore.isBust) {
      p.outcome = 'bust';
      p.payout = 0;
    } else if (pScore.isBlackjack) {
      if (dealerScore.isBlackjack) {
        p.outcome = 'push';
        p.payout = p.currentBet;
      } else {
        p.outcome = 'blackjack';
        p.payout = Math.floor(p.currentBet * 2.5);
      }
    } else if (dealerScore.isBlackjack) {
      p.outcome = 'lose';
      p.payout = 0;
    } else if (dealerScore.isBust || pScore.total > dealerScore.total) {
      p.outcome = 'win';
      p.payout = p.currentBet * 2;
    } else if (pScore.total < dealerScore.total) {
      p.outcome = 'lose';
      p.payout = 0;
    } else {
      p.outcome = 'push';
      p.payout = p.currentBet;
    }

    p.chips += p.payout;
  });

  broadcastState(room.roomId);
}

io.on('connection', (socket) => {
  let curRoom = null;

  socket.on('room:create', ({ playerName }, cb) => {
    const roomId = generateCode();
    curRoom = roomId;

    const player = {
      id: socket.id,
      name: playerName || 'Jogador 1',
      chips: 1000,
      currentBet: 25,
      cards: [],
      status: 'betting',
      outcome: null,
      payout: 0,
      isHost: true,
      isReady: false
    };

    rooms.set(roomId, {
      roomId,
      hostId: socket.id,
      phase: 'betting',
      players: [player],
      activePlayerId: null,
      dealer: { cards: [], score: 0, isBust: false },
      deck: createDeck(),
      roundNumber: 1,
      messages: []
    });

    socket.join(roomId);
    cb({ success: true, roomId });
    broadcastState(roomId);
  });

  socket.on('room:join', ({ roomId, playerName }, cb) => {
    const rId = roomId.toUpperCase();
    const room = rooms.get(rId);
    if (!room) return cb({ success: false, error: 'Sala não encontrada.' });
    if (room.players.length >= 6) return cb({ success: false, error: 'Sala cheia (máx. 6).' });

    curRoom = rId;
    socket.join(rId);

    room.players.push({
      id: socket.id,
      name: playerName || `Jogador ${room.players.length + 1}`,
      chips: 1000,
      currentBet: 25,
      cards: [],
      status: 'betting',
      outcome: null,
      payout: 0,
      isHost: false,
      isReady: false
    });

    cb({ success: true });
    broadcastState(rId);
  });

  socket.on('player:name', ({ name }) => {
    if (!curRoom) return;
    const room = rooms.get(curRoom);
    const p = room?.players.find(x => x.id === socket.id);
    if (p && name) {
      p.name = name.slice(0, 16);
      broadcastState(curRoom);
    }
  });

  socket.on('player:bet', ({ amount }) => {
    if (!curRoom) return;
    const room = rooms.get(curRoom);
    const p = room?.players.find(x => x.id === socket.id);
    if (p && room.phase === 'betting') {
      p.currentBet = Math.min(p.chips, Math.max(10, amount));
      broadcastState(curRoom);
    }
  });

  socket.on('player:ready', () => {
    if (!curRoom) return;
    const room = rooms.get(curRoom);
    const p = room?.players.find(x => x.id === socket.id);
    if (p && room.phase === 'betting') {
      p.isReady = !p.isReady;
      broadcastState(curRoom);
    }
  });

  socket.on('game:start', () => {
    if (!curRoom) return;
    const room = rooms.get(curRoom);
    if (!room || room.phase !== 'betting') return;

    room.phase = 'player_turns';
    room.players.forEach(p => {
      p.chips -= p.currentBet;
      p.cards = [room.deck.pop(), room.deck.pop()];
      p.status = 'playing';
    });

    room.dealer.cards = [{ ...room.deck.pop(), hidden: true }, room.deck.pop()];
    room.dealer.score = calculateHand([room.dealer.cards[1]]).total;
    room.activePlayerId = room.players[0]?.id || null;

    broadcastState(curRoom);
  });

  socket.on('player:hit', () => {
    if (!curRoom) return;
    const room = rooms.get(curRoom);
    if (room?.activePlayerId !== socket.id) return;
    const p = room.players.find(x => x.id === socket.id);

    p.cards.push(room.deck.pop());
    const sc = calculateHand(p.cards);

    if (sc.isBust) {
      p.status = 'busted';
      advanceTurn(room);
    } else if (sc.total === 21) {
      p.status = 'stand';
      advanceTurn(room);
    } else {
      broadcastState(curRoom);
    }
  });

  socket.on('player:stand', () => {
    if (!curRoom) return;
    const room = rooms.get(curRoom);
    if (room?.activePlayerId !== socket.id) return;
    const p = room.players.find(x => x.id === socket.id);
    p.status = 'stand';
    advanceTurn(room);
  });

  socket.on('player:double', () => {
    if (!curRoom) return;
    const room = rooms.get(curRoom);
    if (room?.activePlayerId !== socket.id) return;
    const p = room.players.find(x => x.id === socket.id);
    if (p.cards.length === 2 && p.chips >= p.currentBet) {
      p.chips -= p.currentBet;
      p.currentBet *= 2;
      p.cards.push(room.deck.pop());
      p.status = calculateHand(p.cards).isBust ? 'busted' : 'doubled';
      advanceTurn(room);
    }
  });

  socket.on('game:new_round', () => {
    if (!curRoom) return;
    const room = rooms.get(curRoom);
    if (!room) return;

    room.phase = 'betting';
    room.roundNumber++;
    room.dealer = { cards: [], score: 0, isBust: false };
    room.players.forEach(p => {
      p.cards = [];
      p.outcome = null;
      p.isReady = false;
      if (p.chips <= 0) p.chips = 500;
      p.currentBet = Math.min(25, p.chips);
      p.status = 'betting';
    });
    broadcastState(curRoom);
  });

  socket.on('disconnect', () => {
    if (!curRoom) return;
    const room = rooms.get(curRoom);
    if (!room) return;
    room.players = room.players.filter(x => x.id !== socket.id);
    if (room.players.length === 0) {
      rooms.delete(curRoom);
    } else {
      if (room.hostId === socket.id) room.hostId = room.players[0].id;
      if (room.activePlayerId === socket.id) advanceTurn(room);
      broadcastState(curRoom);
    }
  });
});

server.listen(PORT, () => {
  console.log(`Blackjack server rodando em http://localhost:${PORT}`);
});
