import React, { useEffect, useState, useRef } from 'react';
import { motion } from 'motion/react';
import { Card as CardType } from '../types';
import { sounds } from '../utils/audio';

interface CardViewProps {
  card: CardType;
  index?: number;
  className?: string;
  isDealer?: boolean;
}

export const CardView: React.FC<CardViewProps> = ({ card, index = 0, className = '', isDealer = false }) => {
  const isRed = card.suit === '♥' || card.suit === '♦';
  const isHidden = Boolean(card.hidden);

  // Track if this card transitioned from hidden -> revealed, or is a newly dealt dealer card
  const wasHiddenRef = useRef(isHidden);
  const [isFlipping, setIsFlipping] = useState(false);
  const [showShine, setShowShine] = useState(false);

  // Trigger flip animation when hole card is revealed
  useEffect(() => {
    if (wasHiddenRef.current && !isHidden) {
      setIsFlipping(true);
      sounds.playCardFlip();
      const shineTimer = setTimeout(() => setShowShine(true), 250);
      const flipTimer = setTimeout(() => {
        setIsFlipping(false);
        setShowShine(false);
      }, 950);
      wasHiddenRef.current = false;
      return () => {
        clearTimeout(shineTimer);
        clearTimeout(flipTimer);
      };
    }
    wasHiddenRef.current = isHidden;
  }, [isHidden]);

  // If dealer draws a new card during dealer turn (index >= 2 and not hidden), play flip sound
  const isNewDealerHit = isDealer && !isHidden && index >= 2;
  useEffect(() => {
    if (isNewDealerHit) {
      sounds.playCardFlip();
      setShowShine(true);
      const timer = setTimeout(() => setShowShine(false), 900);
      return () => clearTimeout(timer);
    }
  }, [isNewDealerHit]);

  // Realistic initial distribution from dealer shoe (top-right)
  const distributionInitial = isNewDealerHit
    ? { x: 180, y: -160, rotateY: 180, rotateZ: -25, scale: 0.5, opacity: 0 }
    : { x: 260, y: -260, rotate: -40, scale: 0.4, opacity: 0 };

  return (
    <div
      id={`card-container-${card.id || `${card.rank}-${card.suit}-${index}`}`}
      className={`relative w-14 h-20 sm:w-16 sm:h-24 md:w-20 md:h-28 select-none ${className}`}
      style={{ perspective: 1200 }}
    >
      <motion.div
        initial={distributionInitial}
        animate={{
          x: 0,
          y: isFlipping ? [0, -32, 0] : 0,
          rotate: 0,
          rotateY: isHidden ? 180 : 0,
          rotateZ: isFlipping ? [-8, 4, 0] : 0,
          scale: isFlipping ? [1, 1.16, 1] : 1,
          opacity: 1,
        }}
        transition={{
          rotateY: { type: 'spring', stiffness: 140, damping: 16 },
          x: { type: 'spring', stiffness: 160, damping: 22, delay: isNewDealerHit ? 0 : index * 0.1 },
          y: isFlipping 
            ? { duration: 0.65, times: [0, 0.45, 1], ease: 'easeOut' }
            : { type: 'spring', stiffness: 160, damping: 22, delay: isNewDealerHit ? 0 : index * 0.1 },
          scale: isFlipping ? { duration: 0.65, times: [0, 0.45, 1] } : undefined,
          rotateZ: isFlipping ? { duration: 0.65, times: [0, 0.45, 1] } : undefined,
          opacity: { duration: 0.25 }
        }}
        whileHover={{ y: -6, scale: 1.05 }}
        style={{ transformStyle: 'preserve-3d' }}
        className="relative w-full h-full rounded-lg cursor-pointer"
      >
        {/* Dynamic Card Flip Aura / Elevation Shadow */}
        {isFlipping && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: [0, 0.8, 0], scale: [0.8, 1.25, 1] }}
            transition={{ duration: 0.7 }}
            className="absolute -inset-2 rounded-xl bg-amber-400/40 blur-md pointer-events-none -z-10"
          />
        )}

        {/* ================= CARD FRONT (Face Up) ================= */}
        <div
          style={{
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            transform: 'rotateY(0deg)',
          }}
          className={`absolute inset-0 w-full h-full bg-gradient-to-b from-white via-stone-50 to-stone-100 rounded-lg shadow-2xl border border-stone-200 flex flex-col justify-between p-1 sm:p-1.5 overflow-hidden ${
            isRed ? 'text-red-600' : 'text-stone-900'
          }`}
        >
          {/* Subtle Card Gloss Texture */}
          <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/40 to-transparent opacity-60 pointer-events-none rounded-lg" />

          {/* Reveal Gold Sweep Sheen Animation */}
          {showShine && (
            <motion.div
              initial={{ x: '-150%', opacity: 0 }}
              animate={{ x: '250%', opacity: [0, 0.9, 0] }}
              transition={{ duration: 0.6, ease: 'easeInOut' }}
              className="absolute inset-0 bg-gradient-to-r from-transparent via-amber-200/70 to-transparent pointer-events-none -skew-x-12 z-20"
            />
          )}

          {/* Top Left Rank & Suit */}
          <div className="flex flex-col leading-none items-start z-10">
            <span className="text-xs sm:text-sm md:text-base font-extrabold tracking-tighter leading-none drop-shadow-xs">
              {card.rank}
            </span>
            <span className="text-[10px] sm:text-xs md:text-sm -mt-0.5">{card.suit}</span>
          </div>

          {/* Center Suit Artwork */}
          <div className="self-center my-auto flex items-center justify-center z-10">
            {['J', 'Q', 'K'].includes(card.rank) ? (
              <div
                className={`w-6 h-8 sm:w-8 sm:h-10 rounded border flex flex-col items-center justify-center shadow-xs ${
                  isRed
                    ? 'border-red-200 bg-red-50/80 text-red-600'
                    : 'border-stone-300 bg-stone-100/80 text-stone-900'
                }`}
              >
                <span className="font-serif font-black text-xs sm:text-sm">{card.rank}</span>
                <span className="text-[10px] sm:text-xs">{card.suit}</span>
              </div>
            ) : (
              <span className="text-xl sm:text-2xl md:text-3xl leading-none drop-shadow-xs">
                {card.suit}
              </span>
            )}
          </div>

          {/* Bottom Right Inverted Rank & Suit */}
          <div className="flex flex-col leading-none rotate-180 items-start self-end z-10">
            <span className="text-xs sm:text-sm md:text-base font-extrabold tracking-tighter leading-none drop-shadow-xs">
              {card.rank}
            </span>
            <span className="text-[10px] sm:text-xs md:text-sm -mt-0.5">{card.suit}</span>
          </div>
        </div>

        {/* ================= CARD BACK (Face Down) ================= */}
        <div
          style={{
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
          }}
          className="absolute inset-0 w-full h-full bg-white rounded-lg shadow-2xl flex items-center justify-center overflow-hidden border border-amber-200/40"
        >
          <div className="absolute inset-1 bg-gradient-to-br from-[#7a0000] via-[#5c0000] to-[#3a0000] rounded flex items-center justify-center border border-amber-400/30 shadow-inner">
            {/* Ornate back pattern */}
            <div className="w-full h-full bg-[radial-gradient(#f59e0b_1px,transparent_1px)] [background-size:6px_6px] opacity-25" />
            <div className="absolute inset-2 border border-dashed border-amber-400/30 rounded" />
            <div className="absolute text-2xl sm:text-3xl text-amber-400/50 select-none font-serif drop-shadow-md">
              ♠
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
