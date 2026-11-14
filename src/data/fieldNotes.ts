import type { FieldNoteSource, MarsPhoto, VitalKey, Vitals } from '../types/game';
import { getLang, localizeRecord } from '../i18n/core';

/**
 * Transmisiones con FOTO REAL de la NASA: llegan con cada envío de Houston y,
 * cada 2-3 Soles, desde el rover de rescate o una sonda en órbita.
 * Un personaje asoma en grande (Comandante Elena o A.R.I.A.) y entrega una carta
 * cuyo mensaje reacciona a cómo va la partida (todo bien / alguna barra en peligro).
 * Bilingüe: la carta se escribe en el idioma activo al llegar.
 */

/** Umbral de "barra en peligro" para el tono del mensaje. */
export const FIELD_NOTE_DANGER = 35;

const VITAL_ES: Record<VitalKey, string> = {
  oxygen: 'oxígeno',
  power: 'energía',
  food: 'comida',
  shield: 'blindaje',
  crewHealth: 'salud',
};

const VITAL_EN: Record<VitalKey, string> = {
  oxygen: 'oxygen',
  power: 'power',
  food: 'food',
  shield: 'shielding',
  crewHealth: 'health',
};

export const FIELD_NOTE_SENDER: Record<FieldNoteSource, string> = {
  get houston() {
    return getLang() === 'en' ? 'Houston shipment · delivered by the rescue rover' : 'Envío de Houston · entregado por el rover de rescate';
  },
  get rover() {
    return getLang() === 'en' ? 'Rescue rover · adult team' : 'Rover de rescate · equipo adulto';
  },
  get orbiter() {
    return getLang() === 'en' ? 'Mars orbiter probe · decoded by A.R.I.A.' : 'Sonda en órbita de Marte · descifrado por A.R.I.A.';
  },
};

type Speaker = { name: string; role: string; kind: 'elena' | 'aria' };

/** Quién habla en grande en cada transmisión. */
export const FIELD_NOTE_SPEAKER: Record<FieldNoteSource, Speaker> = localizeRecord<FieldNoteSource, Speaker>(
  {
    houston: { name: 'Comandante Elena', role: 'Rover de rescate', kind: 'elena' },
    rover: { name: 'Comandante Elena', role: 'Rover de rescate', kind: 'elena' },
    orbiter: { name: 'A.R.I.A.', role: 'Ordenador de a bordo', kind: 'aria' },
  },
  {
    houston: { name: 'Commander Elena', role: 'Rescue rover' },
    rover: { name: 'Commander Elena', role: 'Rescue rover' },
    orbiter: { role: 'Onboard computer' },
  },
);

/** Textos de una foto en el idioma activo (las fotos guardadas antes del inglés usan la descripción original). */
export function photoText(photo: MarsPhoto): { summary: string; who: string; camera: string; topic: string | null } {
  if (getLang() === 'en') {
    return {
      summary: photo.summaryEn ?? photo.originalDescription,
      who: photo.whoEn ?? 'the Perseverance rover',
      camera: photo.cameraEn ?? '',
      topic: photo.topicEn ?? null,
    };
  }
  return { summary: photo.summaryEs, who: photo.whoEs, camera: photo.cameraEs, topic: photo.topicEs };
}

const pick = <T,>(arr: readonly T[]) => arr[Math.floor(Math.random() * arr.length)];

type FieldNoteText = { headline: string; speech: string; message: string; urgent: boolean };

export function buildFieldNote(photo: MarsPhoto | null, source: FieldNoteSource, vitals: Vitals, repairCount: number): FieldNoteText {
  const lowest = (Object.keys(VITAL_ES) as VitalKey[]).reduce((a, b) => (vitals[b] < vitals[a] ? b : a));
  const urgent = vitals[lowest] < FIELD_NOTE_DANGER || repairCount > 0;
  const lowVital = vitals[lowest] < FIELD_NOTE_DANGER;
  return getLang() === 'en' ? buildEnglish(photo, source, urgent, lowVital ? VITAL_EN[lowest] : null) : buildSpanish(photo, source, urgent, lowVital ? VITAL_ES[lowest] : null);
}

