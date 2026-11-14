import { useAriaScreenReady } from '../utils/useAriaVoiceState';
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
  TriangleAlert,
  UserRound,
  Wrench,
  type LucideIcon,
} from 'lucide-react';
import { ItemIcon, ResourceIcon } from './icons';
import type { Rank, SolReport, VitalKey } from '../types/game';
import { ITEMS_BY_ID, RARITY_META } from '../data/stationItems';
import { RANK_LABEL, VITAL_META, VITAL_ORDER, useGameStore } from '../store/useGameStore';
import { tr } from '../i18n/core';
import { playButtonClick } from '../utils/soundEffects';
import GaugeMeter from './GaugeMeter';
import MissionPatch from './MissionPatchLogo';
import { BadgeShelf } from './PeriscopeModal';

const RANK_STYLE: Record<Rank, { Icon: LucideIcon; text: string }> = {
  'Cadete Espacial': {
    Icon: UserRound,
    get text() {
      return tr('¡Todo gran astronauta empezó como cadete! Prueba otra estrategia.', 'Every great astronaut started as a cadet! Try another strategy.');
    },
  },
  'Ingeniero de Sistemas Artemisa': {
    Icon: Wrench,
    get text() {
      return tr('Mantuviste la base espacial en marcha durante toda la tormenta. ¡La NASA te quiere en Artemisa!', 'You kept the space base running throughout the storm. NASA wants you on Artemis!');
    },
  },
  'Comandante Marciano': {
    Icon: Medal,
    get text() {
      return tr('Supervivencia y ciencia a la vez: ¡el máximo rango de la misión!', 'Survival and science at the same time: the highest rank of the mission!');
    },
  },
};

const CREW = [
  { get name() { return tr('Cmdte. Leo', 'Cmdr. Leo'); }, get role() { return tr('Comandante', 'Commander'); }, accent: '#f97316' },
  { get name() { return tr('Dra. Vega', 'Dr. Vega'); }, get role() { return tr('Botánica', 'Botanist'); }, accent: '#22c55e' },
  { name: 'Max', get role() { return tr('Ingeniero', 'Engineer'); }, accent: '#3b82f6' },
] as const;

/** Consejo corto según la barra que llegó a cero. */
const FIX_BY_VITAL: Record<VitalKey, string> = {
  get oxygen() {
    return tr('Mantén encendido el reciclador de O2 y pide oxígeno a Houston antes de bajar de 35.', 'Keep the O2 recycler on and order oxygen from Houston before it drops below 35.');
  },
  get power() {
    return tr('Apaga las máquinas que no necesites cuando la Energía baje de 30.', 'Switch off the machines you do not need when Power drops below 30.');
  },
  get food() {
    return tr('Enciende las semillas OSDR (+20 cada 2 Soles) y pide raciones a tiempo.', 'Switch on the OSDR seeds (+20 every 2 Sols) and order rations in time.');
  },
  get shield() {
    return tr('En días de radiación alta elige opciones que protejan el blindaje.', 'On high-radiation days, pick options that protect the shielding.');
  },
  get crewHealth() {
    return tr('La salud baja si O2, comida o blindaje caen por debajo de 25-30: no dejes que lleguen ahí.', 'Health drops if O2, food or shielding fall below 25-30: do not let them get there.');
  },
};

/** Análisis breve de la derrota: qué falló y qué mejorar (máx. 3 + 3 puntos). */
function defeatAnalysis(input: {
  failedVital: VitalKey | null;
  sol: number;
  history: SolReport[];
  complications: VitalKey[];
  brokenMachines: number;
  houstonOrdersPlaced: number;
  correctAnswers: number;
}): { failed: string[]; improve: string[] } {
  const failed: string[] = [];
  const improve: string[] = [];
  const fv = input.failedVital;
  failed.push(tr(`${fv ? VITAL_META[fv].label : 'Una barra'} llegó a 0 en el Sol ${input.sol}.`, `${fv ? VITAL_META[fv].label : 'A bar'} reached 0 on Sol ${input.sol}.`));

  // Barra que más se gastó con las decisiones tomadas
  const drain = VITAL_ORDER.map((k) => ({ k, total: input.history.reduce((sum, r) => sum + Math.min(0, r.deltas[k]), 0) })).sort(
    (a, b) => a.total - b.total,
  )[0];
  if (drain && drain.total < -15 && drain.k !== fv) failed.push(tr(`${VITAL_META[drain.k].label} fue la barra que más gastaste (${drain.total}).`, `${VITAL_META[drain.k].label} was the bar you used up most (${drain.total}).`));

  if (input.complications.length || input.brokenMachines) {
    const n = input.complications.length + input.brokenMachines;
    failed.push(tr(`Terminaste con ${n} ${n === 1 ? 'avería' : 'averías'} sin reparar.`, `You finished with ${n} unfixed ${n === 1 ? 'breakdown' : 'breakdowns'}.`));
  } else if (input.correctAnswers <= 3) {
    failed.push(tr(`Solo ${input.correctAnswers} aciertos en la trivia: la base espacial empezó con poco equipo.`, `Only ${input.correctAnswers} right answers in the trivia: the space base started with little equipment.`));
  }

  if (fv) improve.push(FIX_BY_VITAL[fv]);
  if (input.complications.length || input.brokenMachines) improve.push(tr('Repara las averías pronto con el botón Reparar: vuelven a encender sus máquinas.', 'Fix breakdowns early with the Repair button: it switches their machines back on.'));
  if (input.houstonOrdersPlaced === 0) improve.push(tr('Pide suministros a Houston por la antena: tardan 2 Soles, así que anticípate.', 'Order supplies from Houston with the antenna: they take 2 Sols, so plan ahead.'));
  else improve.push(tr('Vigila las barras por debajo de 35: actuar un Sol antes lo cambia todo.', 'Watch the bars below 35: acting one Sol earlier changes everything.'));
  return { failed: failed.slice(0, 3), improve: improve.slice(0, 3) };
}

