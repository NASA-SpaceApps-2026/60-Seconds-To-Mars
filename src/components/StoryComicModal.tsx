import { useEffect, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, BookOpen, FastForward, Radio, TriangleExclamationPoint } from 'lucide-react';
import type { StoryScene, VitalKey } from '../types/game';
import { COMPLICATIONS } from '../data/triviaQuestions';
import { ITEMS_BY_ID } from '../data/stationItems';
import { useGameStore } from '../store/useGameStore';
import { playButtonClick, playDoorSeal, playIncoming, playSuccess } from '../utils/soundEffects';
import { ItemIcon, ResourceIcon } from './icons';
import { tr } from '../i18n/core';

/* =====================================================================
 * Lore: año 2038, base Ares-IV (Cráter Jezero). Los adultos salieron en el rover
 * de exploración a 40 km y una tormenta solar real (NASA DONKI) les corta el paso.
 * Leo, Vega, Max y A.R.I.A. deben aguantar toda la tormenta hasta el rescate.
 * ===================================================================== */

const CREW_COLORS = { leo: '#f97316', vega: '#22c55e', max: '#3b82f6' } as const;

// ---------------------------------------------------------------------
// Piezas de ilustración reutilizables (viewBox 320×200)
// ---------------------------------------------------------------------
function MarsSky({ dusk = false }: { dusk?: boolean }) {
  return (
    <>
      <rect width={320} height={200} fill={dusk ? '#1e1b4b' : '#fed7aa'} />
      <rect y={110} width={320} height={90} fill="#c2410c" />
      <path d="M0 118 Q60 96 120 116 T240 108 T320 114 V200 H0 Z" fill="#ea580c" />
      <path d="M0 150 Q80 134 160 150 T320 146 V200 H0 Z" fill="#9a3412" />
    </>
  );
}

function Cadet({ x, y, color, mood = 'worried', scale = 1 }: { x: number; y: number; color: string; mood?: 'worried' | 'brave'; scale?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <rect x={-16} y={18} width={32} height={34} rx={10} fill="#f1f5f9" stroke="#cbd5e1" />
      <rect x={-16} y={30} width={32} height={5} fill={color} />
      <circle cx={0} cy={0} r={20} fill="#f8fafc" stroke="#cbd5e1" strokeWidth={2} />
      <ellipse cx={0} cy={1} rx={15} ry={13} fill="#0c4a6e" />
      <circle cx={0} cy={3} r={10} fill="#f1c27d" />
      <circle cx={-3.5} cy={2} r={1.6} fill="#0f172a" />
      <circle cx={3.5} cy={2} r={1.6} fill="#0f172a" />
      {mood === 'brave' ? (
        <path d="M-4 7 Q0 10 4 7" stroke="#0f172a" strokeWidth={1.4} fill="none" strokeLinecap="round" />
      ) : (
        <ellipse cx={0} cy={8} rx={2} ry={1.6} fill="#0f172a" />
      )}
      <circle cx={0} cy={-21} r={2.2} fill={color} />
    </g>
  );
}

/** Viñeta 1 del prólogo: el rover de los adultos se aleja por Marte. */
function ArtRoverLeaving() {
  return (
    <svg viewBox="0 0 320 200" className="h-full w-full" aria-hidden>
      <MarsSky />
      <circle cx={262} cy={42} r={14} fill="#fef3c7" opacity={0.8} />
      {/* Hábitat Ares-IV */}
      <path d="M18 132 A42 34 0 0 1 102 132 Z" fill="#e2e8f0" stroke="#94a3b8" strokeWidth={2} />
      <rect x={52} y={118} width={16} height={14} rx={2} fill="#0b3d91" />
      <text x={60} y={110} textAnchor="middle" fontSize={8} fontWeight={800} fill="#0b3d91" fontFamily="ui-monospace, monospace">ARES-IV</text>
      {/* Rover alejándose */}
      <motion.g initial={{ x: 0 }} animate={{ x: 70 }} transition={{ duration: 3, ease: 'easeOut' }}>
        <ellipse cx={150} cy={142} rx={40} ry={6} fill="#fdba74" opacity={0.6} />
        <rect x={160} y={118} width={50} height={18} rx={4} fill="#f8fafc" stroke="#64748b" strokeWidth={1.5} />
        <rect x={190} y={110} width={16} height={10} rx={2} fill="#7dd3fc" stroke="#64748b" />
        <path d="M170 118 v-10 h6" stroke="#64748b" strokeWidth={1.5} fill="none" />
        {[168, 185, 202].map((cx) => (
          <circle key={cx} cx={cx} cy={140} r={6} fill="#334155" stroke="#0f172a" strokeWidth={1.5} />
        ))}
      </motion.g>
      <text x={300} y={190} textAnchor="end" fontSize={10} fontWeight={800} fill="#fff7ed" fontFamily="ui-monospace, monospace">40 KM →</text>
    </svg>
  );
}

