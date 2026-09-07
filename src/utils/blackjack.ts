import { Card, HandScore, Rank, Suit } from '../types';

export const SUITS: Suit[] = ['♠', '♥', '♦', '♣'];
export const RANKS: Rank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

export function createDeck(): Card[] {
  const deck: Card[] = [];
  let counter = 0;
  // Use a 4-deck shoe for authentic casino feel & fewer re-shuffles
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

export function shuffleDeck(deck: Card[]): Card[] {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function calculateHandScore(cards: Card[]): HandScore {
  const visibleCards = cards.filter(c => !c.hidden);
  if (visibleCards.length === 0) {
    return { total: 0, isSoft: false, isBlackjack: false, isBust: false };
  }

  let total = 0;
  let aces = 0;

  for (const card of visibleCards) {
    if (card.rank === 'A') {
      aces += 1;
      total += 11;
    } else if (['K', 'Q', 'J'].includes(card.rank)) {
      total += 10;
    } else {
      total += parseInt(card.rank, 10);
    }
  }

  // Adjust Aces from 11 down to 1 if over 21
  let softAces = aces;
  while (total > 21 && softAces > 0) {
    total -= 10;
    softAces -= 1;
  }

  const isBust = total > 21;
  // Natural Blackjack is only on initial 2 cards with total 21
  const isBlackjack = visibleCards.length === 2 && total === 21 && cards.length === 2;
  const isSoft = softAces > 0 && !isBust;

  return {
    total,
    isSoft,
    isBlackjack,
    isBust
  };
}

export function getSuitColor(suit: Suit): string {
  return suit === '♥' || suit === '♦' ? 'text-red-600' : 'text-stone-900';
}

export function getSuitName(suit: Suit): string {
  switch (suit) {
    case '♠': return 'Espadas';
    case '♥': return 'Copas';
    case '♦': return 'Ouros';
    case '♣': return 'Paus';
  }
}
