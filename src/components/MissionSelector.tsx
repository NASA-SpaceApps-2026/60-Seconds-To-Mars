import { motion } from 'framer-motion';
import { Award, ArrowLeft, Rocket, Satellite } from 'lucide-react';
import { MISSION_DIFFICULTY_META, useGameStore } from '../store/useGameStore';
import type { MissionDifficulty } from '../types/game';
import { playButtonClick, unlockAudio } from '../utils/soundEffects';
import MissionPatch from './MissionPatchLogo';

export default function MissionSelector() {
  const missionDifficulty = useGameStore((s) => s.missionDifficulty);
  const setMissionDifficulty = useGameStore((s) => s.setMissionDifficulty);
  const startGame = useGameStore((s) => s.startGame);
  const resetToMenu = useGameStore((s) => s.resetToMenu);

  return (
    <main
      className="relative flex min-h-dvh items-center overflow-hidden bg-slate-100 px-4 pb-32 pt-6 text-slate-900 sm:px-8"
      onPointerDown={unlockAudio}
    >
      <div className="bg-grid pointer-events-none absolute inset-0 opacity-70" />
      <div className="pointer-events-none absolute -bottom-48 -right-32 h-96 w-96 rounded-full bg-orange-300/30 blur-3xl" />
      <div className="pointer-events-none absolute left-0 top-0 h-2 w-full bg-nasa-blue" />
      <div className="pointer-events-none absolute left-0 top-2 h-1 w-full bg-nasa-red" />

      <div className="relative z-10 mx-auto flex min-h-0 w-full max-w-6xl flex-col justify-center pb-24">
        <header className="flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => {
              playButtonClick();
              resetToMenu();
            }}
            className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-xs font-bold tracking-widest text-slate-500 shadow-sm transition hover:border-nasa-blue hover:text-nasa-blue"
          >
            <ArrowLeft size={15} /> PORTADA
          </button>
          <div className="flex items-center gap-3">
            <MissionPatch size={48} className="h-10 w-10 sm:h-12 sm:w-12" />
            <div className="hidden text-right sm:block">
              <p className="font-mono text-[10px] tracking-[0.3em] text-nasa-blue">ARES-IV // MISSION CONTROL</p>
              <p className="font-display text-xs font-bold tracking-widest text-slate-500">SELECTOR DE MISIÓN</p>
            </div>
          </div>
        </header>

        <section className="mt-8 text-center sm:mt-10">
          <p className="font-mono text-xs font-bold tracking-[0.35em] text-nasa-red">PROTOCOLO DE DESPLIEGUE</p>
          <h1 className="font-display mt-2 text-[clamp(1.8rem,4vw,3.4rem)] font-black tracking-tight text-nasa-blue">
            Elige cómo afrontar la tormenta
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-slate-600 sm:text-base">
            Configura la misión antes de abrir la transmisión de la historia.
          </p>
        </section>

        <section aria-label="Tipo de juego" className="mx-auto mt-8 w-full max-w-5xl">
          <div className="mb-3 flex items-center justify-between gap-3 border-b border-slate-200 px-2 pb-3">
            <p className="font-mono text-xs font-bold tracking-[0.22em] text-nasa-blue">CONFIGURACIÓN DE MISIÓN</p>
            <span className="flex items-center gap-1.5 font-mono text-[10px] font-bold tracking-wider text-emerald-600">
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" /> SISTEMAS NOMINALES
            </span>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {(Object.keys(MISSION_DIFFICULTY_META) as MissionDifficulty[]).map((difficulty) => {
              const selected = missionDifficulty === difficulty;
              const meta = MISSION_DIFFICULTY_META[difficulty];
              const Icon = difficulty === 'explorer' ? Satellite : Award;
              return (
                <button
                  key={difficulty}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => {
                    playButtonClick();
                    setMissionDifficulty(difficulty);
                  }}
                  className={`group relative h-fit overflow-hidden rounded-2xl border-2 p-6 text-left transition-all ${
                    selected
                      ? 'border-nasa-blue bg-white shadow-[0_12px_30px_-16px_rgba(11,61,145,0.65)]'
                      : 'border-slate-300 bg-white/90 hover:border-nasa-blue/50 hover:shadow-md'
                  }`}
                >
                  <span className="absolute inset-x-0 top-0 h-1 bg-nasa-blue transition-colors group-hover:bg-nasa-red" aria-hidden />
                  <span className="flex items-center gap-4">
                    <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full border-2 border-nasa-blue/20 bg-blue-50 text-nasa-blue transition-colors group-hover:border-nasa-blue">
                      <Icon className={difficulty === 'commander' ? 'rotate-180' : undefined} size={28} strokeWidth={1.75} />
                    </span>
                    <span className="font-display text-xl font-black tracking-wider text-slate-900">{meta.label}</span>
                    <span className={`ml-auto h-4 w-4 rounded-full border-2 ${selected ? 'border-nasa-blue bg-nasa-blue' : 'border-slate-300'}`} />
                  </span>
                  <span className="mt-3 block max-w-md text-base leading-relaxed text-slate-600">{meta.description}</span>
                  <span className="mt-5 block border-t border-slate-100 pt-3 font-mono text-xs tracking-wider text-slate-500">
                    {difficulty === 'explorer' ? 'DESGASTE REDUCIDO · IDEAL PARA APRENDER' : 'TORMENTA EXIGENTE · RETO AVANZADO'}
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-300 bg-white/95 px-4 py-4 shadow-[0_-8px_24px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:py-5">
        <div className="mx-auto flex max-w-6xl justify-center">
          <motion.button
            type="button"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => {
              unlockAudio();
              playButtonClick();
              startGame();
            }}
            className="glow-red font-display flex items-center gap-3 rounded-xl bg-nasa-red px-8 py-3.5 text-base font-black tracking-wider text-white sm:px-12 sm:py-4 sm:text-lg"
          >
            <Rocket size={22} /> INICIAR MISIÓN
          </motion.button>
        </div>
      </div>
    </main>
  );
}
