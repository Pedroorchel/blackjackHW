import React, { useState } from 'react';
import { Player } from '../types';
import { X, DollarSign, Sparkles, Landmark, Bot, User, Check, AlertCircle } from 'lucide-react';

interface LoanModalProps {
  isOpen: boolean;
  onClose: () => void;
  players: Player[];
  selfPlayer: Player | null;
  onRequestLoan: (targetPlayerId: string, amount: number) => void;
  onRepayLoan: (targetPlayerId: string, amount: number) => void;
}

export const LoanModal: React.FC<LoanModalProps> = ({
  isOpen,
  onClose,
  players,
  selfPlayer,
  onRequestLoan,
  onRepayLoan
}) => {
  const [activeTab, setActiveTab] = useState<'request' | 'repay'>('request');
  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; type: 'success' | 'info' } | null>(null);

  if (!isOpen) return null;

  const otherPlayers = players.filter(p => p.id !== selfPlayer?.id && !p.isSpectator);
  const selfChips = selfPlayer?.chips || 0;
  
  // Calculate debts
  const debts = selfPlayer?.debts || {};
  const debtEntries = Object.entries(debts).filter(([_, amount]) => amount > 0);
  const totalDebt = debtEntries.reduce((acc, [_, amount]) => acc + amount, 0);

  const showFeedback = (text: string, type: 'success' | 'info' = 'success') => {
    setFeedbackMsg({ text, type });
    setTimeout(() => {
      setFeedbackMsg(null);
    }, 4000);
  };

  const handleRequest = (targetId: string, targetName: string, amount: number) => {
    onRequestLoan(targetId, amount);
    showFeedback(`Pedido de $${amount} enviado para ${targetName}!`, 'success');
  };

  const handleRepay = (targetId: string, targetName: string, amount: number) => {
    onRepayLoan(targetId, amount);
    showFeedback(`Pagamento de $${amount} enviado para ${targetName}!`, 'success');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-stone-900 border border-stone-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 bg-stone-950/80 border-b border-stone-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Landmark className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-white uppercase tracking-wider flex items-center gap-2">
                Banco & Empréstimos VIP
                <Sparkles className="w-4 h-4 text-amber-400" />
              </h3>
              <p className="text-[11px] text-stone-400">
                Peça fichas a jogadores e bots ou solicite adiantamento da casa
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-stone-400 hover:text-white p-1.5 rounded-lg hover:bg-stone-800 cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User Balance Bar */}
        <div className="grid grid-cols-2 gap-3 p-3.5 bg-stone-950/40 border-b border-stone-800/80">
          <div className="bg-stone-900/90 border border-stone-800 p-2.5 rounded-xl flex items-center justify-between">
            <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider">Seu Saldo:</span>
            <span className={`text-base font-black ${selfChips > 0 ? 'text-emerald-400' : 'text-red-400 animate-pulse'}`}>
              ${selfChips.toLocaleString()}
            </span>
          </div>
          <div className="bg-stone-900/90 border border-stone-800 p-2.5 rounded-xl flex items-center justify-between">
            <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider">Dívidas Ativas:</span>
            <span className={`text-base font-black ${totalDebt > 0 ? 'text-amber-400' : 'text-stone-500'}`}>
              ${totalDebt.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Feedback Alert */}
        {feedbackMsg && (
          <div className={`mx-4 mt-3 p-2.5 rounded-xl text-xs font-bold flex items-center gap-2 border animate-in slide-in-from-top-2 duration-150 ${
            feedbackMsg.type === 'success' 
              ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300' 
              : 'bg-amber-500/15 border-amber-500/30 text-amber-300'
          }`}>
            <Check className="w-4 h-4 shrink-0" />
            <span>{feedbackMsg.text}</span>
          </div>
        )}

        {/* Tabs */}
        <div className="flex border-b border-stone-800 px-4 pt-2 gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('request')}
            className={`pb-2.5 px-4 text-xs font-black uppercase tracking-wider cursor-pointer border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'request'
                ? 'border-amber-400 text-amber-400'
                : 'border-transparent text-stone-400 hover:text-stone-200'
            }`}
          >
            <DollarSign className="w-3.5 h-3.5" />
            <span>Pedir Fichas</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('repay')}
            className={`pb-2.5 px-4 text-xs font-black uppercase tracking-wider cursor-pointer border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'repay'
                ? 'border-emerald-400 text-emerald-400'
                : 'border-transparent text-stone-400 hover:text-stone-200'
            }`}
          >
            <span>Quitar Dívidas</span>
            {debtEntries.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[10px] font-black">
                {debtEntries.length}
              </span>
            )}
          </button>
        </div>

        {/* Tab Contents */}
        <div className="p-4 overflow-y-auto space-y-4 flex-1">
          {activeTab === 'request' ? (
            <>
              {/* Option 1: Cassino VIP Advance */}
              <div className="bg-gradient-to-br from-amber-500/10 via-yellow-500/5 to-transparent border border-amber-500/30 rounded-xl p-3.5 shadow-lg">
                <div className="flex items-start justify-between gap-3 mb-2.5">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                      <Landmark className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                        Adiantamento do Cassino VIP
                        <span className="text-[9px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded font-bold">CASA</span>
                      </h4>
                      <p className="text-[11px] text-stone-300">
                        Adiantamento emergencial da mesa quando faltar fichas.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1 flex-wrap">
                  <button
                    type="button"
                    onClick={() => handleRequest('casino', 'Cassino VIP', 100)}
                    className="flex-1 min-w-[90px] py-2 px-3 rounded-lg bg-stone-800 hover:bg-stone-700 text-amber-300 border border-amber-500/30 font-black text-xs transition-all active:scale-95 cursor-pointer shadow"
                  >
                    +$100
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRequest('casino', 'Cassino VIP', 250)}
                    className="flex-1 min-w-[90px] py-2 px-3 rounded-lg bg-stone-800 hover:bg-stone-700 text-amber-300 border border-amber-500/30 font-black text-xs transition-all active:scale-95 cursor-pointer shadow"
                  >
                    +$250
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRequest('casino', 'Cassino VIP', 500)}
                    className="flex-1 min-w-[90px] py-2 px-3 rounded-lg bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-stone-950 font-black text-xs transition-all active:scale-95 cursor-pointer shadow-[0_0_15px_rgba(245,158,11,0.3)]"
                  >
                    +$500 VIP
                  </button>
                </div>
              </div>

              {/* Option 2: Players and Bots */}
              <div>
                <h4 className="text-xs font-black text-stone-400 uppercase tracking-wider mb-2.5 flex items-center justify-between">
                  <span>Jogadores e Bots da Mesa</span>
                  <span className="text-[10px] text-stone-500 lowercase font-normal">
                    {otherPlayers.length} disponíveis
                  </span>
                </h4>

                {otherPlayers.length === 0 ? (
                  <div className="p-4 rounded-xl bg-stone-950/40 border border-stone-800 text-center text-stone-400 text-xs">
                    Nenhum outro jogador ou bot sentado na mesa no momento. Use o adiantamento da casa acima!
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {otherPlayers.map(p => {
                      const hasSufficientChips = p.chips >= 100;
                      return (
                        <div
                          key={p.id}
                          className="bg-stone-950/60 border border-stone-800/80 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-8 h-8 rounded-full bg-stone-800 border border-stone-700 flex items-center justify-center shrink-0 text-stone-300 overflow-hidden">
                              {p.avatarUrl ? (
                                <img src={p.avatarUrl} alt={p.name} className="w-full h-full object-cover" />
                              ) : p.isBot ? (
                                <Bot className="w-4 h-4 text-purple-400" />
                              ) : (
                                <User className="w-4 h-4" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-bold text-white truncate">{p.name}</span>
                                {p.isBot && (
                                  <span className="px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[9px] font-black">
                                    BOT
                                  </span>
                                )}
                              </div>
                              <span className="text-[10px] text-stone-400 block font-medium">
                                Fichas: <strong className="text-emerald-400 font-bold">${p.chips.toLocaleString()}</strong>
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleRequest(p.id, p.name, 100)}
                              disabled={p.chips < 100}
                              className="px-2.5 py-1.5 rounded-lg bg-amber-600/20 hover:bg-amber-600/30 border border-amber-500/30 text-amber-300 text-[11px] font-black transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                              title={p.chips < 100 ? 'Jogador sem fichas suficientes' : 'Pedir $100 emprestado'}
                            >
                              Pedir $100
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRequest(p.id, p.name, 250)}
                              disabled={p.chips < 250}
                              className="px-2.5 py-1.5 rounded-lg bg-amber-600/20 hover:bg-amber-600/30 border border-amber-500/30 text-amber-300 text-[11px] font-black transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                              title={p.chips < 250 ? 'Jogador sem fichas suficientes' : 'Pedir $250 emprestado'}
                            >
                              Pedir $250
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRequest(p.id, p.name, 500)}
                              disabled={p.chips < 500}
                              className="px-2.5 py-1.5 rounded-lg bg-amber-600/20 hover:bg-amber-600/30 border border-amber-500/30 text-amber-300 text-[11px] font-black transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                              title={p.chips < 500 ? 'Jogador sem fichas suficientes' : 'Pedir $500 emprestado'}
                            >
                              Pedir $500
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          ) : (
            /* Quitar Dívidas Tab */
            <div className="space-y-3">
              {debtEntries.length === 0 ? (
                <div className="p-6 rounded-xl bg-stone-950/40 border border-stone-800 text-center">
                  <Check className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                  <p className="text-xs font-bold text-white uppercase tracking-wider">Tudo em dia!</p>
                  <p className="text-[11px] text-stone-400 mt-1">
                    Você não possui nenhuma dívida com jogadores ou com a casa.
                  </p>
                </div>
              ) : (
                debtEntries.map(([lenderId, debtAmount]) => {
                  let lenderName = 'Cassino VIP';
                  if (lenderId !== 'casino') {
                    const lender = players.find(p => p.id === lenderId);
                    lenderName = lender ? lender.name : 'Jogador';
                  }

                  const canPay100 = selfChips >= Math.min(100, debtAmount);
                  const canPayAll = selfChips >= debtAmount;

                  return (
                    <div
                      key={lenderId}
                      className="bg-stone-950/60 border border-stone-800 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white">{lenderName}</span>
                          {lenderId === 'casino' && (
                            <span className="text-[9px] bg-amber-500/20 text-amber-300 px-1.5 py-0.2 rounded font-bold">
                              CASA
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-amber-400 font-black block mt-0.5">
                          Deve: ${debtAmount.toLocaleString()}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleRepay(lenderId, lenderName, 100)}
                          disabled={!canPay100}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer shadow"
                        >
                          Pagar $100
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRepay(lenderId, lenderName, debtAmount)}
                          disabled={!canPayAll}
                          className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 text-stone-950 font-black text-xs transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer shadow"
                        >
                          Quitar Tudo (${debtAmount.toLocaleString()})
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-stone-950/80 border-t border-stone-800 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
