import { useRef, useState, type FormEvent } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { LoaderCircle, MessageCircle, Send } from 'lucide-react';
import { askAriaQuestion } from '../services/geminiGameMaster';
import { MAX_QUESTION_CHARS } from '../services/geminiSchemas';
import { TOTAL_SOLS, availableItems, useGameStore } from '../store/useGameStore';
import { useAriaTypedText } from '../utils/useAriaVoiceState';
import { playButtonClick, playIncoming } from '../utils/soundEffects';

const QUICK_QUESTIONS = ['¿Cuál es el mayor peligro hoy?', '¿Qué máquina debería apagar?', 'Explícame el dato de la NASA'];
const COOLDOWN_MS = 2500;

/** Consultar al Ordenador A.R.I.A.: el jugador pregunta y Gemini (o el fallback) responde. */
export default function AriaConsole() {
  const [question, setQuestion] = useState('');
  const [asked, setAsked] = useState<string | null>(null);
  const [answer, setAnswer] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const lastAsk = useRef(0);
  const shown = useAriaTypedText(answer ?? '');

  const ask = async (text: string) => {
    const q = text.trim().slice(0, MAX_QUESTION_CHARS);
    if (!q || loading) return;
    // Órdenes rápidas de presentación ("final", "supervivencia", "derrota")
    if (q.split(/\s+/).length <= 2 && useGameStore.getState().runAriaCommand(q)) {
      setQuestion('');
      return;
    }
    if (Date.now() - lastAsk.current < COOLDOWN_MS) return;
    lastAsk.current = Date.now();
    playButtonClick();
    setLoading(true);
    setAsked(q);
    setAnswer(null);

    const s = useGameStore.getState();
    const reply = await askAriaQuestion(
      q,
      {
        sol: s.sol,
        totalSols: TOTAL_SOLS,
        vitals: s.vitals,
        science: s.scienceScore,
        inventory: availableItems(s.bunkerInventory, s.consumedItems),
        machineStates: s.machineStates,
      },
      s.currentEvent,
    );
    // Si la partida cambió de fase mientras esperábamos, no hablar
    if (useGameStore.getState().gamePhase !== 'PHASE_2_BUNKER') return;
    setAnswer(reply);
    setLoading(false);
    setQuestion('');
    playIncoming();
    s.ariaSay(reply);
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    void ask(question);
  };

  return (
    <div className="hw-panel p-3">
      <p className="flex items-center gap-2 text-base font-bold text-slate-800"><MessageCircle className="h-5 w-5 text-nasa-blue" strokeWidth={1.75} /> Pregunta a A.R.I.A.</p>

      <form onSubmit={onSubmit} className="mt-2 flex gap-2">
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          maxLength={MAX_QUESTION_CHARS}
          placeholder="Escribe tu duda sobre la misión..."
          aria-label="Pregunta para A.R.I.A."
          className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-base text-slate-900 placeholder:text-slate-400 outline-none focus:border-nasa-blue focus:ring-2 focus:ring-nasa-blue/25"
        />
        <button
          type="submit"
          disabled={loading || !question.trim()}
          className="flex shrink-0 items-center gap-1 rounded-lg bg-nasa-blue px-3 py-2 text-base font-black text-white transition hover:bg-nasa-blue-light disabled:bg-slate-300 disabled:text-slate-500"
        >
          {loading ? <LoaderCircle size={15} className="animate-spin" /> : <Send size={15} />} Preguntar
        </button>
      </form>

      <div className="mt-2 flex flex-wrap gap-1.5">
        {QUICK_QUESTIONS.map((q) => (
          <button
            key={q}
            type="button"
            disabled={loading}
            onClick={() => void ask(q)}
            className="rounded-full border border-nasa-blue/30 bg-blue-50 px-3 py-1.5 text-sm font-bold text-nasa-blue transition hover:border-nasa-blue hover:bg-blue-100 disabled:opacity-50"
          >
            {q}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {(loading || answer) && (
          <motion.div
            key={loading ? 'loading' : answer}
            initial={{ opacity: 0, y: 8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0 }}
            className="relative mt-3 rounded-xl border-2 border-nasa-blue/40 bg-blue-50 p-2.5"
          >
            <span className="absolute -top-2 left-6 h-3 w-3 rotate-45 border-l-2 border-t-2 border-nasa-blue/40 bg-blue-50" />
            {asked && <p className="mb-1 text-sm italic text-slate-500">Tú: «{asked}»</p>}
            {loading ? (
              <p className="flex items-center gap-2 text-base text-nasa-blue">
                <LoaderCircle size={15} className="animate-spin" /> A.R.I.A. está consultando sus bases de datos...
              </p>
            ) : (
              <p className="text-base leading-relaxed text-slate-800">
                <span className="font-display mr-1 text-xs font-bold tracking-widest text-nasa-blue">A.R.I.A.:</span>
                {shown}
                {answer && shown.length < answer.length && <span className="ml-0.5 inline-block h-3.5 w-1.5 animate-pulse bg-nasa-blue align-middle" />}
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
