import { useAriaScreenReady } from '../utils/useAriaVoiceState';
import type { ReactElement } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Check, Gauge, ListChecks, Rocket, Star, Sun, Wrench, type LucideIcon } from 'lucide-react';
import { MISSION_DIFFICULTY_META, getMissionProfile, useGameStore } from '../store/useGameStore';
import type { MissionDifficulty } from '../types/game';
import { playButtonClick, playToggle, unlockAudio } from '../utils/soundEffects';
import MissionPatch from './MissionPatchLogo';
import SpaceBackdrop from './SpaceBackdrop';
import { useT } from '../i18n/useT';
import { tr } from '../i18n/core';

// ============================================================
// Ilustraciones originales (SVG propio, sin logos ni emojis)
// ============================================================

/** Casco de cadete con visor y antena: Modo Explorador. */
function CadetHelmet() {
  return (
    <svg viewBox="0 0 120 120" className="h-full w-full" aria-hidden>
      <defs>
        <linearGradient id="ms-visor" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#7dd3fc" />
          <stop offset="0.55" stopColor="#1e5bc6" />
          <stop offset="1" stopColor="#0b1e45" />
        </linearGradient>
      </defs>
      <motion.g animate={{ y: [0, -3, 0] }} transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}>
        <path d="M60 12 V4" stroke="#94a3b8" strokeWidth={3} strokeLinecap="round" />
        <motion.circle cx={60} cy={4} r={4} fill="#f97316" animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1.2, repeat: Infinity }} />
        <circle cx={60} cy={62} r={48} fill="#f8fafc" stroke="#cbd5e1" strokeWidth={3} />
        <rect x={8} y={54} width={10} height={22} rx={5} fill="#0b3d91" />
        <rect x={102} y={54} width={10} height={22} rx={5} fill="#0b3d91" />
        <rect x={24} y={34} width={72} height={52} rx={24} fill="url(#ms-visor)" />
        <path d="M34 46 Q44 38 58 40" stroke="#ffffff" strokeOpacity={0.75} strokeWidth={5} strokeLinecap="round" fill="none" />
        <circle cx={80} cy={70} r={3} fill="#ffffff" fillOpacity={0.5} />
        <path d="M30 98 Q60 112 90 98" stroke="#f97316" strokeWidth={6} strokeLinecap="round" fill="none" />
      </motion.g>
    </svg>
  );
}

/** Medalla de mérito con cinta: Modo Comandante. */
function CommanderMedal() {
  return (
    <svg viewBox="0 0 120 120" className="h-full w-full" aria-hidden>
      {/* Cinta en V (azul NASA con franja roja) */}
      <path d="M34 4 H56 L66 48 L50 56 Z" fill="#0b3d91" />
      <path d="M86 4 H64 L54 48 L70 56 Z" fill="#1e5bc6" />
      <path d="M43 4 H49 L60 50 L56 52 Z" fill="#fc3d21" />
      <path d="M77 4 H71 L60 50 L64 52 Z" fill="#fc3d21" />
      {/* Medalla que se balancea un poco */}
      <motion.g
        style={{ transformOrigin: '60px 44px' }}
        animate={{ rotate: [-4, 4, -4] }}
        transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
      >
        <circle cx={60} cy={80} r={34} fill="#f59e0b" stroke="#ffffff" strokeWidth={4} />
        <circle cx={60} cy={80} r={26} fill="#fbbf24" stroke="#d97706" strokeWidth={2.5} />
        <path
          d="M60 62 L65.3 73.2 L77.6 74.6 L68.5 83 L71 95.2 L60 89 L49 95.2 L51.5 83 L42.4 74.6 L54.7 73.2 Z"
          fill="#ffffff"
          stroke="#d97706"
          strokeWidth={2}
          strokeLinejoin="round"
        />
        <motion.path
          d="M44 64 Q52 56 62 56"
          stroke="#ffffff"
          strokeOpacity={0.8}
          strokeWidth={4}
          strokeLinecap="round"
          fill="none"
          animate={{ opacity: [0.2, 1, 0.2] }}
          transition={{ duration: 2.2, repeat: Infinity }}
        />
      </motion.g>
    </svg>
  );
}