/** Viñeta 2 del prólogo: el satélite SOHO detecta la llamarada (dato DONKI). */
function ArtSolarFlare({ flareClass }: { flareClass: string }) {
  return (
    <svg viewBox="0 0 320 200" className="h-full w-full" aria-hidden>
      <rect width={320} height={200} fill="#020617" />
      {[
        [20, 20],
        [140, 30],
        [300, 18],
        [250, 170],
        [180, 120],
        [90, 180],
      ].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={1.2} fill="#ffffff" />
      ))}
      {/* Sol + llamarada */}
      <circle cx={-10} cy={100} r={78} fill="#f59e0b" />
      <circle cx={-10} cy={100} r={66} fill="#fbbf24" />
      <motion.path
        d="M60 80 Q120 40 140 92 Q118 70 66 100 Z"
        fill="#fb923c"
        initial={{ scale: 0.6, opacity: 0.4 }}
        animate={{ scale: [0.8, 1.15, 0.9], opacity: [0.6, 1, 0.7] }}
        transition={{ duration: 1.6, repeat: Infinity }}
        style={{ transformOrigin: '60px 90px' }}
      />
      {/* Onda hacia Marte */}
      {[0, 1, 2].map((i) => (
        <motion.path
          key={i}
          d="M150 70 Q180 100 150 130"
          stroke="#fde68a"
          strokeWidth={2.5}
          fill="none"
          animate={{ x: [0, 120], opacity: [0, 1, 0] }}
          transition={{ duration: 2.2, repeat: Infinity, delay: i * 0.7 }}
        />
      ))}
      <circle cx={292} cy={100} r={12} fill="#ea580c" />
      {/* Satélite SOHO */}
      <g transform="translate(200 40)">
        <rect x={-6} y={-6} width={12} height={12} fill="#e2e8f0" stroke="#94a3b8" />
        <rect x={-34} y={-4} width={26} height={8} fill="#1d4ed8" stroke="#93c5fd" strokeWidth={0.8} />
        <rect x={8} y={-4} width={26} height={8} fill="#1d4ed8" stroke="#93c5fd" strokeWidth={0.8} />
        <motion.circle r={3} cx={0} cy={10} fill="#ef4444" animate={{ opacity: [1, 0.2, 1] }} transition={{ duration: 0.7, repeat: Infinity }} />
      </g>
      <rect x={196} y={160} width={116} height={28} rx={4} fill="#0f172a" stroke="#fbbf24" />
      <text x={254} y={178} textAnchor="middle" fontSize={11} fontWeight={800} fill="#fbbf24" fontFamily="ui-monospace, monospace">
        DONKI · CLASE {flareClass}
      </text>
    </svg>
  );
}

/** Viñeta 3 del prólogo: los cadetes ante la consola bloqueada (60 s). */
function ArtLockedConsole() {
  return (
    <svg viewBox="0 0 320 200" className="h-full w-full" aria-hidden>
      <rect width={320} height={200} fill="#1e293b" />
      <rect x={70} y={22} width={180} height={92} rx={8} fill="#0f172a" stroke="#475569" strokeWidth={3} />
      <rect x={82} y={34} width={156} height={68} rx={4} fill="#082f49" />
      <motion.text
        x={160}
        y={78}
        textAnchor="middle"
        fontSize={34}
        fontWeight={900}
        fill="#fc3d21"
        fontFamily="Orbitron, ui-monospace, monospace"
        animate={{ opacity: [1, 0.4, 1] }}
        transition={{ duration: 1, repeat: Infinity }}
      >
        00:60
      </motion.text>
      <text x={160} y={96} textAnchor="middle" fontSize={8} fontWeight={800} fill="#7dd3fc" fontFamily="ui-monospace, monospace">
        SUMINISTROS BLOQUEADOS
      </text>
      {/* Candado */}
      <rect x={146} y={40} width={28} height={6} rx={2} fill="#fbbf24" opacity={0.9} />
      <rect x={0} y={150} width={320} height={50} fill="#334155" />
      <Cadet x={100} y={142} color={CREW_COLORS.leo} />
      <Cadet x={160} y={136} color={CREW_COLORS.vega} mood="brave" />
      <Cadet x={220} y={142} color={CREW_COLORS.max} />
    </svg>
  );
}

