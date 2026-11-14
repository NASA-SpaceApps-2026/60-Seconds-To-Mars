import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Cable, CircleCheck, Crosshair, Dices, Droplets, Radio, SatelliteDish, SunMedium, Timer, TriangleExclamationPoint, Wrench } from 'lucide-react';
import { DebrisGame, LeakGame } from './QuickGames';
import type { MinigameKind } from '../../types/game';
import { MINIGAME_META, debrisFact, dustFact, leakFact } from '../../data/missionExtras';
import { formatFlareDate } from '../../services/nasaApi';
import { useGameStore } from '../../store/useGameStore';
import { earthMarsLink } from '../../utils/marsEphemeris';
import { playBlip, playButtonClick, playErrorBuzz, playPickup, playSuccess, playTick } from '../../utils/soundEffects';
import { tr } from '../../i18n/core';

type Phase = 'intro' | 'play' | 'won' | 'lost';

/** Cuenta atrás con requestAnimationFrame (ms restantes); llama a onEnd al llegar a 0. */
function useCountdown(seconds: number, running: boolean, onEnd: () => void) {
  const [left, setLeft] = useState(seconds * 1000);
  const endRef = useRef(onEnd);
  endRef.current = onEnd;
  useEffect(() => {
    if (!running) return;
    const start = performance.now();
    let raf = 0;
    let lastSec = seconds;
    const loop = (now: number) => {
      const rem = Math.max(0, seconds * 1000 - (now - start));
      setLeft(rem);
      const sec = Math.ceil(rem / 1000);
      if (sec !== lastSec && sec <= 3 && sec > 0) playTick();
      lastSec = sec;
      if (rem <= 0) {
        endRef.current();
        return;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [running, seconds]);
  return left;
}

// =====================================================================
// Minijuego A · Reconectar cables del escudo (8 s)
// =====================================================================
const WIRES = [
  { id: 'o2', get label() { return tr('O2-AZUL', 'O2-BLUE'); }, color: '#3b82f6' },
  { id: 'pwr', get label() { return tr('PWR-ÁMBAR', 'PWR-AMBER'); }, color: '#f59e0b' },
  { id: 'bio', get label() { return tr('BIO-VERDE', 'BIO-GREEN'); }, color: '#22c55e' },
  { id: 'rad', get label() { return tr('RAD-ROJO', 'RAD-RED'); }, color: '#ef4444' },
] as const;
const LX = 92;
const RX = 408;
const rowY = (i: number) => 46 + i * 62;

function CablesGame({ onWin }: { onWin: () => void }) {
  const right = useMemo(() => {
    const order = [0, 1, 2, 3];
    do order.sort(() => Math.random() - 0.5);
    while (order.every((v, i) => v === i));
    return order;
  }, []);
  const [links, setLinks] = useState<number[]>([]); // índices de WIRES ya conectados
  const [selected, setSelected] = useState<number | null>(null);
  const [cursor, setCursor] = useState<{ x: number; y: number } | null>(null);
  const [wrong, setWrong] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const toSvg = (e: ReactPointerEvent) => {
    const svg = svgRef.current;
    const ctm = svg?.getScreenCTM();
    if (!svg || !ctm) return null;
    const pt = new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse());
    return { x: pt.x, y: pt.y };
  };

  const tryConnect = (rightRow: number) => {
    if (selected === null) return;
    const wire = right[rightRow];
    if (wire === selected) {
      const next = [...links, wire];
      setLinks(next);
      playPickup();
      if (next.length === WIRES.length) onWin();
    } else {
      setWrong(rightRow);
      playErrorBuzz();
      setTimeout(() => setWrong(null), 350);
    }
    setSelected(null);
    setCursor(null);
  };

  return (
    <svg
      ref={svgRef}
      viewBox="0 0 500 280"
      className="w-full touch-none select-none rounded-xl border-2 border-slate-200 bg-slate-900"
      onPointerMove={(e) => selected !== null && setCursor(toSvg(e))}
      onPointerUp={() => {
        // Soltar fuera de un conector cancela el arrastre (el clic simple sigue seleccionado)
        setCursor(null);
      }}
    >
      <rect x={200} y={20} width={100} height={240} rx={10} fill="#1e293b" stroke="#334155" />
      <text x={250} y={146} textAnchor="middle" fontSize={12} fontWeight={700} fill="#64748b" fontFamily="ui-monospace, monospace">
        {tr('BLINDAJE', 'SHIELD')}
      </text>
      {/* Cables conectados */}
      {links.map((w) => {
        const r = right.indexOf(w);
        return (
          <path
            key={w}
            d={`M${LX} ${rowY(w)} C${LX + 140} ${rowY(w)} ${RX - 140} ${rowY(r)} ${RX} ${rowY(r)}`}
            stroke={WIRES[w].color}
            strokeWidth={9}
            fill="none"
            strokeLinecap="round"
          />
        );
      })}
      {/* Cable que se arrastra */}
      {selected !== null && cursor && (
        <path d={`M${LX} ${rowY(selected)} L${cursor.x} ${cursor.y}`} stroke={WIRES[selected].color} strokeWidth={8} strokeLinecap="round" opacity={0.85} />
      )}
      {/* Terminales de salida */}
      {WIRES.map((w, i) => {
        const done = links.includes(i);
        return (
          <g
            key={w.id}
            className={done ? '' : 'cursor-pointer'}
            onPointerDown={(e) => {
              if (done) return;
              (e.target as Element).releasePointerCapture?.(e.pointerId);
              setSelected(i);
              setCursor(toSvg(e));
              playBlip();
            }}
          >
            <rect x={8} y={rowY(i) - 20} width={84} height={40} rx={6} fill={selected === i ? '#ffffff' : '#0f172a'} stroke={w.color} strokeWidth={3} />
            <text x={50} y={rowY(i) + 5} textAnchor="middle" fontSize={11} fontWeight={800} fill={selected === i ? '#0f172a' : '#e2e8f0'} fontFamily="ui-monospace, monospace">
              {w.label}
            </text>
            <circle cx={LX} cy={rowY(i)} r={9} fill={w.color} stroke="#ffffff" strokeWidth={2} />
          </g>
        );
      })}
      {/* Conectores desordenados */}
      {right.map((wireIdx, r) => {
        const w = WIRES[wireIdx];
        const done = links.includes(wireIdx);
        return (
          <g key={w.id} className={done ? '' : 'cursor-pointer'} onPointerUp={() => !done && tryConnect(r)}>
            <motion.g animate={wrong === r ? { x: [0, -6, 6, 0] } : { x: 0 }} transition={{ duration: 0.3 }}>
              <rect x={408} y={rowY(r) - 20} width={84} height={40} rx={6} fill="#0f172a" stroke={w.color} strokeWidth={3} />
              <text x={450} y={rowY(r) + 5} textAnchor="middle" fontSize={11} fontWeight={800} fill="#e2e8f0" fontFamily="ui-monospace, monospace">
                {w.label}
              </text>
              <circle cx={RX} cy={rowY(r)} r={9} fill={done ? w.color : '#0f172a'} stroke={w.color} strokeWidth={3} />
            </motion.g>
          </g>
        );
      })}
    </svg>
  );
}

// =====================================================================
// Minijuego B · Limpiar polvo de los paneles solares (7 s)
// =====================================================================
const DUST_COLS = 5;
const DUST_ROWS = 4;

function DustGame({ onWin }: { onWin: () => void }) {
  const [clean, setClean] = useState<boolean[]>(() => Array(DUST_COLS * DUST_ROWS).fill(false));
  const lastSound = useRef(0);
  const won = useRef(false);

  const cleanRef = useRef(clean);
  const wipe = (i: number) => {
    if (cleanRef.current[i]) return;
    const next = [...cleanRef.current];
    next[i] = true;
    cleanRef.current = next;
    setClean(next);
    const now = performance.now();
    if (now - lastSound.current > 70) {
      playBlip();
      lastSound.current = now;
    }
    if (!won.current && next.every(Boolean)) {
      won.current = true;
      onWin();
    }
  };

  // Ratón (hover) y dedo (arrastre): miramos qué celda hay bajo el puntero
  const onMove = (e: ReactPointerEvent) => {
    const el = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
    const idx = el?.dataset.cell;
    if (idx !== undefined) wipe(Number(idx));
  };

  const pct = Math.round((clean.filter(Boolean).length / clean.length) * 100);

  return (
    <div>
      <div
        className="grid touch-none select-none gap-1 rounded-xl border-4 border-slate-300 bg-slate-400 p-1"
        style={{ gridTemplateColumns: `repeat(${DUST_COLS}, minmax(0, 1fr))` }}
        onPointerMove={onMove}
        onPointerDown={onMove}
      >
        {clean.map((c, i) => (
          <div
            key={i}
            data-cell={i}
            className="relative aspect-[4/3] overflow-hidden rounded-sm"
            style={{
              background: 'linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 45%, #172554 100%)',
              backgroundSize: '100% 100%',
            }}
          >
            {/* Rejilla de células solares */}
            <div
              data-cell={i}
              className="absolute inset-0"
              style={{
                backgroundImage: 'linear-gradient(#93c5fd55 1px, transparent 1px), linear-gradient(90deg, #93c5fd55 1px, transparent 1px)',
                backgroundSize: '33% 50%',
              }}
            />
            <AnimatePresence>
              {!c && (
                <motion.div
                  data-cell={i}
                  className="absolute inset-0"
                  initial={{ opacity: 1 }}
                  exit={{ opacity: 0, scale: 1.2 }}
                  transition={{ duration: 0.25 }}
                  style={{
                    background:
                      'radial-gradient(circle at 30% 35%, #c2410c 0 18%, transparent 19%), radial-gradient(circle at 70% 65%, #9a3412 0 14%, transparent 15%), #ea580c',
                    opacity: 0.95,
                  }}
                />
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>
      <div className="mt-2 flex items-center gap-2 text-sm font-bold text-slate-700">
        <SunMedium className="h-4 w-4 text-amber-500" strokeWidth={1.75} /> {tr('Panel limpio', 'Panel clean')}: <span className="font-mono">{pct} %</span>
      </div>
    </div>
  );
}

// =====================================================================
// Minijuego C · Sintonizar la frecuencia con el satélite (8 s, mantener 2 s)
// =====================================================================
/** Basta con 1,2 s acumulados cerca de la onda; fuera del margen, el progreso baja despacio (no se reinicia). */
const HOLD_MS = 1200;
const DECAY_RATE = 0.25;
/** Margen generoso: ±20 % respecto a la onda del satélite cuenta como "sintonizado". */
const TOLERANCE = 0.2;

function wavePath(freq: number, amp: number, phase: number) {
  const pts: string[] = [];
  for (let x = 0; x <= 400; x += 4) {
    const y = 90 - Math.sin((x / 400) * Math.PI * 2 * freq + phase) * amp * 70;
    pts.push(`${x === 0 ? 'M' : 'L'}${x} ${y.toFixed(1)}`);
  }
  return pts.join(' ');
}

function RadioGame({ running, onWin }: { running: boolean; onWin: () => void }) {
  const target = useMemo(() => ({ freq: 1.5 + Math.random() * 2.5, amp: 0.35 + Math.random() * 0.5 }), []);
  const [freq, setFreq] = useState(() => (target.freq > 2.75 ? 1.1 : 4.6));
  const [amp, setAmp] = useState(() => (target.amp > 0.6 ? 0.25 : 0.95));
  const [phase, setPhase] = useState(0);
  const [hold, setHold] = useState(0);
  const matched = Math.abs(freq - target.freq) <= target.freq * TOLERANCE && Math.abs(amp - target.amp) <= target.amp * TOLERANCE;
  const matchedRef = useRef(matched);
  matchedRef.current = matched;
  const won = useRef(false);
  const onWinRef = useRef(onWin);
  onWinRef.current = onWin;

  useEffect(() => {
    if (!running) return;
    let raf = 0;
    let last = performance.now();
    let held = 0;
    const loop = (now: number) => {
      const dt = now - last;
      last = now;
      setPhase((p) => p + dt * 0.004);
      held = matchedRef.current ? held + dt : Math.max(0, held - dt * DECAY_RATE);
      setHold(held);
      if (held >= HOLD_MS && !won.current) {
        won.current = true;
        onWinRef.current();
        return;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [running]);

  return (
    <div>
      <svg viewBox="0 0 400 180" className="w-full rounded-xl border-2 border-slate-200 bg-slate-950">
        {Array.from({ length: 9 }).map((_, i) => (
          <line key={`v${i}`} x1={i * 50} y1={0} x2={i * 50} y2={180} stroke="#1e293b" />
        ))}
        {Array.from({ length: 5 }).map((_, i) => (
          <line key={`h${i}`} x1={0} y1={i * 45} x2={400} y2={i * 45} stroke="#1e293b" />
        ))}
        <path d={wavePath(target.freq, target.amp, phase)} stroke="#22d3ee" strokeWidth={4} fill="none" strokeDasharray="10 6" opacity={0.9} />
        <path d={wavePath(freq, amp, phase)} stroke={matched ? '#4ade80' : '#3b82f6'} strokeWidth={3} fill="none" />
        <text x={8} y={16} fontSize={11} fontWeight={700} fill="#22d3ee" fontFamily="ui-monospace, monospace">
          {tr('SATÉLITE', 'SATELLITE')}
        </text>
        <text x={8} y={172} fontSize={11} fontWeight={700} fill={matched ? '#4ade80' : '#60a5fa'} fontFamily="ui-monospace, monospace">
          {matched ? tr('SEÑAL ENGANCHADA', 'SIGNAL LOCKED') : tr('TU ANTENA', 'YOUR ANTENNA')}
        </text>
      </svg>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1 text-sm font-bold text-slate-700">
          <span className="flex justify-between">
            {tr('Frecuencia', 'Frequency')} <span className="font-mono text-slate-500">{freq.toFixed(2)} Hz</span>
          </span>
          <input type="range" min={1} max={5} step={0.02} value={freq} disabled={!running} onChange={(e) => setFreq(Number(e.target.value))} className="accent-nasa-blue" />
        </label>
        <label className="grid gap-1 text-sm font-bold text-slate-700">
          <span className="flex justify-between">
            {tr('Amplitud', 'Amplitude')} <span className="font-mono text-slate-500">{amp.toFixed(2)}</span>
          </span>
          <input type="range" min={0.2} max={1} step={0.01} value={amp} disabled={!running} onChange={(e) => setAmp(Number(e.target.value))} className="accent-nasa-blue" />
        </label>
      </div>
      <div className="mt-2 flex items-center gap-2 text-sm font-bold text-slate-700">
        {tr('Enganche', 'Lock')}
        <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-200">
          <div className="h-full bg-emerald-500 transition-[width] duration-75" style={{ width: `${Math.min(100, (hold / HOLD_MS) * 100)}%` }} />
        </div>
        <span className="font-mono">{(Math.min(hold, HOLD_MS) / 1000).toFixed(1)} / 1,2 s</span>
      </div>
    </div>
  );
}

// =====================================================================
// Modal común
// =====================================================================
const KIND_ICON = { cables: Cable, dust: SunMedium, radio: SatelliteDish, leak: Droplets, debris: Crosshair } as const;

/** Telemetría real de la NASA que provoca cada minijuego. */
function useTelemetryLine(kind: MinigameKind) {
  const weather = useGameStore((s) => s.nasaWeather);
  const link = useMemo(() => earthMarsLink(), []);
  if (kind === 'cables') {
    return weather
      ? tr(
          `Pico de Radiación Real DONKI: Clase ${weather.flareClass} (${formatFlareDate(weather.peakTime)}) — Reconecta los circuitos del blindaje.`,
          `Real DONKI Radiation Peak: Class ${weather.flareClass} (${formatFlareDate(weather.peakTime)}) — Reconnect the shield circuits.`,
        )
      : tr('Pico de Radiación detectado por NASA DONKI — Reconecta los circuitos del blindaje.', 'Radiation peak detected by NASA DONKI — Reconnect the shield circuits.');
  }
  if (kind === 'dust') return dustFact();
  if (kind === 'leak') return leakFact();
  if (kind === 'debris') return debrisFact();
  return tr(
    `Deep Space Network de la NASA: Marte está a ≈ ${Math.round(link.distanceMillionKm)} millones de km — cada mensaje tarda ≈ ${Math.round(link.lightDelayMinutes)} minutos en llegar a la Tierra.`,
    `NASA Deep Space Network: Mars is ≈ ${Math.round(link.distanceMillionKm)} million km away — each message takes ≈ ${Math.round(link.lightDelayMinutes)} minutes to reach Earth.`,
  );
}

interface Props {
  kind: MinigameKind | null;
  /** Texto de lo que está en juego (se muestra bajo el título). */
  stakes: string;
  onResult: (success: boolean) => void;
  /** "Cambiar prueba": otro de los 5 minijuegos si el niño se atasca (sin penalización). */
  onSwitch?: () => void;
}

/** Minijuegos de emergencia: si lo superas a tiempo, la crisis no ocurre. */
export default function EmergencyMinigameModal({ kind, stakes, onResult, onSwitch }: Props) {
  return <AnimatePresence>{kind && <MinigameCard key={kind} kind={kind} stakes={stakes} onResult={onResult} onSwitch={onSwitch} />}</AnimatePresence>;
}

function MinigameCard({ kind, stakes, onResult, onSwitch }: { kind: MinigameKind; stakes: string; onResult: (success: boolean) => void; onSwitch?: () => void }) {
  const meta = MINIGAME_META[kind];
  const Icon = KIND_ICON[kind];
  const telemetry = useTelemetryLine(kind);
  const [phase, setPhase] = useState<Phase>('intro');
  const [intro, setIntro] = useState(3);

  // Cuenta atrás de preparación 3-2-1
  useEffect(() => {
    if (phase !== 'intro') return;
    if (intro <= 0) {
      setPhase('play');
      return;
    }
    playTick();
    const t = setTimeout(() => setIntro((n) => n - 1), 650);
    return () => clearTimeout(t);
  }, [phase, intro]);

  const phaseRef = useRef<Phase>(phase);
  phaseRef.current = phase;
  const finish = (result: 'won' | 'lost') => {
    if (phaseRef.current !== 'play') return;
    phaseRef.current = result;
    if (result === 'won') playSuccess();
    else playErrorBuzz();
    setPhase(result);
  };
  const win = () => finish('won');
  const left = useCountdown(meta.seconds, phase === 'play', () => finish('lost'));
  const pct = (left / (meta.seconds * 1000)) * 100;
  const done = phase === 'won' || phase === 'lost';

  return (
    <motion.div
      className="fixed inset-0 z-[55] flex items-start justify-center overflow-y-auto bg-slate-950/80 p-4 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      role="dialog"
      aria-modal="true"
      aria-label={meta.title}
    >
      <motion.div initial={{ y: 24, scale: 0.96 }} animate={{ y: 0, scale: 1 }} className="my-auto w-full max-w-3xl rounded-2xl border-2 border-slate-200 bg-white p-3 shadow-2xl sm:p-5">
        {/* Cabecera (móvil: título a todo el ancho y "Cambiar prueba" en su propia fila) */}
        <div className="flex flex-wrap items-start gap-x-3 gap-y-2">
          <span className="hidden h-12 w-12 shrink-0 place-items-center rounded-lg border border-slate-200 bg-slate-100 text-nasa-blue sm:grid">
            <Icon className="h-7 w-7" strokeWidth={1.75} />
          </span>
          <div className="min-w-0 flex-1 basis-[12rem]">
            <p className="font-mono text-xs tracking-[0.18em] text-slate-500 sm:tracking-[0.25em]">{tr('INTERVENCIÓN MANUAL', 'MANUAL OVERRIDE')} // {meta.code}</p>
            <h2 className="font-display text-lg font-black leading-tight text-nasa-blue sm:text-2xl">{meta.title}</h2>
            <p className="text-sm font-semibold text-slate-600">{stakes}</p>
          </div>
          {onSwitch && !done && (
            <button
              type="button"
              onClick={() => {
                playButtonClick();
                onSwitch();
              }}
              className="flex shrink-0 items-center justify-center gap-1.5 self-center rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-600 transition hover:border-nasa-blue hover:text-nasa-blue max-sm:order-last max-sm:w-full"
              title={tr('Prueba otro de los 5 minijuegos', 'Try another of the 5 mini-games')}
            >
              <Dices className="h-4 w-4" strokeWidth={1.75} /> {tr('Cambiar prueba', 'Switch test')}
            </button>
          )}
          <div className={`font-display shrink-0 rounded-xl border-2 px-3 py-1 text-center sm:px-4 ${pct < 35 && phase === 'play' ? 'border-nasa-red text-nasa-red' : 'border-nasa-blue text-nasa-blue'}`}>
            <Timer className="mx-auto h-4 w-4" />
            <span className="text-2xl font-black tabular-nums sm:text-3xl">{(left / 1000).toFixed(1)}</span>
          </div>
        </div>

        {/* Telemetría real de la NASA */}
        <div className="mt-3 flex gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-950">
          <Radio className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.75} />
          <span>{telemetry}</span>
        </div>

        {/* Barra de tiempo */}
        <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-slate-200">
          <div className={`h-full ${pct < 35 ? 'bg-nasa-red' : 'bg-nasa-blue'}`} style={{ width: `${pct}%` }} />
        </div>
        <p className="mt-2 text-base text-slate-700">{meta.instructions}</p>

        {/* Zona de juego */}
        <div className="relative mt-3">
          <div className={done ? 'pointer-events-none opacity-60' : ''}>
            {kind === 'cables' && <CablesGame onWin={win} />}
            {kind === 'dust' && <DustGame onWin={win} />}
            {kind === 'radio' && <RadioGame running={phase === 'play'} onWin={win} />}
            {kind === 'leak' && <LeakGame running={phase === 'play'} onWin={win} />}
            {kind === 'debris' && <DebrisGame running={phase === 'play'} onWin={win} />}
          </div>
          <AnimatePresence>
            {phase === 'intro' && (
              <motion.div
                key="intro"
                className="absolute inset-0 grid place-items-center rounded-xl bg-white/85"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <motion.span key={intro} initial={{ scale: 1.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="font-display text-7xl font-black text-nasa-blue">
                  {intro > 0 ? intro : tr('¡YA!', 'GO!')}
                </motion.span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Resultado */}
        <AnimatePresence>
          {done && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`mt-4 flex flex-col items-center gap-3 rounded-xl border-2 p-4 text-center sm:flex-row sm:text-left ${
                phase === 'won' ? 'border-emerald-500 bg-emerald-50' : 'border-nasa-red bg-red-50'
              }`}
            >
              {phase === 'won' ? (
                <CircleCheck className="h-10 w-10 shrink-0 text-emerald-600" strokeWidth={1.75} />
              ) : (
                <TriangleExclamationPoint className="h-10 w-10 shrink-0 text-nasa-red" strokeWidth={1.75} />
              )}
              <div className="flex-1">
                <p className={`font-display text-xl font-black ${phase === 'won' ? 'text-emerald-700' : 'text-nasa-red'}`}>
                  {phase === 'won' ? tr('¡REPARACIÓN COMPLETADA!', 'REPAIR COMPLETE!') : tr('TIEMPO AGOTADO', 'TIME IS UP')}
                </p>
                <p className="text-sm text-slate-700">{phase === 'won' ? tr('Has evitado la avería a tiempo.', 'You stopped the breakdown in time.') : tr('La avería se ha activado en la base espacial.', 'The breakdown has hit the space base.')}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  playButtonClick();
                  onResult(phase === 'won');
                }}
                className="font-display flex items-center gap-2 rounded-xl bg-nasa-blue px-6 py-3 font-black tracking-wider text-white"
              >
                <Wrench className="h-5 w-5" strokeWidth={1.75} /> {tr('CONTINUAR', 'CONTINUE')}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}
