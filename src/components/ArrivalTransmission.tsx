import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, Camera, ImageOff, LoaderCircle, PackageCheck, PackageOpen, Radio, Telescope } from 'lucide-react';
import { FIELD_NOTE_SENDER, FIELD_NOTE_SPEAKER, photoFactLine } from '../data/fieldNotes';
import { localMarsImageFor } from '../services/nasaApi';
import { VITAL_META, useGameStore } from '../store/useGameStore';
import { playButtonClick } from '../utils/soundEffects';
import { RobotSvg } from './AriaRobot';
import { ResourceIcon } from './icons';

/** Comandante Elena (rover de rescate), de medio cuerpo, con el visor levantado y el comunicador. */
function CommanderElena({ talking }: { talking: boolean }) {
  return (
    <svg viewBox="0 0 300 420" className="h-full w-full drop-shadow-[0_20px_40px_rgba(2,6,23,0.6)]" aria-hidden>
      {/* Cuerpo del traje */}
      <path d="M30 420 Q34 300 92 270 L208 270 Q268 300 272 420 Z" fill="#f8fafc" stroke="#cbd5e1" strokeWidth={3} />
      <path d="M44 360 Q150 338 258 360 L262 384 Q150 362 40 384 Z" fill="#0b3d91" />
      <path d="M42 388 Q150 366 262 388 L263 396 Q150 374 41 396 Z" fill="#fc3d21" />
      {/* Unidad de comunicaciones en el pecho */}
      <rect x={118} y={296} width={64} height={40} rx={8} fill="#1e293b" stroke="#475569" strokeWidth={2} />
      <motion.circle cx={134} cy={316} r={5} fill="#4ade80" animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 0.9, repeat: Infinity }} />
      <rect x={146} y={308} width={28} height={4} rx={2} fill="#38bdf8" />
      <rect x={146} y={318} width={20} height={4} rx={2} fill="#38bdf8" opacity={0.6} />
      {/* Parche del hombro */}
      <circle cx={70} cy={318} r={20} fill="#0b3d91" stroke="#ffffff" strokeWidth={3} />
      <circle cx={70} cy={318} r={9} fill="#ea580c" />
      <ellipse cx={70} cy={318} rx={16} ry={5} fill="none" stroke="#ffffff" strokeWidth={1.6} transform="rotate(-20 70 318)" />
      {/* Brazo que saluda */}
      <motion.g style={{ transformOrigin: '236px 300px' }} animate={{ rotate: [0, -14, 0, -10, 0] }} transition={{ duration: 1.8, repeat: Infinity, repeatDelay: 0.6 }}>
        <path d="M222 292 Q262 250 270 196" stroke="#f1f5f9" strokeWidth={34} strokeLinecap="round" fill="none" />
        <path d="M222 292 Q262 250 270 196" stroke="#cbd5e1" strokeWidth={34} strokeLinecap="round" fill="none" opacity={0.25} />
        <circle cx={271} cy={186} r={20} fill="#94a3b8" />
      </motion.g>
      {/* Cuello */}
      <rect x={124} y={244} width={52} height={34} rx={10} fill="#cbd5e1" />
      {/* Casco con el visor levantado */}
      <circle cx={150} cy={160} r={98} fill="#f8fafc" stroke="#cbd5e1" strokeWidth={4} />
      <path d="M70 120 Q150 40 230 120 Q150 92 70 120 Z" fill="#b45309" opacity={0.9} />
      <path d="M66 126 Q150 70 234 126" stroke="#0b3d91" strokeWidth={10} fill="none" strokeLinecap="round" />
      {/* Cara */}
      <ellipse cx={150} cy={178} rx={66} ry={70} fill="#e0ac69" />
      <path d="M86 160 Q96 104 150 102 Q206 104 214 160 Q190 128 150 130 Q112 128 86 160 Z" fill="#3f1d0b" />
      <circle cx={126} cy={176} r={7} fill="#0f172a" />
      <circle cx={174} cy={176} r={7} fill="#0f172a" />
      <circle cx={128} cy={173} r={2.2} fill="#ffffff" />
      <circle cx={176} cy={173} r={2.2} fill="#ffffff" />
      <path d="M114 158 q12 -8 24 0 M162 158 q12 -8 24 0" stroke="#3f1d0b" strokeWidth={4} fill="none" strokeLinecap="round" />
      <circle cx={108} cy={198} r={9} fill="#fb7185" opacity={0.35} />
      <circle cx={192} cy={198} r={9} fill="#fb7185" opacity={0.35} />
      {/* Boca que habla */}
      <motion.ellipse
        cx={150}
        cy={214}
        rx={16}
        fill="#7f1d1d"
        initial={false}
        animate={talking ? { ry: [4, 10, 5, 9, 4] } : { ry: 4 }}
        transition={talking ? { duration: 0.6, repeat: Infinity } : {}}
      />
      {/* Auricular y micrófono */}
      <rect x={52} y={150} width={22} height={46} rx={10} fill="#0b3d91" />
      <path d="M64 196 Q80 236 118 228" stroke="#334155" strokeWidth={5} fill="none" strokeLinecap="round" />
      <circle cx={120} cy={228} r={7} fill="#1e293b" />
    </svg>
  );
}

