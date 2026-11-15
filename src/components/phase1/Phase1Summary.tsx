import { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Award, CircleCheck, ClipboardList, DoorClosed, Gift, PackageOpen, Target, TriangleExclamationPoint, Wrench } from 'lucide-react';
import type { Effects, ItemId, StationItem, VitalKey } from '../../types/game';
import { CATEGORY_META, ITEMS_BY_ID, RARITY_META } from '../../data/stationItems';
import { COMPLICATIONS } from '../../data/triviaQuestions';
import { VITAL_ORDER, categoryStats, projectedStartVitals, useGameStore } from '../../store/useGameStore';
import { playButtonClick, playDoorSeal } from '../../utils/soundEffects';
import SalvageRouletteModal from '../SalvageRouletteModal';
import { ItemIcon, ResourceIcon, type ResourceKey } from '../icons';
import { Phase1Header, SYSTEM_META } from './Phase1Shared';
import { devOpenCapsule } from '../../utils/devQa';
import { tr } from '../../i18n/core';
import CadetFramedAvatar from '../CadetFramedAvatar';
import { cadetDisplayName, cadetRoleLabel } from '../../data/cadetRoles';

/** Rango de los cadetes según cuántos aciertos lograron y con qué precisión. */
function cadetRank(correct: number, accuracy: number): string {
  if (correct >= 8 && accuracy >= 0.75) return tr('Comandantes de Esclusa', 'Airlock Commanders');
  if (correct >= 5) return tr('Ingenieros de Carga', 'Cargo Engineers');
  if (correct >= 2) return tr('Cadetes Técnicos', 'Tech Cadets');
  return tr('Cadetes en Prácticas', 'Trainee Cadets');
}

/** Efecto principal de un objeto en la base espacial, en forma de cifras con icono. */
function itemEffect(item: StationItem): { deltas: [ResourceKey, number][]; note?: string } {
  if (item.kind === 'consumable' && item.useEffect) {
    return { deltas: (Object.entries(item.useEffect) as [keyof Effects, number][]).slice(0, 2), note: tr('al usar', 'when used') };
  }
  if (item.kind === 'tool') return { deltas: [], note: 'Herramienta: abre opciones' };
  if (item.radiationReduction) return { deltas: [], note: tr(`−${item.radiationReduction} radiación por Sol`, `−${item.radiationReduction} radiation per Sol`) };
  if (item.id === 'lead_blanket') return { deltas: [], note: 'Radiación ÷2' };
  const deltas: [ResourceKey, number][] = [];
  if (item.powerPerSol) deltas.push(['power', item.powerPerSol]);
  for (const [k, v] of Object.entries(item.effectPerSol ?? {}) as [keyof Effects, number][]) {
    if (k !== 'power' && v) deltas.push([k, v]);
  }
  return { deltas: deltas.slice(0, 2), note: item.kind === 'machine' ? tr('por Sol (ON)', 'per Sol (ON)') : tr('por Sol', 'per Sol') };
}

