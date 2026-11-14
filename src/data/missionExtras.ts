import type { BadgeId, HoustonPackageId, MinigameKind, RepairTarget, VitalKey } from '../types/game';
import { localizeRecord, tr, withEnglish } from '../i18n/core';

/** Coste y retraso del Enlace Deep Space Network (Paquete de Ayuda de Houston). */
export const HOUSTON_COST_POWER = 10;
export const HOUSTON_MIN_POWER = 15;
export const HOUSTON_DELAY_SOLS = 2;
/** Pedidos máximos a Houston en toda la partida. */
export const HOUSTON_MAX_ORDERS = 3;
/** Solo 1 envío en camino: hasta que no llega a la base no se puede pedir otro. */
export const HOUSTON_MAX_IN_TRANSIT = 1;

export const HOUSTON_PACKAGES: Record<HoustonPackageId, { label: string; vital: VitalKey; amount: number }> = localizeRecord<
  HoustonPackageId,
  { label: string; vital: VitalKey; amount: number }
>(
  {
    oxygen_reserve: { label: 'Inyección de Oxígeno de Reserva', vital: 'oxygen', amount: 25 },
    battery_patch: { label: 'Parche de Software de Baterías', vital: 'power', amount: 25 },
    emergency_rations: { label: 'Raciones de Emergencia', vital: 'food', amount: 25 },
  },
  {
    oxygen_reserve: { label: 'Reserve Oxygen Injection' },
    battery_patch: { label: 'Battery Software Patch' },
    emergency_rations: { label: 'Emergency Rations' },
  },
);
export const HOUSTON_ORDER: HoustonPackageId[] = ['oxygen_reserve', 'battery_patch', 'emergency_rations'];

/** 5 insignias de misión coleccionables (texto corto para el aro del parche + condición para niños). */
export const BADGES: Record<BadgeId, { name: string; patchText: string; how: string }> = localizeRecord<BadgeId, { name: string; patchText: string; how: string }>(
  {
    solar_engineer: { name: 'Ingeniero Solar', patchText: 'INGENIERO SOLAR', how: 'Termina un Sol con la Energía en 70 o más.' },
    genelab_botanist: { name: 'Botánico GeneLab', patchText: 'BOTÁNICO GENELAB', how: 'Cosecha lechuga roja con las Semillas OSDR.' },
    barter_master: { name: 'Mecánico de Ares-IV', patchText: 'MECÁNICO ARES', how: 'Repara una avería superando un minijuego.' },
    deep_space_communicator: { name: 'Comunicador Deep Space', patchText: 'DEEP SPACE', how: 'Recibe un paquete de Houston por la Deep Space Network.' },
    ares_hero: { name: 'Héroe de Ares-IV', patchText: 'HÉROE ARES-IV', how: 'Sobrevive toda la tormenta solar.' },
  },
  {
    solar_engineer: { name: 'Solar Engineer', patchText: 'SOLAR ENGINEER', how: 'Finish a Sol with Power at 70 or more.' },
    genelab_botanist: { name: 'GeneLab Botanist', patchText: 'GENELAB BOTANIST', how: 'Harvest red lettuce with the OSDR Seeds.' },
    barter_master: { name: 'Ares-IV Mechanic', patchText: 'ARES MECHANIC', how: 'Fix a breakdown by beating a mini-game.' },
    deep_space_communicator: { name: 'Deep Space Communicator', patchText: 'DEEP SPACE', how: 'Receive a Houston package over the Deep Space Network.' },
    ares_hero: { name: 'Ares-IV Hero', patchText: 'ARES-IV HERO', how: 'Survive the entire solar storm.' },
  },
);
export const BADGE_ORDER: BadgeId[] = ['solar_engineer', 'genelab_botanist', 'barter_master', 'deep_space_communicator', 'ares_hero'];

/** Telemetría real del Cráter Jezero (Perseverance / MEDA) para el Periscopio. */
export const JEZERO_TELEMETRY: { label: string; value: string; note: string }[] = [
  withEnglish(
    { label: 'Temperatura exterior', value: '−65 °C', note: 'Media diaria medida por la estación MEDA de Perseverance.' },
    { label: 'Outside temperature', note: "Daily average measured by Perseverance's MEDA weather station." },
  ),
  withEnglish(
    { label: 'Presión atmosférica', value: '6,1 mbar', note: 'Menos del 1 % de la presión de la Tierra (1013 mbar).' },
    { label: 'Air pressure', value: '6.1 mbar', note: "Less than 1% of Earth's pressure (1013 mbar)." },
  ),
  withEnglish(
    { label: 'Composición del aire', value: '95 % CO₂', note: 'Casi todo dióxido de carbono: MOXIE lo convierte en oxígeno.' },
    { label: 'Air composition', value: '95% CO₂', note: 'Almost all carbon dioxide: MOXIE turns it into oxygen.' },
  ),
  withEnglish(
    { label: 'Gravedad', value: '0,38 g', note: 'Si pesas 40 kg en la Tierra, en Marte pesarías unos 15 kg.' },
    { label: 'Gravity', value: '0.38 g', note: 'If you weigh 40 kg on Earth, on Mars you would weigh about 15 kg.' },
  ),
];

// ---------------- Minijuegos de emergencia ----------------

