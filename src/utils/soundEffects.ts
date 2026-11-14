// Sintetizador de efectos de sonido 100 % programático (Web Audio API).
// Cero archivos de audio externos.

let ctx: AudioContext | null = null;
let sfxMuted = false;

type AudioCtor = typeof AudioContext;

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const Ctor: AudioCtor | undefined =
      window.AudioContext ?? (window as unknown as { webkitAudioContext?: AudioCtor }).webkitAudioContext;
    if (!Ctor) return null;
    try {
      ctx = new Ctor();
    } catch {
      return null;
    }
  }
  if (ctx.state === 'suspended') void ctx.resume().catch(() => undefined);
  return ctx;
}

/**
 * Llamar en el primer clic del usuario (Menú) para desbloquear el audio:
 * los navegadores crean el AudioContext "suspended" hasta que hay un gesto.
 */
export function unlockAudio(): void {
  const ac = getCtx();
  if (ac && ac.state !== 'running') void ac.resume().catch(() => undefined);
  // Toque silencioso para que iOS/Safari también lo active
  if (ac) {
    try {
      const buf = ac.createBuffer(1, 1, 22050);
      const src = ac.createBufferSource();
      src.buffer = buf;
      src.connect(ac.destination);
      src.start(0);
    } catch {
      /* sin audio: el juego sigue funcionando */
    }
  }
}

export function setSfxMuted(muted: boolean): void {
  sfxMuted = muted;
}

interface ToneOptions {
  freq: number;
  endFreq?: number;
  duration: number;
  type?: OscillatorType;
  volume?: number;
  delay?: number;
  attack?: number;
}

