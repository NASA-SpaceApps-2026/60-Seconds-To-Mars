import type { DailyEvent, NASAWeather } from '../types/game';

/**
 * Llamaradas solares REALES archivadas de NASA DONKI (ciclo solar 25).
 * Se usan si la API de la NASA no responde (sin red, CORS o límite de DEMO_KEY).
 */
export const ARCHIVED_FLARES: NASAWeather[] = [
  {
    flareClass: 'X9.0',
    peakTime: '2024-10-03T12:18:00Z',
    sourceLocation: 'S15E18',
    activeRegion: 13842,
    link: 'https://kauai.ccmc.gsfc.nasa.gov/DONKI/search/',
    isLive: false,
    intensity: 'extreme',
  },
  {
    flareClass: 'X8.7',
    peakTime: '2024-05-14T16:51:00Z',
    sourceLocation: 'S19W89',
    activeRegion: 13664,
    link: 'https://kauai.ccmc.gsfc.nasa.gov/DONKI/search/',
    isLive: false,
    intensity: 'extreme',
  },
  {
    flareClass: 'X5.8',
    peakTime: '2024-05-11T01:23:00Z',
    sourceLocation: 'S15W45',
    activeRegion: 13664,
    link: 'https://kauai.ccmc.gsfc.nasa.gov/DONKI/search/',
    isLive: false,
    intensity: 'extreme',
  },
  {
    flareClass: 'X1.8',
    peakTime: '2024-10-09T01:56:00Z',
    sourceLocation: 'N13W08',
    activeRegion: 13848,
    link: 'https://kauai.ccmc.gsfc.nasa.gov/DONKI/search/',
    isLive: false,
    intensity: 'high',
  },
];

export type FallbackEvent = Omit<DailyEvent, 'sol' | 'source'> & { key: string };

/**
 * 10 eventos completos de respaldo. Cada uno tiene al menos una opción libre
 * (requiredItemId: null) para que el jugador nunca se quede bloqueado.
 */