/** Cierre de compuertas: la onda de choque golpea el hábitat. */
function ArtLockdown({ damaged }: { damaged: boolean }) {
  return (
    <svg viewBox="0 0 320 200" className="h-full w-full" aria-hidden>
      <rect width={320} height={200} fill="#0f172a" />
      <rect x={60} y={20} width={200} height={160} fill="#020617" stroke="#475569" strokeWidth={4} />
      <Cadet x={160} y={110} color={CREW_COLORS.vega} mood="brave" />
      <Cadet x={118} y={118} color={CREW_COLORS.leo} scale={0.85} />
      <Cadet x={202} y={118} color={CREW_COLORS.max} scale={0.85} />
      {/* Compuertas blindadas */}
      <motion.g initial={{ x: -110 }} animate={{ x: 0 }} transition={{ duration: 1.1, ease: 'easeIn' }}>
        <rect x={60} y={20} width={100} height={160} fill="#94a3b8" stroke="#475569" strokeWidth={2} />
        {[0, 1, 2, 3].map((i) => (
          <path key={i} d={`M60 ${40 + i * 40} l100 -20`} stroke="#facc15" strokeWidth={6} opacity={0.8} />
        ))}
      </motion.g>
      <motion.g initial={{ x: 110 }} animate={{ x: 0 }} transition={{ duration: 1.1, ease: 'easeIn' }}>
        <rect x={160} y={20} width={100} height={160} fill="#94a3b8" stroke="#475569" strokeWidth={2} />
        {[0, 1, 2, 3].map((i) => (
          <path key={i} d={`M160 ${20 + i * 40} l100 20`} stroke="#facc15" strokeWidth={6} opacity={0.8} />
        ))}
      </motion.g>
      {damaged && (
        <motion.g initial={{ opacity: 0 }} animate={{ opacity: [0, 1, 0.3, 1] }} transition={{ delay: 1.2, duration: 0.8 }}>
          <path d="M40 60 l14 10 -8 4 14 12" stroke="#fde047" strokeWidth={3} fill="none" />
          <path d="M280 110 l-14 10 8 4 -14 12" stroke="#fde047" strokeWidth={3} fill="none" />
        </motion.g>
      )}
      <text x={160} y={196} textAnchor="middle" fontSize={10} fontWeight={800} fill="#facc15" fontFamily="ui-monospace, monospace">
        COMPUERTAS SELLADAS
      </text>
    </svg>
  );
}

/** Transmisión de radio con estática desde el rover de rescate. */
function ArtRadio({ progress }: { progress: number }) {
  return (
    <svg viewBox="0 0 320 200" className="h-full w-full" aria-hidden>
      <MarsSky dusk />
      {/* Cañón */}
      <path d="M0 200 L0 120 L60 130 L90 200 Z" fill="#7c2d12" />
      <path d="M320 200 L320 116 L250 128 L226 200 Z" fill="#7c2d12" />
      {/* Rover con antena */}
      <g transform={`translate(${70 + progress * 120} 0)`}>
        <rect x={0} y={150} width={56} height={18} rx={4} fill="#f8fafc" stroke="#64748b" strokeWidth={1.5} />
        <rect x={34} y={142} width={18} height={10} rx={2} fill="#7dd3fc" />
        <path d="M10 150 v-22" stroke="#e2e8f0" strokeWidth={2} />
        <circle cx={10} cy={126} r={3} fill="#fc3d21" />
        {[8, 26, 44].map((cx) => (
          <circle key={cx} cx={cx} cy={170} r={6} fill="#334155" />
        ))}
        {[0, 1, 2].map((i) => (
          <motion.path
            key={i}
            d="M18 118 q10 -10 0 -20"
            stroke="#7dd3fc"
            strokeWidth={2}
            fill="none"
            animate={{ opacity: [0, 1, 0], x: [0, 16] }}
            transition={{ duration: 1.4, repeat: Infinity, delay: i * 0.45 }}
          />
        ))}
      </g>
      {/* Base a lo lejos */}
      <path d="M262 120 A20 14 0 0 1 302 120 Z" fill="#e2e8f0" />
      {/* Estática */}
      {Array.from({ length: 9 }).map((_, i) => (
        <motion.rect
          key={i}
          x={0}
          y={14 + i * 20}
          width={320}
          height={2}
          fill="#ffffff"
          animate={{ opacity: [0, 0.35, 0] }}
          transition={{ duration: 0.25, repeat: Infinity, delay: (i * 0.13) % 1 }}
        />
      ))}
      <rect x={8} y={8} width={112} height={22} rx={4} fill="#020617" opacity={0.85} />
      <circle cx={18} cy={19} r={3.5} fill="#ef4444" />
      <text x={26} y={23} fontSize={10} fontWeight={800} fill="#fca5a5" fontFamily="ui-monospace, monospace">
        RX · ROVER-1
      </text>
    </svg>
  );
}

