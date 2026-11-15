import { useEffect, useMemo, useRef, useState, type MouseEvent } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import confetti from 'canvas-confetti';
import { Backpack, Check, PackageOpen, Rocket, Star, Wrench, X } from 'lucide-react';
import type { Difficulty, ItemId, QuizAnswerRecord, VitalKey } from '../../types/game';
import { ItemIcon } from '../icons';
import { ITEMS_BY_ID, RARITY_META } from '../../data/stationItems';
import { DIFFICULTY_META } from '../../data/triviaQuestions';
import { VITAL_ORDER, categoryStats, getMissionProfile, useGameStore } from '../../store/useGameStore';
import { playButtonClick, playUnlock } from '../../utils/soundEffects';
import { Phase1Header, SystemLabel } from './Phase1Shared';
import SpaceBackdrop from '../SpaceBackdrop';
import { tr } from '../../i18n/core';

const FEEDBACK_MS = 1100;

/** Dificultad solo con los colores oficiales: gris sobrio → Azul NASA → Rojo Misión. */
const DIFFICULTY_CLS: Record<Difficulty, string> = {
  easy: 'border-slate-200 bg-slate-50 text-slate-700',
  medium: 'border-nasa-blue bg-nasa-blue text-white',
  hard: 'border-nasa-red bg-nasa-red text-white',
};

/** Acabado de tarjeta del Selector de Modo (credencial): esquinas grandes, borde grueso y sombra suave. */
const CARD = 'rounded-[1.75rem] border-[3px] border-slate-200 bg-white shadow-lg';

const getReadyRules = () => [
  { Icon: Check, title: tr('Aciertas', 'Right answer'), text: tr('un objeto de esa rama vuela a tu base espacial.', 'an item from that branch flies to your space base.') },
  { Icon: Star, title: tr('Difícil', 'Hard'), text: tr('objetos Épicos y Legendarios NASA.', 'Epic and NASA Legendary items.') },
  { Icon: Wrench, title: tr('0 aciertos en una rama', '0 right in a branch'), text: tr('empezarás con una avería en ella.', 'you will start with a breakdown in it.') },
  { Icon: PackageOpen, title: tr('Si te va mal', 'If it goes badly'), text: tr('tendrás una cápsula de rescate gratis.', 'you get a free rescue capsule.') },
];

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

interface Flyer {
  key: number;
  id: ItemId;
  from: { x: number; y: number };
  to: { x: number; y: number };
}

function GiantTimer({ timeLeft, totalSeconds }: { timeLeft: number; totalSeconds: number }) {
  const urgent = timeLeft <= 10;
  const pct = Math.min(100, (timeLeft / totalSeconds) * 100);
  return (
    <motion.div
      animate={urgent ? { scale: [1, 1.08, 1] } : {}}
      transition={{ duration: 1, repeat: urgent ? Infinity : 0 }}
      className={`font-display relative mt-1 overflow-hidden rounded-2xl border-[3px] px-5 py-1 text-center shadow-lg ${
        urgent ? 'glow-red border-nasa-red bg-red-50 text-nasa-red' : 'border-nasa-blue bg-white text-nasa-blue shadow-[0_12px_28px_-14px_rgba(11,61,145,0.7)]'
      }`}
      aria-label={tr(`Quedan ${timeLeft} segundos`, `${timeLeft} seconds left`)}
    >
      <div className="text-xs font-bold tracking-[0.3em] opacity-80">{tr('TIEMPO', 'TIME')}</div>
      <div className="text-5xl font-black tabular-nums leading-none">{timeLeft}s</div>
      <div className="absolute inset-x-0 bottom-0 h-1.5 bg-slate-200">
        <motion.div className={`h-full ${urgent ? 'bg-nasa-red' : 'bg-gradient-to-r from-nasa-blue to-orange-400'}`} animate={{ width: `${pct}%` }} transition={{ duration: 0.4 }} />
      </div>
    </motion.div>
  );
}