function SupplyCard({ id, index }: { id: ItemId; index: number }) {
  const item = ITEMS_BY_ID[id];
  if (!item) return null;
  const rarity = RARITY_META[item.rarity] ?? RARITY_META.common;
  const effect = itemEffect(item);
  return (
    <motion.article
      initial={{ opacity: 0, y: 12, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: 0.05 * index }}
      className={`flex min-w-0 flex-col gap-1.5 rounded-lg border-2 bg-white p-2.5 shadow-sm big:gap-2 big:p-4 ${rarity.ring}`}
      title={`${item.name} · ${rarity.label}\n${item.description}`}
    >
      <div className="flex items-center gap-2">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md border border-slate-200 bg-slate-50 text-nasa-blue big:h-12 big:w-12">
          <ItemIcon id={id} className="h-5 w-5 big:h-7 big:w-7" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-bold leading-tight text-slate-900 big:text-base">{item.shortName}</p>
          <span className={`mt-0.5 inline-block rounded border px-1.5 text-xs font-bold ${rarity.badge}`}>{rarity.label}</span>
        </div>
      </div>
      <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-600 big:text-sm">
        {effect.deltas.map(([k, v]) => (
          <span key={k} className={`inline-flex items-center gap-0.5 font-mono font-semibold ${v > 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
            {v > 0 ? '+' : '−'}
            {Math.abs(v)}
            <ResourceIcon k={k} className="h-3.5 w-3.5" />
          </span>
        ))}
        {effect.note && <span>{effect.note}</span>}
      </p>
    </motion.article>
  );
}

/** Resumen de la trivia: Manifiesto de Carga y Diagnóstico de Esclusa (antes de sellar la base espacial). */
export default function Phase1Summary() {
  // Valores por defecto seguros: esta pantalla nunca debe quedarse en blanco
  const answers = useGameStore((s) => s.quizAnswers) ?? [];
  const rawInventory = useGameStore((s) => s.bunkerInventory);
  const rawComplications = useGameStore((s) => s.complications);
  const freeSpins = useGameStore((s) => s.freeSpins) ?? 0;
  const supplyBonus = useGameStore((s) => s.supplyBonus) ?? {};
  const missionDifficulty = useGameStore((s) => s.missionDifficulty);
  const inventory = (rawInventory ?? []).filter((id) => Boolean(ITEMS_BY_ID[id]));
  const complications = (rawComplications ?? []).filter((c) => Boolean(COMPLICATIONS[c]));
  const sealBunker = useGameStore((s) => s.sealBunker);
  const cadetPhoto = useGameStore((s) => s.cadetPhoto);
  const cadetName = useGameStore((s) => s.cadetName);
  const cadetRole = useGameStore((s) => s.cadetRole);
  const hasCadet = Boolean(cadetPhoto || cadetName);

  const [rouletteOpen, setRouletteOpen] = useState(devOpenCapsule);
  const [sealing, setSealing] = useState(false);
  // Sin avance automático: los niños leen con calma y entran a la base cuando pulsan el botón
  const sealedRef = useRef(false);

  const stats = categoryStats(answers);
  const correct = answers.filter((a) => a.correct).length;
  const accuracy = answers.length ? correct / answers.length : 0;
  const startVitals = projectedStartVitals(supplyBonus, complications, missionDifficulty);
  const vitalsAvg = VITAL_ORDER.reduce((sum, k) => sum + (startVitals?.[k] ?? 0), 0) / VITAL_ORDER.length;
  // Preparación: 60 % equipo conseguido (10 objetos = 100 %) + 40 % estado inicial de las barras
  const readiness = Math.round(0.6 * Math.min(100, (inventory.length / 10) * 100) + 0.4 * vitalsAvg);
  const readinessColor = readiness >= 65 ? 'bg-emerald-500' : readiness >= 40 ? 'bg-amber-400' : 'bg-nasa-red';
  const bonusKeys = VITAL_ORDER.filter((k) => supplyBonus[k]);

  const seal = () => {
    if (sealedRef.current) return;
    sealedRef.current = true;
    setSealing(true);
    playDoorSeal();
    setTimeout(() => sealBunker(), 1300);
  };

  return (
    <div className="relative flex min-h-dvh flex-col bg-slate-100 lg:h-dvh lg:overflow-hidden">
      <div className="bg-grid pointer-events-none absolute inset-0" />
      <Phase1Header
        step={3}
        title={tr('Manifiesto de Carga', 'Cargo Manifest')}
        subtitle={tr(
          `${correct} aciertos de ${answers.length} preguntas · ${inventory.length} suministros a la base espacial`,
          `${correct} right out of ${answers.length} questions · ${inventory.length} supplies to the space base`,
        )}
      />

      <main className="thin-scroll relative z-10 flex min-h-0 w-full flex-1 flex-col overflow-y-auto py-3 sm:py-4 big:py-8">
        <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col items-center justify-center gap-3 px-4 sm:px-6 lg:gap-4 xl:max-w-6xl 2xl:max-w-7xl big:gap-6 big:px-8 min-[1800px]:max-w-[min(94vw,104rem)]! [&>*]:w-full">
        {/* ---- Cabecera de rendimiento ---- */}
        <section className="grid gap-3 sm:grid-cols-3">
          <div className="hw-panel flex items-center gap-3 p-3 big:gap-4 big:p-6">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-slate-100 text-nasa-blue big:h-16 big:w-16">
              <Target className="h-6 w-6 big:h-9 big:w-9" strokeWidth={1.75} />
            </span>
            <div className="min-w-0">
              <p className="font-mono text-xs font-bold tracking-[0.18em] text-slate-500 big:text-sm">{tr('ACIERTOS', 'RIGHT ANSWERS')}</p>
              <p className="font-display text-2xl font-black leading-none text-nasa-blue big:text-4xl">
                {correct}
                <span className="text-base text-slate-400 big:text-xl"> / {answers.length}</span>
              </p>
              <p className="text-xs text-slate-500 big:text-sm">{tr('Precisión', 'Accuracy')} {Math.round(accuracy * 100)} %</p>
            </div>
          </div>
          <div className="hw-panel flex flex-col justify-center gap-1.5 p-3 big:gap-3 big:p-6">
            <div className="flex items-center justify-between">
              <p className="font-mono text-xs font-bold tracking-[0.18em] text-slate-500 big:text-sm">{tr('PREPARACIÓN DE LA BASE ESPACIAL', 'SPACE BASE READINESS')}</p>
              <span className="font-display text-xl font-black text-slate-900 big:text-4xl">{readiness} %</span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-slate-200 big:h-3.5">
              <motion.div className={`h-full ${readinessColor}`} initial={{ width: 0 }} animate={{ width: `${readiness}%` }} transition={{ duration: 0.9, ease: 'easeOut' }} />
            </div>
            <p className="text-xs text-slate-500 big:text-sm">{tr('Equipo conseguido y estado inicial de las barras.', 'Equipment obtained and starting bar levels.')}</p>
          </div>
          <div className="hw-panel flex items-center gap-3 p-3 big:gap-4 big:p-6">
            {hasCadet ? (
              <CadetFramedAvatar photo={cadetPhoto} name={cadetName} role={cadetRole} size="sm" plate={false} />
            ) : (
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-nasa-blue text-white big:h-16 big:w-16">
                <Award className="h-6 w-6 big:h-9 big:w-9" strokeWidth={1.75} />
              </span>
            )}
            <div className="min-w-0">
              <p className="font-mono text-xs font-bold tracking-[0.18em] text-slate-500 big:text-sm">{tr('RANGO DE LA TRIPULACIÓN', 'CREW RANK')}</p>
              <p className="text-lg font-black leading-tight text-slate-900 big:text-2xl">{cadetRank(correct, accuracy)}</p>
              {hasCadet && (
                <p className="truncate text-xs text-slate-600 big:text-sm" title={tr('Responsable de la carga asegurada', 'In charge of the secured cargo')}>
                  {tr('Responsable de carga', 'Cargo officer')}: <span className="font-mono font-bold text-nasa-blue">{cadetDisplayName(cadetName)}</span> · {cadetRoleLabel(cadetRole)}
                </p>
              )}
            </div>
          </div>
        </section>

        {/* Diagnóstico por rama (compacto) */}
        <section className="flex flex-wrap justify-center gap-2" aria-label={tr('Aciertos por sistema', 'Right answers per system')}>
          {VITAL_ORDER.map((k: VitalKey) => {
            const st = stats?.[k] ?? { correct: 0, answered: 0 };
            const failed = complications.includes(k);
            const meta = SYSTEM_META[k];
            if (!meta) return null;
            const Icon = meta.Icon;
            return (
              <span
                key={k}
                className={`flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-semibold big:text-sm ${failed ? 'border-nasa-red bg-red-50 text-nasa-red' : 'border-slate-300 bg-white text-slate-700'}`}
              >
                <Icon className="h-4 w-4 big:h-5 big:w-5" strokeWidth={1.75} />
                <span className="font-mono">{meta.code}</span>
                {CATEGORY_META[k]?.label ?? k}
                <span className="font-mono">
                  {st.correct}/{st.answered}
                </span>
              </span>
            );
          })}
        </section>

        {/* ---- Grid de suministros asegurados ---- */}
        <section className="hw-panel p-3 sm:p-4 big:p-6">
          <h2 className="flex items-center gap-2 text-base font-bold text-slate-900 big:text-xl">
            <ClipboardList className="h-5 w-5 text-nasa-blue" strokeWidth={1.75} /> {tr('Suministros asegurados', 'Secured supplies')}
            <span className="rounded-md bg-nasa-blue px-2 py-0.5 font-mono text-xs text-white">{inventory.length}</span>
          </h2>
          {inventory.length === 0 ? (
            <p className="mt-2 rounded-lg border border-dashed border-slate-300 p-4 text-sm text-slate-500">
              {tr('No ha entrado ningún suministro. Tendréis que aguantar con ingenio... ¡y con la ayuda de Houston!', 'No supplies made it in. You will have to hold out with your wits... and with help from Houston!')}
            </p>
          ) : (
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 big:mt-4 big:gap-4">
              {inventory.map((id, i) => (
                <SupplyCard key={id} id={id} index={i} />
              ))}
            </div>
          )}
          {bonusKeys.length > 0 && (
            <p className="mt-3 flex flex-wrap items-center gap-1.5 text-sm font-bold text-nasa-blue">
              <Gift className="h-4 w-4" strokeWidth={1.75} /> {tr('Bonus de la Cápsula al empezar:', 'Capsule bonus at the start:')}
              {bonusKeys.map((k) => (
                <span key={k} className="inline-flex items-center gap-0.5 rounded bg-blue-50 px-1.5 font-mono">
                  +{supplyBonus[k] ?? 0} <ResourceIcon k={k} className="h-3.5 w-3.5" />
                </span>
              ))}
            </p>
          )}
        </section>

        {/* ---- Franja de diagnóstico de esclusa (averías iniciales) ---- */}
        {complications.length > 0 ? (
          <section className="flex flex-col gap-2 rounded-xl border-2 border-nasa-red bg-red-50 p-3 lg:flex-row lg:items-center big:gap-4 big:p-6">
            <p className="flex shrink-0 items-center gap-2 font-mono text-sm font-bold tracking-wider text-nasa-red big:text-base">
              <TriangleExclamationPoint className="h-5 w-5" strokeWidth={2} /> {tr('DIAGNÓSTICO', 'DIAGNOSTIC')}: {complications.length}{' '}
              {complications.length === 1 ? tr('AVERÍA INICIAL', 'STARTING BREAKDOWN') : tr('AVERÍAS INICIALES', 'STARTING BREAKDOWNS')}
            </p>
            <div className="flex flex-1 flex-wrap gap-2">
              {complications.map((c) => (
                <span key={c} className="flex items-center gap-1.5 rounded-md border border-red-200 bg-white px-2.5 py-1 text-sm text-slate-800 big:px-3 big:py-1.5 big:text-base">
                  <Wrench className="h-4 w-4 text-nasa-red" strokeWidth={1.75} />
                  <b>{COMPLICATIONS[c].title}</b>
                  <span className="font-mono text-xs text-nasa-red">
                    {COMPLICATIONS[c].startPenalty} {tr('inicial', 'at start')} · {COMPLICATIONS[c].dailyPenalty}/Sol
                  </span>
                </span>
              ))}
            </div>
            <p className="text-xs text-slate-600 lg:max-w-[15rem] big:text-sm">{tr('Se reparan dentro de la base espacial superando un minijuego.', 'They are fixed inside the space base by beating a mini-game.')}</p>
          </section>
        ) : (
          <section className="flex items-center gap-2 rounded-xl border-2 border-emerald-400 bg-emerald-50 p-3 text-sm font-bold text-emerald-800 big:p-6 big:text-base">
            <CircleCheck className="h-5 w-5 shrink-0" strokeWidth={1.75} />{' '}
            {tr('Diagnóstico de esclusa: todos los sistemas operativos. La base espacial empieza sin averías.', 'Airlock diagnostic: all systems operational. The space base starts with no breakdowns.')}
          </section>
        )}

        {/* ---- Acciones ---- */}
        <section className="mt-6 flex w-full flex-wrap items-center justify-center gap-4 big:mt-8 big:gap-6">
          {freeSpins > 0 && (
            <motion.button
              type="button"
              animate={{ scale: [1, 1.03, 1] }}
              transition={{ duration: 1.2, repeat: Infinity }}
              onClick={() => {
                playButtonClick();
                setRouletteOpen(true);
              }}
              className="font-display flex items-center justify-center gap-2 rounded-2xl bg-nasa-red px-7 py-3.5 text-base font-black tracking-wider text-white shadow-lg sm:text-lg big:px-10 big:py-5 big:text-xl"
            >
              <PackageOpen strokeWidth={1.75} /> {tr('CÁPSULA DE RESCATE GRATIS', 'FREE RESCUE CAPSULE')} ({freeSpins})
            </motion.button>
          )}
          <motion.button
            type="button"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            disabled={sealing}
            onClick={() => {
              playButtonClick();
              seal();
            }}
            className="font-display glow-blue flex items-center justify-center gap-2 rounded-2xl bg-nasa-blue px-8 py-3.5 text-base font-black tracking-wider text-white disabled:opacity-60 sm:text-lg big:px-12 big:py-5 big:text-xl"
          >
            <DoorClosed /> {sealing ? tr('SELLANDO...', 'SEALING...') : tr('ENTRAR A LA BASE ESPACIAL', 'ENTER THE SPACE BASE')}
          </motion.button>
        </section>
        </div>
      </main>

      <SalvageRouletteModal open={rouletteOpen} onClose={() => setRouletteOpen(false)} />
    </div>
  );
}
