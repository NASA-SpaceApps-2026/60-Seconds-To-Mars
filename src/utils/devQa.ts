import { useGameStore } from '../store/useGameStore';
import { buildFieldNote } from '../data/fieldNotes';
import { HOUSTON_PACKAGES } from '../data/missionExtras';
import { getFallbackMarsPhotos } from '../services/nasaApi';

/**
 * Atajos de QA SOLO en desarrollo (`npm run dev`): abrir la app con un hash salta a una pantalla
 * con datos de prueba, para revisar el diseño responsive sin jugar entera la partida.
 *   #qa-quiz     → trivia en marcha
 *   #qa-summary  → resumen de la trivia (con aciertos, fallos y una avería)
 *   #qa-capsule  → resumen con la Cápsula Orbital ya abierta
 *   #qa-bunker   → base espacial (inventario de depuración)
 *   #qa-bunker-systems / #qa-bunker-decision → base espacial con ese panel ya abierto
 *   #qa-gameover → pantalla final (victoria) · #qa-rover → rescate 3D en rover
 *   #qa-selector → selector de modo · #qa-transmission → carta de Houston con foto
 * En producción no hace nada (se elimina del bundle con import.meta.env.DEV).
 */
export function runDevQaScenario(): void {
  if (!import.meta.env.DEV) return;
  const scenario = window.location.hash.replace('#', '');
  if (!scenario.startsWith('qa-')) return;
  if (scenario === 'qa-selector') {
    useGameStore.getState().enterMissionSelector();
    return;
  }
  const store = useGameStore;
  const s = () => store.getState();

  if (scenario === 'qa-quiz' || scenario.startsWith('qa-summary') || scenario === 'qa-capsule') {
    s().startGame();
    s().closeStory();
    s().beginQuiz();
    if (scenario !== 'qa-quiz') {
      // 7 respuestas: unas bien y otras mal para que haya objetos y alguna avería
      for (let i = 0; i < 7; i++) {
        const q = s().quizQueue[s().quizIndex];
        if (!q) break;
        s().answerQuiz(i % 3 === 2 ? q.answers[1] : q.answers[0]);
        s().nextQuizQuestion();
      }
      s().finishQuiz();
      // Con un giro de rescate el resumen no avanza solo (así se puede revisar con calma)
      if (scenario !== 'qa-summary-auto') store.setState({ freeSpins: 1 });
    }
    return;
  }
  if (scenario.startsWith('qa-bunker') || scenario === 'qa-gameover' || scenario === 'qa-transmission') {
    s().debugSkipToPhase2();
    s().closeStory();
    if (scenario === 'qa-transmission') {
      // Carta de Houston con foto real (local) y suministro entregado
      const photo = getFallbackMarsPhotos()[0] ?? null;
      store.setState((st) => ({
        marsPhotos: photo ? [photo, ...st.marsPhotos.filter((p) => p.id !== photo.id)] : st.marsPhotos,
        fieldNote: {
          key: Date.now(),
          photoId: photo?.id ?? null,
          source: 'houston',
          sol: 3,
          ...buildFieldNote(photo, 'houston', st.vitals, 0),
          delivered: [{ label: HOUSTON_PACKAGES.oxygen_reserve.label, vital: 'oxygen', amount: HOUSTON_PACKAGES.oxygen_reserve.amount }],
        },
      }));
    }
    if (scenario === 'qa-gameover') {
      store.setState((st) => ({
        gamePhase: 'GAME_OVER',
        outcome: 'victory',
        rank: 'Ingeniero de Sistemas Artemisa',
        scienceScore: 35,
        badges: ['solar_engineer', 'genelab_botanist'],
        vitals: { ...st.vitals, oxygen: 62, power: 48, food: 55, shield: 41, crewHealth: 77 },
      }));
    }
  }
  if (scenario === 'qa-rover') {
    s().debugSkipToPhase2();
    s().closeStory();
    store.setState({ gamePhase: 'ROVER_RESCUE', outcome: 'victory', pendingOutcome: null, scienceScore: 30 });
  }
}

/** Panel de la base espacial que debe abrirse al entrar (solo en desarrollo, para revisar el diseño). */
export function devInitialOverlay(): 'none' | 'systems' | 'decision' {
  if (!import.meta.env.DEV) return 'none';
  const h = window.location.hash;
  return h === '#qa-bunker-systems' ? 'systems' : h === '#qa-bunker-decision' ? 'decision' : 'none';
}

/** Abre la Cápsula Orbital del resumen al entrar con #qa-capsule (solo en desarrollo). */
export function devOpenCapsule(): boolean {
  return import.meta.env.DEV && window.location.hash === '#qa-capsule';
}
