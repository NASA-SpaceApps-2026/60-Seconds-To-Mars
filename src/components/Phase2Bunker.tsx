import { useAriaScreenReady } from '../utils/useAriaVoiceState';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowRight,
  ChartColumn,
  BatteryLow,
  Bot,
  CircleCheck,
  ChevronDown,
  ChevronLeft,
  Minus,
  Monitor,
  Package,
  SatelliteDish,
  FlaskConical,
  Lock,
  Radiation,
  Satellite,
  Sparkles,
  Sprout,
  Telescope,
  TriangleExclamationPoint,
  Wrench,
  X,
  type LucideIcon,
} from 'lucide-react';
import { ItemIcon, ResourceIcon, type ResourceKey } from './icons';
import type { Effects, EventOption, ItemId, MinigameKind, RepairTarget, StationItem, VitalKey } from '../types/game';
import { ITEMS_BY_ID, STATION_ITEMS } from '../data/stationItems';
import { LOADING_MESSAGES } from '../data/fallbackNasaData';
import { COMPLICATIONS } from '../data/triviaQuestions';
import {
  RADIATION_LABEL,
  TOTAL_SOLS,
  VITAL_META,
  VITAL_ORDER,
  availableItems,
  applyEffects,
  computeSolTick,
  isMachineBroken,
  useGameStore,
} from '../store/useGameStore';
import { playButtonClick, playErrorBuzz } from '../utils/soundEffects';
import AriaRobot from './AriaRobot';
import BunkerDiorama from './BunkerDiorama';
import GaugeMeter from './GaugeMeter';
import NasaLogo from './NasaLogo';
import SalvageRouletteModal from './SalvageRouletteModal';
import PeriscopeModal from './PeriscopeModal';
import ArrivalTransmission from './ArrivalTransmission';
import { devInitialOverlay } from '../utils/devQa';
import KidTooltip from './KidTooltip';
import { GLOSSARY, VITAL_GLOSSARY } from '../data/glossary';
import DeepSpaceLink, { MissionNoticeToast } from './DeepSpaceLink';
import EmergencyMinigameModal from './minigames/EmergencyMinigameModal';
import { HOUSTON_MAX_ORDERS, REPAIR_FAIL_POWER, pickMinigame, repairKey } from '../data/missionExtras';

const EFFECT_ORDER: (keyof Effects)[] = ['oxygen', 'power', 'food', 'shield', 'crewHealth', 'science'];

const RADIATION_DOT = { low: 'bg-emerald-500', moderate: 'bg-amber-400', high: 'bg-orange-500', extreme: 'bg-red-600' } as const;
const VITAL_GROUPS: { label: string; keys: VitalKey[] }[] = [
  { label: 'VIDA', keys: ['oxygen', 'food', 'crewHealth'] },
  { label: 'ENERGÍA', keys: ['power'] },
  { label: 'PROTECCIÓN', keys: ['shield'] },
];

