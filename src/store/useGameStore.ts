import { create } from 'zustand';
import type {
  BadgeId,
  HoustonOrder,
  HoustonPackageId,
  FieldNote,
  FieldNoteSource,
  MarsPhoto,
  OsdrStudy,
  MissionNotice,
  RepairTarget,
  StoryScene,
  DailyEvent,
  Debrief,
  Difficulty,
  Effects,
  GamePhase,
  ItemId,
  MissionDifficulty,
  MissionOutcome,
  NASAWeather,
  NasaStatus,
  Phase1Stage,
  QuizAnswerRecord,
  RadiationLevel,
  Rank,
  Rarity,
  RoomId,
  SalvagePrizeId,
  SalvageSpinResult,
  SolReport,
  SpinKind,
  TriviaQuestion,
  VitalKey,
  Vitals,
} from '../types/game';
import { DEBUG_INVENTORY, ITEMS_BY_ID, RARITY_ORDER, STATION_ITEMS, CATEGORY_META } from '../data/stationItems';
import { COMPLICATIONS, QUIZ_SECONDS, buildQuizQueue, hasComplication } from '../data/triviaQuestions';
import { SALVAGE_PRIZES, SPIN_COSTS, WHEELS } from '../data/salvagePrizes';
import {
  BADGES,
  HOUSTON_COST_POWER,
  HOUSTON_DELAY_SOLS,
  HOUSTON_MAX_IN_TRANSIT,
  HOUSTON_MAX_ORDERS,
  HOUSTON_MIN_POWER,
  HOUSTON_PACKAGES,
  REPAIR_FAIL_POWER,
  repairKey,
} from '../data/missionExtras';
import { buildFieldNote } from '../data/fieldNotes';
import { fetchLatestSolarFlare, fetchMarsSurfacePhotos, fetchOsdrStudyMeta, getFallbackMarsPhotos } from '../services/nasaApi';
import {
  generateDailyMissionEvent,
  generateDebrief,
  getGeminiDiagnostics,
  testGeminiConnection,
  type GeminiDiagnostics,
} from '../services/geminiGameMaster';
import { ariaVoice, type VoiceMode } from '../utils/ariaVoice';
import {
  playAlarmBeep,
  playErrorBuzz,
  playEvacuation,
  playIncoming,
  playPickup,
  playSuccess,
  playToggle,
  playUnlock,
} from '../utils/soundEffects';

// ============================================================
// Constantes de equilibrio del juego
// ============================================================
/** Compatibilidad: duración de la Fase 1 (trivia contrarreloj). */
export const PHASE1_SECONDS = QUIZ_SECONDS;
export const TOTAL_SOLS = 10;
export const MIN_LOADING_MS = 700;

/**
 * Balance: con la base espacial VACÍA la comida se agota en el Sol 4 (50 → 36 → 22 → 8 → 0)
 * y el oxígeno en el Sol 5; los costes de los eventos y las complicaciones lo adelantan.
 */
export const INITIAL_VITALS: Vitals = { oxygen: 60, power: 75, food: 50, shield: 60, crewHealth: 100 };

/** Desgaste natural de cada Sol. */
export const BASE_DECAY = { oxygen: -14, food: -14, power: -3 } as const;

/** Daño al escudo según la radiación del día. */
export const RADIATION_DAMAGE: Record<RadiationLevel, number> = { low: 4, moderate: 7, high: 11, extreme: 16 };

export const MISSION_DIFFICULTY_META: Record<MissionDifficulty, { label: string; description: string }> = {
  explorer: { label: 'Modo Explorador', description: 'Más margen para aprender y probar estrategias.' },
  commander: { label: 'Modo Comandante', description: 'Menos reservas y más presión en cada Sol.' },
};

const MISSION_PROFILES: Record<
  MissionDifficulty,
  {
    initialVitals: Vitals;
    baseDecay: { oxygen: number; food: number; power: number };
    radiationMultiplier: number;
    breakdownChance: number;
    quizSeconds: number;
    /** Respuestas por pregunta en la trivia (fácil: 2, normal: 4). */
    answerOptions: number;
  }
> = {
  explorer: {
    initialVitals: { oxygen: 72, power: 85, food: 68, shield: 72, crewHealth: 100 },
    baseDecay: { oxygen: -10, food: -10, power: -2 },
    radiationMultiplier: 0.75,
    breakdownChance: 0.1,
    quizSeconds: 60,
    answerOptions: 2,
  },
  commander: {
    initialVitals: INITIAL_VITALS,
    baseDecay: { ...BASE_DECAY },
    radiationMultiplier: 1.25,
    breakdownChance: 0.3,
    quizSeconds: 60,
    answerOptions: 4,
  },
};

export function getMissionProfile(difficulty: MissionDifficulty) {
  return MISSION_PROFILES[difficulty];
}

export const RADIATION_LABEL: Record<RadiationLevel, string> = {
  low: 'Baja',
  moderate: 'Moderada',
  high: 'Alta',
  extreme: 'Extrema',
};

export const SEED_HARVEST = 20;
export const SEED_SOLS_TO_HARVEST = 2;

/** Una barra por debajo de este valor habilita el giro de emergencia gratis. */
export const EMERGENCY_THRESHOLD = 30;

export const VITAL_ORDER: VitalKey[] = ['oxygen', 'power', 'food', 'shield', 'crewHealth'];

export const VITAL_META: Record<VitalKey, { label: string; short: string }> = {
  oxygen: { label: 'Oxígeno', short: 'O2' },
  power: { label: 'Energía', short: 'Energía' },
  food: { label: 'Comida', short: 'Comida' },
  shield: { label: 'Blindaje', short: 'Escudo' },
  crewHealth: { label: 'Salud', short: 'Salud' },
};

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

export type FullEffects = Required<Effects>;
const zeroEffects = (): FullEffects => ({ oxygen: 0, power: 0, food: 0, shield: 0, crewHealth: 0, science: 0 });

const pick = <T,>(arr: T[]): T | undefined => arr[Math.floor(Math.random() * arr.length)];

// ============================================================
// Lógica matemática pura (reutilizada por la interfaz para previsiones)
// ============================================================

export function usedSlots(inventory: ItemId[]): number {
  return inventory.reduce((sum, id) => sum + ITEMS_BY_ID[id].slots, 0);
}

/** Balance energético estimado de la carga (todas las máquinas encendidas). */
export function estimatedPowerBalance(inventory: ItemId[]): number {
  return inventory.reduce<number>((sum, id) => sum + ITEMS_BY_ID[id].powerPerSol, BASE_DECAY.power);
}

export function availableItems(inventory: ItemId[], consumed: ItemId[]): ItemId[] {
  return inventory.filter((id) => !consumed.includes(id));
}

/** Máquina averiada (no se puede encender): su rama tiene complicación o sufrió una avería puntual. */
export function isMachineBroken(id: ItemId, complications: VitalKey[], brokenMachines: ItemId[] = []): boolean {
  const item = ITEMS_BY_ID[id];
  return item.kind === 'machine' && (complications.includes(item.category) || brokenMachines.includes(id));
}

export interface SolTickInput {
  vitals: Vitals;
  inventory: ItemId[];
  consumed: ItemId[];
  machineStates: Partial<Record<ItemId, boolean>>;
  seedGrowth: number;
  radiationLevel: RadiationLevel;
  /** Ramas con complicación de la Fase 1 (penalización diaria y máquinas averiadas). */
  complications?: VitalKey[];
  /** Máquinas con avería puntual (no funcionan hasta repararlas). */
  brokenMachines?: ItemId[];
  missionDifficulty?: MissionDifficulty;
}

