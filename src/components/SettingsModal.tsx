import React from 'react';
import { X, Settings, Volume2, VolumeX, CheckSquare, Square } from 'lucide-react';
import { sounds } from '../utils/audio';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
  autoReady: boolean;
  onToggleAutoReady: (val: boolean) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  isMuted,
  onToggleMute,
  autoReady,
  onToggleAutoReady
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-stone-900 border border-amber-500/40 rounded-2xl shadow-2xl p-6 relative">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-stone-400 hover:text-white p-1 rounded-lg cursor-pointer transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 mb-6 border-b border-white/10 pb-4">
          <Settings className="w-6 h-6 text-amber-400" />
          <h2 className="font-casino text-xl font-bold text-amber-200">
            Configurações
          </h2>
        </div>

        <div className="space-y-6">
          {/* Audio Setting */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-stone-200">Efeitos Sonoros</h3>
              <p className="text-[10px] text-stone-400">Ativar ou desativar sons do jogo</p>
            </div>
            <button
              type="button"
              onClick={onToggleMute}
              className={`p-2.5 rounded-xl border transition-colors cursor-pointer ${
                isMuted 
                  ? 'bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20' 
                  : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
              }`}
            >
              {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
            </button>
          </div>

          {/* Auto Ready Setting */}
          <div className="flex items-center justify-between">
            <div className="pr-4">
              <h3 className="text-sm font-bold text-stone-200">Auto-Pronto (Aposta Rápida)</h3>
              <p className="text-[10px] text-stone-400">Confirma automaticamente sua aposta mínima da rodada anterior, evitando cliques repetitivos.</p>
            </div>
            <button
              type="button"
              onClick={() => onToggleAutoReady(!autoReady)}
              className="p-1 rounded cursor-pointer text-amber-400 hover:opacity-80 transition-opacity flex-shrink-0"
            >
              {autoReady ? (
                <CheckSquare className="w-7 h-7" />
              ) : (
                <Square className="w-7 h-7" />
              )}
            </button>
          </div>
        </div>

        <div className="mt-8 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-xl text-sm transition-colors cursor-pointer"
          >
            Concluir
          </button>
        </div>
      </div>
    </div>
  );
};
