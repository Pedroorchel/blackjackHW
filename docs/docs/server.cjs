var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_http = require("http");
var import_socket = require("socket.io");
var import_path = __toESM(require("path"), 1);
var import_vite = require("vite");

// src/utils/blackjack.ts
var SUITS = ["\u2660", "\u2665", "\u2666", "\u2663"];
var RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
function createDeck() {
  const deck = [];
  let counter = 0;
  for (let shoe = 0; shoe < 4; shoe++) {
    for (const suit of SUITS) {
      for (const rank of RANKS) {
        deck.push({
          suit,
          rank,
          id: `${suit}-${rank}-${shoe}-${counter++}`
        });
      }
    }
  }
  return shuffleDeck(deck);
}
function shuffleDeck(deck) {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}
function calculateHandScore(cards) {
  const visibleCards = cards.filter((c) => !c.hidden);
  if (visibleCards.length === 0) {
    return { total: 0, isSoft: false, isBlackjack: false, isBust: false };
  }
  let total = 0;
  let aces = 0;
  for (const card of visibleCards) {
    if (card.rank === "A") {
      aces += 1;
      total += 11;
    } else if (["K", "Q", "J"].includes(card.rank)) {
      total += 10;
    } else {
      total += parseInt(card.rank, 10);
    }
  }
  let softAces = aces;
  while (total > 21 && softAces > 0) {
    total -= 10;
    softAces -= 1;
  }
  const isBust = total > 21;
  const isBlackjack = visibleCards.length === 2 && total === 21 && cards.length === 2;
  const isSoft = softAces > 0 && !isBust;
  return {
    total,
    isSoft,
    isBlackjack,
    isBust
  };
}

