import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import confetti from 'canvas-confetti';
import {
  Award,
  Bot,
  ChevronRight,
  ClipboardList,
  GraduationCap,
  HeartPulse,
  House,
  Lightbulb,
  LoaderCircle,
  Medal,
  RotateCcw,
  Sparkles,
  Star,
  UserRound,
  Wrench,
  type LucideIcon,
} from 'lucide-react';
import { ItemIcon, ResourceIcon } from './icons';
import type { Rank } from '../types/game';
import { ITEMS_BY_ID, RARITY_META } from '../data/stationItems';
import { TOTAL_SOLS, VITAL_META, VITAL_ORDER, useGameStore } from '../store/useGameStore';
import { playButtonClick } from '../utils/soundEffects';
import GaugeMeter from './GaugeMeter';
import MissionPatch from './MissionPatchLogo';
import { BadgeShelf } from './PeriscopeModal';

const RANK_STYLE: Record<Rank, { Icon: LucideIcon; text: string }> = {
  'Cadete Espacial': { Icon: UserRound, text: '¡Todo gran astronauta empezó como cadete! Prueba otra estrategia.' },
  'Ingeniero de Sistemas Artemisa': { Icon: Wrench, text: 'Mantuviste el búnker en marcha 10 Soles. ¡La NASA te quiere en Artemisa!' },
  'Comandante Marciano': { Icon: Medal, text: 'Supervivencia y ciencia a la vez: ¡el máximo rango de la misión!' },
};

const CREW = [
  { name: 'Cmdte. Leo', role: 'Comandante', accent: '#f97316' },
  { name: 'Dra. Vega', role: 'Botánica', accent: '#22c55e' },
  { name: 'Max', role: 'Ingeniero', accent: '#3b82f6' },
] as const;

/**
 * Informe corto: solo la primera frase de valoración (sin el listado de objetos elegidos)
 * conectada con el resultado científico.
 */
function shortReport(report: string, science: number): string {
  const first = (report.split(/(?<=[.!?])\s+/)[0] ?? report).trim();
  if (science <= 0 || /puntos de ciencia/i.test(first)) return first;
  return `${first} Además conseguiste ${science} puntos de ciencia para la NASA.`;
}

