import { useAriaScreenReady } from '../utils/useAriaVoiceState';
import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Rocket } from 'lucide-react';
import { useGameStore } from '../store/useGameStore';
import { playButtonClick, unlockAudio } from '../utils/soundEffects';
import AriaAssistantWidget from './AriaAssistantWidget';
import AriaCommandInput from './AriaCommandInput';
import MissionPatch from './MissionPatchLogo';
import LanguageToggle from './LanguageToggle';
import { useT } from '../i18n/useT';

/**
 * Portada. Cabe entera en el viewport (h-dvh) a 100 % de zoom: todos los tamaños y márgenes
 * escalan con el ALTO disponible (dvh) además del ancho, así no hace falta bajar el zoom.
 */
export default function MenuScreen() {
  useAriaScreenReady();
  const enterMissionSelector = useGameStore((s) => s.enterMissionSelector);
  const testGemini = useGameStore((s) => s.testGemini);
  const t = useT();

  // Diagnóstico de Gemini en segundo plano (sin píldora visible)
  useEffect(() => {
    if (useGameStore.getState().aiStatus === 'idle') void testGemini();
  }, [testGemini]);

  return (
    <main
      className="relative flex h-dvh flex-col items-center justify-center overflow-hidden bg-slate-100 px-4 py-[clamp(0.75rem,3dvh,2rem)] sm:px-6"
      onPointerDown={unlockAudio}
    >
      <div className="bg-grid pointer-events-none absolute inset-0" />
      <div
        className="pointer-events-none absolute -bottom-[clamp(10rem,30vw,18rem)] -right-[clamp(8rem,20vw,12rem)] h-[clamp(18rem,40vw,36rem)] w-[clamp(18rem,40vw,36rem)] rounded-full opacity-90"
        style={{
          background: 'radial-gradient(circle at 30% 30%, #fdba74 0%, #ea580c 40%, #9a3412 72%, #431407 100%)',
          boxShadow: '0 0 0 14px rgba(255,255,255,0.7), 0 0 0 16px #cbd5e1',
        }}
      />
      <div className="pointer-events-none absolute left-0 top-0 h-2 w-full bg-nasa-blue" />
      <div className="pointer-events-none absolute left-0 top-2 h-1 w-full bg-nasa-red" />
      <LanguageToggle className="absolute right-[clamp(0.75rem,2vw,1.5rem)] top-[clamp(0.9rem,2.5dvh,1.5rem)] z-20" />

      <section className="menu-scroll relative z-10 flex min-h-0 max-h-full w-full max-w-4xl flex-col items-center overflow-y-auto text-center">
        <motion.div initial={{ scale: 0, rotate: -40 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 140 }}>
          <MissionPatch size={180} className="h-[clamp(4.5rem,16dvh,10rem)] w-auto" />
        </motion.div>
        <p className="font-display mt-[clamp(0.5rem,1.6dvh,1.25rem)] text-xs tracking-[0.25em] text-slate-500 sm:tracking-[0.3em]">
          NASA SPACE APPS · JUNIOR ASTRONAUT MISSION TRAINER
        </p>
        <motion.h1
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 120, delay: 0.1 }}
          className="font-display mt-1 text-[clamp(2rem,min(6vw,9dvh),5rem)] font-black leading-[1.05] text-nasa-blue"
        >
          60 Seconds <span className="text-nasa-red">to Mars</span>
        </motion.h1>
        <h2 className="font-display mt-1 text-[clamp(0.95rem,min(1.9vw,3dvh),1.5rem)] font-bold tracking-widest text-slate-700">
          THE SOLAR STORM PROTOCOL
        </h2>
        <p className="mt-[clamp(0.4rem,1.5dvh,1rem)] max-w-2xl text-[clamp(0.95rem,min(1.4vw,2.4dvh),1.2rem)] font-semibold text-slate-600">
          {t('Una tormenta solar real va hacia Marte. ¿Salvarás a tu tripulación?', 'A real solar storm is heading for Mars. Will you save your crew?')}
        </p>

        <motion.button
          type="button"
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => {
            unlockAudio();
            playButtonClick();
            enterMissionSelector();
          }}
          className="glow-red font-display mt-[clamp(0.9rem,4dvh,2.25rem)] flex shrink-0 items-center gap-3 rounded-2xl bg-nasa-red px-8 py-[clamp(0.6rem,2dvh,1rem)] text-lg font-black tracking-wider text-white sm:px-12 sm:text-xl"
        >
          <Rocket size={26} /> {t('COMENZAR MISIÓN', 'START MISSION')}
        </motion.button>

        <AriaAssistantWidget className="mt-[clamp(0.9rem,4dvh,2rem)] w-full max-w-xl shrink-0 text-left" />
        <AriaCommandInput className="mt-2 w-full max-w-xl shrink-0 text-left" />
      </section>
    </main>
  );
}
