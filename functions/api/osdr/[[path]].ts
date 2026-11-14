/**
 * Cloudflare Pages Function · proxy de solo lectura a la API pública de NASA OSDR.
 *
 * La API de OSDR (https://osdr.nasa.gov/osdr/data/...) solo permite CORS a su propio dominio,
 * así que el navegador del juego la consulta a través de esta función (mismo origen).
 * En `npm run dev` hace lo mismo el proxy de vite.config.ts.
 *
 * Seguridad: solo GET, solo la ruta de búsqueda y solo parámetros en lista blanca. No usa claves.
 */
interface OsdrContext {
  request: Request;
  params: { path?: string | string[] };
}

const UPSTREAM = 'https://osdr.nasa.gov/osdr/data/';
const ALLOWED_PATHS = new Set(['search']);
const ALLOWED_PARAMS = ['term', 'type', 'size', 'from'];

export const onRequestGet = async ({ request, params }: OsdrContext): Promise<Response> => {
  const path = Array.isArray(params.path) ? params.path.join('/') : (params.path ?? '');
  if (!ALLOWED_PATHS.has(path)) {
    return Response.json({ error: 'Ruta OSDR no permitida' }, { status: 404 });
  }

  const incoming = new URL(request.url);
  const upstream = new URL(path, UPSTREAM);
  for (const key of ALLOWED_PARAMS) {
    const value = incoming.searchParams.get(key);
    if (value !== null) upstream.searchParams.set(key, value.slice(0, 120));
  }
  // Tope de resultados para no traer respuestas enormes
  const size = Number(upstream.searchParams.get('size') ?? '5');
  upstream.searchParams.set('size', String(Math.min(Math.max(size || 5, 1), 10)));

  try {
    const res = await fetch(upstream.toString(), { headers: { Accept: 'application/json' } });
    const body = await res.text();
    return new Response(body, {
      status: res.status,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        // Los metadatos de estudios cambian poco: 1 h de caché en el borde de Cloudflare
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch {
    return Response.json({ error: 'OSDR no disponible' }, { status: 502 });
  }
};
