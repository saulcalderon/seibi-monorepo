// The UI kit's sample form sheet (SEI-54), in Seibi Dev only: the same
// bundle-time fold as `index.tsx`, so other variants don't contain it.
const UIKitFormSheet =
  process.env.EXPO_PUBLIC_APP_VARIANT === 'development'
    ? // eslint-disable-next-line @typescript-eslint/no-require-imports
      (require('@/ui/dev/ui-kit-form') as typeof import('@/ui/dev/ui-kit-form')).UIKitFormSheet
    : null;

export default function UIKitFormRoute() {
  return UIKitFormSheet ? <UIKitFormSheet /> : null;
}
