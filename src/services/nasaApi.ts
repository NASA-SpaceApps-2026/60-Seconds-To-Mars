import type { MarsPhoto, NASAWeather, OsdrStudy, RadiationLevel } from '../types/game';
import { ARCHIVED_FLARES } from '../data/fallbackNasaData';

const NASA_API_KEY = import.meta.env.VITE_NASA_API_KEY || 'DEMO_KEY';
const DONKI_FLR_URL = 'https://api.nasa.gov/DONKI/FLR';
const TIMEOUT_MS = 8000;

interface DonkiFlare {
  flrID?: string;
  beginTime?: string;
  peakTime?: string | null;
  classType?: string | null;
  sourceLocation?: string | null;
  activeRegionNum?: number | null;
  link?: string | null;
}

/** Convierte la clase de llamarada (A, B, C, M, X) en intensidad de radiación. */
export function flareClassToIntensity(flareClass: string): RadiationLevel {
  const letter = flareClass.trim().charAt(0).toUpperCase();
  const magnitude = parseFloat(flareClass.slice(1)) || 1;
  if (letter === 'X') return magnitude >= 5 ? 'extreme' : 'high';
  if (letter === 'M') return magnitude >= 5 ? 'high' : 'moderate';
  if (letter === 'C') return 'moderate';
  return 'low';
}

/** Potencia relativa para poder ordenar llamaradas (X1 = 1e-4 W/m²). */
function flarePower(flareClass: string): number {
  const scale: Record<string, number> = { A: 1e-8, B: 1e-7, C: 1e-6, M: 1e-5, X: 1e-4 };
  const letter = flareClass.charAt(0).toUpperCase();
  return (scale[letter] ?? 0) * (parseFloat(flareClass.slice(1)) || 1);
}

const isoDate = (d: Date) => d.toISOString().slice(0, 10);

export function getArchivedFlare(): NASAWeather {
  return ARCHIVED_FLARES[Math.floor(Math.random() * ARCHIVED_FLARES.length)];
}

/** Clave de caché de sesión: así recargar la página no gasta el cupo de DEMO_KEY. */
const DONKI_CACHE_KEY = 'nasa-donki-flare-v2';
const OSDR_CACHE_KEY = 'nasa-osdr-study-v1';
const CCMC_DONKI_FLR_URL = 'https://kauai.ccmc.gsfc.nasa.gov/DONKI/WS/get/FLR';
const SWPC_FLARES_URL = 'https://services.swpc.noaa.gov/json/goes/primary/xray-flares-7-day.json';

function readSession<T>(key: string): T | null {
  try {
    const raw = sessionStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}
function writeSession(key: string, value: unknown) {
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* modo privado / sin almacenamiento: no pasa nada */
  }
}

