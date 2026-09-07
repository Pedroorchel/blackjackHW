import { OutcomeType } from '../types';

export interface HandHistoryItem {
  roundKey?: string;
  roundNumber: number;
  roomId?: string;
  outcome: OutcomeType;
  playerScore: number;
  dealerScore: number;
  bet?: number;
  payout: number;
  profit?: number;
  chipsAfter: number;
  timestamp: number;
}

export interface BankrollHistoryItem {
  roundKey?: string;
  roundNumber: number;
  roomId?: string;
  chips: number;
  timestamp: number;
}

/**
 * Returns the active account ID (Supabase UID or Guest UID)
 */
export function getActiveAccountId(explicitId?: string): string {
  if (explicitId) return explicitId;
  if (typeof window === 'undefined') return 'guest_default';

  // Check guest profile
  try {
    const guestRaw = localStorage.getItem('blackjack_guest_profile');
    if (guestRaw) {
      const parsed = JSON.parse(guestRaw);
      if (parsed?.id) return parsed.id;
    }
  } catch {}

  const localName = localStorage.getItem('blackjack_player_name');
  if (localName) {
    return `local_${localName.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
  }

  return 'guest_default';
}

export function getStoredHandHistory(accountId?: string): HandHistoryItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const aid = getActiveAccountId(accountId);
    const key = `blackjack_hand_history_${aid}`;
    const data = localStorage.getItem(key);
    if (data) return JSON.parse(data);
  } catch (e) {
    console.warn('Error reading hand history for account:', accountId, e);
  }
  return [];
}

export function getStoredBankrollHistory(accountId?: string): BankrollHistoryItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const aid = getActiveAccountId(accountId);
    const key = `blackjack_bankroll_history_${aid}`;
    const data = localStorage.getItem(key);
    if (data) return JSON.parse(data);
  } catch (e) {
    console.warn('Error reading bankroll history for account:', accountId, e);
  }
  return [];
}

export function saveHandHistory(hands: HandHistoryItem[], accountId?: string): void {
  if (typeof window === 'undefined') return;
  try {
    const aid = getActiveAccountId(accountId);
    const key = `blackjack_hand_history_${aid}`;
    localStorage.setItem(key, JSON.stringify(hands.slice(-50)));
  } catch (e) {
    console.warn('Error saving hand history for account:', accountId, e);
  }
}

export function saveBankrollHistory(bankroll: BankrollHistoryItem[], accountId?: string): void {
  if (typeof window === 'undefined') return;
  try {
    const aid = getActiveAccountId(accountId);
    const key = `blackjack_bankroll_history_${aid}`;
    localStorage.setItem(key, JSON.stringify(bankroll.slice(-50)));
  } catch (e) {
    console.warn('Error saving bankroll history for account:', accountId, e);
  }
}

export function clearAccountStats(accountId?: string): void {
  if (typeof window === 'undefined') return;
  try {
    const aid = getActiveAccountId(accountId);
    localStorage.removeItem(`blackjack_hand_history_${aid}`);
    localStorage.removeItem(`blackjack_bankroll_history_${aid}`);
  } catch (e) {
    console.warn('Error clearing account stats:', e);
  }
}
