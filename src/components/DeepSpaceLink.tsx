import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Award, PackageCheck, PackageOpen, SatelliteDish, Timer, Wrench } from 'lucide-react';
import {
  HOUSTON_COST_POWER,
  HOUSTON_DELAY_SOLS,
  HOUSTON_MAX_IN_TRANSIT,
  HOUSTON_MAX_ORDERS,
  HOUSTON_ORDER,
  HOUSTON_PACKAGES,
} from '../data/missionExtras';
import { useGameStore } from '../store/useGameStore';
import { earthMarsLink } from '../utils/marsEphemeris';
import { playErrorBuzz } from '../utils/soundEffects';
import { ResourceIcon } from './icons';
import { tr } from '../i18n/core';

/**
 * Enlace Deep Space Network (Tierra): pedir un Paquete de Ayuda a Houston cuesta Energía HOY
 * y tarda 2 Soles en llegar. Enseña a anticiparse antes de que una barra llegue a cero.
 */
export default function DeepSpaceLink({
  onOpenCrate,
}: {
  /** Reabre la Cápsula Orbital si quedó un Contenedor de Houston sin abrir. */
  onOpenCrate: () => void;
}) {
  const order = useGameStore((s) => s.orderHoustonPackage);
  const crates = useGameStore((s) => s.houstonCrates);
  const sol = useGameStore((s) => s.sol);
  const stage = useGameStore((s) => s.solStage);
  const power = useGameStore((s) => s.vitals.power);
  const orders = useGameStore((s) => s.houstonOrders);
  const orderedSol = useGameStore((s) => s.houstonOrderedSol);
  const placed = useGameStore((s) => s.houstonOrdersPlaced);
  const [error, setError] = useState<string | null>(null);
  const delay = Math.round(earthMarsLink().lightDelayMinutes);
  const sentToday = orderedSol === sol;
  const remaining = Math.max(0, HOUSTON_MAX_ORDERS - placed);
  const linesFull = orders.length >= HOUSTON_MAX_IN_TRANSIT;
  const blockReason =
    remaining === 0
      ? tr(`Has usado los ${HOUSTON_MAX_ORDERS} pedidos de la misión.`, `You have used the mission's ${HOUSTON_MAX_ORDERS} orders.`)
      : linesFull
        ? tr('Ya hay un envío en camino: cuando llegue a la base podrás pedir otro.', 'A shipment is already on its way: once it reaches the base you can order another.')
        : sentToday
          ? tr('La antena ya transmitió hoy. Mañana puedes pedir otro paquete.', 'The antenna already transmitted today. You can order another package tomorrow.')
          : null;

  return (
    <section className="shrink-0 rounded-2xl border-2 border-slate-200 bg-white p-3 shadow-sm">
      <div className="flex items-center gap-2">
        <SatelliteDish className="h-5 w-5 text-nasa-blue" strokeWidth={1.75} />
        <h2 className="text-base font-bold text-slate-800">{tr('Enlace Deep Space Network (Tierra)', 'Deep Space Network Link (Earth)')}</h2>
      </div>
      <p className="mt-0.5 text-sm text-slate-600">
        {tr('Señal a Houston', 'Signal to Houston')}: ≈ {delay} min · {tr('Envío', 'Shipment')}: {HOUSTON_DELAY_SOLS} {tr('Soles', 'Sols')} · {tr('Coste hoy', 'Cost today')}: −{HOUSTON_COST_POWER} {tr('Energía', 'Power')}
      </p>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <p className="font-mono text-xs font-bold tracking-[0.18em] text-nasa-blue">{tr('PEDIR SUMINISTROS', 'ORDER SUPPLIES')}</p>
        <p className="text-xs font-semibold text-slate-600">
          {tr('Quedan', 'Left')} <b className="text-nasa-blue">{remaining}/{HOUSTON_MAX_ORDERS}</b> · {tr('En camino', 'On its way')}{' '}
          <b className="text-nasa-blue">{orders.length}/{HOUSTON_MAX_IN_TRANSIT}</b>
        </p>
      </div>
      <div className="mt-1 grid grid-cols-3 gap-2">
        {HOUSTON_ORDER.map((id) => {
          const pkg = HOUSTON_PACKAGES[id];
          const disabled = stage !== 'event' || blockReason !== null;
          return (
            <button
              key={id}
              type="button"
              disabled={disabled}
              onClick={() => {
                const r = order(id);
                if ('error' in r) {
                  setError(r.error);
                  playErrorBuzz();
                } else setError(null);
              }}
              className="flex flex-col items-center gap-0.5 rounded-lg border border-slate-300 bg-slate-50 px-2 py-2 text-slate-800 transition hover:border-nasa-blue hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span className="flex items-center gap-1 font-mono text-base font-semibold text-nasa-blue">
                +{pkg.amount} <ResourceIcon k={pkg.vital} />
              </span>
              <span className="text-xs font-semibold leading-tight">{pkg.label}</span>
            </button>
          );
        })}
      </div>

      {crates > 0 && (
        <motion.button
          type="button"
          animate={{ scale: [1, 1.03, 1] }}
          transition={{ duration: 1.2, repeat: Infinity }}
          onClick={onOpenCrate}
          className="font-display mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-nasa-blue px-3 py-2.5 text-sm font-black tracking-wider text-white"
        >
          <PackageOpen className="h-5 w-5" strokeWidth={1.75} /> {tr('ABRIR CONTENEDOR DE HOUSTON', 'OPEN HOUSTON CONTAINER')} ({crates})
        </motion.button>
      )}
      {blockReason && <p className="mt-1.5 text-xs font-semibold text-slate-500">{blockReason}</p>}
      {error && <p className="mt-1.5 text-xs font-bold text-nasa-red">{error}</p>}

      {orders.length > 0 && (
        <ul className="mt-2 space-y-1">
          {orders.map((o, i) => {
            const left = o.arrivalSol - sol;
            return (
              <li key={i} className="flex items-center gap-2 rounded-md bg-blue-50 px-2 py-1 text-sm text-nasa-blue">
                <Timer className="h-4 w-4 shrink-0" strokeWidth={1.75} />
                <span className="min-w-0 flex-1 truncate font-semibold">{HOUSTON_PACKAGES[o.id].label}</span>
                <span className="shrink-0 font-mono text-xs font-semibold">
                  {tr('Llegada estimada en:', 'Estimated arrival in:')} {left} {left === 1 ? tr('Sol', 'Sol') : tr('Soles', 'Sols')}
                </span>
              </li>
            );
          })}
        </ul>
      )}
      {power < 15 && stage === 'event' && !blockReason &&<p className="mt-1.5 text-xs font-semibold text-amber-700">{tr('Energía baja: la antena necesita al menos 15.', 'Low power: the antenna needs at least 15.')}</p>}
    </section>
  );
}

