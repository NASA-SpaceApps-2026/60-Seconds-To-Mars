// Voz de A.R.I.A. — 3 modos de audio:
//  - 'beeps':   (POR DEFECTO) pitidos sci-fi musicales mientras el texto aparece letra a letra.
//  - 'natural': window.speechSynthesis con la voz que elija el jugador (o la mejor en español).
//  - 'silent':  solo texto.
// La voz natural nunca corta a mitad de frase: termina la frase en curso y pasa al mensaje nuevo.

import { playBlip } from './soundEffects';

export type VoiceMode = 'natural' | 'beeps' | 'silent';
export type VoiceGender = 'female' | 'male' | 'unknown';

type Listener = () => void;

export interface VoiceOption {
  /** Identificador estable: voiceURI (o nombre). */
  id: string;
  name: string;
  lang: string;
  gender: VoiceGender;
  isSpanish: boolean;
}

export interface AriaVoiceState {
  speaking: boolean;
  mode: VoiceMode;
  supported: boolean;
  /** Voz en uso (nombre legible). */
  voiceName: string | null;
  voiceId: string | null;
  /** Todas las voces instaladas en el navegador (las de español primero). */
  voices: VoiceOption[];
  pitch: number;
  rate: number;
  /** Texto que se está escribiendo letra a letra (modo pitidos). */
  typingText: string | null;
  typedCount: number;
}

const synth: SpeechSynthesis | null =
  typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis : null;

// v2: el modo por defecto pasa a ser 'beeps' para todo el mundo
const STORAGE_KEY = 'aria-voice-settings-v2';
/** Más rápido que esto, varias voces se aceleran de más y se comen palabras. */
const MAX_RATE = 1.2;
interface Saved {
  mode?: VoiceMode;
  voiceId?: string | null;
  pitch?: number;
  rate?: number;
}
function loadSaved(): Saved {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as Saved;
  } catch {
    return {};
  }
}
function save() {
  try {
    const data: Saved = { mode: state.mode, voiceId: state.voiceId, pitch: state.pitch, rate: state.rate };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    /* sin almacenamiento: solo dura esta sesión */
  }
}

const clampNum = (n: unknown, min: number, max: number, fallback: number) =>
  typeof n === 'number' && Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;

const saved = loadSaved();
let state: AriaVoiceState = {
  speaking: false,
  mode: saved.mode === 'natural' || saved.mode === 'silent' || saved.mode === 'beeps' ? saved.mode : 'beeps',
  supported: synth !== null,
  voiceName: null,
  voiceId: saved.voiceId ?? null,
  voices: [],
  pitch: clampNum(saved.pitch, 0.5, 1.6, 1.0),
  rate: clampNum(saved.rate, 0.7, MAX_RATE, 0.98),
  typingText: null,
  typedCount: 0,
};
const listeners = new Set<Listener>();
let voice: SpeechSynthesisVoice | null = null;
let rawVoices: SpeechSynthesisVoice[] = [];
let speakToken = 0;
let typeTimer: ReturnType<typeof setInterval> | null = null;

function emit(patch: Partial<AriaVoiceState>) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}

// ------------------------------------------------------------
// Catálogo de voces
// ------------------------------------------------------------
/** Orden de prioridad por nombre para elegir automáticamente la mejor voz. */
const NAME_PRIORITY: string[][] = [
  ['natural'],
  ['online'],
  ['google'],
  ['elvira'],
  ['alvaro', 'álvaro'],
  ['paulina'],
  ['monica', 'mónica'],
];
const LANG_PRIORITY = ['es-es', 'es-mx', 'es-us'];

