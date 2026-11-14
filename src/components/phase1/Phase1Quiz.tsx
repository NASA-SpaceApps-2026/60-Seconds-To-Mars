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

const FEEDBACK_MS = 1100;

/** Dificultad solo con los colores oficiales: gris sobrio → Azul NASA → Rojo Misión. */
const DIFFICULTY_CLS: Record<Difficulty, string> = {
  easy: 'border-slate-300 bg-white text-slate-700',
  medium: 'border-nasa-blue bg-white text-nasa-blue',
  hard: 'border-nasa-red bg-nasa-red text-white',
};

const READY_RULES = [
  { Icon: Check, title: 'Aciertas', text: 'un objeto de esa rama vuela a tu búnker.' },
  { Icon: Star, title: 'Difícil', text: 'objetos Épicos y Legendarios NASA.' },
  { Icon: Wrench, title: '0 aciertos en una rama', text: 'empezarás con una avería en ella.' },
  { Icon: PackageOpen, title: 'Si te va mal', text: 'tendrás una cápsula de rescate gratis.' },
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
      className={`font-display relative overflow-hidden rounded-2xl border-2 px-7 py-1 text-center shadow ${
        urgent ? 'glow-red border-nasa-red bg-red-50 text-nasa-red' : 'border-nasa-blue bg-white text-nasa-blue'
      }`}
      aria-label={`Quedan ${timeLeft} segundos`}
    >
      <div className="text-xs font-bold tracking-[0.3em] opacity-80">TIEMPO</div>
      <div className="text-6xl font-black tabular-nums leading-none">{timeLeft}s</div>
      <div className="absolute inset-x-0 bottom-0 h-1.5 bg-slate-200">
        <motion.div className={`h-full ${urgent ? 'bg-nasa-red' : 'bg-nasa-blue'}`} animate={{ width: `${pct}%` }} transition={{ duration: 0.4 }} />
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
  const shuffled = useMemo(() => (q ? shuffle([...q.answers]) : []), [q]);
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
    <div className="relative flex min-h-dvh flex-col bg-slate-100 lg:h-dvh lg:overflow-hidden">
      <div className="bg-grid pointer-events-none absolute inset-0" />
      {stage === 'quiz' && timeLeft <= 10 && (
        <motion.div
          className="pointer-events-none absolute inset-0 z-0 border-[6px] border-nasa-red"
          animate={{ opacity: [0.2, 1, 0.2] }}
          transition={{ duration: 1, repeat: Infinity }}
        />
      )}
      <Phase1Header
        step={stage === 'ready' ? 1 : 2}
        title="Trivia Contrarreloj NASA"
        subtitle="Cada acierto manda un objeto de esa rama al búnker. ¡Las difíciles dan objetos legendarios!"
        triviaSeconds={quizSeconds}
        right={stage === 'quiz' ? <GiantTimer timeLeft={timeLeft} totalSeconds={quizSeconds} /> : undefined}
      />

      <main className="relative z-10 mx-auto flex w-full max-w-6xl min-h-0 flex-1 flex-col gap-4 p-4 lg:flex-row">
        {/* ===== Pregunta ===== */}
        <section className="hw-panel relative flex min-h-[520px] flex-1 flex-col p-6">
          {stage === 'ready' && (
            <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
              <motion.div
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="grid h-20 w-20 place-items-center rounded-lg border border-slate-300 bg-slate-100 text-nasa-blue"
              >
                <Rocket className="h-11 w-11" strokeWidth={1.75} />
              </motion.div>
              <h2 className="font-display text-4xl font-black text-nasa-blue">¿Listos, cadetes?</h2>
              <p className="max-w-xl text-lg text-slate-700">
                Tienes <b>{quizSeconds} segundos</b> para responder todas las preguntas que puedas. Empiezan fáciles y se ponen difíciles.
              </p>
              <div className="grid max-w-2xl gap-2 text-left text-base text-slate-700 sm:grid-cols-2">
                {READY_RULES.map(({ Icon, title, text }) => (
                  <p key={title} className="flex items-start gap-2 rounded-lg border border-slate-300 bg-white p-3">
                    <Icon className="mt-0.5 h-5 w-5 shrink-0 text-nasa-blue" strokeWidth={1.75} />
                    <span>
                      <b className="text-slate-900">{title}</b> → {text}
                    </span>
                  </p>
                ))}
              </div>
              <motion.button
                type="button"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  playButtonClick();
                  beginQuiz();
                }}
                className="font-display glow-red mt-2 flex items-center gap-3 rounded-2xl bg-nasa-red px-10 py-5 text-2xl font-black tracking-wider text-white"
              >
                <Rocket /> ¡EMPEZAR LA MISIÓN!
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
                    <span className={`rounded-md border px-3 py-1 text-sm font-bold ${DIFFICULTY_CLS[q.difficulty]}`}>
                      {DIFFICULTY_META[q.difficulty].label}
                    </span>
                    <span className="rounded-md border border-slate-300 bg-slate-50 px-3 py-1 text-sm">
                      <SystemLabel cat={q.category} />
                    </span>
                    <span className="flex items-center gap-1 rounded-md border border-slate-300 bg-white px-3 py-1 text-sm font-bold text-slate-800">
                      <Check className="h-4 w-4 text-nasa-blue" /> {correctCount}
                    </span>
                  </div>
                  <h2 className="max-w-3xl text-2xl font-bold leading-snug text-slate-900 md:text-3xl">{q.question}</h2>
                  {/* Hueco fijo para la respuesta (evita saltos de layout) */}
                  <div className="flex h-10 items-center justify-center">
                    <AnimatePresence>
                      {result && (
                        <motion.p
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          className={`flex items-center gap-2 text-lg font-bold ${result.correct ? 'text-nasa-blue' : 'text-slate-600'}`}
                          title={q.fact}
                        >
                          {reward && <ItemIcon id={reward.id} className="h-7 w-7" />}
                          {result.correct ? (reward ? `¡Correcto! ${reward.shortName} (${RARITY_META[reward.rarity].label}) al búnker` : '¡Correcto!') : 'Casi... ¡a por la siguiente!'}
                        </motion.p>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                {/* Mitad inferior (~60 %): 4 respuestas en cuadrícula 2x2 */}
                <div className="grid flex-1 basis-3/5 grid-cols-2 grid-rows-2 gap-4">
                  {shuffled.map((ans, i) => {
                    const isCorrect = ans === q.answers[0];
                    const picked = chosen === ans;
                    let cls = 'border-slate-300 bg-slate-50 text-slate-800 hover:border-nasa-blue hover:bg-white';
                    if (result) {
                      if (isCorrect) cls = 'border-nasa-blue bg-nasa-blue text-white';
                      else if (picked) cls = 'border-nasa-red bg-white text-nasa-red';
                      else cls = 'border-slate-200 bg-slate-50 text-slate-400';
                    }
                    return (
                      <motion.button
                        key={ans}
                        type="button"
                        whileHover={result ? {} : { scale: 1.02 }}
                        whileTap={result ? {} : { scale: 0.97 }}
                        animate={result && picked && !isCorrect ? { x: [0, -8, 8, -5, 5, 0] } : {}}
                        disabled={Boolean(result)}
                        onClick={(e) => choose(ans, e)}
                        className={`relative flex min-h-[110px] items-center justify-center rounded-2xl border-2 p-6 text-center text-2xl font-bold shadow-sm transition-all disabled:cursor-default ${cls}`}
                      >
                        <span className="absolute left-4 top-3 font-mono text-sm font-bold opacity-60">{'ABCD'[i]}</span>
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
        <aside ref={inventoryRef} className="hw-panel flex w-full shrink-0 flex-col gap-2 p-4 lg:w-80">
          <p className="flex items-center gap-2 text-sm font-extrabold text-nasa-blue">
            <Backpack className="h-5 w-5" strokeWidth={1.75} /> {inventory.length} objetos conseguidos
          </p>
          <div className="thin-scroll grid min-h-0 flex-1 gap-2 overflow-y-auto">
            {VITAL_ORDER.map((cat: VitalKey) => {
              const items = inventory.filter((id) => ITEMS_BY_ID[id].category === cat);
              const st = stats[cat];
              return (
                <div key={cat} className="rounded-lg border border-slate-300 bg-white p-2">
                  <div className="flex items-center justify-between text-xs">
                    <SystemLabel cat={cat} />
                    <span className={`font-extrabold ${st.answered > 0 && st.correct === 0 ? 'text-nasa-red' : 'text-slate-500'}`}>
                      {st.correct}/{st.answered} aciertos
                    </span>
                  </div>
                  <div className="mt-1 flex min-h-[30px] flex-wrap gap-1">
                    {items.length === 0 && <span className="text-xs text-slate-400">Sin objetos todavía</span>}
                    <AnimatePresence>
                      {items.map((id) => (
                        <motion.span
                          key={id}
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: 'spring', delay: 0.55 }}
                          className={`flex items-center gap-1 rounded-md border-2 bg-white px-1.5 py-0.5 text-xs font-bold text-slate-800 ${RARITY_META[ITEMS_BY_ID[id].rarity].ring}`}
                          title={`${ITEMS_BY_ID[id].name} · ${RARITY_META[ITEMS_BY_ID[id].rarity].label}`}
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
          className="pointer-events-none fixed z-50 grid h-12 w-12 place-items-center rounded-lg border-2 border-nasa-blue bg-white text-nasa-blue shadow-lg"
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
