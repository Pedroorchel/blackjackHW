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

// src/utils/botGenerator.ts
var FIRST_NAMES = [
  // Nomes Brasileiros e Latinos
  "Lucas",
  "Gabriel",
  "Matheus",
  "Enzo",
  "Rafael",
  "Rodrigo",
  "Felipe",
  "Thiago",
  "Gustavo",
  "Leonardo",
  "Bruno",
  "Diego",
  "Danilo",
  "Guilherme",
  "Caio",
  "Eduardo",
  "Vinicius",
  "Alexandre",
  "Bernardo",
  "Murilo",
  "Isabella",
  "Valentina",
  "Sophia",
  "Alice",
  "Helena",
  "Manuela",
  "Laura",
  "Bianca",
  "Camila",
  "Beatriz",
  "Larissa",
  "Mariana",
  "Carolina",
  "Juliana",
  "Fernanda",
  "Gabriela",
  "Amanda",
  "Renata",
  "Patricia",
  "Luana",
  // Nomes Internacionais / Cassino VIP
  "Dimitri",
  "Viktor",
  "Matteo",
  "Giovanni",
  "Marco",
  "Hans",
  "Klaus",
  "Kenji",
  "Takeshi",
  "Liam",
  "Noah",
  "Oliver",
  "James",
  "Alexander",
  "Sebastian",
  "Maximilian",
  "Chloe",
  "Elena",
  "Natasha",
  "Seraphina",
  "Carlos",
  "Javier",
  "Alejandro",
  "Fernando",
  "Ricardo",
  "Antonio",
  "Esteban",
  "Hugo",
  "Sergio",
  "Raul",
  "Dominic",
  "Vincent",
  "Sterling",
  "Damian",
  "Fabrizio",
  "Lorenzo",
  "Dante",
  "Adriano",
  "Cristiano",
  "Neymar",
  "Mia",
  "Zoe",
  "Scarlett",
  "Victoria",
  "Penelope",
  "Layla",
  "Nora",
  "Stella",
  "Maya",
  "Leila"
];
var NICKNAMES_AND_TITLES = [
  "O Mago das Cartas",
  "High Roller",
  "All-In King",
  "G\xEAnio da Mesa",
  "Calculista",
  "Tubar\xE3o VIP",
  "Blackjack Pro",
  "Sorte Pura",
  "\xC1s de Ouro",
  "O Estrategista",
  "Sem Medo",
  "Mestre do 21",
  "Lobo de Vegas",
  "Sniper de Fichas",
  "Bar\xE3o do Cassino",
  "Imperador",
  "Rei de Copas",
  "Dama de Espadas",
  "M\xE3o de Ferro",
  "Invicto",
  "Mestre da Probabilidade",
  "Vegas Legend",
  "Tigre VIP",
  "Pantera Negra",
  "Gold Master",
  "Rei do Double",
  "Carioca Pro",
  "Paulista VIP",
  "Milion\xE1rio",
  "O Audacioso",
  "Mente Brilhante",
  "Olho de Falc\xE3o",
  "Senhor 21",
  "A Rainha do Cassino",
  "Diamante Negro",
  "VIP Platinum"
];
var PERSONALITIES = [
  { type: "aggressive", minBetRatio: 0.05, maxBetRatio: 0.15, riskTolerance: 0.85, label: "Agressivo" },
  { type: "conservative", minBetRatio: 0.02, maxBetRatio: 0.05, riskTolerance: 0.25, label: "Conservador" },
  { type: "balanced", minBetRatio: 0.03, maxBetRatio: 0.08, riskTolerance: 0.5, label: "Estrategista" },
  { type: "high_roller", minBetRatio: 0.1, maxBetRatio: 0.25, riskTolerance: 0.9, label: "High Roller VIP" },
  { type: "casual", minBetRatio: 0.02, maxBetRatio: 0.06, riskTolerance: 0.4, label: "Casual" },
  { type: "card_counter", minBetRatio: 0.04, maxBetRatio: 0.12, riskTolerance: 0.65, label: "Calculista Pro" }
];
var AVATAR_SEEDS = [
  "Felix",
  "Aneka",
  "Zoe",
  "Jack",
  "Leo",
  "Milo",
  "Bella",
  "Jasper",
  "Oliver",
  "Toby",
  "Sam",
  "Max",
  "Luna",
  "Ruby",
  "Oscar",
  "Finn",
  "Archie",
  "Hugo",
  "Theo",
  "Daisy",
  "Chloe",
  "Sophie",
  "Lilly",
  "Millie",
  "Rosie",
  "Ella",
  "Grace",
  "Freya",
  "Evie",
  "Phoebe",
  "Viper",
  "Shadow",
  "Ace",
  "Joker",
  "King",
  "Queen",
  "Titan",
  "Ghost",
  "Nova",
  "Flash"
];
var UNSPLASH_AVATARS = [
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=150&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1548142813-c348350df52b?w=150&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=150&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=150&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=150&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150&auto=format&fit=crop&q=80"
];
var BOT_CHAT_GREETINGS = [
  "Boa noite a todos! Vamos quebrar a banca.",
  "Opa, lugar vago na mesa! Entrando com tudo.",
  "Hoje a probabilidade est\xE1 ao meu favor.",
  "Salve galera! Preparados pro 21?",
  "Mesa excelente! Vamos ver quem leva mais fichas.",
  "Fala pessoal! O dealer n\xE3o vai ter chance hoje.",
  "Cheguei pra colocar press\xE3o nessa mesa VIP!",
  "Bora l\xE1, foco total na contagem de cartas.",
  "Aposte alto, ganhe alto! Boa sorte a todos."
];
var BOT_WIN_REACTIONS = [
  "Mais um 21 na conta!",
  "A estrat\xE9gia nunca falha!",
  "Pagamento garantido pelo cassino!",
  "Essa m\xE3o foi de mestre.",
  "Show! O c\xE1lculo estava 100% certo.",
  "Blackjack limpo! Fichas pra c\xE1!",
  "Excelente rodada!"
];
var BOT_BUST_REACTIONS = [
  "Arrisquei e estourou... faz parte!",
  "Essa carta alta quebrou a leitura.",
  "O dealer deu sorte nessa, na pr\xF3xima recupero!",
  "Faz parte da gest\xE3o de risco.",
  "Estourou por pouco!"
];
var globalBotCounter = 1;
function generateUniqueBot(seatIndex, excludedIds = []) {
  const firstName = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
  const nickname = NICKNAMES_AND_TITLES[Math.floor(Math.random() * NICKNAMES_AND_TITLES.length)];
  const personality = PERSONALITIES[Math.floor(Math.random() * PERSONALITIES.length)];
  const nameFormats = [
    `${firstName} (${nickname})`,
    `${firstName} '${nickname}'`,
    `${firstName} \u2022 ${personality.label}`,
    `${firstName} [VIP ${Math.floor(Math.random() * 99 + 1)}]`
  ];
  const botName = nameFormats[Math.floor(Math.random() * nameFormats.length)];
  globalBotCounter++;
  const uniqueId = `bot-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 7)}-${globalBotCounter}`;
  let avatarUrl;
  if (Math.random() > 0.4) {
    const unsplashIdx = Math.floor(Math.random() * UNSPLASH_AVATARS.length);
    avatarUrl = UNSPLASH_AVATARS[unsplashIdx];
  } else {
    const seed = AVATAR_SEEDS[Math.floor(Math.random() * AVATAR_SEEDS.length)] + Math.floor(Math.random() * 9999);
    const avatarStyles = ["avataaars", "bottts", "adventurer", "micah", "personas"];
    const style = avatarStyles[Math.floor(Math.random() * avatarStyles.length)];
    avatarUrl = `https://api.dicebear.com/7.x/${style}/svg?seed=${seed}`;
  }
  let chips = 1500;
  let wins = Math.floor(Math.random() * 30 + 5);
  if (personality.type === "high_roller") {
    chips = Math.floor(Math.random() * 15e3 + 5e3);
    wins = Math.floor(Math.random() * 80 + 35);
  } else if (personality.type === "aggressive") {
    chips = Math.floor(Math.random() * 5e3 + 2e3);
    wins = Math.floor(Math.random() * 45 + 15);
  } else if (personality.type === "conservative") {
    chips = Math.floor(Math.random() * 2500 + 1e3);
    wins = Math.floor(Math.random() * 25 + 10);
  } else {
    chips = Math.floor(Math.random() * 3500 + 1200);
    wins = Math.floor(Math.random() * 35 + 8);
  }
  const minBet = Math.max(10, Math.floor(chips * personality.minBetRatio));
  const maxBet = Math.max(25, Math.floor(chips * personality.maxBetRatio));
  let initialBet = Math.floor(Math.random() * (maxBet - minBet + 1) + minBet);
  initialBet = Math.round(initialBet / 5) * 5;
  initialBet = Math.max(10, Math.min(initialBet, chips - 50));
  return {
    id: uniqueId,
    name: botName,
    chips: chips - initialBet,
    currentBet: initialBet,
    cards: [],
    status: "ready",
    outcome: null,
    payout: 0,
    isHost: false,
    isReady: true,
    seatIndex,
    debts: {},
    wins,
    avatarUrl,
    isBot: true,
    botPersonality: personality.type
  };
}