const FEMALE_HINTS = ['female', 'mujer', 'elvira', 'paulina', 'monica', 'mónica', 'helena', 'laura', 'sabina', 'dalia', 'elena', 'lucia', 'lucía', 'ximena', 'abril', 'paloma', 'marisol', 'esperanza', 'zira', 'hazel', 'susan', 'samantha', 'victoria', 'karen', 'catherine', 'linda', 'salome', 'salomé'];
const MALE_HINTS = ['male', 'hombre', 'alvaro', 'álvaro', 'jorge', 'pablo', 'raul', 'raúl', 'diego', 'tomas', 'tomás', 'gerardo', 'alonso', 'arnau', 'dario', 'darío', 'david', 'mark', 'george', 'james', 'daniel', 'juan', 'carlos'];

function guessGender(name: string): VoiceGender {
  const n = name.toLowerCase();
  // 'female' contiene 'male': comprobar primero femenino
  if (FEMALE_HINTS.some((h) => n.includes(h))) return 'female';
  if (MALE_HINTS.some((h) => n.includes(h))) return 'male';
  return 'unknown';
}

const voiceId = (v: SpeechSynthesisVoice) => v.voiceURI || v.name;

function scoreVoice(v: SpeechSynthesisVoice): number {
  const name = v.name.toLowerCase();
  const lang = v.lang.toLowerCase().replace('_', '-');
  const nameIdx = NAME_PRIORITY.findIndex((group) => group.some((k) => name.includes(k)));
  const nameScore = nameIdx === -1 ? 100 : nameIdx * 10;
  const langIdx = LANG_PRIORITY.indexOf(lang);
  const langScore = langIdx === -1 ? 5 : langIdx;
  const sapiPenalty = nameIdx === -1 && v.localService ? 50 : 0;
  const notSpanish = lang.startsWith('es') ? 0 : 1000;
  return nameScore + langScore + sapiPenalty + notSpanish;
}

function loadVoices() {
  if (!synth) return;
  rawVoices = [...synth.getVoices()].sort((a, b) => scoreVoice(a) - scoreVoice(b));
  const voices: VoiceOption[] = rawVoices.map((v) => ({
    id: voiceId(v),
    name: v.name,
    lang: v.lang,
    gender: guessGender(v.name),
    isSpanish: v.lang.toLowerCase().startsWith('es'),
  }));
  // Respetar la voz elegida a mano; si no existe, la mejor automática
  voice = rawVoices.find((v) => voiceId(v) === state.voiceId) ?? rawVoices[0] ?? null;
  emit({ voices, voiceName: voice ? `${voice.name} (${voice.lang})` : null });
}

if (synth) {
  loadVoices();
  synth.addEventListener?.('voiceschanged', loadVoices);
}

// ------------------------------------------------------------
// Motores
// ------------------------------------------------------------
/*
 * Voz natural SIN cortes a mitad de frase:
 *  - El texto se trocea en frases cortas (Chrome corta en seco las locuciones de más de ~15 s
 *    y algunas voces "se rayan" o se saltan palabras con textos largos).
 *  - Las frases se encolan aquí (no en la cola del navegador): si llega un mensaje nuevo, la frase
 *    que está sonando TERMINA y después empieza el mensaje nuevo; lo que quedaba del viejo se descarta.
 *  - cancel() solo se usa al parar del todo o si el navegador se queda colgado, y siempre con un
 *    respiro antes del siguiente speak() (Chrome descarta o acelera un speak() pegado a un cancel()).
 */
const MAX_CHUNK = 160;
const AFTER_CANCEL_MS = 180;
const DUPLICATE_MS = 2500;

/**
 * Sincronización con las pantallas: mientras una pantalla se está montando ('screen') o hay una
 * historia abierta ('story'), los mensajes del juego esperan; solo habla la historia (force).
 */
export type HoldReason = 'screen' | 'story';
const HOLD_SAFETY_MS = 3000;
const holds = new Set<HoldReason>();
const holdTimers: Partial<Record<HoldReason, ReturnType<typeof setTimeout>>> = {};
let pendingText: string | null = null;

let chunkQueue: string[] = [];
let chunkActive = false;
let watchdog: ReturnType<typeof setTimeout> | null = null;
let lastSpoken = { text: '', at: 0 };