/** Hábitat Ares-IV a lo lejos (cúpula + rótulo), con haz de luz cian opcional. */
function BaseDome({ x, y, beam = false, scale = 1 }: { x: number; y: number; beam?: boolean; scale?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      {beam && (
        <motion.rect
          x={-5}
          y={-200}
          width={10}
          height={200}
          fill="#67e8f9"
          animate={{ opacity: [0.35, 0.8, 0.35] }}
          transition={{ duration: 1.6, repeat: Infinity }}
        />
      )}
      <path d="M-42 0 A42 34 0 0 1 42 0 Z" fill="#e2e8f0" stroke="#94a3b8" strokeWidth={2} />
      <rect x={-8} y={-14} width={16} height={14} rx={2} fill="#0b3d91" />
      <text x={0} y={-22} textAnchor="middle" fontSize={8} fontWeight={800} fill="#0b3d91" fontFamily="ui-monospace, monospace">ARES-IV</text>
    </g>
  );
}

/** Rover de rescate con 3 cascos a bordo. */
function RescueRover({ helmets }: { helmets: string[] }) {
  return (
    <g>
      <rect x={0} y={0} width={60} height={18} rx={4} fill="#f8fafc" stroke="#64748b" strokeWidth={1.5} />
      <rect x={0} y={14} width={60} height={4} fill="#d4a12a" />
      {helmets.map((c, i) => (
        <g key={i} transform={`translate(${14 + i * 16} -6)`}>
          <circle r={6.5} fill="#f8fafc" stroke="#cbd5e1" />
          <ellipse cx={1.5} cy={0.5} rx={4.5} ry={4} fill="#d4a12a" />
          <circle cx={0} cy={-7} r={1.6} fill={c} />
        </g>
      ))}
      <path d="M54 0 v-14 h6" stroke="#64748b" strokeWidth={1.5} fill="none" />
      <circle cx={60} cy={-14} r={2} fill="#fc3d21" />
      {[10, 30, 50].map((cx) => (
        <circle key={cx} cx={cx} cy={22} r={6} fill="#334155" stroke="#0f172a" strokeWidth={1.5} />
      ))}
    </g>
  );
}

/** Rescate · viñeta 1: el equipo de astronautas regresa hacia la base. */
function ArtRescueReturn() {
  return (
    <svg viewBox="0 0 320 200" className="h-full w-full" aria-hidden>
      <MarsSky />
      <circle cx={60} cy={40} r={14} fill="#fef3c7" opacity={0.8} />
      <BaseDome x={262} y={128} />
      <motion.g initial={{ x: -40 }} animate={{ x: 60 }} transition={{ duration: 3, ease: 'easeOut' }}>
        <ellipse cx={60} cy={146} rx={44} ry={6} fill="#fdba74" opacity={0.6} />
        <g transform="translate(30 118)">
          <RescueRover helmets={['#fc3d21', '#0b3d91', '#0b3d91']} />
        </g>
      </motion.g>
      <text x={300} y={190} textAnchor="end" fontSize={10} fontWeight={800} fill="#fff7ed" fontFamily="ui-monospace, monospace">ROVER-1 → ARES-IV</text>
    </svg>
  );
}

/** Rescate · viñeta 2: los cadetes cogen el rover; ruta con rocas hasta Ares-IV. */
function ArtRescueDrive() {
  return (
    <svg viewBox="0 0 320 200" className="h-full w-full" aria-hidden>
      <MarsSky dusk />
      {[
        [30, 20],
        [120, 34],
        [210, 16],
        [290, 40],
      ].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={1.2} fill="#ffffff" />
      ))}
      <BaseDome x={262} y={118} beam scale={0.7} />
      {/* Camino con rocas y una baliza verde */}
      <path d="M0 190 Q120 150 240 120" stroke="#fdba74" strokeWidth={10} fill="none" opacity={0.5} strokeDasharray="14 10" />
      {[
        [110, 160],
        [176, 138],
        [214, 128],
      ].map(([x, y], i) => (
        <path key={i} d={`M${x - 8} ${y} l4 -9 l9 -2 l5 8 l-3 5 Z`} fill="#7c2d12" stroke="#431407" />
      ))}
      <motion.circle cx={150} cy={148} r={5} fill="#22c55e" animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 0.8, repeat: Infinity }} />
      <motion.g initial={{ x: -10 }} animate={{ x: 6 }} transition={{ duration: 1.2, repeat: Infinity, repeatType: 'reverse' }}>
        <g transform="translate(20 160)">
          <RescueRover helmets={[CREW_COLORS.leo, CREW_COLORS.vega, CREW_COLORS.max]} />
        </g>
      </motion.g>
      <rect x={8} y={8} width={96} height={22} rx={4} fill="#020617" opacity={0.85} />
      <text x={56} y={23} textAnchor="middle" fontSize={10} fontWeight={800} fill="#86efac" fontFamily="ui-monospace, monospace">
        ARES-IV · 800 M
      </text>
    </svg>
  );
}

