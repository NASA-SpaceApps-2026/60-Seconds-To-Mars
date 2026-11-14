import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Mic, MicOff, TerminalSquare } from 'lucide-react';
import { useGameStore } from '../store/useGameStore';
import { playButtonClick, playErrorBuzz } from '../utils/soundEffects';

/** Reconocimiento de voz del navegador (Chrome/Edge: webkitSpeechRecognition). */
interface MiniRecognition {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start: () => void;
  stop: () => void;
}
type RecognitionCtor = new () => MiniRecognition;

function getRecognition(): RecognitionCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

/**
 * Terminal de órdenes de A.R.I.A. (atajos para las presentaciones):
 *  - "supervivencia" → salta la trivia y empieza en la base espacial.
 *  - "final"         → termina la partida y abre la pantalla final.
 *  - "derrota"       → pantalla final de evacuación (con el análisis de fallos).
 * Se puede escribir o decir en voz alta (micrófono, si el navegador lo permite).
 */
export default function AriaCommandInput({ className = '' }: { className?: string }) {
  const runAriaCommand = useGameStore((s) => s.runAriaCommand);
  const [text, setText] = useState('');
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recRef = useRef<MiniRecognition | null>(null);
  const Recognition = getRecognition();

  useEffect(() => () => recRef.current?.stop(), []);

  const run = (value: string) => {
    if (!value.trim()) return;
    if (runAriaCommand(value)) {
      setText('');
      setError(null);
      playButtonClick();
    } else {
      setError(`Comando no reconocido: «${value.trim().slice(0, 30)}»`);
      playErrorBuzz();
    }
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    run(text);
  };

  const toggleMic = () => {
    if (!Recognition) return;
    if (listening) {
      recRef.current?.stop();
      return;
    }
    const rec = new Recognition();
    rec.lang = 'es-ES';
    rec.interimResults = false;
    rec.maxAlternatives = 3;
    rec.onresult = (e) => {
      const alts = Array.from(e.results[0] ?? []).map((a) => a.transcript);
      setText(alts[0] ?? '');
      if (!alts.some((a) => useGameStore.getState().runAriaCommand(a))) {
        setError(`No he entendido «${alts[0] ?? ''}»`);
      }
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recRef.current = rec;
    setError(null);
    setListening(true);
    try {
      rec.start();
    } catch {
      setListening(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className={`flex flex-col gap-1 ${className}`}>
      <div className="flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-1.5 shadow-sm focus-within:border-nasa-blue">
        <TerminalSquare className="h-4 w-4 shrink-0 text-nasa-blue" strokeWidth={1.75} />
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={60}
          placeholder="Orden para A.R.I.A...."
          aria-label="Orden para A.R.I.A."
          title="Órdenes rápidas: supervivencia · final · derrota"
          className="min-w-0 flex-1 bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400"
        />
        {Recognition && (
          <button
            type="button"
            onClick={toggleMic}
            title={listening ? 'Escuchando... pulsa para parar' : 'Decir la orden en voz alta'}
            aria-label={listening ? 'Parar micrófono' : 'Decir la orden en voz alta'}
            className={`rounded-lg p-1 transition ${listening ? 'animate-pulse bg-nasa-red text-white' : 'text-slate-500 hover:text-nasa-blue'}`}
          >
            {listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          </button>
        )}
      </div>
      {error && <p className="px-1 text-xs font-semibold text-nasa-red">{error}</p>}
    </form>
  );
}