export default function GameOverScreen() {
  const outcome = useGameStore((s) => s.outcome);
  const rank = useGameStore((s) => s.rank) ?? 'Cadete Espacial';
  const failedVital = useGameStore((s) => s.failedVital);
  const vitals = useGameStore((s) => s.vitals);
  const science = useGameStore((s) => s.scienceScore);
  const inventory = useGameStore((s) => s.bunkerInventory);
  const history = useGameStore((s) => s.history);
  const debrief = useGameStore((s) => s.debrief);
  const debriefLoading = useGameStore((s) => s.debriefLoading);
  const { loadDebrief, playAgain, resetToMenu, ariaSay } = useGameStore.getState();
  const victory = outcome === 'victory';
  const solsSurvived = victory ? TOTAL_SOLS : Math.max(0, history.length - 1);

  const announced = useRef(false);
  useEffect(() => {
    void loadDebrief();
    if (announced.current) return;
    announced.current = true;
    if (victory) {
      const end = Date.now() + 2500;
      const colors = ['#0b3d91', '#fc3d21', '#ffffff', '#facc15'];
      const frame = () => {
        void confetti({ particleCount: 4, angle: 60, spread: 60, origin: { x: 0 }, colors });
        void confetti({ particleCount: 4, angle: 120, spread: 60, origin: { x: 1 }, colors });
        if (Date.now() < end) requestAnimationFrame(frame);
      };
      frame();
      ariaSay(`¡Misión cumplida! Has alcanzado el rango de ${rank}. Aquí tienes tu informe de la NASA.`);
    } else {
      ariaSay(`La tripulación está a salvo en órbita. Has conseguido el rango de ${rank}. Veamos qué podemos aprender.`);
    }
  }, [loadDebrief, victory, rank, ariaSay]);

  const rankStyle = RANK_STYLE[rank];
  const health = Math.round(vitals.crewHealth);
  const crewStatus = !victory ? 'Evacuado a la órbita · a salvo' : health >= 60 ? 'En plena forma' : health >= 35 ? 'Cansado, pero bien' : 'Con fatiga espacial';

  return (
    <div className="relative min-h-dvh overflow-x-hidden bg-slate-100 px-3 py-4 text-slate-900 sm:px-5 sm:py-6">
      <div className="bg-grid pointer-events-none absolute inset-0" />
      <div className="pointer-events-none absolute left-0 top-0 h-2 w-full bg-nasa-blue" />
      <div className="pointer-events-none absolute left-0 top-2 h-1 w-full bg-nasa-red" />

      <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-col gap-4">
        {/* ---- Cabecera: Reporte Oficial de Misión ---- */}
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="overflow-hidden rounded-2xl border border-slate-700 bg-slate-950 text-white shadow-xl"
        >
          <div className="flex flex-col items-center gap-4 p-4 sm:flex-row sm:p-5">
            <MissionPatch size={96} className="h-[clamp(4.5rem,9vw,6rem)] w-auto shrink-0" />
            <div className="min-w-0 flex-1 text-center sm:text-left">
              <p className="font-mono text-xs font-bold tracking-[0.3em] text-sky-300">ARES-IV // DEBRIEFING · REPORTE OFICIAL DE MISIÓN</p>
              <h1 className={`font-display mt-1 text-[clamp(1.6rem,3.6vw,2.75rem)] font-black leading-tight ${victory ? 'text-amber-300' : 'text-sky-300'}`}>
                {victory ? '¡MISIÓN CUMPLIDA EN MARTE!' : 'EVACUACIÓN DE EMERGENCIA'}
              </h1>
              <p className="mt-1 text-sm text-slate-300 sm:text-base">
                {victory
                  ? `La tripulación resistió los ${TOTAL_SOLS} Soles de la tormenta solar hasta el regreso del rover.`
                  : `En el Sol ${history.length}, el nivel de ${failedVital ? VITAL_META[failedVital].label : 'una barra'} llegó a cero. La nave de rescate llevó a la tripulación a la órbita, sana y salva.`}
              </p>
            </div>
            <span
              className={`shrink-0 rounded-lg border px-3 py-1.5 font-mono text-sm font-bold tracking-wider ${victory ? 'border-emerald-400 text-emerald-300' : 'border-sky-400 text-sky-300'}`}
            >
              {victory ? 'ESTADO: ÉXITO' : 'ESTADO: EVACUADOS'}
            </span>
          </div>
          {/* Estado de supervivencia de la tripulación */}
          <div className="grid gap-px border-t border-slate-800 bg-slate-800 sm:grid-cols-3">
            {CREW.map((c) => (
              <div key={c.name} className="flex items-center gap-3 bg-slate-900 px-4 py-2.5">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border-2 bg-slate-800" style={{ borderColor: c.accent }}>
                  <UserRound className="h-5 w-5 text-slate-200" strokeWidth={1.75} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-mono text-sm font-bold tracking-wider text-white">{c.name.toUpperCase()}</p>
                  <p className="truncate text-xs text-slate-400">
                    {c.role} · {crewStatus}
                  </p>
                </div>
                <span className="flex items-center gap-1 font-mono text-xs font-semibold text-slate-300" title="Salud de la tripulación">
                  <HeartPulse className="h-4 w-4 text-rose-400" strokeWidth={1.75} /> {health}
                </span>
              </div>
            ))}
          </div>
        </motion.header>

        <div className="grid gap-4 lg:grid-cols-2">
          {/* ================= COLUMNA IZQUIERDA ================= */}
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 }} className="flex flex-col gap-4">
            {/* Rango + estadísticas */}
            <section className="hw-panel flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
              <motion.span
                initial={{ scale: 0, rotate: -30 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', delay: 0.4 }}
                className="mx-auto grid h-16 w-16 shrink-0 place-items-center rounded-xl bg-nasa-blue text-white sm:mx-0"
              >
                <rankStyle.Icon className="h-9 w-9" strokeWidth={1.75} />
              </motion.span>
              <div className="min-w-0 flex-1 text-center sm:text-left">
                <p className="flex items-center justify-center gap-1 font-mono text-xs font-bold tracking-[0.2em] text-slate-500 sm:justify-start">
                  <Award size={14} /> RANGO FINAL
                </p>
                <p className="font-display text-xl font-black leading-tight text-nasa-blue">{rank}</p>
                <p className="mt-0.5 text-sm text-slate-600">{rankStyle.text}</p>
              </div>
              <div className="grid shrink-0 grid-cols-2 gap-2 text-center">
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                  <p className="text-xs font-bold text-slate-500">Soles</p>
                  <p className="font-display text-2xl font-black text-nasa-blue">
                    {solsSurvived}
                    <span className="text-sm text-slate-400">/{TOTAL_SOLS}</span>
                  </p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                  <p className="flex items-center justify-center gap-1 text-xs font-bold text-slate-500">
                    <ResourceIcon k="science" className="h-3.5 w-3.5" /> Ciencia
                  </p>
                  <p className="font-display text-2xl font-black text-nasa-blue">{science}</p>
                </div>
              </div>
            </section>

            {/* Instrumentos finales */}
            <section className="hw-panel p-4">
              <p className="mb-2 font-mono text-xs font-bold tracking-[0.2em] text-slate-500">INSTRUMENTOS FINALES</p>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                {VITAL_ORDER.map((k) => (
                  <div key={k} className={`rounded-lg ${failedVital === k ? 'bg-rose-50 ring-2 ring-inset ring-rose-300' : ''}`}>
                    <GaugeMeter label={VITAL_META[k].label} resource={k} value={vitals[k]} />
                  </div>
                ))}
              </div>
            </section>

            {/* Insignias (movidas aquí para equilibrar las columnas) */}
            <section className="hw-panel p-4">
              <p className="mb-3 font-mono text-xs font-bold tracking-[0.2em] text-slate-500">INSIGNIAS DE MISIÓN</p>
              <BadgeShelf size={64} compact />
            </section>
          </motion.div>

          {/* ================= COLUMNA DERECHA ================= */}
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.25 }} className="flex flex-col gap-4">
            {/* Informe de ingeniería (corto) */}
            <section className="hw-panel p-4 sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-mono text-xs font-bold tracking-[0.2em] text-slate-500">INFORME DE INGENIERÍA</p>
                {debrief && (
                  <span className="flex items-center gap-1 rounded-md border border-slate-300 bg-slate-50 px-2 py-0.5 text-xs text-slate-500">
                    {debrief.source === 'gemini' ? <Sparkles className="h-3.5 w-3.5" strokeWidth={1.75} /> : <Bot className="h-3.5 w-3.5" strokeWidth={1.75} />}
                    {debrief.source === 'gemini' ? 'Analizado por Gemini IA' : 'Analizado por A.R.I.A.'}
                  </span>
                )}
              </div>
              {debriefLoading || !debrief ? (
                <div className="flex items-center gap-3 py-8 text-slate-600">
                  <LoaderCircle className="animate-spin text-nasa-blue" /> A.R.I.A. está analizando tus decisiones...
                </div>
              ) : (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <h2 className="mt-2 text-xl font-black leading-tight text-slate-900">{debrief.headline}</h2>
                  <p className="mt-2 leading-relaxed text-slate-700">{shortReport(debrief.report, science)}</p>
                  {debrief.lessons.length > 0 && (
                    <>
                      <p className="mt-4 flex items-center gap-1.5 text-sm font-extrabold text-nasa-blue">
                        <GraduationCap className="h-4 w-4" strokeWidth={1.75} /> Lecciones de ingeniería espacial
                      </p>
                      <ul className="mt-1 space-y-1.5">
                        {debrief.lessons.map((l, i) => (
                          <li key={i} className="flex gap-2 text-sm text-slate-700">
                            <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-nasa-red" /> {l}
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {debrief.bestDecision && (
                      <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-3 text-sm">
                        <p className="flex items-center gap-1.5 font-extrabold text-emerald-700">
                          <Star className="h-4 w-4" strokeWidth={1.75} /> Tu mejor decisión
                        </p>
                        <p className="mt-1 text-slate-700">{debrief.bestDecision}</p>
                      </div>
                    )}
                    {debrief.improvementTip && (
                      <div className="rounded-xl border border-sky-300 bg-sky-50 p-3 text-sm">
                        <p className="flex items-center gap-1.5 font-extrabold text-sky-700">
                          <Lightbulb className="h-4 w-4" strokeWidth={1.75} /> Para la próxima vez
                        </p>
                        <p className="mt-1 text-slate-700">{debrief.improvementTip}</p>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </section>
          </motion.div>

          {/* ================= A TODO EL ANCHO: carga (solo lo que SÍ entró en el búnker) ================= */}
          <motion.section
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="hw-panel w-full p-4 sm:p-5 md:col-span-2 lg:col-span-2"
          >
              <p className="flex items-center gap-2 font-mono text-xs font-bold tracking-[0.2em] text-slate-500">
                <ClipboardList className="h-4 w-4 text-nasa-blue" strokeWidth={1.75} /> SUMINISTROS GANADOS EN LA TRIVIA
                <span className="rounded bg-nasa-blue px-1.5 text-white">{inventory.length}</span>
              </p>
              {inventory.length === 0 ? (
                <p className="mt-2 text-sm text-slate-500">Esta vez no entró ningún suministro en el búnker.</p>
              ) : (
                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                  {inventory.map((id) => (
                    <span
                      key={id}
                      className={`flex min-w-0 items-center gap-2 rounded-lg border-2 bg-white px-2.5 py-1.5 text-sm font-bold text-slate-800 ${RARITY_META[ITEMS_BY_ID[id].rarity].ring}`}
                      title={`${ITEMS_BY_ID[id].name} · ${RARITY_META[ITEMS_BY_ID[id].rarity].label}`}
                    >
                      <ItemIcon id={id} className="h-4 w-4 shrink-0 text-nasa-blue" />
                      <span className="truncate">{ITEMS_BY_ID[id].shortName}</span>
                    </span>
                  ))}
                </div>
              )}
          </motion.section>
        </div>

        {/* ---- Botones ---- */}
        <div className="flex w-full flex-wrap items-center justify-center gap-3 pb-2">
          <motion.button
            type="button"
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => {
              playButtonClick();
              playAgain();
            }}
            className="glow-red font-display flex items-center gap-2 rounded-2xl bg-nasa-red px-6 py-3.5 text-base font-black tracking-wider text-white sm:text-lg"
          >
            <RotateCcw /> Volver a jugar la misión
          </motion.button>
          <button
            type="button"
            onClick={() => {
              playButtonClick();
              resetToMenu();
            }}
            className="flex items-center gap-2 rounded-2xl border border-slate-300 bg-white px-5 py-3.5 font-bold text-slate-700 transition hover:border-nasa-blue hover:text-nasa-blue"
          >
            <House size={18} /> Menú principal
          </button>
        </div>
      </div>
    </div>
  );
}