/** Rescate completado: cadetes y equipo de rescate juntos ante la base. */
function ArtRescueComplete() {
  return (
    <svg viewBox="0 0 320 200" className="h-full w-full" aria-hidden>
      <MarsSky />
      <BaseDome x={160} y={118} beam />
      {/* Estrellas de celebración */}
      {[
        [40, 40, '#facc15'],
        [92, 24, '#22c55e'],
        [228, 30, '#3b82f6'],
        [282, 50, '#fc3d21'],
      ].map(([x, y, c], i) => (
        <motion.path
          key={i}
          d={`M${x} ${Number(y) - 7} l2 5 h5 l-4 3 l2 6 l-5 -4 l-5 4 l2 -6 l-4 -3 h5 Z`}
          fill={String(c)}
          animate={{ scale: [0.8, 1.2, 0.8], opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.3 }}
          style={{ transformOrigin: `${x}px ${y}px` }}
        />
      ))}
      <g transform="translate(232 150)">
        <RescueRover helmets={['#fc3d21', '#0b3d91', '#0b3d91']} />
      </g>
      <Cadet x={70} y={150} color={CREW_COLORS.leo} mood="brave" scale={0.8} />
      <Cadet x={110} y={146} color={CREW_COLORS.vega} mood="brave" scale={0.8} />
      <Cadet x={150} y={150} color={CREW_COLORS.max} mood="brave" scale={0.8} />
      <Cadet x={198} y={146} color="#fc3d21" mood="brave" scale={0.85} />
      <rect x={96} y={182} width={128} height={16} rx={4} fill="#020617" opacity={0.85} />
      <text x={160} y={194} textAnchor="middle" fontSize={9} fontWeight={800} fill="#86efac" fontFamily="ui-monospace, monospace">
        MISIÓN CUMPLIDA
      </text>
    </svg>
  );
}

// ---------------------------------------------------------------------
// Escenas
// ---------------------------------------------------------------------
interface Panel {
  art: ReactNode;
  speaker: string;
  text: string;
  extra?: ReactNode;
  sound?: () => void;
}

