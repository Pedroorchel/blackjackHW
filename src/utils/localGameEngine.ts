import { Card, Dealer, OutcomeType, Player, RoomState, RoundPhase, TableChatMessage } from '../types';
import { calculateHandScore, createDeck } from './blackjack';

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
  private dealerTimer?: ReturnType<typeof setTimeout>;

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

  public createRoom(playerName: string, wins: number = 0, chips: number = 1000, avatarUrl?: string, customRoomId?: string): string {
    this.roomId = customRoomId || ('MESA-' + Math.floor(100 + Math.random() * 900));
    this.hostId = 'local-player';
    this.phase = 'betting';
    this.roundNumber = 1;
    this.messages = [
      {
        id: 'msg-welcome',
        senderName: 'Dealer VIP',
        text: `Bem-vindo à Mesa ${this.roomId}! Faça sua aposta e clique em "Distribuir Cartas".`,
        timestamp: Date.now(),
      }
    ];

    const initialBet = Math.min(25, chips > 0 ? chips : 25);
    const initialChips = Math.max(chips, 100);

    this.players = [
      {
        id: 'local-player',
        name: playerName || 'Jogador',
        chips: initialChips - initialBet,
        currentBet: initialBet,
        cards: [],
        status: 'betting',
        outcome: null,
        payout: 0,
        isHost: true,
        isReady: true,
        seatIndex: 0,
        debts: {},
        wins: wins || 0,
        avatarUrl,
      },
      // Virtual casino player for realistic multiplayer atmosphere
      {
        id: 'bot-1',
        name: 'Carlos (VIP)',
        chips: 1500,
        currentBet: 50,
        cards: [],
        status: 'ready',
        outcome: null,
        payout: 0,
        isHost: false,
        isReady: true,
        seatIndex: 2,
        debts: {},
        wins: 14,
        avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
      }
    ];

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

  public setBet(playerId: string, amount: number) {
    const p = this.players.find(x => x.id === playerId || x.id === 'local-player');
    if (!p || this.phase !== 'betting') return;

    const totalMoney = p.chips + p.currentBet;
    const newBet = Math.max(10, Math.min(amount, totalMoney));
    p.chips = totalMoney - newBet;
    p.currentBet = newBet;
    p.isReady = true;
    p.status = 'ready';
    this.emitState();
  }

  public toggleReady(playerId: string) {
    const p = this.players.find(x => x.id === playerId || x.id === 'local-player');
    if (!p || this.phase !== 'betting') return;
    p.isReady = !p.isReady;
    p.status = p.isReady ? 'ready' : 'betting';
    this.emitState();
  }

  public startDeal() {
    if (this.phase !== 'betting') return;

    this.phase = 'dealing';
    this.emitEvent('deal', 'O Dealer começou a distribuição das cartas!');

    // Reset hands
    this.dealer = {
      cards: [],
      score: 0,
      isBust: false,
      isBlackjack: false,
      statusText: 'Distribuindo...',
    };

    this.players.forEach(p => {
      p.cards = [];
      p.outcome = null;
      p.payout = 0;
      if (p.currentBet > 0) {
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
      this.activePlayerId = 'local-player';
      this.turnStartTime = Date.now();
      this.turnTimeout = 20;

      const self = this.players.find(p => p.id === 'local-player');
      if (self && self.status === 'blackjack') {
        this.advanceTurn();
      } else {
        this.emitState();
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
    const activePlayers = this.players.filter(p => p.currentBet > 0);
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

      // Bot turn automation
      if (nextPlayer.id.startsWith('bot-')) {
        this.emitState();
        setTimeout(() => this.runBotTurn(nextPlayer!), 1000);
      } else {
        this.emitState();
      }
    } else {
      this.activePlayerId = null;
      this.startDealerTurn();
    }
  }

  private runBotTurn(bot: Player) {
    const botScore = calculateHandScore(bot.cards);
    if (botScore.total < 16) {
      bot.cards.push(this.drawCard(false));
      const newScore = calculateHandScore(bot.cards);
      if (newScore.isBust) {
        bot.status = 'busted';
        bot.outcome = 'bust';
        this.emitEvent('bust', `${bot.name} pediu carta e estourou com ${newScore.total}!`);
      } else {
        bot.status = 'stand';
        this.emitEvent('stand', `${bot.name} pediu carta e parou com ${newScore.total}.`);
      }
    } else {
      bot.status = 'stand';
      this.emitEvent('stand', `${bot.name} parou com ${botScore.total}.`);
    }
    this.advanceTurn();
  }

  private startDealerTurn() {
    this.phase = 'dealer_turn';
    this.dealer.statusText = 'Dealer virando a carta...';
    this.emitState();

    setTimeout(() => {
      // Reveal dealer hole card
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

    this.players.forEach(p => {
      p.cards = [];
      p.outcome = null;
      p.payout = 0;
      if (p.chips <= 0) {
        // Free emergency reload if bankrupt
        p.chips = 500;
        this.emitEvent('info', `${p.name} recebeu um bônus de fichas da casa!`);
      }
      p.currentBet = Math.min(p.currentBet > 0 ? p.currentBet : 25, p.chips);
      p.chips -= p.currentBet;
      p.isReady = true;
      p.status = 'ready';
    });

    this.emitState();
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
