import type { ReactNode } from 'react';
import { cadetDisplayName, cadetRoleLabel } from '../data/cadetRoles';

/** Casco ilustrado por defecto (sin webcam o sin foto). */
export function DefaultHelmetArt({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden>
      <defs>
        <radialGradient id="cadet-visor-fallback" cx="40%" cy="35%" r="70%">
          <stop offset="0%" stopColor="#38bdf8" />
          <stop offset="55%" stopColor="#0c4a6e" />
          <stop offset="100%" stopColor="#020617" />
        </radialGradient>
      </defs>
      <rect width="100" height="100" fill="#0c4a6e" />
      <circle cx="50" cy="58" r="30" fill="#f1c27d" />
      <path d="M20 52 Q24 24 50 25 Q76 24 80 50 Q64 36 20 52" fill="#4b2e19" />
      <circle cx="40" cy="58" r="3.4" fill="#0f172a" />
      <circle cx="60" cy="58" r="3.4" fill="#0f172a" />
      <path d="M40 70 Q50 79 60 70" stroke="#0f172a" strokeWidth="3" fill="none" strokeLinecap="round" />
      <rect width="100" height="100" fill="url(#cadet-visor-fallback)" opacity="0.28" />
    </svg>
  );
}

const SIZES = {
  sm: { helmet: 'h-12 w-12', ring: 'p-[3px]', name: 'text-xs', role: 'text-xs' },
  md: { helmet: 'h-20 w-20', ring: 'p-1', name: 'text-sm', role: 'text-xs' },
  lg: { helmet: 'h-32 w-32 sm:h-40 sm:w-40', ring: 'p-1.5', name: 'text-base', role: 'text-sm' },
} as const;

interface Props {
  photo: string | null;
  name: string;
  role: string;
  size?: keyof typeof SIZES;
  /** Muestra la placa de nombre y puesto bajo el casco. */
  plate?: boolean;
  /** Tema de la placa: claro (paneles blancos) u oscuro (cabecera del debriefing). */
  tone?: 'light' | 'dark';
  /** Línea extra bajo el puesto (p. ej. estado de salud). */
  extra?: ReactNode;
  className?: string;
}

/**
 * Credencial oficial ARES-IV: foto del cadete dentro de un casco de titanio con reflejo de visor
 * y placa con su NOMBRE y su puesto. La foto ya viene reflejada desde la captura (como en el espejo).
 */
export default function CadetFramedAvatar({ photo, name, role, size = 'md', plate = true, tone = 'light', extra, className = '' }: Props) {
  const s = SIZES[size];
  const display = cadetDisplayName(name);
  return (
    <figure className={`flex flex-col items-center gap-1.5 ${className}`}>
      {/* Casco: anillo de titanio + junta azul NASA + visor con reflejo */}
      <div className={`relative shrink-0 rounded-full bg-gradient-to-br from-white via-slate-200 to-slate-400 shadow-md ${s.ring}`}>
        <div className="rounded-full bg-nasa-blue p-[2px]">
          <div className={`relative overflow-hidden rounded-full bg-slate-900 ${s.helmet}`}>
            {photo ? (
              <img src={photo} alt={display} className="h-full w-full object-cover" draggable={false} />
            ) : (
              <DefaultHelmetArt className="h-full w-full" />
            )}
            {/* Reflejo curvo del cristal del visor */}
            <span className="pointer-events-none absolute inset-0 rounded-full bg-[radial-gradient(circle_at_30%_22%,rgba(255,255,255,0.55),transparent_32%),linear-gradient(160deg,transparent_55%,rgba(14,165,233,0.25))]" />
            <span className="pointer-events-none absolute inset-0 rounded-full shadow-[inset_0_0_0_2px_rgba(255,255,255,0.35),inset_0_-8px_16px_rgba(2,6,23,0.45)]" />
          </div>
        </div>
        {/* Luz de la antena del casco */}
        <span className="absolute left-1/2 top-0 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white bg-nasa-red" />
      </div>
      {plate && (
        <figcaption
          className={`min-w-0 max-w-full rounded-md border px-2 py-0.5 text-center ${
            tone === 'dark' ? 'border-slate-600 bg-slate-800 text-white' : 'border-slate-300 bg-gradient-to-b from-white to-slate-200 text-slate-900'
          }`}
        >
          <p className={`truncate font-mono font-black tracking-wider ${s.name}`}>{display}</p>
          <p className={`truncate font-semibold ${tone === 'dark' ? 'text-sky-300' : 'text-nasa-blue'} ${s.role}`}>{cadetRoleLabel(role)}</p>
          {extra}
        </figcaption>
      )}
    </figure>
  );
}
