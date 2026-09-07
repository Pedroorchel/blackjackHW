import React from 'react';

interface ChipProps {
  value: number;
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
  selected?: boolean;
  disabled?: boolean;
  count?: number;
}

export const Chip: React.FC<ChipProps> = ({
  value,
  size = 'md',
  onClick,
  selected = false,
  disabled = false,
  count
}) => {
  const getChipColors = (val: number) => {
    switch (val) {
      case 10:
        return {
          bg: 'from-blue-600 to-blue-800',
          border: 'border-blue-300',
          accent: 'border-blue-400',
          text: 'text-blue-100'
        };
      case 25:
        return {
          bg: 'from-emerald-600 to-emerald-800',
          border: 'border-emerald-300',
          accent: 'border-emerald-400',
          text: 'text-emerald-100'
        };
      case 50:
        return {
          bg: 'from-amber-600 to-amber-800',
          border: 'border-amber-300',
          accent: 'border-amber-400',
          text: 'text-amber-100'
        };
      case 100:
        return {
          bg: 'from-red-600 to-red-800',
          border: 'border-red-300',
          accent: 'border-red-400',
          text: 'text-red-100'
        };
      case 500:
      default:
        return {
          bg: 'from-purple-800 to-stone-900',
          border: 'border-purple-300',
          accent: 'border-amber-400',
          text: 'text-amber-200'
        };
    }
  };

  const colors = getChipColors(value);

  const sizeClasses = {
    sm: 'w-7 h-7 text-[10px]',
    md: 'w-10 h-10 sm:w-12 sm:h-12 text-xs sm:text-sm',
    lg: 'w-14 h-14 text-base'
  }[size];

  return (
    <button
      type="button"
      id={`chip-${value}`}
      onClick={onClick}
      disabled={disabled}
      className={`relative rounded-full font-bold flex items-center justify-center transition-all select-none shadow-md ${sizeClasses} ${
        disabled ? 'opacity-40 cursor-not-allowed filter grayscale' : 'cursor-pointer hover:scale-105 active:scale-95'
      } ${selected ? 'ring-4 ring-amber-400 shadow-xl -translate-y-1' : ''}`}
      style={{
        boxShadow: selected ? '0 0 15px rgba(251, 191, 36, 0.7)' : '0 4px 8px rgba(0, 0, 0, 0.4)'
      }}
    >
      {/* Outer Striped Ring */}
      <div
        className={`w-full h-full rounded-full p-0.5 sm:p-1 bg-gradient-to-br ${colors.bg} border-2 border-dashed ${colors.border} flex items-center justify-center`}
      >
        {/* Inner Circle */}
        <div className={`w-full h-full rounded-full border ${colors.accent} flex items-center justify-center bg-black/40 ${colors.text}`}>
          <span>${value}</span>
        </div>
      </div>

      {count !== undefined && count > 1 && (
        <span className="absolute -top-1 -right-1 bg-amber-400 text-stone-950 text-[10px] font-black rounded-full px-1.5 py-0.2 shadow">
          x{count}
        </span>
      )}
    </button>
  );
};
