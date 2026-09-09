import React, { useState, useEffect } from 'react';
import { Player, RoundPhase } from '../types';
import { calculateHandScore } from '../utils/blackjack';
import { CardView } from './CardView';
import { Crown, Edit2, Check, DollarSign, User } from 'lucide-react';
import { motion } from 'motion/react';

interface PlayerSeatProps {
  player: Player;
  isSelf: boolean;
  selfPlayer: Player | null;
  isActiveTurn: boolean;
  phase: RoundPhase;
  onUpdateName?: (newName: string) => void;
  onRequestLoan?: (targetPlayerId: string, amount: number) => void;
  onRepayLoan?: (targetPlayerId: string, amount: number) => void;
  onViewProfile?: () => void;
  rank?: number;
  turnStartTime?: number;
  turnTimeout?: number;
}

export const PlayerSeat: React.FC<PlayerSeatProps> = ({
  player,
  isSelf,
  selfPlayer,
  isActiveTurn,
  phase,
  onUpdateName,
  onRequestLoan,
  onRepayLoan,
  onViewProfile,
  rank,
  turnStartTime,
  turnTimeout = 15
}) => {
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(player.name);

  const [timeLeft, setTimeLeft] = useState(turnTimeout);

  useEffect(() => {
    if (!isActiveTurn) {
      setTimeLeft(turnTimeout);
      return;
    }

    const calculateRemaining = () => {
      if (turnStartTime) {
        const elapsed = Math.floor((Date.now() - turnStartTime) / 1000);
        return Math.max(0, turnTimeout - elapsed);
      }
      return turnTimeout;
    };

    setTimeLeft(calculateRemaining());

    const interval = setInterval(() => {
      setTimeLeft(prev => {
        const remaining = turnStartTime ? calculateRemaining() : prev - 1;
        if (remaining <= 0) {
          clearInterval(interval);
          return 0;
        }
        return remaining;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isActiveTurn, turnStartTime, turnTimeout]);

  const handScore = calculateHandScore(player.cards);
  
  // Calculate debt logic
  const myDebtToThisPlayer = selfPlayer?.debts?.[player.id] || 0;
  const canRequestLoan = !isSelf && selfPlayer && selfPlayer.chips === 0;
  const canRepayLoan = !isSelf && selfPlayer && selfPlayer.chips > 0 && myDebtToThisPlayer > 0;

  // Rank styling definitions
  let rankBorderClass = 'border-white/10';
  let badgeStyle = 'bg-gradient-to-r from-amber-500/25 via-yellow-500/15 to-amber-500/25 border border-yellow-500/30 text-yellow-300 shadow-[0_0_8px_rgba(234,179,8,0.25)]';
  let badgeEmoji = '🏆';

  if (player.wins > 0) {
    if (rank === 0) {
      rankBorderClass = 'border-yellow-400/50 shadow-[0_0_12px_rgba(250,204,21,0.25)]';
      badgeStyle = 'bg-gradient-to-r from-amber-500/35 via-yellow-400/25 to-amber-500/35 border-yellow-400/50 text-yellow-300 shadow-[0_0_12px_rgba(234,179,8,0.4)]';
      badgeEmoji = '👑';
    } else if (rank === 1) {
      rankBorderClass = 'border-stone-300/40 shadow-[0_0_10px_rgba(212,212,216,0.18)]';
      badgeStyle = 'bg-gradient-to-r from-stone-400/30 via-stone-200/20 to-stone-400/30 border-stone-300/40 text-stone-200 shadow-[0_0_10px_rgba(212,212,216,0.3)]';
      badgeEmoji = '🥈';
    } else if (rank === 2) {
      rankBorderClass = 'border-amber-700/40 shadow-[0_0_8px_rgba(180,83,9,0.15)]';
      badgeStyle = 'bg-gradient-to-r from-amber-700/35 via-amber-600/20 to-amber-700/35 border-amber-600/40 text-amber-400 shadow-[0_0_8px_rgba(180,83,9,0.25)]';
      badgeEmoji = '🥉';
    }
  }

  const handleNameSave = () => {
    if (editedName.trim() && onUpdateName) {
      onUpdateName(editedName.trim());
      setIsEditingName(false);
    }
  };

  return (
    <div
      id={`player-seat-${player.id}`}
      className={`relative flex flex-col items-center justify-end p-1 rounded-xl transition-all duration-300 w-full max-w-[130px] sm:max-w-[145px] lg:max-w-[160px] xl:max-w-[175px] ${
        isActiveTurn
          ? 'scale-105 z-20'
          : ''
      }`}
    >
      {/* Active Turn Glowing Yellow Arc Line underneath (from screenshot) */}
      {isActiveTurn && (
        <div className="absolute -bottom-2 inset-x-0 h-1.5 bg-yellow-400 rounded-full shadow-[0_0_15px_#facc15] animate-pulse" />
      )}

      {/* Hand Outcome Badge */}
      {phase === 'round_over' && player.currentBet > 0 && player.outcome && (
        <div className="absolute -top-7 z-30">
          {player.outcome === 'blackjack' && (
            <div className="bg-amber-500 text-black font-black text-[10px] px-2.5 py-0.5 rounded-full shadow-lg border border-amber-300 animate-bounce">
              BLACKJACK!
            </div>
          )}
          {player.outcome === 'win' && (
            <div className="bg-emerald-500 text-black font-black text-[10px] px-2.5 py-0.5 rounded-full shadow-lg border border-emerald-300">
              VENCEU! +${player.payout}
            </div>
          )}
          {player.outcome === 'push' && (
            <div className="bg-blue-600 text-white font-bold text-[10px] px-2.5 py-0.5 rounded-full shadow">
              EMPATE
            </div>
          )}
          {player.outcome === 'bust' && (
            <div className="bg-red-600 text-white font-bold text-[10px] px-2.5 py-0.5 rounded-full shadow">
              ESTOUROU!
            </div>
          )}
        </div>
      )}

      {/* 1. Circular Hand Score Badge (Green/Yellow Circle directly above cards from screenshot) */}
      {player.cards.length > 0 && (
        <div className="z-30 mb-1">
          <div className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center font-black text-xs sm:text-sm shadow-xl border-2 ${
            handScore.isBust
              ? 'bg-red-600 text-white border-red-400'
              : isSelf || isActiveTurn
              ? 'bg-yellow-400 text-black border-yellow-200 shadow-[0_0_12px_rgba(250,204,21,0.6)]'
              : 'bg-[#00c853] text-white border-emerald-300 shadow-[0_0_10px_rgba(0,200,83,0.4)]'
          }`}>
            {handScore.isBust ? '21+' : handScore.total}
          </div>
        </div>
      )}

      {/* 2. Cards Stack Area */}
      <div className="relative flex items-center justify-center min-h-[70px] sm:min-h-[85px] w-full mb-0.5">
        {player.cards.length === 0 ? (
          <div className="opacity-0 w-14 h-20" />
        ) : (
          <div className="flex items-center -space-x-6 sm:-space-x-8 overflow-visible py-1">
            {player.cards.map((card, idx) => (
              <motion.div
                key={card.id || idx}
                initial={{ y: -240, opacity: 0, rotate: -25, scale: 0.4 }}
                animate={{ y: 0, opacity: 1, rotate: 0, scale: 1 }}
                transition={{ type: "spring", stiffness: 100, damping: 13, delay: idx * 0.12 }}
                style={{ zIndex: idx + 1 }}
                className={`transition-all transform ${
                  idx > 0 ? 'rotate-2 translate-x-1' : '-rotate-2'
                }`}
              >
                <CardView card={card} index={idx} />
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* 3. Printed Casino Felt Spot Circle with Side Bets & Chips (from screenshot) */}
      <div className="relative w-full flex flex-col items-center my-0.5">
        <div className={`relative w-15 h-15 sm:w-16 sm:h-16 rounded-full border border-dashed flex items-center justify-center ${
          isActiveTurn
            ? 'border-yellow-400 bg-yellow-400/10 shadow-[0_0_15px_rgba(250,204,21,0.3)]'
            : 'border-white/20 bg-black/20'
        }`}>
          {/* Side Bet Printed Labels around spot */}
          <span className="absolute -top-2.5 text-[7px] font-extrabold uppercase text-white/30 tracking-tighter">
            PERFECT PAIRS
          </span>
          <span className="absolute -left-3 top-1/2 -translate-y-1/2 -rotate-90 text-[6px] font-bold text-emerald-400/40">
            21+3
          </span>
          <span className="absolute -right-5 top-1/2 -translate-y-1/2 rotate-90 text-[6px] font-bold text-white/20 whitespace-nowrap">
            BET BEHIND
          </span>

          {/* Chip Badge in Center of Betting Circle */}
          {player.currentBet > 0 ? (
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#00c853] border-2 border-dashed border-white text-white font-black text-[10px] sm:text-xs flex items-center justify-center shadow-md transform hover:scale-105 transition-transform">
              ${player.currentBet}
            </div>
          ) : (
            <span className="text-[10px] text-white/30 font-medium">Spot</span>
          )}
        </div>
      </div>

      {/* 4. Player Name & Bankroll Bar */}
      <div className={`w-full bg-black/60 backdrop-blur-md border rounded-lg px-1.5 py-0.5 pb-1 flex flex-col items-center mt-0.5 group relative ${rankBorderClass}`}>
        {isActiveTurn && (
          <span className="absolute -top-3 px-1.5 py-0.5 bg-red-600 border border-red-500 text-white rounded text-[8px] font-mono font-black animate-pulse shadow-md z-40">
            ⏱️ {timeLeft}s
          </span>
        )}
        {/* Actions for Loans */}
        {!isSelf && (canRequestLoan || canRepayLoan) && (
          <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-max flex gap-1 z-40 bg-stone-900/95 backdrop-blur p-1 rounded-lg border border-amber-500/30 shadow-xl scale-90 sm:scale-100 animate-in fade-in">
            {canRequestLoan && onRequestLoan && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onRequestLoan(player.id, 100);
                }}
                className="px-2 py-0.8 bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 text-white text-[10px] font-black rounded cursor-pointer transition-colors shadow"
                title={`Pedir $100 emprestado para ${player.name}`}
              >
                Pedir $100
              </button>
            )}
            {canRepayLoan && onRepayLoan && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onRepayLoan(player.id, 100);
                }}
                className="px-2 py-0.8 bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-black rounded cursor-pointer transition-colors shadow"
                title={`Pagar $100 para ${player.name}`}
              >
                Pagar $100 (${myDebtToThisPlayer})
              </button>
            )}
          </div>
        )}

        {/* Row 1: Prominent Avatar with Seat Badge and Glow */}
        <div className="relative my-1 flex justify-center">
          <div 
            className={`w-12 h-12 sm:w-13 sm:h-13 rounded-full overflow-hidden shadow-lg cursor-pointer transition-all duration-300 flex items-center justify-center relative ${
              isActiveTurn 
                ? 'border-2 border-amber-400 ring-2 ring-amber-400/70 shadow-[0_0_18px_rgba(251,191,36,0.6)] scale-105' 
                : isSelf 
                ? 'border-2 border-emerald-400/80 shadow-[0_0_12px_rgba(16,185,129,0.35)] hover:scale-105' 
                : 'border-2 border-stone-700 hover:border-emerald-400 hover:scale-105'
            }`}
            onClick={onViewProfile}
            title="Clique para ver ou editar o perfil"
          >
            {player.avatarUrl ? (
              <img 
                src={player.avatarUrl} 
                alt={player.name}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-emerald-600 to-teal-800 text-[11px] sm:text-xs font-black text-white flex items-center justify-center">
                {player.name.substring(0, 2).toUpperCase()}
              </div>
            )}
          </div>

          {/* Prominent Assigned Seat Badge */}
          <div 
            className="absolute -bottom-1 -right-1 bg-stone-950/95 border border-stone-700 text-stone-200 text-[8px] font-black px-1.5 py-0.2 rounded-full shadow-[0_2px_6px_rgba(0,0,0,0.8)]"
            title={`Assento #${(player.seatIndex ?? 0) + 1}`}
          >
            #{(player.seatIndex ?? 0) + 1}
          </div>

          {/* Bot Indicator Badge */}
          {(player.isBot || player.id.startsWith('bot-')) && (
            <div 
              className="absolute -top-1 -right-1 bg-cyan-600 border border-cyan-400 text-white text-[8px] font-black px-1 rounded-full shadow"
              title="Jogador Bot IA"
            >
              🤖
            </div>
          )}

          {/* Floating Crown Badge */}
          {player.isHost && (
            <div 
              className="absolute -top-1 -left-1 bg-amber-400 text-stone-950 p-0.5 rounded-full shadow-[0_2px_6px_rgba(0,0,0,0.6)]" 
              title="Criador da Sala"
            >
              <Crown className="w-2.5 h-2.5 fill-current" />
            </div>
          )}

          {rank === 0 && player.wins > 0 && !player.isHost && (
            <div 
              className="absolute -top-1 -left-1 bg-yellow-400 text-stone-950 p-0.5 rounded-full shadow animate-pulse" 
              title="1º no Ranking"
            >
              <Crown className="w-2.5 h-2.5 fill-current" />
            </div>
          )}
        </div>

        {/* Row 2: Name and Quick Actions */}
        <div className="flex items-center justify-center gap-1 max-w-full mb-0.5">
          {isEditingName ? (
            <div className="flex items-center gap-1">
              <input
                type="text"
                value={editedName}
                onChange={e => setEditedName(e.target.value)}
                maxLength={14}
                autoFocus
                onKeyDown={e => e.key === 'Enter' && handleNameSave()}
                className="w-16 bg-stone-900 border border-yellow-500 rounded px-1 py-0.5 text-[10px] text-white focus:outline-none"
              />
              <button
                type="button"
                onClick={handleNameSave}
                className="p-0.5 bg-emerald-600 text-white rounded cursor-pointer"
              >
                <Check className="w-2.5 h-2.5" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1 overflow-hidden">
              <span className="font-bold text-[11px] text-white truncate max-w-[80px]">
                {player.name}
              </span>
              {(player.isBot || player.id.startsWith('bot-')) ? (
                <span className="text-[7px] bg-cyan-500/25 border border-cyan-400/50 text-cyan-300 font-black px-1 py-0.2 rounded shrink-0">
                  BOT
                </span>
              ) : isSelf ? (
                <span className="text-[8px] text-yellow-400 font-bold shrink-0">
                  (Você)
                </span>
              ) : null}
              {isSelf && !isEditingName && (
                <button
                  type="button"
                  onClick={() => setIsEditingName(true)}
                  className="text-white/40 hover:text-white p-0.5 cursor-pointer shrink-0"
                  title="Alterar Nome"
                >
                  <Edit2 className="w-2.5 h-2.5" />
                </button>
              )}
              {!isSelf && onViewProfile && (
                <button
                  type="button"
                  onClick={onViewProfile}
                  className="text-white/40 hover:text-white p-0.5 cursor-pointer shrink-0"
                  title="Ver Perfil"
                >
                  <User className="w-2.5 h-2.5" />
                </button>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-0.5 text-yellow-400 font-mono text-[10px] font-bold">
          <DollarSign className="w-2.5 h-2.5 text-emerald-400" />
          <span>{player.chips.toLocaleString('pt-BR')}</span>
        </div>

        {player.wins > 0 && (
          <div className={`mt-1 flex items-center justify-center gap-1 rounded px-2 py-0.5 text-[10px] font-black select-none ${badgeStyle}`}>
            <span className="text-[11px]">{badgeEmoji}</span>
            <span>{player.wins} {player.wins === 1 ? 'VITÓRIA' : 'VITÓRIAS'}</span>
          </div>
        )}

        {/* Bet Confirmation Status Indicator (Abaixo de vitórias / assento) */}
        {!player.isSpectator && (
          <div className="w-full mt-1">
            {phase === 'betting' ? (
              player.isReady ? (
                <div 
                  id={`seat-ready-${player.id}`}
                  className="w-full flex items-center justify-center gap-1 py-0.5 px-1.5 rounded bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 text-[8.5px] sm:text-[9px] font-black uppercase tracking-wider shadow-[0_0_8px_rgba(16,185,129,0.25)] select-none animate-in fade-in"
                  title="Aposta confirmada pelo jogador"
                >
                  <Check className="w-2.5 h-2.5 stroke-[3] text-emerald-400" />
                  <span>Aposta Confirmada</span>
                </div>
              ) : (
                <div 
                  id={`seat-waiting-${player.id}`}
                  className="w-full flex items-center justify-center gap-1 py-0.5 px-1.5 rounded bg-amber-500/15 border border-amber-500/35 text-amber-300 text-[8.5px] sm:text-[9px] font-bold uppercase tracking-wider select-none animate-pulse"
                  title="Aguardando confirmação de aposta"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                  <span>Aguardando Aposta</span>
                </div>
              )
            ) : player.currentBet > 0 ? (
              <div 
                id={`seat-bet-${player.id}`}
                className="w-full flex items-center justify-center gap-1 py-0.5 px-1 rounded bg-stone-900/90 border border-stone-700/60 text-[8.5px] font-mono select-none"
              >
                <span className="text-stone-400 text-[8px] font-bold uppercase">Aposta:</span>
                <span className="text-yellow-400 font-black">${player.currentBet}</span>
              </div>
            ) : null}
          </div>
        )}

        {/* Dynamic Countdown Timer Bar */}
        {isActiveTurn && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-stone-800 rounded-b-lg overflow-hidden">
            <motion.div
              initial={{ width: '100%' }}
              animate={{ width: `${(timeLeft / 15) * 100}%` }}
              transition={{ duration: 0.1, ease: 'linear' }}
              className={`h-full ${
                timeLeft > 8 
                  ? 'bg-[#00c853]' 
                  : timeLeft > 4 
                  ? 'bg-yellow-400' 
                  : 'bg-red-500 animate-pulse'
              }`}
            />
          </div>
        )}
      </div>
    </div>
  );
};

