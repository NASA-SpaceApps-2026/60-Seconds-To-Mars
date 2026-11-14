import { AnimatePresence, motion } from 'framer-motion';
import { BookOpen, Camera, Database, ExternalLink, Sprout, Sun, X, type LucideIcon } from 'lucide-react';
import type { NasaStatus } from '../types/game';
import { GLOSSARY } from '../data/glossary';
import { formatFlareDate } from '../services/nasaApi';
import { useGameStore } from '../store/useGameStore';
import { playButtonClick } from '../utils/soundEffects';

type SourceState = 'live' | 'curated' | 'connecting';

const STATE_BADGE: Record<SourceState, { label: string; cls: string }> = {
  live: { label: 'LIVE API', cls: 'bg-emerald-600 text-white' },
  curated: { label: 'CURATED ARCHIVE', cls: 'bg-amber-500 text-slate-950' },
  connecting: { label: 'CONECTANDO...', cls: 'bg-slate-300 text-slate-700' },
};

const fromStatus = (s: NasaStatus): SourceState => (s === 'live' ? 'live' : s === 'fallback' ? 'curated' : 'connecting');

interface Source {
  icon: LucideIcon;
  name: string;
  full: string;
  state: SourceState;
  stateNote: string;
  data: string;
  feeds: string;
  code: string;
  links: { label: string; href: string }[];
}

/**
 * "Datos Abiertos NASA Utilizados": ficha para jueces y docentes con los 3 conjuntos de datos reales
 * conectados, su estado en esta sesión (API en vivo o archivo curado), la mecánica que alimentan y enlaces verificables.
 */
