# Design

Seibi's native app has one design system. Every color, size, radius and
font comes from the theme in `apps/mobile` (built in SEI-42), and the check
scripts (SEI-46) fail a PR that writes a raw number, color or string in a
screen or component. Read this before any UI work.

**The port keeps the PWA's look.** Values below are taken from
`apps/app/src/index.css` and the PWA's components. The Paper redesign comes
after the port (see [`PLAN.md`](./PLAN.md)); until then, change a value here
only to fix a bug or an accessibility failure.

## Tokens

Unistyles 3 themes `light` and `night`, typed. Components use the role
names, never hex. If a value you need doesn't exist, add a token with a
role name here and in the theme; don't write it in the screen.

### Color

| Role | Light | Night | Use |
| --- | --- | --- | --- |
| `radiant` | `#e85322` | `#e85322` | Brand accent for non-text: focus rings, active indicators, icons |
| `radiantStrong` | `#c9431a` | `#c9431a` | Primary button fill (white text 4.88:1) |
| `radiantPressed` | `#b83d18` | `#b83d18` | Pressed primary button (white text 5.65:1) |
| `radiantText` | `#c14019` | `#e85322` | Radiant-coloured text and links |
| `radiantSoft` | `#fdeee8` | `rgb(232 83 34 / 16%)` | Brand-tinted backgrounds |
| `bg` | `#f2f4f7` | `#0e0f11` | Screen background |
| `surface` | `#ffffff` | `#17181b` | Cards, sheets |
| `surface2` | `#f7f8fa` | `#1d1f23` | Nested surfaces, hover rows |
| `surface3` | `#eceef2` | `#26282d` | Controls, tracks, skeletons |
| `ink` | `#141517` | `#f2f4f7` | Primary text |
| `muted` | `#5b606a` | `#a3a8b1` | Secondary text |
| `subtle` | `#686e79` | `#7c828c` | Tertiary text, chevrons |
| `line` | `rgb(20 21 23 / 8%)` | `rgb(242 244 247 / 9%)` | Hairlines, card borders |
| `inverse` | `#141517` | `#f2f4f7` | Inverse surfaces |
| `onInverse` | `#f2f4f7` | `#141517` | Text on `inverse` |
| `ok` / `okSoft` | `#178a55` / `#e3f5ec` | `#3ccf8a` / `rgb(60 207 138 / 14%)` | Reminder status «Al día»: dots, bars, icons |
| `okText` | `#157c4c` | `#3ccf8a` | «Al día» text, on surfaces and on `okSoft` badges |
| `soon` / `soonSoft` | `#b86e00` / `#fdf1dc` | `#f2b544` / `rgb(242 181 68 / 14%)` | Reminder status «Por vencer»: dots, bars, icons |
| `soonText` | `#9d5e00` | `#f2b544` | «Por vencer» text, on surfaces and on `soonSoft` badges |
| `overdue` / `overdueSoft` | `#d0342a` / `#fde8e6` | `#ff6b5e` / `rgb(255 107 94 / 15%)` | Reminder status «Vencido»: dots, bars, icons |
| `overdueText` | `#c63128` | `#ff6b5e` | «Vencido» text, on surfaces and on `overdueSoft` badges |
| `unknown` / `unknownSoft` | `#5b606a` / `#eceef2` | `#a3a8b1` / `rgb(163 168 177 / 14%)` | Reminder status unknown |

Three palette rules the PWA already has, and the port keeps:

- **First-run screens stay on the light palette**, even when the app is in
  night (`.intro-day` in the PWA).
- **Garage (Inicio, v3) has its own light palette**, used on Inicio and the
  intro (`.v3`, `.intro-v3`): `bg #f1f1f2`, `surface #ffffff`, `surface2
  #f4f4f5`, `surface3 #e4e4e6`, `ink #0e0f11`, `muted #6b6e74`, `subtle
  #6a6c72` (was `#9a9ca1`, see Accessibility), `line rgb(14 15 17 / 8%)`, `inverse #0e0f11`, `onInverse
  #ffffff`, `overdue #ad2831`, `overdueSoft #f8e6e7`. Red is only for
  «Vencido». Night is not art-directed for v3; Garage in night uses the
  base night palette.
- **On Garage, the active Vehicle's paint is the only accent** (pager dot,
  interval bars). The 13 paint presets and the paint → accent rule live in
  `apps/app/src/lib/paint.ts`; port them as they are.

Garage stage colors (`--g-*` in `index.css`: floor gradient, vignette,
control, track, dot) belong to S4 and live in the theme as a `garage`
group, light and night.

