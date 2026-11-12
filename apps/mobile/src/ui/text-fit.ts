/**
 * The text-fit check: whether a Text's drawn lines fit the box the layout
 * gave it. A Text that doesn't fit is cut: its last line is drawn outside
 * the box and clipped away. A screen that wants the check (the UI kit's
 * sample screen) gives its Texts a store, and a flow reads the result as
 * text (docs/DESIGN.md → Text that fits).
 */

/** One drawn line, as `onTextLayout` reports it. */
export interface DrawnLine {
  text: string;
  width: number;
  height: number;
}

/** True when the drawn lines fit the box, give or take `tolerance` points of rounding. */
export function textFits(box: { width: number; height: number }, lines: readonly DrawnLine[], tolerance = 1): boolean {
  const drawn = lines.reduce((sum, line) => sum + line.height, 0);
  return drawn <= box.height + tolerance && lines.every((line) => line.width <= box.width + tolerance);
}

export interface TextFitStore {
  /** A Text's latest result; `null` when it unmounts. */
  report(id: string, text: string, fits: boolean | null): void;
  subscribe(listener: () => void): () => void;
  /** The words of every Text that doesn't fit now, in the order they were reported. Stable between changes. */
  misfits(): readonly string[];
}

export function createTextFitStore(): TextFitStore {
  const cut = new Map<string, string>();
  const listeners = new Set<() => void>();
  let snapshot: readonly string[] = [];

  return {
    report(id, text, fits) {
      const before = cut.get(id);
      if (fits === false) cut.set(id, text);
      else cut.delete(id);
      if (cut.get(id) === before) return;
      snapshot = [...cut.values()];
      listeners.forEach((listener) => listener());
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    misfits: () => snapshot,
  };
}