function splitIntoChunks(text: string): string[] {
  const clean = text.replace(/\s+/g, ' ').trim();
  // Solo se corta tras un signo seguido de espacio (así "A.R.I.A." no se trocea letra a letra)
  const pieces = clean.split(/(?<=[.!?;])\s+/);
  // Unir frases muy cortas con la siguiente para que la voz no suene a trompicones
  const sentences: string[] = [];
  for (const p of pieces) {
    const prev = sentences[sentences.length - 1];
    if (prev !== undefined && prev.length < 40 && prev.length + p.length + 1 <= MAX_CHUNK) sentences[sentences.length - 1] = `${prev} ${p}`;
    else sentences.push(p);
  }
  const chunks: string[] = [];
  for (const raw of sentences) {
    const s = raw.trim();
    if (!s) continue;
    if (s.length <= MAX_CHUNK) {
      chunks.push(s);
      continue;
    }
    // Frase muy larga: partir por comas sin cortar palabras
    let current = '';
    for (const part of s.split(/(?<=,)\s+/)) {
      if ((current + ' ' + part).trim().length > MAX_CHUNK && current) {
        chunks.push(current.trim());
        current = part;
      } else current = `${current} ${part}`;
    }
    if (current.trim()) chunks.push(current.trim());
  }
  return chunks;
}

function clearWatchdog() {
  if (watchdog) clearTimeout(watchdog);
  watchdog = null;
}

function stopAll() {
  speakToken++;
  if (typeTimer) clearInterval(typeTimer);
  typeTimer = null;
  chunkQueue = [];
  chunkActive = false;
  clearWatchdog();
  synth?.cancel();
}

function speakNextChunk(gen: number) {
  if (!synth || gen !== speakToken) return;
  const text = chunkQueue.shift();
  if (!text) {
    chunkActive = false;
    clearWatchdog();
    emit({ speaking: false });
    return;
  }
  chunkActive = true;
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = voice?.lang ?? 'es-ES';
  if (voice) utter.voice = voice;
  utter.pitch = state.pitch;
  utter.rate = state.rate;
  utter.volume = 1;
  let finished = false;
  const done = () => {
    if (finished) return;
    finished = true;
    clearWatchdog();
    // Pausa natural entre frases (y evita que el motor encadene a toda velocidad)
    setTimeout(() => speakNextChunk(gen), 90);
  };
  utter.onend = done;
  utter.onerror = done;
  // Si el navegador no avisa del final (pasa en Chrome), seguir igualmente
  clearWatchdog();
  watchdog = setTimeout(() => {
    if (finished || gen !== speakToken) return;
    synth.cancel();
    setTimeout(done, AFTER_CANCEL_MS);
  }, 2500 + (text.length * 95) / state.rate);
  emit({ speaking: true });
  try {
    synth.speak(utter);
  } catch {
    done();
  }
}

function speakNatural(text: string) {
  if (!synth) return;
  const chunks = splitIntoChunks(text);
  if (!chunks.length) return;
  if (chunkActive) {
    // Hay una frase sonando: se deja terminar y luego va el mensaje nuevo
    chunkQueue = chunks;
    return;
  }
  chunkQueue = chunks;
  chunkActive = true;
  const gen = speakToken;
  const stale = synth.speaking || synth.pending;
  if (stale) synth.cancel();
  setTimeout(() => speakNextChunk(gen), stale ? AFTER_CANCEL_MS : 30);
}

function speakBeeps(text: string, token: number) {
  let i = 0;
  emit({ speaking: true, typingText: text, typedCount: 0 });
  typeTimer = setInterval(() => {
    if (token !== speakToken) return;
    i++;
    const ch = text[i - 1] ?? '';
    // Un pitido cada 3 letras (sin espacios ni signos) para que no se solapen ni saturen
    if (i % 3 === 0 && /[\p{L}\p{N}]/u.test(ch)) playBlip(ch);
    if (i >= text.length) {
      if (typeTimer) clearInterval(typeTimer);
      typeTimer = null;
      emit({ speaking: false, typingText: null, typedCount: 0 });
      return;
    }
    emit({ typedCount: i });
  }, 32);
}