/**
 * Informe corto: solo la primera frase de valoración (sin el listado de objetos elegidos)
 * conectada con el resultado científico.
 */
function shortReport(report: string, science: number): string {
  const first = (report.split(/(?<=[.!?])\s+/)[0] ?? report).trim();
  if (science <= 0 || /puntos de ciencia/i.test(first)) return first;
  return tr(`${first} Además conseguiste ${science} puntos de ciencia para la NASA.`, `${first} You also earned ${science} science points for NASA.`);
}

export default function GameOverScreen() {
  useAriaScreenReady();
  const outcome = useGameStore((s) => s.outcome);
  const rank = useGameStore((s) => s.rank) ?? 'Cadete Espacial';
  const failedVital = useGameStore((s) => s.failedVital);
  const vitals = useGameStore((s) => s.vitals);
  const science = useGameStore((s) => s.scienceScore);
  const inventory = useGameStore((s) => s.bunkerInventory);
  const history = useGameStore((s) => s.history);
  const totalSols = useGameStore((s) => s.totalSols);
  const debrief = useGameStore((s) => s.debrief);
  const debriefLoading = useGameStore((s) => s.debriefLoading);
  const { loadDebrief, playAgain, resetToMenu, ariaSay } = useGameStore.getState();
  const complications = useGameStore((s) => s.complications);
  const brokenMachines = useGameStore((s) => s.brokenMachines);
  const houstonOrdersPlaced = useGameStore((s) => s.houstonOrdersPlaced);
  const quizAnswers = useGameStore((s) => s.quizAnswers);
  const victory = outcome === 'victory';
  const solsSurvived = victory ? totalSols : Math.max(0, history.length - 1);
  const failSol = Math.max(1, history.length);
  const analysis = victory
    ? null
    : defeatAnalysis({
        failedVital,
        sol: failSol,
        history,
        complications,
        brokenMachines: brokenMachines.length,
        houstonOrdersPlaced,
        correctAnswers: quizAnswers.filter((a) => a.correct).length,
      });

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
      ariaSay(tr(`¡Misión cumplida! Has alcanzado el rango de ${RANK_LABEL[rank]}. Aquí tienes tu informe de la NASA.`, `Mission accomplished! You reached the rank of ${RANK_LABEL[rank]}. Here is your NASA report.`));
    } else {
      ariaSay(tr(`La tripulación está a salvo en órbita. Has conseguido el rango de ${RANK_LABEL[rank]}. Veamos qué podemos aprender.`, `The crew is safe in orbit. You earned the rank of ${RANK_LABEL[rank]}. Let's see what we can learn.`));
    }
  }, [loadDebrief, victory, rank, ariaSay]);

  const rankStyle = RANK_STYLE[rank];
  const health = Math.round(vitals.crewHealth);
  const crewStatus = !victory
    ? tr('Evacuado a la órbita · a salvo', 'Evacuated to orbit · safe')
    : health >= 60
      ? tr('En plena forma', 'In great shape')
      : health >= 35
        ? tr('Cansado, pero bien', 'Tired, but fine')
        : tr('Con fatiga espacial', 'With space fatigue');

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
              <p className="font-mono text-xs font-bold tracking-[0.3em] text-sky-300">ARES-IV // DEBRIEFING · {tr('REPORTE OFICIAL DE MISIÓN', 'OFFICIAL MISSION REPORT')}</p>
              <h1 className={`font-display mt-1 text-[clamp(1.6rem,3.6vw,2.75rem)] font-black leading-tight ${victory ? 'text-amber-300' : 'text-sky-300'}`}>
                {victory ? tr('¡MISIÓN CUMPLIDA EN MARTE!', 'MISSION ACCOMPLISHED ON MARS!') : tr('EVACUACIÓN DE EMERGENCIA', 'EMERGENCY EVACUATION')}
              </h1>
              <p className="mt-1 text-sm text-slate-300 sm:text-base">
                {victory
                  ? tr(
                      `La tripulación resistió los ${totalSols} Soles de la tormenta solar hasta el regreso del rover.`,
                      `The crew held out through all ${totalSols} Sols of the solar storm until the rover came back.`,
                    )
                  : tr(
                      `En el Sol ${failSol}, el nivel de ${failedVital ? VITAL_META[failedVital].label : 'una barra'} llegó a cero. La nave de rescate llevó a la tripulación a la órbita, sana y salva.`,
                      `On Sol ${failSol}, the ${failedVital ? VITAL_META[failedVital].label : 'bar'} level reached zero. The rescue ship took the crew to orbit, safe and sound.`,
                    )}
              </p>
            </div>
            <span
              className={`shrink-0 rounded-lg border px-3 py-1.5 font-mono text-sm font-bold tracking-wider ${victory ? 'border-emerald-400 text-emerald-300' : 'border-sky-400 text-sky-300'}`}
            >
              {victory ? tr('ESTADO: ÉXITO', 'STATUS: SUCCESS') : tr('ESTADO: EVACUADOS', 'STATUS: EVACUATED')}
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
                <span className="flex items-center gap-1 font-mono text-xs font-semibold text-slate-300" title={tr('Salud de la tripulación', 'Crew health')}>
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
                  <Award size={14} /> {tr('RANGO FINAL', 'FINAL RANK')}
                </p>
                <p className="font-display text-xl font-black leading-tight text-nasa-blue">{RANK_LABEL[rank]}</p>
                <p className="mt-0.5 text-sm text-slate-600">{rankStyle.text}</p>
              </div>
              <div className="grid shrink-0 grid-cols-2 gap-2 text-center">
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                  <p className="text-xs font-bold text-slate-500">{tr('Soles', 'Sols')}</p>
                  <p className="font-display text-2xl font-black text-nasa-blue">
                    {solsSurvived}
                    <span className="text-sm text-slate-400">/{totalSols}</span>
                  </p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                  <p className="flex items-center justify-center gap-1 text-xs font-bold text-slate-500">
                    <ResourceIcon k="science" className="h-3.5 w-3.5" /> {tr('Ciencia', 'Science')}
                  </p>
                  <p className="font-display text-2xl font-black text-nasa-blue">{science}</p>
                </div>
              </div>
            </section>

            {/* Instrumentos finales */}
            <section className="hw-panel p-4">
              <p className="mb-2 font-mono text-xs font-bold tracking-[0.2em] text-slate-500">{tr('INSTRUMENTOS FINALES', 'FINAL INSTRUMENTS')}</p>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                {VITAL_ORDER.map((k) => (
                  <div key={k} className={`rounded-lg ${failedVital === k ? 'bg-rose-50 ring-2 ring-inset ring-rose-300' : ''}`}>
                    <GaugeMeter label={VITAL_META[k].label} resource={k} value={vitals[k]} />
                  </div>
                ))}
              </div>
            </section>

            {/* Derrota: qué falló y qué mejorar (breve) */}
            {analysis && (
              <section className="hw-panel border-l-4 border-l-nasa-red p-4" aria-label={tr('Qué falló y cómo mejorar', 'What went wrong and how to improve')}>
                <p className="flex items-center gap-1.5 font-mono text-xs font-bold tracking-[0.2em] text-nasa-red">
                  <TriangleAlert className="h-4 w-4" strokeWidth={1.75} /> {tr('ANÁLISIS DE LA EVACUACIÓN', 'EVACUATION ANALYSIS')}
                </p>
                <div className="mt-2 grid gap-3 sm:grid-cols-2">
                  <div>
                    <p className="text-sm font-extrabold text-slate-800">{tr('Qué falló', 'What went wrong')}</p>
                    <ul className="mt-1 space-y-1">
                      {analysis.failed.map((t) => (
                        <li key={t} className="flex gap-1.5 text-sm text-slate-700">
                          <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-nasa-red" /> {t}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="text-sm font-extrabold text-slate-800">{tr('Qué mejorar', 'What to improve')}</p>
                    <ul className="mt-1 space-y-1">
                      {analysis.improve.map((t) => (
                        <li key={t} className="flex gap-1.5 text-sm text-slate-700">
                          <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-nasa-blue" strokeWidth={1.75} /> {t}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </section>
            )}

            {/* Insignias: crece para que la columna llegue hasta abajo (sin huecos) */}
            <section className="hw-panel flex flex-1 flex-col p-4">
              <p className="mb-3 font-mono text-xs font-bold tracking-[0.2em] text-slate-500">{tr('INSIGNIAS DE MISIÓN', 'MISSION BADGES')}</p>
              <BadgeShelf size={64} compact />
            </section>
          </motion.div>

          {/* ================= COLUMNA DERECHA ================= */}
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.25 }} className="flex flex-col gap-4">
            {/* Informe de ingeniería (corto): ocupa todo el alto de la columna */}
            <section className="hw-panel flex-1 p-4 sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-mono text-xs font-bold tracking-[0.2em] text-slate-500">{tr('INFORME DE INGENIERÍA', 'ENGINEERING REPORT')}</p>
                {debrief && (
                  <span className="flex items-center gap-1 rounded-md border border-slate-300 bg-slate-50 px-2 py-0.5 text-xs text-slate-500">
                    {debrief.source === 'gemini' ? <Sparkles className="h-3.5 w-3.5" strokeWidth={1.75} /> : <Bot className="h-3.5 w-3.5" strokeWidth={1.75} />}
                    {debrief.source === 'gemini' ? tr('Analizado por Gemini IA', 'Analyzed by Gemini AI') : tr('Analizado por A.R.I.A.', 'Analyzed by A.R.I.A.')}
                  </span>
                )}
              </div>
              {debriefLoading || !debrief ? (
                <div className="flex items-center gap-3 py-8 text-slate-600">
                  <LoaderCircle className="animate-spin text-nasa-blue" /> {tr('A.R.I.A. está analizando tus decisiones...', 'A.R.I.A. is analyzing your decisions...')}
                </div>
              ) : (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <h2 className="mt-2 text-xl font-black leading-tight text-slate-900">{debrief.headline}</h2>
                  <p className="mt-2 leading-relaxed text-slate-700">{shortReport(debrief.report, science)}</p>
                  {debrief.lessons.length > 0 && (
                    <>
                      <p className="mt-4 flex items-center gap-1.5 text-sm font-extrabold text-nasa-blue">
                        <GraduationCap className="h-4 w-4" strokeWidth={1.75} /> {tr('Lecciones de ingeniería espacial', 'Space engineering lessons')}
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
                          <Star className="h-4 w-4" strokeWidth={1.75} /> {tr('Tu mejor decisión', 'Your best decision')}
                        </p>
                        <p className="mt-1 text-slate-700">{debrief.bestDecision}</p>
                      </div>
                    )}
                    {debrief.improvementTip && (
                      <div className="rounded-xl border border-sky-300 bg-sky-50 p-3 text-sm">
                        <p className="flex items-center gap-1.5 font-extrabold text-sky-700">
                          <Lightbulb className="h-4 w-4" strokeWidth={1.75} /> {tr('Para la próxima vez', 'Next time')}
                        </p>
                        <p className="mt-1 text-slate-700">{debrief.improvementTip}</p>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </section>
          </motion.div>

          {/* ================= A TODO EL ANCHO: carga (solo lo que SÍ entró en la base espacial) ================= */}
          <motion.section
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="hw-panel w-full p-4 sm:p-5 md:col-span-2 lg:col-span-2"
          >
              <p className="flex items-center gap-2 font-mono text-xs font-bold tracking-[0.2em] text-slate-500">
                <ClipboardList className="h-4 w-4 text-nasa-blue" strokeWidth={1.75} /> {tr('SUMINISTROS GANADOS EN LA TRIVIA', 'SUPPLIES WON IN THE TRIVIA')}
                <span className="rounded bg-nasa-blue px-1.5 text-white">{inventory.length}</span>
              </p>
              {inventory.length === 0 ? (
                <p className="mt-2 text-sm text-slate-500">{tr('Esta vez no entró ningún suministro en la base espacial.', 'This time no supplies made it into the space base.')}</p>
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
            <RotateCcw /> {tr('Volver a jugar la misión', 'Play the mission again')}
          </motion.button>
          <button
            type="button"
            onClick={() => {
              playButtonClick();
              resetToMenu();
            }}
            className="flex items-center gap-2 rounded-2xl border border-slate-300 bg-white px-5 py-3.5 font-bold text-slate-700 transition hover:border-nasa-blue hover:text-nasa-blue"
          >
            <House size={18} /> {tr('Menú principal', 'Main menu')}
          </button>
        </div>
      </div>
    </div>
  );
}
