import { Component, type ErrorInfo, type ReactNode } from 'react';
import { House, RotateCcw, TriangleExclamationPoint } from 'lucide-react';

/**
 * Red de seguridad: si una pantalla falla al dibujarse, en vez de dejar la página en blanco
 * muestra un aviso con "Reintentar" (vuelve a dibujar la misma pantalla, el estado del store se conserva)
 * y "Menú principal". Solo guarda estado de UI (el error), nunca estado de juego.
 */
export default class ScreenErrorBoundary extends Component<
  { children: ReactNode; onHome: () => void },
  { error: Error | null }
> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[Pantalla] Error al dibujar:', error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="grid min-h-dvh place-items-center bg-slate-100 p-4">
        <div className="hw-panel flex w-full max-w-lg flex-col items-center gap-3 p-6 text-center">
          <span className="grid h-14 w-14 place-items-center rounded-xl bg-red-50 text-nasa-red">
            <TriangleExclamationPoint className="h-8 w-8" strokeWidth={1.75} />
          </span>
          <h2 className="font-display text-2xl font-black text-nasa-blue">Interferencia en la pantalla</h2>
          <p className="text-base text-slate-700">
            Una ráfaga de la tormenta solar ha desconectado este panel. Tu partida sigue guardada: pulsa <b>Reintentar</b>.
          </p>
          <div className="mt-2 flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={() => this.setState({ error: null })}
              className="flex items-center gap-2 rounded-xl bg-nasa-blue px-5 py-3 font-bold text-white shadow-lg"
            >
              <RotateCcw className="h-5 w-5" /> Reintentar
            </button>
            <button
              type="button"
              onClick={() => {
                this.setState({ error: null });
                this.props.onHome();
              }}
              className="flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-3 font-bold text-slate-700"
            >
              <House className="h-5 w-5" /> Menú principal
            </button>
          </div>
        </div>
      </div>
    );
  }
}