/** 1A/1B · Pantalla "Preparados" + trivia contrarreloj. */
export default function Phase1Quiz() {
  const stage = useGameStore((s) => s.phase1Stage);
  const queue = useGameStore((s) => s.quizQueue);
  const index = useGameStore((s) => s.quizIndex);
  const answers = useGameStore((s) => s.quizAnswers);
  const timeLeft = useGameStore((s) => s.timeLeft);
  const missionDifficulty = useGameStore((s) => s.missionDifficulty);
  const quizSeconds = getMissionProfile(missionDifficulty).quizSeconds;
  const inventory = useGameStore((s) => s.bunkerInventory);
  const { beginQuiz, answerQuiz, nextQuizQuestion, tickTimer } = useGameStore.getState();

  const q = queue[index];
  const answerOptions = getMissionProfile(missionDifficulty).answerOptions;
  // Modo fácil: la correcta (answers[0]) + una incorrecta al azar; modo normal: las 4
  const shuffled = useMemo(
    () => (q ? shuffle([q.answers[0], ...shuffle(q.answers.slice(1)).slice(0, Math.max(1, answerOptions - 1))]) : []),
    [q, answerOptions],
  );
  const [chosen, setChosen] = useState<string | null>(null);
  const [result, setResult] = useState<QuizAnswerRecord | null>(null);
  const [flyers, setFlyers] = useState<Flyer[]>([]);
  const inventoryRef = useRef<HTMLDivElement>(null);
  const flyerKey = useRef(0);

  // Reloj
  useEffect(() => {
    if (stage !== 'quiz') return;
    const t = setInterval(() => tickTimer(), 1000);
    return () => clearInterval(t);
  }, [stage, tickTimer]);

  const stats = categoryStats(answers);
  const correctCount = answers.filter((a) => a.correct).length;
  const wrongCount = answers.length - correctCount;

  const choose = (answer: string, e: MouseEvent) => {
    if (result || stage !== 'quiz') return;
    setChosen(answer);
    const r = answerQuiz(answer);
    setResult(r);
    if (r?.correct) {
      void confetti({
        particleCount: 30,
        spread: 60,
        startVelocity: 25,
        scalar: 0.7,
        origin: { x: e.clientX / window.innerWidth, y: e.clientY / window.innerHeight },
        colors: ['#0b3d91', '#fc3d21', '#ffffff', '#facc15'],
      });
      if (r.rewardItemId && inventoryRef.current) {
        const rect = inventoryRef.current.getBoundingClientRect();
        const key = ++flyerKey.current;
        setFlyers((f) => [
          ...f,
          {
            key,
            id: r.rewardItemId!,
            from: { x: e.clientX, y: e.clientY },
            to: { x: rect.left + rect.width / 2, y: rect.top + 40 },
          },
        ]);
        playUnlock();
      }
    }
    setTimeout(() => {
      setChosen(null);
      setResult(null);
      nextQuizQuestion();
    }, FEEDBACK_MS);
  };

  const reward = result?.rewardItemId ? ITEMS_BY_ID[result.rewardItemId] : null;

  return (
    <div className="relative flex min-h-dvh flex-col overflow-x-hidden bg-slate-100 lg:h-dvh lg:overflow-hidden">
      <div className="bg-grid pointer-events-none absolute inset-0 opacity-60" />
      <SpaceBackdrop showRocket={stage === 'ready'} />
      {stage === 'quiz' && timeLeft <= 10 && (
        <motion.div
          className="pointer-events-none absolute inset-0 z-0 border-[6px] border-nasa-red"
          animate={{ opacity: [0.2, 1, 0.2] }}
          transition={{ duration: 1, repeat: Infinity }}
        />
      )}
      <Phase1Header
        step={stage === 'ready' ? 1 : 2}
        title={tr('Trivia Contrarreloj NASA', 'NASA Countdown Trivia')}
        subtitle={tr('Cada acierto manda un objeto a la base. ¡Las difíciles dan objetos legendarios!', 'Right answers add supplies. Hard questions give legendary items!')}
        triviaSeconds={quizSeconds}
        right={stage === 'quiz' ? <GiantTimer timeLeft={timeLeft} totalSeconds={quizSeconds} /> : undefined}
      />

      <main className="relative z-10 mx-auto flex w-full max-w-6xl min-h-0 flex-1 flex-col gap-4 p-4 lg:flex-row">
        {/* ===== Pregunta ===== */}
        <section className={`${CARD} relative flex min-h-[520px] flex-1 flex-col overflow-hidden p-6`}>
          {/* Cinta superior tipo credencial (Azul NASA → azul claro → Rojo Misión) */}
          <span className="pointer-events-none absolute inset-x-0 top-0 h-3 bg-gradient-to-r from-nasa-blue via-blue-400 to-nasa-red" aria-hidden />
          {stage === 'ready' && (
            <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
              <span className="relative grid h-24 w-24 place-items-center">
                <motion.span
                  className="absolute inset-0 rounded-full"
                  style={{ background: 'radial-gradient(circle, rgba(249,115,22,0.22) 0%, transparent 70%)' }}
                  animate={{ scale: [1, 1.15, 1] }}
                  transition={{ duration: 1.8, repeat: Infinity }}
                />
                <motion.span
                  animate={{ y: [0, -8, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="relative grid h-20 w-20 place-items-center rounded-full border-[3px] border-slate-200 bg-white text-nasa-red shadow-md"
                >
                  <Rocket className="h-10 w-10 rotate-45" strokeWidth={1.75} />
                </motion.span>
              </span>
              <h2 className="font-display text-4xl font-black text-nasa-blue">{tr('¿Listos, cadetes?', 'Ready, cadets?')}</h2>
              <p className="max-w-xl text-lg text-slate-700">
                {tr('Tienes', 'You have')} <b>{tr(`${quizSeconds} segundos`, `${quizSeconds} seconds`)}</b>{' '}
                {tr('para responder todas las preguntas que puedas. Empiezan fáciles y se ponen difíciles.', 'to answer as many questions as you can. They start easy and get harder.')}
              </p>
              <div className="grid max-w-2xl gap-2 text-left text-base text-slate-700 sm:grid-cols-2">
                {getReadyRules().map(({ Icon, title, text }) => (
                  <p key={title} className="flex items-start gap-2.5 rounded-xl bg-slate-50 p-3">
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-orange-100 text-orange-600">
                      <Icon className="h-4 w-4" strokeWidth={2} />
                    </span>

                    <span>
                      <b className="text-slate-900">{title}</b> → {text}
                    </span>
                  </p>
                ))}
              </div>
              <motion.button
                type="button"
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => {
                  playButtonClick();
                  beginQuiz();
                }}
                className="font-display glow-red mt-2 flex items-center gap-3 rounded-2xl bg-nasa-red px-8 py-4 text-xl font-black tracking-wider text-white"
              >
                <Rocket size={22} /> {tr('¡EMPEZAR LA MISIÓN!', 'START THE MISSION!')}
              </motion.button>
            </div>
          )}

          {stage === 'quiz' && q && (
            <AnimatePresence mode="wait">
              <motion.div
                key={q.id}
                initial={{ opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -40 }}
                transition={{ duration: 0.18 }}
                className="flex h-full flex-1 flex-col justify-between gap-5"
              >
                {/* Mitad superior (~40 %): etiquetas + pregunta grande centrada */}
                <div className="flex basis-2/5 flex-col items-center justify-center gap-4 text-center">
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    <span className={`rounded-full border-2 px-3.5 py-1 font-mono text-sm font-bold tracking-wider ${DIFFICULTY_CLS[q.difficulty]}`}>
                      {DIFFICULTY_META[q.difficulty].label}
                    </span>
                    <span className="rounded-full border-2 border-slate-200 bg-slate-50 px-3.5 py-1 text-sm">
                      <SystemLabel cat={q.category} />
                    </span>
                    <span
                      className="flex items-center gap-1 rounded-full border-2 border-emerald-300 bg-emerald-50 px-3.5 py-1 text-sm font-bold text-emerald-700"
                    >
                      <Check className="h-4 w-4" strokeWidth={3} /> {correctCount}
                    </span>
                    <span
                      className="flex items-center gap-1 rounded-full border-2 border-red-300 bg-red-50 px-3.5 py-1 text-sm font-bold text-nasa-red"
                    >
                      <X className="h-4 w-4" strokeWidth={3} /> {wrongCount}
                    </span>
                  </div>
                  <h2 className="font-display max-w-3xl text-2xl font-black leading-snug text-slate-900 md:text-3xl">{q.question}</h2>
                  {/* Hueco fijo para la respuesta (evita saltos de layout) */}
                  <div className="flex h-10 items-center justify-center">
                    <AnimatePresence>
                      {result && (
                        <motion.p
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          className={`flex items-center gap-2 text-lg font-bold ${result.correct ? 'text-nasa-blue' : 'text-slate-600'}`}
                        >
                          {reward && <ItemIcon id={reward.id} className="h-7 w-7" />}
                          {result.correct
                            ? reward
                              ? tr(`¡Correcto! ${reward.shortName} (${RARITY_META[reward.rarity].label}) a la base espacial`, `Correct! ${reward.shortName} (${RARITY_META[reward.rarity].label}) to the space base`)
                              : tr('¡Correcto!', 'Correct!')
                            : tr('Casi... ¡a por la siguiente!', 'Almost... on to the next one!')}
                        </motion.p>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                {/* Mitad inferior (~60 %): 4 respuestas en cuadrícula 2x2 (modo fácil: 2 en una fila) */}
                <div className={`grid flex-1 basis-3/5 grid-cols-2 gap-4 ${shuffled.length > 2 ? 'grid-rows-2' : 'grid-rows-1'}`}>
                  {shuffled.map((ans, i) => {
                    const isCorrect = ans === q.answers[0];
                    const picked = chosen === ans;
                    let cls = 'border-slate-200 bg-white text-slate-800 shadow-md hover:border-orange-400 hover:shadow-[0_18px_40px_-18px_rgba(249,115,22,0.55)]';
                    let letterCls = 'bg-slate-100 text-nasa-blue group-hover:bg-orange-100 group-hover:text-orange-600';
                    if (result) {
                      if (isCorrect) {
                        cls = 'border-nasa-blue bg-nasa-blue text-white shadow-[0_18px_40px_-18px_rgba(11,61,145,0.7)]';
                        letterCls = 'bg-white/20 text-white';
                      } else if (picked) {
                        cls = 'border-nasa-red bg-white text-nasa-red shadow-md';
                        letterCls = 'bg-red-50 text-nasa-red';
                      } else {
                        cls = 'border-slate-200 bg-slate-50 text-slate-400 shadow-sm';
                        letterCls = 'bg-slate-100 text-slate-400';
                      }
                    }
                    return (
                      <motion.button
                        key={ans}
                        type="button"
                        whileHover={result ? {} : { y: -4 }}
                        whileTap={result ? {} : { scale: 0.97 }}
                        animate={result && picked && !isCorrect ? { x: [0, -8, 8, -5, 5, 0] } : {}}
                        disabled={Boolean(result)}
                        onClick={(e) => choose(ans, e)}
                        className={`group relative flex min-h-[110px] items-center justify-center rounded-[1.5rem] border-[3px] p-6 text-center text-2xl font-bold transition-colors disabled:cursor-default ${cls}`}
                      >
                        <span className={`absolute left-3 top-3 grid h-8 w-8 place-items-center rounded-full font-mono text-sm font-bold transition-colors ${letterCls}`}>
                          {'ABCD'[i]}
                        </span>
                        {result && isCorrect && <Check className="absolute right-4 top-3" size={22} />}
                        {result && picked && !isCorrect && <X className="absolute right-4 top-3" size={22} />}
                        {ans}
                      </motion.button>
                    );
                  })}
                </div>
              </motion.div>
            </AnimatePresence>
          )}
        </section>

        {/* ===== Inventario por ramas ===== */}

        <aside ref={inventoryRef} className={`${CARD} relative flex w-full shrink-0 flex-col gap-2 overflow-hidden p-4 pt-5 lg:w-80`}>
          <span className="pointer-events-none absolute inset-x-0 top-0 h-2 bg-nasa-blue" aria-hidden />

          <p className="flex items-center gap-2 text-sm font-extrabold text-nasa-blue">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-orange-100 text-orange-600">
              <Backpack className="h-4 w-4" strokeWidth={2} />
            </span> {inventory.length} {inventory.length === 1 ? tr('objeto conseguido', 'item obtained') : tr('objetos conseguidos', 'items obtained')}
          </p>
          <div className="thin-scroll grid min-h-0 flex-1 gap-2 overflow-y-auto">
            {VITAL_ORDER.map((cat: VitalKey) => {
              const items = inventory.filter((id) => ITEMS_BY_ID[id].category === cat);
              const st = stats[cat];
              return (
                <div key={cat} className="rounded-xl bg-slate-50 p-2.5">

                  <div className="flex items-center justify-between text-xs">
                    <SystemLabel cat={cat} />
                    <span className={`font-extrabold ${st.answered > 0 && st.correct === 0 ? 'text-nasa-red' : 'text-slate-500'}`}>
                      {st.correct}/{st.answered} {tr('aciertos', 'right')}
                    </span>
                  </div>
                  <div className="mt-1 flex min-h-[30px] flex-wrap gap-1">
                    {items.length === 0 && <span className="text-xs text-slate-400">{tr('Sin objetos todavía', 'No items yet')}</span>}
                    <AnimatePresence>
                      {items.map((id) => (
                        <motion.span
                          key={id}
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: 'spring', delay: 0.55 }}
                          className={`flex items-center gap-1 rounded-md border-2 bg-white px-1.5 py-0.5 text-xs font-bold text-slate-800 ${RARITY_META[ITEMS_BY_ID[id].rarity].ring}`}
                        >
                          <ItemIcon id={id} className="h-4 w-4 text-nasa-blue" />
                          {ITEMS_BY_ID[id].shortName}
                        </motion.span>
                      ))}
                    </AnimatePresence>
                  </div>
                </div>
              );
            })}
          </div>
        </aside>
      </main>

      {/* Objetos volando al inventario */}
      {flyers.map((f) => (
        <motion.div
          key={f.key}
          className="pointer-events-none fixed z-50 grid h-12 w-12 place-items-center rounded-full border-[3px] border-orange-400 bg-white text-nasa-blue shadow-lg"
          style={{ left: 0, top: 0 }}
          initial={{ x: f.from.x - 24, y: f.from.y - 24, scale: 0.4, rotate: -20 }}
          animate={{
            x: [f.from.x - 24, (f.from.x + f.to.x) / 2 - 24, f.to.x - 24],
            y: [f.from.y - 24, Math.min(f.from.y, f.to.y) - 140, f.to.y - 24],
            scale: [0.4, 1.6, 0.6],
            rotate: [-20, 10, 360],
          }}
          transition={{ duration: 0.6, ease: 'easeInOut' }}
          onAnimationComplete={() => setFlyers((all) => all.filter((x) => x.key !== f.key))}
        >
          <ItemIcon id={f.id} className="h-7 w-7" />
        </motion.div>
      ))}
    </div>
  );
}
