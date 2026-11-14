import type { Complication, Difficulty, TriviaQuestion, VitalKey } from '../types/game';

/**
 * Banco de 45 preguntas para 7-12 años: 9 por rama vital (3 fáciles, 3 medias, 3 difíciles).
 * La PRIMERA respuesta es siempre la correcta (la interfaz las baraja).
 */
export const TRIVIA_QUESTIONS: TriviaQuestion[] = [
  // ======================= OXÍGENO =======================
  { id: 'ox_e1', category: 'oxygen', difficulty: 'easy', question: '¿Qué gas necesitamos respirar para vivir?', answers: ['Oxígeno', 'Helio', 'Dióxido de carbono', 'Hidrógeno'], fact: 'En la ISS el oxígeno se fabrica a bordo para que los astronautas puedan respirar.' },
  { id: 'ox_e2', category: 'oxygen', difficulty: 'easy', question: '¿Hay aire para respirar en la Luna?', answers: ['No, casi no tiene atmósfera', 'Sí, igual que en la Tierra', 'Solo por la noche', 'Solo dentro de los cráteres'], fact: 'Por eso los astronautas del Apolo necesitaban trajes con su propio oxígeno.' },
  { id: 'ox_e3', category: 'oxygen', difficulty: 'easy', question: '¿Qué gas soltamos al respirar?', answers: ['Dióxido de carbono', 'Oxígeno puro', 'Helio', 'Vapor de oro'], fact: 'En una nave hay que limpiar ese CO2 del aire con filtros, o la tripulación se marea.' },
  { id: 'ox_m1', category: 'oxygen', difficulty: 'medium', question: '¿Qué gas forma casi toda la atmósfera de Marte?', answers: ['Dióxido de carbono', 'Oxígeno', 'Helio', 'Vapor de agua'], fact: 'Alrededor del 95 % del aire de Marte es CO2: no se puede respirar.' },
  { id: 'ox_m2', category: 'oxygen', difficulty: 'medium', question: '¿Qué hacen las plantas con la luz del Sol?', answers: ['Fabrican oxígeno con la fotosíntesis', 'Se calientan y ya está', 'Brillan en la oscuridad', 'Nada, solo necesitan agua'], fact: 'Por eso los invernaderos espaciales ayudan a la vez con la comida y con el aire.' },
  { id: 'ox_m3', category: 'oxygen', difficulty: 'medium', question: '¿Qué rover de la NASA fabricó oxígeno en Marte?', answers: ['Perseverance', 'Curiosity', 'Sojourner', 'Opportunity'], fact: 'Su experimento MOXIE sacó oxígeno del aire marciano, que es casi todo CO2.' },
  { id: 'ox_h1', category: 'oxygen', difficulty: 'hard', question: '¿Cómo se fabrica el oxígeno en la Estación Espacial?', answers: ['Separando el agua con electricidad', 'Con bombonas que llegan cada día', 'Solo con plantas', 'Recogiéndolo del espacio'], fact: 'Se llama electrólisis: la electricidad parte el agua en hidrógeno y oxígeno.' },
  { id: 'ox_h2', category: 'oxygen', difficulty: 'hard', question: '¿Qué misión tuvo problemas con el CO2 y se salvó con cinta adhesiva?', answers: ['Apolo 13', 'Apolo 11', 'Artemis I', 'Voyager 1'], fact: 'Unieron filtros cuadrados con huecos redondos usando cinta, cartón y bolsas de plástico.' },
  { id: 'ox_h3', category: 'oxygen', difficulty: 'hard', question: '¿Cómo es la atmósfera de Marte comparada con la de la Tierra?', answers: ['Unas 100 veces más fina', 'Igual de gruesa', 'El doble de gruesa', 'Solo un 10 % más fina'], fact: 'La presión en Marte es menos del 1 % de la terrestre: el agua líquida hierve o se congela enseguida.' },

  // ======================= ENERGÍA =======================
  { id: 'pw_e1', category: 'power', difficulty: 'easy', question: '¿Cuál es la estrella más cercana a la Tierra?', answers: ['El Sol', 'La Luna', 'Marte', 'La Estrella Polar'], fact: 'El Sol es una estrella. Su luz tarda unos 8 minutos en llegar hasta nosotros.' },
  { id: 'pw_e2', category: 'power', difficulty: 'easy', question: '¿Qué usan muchas naves para sacar electricidad de la luz?', answers: ['Paneles solares', 'Velas', 'Molinos de viento', 'Pilas de juguete'], fact: 'Con sus enormes alas de paneles solares, la ISS entera es casi tan grande como un campo de fútbol.' },
  { id: 'pw_e3', category: 'power', difficulty: 'easy', question: '¿Qué le pasa a un panel solar por la noche?', answers: ['Deja de dar energía porque no hay luz', 'Da el doble de energía', 'Funciona igual', 'Se convierte en batería'], fact: 'Por eso las bases necesitan baterías para guardar energía para la noche.' },
  { id: 'pw_m1', category: 'power', difficulty: 'medium', question: '¿Qué rover funcionó casi 15 años en Marte con paneles solares?', answers: ['Opportunity', 'Perseverance', 'Curiosity', 'Ingenuity'], fact: 'Opportunity iba a durar 90 días y aguantó de 2004 a 2018. ¡Una tormenta de polvo tapó sus paneles!' },
  { id: 'pw_m2', category: 'power', difficulty: 'medium', question: '¿Por qué las tormentas de polvo son un problema para la energía en Marte?', answers: ['Tapan el Sol y ensucian los paneles', 'Enfrían las baterías hasta romperlas', 'Hacen que llueva', 'No son ningún problema'], fact: 'Las tormentas de polvo marcianas pueden cubrir el planeta entero durante semanas.' },
  { id: 'pw_m3', category: 'power', difficulty: 'medium', question: '¿Cuánto dura un día en Marte (un "Sol")?', answers: ['Unas 24 horas y 39 minutos', 'Unas 12 horas', 'Unas 48 horas', 'Una semana'], fact: 'Los equipos de los rovers vivían con "horario marciano" y cada día empezaban 40 minutos más tarde.' },
  { id: 'pw_h1', category: 'power', difficulty: 'hard', question: '¿Qué fuente de energía usan Curiosity y Perseverance?', answers: ['Un generador nuclear (RTG)', 'Paneles solares', 'Gasolina', 'Viento marciano'], fact: 'Un MMRTG convierte el calor del plutonio en electricidad, de día y de noche.' },
  { id: 'pw_h2', category: 'power', difficulty: 'hard', question: '¿Qué sondas lanzadas en 1977 siguen funcionando gracias a generadores RTG?', answers: ['Voyager 1 y 2', 'Apolo 11 y 12', 'El telescopio Hubble', 'Mars Pathfinder'], fact: 'Las Voyager son los objetos humanos más lejanos: ¡ya han salido de la burbuja del Sol!' },
  { id: 'pw_h3', category: 'power', difficulty: 'hard', question: '¿Qué proyecto de la NASA probó en 2018 un mini reactor para la Luna y Marte?', answers: ['Kilopower', 'MOXIE', 'Veggie', 'MAVEN'], fact: 'Su prueba se llamó KRUSTY y demostró que un reactor pequeño puede dar energía a una base.' },

  // ======================= COMIDA =======================
  { id: 'fd_e1', category: 'food', difficulty: 'easy', question: '¿Qué comen los astronautas en vez de pan para no hacer migas?', answers: ['Tortillas', 'Galletas', 'Bizcocho', 'Pan de molde'], fact: 'Las migas flotarían por la nave y podrían meterse en los ojos o en los aparatos.' },
  { id: 'fd_e2', category: 'food', difficulty: 'easy', question: '¿Qué necesita una planta para crecer?', answers: ['Luz, agua y nutrientes', 'Solo oscuridad', 'Solo arena', 'Solo hielo'], fact: 'En el espacio se usan luces LED y bolsitas con nutrientes para cultivar.' },
  { id: 'fd_e3', category: 'food', difficulty: 'easy', question: '¿Cómo se llama la comida a la que le quitan el agua para que pese menos?', answers: ['Liofilizada', 'Congelada', 'Frita', 'Hervida'], fact: 'Los astronautas le añaden agua antes de comerla. ¡Pesa muchísimo menos al despegar!' },
  { id: 'fd_m1', category: 'food', difficulty: 'medium', question: '¿Qué verdura cultivada en la ISS se comieron los astronautas en 2015?', answers: ['Lechuga roja', 'Patata', 'Zanahoria', 'Calabaza'], fact: 'Fue en el experimento Veggie. Sus datos están en el NASA Open Science Data Repository.' },
  { id: 'fd_m2', category: 'food', difficulty: 'medium', question: '¿Por qué los invernaderos espaciales tienen luz de color rosa?', answers: ['Las plantas usan sobre todo luz roja y azul', 'Por decoración', 'Para asustar a los insectos', 'Para calentar la nave'], fact: 'Mezclando LEDs rojos y azules las plantas crecen gastando poca energía.' },
  { id: 'fd_m3', category: 'food', difficulty: 'medium', question: '¿Por qué a los astronautas les gusta la comida picante en el espacio?', answers: ['El gusto se apaga un poco al subir los líquidos a la cabeza', 'Porque hace mucho frío', 'Porque así flota menos', 'Porque brilla en la oscuridad'], fact: 'Es como cuando estás resfriado: la nariz tapada hace que la comida sepa menos.' },
  { id: 'fd_h1', category: 'food', difficulty: 'hard', question: '¿Qué repositorio de la NASA guarda los datos de plantas y bacterias en el espacio?', answers: ['OSDR (Open Science Data Repository)', 'DONKI', 'Hubble', 'Deep Space Network'], fact: 'Cualquier científico del mundo puede usar esos datos gratis para investigar.' },
  { id: 'fd_h2', category: 'food', difficulty: 'hard', question: '¿Cuánto tiempo deberían aguantar sin estropearse los alimentos de una misión a Marte?', answers: ['Hasta unos 5 años', 'Una semana', 'Un mes', '100 años'], fact: 'Un viaje de ida y vuelta a Marte podría durar entre 2 y 3 años, y hay que llevar reservas.' },
  { id: 'fd_h3', category: 'food', difficulty: 'hard', question: '¿Qué cosecharon por primera vez en la ISS en 2021?', answers: ['Pimientos picantes', 'Fresas', 'Plátanos', 'Arroz'], fact: 'Fue el experimento Plant Habitat-04: los astronautas hicieron tacos con ellos.' },

  // ======================= BLINDAJE =======================
  { id: 'sh_e1', category: 'shield', difficulty: 'easy', question: '¿Qué nos protege en la Tierra de gran parte de la radiación del Sol?', answers: ['La atmósfera y el campo magnético', 'Las nubes de algodón', 'Los árboles', 'La Luna'], fact: 'Las auroras boreales aparecen cuando las partículas del Sol chocan con ese escudo.' },
  { id: 'sh_e2', category: 'shield', difficulty: 'easy', question: '¿Cómo nos protegemos del Sol en verano en la playa?', answers: ['Con crema solar, gorra y sombra', 'Mirando el Sol fijamente', 'Corriendo más rápido', 'Comiendo helado'], fact: 'En el espacio pasa igual, pero hacen falta escudos mucho más fuertes.' },
  { id: 'sh_e3', category: 'shield', difficulty: 'easy', question: '¿Qué es una tormenta solar?', answers: ['Energía y partículas que lanza el Sol', 'Lluvia que cae en el Sol', 'Una nube de polvo marciano', 'Un cometa'], fact: 'Los científicos de la NASA vigilan el Sol día y noche para avisar a los astronautas.' },
  { id: 'sh_m1', category: 'shield', difficulty: 'medium', question: '¿Qué es una Eyección de Masa Coronal (CME)?', answers: ['Una nube gigante de partículas del Sol', 'Un cometa que choca con Marte', 'Un volcán marciano', 'Una tormenta de polvo lunar'], fact: 'Las CME pueden viajar a más de 1.000 km por segundo.' },
  { id: 'sh_m2', category: 'shield', difficulty: 'medium', question: '¿Qué base de datos de la NASA registra las tormentas solares?', answers: ['DONKI', 'OSDR', 'Hubble', 'Artemis'], fact: 'DONKI significa "Database Of Notifications, Knowledge, Information". ¡Este juego usa sus datos!' },
  { id: 'sh_m3', category: 'shield', difficulty: 'medium', question: '¿Tiene Marte un escudo magnético global como la Tierra?', answers: ['No, lo perdió hace miles de millones de años', 'Sí, más fuerte que el nuestro', 'Sí, igual que el nuestro', 'Solo los fines de semana'], fact: 'Sin ese escudo, el viento solar fue arrancando poco a poco el aire de Marte.' },
  { id: 'sh_h1', category: 'shield', difficulty: 'hard', question: '¿Qué clase de llamarada solar es la más potente?', answers: ['Clase X', 'Clase A', 'Clase C', 'Clase M'], fact: 'La escala va A, B, C, M y X. Cada letra es 10 veces más potente que la anterior.' },
  { id: 'sh_h2', category: 'shield', difficulty: 'hard', question: '¿Qué material protege mejor de los rayos cósmicos en una nave?', answers: ['Materiales con mucho hidrógeno, como el agua', 'El cartón', 'El cristal', 'El aire'], fact: 'El hidrógeno frena las partículas sin crear tanta radiación secundaria como los metales pesados.' },
  { id: 'sh_h3', category: 'shield', difficulty: 'hard', question: '¿Qué misión de la NASA estudia cómo el viento solar arranca la atmósfera de Marte?', answers: ['MAVEN', 'Hubble', 'Voyager 1', 'Apolo 11'], fact: 'MAVEN orbita Marte desde 2014 vigilando cómo escapa su atmósfera al espacio.' },

  // ======================= SALUD =======================
  { id: 'hp_e1', category: 'crewHealth', difficulty: 'easy', question: '¿Cómo se llama la ropa especial para salir al espacio?', answers: ['Traje espacial', 'Pijama', 'Bañador', 'Chubasquero'], fact: 'Un traje espacial es como una nave en miniatura: lleva aire, calefacción y radio.' },
  { id: 'hp_e2', category: 'crewHealth', difficulty: 'easy', question: '¿Cómo se llama el satélite natural que gira alrededor de la Tierra?', answers: ['La Luna', 'El Sol', 'Júpiter', 'Un cometa'], fact: 'Con el programa Artemis, la NASA quiere volver a llevar astronautas a la Luna.' },
  { id: 'hp_e3', category: 'crewHealth', difficulty: 'easy', question: '¿Por qué hacen ejercicio los astronautas en el espacio?', answers: ['Para que sus músculos y huesos no se debiliten', 'Solo para no aburrirse', 'Para calentar la nave', 'Para que la nave vaya más rápido'], fact: 'Sin gravedad, el cuerpo trabaja menos y los músculos se hacen más débiles.' },
  { id: 'hp_m1', category: 'crewHealth', difficulty: 'medium', question: '¿Por qué flotan los astronautas en la Estación Espacial?', answers: ['Porque están cayendo alrededor de la Tierra todo el rato', 'Porque en el espacio no hay nada de gravedad', 'Porque llevan imanes', 'Porque la nave está llena de globos'], fact: 'A la altura de la ISS la gravedad es casi igual que en el suelo: flotan porque están en caída libre.' },
  { id: 'hp_m2', category: 'crewHealth', difficulty: 'medium', question: '¿Cuánto ejercicio hacen al día los astronautas en la ISS?', answers: ['Unas 2 horas', 'Nada', '10 horas', '5 minutos'], fact: 'Usan una bici, una cinta de correr con arneses y una máquina de pesas especial.' },
  { id: 'hp_m3', category: 'crewHealth', difficulty: 'medium', question: '¿Qué vitamina les falta a los astronautas porque casi no les da el Sol?', answers: ['Vitamina D', 'Vitamina C', 'Vitamina A', 'Vitamina K'], fact: 'Nuestra piel fabrica vitamina D con la luz del Sol. En la ISS la toman en pastillas.' },
  { id: 'hp_h1', category: 'crewHealth', difficulty: 'hard', question: 'Si pesas 30 kg en la Tierra, ¿cuánto marcaría la báscula en Marte?', answers: ['Unos 11 kg', 'Unos 30 kg', 'Unos 60 kg', 'Unos 2 kg'], fact: 'La gravedad de Marte es alrededor del 38 % de la terrestre. ¡Saltarías casi 3 veces más alto!' },
  { id: 'hp_h2', category: 'crewHealth', difficulty: 'hard', question: '¿Cuánta masa ósea pueden perder los astronautas cada mes en el espacio?', answers: ['Entre un 1 y un 1,5 %', 'La mitad', 'Nada', 'Un 20 %'], fact: 'Por eso el ejercicio diario y la buena alimentación son tan importantes en misiones largas.' },
  { id: 'hp_h3', category: 'crewHealth', difficulty: 'hard', question: '¿Qué misión de la NASA simula vivir un año en Marte para estudiar la salud de la tripulación?', answers: ['CHAPEA', 'MAVEN', 'Kilopower', 'Voyager'], fact: 'Cuatro voluntarios vivieron un año en un hábitat impreso en 3D en Houston (2023-2024).' },
];

