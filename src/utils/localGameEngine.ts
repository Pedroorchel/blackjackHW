import { Card, Dealer, OutcomeType, Player, RoomState, RoundPhase, TableChatMessage } from '../types';
import { calculateHandScore, createDeck } from './blackjack';
import { 
  generateUniqueBot, 
  BOT_CHAT_GREETINGS, 
  BOT_WIN_REACTIONS, 
  BOT_BUST_REACTIONS 
} from './botGenerator';

export interface LocalEngineListener {
  onState: (state: RoomState) => void;
  onEvent: (event: { type: string; message: string }) => void;
}

export class LocalGameEngine {
  private roomId: string = 'VIP-SOLO';
  private hostId: string = 'local-player';
  private phase: RoundPhase = 'betting';
  private players: Player[] = [];
  private activePlayerId: string | null = null;
  private dealer: Dealer = { cards: [], score: 0, isBust: false, isBlackjack: false, statusText: 'Façam suas apostas' };
  private shoe: Card[] = [];
  private roundNumber: number = 1;
  private messages: TableChatMessage[] = [];
  private listeners: LocalEngineListener[] = [];
  private turnTimeout: number = 20;
  private turnStartTime?: number;

  constructor() {
    this.shoe = createDeck();
  }

  public subscribe(listener: LocalEngineListener) {
    this.listeners.push(listener);
    listener.onState(this.getState());
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private emitState() {
    const state = this.getState();
    this.listeners.forEach(l => l.onState(state));
  }

  private emitEvent(type: string, message: string) {
    this.listeners.forEach(l => l.onEvent({ type, message }));
  }

  public getState(): RoomState {
    return {
      roomId: this.roomId,
      hostId: this.hostId,
      phase: this.phase,
      players: JSON.parse(JSON.stringify(this.players)),
      activePlayerId: this.activePlayerId,
      dealer: JSON.parse(JSON.stringify(this.dealer)),
      deckRemaining: this.shoe.length,
      roundNumber: this.roundNumber,
      messages: [...this.messages],
      turnTimeout: this.turnTimeout,
      turnStartTime: this.turnStartTime,
    };
  }

  private drawCard(hidden: boolean = false): Card {
    if (this.shoe.length < 15) {
      this.shoe = createDeck();
      this.emitEvent('info', 'Baralho reembaralhado pelo Cassino.');
    }
    const card = this.shoe.pop()!;
    return { ...card, hidden };
  }

  public createRoom(
    playerName: string, 
    wins: number = 0, 
    chips: number = 1000, 
    avatarUrl?: string, 
    customRoomId?: string,
    initialBotsCount: number = 0
  ): string {
    this.roomId = customRoomId || ('MESA-' + Math.floor(100 + Math.random() * 900));
    this.hostId = 'local-player';
    this.phase = 'betting';
    this.roundNumber = 1;
    this.messages = [
      {
        id: 'msg-welcome',
        senderName: 'Dealer VIP',
        text: `Bem-vindo à Mesa VIP ${this.roomId}! Convide seus amigos enviando o código da sala para jogarem juntos em tempo real.`,
        timestamp: Date.now(),
      }
    ];

    const initialChips = Math.max(chips, 100);

    this.players = [
      {
        id: 'local-player',
        name: playerName || 'Jogador (Host)',
        chips: initialChips,
        currentBet: 0,
        cards: [],
        status: 'betting',
        outcome: null,
        payout: 0,
        isHost: true,
        isReady: false,
        seatIndex: 0,
        isSpectator: false,
        debts: {},
        wins: wins || 0,
        avatarUrl,
        isBot: false,
      }
    ];

    // Populate initial bots only if requested (e.g. Solo Bot Mode)
    const count = Math.min(initialBotsCount, 7);
    for (let i = 0; i < count; i++) {
      this.addBot(false);
    }

    this.dealer = {
      cards: [],
      score: 0,
      isBust: false,
      isBlackjack: false,
      statusText: 'Façam suas apostas na mesa',
    };

    this.emitState();
    return this.roomId;
  }

  public addBot(emit: boolean = true): boolean {
    const seatedCount = this.players.filter(p => !p.isSpectator).length;
    if (seatedCount >= 9) {
      this.emitEvent('error', 'A mesa já está cheia (máximo de 9 jogadores).');
      return false;
    }

    // Find first free seat index from 0 to 8
    const takenSeats = new Set(this.players.filter(p => !p.isSpectator).map(p => p.seatIndex));
    let availableSeat = -1;
    for (let s = 0; s <= 8; s++) {
      if (!takenSeats.has(s)) {
        availableSeat = s;
        break;
      }
    }
    if (availableSeat === -1) return false;

    // Generate unique procedural bot
    const excludedIds = this.players.map(p => p.id);
    const botPlayer = generateUniqueBot(availableSeat, excludedIds);
    botPlayer.status = this.phase === 'betting' ? 'ready' : 'waiting';

    this.players.push(botPlayer);

    const greeting = BOT_CHAT_GREETINGS[Math.floor(Math.random() * BOT_CHAT_GREETINGS.length)];
    this.messages.push({
      id: 'bot-join-' + Date.now() + '-' + Math.random(),
      senderName: botPlayer.name,
      text: greeting,
      timestamp: Date.now(),
    });

    if (emit) {
      this.emitEvent('info', `🤖 ${botPlayer.name} entrou na mesa com $${botPlayer.chips + botPlayer.currentBet}!`);
      this.emitState();
    }
    return true;
  }

  public takeSeat(playerId: string, seatIndex: number): boolean {
    if (seatIndex < 0 || seatIndex >= 9) {
      this.emitEvent('error', 'Assento inválido (escolha de 1 a 9).');
      return false;
    }

    const occupied = this.players.some(p => !p.isSpectator && p.seatIndex === seatIndex && p.id !== playerId && p.id !== 'local-player');
    if (occupied) {
      this.emitEvent('error', `O Assento ${seatIndex + 1} já está ocupado!`);
      return false;
    }

    const player = this.players.find(p => p.id === playerId || (playerId === 'local-player' && p.id === 'local-player'));
    if (!player) return false;

    if (player.status === 'playing') {
      this.emitEvent('error', 'Termine a sua jogada antes de trocar de assento.');
      return false;
    }

    const prevSeat = player.seatIndex;
    player.isSpectator = false;
    player.seatIndex = seatIndex;
    player.status = this.phase === 'betting' ? 'betting' : 'waiting';
    player.isReady = false;
    player.currentBet = 0;

    this.messages.push({
      id: 'msg-seat-' + Date.now(),
      senderName: 'Dealer VIP',
      text: prevSeat >= 0 && prevSeat !== seatIndex
        ? `${player.name} mudou para o Assento ${seatIndex + 1}.`
        : `${player.name} sentou no Assento ${seatIndex + 1}!`,
      timestamp: Date.now(),
    });

    this.emitEvent('info', `Você sentou no Assento ${seatIndex + 1}.`);
    this.emitState();
    return true;
  }

  public standUp(playerId: string): boolean {
    const player = this.players.find(p => p.id === playerId || (playerId === 'local-player' && p.id === 'local-player'));
    if (!player || player.isSpectator) return false;

    if (player.status === 'playing') {
      this.emitEvent('error', 'Termine a sua jogada antes de se levantar.');
      return false;
    }

    if (this.phase === 'betting' && player.currentBet > 0) {
      player.chips += player.currentBet;
      player.currentBet = 0;
    }

    const prevSeat = player.seatIndex;
    player.isSpectator = true;
    player.seatIndex = -1;
    player.status = 'spectator';
    player.isReady = false;
    player.cards = [];

    this.messages.push({
      id: 'msg-stand-' + Date.now(),
      senderName: 'Dealer VIP',
      text: `${player.name} levantou do Assento ${prevSeat + 1} e agora está assistindo como espectador.`,
      timestamp: Date.now(),
    });

    this.emitEvent('info', 'Você agora está no modo espectador.');
    this.emitState();
    return true;
  }

  public removeBot(botId?: string): boolean {
    const bots = this.players.filter(p => p.isBot);
    if (bots.length === 0) {
      this.emitEvent('info', 'Não há bots na mesa para remover.');
      return false;
    }

    const targetBot = botId ? bots.find(b => b.id === botId) : bots[bots.length - 1];
    if (!targetBot) return false;

    this.players = this.players.filter(p => p.id !== targetBot.id);

    this.messages.push({
      id: 'bot-leave-' + Date.now(),
      senderName: 'Dealer VIP',
      text: `🤖 ${targetBot.name} saiu da mesa e retirou suas fichas.`,
      timestamp: Date.now(),
    });

    this.emitEvent('info', `🤖 ${targetBot.name} saiu da mesa.`);
    this.emitState();
    return true;
  }

  public toggleBots(): void {
    const bots = this.players.filter(p => p.isBot);
    if (bots.length > 0) {
      this.players = this.players.filter(p => !p.isBot);
      this.emitEvent('info', 'Todos os bots foram removidos da mesa.');
      this.emitState();
    } else {
      this.addBot(false);
      this.addBot(false);
      this.addBot(false);
      this.emitEvent('info', '3 novos jogadores Bots de IA entraram na mesa!');
      this.emitState();
    }
  }

  public setBet(playerId: string, amount: number) {
    const p = this.players.find(x => x.id === playerId || x.id === 'local-player');
    if (!p || this.phase !== 'betting') return;

    const validBet = Math.max(0, Math.min(amount, p.chips));
    p.currentBet = validBet;
    p.isReady = false;
    p.status = 'betting';
    this.emitState();
  }

  public toggleReady(playerId: string) {
    const p = this.players.find(x => x.id === playerId || x.id === 'local-player');
    if (!p || this.phase !== 'betting') return;

    p.isReady = true;
    p.status = 'ready';
    this.emitState();

    // In local engine / bot table, confirming bet starts the deal immediately
    setTimeout(() => {
      if (this.phase === 'betting') {
        this.startDeal();
      }
    }, 150);
  }

  public startDeal() {
    if (this.phase !== 'betting') return;

    this.phase = 'dealing';
    this.emitEvent('deal', 'O Dealer começou a distribuição das cartas!');

    // Reset hands and deduct bets
    this.dealer = {
      cards: [],
      score: 0,
      isBust: false,
      isBlackjack: false,
      statusText: 'Distribuindo...',
    };

    this.players.forEach(p => {
      if (p.isSpectator) {
        p.status = 'spectator';
        p.cards = [];
        p.currentBet = 0;
        return;
      }
      p.cards = [];
      p.outcome = null;
      p.payout = 0;
      if (p.currentBet > 0) {
        p.chips -= p.currentBet;
        p.status = 'playing';
      } else {
        p.status = 'waiting';
      }
    });

    this.emitState();

    setTimeout(() => {
      // First card to players
      this.players.forEach(p => {
        if (p.currentBet > 0) {
          p.cards.push(this.drawCard(false));
        }
      });
      // First card to dealer (visible)
      this.dealer.cards.push(this.drawCard(false));

      // Second card to players
      this.players.forEach(p => {
        if (p.currentBet > 0) {
          p.cards.push(this.drawCard(false));
        }
      });
      // Second card to dealer (hidden hole card)
      this.dealer.cards.push(this.drawCard(true));

      const dealerInitial = calculateHandScore(this.dealer.cards);
      this.dealer.score = dealerInitial.total;
      this.dealer.statusText = `Carta aberta: ${dealerInitial.total}`;

      // Check player blackjacks
      this.players.forEach(p => {
        if (p.currentBet > 0) {
          const score = calculateHandScore(p.cards);
          if (score.isBlackjack) {
            p.status = 'blackjack';
            this.emitEvent('blackjack', `${p.name} tem Blackjack natural (21)!`);
          }
        }
      });

      this.phase = 'player_turns';
      this.turnStartTime = Date.now();
      this.turnTimeout = 20;

      // Start with first active player
      const activePlayers = this.players
        .filter(p => p.currentBet > 0)
        .sort((a, b) => (a.seatIndex ?? 0) - (b.seatIndex ?? 0));
      const firstPlayer = activePlayers.find(p => p.status === 'playing');

      if (firstPlayer) {
        this.activePlayerId = firstPlayer.id;
        if (firstPlayer.isBot) {
          this.emitState();
          setTimeout(() => this.runBotTurn(firstPlayer), 900);
        } else {
          this.emitState();
        }
      } else {
        this.activePlayerId = null;
        this.startDealerTurn();
      }
    }, 600);
  }

  public hit(playerId: string) {
    const p = this.players.find(x => x.id === playerId || x.id === 'local-player');
    if (!p || this.phase !== 'player_turns' || this.activePlayerId !== p.id) return;

    const card = this.drawCard(false);
    p.cards.push(card);
    const score = calculateHandScore(p.cards);

    if (score.isBust) {
      p.status = 'busted';
      p.outcome = 'bust';
      this.emitEvent('bust', `${p.name} estourou com ${score.total} pontos!`);
      this.advanceTurn();
    } else if (score.total === 21) {
      p.status = 'stand';
      this.emitEvent('stand', `${p.name} atingiu 21 pontos e parou!`);
      this.advanceTurn();
    } else {
      this.emitState();
    }
  }

  public stand(playerId: string) {
    const p = this.players.find(x => x.id === playerId || x.id === 'local-player');
    if (!p || this.phase !== 'player_turns' || this.activePlayerId !== p.id) return;

    p.status = 'stand';
    const score = calculateHandScore(p.cards);
    this.emitEvent('stand', `${p.name} parou com ${score.total} pontos.`);
    this.advanceTurn();
  }

  public double(playerId: string) {
    const p = this.players.find(x => x.id === playerId || x.id === 'local-player');
    if (!p || this.phase !== 'player_turns' || this.activePlayerId !== p.id || p.cards.length !== 2) return;

    if (p.chips < p.currentBet) {
      this.emitEvent('error', 'Fichas insuficientes para Dobrar.');
      return;
    }

    p.chips -= p.currentBet;
    p.currentBet *= 2;
    p.status = 'doubled';

    const card = this.drawCard(false);
    p.cards.push(card);
    const score = calculateHandScore(p.cards);

    if (score.isBust) {
      p.status = 'busted';
      p.outcome = 'bust';
      this.emitEvent('bust', `${p.name} dobrou a aposta e estourou com ${score.total}!`);
    } else {
      p.status = 'stand';
      this.emitEvent('double', `${p.name} dobrou a aposta e finalizou com ${score.total}!`);
    }

    this.advanceTurn();
  }

  private advanceTurn() {
    const activePlayers = this.players
      .filter(p => p.currentBet > 0)
      .sort((a, b) => (a.seatIndex ?? 0) - (b.seatIndex ?? 0));
    const currentIndex = activePlayers.findIndex(p => p.id === this.activePlayerId);

    let nextPlayer: Player | null = null;
    for (let i = currentIndex + 1; i < activePlayers.length; i++) {
      const p = activePlayers[i];
      if (p.status === 'playing' || p.status === 'ready') {
        nextPlayer = p;
        break;
      }
    }

    if (nextPlayer) {
      this.activePlayerId = nextPlayer.id;
      nextPlayer.status = 'playing';
      this.turnStartTime = Date.now();

      // Bot turn automation
      if (nextPlayer.isBot || nextPlayer.id.startsWith('bot-')) {
        this.emitState();
        setTimeout(() => this.runBotTurn(nextPlayer!), 900);
      } else {
        this.emitState();
      }
    } else {
      this.activePlayerId = null;
      this.startDealerTurn();
    }
  }

  // Realistic Blackjack Basic Strategy & Personality for AI Bots
  private runBotTurn(bot: Player) {
    if (this.phase !== 'player_turns' || this.activePlayerId !== bot.id) return;

    const dealerVisibleCard = this.dealer.cards[0];
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
        const card = this.drawCard(false);
        bot.cards.push(card);
        const finalScore = calculateHandScore(bot.cards);
        if (finalScore.isBust) {
          bot.status = 'busted';
          bot.outcome = 'bust';
          this.emitEvent('bust', `🤖 ${bot.name} dobrou e estourou com ${finalScore.total}!`);
        } else {
          bot.status = 'stand';
          this.emitEvent('double', `🤖 ${bot.name} dobrou e parou com ${finalScore.total} pontos.`);
        }
        this.emitState();
        setTimeout(() => this.advanceTurn(), 800);
        return;
      }
    }

