// The UI kit's sample screen (SEI-54), in Seibi Dev only. EXPO_PUBLIC_APP_VARIANT
// is inlined at bundle time: in any other variant this folds to `null`, Metro
// drops the require, and the sample's module is not in the bundle. The
// layout also redirects home there.
const UIKitScreen =
  process.env.EXPO_PUBLIC_APP_VARIANT === 'development'
    ? // eslint-disable-next-line @typescript-eslint/no-require-imports
      (require('@/ui/dev/ui-kit-screen') as typeof import('@/ui/dev/ui-kit-screen')).UIKitScreen
    : null;

export default function UIKitRoute() {
  return UIKitScreen ? <UIKitScreen /> : null;
}
