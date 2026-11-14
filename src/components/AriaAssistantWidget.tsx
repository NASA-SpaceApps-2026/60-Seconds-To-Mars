import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Bot, ChevronDown, Play, Settings2, Volume2, VolumeX, type LucideIcon } from 'lucide-react';
import { useGameStore } from '../store/useGameStore';
import { ariaVoice, type VoiceMode } from '../utils/ariaVoice';
import { useAriaTypedText, useAriaVoiceState } from '../utils/useAriaVoiceState';
import { playButtonClick } from '../utils/soundEffects';
import { useT } from '../i18n/useT';
import { tr } from '../i18n/core';

interface Props {
  compact?: boolean;
  className?: string;
}

/** Modos de audio (textos según el idioma activo). */
const getModes = (): { id: VoiceMode; label: string; Icon: LucideIcon; title: string }[] => [
  {
    id: 'beeps',
    label: tr('Pitidos Sci-Fi', 'Sci-Fi Beeps'),
    Icon: Bot,
    title: tr('Pitidos Sci-Fi musicales: el texto aparece letra a letra con sonidos de consola espacial', 'Musical sci-fi beeps: the text types out letter by letter with space console sounds'),
  },
  { id: 'natural', label: tr('Voz Hablada', 'Spoken Voice'), Icon: Volume2, title: tr('Voz Hablada: elige la voz de tu navegador', 'Spoken Voice: pick a voice from your browser') },
  { id: 'silent', label: tr('Silencio', 'Silent'), Icon: VolumeX, title: tr('Silencio: solo texto', 'Silent: text only') },
];

/** Panel para elegir voz, tono y velocidad (modo Voz Hablada). */
function VoiceSettings() {
  const t = useT();
  const voice = useAriaVoiceState();
  const hasFemale = voice.voices.some((v) => v.gender === 'female');
  const hasMale = voice.voices.some((v) => v.gender === 'male');
  const spanish = voice.voices.filter((v) => v.isSpanish);
  const others = voice.voices.filter((v) => !v.isSpanish);

  if (!voice.supported || voice.voices.length === 0) {
    return <p className="text-xs text-slate-500">{t('Tu navegador no tiene voces instaladas. Usa el modo Pitidos.', 'Your browser has no voices installed. Use Beeps mode.')}</p>;
  }

  return (
    <div className="grid gap-1 text-xs">
      <label className="grid gap-1">
        <span className="font-bold text-slate-600">{t('Voz instalada en tu navegador', 'Voice installed in your browser')}</span>
        <select
          value={voice.voiceId ?? voice.voices[0]?.id}
          onChange={(e) => ariaVoice.setVoice(e.target.value)}
          className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-slate-800 outline-none focus:ring-2 focus:ring-nasa-blue/40"
        >
          {spanish.length > 0 && (
            <optgroup label={t('Español', 'English')}>
              {spanish.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name} ({v.lang}){v.gender === 'female' ? t(' · femenina', ' · female') : v.gender === 'male' ? t(' · masculina', ' · male') : ''}
                </option>
              ))}
            </optgroup>
          )}
          {others.length > 0 && (
            <optgroup label={t('Otros idiomas', 'Other languages')}>
              {others.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name} ({v.lang})
                </option>
              ))}
            </optgroup>
          )}
        </select>
      </label>
      <div className="flex gap-2">
        <button
          type="button"
          disabled={!hasFemale}
          onClick={() => ariaVoice.setGender('female')}
          className="flex-1 rounded-lg border border-slate-300 bg-white px-2 py-1 font-bold text-slate-700 hover:border-nasa-blue hover:text-nasa-blue disabled:opacity-40"
          title={hasFemale ? t('Usar una voz femenina', 'Use a female voice') : t('No hay voces femeninas reconocidas en tu navegador', 'No female voices found in your browser')}
        >
          {t('Femenina', 'Female')}
        </button>
        <button
          type="button"
          disabled={!hasMale}
          onClick={() => ariaVoice.setGender('male')}
          className="flex-1 rounded-lg border border-slate-300 bg-white px-2 py-1 font-bold text-slate-700 hover:border-nasa-blue hover:text-nasa-blue disabled:opacity-40"
          title={hasMale ? t('Usar una voz masculina', 'Use a male voice') : t('No hay voces masculinas reconocidas en tu navegador', 'No male voices found in your browser')}
        >
          {t('Masculina', 'Male')}
        </button>
      </div>
      <label className="grid gap-0.5">
        <span className="flex justify-between font-bold text-slate-600">
          {t('Tono', 'Pitch')} <span className="tabular-nums text-slate-500">{voice.pitch.toFixed(2)}</span>
        </span>
        <input type="range" min={0.5} max={1.6} step={0.05} value={voice.pitch} onChange={(e) => ariaVoice.setPitch(Number(e.target.value))} />
      </label>
      <label className="grid gap-0.5">
        <span className="flex justify-between font-bold text-slate-600">
          {t('Velocidad', 'Speed')} <span className="tabular-nums text-slate-500">{voice.rate.toFixed(2)}</span>
        </span>
        <input type="range" min={0.7} max={1.2} step={0.05} value={voice.rate} onChange={(e) => ariaVoice.setRate(Number(e.target.value))} />
      </label>
      <button
        type="button"
        onClick={() => ariaVoice.speak(t('Hola, tripulación. Soy A.R.I.A., vuestro ordenador de a bordo.', "Hello, crew. I'm A.R.I.A., your onboard computer."))}
        className="rounded-lg bg-nasa-blue px-2 py-1.5 font-black text-white hover:bg-nasa-blue-light"
      >
        <span className="flex items-center justify-center gap-1"><Play className="h-3.5 w-3.5" /> {t('Probar voz', 'Test voice')}</span>
      </button>
    </div>
  );
}

