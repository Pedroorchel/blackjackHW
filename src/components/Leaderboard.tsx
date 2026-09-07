import React, { useState } from 'react';
import { Player } from '../types';
import { Trophy, ChevronDown, ChevronUp, Award, Crown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface LeaderboardProps {
  players: Player[];
}

export const Leaderboard: React.FC<LeaderboardProps> = ({ players }) => {
  const [isExpanded, setIsExpanded] = useState(true);

  // Filter out spectators and sort by wins descending, then chips descending as tie-breaker
  const topPlayers = [...players]
    .filter(p => !p.isSpectator)
    .sort((a, b) => {
      const winsA = a.wins || 0;
      const winsB = b.wins || 0;
      if (winsB !== winsA) return winsB - winsA;
      return b.chips - a.chips; // Tie-breaker: bankroll
    })
    .slice(0, 3);

  // If there are no active players with wins or no players at all, don't show empty rank
  const activePlayersCount = players.filter(p => !p.isSpectator).length;

  if (activePlayersCount === 0) return null;

  return (
    <div className="bg-black/60 backdrop-blur-md border border-white/10 rounded-xl shadow-[0_4px_24px_rgba(0,0,0,0.6)] w-52 sm:w-56 overflow-hidden transition-all duration-300">
      {/* Header Panel */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-3 py-2 flex items-center justify-between gap-2 bg-gradient-to-r from-amber-500/10 to-transparent hover:bg-white/5 transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-2">
          <Trophy className="w-4 h-4 text-yellow-400 animate-pulse" />
          <span className="text-[11px] font-black uppercase tracking-wider text-yellow-400">
            PÓDIO DA MESA
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {/* Quick total active count badge */}
          <span className="bg-white/10 px-1.5 py-0.5 rounded text-[8px] font-bold text-white/60">
            {activePlayersCount}P
          </span>
          {isExpanded ? (
            <ChevronUp className="w-3.5 h-3.5 text-stone-400" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5 text-stone-400" />
          )}
        </div>
      </button>

      {/* Leaderboard content with animation */}
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="border-t border-white/5"
          >
            <div className="p-2.5 space-y-1.5">
              {topPlayers.map((player, idx) => {
                const medals = ['🥇', '🥈', '🥉'];
                const podiumBg = [
                  'bg-yellow-500/10 border-yellow-500/20 text-yellow-200',
                  'bg-stone-300/5 border-stone-300/10 text-stone-300',
                  'bg-amber-700/5 border-amber-700/10 text-amber-600'
                ];

                return (
                  <div
                    key={player.id}
                    className={`flex items-center justify-between text-[11px] px-2.5 py-1.5 rounded-lg border ${podiumBg[idx]} transition-all hover:scale-[1.02]`}
                  >
                    <div className="flex items-center gap-2 truncate max-w-[130px]">
                      <span className="text-xs shrink-0 select-none">
                        {medals[idx]}
                      </span>
                      <div className="w-5 h-5 rounded-full overflow-hidden border border-white/20 shrink-0 bg-stone-800 flex items-center justify-center">
                        {player.avatarUrl ? (
                          <img src={player.avatarUrl} alt={player.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          <span className="text-[8px] font-bold text-white">{player.name.substring(0, 1).toUpperCase()}</span>
                        )}
                      </div>
                      <span className="font-extrabold truncate">
                        {player.name}
                      </span>
                      {idx === 0 && (
                        <Crown className="w-3.5 h-3.5 text-yellow-400 shrink-0 fill-yellow-400/20 animate-pulse" title="Líder do Pódio" />
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      <span className="font-mono font-black text-xs">
                        {player.wins || 0}
                      </span>
                      <span className="text-[8px] font-bold text-white/40 uppercase tracking-tighter">
                        W
                      </span>
                    </div>
                  </div>
                );
              })}

              {topPlayers.length === 0 && (
                <div className="text-[10px] text-stone-500 text-center py-2 flex flex-col items-center gap-1">
                  <Award className="w-5 h-5 text-stone-600" />
                  <span>Nenhum pódio ainda</span>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