/** fetch con tiempo máximo; devuelve la Response (o lanza si se agota el tiempo o falla la red). */
async function fetchWithTimeout(url: string, ms: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/** Convierte una lista DONKI en la llamarada que usa el juego (la más reciente o la más fuerte). */
function pickDonkiFlare(data: unknown, mode: 'latest' | 'strongest', provider: string): NASAWeather | null {
  if (!Array.isArray(data)) return null;
  const flares = (data as DonkiFlare[]).filter((f) => f.classType && (f.peakTime || f.beginTime));
  if (!flares.length) return null;
  const time = (f: DonkiFlare) => new Date(f.peakTime ?? f.beginTime ?? 0).getTime();
  flares.sort((a, b) => (mode === 'latest' ? time(b) - time(a) : flarePower(b.classType!) - flarePower(a.classType!)));
  const f = flares[0];
  const flareClass = f.classType!;
  return {
    flareClass,
    peakTime: f.peakTime ?? f.beginTime!,
    sourceLocation: f.sourceLocation ?? 'desconocida',
    activeRegion: f.activeRegionNum ?? null,
    link: f.link ?? null,
    isLive: true,
    intensity: flareClassToIntensity(flareClass),
    provider,
  };
}

/**
 * Llamarada solar en vivo. Orden (se detiene en la primera que responde):
 *  0. Caché de la sesión (no gasta cupo de la API al recargar).
 *  1. NASA DONKI en api.nasa.gov · últimos 90 días (la más reciente).
 *  2. Si no hubo llamaradas: el mismo endpoint en vivo con mayo-oct 2024 (la más fuerte).
 *  3. Si api.nasa.gov falla o da 429 (cupo de DEMO_KEY agotado): servicio web de DONKI en CCMC/NASA (sin clave).
 *  4. Espejo en vivo NOAA SWPC (satélites GOES, últimos 7 días) — se etiqueta como NOAA, no como NASA.
 *  5. Archivo curado de 4 llamaradas reales de DONKI.
 * Nunca lanza errores.
 */
export async function fetchLatestSolarFlare(): Promise<NASAWeather> {
  const cached = readSession<NASAWeather>(DONKI_CACHE_KEY);
  if (cached?.isLive) return cached;

  const save = (w: NASAWeather) => {
    writeSession(DONKI_CACHE_KEY, w);
    return w;
  };
  const end = new Date();
  const start = new Date(end.getTime() - 90 * 24 * 60 * 60 * 1000);
  const key = encodeURIComponent(NASA_API_KEY);

  // 1-2 · NASA DONKI (api.nasa.gov)
  try {
    const res = await fetchWithTimeout(`${DONKI_FLR_URL}?startDate=${isoDate(start)}&endDate=${isoDate(end)}&api_key=${key}`, TIMEOUT_MS);
    if (!res.ok) throw new Error(`DONKI HTTP ${res.status}${res.status === 429 ? ' (cupo de DEMO_KEY agotado)' : ''}`);
    const recent = pickDonkiFlare(await res.json(), 'latest', 'NASA DONKI · api.nasa.gov');
    if (recent) return save(recent);
    const res2 = await fetchWithTimeout(`${DONKI_FLR_URL}?startDate=2024-05-01&endDate=2024-10-31&api_key=${key}`, TIMEOUT_MS);
    if (!res2.ok) throw new Error(`DONKI HTTP ${res2.status}`);
    const big = pickDonkiFlare(await res2.json(), 'strongest', 'NASA DONKI · api.nasa.gov (máximo solar 2024)');
    if (big) return save(big);
  } catch (err) {
    console.info('[NASA DONKI] api.nasa.gov no disponible:', err instanceof Error ? err.message : err);
  }

  // 3 · Servicio web de DONKI en CCMC (mismo formato, sin clave)
  try {
    const res = await fetchWithTimeout(`${CCMC_DONKI_FLR_URL}?startDate=${isoDate(start)}&endDate=${isoDate(end)}`, 5000);
    if (!res.ok) throw new Error(`CCMC HTTP ${res.status}`);
    const flare = pickDonkiFlare(await res.json(), 'latest', 'NASA DONKI · CCMC');
    if (flare) return save(flare);
  } catch (err) {
    console.info('[NASA DONKI] CCMC no disponible:', err instanceof Error ? err.message : err);
  }

  // 4 · NOAA SWPC (GOES) en vivo
  try {
    const res = await fetchWithTimeout(SWPC_FLARES_URL, 6000);
    if (!res.ok) throw new Error(`SWPC HTTP ${res.status}`);
    const rows = (await res.json()) as { max_class?: string; max_time?: string; begin_time?: string }[];
    const valid = rows.filter((r) => r.max_class && (r.max_time || r.begin_time));
    if (valid.length) {
      valid.sort((a, b) => flarePower(b.max_class!) - flarePower(a.max_class!));
      const r = valid[0];
      return save({
        flareClass: r.max_class!,
        peakTime: r.max_time ?? r.begin_time!,
        sourceLocation: 'desconocida',
        activeRegion: null,
        link: 'https://www.swpc.noaa.gov/products/goes-x-ray-flux',
        isLive: true,
        intensity: flareClassToIntensity(r.max_class!),
        provider: 'NOAA SWPC · satélites GOES (espejo en vivo)',
      });
    }
  } catch (err) {
    console.info('[NOAA SWPC] no disponible:', err instanceof Error ? err.message : err);
  }

  // 5 · Archivo curado
  return { ...getArchivedFlare(), provider: 'Archivo curado de NASA DONKI' };
}

// ============================================================
// NASA OSDR / GeneLab · Open Science Data Repository (en vivo)
// ============================================================
/**
 * La API de OSDR solo permite CORS a su propio dominio, así que el navegador la consulta a través
 * de nuestro servidor: proxy de Vite en desarrollo y Cloudflare Function en producción (`/api/osdr/...`).
 */
const OSDR_SEARCH_URL = '/api/osdr/search?term=Arabidopsis%20spaceflight&type=cgene&size=5';

const FALLBACK_OSDR_STUDY: OsdrStudy = {
  id: 'OSD-7',
  title: 'The Arabidopsis spaceflight transcriptome: a comparison of whole plants to discrete root, hypocotyl and shoot responses to the orbital environment',
  organism: 'Arabidopsis thaliana',
  mission: 'STS-129 (Space Shuttle → ISS, 2009)',
  url: 'https://osdr.nasa.gov/bio/repo/data/studies/OSD-7',
  isLive: false,
};

interface OsdrSearchHit {
  _source?: {
    Accession?: string;
    'Study Title'?: string;
    organism?: string;
    'Flight Program'?: string;
    Mission?: { Name?: string; 'Start Date'?: string } | { Name?: string; 'Start Date'?: string }[];
  };
}

/** Metadatos reales de un estudio de NASA OSDR (Arabidopsis en el espacio). Nunca lanza errores. */
export async function fetchOsdrStudyMeta(): Promise<OsdrStudy> {
  const cached = readSession<OsdrStudy>(OSDR_CACHE_KEY);
  if (cached?.isLive) return cached;
  try {
    const res = await fetchWithTimeout(OSDR_SEARCH_URL, TIMEOUT_MS);
    if (!res.ok) throw new Error(`OSDR HTTP ${res.status}`);
    const json = (await res.json()) as { hits?: { hits?: OsdrSearchHit[] } };
    const hit = (json.hits?.hits ?? []).map((h) => h._source).find((s) => s?.Accession && s['Study Title'] && /arabidopsis/i.test(s.organism ?? ''));
    if (!hit) throw new Error('OSDR sin estudios de Arabidopsis');
    const mission = Array.isArray(hit.Mission) ? hit.Mission[0] : hit.Mission;
    const year = mission?.['Start Date']?.match(/(\d{2,4})$/)?.[1];
    const study: OsdrStudy = {
      id: hit.Accession!,
      title: hit['Study Title']!,
      organism: hit.organism ?? 'Arabidopsis thaliana',
      mission: [mission?.Name, hit['Flight Program'], year && (year.length === 2 ? `20${year}` : year)].filter(Boolean).join(' · '),
      url: `https://osdr.nasa.gov/bio/repo/data/studies/${encodeURIComponent(hit.Accession!)}`,
      isLive: true,
    };
    writeSession(OSDR_CACHE_KEY, study);
    return study;
  } catch (err) {
    console.info('[NASA OSDR] Usando estudio curado:', err instanceof Error ? err.message : err);
    return { ...FALLBACK_OSDR_STUDY };
  }
}

/** Exportado por si se quiere mostrar la llamarada más fuerte del mes. */
export function strongestFlare(flares: NASAWeather[]): NASAWeather | null {
  return flares.reduce<NASAWeather | null>(
    (best, f) => (!best || flarePower(f.flareClass) > flarePower(best.flareClass) ? f : best),
    null,
  );
}

export function formatFlareDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
}

