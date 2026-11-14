import type { SalvagePrize, SalvagePrizeId, SpinKind, SupplyTier } from '../types/game';
import { localizeRecord } from '../i18n/core';

/** Premios posibles de la Cápsula Orbital (los iconos viven en components/icons.tsx). */
export const SALVAGE_PRIZES: Record<SalvagePrizeId, SalvagePrize> = localizeRecord<SalvagePrizeId, SalvagePrize>({
  jackpot_legendary: { id: 'jackpot_legendary', label: 'Legendario NASA', code: 1, tier: 'legendary', big: true },
  double_pack: { id: 'double_pack', label: 'Pack Doble de Objetos', code: 2, tier: 'prototype', big: true },
  oxygen_full: { id: 'oxygen_full', label: 'Recarga Total de O2', code: 3, tier: 'prototype', big: true },
  oxygen_boost: { id: 'oxygen_boost', label: '+25 Oxígeno', code: 4, tier: 'standard', big: false },
  food_boost: { id: 'food_boost', label: '+25 Comida', code: 5, tier: 'standard', big: false },
  shield_overcharge: { id: 'shield_overcharge', label: 'Escudo Sobrecargado', code: 6, tier: 'prototype', big: true },
  rare_item: { id: 'rare_item', label: 'Objeto Raro', code: 7, tier: 'advanced', big: false },
  upgrade_item: { id: 'upgrade_item', label: 'Objeto Mejorado', code: 8, tier: 'prototype', big: true },
  repair_kit: { id: 'repair_kit', label: 'Kit de Reparación', code: 9, tier: 'advanced', big: false },
  lowest_plus40: { id: 'lowest_plus40', label: '+40 a la barra en peligro', code: 10, tier: 'prototype', big: true },
  dust_storm: { id: 'dust_storm', label: 'Tormenta de Polvo (+5 Energía)', code: 11, tier: 'standard', big: false },
}, {
  jackpot_legendary: { label: 'NASA Legendary' },
  double_pack: { label: 'Double Item Pack' },
  oxygen_full: { label: 'Full O2 Refill' },
  oxygen_boost: { label: '+25 Oxygen' },
  food_boost: { label: '+25 Food' },
  shield_overcharge: { label: 'Overcharged Shield' },
  rare_item: { label: 'Rare Item' },
  upgrade_item: { label: 'Upgraded Item' },
  repair_kit: { label: 'Repair Kit' },
  lowest_plus40: { label: '+40 to the bar in danger' },
  dust_storm: { label: 'Dust Storm (+5 Power)' },
});

/** Grados de suministro estilo CS:GO (color de la barra inferior de la tarjeta). */
export const SUPPLY_TIER_META: Record<SupplyTier, { label: string; color: string }> = localizeRecord<SupplyTier, { label: string; color: string }>({
  standard: { label: 'Estándar', color: '#3b82f6' },
  advanced: { label: 'Avanzado', color: '#8b5cf6' },
  prototype: { label: 'Prototipo', color: '#ec4899' },
  legendary: { label: 'Legendario NASA', color: '#f59e0b' },
}, { standard: { label: 'Standard' }, advanced: { label: 'Advanced' }, prototype: { label: 'Prototype' }, legendary: { label: 'NASA Legendary' } });

/** Contenido de cada cápsula (8 entradas). La tirada se pondera por rareza con TIER_WEIGHTS (repetir un premio lo hace aún más probable). */
export const WHEELS: Record<SpinKind, SalvagePrizeId[]> = {
  emergency: ['oxygen_full', 'lowest_plus40', 'shield_overcharge', 'rare_item', 'repair_kit', 'food_boost', 'lowest_plus40', 'dust_storm'],
  energy: ['oxygen_boost', 'rare_item', 'food_boost', 'dust_storm', 'oxygen_full', 'rare_item', 'food_boost', 'dust_storm'],
  science: ['jackpot_legendary', 'repair_kit', 'lowest_plus40', 'double_pack', 'shield_overcharge', 'dust_storm', 'repair_kit', 'lowest_plus40'],
  food: ['jackpot_legendary', 'repair_kit', 'lowest_plus40', 'double_pack', 'shield_overcharge', 'dust_storm', 'repair_kit', 'lowest_plus40'],
  scrap: ['upgrade_item', 'jackpot_legendary', 'double_pack', 'dust_storm', 'upgrade_item', 'lowest_plus40', 'rare_item', 'dust_storm'],
  // Contenedor Extra de Suministros que llega con cada envío de Houston (sin premios vacíos)
  houston: ['rare_item', 'oxygen_full', 'double_pack', 'repair_kit', 'shield_overcharge', 'jackpot_legendary', 'food_boost', 'lowest_plus40'],
};

