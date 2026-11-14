import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { useGameStore } from '../store/useGameStore';
import { useAriaTypedText, useAriaVoiceState } from '../utils/useAriaVoiceState';
import { playButtonClick } from '../utils/soundEffects';
import AriaAssistantWidget from './AriaAssistantWidget';
import AriaConsole from './AriaConsole';

/** Tiempo que el bocadillo se queda visible si nadie lo cierra. */
const BUBBLE_MS = 15000;

/** Robot espacial SVG de A.R.I.A. (flota, parpadea y "habla" con las barras de la boca). */
export function RobotSvg({ speaking }: { speaking: boolean }) {
  return (
    <svg viewBox="0 0 120 130" className="h-full w-full drop-shadow-[0_6px_14px_rgba(2,6,23,0.45)]" aria-hidden>
      <path d="M60 22 V8" stroke="#94a3b8" strokeWidth={3} strokeLinecap="round" />
      <motion.circle cx={60} cy={7} r={5} fill="#fc3d21" animate={{ opacity: [1, 0.25, 1] }} transition={{ duration: 1.1, repeat: Infinity }} />
      <rect x={18} y={22} width={84} height={62} rx={26} fill="#f8fafc" stroke="#cbd5e1" strokeWidth={2.5} />
      <rect x={12} y={44} width={8} height={20} rx={4} fill="#0b3d91" />
      <rect x={100} y={44} width={8} height={20} rx={4} fill="#0b3d91" />
      <rect x={28} y={33} width={64} height={40} rx={18} fill="#0b1e45" />
      <motion.g animate={{ scaleY: [1, 1, 0.1, 1] }} transition={{ duration: 3.6, repeat: Infinity, times: [0, 0.9, 0.95, 1] }} style={{ transformOrigin: '60px 50px' }}>
        <ellipse cx={46} cy={50} rx={6} ry={7} fill="#7dd3fc" />
        <ellipse cx={74} cy={50} rx={6} ry={7} fill="#7dd3fc" />
        <circle cx={48} cy={47} r={2} fill="#ffffff" />
        <circle cx={76} cy={47} r={2} fill="#ffffff" />
      </motion.g>
      {[0, 1, 2, 3, 4].map((i) => (
        <motion.rect
          key={i}
          x={47 + i * 6}
          width={3.5}
          rx={1.5}
          fill="#38bdf8"
          initial={false}
          animate={speaking ? { height: [2, 8, 3, 6, 2], y: [64, 60, 63, 61, 64] } : { height: 2, y: 64 }}
          transition={speaking ? { duration: 0.5, repeat: Infinity, delay: i * 0.07 } : { duration: 0.2 }}
        />
      ))}
      <rect x={34} y={86} width={52} height={34} rx={14} fill="#f1f5f9" stroke="#cbd5e1" strokeWidth={2.5} />
      <rect x={34} y={98} width={52} height={6} fill="#0b3d91" />
      <circle cx={60} cy={112} r={4} fill="#fc3d21" />
      <rect x={20} y={90} width={12} height={22} rx={6} fill="#e2e8f0" stroke="#cbd5e1" strokeWidth={2} />
      <rect x={88} y={90} width={12} height={22} rx={6} fill="#e2e8f0" stroke="#cbd5e1" strokeWidth={2} />
    </svg>
  );
}

interface Props {
  /** Panel de preguntas abierto (lo controla el estado único de overlays de Phase2Bunker). */
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Oculta el bocadillo (p. ej. cuando hay otro panel abierto). */
  hideBubble?: boolean;
  className?: string;
}

/**
 * A.R.I.A. flotando a la derecha de la escena: bocadillo con el último aviso (debajo del robot,
 * lejos del edificio) y, al pulsar, el panel de preguntas a Gemini y selector de voz.
 */
export default function AriaRobot({ open, onOpenChange, hideBubble = false, className = '' }: Props) {
  const message = useGameStore((s) => s.ariaMessage);
  const voiceMode = useGameStore((s) => s.voiceMode);
  const voice = useAriaVoiceState();
  const typed = useAriaTypedText(message);
  const speaking = voice.speaking && voiceMode !== 'silent';
  const [hiddenFor, setHiddenFor] = useState<string | null>(null);

  // El bocadillo se oculta solo tras un rato (vuelve a salir con el siguiente mensaje)
  useEffect(() => {
    const t = setTimeout(() => setHiddenFor(message), BUBBLE_MS);
    return () => clearTimeout(t);
  }, [message]);

  const showBubble = !open && !hideBubble && hiddenFor !== message && message.length > 0;

  return (
    <div className={`flex flex-col items-end ${className}`}>
      {/* Robot: abre/pliega el panel */}
      <motion.button
        type="button"
        onClick={() => {
          playButtonClick();
          onOpenChange(!open);
        }}
        animate={{ y: [0, -6, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.94 }}
        className="relative h-24 w-[5.5rem] shrink-0 rounded-2xl focus:outline-none focus-visible:ring-4 focus-visible:ring-nasa-blue/50"
        aria-expanded={open}
        aria-label={open ? 'Plegar el panel de A.R.I.A.' : 'Abrir A.R.I.A.: preguntas y voz'}
        title="A.R.I.A.: pregúntale lo que quieras"
      >
        <RobotSvg speaking={speaking} />
        {speaking && <span className="absolute inset-0 animate-ping rounded-full border-2 border-sky-300/50" aria-hidden />}
      </motion.button>

      {/* Bocadillo de cómic con el último aviso (debajo del robot) */}
      <AnimatePresence>
        {showBubble && (
          <motion.div
            key={message}
            initial={{ opacity: 0, y: -6, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4 }}
            className="relative mt-3 w-[min(19rem,24vw)] min-w-[13rem] rounded-2xl border-2 border-slate-900 bg-white px-4 py-3 shadow-[4px_4px_0_0_rgba(2,6,23,0.55)]"
            role="status"
            aria-live="polite"
          >
            <span className="absolute -top-2 right-9 h-4 w-4 rotate-45 border-l-2 border-t-2 border-slate-900 bg-white" />
            <div className="flex items-start gap-2">
              <p className="thin-scroll max-h-40 flex-1 overflow-y-auto text-base leading-snug text-slate-900" title={message}>
                <span className="mr-1 font-mono text-xs font-bold tracking-widest text-nasa-blue">A.R.I.A.</span>
                {typed}
              </p>
              <button
                type="button"
                onClick={() => setHiddenFor(message)}
                className="-mr-1 -mt-1 rounded p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                aria-label="Cerrar aviso"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Panel desplegable bajo el robot */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 260, damping: 24 }}
            style={{ transformOrigin: 'top right' }}
            className="thin-scroll mt-3 max-h-[min(82vh,calc(100dvh-14rem))] w-[min(28rem,92vw)] overflow-y-auto rounded-2xl border-2 border-slate-300 bg-white/95 p-3 shadow-2xl backdrop-blur-md"
            role="dialog"
            aria-label="A.R.I.A.: preguntas y voz"
          >
            <div className="mb-2 flex items-center justify-between">
              <p className="font-mono text-xs font-bold tracking-[0.25em] text-nasa-blue">A.R.I.A. // ORDENADOR DE A BORDO</p>
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="rounded-lg border border-slate-300 p-1.5 text-slate-600 transition hover:border-nasa-blue hover:text-nasa-blue"
                aria-label="Plegar A.R.I.A."
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="grid gap-3">
              <AriaAssistantWidget compact />
              <AriaConsole />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
