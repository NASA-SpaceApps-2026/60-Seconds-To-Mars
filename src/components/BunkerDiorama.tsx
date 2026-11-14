import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { motion } from 'framer-motion';
import { Activity, BatteryLow, Moon, Utensils, type LucideIcon } from 'lucide-react';
import type { ItemId, RadiationLevel, Vitals } from '../types/game';
import { ITEMS_BY_ID } from '../data/stationItems';
import { ITEM_ICONS } from './icons';

/** Icono de objeto dentro del SVG (lucide anida un <svg> con x/y). */
function ItemIcon({ id, ...rest }: { id: ItemId; x: number; y: number; size: number; color: string; strokeWidth?: number }) {
  const Icon = ITEM_ICONS[id];
  return <Icon strokeWidth={1.75} {...rest} aria-hidden />;
}

/** Chapitas de estado sobre los cascos. */
const STATUS_CHIP = {
  hungry: { Icon: Utensils, color: '#fbbf24', blink: false },
  cold: { Icon: BatteryLow, color: '#7dd3fc', blink: true },
  tired: { Icon: Moon, color: '#c4b5fd', blink: false },
  dizzy: { Icon: Activity, color: '#38bdf8', blink: true },
} satisfies Record<string, { Icon: LucideIcon; color: string; blink: boolean }>;

function StatusChip({ x, y, Icon, color, blink }: { x: number; y: number; Icon: LucideIcon; color: string; blink: boolean }) {
  return (
    <motion.g animate={blink ? { opacity: [1, 0.3, 1] } : { y: [0, -2, 0] }} transition={{ duration: blink ? 1 : 1.8, repeat: Infinity }}>
      <rect x={x} y={y} width={22} height={18} rx={3} fill="#0f172a" stroke={color} strokeWidth={1.2} />
      <Icon x={x + 4} y={y + 2} size={14} color={color} strokeWidth={2} />
    </motion.g>
  );
}

// ============================================================
// Escena exterior point-and-click: el hábitat Ares-IV en el paisaje de Marte.
// Tras el ventanal, 3 astronautas que reaccionan al estado de la partida y las
// máquinas del interior. La casa y la antena se pueden pulsar (callbacks por props).
// ============================================================

type Mood = 'happy' | 'focused' | 'hungry' | 'dizzy' | 'cold' | 'worried' | 'tired';

interface Props {
  vitals: Vitals;
  inventory: ItemId[];
  consumed: ItemId[];
  machineStates: Partial<Record<ItemId, boolean>>;
  radiationLevel: RadiationLevel | null;
  /** Máquinas con avería puntual (icono en rojo tras el ventanal). */
  brokenMachines?: ItemId[];
  /** Hay algo que reparar: baliza roja y aviso en la fachada. */
  needsRepair?: boolean;
  /** Soles que faltan para el próximo envío de Houston (null = nada en camino). */
  houstonEta?: number | null;
  /** Hay un envío recién aterrizado. */
  houstonArrived?: boolean;
  /** Clic en la casa → Sistemas e Inventario. */
  onHabitatClick?: () => void;
  /** Clic en la antena del tejado → Enlace Houston. */
  onAntennaClick?: () => void;
}

const CREW = [
  { name: 'Cmdte. Leo', role: 'Comandante', cx: 238, skin: '#f1c27d', hair: '#4b2e19', accent: '#f97316' },
  { name: 'Dra. Vega', role: 'Botánica', cx: 320, skin: '#8d5524', hair: '#1c1917', accent: '#22c55e' },
  { name: 'Max', role: 'Ingeniero', cx: 402, skin: '#e0ac69', hair: '#b45309', accent: '#3b82f6' },
] as const;

const MOOD_LABEL: Record<Mood, string> = {
  happy: 'contento',
  focused: 'concentrado',
  hungry: 'con hambre',
  dizzy: 'mareado por falta de aire',
  cold: 'con frío',
  worried: 'preocupado por la radiación',
  tired: 'con fatiga espacial',
};

function computeMoods(v: Vitals, storm: boolean): Mood[] {
  const problems: Mood[] = [];
  if (v.oxygen < 35) problems.push('dizzy');
  if (v.food < 35) problems.push('hungry');
  if (v.power < 30) problems.push('cold');
  if (v.shield < 35 || storm) problems.push('worried');
  if (v.crewHealth < 35) problems.push('tired');
  if (problems.length === 0) {
    const allGood = (Object.values(v) as number[]).every((n) => n > 50);
    return [allGood ? 'happy' : 'focused', allGood ? 'happy' : 'focused', allGood ? 'happy' : 'focused'];
  }
  return CREW.map((_, i) => problems[i % problems.length]);
}

