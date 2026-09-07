import React from 'react';
import { X, BookOpen, ShieldCheck, HelpCircle } from 'lucide-react';

interface RulesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RulesModal: React.FC<RulesModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div
        id="rules-modal"
        className="w-full max-w-xl bg-stone-900 border border-amber-500/40 rounded-2xl shadow-2xl p-6 relative max-h-[90vh] overflow-y-auto"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-stone-400 hover:text-white p-1 rounded-lg cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 mb-4">
          <BookOpen className="w-6 h-6 text-amber-400" />
          <h2 className="font-casino text-xl font-bold text-amber-200">
            Regras do Blackjack (21)
          </h2>
        </div>

        <div className="space-y-4 text-sm text-stone-300">
          <section className="bg-black/30 p-3 rounded-xl border border-white/5">
            <h3 className="font-bold text-amber-300 mb-1 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4" /> Objetivo do Jogo
            </h3>
            <p className="text-xs leading-relaxed text-stone-300">
              O objetivo no Blackjack é somar um valor de cartas maior do que o da Mesa (Dealer), sem nunca ultrapassar 21 pontos. Se ultrapassar 21, sua mão estourou (Bust) e você perde a aposta.
            </p>
          </section>

          <section className="bg-black/30 p-3 rounded-xl border border-white/5">
            <h3 className="font-bold text-amber-300 mb-1">Valores das Cartas</h3>
            <ul className="text-xs space-y-1 list-disc list-inside text-stone-300">
              <li><strong>Ás (A):</strong> Vale 1 ou 11 pontos dinamicamente, sempre calculando o melhor total sem estourar.</li>
              <li><strong>Figuras (Valete, Dama, Rei - J, Q, K):</strong> Valem 10 pontos cada.</li>
              <li><strong>Cartas Numéricas (2 a 10):</strong> Valem seu respectivo valor facial.</li>
            </ul>
          </section>

          <section className="bg-black/30 p-3 rounded-xl border border-white/5">
            <h3 className="font-bold text-amber-300 mb-1">Ações Disponíveis no seu Turno</h3>
            <ul className="text-xs space-y-1.5 text-stone-300">
              <li>
                <strong className="text-emerald-400">Pedir Carta (Hit):</strong> Recebe mais uma carta para aumentar o total de pontos.
              </li>
              <li>
                <strong className="text-red-400">Parar (Stand):</strong> Encerra seu turno com a pontuação atual.
              </li>
              <li>
                <strong className="text-amber-400">Dobrar (Double Down):</strong> Dobra o valor da sua aposta inicial, recebe exatamente mais UMA carta e seu turno termina imediatamente.
              </li>
            </ul>
          </section>

          <section className="bg-black/30 p-3 rounded-xl border border-white/5">
            <h3 className="font-bold text-amber-300 mb-1">Regras da Mesa (Dealer)</h3>
            <p className="text-xs leading-relaxed text-stone-300">
              O Dealer recebe 1 carta virada para baixo e 1 aberta. Após todos os jogadores jogarem, o Dealer revela sua carta oculta. A Mesa é obrigada por regra a pedir cartas até atingir pelo menos 17 pontos. Se atingir 17 ou mais, o Dealer é obrigado a parar.
            </p>
          </section>

          <section className="bg-black/30 p-3 rounded-xl border border-white/5">
            <h3 className="font-bold text-amber-300 mb-1">Pagamentos</h3>
            <ul className="text-xs space-y-1 text-stone-300">
              <li><strong>Blackjack Natural (21 com 2 cartas):</strong> Paga 3 a 2 (ex: aposta de $100 retorna $250).</li>
              <li><strong>Vitória Normal:</strong> Paga 1 a 1 (retorna o dobro da aposta).</li>
              <li><strong>Empate (Push):</strong> A aposta inicial é devolvida integralmente.</li>
            </ul>
          </section>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-xl text-sm transition-colors cursor-pointer"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
};
