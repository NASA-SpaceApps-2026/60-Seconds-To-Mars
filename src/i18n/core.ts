// Idioma global del juego (ES / EN).
// - El idioma vive aquí (módulo sin dependencias) para que datos, servicios y store lo lean sin ciclos.
// - El store (`language` / `setLanguage`) lo refleja para que los componentes se re-pinten (hook `useT`).
// - Los DATOS (preguntas, objetos, eventos...) se traducen con `withEnglish`: getters que devuelven
//   el texto del idioma activo, así `ITEMS_BY_ID[id].name` funciona igual en todo el código.

export type Lang = 'es' | 'en';

const STORAGE_KEY = 'ares-iv-language-v1';

function loadLang(): Lang {
  try {
    // ?lang=en / ?lang=es en la URL (enlace directo para jueces) tiene prioridad y se recuerda
    const fromUrl = new URLSearchParams(window.location.search).get('lang');
    if (fromUrl === 'es' || fromUrl === 'en') {
      localStorage.setItem(STORAGE_KEY, fromUrl);
      return fromUrl;
    }
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'es' || saved === 'en') return saved;
  } catch {
    /* sin almacenamiento */
  }
  return 'es';
}

let current: Lang = typeof window === 'undefined' ? 'es' : loadLang();

export function getLang(): Lang {
  return current;
}

export function setLangCore(lang: Lang): void {
  current = lang;
  try {
    localStorage.setItem(STORAGE_KEY, lang);
    document.documentElement.lang = lang;
  } catch {
    /* sin almacenamiento */
  }
}

if (typeof document !== 'undefined') document.documentElement.lang = current;

/** Texto según el idioma activo (para store, servicios y datos). */
export function tr(es: string, en: string): string {
  return current === 'en' ? en : es;
}

/** Elige entre dos valores cualesquiera según el idioma. */
export function pickLang<T>(es: T, en: T): T {
  return current === 'en' ? en : es;
}

/**
 * Devuelve `base` con getters en los campos traducidos: en inglés devuelve `en[campo]`,
 * en español el original. Los campos sin traducción se copian tal cual.
 */
export function withEnglish<T extends object>(base: T, en: Partial<T> | undefined): T {
  if (!en) return base;
  const out = { ...base };
  for (const key of Object.keys(en) as (keyof T)[]) {
    const esValue = base[key];
    const enValue = en[key];
    if (enValue === undefined) continue;
    Object.defineProperty(out, key, {
      enumerable: true,
      configurable: true,
      get: () => (current === 'en' ? enValue : esValue),
    });
  }
  return out;
}

/** Aplica `withEnglish` a un diccionario { id: objeto }. */
export function localizeRecord<K extends string, T extends object>(base: Record<K, T>, en: Partial<Record<K, Partial<T>>>): Record<K, T> {
  const out = {} as Record<K, T>;
  for (const k of Object.keys(base) as K[]) out[k] = withEnglish(base[k], en[k]);
  return out;
}
