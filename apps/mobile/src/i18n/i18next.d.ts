import 'i18next';

import type { Messages } from './languages';

// Types `t()` from es.json: a key that isn't in es.json fails typecheck.
declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'translation';
    resources: { translation: Messages };
    // Also with a default value: `t('missing', 'Texto')` fails too.
    strictKeyChecks: true;
  }
}