export interface SolTickResult {
  deltas: FullEffects;
  harvest: boolean;
  nextSeedGrowth: number;
  /** Desglose explicativo para la interfaz. */
  breakdown: { source: string; effects: Effects }[];
}

/** Calcula lo que pasará al terminar el Sol: desgaste + máquinas + radiación + complicaciones + salud. */
export function computeSolTick(input: SolTickInput): SolTickResult {
  const profile = getMissionProfile(input.missionDifficulty ?? 'commander');
  const complications = input.complications ?? [];
  const items = availableItems(input.inventory, input.consumed);
  const has = (id: ItemId) => items.includes(id);
  const isOn = (id: ItemId) => has(id) && Boolean(input.machineStates[id]) && !isMachineBroken(id, complications, input.brokenMachines);
  const d = zeroEffects();
  const breakdown: SolTickResult['breakdown'] = [];

  // 1. Desgaste natural
  d.oxygen += profile.baseDecay.oxygen;
  d.food += profile.baseDecay.food;
  d.power += profile.baseDecay.power;
  breakdown.push({ source: 'Consumo de la tripulación', effects: { ...profile.baseDecay } });

  // 2. Radiación (protecciones pasivas restan; la Manta de Plomo divide entre 2)
  let dmg = Math.max(1, Math.round(RADIATION_DAMAGE[input.radiationLevel] * profile.radiationMultiplier));
  const protections: string[] = [];
  for (const id of items) {
    const r = ITEMS_BY_ID[id].radiationReduction;
    if (r) {
      dmg = Math.max(0, dmg - r);
      protections.push(`${ITEMS_BY_ID[id].shortName} −${r}`);
    }
  }
  if (has('lead_blanket')) {
    dmg = Math.ceil(dmg / 2);
    protections.push('Manta ½');
  }
  d.shield -= dmg;
  breakdown.push({
    source: protections.length ? `Radiación (${protections.join(', ')})` : 'Radiación solar',
    effects: { shield: -dmg },
  });

  // 3. Objetos pasivos y máquinas encendidas
  for (const id of items) {
    const item = ITEMS_BY_ID[id];
    if (item.kind === 'machine' && !isOn(id)) continue;
    if (item.kind !== 'machine' && item.kind !== 'passive') continue;
    const eff: Effects = {};
    if (item.powerPerSol !== 0) eff.power = item.powerPerSol;
    if (item.effectPerSol) {
      for (const [k, v] of Object.entries(item.effectPerSol) as [keyof Effects, number][]) {
        if (k === 'power') continue; // ya contado en powerPerSol
        eff[k] = (eff[k] ?? 0) + v;
      }
    }
    for (const [k, v] of Object.entries(eff) as [keyof Effects, number][]) d[k] += v;
    if (Object.keys(eff).length) breakdown.push({ source: item.shortName, effects: eff });
  }

  // 4. Semillas: cosecha cada 2 Soles con luz UV
  let nextSeedGrowth = input.seedGrowth;
  let harvest = false;
  if (isOn('osdr_seeds')) {
    nextSeedGrowth += 1;
    if (nextSeedGrowth >= SEED_SOLS_TO_HARVEST) {
      harvest = true;
      nextSeedGrowth = 0;
      d.food += SEED_HARVEST;
      breakdown.push({ source: '¡Cosecha de lechuga roja!', effects: { food: SEED_HARVEST } });
    }
  }

  // 5. Complicaciones de la Fase 1
  for (const c of complications) {
    const comp = COMPLICATIONS[c];
    d[c] += comp.dailyPenalty;
    breakdown.push({ source: `${comp.title}`, effects: { [c]: comp.dailyPenalty } });
  }

  // 6. Salud de la tripulación según el estado de la base espacial
  const after = (k: VitalKey) => input.vitals[k] + d[k];
  let health = 0;
  if (after('shield') < 30) health -= 8;
  if (after('oxygen') < 25) health -= 6;
  if (after('food') < 25) health -= 6;
  if (health === 0) health = 3;
  d.crewHealth += health;
  breakdown.push({ source: health > 0 ? 'Tripulación descansando' : 'Zona roja afecta a la salud', effects: { crewHealth: health } });

  return { deltas: d, harvest, nextSeedGrowth, breakdown };
}

export function applyEffects(vitals: Vitals, effects: Effects): Vitals {
  return {
    oxygen: clamp(vitals.oxygen + (effects.oxygen ?? 0)),
    power: clamp(vitals.power + (effects.power ?? 0)),
    food: clamp(vitals.food + (effects.food ?? 0)),
    shield: clamp(vitals.shield + (effects.shield ?? 0)),
    crewHealth: clamp(vitals.crewHealth + (effects.crewHealth ?? 0)),
  };
}

export function findFailedVital(v: Vitals): VitalKey | null {
  return VITAL_ORDER.find((k) => v[k] <= 0) ?? null;
}

export function lowestVital(v: Vitals): VitalKey {
  return VITAL_ORDER.reduce((a, b) => (v[b] < v[a] ? b : a));
}

export function computeRank(outcome: MissionOutcome, science: number, vitals: Vitals): Rank {
  if (outcome !== 'victory') return 'Cadete Espacial';
  const avg = VITAL_ORDER.reduce((s, k) => s + vitals[k], 0) / VITAL_ORDER.length;
  return science >= 75 || avg >= 60 ? 'Comandante Marciano' : 'Ingeniero de Sistemas Artemisa';
}

/** Barras con las que se empezará la Fase 2 (suministros extra y complicaciones incluidas). */
export function projectedStartVitals(
  supplyBonus: Effects,
  complications: VitalKey[],
  missionDifficulty: MissionDifficulty = 'commander',
): Vitals {
  const penalties: Effects = {};
  for (const c of complications) penalties[c] = (penalties[c] ?? 0) + COMPLICATIONS[c].startPenalty;
  return applyEffects(applyEffects(getMissionProfile(missionDifficulty).initialVitals, supplyBonus), penalties);
}

/** Estadística de aciertos por rama en la trivia. */
export function categoryStats(answers: QuizAnswerRecord[]): Record<VitalKey, { answered: number; correct: number }> {
  const stats = Object.fromEntries(VITAL_ORDER.map((k) => [k, { answered: 0, correct: 0 }])) as Record<
    VitalKey,
    { answered: number; correct: number }
  >;
  for (const a of answers) {
    stats[a.category].answered++;
    if (a.correct) stats[a.category].correct++;
  }
  return stats;
}

/** Elige un objeto que el jugador aún no tiene, probando rarezas y ramas en orden. */
function pickNewItem(owned: ItemId[], tiers: Rarity[], categories: VitalKey[]): ItemId | null {
  for (const cat of categories) {
    for (const tier of tiers) {
      const pool = STATION_ITEMS.filter((i) => i.category === cat && i.rarity === tier && !owned.includes(i.id));
      const choice = pick(pool);
      if (choice) return choice.id;
    }
  }
  return null;
}

