import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Bug, Database, Gauge, LifeBuoy, LoaderCircle, Rocket, Satellite, Timer, Wrench, type LucideIcon } from 'lucide-react';
import { useGameStore } from '../store/useGameStore';
import { formatFlareDate } from '../services/nasaApi';
import { playButtonClick, unlockAudio } from '../utils/soundEffects';
import AriaAssistantWidget from './AriaAssistantWidget';
import MissionPatch from './MissionPatchLogo';
import NasaDataSourcesModal from './NasaDataSourcesModal';

/** LED de estado vectorial (sustituye a los emojis de círculo). */
function StatusDot({ state }: { state: 'ok' | 'warn' | 'wait' }) {
  const cls = state === 'ok' ? 'bg-emerald-500' : state === 'warn' ? 'bg-amber-400' : 'animate-pulse bg-slate-400';
  return <span className={`inline-block h-2.5 w-2.5 rounded-full ${cls}`} aria-hidden />;
}

/** Una sola píldora compacta: llamarada real de DONKI + estado de NASA + estado de Gemini (con re-test). */
function StatusPill() {
  const weather = useGameStore((s) => s.nasaWeather);
  const nasaStatus = useGameStore((s) => s.nasaStatus);
  const aiStatus = useGameStore((s) => s.aiStatus);
  const diag = useGameStore((s) => s.aiDiagnostics);
  const testGemini = useGameStore((s) => s.testGemini);

  useEffect(() => {
    if (useGameStore.getState().aiStatus === 'idle') void testGemini();
  }, [testGemini]);

  const nasaDot = <StatusDot state={nasaStatus === 'live' ? 'ok' : nasaStatus === 'fallback' ? 'warn' : 'wait'} />;
  const aiDot = <StatusDot state={aiStatus !== 'done' ? 'wait' : diag?.state === 'online' ? 'ok' : 'warn'} />;
  const tooltip = [
    nasaStatus === 'live' ? 'NASA DONKI conectado' : nasaStatus === 'fallback' ? 'NASA DONKI: archivo real (sin conexión)' : 'Conectando con NASA DONKI...',
    weather ? `Última llamarada: clase ${weather.flareClass}, ${formatFlareDate(weather.peakTime)}` : '',
    `Gemini: ${diag?.detail ?? 'probando...'}`,
    'Pulsa para volver a probar Gemini',
  ]
    .filter(Boolean)
    .join('\n');

  return (
    <button
      type="button"
      disabled={aiStatus === 'testing'}
      onClick={() => {
        playButtonClick();
        void testGemini();
      }}
      title={tooltip}
      className="relative z-10 mt-2 flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-1.5 text-sm text-slate-600 shadow-sm transition hover:border-nasa-blue"
    >
      <Satellite size={15} className="text-nasa-blue" />
      {nasaDot} NASA DONKI{weather ? ` · Llamarada ${weather.flareClass}` : ''}
      <span className="text-slate-300">|</span>
      {aiStatus === 'testing' ? <LoaderCircle size={14} className="animate-spin" /> : aiDot} Gemini
    </button>
  );
}

/** Las 4 fases REALES del flujo de juego (el envío de Houston es una mecánica dentro de la fase 2, no una fase). */
const PHASES: { Icon: LucideIcon; code: string; telemetry: string; title: string; text: string }[] = [
  {
    Icon: Timer,
    code: 'FASE 01',
    telemetry: 'T-00:60',
    title: '60 s de Trivia',
    text: 'Responde preguntas espaciales contrarreloj para equipar la base. Cada rama fallada provoca una avería inicial.',
  },
  {
    Icon: Gauge,
    code: 'FASE 02',
    telemetry: 'SOL 01-10',
    title: 'Complicaciones',
    text: 'Equilibra oxígeno, energía, comida y blindaje resistiendo la radiación solar real de NASA DONKI.',
  },
  {
    Icon: Wrench,
    code: 'FASE 03',
    telemetry: 'SYS CHECK',
    title: '10 Soles',
    text: 'Supera minijuegos tácticos de emergencia cuando fallen los sistemas críticos del hábitat.',
  },
  {
    Icon: LifeBuoy,
    code: 'FASE 04',
    telemetry: 'ETA SOL 10',
    title: 'Rescate',
    text: 'Toma decisiones científicas de alto compromiso hasta que el rover regrese en el Sol 10.',
  },
];

