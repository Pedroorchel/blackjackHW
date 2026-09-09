import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import confetti from 'canvas-confetti';
import { supabase } from './lib/supabase';
import { RoomState, TableChatMessage, OutcomeType, RoomSummary } from './types';
import { sounds } from './utils/audio';
import { Lobby } from './components/Lobby';
import { DealerArea } from './components/DealerArea';
import { PlayerSeat } from './components/PlayerSeat';
import { TableControls } from './components/TableControls';
import { TableChat } from './components/TableChat';
import { RulesModal } from './components/RulesModal';
import { LocalSetupModal } from './components/LocalSetupModal';
import { Leaderboard } from './components/Leaderboard';
import { Volume2, VolumeX, Share2, Check, LogOut, BookOpen, Terminal, Users, Sparkles, Eye, Settings, Clock, Timer, TrendingUp } from 'lucide-react';
import { SettingsModal } from './components/SettingsModal';
import { PlayerProfileModal } from './components/PlayerProfileModal';
import { PlayerListModal } from './components/PlayerListModal';
import { PlaytimeScoreboardModal } from './components/PlaytimeScoreboardModal';
import { Player } from './types';
import { StatsDrawer } from './components/StatsDrawer';
import { calculateHandScore } from './utils/blackjack';
import { localGameEngine } from './utils/localGameEngine';
import { 
  getStoredHandHistory,
  getStoredBankrollHistory,
  saveHandHistory,
  saveBankrollHistory,
  clearAccountStats,
  getActiveAccountId,
  HandHistoryItem,
  BankrollHistoryItem
} from './utils/accountStats';
import { 
  getStoredTotalPlaytime, 
  getStoredLongestSession, 
  getStoredTodayPlaytime, 
  persistPlaytime, 
  syncPlaytimeToDatabase,
  fetchAndSyncPlaytimeFromDatabase,
  formatPlaytimeDigital, 
  formatPlaytimeHuman,
  formatPlaytimeTotalGameString
} from './utils/playtime';

let socket: Socket | null = null;

