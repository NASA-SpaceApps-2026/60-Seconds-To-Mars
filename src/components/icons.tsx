/**
 * Iconografía única del juego (cero emojis Unicode): todo icono es un vector de lucide-react.
 * Los datos (stationItems, salvagePrizes, store) no guardan iconos; se resuelven aquí por id.
 */
import {
  AirVent,
  Ambulance,
  Atom,
  Award,
  BatteryCharging,
  BatteryFull,
  Bike,
  Bot,
  Box,
  Boxes,
  Carrot,
  CircleArrowUp,
  Cylinder,
  Droplets,
  Factory,
  Fan,
  Flame,
  FlaskConical,
  Gift,
  HeartPulse,
  Leaf,
  Lightbulb,
  Magnet,
  Package,
  PersonStanding,
  Pill,
  Plane,
  Printer,
  Puzzle,
  Radiation,
  Radio,
  Recycle,
  Sandwich,
  SatelliteDish,
  Shield,
  ShieldHalf,
  ShieldPlus,
  SolarPanel,
  Sprout,
  Stethoscope,
  Toolbox,
  Tornado,
  Wind,
  Wrench,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import type { ItemId, SalvagePrizeId, VitalKey } from '../types/game';

export type ResourceKey = VitalKey | 'science';

/** Icono de cada recurso (barras vitales + ciencia). */
export const RESOURCE_ICONS: Record<ResourceKey, LucideIcon> = {
  oxygen: Wind,
  power: Zap,
  food: Sprout,
  shield: Shield,
  crewHealth: HeartPulse,
  science: Radio,
};

/** Icono de cada uno de los 30 objetos de la estación. */
export const ITEM_ICONS: Record<ItemId, LucideIcon> = {
  co2_scrubbers: Fan,
  o2_tanks: Cylinder,
  oxygen_candle: Flame,
  algae_bioreactor: FlaskConical,
  hydro_recycler: Recycle,
  moxie_unit: Factory,
  fuel_cell: BatteryCharging,
  solar_panel_roll: SolarPanel,
  lithium_battery: BatteryFull,
  mini_rtg: Radiation,
  kilopower_reactor: Atom,
  freeze_food_a: Package,
  freeze_food_b: Box,
  space_tortilla_pack: Sandwich,
  led_hydro_lamp: Lightbulb,
  mushroom_farm: Leaf,
  osdr_seeds: Sprout,
  space_duct_tape: Toolbox,
  tool_printer_3d: Printer,
  mars_drone: Plane,
  water_wall: Droplets,
  eva_suit: PersonStanding,
  lead_blanket: ShieldHalf,
  mag_shield_booster: Magnet,
  med_kit: Stethoscope,
  vitamin_pack: Pill,
  magnetic_board_game: Puzzle,
  exercise_bike: Bike,
  high_gain_antenna: SatelliteDish,
  robo_dog: Bot,
};

/** Icono de cada premio de la Cápsula Orbital. */
export const PRIZE_ICONS: Record<SalvagePrizeId, LucideIcon> = {
  jackpot_legendary: Award,
  double_pack: Boxes,
  oxygen_full: Wind,
  oxygen_boost: AirVent,
  food_boost: Carrot,
  shield_overcharge: ShieldPlus,
  rare_item: Gift,
  upgrade_item: CircleArrowUp,
  repair_kit: Wrench,
  lowest_plus40: Ambulance,
  dust_storm: Tornado,
};

interface IconProps {
  className?: string;
  strokeWidth?: number;
}

export function ItemIcon({ id, className = 'h-5 w-5', strokeWidth = 1.75 }: IconProps & { id: ItemId }) {
  const Icon = ITEM_ICONS[id];
  return <Icon className={className} strokeWidth={strokeWidth} aria-hidden />;
}

export function ResourceIcon({ k, className = 'h-4 w-4', strokeWidth = 1.75 }: IconProps & { k: ResourceKey }) {
  const Icon = RESOURCE_ICONS[k];
  return <Icon className={className} strokeWidth={strokeWidth} aria-hidden />;
}

export function PrizeIcon({ id, className = 'h-6 w-6', strokeWidth = 1.75 }: IconProps & { id: SalvagePrizeId }) {
  const Icon = PRIZE_ICONS[id];
  return <Icon className={className} strokeWidth={strokeWidth} aria-hidden />;
}
