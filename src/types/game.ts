// ============================================================
// Contrato de tipos de "60 Seconds to Mars: The Solar Storm Protocol"
// ============================================================

export type GamePhase = 'MENU' | 'PHASE_1_SCAVENGE' | 'PHASE_2_BUNKER' | 'GAME_OVER';

export type RoomId = 'greenhouse' | 'lab' | 'storage';

export type ItemId =
  | 'lead_blanket'
  | 'hydro_recycler'
  | 'osdr_seeds'
  | 'lithium_battery'
  | 'freeze_food_a'
  | 'freeze_food_b'
  | 'o2_tanks'
  | 'mag_shield_booster'
  | 'med_kit'
  | 'high_gain_antenna'
  | 'space_duct_tape'
  | 'co2_scrubbers'
  | 'tool_printer_3d'
  | 'eva_suit'
  | 'magnetic_board_game'
  | 'led_hydro_lamp'
  | 'mini_rtg'
  | 'mars_drone'
  // Ampliación a 30 objetos
  | 'algae_bioreactor'
  | 'oxygen_candle'
  | 'moxie_unit'
  | 'solar_panel_roll'
  | 'fuel_cell'
  | 'kilopower_reactor'
  | 'space_tortilla_pack'
  | 'mushroom_farm'
  | 'water_wall'
  | 'exercise_bike'
  | 'vitamin_pack'
  | 'robo_dog';

/** Rareza del objeto: cuanto más difícil la pregunta acertada, más rara la recompensa. */
export type Rarity = 'common' | 'rare' | 'epic' | 'legendary';

/** Las 5 constantes vitales del búnker (0-100). */
export interface Vitals {
  oxygen: number;
  power: number;
  food: number;
  shield: number;
  crewHealth: number;
}

export type VitalKey = keyof Vitals;

/** Sub-etapas de la Fase 1: preparado → 60 s de trivia → resumen de 4 s. */
export type Phase1Stage = 'ready' | 'quiz' | 'summary';

export type Difficulty = 'easy' | 'medium' | 'hard';

export interface TriviaQuestion {
  id: string;
  difficulty: Difficulty;
  /** Rama vital: acertar da un objeto de esta categoría. */
  category: VitalKey;
  question: string;
  /** La primera respuesta es la correcta; la interfaz las baraja. */
  answers: [string, string, string, string];
  fact: string;
}

export interface QuizAnswerRecord {
  questionId: string;
  difficulty: Difficulty;
  category: VitalKey;
  correct: boolean;
  rewardItemId: ItemId | null;
}

/** Complicación inicial por fallar una rama vital en la Fase 1. */
export interface Complication {
  category: VitalKey;
  title: string;
  /** Penalización extra diaria en esa barra (negativa). */
  dailyPenalty: number;
  /** Penalización al valor inicial de esa barra (negativa). */
  startPenalty: number;
}

// ---------------- Cápsula de Salvación (ruleta de Fase 2) ----------------
export type SpinKind = 'emergency' | 'energy' | 'science' | 'food' | 'scrap' | 'houston';

export type SalvagePrizeId =
  | 'jackpot_legendary'
  | 'double_pack'
  | 'oxygen_full'
  | 'oxygen_boost'
  | 'food_boost'
  | 'shield_overcharge'
  | 'rare_item'
  | 'upgrade_item'
  | 'repair_kit'
  | 'lowest_plus40'
  | 'dust_storm';

/** Grado de suministro (estilo "case opening"): color de la barra inferior de cada tarjeta. */
export type SupplyTier = 'standard' | 'advanced' | 'prototype' | 'legendary';

export interface SalvagePrize {
  id: SalvagePrizeId;
  label: string;
  /** Código técnico "SUPPLY // NN". */
  code: number;
  tier: SupplyTier;
  /** Premio gordo: confeti y fanfarria. */
  big: boolean;
}

export interface SalvageSpinResult {
  segmentIndex: number;
  prize: SalvagePrize;
  message: string;
  items: ItemId[];
}

/** Cambios aplicables a las barras + puntos de ciencia. */
export type Effects = Partial<Vitals> & { science?: number };

/**
 * Cómo se comporta un objeto dentro del búnker (Fase 2):
 * - machine: interruptor ON/OFF, gasta energía cada Sol.
 * - passive: siempre activo, sin interruptor.
 * - consumable: se gasta una sola vez (botón USAR).
 * - tool: herramienta reutilizable que desbloquea opciones de eventos.
 */
export type ItemKind = 'machine' | 'passive' | 'consumable' | 'tool';

export interface StationItem {
  id: ItemId;
  name: string;
  shortName: string;
  room: RoomId;
  slots: 1 | 2 | 3 | 4;
  rarity: Rarity;
  /** Rama vital a la que pertenece (se gana acertando preguntas de esta rama). */
  category: VitalKey;
  /** Energía por Sol: negativo = consume, positivo = aporta. */
  powerPerSol: number;
  kind: ItemKind;
  /** Efecto por Sol cuando la máquina está encendida (o pasivo). */
  effectPerSol?: Effects;
  /** Efecto al usar un consumible. */
  useEffect?: Effects;
  /** Puntos de daño de radiación que evita cada Sol (protección pasiva). */
  radiationReduction?: number;
  /** Texto corto que entiende un niño. */
  description: string;
  /** Píldora de ciencia real NASA OSDR / NASA. */
  nasaFact: string;
  nasaSource: string;
  /** Color tailwind base para la cuadrícula de carga. */
  color: string;
}

export type RadiationLevel = 'low' | 'moderate' | 'high' | 'extreme';