export const FALLBACK_EVENTS: FallbackEvent[] = [
  {
    key: 'cme_arrival',
    title: '¡Llega el frente de la tormenta solar!',
    ariaVoiceAlert:
      '¡Atención, tripulación! La nube de partículas del Sol acaba de llegar a Marte. Los detectores de radiación están pitando.',
    description:
      'La Eyección de Masa Coronal que detectó NASA DONKI ha alcanzado la base. Una lluvia de protones rápidos golpea el búnker. Tenéis que decidir cómo proteger a la tripulación hoy.',
    nasaFact:
      'Una Eyección de Masa Coronal (CME) es una nube gigante de gas del Sol que puede viajar a más de 1.000 km por segundo. NASA DONKI registra cada una para avisar a las misiones.',
    nasaSource: 'NASA DONKI – Space Weather Database',
    radiationLevel: 'extreme',
    options: [
      {
        id: 'a',
        label: 'Cubrir las literas con la Manta de Plomo',
        description: 'Arrastrar la manta pesada cansa mucho y hace respirar más.',
        effects: { shield: 15, oxygen: -6 },
        requiredItemId: 'lead_blanket',
        ariaReactionVoice: '¡Manta colocada! La radiación rebota en el plomo. Buen trabajo.',
      },
      {
        id: 'b',
        label: 'Desviar energía al escudo del búnker',
        description: 'El escudo sube mucho, pero la batería sufre.',
        effects: { shield: 20, power: -22 },
        requiredItemId: null,
        ariaReactionVoice: 'Energía desviada al escudo. Las baterías han bajado bastante.',
      },
      {
        id: 'c',
        label: 'Refugiarse en el núcleo con las provisiones',
        description: 'Os apretáis en la zona más protegida usando las cajas como pared.',
        effects: { shield: 8, food: -8, crewHealth: -5 },
        requiredItemId: null,
        ariaReactionVoice: 'Refugio improvisado listo. Un poco incómodo, pero funciona.',
      },
    ],
  },
  {
    key: 'water_leak',
    title: 'Fuga en el filtro de agua',
    ariaVoiceAlert: 'Detecto una gota flotando cerca del filtro de agua. Tenemos una pequeña fuga.',
    description:
      'Las vibraciones de la tormenta han aflojado una junta del sistema de agua. Si no la arregláis, perderéis agua, y con ella, oxígeno.',
    nasaFact:
      'En la ISS el oxígeno se fabrica separando el agua en hidrógeno y oxígeno con electricidad (electrólisis). ¡Por eso cada gota de agua es tan importante!',
    nasaSource: 'NASA ECLSS – Oxygen Generation System',
    radiationLevel: 'moderate',
    options: [
      {
        id: 'a',
        label: 'Sellar la junta con Cinta Kapton',
        description: 'Reparación rápida y barata.',
        effects: { power: -3, oxygen: 4 },
        requiredItemId: 'space_duct_tape',
        ariaReactionVoice: '¡Fuga sellada! La cinta Kapton aguanta frío, calor y radiación.',
      },
      {
        id: 'b',
        label: 'Reparación completa con soldador',
        description: 'Queda perfecta, pero gasta mucha energía.',
        effects: { power: -18, oxygen: 5 },
        requiredItemId: null,
        ariaReactionVoice: 'Soldadura terminada. El soldador ha gastado mucha batería.',
      },
      {
        id: 'c',
        label: 'Cerrar esa tubería y aguantar',
        description: 'No gastáis energía, pero perdéis el agua de ese circuito.',
        effects: { oxygen: -14 },
        requiredItemId: null,
        ariaReactionVoice: 'Tubería cerrada. Perdemos algo de agua y de oxígeno.',
      },
    ],
  },
  {
    key: 'bacteria',
    title: 'Bacterias rebeldes en el laboratorio',
    ariaVoiceAlert: 'Mis sensores biológicos detectan bacterias creciendo más rápido de lo normal.',
    description:
      'En el espacio algunas bacterias se vuelven más fuertes. Una muestra del laboratorio se ha escapado de su placa y la tripulación empieza a sentirse algo floja.',
    nasaFact:
      'En el transbordador Atlantis (misión STS-115) se descubrió que la bacteria Salmonella se volvía más fuerte en microgravedad. Los datos están en NASA GeneLab / OSDR.',
    nasaSource: 'NASA OSDR / GeneLab – STS-115',
    radiationLevel: 'moderate',
    options: [
      {
        id: 'a',
        label: 'Usar el Botiquín Biológico',
        description: 'Gastas el botiquín, pero la tripulación se recupera del todo.',
        effects: { crewHealth: 25, food: -3 },
        requiredItemId: 'med_kit',
        ariaReactionVoice: 'Tratamiento aplicado. La tripulación ya sonríe otra vez.',
      },
      {
        id: 'b',
        label: 'Esterilizar con luz ultravioleta',
        description: 'Las lámparas UV limpian todo, pero gastan energía.',
        effects: { crewHealth: 5, power: -18 },
        requiredItemId: null,
        ariaReactionVoice: 'Laboratorio esterilizado. Las bacterias no tienen nada que hacer.',
      },
      {
        id: 'c',
        label: 'Aislar el laboratorio',
        description: 'Cerráis la puerta y ventiláis: se pierde aire y algo de salud.',
        effects: { oxygen: -8, crewHealth: -10 },
        requiredItemId: null,
        ariaReactionVoice: 'Laboratorio aislado. Habrá que tener paciencia.',
      },
    ],
  },
  {
    key: 'stressed_plants',
    title: 'Las plantas están estresadas',
    ariaVoiceAlert: 'Las hojas del invernadero se están poniendo mustias por la radiación.',
    description:
      'La radiación de la tormenta estresa a las plantas. Si las cuidáis, crecerán más rápido; si no, habrá que tirar de las reservas.',
    nasaFact:
      'Los experimentos de NASA GeneLab con la planta Arabidopsis muestran que en el espacio las plantas activan genes de estrés, como cuando pasan calor o sed en la Tierra.',
    nasaSource: 'NASA OSDR / GeneLab – Arabidopsis',
    radiationLevel: 'moderate',
    options: [
      {
        id: 'a',
        label: 'Luz UV extra para las Semillas OSDR',
        description: 'Las plantas crecen a toda velocidad, pero la lámpara gasta mucho.',
        effects: { food: 15, power: -14 },
        requiredItemId: 'osdr_seeds',
        ariaReactionVoice: '¡Las lechugas rojas brillan de felicidad! Comida asegurada.',
      },
      {
        id: 'b',
        label: 'Abrir las Raciones A',
        description: 'Comida rica y segura, pero se acaba para siempre.',
        effects: { food: 22, oxygen: -2 },
        requiredItemId: 'freeze_food_a',
        ariaReactionVoice: 'Raciones abiertas. ¡Hoy hay menú especial!',
      },
      {
        id: 'c',
        label: 'Racionar la comida',
        description: 'Coméis menos para ahorrar. La tripulación se cansa.',
        effects: { food: 4, crewHealth: -10 },
        requiredItemId: null,
        ariaReactionVoice: 'Raciones reducidas. Recordad beber agua y descansar.',
      },
    ],
  },
  {
    key: 'cold_night',
    title: 'Noche marciana helada',
    ariaVoiceAlert: 'La temperatura exterior baja a ochenta grados bajo cero. La calefacción trabaja a tope.',
    description:
      'Sin la luz del Sol, la noche marciana es muy fría. La calefacción del búnker se come la energía a toda velocidad.',
    nasaFact:
      'El rover Curiosity ha medido noches de hasta −80 °C en el cráter Gale. ¡Más frío que el lugar más frío de la Antártida en un día normal!',
    nasaSource: 'NASA Curiosity – Estación meteorológica REMS',
    radiationLevel: 'low',
    options: [
      {
        id: 'a',
        label: 'Conectar la Batería Auxiliar',
        description: 'La batería mantiene el calor, pero hay que bajar el escudo un rato.',
        effects: { power: 18, shield: -6 },
        requiredItemId: 'lithium_battery',
        ariaReactionVoice: 'Batería conectada. Calentito y con energía de sobra.',
      },
      {
        id: 'b',
        label: 'Bajar la calefacción y usar mantas',
        description: 'Ahorráis energía, pero pasáis frío.',
        effects: { power: 8, crewHealth: -12 },
        requiredItemId: null,
        ariaReactionVoice: 'Calefacción al mínimo. ¡Abrigaos bien!',
      },
      {
        id: 'c',
        label: 'Calefacción al máximo',
        description: 'Todos cómodos, pero la batería sufre.',
        effects: { power: -20, crewHealth: 5 },
        requiredItemId: null,
        ariaReactionVoice: 'Calefacción al máximo. Se está muy bien, pero la batería baja.',
      },
    ],
  },
  {
    key: 'earth_window',
    title: 'Ventana de comunicación con la Tierra',
    ariaVoiceAlert: 'La Tierra está bien alineada. Tenemos una ventana para enviar datos científicos.',
    description:
      'Los científicos de la NASA quieren las medidas de radiación de la tormenta. Enviarlas cuesta energía, pero ¡la ciencia ayuda a futuras misiones!',
    nasaFact:
      'Las señales de Marte tardan entre 3 y 22 minutos en llegar a la Tierra, según dónde estén los dos planetas. ¡No se puede tener una conversación en directo!',
    nasaSource: 'NASA Deep Space Network',
    radiationLevel: 'low',
    options: [
      {
        id: 'a',
        label: 'Transmitir con la Antena Deep Space',
        description: 'Muchísima ciencia con poco gasto.',
        effects: { science: 40, power: -8 },
        requiredItemId: 'high_gain_antenna',
        ariaReactionVoice: 'Datos enviados. ¡En la Tierra van a alucinar con estas medidas!',
      },
      {
        id: 'b',
        label: 'Enviar un mensaje corto por radio de emergencia',
        description: 'Poca ciencia y mucho gasto.',
        effects: { science: 10, power: -15 },
        requiredItemId: null,
        ariaReactionVoice: 'Mensaje corto enviado. Algo es algo.',
      },
      {
        id: 'c',
        label: 'Guardar la energía y no transmitir',
        description: 'La tripulación se queda con ganas de hablar con casa.',
        effects: { crewHealth: -6, power: 3 },
        requiredItemId: null,
        ariaReactionVoice: 'Entendido, silencio de radio. Os echan de menos en la Tierra.',
      },
    ],
  },
  {
    key: 'second_flare',
    title: '¡Segunda llamarada solar!',
    ariaVoiceAlert: 'Alerta. NASA DONKI informa de otra llamarada potente. Llegan más partículas.',
    description:
      'La misma región activa del Sol ha vuelto a explotar. El escudo del búnker necesita refuerzos otra vez.',
    nasaFact:
      'Las llamaradas se clasifican como A, B, C, M y X. Cada letra es 10 veces más potente que la anterior: una X es 10 veces más fuerte que una M.',
    nasaSource: 'NASA DONKI / NOAA – Clasificación de llamaradas',
    radiationLevel: 'high',
    options: [
      {
        id: 'a',
        label: 'Activar la Bobina de Escudo Magnético a tope',
        description: 'Un campo magnético desvía las partículas, pero gasta mucha energía.',
        effects: { shield: 25, power: -20 },
        requiredItemId: 'mag_shield_booster',
        ariaReactionVoice: '¡Campo magnético al máximo! Las partículas se desvían como en la Tierra.',
      },
      {
        id: 'b',
        label: 'Recolocar la Manta de Plomo',
        description: 'Más protección moviendo la manta pesada.',
        effects: { shield: 15, oxygen: -6 },
        requiredItemId: 'lead_blanket',
        ariaReactionVoice: 'Manta recolocada. Bien pensado.',
      },
      {
        id: 'c',
        label: 'Aguantar sin hacer nada',
        description: 'No gastáis nada, pero la radiación hace daño.',
        effects: { shield: -12, crewHealth: -8 },
        requiredItemId: null,
        ariaReactionVoice: 'Aguantando. La radiación ha dejado huella en el escudo.',
      },
    ],
  },
  {
    key: 'co2_rise',
    title: 'El aire se está cargando de CO2',
    ariaVoiceAlert: 'El nivel de dióxido de carbono sube. Si sentís dolor de cabeza, es por eso.',
    description:
      'Con todos encerrados tantos días, el aire del búnker tiene cada vez más CO2. Hay que limpiarlo.',
    nasaFact:
      'En el Apolo 13 los astronautas tuvieron que unir filtros de CO2 cuadrados con agujeros redondos usando cinta, cartón y bolsas. ¡La ingeniería salvó la misión!',
    nasaSource: 'NASA – Misión Apolo 13',
    radiationLevel: 'moderate',
    options: [
      {
        id: 'a',
        label: 'Cambiar los Cartuchos de CO2',
        description: 'Aire limpio con muy poco gasto.',
        effects: { oxygen: 15, power: -5 },
        requiredItemId: 'co2_scrubbers',
        ariaReactionVoice: 'Cartuchos nuevos. ¡Qué aire tan fresquito!',
      },
      {
        id: 'b',
        label: 'Abrir los Tanques de Oxígeno',
        description: 'Gran chorro de oxígeno, pero se gastan para siempre.',
        effects: { oxygen: 28, power: -2 },
        requiredItemId: 'o2_tanks',
        ariaReactionVoice: 'Tanques abiertos. Respirad hondo, tripulación.',
      },
      {
        id: 'c',
        label: 'Dormir más para respirar menos',
        description: 'Durmiendo se gasta menos aire, pero no se trabaja.',
        effects: { oxygen: 8, crewHealth: -6, science: -5 },
        requiredItemId: null,
        ariaReactionVoice: 'Modo siesta activado. Dulces sueños marcianos.',
      },
    ],
  },
  {
    key: 'bone_loss',
    title: 'Huesos y músculos cansados',
    ariaVoiceAlert: 'El chequeo médico muestra que los músculos de la tripulación se están debilitando.',
    description:
      'Tantos días encerrados y con poca gravedad hacen que los huesos y los músculos se debiliten. ¡Hay que moverse!',
    nasaFact:
      'En el espacio los astronautas pueden perder entre un 1 y un 1,5 % de masa ósea cada mes. Por eso en la ISS hacen unas 2 horas de ejercicio al día.',
    nasaSource: 'NASA Human Research Program',
    radiationLevel: 'low',
    options: [
      {
        id: 'a',
        label: 'Usar el Botiquín Biológico',
        description: 'Vitaminas y medicinas del botiquín. Se gasta.',
        effects: { crewHealth: 25, food: -3 },
        requiredItemId: 'med_kit',
        ariaReactionVoice: 'Vitaminas tomadas. ¡Huesos fuertes como el titanio!',
      },
      {
        id: 'b',
        label: 'Sesión de ejercicio intenso',
        description: 'Os ponéis en forma, pero coméis y respiráis más.',
        effects: { crewHealth: 15, food: -12, oxygen: -8 },
        requiredItemId: null,
        ariaReactionVoice: '¡Uno, dos, uno, dos! Gran entrenamiento.',
      },
      {
        id: 'c',
        label: 'Descansar y ahorrar energía',
        description: 'Ahorráis, pero el cuerpo sigue debilitándose.',
        effects: { crewHealth: -8, power: 5 },
        requiredItemId: null,
        ariaReactionVoice: 'Descanso registrado. Mañana habrá que moverse.',
      },
    ],
  },
  {
    key: 'storm_ends',
    title: 'La tormenta se aleja',
    ariaVoiceAlert: 'Buenas noticias. La radiación está bajando. Hora de preparar la base para salir.',
    description:
      'Las partículas solares se van calmando. Antes de abrir las compuertas, hay que elegir qué sistemas dejar listos.',
    nasaFact:
      'El instrumento RAD del rover Curiosity mide la radiación en la superficie de Marte desde 2012. Sus datos ayudan a diseñar refugios para los futuros astronautas.',
    nasaSource: 'NASA Curiosity – Radiation Assessment Detector (RAD)',
    radiationLevel: 'low',
    options: [
      {
        id: 'a',
        label: 'Recargar el aire con el Reciclador ECLSS',
        description: 'Aire de sobra para salir, pero gasta energía.',
        effects: { oxygen: 20, power: -14 },
        requiredItemId: 'hydro_recycler',
        ariaReactionVoice: 'Aire recargado. ¡Listos para la siguiente aventura!',
      },
      {
        id: 'b',
        label: 'Reparar los paneles con Cinta Kapton',
        description: 'Recuperáis energía, pero salir fuera cansa.',
        effects: { power: 20, crewHealth: -5 },
        requiredItemId: 'space_duct_tape',
        ariaReactionVoice: 'Paneles reparados. La energía vuelve a subir.',
      },
      {
        id: 'c',
        label: 'Medir la radiación para la NASA',
        description: 'Ciencia muy útil, pero gasta energía.',
        effects: { science: 15, power: -10 },
        requiredItemId: null,
        ariaReactionVoice: 'Medidas guardadas. ¡Los científicos estarán orgullosos!',
      },
    ],
  },
];

/** Datos de ciencia extra para la pantalla de carga y el informe final. */
export const LOADING_MESSAGES = [
  'Recibiendo telemetría de NASA DONKI y satélites orbitales...',
  'Sincronizando con el Mars Reconnaissance Orbiter...',
  'Leyendo sensores de radiación del búnker...',
  'Consultando la Deep Space Network...',
];
