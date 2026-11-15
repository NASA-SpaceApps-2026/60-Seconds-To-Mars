// ============================================================
// Puestos de la tripulación para la Credencial de Cadete.
// El store guarda el texto en español; se muestra en el idioma activo con cadetRoleLabel().
// ============================================================
import { tr } from '../i18n/core';

export const CADET_ROLES: { es: string; en: string }[] = [
  { es: 'Especialista de Misión', en: 'Mission Specialist' },
  { es: 'Ingeniero/a de Misión', en: 'Mission Engineer' },
  { es: 'Cadete Comandante', en: 'Cadet Commander' },
  { es: 'Piloto del Rover', en: 'Rover Pilot' },
  { es: 'Científico/a de Datos NASA', en: 'NASA Data Scientist' },
  { es: 'Botánico/a GeneLab', en: 'GeneLab Botanist' },
];

/** Puesto en el idioma activo (si no es uno de los predefinidos se muestra tal cual). */
export function cadetRoleLabel(role: string): string {
  const preset = CADET_ROLES.find((r) => r.es === role || r.en === role);
  return preset ? tr(preset.es, preset.en) : role;
}

/** Nombre que se muestra en placas e informes. */
export function cadetDisplayName(name: string): string {
  return (name.trim() || tr('CADETE', 'CADET')).toUpperCase();
}