/**
 * Escena de transmisión entrante (envío de Houston o postal del rover/sonda):
 * PASO 1 — personaje en grande + carta con el suministro ya sumado y la foto real de la NASA.
 * PASO 2 — en los envíos de Houston, botón para abrir el contenedor extra en la Cápsula Orbital (CS:GO).
 */
export default function ArrivalTransmission({ visible, onOpenCrate }: { visible: boolean; onOpenCrate: () => void }) {
  const note = useGameStore((s) => s.fieldNote);
  const photos = useGameStore((s) => s.marsPhotos);
  const unlocked = useGameStore((s) => s.unlockedPhotoIds.length);
  const dismiss = useGameStore((s) => s.dismissFieldNote);
  const [loaded, setLoaded] = useState<string | null>(null);
  const [broken, setBroken] = useState<string | null>(null);
  /** Fotos cuya URL remota falló: se muestran desde public/mars/ (respaldo local infalible). */
  const [useLocal, setUseLocal] = useState<Record<string, boolean>>({});
  const photo = note?.photoId ? photos.find((p) => p.id === note.photoId) ?? null : null;
  const speaker = note ? FIELD_NOTE_SPEAKER[note.source] : null;
  const isHouston = note?.source === 'houston';

  const finish = () => {
    playButtonClick();
    dismiss();
    if (isHouston) onOpenCrate();
  };

  return (
    <AnimatePresence>
      {visible && note && speaker && (
        <motion.div
          key={note.key}
          className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="dialog"
          aria-modal="true"
          aria-label={`Transmisión entrante: ${note.headline}`}
        >
          {/* Personaje en grande entrando por la derecha */}
          <motion.div
            className="pointer-events-none fixed bottom-0 right-0 hidden h-[min(80vh,44rem)] w-[min(34vw,30rem)] md:block"
            initial={{ x: '110%' }}
            animate={{ x: 0 }}
            exit={{ x: '110%' }}
            transition={{ type: 'spring', stiffness: 120, damping: 18, delay: 0.1 }}
          >
            {speaker.kind === 'elena' ? (
              <CommanderElena talking />
            ) : (
              <div className="flex h-full items-end justify-center pb-6">
                <div className="h-[70%] w-[80%]">
                  <RobotSvg speaking />
                </div>
              </div>
            )}
          </motion.div>

          <div className="relative flex min-h-full flex-col items-start justify-center gap-4 p-4 md:pr-[min(34vw,30rem)] lg:pl-10">
            {/* Bocadillo del personaje */}
            <motion.div
              className="relative w-full max-w-[44rem] rounded-2xl border-2 border-slate-900 bg-white px-5 py-4 shadow-[5px_5px_0_0_rgba(2,6,23,0.6)]"
              initial={{ opacity: 0, x: 40, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              transition={{ delay: 0.45 }}
            >
              <span className="absolute -right-3 top-8 hidden h-6 w-6 rotate-45 border-r-2 border-t-2 border-slate-900 bg-white md:block" aria-hidden />
              <p className="font-mono text-xs font-bold tracking-[0.2em] text-nasa-blue">
                {speaker.name.toUpperCase()} · {speaker.role.toUpperCase()}
              </p>
              <p className="mt-1 text-xl font-bold leading-snug text-slate-900">{note.speech}</p>
            </motion.div>

            {/* La carta / transmisión con la foto real */}
            <motion.article
              className="w-full max-w-[44rem] overflow-hidden rounded-xl border-[8px] border-white bg-white shadow-[0_30px_60px_-15px_rgba(2,6,23,0.8)]"
              initial={{ opacity: 0, y: 40, rotate: -2 }}
              animate={{ opacity: 1, y: 0, rotate: -0.5 }}
              transition={{ type: 'spring', stiffness: 150, damping: 16, delay: 0.25 }}
            >
              <div
                className="h-2.5 w-full"
                style={{ background: 'repeating-linear-gradient(135deg, #0b3d91 0 14px, #ffffff 14px 22px, #fc3d21 22px 36px, #ffffff 36px 44px)' }}
                aria-hidden
              />
              <div className="flex flex-col gap-3 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="flex items-center gap-1.5 font-mono text-xs font-bold tracking-[0.2em] text-nasa-blue">
                    <Radio className="h-4 w-4" strokeWidth={1.75} /> TRANSMISIÓN ENTRANTE · SOL {note.sol}
                  </p>
                  <span className="text-sm font-semibold text-slate-500">{FIELD_NOTE_SENDER[note.source]}</span>
                </div>
                <h2 className={`font-display text-2xl font-black leading-tight ${note.urgent ? 'text-nasa-red' : 'text-nasa-blue'}`}>{note.headline}</h2>

                {/* Suministro base ya sumado */}
                {note.delivered && note.delivered.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {note.delivered.map((d, i) => (
                      <span key={i} className="flex items-center gap-2 rounded-lg border-2 border-emerald-500 bg-emerald-50 px-3 py-1.5 text-base font-bold text-emerald-800">
                        <PackageCheck className="h-5 w-5" strokeWidth={1.75} />
                        <span className="flex items-center gap-1 font-mono">
                          +{d.amount} <ResourceIcon k={d.vital} className="h-4 w-4" />
                        </span>
                        {VITAL_META[d.vital].label} · ya sumado
                        <span className="hidden text-sm font-semibold text-emerald-700 sm:inline">({d.label})</span>
                      </span>
                    ))}
                  </div>
                )}

                {/* Foto real de la NASA */}
                <div className="relative aspect-[16/9] overflow-hidden rounded-lg bg-slate-900">
                  {photo && broken !== photo.id ? (
                    <img
                      key={useLocal[photo.id] ? 'local' : 'remota'}
                      src={useLocal[photo.id] ? localMarsImageFor(photo.id) : photo.imageUrl}
                      alt={photo.title}
                      referrerPolicy="no-referrer"
                      className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-500 ${loaded === photo.id ? 'opacity-100' : 'opacity-0'}`}
                      onLoad={() => setLoaded(photo.id)}
                      onError={() => (useLocal[photo.id] || photo.imageUrl.startsWith('/') ? setBroken(photo.id) : setUseLocal((u) => ({ ...u, [photo.id]: true })))}
                    />
                  ) : (
                    <div className="absolute inset-0 grid place-items-center text-slate-400">
                      <span className="flex flex-col items-center gap-2 px-6 text-center text-sm">
                        <ImageOff className="h-8 w-8" />
                        {photo ? 'Sin señal de imagen' : 'Esta vez la transmisión llegó sin foto (sin conexión con la NASA).'}
                      </span>
                    </div>
                  )}
                  {photo && loaded !== photo.id && broken !== photo.id && (
                    <span className="absolute inset-0 grid place-items-center">
                      <LoaderCircle className="h-8 w-8 animate-spin text-sky-300" />
                    </span>
                  )}
                  {photo && (
                    <span className="absolute left-3 top-3 flex items-center gap-1.5 rounded-md bg-black/70 px-2 py-1 font-mono text-xs font-bold text-white">
                      <Camera className="h-3.5 w-3.5" /> FOTO REAL · NASA/JPL-Caltech
                    </span>
                  )}
                </div>

                {/* Cuento que conecta la foto con la aventura */}
                <p className="text-lg leading-relaxed text-slate-800">{note.message}</p>
                {photo && <p className="border-t border-dashed border-slate-300 pt-2 font-mono text-xs leading-relaxed text-slate-500">{photoFactLine(photo)}</p>}
                {photo && (
                  <p className="flex items-center gap-1.5 text-sm font-semibold text-emerald-700">
                    <Telescope className="h-4 w-4" strokeWidth={1.75} /> Foto desbloqueada en el Periscopio ({unlocked} en tu álbum)
                  </p>
                )}

                {/* PASO 2 */}
                {isHouston ? (
                  <motion.button
                    type="button"
                    onClick={finish}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    animate={{ boxShadow: ['0 0 0 0 rgba(252,61,33,0.65)', '0 0 0 14px rgba(252,61,33,0)', '0 0 0 0 rgba(252,61,33,0)'] }}
                    transition={{ duration: 1.6, repeat: Infinity }}
                    className="font-display mt-1 flex items-center justify-center gap-3 rounded-xl bg-nasa-red px-5 py-4 text-left text-lg font-black tracking-wide text-white"
                  >
                    <PackageOpen className="h-7 w-7 shrink-0" strokeWidth={1.75} />
                    <span>
                      ¡HAY UN CONTENEDOR EXTRA DENTRO!
                      <span className="flex items-center gap-1 text-base">
                        <ArrowRight className="h-4 w-4" /> ABRIR CAJA DE SUMINISTROS
                      </span>
                    </span>
                  </motion.button>
                ) : (
                  <button
                    type="button"
                    onClick={finish}
                    className="font-display mt-1 rounded-xl bg-nasa-blue px-5 py-3 text-base font-black tracking-wider text-white transition hover:brightness-110"
                  >
                    GUARDAR EN EL ÁLBUM Y SEGUIR
                  </button>
                )}
              </div>
            </motion.article>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