// ------------------------------------------------------------
// Caras dentro del casco
// ------------------------------------------------------------
function Face({ cx, cy, mood }: { cx: number; cy: number; mood: Mood }) {
  const eye = (dx: number) => <circle cx={cx + dx} cy={cy - 2} r={1.9} fill="#0f172a" />;
  switch (mood) {
    case 'happy':
      return (
        <g>
          <path d={`M${cx - 7} ${cy - 2} q2 -3 4 0 M${cx + 3} ${cy - 2} q2 -3 4 0`} stroke="#0f172a" strokeWidth={1.6} fill="none" strokeLinecap="round" />
          <path d={`M${cx - 5} ${cy + 3} Q${cx} ${cy + 8} ${cx + 5} ${cy + 3}`} stroke="#0f172a" strokeWidth={1.6} fill="#7f1d1d" strokeLinecap="round" />
          <circle cx={cx - 8} cy={cy + 2} r={2} fill="#fb7185" opacity={0.5} />
          <circle cx={cx + 8} cy={cy + 2} r={2} fill="#fb7185" opacity={0.5} />
        </g>
      );
    case 'focused':
      return (
        <g>
          {eye(-5)}
          {eye(5)}
          <path d={`M${cx - 4} ${cy + 5} H${cx + 4}`} stroke="#0f172a" strokeWidth={1.6} strokeLinecap="round" />
        </g>
      );
    case 'hungry':
      return (
        <g>
          {eye(-5)}
          {eye(5)}
          <ellipse cx={cx} cy={cy + 5} rx={3} ry={3.5} fill="#7f1d1d" stroke="#0f172a" strokeWidth={1.2} />
          <path d={`M${cx + 2} ${cy + 8} q1 3 0 4`} stroke="#7dd3fc" strokeWidth={1.4} fill="none" />
        </g>
      );
    case 'dizzy':
      return (
        <g>
          {[-5, 5].map((dx) => (
            <motion.path
              key={dx}
              d={`M${cx + dx} ${cy - 2} m-2.5 0 a2.5 2.5 0 1 0 5 0 a1.6 1.6 0 1 0 -3.2 0`}
              stroke="#1e3a8a"
              strokeWidth={1.3}
              fill="none"
              animate={{ rotate: 360 }}
              transition={{ duration: 1.4, repeat: Infinity, ease: 'linear' }}
            />
          ))}
          <path d={`M${cx - 4} ${cy + 6} q2 -2 4 0 q2 2 4 0`} stroke="#1e3a8a" strokeWidth={1.5} fill="none" />
        </g>
      );
    case 'cold':
      return (
        <g>
          {eye(-5)}
          {eye(5)}
          <path d={`M${cx - 5} ${cy + 5} l2 -2 l2 2 l2 -2 l2 2 l2 -2`} stroke="#0f172a" strokeWidth={1.3} fill="none" />
        </g>
      );
    case 'worried':
      return (
        <g>
          <path d={`M${cx - 8} ${cy - 7} l5 2 M${cx + 8} ${cy - 7} l-5 2`} stroke="#0f172a" strokeWidth={1.5} strokeLinecap="round" />
          {eye(-5)}
          {eye(5)}
          <path d={`M${cx - 4} ${cy + 7} Q${cx} ${cy + 3} ${cx + 4} ${cy + 7}`} stroke="#0f172a" strokeWidth={1.6} fill="none" strokeLinecap="round" />
          <motion.path
            d={`M${cx + 10} ${cy - 6} q2 3 0 5 q-2 -2 0 -5`}
            fill="#7dd3fc"
            animate={{ y: [0, 4, 0], opacity: [1, 0.4, 1] }}
            transition={{ duration: 1.6, repeat: Infinity }}
          />
        </g>
      );
    case 'tired':
      return (
        <g>
          <path d={`M${cx - 7} ${cy - 1} h4 M${cx + 3} ${cy - 1} h4`} stroke="#0f172a" strokeWidth={1.6} strokeLinecap="round" />
          <ellipse cx={cx} cy={cy + 5} rx={2} ry={1.5} fill="#0f172a" />
        </g>
      );
  }
}

