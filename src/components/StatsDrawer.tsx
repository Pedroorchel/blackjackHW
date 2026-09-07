import React, { useState, useEffect, useRef } from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { TrendingUp, History, X, BarChart2, Coins, Award, Activity, ArrowUpRight, ArrowDownRight, Clock, RotateCcw, Zap } from 'lucide-react';
import { OutcomeType } from '../types';
import { formatPlaytimeDigital, formatPlaytimeHuman } from '../utils/playtime';

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

interface StatsDrawerProps {
  handHistory: HandHistoryItem[];
  bankrollHistory: BankrollHistoryItem[];
  currentChips?: number;
  currentRound?: number;
  sessionSeconds?: number;
  totalSeconds?: number;
  onOpenPlaytimeScoreboard?: () => void;
  onClearHistory?: () => void;
  isOpen?: boolean;
  onClose?: () => void;
  onToggle?: () => void;
}

export const StatsDrawer: React.FC<StatsDrawerProps> = ({ 
  handHistory, 
  bankrollHistory,
  currentChips: currentChipsProp,
  currentRound = 1,
  sessionSeconds = 0,
  totalSeconds = 0,
  onOpenPlaytimeScoreboard,
  onClearHistory,
  isOpen: isOpenProp,
  onClose: onCloseProp,
  onToggle: onToggleProp
}) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = isOpenProp !== undefined ? isOpenProp : internalOpen;

  const handleToggle = () => {
    if (onToggleProp) {
      onToggleProp();
    } else if (isOpenProp !== undefined && onCloseProp) {
      if (isOpen) onCloseProp();
    } else {
      setInternalOpen(prev => !prev);
    }
  };

  const handleClose = () => {
    if (onCloseProp) {
      onCloseProp();
    } else {
      setInternalOpen(false);
    }
  };

  // Flash indicator when new round is registered
  const [justUpdated, setJustUpdated] = useState(false);
  const prevCountRef = useRef(handHistory.length);

  useEffect(() => {
    if (handHistory.length > prevCountRef.current && prevCountRef.current > 0) {
      setJustUpdated(true);
      const timer = setTimeout(() => setJustUpdated(false), 3500);
      prevCountRef.current = handHistory.length;
      return () => clearTimeout(timer);
    }
    prevCountRef.current = handHistory.length;
  }, [handHistory.length]);

  // Math metrics
  const totalHands = handHistory.length;
  const winsCount = handHistory.filter(h => h.outcome === 'win' || h.outcome === 'blackjack').length;
  const winRate = totalHands > 0 ? Math.round((winsCount / totalHands) * 100) : 0;

  const currentChips = currentChipsProp !== undefined 
    ? currentChipsProp 
    : (bankrollHistory.length > 0 ? bankrollHistory[bankrollHistory.length - 1].chips : 0);

  const initialChips = bankrollHistory.length > 0 ? bankrollHistory[0].chips : currentChips;
  const netProfit = currentChips - initialChips;

  const peakChips = bankrollHistory.length > 0 
    ? Math.max(...bankrollHistory.map(b => b.chips), currentChips) 
    : currentChips;

  // Outcome label and color utility
  const getOutcomeBadge = (outcome: OutcomeType) => {
    switch (outcome) {
      case 'blackjack':
        return (
          <span className="bg-amber-400/20 border border-amber-400/40 text-amber-300 text-[9px] font-black uppercase px-1.5 py-0.5 rounded shadow-[0_0_8px_rgba(251,191,36,0.2)]">
            Blackjack
          </span>
        );
      case 'win':
        return (
          <span className="bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[9px] font-black uppercase px-1.5 py-0.5 rounded">
            Ganhou
          </span>
        );
      case 'push':
        return (
          <span className="bg-stone-500/20 border border-stone-500/40 text-stone-300 text-[9px] font-black uppercase px-1.5 py-0.5 rounded">
            Empate
          </span>
        );
      case 'lose':
        return (
          <span className="bg-red-500/20 border border-red-500/40 text-red-300 text-[9px] font-black uppercase px-1.5 py-0.5 rounded">
            Perdeu
          </span>
        );
      case 'bust':
        return (
          <span className="bg-red-600/30 border border-red-500/40 text-red-400 text-[9px] font-black uppercase px-1.5 py-0.5 rounded">
            Estourou
          </span>
        );
      default:
        return (
          <span className="bg-stone-700/40 text-stone-400 text-[9px] font-bold uppercase px-1.5 py-0.5 rounded">
            Finalizada
          </span>
        );
    }
  };

  // Custom Tooltip for chart
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-stone-900/95 border border-white/10 p-2 rounded-lg shadow-2xl backdrop-blur-md">
          <p className="text-[10px] text-white/50 font-mono">Rodada #{payload[0].payload.roundNumber}</p>
          <p className="text-emerald-400 font-bold text-xs">${payload[0].value.toLocaleString('pt-BR')}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="fixed bottom-16 sm:bottom-4 left-3 sm:left-4 z-40">
      {!isOpen ? (
        <button
          type="button"
          id="btn-open-stats"
          onClick={handleToggle}
          className={`bg-black/80 hover:bg-black/95 border text-emerald-400 p-2.5 sm:p-3 rounded-2xl shadow-2xl backdrop-blur-md flex items-center gap-2 cursor-pointer transition-all hover:scale-105 ${
            justUpdated 
              ? 'border-emerald-400 ring-2 ring-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.5)] animate-pulse' 
              : 'border-white/15'
          }`}
          title="Abrir Painel de Desempenho (Atualizado a cada rodada)"
        >
          <div className="relative flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-emerald-400" />
            {justUpdated && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
            )}
          </div>
          <div className="flex flex-col text-left">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-white/90">Desempenho</span>
              {justUpdated ? (
                <span className="bg-emerald-400 text-stone-950 text-[9px] font-black uppercase px-1.5 py-0.2 rounded-full animate-bounce">
                  +1 Rodada
                </span>
              ) : totalHands > 0 ? (
                <span className="bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[10px] font-black rounded-full px-1.5 py-0.2">
                  {totalHands}
                </span>
              ) : null}
            </div>
            <span className="text-[9px] text-stone-400 font-medium hidden sm:inline">
              Atualiza a cada rodada
            </span>
          </div>
        </button>
      ) : (
        <div
          id="stats-drawer"
          className="w-80 sm:w-96 max-h-[85vh] sm:h-[490px] bg-stone-950/95 border border-white/15 rounded-2xl shadow-2xl backdrop-blur-md flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom duration-200"
        >
          {/* Header */}
          <div className="p-3.5 bg-black/50 border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-emerald-400" />
              <div>
                <span className="text-[10px] text-white/40 uppercase font-black tracking-widest block">
                  Painel de Desempenho
                </span>
                <span className="text-[9px] text-emerald-400 font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Atualizando a cada rodada (Rodada #{currentRound})
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              {onClearHistory && totalHands > 0 && (
                <button
                  type="button"
                  onClick={onClearHistory}
                  className="px-2 py-1 bg-stone-800/80 hover:bg-stone-700 text-stone-400 hover:text-stone-200 text-[10px] font-bold rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                  title="Reiniciar histórico desta sessão"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Limpar</span>
                </button>
              )}
              <button
                type="button"
                onClick={handleClose}
                className="text-white/40 hover:text-white p-1 rounded-lg hover:bg-white/5 cursor-pointer transition-colors"
                title="Fechar Painel"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Tab/Content Container */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
            {totalHands === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-4 py-8">
                <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center mb-3 text-emerald-400">
                  <Activity className="w-6 h-6 animate-pulse" />
                </div>
                <h4 className="text-sm font-bold text-white/90">Histórico Pronto para Rodada</h4>
                <p className="text-xs text-white/40 mt-1 max-w-[260px]">
                  Jogue esta rodada para ver seu lucro, aproveitamento e gráfico de saldo atualizados automaticamente a cada término de mão!
                </p>
                <div className="mt-4 flex items-center gap-1.5 text-[11px] font-mono text-emerald-400/90 bg-emerald-950/40 border border-emerald-500/20 px-3 py-1 rounded-full">
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  <span>Aguardando desfecho da rodada #{currentRound}</span>
                </div>
              </div>
            ) : (
              <>
                {/* 1. Quick Stats Grid */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-white/5 border border-white/5 p-2 rounded-xl flex flex-col justify-between">
                    <span className="text-[9px] text-white/40 uppercase font-bold">Saldo Atual</span>
                    <div className="flex items-center gap-0.5 mt-1">
                      <span className="text-xs font-black truncate text-white">${currentChips.toLocaleString('pt-BR')}</span>
                    </div>
                  </div>

                  <div className="bg-white/5 border border-white/5 p-2 rounded-xl flex flex-col justify-between">
                    <span className="text-[9px] text-white/40 uppercase font-bold">Lucro / Perda</span>
                    <div className="flex items-center gap-0.5 mt-1 font-mono font-black text-xs">
                      {netProfit >= 0 ? (
                        <span className="text-emerald-400 flex items-center">
                          <ArrowUpRight className="w-3 h-3 shrink-0" />
                          +${netProfit}
                        </span>
                      ) : (
                        <span className="text-red-400 flex items-center">
                          <ArrowDownRight className="w-3 h-3 shrink-0" />
                          -${Math.abs(netProfit)}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="bg-white/5 border border-white/5 p-2 rounded-xl flex flex-col justify-between">
                    <span className="text-[9px] text-white/40 uppercase font-bold">Aproveitamento</span>
                    <div className="flex items-center gap-0.5 mt-1">
                      <span className="text-xs font-black text-yellow-400">{winRate}%</span>
                      <span className="text-[9px] text-white/30 font-medium ml-1">({winsCount}/{totalHands})</span>
                    </div>
                  </div>
                </div>

                {/* Tempo de Jogo & Placar */}
                <div className="bg-stone-900/90 border border-amber-500/20 p-2.5 rounded-xl flex items-center justify-between shadow">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                      <Clock className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-[9px] text-amber-400 uppercase font-black tracking-wider flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                        Horas Totais no Game
                      </div>
                      <div className="text-xs font-black text-amber-300 font-mono">
                        {totalSeconds > 0 ? formatPlaytimeHuman(totalSeconds) : '0s'}
                        <span className="text-[10px] text-emerald-400 font-sans ml-2 font-bold">
                          (Mesa: {formatPlaytimeDigital(sessionSeconds)})
                        </span>
                      </div>
                    </div>
                  </div>
                  {onOpenPlaytimeScoreboard && (
                    <button
                      type="button"
                      onClick={onOpenPlaytimeScoreboard}
                      className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-[10px] font-black uppercase tracking-wider rounded-lg cursor-pointer transition-colors"
                    >
                      Ver Placar
                    </button>
                  )}
                </div>

                {/* 2. Mini Chart */}
                <div className="bg-white/5 border border-white/5 p-3 rounded-xl flex flex-col">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[9px] text-white/40 uppercase font-bold flex items-center gap-1">
                      <span>Evolução do Saldo</span>
                      <span className="text-[8px] text-emerald-400 font-mono">({bankrollHistory.length} registros)</span>
                    </span>
                    <span className="text-[9px] text-white/30 font-mono">Pico: ${peakChips.toLocaleString('pt-BR')}</span>
                  </div>
                  <div className="h-32 w-full text-[10px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={bankrollHistory} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#2c2c2c" />
                        <XAxis dataKey="roundNumber" stroke="#52525b" />
                        <YAxis stroke="#52525b" domain={['auto', 'auto']} />
                        <Tooltip content={<CustomTooltip />} />
                        <Line 
                          type="monotone" 
                          dataKey="chips" 
                          stroke="#10b981" 
                          strokeWidth={2}
                          dot={{ r: 3, fill: '#10b981', strokeWidth: 0 }}
                          activeDot={{ r: 5, fill: '#34d399' }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* 3. Detailed Recent Hand logs */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1.5">
                      <History className="w-3.5 h-3.5 text-white/40" />
                      <span className="text-[9px] text-white/40 uppercase font-bold tracking-wider">
                        Histórico por Rodada ({handHistory.length})
                      </span>
                    </div>
                    <span className="text-[8px] text-emerald-400 font-mono font-bold">
                      ● Atualizado a cada rodada
                    </span>
                  </div>

                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1 no-scrollbar">
                    {handHistory.slice().reverse().map((hand, idx) => {
                      const handProfit = hand.profit !== undefined 
                        ? hand.profit 
                        : (hand.payout > 0 ? (hand.payout - (hand.bet || hand.payout / 2)) : -(hand.bet || 0));

                      const timeFormatted = new Date(hand.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

                      return (
                        <div 
                          key={hand.roundKey || idx} 
                          className="p-2.5 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors flex items-center justify-between text-xs"
                        >
                          <div className="flex flex-col gap-0.5">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[9px] text-amber-400 font-mono font-black">
                                Rodada #{hand.roundNumber}
                              </span>
                              <span className="text-[8px] text-stone-500 font-mono">
                                {timeFormatted}
                              </span>
                            </div>
                            <span className="text-white font-bold text-xs">
                              Você: <span className={hand.playerScore > 21 ? 'text-red-400' : 'text-emerald-400 font-extrabold'}>{hand.playerScore}</span>
                              {' vs '}
                              Dealer: <span className={hand.dealerScore > 21 ? 'text-red-400' : 'text-stone-300'}>{hand.dealerScore}</span>
                            </span>
                            {hand.bet !== undefined && hand.bet > 0 && (
                              <span className="text-[9px] text-stone-400 font-mono">
                                Aposta: ${hand.bet.toLocaleString('pt-BR')}
                              </span>
                            )}
                          </div>
                          
                          <div className="flex flex-col items-end gap-1">
                            {getOutcomeBadge(hand.outcome)}
                            <span className={`text-[11px] font-mono font-black ${
                              handProfit > 0 
                                ? 'text-emerald-400' 
                                : handProfit < 0 
                                ? 'text-red-400' 
                                : 'text-stone-400'
                            }`}>
                              {handProfit > 0 ? `+$${handProfit.toLocaleString('pt-BR')}` : handProfit < 0 ? `-$${Math.abs(handProfit).toLocaleString('pt-BR')}` : '$0'}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

