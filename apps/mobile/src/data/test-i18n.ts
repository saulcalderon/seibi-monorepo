// The app's Spanish copy for unit tests: a plain i18next instance with
// es.json, without the device pieces `@/i18n` reads (expo-localization, the
// kv-store). For tests only.
import { createInstance } from 'i18next';

import es from '@/i18n/es.json';

const i18n = createInstance();
void i18n.init({
  lng: 'es',
  resources: { es: { translation: es } },
  initAsync: false,
  interpolation: { escapeValue: false },
});

export const t = i18n.t;
export { es };