// ------------------------------------------------------------
// Astronauta chibi sentado
// ------------------------------------------------------------
function Astronaut({
  cx,
  skin,
  hair,
  accent,
  name,
  mood,
  shiver,
  showStatus = true,
}: {
  cx: number;
  skin: string;
  hair: string;
  accent: string;
  name: string;
  mood: Mood;
  shiver: boolean;
  showStatus?: boolean;
}) {
  const hy = 112; // centro del casco
  const faceTint = mood === 'dizzy' ? '#93c5fd' : skin;
  return (
    <g>
      {/* Asiento de supervivencia */}
      <rect x={cx - 32} y={104} width={64} height={78} rx={12} fill="#475569" stroke="#64748b" strokeWidth={2} />
      <rect x={cx - 36} y={172} width={72} height={14} rx={5} fill="#475569" />
      <rect x={cx - 30} y={186} width={6} height={24} fill="#1e293b" />
      <rect x={cx + 24} y={186} width={6} height={24} fill="#1e293b" />

      <motion.g
        animate={shiver ? { x: [-1.2, 1.2, -1.2] } : { scaleY: [1, 1.025, 1] }}
        transition={shiver ? { duration: 0.12, repeat: Infinity } : { duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
        style={{ originY: 1 }}
      >
        {/* Piernas y botas */}
        <rect x={cx - 17} y={166} width={13} height={30} rx={6} fill="#e2e8f0" />
        <rect x={cx + 4} y={166} width={13} height={30} rx={6} fill="#e2e8f0" />
        <rect x={cx - 19} y={192} width={16} height={9} rx={4} fill="#64748b" />
        <rect x={cx + 3} y={192} width={16} height={9} rx={4} fill="#64748b" />
        {/* Cuerpo del traje */}
        <rect x={cx - 23} y={134} width={46} height={42} rx={14} fill="#f1f5f9" stroke="#cbd5e1" strokeWidth={1.5} />
        <rect x={cx - 23} y={150} width={46} height={6} fill={accent} />
        <rect x={cx - 8} y={140} width={16} height={9} rx={2} fill="#1e293b" />
        <circle cx={cx - 3} cy={144.5} r={1.6} fill="#22d3ee" />
        <circle cx={cx + 3} cy={144.5} r={1.6} fill={accent} />
        {/* Brazos */}
        <rect x={cx - 31} y={138} width={11} height={28} rx={5.5} fill="#e2e8f0" />
        <rect x={cx + 20} y={138} width={11} height={28} rx={5.5} fill="#e2e8f0" />
        <circle cx={cx - 25.5} cy={166} r={5} fill="#94a3b8" />
        <circle cx={cx + 25.5} cy={166} r={5} fill="#94a3b8" />
        {/* Casco */}
        <circle cx={cx} cy={hy} r={27} fill="#f8fafc" stroke="#cbd5e1" strokeWidth={2} />
        <rect x={cx - 3} y={hy - 34} width={6} height={8} rx={2} fill="#94a3b8" />
        <circle cx={cx} cy={hy - 35} r={2.5} fill={accent} />
        <ellipse cx={cx} cy={hy + 1} rx={20} ry={18} fill="#0c4a6e" />
        {/* Cara */}
        <circle cx={cx} cy={hy + 3} r={14} fill={faceTint} />
        <path d={`M${cx - 14} ${hy} Q${cx - 12} ${hy - 14} ${cx} ${hy - 13} Q${cx + 13} ${hy - 14} ${cx + 14} ${hy - 1} Q${cx + 6} ${hy - 9} ${cx - 14} ${hy}`} fill={hair} />
        <Face cx={cx} cy={hy + 4} mood={mood} />
        {/* Brillo del visor */}
        <path d={`M${cx - 15} ${hy - 6} Q${cx - 13} ${hy - 15} ${cx - 4} ${hy - 16}`} stroke="#ffffff" strokeWidth={2.5} fill="none" opacity={0.55} strokeLinecap="round" />
      </motion.g>

      {/* Indicador de estado: chapita técnica con icono vectorial (sin emojis) */}
      {showStatus && mood in STATUS_CHIP && <StatusChip x={cx + 18} y={hy - 52} {...STATUS_CHIP[mood as keyof typeof STATUS_CHIP]} />}

      {/* Placa metálica de identificación */}
      <g>
        <rect x={cx - 39} y={211} width={78} height={20} rx={2.5} fill="url(#id-plate)" stroke="#64748b" strokeWidth={1} />
        <rect x={cx - 39} y={211} width={3.5} height={20} fill={accent} />
        <circle cx={cx - 32} cy={221} r={1.3} fill="#94a3b8" />
        <circle cx={cx + 34.5} cy={221} r={1.3} fill="#94a3b8" />
        <text
          x={cx + 1}
          y={224.6}
          fontSize={10}
          fontWeight={800}
          letterSpacing={0.5}
          fill="#0f172a"
          textAnchor="middle"
          fontFamily="ui-monospace, SFMono-Regular, Menlo, Consolas, monospace"
        >
          {name.toUpperCase()}
        </text>
      </g>
    </g>
  );
}

// ============================================================
// ESCENA EXTERIOR: paisaje del Cráter Jezero con el hábitat de la NASA en el centro.
// La casa (Sistemas e Inventario) y la antena (Enlace Houston) se pueden pulsar.
// Sin carteles fijos en el cielo: los avisos viven en la esquina superior izquierda (HTML).
// ============================================================
const SH = 520;
const GROUND_Y = 420;
/** Cuerpo del hábitat (un 35 % más grande que la versión anterior). */
const BODY = { w: 594, y: 150, h: 252, r: 64 };
/** Visor panorámico estrecho: solo asoman los cascos. */
const WIN = { w: 470, h: 86, y: BODY.y + 78, r: 30 };
/** Tripulación tras el visor: escala y fila superior visible (desde la antena del casco hasta la barbilla). */
const CREW_SCALE = 1.5;
const CREW_TOP = 82;
/** Banda azul marino del bisel, bajo el visor, con las placas de nombre integradas. */
const SILL = { y: WIN.y + WIN.h + 10, h: 24 };
/** Bisel octogonal aerodinámico alrededor del visor (incluye la banda de placas). */
const BEZEL = { padX: 40, top: 18, bottom: 44, chamfer: 26 };
/** Octógono horizontal: rectángulo con las 4 esquinas cortadas a 45°. */
const octagonPoints = (x1: number, y1: number, x2: number, y2: number, c: number) =>
  `${x1 + c},${y1} ${x2 - c},${y1} ${x2},${y1 + c} ${x2},${y2 - c} ${x2 - c},${y2} ${x1 + c},${y2} ${x1},${y2 - c} ${x1},${y1 + c}`;

/** Cordillera determinista (suma de senos) para el horizonte. */
function ridge(width: number, base: number, amp: number, seed: number, step = 24) {
  let d = `M0 ${SH} L0 ${base}`;
  for (let x = 0; x <= width + step; x += step) {
    const y = base - amp * (0.55 + 0.25 * Math.sin(x * 0.011 + seed) + 0.2 * Math.sin(x * 0.027 + seed * 2.3));
    d += ` L${x} ${y.toFixed(1)}`;
  }
  return `${d} L${width + step} ${SH} Z`;
}

const ROCKS = [
  [0.06, 474, 26, 11],
  [0.15, 496, 16, 7],
  [0.25, 458, 12, 5],
  [0.76, 466, 20, 8],
  [0.86, 492, 30, 12],
  [0.96, 456, 14, 6],
  [0.4, 504, 22, 8],
] as const;
const SKY_STARS = Array.from({ length: 34 }, (_, i) => [((i * 97) % 100) / 100, 14 + ((i * 53) % 120), i % 4 === 0 ? 1.6 : 1] as const);

/** Pequeño tooltip SVG (solo aparece al pasar el ratón). */
function HoverTip({ x, y, text, maxX }: { x: number; y: number; text: string; maxX?: number }) {
  const w = text.length * 8.1 + 30;
  // Nunca se sale del lienzo: se desplaza hacia dentro si queda pegado a un borde
  const cx = Math.max(w / 2 + 8, maxX !== undefined ? Math.min(x, maxX - w / 2 - 8) : x);
  return (
    <g pointerEvents="none">
      <rect x={cx - w / 2} y={y - 15} width={w} height={30} rx={8} fill="#020617" opacity={0.95} stroke="#7dd3fc" strokeWidth={1.5} />
      <text x={cx} y={y + 5} textAnchor="middle" fontSize={14} fontWeight={700} fill="#ffffff" fontFamily="Nunito, ui-sans-serif, system-ui, sans-serif">
        {text}
      </text>
    </g>
  );
}

/** Luz LED alargada integrada en el bisel: verde fija si todo va bien, roja parpadeante si hay averías. */
function LedStrip({ x, y, h, alert }: { x: number; y: number; h: number; alert: boolean }) {
  const color = alert ? '#ef4444' : '#4ade80';
  return (
    <g>
      <rect x={x - 6} y={y - 4} width={12} height={h + 8} rx={6} fill="#0f172a" />
      {alert ? (
        <>
          <motion.rect x={x - 12} y={y - 10} width={24} height={h + 20} rx={12} fill={color} animate={{ opacity: [0.05, 0.4, 0.05] }} transition={{ duration: 0.8, repeat: Infinity }} />
          <motion.rect x={x - 3} y={y} width={6} height={h} rx={3} fill={color} animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 0.8, repeat: Infinity }} />
        </>
      ) : (
        <>
          <rect x={x - 8} y={y - 6} width={16} height={h + 12} rx={8} fill={color} opacity={0.18} />
          <rect x={x - 3} y={y} width={6} height={h} rx={3} fill={color} />
        </>
      )}
    </g>
  );
}