function useScenePanels(scene: StoryScene): { title: string; panels: Panel[] } {
  const weather = useGameStore((s) => s.nasaWeather);
  const inventory = useGameStore((s) => s.bunkerInventory);
  const complications = useGameStore((s) => s.complications);
  const flare = weather?.flareClass ?? 'X';
  // Credencial de Cadete: el jugador ocupa el 3.er puesto de la tripulación (en lugar de Max)
  const cadetName = useGameStore((s) => s.cadetName).trim().toUpperCase();
  const third = cadetName || 'Max';
  const hey = cadetName ? tr(`¡Atención, Cadete ${cadetName}! `, `Attention, Cadet ${cadetName}! `) : '';
  const heyRover = cadetName ? tr(`¡Aquí el rover, Cadete ${cadetName}! `, `Rover here, Cadet ${cadetName}! `) : '';

  switch (scene) {
    case 'prologue':
      return {
        title: tr('Prólogo · Base Ares-IV, Cráter Jezero, año 2038', 'Prologue · Ares-IV Base, Jezero Crater, year 2038'),
        panels: [
          {
            art: <ArtRoverLeaving />,
            speaker: tr('Narrador', 'Narrator'),
            text: tr(
              `Año 2038. Los astronautas adultos salen en el rover a explorar a 40 km de la base. En el hábitat se quedan los Cadetes Junior: Leo, Vega y ${third}.`,
              `Year 2038. The adult astronauts drive off in the rover to explore 40 km from the base. The Junior Cadets stay in the habitat: Leo, Vega and ${third}.`,
            ),
          },
          {
            art: <ArtSolarFlare flareClass={flare} />,
            speaker: 'A.R.I.A.',
            text: tr(
              `${hey}¡Alerta! El satélite SOHO y NASA DONKI detectan una llamarada solar de clase ${flare} rumbo a Marte. La tormenta ha cortado el camino del rover.`,
              `${hey}Alert! The SOHO satellite and NASA DONKI detect a class ${flare} solar flare heading for Mars. The storm has cut off the rover's path.`,
            ),
            sound: playIncoming,
          },
          {
            art: <ArtLockedConsole />,
            speaker: tr('Cmdte. Leo', 'Cmdr. Leo'),
            text: tr(
              '¡La consola de suministros está bloqueada! Tenemos 60 segundos para responder el protocolo de seguridad y desbloquear el equipo de la base espacial.',
              'The supply console is locked! We have 60 seconds to answer the safety protocol and unlock the space base equipment.',
            ),
          },
        ],
      };
    case 'lockdown': {
      const damaged = complications.length > 0;
      return {
        title: tr('Cierre de compuertas · Sol 1', 'Sealing the hatches · Sol 1'),
        panels: [
          {
            art: <ArtLockdown damaged={damaged} />,
            speaker: 'A.R.I.A.',
            text: tr(
              `Compuertas blindadas selladas. ${inventory.length} objetos han entrado en la base espacial a tiempo.`,
              `Armored hatches sealed. ${inventory.length} items made it into the space base in time.`,
            ),
            sound: playDoorSeal,
            extra: (
              <div className="flex flex-wrap gap-1.5">
                {inventory.slice(0, 12).map((id) => (
                  <span key={id} title={ITEMS_BY_ID[id].name} className="grid h-8 w-8 place-items-center rounded-md border border-slate-300 bg-white text-nasa-blue">
                    <ItemIcon id={id} className="h-5 w-5" />
                  </span>
                ))}
                {inventory.length > 12 && <span className="self-center text-sm font-bold text-slate-500">+{inventory.length - 12}</span>}
                {inventory.length === 0 && <span className="text-sm text-slate-500">{tr('Ningún objeto... ¡habrá que ser muy ingeniosos!', 'No items... we will have to be very clever!')}</span>}
              </div>
            ),
          },
          {
            art: <ArtLockdown damaged={damaged} />,
            speaker: third,
            text: damaged
              ? tr(
                  '¡La onda de choque ha dañado los sistemas donde fallamos preguntas! Podremos repararlos con los minijuegos de reparación de la base espacial.',
                  'The shock wave damaged the systems where we missed questions! We can fix them with the space base repair mini-games.',
                )
              : tr('¡Los sistemas han aguantado la onda de choque! Respondimos bien todas las ramas.', 'The systems survived the shock wave! We answered every branch well.'),
            extra: damaged ? (
              <div className="flex flex-wrap gap-1.5">
                {complications.map((c: VitalKey) => (
                  <span key={c} className="flex items-center gap-1.5 rounded-md border border-nasa-red bg-white px-2 py-1 text-sm font-bold text-nasa-red">
                    <TriangleExclamationPoint className="h-4 w-4" strokeWidth={1.75} />
                    <ResourceIcon k={c} /> {COMPLICATIONS[c].title}
                  </span>
                ))}
              </div>
            ) : undefined,
          },
        ],
      };
    }
    case 'radio_sol4':
      return {
        title: tr('Transmisión entrante · Sol 4', 'Incoming transmission · Sol 4'),
        panels: [
          {
            art: <ArtRadio progress={0.35} />,
            speaker: tr('Rover de rescate', 'Rescue rover'),
            text: tr(
              `${heyRover}¡Cadetes, resistid! Ya hemos cruzado el cañón, estamos a pocos Soles de la base. ¡Estamos muy orgullosos de vosotros!`,
              `${heyRover}Cadets, hold on! We have crossed the canyon and we are a few Sols from the base. We are so proud of you!`,
            ),
            sound: playIncoming,
          },
        ],
      };
    case 'radio_sol8':
      return {
        title: tr('Transmisión entrante · Sol 8', 'Incoming transmission · Sol 8'),
        panels: [
          {
            art: <ArtRadio progress={0.8} />,
            speaker: tr('Rover de rescate', 'Rescue rover'),
            text: tr(
              `${heyRover}¡Ya vemos las luces de Ares-IV en el horizonte! Dos Soles más y llegamos. Mantened esas barras arriba, ¡casi lo tenéis!`,
              `${heyRover}We can see the lights of Ares-IV on the horizon! Two more Sols and we are there. Keep those bars up, you are almost there!`,
            ),
            sound: playIncoming,
          },
        ],
      };
    // Desenlace de las partidas ganadas: antes y después del rescate 3D en rover
    case 'rescue_intro':
      return {
        title: tr('El regreso del equipo de rescate · La última misión', 'The rescue team returns · The final mission'),
        panels: [
          {
            art: <ArtRescueReturn />,
            speaker: 'A.R.I.A.',
            text: tr(
              '¡Lo habéis conseguido! Habéis sobrevivido a todos los soles en Marte. El equipo de astronautas que os dejó en la base está regresando para rescataros. ¡Vuestra aventura está a punto de terminar!',
              'You did it! You survived every sol on Mars. The team of astronauts who left you at the base is coming back to rescue you. Your adventure is about to end!',
            ),
            sound: playIncoming,
          },
          {
            art: <ArtRescueDrive />,
            speaker: tr('Cmdte. Elena', 'Cmdr. Elena'),
            text: tr(
              '¡Rápido! Coged el rover y conducid hasta la base ARES-IV. Vuestros compañeros os están esperando. Esquivad las rocas y atravesad el terreno marciano para llegar hasta ellos. ¡El rescate depende de vosotros!',
              'Quick! Take the rover and drive to the ARES-IV base. Your teammates are waiting for you. Dodge the rocks and cross the Martian terrain to reach them. The rescue depends on you!',
            ),
            sound: playIncoming,
          },
        ],
      };
    case 'rescue_complete':
      return {
        title: tr('Rescate completado · Base Ares-IV', 'Rescue complete · Ares-IV Base'),
        panels: [
          {
            art: <ArtRescueComplete />,
            speaker: tr('Narrador', 'Narrator'),
            text: tr(
              '¡Lo habéis conseguido! Habéis llegado sanos y salvos a la base ARES-IV. El equipo de rescate ha conseguido reunirse con vosotros y todos los cadetes están a salvo. ¡Habéis sobrevivido a Marte y completado vuestra misión con éxito!',
              'You did it! You reached the ARES-IV base safe and sound. The rescue team has joined you and every cadet is safe. You survived Mars and completed your mission successfully!',
            ),
            sound: playSuccess,
          },
        ],
      };
  }
}

