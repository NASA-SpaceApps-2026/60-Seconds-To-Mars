import { useEffect, useSyncExternalStore } from 'react';
import { ariaVoice, type AriaVoiceState } from './ariaVoice';

/** Estado en vivo del motor de voz de A.R.I.A. */
export function useAriaVoiceState(): AriaVoiceState {
  return useSyncExternalStore(ariaVoice.subscribe, ariaVoice.getState);
}

/**
 * Devuelve el texto tal y como debe verse: en modo pitidos aparece letra a letra
 * mientras A.R.I.A. lo "dice"; en los demás modos, completo.
 */
export function useAriaTypedText(fullText: string): string {
  const voice = useAriaVoiceState();
  if (voice.typingText === fullText) return fullText.slice(0, voice.typedCount);
  return fullText;
}

/** Tiempo de la animación de entrada de cada pantalla (App.tsx: fundido de 0,35 s) + margen. */
const SCREEN_VISIBLE_MS = 420;

/**
 * Llamar en cada pantalla principal: cuando ya está montada y visible, libera la voz de A.R.I.A.
 * (que el store retiene en cada cambio de fase) y se dice el último mensaje pendiente de esa pantalla.
 */
export function useAriaScreenReady(): void {
  useEffect(() => {
    const t = setTimeout(() => ariaVoice.release('screen'), SCREEN_VISIBLE_MS);
    return () => clearTimeout(t);
  }, []);
}