/** Avatar animado de A.R.I.A. con ondas de audio, texto y selector de modo de audio. */
export default function AriaAssistantWidget({ compact = false, className = '' }: Props) {
  const message = useGameStore((s) => s.ariaMessage);
  const voiceMode = useGameStore((s) => s.voiceMode);
  const setVoiceMode = useGameStore((s) => s.setVoiceMode);
  const voice = useAriaVoiceState();
  const shown = useAriaTypedText(message);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const t = useT();
  const MODES = getModes();
  const speaking = voice.speaking && voiceMode !== 'silent';
  const current = MODES.find((m) => m.id === voiceMode) ?? MODES[0];

  return (
    <div className={`hw-panel px-3 py-2 ${className}`} role="status" aria-live="polite">
      <div className="flex items-center gap-3">
        {/* Avatar */}
        <div className="relative shrink-0">
          <motion.div
            animate={speaking ? { scale: [1, 1.08, 1] } : { scale: 1 }}
            transition={{ duration: 0.9, repeat: speaking ? Infinity : 0 }}
            className={`grid place-items-center rounded-full border-2 border-white bg-gradient-to-br from-nasa-blue-light to-nasa-blue shadow-md ${
              compact ? 'h-10 w-10' : 'h-14 w-14'
            }`}
          >
            <div className="flex gap-1.5">
              <span className="h-2 w-2 rounded-full bg-white shadow-[0_0_6px_#bfdbfe]" />
              <span className="h-2 w-2 rounded-full bg-white shadow-[0_0_6px_#bfdbfe]" />
            </div>
          </motion.div>
          {speaking && <span className="absolute inset-0 animate-ping rounded-full border border-nasa-blue/40" aria-hidden />}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-display text-xs font-bold tracking-[0.2em] text-nasa-blue">A.R.I.A.</span>
            <div className={`aria-wave flex h-5 items-center gap-[3px] text-nasa-red ${speaking ? 'speaking' : ''}`} aria-hidden>
              <span />
              <span />
              <span />
              <span />
              <span />
            </div>
          </div>
          <AnimatePresence mode="wait">
            <motion.p
              key={message}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.2 }}
              className={`text-slate-800 ${compact ? 'line-clamp-2 text-sm' : 'line-clamp-3 text-base'}`}
              title={message}
            >
              {shown}
              {shown.length < message.length && <span className="ml-0.5 inline-block h-3 w-1.5 animate-pulse bg-nasa-blue align-middle" />}
            </motion.p>
          </AnimatePresence>
        </div>

        {/* Selector de modo de audio: botón visible + <select> nativo invisible encima */}
        <div className="flex shrink-0 items-center gap-1">
          <label className="relative" title={current.title}>
            <span className="sr-only">{t('Modo de audio de A.R.I.A.', 'A.R.I.A. audio mode')}</span>
            <span
              aria-hidden
              className={`flex items-center gap-1 rounded-lg border px-2 py-1.5 text-sm font-bold ${
                voiceMode === 'silent' ? 'border-slate-300 bg-slate-100 text-slate-500' : 'border-nasa-blue/40 bg-blue-50 text-nasa-blue'
              }`}
            >
              <current.Icon className="h-4 w-4" strokeWidth={1.75} />{!compact && current.label} <ChevronDown className="h-3.5 w-3.5 opacity-70" />
            </span>
            <select
              value={voiceMode}
              onChange={(e) => {
                playButtonClick();
                const mode = e.target.value as VoiceMode;
                setVoiceMode(mode);
                setSettingsOpen(mode === 'natural');
              }}
              className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            >
              {MODES.map((m) => (
                <option key={m.id} value={m.id} disabled={m.id === 'natural' && !voice.supported}>
                  {m.label}
                </option>
              ))}
            </select>
          </label>
          {voiceMode === 'natural' && (
            <button
              type="button"
              onClick={() => setSettingsOpen((o) => !o)}
              className={`rounded-lg border p-1.5 transition ${settingsOpen ? 'border-nasa-blue bg-nasa-blue text-white' : 'border-slate-300 bg-white text-slate-600 hover:text-nasa-blue'}`}
              title={t('Elegir voz, tono y velocidad', 'Choose voice, pitch and speed')}
              aria-expanded={settingsOpen}
            >
              <Settings2 size={16} />
            </button>
          )}
        </div>
      </div>

      <AnimatePresence>
        {voiceMode === 'natural' && settingsOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-1 border-t border-slate-200 pt-2">
              <VoiceSettings />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
