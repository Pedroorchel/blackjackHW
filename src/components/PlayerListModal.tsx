import React from 'react';
import { Player } from '../types';
import { X, Users, Crown, DollarSign, Trophy, Eye, UserCheck, Play, Sparkles } from 'lucide-react';

interface PlayerListModalProps {
  isOpen: boolean;
  onClose: () => void;
  players: Player[];
  selfPlayerId: string;
  activePlayerId: string | null;
  onSelectPlayer: (player: Player) => void;
  onRequestLoan?: (targetPlayerId: string, amount: number) => void;
  onRepayLoan?: (targetPlayerId: string, amount: number) => void;
}

export const PlayerListModal: React.FC<PlayerListModalProps> = ({
  isOpen,
  onClose,
  players,
  selfPlayerId,
  activePlayerId,
  onSelectPlayer,
  onRequestLoan,
  onRepayLoan
}) => {
  if (!isOpen) return null;

  const activePlayers = players
    .filter(p => !p.isSpectator)
    .sort((a, b) => (a.seatIndex ?? 0) - (b.seatIndex ?? 0));
  const spectators = players.filter(p => p.isSpectator);

  const selfPlayer = players.find(p => p.id === selfPlayerId) || null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-stone-900 border border-stone-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-4 bg-stone-950/70 border-b border-stone-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                Jogadores na Mesa
                <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] px-2 py-0.5 rounded-full font-bold">
                  {players.length} Total
                </span>
              </h3>
              <p className="text-[10px] text-stone-400">
                {activePlayers.length} jogando nos assentos • {spectators.length} assistindo
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-stone-400 hover:text-white p-1 rounded-lg cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Players List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 no-scrollbar">
          {/* Active Table Players (by seat) */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[9px] uppercase font-black tracking-widest text-stone-500">
                Assentos da Mesa ({activePlayers.length}/9)
              </span>
            </div>

            <div className="space-y-2">
              {activePlayers.map((player) => {
                const isSelf = player.id === selfPlayerId;
                const isActiveTurn = player.id === activePlayerId;
                const seatNum = (player.seatIndex ?? 0) + 1;
                const myDebtToThis = selfPlayer?.debts?.[player.id] || 0;

                return (
                  <div
                    key={player.id}
                    className={`p-3 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                      isActiveTurn
                        ? 'bg-amber-500/10 border-amber-400/50 shadow-[0_0_15px_rgba(245,158,11,0.2)]'
                        : isSelf
                        ? 'bg-emerald-500/10 border-emerald-500/30'
                        : 'bg-stone-800/40 border-white/5 hover:bg-stone-800/70'
                    }`}
                  >
                    {/* Left: Prominent Avatar & Seat Tag */}
                    <div className="flex items-center gap-3">
                      {/* Prominent Avatar Container */}
                      <div className="relative shrink-0">
                        <div
                          onClick={() => onSelectPlayer(player)}
                          className={`w-12 h-12 rounded-full overflow-hidden border-2 cursor-pointer shadow-md transition-transform hover:scale-105 flex items-center justify-center bg-stone-800 ${
                            isActiveTurn
                              ? 'border-amber-400 ring-2 ring-amber-400/50 shadow-[0_0_12px_rgba(251,191,36,0.4)]'
                              : isSelf
                              ? 'border-emerald-400'
                              : 'border-stone-700 hover:border-emerald-400'
                          }`}
                        >
                          {player.avatarUrl ? (
                            <img
                              src={player.avatarUrl}
                              alt={player.name}
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-sm font-black text-white">
                              {player.name.substring(0, 2).toUpperCase()}
                            </span>
                          )}
                        </div>

                        {/* Seat Badge Pill */}
                        <div className="absolute -bottom-1 -right-1 bg-stone-950 border border-stone-700 text-stone-300 text-[8px] font-black px-1.5 py-0.2 rounded-full shadow">
                          #{seatNum}
                        </div>

                        {/* Host Crown */}
                        {player.isHost && (
                          <div className="absolute -top-1.5 -left-1.5 bg-amber-400 text-stone-950 p-0.5 rounded-full shadow" title="Criador da Sala">
                            <Crown className="w-2.5 h-2.5 fill-current" />
                          </div>
                        )}
                      </div>

                      {/* Name & Subtitles */}
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-black text-white truncate max-w-[120px] sm:max-w-[160px]">
                            {player.name}
                          </span>
                          {isSelf && (
                            <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[8px] font-black uppercase px-1.5 py-0.2 rounded">
                              Você
                            </span>
                          )}
                          {isActiveTurn && (
                            <span className="bg-amber-400/20 text-amber-300 border border-amber-400/40 text-[8px] font-black uppercase px-1.5 py-0.2 rounded animate-pulse">
                              Jogando Agora
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 mt-0.5 text-[10px] text-stone-400">
                          <span className="text-stone-500 font-bold">Assento {seatNum}</span>
                          <span>•</span>
                          <span className="flex items-center gap-0.5 text-yellow-400 font-mono font-bold">
                            <DollarSign className="w-2.5 h-2.5 text-emerald-400 inline" />
                            ${player.chips.toLocaleString('pt-BR')}
                          </span>
                          {player.wins > 0 && (
                            <>
                              <span>•</span>
                              <span className="flex items-center gap-0.5 text-amber-400 font-bold">
                                <Trophy className="w-2.5 h-2.5 inline" />
                                {player.wins} {player.wins === 1 ? 'vitória' : 'vitórias'}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-2">
                      {/* Loan buttons if eligible */}
                      {!isSelf && selfPlayer && selfPlayer.chips === 0 && onRequestLoan && (
                        <button
                          type="button"
                          onClick={() => onRequestLoan(player.id, 100)}
                          className="px-2 py-1 bg-amber-600/80 hover:bg-amber-500 text-white text-[9px] font-bold rounded-lg cursor-pointer transition-colors"
                        >
                          Pedir $100
                        </button>
                      )}

                      {!isSelf && selfPlayer && selfPlayer.chips > 0 && myDebtToThis > 0 && onRepayLoan && (
                        <button
                          type="button"
                          onClick={() => onRepayLoan(player.id, 100)}
                          className="px-2 py-1 bg-emerald-600/80 hover:bg-emerald-500 text-white text-[9px] font-bold rounded-lg cursor-pointer transition-colors"
                        >
                          Pagar $100
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => onSelectPlayer(player)}
                        className="px-2.5 py-1 bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-bold rounded-lg cursor-pointer transition-colors"
                      >
                        {isSelf ? 'Meu Perfil' : 'Perfil'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Spectators if any */}
          {spectators.length > 0 && (
            <div className="mt-4 pt-3 border-t border-white/5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[9px] uppercase font-black tracking-widest text-stone-500 flex items-center gap-1">
                  <Eye className="w-3 h-3" /> Espectadores na Sala ({spectators.length})
                </span>
              </div>

              <div className="space-y-1.5">
                {spectators.map((spec) => (
                  <div
                    key={spec.id}
                    className="p-2 rounded-lg bg-stone-800/20 border border-white/5 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-stone-800 overflow-hidden border border-stone-700 flex items-center justify-center">
                        {spec.avatarUrl ? (
                          <img src={spec.avatarUrl} alt={spec.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          <span className="text-[10px] font-bold text-white">{spec.name.substring(0, 2).toUpperCase()}</span>
                        )}
                      </div>
                      <span className="text-xs font-bold text-stone-300">{spec.name}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => onSelectPlayer(spec)}
                      className="text-[10px] text-stone-400 hover:text-white px-2 py-1 rounded bg-stone-800/60 hover:bg-stone-800 cursor-pointer"
                    >
                      Ver Perfil
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-stone-950/70 border-t border-stone-800 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-bold rounded-xl cursor-pointer transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
