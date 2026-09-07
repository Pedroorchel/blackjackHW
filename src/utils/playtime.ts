import { supabase } from '../lib/supabase';

export interface PlaytimeBreakdown {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  totalSeconds: number;
}

export const STORAGE_KEYS = {
  TOTAL_PLAYTIME: 'blackjack_total_playtime_seconds',
  LONGEST_SESSION: 'blackjack_longest_session_seconds',
  TODAY_PLAYTIME: 'blackjack_today_playtime_seconds',
  TODAY_DATE: 'blackjack_today_date_str',
  FIRST_PLAYED: 'blackjack_first_played_timestamp',
};

/**
 * Breaks total seconds down into days, hours, minutes, and seconds.
 */
export function breakDownPlaytime(totalSeconds: number): PlaytimeBreakdown {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const days = Math.floor(safeSeconds / 86400);
  const hours = Math.floor((safeSeconds % 86400) / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;

  return {
    days,
    hours,
    minutes,
    seconds,
    totalSeconds: safeSeconds,
  };
}

/**
 * Format as zero-padded digital string (e.g. "01:24:08" or "12d 04:15:20")
 */
export function formatPlaytimeDigital(totalSeconds: number, includeDays = false): string {
  const { days, hours, minutes, seconds } = breakDownPlaytime(totalSeconds);
  const pad = (n: number) => n.toString().padStart(2, '0');

  if (includeDays && days > 0) {
    return `${days}d ${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  }
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

/**
 * Format as human-readable short string: "2d 4h 15m" or "45m 12s"
 */
export function formatPlaytimeHuman(totalSeconds: number): string {
  const { days, hours, minutes, seconds } = breakDownPlaytime(totalSeconds);
  const parts: string[] = [];

  if (days > 0) parts.push(`${days}d`);
  if (hours > 0 || days > 0) parts.push(`${hours}h`);
  if (minutes > 0 || hours > 0 || days > 0) parts.push(`${minutes}m`);
  parts.push(`${seconds}s`);

  return parts.join(' ');
}

/**
 * Format as compact label for badges: "1d 4h" or "2h 15m" or "45m"
 */
export function formatPlaytimeBadge(totalSeconds: number): string {
  const { days, hours, minutes } = breakDownPlaytime(totalSeconds);

  if (days > 0) {
    return `${days}d ${hours}h`;
  }
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

/**
 * Format as precise total hours and time in game: e.g. "1d 4h 30m" or "3h 45m" or "12m 40s"
 */
export function formatPlaytimeTotalGameString(totalSeconds: number): string {
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m`;
  }
  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`;
  }
  return `${minutes}m ${seconds}s`;
}

/**
 * Return total cumulative hours number: e.g. "28.5h" or "28h"
 */
export function getTotalHoursCount(totalSeconds: number): number {
  return Math.floor(totalSeconds / 3600);
}

export function getUserStorageKey(baseKey: string, userId?: string): string {
  return userId ? `${baseKey}_${userId}` : baseKey;
}

/**
 * Get initial total stored playtime from localStorage (per-user if userId provided)
 */
export function getStoredTotalPlaytime(userId?: string): number {
  if (typeof window === 'undefined') return 0;
  try {
    if (userId) {
      const userVal = localStorage.getItem(getUserStorageKey(STORAGE_KEYS.TOTAL_PLAYTIME, userId));
      if (userVal !== null) return parseInt(userVal, 10) || 0;
    }
    const val = localStorage.getItem(STORAGE_KEYS.TOTAL_PLAYTIME);
    return val ? parseInt(val, 10) || 0 : 0;
  } catch {
    return 0;
  }
}

/**
 * Get stored longest session in seconds (per-user if userId provided)
 */
export function getStoredLongestSession(userId?: string): number {
  if (typeof window === 'undefined') return 0;
  try {
    if (userId) {
      const userVal = localStorage.getItem(getUserStorageKey(STORAGE_KEYS.LONGEST_SESSION, userId));
      if (userVal !== null) return parseInt(userVal, 10) || 0;
    }
    const val = localStorage.getItem(STORAGE_KEYS.LONGEST_SESSION);
    return val ? parseInt(val, 10) || 0 : 0;
  } catch {
    return 0;
  }
}

/**
 * Get stored playtime for today (per-user if userId provided)
 */
export function getStoredTodayPlaytime(userId?: string): number {
  if (typeof window === 'undefined') return 0;
  try {
    const todayStr = new Date().toISOString().slice(0, 10);
    const dateKey = getUserStorageKey(STORAGE_KEYS.TODAY_DATE, userId);
    const timeKey = getUserStorageKey(STORAGE_KEYS.TODAY_PLAYTIME, userId);

    const savedDate = localStorage.getItem(dateKey);
    if (savedDate !== todayStr) {
      localStorage.setItem(dateKey, todayStr);
      localStorage.setItem(timeKey, '0');
      return 0;
    }
    const val = localStorage.getItem(timeKey);
    return val ? parseInt(val, 10) || 0 : 0;
  } catch {
    return 0;
  }
}

/**
 * Save total, longest, and today's playtime (isolated by account)
 */
export function persistPlaytime(totalSeconds: number, sessionSeconds: number, userId?: string) {
  if (typeof window === 'undefined') return;
  try {
    const totalKey = getUserStorageKey(STORAGE_KEYS.TOTAL_PLAYTIME, userId);
    const longestKey = getUserStorageKey(STORAGE_KEYS.LONGEST_SESSION, userId);
    const todayKey = getUserStorageKey(STORAGE_KEYS.TODAY_PLAYTIME, userId);
    const todayDateKey = getUserStorageKey(STORAGE_KEYS.TODAY_DATE, userId);

    localStorage.setItem(totalKey, totalSeconds.toString());
    localStorage.setItem(STORAGE_KEYS.TOTAL_PLAYTIME, totalSeconds.toString());

    // Record longest session
    const currentLongest = getStoredLongestSession(userId);
    if (sessionSeconds > currentLongest) {
      localStorage.setItem(longestKey, sessionSeconds.toString());
      localStorage.setItem(STORAGE_KEYS.LONGEST_SESSION, sessionSeconds.toString());
    }

    // Record first played timestamp if not set
    const firstPlayedKey = getUserStorageKey(STORAGE_KEYS.FIRST_PLAYED, userId);
    if (!localStorage.getItem(firstPlayedKey)) {
      localStorage.setItem(firstPlayedKey, Date.now().toString());
    }

    // Update today's time
    const todayStr = new Date().toISOString().slice(0, 10);
    const savedDate = localStorage.getItem(todayDateKey);
    let todaySecs = 0;
    if (savedDate === todayStr) {
      todaySecs = parseInt(localStorage.getItem(todayKey) || '0', 10) + 1;
    } else {
      todaySecs = 1;
      localStorage.setItem(todayDateKey, todayStr);
    }
    localStorage.setItem(todayKey, todaySecs.toString());
  } catch {
    // Ignore storage quota errors
  }
}

let lastDbSyncTimestamp = 0;

/**
 * Syncs playtime directly to Supabase profiles table.
 * Account-isolated, protects against stale client numbers decreasing database records.
 */
export async function syncPlaytimeToDatabase(
  totalSeconds: number, 
  sessionSeconds: number, 
  force = false,
  userId?: string
): Promise<boolean> {
  const now = Date.now();
  if (!force && now - lastDbSyncTimestamp < 10000) {
    return false;
  }
  lastDbSyncTimestamp = now;

  try {
    const { data: { user } } = await supabase.auth.getUser();
    const targetUserId = userId || user?.id;
    if (!targetUserId) return false;

    // Fetch current database values FIRST to NEVER overwrite with a smaller number
    const { data: profile } = await supabase
      .from('profiles')
      .select('name, playtime_seconds, longest_session_seconds')
      .eq('id', targetUserId)
      .maybeSingle();

    const dbPlaytime = Number(profile?.playtime_seconds) || 0;
    const dbLongest = Number(profile?.longest_session_seconds) || 0;

    const isOrchel = targetUserId === '3039762a-3c9d-476a-b870-2b141182526d' || 
                     user?.email?.toLowerCase() === 'orchel@gmail.com' ||
                     profile?.name?.toLowerCase() === 'orchel';

    // 9 hours = 32400 seconds minimum for Orchel
    const minFloor = isOrchel ? 32400 : 0;
    const safeTotal = Math.max(dbPlaytime, Math.floor(totalSeconds), minFloor);
    const safeLongest = Math.max(dbLongest, Math.floor(sessionSeconds), isOrchel ? 7200 : 0);

    // Save to user storage
    persistPlaytime(safeTotal, safeLongest, targetUserId);

    await supabase
      .from('profiles')
      .update({
        playtime_seconds: safeTotal,
        longest_session_seconds: safeLongest,
        last_played_at: new Date().toISOString()
      })
      .eq('id', targetUserId);

    return true;
  } catch (err) {
    console.warn('Playtime database sync notice:', err);
    return false;
  }
}

/**
 * Fetches playtime from Supabase for the current account and reconciles with account storage.
 */
export async function fetchAndSyncPlaytimeFromDatabase(specificUserId?: string): Promise<{ totalSeconds: number; longestSessionSeconds: number } | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    const targetUserId = specificUserId || user?.id;
    if (!targetUserId) return null;

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('name, playtime_seconds, longest_session_seconds')
      .eq('id', targetUserId)
      .maybeSingle();

    if (error || !profile) return null;

    let dbTotal = Number(profile.playtime_seconds) || 0;
    let dbLongest = Number(profile.longest_session_seconds) || 0;

    const isOrchel = targetUserId === '3039762a-3c9d-476a-b870-2b141182526d' || 
                     profile?.name?.toLowerCase() === 'orchel' || 
                     user?.email?.toLowerCase() === 'orchel@gmail.com';

    if (isOrchel) {
      dbTotal = Math.max(dbTotal, 32400); // 9 hours
      dbLongest = Math.max(dbLongest, 7200);
    }

    const localTotal = getStoredTotalPlaytime(targetUserId);
    const localLongest = getStoredLongestSession(targetUserId);

    const resolvedTotal = Math.max(dbTotal, localTotal);
    const resolvedLongest = Math.max(dbLongest, localLongest);

    persistPlaytime(resolvedTotal, resolvedLongest, targetUserId);

    // Update database if resolvedTotal > current database record or if Orchel
    if (resolvedTotal > Number(profile.playtime_seconds) || isOrchel) {
      await supabase
        .from('profiles')
        .update({
          playtime_seconds: resolvedTotal,
          longest_session_seconds: resolvedLongest,
          last_played_at: new Date().toISOString()
        })
        .eq('id', targetUserId);
    }

    return { totalSeconds: resolvedTotal, longestSessionSeconds: resolvedLongest };
  } catch (err) {
    console.warn('Playtime database fetch notice:', err);
    return null;
  }
}

export interface PlaytimeTier {
  id: string;
  name: string;
  minHours: number;
  badge: string;
  description: string;
  color: string;
}

export const PLAYTIME_TIERS: PlaytimeTier[] = [
  {
    id: 'rookie',
    name: 'Iniciante do Pano',
    minHours: 0,
    badge: '🌱',
    description: 'Primeiros passos e primeiras mãos na mesa',
    color: 'from-stone-600 to-stone-400 text-stone-200'
  },
  {
    id: 'bronze',
    name: 'Habitué da Mesa',
    minHours: 0.5, // 30 mins
    badge: '🥉',
    description: '30+ minutos de jogo ativo',
    color: 'from-amber-800 to-amber-600 text-amber-100'
  },
  {
    id: 'silver',
    name: 'Estrategista Frequente',
    minHours: 2, // 2 hours
    badge: '🥈',
    description: '2+ horas dominando a mesa e o dealer',
    color: 'from-slate-400 to-slate-200 text-slate-900'
  },
  {
    id: 'gold',
    name: 'High Roller Noturno',
    minHours: 6, // 6 hours
    badge: '🥇',
    description: '6+ horas de pura emoção e cartas na mesa',
    color: 'from-amber-400 to-yellow-300 text-yellow-950'
  },
  {
    id: 'veteran',
    name: 'Lenda do Cassino',
    minHours: 24, // 1 day
    badge: '💎',
    description: 'Mais de 24 horas (1 dia inteiro) de jogo!',
    color: 'from-cyan-400 to-blue-500 text-white'
  },
  {
    id: 'master',
    name: 'Mestre Imortal do Blackjack',
    minHours: 72, // 3 days
    badge: '👑',
    description: 'Mais de 3 dias de permanência nos feltros!',
    color: 'from-purple-500 to-pink-500 text-white'
  }
];

export function getPlaytimeTier(totalSeconds: number): { current: PlaytimeTier; next: PlaytimeTier | null; progressPercent: number } {
  const hours = totalSeconds / 3600;
  let currentIdx = 0;

  for (let i = 0; i < PLAYTIME_TIERS.length; i++) {
    if (hours >= PLAYTIME_TIERS[i].minHours) {
      currentIdx = i;
    }
  }

  const current = PLAYTIME_TIERS[currentIdx];
  const next = currentIdx < PLAYTIME_TIERS.length - 1 ? PLAYTIME_TIERS[currentIdx + 1] : null;

  let progressPercent = 100;
  if (next) {
    const curMin = current.minHours;
    const nextMin = next.minHours;
    const diff = nextMin - curMin;
    const prog = hours - curMin;
    progressPercent = Math.min(100, Math.max(0, Math.round((prog / diff) * 100)));
  }

  return { current, next, progressPercent };
}
