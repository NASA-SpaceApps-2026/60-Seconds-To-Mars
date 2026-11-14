import { useSyncExternalStore } from 'react';
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
