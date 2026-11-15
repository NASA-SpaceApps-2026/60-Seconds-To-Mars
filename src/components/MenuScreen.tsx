import { useAriaScreenReady } from '../utils/useAriaVoiceState';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Camera, Pencil, Rocket, Trash2 } from 'lucide-react';
import { useGameStore } from '../store/useGameStore';
import { playButtonClick, unlockAudio } from '../utils/soundEffects';
import AriaAssistantWidget from './AriaAssistantWidget';
import AriaCommandInput from './AriaCommandInput';
import MissionPatch from './MissionPatchLogo';
import LanguageToggle from './LanguageToggle';
import SpaceBackdrop from './SpaceBackdrop';
import { useT } from '../i18n/useT';
import CadetCameraModal from './CadetCameraModal';
import CadetFramedAvatar from './CadetFramedAvatar';
import { cadetDisplayName, cadetRoleLabel } from '../data/cadetRoles';

/** Tarjeta compacta de la Credencial de Cadete (webcam 100 % local). */
function CadetBadgeCard() {
  const t = useT();
  const photo = useGameStore((s) => s.cadetPhoto);
  const name = useGameStore((s) => s.cadetName);
  const role = useGameStore((s) => s.cadetRole);
  const clearCadetProfile = useGameStore((s) => s.clearCadetProfile);
  const [open, setOpen] = useState(false);
  const hasProfile = Boolean(photo || name);
  const openModal = () => {
    unlockAudio();
    playButtonClick();
    setOpen(true);
  };

  return (
    <>
      {hasProfile ? (
        <div className="mt-[clamp(0.6rem,2dvh,1rem)] flex max-w-full shrink-0 items-center gap-3 rounded-2xl border-2 border-slate-300 bg-white/90 py-1.5 pl-1.5 pr-2 text-left shadow-sm">
          <CadetFramedAvatar photo={photo} name={name} role={role} size="sm" plate={false} />
          <div className="min-w-0">
            <p className="truncate font-mono text-sm font-black tracking-wider text-nasa-blue">
              {t('CADETE', 'CADET')} {cadetDisplayName(name)}
            </p>
            <p className="truncate text-xs font-semibold text-slate-600">{cadetRoleLabel(role)}</p>
          </div>
          <button
            type="button"
            onClick={openModal}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-slate-300 text-slate-600 transition hover:border-nasa-blue hover:text-nasa-blue"
            title={t('Cambiar credencial', 'Change badge')}
            aria-label={t('Cambiar credencial', 'Change badge')}
          >
            <Pencil className="h-4 w-4" strokeWidth={1.75} />
          </button>
          <button
            type="button"
            onClick={() => {
              playButtonClick();
              clearCadetProfile();
            }}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-slate-300 text-slate-600 transition hover:border-nasa-red hover:text-nasa-red"
            title={t('Borrar credencial', 'Delete badge')}
            aria-label={t('Borrar credencial', 'Delete badge')}
          >
            <Trash2 className="h-4 w-4" strokeWidth={1.75} />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={openModal}
          className="mt-[clamp(0.6rem,2dvh,1rem)] flex shrink-0 items-center gap-2 rounded-xl border-2 border-slate-300 bg-white/90 px-4 py-2 text-sm font-bold text-nasa-blue shadow-sm transition hover:border-nasa-blue"
        >
          <Camera className="h-5 w-5" strokeWidth={1.75} /> {t('Credencial de Cadete (Webcam)', 'Cadet Badge (Webcam)')}
        </button>
      )}
      {open && <CadetCameraModal onClose={() => setOpen(false)} />}
    </>
  );
}

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
      <SpaceBackdrop />
      <div
        className="pointer-events-none absolute -bottom-[clamp(10rem,30vw,18rem)] -right-[clamp(8rem,20vw,12rem)] h-[clamp(18rem,40vw,36rem)] w-[clamp(18rem,40vw,36rem)] opacity-90"
        aria-hidden
      >
        <div className="absolute -inset-4 rounded-full border-2 border-slate-300/80" />
        <div className="absolute inset-0 overflow-hidden rounded-full border-[5px] border-slate-300 bg-[#7c2d12] shadow-[inset_-28px_-24px_42px_rgba(67,20,7,0.55),0_0_0_14px_rgba(255,255,255,0.72),0_18px_40px_rgba(15,23,42,0.18)]">
          <motion.img
            src="/mars/mars-globe.jpg"
            alt=""
            className="h-full w-full scale-[1.03] object-cover"
            style={{ filter: 'sepia(0.28) saturate(1.65) hue-rotate(-8deg) brightness(1.04) contrast(1.06)' }}
            animate={{ rotate: 360 }}
            transition={{ duration: 120, repeat: Infinity, ease: 'linear' }}
            aria-hidden
          />
          <div className="pointer-events-none absolute inset-0 rounded-full bg-[radial-gradient(circle_at_28%_22%,rgba(255,214,170,0.2),transparent_28%),linear-gradient(135deg,transparent_42%,rgba(124,45,18,0.42)_100%)]" />
        </div>
      </div>
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
          {t('Una tormenta solar va hacia Marte. ¿Salvarás a tu tripulación?', 'A solar storm is heading for Mars. Will you save your crew?')}
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

        <CadetBadgeCard />

        <AriaAssistantWidget className="mt-[clamp(0.9rem,4dvh,2rem)] w-full max-w-xl shrink-0 text-left" />
        <AriaCommandInput className="mt-2 w-full max-w-xl shrink-0 text-left" />
      </section>
    </main>
  );
}
