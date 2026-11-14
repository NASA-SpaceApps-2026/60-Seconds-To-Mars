import { motion } from 'framer-motion';
import { Rocket } from 'lucide-react';

// ============================================================
// Fondo ambiental compartido (Selector de Modo y Trivia de la Fase 1):
// estrellas que parpadean, órbitas con planetas y un cohete en trayectoria.
// ============================================================
const STARS = [
  [6, 18], [14, 62], [22, 30], [31, 78], [38, 12], [47, 52], [55, 22], [63, 70], [71, 36], [79, 14], [86, 58], [93, 28], [11, 44], [67, 88], [42, 90],
];

export default function SpaceBackdrop({ showRocket = true }: { showRocket?: boolean }) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {/* Estrellas que parpadean */}
      {STARS.map(([x, y], i) => (
        <motion.span
          key={i}
          className="absolute h-1.5 w-1.5 rounded-full bg-nasa-blue/40"
          style={{ left: `${x}%`, top: `${y}%` }}
          animate={{ opacity: [0.2, 1, 0.2], scale: [0.8, 1.3, 0.8] }}
          transition={{ duration: 2.4 + (i % 4) * 0.6, repeat: Infinity, delay: i * 0.25 }}
        />
      ))}

      {/* Órbitas con pequeños planetas */}
      <div className="absolute -left-[clamp(6rem,14vw,10rem)] -top-[clamp(6rem,14vw,10rem)] h-[clamp(14rem,30vw,24rem)] w-[clamp(14rem,30vw,24rem)]">
        <div className="absolute inset-0 rounded-full border-2 border-dashed border-nasa-blue/15" />
        <motion.div className="absolute inset-0" animate={{ rotate: 360 }} transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}>
          <span className="absolute bottom-[14%] right-[14%] h-4 w-4 rounded-full bg-orange-400 shadow-[0_0_12px_rgba(249,115,22,0.6)]" />
        </motion.div>
        <div className="absolute inset-[18%] rounded-full border border-nasa-blue/10" />
      </div>
      <div className="absolute -right-[clamp(5rem,10vw,8rem)] top-[18%] h-[clamp(10rem,20vw,16rem)] w-[clamp(10rem,20vw,16rem)]">
        <div className="absolute inset-0 rounded-full border-2 border-dashed border-orange-400/25" />
        <motion.div className="absolute inset-0" animate={{ rotate: -360 }} transition={{ duration: 22, repeat: Infinity, ease: 'linear' }}>
          <span className="absolute left-[8%] top-[22%] h-3 w-3 rounded-full bg-nasa-blue/60" />
        </motion.div>
      </div>

      {showRocket && (
        <>
          {/* Cohete siguiendo una trayectoria punteada */}
          <svg className="absolute inset-x-0 top-[6%] h-[30%] w-full" viewBox="0 0 1000 200" preserveAspectRatio="none">
            <path d="M-20 170 C 250 40, 600 220, 1020 30" stroke="#0b3d91" strokeOpacity={0.12} strokeWidth={3} strokeDasharray="10 12" fill="none" />
          </svg>
          <motion.div
            className="absolute top-[6%] h-[30%] w-full"
            initial={{ x: '-10%' }}
            animate={{ x: ['-10%', '105%'] }}
            transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut', repeatDelay: 2 }}
          >
            <motion.span
              className="absolute grid h-9 w-9 place-items-center rounded-full bg-white text-nasa-red shadow-md"
              animate={{ top: ['80%', '20%', '60%', '5%'], rotate: [-20, 10, -10, 15] }}
              transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut', repeatDelay: 2 }}
            >
              <Rocket className="h-5 w-5 rotate-45" strokeWidth={2} />
            </motion.span>
          </motion.div>
        </>
      )}
    </div>
  );
}
