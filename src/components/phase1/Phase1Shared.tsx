import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Check, Gift, type LucideIcon } from 'lucide-react';
import type { ItemId, VitalKey } from '../../types/game';
import { CATEGORY_META, ITEMS_BY_ID, RARITY_META } from '../../data/stationItems';
import AriaAssistantWidget from '../AriaAssistantWidget';
import MissionPatch from '../MissionPatchLogo';
import { ItemIcon, RESOURCE_ICONS } from '../icons';

/** Identidad monocromática de cada sistema: icono vectorial + código técnico (sin colores por rama). */
export const SYSTEM_META: Record<VitalKey, { code: string; Icon: LucideIcon }> = {
  oxygen: { code: 'SYS-O2', Icon: RESOURCE_ICONS.oxygen },
  power: { code: 'SYS-PWR', Icon: RESOURCE_ICONS.power },
  food: { code: 'SYS-AGR', Icon: RESOURCE_ICONS.food },
  shield: { code: 'SYS-RAD', Icon: RESOURCE_ICONS.shield },
  crewHealth: { code: 'SYS-MED', Icon: RESOURCE_ICONS.crewHealth },
};

/** Etiqueta de sistema: icono Azul NASA + código mono + nombre. */
export function SystemLabel({ cat, className = '' }: { cat: VitalKey; className?: string }) {
  const { code, Icon } = SYSTEM_META[cat];
  return (
    <span className={`inline-flex items-center gap-1.5 text-slate-800 ${className}`}>
      <Icon className="h-4 w-4 shrink-0 text-nasa-blue" strokeWidth={1.75} />
      <span className="font-mono text-xs font-semibold tracking-wider text-nasa-blue">{code}</span>
      <span className="font-bold">{CATEGORY_META[cat].label}</span>
    </span>
  );
}

/** Cabecera común de las sub-etapas de la Fase 1. */
export function Phase1Header({
  step,
  title,
  subtitle,
  right,
  triviaSeconds = 60,
}: {
  step: 1 | 2 | 3;
  title: string;
  subtitle: string;
  right?: ReactNode;
  triviaSeconds?: number;
}) {
  const steps = ['Preparados', `${triviaSeconds} s de Trivia`, 'Resumen'];
  return (
    <header className="relative z-10 grid shrink-0 grid-cols-1 items-center gap-3 border-b border-slate-300 bg-white px-4 py-2 shadow-sm md:grid-cols-[1fr_auto_1fr]">
      <div className="flex min-w-0 items-center gap-3">
        <MissionPatch size={60} />
        <div className="min-w-0">
          <h1 className="font-display truncate text-lg font-black text-nasa-blue sm:text-xl">{title}</h1>
          <p className="truncate text-xs text-slate-600">{subtitle}</p>
        </div>
      </div>
      <div className="flex items-center justify-center gap-1.5">
        {right ??
          steps.map((label, i) => (
            <div key={label} className="flex items-center gap-1.5">
              <span
                className={`flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-extrabold ${
                  i + 1 === step
                    ? 'border-nasa-blue bg-nasa-blue text-white'
                    : i + 1 < step
                      ? 'border-nasa-blue bg-white text-nasa-blue'
                      : 'border-slate-300 bg-white text-slate-400'
                }`}
              >
                {i + 1 < step ? <Check className="h-3.5 w-3.5" /> : `${i + 1}.`} {label}
              </span>
              {i < steps.length - 1 && <span className="h-px w-3 bg-slate-300" />}
            </div>
          ))}
      </div>
      <AriaAssistantWidget compact className="w-full max-w-sm justify-self-end" />
    </header>
  );
}

/** Ficha de objeto desbloqueado con su rareza. */
export function RewardChip({ id, highlight = false }: { id: ItemId; highlight?: boolean }) {
  const item = ITEMS_BY_ID[id];
  const meta = RARITY_META[item.rarity];
  return (
    <motion.span
      layout
      initial={{ scale: 0.4, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className={`inline-flex items-center gap-1.5 rounded-lg border-2 bg-white px-2 py-1 text-xs font-extrabold text-slate-800 shadow-sm ${meta.ring} ${
        highlight ? 'ring-2 ring-nasa-blue/40' : ''
      }`}
      title={`${meta.label} · ${item.description}`}
    >
      <ItemIcon id={id} className="h-4 w-4 text-nasa-blue" />
      {item.shortName}
    </motion.span>
  );
}

/** Tarjeta grande de "¡Has ganado!" para el objeto recompensado. */
export function RewardReveal({ id }: { id: ItemId }) {
  const item = ITEMS_BY_ID[id];
  const meta = RARITY_META[item.rarity];
  return (
    <motion.div
      initial={{ rotateY: 90, scale: 0.6, opacity: 0 }}
      animate={{ rotateY: 0, scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 160, damping: 14 }}
      className={`relative flex items-center gap-3 overflow-hidden rounded-2xl border-4 bg-white p-3 shadow-lg ${meta.ring}`}
    >
      {(item.rarity === 'epic' || item.rarity === 'legendary') && (
        <motion.div
          className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-slate-200/70 to-transparent"
          animate={{ x: ['-100%', '100%'] }}
          transition={{ duration: 1.6, repeat: Infinity }}
        />
      )}
      <span className="grid h-14 w-14 shrink-0 place-items-center rounded-lg border border-slate-200 bg-slate-100 text-nasa-blue">
        <ItemIcon id={id} className="h-8 w-8" />
      </span>
      <div className="relative min-w-0">
        <p className="flex items-center gap-1 text-xs font-extrabold uppercase tracking-wider text-nasa-blue">
          <Gift className="h-3.5 w-3.5" strokeWidth={1.75} /> Equipo conseguido
        </p>
        <p className="text-base font-black leading-tight text-slate-900">{item.name}</p>
        <span className={`mt-1 inline-block rounded border px-1.5 text-xs font-extrabold ${meta.badge}`}>{meta.label}</span>
      </div>
    </motion.div>
  );
}
