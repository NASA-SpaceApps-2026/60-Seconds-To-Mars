import { useEffect, useMemo, useState } from 'react';
import NasaDataSourcesModal from './NasaDataSourcesModal';
import { AnimatePresence, motion } from 'framer-motion';
import { Award, Camera, Database, ChevronLeft, ChevronRight, CircleCheck, ExternalLink, ImageOff, LoaderCircle, Lock, Satellite, SatelliteDish, Sprout, Sun, Telescope, Trophy, Wrench, X, type LucideIcon } from 'lucide-react';
import type { BadgeId } from '../types/game';
import { BADGES, BADGE_ORDER, JEZERO_TELEMETRY } from '../data/missionExtras';
import { formatFlareDate, localMarsImageFor } from '../services/nasaApi';
import { useGameStore } from '../store/useGameStore';
import { earthMarsLink } from '../utils/marsEphemeris';
import { playButtonClick } from '../utils/soundEffects';
import MissionPatchLogo from './MissionPatchLogo';
import { photoText } from '../data/fieldNotes';
import { tr } from '../i18n/core';

export const BADGE_ICONS: Record<BadgeId, LucideIcon> = {
  solar_engineer: Sun,
  genelab_botanist: Sprout,
  barter_master: Wrench,
  deep_space_communicator: SatelliteDish,
  ares_hero: Trophy,
};

/** Fila de las 5 insignias coleccionables (también se usa en la pantalla final). */
/** compact: solo emblema + nombre (la explicación queda en el tooltip), para columnas estrechas. */
export function BadgeShelf({ size = 92, compact = false }: { size?: number; compact?: boolean }) {
  const badges = useGameStore((s) => s.badges);
  return (
    <div className={`grid gap-3 ${compact ? 'grid-cols-3 sm:grid-cols-5' : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-5'}`}>
      {BADGE_ORDER.map((id) => {
        const earned = badges.includes(id);
        return (
          <div
            key={id}
            title={`${BADGES[id].name}: ${BADGES[id].how}`}
            className={`flex flex-col items-center gap-1.5 rounded-lg border text-center ${compact ? 'p-2' : 'p-3'} ${earned ? 'border-nasa-blue bg-white' : 'border-slate-200 bg-slate-50'}`}
          >
            <motion.div animate={earned ? { scale: [1, 1.06, 1] } : {}} transition={{ duration: 2.4, repeat: Infinity }}>
              <MissionPatchLogo size={size} top={BADGES[id].patchText} bottom="ARES-IV" icon={BADGE_ICONS[id]} muted={!earned} label={BADGES[id].name} />
            </motion.div>
            <p className={`flex items-center justify-center gap-1 font-bold leading-tight ${compact ? 'text-xs' : 'text-sm'} ${earned ? 'text-nasa-blue' : 'text-slate-500'}`}>
              {earned ? <CircleCheck className="h-4 w-4" /> : <Lock className="h-3.5 w-3.5" />} {BADGES[id].name}
            </p>
            {!compact && <p className="text-xs leading-snug text-slate-500">{BADGES[id].how}</p>}
          </div>
        );
      })}
    </div>
  );
}

