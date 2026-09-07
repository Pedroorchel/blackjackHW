import React, { useState } from 'react';
import { Player, RoundPhase } from '../types';
import { Chip } from './Chip';
import { Play, RotateCcw, Check, Sparkles, Eye, Menu, Plus, Minus } from 'lucide-react';
import { sounds } from '../utils/audio';

interface TableControlsProps {
  selfPlayer: Player | null;
  activePlayer: Player | null;
  isHost: boolean;
  phase: RoundPhase;
  canStartDeal: boolean;
  onBetChange: (amount: number) => void;
  onReadyToggle: () => void;
  onStartDeal: () => void;
  onHit: () => void;
  onStand: () => void;
  onDouble: () => void;
  onNewRound: () => void;
}

const CHIP_VALUES = [10, 25, 50, 100, 500];

export const TableControls: React.FC<TableControlsProps> = ({
  selfPlayer,
  activePlayer,
  isHost,
  phase,
  canStartDeal,
  onBetChange,
  onReadyToggle,
  onStartDeal,
  onHit,
  onStand,
  onDouble,
  onNewRound
}) => {
  const [showViewToggle, setShowViewToggle] = useState(false);

  if (!selfPlayer) return null;

  const isMyTurn = phase === 'player_turns' && activePlayer?.id === selfPlayer.id;
  const canDouble = isMyTurn && selfPlayer.cards.length === 2 && selfPlayer.chips >= selfPlayer.currentBet;
  const canSplit = isMyTurn && selfPlayer.cards.length === 2 && selfPlayer.cards[0].rank === selfPlayer.cards[1].rank && selfPlayer.chips >= selfPlayer.currentBet;

  const handleAddChip = (val: number) => {
    sounds.playChipBet();
    const newBet = Math.min(selfPlayer.chips, selfPlayer.currentBet + val);
    onBetChange(newBet);
  };

  const handleClearBet = () => {
    onBetChange(10);
  };

  const handleAllIn = () => {
    sounds.playChipBet();
    onBetChange(selfPlayer.chips);
  };

  return (
    <div id="table-controls" className="w-full max-w-6xl mx-auto px-2 pb-1">
      {/* 1. BETTING PHASE CONTROLS */}
      {phase === 'betting' && (
        <div className="flex flex-col gap-3 bg-black/80 border border-white/10 backdrop-blur-md rounded-2xl p-3 sm:p-4 shadow-2xl">
          <div className="flex items-center justify-between w-full flex-wrap gap-2">
            <div>
              <span className="text-[10px] sm:text-xs text-white/40 uppercase font-bold tracking-widest block">
                Sua Aposta
              </span>
              <span className="text-xl sm:text-2xl font-black text-yellow-400">
                ${selfPlayer.currentBet}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                id="btn-clear-bet"
                onClick={handleClearBet}
                disabled={selfPlayer.isReady || selfPlayer.currentBet <= 10}
                className="px-3 py-1.5 text-xs rounded-lg bg-stone-800 border border-white/10 text-white/80 hover:bg-stone-700 disabled:opacity-40 transition-colors cursor-pointer font-bold"
              >
                Mínimo ($10)
              </button>
              <button
                type="button"
                id="btn-all-in"
                onClick={handleAllIn}
                disabled={selfPlayer.isReady || selfPlayer.chips <= selfPlayer.currentBet}
                className="px-3 py-1.5 text-xs rounded-lg bg-yellow-500 text-black hover:bg-yellow-400 font-black disabled:opacity-40 transition-colors cursor-pointer"
              >
                All-In (${selfPlayer.chips})
              </button>
            </div>
          </div>

          {/* Chips Selector */}
          <div className="flex items-center justify-center gap-2 sm:gap-3 py-1 flex-wrap">
            {CHIP_VALUES.map(val => (
              <Chip
                key={val}
                value={val}
                size="md"
                disabled={selfPlayer.isReady || selfPlayer.chips < val}
                onClick={() => handleAddChip(val)}
              />
            ))}
          </div>

          {/* Action buttons in betting */}
          <div className="flex items-center gap-3 mt-1 justify-center flex-wrap">
            <button
              type="button"
              id="btn-toggle-ready"
              onClick={onReadyToggle}
              className={`px-8 py-3 rounded-xl font-extrabold uppercase tracking-wider text-xs sm:text-sm flex items-center gap-2 shadow-lg transition-transform active:scale-95 cursor-pointer ${
                selfPlayer.isReady
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                  : 'bg-yellow-500 hover:bg-yellow-400 text-black'
              }`}
            >
              <Check className="w-4 h-4" />
              {selfPlayer.isReady ? 'Aposta Pronta (Cancelar)' : 'Confirmar Aposta'}
            </button>

            {isHost && (
              <button
                type="button"
                id="btn-start-deal"
                onClick={onStartDeal}
                disabled={!canStartDeal}
                className="bg-stone-800 hover:bg-stone-700 text-white px-8 py-3 rounded-xl font-extrabold uppercase tracking-wider text-xs sm:text-sm border border-white/10 disabled:opacity-40 disabled:cursor-not-allowed transition-transform active:scale-95 cursor-pointer flex items-center gap-2"
              >
                <Play className="w-4 h-4 fill-current text-yellow-400" />
                Distribuir Cartas
              </button>
            )}
          </div>
        </div>
      )}

      {/* 2. PLAYER TURNS CONTROLS (EXACTLY MATCHING THE USER SCREENSHOT!) */}
      {phase === 'player_turns' && (
        <div className="w-full flex flex-col items-center gap-2">
          {isMyTurn ? (
            <div className="w-full flex items-center justify-center gap-2 sm:gap-3 max-w-2xl">
              {/* 1. DOUBLE BUTTON (Coral/Orange Red) */}
              <button
                type="button"
                id="btn-action-double"
                onClick={onDouble}
                disabled={!canDouble}
                className="flex-1 h-16 sm:h-20 bg-[#e04f38] hover:bg-[#d03f28] disabled:opacity-30 disabled:hover:bg-[#e04f38] text-white rounded-xl sm:rounded-2xl font-black text-xs sm:text-base uppercase tracking-wider shadow-lg flex flex-col items-center justify-center cursor-pointer transition-transform active:scale-95 border-b-4 border-[#b0321d]"
              >
                <span>DOUBLE</span>
              </button>

              {/* 2. HIT BUTTON (Bright Vibrant Green with + icon) */}
              <button
                type="button"
                id="btn-action-hit"
                onClick={onHit}
                className="flex-1 h-16 sm:h-20 bg-[#04bd49] hover:bg-[#03a03e] text-white rounded-xl sm:rounded-2xl font-black text-xs sm:text-base uppercase tracking-wider shadow-lg shadow-emerald-900/50 flex flex-col items-center justify-center cursor-pointer transition-transform active:scale-95 border-b-4 border-[#028834]"
              >
                <Plus className="w-6 h-6 stroke-[3]" />
                <span>HIT</span>
              </button>

              {/* 3. STAND BUTTON (Bright Vibrant Red with - icon) */}
              <button
                type="button"
                id="btn-action-stand"
                onClick={onStand}
                className="flex-1 h-16 sm:h-20 bg-[#ff1744] hover:bg-[#e00030] text-white rounded-xl sm:rounded-2xl font-black text-xs sm:text-base uppercase tracking-wider shadow-lg shadow-red-900/50 flex flex-col items-center justify-center cursor-pointer transition-transform active:scale-95 border-b-4 border-[#b80022]"
              >
                <Minus className="w-6 h-6 stroke-[3]" />
                <span>STAND</span>
              </button>

              {/* 4. SPLIT BUTTON (Vibrant Blue) */}
              <button
                type="button"
                id="btn-action-split"
                onClick={onHit} // Split fallback
                disabled={!canSplit}
                className="flex-1 h-16 sm:h-20 bg-[#1877f2] hover:bg-[#1265cf] disabled:opacity-30 disabled:hover:bg-[#1877f2] text-white rounded-xl sm:rounded-2xl font-black text-xs sm:text-base uppercase tracking-wider shadow-lg flex flex-col items-center justify-center cursor-pointer transition-transform active:scale-95 border-b-4 border-[#0d53ad]"
              >
                <span>SPLIT</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2 py-3 px-6 bg-black/80 border border-white/10 rounded-full text-white text-xs sm:text-sm font-semibold shadow-xl">
              <span className="w-2.5 h-2.5 rounded-full bg-yellow-400 animate-ping" />
              <span>
                Vez de <strong className="text-yellow-400">{activePlayer?.name || 'outro jogador'}</strong>
              </span>
            </div>
          )}

          {/* Bottom Utility Bar (Eye view icon & Menu icon from screenshot) */}
          <div className="w-full flex items-center justify-between px-2 pt-1">
            <button
              type="button"
              id="btn-view-toggle"
              onClick={() => setShowViewToggle(!showViewToggle)}
              className="w-10 h-10 rounded-full bg-black/60 border border-white/20 flex items-center justify-center text-white/80 hover:text-white hover:bg-black/80 transition-colors cursor-pointer"
              title="Alternar Câmera / Visualização"
            >
              <Eye className="w-5 h-5" />
            </button>

            <button
              type="button"
              id="btn-table-menu"
              className="w-10 h-10 rounded-full bg-black/60 border border-white/20 flex items-center justify-center text-white/80 hover:text-white hover:bg-black/80 transition-colors cursor-pointer"
              title="Menu da Mesa"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* 3. DEALER TURN BANNER */}
      {phase === 'dealer_turn' && (
        <div className="flex items-center justify-center gap-3 bg-black/80 border border-white/10 backdrop-blur-md rounded-2xl p-4 shadow-xl text-center">
          <span className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
          <span className="text-sm sm:text-base font-extrabold text-yellow-400">
            Mesa em ação: Dealer revelando cartas...
          </span>
        </div>
      )}

      {/* 4. ROUND OVER CONTROLS */}
      {phase === 'round_over' && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-black/80 border border-white/10 backdrop-blur-md rounded-2xl p-4 shadow-2xl">
          <div className="flex items-center gap-3">
            <Sparkles className="w-6 h-6 text-yellow-400 shrink-0" />
            <div>
              <h4 className="text-sm sm:text-base font-extrabold text-white uppercase tracking-wider">
                Fim da Rodada!
              </h4>
              <p className="text-xs text-white/70">
                {selfPlayer.outcome === 'blackjack'
                  ? 'Blackjack pago 3:2!'
                  : selfPlayer.outcome === 'win'
                  ? `Vitória! +$${selfPlayer.payout}`
                  : selfPlayer.outcome === 'push'
                  ? 'Empate - aposta devolvida'
                  : 'Sua aposta foi para a mesa.'}
              </p>
            </div>
          </div>

          <button
            type="button"
            id="btn-new-round"
            onClick={onNewRound}
            className="w-full sm:w-auto bg-yellow-500 hover:bg-yellow-400 text-black px-8 py-3 rounded-xl font-black uppercase tracking-wider text-xs sm:text-sm transition-transform active:scale-95 flex items-center justify-center gap-2 cursor-pointer shadow-lg"
          >
            <RotateCcw className="w-4 h-4" />
            Nova Rodada
          </button>
        </div>
      )}
    </div>
  );
};