/** Cifra + icono vectorial del recurso: "−14 [Zap]". */
function Delta({ k, v, className = '' }: { k: ResourceKey; v: number; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 font-mono font-semibold tabular-nums ${className}`}>
      {v > 0 ? '+' : '−'}
      {Math.abs(v)}
      <ResourceIcon k={k} className="h-4 w-4 shrink-0" />
    </span>
  );
}

/** Efectos como números grandes con icono vectorial. */
function EffectNumbers({ effects }: { effects: Effects }) {
  const entries = EFFECT_ORDER.filter((k) => (effects[k] ?? 0) !== 0);
  return (
    <span className="flex shrink-0 flex-wrap justify-end gap-1.5">
      {entries.map((k) => {
        const v = effects[k]!;
        return <Delta key={k} k={k} v={v} className={`rounded-md px-2.5 py-1 text-base ${v > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`} />;
      })}
    </span>
  );
}

/** Un único badge con el efecto principal del objeto. */
function MainEffect({ item }: { item: StationItem }) {
  const sep = <span className="text-slate-400">/</span>;
  let content: ReactNode;
  if (item.kind === 'consumable' && item.useEffect) {
    const [k, v] = Object.entries(item.useEffect)[0] as [keyof Effects, number];
    content = <Delta k={k} v={v} />;
  } else if (item.kind === 'tool') {
    content = (
      <>
        <Wrench className="h-4 w-4" strokeWidth={1.75} /> Reparaciones
      </>
    );
  } else if (item.id === 'lead_blanket' || item.radiationReduction) {
    content = (
      <>
        <Radiation className="h-4 w-4" strokeWidth={1.75} />
        <span className="font-mono font-semibold">{item.id === 'lead_blanket' ? '÷2' : `−${item.radiationReduction}`}</span>
      </>
    );
  } else if (item.id === 'osdr_seeds') {
    content = (
      <>
        <Delta k="power" v={-2} /> {sep} <Delta k="food" v={20} /> <span className="font-mono">(2 Soles)</span>
      </>
    );
  } else {
    const gain = Object.entries(item.effectPerSol ?? {}).find(([k]) => k !== 'power') as [keyof Effects, number] | undefined;
    content = (
      <>
        {item.powerPerSol !== 0 && <Delta k="power" v={item.powerPerSol} />}
        {item.powerPerSol !== 0 && gain && sep}
        {gain && <Delta k={gain[0]} v={gain[1]} />}
      </>
    );
  }
  return <span className="mt-0.5 inline-flex max-w-full flex-wrap items-center gap-x-1.5 gap-y-0.5 rounded-md bg-slate-100 px-2 py-0.5 text-sm text-slate-700">{content}</span>;
}

function Toggle({ on, onClick, label }: { on: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={onClick}
      className={`relative flex h-8 w-[4.5rem] shrink-0 items-center rounded-full px-1 transition ${on ? 'bg-emerald-500' : 'bg-slate-300'}`}
    >
      <motion.span
        layout
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        className={`grid h-6 w-9 place-items-center rounded-full bg-white text-xs font-black shadow ${on ? 'ml-auto text-emerald-600' : 'text-slate-500'}`}
      >
        {on ? 'ON' : 'OFF'}
      </motion.span>
    </button>
  );
}

function OptionButton({
  option,
  inventory,
  loaded,
  onChoose,
  projectedEffects,
}: {
  option: EventOption;
  inventory: ItemId[];
  loaded: ItemId[];
  onChoose: () => void;
  projectedEffects?: Effects;
}) {
  const req = option.requiredItemId ? ITEMS_BY_ID[option.requiredItemId] : null;
  const available = !req || inventory.includes(req.id);
  const advantage = req && available;
  const lockReason = req && !available ? (loaded.includes(req.id) ? `Ya usaste ${req.shortName}` : `Falta: ${req.shortName}`) : '';

  return (
    <motion.button
      type="button"
      whileHover={available ? {} : { x: [0, -3, 3, 0] }}
      whileTap={available ? { scale: 0.99 } : {}}
      onClick={() => {
        if (!available) {
          playErrorBuzz();
          return;
        }
        playButtonClick();
        onChoose();
      }}
      aria-disabled={!available}
      title={option.description || undefined}
      className={`box-border flex w-full min-w-0 flex-col gap-[clamp(0.35rem,1.2dvh,0.75rem)] rounded-2xl border-2 px-3 py-[clamp(0.45rem,1.5dvh,1rem)] text-left transition-colors sm:px-4 ${
        !available
          ? 'cursor-not-allowed border-slate-200 bg-slate-100 opacity-60'
          : advantage
            ? 'border-emerald-500 bg-emerald-50 hover:bg-emerald-100'
            : 'border-slate-200 bg-white shadow-sm hover:border-nasa-blue hover:bg-blue-50/40'
      }`}
    >
      <span className="flex min-w-0 items-start justify-between gap-4">
        <span className="min-w-0">
          <span className={`block text-[clamp(0.95rem,2.6dvh,1.125rem)] font-bold leading-snug ${available ? 'text-slate-900' : 'text-slate-500'}`}>{option.label}</span>
          {advantage && (
            <span className="mt-0.5 flex items-center gap-1 text-base font-semibold text-emerald-700">
              <Sparkles className="h-4 w-4" strokeWidth={1.75} /> Ventaja: <ItemIcon id={req.id} className="h-4 w-4" /> {req.shortName}
            </span>
          )}
          {!available && (
            <span className="mt-0.5 flex items-center gap-1 text-base font-semibold text-slate-500">
              <Lock size={14} /> {lockReason}
            </span>
          )}
        </span>
        <span className="flex shrink-0 flex-col items-end gap-1">
          <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Decisión</span>
          <EffectNumbers effects={option.effects} />
        </span>
      </span>
      {available && projectedEffects && (
        <span className="ml-auto flex w-fit max-w-full flex-wrap items-center justify-end gap-x-2 gap-y-1 border-t border-slate-200 pt-[clamp(0.25rem,1dvh,0.5rem)] text-right text-xs font-bold uppercase tracking-wide text-slate-500 sm:min-w-[20.4375rem]">
          Al terminar el Sol
          <span className="block normal-case tracking-normal">
            <EffectNumbers effects={projectedEffects} />
          </span>
        </span>
      )}
    </motion.button>
  );
}

type Overlay = 'none' | 'systems' | 'houston' | 'aria' | 'decision' | 'periscope';

/** Botón de la leyenda interactiva (abajo a la izquierda): explica y abre cada panel. */
function LegendButton({
  icon: Icon,
  label,
  status,
  tone,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  status: string;
  tone: 'ok' | 'info' | 'alert';
  onClick: () => void;
}) {
  const statusCls = tone === 'alert' ? 'bg-nasa-red text-white' : tone === 'ok' ? 'bg-emerald-600 text-white' : 'bg-sky-500/25 text-sky-200';
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-3 rounded-lg px-2 py-1.5 text-left text-white transition hover:bg-white/10"
    >
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-white/10 text-sky-300">
        <Icon className="h-5 w-5" strokeWidth={1.75} />
      </span>
      <span className="min-w-0 flex-1 truncate whitespace-nowrap text-sm font-bold">{label}</span>
      <span className={`shrink-0 rounded-md px-2 py-0.5 text-xs font-bold ${statusCls}`}>{status}</span>
    </button>
  );
}

/** Botón "Reparar": abre el minijuego de la avería (1 intento por Sol). */
function RepairButton({ tried, onClick }: { tried: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={tried}
      title={tried ? 'Ya lo intentaste este Sol: vuelve a probar mañana' : 'Reparar con un minijuego'}
      className="flex shrink-0 items-center gap-1.5 rounded-lg bg-nasa-red px-3 py-1.5 text-sm font-black text-white transition hover:brightness-110 disabled:bg-slate-300 disabled:text-slate-600"
    >
      <Wrench className="h-4 w-4" strokeWidth={2} /> {tried ? 'Mañana' : 'Reparar Averías'}
    </button>
  );
}

function LoadingTelemetry({ sol }: { sol: number }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((n) => (n + 1) % LOADING_MESSAGES.length), 900);
    return () => clearInterval(t);
  }, []);
  return (
    <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex h-full flex-col items-center justify-center gap-3 text-center">
      <motion.div animate={{ rotate: 360 }} transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}>
        <Satellite size={40} className="text-nasa-blue" />
      </motion.div>
      <p className="font-display text-lg font-bold text-nasa-blue">SOL {sol}</p>
      <AnimatePresence mode="wait">
        <motion.p key={i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className="text-base text-slate-600">
          {LOADING_MESSAGES[i]}
        </motion.p>
      </AnimatePresence>
    </motion.div>
  );
}

export default function Phase2Bunker() {
  useAriaScreenReady();
  const sol = useGameStore((s) => s.sol);
  const missionDifficulty = useGameStore((s) => s.missionDifficulty);
  const vitals = useGameStore((s) => s.vitals);
  const science = useGameStore((s) => s.scienceScore);
  const inventory = useGameStore((s) => s.bunkerInventory);
  const consumed = useGameStore((s) => s.consumedItems);
  const machineStates = useGameStore((s) => s.machineStates);
  const seedGrowth = useGameStore((s) => s.seedGrowth);
  const event = useGameStore((s) => s.currentEvent);
  const stage = useGameStore((s) => s.solStage);
  const report = useGameStore((s) => s.lastReport);
  const pendingOutcome = useGameStore((s) => s.pendingOutcome);
  const complications = useGameStore((s) => s.complications);
  const { toggleMachine, useConsumable, loadSolEvent, chooseOption, continueAfterReport } = useGameStore.getState();
  const [rouletteOpen, setRouletteOpen] = useState(false);
  /** Minijuego de reparación abierto (solo para averías). */
  const [repair, setRepair] = useState<{ kind: MinigameKind; vital: VitalKey; target: RepairTarget; name: string } | null>(null);
  /** Último minijuego jugado: el siguiente nunca repite (rotación real entre los 5). */
  const lastMinigame = useRef<MinigameKind | null>(null);
  const brokenMachines = useGameStore((s) => s.brokenMachines);
  const repairTried = useGameStore((s) => s.repairTried);
  const houstonLanding = useGameStore((s) => s.houstonLanding);
  const storyScene = useGameStore((s) => s.storyScene);
  const triedToday = (target: RepairTarget) => repairTried.includes(`${sol}:${repairKey(target)}`);
  const startRepair = (target: RepairTarget) => {
    if (triedToday(target)) {
      playErrorBuzz();
      return;
    }
    playButtonClick();
    const vital = target.type === 'complication' ? target.vital : ITEMS_BY_ID[target.id].category;
    const name = target.type === 'complication' ? COMPLICATIONS[target.vital].title : ITEMS_BY_ID[target.id].shortName;
    const kind = pickMinigame(vital, lastMinigame.current);
    lastMinigame.current = kind;
    setRepair({ kind, vital, target, name });
  };

  // Envío de Houston: 1º la transmisión (personaje + carta con foto real) y 2º, desde su botón, la caja CS:GO.
  // Respaldo: si por lo que sea no hay transmisión, la caja se abre directamente.
  const fieldNote = useGameStore((s) => s.fieldNote);
  useEffect(() => {
    if (!houstonLanding || fieldNote || storyScene || rouletteOpen || repair) return;
    useGameStore.getState().dismissHoustonLanding();
    setRouletteOpen(true);
  }, [houstonLanding, fieldNote, storyScene, rouletteOpen, repair]);
  const openHoustonCrate = () => {
    useGameStore.getState().dismissHoustonLanding();
    setActiveOverlay('none');
    setRouletteOpen(true);
  };
  /**
   * Estado ÚNICO de paneles: abrir uno cierra el anterior. Un fondo clicable (o ESC) los cierra todos,
   * así nunca se quedan dos paneles montados ni bloqueados.
   */
  const [activeOverlay, setActiveOverlay] = useState<Overlay>(() => devInitialOverlay());
  const closeOverlay = () => setActiveOverlay('none');
  const openOverlay = (o: Exclude<Overlay, 'none'>) => {
    playButtonClick();
    setActiveOverlay((cur) => (cur === o ? 'none' : o));
  };
  const drawer = activeOverlay === 'systems' || activeOverlay === 'houston' ? activeOverlay : null;
  const terminalOpen = activeOverlay === 'decision';
  const houstonCrates = useGameStore((s) => s.houstonCrates);
  const houstonOrders = useGameStore((s) => s.houstonOrders);
  const houstonOrderedSol = useGameStore((s) => s.houstonOrderedSol);
  const houstonOrdersPlaced = useGameStore((s) => s.houstonOrdersPlaced);
  const nasaWeather = useGameStore((s) => s.nasaWeather);

  // ESC cierra cualquier panel abierto
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setActiveOverlay('none');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  const badgeCount = useGameStore((s) => s.badges.length);

  // Primer Sol: cargar el evento al entrar (protegido contra el doble efecto de StrictMode)
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    const s = useGameStore.getState();
    if (s.solStage === 'loading' && !s.currentEvent) {
      started.current = true;
      void loadSolEvent();
    }
  }, [loadSolEvent]);

  const available = availableItems(inventory, consumed);
  const radiation = event?.radiationLevel ?? 'moderate';

  const forecast = useMemo(
    () =>
      computeSolTick({
        vitals,
        inventory,
        consumed,
        machineStates,
        seedGrowth,
        radiationLevel: radiation,
        complications,
        brokenMachines,
        missionDifficulty,
      }),
    [vitals, inventory, consumed, machineStates, seedGrowth, radiation, complications, brokenMachines, missionDifficulty],
  );
  const optionForecasts = useMemo(() => {
    const forecasts: Record<string, Effects> = {};
    if (!event) return forecasts;
    for (const option of event.options) {
      let optionVitals = applyEffects(vitals, option.effects);
      let optionConsumed = consumed;
      if (option.requiredItemId && ITEMS_BY_ID[option.requiredItemId].kind === 'consumable' && inventory.includes(option.requiredItemId)) {
        optionConsumed = [...consumed, option.requiredItemId];
      }
      const optionTick = computeSolTick({
        vitals: optionVitals,
        inventory,
        consumed: optionConsumed,
        machineStates,
        seedGrowth,
        radiationLevel: radiation,
        complications,
        brokenMachines,
      });
      optionVitals = applyEffects(optionVitals, optionTick.deltas);
      forecasts[option.id] = Object.fromEntries(
        VITAL_ORDER.map((key) => [key, optionVitals[key] - vitals[key]]),
      ) as Effects;
    }
    return forecasts;
  }, [event, vitals, inventory, consumed, machineStates, seedGrowth, radiation, complications, brokenMachines]);

  const leftOut = STATION_ITEMS.filter((i) => !inventory.includes(i.id));
  const activeItems = inventory.filter((id) => !consumed.includes(id)).map((id) => ITEMS_BY_ID[id]);
  const repairCount = complications.length + brokenMachines.length;
  const needsRepair = repairCount > 0;
  const machinesOn = activeItems.filter((i) => i.kind === 'machine' && machineStates[i.id] && !isMachineBroken(i.id, complications, brokenMachines)).length;
  const storm = event?.radiationLevel === 'high' || event?.radiationLevel === 'extreme';
  const alarm = storm || vitals.shield < 35;
  const lowPower = vitals.power < 30;
  const nextArrival = houstonOrders.length ? Math.min(...houstonOrders.map((o) => o.arrivalSol)) - sol : null;
  const terminalHeadline =
    stage === 'loading'
      ? 'Conectando con NASA DONKI...'
      : stage === 'report'
        ? `Informe del Sol ${sol} listo`
        : `Alerta: ${event?.title ?? 'sin novedades'}`;

  return (
    <div className="relative flex h-dvh flex-col overflow-hidden bg-slate-100 text-slate-900">
      {/* ============ BARRA SUPERIOR ============ */}
      <header className="relative z-10 grid shrink-0 grid-cols-1 items-center gap-3 border-b border-slate-200 bg-white px-4 py-2 md:grid-cols-[auto_1fr]">
        <div className="flex items-center gap-4">
          <NasaLogo size={52} />
          <KidTooltip term={GLOSSARY.sol.term} text={GLOSSARY.sol.text} extra={`Hoy: Sol ${sol} de ${TOTAL_SOLS}`} align="left">
          <div className="cursor-help">
            <p className="font-display text-2xl font-black leading-none text-nasa-blue">
              SOL {sol}
              <span className="text-lg text-slate-400"> / {TOTAL_SOLS}</span>
            </p>
            <div className="mt-1.5 flex gap-1" aria-hidden>
              {Array.from({ length: TOTAL_SOLS }).map((_, i) => (
                <span key={i} className={`h-1.5 w-3 rounded-full ${i < sol - 1 ? 'bg-nasa-blue' : i === sol - 1 ? 'bg-nasa-red' : 'bg-slate-200'}`} />
              ))}
            </div>
          </div>
          </KidTooltip>
          <button
            type="button"
            onClick={() => openOverlay('periscope')}
            className="font-display relative flex items-center gap-2 rounded-lg border-2 border-nasa-blue bg-white px-4 py-2.5 text-sm font-black tracking-[0.12em] text-nasa-blue shadow-sm transition hover:bg-blue-50"
            title="Periscopio: telemetría real del Cráter Jezero e insignias de misión"
          >
            <Telescope className="h-5 w-5" strokeWidth={1.75} /> PERISCOPIO
            <span className="rounded bg-nasa-blue px-1.5 font-mono text-xs text-white">{badgeCount}/5</span>
          </button>
        </div>

        <div className="flex items-start justify-around gap-1">
          {VITAL_GROUPS.map((group) => (
            <div key={group.label} className="flex min-w-0 flex-col items-center gap-1">
              <span className="font-mono text-[10px] font-black tracking-[0.16em] text-slate-400">{group.label}</span>
              <div className="flex items-start justify-center gap-1">
                {group.keys.map((k, i) => (
                  <KidTooltip
                    key={k}
                    term={VITAL_GLOSSARY[k].term}
                    text={VITAL_GLOSSARY[k].text}
                    extra={`Ahora: ${Math.round(vitals[k])}/100 · al acabar el Sol: ${forecast.deltas[k] >= 0 ? '+' : ''}${forecast.deltas[k]}`}
                    align={i === 0 ? 'left' : 'center'}
                    className="cursor-help"
                  >
                    <GaugeMeter
                      label={VITAL_META[k].label}
                      resource={k}
                      value={vitals[k]}
                      forecast={forecast.deltas[k]}
                      nativeTitle={false}
                      className="w-[clamp(64px,min(11vw,15dvh),140px)]"
                    />
                  </KidTooltip>
                ))}
              </div>
            </div>
          ))}
          <KidTooltip term={VITAL_GLOSSARY.science.term} text={VITAL_GLOSSARY.science.text} align="right" className="cursor-help self-center">
          <div className="flex w-[clamp(64px,8vw,100px)] flex-col items-center justify-center text-center">
            <span className="flex items-center gap-1 text-sm font-bold text-slate-600">
              <ResourceIcon k="science" className="h-4 w-4 text-nasa-blue" /> Ciencia
            </span>
            <span className="font-display text-2xl font-black tabular-nums text-nasa-blue">{science}</span>
          </div>
          </KidTooltip>
        </div>
      </header>

      <main className="relative z-0 min-h-0 flex-1 overflow-hidden">
        {/* ============ ESCENA DE LA BASE ESPACIAL A PANTALLA COMPLETA ============ */}
        <div className="absolute inset-0">
          <BunkerDiorama
            vitals={vitals}
            inventory={inventory}
            consumed={consumed}
            machineStates={machineStates}
            radiationLevel={event?.radiationLevel ?? null}
            brokenMachines={brokenMachines}
            needsRepair={needsRepair}
            houstonEta={nextArrival}
            houstonArrived={houstonCrates > 0}
            onHabitatClick={() => openOverlay('systems')}
            onAntennaClick={() => openOverlay('houston')}
          />
        </div>

        {/* ============ FONDO ÚNICO: clic en el paisaje libre = cerrar el panel abierto ============ */}
        <AnimatePresence>
          {activeOverlay !== 'none' && activeOverlay !== 'periscope' && (
            <motion.div
              key="overlay-backdrop"
              className="absolute inset-0 z-30 bg-slate-950/35"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeOverlay}
              aria-hidden
            />
          )}
        </AnimatePresence>

        {/* ============ ROBOT A.R.I.A. (a la derecha, siempre por encima del fondo) ============ */}
        <AriaRobot
          className="absolute right-[2%] top-[4%] z-[35]"
          open={activeOverlay === 'aria'}
          onOpenChange={(o) => setActiveOverlay(o ? 'aria' : 'none')}
          hideBubble={activeOverlay !== 'none'}
        />

        {/* ============ AVISOS AGRUPADOS (arriba a la izquierda del cielo) ============ */}
        <div className="pointer-events-none absolute left-4 top-4 z-20 flex w-[min(21rem,38vw)] flex-col gap-2">
          {alarm && (
            <KidTooltip
              term={GLOSSARY.radiation.term}
              text={GLOSSARY.radiation.text}
              extra={nasaWeather ? `Dato real: llamarada de clase ${nasaWeather.flareClass} detectada por NASA DONKI` : undefined}
              side="right"
              className="pointer-events-auto w-full cursor-help"
            >
              <motion.p
                className="flex w-full items-center gap-2 rounded-lg border border-amber-400 bg-slate-950/85 px-3 py-2 text-sm font-bold text-amber-300 shadow-lg"
                animate={{ opacity: [1, 0.6, 1] }}
                transition={{ duration: 1.2, repeat: Infinity }}
              >
                <Radiation className="h-5 w-5 shrink-0" strokeWidth={2} />
                <span className="font-mono tracking-wider">ALERTA RADIACIÓN</span>
                {nasaWeather && <span className="ml-auto font-mono text-xs text-amber-200">DONKI {nasaWeather.flareClass}</span>}
              </motion.p>
            </KidTooltip>
          )}
          {lowPower && (
            <p className="flex items-center gap-2 rounded-lg border border-sky-400 bg-slate-950/85 px-3 py-2 text-sm font-bold text-sky-300 shadow-lg">
              <BatteryLow className="h-5 w-5 shrink-0" strokeWidth={2} />
              <span className="font-mono tracking-wider">MODO AHORRO</span>
              <span className="ml-auto text-xs text-sky-200">Energía baja</span>
            </p>
          )}
          {repairCount > 0 && (
            <button
              type="button"
              onClick={() => openOverlay('systems')}
              className="pointer-events-auto flex items-center gap-2 rounded-lg border border-red-400 bg-slate-950/85 px-3 py-2 text-left text-sm font-bold text-red-300 shadow-lg transition hover:bg-slate-900"
            >
              <Wrench className="h-5 w-5 shrink-0" strokeWidth={2} />
              <span>
                {repairCount} {repairCount === 1 ? 'avería' : 'averías'} — Toca la base para reparar
              </span>
            </button>
          )}
          {(houstonCrates > 0 || nextArrival !== null) && (
            <button
              type="button"
              onClick={() => openOverlay('houston')}
              className="pointer-events-auto flex items-center gap-2 rounded-lg border border-sky-400 bg-slate-950/85 px-3 py-2 text-left text-sm font-bold text-sky-200 shadow-lg transition hover:bg-slate-900"
            >
              <Package className="h-5 w-5 shrink-0" strokeWidth={2} />
              <span>
                {houstonCrates > 0
                  ? 'Contenedor de Houston sin abrir'
                  : `Envío de Houston: llega en ${nextArrival} ${nextArrival === 1 ? 'Sol' : 'Soles'}`}
              </span>
            </button>
          )}
        </div>

        {/* ============ LEYENDA INTERACTIVA (abajo a la izquierda) ============ */}
        <nav
          className="absolute bottom-[clamp(1rem,5%,2.5rem)] left-[clamp(1rem,2.5%,2.5rem)] z-20 flex w-[min(27rem,44vw)] flex-col gap-2 rounded-2xl border border-white/20 bg-slate-950/75 px-4 py-3.5 shadow-2xl backdrop-blur-sm"
          aria-label="Qué puedes hacer en la base"
        >
          <p className="px-1.5 pb-0.5 font-mono text-xs font-bold tracking-[0.2em] text-sky-300">TOCA LA ESCENA</p>
          <LegendButton
            icon={Wrench}
            label="Base: Sistemas/Averías"
            status={repairCount > 0 ? `${repairCount} ${repairCount === 1 ? 'avería' : 'averías'}` : 'Todo OK'}
            tone={repairCount > 0 ? 'alert' : 'ok'}
            onClick={() => openOverlay('systems')}
          />
          <LegendButton
            icon={SatelliteDish}
            label="Antena: Enlace Houston"
            status={
              houstonCrates > 0
                ? 'Envío recibido'
                : nextArrival !== null
                  ? `En camino (${nextArrival} ${nextArrival === 1 ? 'Sol' : 'Soles'})`
                  : houstonOrdersPlaced >= HOUSTON_MAX_ORDERS
                    ? 'Sin pedidos'
                    : houstonOrderedSol === sol
                      ? 'Transmitido hoy'
                      : 'Disponible'
            }
            tone={houstonCrates > 0 ? 'alert' : 'info'}
            onClick={() => openOverlay('houston')}
          />
          <LegendButton icon={Bot} label="Robot A.R.I.A." status="Consultar IA" tone="info" onClick={() => openOverlay('aria')} />
        </nav>

        {/* ============ CAJÓN LATERAL: ENLACE HOUSTON ============ */}
        <AnimatePresence>
          {drawer === 'houston' && (
            <motion.div
              key="drawer-houston"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="pointer-events-none absolute inset-0 z-40 grid place-items-center p-4"
            >
            <motion.aside
              initial={{ opacity: 0, scale: 0.94, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ type: 'spring', stiffness: 260, damping: 28 }}
              className="thin-scroll pointer-events-auto flex max-h-full w-[min(30rem,92vw)] flex-col gap-3 overflow-y-auto rounded-2xl border-2 border-slate-300 bg-white/95 p-4 shadow-2xl backdrop-blur-md"
              role="dialog"
              aria-label="Enlace Houston"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="font-mono text-xs font-bold tracking-[0.25em] text-nasa-blue">ENLACE HOUSTON</p>
                <button
                  type="button"
                  onClick={closeOverlay}
                  className="flex items-center gap-1 rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm font-bold text-slate-600 transition hover:border-nasa-blue hover:text-nasa-blue"
                >
                  <ChevronLeft className="h-4 w-4" /> Cerrar
                </button>
              </div>
              <DeepSpaceLink onOpenCrate={() => setRouletteOpen(true)} />
            </motion.aside>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ============ PANEL SISTEMAS E INVENTARIO: averías arriba, inventario en cuadrícula debajo ============ */}
        <AnimatePresence>
          {drawer === 'systems' && (
            <motion.section
              key="systems-panel"
              initial={{ opacity: 0, y: 24, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 260, damping: 28 }}
              className="absolute left-1/2 top-[3%] z-40 flex max-h-[min(82dvh,94%)] w-[min(96%,76rem)] -translate-x-1/2 flex-col overflow-hidden rounded-2xl border-2 border-slate-300 bg-white shadow-2xl"
              role="dialog"
              aria-label="Sistemas e Inventario"
            >
              <div className="flex shrink-0 items-center gap-3 border-b border-slate-200 bg-slate-50 px-5 py-3">
                <Wrench className="h-5 w-5 text-nasa-blue" strokeWidth={1.75} />
                <p className="font-mono text-sm font-bold tracking-[0.2em] text-nasa-blue">SISTEMAS E INVENTARIO // ARES-IV</p>
                <button
                  type="button"
                  onClick={closeOverlay}
                  className="ml-auto flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-bold text-slate-600 transition hover:border-nasa-blue hover:text-nasa-blue"
                >
                  <X className="h-4 w-4" /> Cerrar
                </button>
              </div>

              <div className="thin-scroll flex-1 overflow-y-auto p-3 sm:p-4">
                {/* ---- Bloque superior: estado del hábitat y averías activas (franja compacta) ---- */}
                <section className={`rounded-xl border-2 p-3 ${repairCount ? 'border-red-200 bg-red-50/70' : 'border-emerald-300 bg-emerald-50'}`}>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <h2 className={`flex items-center gap-2 text-base font-bold ${repairCount ? 'text-nasa-red' : 'text-emerald-800'}`}>
                      {repairCount ? <TriangleExclamationPoint className="h-5 w-5" strokeWidth={1.75} /> : <CircleCheck className="h-5 w-5" strokeWidth={1.75} />}
                      {repairCount ? `Averías activas (${repairCount})` : 'Todos los sistemas funcionan'}
                    </h2>
                    <span className="text-sm text-slate-600">
                      {machinesOn} {machinesOn === 1 ? 'máquina encendida' : 'máquinas encendidas'}
                      {repairCount > 0 && ` · cada reparación es un minijuego (si falla: −${REPAIR_FAIL_POWER} Energía, reintento mañana)`}
                    </span>
                  </div>
                  {repairCount > 0 && (
                    <div className="mt-2.5 flex flex-wrap gap-2">
                      {complications.map((c) => {
                        const target: RepairTarget = { type: 'complication', vital: c };
                        return (
                          <article key={c} className="flex min-w-0 flex-1 basis-[18rem] items-center gap-3 rounded-lg border border-red-200 bg-white p-2.5">
                            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-red-100 text-nasa-red">
                              <Wrench className="h-5 w-5" strokeWidth={1.75} />
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-bold text-slate-900">{COMPLICATIONS[c].title}</p>
                              <p className="flex items-center gap-1 text-xs text-slate-600">
                                Fase 1 · <Delta k={c} v={COMPLICATIONS[c].dailyPenalty} /> por Sol
                              </p>
                            </div>
                            <RepairButton tried={triedToday(target)} onClick={() => startRepair(target)} />
                          </article>
                        );
                      })}
                      {brokenMachines.map((id) => {
                        const target: RepairTarget = { type: 'machine', id };
                        return (
                          <article key={id} className="flex min-w-0 flex-1 basis-[18rem] items-center gap-3 rounded-lg border border-red-200 bg-white p-2.5">
                            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-red-100 text-nasa-red">
                              <ItemIcon id={id} className="h-5 w-5" />
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-bold text-slate-900">{ITEMS_BY_ID[id].shortName}</p>
                              <p className="text-xs text-slate-600">Avería puntual · apagada</p>
                            </div>
                            <RepairButton tried={triedToday(target)} onClick={() => startRepair(target)} />
                          </article>
                        );
                      })}
                    </div>
                  )}
                </section>

                {/* ---- Bloque inferior: inventario y máquinas en cuadrícula compacta ---- */}
                <section className="mt-3">
                  <h2 className="flex items-center gap-2 text-base font-bold text-slate-900">
                    <Package className="h-5 w-5 text-nasa-blue" strokeWidth={1.75} /> Máquinas y consumibles
                    <span className="rounded-md bg-nasa-blue px-2 py-0.5 font-mono text-xs text-white">{activeItems.length}</span>
                  </h2>
                  {activeItems.length === 0 ? (
                    <p className="mt-2 rounded-xl border border-slate-200 p-4 text-base text-slate-500">No queda ningún objeto en la base espacial.</p>
                  ) : (
                    <div className="mt-2 grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                      {activeItems.map((item) => {
                        const on = Boolean(machineStates[item.id]);
                        const broken = isMachineBroken(item.id, complications, brokenMachines);
                        const seedNote = item.id === 'osdr_seeds' && on ? ` · Crecimiento ${seedGrowth}/2` : '';
                        return (
                          <article
                            key={item.id}
                            className={`flex min-w-0 flex-col gap-2 rounded-lg border-2 p-2.5 ${broken ? 'border-red-200 bg-red-50/60' : 'border-slate-200 bg-white'}`}
                            title={`${item.name}\n${item.description}${seedNote}`}
                          >
                            <div className="flex items-center gap-2">
                              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md border border-slate-200 bg-slate-50 text-nasa-blue">
                                <ItemIcon id={item.id} className="h-5 w-5" />
                              </span>
                              <p className="line-clamp-2 min-w-0 text-sm font-semibold leading-tight text-slate-900">{item.shortName}</p>
                            </div>
                            <div className="min-w-0 text-xs">
                              <MainEffect item={item} />
                            </div>
                            <div className="mt-auto flex items-center justify-center">
                              {item.kind === 'machine' && broken && <span className="w-full rounded-md bg-red-100 py-1 text-center text-xs font-bold text-nasa-red">Averiada</span>}
                              {item.kind === 'machine' && !broken && <Toggle on={on} onClick={() => toggleMachine(item.id)} label={`Encender o apagar ${item.name}`} />}
                              {item.kind === 'consumable' && (
                                <button
                                  type="button"
                                  disabled={stage !== 'event'}
                                  onClick={() => useConsumable(item.id)}
                                  className="w-full rounded-md bg-nasa-red py-1.5 text-sm font-black text-white transition hover:brightness-110 disabled:bg-slate-300 disabled:text-slate-500"
                                >
                                  USAR
                                </button>
                              )}
                              {(item.kind === 'passive' || item.kind === 'tool') && (
                                <span className="w-full rounded-md bg-slate-100 py-1 text-center text-xs font-bold text-slate-600">{item.kind === 'tool' ? 'Herramienta' : 'Siempre activo'}</span>
                              )}
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  )}
                </section>

                {/* ---- Desglose a todo el ancho ---- */}
                <details className="group mt-3 rounded-2xl border-2 border-slate-200 bg-white shadow-sm">
                  <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-base font-bold text-slate-700">
                    <span className="flex items-center gap-2">
                      <ChartColumn className="h-5 w-5 text-nasa-blue" strokeWidth={1.75} /> Ver desglose y objetos perdidos
                    </span>
                    <ChevronDown size={20} className="transition group-open:rotate-180" />
                  </summary>
                  <div className="thin-scroll max-h-72 space-y-4 overflow-y-auto scroll-smooth px-4 pb-4">
                    <ul className="grid gap-x-6 gap-y-1.5 text-sm text-slate-700 md:grid-cols-2">
                      {forecast.breakdown.map((b, i) => (
                        <li key={i} className="flex justify-between gap-3 border-b border-slate-100 py-1">
                          <span className="min-w-0 truncate">{b.source}</span>
                          <span className="flex shrink-0 gap-2">
                            {EFFECT_ORDER.filter((k) => b.effects[k]).map((k) => (
                              <Delta key={k} k={k} v={b.effects[k]!} />
                            ))}
                          </span>
                        </li>
                      ))}
                    </ul>
                    {leftOut.length > 0 && (
                      <div className="text-sm text-slate-500">
                        <b className="text-slate-700">No conseguidos ({leftOut.length}):</b>
                        <div className="mt-1 flex flex-wrap gap-1.5">
                          {leftOut.map((i) => (
                            <span key={i.id} title={i.name} className="grid h-8 w-8 place-items-center rounded-md border border-slate-200 bg-slate-50 text-slate-400">
                              <ItemIcon id={i.id} className="h-4 w-4" />
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </details>
              </div>
            </motion.section>
          )}
        </AnimatePresence>

        {/* ============ BOTÓN "RESOLVER MISIÓN SOL N" (abajo a la derecha) ============ */}
        <AnimatePresence>
          {!terminalOpen && (
            <motion.button
              key="mission-button"
              type="button"
              disabled={stage === 'loading'}
              onClick={() => openOverlay('decision')}
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 30, opacity: 0 }}
              whileHover={stage === 'loading' ? {} : { scale: 1.03 }}
              whileTap={stage === 'loading' ? {} : { scale: 0.97 }}
              className="absolute bottom-[4%] right-[3%] z-30 max-w-[min(30rem,calc(100%-2rem))] text-left disabled:cursor-wait"
            >
              <motion.span
                className={`flex items-center gap-3 rounded-2xl border-2 px-5 py-4 shadow-2xl ${stage === 'loading' ? 'border-slate-500 bg-slate-800 text-slate-300' : 'border-white bg-nasa-red text-white'}`}
                animate={stage === 'loading' ? {} : { boxShadow: ['0 0 0 0 rgba(252,61,33,0.6)', '0 0 0 14px rgba(252,61,33,0)', '0 0 0 0 rgba(252,61,33,0)'] }}
                transition={stage === 'loading' ? {} : { duration: 1.8, repeat: Infinity }}
              >
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-white/15">
                  {stage === 'loading' ? <Satellite className="h-7 w-7 animate-pulse" strokeWidth={1.75} /> : <Monitor className="h-7 w-7" strokeWidth={1.75} />}
                </span>
                <span className="min-w-0">
                  <span className="font-display flex items-center gap-2 text-lg font-black tracking-wider">
                    {stage === 'loading' ? 'Recibiendo telemetría...' : stage === 'report' ? `Informe del Sol ${sol} listo` : `Resolver Misión Sol ${sol}`}
                    {stage !== 'loading' && <ArrowRight className="h-5 w-5 shrink-0" />}
                  </span>
                  <span className={`mt-1 inline-block max-w-full truncate rounded-md px-2 py-0.5 text-sm font-bold ${stage === 'loading' ? 'bg-slate-700' : 'bg-white/20'}`}>
                    {terminalHeadline}
                  </span>
                </span>
              </motion.span>
            </motion.button>
          )}
        </AnimatePresence>

        {/* ============ VENTANA DEL ORDENADOR (se despliega hacia arriba) ============ */}
        <AnimatePresence>
          {terminalOpen && (
            <>
              <motion.section
                key="terminal"
                initial={{ y: '60%', opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: '60%', opacity: 0 }}
                transition={{ type: 'spring', stiffness: 220, damping: 28 }}
                className="absolute bottom-[clamp(0.5rem,2%,1rem)] left-1/2 z-40 flex max-h-[min(85dvh,calc(100%-1rem))] w-[min(64rem,calc(100%-1rem))] -translate-x-1/2 flex-col overflow-hidden rounded-2xl border-2 border-slate-300 bg-white shadow-2xl"
                role="dialog"
                aria-label={`Terminal de misión, Sol ${sol}`}
              >
                <div className="flex shrink-0 items-center gap-3 border-b border-slate-200 bg-slate-50 px-4 py-[clamp(0.25rem,1dvh,0.625rem)]">
                  <Monitor className="h-5 w-5 text-nasa-blue" strokeWidth={1.75} />
                  <p className="font-mono text-sm font-bold tracking-[0.2em] text-nasa-blue">TERMINAL DE MISIÓN // SOL {sol} / {TOTAL_SOLS}</p>
                  <button
                    type="button"
                    onClick={() => {
                      playButtonClick();
                      closeOverlay();
                    }}
                    className="ml-auto flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-bold text-slate-600 transition hover:border-nasa-blue hover:text-nasa-blue"
                    title="Minimiza el ordenador para mirar a la tripulación, consultar a A.R.I.A. o encender máquinas"
                  >
                    <Minus className="h-4 w-4" /> Minimizar ordenador
                  </button>
                </div>
                <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden p-[clamp(0.625rem,2dvh,1.25rem)]">
                  <AnimatePresence mode="wait">
                    {stage === 'loading' && <LoadingTelemetry key={`loading-${sol}`} sol={sol} />}

                    {stage === 'event' && event && (
                      <motion.div
                        key={`event-${sol}`}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="thin-scroll grid min-h-0 flex-1 grid-cols-1 gap-[clamp(0.75rem,2dvh,1.25rem)] overflow-y-auto md:grid-cols-2 md:overflow-hidden"
                      >
                        {/* El problema */}
                        <div className="thin-scroll flex min-h-0 flex-col gap-[clamp(0.4rem,1.4dvh,0.75rem)] md:overflow-y-auto [&>*]:shrink-0">
                          <div>
                            <p className="flex items-center gap-2 text-base font-semibold text-slate-500">
                              <span className={`h-2.5 w-2.5 rounded-full ${RADIATION_DOT[radiation]}`} /> Radiación {RADIATION_LABEL[radiation].toLowerCase()}
                              {event.source === 'gemini' && (
                                <span className="flex items-center gap-1">
                                  · <Sparkles className="h-3.5 w-3.5" strokeWidth={1.75} /> Gemini
                                </span>
                              )}
                            </p>
                            <h2 className="mt-0.5 text-[clamp(1.15rem,3.6dvh,1.875rem)] font-bold leading-tight text-slate-900">{event.title}</h2>
                          </div>
                          <p className="line-clamp-4 text-[clamp(0.95rem,2.5dvh,1.125rem)] leading-snug text-slate-700" title={`${event.ariaVoiceAlert}\n\n${event.description}`}>
                            {event.description}
                          </p>
                          <div className="rounded-xl bg-amber-50 px-3 py-[clamp(0.4rem,1.3dvh,0.75rem)]" title={event.nasaSource}>
                            <p className="text-[clamp(0.85rem,2.2dvh,1rem)] leading-snug text-amber-950">
                              <FlaskConical className="mr-1 inline h-4 w-4 align-[-2px]" strokeWidth={1.75} />
                              <b>Dato Real NASA ({event.radiationLevel === 'high' || event.radiationLevel === 'extreme' ? 'DONKI' : 'DONKI / OSDR'}) ·</b> {event.nasaFact}
                            </p>
                          </div>
                        </div>

                        {/* Las decisiones */}
                        <div className="thin-scroll flex min-h-0 flex-col gap-[clamp(0.4rem,1.2dvh,0.625rem)] overflow-x-hidden p-0.5 md:overflow-y-auto [&>*]:shrink-0">
                          {event.options.map((opt) => (
                            <OptionButton
                              key={opt.id}
                              option={opt}
                              inventory={available}
                              loaded={inventory}
                              onChoose={() => {
                                closeOverlay();
                                chooseOption(opt.id);
                              }}
                              projectedEffects={optionForecasts[opt.id]}
                            />
                          ))}
                        </div>
                      </motion.div>
                    )}

                    {stage === 'report' && report && (
                      <motion.div
                        key={`report-${sol}`}
                        initial={{ opacity: 0, scale: 0.97 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0 }}
                        className="thin-scroll flex min-h-0 flex-1 flex-col items-center justify-start gap-[clamp(0.5rem,1.8dvh,1rem)] overflow-y-auto px-1 pb-1 text-center [&>*]:shrink-0"
                      >
                        <div className="w-full max-w-3xl rounded-xl border border-slate-300 bg-slate-50 p-4 text-left shadow-sm">
                          <p className="font-mono text-xs font-bold tracking-[0.2em] text-nasa-blue">INFORME DE TELEMETRÍA // SOL {sol}</p>
                          <h2 className="mt-1 text-xl font-black text-slate-900">{report.optionLabel}</h2>
                          <p className="mt-1 text-base italic leading-relaxed text-slate-600">“{report.ariaReaction}”</p>
                        </div>
                        {report.harvested && (
                          <p className="w-full max-w-3xl rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-left text-sm font-bold text-emerald-700">
                            <Sprout className="h-5 w-5" strokeWidth={1.75} /> ¡Cosecha de lechuga roja! +20 Comida
                          </p>
                        )}
                        <div className="w-full max-w-3xl rounded-xl border-2 border-slate-200 bg-white p-4 text-left shadow-sm">
                          {report.breakdown[0] && (
                            <div className="rounded-lg border border-blue-200 bg-blue-50/60 p-3">
                              <p className="font-mono text-xs font-black tracking-[0.16em] text-nasa-blue">{report.breakdown[0].source}</p>
                              <div className="mt-2 flex justify-end">
                                <EffectNumbers effects={report.breakdown[0].effects} />
                              </div>
                            </div>
                          )}
                          {report.breakdown.length > 1 && (
                            <>
                              <p className="mt-4 border-t border-slate-200 pt-4 font-mono text-xs font-black tracking-[0.16em] text-slate-500">OTROS EFECTOS DEL SOL</p>
                              {report.breakdown.slice(1).map((entry, index) => (
                                <div key={`${entry.source}-${index}`} className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                                  <p className="text-sm font-semibold text-slate-700">{entry.source}</p>
                                  <div className="ml-auto">
                                    <EffectNumbers effects={entry.effects} />
                                  </div>
                                </div>
                              ))}
                            </>
                          )}
                        </div>
                        <motion.button
                          type="button"
                          whileHover={{ scale: 1.04 }}
                          whileTap={{ scale: 0.97 }}
                          onClick={() => {
                            playButtonClick();
                            closeOverlay();
                            continueAfterReport();
                          }}
                          className={`font-display flex items-center gap-2 rounded-xl px-6 py-3 text-base font-black tracking-wider text-white ${
                            pendingOutcome === 'evacuation' ? 'bg-amber-500' : pendingOutcome === 'victory' ? 'bg-nasa-red' : 'bg-nasa-blue'
                          }`}
                        >
                          {pendingOutcome === 'victory' ? 'Finalizar misión final' : pendingOutcome ? 'Finalizar misión (evacuación)' : 'CONTINUAR AL SIGUIENTE SOL'} <ArrowRight size={18} />
                        </motion.button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.section>
            </>
          )}
        </AnimatePresence>
      </main>

      <SalvageRouletteModal
        open={rouletteOpen}
        initialKind="houston"
        autoSpin
        onClose={() => setRouletteOpen(false)}
      />
      <EmergencyMinigameModal
        kind={repair?.kind ?? null}
        stakes={
          repair
            ? `Reparando: ${repair.name}. Si lo consigues, vuelve a funcionar. Si se acaba el tiempo, sigue averiada este Sol (−${REPAIR_FAIL_POWER} Energía).`
            : ''
        }
        onResult={(success) => {
          const r = repair;
          setRepair(null);
          if (r) useGameStore.getState().repairResult(r.target, success);
        }}
        onSwitch={() =>
          setRepair((r) => {
            if (!r) return r;
            const kind = pickMinigame(r.vital, r.kind, [r.kind]);
            lastMinigame.current = kind;
            return { ...r, kind };
          })
        }
      />
      <PeriscopeModal open={activeOverlay === 'periscope'} onClose={closeOverlay} />
      <ArrivalTransmission visible={!storyScene && !rouletteOpen && !repair} onOpenCrate={openHoustonCrate} />
      <MissionNoticeToast />
    </div>
  );
}