// ============================================================
// Fotos reales de Marte · NASA Image and Video Library (images-api.nasa.gov)
// ============================================================
const NASA_IMAGES_URL = 'https://images-api.nasa.gov/search?q=Perseverance%20Mars%20Jezero&media_type=image';
const MAX_PHOTOS = 12;

/** Títulos que NO son fotos tomadas en Marte (ilustraciones, mapas, gráficas, fotos en la Tierra...). */
const NOT_A_MARS_PHOTO =
  /illustration|artist|concept|animation|map\b|route|plot|path for|traverse|proposed|halfway|aboard|landing sites|software|launch|kennedy|cape canaveral|clean room|assembly|testing|model/i;
/** Descripciones de mapas o imágenes anotadas desde órbita (aunque el título no lo diga). */
const IS_A_MAP = /\bthis (?:map|annotated|graphic|chart)\b|\bmap (?:shows|was made)\b/i;

/**
 * Respaldo LOCAL infalible: 4 fotos reales de Perseverance (dominio público, NASA/JPL-Caltech) guardadas en
 * `public/mars/`. Se usan si la API no responde y también si una imagen remota falla al cargar en el navegador.
 */
const LOCAL_BASE = `${import.meta.env.BASE_URL}mars/`;
export const LOCAL_MARS_IMAGES = [1, 2, 3, 4].map((n) => `${LOCAL_BASE}mars-${n}.jpg`);

