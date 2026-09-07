export type Suit = '♠' | '♥' | '♦' | '♣';
export type Rank = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K';

export interface Card {
  suit: Suit;
  rank: Rank;
  id: string;
  hidden?: boolean;
}

export type PlayerStatus = 
  | 'waiting'      // Just joined, waiting for next round
  | 'betting'      // Selecting bet
  | 'ready'        // Bet placed, ready for deal
  | 'playing'      // Active turn
  | 'stand'        // Stood
  | 'busted'       // Score > 21
  | 'blackjack'    // Natural 21
  | 'doubled'      // Doubled down
  | 'spectator';   // Watching the game only

export type OutcomeType = 
  | 'blackjack' // 3:2 payout
  | 'win'       // 1:1 payout
  | 'push'      // Bet returned
  | 'lose'      // Lost to dealer
  | 'bust'      // Exceeded 21
  | null;

export interface HandScore {
  total: number;
  isSoft: boolean;
  isBlackjack: boolean;
  isBust: boolean;
}

export interface Player {
  id: string;
  name: string;
  chips: number;
  currentBet: number;
  cards: Card[];
  status: PlayerStatus;
  outcome: OutcomeType;
  payout: number;
  isHost: boolean;
  isReady: boolean;
  seatIndex: number;
  isSpectator?: boolean;
  debts: Record<string, number>; // Tracks how much is owed to other players (key: lenderId, value: amount)
  wins: number;
  avatarUrl?: string;
}

export interface Dealer {
  cards: Card[];
  score: number;
  isBust: boolean;
  isBlackjack: boolean;
  statusText?: string;
}

export type RoundPhase = 
  | 'waiting'      // Need at least 1 player with ready bet
  | 'betting'      // Players place bets
  | 'dealing'      // Animation/distributing initial cards
  | 'player_turns' // Individual player turns (Hit/Stand/Double)
  | 'dealer_turn'  // Dealer reveals hidden card and draws
  | 'round_over';  // Round finished, displaying winners

export interface TableChatMessage {
  id: string;
  senderName: string;
  text: string;
  timestamp: number;
  isSystem?: boolean;
}

export interface RoomState {
  roomId: string;
  hostId: string;
  phase: RoundPhase;
  players: Player[];
  activePlayerId: string | null;
  dealer: Dealer;
  deckRemaining: number;
  roundNumber: number;
  messages: TableChatMessage[];
  turnTimeout: number; // in seconds
  turnStartTime?: number; // timestamp when active player's turn started
}

export interface ClientToServerEvents {
  'room:create': (payload: { playerName: string; wins?: number; chips?: number; avatarUrl?: string }, callback: (res: { success: boolean; roomId?: string; error?: string }) => void) => void;
  'room:join': (payload: { roomId: string; playerName: string; wins?: number; chips?: number; avatarUrl?: string }, callback: (res: { success: boolean; error?: string }) => void) => void;
  'room:leave': () => void;
  'player:update_name': (payload: { name: string }) => void;
  'player:update_profile': (payload: { name: string; avatarUrl?: string }) => void;
  'player:bet': (payload: { amount: number }) => void;
  'player:ready': () => void;
  'game:start_deal': () => void;
  'player:hit': () => void;
  'player:stand': () => void;
  'player:double': () => void;
  'game:new_round': () => void;
  'chat:send': (payload: { text: string }) => void;
  'loan:request': (payload: { targetPlayerId: string; amount: number }) => void;
  'loan:respond': (payload: { requesterId: string; accept: boolean; amount: number }) => void;
  'loan:repay': (payload: { targetPlayerId: string; amount: number }) => void;
}

export interface ServerToClientEvents {
  'room:state': (state: RoomState) => void;
  'room:error': (payload: { message: string }) => void;
  'game:event': (payload: { type: 'deal' | 'hit' | 'stand' | 'bust' | 'blackjack' | 'dealer_hit' | 'dealer_flip' | 'round_end' | 'loan'; message: string }) => void;
  'chat:message': (message: TableChatMessage) => void;
  'loan:requested': (payload: { requesterId: string; requesterName: string; amount: number }) => void;
}
