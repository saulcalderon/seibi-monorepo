/**
 * Number formatting and parsing for fields, from the PWA
 * (`apps/app/src/lib/format.ts`, `apps/app/src/ui/fields.tsx`). The PWA
 * formats for El Salvador: `45,000`.
 */
const LOCALE = 'es-SV';

const integer = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 0 });

export function formatInteger(value: number) {
  return integer.format(value);
}

/** Parses "12,345" or "12345.6" typed on a phone keypad; empty or unreadable is `null`. */
export function parseNumber(value: string): number | null {
  const clean = value.replace(/[,\s]/g, '').trim();
  if (!clean) return null;
  const n = Number(clean);
  return Number.isFinite(n) ? n : null;
}

/** Keeps only the digits of what was typed, as a whole number: `45,0001` → 450001. */
export function parseWholeNumber(value: string): number | null {
  const digits = value.replace(/\D/g, '');
  return digits ? Number(digits) : null;
}