export const DIFFICULTY_META: Record<Difficulty, { label: string; color: string }> = {
  easy: { label: 'Fácil', color: '#64748b' },
  medium: { label: 'Media', color: '#0B3D91' },
  hard: { label: 'Difícil', color: '#FC3D21' },
};

/** Duración de la trivia contrarreloj. */
export const QUIZ_SECONDS = 60;
/** @deprecated El resumen ya no avanza solo (los niños leen a su ritmo). Se mantiene por compatibilidad. */
export const SUMMARY_SECONDS = 4;

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Cola de preguntas con dificultad progresiva:
 * 5 fáciles (una por rama) → 5 medias → 5 difíciles → el resto, otra vez de fácil a difícil.
 */
export function buildQuizQueue(): TriviaQuestion[] {
  const tiers: Difficulty[] = ['easy', 'medium', 'hard'];
  const firstRound: TriviaQuestion[] = [];
  const used = new Set<string>();
  for (const d of tiers) {
    const cats = shuffle<VitalKey>(['oxygen', 'power', 'food', 'shield', 'crewHealth']);
    for (const c of cats) {
      const pool = TRIVIA_QUESTIONS.filter((q) => q.difficulty === d && q.category === c && !used.has(q.id));
      const q = pool[Math.floor(Math.random() * pool.length)];
      if (q) {
        firstRound.push(q);
        used.add(q.id);
      }
    }
  }
  const rest = tiers.flatMap((d) => shuffle(TRIVIA_QUESTIONS.filter((q) => q.difficulty === d && !used.has(q.id))));
  return [...firstRound, ...rest];
}

/** Complicaciones si una rama sale mal en la Fase 1. */
export const COMPLICATIONS: Record<VitalKey, Complication> = {
  oxygen: { category: 'oxygen', title: 'Fuga en conducto de O2', dailyPenalty: -4, startPenalty: -20 },
  power: { category: 'power', title: 'Cortocircuito en la red eléctrica', dailyPenalty: -4, startPenalty: -20 },
  food: { category: 'food', title: 'Plaga en la despensa', dailyPenalty: -4, startPenalty: -20 },
  shield: { category: 'shield', title: 'Grieta en el blindaje', dailyPenalty: -4, startPenalty: -20 },
  crewHealth: { category: 'crewHealth', title: 'Fatiga espacial de la tripulación', dailyPenalty: -4, startPenalty: -20 },
};

/** Una rama sufre complicación con 0 aciertos o con menos de 1/3 de aciertos (mínimo 3 intentos). */
export function hasComplication(answered: number, correct: number): boolean {
  if (correct === 0) return true;
  return answered >= 3 && correct / answered < 0.34;
}