// server.ts
var app = (0, import_express.default)();
var httpServer = (0, import_http.createServer)(app);
var PORT = 3e3;
var io = new import_socket.Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});
var rooms = /* @__PURE__ */ new Map();
function generateRoomCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}
function getSafeRoomState(room) {
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
function broadcastRoom(roomId) {
  const room = rooms.get(roomId);
  if (!room) return;
  io.to(roomId).emit("room:state", getSafeRoomState(room));
}
function drawCard(room, hidden = false) {
  if (room.shoe.length < 15) {
    room.shoe = createDeck();
  }
  const card = room.shoe.pop();
  return { ...card, hidden };
}
function clearTurnTimer(room) {
  if (room.turnTimer) {
    clearTimeout(room.turnTimer);
    room.turnTimer = void 0;
  }
  room.turnStartTime = void 0;
}
function startTurnTimer(room, playerId) {
  clearTurnTimer(room);
  room.turnTimeout = 15;
  room.turnStartTime = Date.now();
  room.turnTimer = setTimeout(() => {
    const player = room.players.find((p) => p.id === playerId);
    if (player && player.status === "playing") {
      player.status = "stand";
      const score = calculateHandScore(player.cards);
      io.to(room.roomId).emit("game:event", {
        type: "stand",
        message: `${player.name} excedeu o tempo limite de 15 segundos e parou automaticamente com ${score.total} pontos!`
      });
      advanceTurn(room);
    }
  }, 15e3);
}
function advanceTurn(room) {
  clearTurnTimer(room);
  const activePlayers = room.players.filter((p) => p.currentBet > 0);
  const currentIndex = activePlayers.findIndex((p) => p.id === room.activePlayerId);
  let nextPlayer = null;
  for (let i = currentIndex + 1; i < activePlayers.length; i++) {
    const p = activePlayers[i];
    if (p.status === "playing" || p.status === "ready") {
      nextPlayer = p;
      break;
    }
  }
  if (nextPlayer) {
    room.activePlayerId = nextPlayer.id;
    nextPlayer.status = "playing";
    const score = calculateHandScore(nextPlayer.cards);
    if (score.isBlackjack) {
      nextPlayer.status = "blackjack";
      io.to(room.roomId).emit("game:event", {
        type: "blackjack",
        message: `${nextPlayer.name} tem Blackjack natural (21)!`
      });
      advanceTurn(room);
      return;
    }
    startTurnTimer(room, nextPlayer.id);
    broadcastRoom(room.roomId);
  } else {
    room.activePlayerId = null;
    startDealerTurn(room);
  }
}
function startDealerTurn(room) {
  room.phase = "dealer_turn";
  room.dealer.statusText = "Dealer virando a carta...";
  broadcastRoom(room.roomId);
  io.to(room.roomId).emit("game:event", {
    type: "dealer_flip",
    message: "Dealer virando carta oculta..."
  });
  room.dealerTimer = setTimeout(() => {
    room.dealer.cards = room.dealer.cards.map((c) => ({ ...c, hidden: false }));
    const initialScore = calculateHandScore(room.dealer.cards);
    room.dealer.score = initialScore.total;
    room.dealer.isBlackjack = initialScore.isBlackjack;
    room.dealer.isBust = initialScore.isBust;
    room.dealer.statusText = `Mesa revelou: ${initialScore.total} pontos`;
    broadcastRoom(room.roomId);
    const playersWithBets = room.players.filter((p) => p.currentBet > 0);
    const allBusted = playersWithBets.every((p) => p.status === "busted");
    if (allBusted) {
      setTimeout(() => {
        finishRound(room, "Todos os jogadores estouraram. Dealer vence!");
      }, 1e3);
      return;
    }
    const runDealerDraw = () => {
      const currentScore = calculateHandScore(room.dealer.cards);
      room.dealer.score = currentScore.total;
      if (currentScore.total < 17) {
        room.dealer.statusText = "Dealer virando pr\xF3xima carta...";
        broadcastRoom(room.roomId);
        io.to(room.roomId).emit("game:event", {
          type: "dealer_flip",
          message: "Dealer virando pr\xF3xima carta..."
        });
        room.dealerTimer = setTimeout(() => {
          const newCard = drawCard(room, false);
          room.dealer.cards.push(newCard);
          const updated = calculateHandScore(room.dealer.cards);
          room.dealer.score = updated.total;
          room.dealer.isBust = updated.isBust;
          room.dealer.statusText = `Mesa comprou ${newCard.rank}${newCard.suit} (Total: ${updated.total})`;
          io.to(room.roomId).emit("game:event", {
            type: "dealer_hit",
            message: `Mesa comprou ${newCard.rank}${newCard.suit}`
          });
          broadcastRoom(room.roomId);
          room.dealerTimer = setTimeout(runDealerDraw, 1300);
        }, 750);
      } else {
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
function finishRound(room, customSummary) {
  room.phase = "round_over";
  const dealerScore = calculateHandScore(room.dealer.cards);
  let winCount = 0;
  room.players.forEach((player) => {
    if (player.currentBet === 0) return;
    const playerScore = calculateHandScore(player.cards);
    let outcome = null;
    let payout = 0;
    if (player.status === "busted" || playerScore.isBust) {
      outcome = "bust";
      payout = 0;
    } else if (playerScore.isBlackjack) {
      if (dealerScore.isBlackjack) {
        outcome = "push";
        payout = player.currentBet;
      } else {
        outcome = "blackjack";
        payout = Math.floor(player.currentBet * 2.5);
        winCount++;
      }
    } else if (dealerScore.isBlackjack) {
      outcome = "lose";
      payout = 0;
    } else if (dealerScore.isBust) {
      outcome = "win";
      payout = player.currentBet * 2;
      winCount++;
    } else {
      if (playerScore.total > dealerScore.total) {
        outcome = "win";
        payout = player.currentBet * 2;
        winCount++;
      } else if (playerScore.total < dealerScore.total) {
        outcome = "lose";
        payout = 0;
      } else {
        outcome = "push";
        payout = player.currentBet;
      }
    }
    player.outcome = outcome;
    player.payout = payout;
    player.chips = Math.min(25e4, player.chips + payout);
    if (outcome === "win" || outcome === "blackjack") {
      player.wins = (player.wins || 0) + 1;
    }
  });
  const summary = customSummary || (dealerScore.isBust ? "A Mesa estourou! Pagando apostas aos jogadores ativos." : `Rodada finalizada. Mesa terminou com ${dealerScore.total} pontos.`);
  io.to(room.roomId).emit("game:event", {
    type: "round_end",
    message: summary
  });
  broadcastRoom(room.roomId);
}
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", activeRooms: rooms.size });
});
io.on("connection", (socket) => {
  let currentRoomId = null;
  let playerRefId = socket.id;
  socket.on("room:create", ({ playerName, wins, chips, avatarUrl }, callback) => {
    const roomId = generateRoomCode();
    currentRoomId = roomId;
    const newPlayer = {
      id: socket.id,
      name: playerName.trim() || "Jogador 1",
      chips: typeof chips === "number" ? Math.min(25e4, chips) : 500,
      currentBet: 25,
      cards: [],
      status: "betting",
      outcome: null,
      payout: 0,
      isHost: true,
      isReady: false,
      seatIndex: 0,
      debts: {},
      wins: typeof wins === "number" ? wins : 0,
      avatarUrl: typeof avatarUrl === "string" ? avatarUrl : void 0
    };
    const newRoom = {
      roomId,
      hostId: socket.id,
      phase: "betting",
      players: [newPlayer],
      activePlayerId: null,
      dealer: {
        cards: [],
        score: 0,
        isBust: false,
        isBlackjack: false,
        statusText: "Aguardando apostas..."
      },
      shoe: createDeck(),
      roundNumber: 1,
      messages: [{
        id: `sys-${Date.now()}`,
        senderName: "Mesa",
        text: `Sala criada com c\xF3digo ${roomId}. Boa sorte!`,
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
  socket.on("room:join", ({ roomId, playerName, wins, chips, avatarUrl }, callback) => {
    const upperId = roomId.trim().toUpperCase();
    const room = rooms.get(upperId);
    if (!room) {
      callback({ success: false, error: "Sala n\xE3o encontrada. Verifique o c\xF3digo digitado." });
      return;
    }
    const nonSpectators = room.players.filter((p) => !p.isSpectator);
    const isSpectator = nonSpectators.length >= 8;
    currentRoomId = upperId;
    socket.join(upperId);
    let availableSeat = -1;
    if (!isSpectator) {
      const takenSeats = new Set(nonSpectators.map((p) => p.seatIndex));
      availableSeat = 0;
      while (takenSeats.has(availableSeat)) {
        availableSeat++;
      }
    }
    const newPlayer = {
      id: socket.id,
      name: playerName.trim() || `Jogador ${room.players.length + 1}`,
      chips: isSpectator ? 0 : typeof chips === "number" ? Math.min(25e4, chips) : 500,
      currentBet: isSpectator ? 0 : 25,
      cards: [],
      status: isSpectator ? "spectator" : room.phase === "betting" ? "betting" : "waiting",
      outcome: null,
      payout: 0,
      isHost: false,
      isReady: false,
      seatIndex: availableSeat,
      isSpectator,
      debts: {},
      wins: typeof wins === "number" ? wins : 0,
      avatarUrl: typeof avatarUrl === "string" ? avatarUrl : void 0
    };
    room.players.push(newPlayer);
    room.messages.push({
      id: `sys-${Date.now()}`,
      senderName: "Mesa",
      text: `${newPlayer.name} entrou na sala${isSpectator ? " como espectador" : ""}.`,
      timestamp: Date.now(),
      isSystem: true
    });
    callback({ success: true });
    broadcastRoom(upperId);
  });
  socket.on("player:update_name", ({ name }) => {
    if (!currentRoomId) return;
    const room = rooms.get(currentRoomId);
    if (!room) return;
    const player = room.players.find((p) => p.id === socket.id);
    if (player && name.trim()) {
      const oldName = player.name;
      player.name = name.trim().slice(0, 18);
      room.messages.push({
        id: `sys-${Date.now()}`,
        senderName: "Mesa",
        text: `${oldName} mudou o nome para ${player.name}.`,
        timestamp: Date.now(),
        isSystem: true
      });
      broadcastRoom(currentRoomId);
    }
  });
  socket.on("player:update_profile", ({ name, avatarUrl }) => {
    if (!currentRoomId) return;
    const room = rooms.get(currentRoomId);
    if (!room) return;
    const player = room.players.find((p) => p.id === socket.id);
    if (player) {
      let changed = false;
      if (name && name.trim()) {
        const trimmedName = name.trim().slice(0, 18);
        if (player.name !== trimmedName) {
          const oldName = player.name;
          player.name = trimmedName;
          room.messages.push({
            id: `sys-${Date.now()}`,
            senderName: "Mesa",
            text: `${oldName} alterou o perfil de jogador para ${player.name}.`,
            timestamp: Date.now(),
            isSystem: true
          });
          changed = true;
        }
      }
      if (typeof avatarUrl === "string") {
        player.avatarUrl = avatarUrl;
        changed = true;
      }
      if (changed) {
        broadcastRoom(currentRoomId);
      }
    }
  });
  socket.on("player:bet", ({ amount }) => {
    if (!currentRoomId) return;
    const room = rooms.get(currentRoomId);
    if (!room || room.phase !== "betting") return;
    const player = room.players.find((p) => p.id === socket.id);
    if (player && !player.isSpectator) {
      const validAmount = Math.max(10, Math.min(amount, player.chips));
      player.currentBet = validAmount;
      broadcastRoom(currentRoomId);
    }
  });
  socket.on("player:ready", () => {
    if (!currentRoomId) return;
    const room = rooms.get(currentRoomId);
    if (!room || room.phase !== "betting") return;
    const player = room.players.find((p) => p.id === socket.id);
    if (player && !player.isSpectator && player.currentBet > 0 && player.currentBet <= player.chips) {
      player.isReady = !player.isReady;
      player.status = player.isReady ? "ready" : "betting";
      broadcastRoom(currentRoomId);
      const seatedPlayers = room.players.filter((p) => !p.isSpectator);
      const allReady = seatedPlayers.every((p) => p.isReady || p.chips === 0);
      if (allReady && seatedPlayers.some((p) => p.isReady)) {
        startGameDeal(room);
      }
    }
  });
  socket.on("game:start_deal", () => {
    if (!currentRoomId) return;
    const room = rooms.get(currentRoomId);
    if (!room || room.phase !== "betting") return;
    const player = room.players.find((p) => p.id === socket.id);
    if (player && player.isHost) {
      const seatedPlayers = room.players.filter((p) => !p.isSpectator);
      const allReady = seatedPlayers.every((p) => p.isReady || p.chips === 0);
      if (!allReady) {
        socket.emit("room:error", { message: "Todos os jogadores na mesa precisam confirmar sua aposta (clicar em Pronto) para come\xE7ar!" });
        return;
      }
      startGameDeal(room);
    }
  });
  function startGameDeal(room) {
    const readyPlayers = room.players.filter((p) => !p.isSpectator && p.isReady && p.currentBet > 0);
    if (readyPlayers.length === 0) return;
    room.phase = "dealing";
    readyPlayers.forEach((p) => {
      p.chips -= p.currentBet;
      p.cards = [];
      p.outcome = null;
      p.payout = 0;
      p.status = "playing";
    });
    room.dealer.cards = [];
    room.dealer.score = 0;
    room.dealer.isBust = false;
    room.dealer.isBlackjack = false;
    room.dealer.statusText = "Distribuindo as cartas...";
    broadcastRoom(room.roomId);
    setTimeout(() => {
      readyPlayers.forEach((p) => {
        p.cards.push(drawCard(room, false));
      });
      room.dealer.cards.push(drawCard(room, true));
      broadcastRoom(room.roomId);
      setTimeout(() => {
        readyPlayers.forEach((p) => {
          p.cards.push(drawCard(room, false));
        });
        const dealerUpCard = drawCard(room, false);
        room.dealer.cards.push(dealerUpCard);
        room.dealer.score = calculateHandScore([dealerUpCard]).total;
        room.dealer.statusText = `Mesa mostrando ${dealerUpCard.rank}${dealerUpCard.suit}`;
        readyPlayers.forEach((p) => {
          const score = calculateHandScore(p.cards);
          if (score.isBlackjack) {
            p.status = "blackjack";
            io.to(room.roomId).emit("game:event", {
              type: "blackjack",
              message: `${p.name} conseguiu Blackjack!`
            });
          }
        });
        room.phase = "player_turns";
        const firstActive = readyPlayers.find((p) => p.status === "playing");
        if (firstActive) {
          room.activePlayerId = firstActive.id;
          startTurnTimer(room, firstActive.id);
        } else {
          room.activePlayerId = null;
          startDealerTurn(room);
          return;
        }
        io.to(room.roomId).emit("game:event", {
          type: "deal",
          message: "Cartas distribu\xEDdas na mesa."
        });
        broadcastRoom(room.roomId);
      }, 700);
    }, 600);
  }
  socket.on("player:hit", () => {
    if (!currentRoomId) return;
    const room = rooms.get(currentRoomId);
    if (!room || room.phase !== "player_turns" || room.activePlayerId !== socket.id) return;
    const player = room.players.find((p) => p.id === socket.id);
    if (!player || player.status !== "playing") return;
    const card = drawCard(room, false);
    player.cards.push(card);
    const score = calculateHandScore(player.cards);
    io.to(room.roomId).emit("game:event", {
      type: "hit",
      message: `${player.name} pediu carta: ${card.rank}${card.suit}`
    });
    if (score.isBust) {
      player.status = "busted";
      io.to(room.roomId).emit("game:event", {
        type: "bust",
        message: `${player.name} estourou com ${score.total} pontos!`
      });
      advanceTurn(room);
    } else if (score.total === 21) {
      player.status = "stand";
      advanceTurn(room);
    } else {
      startTurnTimer(room, socket.id);
      broadcastRoom(currentRoomId);
    }
  });
  socket.on("player:stand", () => {
    if (!currentRoomId) return;
    const room = rooms.get(currentRoomId);
    if (!room || room.phase !== "player_turns" || room.activePlayerId !== socket.id) return;
    const player = room.players.find((p) => p.id === socket.id);
    if (!player || player.status !== "playing") return;
    player.status = "stand";
    const score = calculateHandScore(player.cards);
    io.to(room.roomId).emit("game:event", {
      type: "stand",
      message: `${player.name} parou com ${score.total} pontos.`
    });
    advanceTurn(room);
  });
  socket.on("player:double", () => {
    if (!currentRoomId) return;
    const room = rooms.get(currentRoomId);
    if (!room || room.phase !== "player_turns" || room.activePlayerId !== socket.id) return;
    const player = room.players.find((p) => p.id === socket.id);
    if (!player || player.status !== "playing" || player.cards.length !== 2) return;
    if (player.chips < player.currentBet) {
      socket.emit("room:error", { message: "Fichas insuficientes para dobrar a aposta." });
      return;
    }
    player.chips -= player.currentBet;
    player.currentBet *= 2;
    const card = drawCard(room, false);
    player.cards.push(card);
    const score = calculateHandScore(player.cards);
    if (score.isBust) {
      player.status = "busted";
      io.to(room.roomId).emit("game:event", {
        type: "bust",
        message: `${player.name} dobrou e estourou com ${score.total}!`
      });
    } else {
      player.status = "doubled";
      io.to(room.roomId).emit("game:event", {
        type: "hit",
        message: `${player.name} dobrou a aposta e recebeu ${card.rank}${card.suit} (Total: ${score.total})`
      });
    }
    advanceTurn(room);
  });
  socket.on("game:new_round", () => {
    if (!currentRoomId) return;
    const room = rooms.get(currentRoomId);
    if (!room || room.phase !== "round_over") return;
    if (room.dealerTimer) {
      clearTimeout(room.dealerTimer);
    }
    room.phase = "betting";
    room.roundNumber += 1;
    room.activePlayerId = null;
    room.dealer = {
      cards: [],
      score: 0,
      isBust: false,
      isBlackjack: false,
      statusText: "Aguardando apostas para a nova rodada..."
    };
    room.players.forEach((p) => {
      if (p.isSpectator) {
        p.status = "spectator";
        return;
      }
      p.cards = [];
      p.outcome = null;
      p.payout = 0;
      p.isReady = false;
      p.currentBet = Math.min(p.currentBet, p.chips);
      p.status = "betting";
    });
    broadcastRoom(currentRoomId);
  });
  socket.on("loan:request", ({ targetPlayerId, amount }) => {
    if (!currentRoomId) return;
    const room = rooms.get(currentRoomId);
    if (!room) return;
    const requester = room.players.find((p) => p.id === socket.id);
    const target = room.players.find((p) => p.id === targetPlayerId);
    if (requester && target) {
      io.to(target.id).emit("loan:requested", {
        requesterId: requester.id,
        requesterName: requester.name,
        amount
      });
      room.messages.push({
        id: `sys-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        senderName: "Mesa",
        text: `${requester.name} pediu $${amount} emprestado para ${target.name}.`,
        timestamp: Date.now(),
        isSystem: true
      });
      io.to(currentRoomId).emit("chat:message", room.messages[room.messages.length - 1]);
    }
  });
  socket.on("loan:respond", ({ requesterId, accept, amount }) => {
    if (!currentRoomId) return;
    const room = rooms.get(currentRoomId);
    if (!room) return;
    const lender = room.players.find((p) => p.id === socket.id);
    const requester = room.players.find((p) => p.id === requesterId);
    if (lender && requester) {
      if (accept && lender.chips >= amount) {
        lender.chips -= amount;
        requester.chips = Math.min(25e4, requester.chips + amount);
        if (!requester.debts[lender.id]) {
          requester.debts[lender.id] = 0;
        }
        requester.debts[lender.id] += amount;
        room.messages.push({
          id: `sys-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          senderName: "Mesa",
          text: `${lender.name} emprestou $${amount} para ${requester.name}.`,
          timestamp: Date.now(),
          isSystem: true
        });
        io.to(currentRoomId).emit("game:event", {
          type: "loan",
          message: `${lender.name} te emprestou $${amount}.`
        });
      } else if (!accept) {
        room.messages.push({
          id: `sys-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          senderName: "Mesa",
          text: `${lender.name} recusou o empr\xE9stimo para ${requester.name}.`,
          timestamp: Date.now(),
          isSystem: true
        });
      }
      io.to(currentRoomId).emit("chat:message", room.messages[room.messages.length - 1]);
      broadcastRoom(currentRoomId);
    }
  });
  socket.on("loan:repay", ({ targetPlayerId, amount }) => {
    if (!currentRoomId) return;
    const room = rooms.get(currentRoomId);
    if (!room) return;
    const repayer = room.players.find((p) => p.id === socket.id);
    const lender = room.players.find((p) => p.id === targetPlayerId);
    if (repayer && lender && repayer.chips >= amount) {
      const currentDebt = repayer.debts[lender.id] || 0;
      if (currentDebt > 0) {
        const repayAmount = Math.min(amount, currentDebt);
        repayer.chips -= repayAmount;
        lender.chips = Math.min(25e4, lender.chips + repayAmount);
        repayer.debts[lender.id] -= repayAmount;
        if (repayer.debts[lender.id] <= 0) {
          delete repayer.debts[lender.id];
        }
        room.messages.push({
          id: `sys-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          senderName: "Mesa",
          text: `${repayer.name} pagou $${repayAmount} de sua d\xEDvida para ${lender.name}.`,
          timestamp: Date.now(),
          isSystem: true
        });
        io.to(currentRoomId).emit("chat:message", room.messages[room.messages.length - 1]);
        io.to(currentRoomId).emit("game:event", {
          type: "loan",
          message: `Voc\xEA pagou $${repayAmount} para ${lender.name}.`
        });
        broadcastRoom(currentRoomId);
      }
    }
  });
  socket.on("chat:send", ({ text }) => {
    if (!currentRoomId || !text || !text.trim()) return;
    const room = rooms.get(currentRoomId);
    if (!room) return;
    const player = room.players.find((p) => p.id === socket.id);
    const senderName = player ? player.name : "Espectador";
    const msg = {
      id: `chat-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      senderName,
      text: text.trim().slice(0, 140),
      timestamp: Date.now()
    };
    room.messages.push(msg);
    if (room.messages.length > 50) {
      room.messages.shift();
    }
    io.to(currentRoomId).emit("chat:message", msg);
  });
  const handleLeave = () => {
    if (!currentRoomId) return;
    const room = rooms.get(currentRoomId);
    if (!room) return;
    const leavingPlayer = room.players.find((p) => p.id === socket.id);
    const wasActive = room.activePlayerId === socket.id;
    room.players = room.players.filter((p) => p.id !== socket.id);
    if (leavingPlayer) {
      room.messages.push({
        id: `sys-${Date.now()}`,
        senderName: "Mesa",
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
      if (room.hostId === socket.id) {
        room.hostId = room.players[0].id;
        room.players[0].isHost = true;
      }
      if (wasActive && room.phase === "player_turns") {
        advanceTurn(room);
      }
      broadcastRoom(currentRoomId);
    }
    socket.leave(currentRoomId);
    currentRoomId = null;
  };
  socket.on("room:leave", handleLeave);
  socket.on("disconnect", handleLeave);
});
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`\u2660\u2665\u2666\u2663 Blackjack Server running on http://0.0.0.0:${PORT}`);
  });
}
startServer();
//# sourceMappingURL=server.cjs.map
