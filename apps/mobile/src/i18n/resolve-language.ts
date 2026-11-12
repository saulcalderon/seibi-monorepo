/** What the user picked, or `system` to follow the device. */
export type LanguageChoice<L extends string> = L | 'system';

/**
 * The language Seibi shows. The user's stored choice wins. Without one, the
 * device only suggests: its first language that Seibi speaks. Otherwise the
 * fallback (Spanish).
 *
 * Pure (no native imports), so it can run under plain Node without a device.
 */
export function resolveLanguage<L extends string>({
  stored,
  device,
  supported,
  fallback,
}: {
  stored: string | null;
  device: readonly (string | null)[];
  supported: readonly L[];
  fallback: L;
}): L {
  const speaks = (code: string | null): code is L => code !== null && (supported as readonly string[]).includes(code);
  if (speaks(stored)) return stored;
  return device.find(speaks) ?? fallback;
}