/** Texto del botón de la última viñeta de cada escena. */
function lastButtonLabel(scene: StoryScene): string {
  if (scene === 'rescue_intro') return tr('¡A conducir!', "Let's drive!");
  if (scene === 'rescue_complete') return tr('Ver resultados', 'See results');
  return tr('¡A la misión!', 'To the mission!');
}

/**
 * Contenido de una viñeta. Con `reserve` se pinta invisible (sin la ilustración animada, solo su hueco 16:10)
 * para fijar de antemano el tamaño de la celda.
 */
function PanelFrame({ panel, reserve = false }: { panel: Panel; reserve?: boolean }) {
  const body = (
    <>
      <div className="aspect-[16/10] w-full shrink-0 border-b-4 border-slate-900 bg-slate-900">{reserve ? null : panel.art}</div>
      <figcaption className="flex flex-1 flex-col gap-2 p-4">
        <span className="w-fit rounded bg-slate-900 px-2 py-0.5 font-mono text-xs font-bold uppercase tracking-wider text-white">{panel.speaker}</span>
        <p className="text-lg font-semibold leading-snug text-slate-900">{panel.text}</p>
        {panel.extra}
      </figcaption>
    </>
  );
  if (!reserve) return body;
  return (
    <div className="invisible flex flex-col border-4 border-transparent" aria-hidden>
      {body}
    </div>
  );
}

