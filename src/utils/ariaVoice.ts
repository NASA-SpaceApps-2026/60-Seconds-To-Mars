// Voz de A.R.I.A. — 3 modos de audio:
//  - 'beeps':   (POR DEFECTO) pitidos sci-fi musicales mientras el texto aparece letra a letra.
//  - 'natural': window.speechSynthesis con la voz que elija el jugador (o la mejor en español).
//  - 'silent':  solo texto.
// speechSynthesis.cancel() se llama SIEMPRE antes de cada frase (sin colas infinitas).

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
  rate: clampNum(saved.rate, 0.7, 1.4, 1.02),
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
function stopAll() {
  speakToken++;
  if (typeTimer) clearInterval(typeTimer);
  typeTimer = null;
  synth?.cancel();
}

function speakNatural(text: string, token: number) {
  if (!synth) return;
  // Chrome descarta a veces un speak() inmediatamente posterior a cancel(): pequeño respiro.
  setTimeout(() => {
    if (token !== speakToken) return;
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = voice?.lang ?? 'es-ES';
    if (voice) utter.voice = voice;
    utter.pitch = state.pitch;
    utter.rate = state.rate;
    utter.volume = 1;
    const done = () => {
      if (token === speakToken) emit({ speaking: false });
    };
    utter.onend = done;
    utter.onerror = done;
    emit({ speaking: true });
    try {
      synth.speak(utter);
    } catch {
      done();
    }
  }, 60);
}

function speakBeeps(text: string, token: number) {
  let i = 0;
  emit({ speaking: true, typingText: text, typedCount: 0 });
  typeTimer = setInterval(() => {
    if (token !== speakToken) return;
    i++;
    const ch = text[i - 1] ?? '';
    // Un pitido cada 2 letras (sin espacios ni signos) para que no sature
    if (i % 2 === 0 && /[\p{L}\p{N}]/u.test(ch)) playBlip(ch);
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
  /** Dice el texto según el modo de audio. Siempre corta la frase anterior. */
  speak(text: string) {
    stopAll();
    emit({ speaking: false, typingText: null, typedCount: 0 });
    if (!text || state.mode === 'silent') return;
    const token = speakToken;
    if (state.mode === 'natural' && synth) speakNatural(text, token);
    else speakBeeps(text, token);
  },
  stop() {
    stopAll();
    emit({ speaking: false, typingText: null, typedCount: 0 });
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
    emit({ rate: clampNum(rate, 0.7, 1.4, 1.02) });
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
