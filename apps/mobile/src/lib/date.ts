/** Dates as the PWA shows them, for El Salvador: «12 nov 2026». */
const LOCALE = 'es-SV';

const medium = new Intl.DateTimeFormat(LOCALE, { day: 'numeric', month: 'short', year: 'numeric' });

export function formatDate(value: Date) {
  return medium.format(value);
}
