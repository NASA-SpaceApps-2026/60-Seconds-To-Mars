import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Bug, Database, LoaderCircle, Rocket, Satellite, Timer } from 'lucide-react';
import { useGameStore } from '../store/useGameStore';
import { formatFlareDate } from '../services/nasaApi';
import { playButtonClick, unlockAudio } from '../utils/soundEffects';
import AriaAssistantWidget from './AriaAssistantWidget';
import MissionPatch from './MissionPatchLogo';
import NasaDataSourcesModal from './NasaDataSourcesModal';

function StatusDot({ state }: { state: 'ok' | 'warn' | 'wait' }) {
  const cls = state === 'ok' ? 'bg-emerald-500' : state === 'warn' ? 'bg-amber-400' : 'animate-pulse bg-slate-400';
  return <span className={`inline-block h-2.5 w-2.5 rounded-full ${cls}`} aria-hidden />;
}

function StatusPill() {
  const weather = useGameStore((s) => s.nasaWeather);
  const nasaStatus = useGameStore((s) => s.nasaStatus);
  const aiStatus = useGameStore((s) => s.aiStatus);
  const diag = useGameStore((s) => s.aiDiagnostics);
  const testGemini = useGameStore((s) => s.testGemini);

  useEffect(() => {
    if (useGameStore.getState().aiStatus === 'idle') void testGemini();
  }, [testGemini]);

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
      <StatusDot state={nasaStatus === 'live' ? 'ok' : nasaStatus === 'fallback' ? 'warn' : 'wait'} />
      NASA DONKI{weather ? ` · Llamarada ${weather.flareClass}` : ''}
      <span className="text-slate-300">|</span>
      {aiStatus === 'testing' ? <LoaderCircle size={14} className="animate-spin" /> : <StatusDot state={aiStatus !== 'done' ? 'wait' : diag?.state === 'online' ? 'ok' : 'warn'} />}
      Gemini
    </button>
  );
}

export default function MenuScreen() {
  const enterMissionSelector = useGameStore((s) => s.enterMissionSelector);
  const debugSkip = useGameStore((s) => s.debugSkipToPhase2);
  const [sourcesOpen, setSourcesOpen] = useState(false);

  return (
    <main
      className="relative flex min-h-dvh flex-col items-center overflow-hidden bg-slate-100 px-4 pb-6 pt-[clamp(0.75rem,2.2dvh,1.5rem)] sm:px-6"
      onPointerDown={unlockAudio}
    >
      <div className="bg-grid pointer-events-none absolute inset-0" />
      <div
        className="pointer-events-none absolute -bottom-[clamp(10rem,30vw,18rem)] -right-[clamp(8rem,20vw,12rem)] h-[clamp(18rem,40vw,36rem)] w-[clamp(18rem,40vw,36rem)] rounded-full opacity-90"
        style={{
          background: 'radial-gradient(circle at 30% 30%, #fdba74 0%, #ea580c 40%, #9a3412 72%, #431407 100%)',
          boxShadow: '0 0 0 14px rgba(255,255,255,0.7), 0 0 0 16px #cbd5e1',
        }}
      />
      <div className="pointer-events-none absolute left-0 top-0 h-2 w-full bg-nasa-blue" />
      <div className="pointer-events-none absolute left-0 top-2 h-1 w-full bg-nasa-red" />

      <StatusPill />
      <section className="relative z-10 mt-[clamp(2rem,8dvh,5rem)] flex w-full max-w-4xl flex-col items-center text-center">
        <motion.div initial={{ scale: 0, rotate: -40 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 140 }}>
          <MissionPatch size={180} className="h-[clamp(7rem,20dvh,11rem)] w-auto" />
        </motion.div>
        <p className="font-display mt-5 text-[clamp(0.65rem,1vw,0.85rem)] tracking-[0.3em] text-slate-500">
          NASA SPACE APPS · JUNIOR ASTRONAUT MISSION TRAINER
        </p>
        <motion.h1
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 120, delay: 0.1 }}
          className="font-display mt-2 text-[clamp(2.2rem,6vw,5.25rem)] font-black leading-[1.05] text-nasa-blue"
        >
          60 Seconds <span className="text-nasa-red">to Mars</span>
        </motion.h1>
        <h2 className="font-display mt-2 text-[clamp(1rem,1.9vw,1.6rem)] font-bold tracking-widest text-slate-700">THE SOLAR STORM PROTOCOL</h2>
        <p className="mt-4 max-w-2xl text-[clamp(0.95rem,1.4vw,1.25rem)] font-semibold text-slate-600">
          Una tormenta solar real va hacia Marte. ¿Salvarás a tu tripulación?
        </p>

        <motion.button
          type="button"
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => {
            unlockAudio();
            playButtonClick();
            enterMissionSelector();
          }}
          className="glow-red font-display mt-9 flex items-center gap-3 rounded-2xl bg-nasa-red px-8 py-4 text-lg font-black tracking-wider text-white sm:px-12 sm:text-xl"
        >
          <Rocket size={26} /> COMENZAR MISIÓN
        </motion.button>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-2.5 text-xs text-slate-500">
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
            <Bug size={13} /> Debug: Saltar a Fase 2
          </button>
        </div>
        <AriaAssistantWidget className="mt-8 w-full max-w-xl text-left" />
      </section>
      <NasaDataSourcesModal open={sourcesOpen} onClose={() => setSourcesOpen(false)} />
    </main>
  );
}