function buildSpanish(photo: MarsPhoto | null, source: FieldNoteSource, urgent: boolean, lowVital: string | null): FieldNoteText {
  const trouble = lowVital ? `justos de ${lowVital}` : 'con averías en el hábitat';
  const shot = photo ? `${photo.whoEs}${photo.cameraEs ? ` con ${photo.cameraEs}` : ''}` : 'nuestra cámara';
  /** "de el rover" → "del rover" */
  const ofShot = shot.startsWith('el ') ? `del ${shot.slice(3)}` : `de ${shot}`;
  const what = photo?.topicEs ?? 'el paisaje real del Cráter Jezero';
  const photoBit = photo ? ` En la foto real ${ofShot} se ve ${what}.` : '';

  if (source === 'houston') {
    return urgent
      ? {
          urgent,
          headline: '¡Paquete de emergencia en la esclusa!',
          speech: pick([
            `¡Cadetes! ¡Acabamos de ver caer el paracaídas térmico de Houston junto a vuestro domo! Sabemos que estáis ${trouble}: el suministro ya está en la esclusa. ¡Aguantad!`,
            `¡Aquí la Comandante Elena! El paquete de Houston ha aterrizado al lado de Ares-IV. Os hemos visto ${trouble}, así que corred a la esclusa. ¡No estáis solos!`,
          ]),
          message: `Houston os manda este envío de emergencia por la Deep Space Network.${photoBit} De camino hacia vosotros, el rover ha seguido el rastro del paracaídas entre las dunas. ¡Ya falta menos para el rescate!`,
        }
      : {
          urgent,
          headline: '¡El envío de Houston ha aterrizado!',
          speech: pick([
            '¡Cadetes! ¡Acabamos de ver caer el paracaídas térmico de Houston junto a vuestro domo! Os hemos dejado el suministro en la esclusa y os mandamos esta foto que acabamos de sacar de camino...',
            '¡Aquí la Comandante Elena desde el rover! El paquete de Houston ha bajado justo donde calculasteis. ¡Qué buen trabajo! Os adjunto una foto real del viaje.',
          ]),
          message: `¡Vemos que tenéis la base espacial en muy buena forma! Mientras el contenedor bajaba hacia vuestra posición, seguíamos avanzando por el cráter.${photoBit} ¡Ya queda menos para vernos!`,
        };
  }

  if (source === 'rover') {
    return urgent
      ? {
          urgent,
          headline: 'Transmisión urgente del rover',
          speech: `¡Cadetes, aquí la Comandante Elena! Nos llegan alertas de que estáis ${trouble}. ¡Vamos a toda velocidad cruzando las dunas, resistid!`,
          message: `No paramos de avanzar hacia Ares-IV.${photoBit} Mirad bien la foto: así es el terreno que estamos cruzando para llegar hasta vosotros.`,
        }
      : {
          urgent,
          headline: 'Postal desde el rover de rescate',
          speech: '¡Hola, cadetes! Aquí la Comandante Elena desde el rover. Seguimos de camino y os mando una postal con una foto real del viaje.',
          message: `Os echamos de menos. ¡Qué bien lo estáis haciendo en la base!${photoBit} Cuando lleguemos os contaremos todo lo que hemos visto por el camino.`,
        };
  }

  return urgent
    ? {
        urgent,
        headline: 'Señal de la sonda en órbita',
        speech: `¡Señal entrante! La sonda que vigila Marte ha detectado que estáis ${trouble}. Ya he avisado a Houston. Os enseño lo que nos ha enviado.`,
        message: `La sonda orbita Marte y vigila vuestro hábitat desde el espacio.${photoBit} ¡Ánimo, cadetes!`,
      }
    : {
        urgent,
        headline: 'Señal de la sonda en órbita',
        speech: '¡Señal entrante! He descifrado una transmisión de la sonda en órbita. Dice que vuestro hábitat brilla en la noche marciana. ¡Mirad esta foto real!',
        message: `Desde la órbita, la sonda ve todo el Cráter Jezero.${photoBit} ¡Seguid así!`,
      };
}

