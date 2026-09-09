import React, { useState, useEffect, useCallback } from 'react';
import { Spade, Heart, Diamond, Club, PlusCircle, LogIn, Sparkles, BookOpen, Terminal, Users, Eye, Coins, Zap, ChevronDown, Edit2, Clock, User, TrendingUp } from 'lucide-react';
import { motion } from 'motion/react';
import { supabase } from '../lib/supabase';
import { PlayerProfileModal } from './PlayerProfileModal';
import { PlaytimeScoreboardModal } from './PlaytimeScoreboardModal';
import { StatsDrawer } from './StatsDrawer';
import { 
  getStoredHandHistory,
  getStoredBankrollHistory,
  clearAccountStats,
  HandHistoryItem,
  BankrollHistoryItem
} from '../utils/accountStats';
import { 
  getStoredTotalPlaytime, 
  getStoredLongestSession, 
  getStoredTodayPlaytime, 
  formatPlaytimeBadge,
  fetchAndSyncPlaytimeFromDatabase,
  persistPlaytime
} from '../utils/playtime';
import { generateFreshGuestProfile } from '../utils/botGenerator';

export const GoogleIcon: React.FC<{ className?: string }> = ({ className = "w-5 h-5 shrink-0" }) => (
  <svg className={className} viewBox="0 0 24 24">
    <path
      fill="#4285F4"
      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
    />
    <path
      fill="#34A853"
      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.24v3.15C3.26 21.36 7.33 24 12 24z"
    />
    <path
      fill="#FBBC05"
      d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.24C.45 8.14 0 9.97 0 12s.45 3.86 1.24 5.42l4.04-3.15z"
    />
    <path
      fill="#EA4335"
      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.24 6.58l4.04 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
    />
  </svg>
);

interface LobbyProps {
  playerName: string;
  onUpdatePlayerName: (name: string) => void;
  onCreateRoom: (playerName: string, wins?: number, chips?: number) => void;
  onJoinRoom: (roomId: string, playerName: string, wins?: number, chips?: number) => void;
  onPlayWithBots?: (playerName: string, wins?: number, chips?: number) => void;
  onOpenRules: () => void;
  onOpenSetup: () => void;
  errorMessage?: string | null;
  isConnecting?: boolean;
  onPlaytimeSync?: (totalSeconds: number) => void;
  isServerConnected?: boolean;
  customServerUrl?: string;
  onSaveServerUrl?: (url: string) => void;
  totalPlaytimeSeconds?: number;
  sessionSeconds?: number;
  todaySeconds?: number;
  longestSessionSeconds?: number;
}