type MinigameMeta = { title: string; code: string; vital: VitalKey; seconds: number; instructions: string };
export const MINIGAME_META: Record<MinigameKind, MinigameMeta> = localizeRecord<MinigameKind, MinigameMeta>({
  cables: {
    title: 'Reconectar Cables del Escudo',
    code: 'SYS-RAD',
    vital: 'shield',
    seconds: 10,
    instructions: 'Une cada terminal de la izquierda con su conector de la derecha (clic o arrastrar).',
  },
  dust: {
    title: 'Limpiar Polvo de los Paneles Solares',
    code: 'SYS-PWR',
    vital: 'power',
    seconds: 9,
    instructions: 'Pasa el ratón (o el dedo) por encima del panel como si fuera un cepillo hasta quitar todo el polvo.',
  },
  radio: {
    title: 'Sintonizar la Frecuencia con el Satélite NASA',
    code: 'SYS-COM',
    vital: 'oxygen',
    seconds: 12,
    instructions: 'Mueve Frecuencia y Amplitud hasta que tu onda se acerque a la del satélite (se pone verde) y aguanta un momento.',
  },
  leak: {
    title: 'Tapar Fugas de Oxígeno en la Tubería',
    code: 'SYS-O2',
    vital: 'oxygen',
    seconds: 9,
    instructions: 'Haz clic rápido encima de cada grieta que suelta vapor para ponerle un parche de Cinta Kapton.',
  },
  debris: {
    title: 'Destruir Basura Espacial en el Radar',
    code: 'SYS-RAD',
    vital: 'shield',
    seconds: 9,
    instructions: 'Haz clic encima de cada roca que se acerca al centro para dispararle con el láser defensivo.',
  },
}, {
  cables: {
    title: 'Reconnect the Shield Cables',
    instructions: 'Join each terminal on the left to its connector on the right (click or drag).',
  },
  dust: {
    title: 'Clean Dust off the Solar Panels',
    instructions: 'Move the mouse (or your finger) over the panel like a brush until all the dust is gone.',
  },
  radio: {
    title: 'Tune In to the NASA Satellite',
    instructions: "Move Frequency and Amplitude until your wave gets close to the satellite's (it turns green) and hold it for a moment.",
  },
  leak: {
    title: 'Patch the Oxygen Pipe Leaks',
    instructions: 'Quickly click on each crack letting out vapor to put a patch of Kapton Tape on it.',
  },
  debris: {
    title: 'Destroy Space Debris on the Radar',
    instructions: 'Click on each rock coming toward the center to zap it with the defense laser.',
  },
});

/** Dato real (NASA) para el minijuego de las fugas. */
export const leakFact = () =>
  tr(
    'Dato real NASA: fuera del hábitat la presión de Marte es de solo 6,1 mbar (menos del 1 % de la Tierra). Por eso una fuga de aire es tan peligrosa y hay que taparla rápido.',
    "Real NASA fact: outside the habitat the pressure on Mars is only 6.1 mbar (less than 1% of Earth's). That is why an air leak is so dangerous and must be patched fast.",
  );
/** Dato real (NASA) para el minijuego de la basura espacial. */
export const debrisFact = () =>
  tr(
    'Dato real NASA: la Estación Espacial Internacional ha tenido que maniobrar decenas de veces para esquivar basura espacial, y su blindaje aguanta impactos de micrometeoritos.',
    'Real NASA fact: the International Space Station has had to move dozens of times to dodge space debris, and its shielding can take micrometeorite hits.',
  );

/** Dato real de NASA sobre el polvo marciano (InSight / Perseverance). */
export const dustFact = () =>
  tr(
    'Dato real NASA: el polvo marciano cubrió los paneles del módulo InSight y su energía cayó de unos 5.000 a menos de 500 vatios-hora por Sol. Por eso Perseverance usa un generador nuclear (MMRTG).',
    "Real NASA fact: Martian dust covered the InSight lander's panels and its power dropped from about 5,000 to less than 500 watt-hours per Sol. That is why Perseverance uses a nuclear generator (MMRTG).",
  );

/** Minijuego que repara cada sistema: Blindaje → cables · Energía/Comida → paneles solares · Oxígeno/Salud → radio. */
/** Los 5 minijuegos de reparación. */
export const ALL_MINIGAMES: MinigameKind[] = ['cables', 'dust', 'radio', 'leak', 'debris'];

/** Minijuegos que encajan con cada sistema averiado (se elige uno distinto del último que salió). */
export const MINIGAME_OPTIONS_FOR_VITAL: Record<VitalKey, MinigameKind[]> = {
  shield: ['cables', 'debris'],
  power: ['dust', 'cables'],
  food: ['dust', 'leak'],
  oxygen: ['leak', 'radio'],
  crewHealth: ['radio', 'leak'],
};

/**
 * Rotación real entre los 5: normalmente uno que encaje con el sistema averiado y a veces cualquiera,
 * pero NUNCA el último jugado (así no sale siempre el de las ondas).
 */
export function pickMinigame(vital: VitalKey, last: MinigameKind | null, exclude: MinigameKind[] = []): MinigameKind {
  const avoid = new Set<MinigameKind>([...exclude, ...(last ? [last] : [])]);
  const preferred = MINIGAME_OPTIONS_FOR_VITAL[vital].filter((k) => !avoid.has(k));
  const any = ALL_MINIGAMES.filter((k) => !avoid.has(k));
  // 60 % uno propio del sistema averiado, 40 % cualquiera de los 5 (más variedad); nunca el último
  const pool = preferred.length && Math.random() < 0.6 ? preferred : any;
  const list = pool.length ? pool : ALL_MINIGAMES;
  return list[Math.floor(Math.random() * list.length)];
}

/** Probabilidad de una avería puntual de máquina al empezar cada Sol (desde el Sol 2, máx. 1 a la vez). */
export const BREAKDOWN_CHANCE = 0.2;
/** Energía que se gasta si falla el intento de reparación (se puede reintentar al Sol siguiente). */
export const REPAIR_FAIL_POWER = 5;

/** Clave única de un objetivo de reparación (para "un intento por Sol"). */
export const repairKey = (t: RepairTarget) => (t.type === 'complication' ? `c:${t.vital}` : `m:${t.id}`);
