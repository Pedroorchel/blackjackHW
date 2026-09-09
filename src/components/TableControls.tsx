import React, { useState } from 'react';
import { Player, RoundPhase } from '../types';
import { Chip } from './Chip';
import { Play, RotateCcw, Check, Sparkles, Eye, Menu, Plus, Minus, Crown } from 'lucide-react';
import { sounds } from '../utils/audio';

interface TableControlsProps {
  selfPlayer: Player | null;
  activePlayer: Player | null;
  isHost: boolean;
  phase: RoundPhase;
  canStartDeal: boolean;
  botsCount?: number;
  maxBots?: number;
  onBetChange: (amount: number) => void;
  onReadyToggle: () => void;
  onStartDeal: () => void;
  onHit: () => void;
  onStand: () => void;
  onDouble: () => void;
  onNewRound: () => void;
  onAddBot?: () => void;
  onRemoveBot?: () => void;
  onToggleBots?: () => void;
  onStandUp?: () => void;
  onOpenLoanModal?: () => void;
}

const CHIP_VALUES = [10, 25, 50, 100, 500];

export const TableControls: React.FC<TableControlsProps> = ({
  selfPlayer,
  activePlayer,
  isHost,
  phase,
  canStartDeal,
  botsCount = 0,
  maxBots = 5,
  onBetChange,
  onReadyToggle,
  onStartDeal,
  onHit,
  onStand,
  onDouble,
  onNewRound,
  onAddBot,
  onRemoveBot,
  onToggleBots,
  onStandUp,
  onOpenLoanModal
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
    sounds.playChipBet();
    onBetChange(0);
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
              <div className="flex items-baseline gap-2">
                <span className={`text-xl sm:text-2xl font-black ${selfPlayer.currentBet > 0 ? 'text-yellow-400' : 'text-stone-400'}`}>
                  ${selfPlayer.currentBet.toLocaleString()}
                </span>
                {selfPlayer.currentBet === 0 && (
                  <span className="text-[11px] text-amber-400/80 font-semibold animate-pulse">
                    ← Clique nas fichas abaixo
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap justify-end">
              {onStandUp && (
                <button
                  type="button"
                  id="btn-stand-up"
                  onClick={onStandUp}
                  className="px-2.5 py-1.5 text-xs rounded-lg bg-stone-900 border border-white/10 text-stone-300 hover:text-white hover:bg-stone-800 transition-colors cursor-pointer font-bold flex items-center gap-1"
                  title="Levantar do assento e voltar para o modo espectador"
                >
                  <span>👁️ Levantar</span>
                </button>
              )}
              {onOpenLoanModal && (
                <button
                  type="button"
                  id="btn-loan-controls"
                  onClick={onOpenLoanModal}
                  className="px-3 py-1.5 text-xs rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-300 hover:bg-amber-500/30 transition-colors cursor-pointer font-bold flex items-center gap-1 shadow-sm"
                  title="Pedir dinheiro emprestado ou adiantamento do Cassino"
                >
                  <span>💰 Pedir Dinheiro</span>
                </button>
              )}
              <button
                type="button"
                id="btn-clear-bet"
                onClick={handleClearBet}
                disabled={selfPlayer.isReady || selfPlayer.currentBet === 0}
                className="px-3 py-1.5 text-xs rounded-lg bg-stone-800 border border-white/10 text-white/80 hover:bg-stone-700 disabled:opacity-40 transition-colors cursor-pointer font-bold"
              >
                Limpar ($0)
              </button>
              <button
                type="button"
                id="btn-all-in"
                onClick={handleAllIn}
                disabled={selfPlayer.isReady || selfPlayer.chips <= 0 || selfPlayer.currentBet === selfPlayer.chips}
                className="px-3.5 py-1.5 text-xs rounded-lg bg-yellow-500 text-black hover:bg-yellow-400 font-black disabled:opacity-40 transition-all cursor-pointer shadow-[0_0_10px_rgba(234,179,8,0.2)] active:scale-95"
              >
                🔥 All-In (${selfPlayer.chips.toLocaleString()})
              </button>
            </div>
          </div>

          {/* Low or Zero chips banner */}
          {selfPlayer.chips < 10 && onOpenLoanModal && (
            <div className="flex items-center justify-between p-3 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-300 flex-wrap gap-2.5 animate-pulse">
              <div className="flex items-center gap-2.5">
                <span className="text-2xl">💸</span>
                <div>
                  <p className="text-xs font-black uppercase tracking-wider text-white">
                    {selfPlayer.chips === 0 ? 'Você está sem fichas na mesa!' : 'Fichas insuficientes para aposta mínima ($10)!'}
                  </p>
                  <p className="text-[11px] text-amber-300/90 font-medium">
                    Peça dinheiro a um bot/jogador da mesa ou receba o adiantamento do Cassino VIP.
                  </p>
                </div>
              </div>
              <button
                type="button"
                id="btn-request-loan-banner"
                onClick={onOpenLoanModal}
                className="px-4 py-2 bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-stone-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-lg cursor-pointer transition-all active:scale-95 flex items-center gap-1.5 shrink-0"
              >
                <span>💰 Pedir Dinheiro</span>
              </button>
            </div>
          )}

          {/* Chips Selector */}
          <div className="flex items-center justify-center gap-2 sm:gap-3 py-1 flex-wrap">
            {CHIP_VALUES.map(val => (
              <Chip
                key={val}
                value={val}
                size="md"
                disabled={selfPlayer.isReady || selfPlayer.chips < (selfPlayer.currentBet + val)}
                onClick={() => handleAddChip(val)}
              />
            ))}
          </div>

          {/* Action buttons in betting */}
          <div className="flex items-center gap-3 mt-1 justify-center flex-wrap">
            {isHost ? (
              <div className="flex flex-col sm:flex-row items-center gap-3 w-full justify-center">
                {!selfPlayer.isReady ? (
                  <button
                    type="button"
                    id="btn-confirm-bet"
                    onClick={onReadyToggle}
                    disabled={selfPlayer.currentBet <= 0 || selfPlayer.chips <= 0}
                    className={`px-8 py-3.5 rounded-xl font-black uppercase tracking-wider text-xs sm:text-sm flex items-center gap-2.5 shadow-xl transition-all active:scale-95 cursor-pointer ${
                      selfPlayer.currentBet > 0
                        ? 'bg-emerald-500 hover:bg-emerald-400 text-stone-950 shadow-[0_0_20px_rgba(16,185,129,0.35)]'
                        : 'bg-stone-800 text-stone-400 border border-white/10 opacity-60 cursor-not-allowed'
                    }`}
                  >
                    <Check className="w-4 h-4 stroke-[3]" />
                    <span>
                      {selfPlayer.currentBet > 0
                        ? `✓ Confirmar Minha Aposta ($${selfPlayer.currentBet.toLocaleString()})`
                        : 'Escolha o valor da sua aposta'}
                    </span>
                  </button>
                ) : (
                  <button
                    type="button"
                    id="btn-unready-bet"
                    onClick={onReadyToggle}
                    className="px-4 py-3 rounded-xl bg-stone-800 hover:bg-stone-700 border border-white/10 text-stone-300 text-xs font-bold transition-colors cursor-pointer"
                  >
                    Alterar Aposta
                  </button>
                )}

                {/* Host-exclusive Start Deal / Begin Match Button */}
                <button
                  type="button"
                  id="btn-start-deal"
                  onClick={onStartDeal}
                  disabled={selfPlayer.currentBet <= 0 && selfPlayer.chips > 0}
                  className={`px-10 py-3.5 rounded-xl font-black uppercase tracking-wider text-xs sm:text-sm flex items-center gap-2.5 shadow-2xl transition-all active:scale-95 cursor-pointer ${
                    selfPlayer.currentBet > 0 || selfPlayer.chips === 0
                      ? 'bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-300 hover:to-yellow-300 text-stone-950 shadow-[0_0_25px_rgba(245,158,11,0.45)] ring-2 ring-amber-300/60 animate-pulse'
                      : 'bg-stone-800 text-stone-400 border border-white/10 opacity-50 cursor-not-allowed'
                  }`}
                  title="Apenas você (Criador da Sala) pode iniciar a partida e distribuir as cartas"
                >
                  <Crown className="w-5 h-5 fill-current text-stone-950" />
                  <Play className="w-4 h-4 fill-current text-stone-950" />
                  <span>👑 Iniciar Partida (Distribuir Cartas)</span>
                </button>
              </div>
            ) : (
              /* Guest player view: Can only confirm bet and wait for host */
              <div className="flex flex-col sm:flex-row items-center gap-3 w-full justify-center">
                {!selfPlayer.isReady ? (
                  <button
                    type="button"
                    id="btn-confirm-bet"
                    onClick={onReadyToggle}
                    disabled={selfPlayer.currentBet <= 0 || selfPlayer.chips <= 0}
                    className={`px-10 py-3.5 rounded-xl font-black uppercase tracking-wider text-xs sm:text-sm flex items-center gap-2.5 shadow-xl transition-all active:scale-95 cursor-pointer ${
                      selfPlayer.currentBet > 0
                        ? 'bg-emerald-500 hover:bg-emerald-400 text-stone-950 shadow-[0_0_20px_rgba(16,185,129,0.35)]'
                        : 'bg-stone-800 text-stone-400 border border-white/10 opacity-60 cursor-not-allowed'
                    }`}
                  >
                    <Check className="w-4 h-4 stroke-[3]" />
                    <span>
                      {selfPlayer.currentBet > 0
                        ? `✓ Confirmar Aposta ($${selfPlayer.currentBet.toLocaleString()})`
                        : 'Escolha um valor nas fichas para Jogar'}
                    </span>
                  </button>
                ) : (
                  <div className="flex items-center gap-3 flex-wrap justify-center">
                    <div className="px-6 py-3 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-300 font-extrabold text-xs sm:text-sm flex items-center gap-2.5 shadow-lg animate-pulse">
                      <Crown className="w-4 h-4 text-yellow-400" />
                      <span>✓ Aposta Confirmada (${selfPlayer.currentBet.toLocaleString()}) — Aguardando o Criador da Sala (Host) Iniciar a Partida...</span>
                    </div>
                    <button
                      type="button"
                      id="btn-modify-bet-guest"
                      onClick={onReadyToggle}
                      className="px-3.5 py-2 text-xs rounded-lg bg-stone-800 hover:bg-stone-700 border border-white/10 text-stone-300 font-bold transition-colors cursor-pointer"
                    >
                      Alterar
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Bot Management Panel (Quick + / - Bots) */}
          {onAddBot && (
            <div className="flex items-center justify-between pt-2 border-t border-white/10 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="text-base">🤖</span>
                <span className="text-[11px] font-bold text-stone-300">
                  Jogadores Bots na Mesa: <strong className="text-cyan-400">{botsCount}</strong> / {maxBots}
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                {onToggleBots && (
                  <button
                    type="button"
                    id="btn-toggle-bots"
                    onClick={onToggleBots}
                    className="px-2.5 py-1 text-[10px] uppercase font-bold tracking-wider rounded-lg bg-stone-800 hover:bg-stone-700 border border-white/10 text-stone-300 cursor-pointer transition-colors"
                  >
                    {botsCount > 0 ? 'Limpar Bots' : 'Preencher com Bots'}
                  </button>
                )}
                {onRemoveBot && (
                  <button
                    type="button"
                    id="btn-remove-bot"
                    onClick={onRemoveBot}
                    disabled={botsCount <= 0}
                    className="px-2.5 py-1 text-[10px] font-bold rounded-lg bg-red-950/40 hover:bg-red-900/50 border border-red-500/30 text-red-300 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
                    title="Remover 1 Bot"
                  >
                    - Bot
                  </button>
                )}
                <button
                  type="button"
                  id="btn-add-bot"
                  onClick={onAddBot}
                  disabled={botsCount >= maxBots}
                  className="px-3 py-1 text-[10px] font-black uppercase rounded-lg bg-cyan-600 hover:bg-cyan-500 border border-cyan-400 text-white disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors flex items-center gap-1 shadow-[0_0_10px_rgba(6,182,212,0.3)]"
                  title="Adicionar 1 Bot inteligente"
                >
                  <Plus className="w-3 h-3" /> Adicionar Bot
                </button>
              </div>
            </div>
          )}
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

          {isHost ? (
            <button
              type="button"
              id="btn-new-round"
              onClick={onNewRound}
              className="w-full sm:w-auto bg-yellow-500 hover:bg-yellow-400 text-black px-8 py-3 rounded-xl font-black uppercase tracking-wider text-xs sm:text-sm transition-transform active:scale-95 flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-yellow-500/20"
            >
              <RotateCcw className="w-4 h-4 stroke-[3]" />
              <Crown className="w-4 h-4 fill-current text-stone-900" />
              <span>Iniciar Nova Rodada</span>
            </button>
          ) : (
            <div className="w-full sm:w-auto px-6 py-3 rounded-xl bg-stone-900/90 border border-stone-800 text-stone-400 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 select-none shadow-md">
              <Crown className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Aguardando Criador da Sala iniciar a nova rodada...</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