The logo mark has its own colors: accent `#ec3a27`, ticks `#1f1f1f` (light)
or `#ffffff` (night). It ships as SVG (`apps/app/src/components/Logo.tsx`).

### Shadows

| Role | Light | Night |
| --- | --- | --- |
| `shadow.card` | `0 1px 2px rgb(20 21 23 / 4%), 0 10px 28px rgb(20 21 23 / 6%)` | `0 1px 0 rgb(255 255 255 / 4%) inset, 0 10px 28px rgb(0 0 0 / 35%)` |
| `shadow.float` | `0 12px 40px rgb(20 21 23 / 16%), 0 2px 6px rgb(20 21 23 / 8%)` | `0 16px 44px rgb(0 0 0 / 55%)` |

React Native's `boxShadow` style (New Architecture) takes these strings.
Put a shadow on the rounded surface itself, not on a square container
(Paradero's hairline-past-the-corners bug).

### Type

| Family | Weights | Use |
| --- | --- | --- |
| Clash Display | 600 | Headings (`h1`–`h3` in the PWA), letter-spacing `-0.01em` |
| Archivo | 300, 400, 500, 600, 700 | Everything else. Body is 15 pt, line height 1.45 |
| Archivo, width 125 | 700 | The «seibı» wordmark only. React Native can't set a width axis: ship a static instance or the SVG |
| Geist Mono | 400 | Numbers: Mileage, costs, intervals |

Fonts ship in the binary through `expo-font`. Archivo and Geist Mono come
from `@expo-google-fonts`; Clash Display is a bundled file from Fontshare
(its licence is an open question in `PLAN.md`).

The PWA sizes text ad hoc (`text-[0.72rem]` to `text-[2.35rem]`, 1 rem =
16 px). The native app uses a named scale; each PWA size maps to the
nearest step. Ticket B checks the mapping screen by screen.

| Step | Size (pt) | PWA sizes it replaces |
| --- | --- | --- |
| `caption` | 12 | 0.72–0.78 rem |
| `footnote` | 13 | 0.8–0.84 rem |
| `subhead` | 14 | 0.85–0.92 rem |
| `body` | 15 | 0.95 rem, the 15 px body |
| `callout` | 16 | 1–1.05 rem |
| `headline` | 18 | 1.15–1.2 rem |
| `title3` | 20 | 1.25–1.3 rem |
| `title2` | 22 | 1.35–1.375 rem |
| `title1` | 26 | 1.55–1.75 rem |
| `largeTitle` | 32 | 2 rem |
| `display` | 38 | 2.35 rem |

Text grows with the system text size: no fixed heights on text, and rows
stack instead of truncating at accessibility sizes.

### Spacing and radius

- **Spacing:** a 4 pt grid (Tailwind's unit in the PWA). `space[n]` is
  `n × 4`.
- **Radius**, from the values the PWA uses:

| Token | pt | PWA |
| --- | --- | --- |
| `xs` | 4 | `rounded-sm` |
| `sm` | 6 | `rounded-md` |
| `md` | 8 | `rounded-lg` |
| `lg` | 12 | `rounded-xl` (small buttons) |
| `xl` | 16 | `rounded-2xl`, `rounded-[1rem]` (cards, medium buttons) |
| `2xl` | 20 | `rounded-[1.25rem]`, `rounded-[1.35rem]` |
| `3xl` | 24 | `rounded-3xl` (sheets) |
| `pill` | 999 | `rounded-full` |

## Components (ticket B)

Use what exists before writing styles. Variants are Unistyles variants, so
a screen picks `variant` and `size`, never colors.

| Component | Variants | From the PWA |
| --- | --- | --- |
| `Text` | `step` (the type scale), `family` (`display`, `sans`, `mono`), `tone` (`ink`, `muted`, `subtle`, `radiant`, `ok`, `soon`, `overdue`; each maps to its `*Text` token) | — |
| `Button` | `variant`: `primary` (`radiantStrong` fill), `secondary`, `ghost`, `danger`, `inverse`; `size`: `sm` 36, `md` 44, `lg` 56 (`minHeight`); `loading`, leading and trailing icon | `ui/Button.tsx` |
| `IconButton` | `ghost`, `secondary`, `inverse`; 44 × 44 | `ui/Button.tsx` |
| `Card`, `SectionHeader`, `ListRow`, `IconTile` | `IconTile` tone: `neutral`, `radiant`, `ok`, `soon`, `overdue`, `unknown`; size `sm`, `md` | `ui/Card.tsx` |
| `TextField`, `TextAreaField`, `SelectField`, `Toggle`, `Segmented`, `Chip` | Selects, toggles, menus and the date picker are `@expo/ui` controls | `ui/fields.tsx` |
| Combobox (makes and models) | A searchable list in a sheet | `ui/Combobox.tsx` |
| Sheet | Content for an Expo Router `formSheet` route | `ui/Sheet.tsx` |
| `Skeleton`, `EmptyState`, `ErrorState` | Placeholders take the space of the content they replace | `ui/feedback.tsx` |
| `StatusBadge`, `ProgressBar` | One per Reminder status, always with its text | `ui/feedback.tsx` |
| Toast | `sonner-native`, mounted once at the root | `ToastProvider` in `ui/feedback.tsx` |
| `Icon` | `size`: `sm` 16, `md` 20, `lg` 24 | lucide-react, 30 icons |
| Floating [+] | Glass on iOS (`expo-glass-effect`), Material-style on Android; bottom right above the tab bar (ticket C) | The Dock's centre [+] |

## Icons

`Icon` wraps `SymbolView` from `expo-symbols`, with one map: each icon has
an SF Symbol name for iOS and a Material Symbols name for Android, typed so
a missing name fails `typecheck` (Paradero's `src/components/icon.tsx`).
The map replaces the PWA's 30 Lucide icons.

SVG (`react-native-svg`) covers what symbols can't: the logo, the
body-type silhouettes (`VehicleVisual.tsx`), the art on Login and the
Intro, and filled icons on Android, where Material Symbols has outline
only.

## Motion

Reanimated 4 and Gesture Handler. The PWA's curves become
`Easing.bezier(...)` presets in the theme:

| Preset | Curve | PWA use |
| --- | --- | --- |
| `smooth` | `(0.33, 1, 0.68, 1)` | Screen transitions (out 220 ms, in 320 ms) |
| `spring` | `(0.34, 1.4, 0.64, 1)` | Small overshoots (splash ticks) |
| `paint` | `(0.2, 0.7, 0.2, 1)`, 400 ms | Garage paint and accent crossfade |

The three first-run animations are simplified in the port: a native
splash, one still image on Login, still slides in the Intro. With Reduce
Motion on, nothing animates; the content just appears.

## Accessibility

The target is **WCAG 2.2 AA**. High-contrast palettes come after the
redesign.

| Phone setting | What Seibi does |
| --- | --- |
| Text size | All text grows; rows stack instead of truncating |
| Reduce Motion | No animations; content appears in place |
| VoiceOver / TalkBack | Every pressable has `accessibilityRole` and a full spoken label that starts with its visible words; headings are marked as headings |

Rules:

- Every touch target is at least 44 pt, even when it looks smaller
  (`hitSlop`). `Button` `sm` is 36 pt tall, so it gets `hitSlop`.
- Buttons and chips grow with their text: `minHeight`, never `height`.
- Color is never the only signal: each Reminder status shows its text.
- Text contrast is 4.5:1, large text 3:1, checked on both palettes.

**Light-palette fixes** (decided 2026-11-11). The PWA's light palette
failed AA in these pairs; the port changes only the text roles, so fills,
dots, bars and icons keep their colors (non-text needs 3:1, which they
meet). Night already passes, so its text roles equal the base colors.

| Pair | PWA | Port | Worst ratio after |
| --- | --- | --- | --- |
| White on the primary button | `radiant` 3.69 | fill `radiantStrong` | 4.88 |
| Radiant text on surfaces and `radiantSoft` | `radiant` 3.69 | `radiantText #c14019` | 4.63 |
| `subtle` on `bg`, `surface`, `surface2` | `#8a909a` 2.92 | `#686e79` | 4.65 |
| Garage `subtle` on Garage `bg` | `#9a9ca1` 2.43 | `#6a6c72` | 4.65 |
| «Al día» text, incl. on `okSoft` | `ok` 3.86 | `okText #157c4c` | 4.61 |
| «Por vencer» text, incl. on `soonSoft` | `soon` 3.57 | `soonText #9d5e00` | 4.66 |
| «Vencido» text, incl. on `bg` and `overdueSoft` | `overdue` 4.25 | `overdueText #c63128` | 4.61 |

Each new shade is the same hue, darkened until it reaches 4.6:1 against
every background it sits on. The contrast check (SEI-46) tests these pairs.

## Checks (SEI-46)

Adapted from Paradero (MIT; keep its licence notice in each script). They
run with typecheck and lint in one `check` script, in CI on every PR.

| Script | Fails on |
| --- | --- |
| `check-tokens` | Raw layout numbers and hex or rgba colors in screens and components |
| `check-contrast` | A text pair in the `light` or `night` theme below 4.5:1 (3:1 for large text) |
| `check-strings` | Text in JSX or in spoken props (`accessibilityLabel`, `title`, `placeholder`, …) that doesn't come from i18n |