/** Rarezas de recompensa según la dificultad de la pregunta. */
function tiersForDifficulty(d: Difficulty): Rarity[] {
  if (d === 'easy') return ['common', 'rare', 'epic', 'legendary'];
  if (d === 'medium') return ['rare', 'epic', 'common', 'legendary'];
  return Math.random() < 0.5 ? ['legendary', 'epic', 'rare', 'common'] : ['epic', 'legendary', 'rare', 'common'];
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ============================================================
// Store
// ============================================================
export type SolStage = 'loading' | 'event' | 'report';

export type SpinAvailability = Record<SpinKind, { ok: boolean; reason?: string }>;

interface GameState {
  gamePhase: GamePhase;
  missionDifficulty: MissionDifficulty;

  // NASA DONKI
  nasaWeather: NASAWeather | null;
  nasaStatus: NasaStatus;
  /** Fotos reales de Marte (NASA Image and Video Library) para el Periscopio. */
  marsPhotos: MarsPhoto[];
  marsPhotosStatus: NasaStatus;
  /** Estudio real de NASA OSDR / GeneLab consultado en vivo (o curado si no hay red). */
  osdrStudy: OsdrStudy | null;
  osdrStatus: NasaStatus;

  // Diagnóstico de la IA (badge del Menú)
  aiStatus: 'idle' | 'testing' | 'done';
  aiDiagnostics: GeminiDiagnostics | null;

  // A.R.I.A.
  voiceMode: VoiceMode;
  voiceMuted: boolean;
  ariaMessage: string;

  // Fase 1: trivia contrarreloj
  phase1Stage: Phase1Stage;
  quizQueue: TriviaQuestion[];
  quizIndex: number;
  quizAnswers: QuizAnswerRecord[];
  timeLeft: number;
  /** Ramas con complicación (calculadas al terminar la trivia; se pueden reparar en la ruleta). */
  complications: VitalKey[];
  /** Bonus a las barras iniciales (premios de ruleta obtenidos en la Fase 1). */
  supplyBonus: Effects;
  /** Giros gratis de rescate (p. ej. si la Fase 1 fue mal). */
  freeSpins: number;
  /** Compatibilidad con la UI antigua. */
  activeRoom: RoomId;
  shakeCounter: number;
  ariaWarningsGiven: number[];
  /** Inventario de la base espacial (los objetos ganados entran automáticamente). */
  bunkerInventory: ItemId[];

  // Fase 2
  sol: number;
  vitals: Vitals;
  scienceScore: number;
  machineStates: Partial<Record<ItemId, boolean>>;
  consumedItems: ItemId[];
  seedGrowth: number;
  currentEvent: DailyEvent | null;
  solStage: SolStage;
  usedFallbackKeys: string[];
  history: SolReport[];
  lastReport: SolReport | null;
  pendingOutcome: MissionOutcome | null;
  emergencySpinUsed: boolean;
  requestId: number;

  // ---- Historia, Deep Space Network e insignias ----
  storyScene: StoryScene | null;
  houstonOrders: HoustonOrder[];
  /** Sol en el que se hizo el último pedido (1 pedido por Sol). */
  houstonOrderedSol: number | null;
  /** Pedidos a Houston hechos en toda la partida (máx. HOUSTON_MAX_ORDERS). */
  houstonOrdersPlaced: number;
  badges: BadgeId[];
  notice: MissionNotice | null;
  /** Contenedores Extra de Houston pendientes de abrir (tirada gratis en la Cápsula Orbital). */
  houstonCrates: number;
  /** Aviso grande "¡La cápsula de Houston ha aterrizado!". */
  houstonLanding: boolean;
  /** Máquinas con avería puntual (se reparan con un minijuego). */
  brokenMachines: ItemId[];
  /** Intentos de reparación fallados ("sol:clave"): 1 intento por avería y Sol. */
  repairTried: string[];
  /** Fotos reales de Marte ya recibidas en notas de campo (álbum del Periscopio). */
  unlockedPhotoIds: string[];
  /** Nota de campo con foto real pendiente de mostrar. */
  fieldNote: FieldNote | null;
  lastFieldNoteSol: number;

  // Fin de partida
  outcome: MissionOutcome | null;
  failedVital: VitalKey | null;
  rank: Rank | null;
  debrief: Debrief | null;
  debriefLoading: boolean;
}

interface GameActions {
  loadNasaWeather: () => Promise<void>;
  /** Descarga (una vez por sesión) las fotos reales de Marte; nunca lanza. */
  loadMarsPhotos: () => Promise<void>;
  /** Metadatos de un estudio real de NASA OSDR (una vez por sesión); nunca lanza. */
  loadOsdrStudy: () => Promise<void>;
  testGemini: () => Promise<void>;
  /** Mensaje de A.R.I.A. `story`: viñeta de la historia (habla aunque la pantalla esté retenida y no cambia ariaMessage). */
  ariaSay: (text: string, opts?: { story?: boolean }) => void;
  toggleVoice: () => void;
  setVoiceMode: (mode: VoiceMode) => void;

  // Fase 1
  enterMissionSelector: () => void;
  startGame: () => void;
  setMissionDifficulty: (difficulty: MissionDifficulty) => void;
  beginQuiz: () => void;
  /** Responde la pregunta actual; si acierta, el objeto ganado entra en el inventario. */
  answerQuiz: (answer: string) => QuizAnswerRecord | null;
  nextQuizQuestion: () => void;
  tickTimer: () => void;
  finishQuiz: () => void;
  sealBunker: () => void;
  debugSkipToPhase2: () => void;
  /** Comandos rápidos de presentación: 'supervivencia', 'final', 'derrota'. Devuelve true si lo reconoce. */
  runAriaCommand: (text: string) => boolean;
  /** Termina la partida al instante y lleva a la pantalla final. */
  forceGameOver: (outcome: MissionOutcome) => void;

  // Cápsula de Salvación
  getSpinAvailability: () => SpinAvailability;
  salvageSpin: (kind: SpinKind, scrapItemId?: ItemId) => SalvageSpinResult | { error: string };

  // Fase 2
  toggleMachine: (id: ItemId) => void;
  useConsumable: (id: ItemId) => void;
  loadSolEvent: () => Promise<void>;
  chooseOption: (optionId: string) => void;
  continueAfterReport: () => void;

  loadDebrief: () => Promise<void>;
  closeStory: () => void;
  orderHoustonPackage: (id: HoustonPackageId) => { ok: true } | { error: string };
  awardBadge: (id: BadgeId) => void;
  dismissNotice: () => void;
  dismissHoustonLanding: () => void;
  /** Resultado del minijuego de reparación de una avería. */
  repairResult: (target: RepairTarget, success: boolean) => void;
  dismissFieldNote: () => void;
  playAgain: () => void;
  resetToMenu: () => void;
}

export type GameStore = GameState & GameActions;

const phase1Initial = (difficulty: MissionDifficulty = 'explorer') => ({
  phase1Stage: 'ready' as Phase1Stage,
  quizQueue: [] as TriviaQuestion[],
  quizIndex: 0,
  quizAnswers: [] as QuizAnswerRecord[],
  timeLeft: getMissionProfile(difficulty).quizSeconds,
  complications: [] as VitalKey[],
  supplyBonus: {} as Effects,
  freeSpins: 0,
  activeRoom: 'greenhouse' as RoomId,
  shakeCounter: 0,
  ariaWarningsGiven: [] as number[],
  bunkerInventory: [] as ItemId[],
});

const phase2Initial = (difficulty: MissionDifficulty = 'explorer') => ({
  sol: 1,
  vitals: { ...getMissionProfile(difficulty).initialVitals },
  scienceScore: 0,
  machineStates: {} as Partial<Record<ItemId, boolean>>,
  consumedItems: [] as ItemId[],
  seedGrowth: 0,
  currentEvent: null as DailyEvent | null,
  solStage: 'loading' as SolStage,
  usedFallbackKeys: [] as string[],
  history: [] as SolReport[],
  lastReport: null as SolReport | null,
  pendingOutcome: null as MissionOutcome | null,
  emergencySpinUsed: false,
  houstonOrders: [] as HoustonOrder[],
  houstonOrderedSol: null as number | null,
  houstonOrdersPlaced: 0,
  notice: null as MissionNotice | null,
  houstonCrates: 0,
  houstonLanding: false,
  brokenMachines: [] as ItemId[],
  repairTried: [] as string[],
  unlockedPhotoIds: [] as string[],
  fieldNote: null as FieldNote | null,
  lastFieldNoteSol: 0,
});

const gameOverInitial = () => ({
  outcome: null as MissionOutcome | null,
  failedVital: null as VitalKey | null,
  rank: null as Rank | null,
  debrief: null as Debrief | null,
  debriefLoading: false,
});

function defaultMachineStates(inventory: ItemId[], complications: VitalKey[]): Partial<Record<ItemId, boolean>> {
  const states: Partial<Record<ItemId, boolean>> = {};
  for (const id of inventory) if (ITEMS_BY_ID[id].kind === 'machine') states[id] = !isMachineBroken(id, complications);
  return states;
}

export const useGameStore = create<GameStore>()((set, get) => ({
  gamePhase: 'MENU',
  missionDifficulty: 'explorer',
  nasaWeather: null,
  nasaStatus: 'idle',
  marsPhotos: [],
  marsPhotosStatus: 'idle',
  osdrStudy: null,
  osdrStatus: 'idle',
  aiStatus: 'idle',
  aiDiagnostics: null,
  voiceMode: ariaVoice.getMode(),
  voiceMuted: ariaVoice.getMode() === 'silent',
  ariaMessage: 'Hola, soy A.R.I.A., la inteligencia de a bordo. ¡Estoy lista para ayudarte!',
  requestId: 0,
  storyScene: null,
  badges: [],
  ...phase1Initial('explorer'),
  ...phase2Initial('explorer'),
  ...gameOverInitial(),

  // ---------------- NASA ----------------
  loadOsdrStudy: async () => {
    const st = get().osdrStatus;
    if (st === 'loading' || st === 'live') return;
    set({ osdrStatus: 'loading' });
    const study = await fetchOsdrStudyMeta();
    set({ osdrStudy: study, osdrStatus: study.isLive ? 'live' : 'fallback' });
  },

  loadMarsPhotos: async () => {
    const st = get().marsPhotosStatus;
    if (st === 'loading' || st === 'live') return;
    set({ marsPhotosStatus: 'loading' });
    const { photos, isLive } = await fetchMarsSurfacePhotos();
    const unlocked = get().unlockedPhotoIds;
    const keep = get().marsPhotos.filter((p) => unlocked.includes(p.id) && !photos.some((q) => q.id === p.id));
    set({ marsPhotos: [...keep, ...photos], marsPhotosStatus: isLive ? 'live' : 'fallback' });
  },

  loadNasaWeather: async () => {
    if (get().nasaStatus === 'loading') return;
    set({ nasaStatus: 'loading' });
    const weather = await fetchLatestSolarFlare();
    set({ nasaWeather: weather, nasaStatus: weather.isLive ? 'live' : 'fallback' });
  },

  testGemini: async () => {
    if (get().aiStatus === 'testing') return;
    set({ aiStatus: 'testing' });
    const diagnostics = await testGeminiConnection();
    set({ aiStatus: 'done', aiDiagnostics: diagnostics });
  },

  // ---------------- A.R.I.A. ----------------
  ariaSay: (text, opts) => {
    if (opts?.story) {
      // Viñeta de la historia: corta la viñeta anterior y habla ya (la pantalla de detrás espera)
      ariaVoice.interrupt({ keepPending: true });
      ariaVoice.speak(text, { force: true });
      return;
    }
    set({ ariaMessage: text });
    ariaVoice.speak(text);
  },
  toggleVoice: () => {
    get().setVoiceMode(get().voiceMode === 'silent' ? 'beeps' : 'silent');
  },
  setVoiceMode: (mode) => {
    ariaVoice.setMode(mode);
    set({ voiceMode: mode, voiceMuted: mode === 'silent' });
  },

  // ---------------- FASE 1: TRIVIA CONTRARRELOJ ----------------
  setMissionDifficulty: (missionDifficulty) => {
    if (get().gamePhase !== 'MENU' && get().gamePhase !== 'MISSION_SELECT') return;
    set({ missionDifficulty, ...phase1Initial(missionDifficulty), ...phase2Initial(missionDifficulty) });
  },

  enterMissionSelector: () => {
    if (get().gamePhase !== 'MENU') return;
    set({ gamePhase: 'MISSION_SELECT' });
  },

  startGame: () => {
    const difficulty = get().missionDifficulty;
    set((s) => ({
      gamePhase: 'PHASE_1_SCAVENGE',
      requestId: s.requestId + 1,
      ...phase1Initial(difficulty),
      ...phase2Initial(difficulty),
      ...gameOverInitial(),
      quizQueue: buildQuizQueue(),
      storyScene: 'prologue',
      badges: [],
    }));
    playAlarmBeep();
    const w = get().nasaWeather;
    get().ariaSay(
      `¡Alerta! NASA DONKI detecta una tormenta solar${w ? ` de clase ${w.flareClass}` : ''}. Tienes 60 segundos para responder preguntas: ¡cada acierto manda equipo a la base espacial!`,
    );
  },

  beginQuiz: () => {
    if (get().phase1Stage !== 'ready') return;
    set({ phase1Stage: 'quiz', timeLeft: getMissionProfile(get().missionDifficulty).quizSeconds });
    playAlarmBeep();
  },

  answerQuiz: (answer) => {
    const s = get();
    const q = s.quizQueue[s.quizIndex];
    if (s.phase1Stage !== 'quiz' || !q || s.quizAnswers.length > s.quizIndex) return null;
    const correct = answer === q.answers[0];
    let rewardItemId: ItemId | null = null;
    if (correct) {
      rewardItemId = pickNewItem(s.bunkerInventory, tiersForDifficulty(q.difficulty), [q.category]);
      playSuccess();
    } else {
      playErrorBuzz();
    }
    const record: QuizAnswerRecord = {
      questionId: q.id,
      difficulty: q.difficulty,
      category: q.category,
      correct,
      rewardItemId,
    };
    set({
      quizAnswers: [...s.quizAnswers, record],
      bunkerInventory: rewardItemId ? [...s.bunkerInventory, rewardItemId] : s.bunkerInventory,
    });
    return record;
  },

  nextQuizQuestion: () => {
    const s = get();
    if (s.phase1Stage !== 'quiz' || s.quizAnswers.length <= s.quizIndex) return;
    if (s.quizIndex >= s.quizQueue.length - 1) {
      get().finishQuiz();
      return;
    }
    set({ quizIndex: s.quizIndex + 1 });
  },

  tickTimer: () => {
    const s = get();
    if (s.gamePhase !== 'PHASE_1_SCAVENGE' || s.phase1Stage !== 'quiz' || s.timeLeft <= 0) return;
    const next = s.timeLeft - 1;
    set({ timeLeft: next });
    if (next <= 10 && next > 0) playAlarmBeep();
    if (next === 0) get().finishQuiz();
  },

  finishQuiz: () => {
    const s = get();
    if (s.phase1Stage !== 'quiz') return;
    const stats = categoryStats(s.quizAnswers);
    const complications = VITAL_ORDER.filter((k) => hasComplication(stats[k].answered, stats[k].correct));
    const totalCorrect = s.quizAnswers.filter((a) => a.correct).length;
    const veryBad = totalCorrect <= 3 || complications.length >= 3;
    set({ phase1Stage: 'summary', complications, freeSpins: veryBad ? 1 : 0, timeLeft: 0 });
    playAlarmBeep();
    get().ariaSay(
      `¡Tiempo! Has acertado ${totalCorrect} preguntas y ganado ${s.bunkerInventory.length} objetos.` +
        (complications.length
          ? ` Cuidado: hay ${complications.length} ${complications.length === 1 ? 'complicación' : 'complicaciones'}.`
          : ' ¡Sin complicaciones!') +
        (veryBad ? ' Tienes una cápsula de rescate gratis en la Cápsula Orbital.' : ''),
    );
  },

  sealBunker: () => {
    const s0 = get();
    if (s0.gamePhase !== 'PHASE_1_SCAVENGE') return;
    const inventory = s0.bunkerInventory;
    const complications = s0.complications;
    set((s) => ({
      gamePhase: 'PHASE_2_BUNKER',
      requestId: s.requestId + 1,
      ...phase2Initial(s.missionDifficulty),
      vitals: projectedStartVitals(s.supplyBonus, complications, s.missionDifficulty),
      machineStates: defaultMachineStates(inventory, complications),
      storyScene: 'lockdown',
    }));
    void get().loadMarsPhotos();
    get().ariaSay(
      `Compuertas selladas con ${inventory.length} objetos. Comienza el Sol 1.` +
        (complications.length ? ` Hay averías en: ${complications.map((c) => VITAL_META[c].label).join(', ')}.` : '') +
        ' ¡Mantened las cinco barras por encima de cero!',
    );
  },

  debugSkipToPhase2: () => {
    set((s) => ({
      gamePhase: 'PHASE_1_SCAVENGE',
      requestId: s.requestId + 1,
      ...phase1Initial(s.missionDifficulty),
      ...gameOverInitial(),
      bunkerInventory: [...DEBUG_INVENTORY],
      complications: ['oxygen'],
      badges: [],
    }));
    get().sealBunker();
    set({ storyScene: null });
  },

  forceGameOver: (outcome) => {
    // Desde el menú, el selector o la trivia: montar antes una base espacial de demostración
    if (get().gamePhase !== 'PHASE_2_BUNKER') get().debugSkipToPhase2();
    const s = get();
    let vitals = s.vitals;
    let failedVital: VitalKey | null = null;
    if (outcome === 'evacuation') {
      failedVital = findFailedVital(vitals) ?? lowestVital(vitals);
      vitals = { ...vitals, [failedVital]: 0 };
    }
    set((st) => ({
      gamePhase: 'GAME_OVER',
      requestId: st.requestId + 1,
      storyScene: null,
      fieldNote: null,
      houstonLanding: false,
      outcome,
      failedVital,
      vitals,
      pendingOutcome: null,
      rank: computeRank(outcome, st.scienceScore, vitals),
      debrief: null,
      debriefLoading: false,
    }));
  },

  runAriaCommand: (text) => {
    const words = text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z]+/g, ' ')
      .trim()
      .split(' ');
    if (words.includes('supervivencia')) {
      get().debugSkipToPhase2();
      get().ariaSay('Comando aceptado. Saltamos directamente a la fase de supervivencia en la base espacial.');
      return true;
    }
    if (words.includes('final')) {
      get().forceGameOver('victory');
      return true;
    }
    if (words.includes('derrota')) {
      get().forceGameOver('evacuation');
      return true;
    }
    return false;
  },

  // ---------------- CÁPSULA DE SALVACIÓN ----------------
  getSpinAvailability: () => {
    const s = get();
    const inPhase1 = s.gamePhase === 'PHASE_1_SCAVENGE' && s.phase1Stage === 'summary';
    const inPhase2 = s.gamePhase === 'PHASE_2_BUNKER' && s.solStage === 'event';
    const busy = !inPhase1 && !inPhase2;
    const anyLow = VITAL_ORDER.some((k) => s.vitals[k] < EMERGENCY_THRESHOLD);
    const ownedScrap = availableItems(s.bunkerInventory, s.consumedItems).length > 0;
    const notNow = { ok: false, reason: 'Solo disponible mientras eliges la decisión del Sol.' };
    const phase2Only = { ok: false, reason: 'Disponible dentro de la base espacial (Fase 2).' };
    const houston =
      s.gamePhase === 'PHASE_2_BUNKER' && s.houstonCrates > 0
        ? { ok: true }
        : { ok: false, reason: 'Llega con cada paquete de Houston (Deep Space Network).' };
    if (busy) return { emergency: notNow, energy: notNow, science: notNow, food: notNow, scrap: notNow, houston };
    return {
      houston,
      emergency:
        s.freeSpins > 0 || (inPhase2 && anyLow && !s.emergencySpinUsed)
          ? { ok: true }
          : { ok: false, reason: s.emergencySpinUsed ? 'Ya usaste el giro de emergencia.' : `Se activa si alguna barra baja de ${EMERGENCY_THRESHOLD}.` },
      energy: inPhase1
        ? phase2Only
        : s.vitals.power >= SPIN_COSTS.energy.minPower
          ? { ok: true }
          : { ok: false, reason: `Necesitas al menos ${SPIN_COSTS.energy.minPower} de Energía.` },
      science: inPhase1
        ? phase2Only
        : s.scienceScore >= SPIN_COSTS.science.science
          ? { ok: true }
          : { ok: false, reason: `Necesitas ${SPIN_COSTS.science.science} puntos de Ciencia.` },
      food: inPhase1
        ? phase2Only
        : s.vitals.food >= SPIN_COSTS.food.minFood
          ? { ok: true }
          : { ok: false, reason: `Necesitas al menos ${SPIN_COSTS.food.minFood} de Comida.` },
      scrap: ownedScrap ? { ok: true } : { ok: false, reason: 'No tienes objetos para desmontar.' },
    };
  },

  salvageSpin: (kind, scrapItemId) => {
    const avail = get().getSpinAvailability()[kind];
    if (!avail.ok) return { error: avail.reason ?? 'No disponible' };
    const s = get();
    const inPhase1 = s.gamePhase === 'PHASE_1_SCAVENGE';

    // --- Pagar el giro ---
    let vitals = { ...s.vitals };
    let science = s.scienceScore;
    let inventory = [...s.bunkerInventory];
    let consumed = [...s.consumedItems];
    let machineStates = { ...s.machineStates };
    let freeSpins = s.freeSpins;
    let emergencySpinUsed = s.emergencySpinUsed;
    let houstonCrates = s.houstonCrates;
    let scrappedRarity: Rarity | null = null;
    let scrappedCategory: VitalKey | null = null;

    if (kind === 'houston') {
      houstonCrates = Math.max(0, houstonCrates - 1);
    } else if (kind === 'emergency') {
      if (freeSpins > 0) freeSpins--;
      else emergencySpinUsed = true;
    } else if (kind === 'energy') {
      vitals = applyEffects(vitals, { power: -SPIN_COSTS.energy.power });
    } else if (kind === 'science') {
      science -= SPIN_COSTS.science.science;
    } else if (kind === 'food') {
      vitals = applyEffects(vitals, { food: -SPIN_COSTS.food.food });
    } else if (kind === 'scrap') {
      if (!scrapItemId || !availableItems(inventory, consumed).includes(scrapItemId)) return { error: 'Elige un objeto para desmontar.' };
      scrappedRarity = ITEMS_BY_ID[scrapItemId].rarity;
      scrappedCategory = ITEMS_BY_ID[scrapItemId].category;
      inventory = inventory.filter((i) => i !== scrapItemId);
      consumed = consumed.filter((i) => i !== scrapItemId);
      delete machineStates[scrapItemId];
    }

    // --- Elegir gajo ---
    const wheel = WHEELS[kind];
    const segmentIndex = Math.floor(Math.random() * wheel.length);
    const prizeId: SalvagePrizeId = wheel[segmentIndex];
    const prize = SALVAGE_PRIZES[prizeId];

    // --- Aplicar premio ---
    let complications = [...s.complications];
    let supplyBonus = { ...s.supplyBonus };
    const startVitals = projectedStartVitals(supplyBonus, complications, s.missionDifficulty);
    const refVitals = inPhase1 ? startVitals : vitals;
    const lowest = lowestVital(refVitals);
    const items: ItemId[] = [];

    const addVitals = (eff: Effects) => {
      if (inPhase1) {
        for (const [k, v] of Object.entries(eff) as [VitalKey, number][]) supplyBonus = { ...supplyBonus, [k]: (supplyBonus[k] ?? 0) + v };
      } else {
        vitals = applyEffects(vitals, eff);
      }
    };
    const grant = (tiers: Rarity[], categories: VitalKey[]) => {
      const id = pickNewItem(inventory, tiers, categories);
      if (id) {
        inventory = [...inventory, id];
        items.push(id);
        if (!inPhase1 && ITEMS_BY_ID[id].kind === 'machine') machineStates = { ...machineStates, [id]: !isMachineBroken(id, complications) };
      }
      return id;
    };
    const preferCats = [lowest, ...VITAL_ORDER.filter((k) => k !== lowest)];
    let message = '';

    switch (prizeId) {
      case 'jackpot_legendary': {
        const id = grant(['legendary', 'epic'], [...complications, ...preferCats]);
        message = id ? `¡PREMIO GORDO! ${ITEMS_BY_ID[id].name} llega a la base espacial.` : '¡Ya tienes todo lo legendario! Te doy +30 a la barra más baja.';
        if (!id) addVitals({ [lowest]: 30 });
        break;
      }
      case 'double_pack': {
        grant(['epic', 'rare', 'legendary', 'common'], preferCats);
        grant(['rare', 'epic', 'common'], [...preferCats].reverse());
        message = items.length ? `¡Pack doble! ${items.map((i) => ITEMS_BY_ID[i].shortName).join(' y ')}.` : 'Pack vacío... ¡ya lo tienes todo! +15 Energía.';
        if (!items.length) addVitals({ power: 15 });
        break;
      }
      case 'rare_item': {
        const id = grant(['rare', 'epic', 'common'], preferCats);
        message = id ? `Objeto raro: ${ITEMS_BY_ID[id].name}.` : 'No quedan objetos nuevos: +15 Comida.';
        if (!id) addVitals({ food: 15 });
        break;
      }
      case 'upgrade_item': {
        const fromIdx = scrappedRarity ? RARITY_ORDER.indexOf(scrappedRarity) : 0;
        const better = RARITY_ORDER.slice(Math.min(fromIdx + 1, RARITY_ORDER.length - 1));
        const cats = scrappedCategory ? [scrappedCategory, ...VITAL_ORDER.filter((k) => k !== scrappedCategory)] : preferCats;
        const id = grant([...better, ...RARITY_ORDER], cats);
        message = id ? `¡Mejora! Has convertido la chatarra en ${ITEMS_BY_ID[id].name}.` : 'Nada mejor que conseguir: +20 a la barra más baja.';
        if (!id) addVitals({ [lowest]: 20 });
        break;
      }
      case 'oxygen_full':
        if (inPhase1) addVitals({ oxygen: 40 });
        else vitals = { ...vitals, oxygen: 100 };
        message = inPhase1 ? '¡Recarga de oxígeno! Empezarás con +40 O2.' : '¡Recarga total! Oxígeno al 100 %.';
        break;
      case 'oxygen_boost':
        addVitals({ oxygen: 25 });
        message = '+25 de Oxígeno.';
        break;
      case 'food_boost':
        addVitals({ food: 25 });
        message = '+25 de Comida.';
        break;
      case 'shield_overcharge':
        addVitals({ shield: 35 });
        message = '¡Escudo sobrecargado! +35 de Blindaje.';
        break;
      case 'lowest_plus40':
        addVitals({ [lowest]: 40 });
        message = `¡Rescate! +40 de ${VITAL_META[lowest].label}, que era tu barra en peligro.`;
        break;
      case 'repair_kit':
        if (complications.length) {
          const fixed = complications[0];
          complications = complications.slice(1);
          // Las máquinas de esa rama vuelven a funcionar
          if (!inPhase1) {
            for (const id of inventory) if (ITEMS_BY_ID[id].kind === 'machine' && ITEMS_BY_ID[id].category === fixed) machineStates[id] = true;
          }
          message = `¡Reparado! Se acabó la avería "${COMPLICATIONS[fixed].title}".`;
        } else {
          addVitals({ [lowest]: 15 });
          message = `No había averías: el kit da +15 de ${VITAL_META[lowest].label}.`;
        }
        break;
      case 'dust_storm':
        addVitals({ power: 5 });
        message = 'Tormenta de polvo... solo recuperas +5 de Energía.';
        break;
    }

    set({
      vitals,
      scienceScore: Math.max(0, science),
      bunkerInventory: inventory,
      consumedItems: consumed,
      machineStates,
      freeSpins,
      emergencySpinUsed,
      houstonCrates,
      complications,
      supplyBonus,
    });
    return { segmentIndex, prize, message, items };
  },

  // ---------------- FASE 2 ----------------
  toggleMachine: (id) => {
    if (isMachineBroken(id, get().complications, get().brokenMachines)) {
      playErrorBuzz();
      get().ariaSay(`${ITEMS_BY_ID[id].shortName} está averiada (${CATEGORY_META[ITEMS_BY_ID[id].category].label}). Pulsa Reparar para arreglarla con un minijuego.`);
      return;
    }
    const on = !get().machineStates[id];
    playToggle(on);
    set((s) => ({ machineStates: { ...s.machineStates, [id]: on } }));
  },

  useConsumable: (id) => {
    const s = get();
    const item = ITEMS_BY_ID[id];
    if (item.kind !== 'consumable' || !s.bunkerInventory.includes(id) || s.consumedItems.includes(id)) return;
    if (s.solStage !== 'event') return;
    playPickup();
    set({
      vitals: applyEffects(s.vitals, item.useEffect ?? {}),
      consumedItems: [...s.consumedItems, id],
    });
    get().ariaSay(`${item.shortName} usado. ${item.description.split(':')[0]}.`);
  },

  loadSolEvent: async () => {
    const s = get();
    if (s.gamePhase !== 'PHASE_2_BUNKER') return;
    const reqId = s.requestId + 1;
    set({ requestId: reqId, solStage: 'loading', currentEvent: null });

    const [event] = await Promise.all([
      generateDailyMissionEvent({
        sol: s.sol,
        totalSols: TOTAL_SOLS,
        vitals: s.vitals,
        science: s.scienceScore,
        inventory: availableItems(s.bunkerInventory, s.consumedItems),
        machineStates: s.machineStates,
        weather: s.nasaWeather,
        previousTitles: s.history.map((h) => h.eventTitle),
        usedFallbackKeys: s.usedFallbackKeys,
      }),
      sleep(MIN_LOADING_MS),
    ]);

    if (get().requestId !== reqId || get().gamePhase !== 'PHASE_2_BUNKER') return;
    set((st) => ({
      currentEvent: event,
      solStage: 'event',
      usedFallbackKeys: event.key ? [...st.usedFallbackKeys, event.key] : st.usedFallbackKeys,
      aiDiagnostics: st.aiStatus === 'done' ? getGeminiDiagnostics() : st.aiDiagnostics,
    }));
    playIncoming();
    get().ariaSay(event.ariaVoiceAlert);
  },

  chooseOption: (optionId) => {
    const s = get();
    const event = s.currentEvent;
    if (!event || s.solStage !== 'event') return;
    const option = event.options.find((o) => o.id === optionId);
    if (!option) return;
    const inventory = availableItems(s.bunkerInventory, s.consumedItems);
    if (option.requiredItemId && !inventory.includes(option.requiredItemId)) {
      playErrorBuzz();
      return;
    }

    const start = s.vitals;
    const startScience = s.scienceScore;

    let vitals = applyEffects(start, option.effects);
    let science = Math.max(0, startScience + (option.effects.science ?? 0));
    let consumed = s.consumedItems;
    if (option.requiredItemId && ITEMS_BY_ID[option.requiredItemId].kind === 'consumable') {
      consumed = [...consumed, option.requiredItemId];
    }

    const tick = computeSolTick({
      vitals,
      inventory: s.bunkerInventory,
      consumed,
      machineStates: s.machineStates,
      seedGrowth: s.seedGrowth,
      radiationLevel: event.radiationLevel,
      complications: s.complications,
      brokenMachines: s.brokenMachines,
      missionDifficulty: s.missionDifficulty,
    });
    vitals = applyEffects(vitals, tick.deltas);
    science = Math.max(0, science + tick.deltas.science);

    const deltas: FullEffects = {
      oxygen: vitals.oxygen - start.oxygen,
      power: vitals.power - start.power,
      food: vitals.food - start.food,
      shield: vitals.shield - start.shield,
      crewHealth: vitals.crewHealth - start.crewHealth,
      science: science - startScience,
    };

    const report: SolReport = {
      sol: s.sol,
      eventTitle: event.title,
      optionLabel: option.label,
      ariaReaction: option.ariaReactionVoice,
      deltas,
      breakdown: [{ source: 'Efecto de tu decisión', effects: option.effects }, ...tick.breakdown],
      harvested: tick.harvest,
      radiationLevel: event.radiationLevel,
    };

    const failed = findFailedVital(vitals);
    const pendingOutcome: MissionOutcome | null = failed ? 'evacuation' : s.sol >= TOTAL_SOLS ? 'victory' : null;

    set({
      vitals,
      scienceScore: science,
      consumedItems: consumed,
      seedGrowth: tick.nextSeedGrowth,
      history: [...s.history, report],
      lastReport: report,
      solStage: 'report',
      pendingOutcome,
      failedVital: failed,
    });

    if (!failed && vitals.power >= 70) get().awardBadge('solar_engineer');
    if (tick.harvest) get().awardBadge('genelab_botanist');
    if (pendingOutcome === 'victory') get().awardBadge('ares_hero');

    if (pendingOutcome === 'evacuation') {
      playEvacuation();
      get().ariaSay(
        `${option.ariaReactionVoice} Pero el nivel de ${VITAL_META[failed!].label} ha llegado a cero. Activando evacuación de emergencia a la órbita.`,
      );
    } else if (pendingOutcome === 'victory') {
      playSuccess();
      get().ariaSay(`${option.ariaReactionVoice} ¡Sol ${TOTAL_SOLS} completado! ¡La tormenta ha pasado!`);
    } else {
      get().ariaSay(option.ariaReactionVoice + (tick.harvest ? ' ¡Y hoy hemos cosechado lechugas!' : ''));
    }
    get().continueAfterReport();
  },

  continueAfterReport: () => {
    const s = get();
    if (s.solStage !== 'report') return;
    if (s.pendingOutcome) {
      set({
        gamePhase: 'GAME_OVER',
        outcome: s.pendingOutcome,
        rank: computeRank(s.pendingOutcome, s.scienceScore, s.vitals),
        debrief: null,
      });
      return;
    }
    const sol = s.sol + 1;
    // Paquetes de Houston que llegan hoy por la Deep Space Network
    const arrived = s.houstonOrders.filter((o) => o.arrivalSol <= sol);
    let vitals = s.vitals;
    for (const o of arrived) {
      const pkg = HOUSTON_PACKAGES[o.id];
      vitals = applyEffects(vitals, { [pkg.vital]: pkg.amount });
    }
    set({
      sol,
      lastReport: null,
      vitals,
      houstonOrders: s.houstonOrders.filter((o) => o.arrivalSol > sol),
      houstonCrates: s.houstonCrates + arrived.length,
      houstonLanding: arrived.length > 0 ? true : s.houstonLanding,
      storyScene: sol === 4 ? 'radio_sol4' : sol === 8 ? 'radio_sol8' : s.storyScene,
    });
    if (arrived.length) {
      playUnlock();
      get().awardBadge('deep_space_communicator');
    } else if (
      sol >= 2 &&
      s.brokenMachines.length === 0 &&
      Math.random() < getMissionProfile(s.missionDifficulty).breakdownChance
    ) {
      // Avería puntual: una máquina encendida necesita mantenimiento (se repara con un minijuego)
      const st = get();
      const candidates = availableItems(st.bunkerInventory, st.consumedItems).filter(
        (id) => ITEMS_BY_ID[id].kind === 'machine' && st.machineStates[id] && !isMachineBroken(id, st.complications, st.brokenMachines),
      );
      if (candidates.length) {
        const id = candidates[Math.floor(Math.random() * candidates.length)];
        set({
          brokenMachines: [id],
          machineStates: { ...st.machineStates, [id]: false },
          notice: { key: Date.now(), kind: 'alert', title: 'Avería puntual', text: `${ITEMS_BY_ID[id].shortName} necesita mantenimiento: pulsa Reparar` },
        });
        playAlarmBeep();
      }
    }
    // Nota de campo con FOTO REAL: siempre con un envío de Houston y, si no, cada 2-3 Soles (rover o sonda)
    {
      const st = get();
      const sinceLast = sol - st.lastFieldNoteSol;
      let source: FieldNoteSource | null = null;
      if (arrived.length) source = 'houston';
      else if (sol !== 4 && sol !== 8 && (sinceLast >= 3 || (sinceLast >= 2 && Math.random() < 0.5))) {
        source = Math.random() < 0.65 ? 'rover' : 'orbiter';
      }
      // Si la descarga aún no ha terminado (o falló), se usan ya las 4 fotos reales locales de public/mars/
      let allPhotos = st.marsPhotos;
      if (allPhotos.length === 0) {
        allPhotos = getFallbackMarsPhotos();
        set({ marsPhotos: allPhotos });
      }
      const pool = allPhotos.filter((ph) => !st.unlockedPhotoIds.includes(ph.id));
      // Houston SIEMPRE trae foto: nueva si queda alguna; si ya se vieron todas, se repite una del álbum
      const reuse = source === 'houston' && pool.length === 0 ? allPhotos : [];
      if (source && (pool.length || reuse.length)) {
        const from = pool.length ? pool : reuse;
        const photo = from[Math.floor(Math.random() * from.length)];
        const note = buildFieldNote(photo, source, st.vitals, st.complications.length + st.brokenMachines.length);
        set({
          fieldNote: {
            key: Date.now() + 2,
            photoId: photo.id,
            source,
            sol,
            ...note,
            delivered:
              source === 'houston'
                ? arrived.map((o) => ({ label: HOUSTON_PACKAGES[o.id].label, vital: HOUSTON_PACKAGES[o.id].vital, amount: HOUSTON_PACKAGES[o.id].amount }))
                : undefined,
          },
          unlockedPhotoIds: st.unlockedPhotoIds.includes(photo.id) ? st.unlockedPhotoIds : [...st.unlockedPhotoIds, photo.id],
          lastFieldNoteSol: sol,
        });
      }
    }
    void get().loadSolEvent();
  },

  // ---------------- FIN ----------------
  loadDebrief: async () => {
    const s = get();
    if (s.debrief || s.debriefLoading || !s.outcome) return;
    const reqId = s.requestId;
    set({ debriefLoading: true });
    const debrief = await generateDebrief({
      outcome: s.outcome,
      rank: s.rank ?? computeRank(s.outcome, s.scienceScore, s.vitals),
      failedVital: s.failedVital,
      solsSurvived: s.outcome === 'victory' ? TOTAL_SOLS : s.history.length - 1,
      totalSols: TOTAL_SOLS,
      vitals: s.vitals,
      science: s.scienceScore,
      loadedItems: s.bunkerInventory,
      history: s.history,
    });
    if (get().requestId !== reqId) return;
    set({ debrief, debriefLoading: false });
  },

  playAgain: () => get().startGame(),

  // ---------------- HISTORIA / DEEP SPACE NETWORK / INSIGNIAS ----------------
  closeStory: () => set({ storyScene: null }),

  orderHoustonPackage: (id) => {
    const s = get();
    if (s.gamePhase !== 'PHASE_2_BUNKER' || s.solStage !== 'event') return { error: 'Solo puedes pedir ayuda mientras decides el Sol.' };
    if (s.houstonOrdersPlaced >= HOUSTON_MAX_ORDERS) return { error: `Ya usaste los ${HOUSTON_MAX_ORDERS} pedidos de la misión.` };
    if (s.houstonOrders.length >= HOUSTON_MAX_IN_TRANSIT)
      return { error: `Ya hay ${HOUSTON_MAX_IN_TRANSIT} envíos en camino. Espera a que llegue uno para pedir otro.` };
    if (s.houstonOrderedSol === s.sol) return { error: 'La antena ya transmitió hoy. Vuelve a intentarlo mañana.' };
    if (s.vitals.power < HOUSTON_MIN_POWER) return { error: `La antena necesita al menos ${HOUSTON_MIN_POWER} de Energía.` };
    const pkg = HOUSTON_PACKAGES[id];
    const arrivalSol = s.sol + HOUSTON_DELAY_SOLS;
    set({
      vitals: applyEffects(s.vitals, { power: -HOUSTON_COST_POWER }),
      houstonOrders: [...s.houstonOrders, { id, arrivalSol }],
      houstonOrderedSol: s.sol,
      houstonOrdersPlaced: s.houstonOrdersPlaced + 1,
    });
    playIncoming();
    get().ariaSay(
      `Mensaje enviado a Houston por la Deep Space Network. ${pkg.label} en camino: llegará en ${HOUSTON_DELAY_SOLS} Soles, al empezar el Sol ${arrivalSol}. ¡Anticiparse es de buenos ingenieros!`,
    );
    return { ok: true };
  },

  awardBadge: (id) => {
    if (get().badges.includes(id)) return;
    set((s) => ({
      badges: [...s.badges, id],
      notice: { key: Date.now() + 1, kind: 'badge', title: 'Nueva insignia de misión', text: BADGES[id].name },
    }));
    playUnlock();
  },

  dismissNotice: () => set({ notice: null }),

  dismissHoustonLanding: () => set({ houstonLanding: false }),

  dismissFieldNote: () => set({ fieldNote: null }),

  repairResult: (target, success) => {
    const s = get();
    if (s.gamePhase !== 'PHASE_2_BUNKER') return;
    const key = `${s.sol}:${repairKey(target)}`;
    if (s.repairTried.includes(key)) return;
    const name = target.type === 'machine' ? ITEMS_BY_ID[target.id].shortName : COMPLICATIONS[target.vital].title;

    if (!success) {
      set({ repairTried: [...s.repairTried, key], vitals: applyEffects(s.vitals, { power: -REPAIR_FAIL_POWER }) });
      playErrorBuzz();
      get().ariaSay(`La reparación de ${name} no ha salido a tiempo: sigue averiada este Sol y gastamos ${REPAIR_FAIL_POWER} de Energía. Mañana podrás intentarlo otra vez.`);
      return;
    }

    let complications = s.complications;
    let brokenMachines = s.brokenMachines;
    const machineStates = { ...s.machineStates };
    if (target.type === 'complication') {
      complications = complications.filter((c) => c !== target.vital);
    } else {
      brokenMachines = brokenMachines.filter((id) => id !== target.id);
    }
    // Las máquinas que ya no están averiadas vuelven a encenderse
    for (const id of availableItems(s.bunkerInventory, s.consumedItems)) {
      if (ITEMS_BY_ID[id].kind === 'machine' && isMachineBroken(id, s.complications, s.brokenMachines) && !isMachineBroken(id, complications, brokenMachines)) {
        machineStates[id] = true;
      }
    }
    set({ complications, brokenMachines, machineStates });
    playSuccess();
    get().ariaSay(`¡Reparado! ${name} vuelve a funcionar. ¡Qué buen trabajo de ingeniería!`);
    get().awardBadge('barter_master');
  },

  resetToMenu: () => {
    ariaVoice.stop();
    set((s) => ({
      gamePhase: 'MENU',
      requestId: s.requestId + 1,
      ...phase1Initial('explorer'),
      ...phase2Initial('explorer'),
      missionDifficulty: 'explorer',
      ...gameOverInitial(),
      storyScene: null,
    }));
  },
}));

// ============================================================
// Voz sincronizada con las pantallas
// ============================================================
// - Cambio de fase: corta YA cualquier audio y retiene la voz hasta que la pantalla nueva
//   esté montada y visible (la libera useAriaScreenReady() en cada pantalla).
// - Historia abierta: solo hablan sus viñetas; los mensajes del juego esperan a que se cierre.
useGameStore.subscribe((s, prev) => {
  if (s.gamePhase !== prev.gamePhase) {
    ariaVoice.interrupt();
    ariaVoice.hold('screen');
  }
  if (s.storyScene && !prev.storyScene) {
    ariaVoice.interrupt({ keepPending: true });
    ariaVoice.hold('story');
  } else if (!s.storyScene && prev.storyScene) {
    ariaVoice.interrupt({ keepPending: true });
    ariaVoice.release('story');
  }
});
