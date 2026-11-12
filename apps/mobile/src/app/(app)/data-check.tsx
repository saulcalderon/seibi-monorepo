// The data check screen (SEI-53), in Seibi Dev only. EXPO_PUBLIC_APP_VARIANT
// is inlined at bundle time: in any other variant this folds to `null`, Metro
// drops the require, and the screen's module is not in the bundle. The
// (app) layout also keeps the route closed there (Stack.Protected).
const DataCheckScreen =
  process.env.EXPO_PUBLIC_APP_VARIANT === 'development'
    ? // eslint-disable-next-line @typescript-eslint/no-require-imports
      (require('@/data/dev/data-check') as typeof import('@/data/dev/data-check')).DataCheckScreen
    : null;

export default function DataCheckRoute() {
  return DataCheckScreen ? <DataCheckScreen /> : null;
}
