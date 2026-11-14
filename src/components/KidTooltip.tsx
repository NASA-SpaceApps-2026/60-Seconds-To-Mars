import type { ReactNode } from 'react';
import { BookOpen } from 'lucide-react';

/**
 * Tooltip amigable para el glosario científico: aparece al pasar el ratón o al enfocar con el teclado
 * (o al tocar en tablet). Sin librerías: CSS de Tailwind con `group`.
 */
export default function KidTooltip({
  term,
  text,
  extra,
  children,
  align = 'center',
  side = 'bottom',
  className = '',
}: {
  term: string;
  text: string;
  /** Línea extra (p. ej. el valor actual del velocímetro). */
  extra?: string;
  children: ReactNode;
  align?: 'left' | 'center' | 'right';
  side?: 'bottom' | 'right';
  className?: string;
}) {
  const pos =
    side === 'right'
      ? 'left-full top-0 ml-2'
      : align === 'left'
        ? 'left-0 top-full mt-2'
        : align === 'right'
          ? 'right-0 top-full mt-2'
          : 'left-1/2 top-full mt-2 -translate-x-1/2';
  return (
    <span className={`group/tip relative inline-flex ${className}`} tabIndex={0} aria-label={`${term}: ${text}`}>
      {children}
      <span
        role="tooltip"
        className={`pointer-events-none invisible absolute z-[70] w-[min(18rem,80vw)] rounded-xl border border-sky-400/40 bg-slate-900/95 p-3 text-left text-sm font-normal normal-case leading-snug tracking-normal text-slate-100 opacity-0 shadow-2xl transition-opacity duration-150 group-hover/tip:visible group-hover/tip:opacity-100 group-focus-within/tip:visible group-focus-within/tip:opacity-100 ${pos}`}
      >
        <span className="mb-1 flex items-center gap-1.5 font-bold text-sky-300">
          <BookOpen className="h-4 w-4 shrink-0" strokeWidth={1.75} /> {term}
        </span>
        <span className="block">{text}</span>
        {extra && <span className="mt-1.5 block font-mono text-xs text-slate-400">{extra}</span>}
      </span>
    </span>
  );
}
