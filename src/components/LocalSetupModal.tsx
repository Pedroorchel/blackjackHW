import React, { useState } from 'react';
import { X, Terminal, Copy, Check, Server, FolderTree } from 'lucide-react';

interface LocalSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  customServerUrl?: string;
  onSaveServerUrl?: (url: string) => void;
  isServerConnected?: boolean;
}

export const LocalSetupModal: React.FC<LocalSetupModalProps> = ({ 
  isOpen, 
  onClose,
  customServerUrl = '',
  onSaveServerUrl,
  isServerConnected = false
}) => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [serverInput, setServerInput] = useState(customServerUrl);
  const [saveSuccess, setSaveSuccess] = useState(false);

  if (!isOpen) return null;

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleSaveServer = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSaveServerUrl) {
      onSaveServerUrl(serverInput.trim());
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    }
  };

  const handleResetServer = () => {
    setServerInput('');
    if (onSaveServerUrl) {
      onSaveServerUrl('');
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    }
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
          <Server className="w-6 h-6 text-amber-400" />
          <h2 className="font-casino text-xl font-bold text-amber-200">
            Conexão & Servidor Multiplayer
          </h2>
        </div>
        <p className="text-xs text-stone-400 mb-4">
          Conecte o frontend (ex: GitHub Pages ou Vercel) ao servidor de WebSockets do Blackjack.
        </p>

        {/* Server Connection Status Card */}
        <div className="mb-6 p-4 bg-stone-950/80 border border-stone-800 rounded-xl">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-stone-300 flex items-center gap-2">
              Status Atual:
              {isServerConnected ? (
                <span className="text-emerald-400 font-black px-2 py-0.5 bg-emerald-950/60 border border-emerald-500/30 rounded-full flex items-center gap-1.5 text-[10px] uppercase">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> Conectado ao Servidor
                </span>
              ) : (
                <span className="text-amber-400 font-bold px-2 py-0.5 bg-amber-950/60 border border-amber-500/30 rounded-full flex items-center gap-1.5 text-[10px] uppercase">
                  <span className="w-2 h-2 rounded-full bg-amber-400" /> Reconectando / Servidor Remoto
                </span>
              )}
            </span>
          </div>

          {!isServerConnected && (
            <div className="mb-4 p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-200 leading-relaxed">
              <span className="font-bold block mb-1">💡 Dica para o Google AI Studio:</span>
              Se o status estiver <strong className="text-amber-400">Reconectando</strong> no visualizador integrado, é porque o navegador bloqueia cookies de terceiros no iframe. 
              Clique no botão <strong className="text-white">"Open in new tab"</strong> (Abrir em nova aba) no canto superior direito para liberar a conexão multiplayer instantaneamente!
            </div>
          )}

          <form onSubmit={handleSaveServer} className="space-y-3">
            <div>
              <label className="block text-[10px] uppercase font-bold text-stone-400 mb-1">
                URL do Servidor Multiplayer (Socket.IO)
              </label>
              <div className="flex gap-2">
                <input
                  type="url"
                  placeholder="ex: https://meu-blackjack.onrender.com ou deixe vazio para automático"
                  value={serverInput}
                  onChange={(e) => setServerInput(e.target.value)}
                  className="flex-1 px-3 py-2 bg-stone-900 border border-stone-700 rounded-lg text-xs text-white placeholder-stone-600 focus:outline-none focus:border-amber-500 font-mono"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-bold rounded-lg transition-colors cursor-pointer"
                >
                  Salvar
                </button>
                {serverInput && (
                  <button
                    type="button"
                    onClick={handleResetServer}
                    className="px-3 py-2 bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-bold rounded-lg transition-colors cursor-pointer"
                    title="Restaurar Padrão"
                  >
                    Restaurar
                  </button>
                )}
              </div>
            </div>
            {saveSuccess && (
              <p className="text-xs text-emerald-400 font-bold flex items-center gap-1">
                <Check className="w-3.5 h-3.5" /> Servidor atualizado com sucesso! Reconectando socket...
              </p>
            )}
            <p className="text-[11px] text-stone-500 leading-relaxed">
              💡 Para jogar multiplayer com amigos no GitHub Pages, você pode apontar para o servidor oficial ou informar o link do seu backend no Render.
            </p>
          </form>
        </div>

        <div className="flex items-center gap-2 mb-2 pt-2 border-t border-stone-800">
          <Terminal className="w-5 h-5 text-amber-400" />
          <h3 className="font-casino text-lg font-bold text-amber-200">
            Como Rodar o Projeto Localmente
          </h3>
        </div>

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