const FALLBACK_MARS_PHOTOS: MarsPhoto[] = [
  {
    id: 'PIA26479',
    title: 'Perseverance Views Slippery Terrain',
    date: '2024-12-12',
    imageUrl: LOCAL_MARS_IMAGES[0],
    summaryEs:
      'Foto real de la cámara de navegación de Perseverance subiendo al borde del Cráter Jezero (Sol 1.326). Se ven sus ruedas y las huellas que deja en una arena tan resbaladiza que le costó avanzar.',
    sol: '1326',
    whoEs: 'el rover Perseverance',
    cameraEs: 'la cámara de navegación',
    topicEs: 'las huellas del rover en una arena muy resbaladiza',
    originalDescription:
      "NASA's Perseverance Mars rover used its navigation cameras, or navcams, to capture this scene while driving up to Jezero Crater's rim on Nov. 11, 2024, the 1,326th Martian day, or sol, of the mission.",
    link: 'https://images.nasa.gov/details/PIA26479',
  },
  {
    id: 'PIA26511',
    title: "Perseverance's View From 'Lookout Hill'",
    date: '2024-12-12',
    imageUrl: LOCAL_MARS_IMAGES[1],
    summaryEs:
      'La primera vista de Perseverance por encima del borde del Cráter Jezero, en el Sol 1.354, al terminar una larguísima subida desde el fondo del cráter.',
    sol: '1354',
    whoEs: 'el rover Perseverance',
    cameraEs: 'la cámara de navegación',
    topicEs: 'el paisaje desde lo alto del borde del cráter',
    originalDescription:
      "NASA's Perseverance Mars rover used its right-front navigation camera to capture this first view over the rim of Jezero Crater on Dec. 10, 2024, the 1,354th Martian day, or sol, of the mission.",
    link: 'https://images.nasa.gov/details/PIA26511',
  },
  {
    id: 'PIA26572',
    title: 'Dust Devil Whirls by Perseverance Coring Operation',
    date: '2025-05-14',
    imageUrl: LOCAL_MARS_IMAGES[2],
    summaryEs:
      'El brazo robótico de Perseverance perfora una roca para guardar una muestra cerca del borde del cráter (Sol 1.490), mientras un remolino de polvo pasa a lo lejos.',
    sol: '1490',
    whoEs: 'el rover Perseverance',
    cameraEs: 'la cámara que evita obstáculos',
    topicEs: 'su brazo robótico perforando una roca',
    originalDescription:
      "A dust devil whirled by in the distance as one of the cameras on NASA's Perseverance captured the Mars rover coring a sample near the rim of Jezero Crater on April 29, 2025, the 1,490th Martian day, or sol, of the mission.",
    link: 'https://images.nasa.gov/details/PIA26572',
  },
  {
    id: 'PIA25917',
    title: 'Perseverance Finds a Hollowed-Out Rock',
    date: '2023-06-29',
    imageUrl: LOCAL_MARS_IMAGES[3],
    summaryEs:
      'Una roca con agujeros que el viento marciano ha ido "lijando" con arena durante millones de años. La fotografió la cámara Mastcam-Z de Perseverance en el Sol 836.',
    sol: '836',
    whoEs: 'el rover Perseverance',
    cameraEs: 'la cámara Mastcam-Z',
    topicEs: 'una roca vaciada por el viento marciano',
    originalDescription:
      "NASA's Perseverance Mars rover spotted this hollowed-out rock in Jezero Crater using its Mastcam-Z instrument on June 26, 2023, the 836th Martian day, or sol, of the mission.",
    link: 'https://images.nasa.gov/details/PIA25917',
  },
];

