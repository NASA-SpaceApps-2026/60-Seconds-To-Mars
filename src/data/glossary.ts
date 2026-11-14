import type { VitalKey } from '../types/game';

/**
 * Glosario contextual para cadetes de 7 a 12 años: términos científicos explicados
 * en una o dos frases, justo donde aparecen en el juego (tooltips) y en la ficha de datos NASA.
 */
export interface GlossaryEntry {
  term: string;
  text: string;
}

export const GLOSSARY = {
  sol: {
    term: 'Sol (día marciano)',
    text: 'Un Sol es un día marciano: dura 24 horas y 39 minutos, un poco más que un día en la Tierra. ¡Tenéis que aguantar 10 Soles hasta que llegue el rescate!',
  },
  radiation: {
    term: 'Radiación solar y CME',
    text: 'El Sol lanza energía invisible llamada radiación. En una llamarada solar, o en una CME (eyección de masa coronal, una nube gigante de partículas), llega muchísima de golpe. Marte casi no tiene campo magnético que le proteja, así que el blindaje de la base espacial es vuestro escudo.',
  },
  flare: {
    term: 'Llamarada solar (clase X)',
    text: 'Una llamarada es un fogonazo enorme en el Sol. La NASA las clasifica con letras: las de clase X son las más potentes. El satélite SOHO y la base de datos DONKI las vigilan.',
  },
  microgravity: {
    term: 'Microgravedad',
    text: 'En la Estación Espacial los astronautas flotan porque están cayendo alrededor de la Tierra sin parar: eso es la microgravedad. En Marte sí hay gravedad, pero solo un 38 % de la de la Tierra: si pesas 40 kg aquí, allí pesarías unos 15 kg.',
  },
} satisfies Record<string, GlossaryEntry>;

/** Qué significa cada velocímetro de la barra superior. */
export const VITAL_GLOSSARY: Record<VitalKey | 'science', GlossaryEntry> = {
  oxygen: {
    term: 'Oxígeno',
    text: 'El aire que respiráis. El aire de Marte es casi todo CO₂, así que el oxígeno sale de tanques o lo fabrican máquinas como MOXIE, que ya lo probó la NASA en Marte.',
  },
  power: {
    term: 'Energía',
    text: 'La electricidad que mueve todas las máquinas. Viene de baterías, paneles solares y reactores. Si baja de 30, las luces entran en modo ahorro.',
  },
  food: {
    term: 'Comida',
    text: 'Las raciones de la tripulación. Las cajas se acaban, pero las plantas del invernadero dan comida nueva cada pocos Soles.',
  },
  shield: {
    term: 'Blindaje',
    text: 'La protección de la base espacial contra la radiación del Sol. Si baja de 30, la salud de la tripulación empieza a sufrir.',
  },
  crewHealth: {
    term: 'Salud',
    text: 'Cómo se encuentran Leo, Vega y Max. Baja con poca comida, poco oxígeno o mucha radiación, y sube cuando todo va bien.',
  },
  science: {
    term: 'Ciencia',
    text: 'Puntos por los descubrimientos que enviáis a la Tierra. ¡Los científicos de la NASA aprenden de vuestra misión!',
  },
};
