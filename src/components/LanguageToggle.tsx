import { motion } from 'framer-motion';
import { Languages } from 'lucide-react';
import { useGameStore } from '../store/useGameStore';
import type { Lang } from '../i18n/core';
import { playButtonClick } from '../utils/soundEffects';

const OPTIONS: { id: Lang; label: string; title: string }[] = [
  { id: 'es', label: 'ES', title: 'Español' },
  { id: 'en', label: 'EN', title: 'English' },
];

/** Selector de idioma ES / EN: traduce todo el juego (interfaz, datos, Gemini y voz de A.R.I.A.). */
export default function LanguageToggle({ className = '' }: { className?: string }) {
  const language = useGameStore((s) => s.language);
  const setLanguage = useGameStore((s) => s.setLanguage);
  return (
    <div
      role="radiogroup"
      aria-label={language === 'en' ? 'Language' : 'Idioma'}
      className={`flex items-center gap-1 rounded-full border-2 border-slate-300 bg-white p-1 shadow-sm ${className}`}
    >
      <Languages className="ml-1.5 h-4 w-4 text-nasa-blue" strokeWidth={1.75} aria-hidden />
      {OPTIONS.map((o) => {
        const active = language === o.id;
        return (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => {
              playButtonClick();
              setLanguage(o.id);
            }}
            className={`relative rounded-full px-3 py-1 font-mono text-sm font-bold transition ${active ? 'text-white' : 'text-slate-500 hover:text-nasa-blue'}`}
          >
            {active && <motion.span layoutId="lang-pill" className="absolute inset-0 rounded-full bg-nasa-blue" transition={{ type: 'spring', stiffness: 400, damping: 30 }} />}
            <span className="relative">{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}
