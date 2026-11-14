import type { FieldNoteSource, MarsPhoto, VitalKey, Vitals } from '../types/game';

/**
 * Transmisiones con FOTO REAL de la NASA: llegan con cada envío de Houston y,
 * cada 2-3 Soles, desde el rover de rescate o una sonda en órbita.
 * Un personaje asoma en grande (Comandante Elena o A.R.I.A.) y entrega una carta
 * cuyo mensaje reacciona a cómo va la partida (todo bien / alguna barra en peligro).
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

export const FIELD_NOTE_SENDER: Record<FieldNoteSource, string> = {
  houston: 'Envío de Houston · entregado por el rover de rescate',
  rover: 'Rover de rescate · equipo adulto',
  orbiter: 'Sonda en órbita de Marte · descifrado por A.R.I.A.',
};

/** Quién habla en grande en cada transmisión. */
export const FIELD_NOTE_SPEAKER: Record<FieldNoteSource, { name: string; role: string; kind: 'elena' | 'aria' }> = {
  houston: { name: 'Comandante Elena', role: 'Rover de rescate', kind: 'elena' },
  rover: { name: 'Comandante Elena', role: 'Rover de rescate', kind: 'elena' },
  orbiter: { name: 'A.R.I.A.', role: 'Ordenador de a bordo', kind: 'aria' },
};

const pick = <T,>(arr: readonly T[]) => arr[Math.floor(Math.random() * arr.length)];

export function buildFieldNote(
  photo: MarsPhoto | null,
  source: FieldNoteSource,
  vitals: Vitals,
  repairCount: number,
): { headline: string; speech: string; message: string; urgent: boolean } {
  const lowest = (Object.keys(VITAL_ES) as VitalKey[]).reduce((a, b) => (vitals[b] < vitals[a] ? b : a));
  const urgent = vitals[lowest] < FIELD_NOTE_DANGER || repairCount > 0;
  const trouble = vitals[lowest] < FIELD_NOTE_DANGER ? `justos de ${VITAL_ES[lowest]}` : 'con averías en el hábitat';
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
          message: `¡Vemos que tenéis el búnker en muy buena forma! Mientras el contenedor bajaba hacia vuestra posición, seguíamos avanzando por el cráter.${photoBit} ¡Ya queda menos para vernos!`,
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

/** Línea de datos reales bajo el mensaje: foto, Sol de Perseverance y qué captó la cámara. */
export function photoFactLine(photo: MarsPhoto): string {
  const parts = [`Foto real NASA ${photo.id}`];
  if (photo.sol) parts.push(`Sol ${photo.sol} de la misión`);
  parts.push(`${photo.cameraEs ? photo.cameraEs.replace(/^la cámara /, 'Cámara ') : photo.whoEs}${photo.topicEs ? ` · ${photo.topicEs}` : ''}`);
  return parts.join(' · ');
}