export function getFallbackMarsPhotos(): MarsPhoto[] {
  return FALLBACK_MARS_PHOTOS.map((p) => ({ ...p }));
}

/** Foto local de respaldo para un id (la suya si es una de las 4; si no, una fija según el id). */
export function localMarsImageFor(id: string): string {
  const own = FALLBACK_MARS_PHOTOS.findIndex((p) => p.id === id);
  if (own >= 0) return LOCAL_MARS_IMAGES[own];
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return LOCAL_MARS_IMAGES[h % LOCAL_MARS_IMAGES.length];
}

/** Orden de preferencia de los tamaños que ofrece images-assets.nasa.gov. */
const SIZE_PREFERENCE = ['medium', 'small', 'large', 'orig', 'thumb'];

/**
 * Elige la mejor URL REAL de la lista `links` del item (render === 'image'), sin inventar tamaños:
 * antes se reescribía ~small → ~medium y en ~1 de cada 4 fotos esa URL no existe (403).
 */
function pickImageHref(links: { href?: string; render?: string }[] | undefined): string | null {
  const imgs = (links ?? []).filter((l) => l.href && (l.render === 'image' || /\.(jpe?g|png)$/i.test(l.href)));
  if (!imgs.length) return null;
  const sizeOf = (href: string) => {
    const m = href.match(/~(\w+)\.(?:jpe?g|png)$/i);
    const idx = m ? SIZE_PREFERENCE.indexOf(m[1].toLowerCase()) : -1;
    return idx < 0 ? SIZE_PREFERENCE.length : idx;
  };
  const best = [...imgs].sort((a, b) => sizeOf(a.href!) - sizeOf(b.href!))[0].href!;
  return encodeURI(best.replace(/^http:\/\//i, 'https://'));
}

/**
 * Datos fiables sacados del texto oficial (Sol de la misión, quién, cámara y tema) y
 * resumen sencillo en español. El texto original se conserva aparte.
 */
function describePhoto(title: string, description: string): Pick<MarsPhoto, 'summaryEs' | 'sol' | 'whoEs' | 'cameraEs' | 'topicEs'> {
  const text = `${title} ${description}`;
  const solMatch = description.match(/(\d[\d,]*)(?:st|nd|rd|th)?\s+(?:Martian day|sol)/i);
  const sol = solMatch ? Number(solMatch[1].replace(/,/g, '')).toLocaleString('es-ES') : null;

  let who = 'el rover Perseverance';
  if (/ingenuity|helicopter/i.test(text)) who = 'el helicóptero Ingenuity o el rover Perseverance';
  else if (/orbiter|HiRISE|Mars Express|CTX/i.test(text)) who = 'una nave que orbita Marte';

  let camera = '';
  if (/Mastcam-Z/i.test(text)) camera = 'la cámara Mastcam-Z';
  else if (/navigation camera|Navcam/i.test(text)) camera = 'la cámara de navegación';
  else if (/Hazcam|hazard/i.test(text)) camera = 'la cámara que evita obstáculos';
  else if (/WATSON|SHERLOC/i.test(text)) camera = 'la cámara de primer plano WATSON';

  const topics: string[] = [];
  if (/dust devil/i.test(text)) topics.push('un remolino de polvo marciano');
  if (/\brim\b/i.test(text)) topics.push('el borde del cráter');
  if (/delta/i.test(text)) topics.push('el antiguo delta de un río que llenó el cráter de agua hace miles de millones de años');
  if (/abrasion|\bcores?\b|coring|rock sample/i.test(text)) topics.push('rocas que guardan pistas de si hubo vida en Marte');
  if (/mosaic|composed of/i.test(text)) topics.push('una foto gigante hecha uniendo muchas imágenes');
  if (/boulder|rock/i.test(text) && !topics.some((t) => t.includes('rocas'))) topics.push('rocas y piedras marcianas');
  if (/slippery|slope|climb|hill/i.test(text)) topics.push('una subida difícil por una colina');

  const base = `Foto real tomada por ${who}${camera ? ` con ${camera}` : ''} en el Cráter Jezero${sol ? `, en el Sol ${sol} de la misión` : ''}.`;
  const summaryEs = topics.length ? `${base} Muestra ${topics.slice(0, 2).join(' y ')}.` : `${base} Así es de verdad el paisaje que exploran los rovers de la NASA.`;
  return { summaryEs, sol, whoEs: who, cameraEs: camera, topicEs: topics[0] ?? null };
}

interface NasaImagesResponse {
  collection?: {
    items?: {
      data?: { nasa_id?: string; title?: string; date_created?: string; description?: string; media_type?: string }[];
      links?: { href?: string; render?: string }[];
    }[];
  };
}

/** Fotos reales de Marte desde la NASA Image and Video Library. Nunca lanza: si falla, devuelve el respaldo. */
export async function fetchMarsSurfacePhotos(): Promise<{ photos: MarsPhoto[]; isLive: boolean }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(NASA_IMAGES_URL, { signal: controller.signal });
    if (!res.ok) throw new Error(`NASA Images ${res.status}`);
    const json = (await res.json()) as NasaImagesResponse;
    const photos: MarsPhoto[] = [];
    for (const item of json.collection?.items ?? []) {
      const d = item.data?.[0];
      const href = pickImageHref(item.links);
      if (!d?.nasa_id || !d.title || !href || d.media_type !== 'image') continue;
      const description = (d.description ?? '').replace(/\s+/g, ' ').trim();
      if (NOT_A_MARS_PHOTO.test(d.title) || IS_A_MAP.test(description) || !/mars|jezero/i.test(`${d.title} ${description}`)) continue;
      photos.push({
        id: d.nasa_id,
        title: d.title,
        date: (d.date_created ?? '').slice(0, 10),
        imageUrl: href,
        ...describePhoto(d.title, description),
        originalDescription: description.length > 420 ? `${description.slice(0, 417)}...` : description,
        link: `https://images.nasa.gov/details/${encodeURIComponent(d.nasa_id)}`,
      });
      if (photos.length >= MAX_PHOTOS) break;
    }
    if (photos.length === 0) throw new Error('Sin fotos de Marte en la respuesta');
    // Las más recientes primero
    photos.sort((a, b) => b.date.localeCompare(a.date));
    return { photos, isLive: true };
  } catch {
    return { photos: getFallbackMarsPhotos(), isLive: false };
  } finally {
    clearTimeout(timer);
  }
}
