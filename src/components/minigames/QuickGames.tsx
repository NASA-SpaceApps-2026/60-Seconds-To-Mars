import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { playBlip, playPickup } from '../../utils/soundEffects';

// =====================================================================
// Minijuego 4 · Tapar fugas de oxígeno en la tubería (whack-a-mole, 9 s)
// =====================================================================
const LEAKS = [
  { x: 70, top: true },
  { x: 160, top: false },
  { x: 250, top: true },
  { x: 340, top: false },
  { x: 430, top: true },
] as const;
const PIPE_Y = 110;
const PIPE_H = 46;
/** Las 2 primeras grietas salen ya; el resto, una cada 0,7 s. */
const LEAK_DELAYS = [0, 0, 700, 1400, 2100];

export function LeakGame({ running, onWin }: { running: boolean; onWin: () => void }) {
  const [visible, setVisible] = useState<boolean[]>(() => LEAKS.map(() => false));
  const [patched, setPatched] = useState<boolean[]>(() => LEAKS.map(() => false));
  const patchedRef = useRef(patched);
  const won = useRef(false);
  const onWinRef = useRef(onWin);
  onWinRef.current = onWin;

  useEffect(() => {
    if (!running) return;
    const timers = LEAK_DELAYS.map((ms, i) => setTimeout(() => setVisible((v) => v.map((x, k) => (k === i ? true : x))), ms));
    return () => timers.forEach(clearTimeout);
  }, [running]);

  const patch = (i: number) => {
    if (!running || !visible[i] || patchedRef.current[i]) return;
    const next = patchedRef.current.map((x, k) => (k === i ? true : x));
    patchedRef.current = next;
    setPatched(next);
    playPickup();
    if (!won.current && next.every(Boolean)) {
      won.current = true;
      onWinRef.current();
    }
  };

  const count = patched.filter(Boolean).length;

  return (
    <div>
      <svg viewBox="0 0 500 220" className="w-full touch-none select-none rounded-xl border-2 border-slate-200 bg-slate-900">
        {/* Pared del hábitat */}
        {[40, 180].map((y) => (
          <rect key={y} x={0} y={y} width={500} height={2} fill="#1e293b" />
        ))}
        {/* Tubería presurizada con bridas */}
        <rect x={10} y={PIPE_Y - PIPE_H / 2} width={480} height={PIPE_H} rx={10} fill="#94a3b8" />
        <rect x={10} y={PIPE_Y - PIPE_H / 2 + 6} width={480} height={8} fill="#cbd5e1" opacity={0.8} />
        {[30, 205, 295, 470].map((x) => (
          <rect key={x} x={x - 9} y={PIPE_Y - PIPE_H / 2 - 7} width={18} height={PIPE_H + 14} rx={3} fill="#64748b" />
        ))}
        <text x={250} y={PIPE_Y + 5} textAnchor="middle" fontSize={12} fontWeight={800} fill="#334155" fontFamily="ui-monospace, monospace" letterSpacing={2}>
          O2 · PRESURIZADO
        </text>

        {LEAKS.map((l, i) => {
          if (!visible[i]) return null;
          const y = l.top ? PIPE_Y - PIPE_H / 2 : PIPE_Y + PIPE_H / 2;
          const dir = l.top ? -1 : 1;
          return (
            <g key={i} className={patched[i] ? '' : 'cursor-pointer'} onPointerDown={() => patch(i)}>
              {/* Zona de clic generosa */}
              <circle cx={l.x} cy={y} r={30} fill="transparent" />
              {patched[i] ? (
                <motion.g initial={{ scale: 1.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} style={{ transformOrigin: `${l.x}px ${y}px` }}>
                  <rect x={l.x - 22} y={y - 9} width={44} height={18} rx={3} fill="#f59e0b" stroke="#b45309" strokeWidth={1.5} transform={`rotate(-12 ${l.x} ${y})`} />
                  <text x={l.x} y={y + 4} textAnchor="middle" fontSize={8} fontWeight={900} fill="#78350f" fontFamily="ui-monospace, monospace" transform={`rotate(-12 ${l.x} ${y})`}>
                    KAPTON
                  </text>
                </motion.g>
              ) : (
                <g>
                  <path d={`M${l.x - 10} ${y} l5 ${-4 * dir} l4 ${6 * dir} l5 ${-5 * dir} l6 ${3 * dir}`} stroke="#0f172a" strokeWidth={3} fill="none" />
                  {/* Vapor que escapa */}
                  {[0, 1, 2].map((k) => (
                    <motion.circle
                      key={k}
                      cx={l.x}
                      cy={y}
                      r={7}
                      fill="#f8fafc"
                      animate={{ cy: [y, y + dir * 46], r: [5, 15], opacity: [0.95, 0] }}
                      transition={{ duration: 0.9, repeat: Infinity, delay: k * 0.3, ease: 'easeOut' }}
                    />
                  ))}
                  <motion.circle cx={l.x} cy={y} r={11} fill="none" stroke="#f87171" strokeWidth={2} animate={{ r: [9, 16], opacity: [1, 0.2] }} transition={{ duration: 0.8, repeat: Infinity }} />
                </g>
              )}
            </g>
          );
        })}
      </svg>
      <p className="mt-2 text-sm font-bold text-slate-700">
        Fugas tapadas: <span className="font-mono">{count} / {LEAKS.length}</span>
      </p>
    </div>
  );
}

// =====================================================================
// Minijuego 5 · Destruir basura espacial / micrometeoritos en el radar (9 s)
// =====================================================================
const RADAR = 150;
const RADAR_R = 132;
const BASE_R = 18;
const ROCK_COUNT = 6;
/** Fracción del radio que recorre una roca por segundo (~4,5 s del borde a la base). */
const ROCK_SPEED = 0.2;
const ROCK_SPAWNS = [0, 600, 1200, 1900, 2700, 3500];

interface Rock {
  id: number;
  angle: number;
  /** Momento (ms desde el inicio) en que entra por el borde. */
  spawn: number;
  destroyed: boolean;
  hitAt: number | null;
}

export function DebrisGame({ running, onWin }: { running: boolean; onWin: () => void }) {
  const [rocks, setRocks] = useState<Rock[]>(() =>
    Array.from({ length: ROCK_COUNT }, (_, i) => ({ id: i, angle: (i * 137 + 25) % 360, spawn: ROCK_SPAWNS[i], destroyed: false, hitAt: null })),
  );
  const [now, setNow] = useState(0);
  const rocksRef = useRef(rocks);
  rocksRef.current = rocks;
  const start = useRef<number | null>(null);
  const won = useRef(false);
  const onWinRef = useRef(onWin);
  onWinRef.current = onWin;

  // Bucle: avanza el tiempo; una roca que llega a la base vuelve a entrar por otro lado (sin castigo extra)
  useEffect(() => {
    if (!running) return;
    let raf = 0;
    const loop = (t: number) => {
      if (start.current === null) start.current = t;
      const el = t - start.current;
      setNow(el);
      const arrived = rocksRef.current.filter((r) => !r.destroyed && el >= r.spawn && 1 - ((el - r.spawn) / 1000) * ROCK_SPEED <= BASE_R / RADAR_R);
      if (arrived.length) {
        setRocks((rs) => rs.map((r) => (arrived.some((a) => a.id === r.id) ? { ...r, spawn: el, angle: (r.angle + 140) % 360 } : r)));
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [running]);

  const posOf = (r: Rock) => {
    const t = r.destroyed && r.hitAt !== null ? r.hitAt : now;
    const dist = Math.max(BASE_R / RADAR_R, 1 - ((t - r.spawn) / 1000) * ROCK_SPEED);
    const a = (r.angle * Math.PI) / 180;
    return { x: RADAR + Math.cos(a) * dist * RADAR_R, y: RADAR + Math.sin(a) * dist * RADAR_R };
  };

  const shoot = (id: number) => {
    if (!running) return;
    const r = rocksRef.current.find((x) => x.id === id);
    if (!r || r.destroyed || now < r.spawn) return;
    const next = rocksRef.current.map((x) => (x.id === id ? { ...x, destroyed: true, hitAt: now } : x));
    rocksRef.current = next;
    setRocks(next);
    playBlip();
    playPickup();
    if (!won.current && next.every((x) => x.destroyed)) {
      won.current = true;
      onWinRef.current();
    }
  };

  const destroyed = rocks.filter((r) => r.destroyed).length;

  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 300 300" className="w-full max-w-[22rem] touch-none select-none rounded-full border-4 border-slate-700 bg-slate-950">
        {/* Anillos y cruz del radar */}
        {[0.33, 0.66, 1].map((f) => (
          <circle key={f} cx={RADAR} cy={RADAR} r={RADAR_R * f} fill="none" stroke="#14532d" strokeWidth={1.5} />
        ))}
        <path d={`M${RADAR - RADAR_R} ${RADAR} H${RADAR + RADAR_R} M${RADAR} ${RADAR - RADAR_R} V${RADAR + RADAR_R}`} stroke="#14532d" strokeWidth={1} />
        {/* Barrido */}
        <motion.g animate={{ rotate: 360 }} transition={{ duration: 2.5, repeat: Infinity, ease: 'linear' }} style={{ transformOrigin: `${RADAR}px ${RADAR}px` }}>
          <path d={`M${RADAR} ${RADAR} L${RADAR + RADAR_R} ${RADAR} A${RADAR_R} ${RADAR_R} 0 0 0 ${RADAR + RADAR_R * Math.cos(-0.5)} ${RADAR + RADAR_R * Math.sin(-0.5)} Z`} fill="#22c55e" opacity={0.18} />
        </motion.g>
        {/* Base Ares-IV con su escudo */}
        <circle cx={RADAR} cy={RADAR} r={BASE_R + 6} fill="none" stroke="#38bdf8" strokeWidth={2} opacity={0.6} />
        <circle cx={RADAR} cy={RADAR} r={BASE_R} fill="#e2e8f0" stroke="#0b3d91" strokeWidth={3} />
        <text x={RADAR} y={RADAR + 3.5} textAnchor="middle" fontSize={8} fontWeight={900} fill="#0b3d91" fontFamily="ui-monospace, monospace">
          BASE
        </text>

        {rocks.map((r) => {
          if (now < r.spawn && !r.destroyed) return null;
          const p = posOf(r);
          if (r.destroyed) {
            const since = r.hitAt !== null ? now - r.hitAt : 999;
            if (since > 450) return null;
            return (
              <g key={r.id} pointerEvents="none">
                <line x1={RADAR} y1={RADAR} x2={p.x} y2={p.y} stroke="#f87171" strokeWidth={3} opacity={Math.max(0, 1 - since / 200)} />
                {[0, 60, 120, 180, 240, 300].map((deg) => (
                  <circle
                    key={deg}
                    cx={p.x + Math.cos((deg * Math.PI) / 180) * (since / 18)}
                    cy={p.y + Math.sin((deg * Math.PI) / 180) * (since / 18)}
                    r={2.5}
                    fill="#fbbf24"
                    opacity={Math.max(0, 1 - since / 450)}
                  />
                ))}
              </g>
            );
          }
          return (
            <g key={r.id} className="cursor-crosshair" onPointerDown={() => shoot(r.id)}>
              <circle cx={p.x} cy={p.y} r={24} fill="transparent" />
              <path
                d={`M${p.x - 11} ${p.y - 3} L${p.x - 4} ${p.y - 11} L${p.x + 8} ${p.y - 9} L${p.x + 12} ${p.y + 2} L${p.x + 5} ${p.y + 11} L${p.x - 8} ${p.y + 9} Z`}
                fill="#a8a29e"
                stroke="#fbbf24"
                strokeWidth={1.5}
              />
              <circle cx={p.x - 2} cy={p.y - 1} r={2.5} fill="#78716c" />
            </g>
          );
        })}
      </svg>
      <p className="mt-2 text-sm font-bold text-slate-700">
        Rocas destruidas: <span className="font-mono">{destroyed} / {ROCK_COUNT}</span>
      </p>
    </div>
  );
}