export interface EventOption {
  id: string;
  label: string;
  description: string;
  effects: Effects;
  /** Objeto que se necesita para elegir esta opción (null = libre). */
  requiredItemId: ItemId | null;
  /** Lo que dice A.R.I.A. tras elegir la opción. */
  ariaReactionVoice: string;
}

export interface DailyEvent {
  sol: number;
  title: string;
  ariaVoiceAlert: string;
  description: string;
  nasaFact: string;
  nasaSource: string;
  radiationLevel: RadiationLevel;
  options: EventOption[];
  source: 'gemini' | 'fallback';
  /** Identificador del evento de respaldo (para no repetirlos). */
  key?: string;
}

export interface NASAWeather {
  flareClass: string;
  peakTime: string; // ISO
  sourceLocation: string;
  activeRegion: number | null;
  link: string | null;
  isLive: boolean;
  /** Intensidad base derivada de la clase de llamarada. */
  intensity: RadiationLevel;
  /** De dónde salió el dato (NASA DONKI, espejo NOAA SWPC o archivo curado). */
  provider?: string;
}

/** Estudio real de NASA OSDR / GeneLab (metadatos en vivo de la API pública). */
export interface OsdrStudy {
  id: string;
  title: string;
  organism: string;
  mission: string;
  url: string;
  isLive: boolean;
}

export type NasaStatus = 'idle' | 'loading' | 'live' | 'fallback';

/** Resultado aplicado tras elegir una opción en un Sol. */
export interface SolReport {
  sol: number;
  eventTitle: string;
  optionLabel: string;
  ariaReaction: string;
  /** Diferencia real entre el inicio y el final del Sol. */
  deltas: Required<Effects>;
  /** Desglose visible de la decisión y de los efectos automáticos del Sol. */
  breakdown: { source: string; effects: Effects }[];
  harvested: boolean;
  radiationLevel: RadiationLevel;
}

export interface Debrief {
  headline: string;
  report: string;
  lessons: string[];
  bestDecision: string;
  improvementTip: string;
  source: 'gemini' | 'fallback';
}

export type Rank = 'Cadete Espacial' | 'Ingeniero de Sistemas Artemisa' | 'Comandante Marciano';

export type MissionOutcome = 'victory' | 'evacuation';

// ---------------- Historia (viñetas de cómic entre pantallas) ----------------
/** Escenas del Modo Historia: prólogo, cierre de compuertas y radio del rover en los Soles 4 y 8. */
export type StoryScene = 'prologue' | 'lockdown' | 'radio_sol4' | 'radio_sol8';

// ---------------- Enlace Deep Space Network (retraso Tierra-Marte) ----------------
export type HoustonPackageId = 'oxygen_reserve' | 'battery_patch' | 'emergency_rations';

export interface HoustonOrder {
  id: HoustonPackageId;
  /** Sol en el que llega el paquete (se pide en el Sol N y llega al empezar el Sol N+2). */
  arrivalSol: number;
}

// ---------------- Insignias coleccionables ----------------
export type BadgeId = 'solar_engineer' | 'genelab_botanist' | 'barter_master' | 'deep_space_communicator' | 'ares_hero';

/** Aviso flotante en el búnker (paquete recibido o insignia nueva). */
export interface MissionNotice {
  key: number;
  kind: 'badge' | 'delivery' | 'alert';
  title: string;
  text: string;
}

// ---------------- Minijuegos de emergencia ----------------
/** cables = Reconectar el escudo · dust = Limpiar paneles · radio = Sintonizar · leak = Tapar fugas · debris = Destruir basura espacial. */
export type MinigameKind = 'cables' | 'dust' | 'radio' | 'leak' | 'debris';

/** Qué se repara con un minijuego: una complicación de la Fase 1 o una máquina con avería puntual. */
export type RepairTarget = { type: 'complication'; vital: VitalKey } | { type: 'machine'; id: ItemId };

// ---------------- Notas de campo con foto real ----------------
export type FieldNoteSource = 'houston' | 'rover' | 'orbiter';

export interface FieldNote {
  key: number;
  /** Foto real adjunta (null si la NASA no respondió y no hay fotos). */
  photoId: string | null;
  source: FieldNoteSource;
  headline: string;
  /** Lo que dice el personaje que asoma en grande (Comandante Elena o A.R.I.A.). */
  speech: string;
  /** Carta: párrafo que conecta la foto con la aventura. */
  message: string;
  /** Suministro de Houston ya sumado a las barras (solo en envíos). */
  delivered?: { label: string; vital: VitalKey; amount: number }[];
  sol: number;
  /** El mensaje es de ánimo urgente (barra en peligro o averías). */
  urgent: boolean;
}

// ---------------- Fotos reales de Marte (NASA Image and Video Library) ----------------
export interface MarsPhoto {
  id: string;
  title: string;
  /** Fecha de publicación en la NASA (ISO). */
  date: string;
  /** URL real .jpg de images-assets.nasa.gov. */
  imageUrl: string;
  /** Resumen sencillo en español para niños. */
  summaryEs: string;
  /** Datos sacados del texto oficial (para las notas de campo). */
  sol: string | null;
  /** Quién la tomó, p. ej. "el rover Perseverance". */
  whoEs: string;
  /** Cámara, p. ej. "la cámara Mastcam-Z" ('' si no se sabe). */
  cameraEs: string;
  /** Qué muestra, p. ej. "un remolino de polvo marciano" (null si no se sabe). */
  topicEs: string | null;
  /** Descripción oficial original (inglés). */
  originalDescription: string;
  /** Página oficial de la foto. */
  link: string;
}