// ============================================================
// Tarjeta "Credencial de Cadete"
// ============================================================
interface ModeCard {
  badge: string;
  tagline: string;
  Art: () => ReactElement;
  stars: number;
  accent: string;
  facts: { Icon: LucideIcon; text: string }[];
}

function buildCards(): Record<MissionDifficulty, ModeCard> {
  const exp = getMissionProfile('explorer');
  const cmd = getMissionProfile('commander');
  return {
    explorer: {
      badge: tr('CREDENCIAL DE CADETE', 'CADET CREDENTIAL'),
      tagline: tr('¡Perfecto para tu primera misión!', 'Perfect for your first mission!'),
      Art: CadetHelmet,
      stars: 1,
      accent: '#1e5bc6',
      facts: [
        { Icon: ListChecks, text: tr(`Preguntas con ${exp.answerOptions} respuestas`, `Questions with ${exp.answerOptions} answers`) },
        { Icon: Sun, text: tr('Misión de 5 Soles', '5-Sol mission') },
        { Icon: Wrench, text: tr('Pocas averías', 'Few breakdowns') },
      ],
    },
    commander: {
      badge: tr('MEDALLA DE COMANDANTE', 'COMMANDER MEDAL'),
      tagline: tr('¿Te atreves con la gran tormenta?', 'Dare to face the great storm?'),
      Art: CommanderMedal,
      stars: 3,
      accent: '#fc3d21',
      facts: [
        { Icon: ListChecks, text: tr(`Preguntas con ${cmd.answerOptions} respuestas`, `Questions with ${cmd.answerOptions} answers`) },
        { Icon: Sun, text: tr('Misión de 10 Soles', '10-Sol mission') },
        { Icon: Wrench, text: tr('Averías frecuentes', 'Frequent breakdowns') },
      ],
    },
  };
}

function DifficultyMeter({ stars, accent }: { stars: number; accent: string }) {
  return (
    <span className="flex items-center gap-2" aria-label={tr(`Dificultad ${stars} de 3`, `Difficulty ${stars} of 3`)}>
      <span className="font-mono text-xs font-bold tracking-wider text-slate-500">{tr('RETO', 'CHALLENGE')}</span>
      <span className="flex gap-0.5">
        {[1, 2, 3].map((n) => (
          <Star key={n} className="h-5 w-5" strokeWidth={1.75} style={{ color: n <= stars ? accent : '#cbd5e1' }} fill={n <= stars ? accent : 'none'} />
        ))}
      </span>
      <span className="ml-1 flex items-end gap-0.5" aria-hidden>
        {[1, 2, 3, 4, 5].map((n) => (
          <span
            key={n}
            className="w-1.5 rounded-sm"
            style={{ height: `${6 + n * 3}px`, background: n <= (stars === 1 ? 2 : 5) ? accent : '#e2e8f0' }}
          />
        ))}
      </span>
    </span>
  );
}

