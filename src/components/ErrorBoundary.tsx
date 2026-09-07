import React from 'react';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  override state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public override componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleReset = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch {}
    window.location.reload();
  };

  public override render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col items-center justify-center p-6 text-center">
          <div className="max-w-md w-full bg-stone-900 border border-amber-500/30 rounded-2xl p-6 sm:p-8 shadow-2xl">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 text-3xl font-black">
              ♠
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-amber-400 uppercase tracking-wider mb-2">
              Erro de Inicialização
            </h1>
            <p className="text-stone-300 text-sm mb-6 leading-relaxed">
              Ocorreu um erro ao carregar o Blackjack. Você pode recarregar a página ou limpar os dados locais temporários.
            </p>
            {this.state.error?.message && (
              <div className="bg-black/60 border border-red-500/20 rounded-lg p-3 text-red-300 font-mono text-xs mb-6 text-left break-all max-h-32 overflow-y-auto">
                {this.state.error.message}
              </div>
            )}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                type="button"
                onClick={this.handleReload}
                className="w-full py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-stone-950 font-bold text-sm transition-all cursor-pointer shadow-lg"
              >
                Recarregar Página
              </button>
              <button
                type="button"
                onClick={this.handleReset}
                className="w-full py-2.5 px-4 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 font-bold text-sm border border-stone-700 transition-all cursor-pointer"
              >
                Limpar Cache
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