export default function NasaDataSourcesModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const nasaStatus = useGameStore((s) => s.nasaStatus);
  const weather = useGameStore((s) => s.nasaWeather);
  const photosStatus = useGameStore((s) => s.marsPhotosStatus);
  const photosCount = useGameStore((s) => s.marsPhotos.length);
  const osdrStatus = useGameStore((s) => s.osdrStatus);
  const osdr = useGameStore((s) => s.osdrStudy);
  const flareWhen = weather ? `clase ${weather.flareClass} (${formatFlareDate(weather.peakTime)})` : '';

  const sources: Source[] = [
    {
      icon: Sun,
      name: 'NASA DONKI',
      full: 'Space Weather Database Of Notifications, Knowledge, Information',
      state: fromStatus(nasaStatus),
      stateNote:
        nasaStatus === 'live'
          ? `En vivo desde ${weather?.provider ?? 'NASA DONKI'} · llamarada en uso: ${flareWhen}.${
              weather?.provider?.startsWith('NOAA')
                ? ' (api.nasa.gov no respondió o agotó el cupo de DEMO_KEY, así que se usa el espejo en vivo de NOAA con los mismos satélites GOES que vigila DONKI.)'
                : ''
            }`
          : nasaStatus === 'fallback'
            ? `Sin conexión: se usan 4 llamaradas reales archivadas de DONKI (X9.0, X8.7, X5.8 y X1.8 de 2024)${weather ? ` · en uso: ${weather.flareClass}` : ''}.`
            : 'Conectando con api.nasa.gov...',
      data: 'Llamaradas solares reales (endpoint FLR: clase, hora del pico, región activa). Las CME (eyecciones de masa coronal) se explican en el glosario.',
      feeds: 'La clase de la llamarada fija la intensidad de radiación de cada Sol: desgaste del Blindaje, alertas de tormenta, auroras en el cielo, el minijuego de cables y los eventos que genera Gemini.',
      code: 'src/services/nasaApi.ts → fetchLatestSolarFlare() (api.nasa.gov 90 días → CCMC → NOAA SWPC → archivo; caché de sesión)',
      links: [
        { label: 'DONKI (CCMC / NASA GSFC)', href: 'https://ccmc.gsfc.nasa.gov/tools/DONKI/' },
        { label: 'API pública: api.nasa.gov (DONKI)', href: 'https://api.nasa.gov/' },
        ...(weather?.provider?.startsWith('NOAA') ? [{ label: 'NOAA SWPC · GOES X-ray', href: 'https://www.swpc.noaa.gov/products/goes-x-ray-flux' }] : []),
      ],
    },
    {
      icon: Sprout,
      name: 'NASA OSDR / GeneLab',
      full: 'Open Science Data Repository',
      state: fromStatus(osdrStatus),
      stateNote:
        osdrStatus === 'live' && osdr
          ? `En vivo desde la API pública de OSDR: ${osdr.id} · "${osdr.title}" · ${osdr.organism}${osdr.mission ? ` · ${osdr.mission}` : ''}.`
          : osdrStatus === 'fallback'
            ? `Sin conexión: estudio curado ${osdr?.id ?? 'OSD-7'} (Arabidopsis thaliana, STS-129) y datos de Veggie VEG-01 y STS-115.`
            : 'Conectando con osdr.nasa.gov...',
      data: 'Metadatos reales de estudios de biología espacial (identificador OSD, título, organismo y misión) y resultados publicados: cultivo de plantas en la ISS (Veggie VEG-01) y genes de estrés de Arabidopsis.',
      feeds: 'Las Semillas OSDR y el invernadero (cosecha cada 2 Soles), los datos científicos de objetos y eventos y los dilemas de soporte vital y biología.',
      code: 'src/services/nasaApi.ts → fetchOsdrStudyMeta() (vía /api/osdr: proxy de Vite / Cloudflare Function) · datos curados en src/data/stationItems.ts',
      links: [
        ...(osdr ? [{ label: `Ficha del estudio ${osdr.id}`, href: osdr.url }] : []),
        { label: 'NASA OSDR / GeneLab', href: 'https://science.nasa.gov/biological-physical/data/osdr/' },
        { label: 'Datos de biología espacial (NASA)', href: 'https://science.nasa.gov/biological-physical/data/' },
      ],
    },
    {
      icon: Camera,
      name: 'NASA Image and Video Library',
      full: 'images-api.nasa.gov · búsqueda "Perseverance Mars Jezero"',
      state: fromStatus(photosStatus),
      stateNote:
        photosStatus === 'live'
          ? `Consulta en vivo: ${photosCount} fotografías reales de Marte cargadas (se descartan ilustraciones y mapas).`
          : photosStatus === 'fallback'
            ? 'Sin conexión: se usan 4 fotografías reales de Perseverance guardadas en el juego (public/mars/).'
            : 'Conectando con images-api.nasa.gov...',
      data: 'Fotografías reales tomadas por el rover Perseverance en el Cráter Jezero, con su fecha, Sol de la misión y cámara.',
      feeds: 'Las transmisiones de la Comandante Elena y Houston (una foto real nueva en cada envío) y el álbum del Periscopio.',
      code: 'src/services/nasaApi.ts → fetchMarsSurfacePhotos()',
      links: [
        { label: 'images.nasa.gov', href: 'https://images.nasa.gov/' },
        { label: 'Consulta usada (JSON)', href: 'https://images-api.nasa.gov/search?q=Perseverance%20Mars%20Jezero&media_type=image' },
      ],
    },
  ];

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[65] flex items-start justify-center overflow-y-auto bg-slate-950/75 p-4 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          role="dialog"
          aria-modal="true"
          aria-label="Datos abiertos de la NASA utilizados"
        >
          <motion.div
            initial={{ y: 24, scale: 0.97 }}
            animate={{ y: 0, scale: 1 }}
            className="thin-scroll my-auto max-h-[88vh] w-full max-w-4xl overflow-y-auto rounded-2xl border-2 border-slate-200 bg-white p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg border border-slate-200 bg-slate-100 text-nasa-blue">
                <Database className="h-6 w-6" strokeWidth={1.75} />
              </span>
              <div className="min-w-0">
                <p className="font-mono text-xs tracking-[0.25em] text-slate-500">VERIFICACIÓN CIENTÍFICA</p>
                <h2 className="font-display text-2xl font-black text-nasa-blue">Datos Abiertos NASA Utilizados</h2>
                <p className="mt-1 text-sm text-slate-600">
                  Qué datos reales usa el juego, de dónde salen, si en esta partida llegan en vivo o desde el archivo curado y qué parte del juego alimentan.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  playButtonClick();
                  onClose();
                }}
                className="ml-auto flex shrink-0 items-center gap-1 rounded-lg border border-slate-300 px-3 py-2 font-bold text-slate-700 transition hover:border-nasa-blue hover:text-nasa-blue"
              >
                <X className="h-4 w-4" /> Cerrar
              </button>
            </div>

            <div className="mt-4 grid gap-3">
              {sources.map((s, i) => (
                <article key={s.name} className="rounded-xl border border-l-4 border-slate-200 border-l-nasa-blue p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <s.icon className="h-5 w-5 text-nasa-blue" strokeWidth={1.75} />
                    <h3 className="text-lg font-bold text-slate-900">
                      {i + 1}. {s.name}
                    </h3>
                    <span className={`rounded-md px-2 py-0.5 font-mono text-xs font-bold ${STATE_BADGE[s.state].cls}`}>{STATE_BADGE[s.state].label}</span>
                  </div>
                  <p className="text-sm italic text-slate-500">{s.full}</p>
                  <p className="mt-1 text-sm font-semibold text-slate-700">{s.stateNote}</p>
                  <dl className="mt-2 grid gap-1.5 text-sm text-slate-700 md:grid-cols-[8rem_1fr]">
                    <dt className="font-bold text-slate-900">Qué datos</dt>
                    <dd>{s.data}</dd>
                    <dt className="font-bold text-slate-900">Qué alimenta</dt>
                    <dd>{s.feeds}</dd>
                    <dt className="font-bold text-slate-900">En el código</dt>
                    <dd className="font-mono text-xs leading-relaxed">{s.code}</dd>
                  </dl>
                  <div className="mt-2 flex flex-wrap gap-3">
                    {s.links.map((l) => (
                      <a key={l.href} href={l.href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm font-semibold text-nasa-blue hover:underline">
                        {l.label} <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    ))}
                  </div>
                </article>
              ))}
            </div>

            {/* Glosario para cadetes */}
            <div className="mt-5 rounded-xl bg-slate-50 p-4">
              <p className="flex items-center gap-2 text-base font-bold text-slate-900">
                <BookOpen className="h-5 w-5 text-nasa-blue" strokeWidth={1.75} /> Glosario para cadetes
              </p>
              <dl className="mt-2 grid gap-2 text-sm text-slate-700 md:grid-cols-2">
                {Object.values(GLOSSARY).map((g) => (
                  <div key={g.term}>
                    <dt className="font-bold text-nasa-blue">{g.term}</dt>
                    <dd>{g.text}</dd>
                  </div>
                ))}
              </dl>
            </div>
            <p className="mt-3 text-xs text-slate-500">
              Los eventos diarios los redacta Gemini a partir de la llamarada real de DONKI y se validan en el juego; si Gemini no responde, se usan eventos escritos con datos NASA citados.
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
