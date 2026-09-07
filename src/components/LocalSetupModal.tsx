import React, { useState } from 'react';
import { X, Terminal, Copy, Check, Server, FolderTree } from 'lucide-react';

interface LocalSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LocalSetupModal: React.FC<LocalSetupModalProps> = ({ isOpen, onClose }) => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  if (!isOpen) return null;

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const steps = [
    {
      title: '1. Instalar as dependências do projeto',
      cmd: 'npm install'
    },
    {
      title: '2. Iniciar o servidor com WebSockets e Frontend em modo de desenvolvimento',
      cmd: 'npm run dev'
    },
    {
      title: '3. Acessar no seu navegador',
      cmd: 'http://localhost:3000'
    },
    {
      title: '4. Build de produção (opcional)',
      cmd: 'npm run build\nnpm start'
    }
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div
        id="local-setup-modal"
        className="w-full max-w-2xl bg-stone-900 border border-amber-500/40 rounded-2xl shadow-2xl p-6 relative max-h-[90vh] overflow-y-auto"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-stone-400 hover:text-white p-1 rounded-lg cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 mb-2">
          <Terminal className="w-6 h-6 text-amber-400" />
          <h2 className="font-casino text-xl font-bold text-amber-200">
            Como Rodar o Projeto Localmente
          </h2>
        </div>
        <p className="text-xs text-stone-400 mb-6">
          Guia completo para instalar e executar o servidor Node.js + Socket.io e frontend.
        </p>

        {/* Steps */}
        <div className="space-y-4">
          {steps.map((step, idx) => (
            <div key={idx} className="bg-black/40 border border-white/5 p-3.5 rounded-xl">
              <h3 className="text-xs font-semibold text-stone-200 mb-2">{step.title}</h3>
              <div className="relative flex items-center justify-between bg-stone-950 p-2.5 rounded-lg border border-stone-800 font-mono text-xs text-emerald-400">
                <span className="whitespace-pre-wrap">{step.cmd}</span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(step.cmd, idx)}
                  className="ml-2 p-1.5 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded cursor-pointer transition-colors shrink-0"
                  title="Copiar comando"
                >
                  {copiedIndex === idx ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Architecture overview */}
        <div className="mt-6 bg-stone-950/60 border border-amber-500/20 p-4 rounded-xl">
          <h3 className="text-xs font-bold text-amber-300 flex items-center gap-2 mb-2">
            <FolderTree className="w-4 h-4" /> Estrutura dos Arquivos
          </h3>
          <ul className="text-xs text-stone-300 space-y-1 font-mono">
            <li><strong>server.ts</strong>: Servidor Node.js + Express + Socket.io com gerenciamento de salas e lógica autoritativa de Blackjack.</li>
            <li><strong>src/App.tsx</strong>: Interface da mesa de cassino com assentos multiplayer e animações.</li>
            <li><strong>src/types.ts</strong>: Tipagens TypeScript completas para cartas, jogadores, eventos e estado da mesa.</li>
            <li><strong>src/utils/blackjack.ts</strong>: Algoritmos de cálculo de pontuação, baralho e valor dinâmico do Ás.</li>
            <li><strong>src/utils/audio.ts</strong>: Síntese de áudio realista com Web Audio API para cartas, fichas e vitória.</li>
          </ul>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-xl text-sm transition-colors cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