/** Visor de Fotografía Real de la NASA en Marte (NASA Image and Video Library). */
function MarsPhotoViewer() {
  const allPhotos = useGameStore((s) => s.marsPhotos);
  const unlockedIds = useGameStore((s) => s.unlockedPhotoIds);
  const status = useGameStore((s) => s.marsPhotosStatus);
  // Álbum: solo las fotos que ya han llegado en notas de campo (en el orden en que llegaron)
  const photos = unlockedIds.map((id) => allPhotos.find((p) => p.id === id)).filter((p): p is NonNullable<typeof p> => Boolean(p));
  const loadMarsPhotos = useGameStore((s) => s.loadMarsPhotos);
  const [index, setIndex] = useState(0);
  const [broken, setBroken] = useState<Record<string, boolean>>({});
  const [loaded, setLoaded] = useState<Record<string, boolean>>({});
  /** Fotos cuya URL remota falló: se muestran desde public/mars/. */
  const [useLocal, setUseLocal] = useState<Record<string, boolean>>({});

  useEffect(() => {
    void loadMarsPhotos();
  }, [loadMarsPhotos]);

  const total = photos.length;
  const photo = total ? photos[((index % total) + total) % total] : null;
  const go = (delta: number) => {
    playButtonClick();
    setIndex((i) => i + delta);
  };

  return (
    <section className="overflow-hidden rounded-xl border-2 border-slate-900 bg-slate-950 text-white">
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-700 px-4 py-2">
        <Camera className="h-5 w-5 text-sky-300" strokeWidth={1.75} />
        <p className="font-mono text-xs font-bold tracking-[0.2em] text-sky-300">{tr('ÁLBUM DE FOTOS REALES DE MARTE', 'REAL MARS PHOTO ALBUM')}</p>
        <span className="rounded-md bg-white/10 px-2 py-0.5 font-mono text-xs font-semibold">
          {photos.length} / {allPhotos.length || '—'} desbloqueadas
        </span>
        <span
          className={`ml-auto rounded-md px-2 py-0.5 font-mono text-xs font-semibold ${status === 'live' ? 'bg-emerald-600' : status === 'fallback' ? 'bg-amber-600' : 'bg-slate-700'}`}
        >
          {status === 'live'
            ? tr('EN DIRECTO · images.nasa.gov', 'LIVE · images.nasa.gov')
            : status === 'fallback'
              ? tr('ARCHIVO NASA (sin conexión)', 'NASA ARCHIVE (offline)')
              : tr('CONECTANDO...', 'CONNECTING...')}
        </span>
      </div>

      {status === 'idle' || status === 'loading' ? (
        <div className="flex h-56 items-center justify-center gap-2 text-slate-300">
          <LoaderCircle className="h-5 w-5 animate-spin" /> {tr('Conectando con la biblioteca de imágenes de la NASA...', 'Connecting to the NASA image library...')}
        </div>
      ) : !photo ? (
        <div className="flex h-56 flex-col items-center justify-center gap-2 px-6 text-center text-slate-300">
          <Camera className="h-8 w-8 text-sky-300" strokeWidth={1.5} />
          <p className="text-base font-semibold">{tr('Todavía no has recibido ninguna foto real de Marte.', 'You have not received any real Mars photos yet.')}</p>
          <p className="text-sm text-slate-400">
            {tr('Llegan como notas de campo con cada envío de Houston y en las transmisiones del rover y de la sonda.', 'They arrive as field notes with every Houston shipment and in transmissions from the rover and the probe.')}
          </p>
        </div>
      ) : (
        <div className="grid gap-0 md:grid-cols-[1.4fr_1fr]">
          <div className="relative aspect-[4/3] bg-black md:aspect-auto md:min-h-[18rem]">
            <AnimatePresence mode="wait">
              {broken[photo.id] ? (
                <motion.div key={`b-${photo.id}`} className="absolute inset-0 grid place-items-center text-slate-400" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <span className="flex flex-col items-center gap-2 text-sm">
                    <ImageOff className="h-8 w-8" /> {tr('No se pudo cargar la imagen', 'The image could not be loaded')}
                  </span>
                </motion.div>
              ) : (
                <motion.img
                  key={`${photo.id}-${useLocal[photo.id] ? 'local' : 'remota'}`}
                  src={useLocal[photo.id] ? localMarsImageFor(photo.id) : photo.imageUrl}
                  alt={photo.title}
                  loading="lazy"
                  referrerPolicy="no-referrer"
                  className="absolute inset-0 h-full w-full object-cover"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: loaded[photo.id] ? 1 : 0.3 }}
                  exit={{ opacity: 0 }}
                  onLoad={() => setLoaded((l) => ({ ...l, [photo.id]: true }))}
                  onError={() =>
                    useLocal[photo.id] || photo.imageUrl.startsWith('/')
                      ? setBroken((b) => ({ ...b, [photo.id]: true }))
                      : setUseLocal((u) => ({ ...u, [photo.id]: true }))
                  }
                />
              )}
            </AnimatePresence>
            {!loaded[photo.id] && !broken[photo.id] && (
              <span className="absolute inset-0 grid place-items-center">
                <LoaderCircle className="h-7 w-7 animate-spin text-sky-300" />
              </span>
            )}
            <span className="absolute bottom-2 left-2 rounded bg-black/70 px-2 py-0.5 font-mono text-xs">
              {(((index % total) + total) % total) + 1} / {total}
            </span>
          </div>
          <div className="flex flex-col gap-2 p-4">
            <p className="font-mono text-xs text-slate-400">
              {photo.id} · Publicada el {photo.date ? formatFlareDate(`${photo.date}T12:00:00Z`).split(',')[0] : 'fecha desconocida'}
            </p>
            <h3 className="text-lg font-bold leading-snug">{photo.title}</h3>
            <p className="text-base leading-relaxed text-slate-200">{photoText(photo).summary}</p>
            <details className="text-sm text-slate-400">
              <summary className="cursor-pointer select-none">{tr('Texto original de la NASA (inglés)', 'Original NASA text')}</summary>
              <p className="mt-1">{photo.originalDescription}</p>
            </details>
            <a
              href={photo.link}
              target="_blank"
              rel="noreferrer"
              className="mt-auto inline-flex w-fit items-center gap-1 text-sm font-semibold text-sky-300 hover:underline"
            >
              Ver en images.nasa.gov <ExternalLink className="h-3.5 w-3.5" />
            </a>
            <div className="mt-1 flex gap-2">
              <button
                type="button"
                onClick={() => go(-1)}
                className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-slate-600 px-3 py-2 text-sm font-bold transition hover:bg-slate-800"
              >
                <ChevronLeft className="h-4 w-4" /> {tr('Anterior', 'Previous')}
              </button>
              <button
                type="button"
                onClick={() => go(1)}
                className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-nasa-blue px-3 py-2 text-sm font-bold transition hover:brightness-110"
              >
                {tr('Siguiente foto real', 'Next real photo')} <ChevronRight className="h-4 w-4" />
              </button>
            </div>
            <p className="text-xs text-slate-500">{tr('Imágenes: NASA/JPL-Caltech (dominio público).', 'Images: NASA/JPL-Caltech (public domain).')}</p>
          </div>
        </div>
      )}
    </section>
  );
}

