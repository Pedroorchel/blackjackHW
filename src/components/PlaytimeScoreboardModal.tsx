import React, { useState } from 'react';
import { X, Clock, Calendar, Zap, Trophy, Timer, Flame, ArrowUpRight, Play, Sparkles, Database, ShieldCheck } from 'lucide-react';
import { 
  breakDownPlaytime, 
  formatPlaytimeDigital, 
  getPlaytimeTier, 
  formatPlaytimeHuman,
  formatPlaytimeTotalGameString,
  getTotalHoursCount
} from '../utils/playtime';

interface PlaytimeScoreboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionSeconds: number;
  totalSeconds: number;
  todaySeconds: number;
  longestSessionSeconds: number;
  isInGame?: boolean;
}

export const PlaytimeScoreboardModal: React.FC<PlaytimeScoreboardModalProps> = ({
  isOpen,
  onClose,
  sessionSeconds,
  totalSeconds,
  todaySeconds,
  longestSessionSeconds,
  isInGame = true,
}) => {
  if (!isOpen) return null;

  const [activeTab, setActiveTab] = useState<'total' | 'session'>('total');

  const displayedSeconds = activeTab === 'total' ? totalSeconds : sessionSeconds;
  const time = breakDownPlaytime(displayedSeconds);
  const sessionTime = breakDownPlaytime(sessionSeconds);
  const totalTime = breakDownPlaytime(totalSeconds);
  const totalHoursCount = getTotalHoursCount(totalSeconds);
  const sessionHoursCount = getTotalHoursCount(sessionSeconds);

  const { current: currentTier, next: nextTier, progressPercent } = getPlaytimeTier(totalSeconds);

  const pad = (n: number) => n.toString().padStart(2, '0');

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-xl bg-stone-900 border border-stone-800 rounded-3xl shadow-[0_25px_60px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* TOP BANNER */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-stone-950 via-stone-900 to-emerald-950/40 border-b border-stone-800 flex items-center justify-between relative">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.2)]">
              <Clock className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-black text-white uppercase tracking-wider">
                  Placar de Tempo de Jogo
                </h3>
                {isInGame && (
                  <span className="flex items-center gap-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[9px] font-black uppercase px-2 py-0.5 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                    Gravando Ao Vivo
                  </span>
                )}
                <span className="flex items-center gap-1 bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-[9px] font-black uppercase px-2 py-0.5 rounded-full">
                  <Database className="w-2.5 h-2.5 text-cyan-400" />
                  Salvo no BD
                </span>
              </div>
              <p className="text-[11px] text-stone-400 font-medium">
                Contagem contínua de dias, horas, minutos e segundos gravados na nuvem
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-stone-400 hover:text-white p-2 rounded-xl hover:bg-stone-800/80 transition-colors cursor-pointer"
            title="Fechar Placar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* BODY CONTENT */}
        <div className="p-4 sm:p-6 overflow-y-auto no-scrollbar space-y-6 flex-1">
          
          {/* TOTAL HOURS IN GAME HERO BANNER */}
          <div className="bg-gradient-to-r from-amber-500/15 via-yellow-500/10 to-emerald-500/15 border border-amber-500/30 rounded-2xl p-3.5 flex items-center justify-between shadow-lg">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-black tracking-wider text-amber-400 block">
                  Horas Totais no Game
                </span>
                <div className="text-base sm:text-lg font-black text-white font-mono flex items-center gap-2 flex-wrap">
                  <span className="text-amber-300 font-extrabold">{totalHoursCount} Horas</span>
                  <span className="text-stone-400 text-xs font-sans font-medium">
                    ({totalTime.days > 0 ? `${totalTime.days}d ` : ''}{totalTime.hours}h {totalTime.minutes}m {totalTime.seconds}s)
                  </span>
                </div>
              </div>
            </div>

            {isInGame && (
              <div className="text-right shrink-0 pl-2 border-l border-white/10">
                <span className="text-[9px] uppercase font-bold text-stone-400 block">Mesa Atual</span>
                <span className="text-xs font-mono font-black text-emerald-400">{formatPlaytimeDigital(sessionSeconds)}</span>
              </div>
            )}
          </div>

          {/* TAB TOGGLE: TOTAL CARREIRA VS. PARTIDA ATUAL */}
          <div className="grid grid-cols-2 gap-1.5 p-1 bg-stone-950 border border-stone-800 rounded-2xl">
            <button
              type="button"
              onClick={() => setActiveTab('total')}
              className={`py-2.5 px-3 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
                activeTab === 'total'
                  ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-stone-950 shadow-lg'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Horas Totais no Game</span>
              <span className="text-[10px] opacity-80 font-mono">({totalHoursCount}h | {totalTime.days}d {totalTime.hours}h)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('session')}
              className={`py-2.5 px-3 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
                activeTab === 'session'
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-stone-950 shadow-lg'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              <Timer className="w-3.5 h-3.5" />
              <span>Partida / Mesa Atual</span>
              <span className="text-[10px] opacity-80 font-mono">({pad(sessionTime.hours)}:{pad(sessionTime.minutes)})</span>
            </button>
          </div>

          {/* MAIN CASINO DIGITAL SCOREBOARD (DIAS, HORAS, MINUTOS, SEGUNDOS) */}
          <div className="relative bg-gradient-to-b from-stone-950 to-stone-900 border-2 border-stone-800 rounded-3xl p-4 sm:p-6 shadow-[inset_0_2px_15px_rgba(0,0,0,0.8)]">
            <div className="flex items-center justify-between mb-3 px-1">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-400 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                {activeTab === 'total' ? 'Placar Geral Acumulado' : 'Placar da Partida em Andamento'}
              </span>
              <span className="text-[10px] font-mono text-emerald-400 font-bold bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                {activeTab === 'total' ? `${totalSeconds.toLocaleString()}s jogados` : `${sessionSeconds.toLocaleString()}s nesta mesa`}
              </span>
            </div>

            {/* 4 DIGITAL SCOREBOARD CARDS */}
            <div className="grid grid-cols-4 gap-2 sm:gap-3">
              
              {/* 1. DIAS */}
              <div className="bg-stone-900 border border-stone-700/80 rounded-2xl p-2.5 sm:p-4 text-center shadow-lg relative overflow-hidden group">
                <div className="absolute top-0 left-0 right-0 h-1 bg-amber-400" />
                <div className="text-2xl sm:text-4xl md:text-5xl font-black font-mono text-white tracking-tight leading-none mb-1">
                  {pad(time.days)}
                </div>
                <div className="text-[9px] sm:text-[11px] font-black uppercase tracking-widest text-amber-400">
                  Dias
                </div>
                <div className="text-[8px] text-stone-500 font-medium hidden sm:block mt-0.5">
                  24h por dia
                </div>
              </div>

              {/* 2. HORAS */}
              <div className="bg-stone-900 border border-stone-700/80 rounded-2xl p-2.5 sm:p-4 text-center shadow-lg relative overflow-hidden group">
                <div className="absolute top-0 left-0 right-0 h-1 bg-yellow-400" />
                <div className="text-2xl sm:text-4xl md:text-5xl font-black font-mono text-yellow-400 tracking-tight leading-none mb-1">
                  {pad(time.hours)}
                </div>
                <div className="text-[9px] sm:text-[11px] font-black uppercase tracking-widest text-stone-300">
                  Horas
                </div>
                <div className="text-[8px] text-amber-400/90 font-bold block mt-0.5 truncate">
                  {activeTab === 'total' ? `${totalHoursCount}h totais` : `${sessionHoursCount}h na mesa`}
                </div>
              </div>

              {/* 3. MINUTOS */}
              <div className="bg-stone-900 border border-stone-700/80 rounded-2xl p-2.5 sm:p-4 text-center shadow-lg relative overflow-hidden group">
                <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-400" />
                <div className="text-2xl sm:text-4xl md:text-5xl font-black font-mono text-emerald-400 tracking-tight leading-none mb-1">
                  {pad(time.minutes)}
                </div>
                <div className="text-[9px] sm:text-[11px] font-black uppercase tracking-widest text-stone-300">
                  Minutos
                </div>
                <div className="text-[8px] text-stone-500 font-medium hidden sm:block mt-0.5">
                  60 seg cada
                </div>
              </div>

              {/* 4. SEGUNDOS (LIVE PULSE) */}
              <div className="bg-stone-900 border border-stone-700/80 rounded-2xl p-2.5 sm:p-4 text-center shadow-lg relative overflow-hidden group">
                <div className="absolute top-0 left-0 right-0 h-1 bg-teal-400" />
                <div className="text-2xl sm:text-4xl md:text-5xl font-black font-mono text-teal-300 tracking-tight leading-none mb-1">
                  {pad(time.seconds)}
                </div>
                <div className="text-[9px] sm:text-[11px] font-black uppercase tracking-widest text-teal-400 flex items-center justify-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-ping inline-block" />
                  Segundos
                </div>
                <div className="text-[8px] text-stone-500 font-medium hidden sm:block mt-0.5">
                  ao vivo
                </div>
              </div>

            </div>

            {/* Human Readable Summary */}
            <div className="mt-4 pt-3 border-t border-stone-800/80 flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-left">
              <span className="text-xs text-stone-400">
                Extenso:{' '}
                <strong className="text-white font-bold">
                  {activeTab === 'total' && totalHoursCount > 0 && (
                    <span className="text-amber-300 font-extrabold mr-1">
                      {totalHoursCount} {totalHoursCount === 1 ? 'hora total' : 'horas totais'} ({time.days > 0 ? `${time.days} ${time.days === 1 ? 'dia' : 'dias'}, ` : ''}{time.hours}h {time.minutes}m {time.seconds}s)
                    </span>
                  )}
                  {(activeTab !== 'total' || totalHoursCount === 0) && (
                    <>
                      {time.days > 0 ? `${time.days} ${time.days === 1 ? 'dia' : 'dias'}, ` : ''}
                      {time.hours} {time.hours === 1 ? 'hora' : 'horas'},{' '}
                      {time.minutes} {time.minutes === 1 ? 'minuto' : 'minutos'} e{' '}
                      {time.seconds} {time.seconds === 1 ? 'segundo' : 'segundos'}
                    </>
                  )}
                </strong>
              </span>
              <span className="text-[10px] font-mono text-stone-500 uppercase tracking-wider font-bold">
                {formatPlaytimeDigital(displayedSeconds, true)}
              </span>
            </div>
          </div>

          {/* DUAL COMPARISON STATS GRID */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            
            {/* 1. Partida Atual */}
            <div className="bg-stone-950/60 border border-stone-800 rounded-2xl p-3.5 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] uppercase font-black tracking-wider text-emerald-400 flex items-center gap-1">
                  <Timer className="w-3 h-3" /> Mesa Atual
                </span>
                {isInGame && (
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                )}
              </div>
              <div className="text-base font-black font-mono text-white">
                {formatPlaytimeDigital(sessionSeconds)}
              </div>
              <div className="text-[10px] text-stone-400 mt-1">
                {formatPlaytimeHuman(sessionSeconds)}
              </div>
            </div>

            {/* 2. Tempo Jogado Hoje */}
            <div className="bg-stone-950/60 border border-stone-800 rounded-2xl p-3.5 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] uppercase font-black tracking-wider text-amber-400 flex items-center gap-1">
                  <Calendar className="w-3 h-3" /> Jogado Hoje
                </span>
              </div>
              <div className="text-base font-black font-mono text-white">
                {formatPlaytimeDigital(todaySeconds)}
              </div>
              <div className="text-[10px] text-stone-400 mt-1">
                {formatPlaytimeHuman(todaySeconds)}
              </div>
            </div>

            {/* 3. Sessão Mais Longa */}
            <div className="bg-stone-950/60 border border-stone-800 rounded-2xl p-3.5 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] uppercase font-black tracking-wider text-purple-400 flex items-center gap-1">
                  <Flame className="w-3 h-3" /> Recorde de Sessão
                </span>
              </div>
              <div className="text-base font-black font-mono text-white">
                {formatPlaytimeDigital(Math.max(longestSessionSeconds, sessionSeconds))}
              </div>
              <div className="text-[10px] text-stone-400 mt-1">
                Permanência máxima contínua
              </div>
            </div>

          </div>

          {/* PLAYTIME TIER / REPUTATION PROGRESS */}
          <div className="bg-gradient-to-br from-stone-950 via-stone-900 to-stone-950 border border-stone-800 rounded-2xl p-4 sm:p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <span className="text-2xl">{currentTier.badge}</span>
                <div>
                  <div className="text-[9px] font-black uppercase tracking-widest text-stone-500">
                    Patente por Tempo de Jogo
                  </div>
                  <div className="text-sm sm:text-base font-black text-white flex items-center gap-2">
                    {currentTier.name}
                    <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded bg-gradient-to-r ${currentTier.color}`}>
                      Nível {currentTier.minHours}h+
                    </span>
                  </div>
                </div>
              </div>

              {nextTier && (
                <div className="text-right">
                  <span className="text-[9px] font-bold text-stone-400 uppercase block">Próxima Patente</span>
                  <span className="text-xs font-black text-amber-400 flex items-center justify-end gap-1">
                    {nextTier.badge} {nextTier.name} ({nextTier.minHours}h)
                  </span>
                </div>
              )}
            </div>

            <p className="text-xs text-stone-400 mb-3">
              {currentTier.description}
            </p>

            {/* Progress Bar */}
            {nextTier ? (
              <div>
                <div className="flex items-center justify-between text-[10px] font-bold text-stone-400 mb-1">
                  <span>Progresso para {nextTier.name}</span>
                  <span className="font-mono text-amber-400">{progressPercent}%</span>
                </div>
                <div className="w-full h-2.5 bg-stone-800 rounded-full overflow-hidden p-0.5 border border-white/5">
                  <div 
                    className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-amber-400 rounded-full transition-all duration-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>
            ) : (
              <div className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4" /> Patente Máxima Atingida! Você é uma lenda do Blackjack!
              </div>
            )}
          </div>

        </div>

        {/* FOOTER */}
        <div className="p-3 sm:p-4 bg-stone-950 border-t border-stone-800 flex items-center justify-between">
          <div className="flex items-center gap-2 text-[10px] text-stone-400">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Seu tempo é gravado continuamente e sincronizado com o Banco de Dados.</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-gradient-to-r from-stone-800 to-stone-700 hover:from-stone-700 hover:to-stone-600 text-white font-bold text-xs rounded-xl uppercase tracking-wider transition-all cursor-pointer shadow"
          >
            Fechar
          </button>
        </div>

      </div>
    </div>
  );
};