export default function App() {
  const [playerName, setPlayerName] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('blackjack_player_name') || 'Jogador 1';
    }
    return 'Jogador 1';
  });

  const [avatarUrl, setAvatarUrl] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('blackjack_player_avatar') || '';
    }
    return '';
  });

  const [currentUserId, setCurrentUserId] = useState<string>(() => getActiveAccountId());
  const currentUserIdRef = useRef<string>(getActiveAccountId());

  const [roomState, setRoomState] = useState<RoomState | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isRulesOpen, setIsRulesOpen] = useState(false);
  const [isSetupOpen, setIsSetupOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isPlayerListOpen, setIsPlayerListOpen] = useState(false);
  const [selectedProfilePlayer, setSelectedProfilePlayer] = useState<Player | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [isMuted, setIsMuted] = useState(sounds.isMuted());
  const [isConnecting, setIsConnecting] = useState(false);
  const isLocalModeRef = useRef<boolean>(false);
  const [loanRequests, setLoanRequests] = useState<{ requesterId: string, requesterName: string, amount: number }[]>([]);

  // Account-isolated performance & bankroll history states
  const [handHistory, setHandHistory] = useState<HandHistoryItem[]>(() => {
    return getStoredHandHistory(getActiveAccountId());
  });

  const [bankrollHistory, setBankrollHistory] = useState<BankrollHistoryItem[]>(() => {
    return getStoredBankrollHistory(getActiveAccountId());
  });

  const lastProcessedRoundRef = useRef<string | null>(null);
  const [isStatsOpen, setIsStatsOpen] = useState(false);

  const [autoReady, setAutoReady] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('blackjack_auto_ready') === 'true';
    }
    return false;
  });

  const [activeTurnTimeLeft, setActiveTurnTimeLeft] = useState(15);

  // Live Playtime & Scoreboard States
  const [isPlaytimeScoreboardOpen, setIsPlaytimeScoreboardOpen] = useState(false);
  const [sessionSeconds, setSessionSeconds] = useState(0);
  const [totalPlaytimeSeconds, setTotalPlaytimeSeconds] = useState(() => getStoredTotalPlaytime());
  const [todaySeconds, setTodaySeconds] = useState(() => getStoredTodayPlaytime());
  const [longestSessionSeconds, setLongestSessionSeconds] = useState(() => getStoredLongestSession());

  const totalPlaytimeRef = useRef(totalPlaytimeSeconds);
  totalPlaytimeRef.current = totalPlaytimeSeconds;
  const sessionSecondsRef = useRef(sessionSeconds);
  sessionSecondsRef.current = sessionSeconds;

  // Reconcile playtime with database on mount and on auth state change
  useEffect(() => {
    // If running in OAuth popup, notify parent and close
    if (typeof window !== 'undefined' && window.opener && (window.location.hash.includes('access_token') || window.location.search.includes('code='))) {
      const notifyAndClose = () => {
        try {
          window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS' }, '*');
        } catch {}
        setTimeout(() => {
          try { window.close(); } catch {}
        }, 300);
      };

      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) {
          notifyAndClose();
        }
      });
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        const uid = session.user.id;
        setCurrentUserId(uid);
        currentUserIdRef.current = uid;
        setHandHistory(getStoredHandHistory(uid));
        setBankrollHistory(getStoredBankrollHistory(uid));
        const res = await fetchAndSyncPlaytimeFromDatabase(uid);
        if (res) {
          setTotalPlaytimeSeconds(res.totalSeconds);
          setLongestSessionSeconds(res.longestSessionSeconds);
          setTodaySeconds(getStoredTodayPlaytime(uid));
        }
      } else {
        const guestId = getActiveAccountId();
        setCurrentUserId(guestId);
        currentUserIdRef.current = guestId;
        setHandHistory(getStoredHandHistory(guestId));
        setBankrollHistory(getStoredBankrollHistory(guestId));
      }
    });

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        const uid = user.id;
        setCurrentUserId(uid);
        currentUserIdRef.current = uid;
        setHandHistory(getStoredHandHistory(uid));
        setBankrollHistory(getStoredBankrollHistory(uid));
      } else {
        const guestId = getActiveAccountId();
        setCurrentUserId(guestId);
        currentUserIdRef.current = guestId;
        setHandHistory(getStoredHandHistory(guestId));
        setBankrollHistory(getStoredBankrollHistory(guestId));
      }
    });

    fetchAndSyncPlaytimeFromDatabase().then(res => {
      if (res) {
        setTotalPlaytimeSeconds(res.totalSeconds);
        setLongestSessionSeconds(res.longestSessionSeconds);
        setTodaySeconds(getStoredTodayPlaytime());
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Count playtime while actively in game/room
  useEffect(() => {
    if (!roomState) {
      setSessionSeconds(0);
      return;
    }

    const interval = setInterval(() => {
      setSessionSeconds(prev => prev + 1);
      setTotalPlaytimeSeconds(prev => prev + 1);
      setTodaySeconds(prev => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [roomState !== null]);

  // Persist playtime automatically to localStorage and database
  useEffect(() => {
    if (!roomState || sessionSeconds === 0) return;
    
    // Save to local storage every 2 seconds
    if (sessionSeconds % 2 === 0) {
      persistPlaytime(totalPlaytimeSeconds, sessionSeconds);
    }

    // Save to Supabase database every 10 seconds
    if (sessionSeconds % 10 === 0) {
      syncPlaytimeToDatabase(totalPlaytimeSeconds, sessionSeconds);
    }
  }, [sessionSeconds, totalPlaytimeSeconds, roomState]);

  // Ensure playtime is saved when user navigates away or closes tab
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (sessionSeconds > 0) {
        persistPlaytime(totalPlaytimeSeconds, sessionSeconds);
        syncPlaytimeToDatabase(totalPlaytimeSeconds, sessionSeconds, true);
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [sessionSeconds, totalPlaytimeSeconds]);

  useEffect(() => {
    if (!roomState || roomState.phase !== 'player_turns' || !roomState.activePlayerId) {
      setActiveTurnTimeLeft(15);
      return;
    }

    setActiveTurnTimeLeft(15);

    const interval = setInterval(() => {
      setActiveTurnTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [roomState?.activePlayerId, roomState?.turnStartTime, roomState?.phase]);

  const handleToggleAutoReady = (value: boolean) => {
    setAutoReady(value);
    if (typeof window !== 'undefined') {
      localStorage.setItem('blackjack_auto_ready', value.toString());
    }
  };

  const [isServerConnected, setIsServerConnected] = useState(false);
  const [roomsList, setRoomsList] = useState<RoomSummary[]>([]);
  const [customServerUrl, setCustomServerUrl] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('blackjack_custom_server_url') || '';
    }
    return '';
  });

  const getSocketServerUrl = (overrideUrl?: string): string => {
    if (typeof window === 'undefined') return '';
    const custom = overrideUrl !== undefined ? overrideUrl : (localStorage.getItem('blackjack_custom_server_url')?.trim() || '');
    if (custom) return custom;

    const isStaticHost = window.location.hostname.includes('github.io') ||
                         window.location.hostname.includes('netlify') ||
                         window.location.hostname.includes('vercel') ||
                         window.location.hostname.includes('pages.dev');

    if (isStaticHost) {
      // Use the public shared production container URL so friends can play without needing AI Studio login credentials
      return 'https://ais-pre-jmdx2zcehkmkehmm7m4erp-791084157184.us-east1.run.app';
    }

    // Always default to current window origin instead of returning undefined,
    // as Socket.IO client interprets literal undefined as the string "undefined"
    // resulting in invalid URIs like undefined//undefined//undefined
    return window.location.origin;
  };

  const handleSaveServerUrl = (url: string) => {
    setCustomServerUrl(url);
    if (typeof window !== 'undefined') {
      if (url) {
        localStorage.setItem('blackjack_custom_server_url', url);
      } else {
        localStorage.removeItem('blackjack_custom_server_url');
      }
    }
  };

  // Initialize socket connection
  useEffect(() => {
    if (socket) {
      socket.disconnect();
    }

    const serverUrl = getSocketServerUrl(customServerUrl);
    socket = io(serverUrl, {
      transports: ['polling', 'websocket'],
      reconnectionAttempts: 10,
      reconnectionDelay: 1000
    });

    socket.on('connect', () => {
      setIsServerConnected(true);
      socket?.emit('rooms:get_list');
    });

    socket.on('disconnect', () => {
      setIsServerConnected(false);
    });

    socket.on('room:error', (err: { message: string }) => {
      if (err?.message) {
        setErrorMessage(err.message);
      }
    });

    socket.on('rooms:list', (list: RoomSummary[]) => {
      if (Array.isArray(list)) {
        setRoomsList(list);
      }
    });

    socket.on('connect_error', (err) => {
      setIsServerConnected(false);
      console.warn('Socket connection note (server offline or static mode):', err?.message || err);
    });

    socket.on('room:state', (state: RoomState) => {
      if (isLocalModeRef.current) return;
      setRoomState(state);
      setIsConnecting(false);

      // Check if self won to shoot confetti
      if (state.phase === 'round_over' && socket) {
        const self = state.players.find(p => p.id === socket?.id);

        if (self) {
          const syncProfile = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
              const { data: curProf } = await supabase
                .from('profiles')
                .select('name, playtime_seconds, longest_session_seconds, wins, chips')
                .eq('id', user.id)
                .maybeSingle();

              const isOrchel = user.id === '3039762a-3c9d-476a-b870-2b141182526d' || 
                               user.email?.toLowerCase() === 'orchel@gmail.com' ||
                               curProf?.name?.toLowerCase() === 'orchel';

              const minFloor = isOrchel ? 32400 : 0;
              const safePlaytime = Math.max(
                Number(curProf?.playtime_seconds) || 0,
                Math.floor(totalPlaytimeRef.current),
                minFloor
              );
              const safeLongest = Math.max(
                Number(curProf?.longest_session_seconds) || 0,
                Math.floor(sessionSecondsRef.current),
                isOrchel ? 7200 : 0
              );

              // Update local storage per user
              persistPlaytime(safePlaytime, safeLongest, user.id);

              await supabase
                .from('profiles')
                .update({
                  wins: Math.max(self.wins || 0, curProf?.wins || 0, isOrchel ? 35 : 0),
                  chips: isOrchel ? Math.max(self.chips, 20000) : self.chips,
                  playtime_seconds: safePlaytime,
                  longest_session_seconds: safeLongest,
                  last_played_at: new Date().toISOString()
                })
                .eq('id', user.id);
            } else {
              // Guest profile persistence: continually save guest chips, wins and playtime to localStorage
              if (typeof window !== 'undefined') {
                const savedGuestRaw = localStorage.getItem('blackjack_guest_profile');
                let gp = savedGuestRaw ? JSON.parse(savedGuestRaw) : {};
                gp.name = self.name || gp.name || 'Jogador Convidado';
                gp.chips = self.chips;
                gp.wins = self.wins || gp.wins || 0;
                gp.playtime_seconds = Math.floor(totalPlaytimeRef.current);
                gp.longest_session_seconds = Math.max(gp.longest_session_seconds || 0, Math.floor(sessionSecondsRef.current));
                gp.last_played_at = new Date().toISOString();

                localStorage.setItem('blackjack_guest_profile', JSON.stringify(gp));
                localStorage.setItem('blackjack_guest_chips', String(self.chips));
                localStorage.setItem('blackjack_guest_wins', String(self.wins || 0));
                localStorage.setItem('blackjack_player_name', gp.name);
                persistPlaytime(Math.floor(totalPlaytimeRef.current), Math.floor(sessionSecondsRef.current));
              }
            }
          };
          syncProfile();
        }

        // Capture round results for performance/stats tracking - GUARANTEED PER ROUND
        if (self && !self.isSpectator) {
          const roundKey = `${state.roomId}_r${state.roundNumber}`;

          if (lastProcessedRoundRef.current !== roundKey) {
            const pScore = calculateHandScore(self.cards).total;
            const dScore = calculateHandScore(state.dealer.cards).total;
            const currentBet = self.currentBet || 0;
            const payout = self.payout || 0;
            const profit = payout - currentBet;

            const newHand = {
              roundKey,
              roundNumber: state.roundNumber,
              roomId: state.roomId,
              outcome: self.outcome,
              playerScore: pScore,
              dealerScore: dScore,
              bet: currentBet,
              payout: payout,
              profit: profit,
              chipsAfter: self.chips,
              timestamp: Date.now()
            };

            const newBankroll = {
              roundKey,
              roundNumber: state.roundNumber,
              roomId: state.roomId,
              chips: self.chips,
              timestamp: Date.now()
            };

            setHandHistory(prev => {
              if (prev.some(h => (h as any).roundKey === roundKey)) return prev;
              const updated = [...prev, newHand].slice(-50);
              saveHandHistory(updated, currentUserIdRef.current);
              return updated;
            });

            setBankrollHistory(prev => {
              if (prev.some(b => (b as any).roundKey === roundKey)) return prev;
              let updated = [...prev];
              if (updated.length === 0) {
                // baseline starting point using previous chip estimate
                const previousChips = self.chips - profit;
                updated.push({
                  roundKey: `${state.roomId}_r${state.roundNumber}_start`,
                  roundNumber: Math.max(0, state.roundNumber - 1),
                  roomId: state.roomId,
                  chips: previousChips,
                  timestamp: Date.now() - 1000
                });
              }
              updated.push(newBankroll);
              updated = updated.slice(-50);
              saveBankrollHistory(updated, currentUserIdRef.current);
              return updated;
            });

            lastProcessedRoundRef.current = roundKey;
          }
        }

        if (self && (self.outcome === 'win' || self.outcome === 'blackjack')) {
          try {
            confetti({
              particleCount: 60,
              spread: 70,
              origin: { y: 0.7 }
            });
          } catch {
            // Ignore confetti errors if any
          }
        }
      }
    });

    socket.on('room:error', ({ message }) => {
      setErrorMessage(message);
      setIsConnecting(false);
      setTimeout(() => setErrorMessage(null), 4000);
    });

    socket.on('game:event', ({ type, message }) => {
      switch (type) {
        case 'deal':
        case 'hit':
        case 'dealer_hit':
          sounds.playCardDeal();
          break;
        case 'dealer_flip':
          sounds.playCardFlip();
          break;
        case 'bust':
          sounds.playBust();
          break;
        case 'blackjack':
          sounds.playBlackjack();
          break;
        case 'round_end':
        case 'loan':
          sounds.playWin();
          break;
      }
    });

    socket.on('chat:message', (msg: TableChatMessage) => {
      setRoomState(prev => {
        if (!prev) return null;
        return {
          ...prev,
          messages: [...prev.messages, msg].slice(-50)
        };
      });
    });

    socket.on('loan:requested', (payload) => {
      setLoanRequests(prev => [...prev, payload]);
      sounds.playChipBet(); // sound effect for attention
    });

    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, []);

  // Local game engine subscription for offline / standalone mode
  useEffect(() => {
    const unsub = localGameEngine.subscribe({
      onState: (state) => {
        if (isLocalModeRef.current) {
          setRoomState(state);
          setIsConnecting(false);

          if (state.phase === 'round_over') {
            const self = state.players.find(p => p.id === 'local-player') || state.players[0];
            if (self && !self.isSpectator) {
              const roundKey = `${state.roomId}_r${state.roundNumber}_${state.dealer.score}_${self.cards.length}`;

              if (lastProcessedRoundRef.current !== roundKey) {
                const pScore = calculateHandScore(self.cards).total;
                const dScore = calculateHandScore(state.dealer.cards).total;
                const currentBet = self.currentBet || 0;
                const payout = self.payout || 0;
                const profit = payout - currentBet;

                const newHand = {
                  roundKey,
                  roundNumber: state.roundNumber,
                  roomId: state.roomId,
                  outcome: self.outcome,
                  playerScore: pScore,
                  dealerScore: dScore,
                  bet: currentBet,
                  payout: payout,
                  profit: profit,
                  chipsAfter: self.chips,
                  timestamp: Date.now()
                };

                const newBankroll = {
                  roundKey,
                  roundNumber: state.roundNumber,
                  roomId: state.roomId,
                  chips: self.chips,
                  timestamp: Date.now()
                };

                setHandHistory(prev => {
                  if (prev.some(h => (h as any).roundKey === roundKey)) return prev;
                  const updated = [...prev, newHand].slice(-50);
                  saveHandHistory(updated, currentUserIdRef.current);
                  return updated;
                });

                setBankrollHistory(prev => {
                  if (prev.some(b => (b as any).roundKey === roundKey)) return prev;
                  let updated = [...prev];
                  if (updated.length === 0) {
                    const previousChips = self.chips - profit;
                    updated.push({
                      roundKey: `${state.roomId}_r${state.roundNumber}_start`,
                      roundNumber: Math.max(0, state.roundNumber - 1),
                      roomId: state.roomId,
                      chips: previousChips,
                      timestamp: Date.now() - 1000
                    });
                  }
                  updated.push(newBankroll);
                  updated = updated.slice(-50);
                  saveBankrollHistory(updated, currentUserIdRef.current);
                  return updated;
                });

                lastProcessedRoundRef.current = roundKey;
              }

              if (self.outcome === 'win' || self.outcome === 'blackjack') {
                try {
                  confetti({
                    particleCount: 60,
                    spread: 70,
                    origin: { y: 0.7 }
                  });
                } catch {
                  // Ignore confetti errors if any
                }
              }
            }
          }
        }
      },
      onEvent: ({ type }) => {
        if (!isLocalModeRef.current) return;
        switch (type) {
          case 'deal':
          case 'hit':
          case 'dealer_hit':
            sounds.playCardDeal();
            break;
          case 'dealer_flip':
            sounds.playCardFlip();
            break;
          case 'bust':
            sounds.playBust();
            break;
          case 'blackjack':
            sounds.playBlackjack();
            break;
          case 'round_over':
          case 'win':
          case 'loan':
            sounds.playWin();
            break;
        }
      }
    });

    return () => unsub();
  }, []);

  // Self player & active player memo
  const isSelf = useCallback((playerId: string) => {
    if (isLocalModeRef.current || !socket?.connected) {
      return playerId === 'local-player' || playerId === roomState?.players[0]?.id;
    }
    return playerId === socket?.id;
  }, [roomState]);

  const selfPlayer = useMemo(() => {
    if (!roomState) return null;
    if (isLocalModeRef.current || !socket?.connected) {
      return roomState.players.find(p => p.id === 'local-player') || roomState.players[0] || null;
    }
    return roomState.players.find(p => p.id === socket?.id) || roomState.players[0] || null;
  }, [roomState]);

  const activePlayer = useMemo(() => {
    if (!roomState || !roomState.activePlayerId) return null;
    return roomState.players.find(p => p.id === roomState.activePlayerId) || null;
  }, [roomState]);

  const isHost = selfPlayer?.isHost ?? false;
  const canStartDeal = isHost && 
    roomState?.phase === 'betting' && 
    roomState.players.filter(p => !p.isSpectator).every(p => p.isReady || p.chips === 0);

  const handleBetChange = (amount: number) => {
    if (isLocalModeRef.current) {
      localGameEngine.setBet('local-player', amount);
      return;
    }
    if (!socket) return;
    socket.emit('player:bet', { amount });
  };

  const handleReadyToggle = () => {
    sounds.playChipBet();
    if (isLocalModeRef.current) {
      localGameEngine.toggleReady('local-player');
      return;
    }
    if (!socket) return;
    socket.emit('player:ready');
  };

  // Auto-Ready Effect
  useEffect(() => {
    if (!roomState || !autoReady) return;
    const self = selfPlayer;
    // If it's betting phase, and I'm not ready, and I'm supposed to be betting, auto-ready
    if (
      roomState.phase === 'betting' &&
      self &&
      self.status === 'betting' &&
      !self.isReady &&
      self.chips > 0
    ) {
      const timer = setTimeout(() => {
        sounds.playChipBet();
        handleReadyToggle();
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [roomState?.phase, roomState?.roundNumber, autoReady, selfPlayer]);

  const handleRespondLoan = (requesterId: string, accept: boolean, amount: number) => {
    if (!socket) return;
    socket.emit('loan:respond', { requesterId, accept, amount });
    setLoanRequests(prev => prev.filter(req => req.requesterId !== requesterId));
  };

  const handleRequestLoan = (targetPlayerId: string, amount: number) => {
    if (!socket) return;
    socket.emit('loan:request', { targetPlayerId, amount });
  };

  const handleRepayLoan = (targetPlayerId: string, amount: number) => {
    if (!socket) return;
    socket.emit('loan:repay', { targetPlayerId, amount });
  };

  const handleUpdatePlayerName = (name: string) => {
    setPlayerName(name);
    if (typeof window !== 'undefined') {
      localStorage.setItem('blackjack_player_name', name);
    }
    if (socket && roomState) {
      socket.emit('player:update_profile', { name, avatarUrl });
    }
  };

  const handleUpdateProfile = async (name: string, avatar?: string) => {
    setPlayerName(name);
    const finalAvatar = avatar || '';
    setAvatarUrl(finalAvatar);

    if (typeof window !== 'undefined') {
      localStorage.setItem('blackjack_player_name', name);
      localStorage.setItem('blackjack_player_avatar', finalAvatar);
    }

    // Sync with Supabase profiles if possible
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('profiles').upsert({
          id: user.id,
          name: name,
          avatar_url: finalAvatar
        });
      }
    } catch (err) {
      console.warn('Could not sync profile to supabase:', err);
    }

    if (socket && roomState) {
      socket.emit('player:update_profile', { name, avatarUrl: finalAvatar });
    }

    if (selectedProfilePlayer && isSelf(selectedProfilePlayer.id)) {
      setSelectedProfilePlayer(prev => prev ? { ...prev, name, avatarUrl: finalAvatar } : null);
    }
  };

  const ensureSocketConnected = async (timeoutMs: number = 6000): Promise<boolean> => {
    if (socket && socket.connected) return true;
    if (!socket) {
      const serverUrl = getSocketServerUrl(customServerUrl);
      socket = io(serverUrl, {
        transports: ['polling', 'websocket'],
        reconnectionAttempts: 10,
        reconnectionDelay: 1000
      });
    }

    if (!socket.connected) {
      socket.connect();
    }

    return new Promise((resolve) => {
      let resolved = false;
      const timer = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          resolve(socket?.connected || false);
        }
      }, timeoutMs);

      const onConnect = () => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timer);
          socket?.off('connect', onConnect);
          resolve(true);
        }
      };

      if (socket.connected) {
        clearTimeout(timer);
        resolve(true);
      } else {
        socket.once('connect', onConnect);
      }
    });
  };

  const handleCreateRoom = async (name: string, wins?: number, chips?: number) => {
    setIsConnecting(true);
    setErrorMessage(null);
    handleUpdatePlayerName(name);

    try {
      const res = await fetchAndSyncPlaytimeFromDatabase();
      if (res) {
        setTotalPlaytimeSeconds(res.totalSeconds);
        setLongestSessionSeconds(res.longestSessionSeconds);
      }
    } catch (e) {
      console.warn('Playtime room sync:', e);
    }

    const isConnected = await ensureSocketConnected();
    if (isConnected && socket && socket.connected) {
      socket.emit('room:create', { playerName: name, wins, chips, avatarUrl }, (res: { success: boolean; roomId?: string; error?: string }) => {
        setIsConnecting(false);
        if (res && res.success) {
          isLocalModeRef.current = false;
        } else {
          setErrorMessage(res?.error || 'Erro ao criar a sala no servidor.');
        }
      });
    } else {
      setIsConnecting(false);
      setErrorMessage('Não foi possível conectar ao servidor multiplayer online. Verifique sua conexão e tente novamente.');
    }
  };

  const handlePlayWithBots = async (name: string, wins?: number, chips?: number) => {
    setIsConnecting(true);
    setErrorMessage(null);
    try {
      const res = await fetchAndSyncPlaytimeFromDatabase();
      if (res) {
        setTotalPlaytimeSeconds(res.totalSeconds);
        setLongestSessionSeconds(res.longestSessionSeconds);
      }
    } catch (e) {
      console.warn('Playtime room sync:', e);
    }
    isLocalModeRef.current = true;
    localGameEngine.createRoom(name, wins, chips, avatarUrl, undefined, 3);
    setIsConnecting(false);
  };

  const handleAddBot = () => {
    sounds.playChipBet();
    if (isLocalModeRef.current || !socket?.connected) {
      localGameEngine.addBot();
    } else {
      socket.emit('room:add_bot');
    }
  };

  const handleRemoveBot = (botId?: string) => {
    sounds.playChipBet();
    if (isLocalModeRef.current || !socket?.connected) {
      localGameEngine.removeBot(botId);
    } else {
      socket.emit('room:remove_bot', { botId });
    }
  };

  const handleToggleBots = () => {
    sounds.playChipBet();
    if (isLocalModeRef.current || !socket?.connected) {
      localGameEngine.toggleBots();
    } else {
      socket.emit('room:toggle_bots');
    }
  };

  const handleJoinRoom = async (roomId: string, name: string, wins?: number, chips?: number) => {
    setIsConnecting(true);
    setErrorMessage(null);
    handleUpdatePlayerName(name);

    let cleanRoomId = roomId.trim().toUpperCase();
    if (cleanRoomId.includes('ROOM=')) {
      const match = cleanRoomId.match(/ROOM=([A-Z0-9]+)/i);
      if (match) cleanRoomId = match[1].toUpperCase();
    }
    if (cleanRoomId.startsWith('#')) {
      cleanRoomId = cleanRoomId.substring(1);
    }

    try {
      const res = await fetchAndSyncPlaytimeFromDatabase();
      if (res) {
        setTotalPlaytimeSeconds(res.totalSeconds);
        setLongestSessionSeconds(res.longestSessionSeconds);
      }
    } catch (e) {
      console.warn('Playtime room sync:', e);
    }

    const isConnected = await ensureSocketConnected();
    if (isConnected && socket && socket.connected) {
      socket.emit('room:join', { roomId: cleanRoomId, playerName: name, wins, chips, avatarUrl }, (res: { success: boolean; error?: string }) => {
        setIsConnecting(false);
        if (res && res.success) {
          isLocalModeRef.current = false;
        } else {
          setErrorMessage(res?.error || `Mesa "${cleanRoomId}" não encontrada. Verifique se o código está correto e se o host ainda está com a mesa aberta.`);
        }
      });
    } else {
      setIsConnecting(false);
      setErrorMessage('Não foi possível conectar ao servidor multiplayer online. Verifique sua conexão e tente novamente.');
    }
  };

  const handleQuickPlay = async (name: string, wins?: number, chips?: number) => {
    setIsConnecting(true);
    setErrorMessage(null);
    handleUpdatePlayerName(name);

    try {
      const res = await fetchAndSyncPlaytimeFromDatabase();
      if (res) {
        setTotalPlaytimeSeconds(res.totalSeconds);
        setLongestSessionSeconds(res.longestSessionSeconds);
      }
    } catch (e) {
      console.warn('Playtime room sync:', e);
    }

    const isConnected = await ensureSocketConnected();
    if (isConnected && socket && socket.connected) {
      socket.emit('rooms:quick_play', { playerName: name, wins, chips, avatarUrl }, (res: { success: boolean; roomId?: string; error?: string }) => {
        setIsConnecting(false);
        if (res && res.success) {
          isLocalModeRef.current = false;
        } else {
          setErrorMessage(res?.error || 'Nenhuma mesa multiplayer disponível no momento.');
        }
      });
    } else {
      setIsConnecting(false);
      setErrorMessage('Não foi possível conectar ao servidor multiplayer online.');
    }
  };

  const handleLeaveRoom = () => {
    persistPlaytime(totalPlaytimeSeconds, sessionSeconds);
    syncPlaytimeToDatabase(totalPlaytimeSeconds, sessionSeconds, true);
    if (socket && !isLocalModeRef.current) {
      socket.emit('room:leave');
    }
    isLocalModeRef.current = false;
    setRoomState(null);
    setSessionSeconds(0);
    lastProcessedRoundRef.current = null;
  };

  const handleClearStats = () => {
    setHandHistory([]);
    setBankrollHistory([]);
    clearAccountStats(currentUserIdRef.current);
  };

  const handleStartDeal = () => {
    sounds.playCardDeal();
    if (isLocalModeRef.current) {
      localGameEngine.startDeal();
      return;
    }
    if (!socket) return;
    socket.emit('game:start_deal');
  };

  const handleHit = () => {
    sounds.playCardDeal();
    if (isLocalModeRef.current) {
      localGameEngine.hit('local-player');
      return;
    }
    if (!socket) return;
    socket.emit('player:hit');
  };

  const handleStand = () => {
    if (isLocalModeRef.current) {
      localGameEngine.stand('local-player');
      return;
    }
    if (!socket) return;
    socket.emit('player:stand');
  };

  const handleDouble = () => {
    sounds.playChipBet();
    if (isLocalModeRef.current) {
      localGameEngine.double('local-player');
      return;
    }
    if (!socket) return;
    socket.emit('player:double');
  };

  const handleNewRound = () => {
    if (isLocalModeRef.current) {
      localGameEngine.newRound();
      return;
    }
    if (!socket) return;
    socket.emit('game:new_round');
  };

  const handleSendMessage = (text: string) => {
    if (isLocalModeRef.current) {
      localGameEngine.sendMessage(selfPlayer?.name || playerName, text);
      return;
    }
    if (!socket) return;
    socket.emit('chat:send', { text });
  };

  const handleTakeSeat = (seatIndex: number) => {
    sounds.playChipBet();
    if (isLocalModeRef.current || !socket?.connected) {
      localGameEngine.takeSeat('local-player', seatIndex);
      return;
    }
    socket.emit('player:take_seat', { seatIndex });
  };

  const handleStandUp = () => {
    sounds.playChipBet();
    if (isLocalModeRef.current || !socket?.connected) {
      localGameEngine.standUp('local-player');
      return;
    }
    socket.emit('player:stand_up');
  };

  const toggleMute = () => {
    const muted = sounds.toggleMute();
    setIsMuted(muted);
  };

  const copyRoomCode = () => {
    if (!roomState) return;
    const url = `${window.location.origin}${window.location.pathname}?room=${roomState.roomId}`;
    navigator.clipboard.writeText(url);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  // If not inside a room, render the Lobby
  if (!roomState) {
    return (
      <>
        <Lobby
          playerName={playerName}
          onUpdatePlayerName={handleUpdatePlayerName}
          onCreateRoom={handleCreateRoom}
          onJoinRoom={handleJoinRoom}
          onPlayWithBots={handlePlayWithBots}
          onOpenRules={() => setIsRulesOpen(true)}
          onOpenSetup={() => setIsSetupOpen(true)}
          errorMessage={errorMessage}
          isConnecting={isConnecting}
          onPlaytimeSync={(seconds) => {
            setTotalPlaytimeSeconds(seconds);
            totalPlaytimeRef.current = seconds;
          }}
          isServerConnected={isServerConnected}
          customServerUrl={customServerUrl}
          onSaveServerUrl={handleSaveServerUrl}
        />
        <RulesModal isOpen={isRulesOpen} onClose={() => setIsRulesOpen(false)} />
        <LocalSetupModal 
          isOpen={isSetupOpen} 
          onClose={() => setIsSetupOpen(false)}
          customServerUrl={customServerUrl}
          onSaveServerUrl={handleSaveServerUrl}
          isServerConnected={isServerConnected}
        />
      </>
    );
  }

  return (
    <div className="min-h-screen casino-studio-bg text-white font-sans flex flex-col justify-between overflow-x-hidden relative select-none">
      {/* Overhead Ambient Studio Spotlight Beam */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-96 spotlight-beam pointer-events-none z-0" />
      <div className="absolute top-10 left-1/2 -translate-x-1/2 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none z-0" />

      {/* TOP HEADER BAR (UTILITIES) */}
      <header className="w-full px-2 sm:px-4 py-2 flex flex-col gap-2 z-30 shadow-2xl absolute top-0 left-0">
        <div className="flex items-center justify-between w-full overflow-x-auto gap-2 no-scrollbar">
          {/* Live Playtime Scoreboard Trigger - Displays Total Game Hours */}
          <button
            type="button"
            id="btn-playtime-scoreboard"
            onClick={() => setIsPlaytimeScoreboardOpen(true)}
            className="flex items-center gap-2 px-2.5 sm:px-3 py-1.5 rounded-xl bg-black/75 hover:bg-black/90 border border-amber-500/50 hover:border-amber-400 text-white text-[11px] font-bold transition-all shadow-[0_0_15px_rgba(245,158,11,0.25)] group cursor-pointer shrink-0"
            title="Placar de Horas: Clique para ver o tempo total detalhado no game"
          >
            <div className="relative flex items-center justify-center">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping absolute" />
              <span className="w-2 h-2 rounded-full bg-emerald-500 relative" />
            </div>
            <Clock className="w-3.5 h-3.5 text-amber-400 group-hover:rotate-12 transition-transform" />
            
            {/* Total Hours in Game (Hero Metric) */}
            <div className="flex items-center gap-1.5 font-mono">
              <span className="text-[10px] uppercase font-sans font-black text-amber-400 tracking-wider">
                Total Game:
              </span>
              <span className="text-amber-300 font-black tracking-wider text-xs">
                {formatPlaytimeTotalGameString(totalPlaytimeSeconds)}
              </span>
              
              {/* Mesa Atual */}
              <span className="text-stone-600 hidden xs:inline mx-0.5">|</span>
              <span className="text-[10px] uppercase font-sans font-black text-stone-400 tracking-wider hidden xs:inline">
                Mesa:
              </span>
              <span className="text-emerald-400 font-black tracking-wider text-xs hidden xs:inline">
                {formatPlaytimeDigital(sessionSeconds)}
              </span>
            </div>

            <span className="bg-amber-400/20 text-amber-300 border border-amber-400/30 text-[9px] font-black uppercase px-1.5 py-0.5 rounded font-sans hidden sm:inline group-hover:bg-amber-400/30 transition-colors">
              Placar de Horas
            </span>
          </button>

          {/* Quick Performance Panel Trigger in Header */}
          <button
            type="button"
            id="btn-header-stats"
            onClick={() => setIsStatsOpen(prev => !prev)}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-black/75 hover:bg-black/90 border border-emerald-500/50 hover:border-emerald-400 text-white text-[11px] font-bold transition-all shadow-[0_0_15px_rgba(16,185,129,0.2)] group cursor-pointer shrink-0"
            title="Painel de Desempenho: Atualizado a cada rodada"
          >
            <TrendingUp className="w-3.5 h-3.5 text-emerald-400 group-hover:scale-110 transition-transform" />
            <span className="text-[10px] uppercase font-sans font-black text-emerald-300 tracking-wider">
              Desempenho
            </span>
            {handHistory.length > 0 && (
              <span className="bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-[9px] font-mono font-black px-1.5 py-0.2 rounded-full">
                {handHistory.length}
              </span>
            )}
          </button>

          <div className="flex items-center gap-2 ml-auto">
            {/* Bot Controls Quick Badge in Header */}
            <div className="flex items-center gap-1.5 bg-cyan-950/70 border border-cyan-500/40 px-2.5 py-1 rounded-xl text-[11px] font-bold text-cyan-300 shadow">
              <span className="text-xs">🤖</span>
              <span className="hidden sm:inline">Bots:</span>
              <span className="text-white font-mono font-black">{roomState.players.filter(p => p.isBot).length}</span>
              <button
                type="button"
                id="btn-header-toggle-bots"
                onClick={handleToggleBots}
                className="ml-1 text-[10px] bg-cyan-800/70 hover:bg-cyan-700 active:bg-cyan-600 px-2 py-0.5 rounded-lg border border-cyan-400/40 text-white cursor-pointer font-bold transition-colors"
                title="Alternar/Adicionar Bots na Mesa"
              >
                {roomState.players.filter(p => p.isBot).length > 0 ? 'Limpar' : '+ Bots'}
              </button>
            </div>

            {/* Players List Button */}
            <button
              type="button"
              id="btn-player-list"
              onClick={() => setIsPlayerListOpen(true)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/40 hover:bg-black/60 border border-white/20 text-white/90 text-[11px] font-bold cursor-pointer transition-colors shadow"
              title="Ver Lista de Jogadores e Assentos"
            >
              <Users className="w-3.5 h-3.5 text-emerald-400" />
              <span>{roomState.players.length} {roomState.players.length === 1 ? 'Jogador' : 'Jogadores'}</span>
            </button>

            {/* Self Profile & Avatar Button */}
            {selfPlayer && (
              <button
                type="button"
                id="btn-my-profile"
                onClick={() => setSelectedProfilePlayer(selfPlayer)}
                className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-black/40 hover:bg-black/60 border border-emerald-500/40 text-white/90 text-[11px] font-bold cursor-pointer transition-all hover:border-emerald-400 shadow"
                title="Meu Perfil e Avatar"
              >
                <div className="w-5 h-5 rounded-full overflow-hidden border border-emerald-400 shrink-0 bg-stone-800 flex items-center justify-center">
                  {selfPlayer.avatarUrl ? (
                    <img src={selfPlayer.avatarUrl} alt={selfPlayer.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <span className="text-[9px] font-black text-white">{selfPlayer.name.substring(0, 1).toUpperCase()}</span>
                  )}
                </div>
                <span className="hidden sm:inline text-stone-200 font-bold max-w-[90px] truncate">{selfPlayer.name}</span>
              </button>
            )}

            {roomState.players.filter(p => p.isSpectator).length > 0 && (
              <div className="hidden sm:flex items-center bg-black/40 border border-white/20 text-white/70 px-2 py-1 rounded-lg text-[10px] font-bold gap-1 shadow">
                <Eye className="w-3.5 h-3.5 text-white/50" />
                <span>{roomState.players.filter(p => p.isSpectator).length} Assistindo</span>
              </div>
            )}

            {/* Room Code Badge */}
            <div className="flex items-center bg-amber-400 text-black px-2.5 py-1 rounded-lg text-[11px] font-black tracking-wider uppercase gap-1.5 shadow">
              <span>#{roomState.roomId}</span>
              <button
                type="button"
                id="btn-copy-room-link"
                onClick={copyRoomCode}
                className="hover:opacity-70 text-black cursor-pointer transition-opacity"
                title="Copiar Link de Convite"
              >
                {copiedCode ? <Check className="w-3.5 h-3.5" /> : <Share2 className="w-3.5 h-3.5" />}
              </button>
            </div>

            {/* Leave Room Button */}
            <button
              type="button"
              id="btn-settings"
              onClick={() => setIsSettingsOpen(true)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-black/40 hover:bg-black/60 border border-white/20 text-white/90 text-[11px] font-bold cursor-pointer"
              title="Configurações"
            >
              <Settings className="w-3.5 h-3.5 text-stone-300" />
            </button>
            <button
              type="button"
              id="btn-leave-room"
              onClick={handleLeaveRoom}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-black/40 hover:bg-black/60 border border-white/20 text-white/90 text-[11px] font-bold cursor-pointer"
              title="Sair da Sala"
            >
              <LogOut className="w-3.5 h-3.5 text-red-300" />
            </button>
          </div>
        </div>
      </header>

      {/* FLOATING LEADERBOARD (TOP 3) */}
      <div className="absolute top-12 left-2 sm:left-4 z-40">
        <Leaderboard players={roomState.players} />
      </div>

      {/* 2. CASINO TABLE ARENA (COMPLETELY ROUND OVAL TABLE - PERFECTLY BALANCED HEIGHT) */}
      <main className="flex-1 w-full flex flex-col justify-between items-center p-1 sm:p-2 md:p-3 relative overflow-hidden z-10 pt-12">
        {/* Table Felt Surface - Completely Round Oval Felt Arena */}
        <div className="w-full flex-1 casino-felt-pattern casino-table-rail rounded-[80px] sm:rounded-[160px] md:rounded-[240px] lg:rounded-[320px] p-4 sm:p-6 md:p-8 flex flex-col justify-between relative shadow-2xl overflow-hidden min-h-[580px] sm:min-h-[640px] md:min-h-[700px] lg:min-h-[750px]">
          {/* Round Table Circular Felt Rings & Watermark */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[94%] h-[86%] border-2 border-dashed border-amber-400/20 rounded-full pointer-events-none" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[76%] h-[64%] border border-amber-400/20 rounded-full pointer-events-none" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-amber-100/5 text-6xl sm:text-8xl md:text-[140px] font-black uppercase italic tracking-tighter pointer-events-none select-none font-serif">
            Blackjack
          </div>

          {/* Dealer Area Top Center */}
          <DealerArea
            dealer={roomState.dealer}
            phase={roomState.phase}
            deckRemaining={roomState.deckRemaining}
            timerSeconds={activeTurnTimeLeft}
          />

          {/* Table Arch Motto */}
          <div className="w-full flex items-center justify-center my-1 pointer-events-none select-none z-10">
            <div className="border border-amber-400/20 rounded-full px-6 py-1 text-center text-amber-200/50 font-mono text-[10px] sm:text-xs tracking-widest uppercase bg-black/30 backdrop-blur-sm">
              BLACKJACK PAYS 3 TO 2 • DEALER MUST STAND ON 17 • 9-SEAT ROUND TABLE
            </div>
          </div>

          {/* Players Seats Curved Arc (Up to 9 Players) */}
          <div className="w-full flex justify-center mt-auto px-1 sm:px-2 md:px-4 lg:px-6">
            <div
              id="players-seats-container"
              className="w-[580px] xs:w-[700px] sm:w-[840px] md:w-full md:max-w-[98%] lg:max-w-[97%] xl:max-w-[96%] 2xl:max-w-[95%] grid grid-cols-9 gap-1 sm:gap-1.5 md:gap-2 lg:gap-3 xl:gap-4 items-end justify-center pt-8 pb-3 z-10 origin-bottom transform scale-[0.54] xs:scale-[0.66] sm:scale-[0.80] md:scale-100"
            >
              {(() => {
                const TOTAL_SEATS = 9;

                const activePlayers = roomState.players.filter(p => !p.isSpectator);
                const sortedPlayers = [...activePlayers].sort((a, b) => {
                  const winsA = a.wins || 0;
                  const winsB = b.wins || 0;
                  if (winsB !== winsA) return winsB - winsA;
                  return b.chips - a.chips;
                });

                // Map of seatIndex -> Player
                const seatToPlayerMap = new Map<number, Player>();
                activePlayers.forEach(player => {
                  if (player.seatIndex >= 0 && player.seatIndex < TOTAL_SEATS) {
                    seatToPlayerMap.set(player.seatIndex, player);
                  }
                });

                // Render 9 columns from Left to Right (col 0 to 8):
                // "O assento que começa da direita (Assento 1) e o último assento termina na esquerda (Assento 9)":
                // col 0 (far left)  => Assento 9 (seatIndex 8)
                // col 1             => Assento 8 (seatIndex 7)
                // col 2             => Assento 7 (seatIndex 6)
                // col 3             => Assento 6 (seatIndex 5)
                // col 4 (center)    => Assento 5 (seatIndex 4)
                // col 5             => Assento 4 (seatIndex 3)
                // col 6             => Assento 3 (seatIndex 2)
                // col 7             => Assento 2 (seatIndex 1)
                // col 8 (rightmost) => Assento 1 (seatIndex 0)
                const columns = Array.from({ length: TOTAL_SEATS }, (_, col) => {
                  const seatIndex = (TOTAL_SEATS - 1) - col;
                  const seatNumber = seatIndex + 1;
                  const player = seatToPlayerMap.get(seatIndex) || null;
                  return { col, seatIndex, seatNumber, player };
                });

                return columns.map(({ col, seatIndex, seatNumber, player }) => {
                  // O Assento 5 (col 4) fica no meião (base) e os assentos vão subindo em direção às pontas (Assento 1 e 9)
                  // Os assentos são mantidos retos (sem inclinação angular/rotate)
                  const distFromCenter = Math.abs(col - 4);
                  let arcOffsetClass = 'translate-y-0';
                  if (distFromCenter === 1) {
                    // Assento 6 (esquerda) e Assento 4 (direita)
                    arcOffsetClass = '-translate-y-2 sm:-translate-y-3 md:-translate-y-4 lg:-translate-y-5 xl:-translate-y-6';
                  } else if (distFromCenter === 2) {
                    // Assento 7 (esquerda) e Assento 3 (direita)
                    arcOffsetClass = '-translate-y-5 sm:-translate-y-7 md:-translate-y-10 lg:-translate-y-13 xl:-translate-y-16';
                  } else if (distFromCenter === 3) {
                    // Assento 8 (esquerda) e Assento 2 (direita)
                    arcOffsetClass = '-translate-y-9 sm:-translate-y-13 md:-translate-y-18 lg:-translate-y-23 xl:-translate-y-28';
                  } else if (distFromCenter === 4) {
                    // Assento 9 (extrema esquerda) e Assento 1 (extrema direita)
                    arcOffsetClass = '-translate-y-14 sm:-translate-y-20 md:-translate-y-28 lg:-translate-y-35 xl:-translate-y-42';
                  }

                  if (player) {
                    const rank = sortedPlayers.findIndex(p => p.id === player.id);
                    return (
                      <div key={player.id} className={`w-full flex justify-center transition-transform duration-300 ${arcOffsetClass}`}>
                        <PlayerSeat
                          player={player}
                          isSelf={isSelf(player.id)}
                          selfPlayer={selfPlayer}
                          isActiveTurn={roomState.activePlayerId === player.id}
                          phase={roomState.phase}
                          onUpdateName={handleUpdatePlayerName}
                          onRequestLoan={handleRequestLoan}
                          onRepayLoan={handleRepayLoan}
                          onViewProfile={() => setSelectedProfilePlayer(player)}
                          rank={rank}
                          turnStartTime={roomState.turnStartTime}
                          turnTimeout={roomState.turnTimeout}
                        />
                      </div>
                    );
                  } else {
                    const isSelfSpectator = !!selfPlayer?.isSpectator;
                    const canTakeSeat = isSelfSpectator || (selfPlayer && selfPlayer.status !== 'playing');

                    return (
                      <button
                        type="button"
                        key={`empty-seat-${seatIndex}`}
                        onClick={() => {
                          if (canTakeSeat) {
                            handleTakeSeat(seatIndex);
                          }
                        }}
                        disabled={!canTakeSeat}
                        title={
                          isSelfSpectator
                            ? `Clique para escolher o Assento #${seatNumber} e jogar!`
                            : `Trocar para o Assento #${seatNumber}`
                        }
                        className={`group relative flex flex-col items-center justify-center p-2 rounded-2xl border transition-all duration-200 w-full max-w-[125px] sm:max-w-[140px] lg:max-w-[155px] xl:max-w-[165px] mx-auto min-h-[95px] sm:min-h-[110px] text-center cursor-pointer ${
                          isSelfSpectator
                            ? 'border-amber-400/60 bg-amber-500/10 hover:bg-amber-500/25 hover:border-amber-300 hover:shadow-[0_0_20px_rgba(245,158,11,0.35)] hover:scale-105 active:scale-95 animate-pulse'
                            : 'border-dashed border-white/15 bg-black/30 hover:border-white/30 hover:bg-white/5 active:scale-95'
                        } ${arcOffsetClass}`}
                      >
                        <div className={`w-6 h-6 rounded-full border flex items-center justify-center text-xs mb-1 transition-transform group-hover:scale-110 ${
                          isSelfSpectator
                            ? 'border-amber-400 bg-amber-500/30 text-amber-300 font-black shadow-[0_0_10px_rgba(245,158,11,0.4)]'
                            : 'border-white/20 bg-white/5 text-white/40'
                        }`}>
                          +
                        </div>
                        <span className={`text-[10px] sm:text-[11px] font-black tracking-tight ${
                          isSelfSpectator ? 'text-amber-200' : 'text-white/50'
                        }`}>
                          Assento {seatNumber}
                        </span>
                        <span className={`mt-1 text-[8px] sm:text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full transition-colors ${
                          isSelfSpectator
                            ? 'bg-amber-400 text-stone-950 shadow-[0_0_8px_rgba(245,158,11,0.5)] group-hover:bg-amber-300'
                            : 'bg-emerald-500/10 text-emerald-400/80 border border-emerald-500/20'
                        }`}>
                          {isSelfSpectator ? 'Sentar Aqui' : 'Livre'}
                        </span>
                      </button>
                    );
                  }
                });
              })()}
            </div>
          </div>
        </div>
      </main>

      {/* 3. TABLE CONTROLS BOTTOM PANEL (ELEGANT DARK) */}
      <footer className="w-full bg-black/60 backdrop-blur-md border-t border-white/10 p-2 sm:p-4 z-30">
        {selfPlayer?.isSpectator ? (
          <div className="w-full max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 bg-stone-900/90 backdrop-blur-md rounded-2xl border border-amber-500/30 shadow-[0_4px_24px_rgba(0,0,0,0.6)]">
            <div className="flex items-center gap-3">
              <span className="w-3 h-3 rounded-full bg-amber-400 animate-pulse flex-shrink-0"></span>
              <div className="text-left">
                <p className="text-white text-xs sm:text-sm font-black flex items-center gap-2">
                  <span>Modo Espectador</span>
                  <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/30">
                    {Math.max(0, 9 - roomState.players.filter(p => !p.isSpectator).length)} vaga(s) livre(s)
                  </span>
                </p>
                <p className="text-stone-300 text-[11px] sm:text-xs">
                  {roomState.players.filter(p => !p.isSpectator).length < 9
                    ? 'Clique em qualquer um dos assentos livres na mesa acima para escolher seu lugar e jogar!'
                    : 'Todos os 9 assentos estão ocupados no momento. Aguarde um jogador sair para sentar.'}
                </p>
              </div>
            </div>

            {roomState.players.filter(p => !p.isSpectator).length < 9 && (
              <button
                type="button"
                id="btn-quick-sit"
                onClick={() => {
                  const takenSeats = new Set(roomState.players.filter(p => !p.isSpectator).map(p => p.seatIndex));
                  for (let s = 0; s < 9; s++) {
                    if (!takenSeats.has(s)) {
                      handleTakeSeat(s);
                      break;
                    }
                  }
                }}
                className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-stone-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-[0_0_15px_rgba(245,158,11,0.3)] transition-all active:scale-95 cursor-pointer flex items-center gap-2 whitespace-nowrap"
              >
                <span>⚡ Ocupar Vaga Livre</span>
              </button>
            )}
          </div>
        ) : (
          <TableControls
            selfPlayer={selfPlayer}
            activePlayer={activePlayer}
            isHost={isHost}
            phase={roomState.phase}
            canStartDeal={canStartDeal}
            botsCount={roomState.players.filter(p => p.isBot).length}
            maxBots={Math.max(0, 9 - roomState.players.filter(p => !p.isBot && !p.isSpectator).length)}
            onBetChange={handleBetChange}
            onReadyToggle={handleReadyToggle}
            onStartDeal={handleStartDeal}
            onHit={handleHit}
            onStand={handleStand}
            onDouble={handleDouble}
            onNewRound={handleNewRound}
            onAddBot={handleAddBot}
            onRemoveBot={handleRemoveBot}
            onToggleBots={handleToggleBots}
            onStandUp={handleStandUp}
          />
        )}
      </footer>

      {/* 4. CHAT DRAWER */}
      <TableChat
        messages={roomState.messages}
        onSendMessage={handleSendMessage}
      />

      {/* PERFORMANCE STATISTICS DRAWER (Symmetrical on the bottom-left & accessible via header) */}
      <StatsDrawer
        handHistory={handHistory}
        bankrollHistory={bankrollHistory}
        currentChips={selfPlayer ? selfPlayer.chips : 0}
        currentRound={roomState.roundNumber}
        sessionSeconds={sessionSeconds}
        totalSeconds={totalPlaytimeSeconds}
        playerName={selfPlayer?.name || playerName}
        accountType={currentUserId?.startsWith('guest_') ? 'Conta Convidado' : 'Conta Cadastrada'}
        isOpen={isStatsOpen}
        onClose={() => setIsStatsOpen(false)}
        onToggle={() => setIsStatsOpen(prev => !prev)}
        onClearHistory={handleClearStats}
        onOpenPlaytimeScoreboard={() => setIsPlaytimeScoreboardOpen(true)}
      />

      {/* 5. LOAN REQUESTS TOASTS */}
      <div className="fixed top-20 right-4 z-50 flex flex-col gap-2">
        {loanRequests.map((req) => (
          <div key={req.requesterId} className="bg-stone-900 border border-amber-500/30 p-4 rounded-xl shadow-2xl min-w-[280px]">
            <h4 className="text-amber-400 font-bold mb-2">Pedido de Empréstimo</h4>
            <p className="text-sm text-stone-300 mb-4">{req.requesterName} está pedindo <span className="text-emerald-400 font-bold">${req.amount}</span> emprestado.</p>
            <div className="flex gap-2 justify-end">
              <button 
                onClick={() => handleRespondLoan(req.requesterId, false, req.amount)}
                className="px-3 py-1.5 text-xs font-bold rounded-lg bg-stone-800 text-stone-400 hover:text-white transition-colors"
              >
                Recusar
              </button>
              <button 
                onClick={() => handleRespondLoan(req.requesterId, true, req.amount)}
                className="px-3 py-1.5 text-xs font-bold rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 transition-colors"
              >
                Emprestar
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* 6. MODALS */}
      <RulesModal isOpen={isRulesOpen} onClose={() => setIsRulesOpen(false)} />
      <LocalSetupModal 
        isOpen={isSetupOpen} 
        onClose={() => setIsSetupOpen(false)}
        customServerUrl={customServerUrl}
        onSaveServerUrl={handleSaveServerUrl}
        isServerConnected={isServerConnected}
      />
      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
        isMuted={isMuted} 
        onToggleMute={toggleMute} 
        autoReady={autoReady} 
        onToggleAutoReady={handleToggleAutoReady} 
      />
      {isPlayerListOpen && roomState && (
        <PlayerListModal
          isOpen={isPlayerListOpen}
          onClose={() => setIsPlayerListOpen(false)}
          players={roomState.players}
          selfPlayerId={selfPlayer?.id || socket?.id || ''}
          activePlayerId={roomState.activePlayerId}
          onSelectPlayer={(p) => {
            setSelectedProfilePlayer(p);
          }}
          onRequestLoan={(targetPlayerId, amount) => handleRequestLoan(targetPlayerId, amount)}
          onRepayLoan={(targetPlayerId, amount) => handleRepayLoan(targetPlayerId, amount)}
        />
      )}
      {selectedProfilePlayer && (
        <PlayerProfileModal 
          player={selectedProfilePlayer} 
          onClose={() => setSelectedProfilePlayer(null)} 
          isSelf={isSelf(selectedProfilePlayer.id)}
          onUpdateProfile={handleUpdateProfile}
          playtimeSeconds={isSelf(selectedProfilePlayer.id) ? totalPlaytimeSeconds : undefined}
          onOpenPlaytimeScoreboard={() => {
            setSelectedProfilePlayer(null);
            setIsPlaytimeScoreboardOpen(true);
          }}
          onOpenStats={() => {
            setSelectedProfilePlayer(null);
            setIsStatsOpen(true);
          }}
        />
      )}

      {/* PLACAR DE TEMPO DE JOGO (DIAS, HORAS, MINUTOS E SEGUNDOS) */}
      <PlaytimeScoreboardModal
        isOpen={isPlaytimeScoreboardOpen}
        onClose={() => setIsPlaytimeScoreboardOpen(false)}
        sessionSeconds={sessionSeconds}
        totalSeconds={totalPlaytimeSeconds}
        todaySeconds={todaySeconds}
        longestSessionSeconds={longestSessionSeconds}
        isInGame={true}
      />
    </div>
  );
}