export default function BunkerDiorama({
  vitals,
  inventory,
  consumed,
  machineStates,
  radiationLevel,
  brokenMachines = [],
  needsRepair = false,
  houstonEta = null,
  houstonArrived = false,
  onHabitatClick,
  onAntennaClick,
}: Props) {
  const storm = radiationLevel === 'high' || radiationLevel === 'extreme';
  const alarm = storm || vitals.shield < 35;
  const lowPower = vitals.power < 30;
  const moods = computeMoods(vitals, storm);
  const [hover, setHover] = useState<'habitat' | 'antenna' | null>(null);

  const visible = inventory.filter((id) => !consumed.includes(id));
  const machines = visible.filter((id) => ITEMS_BY_ID[id].kind === 'machine');
  const activeIcons = machines.slice(0, 8);

  const summary = `Hábitat Ares-IV en el Cráter Jezero: ${CREW.map((c, i) => `${c.name} ${MOOD_LABEL[moods[i]]}`).join(', ')}.${lowPower ? ' Luces en modo ahorro.' : ''}${alarm ? ' Alarma de radiación activa.' : ''}${needsRepair ? ' Hay una avería en el hábitat.' : ''}`;

  // El paisaje se estira a todo el contenedor
  const wrapRef = useRef<HTMLDivElement>(null);
  const [aspect, setAspect] = useState(2);
  useEffect(() => {
    const el = wrapRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (width > 0 && height > 0) setAspect(width / height);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const VW = Math.max(820, Math.round(SH * aspect));
  const hx = VW / 2;
  const bx = hx - BODY.w / 2;
  const winX = hx - WIN.w / 2;
  const antX = hx + BODY.w / 2 - 80;
  const dishY = BODY.y - 64;
  const crewX = (cx: number) => hx + (cx - 320) * CREW_SCALE;

  const clickable = (target: 'habitat' | 'antenna', onClick?: () => void) => ({
    role: 'button',
    tabIndex: 0,
    className: 'cursor-pointer outline-none transition-[filter] duration-200',
    style: {
      filter:
        hover === target
          ? 'drop-shadow(0 0 18px rgba(125,211,252,1)) brightness(1.06)'
          : target === 'antenna'
            ? 'drop-shadow(0 0 8px rgba(56,189,248,0.75))'
            : 'none',
    },
    onClick,
    onKeyDown: (e: ReactKeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onClick?.();
      }
    },
    onPointerEnter: () => setHover(target),
    onPointerLeave: () => setHover(null),
    onFocus: () => setHover(target),
    onBlur: () => setHover(null),
  });

  const antennaTip = houstonArrived ? 'Enlace Houston · envío recibido' : houstonEta !== null ? `Enlace Houston · llega en ${houstonEta} ${houstonEta === 1 ? 'Sol' : 'Soles'}` : 'Enlace Houston · Pedir Suministros';

  return (
    <div ref={wrapRef} className="h-full w-full">
      <svg viewBox={`0 0 ${VW} ${SH}`} preserveAspectRatio="xMidYMid slice" className="block h-full w-full" role="img" aria-label={summary}>
        <title>{summary}</title>
        <defs>
          <linearGradient id="mars-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={storm ? '#1e1b4b' : '#0b1026'} />
            <stop offset="55%" stopColor={storm ? '#581c87' : '#7c2d12'} />
            <stop offset="100%" stopColor={storm ? '#f472b6' : '#fdba74'} />
          </linearGradient>
          <linearGradient id="mars-ground" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#c2410c" />
            <stop offset="100%" stopColor="#7c2d12" />
          </linearGradient>
          <linearGradient id="hab-body" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="70%" stopColor="#f1f5f9" />
            <stop offset="100%" stopColor="#e2e8f0" />
          </linearGradient>
          {/* Volumen del cilindro: bordes laterales en sombra plateada, centro luminoso */}
          <linearGradient id="hab-sheen" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#94a3b8" stopOpacity={0.55} />
            <stop offset="18%" stopColor="#e2e8f0" stopOpacity={0.15} />
            <stop offset="42%" stopColor="#ffffff" stopOpacity={0} />
            <stop offset="80%" stopColor="#e2e8f0" stopOpacity={0.2} />
            <stop offset="100%" stopColor="#94a3b8" stopOpacity={0.6} />
          </linearGradient>
          <linearGradient id="hab-top-light" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffffff" stopOpacity={0.95} />
            <stop offset="100%" stopColor="#ffffff" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="hab-bezel" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#e2e8f0" />
            <stop offset="55%" stopColor="#cbd5e1" />
            <stop offset="100%" stopColor="#94a3b8" />
          </linearGradient>
          <linearGradient id="hab-strut" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#94a3b8" />
            <stop offset="50%" stopColor="#e2e8f0" />
            <stop offset="100%" stopColor="#94a3b8" />
          </linearGradient>
          <radialGradient id="hab-dome" cx="40%" cy="30%" r="80%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="#cbd5e1" />
          </radialGradient>
          <linearGradient id="hab-interior" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0f172a" />
            <stop offset="100%" stopColor="#1e293b" />
          </linearGradient>
          <radialGradient id="hab-interior-glow" cx="50%" cy="60%" r="65%">
            <stop offset="0%" stopColor="#38bdf8" stopOpacity={lowPower ? 0.08 : 0.32} />
            <stop offset="60%" stopColor="#0b3d91" stopOpacity={lowPower ? 0.05 : 0.22} />
            <stop offset="100%" stopColor="#0b3d91" stopOpacity={0} />
          </radialGradient>
          <linearGradient id="hab-sill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#94a3b8" />
            <stop offset="100%" stopColor="#64748b" />
          </linearGradient>
          <linearGradient id="id-plate" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f8fafc" />
            <stop offset="55%" stopColor="#cbd5e1" />
            <stop offset="100%" stopColor="#94a3b8" />
          </linearGradient>
          <linearGradient id="glass-reflection" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#ffffff" stopOpacity={0.35} />
            <stop offset="40%" stopColor="#ffffff" stopOpacity={0.05} />
            <stop offset="100%" stopColor="#ffffff" stopOpacity={0} />
          </linearGradient>
          <radialGradient id="window-glow" cx="50%" cy="50%" r="60%">
            <stop offset="0%" stopColor="#38bdf8" stopOpacity={lowPower ? 0.06 : 0.35} />
            <stop offset="100%" stopColor="#38bdf8" stopOpacity={0} />
          </radialGradient>
          <clipPath id="hab-window">
            <rect x={winX} y={WIN.y} width={WIN.w} height={WIN.h} rx={WIN.r} />
          </clipPath>
          <clipPath id="hab-body-clip">
            <rect x={bx} y={BODY.y} width={BODY.w} height={BODY.h} rx={BODY.r} />
          </clipPath>
        </defs>

        {/* ---------- Cielo, estrellas, Sol y Fobos ---------- */}
        <rect width={VW} height={SH} fill="url(#mars-sky)" />
        {SKY_STARS.map(([fx, y, r], i) => (
          <motion.circle
            key={i}
            cx={fx * VW}
            cy={y}
            r={r}
            fill="#e2e8f0"
            animate={{ opacity: [0.25, 0.9, 0.25] }}
            transition={{ duration: 2 + (i % 4), repeat: Infinity, delay: (i % 7) * 0.4 }}
          />
        ))}
        <circle cx={VW * 0.8} cy={70} r={13} fill="#e0f2fe" opacity={0.9} />
        <circle cx={VW * 0.8} cy={70} r={26} fill="#e0f2fe" opacity={0.12} />
        <ellipse cx={VW * 0.27} cy={56} rx={7} ry={5} fill="#a8a29e" />

        {/* Auroras y partículas cuando DONKI detecta radiación alta */}
        {storm && (
          <g>
            {[0, 1, 2].map((i) => (
              <motion.path
                key={i}
                d={`M0 ${110 + i * 24} Q${VW * 0.25} ${60 + i * 28} ${VW * 0.5} ${105 + i * 20} T${VW} ${92 + i * 26}`}
                stroke={i % 2 ? '#a78bfa' : '#4ade80'}
                strokeWidth={14 - i * 3}
                fill="none"
                strokeLinecap="round"
                animate={{ opacity: [0.1, 0.45, 0.1] }}
                transition={{ duration: 3 + i, repeat: Infinity }}
              />
            ))}
            {Array.from({ length: 14 }).map((_, i) => (
              <motion.line
                key={`p${i}`}
                x1={((i * 71) % 100) * (VW / 100)}
                y1={-10}
                x2={((i * 71) % 100) * (VW / 100) - 18}
                y2={14}
                stroke="#fde68a"
                strokeWidth={1.6}
                animate={{ y: [0, GROUND_Y], opacity: [0, 0.9, 0] }}
                transition={{ duration: 1.6 + (i % 3) * 0.4, repeat: Infinity, delay: (i % 7) * 0.3 }}
              />
            ))}
          </g>
        )}

        {/* ---------- Montañas y dunas del Cráter Jezero ---------- */}
        <path d={ridge(VW, 300, 90, 1.3, 30)} fill="#9a3412" opacity={0.55} />
        <path d={ridge(VW, 356, 60, 4.1, 26)} fill="#b45309" opacity={0.8} />
        <path d={ridge(VW, 400, 26, 2.2, 20)} fill="#c2410c" />
        <rect y={GROUND_Y - 4} width={VW} height={SH - GROUND_Y + 4} fill="url(#mars-ground)" />
        {ROCKS.map(([fx, y, rx, ry], i) => (
          <g key={i}>
            <ellipse cx={fx * VW} cy={y + ry * 0.6} rx={rx} ry={ry * 0.5} fill="#431407" opacity={0.35} />
            <ellipse cx={fx * VW} cy={y} rx={rx} ry={ry} fill="#9a3412" />
            <ellipse cx={fx * VW - rx * 0.3} cy={y - ry * 0.35} rx={rx * 0.45} ry={ry * 0.35} fill="#c2410c" />
          </g>
        ))}
        {/* Huellas del rover que se fue */}
        <path d={`M${bx - 30} ${GROUND_Y + 34} Q${bx - 260} ${GROUND_Y + 76} ${bx - 620} ${GROUND_Y + 64}`} stroke="#7c2d12" strokeWidth={5} strokeDasharray="6 7" fill="none" opacity={0.6} />

        {/* Sombra del hábitat */}
        <ellipse cx={hx} cy={GROUND_Y + 8} rx={BODY.w / 2 + 30} ry={18} fill="#431407" opacity={0.4} />

        {/* ================= HÁBITAT (clic → Sistemas e Inventario) ================= */}
        <g {...clickable('habitat', onHabitatClick)} aria-label="Hábitat Ares-IV: abrir Sistemas e Inventario">
          {/* Patas cortas integradas en la base */}
          {[-0.4, -0.16, 0.16, 0.4].map((f) => {
            const x = hx + f * BODY.w;
            return (
              <g key={f}>
                <path d={`M${x} ${BODY.y + BODY.h - 10} L${x + f * 30} ${GROUND_Y}`} stroke="#94a3b8" strokeWidth={10} strokeLinecap="round" />
                <rect x={x + f * 30 - 18} y={GROUND_Y - 3} width={36} height={8} rx={4} fill="#64748b" />
              </g>
            );
          })}

          {/* Soportes estructurales angulares (del cuerpo a las patas exteriores) */}
          {[-1, 1].map((s) => (
            <polygon
              key={s}
              points={`${hx + s * 150},${BODY.y + BODY.h - 8} ${hx + s * 186},${BODY.y + BODY.h - 8} ${hx + s * 246},${GROUND_Y - 10} ${hx + s * 228},${GROUND_Y - 10}`}
              fill="url(#hab-strut)"
              stroke="#64748b"
              strokeWidth={1.2}
            />
          ))}

          {/* Cúpula rebajada aeroespacial */}
          <path d={`M${hx - 205} ${BODY.y + 10} A205 62 0 0 1 ${hx + 205} ${BODY.y + 10} Z`} fill="url(#hab-dome)" stroke="#94a3b8" strokeWidth={2} />
          <path d={`M${hx - 140} ${BODY.y - 28} Q${hx - 50} ${BODY.y - 50} ${hx + 30} ${BODY.y - 48}`} stroke="#ffffff" strokeWidth={6} fill="none" strokeLinecap="round" opacity={0.85} />
          <text x={hx} y={BODY.y - 10} textAnchor="middle" fontSize={17} fontWeight={900} fill="#0b3d91" fontFamily="Orbitron, ui-monospace, monospace" letterSpacing={4}>
            ARES-IV
          </text>
          <rect x={hx - 7} y={BODY.y - 60} width={14} height={8} rx={2} fill="#64748b" />
          <circle cx={hx} cy={BODY.y - 64} r={5} fill={lowPower ? '#475569' : '#38bdf8'} />

          {/* Cuerpo presurizado: paneles curvos de compuesto cerámico liso (sin rayas ni puntos) */}
          <rect x={bx} y={BODY.y} width={BODY.w} height={BODY.h} rx={BODY.r} fill="url(#hab-body)" stroke="#94a3b8" strokeWidth={2} />
          <g clipPath="url(#hab-body-clip)">
            <rect x={bx} y={BODY.y} width={BODY.w} height={BODY.h} fill="url(#hab-sheen)" />
            <rect x={bx + 30} y={BODY.y + 6} width={BODY.w - 60} height={34} rx={17} fill="url(#hab-top-light)" />
          </g>

          {/* Chapitas de estado de cada tripulante (sobre el visor, en el chasis) */}
          {CREW.map((c, i) =>
            moods[i] in STATUS_CHIP ? (
              <StatusChip key={c.name} x={crewX(c.cx) - 11} y={WIN.y - BEZEL.top - 28} {...STATUS_CHIP[moods[i] as keyof typeof STATUS_CHIP]} />
            ) : null,
          )}

          {/* ---- Bisel octogonal aerodinámico (titanio claro + azul marino NASA) ---- */}
          <polygon
            points={octagonPoints(winX - BEZEL.padX, WIN.y - BEZEL.top, winX + WIN.w + BEZEL.padX, WIN.y + WIN.h + BEZEL.bottom, BEZEL.chamfer)}
            fill="url(#hab-bezel)"
            stroke="#0b3d91"
            strokeWidth={3}
          />
          <polygon
            points={octagonPoints(winX - BEZEL.padX + 7, WIN.y - BEZEL.top + 7, winX + WIN.w + BEZEL.padX - 7, WIN.y + WIN.h + BEZEL.bottom - 7, BEZEL.chamfer - 6)}
            fill="none"
            stroke="#ffffff"
            strokeWidth={1.5}
            opacity={0.7}
          />

          {/* ---- Visor panorámico: solo asoman los cascos ---- */}
          <rect x={winX - 16} y={WIN.y - 14} width={WIN.w + 32} height={WIN.h + 28} rx={WIN.r + 10} fill="url(#window-glow)" />
          <g clipPath="url(#hab-window)">
            <rect x={winX} y={WIN.y} width={WIN.w} height={WIN.h} fill="url(#hab-interior)" />
            {Array.from({ length: 9 }).map((_, i) => (
              <line key={i} x1={winX + (i + 1) * (WIN.w / 10)} y1={WIN.y} x2={winX + (i + 1) * (WIN.w / 10)} y2={WIN.y + WIN.h} stroke="#334155" strokeWidth={1} opacity={0.5} />
            ))}
            <rect x={winX + 50} y={WIN.y + 4} width={WIN.w - 100} height={3} rx={1.5} fill={lowPower ? '#334155' : '#38bdf8'} opacity={0.8} />
            <rect x={winX} y={WIN.y} width={WIN.w} height={WIN.h} fill="url(#hab-interior-glow)" />
            {/* Máquinas del interior (2 columnas a cada lado de los cascos) */}
            {activeIcons.map((id, i) => {
              const left = i % 2 === 0;
              const slot = Math.floor(i / 2);
              const col = slot % 2;
              const row = Math.floor(slot / 2);
              const x = left ? winX + 10 + col * 30 : winX + WIN.w - 34 - col * 30;
              const y = WIN.y + 12 + row * 34;
              const broken = brokenMachines.includes(id);
              const on = Boolean(machineStates[id]) && !broken;
              return (
                <g key={id}>
                  <rect x={x} y={y} width={24} height={24} rx={5} fill="#020617" opacity={0.9} stroke={broken ? '#ef4444' : on ? '#38bdf8' : '#475569'} strokeWidth={1.4} />
                  <ItemIcon id={id} x={x + 4} y={y + 4} size={16} color={broken ? '#fca5a5' : on ? '#7dd3fc' : '#64748b'} />
                </g>
              );
            })}
            {/* Cascos de la tripulación (el torso queda oculto bajo el chasis) */}
            <g transform={`translate(${hx} ${WIN.y}) scale(${CREW_SCALE}) translate(-320 ${-CREW_TOP})`}>
              {CREW.map((c, i) => (
                <Astronaut key={c.name} {...c} mood={moods[i]} shiver={lowPower} showStatus={false} />
              ))}
            </g>
            {lowPower && <rect x={winX} y={WIN.y} width={WIN.w} height={WIN.h} fill="#020617" opacity={0.35} />}
            {alarm && (
              <motion.rect x={winX} y={WIN.y} width={WIN.w} height={WIN.h} fill="#dc2626" animate={{ opacity: [0, 0.22, 0] }} transition={{ duration: 1.2, repeat: Infinity }} />
            )}
            <polygon points={`${winX},${WIN.y} ${winX + 150},${WIN.y} ${winX + 90},${WIN.y + WIN.h} ${winX},${WIN.y + WIN.h}`} fill="url(#glass-reflection)" />
          </g>
          {/* Junta del cristal */}
          <rect x={winX} y={WIN.y} width={WIN.w} height={WIN.h} rx={WIN.r} fill="none" stroke="#0b3d91" strokeWidth={4} />
          <rect x={winX + 3} y={WIN.y + 3} width={WIN.w - 6} height={WIN.h - 6} rx={WIN.r - 3} fill="none" stroke="#f8fafc" strokeWidth={1.2} opacity={0.6} />

          {/* Banda azul marino del bisel con las 3 placas de nombre integradas */}
          <rect x={winX - 8} y={SILL.y} width={WIN.w + 16} height={SILL.h} rx={8} fill="#0b3d91" />
          {CREW.map((c) => (
            <g key={c.name}>
              <rect x={crewX(c.cx) - 50} y={SILL.y + 4} width={100} height={16} rx={3} fill="url(#id-plate)" stroke="#0f172a" strokeWidth={0.8} />
              <rect x={crewX(c.cx) - 50} y={SILL.y + 4} width={4} height={16} fill={c.accent} />
              <text
                x={crewX(c.cx) + 2}
                y={SILL.y + 15.5}
                textAnchor="middle"
                fontSize={11}
                fontWeight={800}
                letterSpacing={0.6}
                fill="#0f172a"
                fontFamily="ui-monospace, SFMono-Regular, Menlo, Consolas, monospace"
              >
                {c.name.toUpperCase()}
              </text>
            </g>
          ))}

          {/* Luces LED alargadas integradas en el bisel (verdes OK · rojas parpadeantes con averías) */}
          <LedStrip x={winX - BEZEL.padX / 2 - 2} y={WIN.y + 10} h={WIN.h - 20} alert={needsRepair} />
          <LedStrip x={winX + WIN.w + BEZEL.padX / 2 + 2} y={WIN.y + 10} h={WIN.h - 20} alert={needsRepair} />

          {/* Zona de clic amplia (invisible) */}
          <rect x={bx - 10} y={BODY.y - 70} width={BODY.w + 20} height={GROUND_Y - BODY.y + 76} fill="transparent" />
          {hover === 'habitat' && <HoverTip x={hx} y={BODY.y + 40} maxX={VW} text={needsRepair ? 'Sistemas e Inventario · reparar averías' : 'Sistemas e Inventario'} />}
        </g>

        {/* ================= ANTENA DEL TEJADO (clic → Enlace Houston) ================= */}
        <g {...clickable('antenna', onAntennaClick)} aria-label="Antena de alta ganancia: abrir Enlace Houston">
          <rect x={antX - 5} y={dishY + 8} width={10} height={BODY.y - dishY - 6} fill="#94a3b8" />
          <rect x={antX - 16} y={BODY.y - 8} width={32} height={9} rx={2} fill="#64748b" />
          <g transform={`rotate(-28 ${antX} ${dishY})`}>
            <path d={`M${antX - 42} ${dishY - 8} Q${antX} ${dishY + 30} ${antX + 42} ${dishY - 8} Z`} fill="#f8fafc" stroke="#7dd3fc" strokeWidth={2} />
            <path d={`M${antX} ${dishY + 10} L${antX} ${dishY - 30}`} stroke="#64748b" strokeWidth={3} />
            <motion.circle cx={antX} cy={dishY - 32} r={4.5} fill="#38bdf8" animate={{ opacity: [1, 0.35, 1] }} transition={{ duration: 1.2, repeat: Infinity }} />
          </g>
          {/* Ondas concéntricas hacia el cielo */}
          {[0, 1, 2].map((i) => (
            <motion.circle
              key={i}
              cx={antX - 18}
              cy={dishY - 40}
              fill="none"
              stroke="#7dd3fc"
              strokeWidth={2.5}
              initial={{ r: 8, opacity: 0 }}
              animate={{ r: [8, 70], opacity: [0.9, 0] }}
              transition={{ duration: 2.4, repeat: Infinity, delay: i * 0.8, ease: 'easeOut' }}
            />
          ))}
          <rect x={antX - 60} y={dishY - 70} width={120} height={BODY.y - dishY + 70} fill="transparent" />
          {hover === 'antenna' && <HoverTip x={antX} y={BODY.y + 30} maxX={VW} text={antennaTip} />}
        </g>
      </svg>
    </div>
  );
}