function buildEnglish(photo: MarsPhoto | null, source: FieldNoteSource, urgent: boolean, lowVital: string | null): FieldNoteText {
  const trouble = lowVital ? `running low on ${lowVital}` : 'dealing with breakdowns in the habitat';
  const text = photo ? photoText(photo) : null;
  const shot = text ? `${text.who}${text.camera ? ` with ${text.camera}` : ''}` : 'our camera';
  const what = text?.topic ?? 'the real landscape of Jezero Crater';
  const photoBit = photo ? ` In this real photo taken by ${shot} you can see ${what}.` : '';

  if (source === 'houston') {
    return urgent
      ? {
          urgent,
          headline: 'Emergency package at the airlock!',
          speech: pick([
            `Cadets! We just saw Houston's heat-shield parachute come down next to your dome! We know you are ${trouble}: the supplies are already at the airlock. Hang in there!`,
            `Commander Elena here! The Houston package landed right next to Ares-IV. We can see you are ${trouble}, so hurry to the airlock. You are not alone!`,
          ]),
          message: `Houston is sending you this emergency shipment over the Deep Space Network.${photoBit} On our way to you, the rover followed the parachute's trail through the dunes. The rescue is getting closer!`,
        }
      : {
          urgent,
          headline: 'The Houston shipment has landed!',
          speech: pick([
            "Cadets! We just saw Houston's heat-shield parachute come down next to your dome! We left the supplies at the airlock and here is a photo we just took on the way...",
            'Commander Elena here, from the rover! The Houston package came down exactly where you calculated. Great job! Here is a real photo from our trip.',
          ]),
          message: `We can see the space base is in great shape! While the container was coming down to you, we kept crossing the crater.${photoBit} We will see you soon!`,
        };
  }

  if (source === 'rover') {
    return urgent
      ? {
          urgent,
          headline: 'Urgent transmission from the rover',
          speech: `Cadets, Commander Elena here! We are getting alerts that you are ${trouble}. We are crossing the dunes at full speed, hold on!`,
          message: `We keep moving toward Ares-IV.${photoBit} Take a good look at the photo: this is the ground we are crossing to reach you.`,
        }
      : {
          urgent,
          headline: 'Postcard from the rescue rover',
          speech: 'Hello, cadets! Commander Elena here, from the rover. We are still on our way and I am sending you a postcard with a real photo from the trip.',
          message: `We miss you. You are doing so well at the base!${photoBit} When we arrive we will tell you everything we saw along the way.`,
        };
  }

  return urgent
    ? {
        urgent,
        headline: 'Signal from the orbiter probe',
        speech: `Incoming signal! The probe watching Mars has detected that you are ${trouble}. I have already warned Houston. Let me show you what it sent us.`,
        message: `The probe orbits Mars and watches your habitat from space.${photoBit} Keep going, cadets!`,
      }
    : {
        urgent,
        headline: 'Signal from the orbiter probe',
        speech: 'Incoming signal! I decoded a transmission from the orbiting probe. It says your habitat is shining in the Martian night. Look at this real photo!',
        message: `From orbit, the probe can see all of Jezero Crater.${photoBit} Keep it up!`,
      };
}

/** Línea de datos reales bajo el mensaje: foto, Sol de Perseverance y qué captó la cámara. */
export function photoFactLine(photo: MarsPhoto): string {
  const en = getLang() === 'en';
  const text = photoText(photo);
  const parts = [en ? `Real NASA photo ${photo.id}` : `Foto real NASA ${photo.id}`];
  if (photo.sol) parts.push(en ? `Mission Sol ${photo.sol.replace(/\./g, ',')}` : `Sol ${photo.sol} de la misión`);
  const camera = en ? text.camera.replace(/^its /, '') : text.camera.replace(/^la cámara /, 'Cámara ');
  parts.push(`${camera || text.who}${text.topic ? ` · ${text.topic}` : ''}`);
  return parts.join(' · ');
}