function tone({ freq, endFreq, duration, type = 'sine', volume = 0.15, delay = 0, attack = 0.01 }: ToneOptions) {
  if (sfxMuted) return;
  const ac = getCtx();
  if (!ac) return;
  const t0 = ac.currentTime + delay;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (endFreq) osc.frequency.exponentialRampToValueAtTime(Math.max(endFreq, 1), t0 + duration);
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(volume, t0 + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  osc.connect(gain).connect(ac.destination);
  osc.start(t0);
  osc.stop(t0 + duration + 0.05);
}

function noise(duration: number, volume = 0.12, delay = 0, filterFreq = 800) {
  if (sfxMuted) return;
  const ac = getCtx();
  if (!ac) return;
  const t0 = ac.currentTime + delay;
  const buffer = ac.createBuffer(1, Math.floor(ac.sampleRate * duration), ac.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const src = ac.createBufferSource();
  src.buffer = buffer;
  const filter = ac.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(filterFreq, t0);
  filter.frequency.exponentialRampToValueAtTime(80, t0 + duration);
  const gain = ac.createGain();
  gain.gain.setValueAtTime(volume, t0);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  src.connect(filter).connect(gain).connect(ac.destination);
  src.start(t0);
  src.stop(t0 + duration + 0.05);
}

/** Pitido de alarma (cuenta atrás final, alertas). */
export function playAlarmBeep(): void {
  tone({ freq: 880, duration: 0.12, type: 'square', volume: 0.08 });
  tone({ freq: 660, duration: 0.12, type: 'square', volume: 0.08, delay: 0.14 });
}

/** Sirena corta de emergencia. */
export function playSiren(): void {
  tone({ freq: 500, endFreq: 1000, duration: 0.45, type: 'sawtooth', volume: 0.06 });
  tone({ freq: 1000, endFreq: 500, duration: 0.45, type: 'sawtooth', volume: 0.06, delay: 0.45 });
}

/** Coger un objeto: arpegio ascendente. */
export function playPickup(): void {
  tone({ freq: 523, duration: 0.08, type: 'triangle', volume: 0.14 });
  tone({ freq: 784, duration: 0.1, type: 'triangle', volume: 0.14, delay: 0.06 });
  tone({ freq: 1047, duration: 0.14, type: 'triangle', volume: 0.12, delay: 0.12 });
}

/** Devolver un objeto: tono descendente. */
export function playRemove(): void {
  tone({ freq: 700, endFreq: 300, duration: 0.18, type: 'triangle', volume: 0.13 });
}

/** Zumbido de error (no cabe / bloqueado). */
export function playErrorBuzz(): void {
  tone({ freq: 140, duration: 0.25, type: 'sawtooth', volume: 0.12 });
  tone({ freq: 110, duration: 0.25, type: 'square', volume: 0.06, delay: 0.05 });
}
export const playError = playErrorBuzz;

/** Compuertas del búnker sellándose. */
export function playDoorSeal(): void {
  noise(0.9, 0.18, 0, 1200);
  tone({ freq: 90, endFreq: 40, duration: 0.9, type: 'sawtooth', volume: 0.12 });
  tone({ freq: 60, duration: 0.35, type: 'square', volume: 0.15, delay: 0.85 });
  noise(0.25, 0.25, 0.85, 400);
}

/** Clic de botón de interfaz. */
export function playButtonClick(): void {
  tone({ freq: 1200, duration: 0.04, type: 'square', volume: 0.05 });
}

/** Interruptor ON/OFF. */
export function playToggle(on: boolean): void {
  tone({ freq: on ? 600 : 400, endFreq: on ? 900 : 250, duration: 0.1, type: 'square', volume: 0.06 });
}

/**
 * Pitido de "voz" sci-fi (estilo Animal Crossing/Undertale): un blip corto
 * cuyo tono depende de la letra, para que cada palabra suene distinta.
 */
export function playBlip(char = 'a'): void {
  if (sfxMuted) return;
  const ac = getCtx();
  if (!ac) return;
  const code = char.toLowerCase().charCodeAt(0) || 97;
  const steps = [0, 2, 4, 7, 9, 12]; // escala pentatónica: siempre suena agradable
  const semis = steps[code % steps.length];
  const freq = 440 * Math.pow(2, semis / 12);
  // Seno con un pequeño "gorjeo" ascendente y filtro paso bajo: suave, tipo robot amigable
  const t0 = ac.currentTime;
  const osc = ac.createOscillator();
  const filter = ac.createBiquadFilter();
  const gain = ac.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(freq, t0);
  osc.frequency.exponentialRampToValueAtTime(freq * 1.12, t0 + 0.05);
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(1800, t0);
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(0.05, t0 + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.07);
  osc.connect(filter).connect(gain).connect(ac.destination);
  osc.start(t0);
  osc.stop(t0 + 0.1);
}

/** Clic de la ruleta al pasar por cada sector. */
export function playSpinTick(): void {
  tone({ freq: 1800, duration: 0.025, type: 'square', volume: 0.035 });
}

/**
 * Clic mecánico seco del carrusel de la Cápsula Orbital (una tarjeta cruza el láser central).
 * Ráfaga de ruido de 12 ms filtrada en paso alto + "tock" grave muy corto: suena a trinquete.
 */
export function playCaseTick(): void {
  const ac = getCtx();
  if (!ac) return;
  try {
    const now = ac.currentTime;
    const len = Math.floor(ac.sampleRate * 0.012);
    const buf = ac.createBuffer(1, len, ac.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 3;
    const src = ac.createBufferSource();
    src.buffer = buf;
    const hp = ac.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 2400;
    const g = ac.createGain();
    g.gain.value = 0.22;
    src.connect(hp).connect(g).connect(ac.destination);
    src.start(now);

    const osc = ac.createOscillator();
    const og = ac.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(420, now);
    osc.frequency.exponentialRampToValueAtTime(180, now + 0.03);
    og.gain.setValueAtTime(0.06, now);
    og.gain.exponentialRampToValueAtTime(0.0001, now + 0.035);
    osc.connect(og).connect(ac.destination);
    osc.start(now);
    osc.stop(now + 0.04);
  } catch {
    /* audio opcional */
  }
}

/** Objeto desbloqueado (arpegio brillante). */
export function playUnlock(): void {
  [784, 988, 1175, 1568].forEach((f, i) =>
    tone({ freq: f, duration: 0.18, type: 'triangle', volume: 0.1, delay: i * 0.07 }),
  );
}

/** Tic del reloj. */
export function playTick(): void {
  tone({ freq: 1500, duration: 0.03, type: 'sine', volume: 0.04 });
}

/** Mensaje entrante en la tablet. */
export function playIncoming(): void {
  tone({ freq: 988, duration: 0.07, type: 'sine', volume: 0.1 });
  tone({ freq: 1319, duration: 0.12, type: 'sine', volume: 0.1, delay: 0.09 });
}

/** Fanfarria de éxito. */
export function playSuccess(): void {
  [523, 659, 784, 1047].forEach((f, i) =>
    tone({ freq: f, duration: 0.25, type: 'triangle', volume: 0.12, delay: i * 0.12 }),
  );
}

/** Sonido de evacuación (no dramático, solo un aviso suave). */
export function playEvacuation(): void {
  [784, 659, 523].forEach((f, i) => tone({ freq: f, duration: 0.3, type: 'sine', volume: 0.12, delay: i * 0.2 }));
}
