import { lazy, Suspense, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useGameStore } from './store/useGameStore';
import { unlockAudio } from './utils/soundEffects';
import { runDevQaScenario } from './utils/devQa';
import MenuScreen from './components/MenuScreen';
import MissionSelector from './components/MissionSelector';
import ScreenErrorBoundary from './components/ScreenErrorBoundary';

// Las pantallas de juego se cargan bajo demanda (bundle inicial más ligero)
const Phase1Scavenge = lazy(() => import('./components/Phase1Scavenge'));
const Phase2Bunker = lazy(() => import('./components/Phase2Bunker'));
const GameOverScreen = lazy(() => import('./components/GameOverScreen'));
const StoryComicModal = lazy(() => import('./components/StoryComicModal'));

function ScreenLoader() {
  return (
    <div className="grid h-dvh place-items-center bg-slate-100">
      <p className="font-display animate-pulse text-sm font-bold tracking-[0.3em] text-nasa-blue">CARGANDO MÓDULO...</p>
    </div>
  );
}

/** Orquestador principal: elige la pantalla según la fase del juego. */
export default function App() {
  const gamePhase = useGameStore((s) => s.gamePhase);
  const loadNasaWeather = useGameStore((s) => s.loadNasaWeather);

  // Telemetría real de NASA DONKI y fotos reales de Marte al arrancar (listas mucho antes del primer envío)
  useEffect(() => {
    if (useGameStore.getState().nasaStatus === 'idle') void loadNasaWeather();
    if (useGameStore.getState().marsPhotosStatus === 'idle') void useGameStore.getState().loadMarsPhotos();
    if (useGameStore.getState().osdrStatus === 'idle') void useGameStore.getState().loadOsdrStudy();
  }, [loadNasaWeather]);

  // Solo en desarrollo: #qa-quiz, #qa-summary, #qa-bunker, #qa-gameover saltan a esa pantalla (revisión responsive)
  useEffect(() => {
    runDevQaScenario();
  }, []);

  // Los navegadores exigen un gesto del usuario para activar el audio
  useEffect(() => {
    const unlock = () => unlockAudio();
    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, []);

  return (
    <>
    <AnimatePresence mode="wait">
      <motion.div
        key={gamePhase}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.35 }}
      >
        <ScreenErrorBoundary onHome={() => useGameStore.getState().resetToMenu()}>
          <Suspense fallback={<ScreenLoader />}>
            {gamePhase === 'MENU' && <MenuScreen />}
            {gamePhase === 'MISSION_SELECT' && <MissionSelector />}
            {gamePhase === 'PHASE_1_SCAVENGE' && <Phase1Scavenge />}
            {gamePhase === 'PHASE_2_BUNKER' && <Phase2Bunker />}
            {gamePhase === 'GAME_OVER' && <GameOverScreen />}
          </Suspense>
        </ScreenErrorBoundary>
      </motion.div>
    </AnimatePresence>
    {/* Modo Historia: viñetas de cómic entre pantallas */}
    <Suspense fallback={null}>
      <StoryComicModal />
    </Suspense>
    </>
  );
}