function ModeCredential({ difficulty, selected, onSelect }: { difficulty: MissionDifficulty; selected: boolean; onSelect: () => void }) {
  const meta = MISSION_DIFFICULTY_META[difficulty];
  const card = buildCards()[difficulty];
  return (
    <motion.button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      whileHover={{ y: -6, rotate: difficulty === 'explorer' ? -0.8 : 0.8 }}
      whileTap={{ scale: 0.97 }}
      animate={selected ? { scale: 1.02 } : { scale: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      className={`group relative flex h-full w-full flex-col overflow-hidden rounded-[1.75rem] border-[3px] bg-white text-left shadow-lg transition-colors ${
        selected ? 'shadow-[0_18px_40px_-18px_rgba(11,61,145,0.7)]' : 'border-slate-200 hover:border-slate-300'
      }`}
      style={selected ? { borderColor: card.accent } : undefined}
    >
      {/* Cinta superior tipo credencial */}
      <span className="flex items-center justify-between px-[clamp(0.9rem,2dvh,1.25rem)] py-2 text-white" style={{ background: card.accent }}>
        <span className="font-mono text-xs font-bold tracking-[0.25em]">{card.badge}</span>
        {!selected && <span className="h-2.5 w-10 rounded-full bg-white/40" aria-hidden />}
      </span>

      <span className="flex flex-1 flex-col gap-[clamp(0.5rem,1.6dvh,0.9rem)] p-[clamp(0.9rem,2.2dvh,1.4rem)]">
        <span className="flex items-center gap-4">
          {/* Ilustración grande con halo */}
          <span className="relative grid h-[clamp(4.5rem,15dvh,7.5rem)] w-[clamp(4.5rem,15dvh,7.5rem)] shrink-0 place-items-center">
            <motion.span
              className="absolute inset-0 rounded-full"
              style={{ background: `radial-gradient(circle, ${card.accent}26 0%, transparent 70%)` }}
              animate={selected ? { scale: [1, 1.15, 1] } : { scale: 1 }}
              transition={{ duration: 1.8, repeat: selected ? Infinity : 0 }}
            />
            <span className="relative h-full w-full transition-transform duration-300 group-hover:scale-110">
              <card.Art />
            </span>
          </span>
          <span className="min-w-0">
            <span className="font-display block whitespace-nowrap text-[clamp(1.1rem,3.1dvh,1.5rem)] font-black leading-tight tracking-wide text-slate-900">{meta.label}</span>
            <span className="mt-0.5 block whitespace-nowrap text-[clamp(0.95rem,2.4dvh,1.1rem)] font-bold" style={{ color: card.accent }}>
              {card.tagline}
            </span>
            <span className="mt-1.5 block">
              <DifficultyMeter stars={card.stars} accent={card.accent} />
            </span>
          </span>
        </span>

        <span className="text-[clamp(0.9rem,2.3dvh,1rem)] leading-snug text-slate-600">{meta.description}</span>

        <span className="mt-auto grid gap-1.5">
          {card.facts.map(({ Icon, text }) => (
            <span key={text} className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-[clamp(0.25rem,0.9dvh,0.45rem)] text-sm font-semibold text-slate-700">
              <Icon className="h-4 w-4 shrink-0" strokeWidth={1.75} style={{ color: card.accent }} />
              {text}
            </span>
          ))}
        </span>
      </span>

      {/* Sello de seleccionado */}
      {selected && (
        <motion.span
          initial={{ scale: 2.2, opacity: 0, rotate: -25 }}
          animate={{ scale: 1, opacity: 1, rotate: -4 }}
          transition={{ type: 'spring', stiffness: 260, damping: 14 }}
          className="font-display absolute right-3 top-1 flex items-center gap-1 rounded-lg border-2 px-2 py-0.5 text-xs font-black tracking-widest shadow-sm"
          style={{ borderColor: card.accent, color: card.accent, background: 'rgba(255,255,255,0.92)' }}
        >
          <Check className="h-4 w-4" strokeWidth={3} /> {tr('ELEGIDO', 'CHOSEN')}
        </motion.span>
      )}
    </motion.button>
  );
}

// ============================================================
// Pantalla
// ============================================================
export default function MissionSelector() {
  useAriaScreenReady();
  const missionDifficulty = useGameStore((s) => s.missionDifficulty);
  const setMissionDifficulty = useGameStore((s) => s.setMissionDifficulty);
  const startGame = useGameStore((s) => s.startGame);
  const resetToMenu = useGameStore((s) => s.resetToMenu);
  const t = useT();

  return (
    <main className="relative flex h-dvh flex-col overflow-hidden bg-slate-100 text-slate-900" onPointerDown={unlockAudio}>
      <div className="bg-grid pointer-events-none absolute inset-0 opacity-60" />
      <SpaceBackdrop />
      <div className="pointer-events-none absolute left-0 top-0 h-2 w-full bg-nasa-blue" />
      <div className="pointer-events-none absolute left-0 top-2 h-1 w-full bg-nasa-red" />

      {/* Contenido con scroll propio si no cabe (móvil); el botón de abajo queda fijo */}
      <div className="thin-scroll relative z-10 min-h-0 flex-1 overflow-y-auto px-4 pt-[clamp(0.75rem,2.5dvh,1.5rem)] sm:px-8">
        <div className="mx-auto flex min-h-full w-full max-w-5xl flex-col">
          <header className="flex items-center justify-between gap-4">
            <button
              type="button"
              onClick={() => {
                playButtonClick();
                resetToMenu();
              }}
              className="flex items-center gap-2 rounded-xl border-2 border-slate-300 bg-white px-3 py-2 font-mono text-xs font-bold tracking-widest text-slate-500 shadow-sm transition hover:border-nasa-blue hover:text-nasa-blue"
            >
              <ArrowLeft size={15} /> {t('PORTADA', 'HOME')}
            </button>
            <motion.div animate={{ rotate: [0, -4, 4, 0] }} transition={{ duration: 6, repeat: Infinity }}>
              <MissionPatch size={52} className="h-[clamp(2.5rem,7dvh,3.25rem)] w-auto" />
            </motion.div>
          </header>

          <section className="mt-[clamp(0.5rem,2.5dvh,1.75rem)] text-center">
            <motion.p
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mx-auto inline-flex items-center gap-2 rounded-full bg-nasa-blue px-4 py-1 font-mono text-xs font-bold tracking-[0.25em] text-white"
            >
              <Gauge className="h-4 w-4" strokeWidth={2} /> {t('ELIGE TU MODO', 'CHOOSE YOUR MODE')}
            </motion.p>
            <motion.h1
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', stiffness: 140 }}
              className="font-display mt-2 text-[clamp(1.6rem,min(4.2vw,6dvh),3.1rem)] font-black leading-tight text-nasa-blue"
            >
              {t('¿Qué tipo de ', 'What kind of ')}<span className="text-nasa-red">{t('astronauta', 'astronaut')}</span>{t(' eres?', ' are you?')}
            </motion.h1>
            <p className="mx-auto mt-1 max-w-xl text-[clamp(0.95rem,2.4dvh,1.15rem)] font-semibold text-slate-600">
              {t('Toca un modo para elegirlo. ¡Podrás cambiarlo en la próxima misión!', 'Tap a mode to choose it. You can switch modes on your next mission!')}
            </p>
          </section>

          <section aria-label={t('Modo de juego', 'Game mode')} className="mx-auto mt-[clamp(0.75rem,3dvh,2rem)] grid w-full max-w-4xl justify-center gap-[clamp(0.9rem,2.5dvh,1.5rem)] pb-4 sm:grid-cols-2">
            {(Object.keys(MISSION_DIFFICULTY_META) as MissionDifficulty[]).map((difficulty, i) => (
              <motion.div
                key={difficulty}
                className="w-full max-w-[26rem] justify-self-center"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + i * 0.12, type: 'spring', stiffness: 160, damping: 18 }}
              >
                <ModeCredential
                  difficulty={difficulty}
                  selected={missionDifficulty === difficulty}
                  onSelect={() => {
                    playToggle(true);
                    setMissionDifficulty(difficulty);
                  }}
                />
              </motion.div>
            ))}
          </section>
        </div>
      </div>

      {/* Botón de inicio fijo abajo (no mueve el resto) */}
      <div className="relative z-20 shrink-0 border-t-2 border-slate-200 bg-white/90 px-4 py-[clamp(0.6rem,2dvh,1.1rem)] shadow-[0_-8px_24px_rgba(15,23,42,0.08)] backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center justify-center gap-4">
          <span className="hidden font-mono text-xs font-bold tracking-widest text-slate-500 sm:block">
            <span className="text-nasa-blue">{MISSION_DIFFICULTY_META[missionDifficulty].label.toUpperCase()}</span>
          </span>
          <motion.button
            type="button"
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.96 }}
            onClick={() => {
              unlockAudio();
              playButtonClick();
              startGame();
            }}
            className="glow-red font-display flex items-center gap-3 rounded-2xl bg-nasa-red px-8 py-[clamp(0.6rem,1.8dvh,1rem)] text-base font-black tracking-wider text-white sm:px-12 sm:text-lg"
          >
            <motion.span animate={{ y: [0, -3, 0], rotate: [0, -8, 0] }} transition={{ duration: 1.4, repeat: Infinity }}>
              <Rocket size={22} />
            </motion.span>
            {t('INICIAR MISIÓN', 'LAUNCH MISSION')}
          </motion.button>
        </div>
      </div>
    </main>
  );
}