// server.ts
var app = (0, import_express.default)();
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET,PUT,POST,DELETE,OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") {
    res.sendStatus(200);
  } else {
    next();
  }
});
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
function initPublicRooms() {
  const publicConfigs = [
    { id: "ROYALE", name: "\u{1F3B0} Mesa Cassino Royale #1" },
    { id: "VEGAS", name: "\u{1F48E} Mesa Las Vegas VIP #2" },
    { id: "MONTE", name: "\u{1F3C6} Mesa High Rollers #3" }
  ];
  for (const cfg of publicConfigs) {
    if (!rooms.has(cfg.id)) {
      const room = {
        roomId: cfg.id,
        name: cfg.name,
        isPublic: true,
        hostId: "dealer-host",
        phase: "betting",
        players: [],
        // Clean 100% human multiplayer table
        activePlayerId: null,
        dealer: {
          cards: [],
          score: 0,
          isBust: false,
          isBlackjack: false,
          statusText: "Fa\xE7am suas apostas na mesa"
        },
        shoe: createDeck(),
        roundNumber: 1,
        messages: [{
          id: `sys-${Date.now()}`,
          senderName: "Dealer VIP",
          text: `Bem-vindo \xE0 ${cfg.name}! Esta \xE9 uma mesa p\xFAblica multiplayer ao vivo. Escolha um assento livre para jogar com outros participantes!`,
          timestamp: Date.now(),
          isSystem: true
        }],
        turnTimeout: 20
      };
      rooms.set(cfg.id, room);
    }
  }
}
initPublicRooms();
function getRoomsSummary() {
  initPublicRooms();
  const summaries = [];
  for (const room of rooms.values()) {
    const seatedCount = room.players.filter((p) => !p.isSpectator).length;
    const spectatorCount = room.players.filter((p) => p.isSpectator).length;
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
  io.emit("rooms:list", getRoomsSummary());
}
function getSafeRoomState(room) {
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
function broadcastRoom(roomId) {
  const room = rooms.get(roomId);
  if (!room) return;
  io.to(roomId).emit("room:state", getSafeRoomState(room));
  broadcastRoomsList();
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
  const activePlayers = room.players.filter((p) => p.currentBet > 0).sort((a, b) => (a.seatIndex ?? 0) - (b.seatIndex ?? 0));
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
    if (nextPlayer.isBot) {
      setTimeout(() => runServerBotTurn(room, nextPlayer), 900);
    }
  } else {
    room.activePlayerId = null;
    startDealerTurn(room);
  }
}
function runServerBotTurn(room, bot) {
  if (room.phase !== "player_turns" || room.activePlayerId !== bot.id || bot.status !== "playing") return;
  const dealerVisibleCard = room.dealer.cards[0];
  const dealerUpVal = dealerVisibleCard ? dealerVisibleCard.rank === "A" ? 11 : ["K", "Q", "J", "10"].includes(dealerVisibleCard.rank) ? 10 : parseInt(dealerVisibleCard.rank, 10) : 10;
  const botScore = calculateHandScore(bot.cards);
  if (bot.cards.length === 2 && bot.chips >= bot.currentBet) {
    const isGoodDouble = botScore.total === 11 || botScore.total === 10 && dealerUpVal <= 9 || botScore.total === 9 && dealerUpVal >= 3 && dealerUpVal <= 6 && (bot.botPersonality === "aggressive" || bot.botPersonality === "high_roller");
    if (isGoodDouble) {
      bot.chips -= bot.currentBet;
      bot.currentBet *= 2;
      bot.status = "doubled";
      const card = drawCard(room, false);
      bot.cards.push(card);
      const newScore = calculateHandScore(bot.cards);
      io.to(room.roomId).emit("game:event", {
        type: "hit",
        message: `\u{1F916} ${bot.name} dobrou a aposta e recebeu ${card.rank}${card.suit}`
      });
      if (newScore.isBust) {
        bot.status = "busted";
        bot.outcome = "bust";
        io.to(room.roomId).emit("game:event", {
          type: "bust",
          message: `\u{1F916} ${bot.name} dobrou e estourou com ${newScore.total}!`
        });
      }
      broadcastRoom(room.roomId);
      setTimeout(() => advanceTurn(room), 1e3);
      return;
    }
  }
  let shouldHit = false;
  if (botScore.isBust) {
    bot.status = "busted";
    bot.outcome = "bust";
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
      if (bot.botPersonality === "aggressive" && botScore.total === 16 && dealerUpVal >= 7) {
        shouldHit = true;
      } else if (bot.botPersonality === "conservative" && botScore.total >= 13) {
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
    io.to(room.roomId).emit("game:event", {
      type: "hit",
      message: `\u{1F916} ${bot.name} pediu carta e recebeu ${card.rank}${card.suit}`
    });
    broadcastRoom(room.roomId);
    if (newScore.isBust) {
      bot.status = "busted";
      bot.outcome = "bust";
      io.to(room.roomId).emit("game:event", {
        type: "bust",
        message: `\u{1F916} ${bot.name} estourou com ${newScore.total} pontos!`
      });
      setTimeout(() => advanceTurn(room), 1e3);
    } else if (newScore.total === 21) {
      bot.status = "stand";
      io.to(room.roomId).emit("game:event", {
        type: "stand",
        message: `\u{1F916} ${bot.name} atingiu 21 e parou.`
      });
      setTimeout(() => advanceTurn(room), 800);
    } else {
      setTimeout(() => runServerBotTurn(room, bot), 900);
    }
  } else {
    bot.status = "stand";
    io.to(room.roomId).emit("game:event", {
      type: "stand",
      message: `\u{1F916} ${bot.name} parou com ${botScore.total} pontos.`
    });
    broadcastRoom(room.roomId);
    setTimeout(() => advanceTurn(room), 700);
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
function startNewRoundInternal(room) {
  if (room.phase !== "round_over") return;
  if (room.dealerTimer) {
    clearTimeout(room.dealerTimer);
    room.dealerTimer = void 0;
  }
  if (room.autoNextTimer) {
    clearTimeout(room.autoNextTimer);
    room.autoNextTimer = void 0;
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
      p.cards = [];
      p.currentBet = 0;
      return;
    }
    p.cards = [];
    p.outcome = null;
    p.payout = 0;
    p.isReady = false;
    if (p.chips <= 0) {
      p.chips = 500;
      room.messages.push({
        id: `sys-${Date.now()}-${p.id}`,
        senderName: "Mesa",
        text: `${p.name} recebeu recarga de fichas do cassino!`,
        timestamp: Date.now(),
        isSystem: true
      });
    }
    if (p.isBot) {
      p.currentBet = Math.min(p.chips, [25, 50, 100][Math.floor(Math.random() * 3)]);
      p.isReady = true;
      p.status = "ready";
    } else {
      p.currentBet = Math.min(p.currentBet, p.chips);
      p.status = "betting";
    }
  });
  broadcastRoom(room.roomId);
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
      if (player.isBot && Math.random() < 0.4) {
        const winReaction = BOT_WIN_REACTIONS[Math.floor(Math.random() * BOT_WIN_REACTIONS.length)];
        room.messages.push({
          id: `bot-react-${Date.now()}-${Math.random()}`,
          senderName: player.name,
          text: winReaction,
          timestamp: Date.now()
        });
      }
    } else if (outcome === "bust" || outcome === "lose") {
      if (player.isBot && Math.random() < 0.25) {
        const bustReaction = BOT_BUST_REACTIONS[Math.floor(Math.random() * BOT_BUST_REACTIONS.length)];
        room.messages.push({
          id: `bot-react-${Date.now()}-${Math.random()}`,
          senderName: player.name,
          text: bustReaction,
          timestamp: Date.now()
        });
      }
    }
  });
  const summary = customSummary || (dealerScore.isBust ? "A Mesa estourou! Pagando apostas aos jogadores ativos." : `Rodada finalizada. Mesa terminou com ${dealerScore.total} pontos.`);
  io.to(room.roomId).emit("game:event", {
    type: "round_end",
    message: summary
  });
  broadcastRoom(room.roomId);
  if (room.isPublic) {
    if (room.autoNextTimer) clearTimeout(room.autoNextTimer);
    room.autoNextTimer = setTimeout(() => {
      const curr = rooms.get(room.roomId);
      if (curr && curr.phase === "round_over") {
        startNewRoundInternal(curr);
      }
    }, 6e3);
  }
}
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", activeRooms: rooms.size });
});
io.on("connection", (socket) => {
  let currentRoomId = null;
  let playerRefId = socket.id;
  socket.emit("rooms:list", getRoomsSummary());
  socket.on("rooms:get_list", () => {
    socket.emit("rooms:list", getRoomsSummary());
  });
  socket.on("rooms:quick_play", ({ playerName, wins, chips, avatarUrl }, callback) => {
    initPublicRooms();
    const publicRooms = Array.from(rooms.values()).filter((r) => r.isPublic);
    publicRooms.sort((a, b) => {
      const aSeated = a.players.filter((p) => !p.isSpectator).length;
      const bSeated = b.players.filter((p) => !p.isSpectator).length;
      return bSeated - aSeated;
    });
    const target = publicRooms.find((r) => r.players.filter((p) => !p.isSpectator).length < 9) || publicRooms[0];
    if (!target) {
      callback?.({ success: false, error: "Nenhuma mesa dispon\xEDvel no momento." });
      return;
    }
    joinRoomInternal(target.roomId, playerName, wins, chips, avatarUrl, callback);
  });
  socket.on("room:create", ({ playerName, wins, chips, avatarUrl, customRoomId }, callback) => {
    const roomId = customRoomId && typeof customRoomId === "string" ? customRoomId.trim().toUpperCase() : generateRoomCode();
    currentRoomId = roomId;
    const newPlayer = {
      id: socket.id,
      name: playerName.trim() || "Jogador 1",
      chips: typeof chips === "number" ? Math.min(25e4, chips) : 500,
      currentBet: 0,
      cards: [],
      status: "betting",
      outcome: null,
      payout: 0,
      isHost: true,
      isReady: false,
      seatIndex: 0,
      // Seat 1
      isSpectator: false,
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
        text: `Mesa VIP criada com c\xF3digo ${roomId}! Compartilhe este c\xF3digo com seus amigos para jogarem juntos.`,
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
  function joinRoomInternal(roomId, playerName, wins, chips, avatarUrl, callback) {
    const upperId = roomId.trim().toUpperCase();
    const room = rooms.get(upperId);
    if (!room) {
      callback?.({ success: false, error: "Sala n\xE3o encontrada. Verifique se o c\xF3digo est\xE1 correto e se o host continua com a mesa aberta." });
      return;
    }
    currentRoomId = upperId;
    socket.join(upperId);
    let existing = room.players.find((p) => p.id === socket.id);
    if (!existing) {
      const occupiedSeats = new Set(room.players.filter((p) => !p.isSpectator).map((p) => p.seatIndex));
      let availableSeat = -1;
      for (let s = 0; s < 9; s++) {
        if (!occupiedSeats.has(s)) {
          availableSeat = s;
          break;
        }
      }
      const isSeated = availableSeat !== -1;
      const newPlayer = {
        id: socket.id,
        name: playerName.trim() || `Jogador ${room.players.length + 1}`,
        chips: typeof chips === "number" && chips > 0 ? Math.min(25e4, chips) : 500,
        currentBet: 0,
        cards: [],
        status: isSeated ? room.phase === "betting" ? "betting" : "waiting" : "spectator",
        outcome: null,
        payout: 0,
        isHost: room.players.filter((p) => !p.isBot).length === 0,
        isReady: false,
        seatIndex: availableSeat,
        isSpectator: !isSeated,
        debts: {},
        wins: typeof wins === "number" ? wins : 0,
        avatarUrl: typeof avatarUrl === "string" ? avatarUrl : void 0
      };
      room.players.push(newPlayer);
      room.messages.push({
        id: `sys-${Date.now()}`,
        senderName: "Mesa",
        text: isSeated ? `\u{1F389} ${newPlayer.name} entrou e sentou no Assento ${availableSeat + 1}!` : `${newPlayer.name} entrou na sala como espectador (todos os 9 assentos est\xE3o ocupados).`,
        timestamp: Date.now(),
        isSystem: true
      });
    } else {
      existing.name = playerName.trim() || existing.name;
      if (typeof avatarUrl === "string") existing.avatarUrl = avatarUrl;
    }
    callback?.({ success: true, roomId: upperId });
    broadcastRoom(upperId);
  }
  socket.on("room:join", ({ roomId, playerName, wins, chips, avatarUrl }, callback) => {
    joinRoomInternal(roomId, playerName, wins, chips, avatarUrl, callback);
  });
  socket.on("player:take_seat", ({ seatIndex }, callback) => {
    if (!currentRoomId) return;
    const room = rooms.get(currentRoomId);
    if (!room) return;
    if (typeof seatIndex !== "number" || seatIndex < 0 || seatIndex >= 9) {
      callback?.({ success: false, error: "Assento inv\xE1lido (escolha de 1 a 9)." });
      return;
    }
    const occupiedIndex = room.players.findIndex((p) => !p.isSpectator && p.seatIndex === seatIndex && p.id !== socket.id);
    if (occupiedIndex !== -1) {
      const occupant = room.players[occupiedIndex];
      if (occupant.isBot) {
        occupant.isSpectator = true;
        occupant.seatIndex = -1;
        occupant.status = "spectator";
        occupant.isReady = false;
        room.messages.push({
          id: `sys-${Date.now()}`,
          senderName: "Mesa",
          text: `\u{1F916} ${occupant.name} cedeu o Assento ${seatIndex + 1} para o jogador real!`,
          timestamp: Date.now(),
          isSystem: true
        });
      } else {
        callback?.({ success: false, error: `O Assento ${seatIndex + 1} j\xE1 est\xE1 ocupado.` });
        return;
      }
    }
    const player = room.players.find((p) => p.id === socket.id);
    if (!player) return;
    if (player.status === "playing") {
      callback?.({ success: false, error: "Termine a sua jogada antes de trocar de assento." });
      return;
    }
    const prevSeat = player.seatIndex;
    player.isSpectator = false;
    player.seatIndex = seatIndex;
    player.status = room.phase === "betting" ? "betting" : "waiting";
    player.isReady = false;
    player.currentBet = 0;
    room.messages.push({
      id: `sys-${Date.now()}`,
      senderName: "Mesa",
      text: prevSeat >= 0 && prevSeat !== seatIndex ? `${player.name} mudou para o Assento ${seatIndex + 1}.` : `${player.name} sentou no Assento ${seatIndex + 1}!`,
      timestamp: Date.now(),
      isSystem: true
    });
    callback?.({ success: true, seatIndex });
    broadcastRoom(currentRoomId);
    checkStartDeal(room);
  });
  socket.on("player:stand_up", (callback) => {
    if (!currentRoomId) return;
    const room = rooms.get(currentRoomId);
    if (!room) return;
    const player = room.players.find((p) => p.id === socket.id);
    if (!player || player.isSpectator) return;
    if (player.status === "playing") {
      callback?.({ success: false, error: "Termine sua rodada antes de se levantar." });
      return;
    }
    if (room.phase === "betting" && player.currentBet > 0) {
      player.chips += player.currentBet;
      player.currentBet = 0;
    }
    const prevSeat = player.seatIndex;
    player.isSpectator = true;
    player.seatIndex = -1;
    player.status = "spectator";
    player.isReady = false;
    player.cards = [];
    room.messages.push({
      id: `sys-${Date.now()}`,
      senderName: "Mesa",
      text: `${player.name} levantou do Assento ${prevSeat + 1} e agora est\xE1 assistindo como espectador.`,
      timestamp: Date.now(),
      isSystem: true
    });
    callback?.({ success: true });
    broadcastRoom(currentRoomId);
    checkStartDeal(room);
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
      const validAmount = Math.max(0, Math.min(amount, player.chips));
      player.currentBet = validAmount;
      broadcastRoom(currentRoomId);
    }
  });
  function checkStartDeal(room) {
    if (room.phase !== "betting") return;
    const seatedPlayers = room.players.filter((p) => !p.isSpectator);
    const allReady = seatedPlayers.every((p) => p.isReady || p.chips === 0);
    if (allReady && seatedPlayers.some((p) => p.isReady)) {
      startGameDeal(room);
    }
  }
  socket.on("player:ready", () => {
    if (!currentRoomId) return;
    const room = rooms.get(currentRoomId);
    if (!room || room.phase !== "betting") return;
    const player = room.players.find((p) => p.id === socket.id);
    if (player && !player.isSpectator && player.currentBet > 0 && player.currentBet <= player.chips) {
      player.isReady = !player.isReady;
      player.status = player.isReady ? "ready" : "betting";
      broadcastRoom(currentRoomId);
      checkStartDeal(room);
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
    const readyPlayers = room.players.filter((p) => !p.isSpectator && p.isReady && p.currentBet > 0).sort((a, b) => (a.seatIndex ?? 0) - (b.seatIndex ?? 0));
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
          if (firstActive.isBot) {
            setTimeout(() => runServerBotTurn(room, firstActive), 900);
          }
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
    const player = room.players.find((p) => p.id === socket.id);
    if (!player) return;
    if (!room.isPublic && !player.isHost) {
      socket.emit("room:error", { message: "Apenas o Criador da Sala pode iniciar a nova rodada!" });
      return;
    }
    startNewRoundInternal(room);
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
  socket.on("room:toggle_bots", () => {
    if (!currentRoomId) return;
    const room = rooms.get(currentRoomId);
    if (!room || room.phase !== "betting") return;
    const player = room.players.find((p) => p.id === socket.id);
    if (player && player.isHost) {
      const bots = room.players.filter((p) => p.isBot);
      if (bots.length > 0) {
        room.players = room.players.filter((p) => !p.isBot);
        room.messages.push({
          id: `sys-${Date.now()}`,
          senderName: "Mesa",
          text: "Todos os bots foram removidos da mesa.",
          timestamp: Date.now(),
          isSystem: true
        });
      } else {
        for (let i = 0; i < 3; i++) {
          addBotToServerRoom(room);
        }
        room.messages.push({
          id: `sys-${Date.now()}`,
          senderName: "Mesa",
          text: "3 novos jogadores Bots de IA entraram na mesa!",
          timestamp: Date.now(),
          isSystem: true
        });
      }
      broadcastRoom(currentRoomId);
      checkStartDeal(room);
    }
  });
  function addBotToServerRoom(room) {
    const seatedCount = room.players.filter((p) => !p.isSpectator).length;
    if (seatedCount >= 9) return;
    const takenSeats = new Set(room.players.filter((p) => !p.isSpectator).map((p) => p.seatIndex));
    let availableSeat = -1;
    for (let s = 0; s < 9; s++) {
      if (!takenSeats.has(s)) {
        availableSeat = s;
        break;
      }
    }
    if (availableSeat === -1) return;
    const excludedIds = room.players.map((p) => p.id);
    const newBot = generateUniqueBot(availableSeat, excludedIds);
    newBot.status = room.phase === "betting" ? "ready" : "waiting";
    newBot.isReady = room.phase === "betting";
    if (room.phase === "betting") {
      newBot.currentBet = Math.max(10, Math.floor(newBot.chips * 0.1));
    }
    room.players.push(newBot);
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
  socket.on("room:remove_bot", ({ botId }) => {
    if (!currentRoomId) return;
    const room = rooms.get(currentRoomId);
    if (!room) return;
    const player = room.players.find((p) => p.id === socket.id);
    if (player && player.isHost) {
      const bots = room.players.filter((p) => p.isBot);
      if (bots.length === 0) return;
      const targetBot = botId ? bots.find((b) => b.id === botId) : bots[bots.length - 1];
      if (targetBot) {
        room.players = room.players.filter((p) => p.id !== targetBot.id);
        broadcastRoom(currentRoomId);
        checkStartDeal(room);
      }
    }
  });
  socket.on("room:add_bot", () => {
    if (!currentRoomId) return;
    const room = rooms.get(currentRoomId);
    if (!room || room.phase !== "betting") return;
    const player = room.players.find((p) => p.id === socket.id);
    if (player && player.isHost && room.players.length < 9) {
      addBotToServerRoom(room);
      broadcastRoom(currentRoomId);
      checkStartDeal(room);
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
    if (room.isPublic) {
      if (wasActive && room.phase === "player_turns") {
        advanceTurn(room);
      }
      broadcastRoom(currentRoomId);
      broadcastRoomsList();
    } else if (room.players.length === 0 || room.players.every((p) => p.isBot)) {
      const closingRoomId = currentRoomId;
      setTimeout(() => {
        const checkRoom = rooms.get(closingRoomId);
        if (checkRoom && (checkRoom.players.length === 0 || checkRoom.players.every((p) => p.isBot))) {
          if (checkRoom.dealerTimer) clearTimeout(checkRoom.dealerTimer);
          clearTurnTimer(checkRoom);
          rooms.delete(closingRoomId);
          broadcastRoomsList();
        }
      }, 45e3);
      broadcastRoomsList();
    } else {
      if (room.hostId === socket.id) {
        const nextRealPlayer = room.players.find((p) => !p.isBot);
        if (nextRealPlayer) {
          room.hostId = nextRealPlayer.id;
          nextRealPlayer.isHost = true;
        }
      }
      if (wasActive && room.phase === "player_turns") {
        advanceTurn(room);
      }
      broadcastRoom(currentRoomId);
      broadcastRoomsList();
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
