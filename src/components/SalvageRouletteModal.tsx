import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, animate, motion, useMotionValue } from 'framer-motion';
import confetti from 'canvas-confetti';
import { Lock, PackageCheck, PackageOpen, Recycle, Satellite, Siren, Sprout, TriangleExclamationPoint, X, Zap, type LucideIcon } from 'lucide-react';
import type { ItemId, SalvagePrizeId, SalvageSpinResult, SpinKind } from '../types/game';
import { ITEMS_BY_ID, RARITY_META } from '../data/stationItems';
import { SALVAGE_PRIZES, SPIN_META, SUPPLY_TIER_META, WHEELS } from '../data/salvagePrizes';
import { COMPLICATIONS } from '../data/triviaQuestions';
import { VITAL_META, VITAL_ORDER, availableItems, useGameStore } from '../store/useGameStore';
import { playButtonClick, playCaseTick, playErrorBuzz, playSuccess, playUnlock } from '../utils/soundEffects';
import { ItemIcon, PrizeIcon, ResourceIcon } from './icons';
import { RewardReveal } from './phase1/Phase1Shared';

/** Geometría del carrusel (px en el espacio local del modal). */
const CARD_W = 196;
const GAP = 14;
const STEP = CARD_W + GAP;
const STRIP_LEN = 50;
const WIN_INDEX = 42;
const SPIN_SECONDS = 4.5;
const SPIN_EASE: [number, number, number, number] = [0.12, 0.8, 0.18, 1];

/**
 * Cápsulas visibles: en la base espacial SOLO el Contenedor de Houston (al aterrizar el envío);
 * en el resumen de la Fase 1, el giro de rescate.
 */
const KINDS_PHASE1: SpinKind[] = ['emergency'];
const KINDS_PHASE2: SpinKind[] = ['houston'];
const KIND_ICON: Record<SpinKind, LucideIcon> = { houston: PackageCheck, emergency: Siren, energy: Zap, science: Satellite, food: Sprout, scrap: Recycle };

function randomStrip(kind: SpinKind, winner?: SalvagePrizeId): SalvagePrizeId[] {
  const pool = WHEELS[kind];
  const strip = Array.from({ length: STRIP_LEN }, () => pool[Math.floor(Math.random() * pool.length)]);
  if (winner) strip[WIN_INDEX] = winner;
  return strip;
}

/** Tarjeta de suministro: código técnico, icono vectorial, nombre y barra de grado. */
function SupplyCard({ id }: { id: SalvagePrizeId }) {
  const prize = SALVAGE_PRIZES[id];
  const tier = SUPPLY_TIER_META[prize.tier];
  const legendary = prize.tier === 'legendary';
  return (
    <div
      className="relative flex h-full shrink-0 flex-col overflow-hidden rounded-lg border border-slate-700 bg-gradient-to-b from-slate-800 to-slate-900"
      style={{ width: CARD_W, boxShadow: legendary ? `inset 0 0 28px -8px ${tier.color}` : undefined }}
    >
      <p className="border-b border-slate-700 px-3 py-1.5 font-mono text-xs font-semibold tracking-[0.2em] text-slate-400">
        SUPPLY // {String(prize.code).padStart(2, '0')}
      </p>
      <div className="grid flex-1 place-items-center text-slate-100">
        <PrizeIcon id={id} className="h-[clamp(2.5rem,9dvh,5rem)] w-[clamp(2.5rem,9dvh,5rem)]" strokeWidth={1.5} />
      </div>
      <p className="flex min-h-[2.6rem] items-center justify-center px-2.5 pb-2 text-center text-sm font-semibold leading-tight text-slate-100 [overflow-wrap:anywhere]">{prize.label}</p>
      <div className="h-2 w-full" style={{ background: tier.color, boxShadow: legendary ? `0 0 14px 2px ${tier.color}` : undefined }} />
    </div>
  );
}