export const SPIN_COSTS = {
  energy: { power: 20, minPower: 25 },
  science: { science: 15 },
  food: { food: 20, minFood: 25 },
} as const;

export const SPIN_META: Record<SpinKind, { title: string; cost: string; description: string }> = localizeRecord<SpinKind, { title: string; cost: string; description: string }>({
  emergency: { title: 'Cápsula de Emergencia', cost: 'GRATIS', description: '1 vez cuando alguna barra baja de 30 (o si la Fase 1 fue mal).' },
  energy: { title: 'Cápsula Energética', cost: '−20 Energía', description: 'Oxígeno, Comida y Objetos Raros.' },
  science: { title: 'Cápsula Científica', cost: '−15 Ciencia', description: 'Legendarios NASA, kits de reparación y recargas de +40.' },
  food: { title: 'Cápsula Científica (pago en comida)', cost: '−20 Comida', description: 'El mismo contenido científico, pagando con comida.' },
  houston: { title: 'Contenedor de Houston', cost: 'GRATIS', description: 'Llega de la Tierra con cada paquete de la Deep Space Network.' },
  scrap: { title: 'Trueque de Chatarra', cost: 'Desmonta 1 objeto', description: 'Recicla un objeto para intentar conseguir uno mejor.' },
}, {
  emergency: { title: 'Emergency Capsule', cost: 'FREE', description: 'Once, when any bar drops below 30 (or if Phase 1 went badly).' },
  energy: { title: 'Energy Capsule', cost: '−20 Power', description: 'Oxygen, Food and Rare Items.' },
  science: { title: 'Science Capsule', cost: '−15 Science', description: 'NASA Legendaries, repair kits and +40 refills.' },
  food: { title: 'Science Capsule (paid in food)', cost: '−20 Food', description: 'The same science contents, paid with food.' },
  houston: { title: 'Houston Container', cost: 'FREE', description: 'Arrives from Earth with every Deep Space Network package.' },
  scrap: { title: 'Scrap Trade', cost: 'Take apart 1 item', description: 'Recycle an item to try to get a better one.' },
});

/**
 * Peso de cada grado en la tirada: lo común sale mucho más que lo legendario.
 * Probabilidad de un premio = peso de su grado × veces que aparece en la cápsula / suma total.
 */
export const TIER_WEIGHTS: Record<SupplyTier, number> = {
  standard: 50,
  advanced: 26,
  prototype: 12,
  legendary: 3,
};

/** Elige un premio de la cápsula ponderado por rareza (no uniforme). */
export function pickWeightedPrize(kind: SpinKind, random: () => number = Math.random): SalvagePrizeId {
  const wheel = WHEELS[kind];
  const weights = wheel.map((id) => TIER_WEIGHTS[SALVAGE_PRIZES[id].tier]);
  const total = weights.reduce((a, b) => a + b, 0);
  let roll = random() * total;
  for (let i = 0; i < wheel.length; i++) {
    roll -= weights[i];
    if (roll < 0) return wheel[i];
  }
  return wheel[wheel.length - 1];
}

/** Probabilidad (0-1) de cada premio distinto de una cápsula, para mostrarla en la interfaz. */
export function prizeOdds(kind: SpinKind): Partial<Record<SalvagePrizeId, number>> {
  const wheel = WHEELS[kind];
  const total = wheel.reduce((sum, id) => sum + TIER_WEIGHTS[SALVAGE_PRIZES[id].tier], 0);
  const odds: Partial<Record<SalvagePrizeId, number>> = {};
  for (const id of wheel) odds[id] = (odds[id] ?? 0) + TIER_WEIGHTS[SALVAGE_PRIZES[id].tier] / total;
  return odds;
}