/** Periscopio marciano: fotos reales de Marte, telemetría real del Cráter Jezero e insignias de misión. */
export default function PeriscopeModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const weather = useGameStore((s) => s.nasaWeather);
  const badges = useGameStore((s) => s.badges);
  const link = useMemo(() => earthMarsLink(), []);
  const [sourcesOpen, setSourcesOpen] = useState(false);

  return (
    <>
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/80 p-4 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="dialog"
          aria-modal="true"
          aria-label={tr('Periscopio y datos reales de la NASA', 'Periscope and real NASA data')}
          onClick={onClose}
        >
          <motion.div
            initial={{ y: 30, scale: 0.96 }}
            animate={{ y: 0, scale: 1 }}
            className="thin-scroll my-auto max-h-[88dvh] w-full max-w-5xl overflow-y-auto rounded-2xl border-2 border-slate-200 bg-white p-3 shadow-2xl sm:max-h-[82vh] sm:p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg border border-slate-200 bg-slate-100 text-nasa-blue">
                <Telescope className="h-6 w-6" strokeWidth={1.75} />
              </span>
              <div className="min-w-0 flex-1 basis-[12rem]">
                <p className="font-mono text-xs tracking-[0.25em] text-slate-500">{tr('PERISCOPIO // CRÁTER JEZERO', 'PERISCOPE // JEZERO CRATER')}</p>
                <h2 className="font-display text-xl font-black text-nasa-blue sm:text-2xl">{tr('Fotos y datos reales de la NASA', 'Real NASA photos and data')}</h2>
              </div>
              <button
                type="button"
                onClick={() => {
                  playButtonClick();
                  setSourcesOpen(true);
                }}
                className="flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-sm font-bold text-nasa-blue transition hover:border-nasa-blue max-sm:flex-1 max-sm:justify-center sm:ml-auto"
                title={tr('Qué datos reales de la NASA usa el juego y cómo verificarlos', 'Which real NASA data the game uses and how to check it')}
              >
                <Database className="h-4 w-4" strokeWidth={1.75} /> {tr('Datos Abiertos NASA Utilizados', 'NASA Open Data Used')}
              </button>
              <button
                type="button"
                onClick={() => {
                  playButtonClick();
                  onClose();
                }}
                className="flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-2 font-bold text-slate-700 transition hover:border-nasa-blue hover:text-nasa-blue"
              >
                <X className="h-4 w-4" /> {tr('Cerrar', 'Close')}
              </button>
            </div>

            {/* Visor de fotografía real */}
            <div className="mt-4">
              <MarsPhotoViewer />
            </div>

            {/* Insignias */}
            <div className="mt-5 flex items-center gap-2">
              <Award className="h-5 w-5 text-nasa-blue" strokeWidth={1.75} />
              <h3 className="text-lg font-bold text-slate-900">{tr('Insignias de misión', 'Mission badges')}</h3>
              <span className="ml-auto rounded-md border border-slate-300 px-2 py-0.5 font-mono text-sm font-semibold text-slate-700">
                {badges.length}/{BADGE_ORDER.length}
              </span>
            </div>
            <div className="mt-3">
              <BadgeShelf />
            </div>

            {/* Telemetría */}
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {JEZERO_TELEMETRY.map((t) => (
                <div key={t.label} className="rounded-lg border border-t-4 border-slate-300 border-t-nasa-blue p-3">
                  <p className="text-sm font-bold text-slate-500">{t.label}</p>
                  <p className="font-display text-3xl font-black text-slate-900">{t.value}</p>
                  <p className="mt-1 text-sm text-slate-600">{t.note}</p>
                </div>
              ))}
              <div className="rounded-lg border border-t-4 border-slate-300 border-t-nasa-red p-3">
                <p className="text-sm font-bold text-slate-500">{tr('Distancia a la Tierra hoy', 'Distance to Earth today')}</p>
                <p className="font-display text-3xl font-black text-slate-900">≈ {Math.round(link.distanceMillionKm)} M km</p>
                <p className="mt-1 text-sm text-slate-600">
                  {tr('Un mensaje de radio tarda', 'A radio message takes')} <b>≈ {Math.round(link.lightDelayMinutes)} {tr('minutos', 'minutes')}</b>{' '}
                  {tr('en llegar a Houston (entre 3 y 22 según las órbitas).', 'to reach Houston (between 3 and 22 depending on the orbits).')}
                </p>
              </div>
              <div className="rounded-lg border border-t-4 border-slate-300 border-t-amber-500 p-3">
                <p className="flex items-center gap-1.5 text-sm font-bold text-slate-500">
                  <Satellite className="h-4 w-4" /> {tr('Llamarada real', 'Real flare')} · NASA DONKI
                </p>
                <p className="font-display text-3xl font-black text-slate-900">{tr('Clase', 'Class')} {weather?.flareClass ?? '—'}</p>
                <p className="mt-1 text-sm text-slate-600">
                  {weather
                    ? `${formatFlareDate(weather.peakTime)} · ${weather.isLive ? tr('en directo', 'live') : tr('archivo real', 'real archive')}`
                    : tr('Conectando con DONKI...', 'Connecting to DONKI...')}
                </p>
              </div>
            </div>
            <p className="mt-2 text-xs text-slate-500">
              {tr(
                'Fuentes: NASA Perseverance (MEDA, MOXIE), NASA DONKI. La distancia es un cálculo orbital aproximado para la fecha de hoy.',
                'Sources: NASA Perseverance (MEDA, MOXIE), NASA DONKI. The distance is an approximate orbital calculation for today.',
              )}
            </p>

          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
    <NasaDataSourcesModal open={open && sourcesOpen} onClose={() => setSourcesOpen(false)} />
    </>
  );
}
