import es from './es.json';

/** The shape of every language file. Spanish is the source; the others mirror it. */
export type Messages = typeof es;

/**
 * Every language Seibi speaks. Adding one is a JSON file next to `es.json`
 * and a line here; `Messages` fails typecheck when the new file misses a
 * key. Screens don't change.
 */
export const LANGUAGES = { es } satisfies Record<string, Messages>;

export type Language = keyof typeof LANGUAGES;

export const DEFAULT_LANGUAGE: Language = 'es';

export const SUPPORTED_LANGUAGES = Object.keys(LANGUAGES) as Language[];
