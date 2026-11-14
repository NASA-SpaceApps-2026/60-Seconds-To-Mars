import { useAriaScreenReady } from '../utils/useAriaVoiceState';
import { motion } from 'framer-motion';
import { useGameStore } from '../store/useGameStore';
import Phase1Quiz from './phase1/Phase1Quiz';
import Phase1Summary from './phase1/Phase1Summary';

/**
 * Fase 1: "60 segundos de trivia contrarreloj y asignación automática".
 *  'ready'   → pantalla de "¿Listos?"
 *  'quiz'    → 60 s de preguntas; cada acierto manda un objeto de su rama a la base espacial
 *  'summary' → resumen sin límite de tiempo (objetos + complicaciones); avanza al pulsar el botón, y giro de rescate si fue mal
 */
export default function Phase1Scavenge() {
  useAriaScreenReady();
  const stage = useGameStore((s) => s.phase1Stage);
  const isSummary = stage === 'summary';
  // Sin AnimatePresence mode="wait": si la animación de salida de la trivia se quedaba a medias
  // (pestaña en segundo plano, equipo lento), el resumen no llegaba a montarse y la pantalla quedaba en blanco.
  // Ahora el resumen se monta al instante y solo anima su entrada (empieza visible al 60 %).
  return (
    // Solo fundido (sin desplazamiento lateral): un x: 24 sacaba barras de scroll mientras se abría el prólogo
    <motion.div key={isSummary ? 'summary' : 'quiz'} initial={{ opacity: 0.6 }} animate={{ opacity: 1 }} transition={{ duration: 0.25 }}>
      {isSummary ? <Phase1Summary /> : <Phase1Quiz />}
    </motion.div>
  );
}