export const Lobby: React.FC<LobbyProps> = ({
  playerName,
  onUpdatePlayerName,
  onCreateRoom,
  onJoinRoom,
  onPlayWithBots,
  onOpenRules,
  onOpenSetup,
  errorMessage,
  isConnecting = false,
  onPlaytimeSync,
  isServerConnected = false,
  customServerUrl = '',
  onSaveServerUrl,
  totalPlaytimeSeconds,
  sessionSeconds = 0,
  todaySeconds,
  longestSessionSeconds
}) => {
  const [name, setName] = useState(playerName);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [step, setStep] = useState<'login' | 'register' | 'room'>('login');
  const [localError, setLocalError] = useState('');
  const [userProfile, setUserProfile] = useState<{ id: string; name: string; wins: number; chips: number } | null>(null);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  
  const [avatar, setAvatar] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('blackjack_player_avatar') || '';
    }
    return '';
  });
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isPlaytimeOpen, setIsPlaytimeOpen] = useState(false);
  const [isStatsOpen, setIsStatsOpen] = useState(false);
  const [handHistory, setHandHistory] = useState<HandHistoryItem[]>([]);
  const [bankrollHistory, setBankrollHistory] = useState<BankrollHistoryItem[]>([]);
  const [totalPlaytime, setTotalPlaytime] = useState(() => getStoredTotalPlaytime());
  const [todayPlaytime, setTodayPlaytime] = useState(() => getStoredTodayPlaytime());
  const [longestSession, setLongestSession] = useState(() => getStoredLongestSession());

  const currentTotalPlaytime = typeof totalPlaytimeSeconds === 'number' ? totalPlaytimeSeconds : totalPlaytime;
  const currentTodayPlaytime = typeof todaySeconds === 'number' ? todaySeconds : todayPlaytime;
  const currentLongestSession = typeof longestSessionSeconds === 'number' ? longestSessionSeconds : longestSession;
  const currentSessionSeconds = typeof sessionSeconds === 'number' ? sessionSeconds : 0;

  useEffect(() => {
    const uid = userProfile?.id;
    setTotalPlaytime(getStoredTotalPlaytime(uid));
    setTodayPlaytime(getStoredTodayPlaytime(uid));
    setLongestSession(getStoredLongestSession(uid));
    setHandHistory(getStoredHandHistory(uid));
    setBankrollHistory(getStoredBankrollHistory(uid));
  }, [isPlaytimeOpen, isStatsOpen, userProfile?.id]);

  const checkUser = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      // Fetch profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (profile) {
        const uProfile = { id: user.id, name: profile.name, wins: profile.wins, chips: profile.chips };
        
        // Guarantee values for orchel@gmail.com (9h playtime = 32400s, 35 wins, 20,000 chips)
        const isOrchel = user.email?.toLowerCase() === 'orchel@gmail.com' || user.id === '3039762a-3c9d-476a-b870-2b141182526d' || profile.name.toLowerCase() === 'orchel';
        if (isOrchel) {
          uProfile.chips = Math.max(uProfile.chips, 20000);
          uProfile.wins = Math.max(uProfile.wins, 35);
          const targetPlaytime = Math.max(Number(profile.playtime_seconds) || 0, 32400);
          const targetLongest = Math.max(Number(profile.longest_session_seconds) || 0, 7200);

          await supabase.from('profiles').update({
            chips: uProfile.chips,
            wins: uProfile.wins,
            playtime_seconds: targetPlaytime,
            longest_session_seconds: targetLongest,
            last_played_at: new Date().toISOString()
          }).eq('id', user.id);

          persistPlaytime(targetPlaytime, targetLongest, user.id);
          setTotalPlaytime(targetPlaytime);
          setLongestSession(targetLongest);
          if (onPlaytimeSync) {
            onPlaytimeSync(targetPlaytime);
          }
        }

        setUserProfile(uProfile);
        setName(profile.name);
        onUpdatePlayerName(profile.name);
        setStep('room');
      } else {
        // Fallback if trigger hasn't run yet or Google user initial login
        const nameFromMeta = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'Jogador';
        const newProfile = { 
          id: user.id, 
          name: nameFromMeta, 
          wins: 0, 
          chips: 1000,
          playtime_seconds: 0,
          longest_session_seconds: 0,
          avatar_url: ''
        };
        await supabase.from('profiles').upsert(newProfile);
        if (typeof window !== 'undefined') {
          localStorage.removeItem('blackjack_player_avatar');
          localStorage.setItem(`blackjack_total_playtime_seconds_${user.id}`, '0');
          localStorage.setItem(`blackjack_longest_session_seconds_${user.id}`, '0');
          localStorage.setItem(`blackjack_today_playtime_seconds_${user.id}`, '0');
        }
        setAvatar('');
        setUserProfile(newProfile);
        setName(nameFromMeta);
        onUpdatePlayerName(nameFromMeta);
        setTotalPlaytime(0);
        setLongestSession(0);
        setTodayPlaytime(0);
        if (onPlaytimeSync) {
          onPlaytimeSync(0);
        }
        setStep('room');
      }

      if (profile) {
        // Sync avatar from profile if set
        if (profile.avatar_url) {
          setAvatar(profile.avatar_url);
          if (typeof window !== 'undefined') {
            localStorage.setItem('blackjack_player_avatar', profile.avatar_url);
          }
        } else {
          setAvatar('');
          if (typeof window !== 'undefined') {
            localStorage.removeItem('blackjack_player_avatar');
          }
        }
      }

      // Sync playtime with database for this specific user account
      fetchAndSyncPlaytimeFromDatabase(user.id).then(res => {
        if (res) {
          setTotalPlaytime(res.totalSeconds);
          setLongestSession(res.longestSessionSeconds);
          setTodayPlaytime(getStoredTodayPlaytime(user.id));
          if (onPlaytimeSync) {
            onPlaytimeSync(res.totalSeconds);
          }
        }
      });
    } else {
      // Fallback to local guest profile if available
      if (typeof window !== 'undefined') {
        const guestRaw = localStorage.getItem('blackjack_guest_profile');
        if (guestRaw) {
          try {
            const profile = JSON.parse(guestRaw);
            if (profile && profile.id) {
              const savedChipsStr = localStorage.getItem('blackjack_guest_chips');
              if (savedChipsStr !== null) {
                profile.chips = Math.max(0, parseInt(savedChipsStr, 10));
              }
              setUserProfile(profile);
              setName(profile.name);
              onUpdatePlayerName(profile.name);
              setStep('room');
              return;
            }
          } catch {}
        }
      }

      // Final fallback to just the name
      const localGuest = localStorage.getItem('blackjack_player_name');
      if (localGuest) {
        setName(localGuest);
      }
    }
  }, [onUpdatePlayerName, onPlaytimeSync]);

  // Check URL query parameters for ?room=XXXXXX and set up auth listeners
  useEffect(() => {
    checkUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        checkUser();
      }
    });

    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS' || event.data?.type === 'SUPABASE_AUTH_SUCCESS') {
        checkUser();
      }
    };
    window.addEventListener('message', handleMessage);

    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const roomParam = params.get('room');
      if (roomParam) {
        setRoomCode(roomParam.toUpperCase());
        // Auto scroll to play section if coming with a link
        setTimeout(() => {
          document.getElementById('play-section')?.scrollIntoView({ behavior: 'smooth' });
        }, 500);
      }
    }

    return () => {
      subscription.unsubscribe();
      window.removeEventListener('message', handleMessage);
    };
  }, [checkUser]);

  const handleGoogleLogin = async () => {
    setLocalError('');
    setIsGoogleLoading(true);

    try {
      let redirectUrl = typeof window !== 'undefined' ? window.location.href.split('#')[0].split('?')[0] : undefined;
      if (redirectUrl && !redirectUrl.endsWith('/')) {
        redirectUrl += '/';
      }

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: true,
          queryParams: {
            access_type: 'offline',
            prompt: 'select_account'
          }
        }
      });

      if (error) {
        setIsGoogleLoading(false);
        setLocalError(error.message || 'Erro ao conectar com o Google.');
        return;
      }

      if (data?.url) {
        const width = 520;
        const height = 660;
        const left = typeof window !== 'undefined' ? window.screenX + (window.outerWidth - width) / 2 : 100;
        const top = typeof window !== 'undefined' ? window.screenY + (window.outerHeight - height) / 2 : 100;
        
        const popup = window.open(
          data.url,
          'google_oauth_popup',
          `width=${width},height=${height},left=${left},top=${top},status=no,resizable=yes,scrollbars=yes`
        );

        if (!popup || popup.closed || typeof popup.closed === 'undefined') {
          // If popup is blocked by browser, fallback to standard redirect
          window.location.href = data.url;
          return;
        }

        try {
          popup.focus();
        } catch {}

        // Poll for session or popup closing
        const timer = setInterval(async () => {
          try {
            const { data: userData } = await supabase.auth.getUser();
            if (userData?.user) {
              clearInterval(timer);
              setIsGoogleLoading(false);
              await checkUser();
              return;
            }
            if (popup.closed) {
              clearInterval(timer);
              setIsGoogleLoading(false);
              const { data: finalUserData } = await supabase.auth.getUser();
              if (finalUserData?.user) {
                await checkUser();
              }
            }
          } catch {
            // Ignore polling errors
          }
        }, 1000);
      } else {
        setIsGoogleLoading(false);
      }
    } catch (err: any) {
      setIsGoogleLoading(false);
      setLocalError(err.message || 'Falha ao autenticar com o Google.');
    }
  };

  const handleGuestLogin = () => {
    // Generate a brand new, completely fresh guest profile out of trillions of combinations
    const guestProfile = generateFreshGuestProfile();

    if (typeof window !== 'undefined') {
      localStorage.setItem('blackjack_guest_profile', JSON.stringify(guestProfile));
      localStorage.setItem('blackjack_player_name', guestProfile.name);
      localStorage.setItem('blackjack_guest_chips', '1000');
      localStorage.setItem('blackjack_guest_wins', '0');
      localStorage.removeItem('blackjack_player_avatar');
      localStorage.setItem(`blackjack_total_playtime_seconds_${guestProfile.id}`, '0');
      localStorage.setItem(`blackjack_longest_session_seconds_${guestProfile.id}`, '0');
      localStorage.setItem(`blackjack_today_playtime_seconds_${guestProfile.id}`, '0');
      localStorage.setItem('blackjack_total_playtime_seconds', '0');
      localStorage.setItem('blackjack_longest_session_seconds', '0');
      localStorage.setItem('blackjack_today_playtime_seconds', '0');
    }

    clearAccountStats(guestProfile.id);

    setName(guestProfile.name);
    onUpdatePlayerName(guestProfile.name);
    setAvatar('');
    if (typeof window !== 'undefined') {
      localStorage.removeItem('blackjack_player_avatar');
    }
    setUserProfile(guestProfile);
    setTotalPlaytime(0);
    setLongestSession(0);
    setTodayPlaytime(0);
    if (onPlaytimeSync) {
      onPlaytimeSync(0);
    }
    setStep('room');
  };

  const handleNameBlur = () => {
    const trimmed = name.trim() || 'Jogador';
    setName(trimmed);
    onUpdatePlayerName(trimmed);
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError('');
    if (!email.trim() || !password.trim()) {
      setLocalError('Preencha email e senha.');
      return;
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password.trim()
      });

      if (error) {
        setLocalError(error.message || 'Erro ao fazer login.');
        return;
      }

      const user = data.user;
      if (user) {
        // Fetch profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .maybeSingle();

        const nameVal = profile?.name || user.user_metadata?.name || user.email?.split('@')[0] || 'Jogador';
        const uProfile = {
          id: user.id,
          name: nameVal,
          wins: profile?.wins || 0,
          chips: profile?.chips || 1000
        };

        if (!profile) {
          // Create profile if missing
          await supabase.from('profiles').upsert(uProfile);
        }

        // Guarantee values for orchel@gmail.com (9h playtime = 32400s, 35 wins, 20,000 chips)
        const isOrchel = user.email?.toLowerCase() === 'orchel@gmail.com' || user.id === '3039762a-3c9d-476a-b870-2b141182526d' || nameVal.toLowerCase() === 'orchel';
        if (isOrchel) {
          uProfile.chips = Math.max(uProfile.chips, 20000);
          uProfile.wins = Math.max(uProfile.wins, 35);
          const targetPlaytime = Math.max(Number(profile?.playtime_seconds) || 0, 32400);
          const targetLongest = Math.max(Number(profile?.longest_session_seconds) || 0, 7200);

          await supabase.from('profiles').update({
            chips: uProfile.chips,
            wins: uProfile.wins,
            playtime_seconds: targetPlaytime,
            longest_session_seconds: targetLongest,
            last_played_at: new Date().toISOString()
          }).eq('id', user.id);

          persistPlaytime(targetPlaytime, targetLongest, user.id);
          setTotalPlaytime(targetPlaytime);
          setLongestSession(targetLongest);
          if (onPlaytimeSync) {
            onPlaytimeSync(targetPlaytime);
          }
        }

        if (profile?.avatar_url) {
          setAvatar(profile.avatar_url);
          if (typeof window !== 'undefined') {
            localStorage.setItem('blackjack_player_avatar', profile.avatar_url);
          }
        } else {
          setAvatar('');
          if (typeof window !== 'undefined') {
            localStorage.removeItem('blackjack_player_avatar');
          }
        }

        setUserProfile(uProfile);
        setName(nameVal);
        onUpdatePlayerName(nameVal);
        setStep('room');

        fetchAndSyncPlaytimeFromDatabase(user.id).then(res => {
          if (res) {
            setTotalPlaytime(res.totalSeconds);
            setLongestSession(res.longestSessionSeconds);
            setTodayPlaytime(getStoredTodayPlaytime(user.id));
            if (onPlaytimeSync) {
              onPlaytimeSync(res.totalSeconds);
            }
          }
        });
      }
    } catch (err: any) {
      setLocalError(err.message || 'Erro de conexão.');
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError('');
    if (!name.trim() || !email.trim() || !password.trim() || !confirmPassword.trim()) {
      setLocalError('Preencha todos os campos.');
      return;
    }
    if (password !== confirmPassword) {
      setLocalError('As senhas não coincidem.');
      return;
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password: password.trim(),
        options: {
          data: {
            name: name.trim()
          }
        }
      });

      if (error) {
        setLocalError(error.message || 'Erro ao realizar cadastro.');
        return;
      }

      const user = data.user;
      if (user) {
        // Create new clean profile on Supabase: 1000 chips, 0 wins, 0 playtime, no avatar
        const uProfile = {
          id: user.id,
          name: name.trim(),
          wins: 0,
          chips: 1000,
          playtime_seconds: 0,
          longest_session_seconds: 0,
          avatar_url: ''
        };
        await supabase.from('profiles').upsert(uProfile);

        if (typeof window !== 'undefined') {
          localStorage.removeItem('blackjack_player_avatar');
          localStorage.setItem(`blackjack_total_playtime_seconds_${user.id}`, '0');
          localStorage.setItem(`blackjack_longest_session_seconds_${user.id}`, '0');
          localStorage.setItem(`blackjack_today_playtime_seconds_${user.id}`, '0');
        }

        setAvatar('');
        setUserProfile(uProfile);
        setName(name.trim());
        onUpdatePlayerName(name.trim());
        setTotalPlaytime(0);
        setLongestSession(0);
        setTodayPlaytime(0);
        if (onPlaytimeSync) {
          onPlaytimeSync(0);
        }
        setStep('room');
      }
    } catch (err: any) {
      setLocalError(err.message || 'Erro de conexão.');
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    if (typeof window !== 'undefined') {
      localStorage.removeItem('blackjack_guest_profile');
      localStorage.removeItem('blackjack_player_name');
      localStorage.removeItem('blackjack_guest_chips');
      localStorage.removeItem('blackjack_guest_wins');
      localStorage.removeItem('blackjack_player_avatar');
      localStorage.removeItem('blackjack_total_playtime_seconds');
      localStorage.removeItem('blackjack_longest_session_seconds');
      localStorage.removeItem('blackjack_today_playtime_seconds');
    }
    setUserProfile(null);
    setStep('login');
    setPassword('');
    setEmail('');
    setName('Jogador');
    setAvatar('');
    setTotalPlaytime(0);
    setLongestSession(0);
    setTodayPlaytime(0);
    if (onPlaytimeSync) {
      onPlaytimeSync(0);
    }
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError('');
    const finalName = name.trim() || 'Jogador';
    onUpdatePlayerName(finalName);
    onCreateRoom(finalName, userProfile?.wins, userProfile?.chips);
  };

  const handlePlayBots = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLocalError('');
    const finalName = name.trim() || 'Jogador';
    onUpdatePlayerName(finalName);
    if (onPlayWithBots) {
      onPlayWithBots(finalName, userProfile?.wins, userProfile?.chips);
    } else {
      onCreateRoom(finalName, userProfile?.wins, userProfile?.chips);
    }
  };

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError('');
    let cleanCode = roomCode.trim().toUpperCase();
    if (cleanCode.includes('ROOM=')) {
      const match = cleanCode.match(/ROOM=([A-Z0-9]+)/i);
      if (match) cleanCode = match[1].toUpperCase();
    }
    if (cleanCode.startsWith('#')) {
      cleanCode = cleanCode.substring(1);
    }
    if (!cleanCode) {
      setLocalError('Digite o código da sala para entrar.');
      return;
    }
    const finalName = name.trim() || 'Jogador';
    onUpdatePlayerName(finalName);
    onJoinRoom(cleanCode, finalName, userProfile?.wins, userProfile?.chips);
  };

  const chipsCount = typeof userProfile?.chips === 'number' ? userProfile.chips : 0;
  const winsCount = userProfile?.wins ?? 0;
  const rankName = chipsCount >= 100000 
    ? 'Grande Magnata' 
    : chipsCount >= 10000 
    ? 'Sócio VIP Gold' 
    : chipsCount >= 1500 
    ? 'Jogador Profissional' 
    : 'Membro Iniciante';

  const rankColor = chipsCount >= 100000
    ? 'from-red-500 to-amber-500 text-amber-100'
    : chipsCount >= 10000
    ? 'from-yellow-500 to-amber-300 text-amber-950'
    : chipsCount >= 1500
    ? 'from-emerald-500 to-teal-400 text-teal-950'
    : 'from-stone-700 to-stone-500 text-stone-200';

  return (
    <div className="min-h-screen bg-stone-950 flex flex-col font-sans overflow-x-hidden relative">
      {/* Premium Background Effects */}
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-20 pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-950/40 via-stone-950 to-amber-950/20 -z-10" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-5xl h-96 bg-emerald-600/10 blur-[150px] rounded-full -z-10 pointer-events-none" />

      {/* 1. HERO SECTION */}
      <section className="relative w-full min-h-[90vh] flex flex-col items-center justify-center p-4">
        {/* Background Subtle Watermark */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white/[0.02] text-[120px] md:text-[250px] font-black uppercase italic tracking-tighter pointer-events-none select-none whitespace-nowrap">
          Royale
        </div>

        {step === 'room' ? (
          /* VIP Lobby Portal / Dedicated Dashboard Home Screen after Logging in */
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="w-full max-w-5xl mx-auto z-10 px-2 sm:px-4 py-6"
          >
            {/* Header / User Info Bar */}
            <div className="bg-stone-900/80 border border-stone-800 backdrop-blur-xl rounded-2xl p-5 sm:p-6 mb-6 flex flex-col md:flex-row items-center justify-between gap-6 shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
              <div 
                className="flex items-center gap-4 cursor-pointer group" 
                onClick={() => setIsEditingProfile(true)}
                title="Editar seu perfil"
              >
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full border-2 border-emerald-400 overflow-hidden flex items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.3)] bg-gradient-to-br from-emerald-500 to-teal-600 relative shrink-0 transition-transform group-hover:scale-105">
                  {avatar ? (
                    <img src={avatar} alt={name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <span className="text-lg sm:text-xl font-black text-white">{name.substring(0, 2).toUpperCase()}</span>
                  )}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <Edit2 className="w-4 h-4 text-white" />
                  </div>
                </div>
                <div>
                  <p className="text-[9px] uppercase font-black text-stone-500 tracking-[0.2em] mb-0.5 flex items-center gap-1.5">
                    Jogador Conectado 
                    <span className="text-emerald-400 font-bold group-hover:underline flex items-center gap-0.5">
                      (Editar Perfil <Edit2 className="w-2 h-2 inline-block" />)
                    </span>
                  </p>
                  <h2 className="text-xl sm:text-2xl font-black text-white leading-tight flex flex-wrap items-center gap-2">
                    {name}
                    <span className={`text-[8px] sm:text-[9px] font-black uppercase px-2 py-0.5 rounded bg-gradient-to-r ${rankColor}`}>
                      {rankName}
                    </span>
                  </h2>
                </div>
              </div>

              {/* Quick Status Stats */}
              <div className="flex items-center gap-4 sm:gap-8 flex-wrap justify-center">
                <div className="text-center md:text-right">
                  <p className="text-[8px] sm:text-[9px] uppercase font-bold text-stone-500 tracking-widest mb-0.5">Saldo Atual</p>
                  <p className="text-lg sm:text-2xl font-black text-yellow-400 font-mono">${chipsCount.toLocaleString('pt-BR')}</p>
                </div>
                <div className="text-center md:text-right">
                  <p className="text-[8px] sm:text-[9px] uppercase font-bold text-stone-500 tracking-widest mb-0.5">Vitórias</p>
                  <p className="text-lg sm:text-2xl font-black text-emerald-400 font-mono">{winsCount}</p>
                </div>
                <div 
                  className="text-center md:text-right cursor-pointer group"
                  onClick={() => setIsPlaytimeOpen(true)}
                  title="Ver Placar Completo de Dias e Horas Jogando"
                >
                  <p className="text-[8px] sm:text-[9px] uppercase font-bold text-stone-500 tracking-widest mb-0.5 flex items-center justify-center md:justify-end gap-1">
                    <Clock className="w-2.5 h-2.5 text-amber-400" /> Tempo de Jogo
                  </p>
                  <p className="text-base sm:text-xl font-black text-amber-400 font-mono group-hover:text-amber-300 flex items-center justify-center md:justify-end gap-1.5 transition-colors">
                    {formatPlaytimeBadge(currentTotalPlaytime)}
                    <span className="text-[9px] font-sans font-black uppercase px-1.5 py-0.5 bg-amber-500/15 border border-amber-500/30 text-amber-300 rounded">
                      Placar
                    </span>
                  </p>
                </div>

                <div 
                  id="lobby-desempenho-btn"
                  className="text-center md:text-right cursor-pointer group bg-emerald-950/30 hover:bg-emerald-900/40 border border-emerald-500/30 hover:border-emerald-500/60 px-3 py-1.5 rounded-xl transition-all shadow-md"
                  onClick={() => setIsStatsOpen(true)}
                  title="Abrir Desempenho e Histórico da Conta (Atualiza a cada rodada)"
                >
                  <p className="text-[8px] sm:text-[9px] uppercase font-bold text-emerald-400 tracking-widest mb-0.5 flex items-center justify-center md:justify-end gap-1">
                    <TrendingUp className="w-2.5 h-2.5 text-emerald-400" /> Desempenho
                  </p>
                  <p className="text-xs sm:text-sm font-black text-white font-mono group-hover:text-emerald-300 flex items-center justify-center md:justify-end gap-1 transition-colors">
                    <span>Gráfico & Rodadas</span>
                    {handHistory.length > 0 && (
                      <span className="text-[9px] font-sans font-black uppercase px-1.5 py-0.2 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 rounded-full">
                        {handHistory.length}
                      </span>
                    )}
                  </p>
                </div>


                <button
                  type="button"
                  onClick={handleLogout}
                  className="px-4 py-2 bg-stone-800 hover:bg-red-950/40 border border-stone-700 hover:border-red-500/30 text-stone-400 hover:text-red-400 rounded-xl text-[10px] sm:text-xs uppercase font-bold tracking-widest transition-all cursor-pointer"
                >
                  Sair
                </button>
              </div>
            </div>

            {/* Error Message banner */}
            {(errorMessage || localError) && (
              <div className="mb-6 p-4 bg-red-950/50 border border-red-500/30 rounded-xl text-red-200 text-sm text-center font-medium animate-shake relative">
                <button
                  type="button"
                  onClick={() => setLocalError('')}
                  className="absolute top-2 right-3 text-stone-400 hover:text-white text-xs cursor-pointer"
                >
                  ✕
                </button>
                <div>{errorMessage || localError}</div>
              </div>
            )}

            {/* Bento Grid layout */}
            <div className="grid md:grid-cols-12 gap-6">

              {/* Card 1: Criar Sala VIP (Column span 7) */}
              <div className="md:col-span-7 bg-stone-900/60 border border-stone-800/80 backdrop-blur-xl rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden group flex flex-col justify-between min-h-[240px]">
                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 blur-[50px] rounded-full -z-10 group-hover:bg-emerald-500/10 transition-colors duration-500" />
                
                <div>
                  <div className="inline-flex items-center gap-2 mb-4 px-3 py-1 rounded-full bg-emerald-950/40 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold uppercase tracking-widest">
                    <Sparkles className="w-3.5 h-3.5 animate-pulse" /> Sala Privada
                  </div>
                  <h3 className="text-xl sm:text-2xl font-black text-white uppercase tracking-wider mb-3 leading-tight">Criar Nova Mesa VIP</h3>
                  <p className="text-xs sm:text-sm text-stone-400 leading-relaxed mb-6">
                    Seja o Host e abra uma mesa exclusiva de Blackjack. Você receberá um código único de 6 caracteres para compartilhar e convidar até 6 amigos para jogarem juntos em tempo real!
                  </p>
                </div>

                <div className="space-y-3 pt-2">
                  <button
                    type="button"
                    onClick={handleCreate}
                    className="w-full py-3.5 px-6 rounded-xl font-black uppercase tracking-[0.15em] text-xs sm:text-sm bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-stone-950 shadow-[0_4px_25px_rgba(16,185,129,0.25)] flex items-center justify-center gap-3 transition-all hover:-translate-y-0.5 cursor-pointer active:scale-95"
                  >
                    <PlusCircle className="w-5 h-5 text-stone-950" />
                    Abrir Mesa VIP
                  </button>

                  {/* Opção Posicionada Debaixo de Criar a Sala */}
                  <button
                    type="button"
                    id="btn-play-bots-under-create"
                    onClick={handlePlayBots}
                    className="w-full py-3.5 px-6 rounded-xl font-black uppercase tracking-[0.12em] text-xs sm:text-sm bg-gradient-to-r from-cyan-950/90 via-cyan-900/90 to-blue-950/90 hover:from-cyan-900 hover:to-blue-900 text-cyan-300 border border-cyan-500/50 hover:border-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.25)] flex items-center justify-center gap-3 transition-all hover:-translate-y-0.5 cursor-pointer active:scale-95"
                  >
                    <span className="text-lg">🤖</span>
                    <span>Jogar contra Bots de IA (Treino Solo)</span>
                  </button>
                </div>
              </div>

              {/* Card 2: Entrar na Sala via Código (Column span 5) */}
              <div className="md:col-span-5 bg-stone-900/60 border border-stone-800/80 backdrop-blur-xl rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden group flex flex-col justify-between min-h-[240px]">
                <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 blur-[50px] rounded-full -z-10 group-hover:bg-amber-500/10 transition-colors duration-500" />
                
                <div>
                  <div className="inline-flex items-center gap-2 mb-4 px-3 py-1 rounded-full bg-amber-950/40 border border-amber-500/20 text-amber-400 text-[10px] font-bold uppercase tracking-widest">
                    <LogIn className="w-3.5 h-3.5" /> Acesso Rápido
                  </div>
                  <h3 className="text-xl sm:text-2xl font-black text-white uppercase tracking-wider mb-3 leading-tight">Entrar em uma Sala</h3>
                  <p className="text-xs sm:text-sm text-stone-400 leading-relaxed mb-6">
                    Tem o convite de um amigo? Insira o código da mesa VIP abaixo para se juntar à ação instantaneamente.
                  </p>
                </div>

                <form onSubmit={handleJoin} className="space-y-4">
                  <input
                    id="join-room-code"
                    type="text"
                    value={roomCode}
                    onChange={e => {
                      let val = e.target.value.toUpperCase();
                      if (val.includes('ROOM=')) {
                        const match = val.match(/ROOM=([A-Z0-9]+)/i);
                        if (match) val = match[1].toUpperCase();
                      }
                      if (val.startsWith('#')) {
                        val = val.substring(1);
                      }
                      setRoomCode(val.trim());
                    }}
                    placeholder="DIGITE O CÓDIGO"
                    maxLength={12}
                    className="w-full bg-black/40 border border-stone-800 focus:border-amber-500/50 rounded-xl px-5 py-3 text-base sm:text-lg text-white font-mono tracking-[0.25em] placeholder-stone-800 uppercase transition-all focus:outline-none focus:ring-4 focus:ring-amber-500/10 text-center font-black"
                  />
                  <button
                    type="submit"
                    disabled={!roomCode.trim() || isConnecting}
                    className="w-full py-3.5 px-6 rounded-xl font-black uppercase tracking-widest text-xs bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-stone-950 shadow-[0_4px_20px_rgba(245,158,11,0.2)] flex items-center justify-center gap-2 disabled:opacity-50 transition-all hover:-translate-y-0.5 cursor-pointer"
                  >
                    {isConnecting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-stone-950 border-t-transparent rounded-full animate-spin" />
                        <span>Entrando na Mesa...</span>
                      </>
                    ) : (
                      <>
                        <LogIn className="w-4 h-4" />
                        <span>Entrar na Mesa</span>
                      </>
                    )}
                  </button>
                </form>
              </div>

              {/* Card 3: Jogar com Bots de IA (Column span 12) */}
              <div className="md:col-span-12 bg-gradient-to-r from-stone-900/90 via-cyan-950/40 to-stone-900/90 border border-cyan-500/40 backdrop-blur-xl rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden group flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="absolute top-0 right-0 w-48 h-48 bg-cyan-500/10 blur-[60px] rounded-full -z-10" />
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-3xl shadow-[0_0_20px_rgba(6,182,212,0.3)] shrink-0">
                    🤖
                  </div>
                  <div>
                    <div className="inline-flex items-center gap-1.5 mb-1 px-2.5 py-0.5 rounded-full bg-cyan-950/60 border border-cyan-500/30 text-cyan-400 text-[10px] font-bold uppercase tracking-widest">
                      <Sparkles className="w-3 h-3" /> Milhões de Bots • Rotação Dinâmica
                    </div>
                    <h3 className="text-xl sm:text-2xl font-black text-white uppercase tracking-wider mb-1">
                      Jogar com Bots de IA
                    </h3>
                    <p className="text-xs sm:text-sm text-stone-300 max-w-xl">
                      Enfrente uma infinidade de jogadores virtuais com nomes, fotos, saldos e táticas únicas. A cada rodada, novos bots entram e saem da mesa mantendo o jogo sempre renovado e desafiador!
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  id="btn-play-with-bots"
                  onClick={handlePlayBots}
                  disabled={isConnecting}
                  className="w-full md:w-auto px-8 py-4 rounded-xl font-black uppercase tracking-[0.15em] text-xs sm:text-sm bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-stone-950 shadow-[0_4px_25px_rgba(6,182,212,0.35)] flex items-center justify-center gap-3 transition-all hover:-translate-y-0.5 disabled:opacity-50 cursor-pointer shrink-0"
                >
                  <span>🎮 Entrar na Mesa com Bots</span>
                </button>
              </div>

              {/* Card 4: Dealer Tips & Responsible Play (Column span 12) */}
              <div className="md:col-span-12 bg-gradient-to-r from-stone-900/60 to-emerald-950/20 border border-stone-800/80 backdrop-blur-xl rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0">
                    <BookOpen className="w-6 h-6 text-emerald-400" />
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-white mb-1">Dica Estratégica do Cassino</h4>
                    <p className="text-xs sm:text-sm text-stone-400 max-w-xl">
                      O Dealer é obrigado a parar em 17 pontos e pedir cartas em qualquer mão de 16 ou menos. Use essa regra em seu favor para dobrar (double) nos momentos ideais!
                    </p>
                  </div>
                </div>
                <div className="flex gap-4 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={onOpenRules}
                    className="flex-1 sm:flex-initial px-6 py-3 bg-stone-800 hover:bg-stone-750 border border-stone-700 text-stone-200 rounded-xl text-[10px] sm:text-xs uppercase font-bold tracking-widest transition-colors cursor-pointer text-center"
                  >
                    Ver Regras
                  </button>
                </div>
              </div>

            </div>
          </motion.div>
        ) : (
          /* Landing Page with Split Column layout (Not logged in) */
          <div className="w-full max-w-6xl mx-auto grid lg:grid-cols-2 gap-12 lg:gap-8 items-center z-10">
            
            {/* Left: Copy & Branding */}
            <motion.div 
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="flex flex-col items-center lg:items-start text-center lg:text-left pt-12 lg:pt-0"
            >
              <div className="inline-flex items-center gap-2 mb-6 px-4 py-1.5 rounded-full bg-stone-900/80 border border-amber-500/30 text-amber-400 text-[10px] sm:text-xs font-bold uppercase tracking-widest shadow-[0_0_20px_rgba(245,158,11,0.15)] backdrop-blur-sm">
                <Sparkles className="w-4 h-4" /> Clube VIP Exclusivo
              </div>
              
              <h1 className="text-5xl sm:text-6xl md:text-7xl font-black uppercase tracking-tighter text-white drop-shadow-2xl mb-6 leading-[1.1]">
                Apostas Altas.<br className="hidden lg:block"/>
                <span className="bg-gradient-to-r from-emerald-400 to-teal-200 bg-clip-text text-transparent italic pr-4">Sangue Frio.</span>
              </h1>
              
              <p className="text-base sm:text-lg text-stone-400 max-w-lg font-medium leading-relaxed mb-10">
                A experiência definitiva de cassino em tempo real. Convide seus amigos, garanta seu assento na mesa VIP e vença o Dealer em emocionantes partidas de Blackjack.
              </p>

              <div className="flex flex-wrap justify-center lg:justify-start gap-4 sm:gap-6 text-xs sm:text-sm font-bold text-stone-500 uppercase tracking-widest mb-12">
                 <span className="flex items-center gap-2"><span className="text-emerald-500">✓</span> Fair Play</span>
                 <span className="flex items-center gap-2"><span className="text-emerald-500">✓</span> Multiplayer Real</span>
                 <span className="flex items-center gap-2"><span className="text-emerald-500">✓</span> Sem Bots</span>
              </div>

              <div className="flex items-center gap-6 text-white/40 text-2xl">
                <motion.span animate={{ y: [0, -5, 0], rotate: [0, -10, 0] }} transition={{ repeat: Infinity, duration: 3, delay: 0 }}>♠</motion.span>
                <motion.span animate={{ y: [0, -5, 0], rotate: [0, 10, 0] }} transition={{ repeat: Infinity, duration: 3, delay: 0.5 }} className="text-red-500/60">♥</motion.span>
                <motion.span animate={{ y: [0, -5, 0], rotate: [0, -10, 0] }} transition={{ repeat: Infinity, duration: 3, delay: 1 }} className="text-red-500/60">♦</motion.span>
                <motion.span animate={{ y: [0, -5, 0], rotate: [0, 10, 0] }} transition={{ repeat: Infinity, duration: 3, delay: 1.5 }}>♣</motion.span>
              </div>
            </motion.div>

            {/* Right: The Login/Play Panel */}
            <motion.div
              id="play-section"
              initial={{ opacity: 0, y: 50, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
              className="w-full max-w-md mx-auto"
            >
              <div className="bg-stone-900/60 border border-stone-800 backdrop-blur-xl rounded-3xl p-8 shadow-[0_0_50px_rgba(0,0,0,0.5)] relative overflow-hidden group">
                {/* Premium Inner Glow */}
                <div className="absolute inset-0 bg-gradient-to-b from-white/[0.03] to-transparent pointer-events-none" />
                <div className="absolute top-0 right-0 w-40 h-40 bg-emerald-500/10 blur-[60px] rounded-full -z-10 group-hover:bg-emerald-500/20 transition-colors duration-700" />
                <div className="absolute bottom-0 left-0 w-40 h-40 bg-amber-500/10 blur-[60px] rounded-full -z-10 group-hover:bg-amber-500/20 transition-colors duration-700" />

                {step === 'login' && (
                  <form onSubmit={handleLoginSubmit} className="animate-in fade-in duration-500 relative z-10">
                    <h2 className="text-2xl font-black text-white mb-6 text-center uppercase tracking-widest">Entrar na Conta</h2>

                    {(errorMessage || localError) && (
                      <div className="mb-6 p-4 bg-red-950/50 border border-red-500/30 rounded-xl text-red-200 text-sm text-center font-medium animate-shake">
                        {errorMessage || localError}
                      </div>
                    )}

                    <div className="space-y-5 mb-8">
                      <div>
                        <label className="block text-[10px] font-black text-stone-500 uppercase tracking-[0.2em] mb-2">E-mail</label>
                        <input
                          type="email"
                          value={email}
                          onChange={e => setEmail(e.target.value)}
                          placeholder="seu@email.com"
                          className="w-full bg-black/40 border border-stone-800 focus:border-emerald-500/50 rounded-xl px-5 py-3.5 text-base text-white transition-all focus:outline-none focus:ring-4 focus:ring-emerald-500/10 placeholder-stone-700 font-medium"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-stone-500 uppercase tracking-[0.2em] mb-2">Senha</label>
                        <input
                          type="password"
                          value={password}
                          onChange={e => setPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full bg-black/40 border border-stone-800 focus:border-emerald-500/50 rounded-xl px-5 py-3.5 text-base text-white transition-all focus:outline-none focus:ring-4 focus:ring-emerald-500/10 placeholder-stone-700 font-medium"
                          required
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={!email.trim() || !password.trim()}
                      className="w-full py-4 px-6 rounded-xl font-black uppercase tracking-[0.15em] text-sm bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white shadow-[0_4px_20px_rgba(16,185,129,0.2)] flex items-center justify-center gap-3 transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0 cursor-pointer"
                    >
                      Acessar Cassino
                      <LogIn className="w-5 h-5" />
                    </button>

                    <div className="relative my-6 flex items-center justify-center">
                      <div className="border-t border-stone-800 w-full" />
                      <span className="bg-[#1c1917] px-3 text-[10px] uppercase font-black tracking-[0.2em] text-stone-500 absolute">
                        ou
                      </span>
                    </div>

                    {/* Google Login Option (debaixo de Acessar Cassino) */}
                    <button
                      id="google-login-btn"
                      type="button"
                      onClick={handleGoogleLogin}
                      disabled={isGoogleLoading}
                      className="w-full py-3.5 px-6 rounded-xl font-bold text-sm bg-white hover:bg-stone-100 active:bg-stone-200 text-stone-900 border border-stone-200 shadow-md flex items-center justify-center gap-3 transition-all hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-60 cursor-pointer"
                    >
                      {isGoogleLoading ? (
                        <div className="w-5 h-5 border-2 border-stone-800 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <GoogleIcon />
                      )}
                      <span>{isGoogleLoading ? 'Conectando ao Google...' : 'Entrar com o Google'}</span>
                    </button>

                    {/* Guest Login Option */}
                    <button
                      id="guest-login-btn"
                      type="button"
                      onClick={handleGuestLogin}
                      className="w-full mt-3 py-3.5 px-6 rounded-xl font-bold text-sm bg-stone-800/90 hover:bg-stone-700 active:bg-stone-600 text-stone-200 border border-stone-700 hover:border-amber-500/40 shadow-md flex items-center justify-center gap-3 transition-all hover:-translate-y-0.5 cursor-pointer"
                    >
                      <User className="w-5 h-5 text-amber-400" />
                      <span>Jogar como Convidado (Sem Cadastro)</span>
                    </button>

                    <div className="mt-8 text-center">
                      <button
                        type="button"
                        onClick={() => { setStep('register'); setLocalError(''); }}
                        className="text-stone-500 hover:text-stone-300 text-[10px] uppercase tracking-widest font-bold transition-colors cursor-pointer"
                      >
                        Não tem conta? <span className="text-emerald-500 underline underline-offset-4">Cadastre-se</span>
                      </button>
                    </div>
                  </form>
                )}

                {step === 'register' && (
                  <form onSubmit={handleRegisterSubmit} className="animate-in fade-in duration-500 relative z-10">
                    <h2 className="text-2xl font-black text-white mb-6 text-center uppercase tracking-widest">Criar Conta</h2>

                    {localError && (
                      <div className="mb-6 p-4 bg-red-950/50 border border-red-500/30 rounded-xl text-red-200 text-sm text-center font-medium animate-shake">
                        {localError}
                      </div>
                    )}

                    <div className="space-y-5 mb-8">
                      <div>
                        <label className="block text-[10px] font-black text-stone-500 uppercase tracking-[0.2em] mb-2">Seu Apelido na Mesa</label>
                        <input
                          type="text"
                          value={name}
                          onChange={e => setName(e.target.value)}
                          placeholder="Ex: Maverick"
                          maxLength={18}
                          className="w-full bg-black/40 border border-stone-800 focus:border-amber-500/50 rounded-xl px-5 py-3 text-base text-white font-bold transition-all focus:outline-none focus:ring-4 focus:ring-amber-500/10 placeholder-stone-700"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-stone-500 uppercase tracking-[0.2em] mb-2">E-mail</label>
                        <input
                          type="email"
                          value={email}
                          onChange={e => setEmail(e.target.value)}
                          placeholder="seu@email.com"
                          className="w-full bg-black/40 border border-stone-800 focus:border-amber-500/50 rounded-xl px-5 py-3 text-base text-white transition-all focus:outline-none focus:ring-4 focus:ring-amber-500/10 placeholder-stone-700 font-medium"
                          required
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] font-black text-stone-500 uppercase tracking-[0.2em] mb-2">Senha</label>
                          <input
                            type="password"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            placeholder="••••••••"
                            className="w-full bg-black/40 border border-stone-800 focus:border-amber-500/50 rounded-xl px-5 py-3 text-base text-white transition-all focus:outline-none focus:ring-4 focus:ring-amber-500/10 placeholder-stone-700 font-medium"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-black text-stone-500 uppercase tracking-[0.2em] mb-2">Confirmar</label>
                          <input
                            type="password"
                            value={confirmPassword}
                            onChange={e => setConfirmPassword(e.target.value)}
                            placeholder="••••••••"
                            className="w-full bg-black/40 border border-stone-800 focus:border-amber-500/50 rounded-xl px-5 py-3 text-base text-white transition-all focus:outline-none focus:ring-4 focus:ring-amber-500/10 placeholder-stone-700 font-medium"
                            required
                          />
                        </div>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={!name.trim() || !email.trim() || !password.trim() || !confirmPassword.trim()}
                      className="w-full py-4 px-6 rounded-xl font-black uppercase tracking-[0.15em] text-sm bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-stone-950 shadow-[0_4px_20px_rgba(245,158,11,0.2)] flex items-center justify-center gap-3 transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0 cursor-pointer"
                    >
                      Cadastrar
                      <PlusCircle className="w-5 h-5" />
                    </button>

                    <div className="relative my-6 flex items-center justify-center">
                      <div className="border-t border-stone-800 w-full" />
                      <span className="bg-[#1c1917] px-3 text-[10px] uppercase font-black tracking-[0.2em] text-stone-500 absolute">
                        ou
                      </span>
                    </div>

                    {/* Google Register Option (debaixo do botão principal) */}
                    <button
                      id="google-register-btn"
                      type="button"
                      onClick={handleGoogleLogin}
                      disabled={isGoogleLoading}
                      className="w-full py-3.5 px-6 rounded-xl font-bold text-sm bg-white hover:bg-stone-100 active:bg-stone-200 text-stone-900 border border-stone-200 shadow-md flex items-center justify-center gap-3 transition-all hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-60 cursor-pointer"
                    >
                      {isGoogleLoading ? (
                        <div className="w-5 h-5 border-2 border-stone-800 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <GoogleIcon />
                      )}
                      <span>{isGoogleLoading ? 'Conectando ao Google...' : 'Entrar com o Google'}</span>
                    </button>

                    <div className="mt-8 text-center">
                      <button
                        type="button"
                        onClick={() => { setStep('login'); setLocalError(''); }}
                        className="text-stone-500 hover:text-stone-300 text-[10px] uppercase tracking-widest font-bold transition-colors cursor-pointer"
                      >
                        Já tem conta? <span className="text-amber-500 underline underline-offset-4">Faça Login</span>
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </motion.div>

          </div>
        )}

        {/* Scroll Indicator (Mobile) */}
        <div className="absolute bottom-8 lg:hidden flex flex-col items-center gap-2 text-stone-500 animate-pulse">
          <span className="text-[10px] uppercase font-bold tracking-widest">Conheça o Jogo</span>
          <ChevronDown className="w-5 h-5" />
        </div>
      </section>

      {/* 2. FEATURES SECTION */}
      <section className="w-full bg-stone-950 py-24 px-4 border-t border-white/5 relative z-20">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-black text-white uppercase italic font-serif mb-4">
              A Mesa é Sua
            </h2>
            <p className="text-stone-400 max-w-2xl mx-auto">
              Desenvolvido para oferecer a experiência mais imersiva de Blackjack multiplayer, combinando as regras clássicas com recursos modernos.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Feature 1 */}
            <div className="bg-stone-900 border border-stone-800 p-6 rounded-2xl hover:border-emerald-500/30 transition-colors group">
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Users className="w-6 h-6 text-emerald-400" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">7 Lugares Reais</h3>
              <p className="text-sm text-stone-400 leading-relaxed">
                Jogue simultaneamente com até 6 amigos na mesma mesa. Veja as cartas sendo distribuídas, as apostas e as jogadas em tempo real.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-stone-900 border border-stone-800 p-6 rounded-2xl hover:border-amber-500/30 transition-colors group">
              <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Eye className="w-6 h-6 text-amber-400" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Modo Espectador</h3>
              <p className="text-sm text-stone-400 leading-relaxed">
                A mesa lotou? Não tem problema. Assista e acompanhe todas as rodadas em tempo real sem ocupar um assento.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-stone-900 border border-stone-800 p-6 rounded-2xl hover:border-red-500/30 transition-colors group">
              <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Coins className="w-6 h-6 text-red-400" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Agiotagem Amigável</h3>
              <p className="text-sm text-stone-400 leading-relaxed">
                Faliu? Peça um empréstimo para qualquer jogador rico da mesa e o sistema de dívidas cuidará de rastrear quem deve para quem.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="bg-stone-900 border border-stone-800 p-6 rounded-2xl hover:border-blue-500/30 transition-colors group">
              <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Zap className="w-6 h-6 text-blue-400" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Auto-Pronto</h3>
              <p className="text-sm text-stone-400 leading-relaxed">
                Cansado de clicar para apostar toda rodada? Ative a Aposta Rápida e o sistema mantém o fluxo do cassino vivo para você.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 3. FOOTER */}
      <footer className="w-full bg-[#040d07] py-8 px-4 border-t border-white/5">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          
          <div className="flex items-center gap-2">
            <Spade className="w-5 h-5 text-stone-500" />
            <span className="text-stone-400 font-bold uppercase tracking-widest text-xs">21 Royale Multiplayer</span>
          </div>

          <div className="flex items-center gap-6">
            <button
              type="button"
              onClick={onOpenRules}
              className="flex items-center gap-2 text-stone-400 hover:text-amber-400 transition-colors cursor-pointer text-sm font-bold"
            >
              <BookOpen className="w-4 h-4" />
              <span>Regras do Cassino</span>
            </button>
            <button
              type="button"
              onClick={onOpenSetup}
              className="flex items-center gap-2 text-stone-400 hover:text-emerald-400 transition-colors cursor-pointer text-sm font-bold"
            >
              <Terminal className="w-4 h-4" />
              <span>Como Rodar Local</span>
            </button>
          </div>
          
        </div>
      </footer>

      {isEditingProfile && (
        <PlayerProfileModal
          player={{
            id: 'self',
            name: name,
            chips: chipsCount,
            wins: winsCount,
            avatarUrl: avatar,
            status: 'waiting',
            outcome: null,
            payout: 0,
            currentBet: 0,
            cards: [],
            isHost: false,
            isReady: false,
            seatIndex: 0,
            debts: {}
          }}
          onClose={() => setIsEditingProfile(false)}
          isSelf={true}
          playtimeSeconds={currentTotalPlaytime}
          onOpenPlaytimeScoreboard={() => {
            setIsEditingProfile(false);
            setIsPlaytimeOpen(true);
          }}
          onOpenStats={() => {
            setIsEditingProfile(false);
            setIsStatsOpen(true);
          }}
          onUpdateProfile={(updatedName, updatedAvatar) => {
            setName(updatedName);
            setAvatar(updatedAvatar);
            localStorage.setItem('blackjack_player_name', updatedName);
            localStorage.setItem('blackjack_player_avatar', updatedAvatar);
            onUpdatePlayerName(updatedName);
            setIsEditingProfile(false);
          }}
        />
      )}

      {/* Painel de Desempenho Isolado da Conta */}
      <StatsDrawer
        handHistory={handHistory}
        bankrollHistory={bankrollHistory}
        currentChips={chipsCount}
        currentRound={handHistory.length}
        sessionSeconds={currentSessionSeconds}
        totalSeconds={currentTotalPlaytime}
        playerName={name}
        accountType={userProfile ? 'Conta Cadastrada' : 'Conta Convidado'}
        isLobbyView={true}
        isOpen={isStatsOpen}
        onClose={() => setIsStatsOpen(false)}
        onToggle={() => setIsStatsOpen(prev => !prev)}
        onClearHistory={() => {
          clearAccountStats(userProfile?.id);
          setHandHistory([]);
          setBankrollHistory([]);
        }}
        onOpenPlaytimeScoreboard={() => {
          setIsStatsOpen(false);
          setIsPlaytimeOpen(true);
        }}
      />

      {/* Placar de Tempo de Jogo */}
      <PlaytimeScoreboardModal
        isOpen={isPlaytimeOpen}
        onClose={() => setIsPlaytimeOpen(false)}
        sessionSeconds={currentSessionSeconds}
        totalSeconds={currentTotalPlaytime}
        todaySeconds={currentTodayPlaytime}
        longestSessionSeconds={currentLongestSession}
        isInGame={false}
      />
    </div>
  );
};
