import { motion } from 'framer-motion';
import { ResourceIcon, type ResourceKey } from './icons';
import { tr } from '../i18n/core';

interface Props {
  label: string;
  /** Recurso: decide el icono vectorial junto a la etiqueta. */
  resource: ResourceKey;
  value: number;
  /** Cambio previsto al terminar el Sol (chapita "mañana"). */
  forecast?: number;
  /** Tooltip nativo del navegador con el valor (desactivar si se envuelve con KidTooltip). */
  nativeTitle?: boolean;
  className?: string;
}

const CX = 60;
const CY = 62;
const R = 46;

/** Velocímetro semicircular estilo cabina del transbordador espacial. */
export default function GaugeMeter({ label, resource, value, forecast, nativeTitle = true, className = '' }: Props) {
  const v = Math.max(0, Math.min(100, Math.round(value)));
  const color = v > 50 ? '#16a34a' : v >= 25 ? '#f59e0b' : '#dc2626';
  const critical = v < 25;
  // Marcador sobre el borde exterior del arco: 180° (vacío) → 0° (lleno)
  const markerAngle = Math.PI - (v / 100) * Math.PI;
  const marker = { x: CX + Math.cos(markerAngle) * (R + 7), y: CY - Math.sin(markerAngle) * (R + 7) };

  const ticks = Array.from({ length: 11 }, (_, i) => {
    const a = Math.PI - (i / 10) * Math.PI;
    const inner = i % 5 === 0 ? R - 11 : R - 7;
    return {
      x1: CX + Math.cos(a) * (R - 3),
      y1: CY - Math.sin(a) * (R - 3),
      x2: CX + Math.cos(a) * inner,
      y2: CY - Math.sin(a) * inner,
      major: i % 5 === 0,
    };
  });

  return (
    <div
      className={`flex min-w-0 flex-col items-center ${className}`}
      title={nativeTitle ? `${label}: ${v}/100${forecast !== undefined ? ` · Previsión al acabar el Sol: ${forecast >= 0 ? '+' : ''}${forecast}` : ''}` : undefined}
    >
      <svg viewBox="0 0 120 74" className="w-full max-w-[140px]" role="img" aria-label={tr(`${label} ${v} de 100`, `${label} ${v} of 100`)}>
        {/* Bisel del instrumento */}
        <path d={`M${CX - R - 8} ${CY} A${R + 8} ${R + 8} 0 0 1 ${CX + R + 8} ${CY} Z`} fill="#f8fafc" stroke="#cbd5e1" strokeWidth={1.5} />
        {/* Zonas de color */}
        <path d={`M${CX - R} ${CY} A${R} ${R} 0 0 1 ${CX + R} ${CY}`} fill="none" stroke="#e2e8f0" strokeWidth={9} />
        <path
          d={`M${CX - R} ${CY} A${R} ${R} 0 0 1 ${CX + R} ${CY}`}
          fill="none"
          stroke="#fecaca"
          strokeWidth={9}
          pathLength={100}
          strokeDasharray="25 100"
        />
        {/* Arco de progreso */}
        <motion.path
          d={`M${CX - R} ${CY} A${R} ${R} 0 0 1 ${CX + R} ${CY}`}
          fill="none"
          stroke={color}
          strokeWidth={9}
          strokeLinecap="round"
          pathLength={100}
          strokeDasharray="100 100"
          initial={false}
          animate={{ strokeDashoffset: 100 - v, opacity: critical ? [1, 0.35, 1] : 1 }}
          transition={{
            strokeDashoffset: { type: 'spring', stiffness: 90, damping: 18 },
            opacity: { duration: 0.8, repeat: critical ? Infinity : 0 },
          }}
        />
        {ticks.map((t, i) => (
          <line key={i} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2} stroke="#64748b" strokeWidth={t.major ? 1.6 : 0.9} />
        ))}
        {/* Marcador pequeño en el borde exterior del arco (sin aguja que tape el número) */}
        <motion.circle
          r={4}
          fill="#0f172a"
          stroke="#ffffff"
          strokeWidth={1.5}
          initial={false}
          animate={{ cx: marker.x, cy: marker.y }}
          transition={{ type: 'spring', stiffness: 90, damping: 18 }}
        />
        <text
          x={CX}
          y={CY - 6}
          textAnchor="middle"
          fontSize={28}
          fontWeight={900}
          fill={critical ? '#dc2626' : '#0f172a'}
          fontFamily="Orbitron, sans-serif"
        >
          {v}
        </text>
      </svg>
      <div className="-mt-0.5 flex items-center gap-1 text-sm font-extrabold text-slate-700">
        <ResourceIcon k={resource} className="h-4 w-4 shrink-0 text-nasa-blue" />
        <span className="truncate">{label}</span>
      </div>
      {forecast !== undefined && (
        <span
          className={`mt-0.5 rounded-md border px-1.5 font-mono text-xs font-semibold tabular-nums ${
            forecast >= 0 ? 'border-emerald-300 bg-emerald-50 text-emerald-700' : 'border-rose-300 bg-rose-50 text-rose-700'
          }`}
        >
          {tr('mañana', 'tomorrow')} {forecast >= 0 ? '+' : ''}
          {forecast}
        </span>
      )}
    </div>
  );
}