export const ariaVoice = {
  /**
   * Dice el texto según el modo de audio. En voz natural no corta nunca a mitad de frase:
   * termina la frase en curso y pasa al mensaje nuevo (lo que quedaba del anterior se descarta).
   * Un mismo texto repetido en menos de 2,5 s se ignora (evita que la voz "se raye").
   */
  speak(text: string, opts: { force?: boolean } = {}) {
    // Pantalla cambiando o historia abierta: se guarda y se dice cuando la pantalla sea visible
    if (holds.size > 0 && !opts.force) {
      pendingText = text || null;
      return;
    }
    const now = Date.now();
    if (text && text === lastSpoken.text && now - lastSpoken.at < DUPLICATE_MS) return;
    lastSpoken = { text, at: now };
    if (state.mode === 'natural' && synth && text) {
      if (typeTimer) clearInterval(typeTimer);
      typeTimer = null;
      if (state.typingText) emit({ typingText: null, typedCount: 0 });
      speakNatural(text);
      return;
    }
    stopAll();
    emit({ speaking: false, typingText: null, typedCount: 0 });
    if (!text || state.mode === 'silent') return;
    speakBeeps(text, speakToken);
  },
  stop() {
    stopAll();
    pendingText = null;
    emit({ speaking: false, typingText: null, typedCount: 0 });
  },
  /** Corta en seco lo que está sonando (sin respetar la frase): cambio de pantalla o fin de la historia. */
  interrupt({ keepPending = false }: { keepPending?: boolean } = {}) {
    stopAll();
    if (!keepPending) pendingText = null;
    lastSpoken = { text: '', at: 0 };
    emit({ speaking: false, typingText: null, typedCount: 0 });
  },
  /**
   * Retiene la voz: lo que llegue mientras haya alguna retención se guarda (solo el último mensaje)
   * y se dice al liberarla. 'screen' se libera sola tras HOLD_SAFETY_MS por si la pantalla no llega a montarse.
   */
  hold(reason: HoldReason) {
    holds.add(reason);
    if (holdTimers[reason]) clearTimeout(holdTimers[reason]);
    holdTimers[reason] = reason === 'screen' ? setTimeout(() => this.release('screen'), HOLD_SAFETY_MS) : undefined;
  },
  release(reason: HoldReason) {
    if (holdTimers[reason]) clearTimeout(holdTimers[reason]);
    holdTimers[reason] = undefined;
    if (!holds.delete(reason) || holds.size > 0 || !pendingText) return;
    const text = pendingText;
    pendingText = null;
    this.speak(text);
  },
  setMode(mode: VoiceMode) {
    this.stop();
    emit({ mode });
    save();
  },
  getMode(): VoiceMode {
    return state.mode;
  },
  /** Elegir manualmente una voz instalada (por su id). */
  setVoice(id: string) {
    const v = rawVoices.find((rv) => voiceId(rv) === id);
    if (!v) return;
    voice = v;
    emit({ voiceId: id, voiceName: `${v.name} (${v.lang})` });
    save();
  },
  /** Elige la mejor voz del género pedido (priorizando español). Devuelve false si no hay. */
  setGender(gender: Exclude<VoiceGender, 'unknown'>): boolean {
    const match = state.voices.find((v) => v.gender === gender && v.isSpanish) ?? state.voices.find((v) => v.gender === gender);
    if (!match) return false;
    this.setVoice(match.id);
    return true;
  },
  setPitch(pitch: number) {
    emit({ pitch: clampNum(pitch, 0.5, 1.6, 1) });
    save();
  },
  setRate(rate: number) {
    emit({ rate: clampNum(rate, 0.7, MAX_RATE, 0.98) });
    save();
  },
  /** Compatibilidad: true si está en modo silencio. */
  isMuted() {
    return state.mode === 'silent';
  },
  subscribe(listener: Listener) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  getState(): AriaVoiceState {
    return state;
  },
};
