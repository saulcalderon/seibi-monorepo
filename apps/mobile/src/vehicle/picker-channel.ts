// How the Vehicle form hears back from its pickers. The form pushes
// `/vehicle/pick?kind=…` and leaves a callback here; the picker screen hands
// the chosen value to it and goes back. Routes can't return values, and a
// context would tie the form to one layout: S3 shows the same form inside
// the first-run questions.

export type PickKind = 'brand' | 'year' | 'model';

const waiting = new Map<PickKind, (value: string) => void>();

/** Called by the form as it opens a picker. The latest form to ask is the one that hears back. */
export function awaitPick(kind: PickKind, onPick: (value: string) => void) {
  waiting.set(kind, onPick);
}

/** Called by the picker with the person's choice. */
export function deliverPick(kind: PickKind, value: string) {
  waiting.get(kind)?.(value);
  waiting.delete(kind);
}

/** Called by the form when it goes away, so a late choice reaches nobody. */
export function forgetPick(kind: PickKind, onPick: (value: string) => void) {
  if (waiting.get(kind) === onPick) waiting.delete(kind);
}
