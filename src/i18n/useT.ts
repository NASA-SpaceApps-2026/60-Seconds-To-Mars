import { useGameStore } from '../store/useGameStore';
import type { Lang } from './core';

/** Idioma activo (re-pinta el componente al cambiarlo). */
export function useLang(): Lang {
  return useGameStore((s) => s.language);
}

/** `t('texto en español', 'English text')` según el idioma activo (reactivo). */
export function useT(): (es: string, en: string) => string {
  const lang = useLang();
  return (es, en) => (lang === 'en' ? en : es);
}