function StoryContent({ scene }: { scene: StoryScene }) {
  const { title, panels } = useScenePanels(scene);
  const closeStory = useGameStore((s) => s.closeStory);
  const ariaSay = useGameStore((s) => s.ariaSay);
  const [shown, setShown] = useState(1);
  const last = shown >= panels.length;

  // Sonido y voz de cada viñeta al aparecer
  useEffect(() => {
    const p = panels[shown - 1];
    p.sound?.();
    ariaSay(`${p.speaker}: ${p.text}`, { story: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shown]);

  const next = () => {
    playButtonClick();
    if (last) closeStory();
    else setShown((n) => n + 1);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault();
        next();
      } else if (e.key === 'Escape') closeStory();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const cols = panels.length >= 3 ? 'lg:grid-cols-3' : panels.length === 2 ? 'md:grid-cols-2' : '';
  const single = panels.length === 1;

  return (
    <div className="mx-auto flex min-h-0 w-full max-w-6xl flex-1 flex-col gap-4 p-5">
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-lg border border-slate-600 bg-slate-800 text-white">
          {scene.startsWith('radio') ? <Radio className="h-5 w-5" strokeWidth={1.75} /> : <BookOpen className="h-5 w-5" strokeWidth={1.75} />}
        </span>
        <div className="min-w-0">
          <p className="font-mono text-xs tracking-[0.25em] text-slate-400">{tr('MODO HISTORIA', 'STORY MODE')} // ARES-IV</p>
          <h2 className="font-display truncate text-xl font-black text-white sm:text-2xl">{title}</h2>
        </div>
        <button
          type="button"
          onClick={() => {
            playButtonClick();
            closeStory();
          }}
          className="ml-auto flex shrink-0 items-center gap-1.5 rounded-lg border border-white/30 bg-white/10 px-4 py-2 text-sm font-bold text-white transition hover:bg-white/20"
        >
          <FastForward className="h-4 w-4" /> {tr('Saltar historia', 'Skip story')}
        </button>
      </div>

      {/* Zona de viñetas: único scroll (solo si no cabe) con hueco de barra reservado, así nunca empuja el layout */}
      <div className="thin-scroll min-h-0 flex-1 overflow-y-auto [scrollbar-gutter:stable]">
        <div className={`grid min-h-full content-center gap-4 ${cols}`}>
          {panels.map((p, i) => (
            /* Cada celda ya mide lo mismo que su viñeta final (copia invisible): aparecer no cambia ninguna altura.
               overflow-clip recorta el desplazamiento de entrada (y/scale) sin crear otra zona de scroll. */
            <div
              key={i}
              className={`relative overflow-clip p-2 ${single ? 'mx-auto w-full max-w-[min(48rem,calc((100dvh-17rem)*1.6))]' : ''}`}
            >
              <PanelFrame panel={p} reserve />
              <AnimatePresence>
                {i < shown ? (
                  <motion.figure
                    initial={{ opacity: 0, y: 24, rotate: i % 2 ? 1.5 : -1.5, scale: 0.92 }}
                    animate={{ opacity: 1, y: 0, rotate: i % 2 ? 0.6 : -0.6, scale: 1 }}
                    transition={{ type: 'spring', stiffness: 140, damping: 16 }}
                    className="absolute inset-2 flex flex-col overflow-hidden rounded-lg border-4 border-slate-900 bg-white shadow-[6px_6px_0_0_rgba(2,6,23,0.6)]"
                  >
                    <PanelFrame panel={p} />
                  </motion.figure>
                ) : (
                  <div className="absolute inset-2 rounded-lg border-4 border-dashed border-slate-700" aria-hidden />
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        <div className="flex gap-1.5" aria-label={tr(`Viñeta ${shown} de ${panels.length}`, `Panel ${shown} of ${panels.length}`)}>
          {panels.map((_, i) => (
            <span key={i} className={`h-2 w-8 rounded-full ${i < shown ? 'bg-nasa-red' : 'bg-slate-600'}`} />
          ))}
        </div>
        <motion.button
          type="button"
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
          onClick={next}
          className="font-display glow-red flex items-center gap-2 rounded-xl bg-nasa-red px-8 py-4 text-lg font-black tracking-wider text-white"
        >
          {last ? lastButtonLabel(scene) : tr('Siguiente', 'Next')} <ArrowRight className="h-5 w-5" />
        </motion.button>
      </div>
    </div>
  );
}

/** Viñetas de cómic entre pantallas (lee la escena del store; se cierra con closeStory). */
export default function StoryComicModal() {
  const scene = useGameStore((s) => s.storyScene);

  // Con la historia abierta, el documento no puede hacer scroll: así la pantalla que se está montando
  // debajo (p. ej. la trivia tras el prólogo) nunca saca barras ni desplaza el modal (como en la escena de las compuertas).
  const open = scene !== null;
  useEffect(() => {
    if (!open) return;
    const html = document.documentElement;
    const prev = { html: html.style.overflow, body: document.body.style.overflow };
    html.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    return () => {
      html.style.overflow = prev.html;
      document.body.style.overflow = prev.body;
    };
  }, [open]);

  return (
    <AnimatePresence>
      {scene && (
        <motion.div
          key={scene}
          className="fixed inset-0 z-[60] flex h-dvh w-full max-w-[100vw] flex-col overflow-hidden overscroll-contain bg-slate-950/92 backdrop-blur-md"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="dialog"
          aria-modal="true"
          aria-label={tr('Modo Historia', 'Story Mode')}
        >
          <StoryContent scene={scene} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