    // Strategy decision
    let shouldHit = false;

    if (botScore.isBust) {
      bot.status = 'busted';
      bot.outcome = 'bust';
      this.advanceTurn();
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
      const card = this.drawCard(false);
      bot.cards.push(card);
      const newScore = calculateHandScore(bot.cards);
      this.emitEvent('hit', `🤖 ${bot.name} pediu carta.`);
      this.emitState();

      if (newScore.isBust) {
        bot.status = 'busted';
        bot.outcome = 'bust';
        this.emitEvent('bust', `🤖 ${bot.name} estourou com ${newScore.total}!`);
        setTimeout(() => this.advanceTurn(), 800);
      } else if (newScore.total === 21) {
        bot.status = 'stand';
        this.emitEvent('stand', `🤖 ${bot.name} atingiu 21 e parou.`);
        setTimeout(() => this.advanceTurn(), 800);
      } else {
        setTimeout(() => this.runBotTurn(bot), 900);
      }
    } else {
      bot.status = 'stand';
      this.emitEvent('stand', `🤖 ${bot.name} parou com ${botScore.total} pontos.`);
      this.emitState();
      setTimeout(() => this.advanceTurn(), 700);
    }
  }

  private startDealerTurn() {
    this.phase = 'dealer_turn';
    this.dealer.statusText = 'Dealer virando a carta...';
    this.emitState();

    setTimeout(() => {
      this.dealer.cards = this.dealer.cards.map(c => ({ ...c, hidden: false }));
      const currentScore = calculateHandScore(this.dealer.cards);
      this.dealer.score = currentScore.total;
      this.dealer.isBlackjack = currentScore.isBlackjack;
      this.dealer.isBust = currentScore.isBust;
      this.dealer.statusText = `Mesa revelou: ${currentScore.total} pontos`;
      this.emitState();

      const playersWithBets = this.players.filter(p => p.currentBet > 0);
      const allBusted = playersWithBets.every(p => p.status === 'busted');

      if (allBusted) {
        setTimeout(() => this.finishRound('Todos os jogadores estouraram. Dealer vence!'), 900);
        return;
      }

      const drawDealerCard = () => {
        const s = calculateHandScore(this.dealer.cards);
        if (s.total < 17) {
          const c = this.drawCard(false);
          this.dealer.cards.push(c);
          const updated = calculateHandScore(this.dealer.cards);
          this.dealer.score = updated.total;
          this.dealer.isBust = updated.isBust;
          this.dealer.statusText = `Dealer comprou: ${updated.total} pontos`;
          this.emitState();

          if (updated.isBust) {
            this.dealer.statusText = `Dealer ESTOUROU com ${updated.total} pontos!`;
            setTimeout(() => this.finishRound('Dealer estourou! Pagando jogadores...'), 1000);
          } else {
            setTimeout(drawDealerCard, 800);
          }
        } else {
          this.dealer.statusText = `Dealer parou com ${s.total} pontos`;
          this.emitState();
          setTimeout(() => this.finishRound(`Dealer finalizou com ${s.total} pontos.`), 900);
        }
      };

      setTimeout(drawDealerCard, 800);
    }, 900);
  }

  private finishRound(reason: string) {
    this.phase = 'round_over';
    const dealerScore = calculateHandScore(this.dealer.cards);

    this.players.forEach(p => {
      if (p.currentBet === 0) return;

      const pScore = calculateHandScore(p.cards);

      if (p.status === 'busted' || pScore.isBust) {
        p.outcome = 'bust';
        p.payout = 0;
        if (p.isBot && Math.random() < 0.25) {
          const bustReaction = BOT_BUST_REACTIONS[Math.floor(Math.random() * BOT_BUST_REACTIONS.length)];
          this.messages.push({
            id: 'bot-react-' + Date.now() + '-' + Math.random(),
            senderName: p.name,
            text: bustReaction,
            timestamp: Date.now(),
          });
        }
      } else if (p.status === 'blackjack' || pScore.isBlackjack) {
        if (dealerScore.isBlackjack) {
          p.outcome = 'push';
          p.payout = p.currentBet;
          p.chips += p.payout;
        } else {
          p.outcome = 'blackjack';
          p.payout = Math.floor(p.currentBet * 2.5);
          p.chips += p.payout;
          p.wins = (p.wins || 0) + 1;
          if (p.isBot && Math.random() < 0.4) {
            const winReaction = BOT_WIN_REACTIONS[Math.floor(Math.random() * BOT_WIN_REACTIONS.length)];
            this.messages.push({
              id: 'bot-react-' + Date.now() + '-' + Math.random(),
              senderName: p.name,
              text: winReaction,
              timestamp: Date.now(),
            });
          }
        }
      } else if (dealerScore.isBust) {
        p.outcome = 'win';
        p.payout = p.currentBet * 2;
        p.chips += p.payout;
        p.wins = (p.wins || 0) + 1;
      } else if (pScore.total > dealerScore.total) {
        p.outcome = 'win';
        p.payout = p.currentBet * 2;
        p.chips += p.payout;
        p.wins = (p.wins || 0) + 1;
      } else if (pScore.total === dealerScore.total) {
        p.outcome = 'push';
        p.payout = p.currentBet;
        p.chips += p.payout;
      } else {
        p.outcome = 'lose';
        p.payout = 0;
      }
    });

    this.messages.push({
      id: 'round-result-' + Date.now(),
      senderName: 'Dealer VIP',
      text: reason,
      timestamp: Date.now(),
    });

    this.emitEvent('round_over', reason);
    this.emitState();
  }

  /**
   * New round with Dynamic Bot Rotation:
   * Every round, some bots rotate out, new procedural bots join the table,
   * keeping the table constantly evolving with millions of unique combinations!
   */
  public newRound() {
    this.roundNumber += 1;
    this.phase = 'betting';
    this.activePlayerId = null;

    this.dealer = {
      cards: [],
      score: 0,
      isBust: false,
      isBlackjack: false,
      statusText: 'Façam suas apostas na mesa',
    };

    // Bot Rotation Logic: 40% chance for a bot to rotate out and be replaced by a brand new one
    const currentBots = this.players.filter(p => p.isBot);
    const nonBots = this.players.filter(p => !p.isBot);
    const updatedBots: Player[] = [];

    currentBots.forEach(bot => {
      // If bot has low chips or by random casino rotation (35% probability), swap with a new bot
      const shouldRotate = bot.chips < 100 || Math.random() < 0.35;
      if (shouldRotate) {
        const newBot = generateUniqueBot(bot.seatIndex ?? 1, this.players.map(p => p.id));
        updatedBots.push(newBot);
        
        this.messages.push({
          id: 'bot-swap-' + Date.now() + '-' + Math.random(),
          senderName: 'Dealer VIP',
          text: `🔄 ${bot.name} saiu da mesa. Bem-vindo(a) ${newBot.name} ($${newBot.chips + newBot.currentBet})!`,
          timestamp: Date.now(),
        });
      } else {
        // Keep bot and reset their state with a realistic next bet
        bot.cards = [];
        bot.outcome = null;
        bot.payout = 0;
        
        let bet = 50;
        if (bot.botPersonality === 'high_roller') bet = Math.min(300, Math.floor(bot.chips * 0.12));
        else if (bot.botPersonality === 'casual') bet = 25;
        else if (bot.botPersonality === 'aggressive') bet = Math.min(150, Math.floor(bot.chips * 0.09));
        else bet = Math.min(75, Math.floor(bot.chips * 0.05));
        
        bet = Math.round(bet / 5) * 5;
        bet = Math.max(10, Math.min(bet, bot.chips));

        bot.currentBet = bet;
        bot.chips -= bet;
        bot.isReady = true;
        bot.status = 'ready';
        updatedBots.push(bot);
      }
    });

    this.players = [...nonBots, ...updatedBots];

    // Reset non-bot players
    nonBots.forEach(p => {
      p.cards = [];
      p.outcome = null;
      p.payout = 0;

      if (p.chips <= 0) {
        p.chips = 500;
        this.emitEvent('info', `${p.name} recarregou fichas do cassino!`);
      }

      p.currentBet = 0;
      p.isReady = false;
      if (p.isSpectator) {
        p.status = 'spectator';
      } else {
        p.status = 'betting';
      }
    });

    this.emitState();
  }

  public joinPlayer(playerData: { id: string; name: string; avatarUrl?: string; wins?: number; chips?: number }): Player {
    const existingIndex = this.players.findIndex(p => p.id === playerData.id);
    if (existingIndex >= 0) {
      const p = this.players[existingIndex];
      p.name = playerData.name || p.name;
      if (playerData.avatarUrl !== undefined) p.avatarUrl = playerData.avatarUrl;
      this.emitState();
      return p;
    }

    const newPlayer: Player = {
      id: playerData.id,
      name: playerData.name || 'Jogador Convidado',
      chips: Math.max(playerData.chips ?? 1000, 100),
      currentBet: 0,
      cards: [],
      status: 'spectator',
      outcome: null,
      payout: 0,
      isHost: false,
      isReady: false,
      seatIndex: -1,
      isSpectator: true,
      debts: {},
      wins: playerData.wins || 0,
      avatarUrl: playerData.avatarUrl,
      isBot: false,
    };

    // Try auto-seating in first available seat
    const takenSeats = new Set(this.players.filter(p => !p.isSpectator).map(p => p.seatIndex));
    for (let s = 0; s <= 8; s++) {
      if (!takenSeats.has(s)) {
        newPlayer.isSpectator = false;
        newPlayer.seatIndex = s;
        newPlayer.status = this.phase === 'betting' ? 'betting' : 'waiting';
        break;
      }
    }

    this.players.push(newPlayer);
    this.messages.push({
      id: 'msg-join-' + Date.now(),
      senderName: 'Dealer VIP',
      text: `👋 ${newPlayer.name} entrou na mesa!`,
      timestamp: Date.now(),
    });

    this.emitEvent('info', `${newPlayer.name} entrou na mesa!`);
    this.emitState();
    return newPlayer;
  }

  public leavePlayer(playerId: string) {
    const p = this.players.find(x => x.id === playerId);
    if (!p) return;
    this.players = this.players.filter(x => x.id !== playerId);
    this.messages.push({
      id: 'msg-leave-' + Date.now(),
      senderName: 'Dealer VIP',
      text: `${p.name} saiu da mesa.`,
      timestamp: Date.now(),
    });
    this.emitEvent('info', `${p.name} saiu da mesa.`);
    this.emitState();
  }

  public handleRemoteAction(action: string, playerId: string, payload?: any) {
    switch (action) {
      case 'take_seat':
        this.takeSeat(playerId, payload?.seatIndex ?? 0);
        break;
      case 'stand_up':
        this.standUp(playerId);
        break;
      case 'bet':
        this.setBet(playerId, payload?.amount ?? 0);
        break;
      case 'ready':
        this.toggleReady(playerId);
        break;
      case 'hit':
        this.hit(playerId);
        break;
      case 'stand':
        this.stand(playerId);
        break;
      case 'double':
        this.double(playerId);
        break;
      case 'new_round':
        this.newRound();
        break;
      case 'chat':
        this.sendMessage(payload?.senderName || 'Jogador', payload?.text || '');
        break;
      case 'add_bot':
        this.addBot();
        break;
      case 'remove_bot':
        this.removeBot(payload?.botId);
        break;
      case 'toggle_bots':
        this.toggleBots();
        break;
    }
  }

  public sendMessage(senderName: string, text: string) {
    this.messages.push({
      id: 'msg-' + Date.now(),
      senderName: senderName || 'Jogador',
      text,
      timestamp: Date.now(),
    });
    this.emitState();
  }
}

export const localGameEngine = new LocalGameEngine();
