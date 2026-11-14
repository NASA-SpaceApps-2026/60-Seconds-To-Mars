import type { VitalKey } from '../types/game';
import { localizeRecord } from '../i18n/core';

/**
 * Glosario contextual para cadetes de 7 a 12 años: términos científicos explicados
 * en una o dos frases, justo donde aparecen en el juego (tooltips) y en la ficha de datos NASA.
 * Bilingüe (ES / EN) con getters: siempre devuelve el idioma activo.
 */
export interface GlossaryEntry {
  term: string;
  text: string;
}

type GlossaryKey = 'sol' | 'radiation' | 'flare' | 'microgravity';

export const GLOSSARY: Record<GlossaryKey, GlossaryEntry> = localizeRecord<GlossaryKey, GlossaryEntry>(
  {
    sol: {
      term: 'Sol (día marciano)',
      text: 'Un Sol es un día marciano: dura 24 horas y 39 minutos, un poco más que un día en la Tierra. ¡Tenéis que aguantar toda la tormenta hasta que llegue el rescate!',
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
  },
  {
    sol: {
      term: 'Sol (Martian day)',
      text: 'A Sol is a Martian day: it lasts 24 hours and 39 minutes, a little longer than a day on Earth. You have to hold out through the entire storm until the rescue arrives!',
    },
    radiation: {
      term: 'Solar radiation and CMEs',
      text: 'The Sun throws out invisible energy called radiation. In a solar flare, or in a CME (coronal mass ejection, a giant cloud of particles), a huge amount arrives all at once. Mars has almost no magnetic field to protect it, so the space base shielding is your shield.',
    },
    flare: {
      term: 'Solar flare (class X)',
      text: 'A flare is a huge flash on the Sun. NASA ranks them with letters: class X flares are the most powerful. The SOHO satellite and the DONKI database keep watch on them.',
    },
    microgravity: {
      term: 'Microgravity',
      text: 'On the Space Station astronauts float because they are falling around the Earth non-stop: that is microgravity. Mars does have gravity, but only 38% of Earth\'s: if you weigh 40 kg here, you would weigh about 15 kg there.',
    },
  },
);

/** Qué significa cada velocímetro de la barra superior. */
export const VITAL_GLOSSARY: Record<VitalKey | 'science', GlossaryEntry> = localizeRecord<VitalKey | 'science', GlossaryEntry>(
  {
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
  },
  {
    oxygen: {
      term: 'Oxygen',
      text: 'The air you breathe. The air on Mars is almost all CO₂, so oxygen comes from tanks or is made by machines like MOXIE, which NASA has already tested on Mars.',
    },
    power: {
      term: 'Power',
      text: 'The electricity that runs every machine. It comes from batteries, solar panels and reactors. Below 30, the lights switch to power-saving mode.',
    },
    food: {
      term: 'Food',
      text: "The crew's rations. The boxes run out, but the greenhouse plants give new food every few Sols.",
    },
    shield: {
      term: 'Shielding',
      text: "The space base's protection against the Sun's radiation. Below 30, the crew's health starts to suffer.",
    },
    crewHealth: {
      term: 'Health',
      text: 'How Leo, Vega and Max are feeling. It drops with little food, little oxygen or lots of radiation, and goes up when everything is fine.',
    },
    science: {
      term: 'Science',
      text: 'Points for the discoveries you send to Earth. NASA scientists learn from your mission!',
    },
  },
);