export default function MenuScreen() {
  const startGame = useGameStore((s) => s.startGame);
  const debugSkip = useGameStore((s) => s.debugSkipToPhase2);
  const [sourcesOpen, setSourcesOpen] = useState(false);

  return (
    <div
      className="relative flex min-h-dvh flex-col items-center overflow-x-hidden bg-slate-100 px-4 pb-6 pt-[clamp(0.75rem,2.2dvh,1.5rem)] sm:px-6"
      onPointerDown={unlockAudio}
    >
      <div className="bg-grid pointer-events-none absolute inset-0" />
      {/* Marte */}
      <div
        className="pointer-events-none absolute -bottom-[clamp(10rem,30vw,18rem)] -right-[clamp(8rem,20vw,12rem)] h-[clamp(18rem,40vw,36rem)] w-[clamp(18rem,40vw,36rem)] rounded-full opacity-90"
        style={{
          background: 'radial-gradient(circle at 30% 30%, #fdba74 0%, #ea580c 40%, #9a3412 72%, #431407 100%)',
          boxShadow: '0 0 0 14px rgba(255,255,255,0.7), 0 0 0 16px #cbd5e1',
        }}
      />
      {/* Franja roja y azul tipo fuselaje */}
      <div className="pointer-events-none absolute left-0 top-0 h-2 w-full bg-nasa-blue" />
      <div className="pointer-events-none absolute left-0 top-2 h-1 w-full bg-nasa-red" />

      <StatusPill />

      <div className="relative z-10 mt-[clamp(0.5rem,2dvh,1.5rem)] flex w-full max-w-6xl flex-col items-center text-center">
        <motion.div initial={{ scale: 0, rotate: -40 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 140 }}>
          <MissionPatch size={140} className="h-[clamp(4.5rem,13dvh,8.5rem)] w-auto" />
        </motion.div>
        <p className="font-display mt-[clamp(0.25rem,1.2dvh,0.75rem)] text-[clamp(0.65rem,1vw,0.85rem)] tracking-[0.3em] text-slate-500">
          NASA SPACE APPS · JUNIOR ASTRONAUT MISSION TRAINER
        </p>
        <motion.h1
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 120, delay: 0.1 }}
          className="font-display mt-1 text-[clamp(2rem,5vw,4.25rem)] font-black leading-[1.05] text-nasa-blue"
        >
          60 Seconds <span className="text-nasa-red">to Mars</span>
        </motion.h1>
        <h2 className="font-display mt-1 text-[clamp(1rem,1.9vw,1.6rem)] font-bold tracking-widest text-slate-700">THE SOLAR STORM PROTOCOL</h2>
        <p className="mt-[clamp(0.25rem,1.2dvh,0.75rem)] text-[clamp(0.95rem,1.4vw,1.25rem)] font-semibold text-slate-600">
          Una tormenta solar real va hacia Marte. ¿Salvarás a tu tripulación?
        </p>

        {/* ---- 4 fases reales: estética de centro de control ---- */}
        <div className="mt-[clamp(0.75rem,3dvh,1.75rem)] grid w-full gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {PHASES.map(({ Icon, code, telemetry, title, text }, i) => (
            <motion.article
              key={code}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + i * 0.08 }}
              className="group relative overflow-hidden rounded-lg border border-slate-300/80 bg-white/95 p-[clamp(0.75rem,1.4vw,1.1rem)] text-left shadow-sm backdrop-blur-sm transition-all hover:border-nasa-blue hover:shadow-md"
            >
              {/* Línea de acento superior y marcas de esquina de consola */}
              <span className="absolute inset-x-0 top-0 h-0.5 bg-nasa-blue/80 transition-colors group-hover:bg-nasa-red" aria-hidden />
              <span className="absolute right-2 top-2 h-2 w-2 border-r border-t border-slate-300" aria-hidden />
              <span className="absolute bottom-2 left-2 h-2 w-2 border-b border-l border-slate-300" aria-hidden />

              <div className="flex items-center justify-between gap-2 font-mono text-xs">
                <span className="font-bold tracking-[0.2em] text-nasa-blue">{code}</span>
                <span className="flex items-center gap-1.5 tracking-wider text-slate-500">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" aria-hidden />
                  {telemetry}
                </span>
              </div>
              <h3 className="mt-2.5 flex items-center gap-2.5 text-[clamp(0.95rem,1.2vw,1.1rem)] font-bold leading-snug text-slate-900">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md border border-slate-200 bg-slate-50 text-nasa-blue">
                  <Icon className="h-5 w-5" strokeWidth={1.75} />
                </span>
                {title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{text}</p>
            </motion.article>
          ))}
        </div>

        <motion.button
          type="button"
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => {
            unlockAudio();
            playButtonClick();
            startGame();
          }}
          className="glow-red font-display mt-[clamp(0.9rem,3dvh,2rem)] flex items-center gap-3 rounded-2xl bg-nasa-red px-[clamp(1.25rem,3vw,2.5rem)] py-[clamp(0.75rem,1.8dvh,1.25rem)] text-[clamp(1rem,1.7vw,1.5rem)] font-black tracking-wider text-white"
        >
          <Rocket className="h-[1.3em] w-[1.3em] shrink-0" />
          INICIAR PROTOCOLO DE EMERGENCIA
        </motion.button>

        <div className="mt-[clamp(0.6rem,1.8dvh,1.25rem)] flex flex-wrap items-center justify-center gap-2.5 text-xs text-slate-500">
          <span className="flex items-center gap-1 rounded-full border border-slate-300 bg-white px-3 py-1">
            <Timer size={13} /> Partida de unos 12 minutos
          </span>
          <button
            type="button"
            onClick={() => {
              playButtonClick();
              setSourcesOpen(true);
            }}
            className="flex items-center gap-1 rounded-full border border-slate-300 bg-white px-3 py-1 font-semibold text-nasa-blue transition hover:border-nasa-blue"
            title="Qué datos reales de la NASA usa el juego y cómo verificarlos"
          >
            <Database size={13} /> Datos Abiertos NASA Utilizados
          </button>
          <button
            type="button"
            onClick={() => {
              playButtonClick();
              debugSkip();
            }}
            className="flex items-center gap-1 rounded-full border border-dashed border-slate-400 bg-white px-3 py-1 text-slate-500 transition hover:border-slate-600 hover:text-slate-700"
          >
            <Bug size={13} /> Debug: Saltar a Fase 2 con inventario de prueba
          </button>
        </div>

        <AriaAssistantWidget className="mt-[clamp(0.75rem,2.5dvh,1.75rem)] w-full max-w-xl text-left" />
        <NasaDataSourcesModal open={sourcesOpen} onClose={() => setSourcesOpen(false)} />
      </div>
    </div>
  );
}
