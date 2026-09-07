import React, { useEffect, useState, useRef } from 'react';
import { Dealer, RoundPhase } from '../types';
import { calculateHandScore } from '../utils/blackjack';
import { CardView } from './CardView';
import { Layers } from 'lucide-react';
import { motion } from 'motion/react';

interface DealerAreaProps {
  dealer: Dealer;
  phase: RoundPhase;
  deckRemaining: number;
  timerSeconds?: number;
}

export const DealerArea: React.FC<DealerAreaProps> = ({
  dealer,
  phase,
  deckRemaining,
  timerSeconds = 15
}) => {
  const visibleCards = dealer.cards.filter(c => !c.hidden);
  const hasHiddenCard = dealer.cards.some(c => c.hidden);
  const visibleScore = calculateHandScore(visibleCards);

  const previousDeckRef = useRef(deckRemaining);
  const [isDealing, setIsDealing] = useState(false);

  // Trigger dealing animation when deck count decreases
  useEffect(() => {
    if (deckRemaining < previousDeckRef.current) {
      setIsDealing(true);
      const t = setTimeout(() => setIsDealing(false), 450);
      previousDeckRef.current = deckRemaining;
      return () => clearTimeout(t);
    }
    previousDeckRef.current = deckRemaining;
  }, [deckRemaining]);

  const isDealerTurn = phase === 'dealer_turn';
  const isActionActive = isDealerTurn && Boolean(
    dealer.statusText?.toLowerCase().includes('virando') ||
    dealer.statusText?.toLowerCase().includes('revelando') ||
    dealer.statusText?.toLowerCase().includes('pediu') ||
    dealer.statusText?.toLowerCase().includes('comprou')
  );

  return (
    <div id="dealer-area" className="flex flex-col items-center w-full max-w-xl mx-auto mb-2 relative">
      
      {/* Visual Shoe & Animated Dealer Hand */}
      <div className="absolute top-0 right-4 sm:right-10 md:-right-10 lg:-right-32 xl:-right-48 opacity-80 pointer-events-none hidden sm:flex flex-col items-center">
        {/* Dealer Hand (White Glove) */}
        <motion.div
          animate={isActionActive || isDealing ? { x: -75, y: 55, rotate: -42, scale: 1.1 } : { x: 0, y: 0, rotate: 0, scale: 1 }}
          transition={{ type: 'spring', stiffness: 350, damping: 20 }}
          className="absolute -top-6 -left-6 z-10 drop-shadow-2xl"
        >
           <svg width="56" height="56" viewBox="0 0 24 24" fill="#f5f5f4" stroke="#d6d3d1" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="transform -rotate-12">
              <path d="M18 11V6a2 2 0 0 0-4 0v4" />
              <path d="M14 10V5a2 2 0 0 0-4 0v5" />
              <path d="M10 10.5V6.5a2 2 0 0 0-4 0v7.6" />
              <path d="M6 14v1a7 7 0 0 0 14 0v-4a2 2 0 0 0-2-2h-3" />
           </svg>
        </motion.div>

        {/* Casino Card Shoe Box */}
        <div className="w-20 h-28 bg-stone-950 border-[3px] border-stone-800 rounded-xl shadow-[10px_10px_25px_rgba(0,0,0,0.8)] relative z-0 flex items-center justify-center overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-stone-800/40 to-transparent" />
          <div className="absolute top-3 right-[-10px] w-16 h-4 bg-red-600/90 rounded-full rotate-45 shadow-[0_0_10px_rgba(220,38,38,0.5)]" />
          <Layers className="w-8 h-8 text-stone-700 relative z-10" />
        </div>
      </div>

      {/* Live Ring Timer (Center Top Dealer Badge) */}
      <div className="relative mb-2 flex flex-col items-center">
        <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-full border-4 border-[#00c853] bg-black/70 flex items-center justify-center shadow-[0_0_20px_rgba(0,200,83,0.5)]">
          <span className="text-xl sm:text-2xl md:text-3xl font-black text-white font-mono">
            {phase === 'player_turns' || phase === 'betting' ? timerSeconds : '15'}
          </span>
          <div className="absolute -inset-1 rounded-full border border-emerald-400/30 animate-pulse pointer-events-none" />
        </div>
      </div>

      {/* Dealer Turn Action Banner */}
      {isDealerTurn && (
        <motion.div
          initial={{ opacity: 0, y: -8, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          className="flex items-center gap-2 px-3.5 py-1 rounded-full bg-gradient-to-r from-amber-500/20 via-amber-400/30 to-amber-500/20 border border-amber-400/60 backdrop-blur-md shadow-[0_0_18px_rgba(245,158,11,0.35)] text-amber-200 text-xs font-bold tracking-wide mb-1.5"
        >
          <motion.div
            animate={{ rotateY: [0, 180, 360] }}
            transition={{ repeat: Infinity, duration: 1.2, ease: "easeInOut" }}
            className="w-3.5 h-5 bg-gradient-to-br from-amber-400 to-amber-600 rounded-[2px] border border-white/80 shadow-xs"
            style={{ transformStyle: 'preserve-3d' }}
          />
          <span className="drop-shadow-sm">{dealer.statusText || 'Mesa virando as cartas...'}</span>
        </motion.div>
      )}

      {/* Dealer Cards Container */}
      <div className="relative flex flex-col items-center justify-center min-h-[90px] sm:min-h-[110px] w-full">
        {dealer.cards.length === 0 ? (
          <div className="border border-dashed border-white/20 rounded-lg px-6 py-2 flex items-center gap-2 text-white/40 text-xs bg-black/20">
            <Layers className="w-4 h-4 text-emerald-400" />
            <span>Aguardando Apostas...</span>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1.5">
            <div className="flex items-center -space-x-6 sm:-space-x-8 overflow-visible py-1">
              {dealer.cards.map((card, idx) => (
                <div
                  key={card.id || `${card.rank}-${card.suit}-${idx}`}
                  style={{ zIndex: idx + 1 }}
                >
                  <CardView card={card} index={idx} isDealer />
                </div>
              ))}
            </div>

            {/* Dealer Score Pill (White Badge directly under dealer cards) */}
            <div className="bg-white text-black font-extrabold text-xs px-3 py-0.5 rounded-full shadow-md border border-stone-300">
              {hasHiddenCard ? visibleScore.total : dealer.score}
            </div>
          </div>
        )}
      </div>

      {/* Dealer Status Banner if BUST or BJ */}
      {dealer.cards.length > 0 && (dealer.isBust || dealer.isBlackjack) && (
        <div className="mt-1">
          {dealer.isBust ? (
            <span className="text-xs bg-red-600 text-white font-bold px-3 py-0.5 rounded-full shadow">
              DEALER BUST ({dealer.score})
            </span>
          ) : dealer.isBlackjack ? (
            <span className="text-xs bg-yellow-500 text-black font-bold px-3 py-0.5 rounded-full shadow">
              DEALER BLACKJACK (21)
            </span>
          ) : null}
        </div>
      )}
    </div>
  );
};