/** Aviso flotante: paquete de Houston recibido o insignia nueva (se oculta solo). */
export function MissionNoticeToast() {
  const notice = useGameStore((s) => s.notice);
  const dismiss = useGameStore((s) => s.dismissNotice);
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(dismiss, 4200);
    return () => clearTimeout(t);
  }, [notice, dismiss]);

  return (
    <div className="pointer-events-none fixed inset-x-0 top-24 z-40 flex justify-center px-4">
      <AnimatePresence>
        {notice && (
          <motion.button
            key={notice.key}
            type="button"
            onClick={dismiss}
            initial={{ opacity: 0, y: -20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12 }}
            className="pointer-events-auto flex items-center gap-3 rounded-xl border-2 border-nasa-blue bg-white px-5 py-3 text-left shadow-2xl"
          >
            <span className="grid h-10 w-10 place-items-center rounded-lg bg-nasa-blue text-white">
              {notice.kind === 'badge' ? (
                <Award className="h-6 w-6" strokeWidth={1.75} />
              ) : notice.kind === 'alert' ? (
                <Wrench className="h-6 w-6" strokeWidth={1.75} />
              ) : (
                <PackageCheck className="h-6 w-6" strokeWidth={1.75} />
              )}
            </span>
            <span>
              <span className="block font-mono text-xs font-semibold uppercase tracking-wider text-slate-500">{notice.title}</span>
              <span className="block text-base font-bold text-slate-900">{notice.text}</span>
            </span>
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}

