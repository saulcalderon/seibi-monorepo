// The stored-choice / device-suggestion / Spanish-default order is adapted
// from Paradero's src/i18n (MIT License, Copyright (c) 2026 Croma and the
// Paradero contributors).
import { getLocales } from 'expo-localization';
import Storage from 'expo-sqlite/kv-store';
import { createInstance } from 'i18next';
import { initReactI18next } from 'react-i18next';

import { DEFAULT_LANGUAGE, LANGUAGES, SUPPORTED_LANGUAGES, type Language } from './languages';
import { resolveLanguage, type LanguageChoice } from './resolve-language';

const KEY = 'language.v1';

function languageFor(stored: string | null): Language {
  return resolveLanguage({
    stored,
    device: getLocales().map((locale) => locale.languageCode),
    supported: SUPPORTED_LANGUAGES,
    fallback: DEFAULT_LANGUAGE,
  });
}

const i18n = createInstance();

// Runs once, when the root layout imports this module: before the first
// render. The stored choice is read synchronously and the resources are
// bundled, so init finishes in this call and no frame shows a key.
void i18n.use(initReactI18next).init({
  resources: Object.fromEntries(
    Object.entries(LANGUAGES).map(([code, messages]) => [code, { translation: messages }]),
  ),
  lng: languageFor(Storage.getItemSync(KEY)),
  fallbackLng: DEFAULT_LANGUAGE,
  supportedLngs: SUPPORTED_LANGUAGES,
  initAsync: false,
  // React already escapes text.
  interpolation: { escapeValue: false },
});

/** Stores the user's choice (`system` clears it) and switches every screen to it. */
export function setLanguage(choice: LanguageChoice<Language>) {
  if (choice === 'system') Storage.removeItemSync(KEY);
  else Storage.setItemSync(KEY, choice);
  void i18n.changeLanguage(languageFor(choice === 'system' ? null : choice));
}

export default i18n;