/** Cápsula Orbital: apertura de suministros con carrusel horizontal (estilo "case opening"). */
export default function SalvageRouletteModal({
  open,
  onClose,
  initialKind,
  autoSpin = false,
}: {
  open: boolean;
  onClose: () => void;
  /** Cápsula preseleccionada al abrir (p. ej. 'houston'). */
  initialKind?: SpinKind;
  /** Abre la cápsula automáticamente al entrar (tirada gratis del Contenedor de Houston). */
  autoSpin?: boolean;
}) {
  const vitals = useGameStore((s) => s.vitals);
  const science = useGameStore((s) => s.scienceScore);
  const inventory = useGameStore((s) => s.bunkerInventory);
  const consumed = useGameStore((s) => s.consumedItems);
  const complications = useGameStore((s) => s.complications);
  const gamePhase = useGameStore((s) => s.gamePhase);
  // Re-render cuando cambian los datos que afectan a la disponibilidad
  useGameStore((s) => s.freeSpins + (s.emergencySpinUsed ? 1 : 0) + s.solStage.length);
  const availability = useGameStore.getState().getSpinAvailability();

  const [kind, setKind] = useState<SpinKind>('emergency');
  const [scrapId, setScrapId] = useState<ItemId | null>(null);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<SalvageSpinResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [strip, setStrip] = useState<SalvagePrizeId[]>(() => randomStrip('emergency'));
  const x = useMotionValue(0);
  const windowRef = useRef<HTMLDivElement>(null);
  const lastIndex = useRef(-1);

  /** Posición de reposo: la 3.ª tarjeta centrada bajo el láser. */
  const restX = () => (windowRef.current?.clientWidth ?? 800) / 2 - 2 * STEP - CARD_W / 2;

  // Al abrir, preseleccionar la primera cápsula disponible
  useEffect(() => {
    if (!open) return;
    setResult(null);
    setError(null);
    const avail = useGameStore.getState().getSpinAvailability();
    const list = useGameStore.getState().gamePhase === 'PHASE_1_SCAVENGE' ? KINDS_PHASE1 : KINDS_PHASE2;
    const first = initialKind && avail[initialKind].ok ? initialKind : (list.find((k) => avail[k].ok) ?? list[0]);
    setKind(first);
    setStrip(randomStrip(first));
    requestAnimationFrame(() => {
      x.set(restX());
      // Tirada gratuita automática: se abre sola tras un instante para que el niño vea el carrusel
      if (autoSpin && first === initialKind) setTimeout(() => openCapsule(first), 650);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const scrapCandidates = availableItems(inventory, consumed);
  const inPhase1 = gamePhase === 'PHASE_1_SCAVENGE';
  const contents = [...new Set(WHEELS[kind])];

  const selectKind = (k: SpinKind) => {
    playButtonClick();
    setKind(k);
    setError(null);
    if (!spinning) {
      setResult(null);
      setStrip(randomStrip(k));
      x.set(restX());
    }
  };

  const openCapsule = (k: SpinKind = kind) => {
    if (spinning) return;
    if (k === 'scrap' && !scrapId) {
      setError('Elige primero qué objeto desmontar.');
      playErrorBuzz();
      return;
    }
    const res = useGameStore.getState().salvageSpin(k, scrapId ?? undefined);
    if ('error' in res) {
      setError(res.error);
      playErrorBuzz();
      return;
    }
    playButtonClick();
    setError(null);
    setResult(null);
    setSpinning(true);
    setScrapId(null);

    const center = (windowRef.current?.clientWidth ?? 800) / 2;
    setStrip(randomStrip(k, res.prize.id));
    x.set(restX());
    lastIndex.current = Math.floor((center - x.get()) / STEP);

    // Desplazamiento aleatorio dentro de la tarjeta ganadora; 1 de cada 3 veces, "al borde" (máxima tensión)
    const edge = Math.random() < 0.33;
    const offset = edge
      ? Math.random() < 0.5
        ? 4 + Math.random() * 10
        : CARD_W - 4 - Math.random() * 10
      : CARD_W * (0.2 + Math.random() * 0.6);
    const target = center - WIN_INDEX * STEP - offset;

    void animate(x, target, {
      duration: SPIN_SECONDS,
      ease: SPIN_EASE,
      onUpdate: (v) => {
        const idx = Math.floor((center - v) / STEP);
        if (idx !== lastIndex.current) {
          lastIndex.current = idx;
          playCaseTick();
        }
      },
      onComplete: () => {
        setSpinning(false);
        setResult(res);
        if (res.prize.big) {
          playUnlock();
          const colors = ['#0b3d91', '#fc3d21', SUPPLY_TIER_META[res.prize.tier].color, '#ffffff'];
          const end = Date.now() + 1200;
          const frame = () => {
            void confetti({ particleCount: 6, angle: 60, spread: 70, origin: { x: 0, y: 0.7 }, colors });
            void confetti({ particleCount: 6, angle: 120, spread: 70, origin: { x: 1, y: 0.7 }, colors });
            if (Date.now() < end) requestAnimationFrame(frame);
          };
          frame();
        } else {
          playSuccess();
        }
        useGameStore.getState().ariaSay(res.message);
      },
    });
  };

  const kinds = inPhase1 ? KINDS_PHASE1 : KINDS_PHASE2;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="thin-scroll fixed inset-0 z-50 flex overflow-y-auto bg-slate-950/90 p-[clamp(0.4rem,1.5dvh,1.5rem)] backdrop-blur-md"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="dialog"
          aria-modal="true"
          aria-label="Cápsula Orbital"
        >
          <div className="m-auto flex min-h-[min(80dvh,42rem)] w-[95vw] max-w-6xl flex-col justify-between gap-[clamp(0.6rem,2.4dvh,1.5rem)] rounded-3xl border border-slate-800 bg-slate-950/95 p-[clamp(0.8rem,2.6dvh,2rem)] shadow-2xl">
            {/* Cabecera: título, recursos y cápsula a la izquierda · solo "Volver" arriba a la derecha */}
            <header className="flex w-full items-center justify-between gap-4">
              <div className="flex min-w-0 flex-col items-start gap-2">
                <div className="flex items-center gap-3">
                  <span className="grid h-[clamp(2.5rem,7dvh,3rem)] w-[clamp(2.5rem,7dvh,3rem)] shrink-0 place-items-center rounded-xl border border-slate-600 bg-slate-800 text-white">
                    <PackageOpen className="h-7 w-7" strokeWidth={1.75} />
                  </span>
                  <div>
                    <p className="font-mono text-xs tracking-[0.25em] text-slate-400">SUPPLY DROP // ÓRBITA MARCIANA</p>
                    <h2 className="font-display text-[clamp(1.3rem,4dvh,1.875rem)] font-black text-white">CÁPSULA ORBITAL</h2>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 text-xs font-bold">
                  {!inPhase1 &&
                    VITAL_ORDER.map((k) => (
                      <span
                        key={k}
                        title={VITAL_META[k].label}
                        className={`flex items-center gap-1.5 rounded-md border px-2 py-1 font-mono ${
                          vitals[k] < 30 ? 'border-nasa-red bg-nasa-red text-white' : 'border-white/15 bg-white/10 text-white'
                        }`}
                      >
                        <ResourceIcon k={k} /> {vitals[k]}
                      </span>
                    ))}
                  {!inPhase1 && (
                    <span title="Ciencia" className="flex items-center gap-1.5 rounded-md border border-white/15 bg-white/10 px-2 py-1 font-mono text-white">
                      <ResourceIcon k="science" /> {science}
                    </span>
                  )}
                  {complications.map((c) => (
                    <span key={c} className="flex items-center gap-1.5 rounded-md border border-amber-400/60 bg-amber-400/15 px-2 py-1 text-amber-200">
                      <TriangleExclamationPoint className="h-4 w-4" strokeWidth={1.75} /> {COMPLICATIONS[c].title}
                    </span>
                  ))}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                {kinds.map((k) => {
                  const a = availability[k];
                  const active = kind === k;
                  const KindIcon = KIND_ICON[k];
                  return (
                    <button
                      key={k}
                      type="button"
                      disabled={spinning}
                      onClick={() => selectKind(k)}
                      title={a.ok ? SPIN_META[k].description : `${SPIN_META[k].description} · ${a.reason}`}
                      className={`flex items-center gap-2 rounded-lg border-2 px-3 py-2 text-sm font-extrabold transition ${
                        active ? 'border-nasa-red bg-nasa-red/15 text-white' : 'border-white/15 bg-white/5 text-white hover:bg-white/10'
                      } ${!a.ok && !active ? 'opacity-60' : ''}`}
                    >
                      {a.ok ? <KindIcon className="h-5 w-5 shrink-0" strokeWidth={1.75} /> : <Lock className="h-4 w-4 shrink-0" />}
                      {SPIN_META[k].title}
                      <span className="rounded bg-nasa-red px-1.5 font-mono text-xs font-bold text-white">{SPIN_META[k].cost}</span>
                    </button>
                  );
                })}
                </div>
              </div>

              <button
                type="button"
                disabled={spinning}
                onClick={() => {
                  playButtonClick();
                  onClose();
                }}
                className="ml-auto flex shrink-0 items-center gap-1.5 self-start rounded-xl bg-[#FC3D21] px-4 py-2 font-bold text-white shadow-lg transition hover:bg-orange-600 disabled:opacity-40"
              >
                <X size={18} /> Volver
              </button>
            </header>

            {/* Carrusel protagonista a todo el ancho */}
            <div ref={windowRef} className="relative h-[clamp(9rem,32dvh,16rem)] w-full shrink-0 overflow-hidden rounded-2xl border-2 border-slate-700 bg-slate-900 shadow-2xl">
              <motion.div className="absolute inset-y-4 left-0 flex" style={{ x, gap: GAP }}>
                {strip.map((pid, i) => (
                  <SupplyCard key={i} id={pid} />
                ))}
              </motion.div>
              {/* Profundidad lateral */}
              <div className="pointer-events-none absolute inset-0 z-10 bg-gradient-to-r from-slate-950 via-transparent to-slate-950" />
              {/* Láser marcador */}
              <div className="pointer-events-none absolute inset-y-0 left-1/2 z-20 w-1 -translate-x-1/2 bg-[#FC3D21] shadow-[0_0_14px_3px_rgba(252,61,33,0.75)]" />
              <div className="pointer-events-none absolute left-1/2 top-0 z-20 h-0 w-0 -translate-x-1/2 border-x-[12px] border-t-[14px] border-x-transparent border-t-[#FC3D21]" />
              <div className="pointer-events-none absolute bottom-0 left-1/2 z-20 h-0 w-0 -translate-x-1/2 border-x-[12px] border-b-[14px] border-x-transparent border-b-[#FC3D21]" />
            </div>

            {/* Zona inferior centrada: botón + premio / contenido */}
            <div className="flex w-full flex-col items-center gap-[clamp(0.6rem,2dvh,1.25rem)]">
              {kind === 'scrap' && !result && (
                <div className="w-full max-w-2xl rounded-lg border-2 border-white/15 bg-white/5 p-3 text-white">
                  <p className="flex items-center gap-1.5 text-sm font-extrabold">
                    <Recycle className="h-4 w-4" strokeWidth={1.75} /> ¿Qué objeto desmontas?
                  </p>
                  <p className="text-xs text-white/70">Lo pierdes para siempre, pero puedes conseguir algo mejor.</p>
                  <div className="thin-scroll mt-2 grid max-h-48 gap-1.5 overflow-y-auto sm:grid-cols-2">
                    {scrapCandidates.length === 0 && <p className="text-xs text-white/60">No tienes objetos.</p>}
                    {scrapCandidates.map((id) => {
                      const it = ITEMS_BY_ID[id];
                      return (
                        <button
                          key={id}
                          type="button"
                          disabled={spinning}
                          onClick={() => setScrapId(id)}
                          className={`flex items-center gap-2 rounded-md border-2 px-2 py-1 text-left text-xs font-bold ${
                            scrapId === id ? 'border-nasa-red bg-white text-slate-900' : 'border-white/15 bg-white/5 text-white hover:bg-white/15'
                          }`}
                        >
                          <ItemIcon id={id} className="h-4 w-4 shrink-0" />
                          <span className="min-w-0 flex-1 truncate">{it.shortName}</span>
                          <span className={`rounded border px-1 text-xs ${RARITY_META[it.rarity].badge}`}>{RARITY_META[it.rarity].label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="flex flex-col items-center gap-2">
                <motion.button
                  type="button"
                  whileHover={!spinning && availability[kind].ok ? { scale: 1.04 } : {}}
                  whileTap={!spinning && availability[kind].ok ? { scale: 0.96 } : {}}
                  disabled={spinning || !availability[kind].ok}
                  onClick={() => openCapsule()}
                  className="font-display glow-red flex items-center gap-3 rounded-xl bg-nasa-red px-[clamp(1.5rem,5vw,3rem)] py-[clamp(0.55rem,2dvh,1rem)] text-[clamp(1.05rem,3.4dvh,1.5rem)] font-black tracking-wider text-white disabled:bg-slate-600 disabled:shadow-none"
                >
                  <PackageOpen className="h-7 w-7" strokeWidth={1.75} />
                  {spinning ? 'ABRIENDO...' : `ABRIR CÁPSULA · ${SPIN_META[kind].cost}`}
                </motion.button>
                {!availability[kind].ok && !spinning && !result && (
                  <p className="flex items-center gap-1.5 text-sm font-bold text-amber-300">
                    <Lock className="h-4 w-4 shrink-0" /> {availability[kind].reason}
                  </p>
                )}
                {error && <p className="rounded-md bg-nasa-red px-3 py-1 text-sm font-bold text-white">{error}</p>}
              </div>

              <AnimatePresence mode="wait">
                {result ? (
                  <motion.div
                    key={`r-${result.message}`}
                    initial={{ opacity: 0, y: 16, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    className="mx-auto flex w-full max-w-2xl flex-col gap-3 rounded-2xl border-2 bg-white p-4 text-slate-900 sm:flex-row sm:items-start"
                    style={{ borderColor: SUPPLY_TIER_META[result.prize.tier].color }}
                  >
                    <span
                      className="grid h-16 w-16 shrink-0 place-items-center rounded-lg bg-slate-900 text-white"
                      style={{ boxShadow: `inset 0 -6px 0 ${SUPPLY_TIER_META[result.prize.tier].color}` }}
                    >
                      <PrizeIcon id={result.prize.id} className="h-9 w-9" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-mono text-xs font-semibold tracking-[0.2em]" style={{ color: SUPPLY_TIER_META[result.prize.tier].color }}>
                        EQUIPO CONSEGUIDO · {SUPPLY_TIER_META[result.prize.tier].label.toUpperCase()} · SUPPLY // {String(result.prize.code).padStart(2, '0')}
                      </p>
                      <p className="font-display text-xl font-black text-nasa-blue">{result.prize.label}</p>
                      <p className="mt-1 text-sm text-slate-700">{result.message}</p>
                      {result.items.length > 0 && (
                        <div className="mt-2 grid gap-2 sm:grid-cols-2">
                          {result.items.map((id) => (
                            <RewardReveal key={id} id={id} />
                          ))}
                        </div>
                      )}
                    </div>
                  </motion.div>
                ) : (
                  <motion.div key="contents" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mx-auto w-full max-w-2xl rounded-lg border border-white/15 bg-white/5 p-3 text-white [@media(max-height:680px)]:hidden">
                    <p className="font-mono text-xs font-semibold tracking-[0.2em] text-slate-400">CONTENIDO DE LA CÁPSULA</p>
                    <ul className="mt-2 grid gap-1.5 text-sm sm:grid-cols-2">
                      {contents.map((pid) => (
                        <li key={pid} className="flex items-center gap-2">
                          <span className="h-3 w-1 rounded-sm" style={{ background: SUPPLY_TIER_META[SALVAGE_PRIZES[pid].tier].color }} />
                          <PrizeIcon id={pid} className="h-4 w-4 text-slate-300" />
                          {SALVAGE_PRIZES[pid].label}
                          <span className="text-xs text-slate-400">· {SUPPLY_TIER_META[SALVAGE_PRIZES[pid].tier].label}</span>
                        </li>
                      ))}
                    </ul>
                    {inPhase1 && <p className="mt-2 text-xs text-amber-200">Los premios de barras se sumarán al empezar la base espacial.</p>}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
