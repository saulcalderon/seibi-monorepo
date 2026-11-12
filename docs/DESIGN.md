# Design

Seibi's native app has one design system. Every color, size, radius and
font comes from the theme in `apps/mobile` (built in SEI-42), and the check
scripts (see Checks) fail a PR that writes a raw number, color or string in
a screen or component. Read this before any UI work.

**The port keeps the PWA's look.** Values below are taken from
`apps/app/src/index.css` and the PWA's components. The Paper redesign comes
after the port (see [`PLAN.md`](./PLAN.md)); until then, change a value here
only to fix a bug or an accessibility failure.

## Tokens

Unistyles 3 themes, typed, built from plain-data palettes in
`apps/mobile/src/theme/palettes.ts`: `light` and `night` (registered with
Unistyles as `light` and `dark`, the names it reserves for following the
system), plus `garage` below. Components use the role names, never hex. If
a value you need doesn't exist, add a token with a role name here and in
the theme; don't write it in the screen.

### Color

| Role | Light | Night | Use |
| --- | --- | --- | --- |
| `radiant` | `#e85322` | `#e85322` | Brand accent for non-text: focus rings, active indicators, icons |
| `radiantStrong` | `#c9431a` | `#c9431a` | Primary button fill (white text 4.88:1) |
| `radiantPressed` | `#b83d18` | `#b83d18` | Pressed primary button (white text 5.65:1) |
| `radiantText` | `#c14019` | `#ec7148` | Radiant-coloured text and links |
| `radiantSoft` | `#fdeee8` | `rgb(232 83 34 / 16%)` | Brand-tinted backgrounds |
| `bg` | `#f2f4f7` | `#0e0f11` | Screen background |
| `surface` | `#ffffff` | `#17181b` | Cards, sheets |
| `surface2` | `#f7f8fa` | `#1d1f23` | Nested surfaces, hover rows |
| `surface3` | `#eceef2` | `#26282d` | Controls, tracks, skeletons |
| `ink` | `#141517` | `#f2f4f7` | Primary text |
| `muted` | `#5b606a` | `#a3a8b1` | Secondary text |
| `subtle` | `#686e79` | `#828891` | Tertiary text, chevrons |
| `line` | `rgb(20 21 23 / 8%)` | `rgb(242 244 247 / 9%)` | Hairlines, card borders |
| `inverse` | `#141517` | `#f2f4f7` | Inverse surfaces |
| `onInverse` | `#f2f4f7` | `#141517` | Text on `inverse` |
| `onRadiant` | `#ffffff` | `#ffffff` | Text on `radiantStrong` and `radiantPressed` (the primary button) |
| `ok` / `okSoft` | `#178a55` / `#e3f5ec` | `#3ccf8a` / `rgb(60 207 138 / 14%)` | Reminder status «Al día»: dots, bars, icons |
| `okText` | `#157c4c` | `#3ccf8a` | «Al día» text, on surfaces and on `okSoft` badges |
| `soon` / `soonSoft` | `#b86e00` / `#fdf1dc` | `#f2b544` / `rgb(242 181 68 / 14%)` | Reminder status «Por vencer»: dots, bars, icons |
| `soonText` | `#9d5e00` | `#f2b544` | «Por vencer» text, on surfaces and on `soonSoft` badges |
| `overdue` / `overdueSoft` | `#d0342a` / `#fde8e6` | `#ff6b5e` / `rgb(255 107 94 / 15%)` | Reminder status «Vencido»: dots, bars, icons |
| `overdueText` | `#c63128` | `#ff6b5e` | «Vencido» text, on surfaces and on `overdueSoft` badges |
| `unknown` / `unknownSoft` | `#5b606a` / `#eceef2` | `#a3a8b1` / `rgb(163 168 177 / 14%)` | Reminder status unknown |
| `unknownText` | `#5b606a` | `#a3a8b1` | Unknown-status text; equals `unknown`, which already passes AA |

Three palette rules the PWA already has, and the port keeps:

- **First-run screens stay on the light palette**, even when the app is in
  night (`.intro-day` in the PWA). Login (S1) is one: like the PWA's
  `.intro-day .intro-v3` it draws on `garage` in a `ScopedTheme`, with a
  dark status bar. The native splash is not a screen: it follows the
  phone's appearance (the isotype on `bg`, light or night), because most
  launches open a signed-in app that follows the phone.
- **Garage (Inicio, v3) has its own light palette**, used on Inicio and the
  intro (`.v3`, `.intro-v3`): `bg #f1f1f2`, `surface #ffffff`, `surface2
  #f4f4f5`, `surface3 #e4e4e6`, `ink #0e0f11`, `muted #62656b` (was
  `#6b6e74`), `subtle #6a6c72` (was `#9a9ca1`; both see Accessibility),
  `line rgb(14 15 17 / 8%)`, `inverse #0e0f11`, `onInverse
  #ffffff`, `overdue #ad2831`, `overdueSoft #f8e6e7`, `overdueText
  #ad2831` (the red already passes AA as text). Every other role is the
  light palette's. Red is only for «Vencido». Night is not art-directed
  for v3; Garage in night uses the base night palette. In the app it is
  the `garage` theme, applied to a subtree with Unistyles' `ScopedTheme`.
- **On Garage, the active Vehicle's paint is the only accent** (pager dot,
  interval bars). The 13 paint presets and the paint → accent rule live in
  `apps/app/src/lib/paint.ts`; port them as they are.

Garage stage colors (`--g-*` in `index.css`: floor gradient, vignette,
control, track, dot) belong to S4 and live in the theme as a `garage`
group, light and night.

The logo mark has its own colors: accent `#ec3a27`, ticks `#1f1f1f` (light)
or `#ffffff` (night). It ships as SVG (`apps/app/src/components/Logo.tsx`).
These and the body-type silhouettes' colors (silver paint `#c3c7cd`,
outline, glass, tyres, rims, hubs, ground shadow, sheen) are the theme's
`art` group (`palettes.ts` → `art`): drawing colors, never text, so the
contrast check skips them. `logoTickOnLight` and `logoTickOnDark` draw the
mark on a fixed light or dark surface whatever the theme. The `art` group
also holds the wordmark's dot (`wordmarkDot #e0464f`) and Google's sign-in
button colours (`google*`: fill `#ffffff`, stroke `#747775`, text `#1f1f1f`
and the four colours of the «G»), which Google's branding guidelines fix.

### Shadows

| Role | Light | Night |
| --- | --- | --- |
| `shadow.card` | `0 1px 2px rgb(20 21 23 / 4%), 0 10px 28px rgb(20 21 23 / 6%)` | `0 1px 0 rgb(255 255 255 / 4%) inset, 0 10px 28px rgb(0 0 0 / 35%)` |
| `shadow.float` | `0 12px 40px rgb(20 21 23 / 16%), 0 2px 6px rgb(20 21 23 / 8%)` | `0 16px 44px rgb(0 0 0 / 55%)` |
| `shadow.primary` | `0 8px 20px rgba(232, 83, 34, 0.28)` | same | The primary button's radiant glow |

React Native's `boxShadow` style (New Architecture) takes these strings.
Put a shadow on the rounded surface itself, not on a square container
(Paradero's hairline-past-the-corners bug).

### Type

| Family | Weights | Use |
| --- | --- | --- |
| Clash Display | 600 | Headings (`h1`–`h3` in the PWA), letter-spacing `-0.01em` |
| Archivo | 300, 400, 500, 600, 700 | Everything else. Body is 15 pt, line height 1.45 |
| Archivo, width 125 | 700 | The «seibı» wordmark only. React Native can't set a width axis, so `Wordmark` draws it as outlines (SVG) taken from Archivo's variable font at wght 700, wdth 125 |
| Geist Mono | 400 | Numbers: Mileage, costs, intervals |

Fonts ship in the binary through `expo-font`. Archivo and Geist Mono come
from `@expo-google-fonts`. Clash Display is not bundled yet: its licence
allows embedding it in an app but not sharing the file through a public
repository (see `PLAN.md` → Open questions), so headings use Archivo 600,
the PWA's own fallback (`--font-display: 'Clash Display', 'Archivo'`). The
theme's `fonts.display` names the heading font, so switching is one line.

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

Login's headline («Mantenimiento con total claridad») keeps the PWA's
first-run style: `title1` in Archivo 300, tracked `-0.025em` with a 1.12
line height (`heroType` in `tokens.ts`).

**Text that fits.** On Android, React Native 0.88 measures a text that has
a `lineHeight` (every step does) at its exact width, then lays it out for
drawing about 1 px narrower: the width goes from pixels to points and back
and rounds down. When the text sits in a box as wide as its words (a chip,
a badge, a button), the last word no longer fits, moves to a second line,
and that line falls outside the box: the chip «Al día» showed «Al», and at
font scale 2.0 «Abrir formulario en hoja» lost its second line. Neither
Unistyles nor the font is the cause; a plain React Native `Text` with a
plain `StyleSheet` does the same. So `Text`, on Android only, ends its
words with a thin space (Archivo at `size.hangingSpace`, 6 pt: 1.2 pt
wide). A trailing space hangs past the end of the line, so it widens the
measured box without needing room when the line breaks. The space is
drawing, not words: `Text` gives TalkBack (and Maestro) the words alone as
its `accessibilityLabel`. Nested `Text` is a span of its parent and adds
nothing. Other fixes tried: `textBreakStrategy`, `includeFontPadding`,
hyphenation and letter spacing don't help; `numberOfLines={1}` would cut
long labels at large text sizes. A screen that provides `TextFitContext`
(the sample screen does) gets every `Text`'s report of whether its drawn
lines fit its box (`text-fit.ts`).

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

- **Sizes** (`size` in `tokens.ts`), from the PWA's components. Heights
  are `minHeight`: a control grows with its text.

| Token | pt | Use |
| --- | --- | --- |
| `target` | 44 | The minimum touch target |
| `control.sm` / `md` / `lg` | 36 / 44 / 56 | Button heights (`h-9`, `h-11`, `h-14`) |
| `field` | 52 | Text, number and select fields (`h-13`) |
| `chip` | 40 | Chips |
| `badge` | 28 | Status badges |
| `row` | 56 | A tappable list row |
| `tile.sm` / `md` / `lg` | 36 / 44 / 64 | Icon tiles; `lg` is the empty and error states' |
| `icon.xs` … `xl` | 14, 16, 20, 24, 28 | Icon sides |
| `track` | 8 | A progress bar |
| `readable` | 288 | The widest centred body text (`max-w-[18rem]`) |
| `logo.sm` / `md` / `lg` | 24 / 44 / 72 | The isotype's height |
| `silhouette.sm` / `lg` | 136 / 240 | A silhouette's width |
| `hero` | 192 | A still hero image's height: the Vehicle on Login (`h-48`) |
| `border.thin` / `focus` | 1 / 2 | Field and card borders; the focus ring |
| `hangingSpace` | 6 | The font size of the thin space `Text` hangs after its words on Android (Type → Text that fits) |

- **Opacity** (`opacity`): `disabled` 0.5, `pressed` 0.85 (danger and
  inverse buttons, which have no pressed color), `skeleton` 0.55 (the low
  point of the pulse). Colors never change opacity for any other reason.
- **Corners on Android.** React Native 0.88's Fabric renderer flattens a
  view whose styles draw nothing (a radius and padding with no fill, no
  border, no `testID`, not accessible): it never becomes a native view.
  When a later state gives it a fill (a pressed state, a selection), the
  view React Native then creates on Android is drawn square: the chip's
  count went square once its chip lost the selection, the `ghost` button's
  pressed fill was square. A rounded view whose fill changes therefore
  keeps a native view from mount: a fill in every state (the count is
  `surface3`, or `inverse` like its chip when selected), or, for a view
  that must stay see-through until pressed, `overflow: 'hidden'` (`ghost`
  `Button` and `IconButton`). Pressables are accessible, so they are never
  flattened (a `Segment`'s own fill is safe). The `verify` skill checks the
  count's corners (`round-*` crops).

## Components

The UI kit (SEI-54) lives in `apps/mobile/src/ui/`. Use what exists before
writing styles. Variants are Unistyles variants, so a screen picks
`variant`, `size` or `tone`, never colors. Every component reads the theme
through `StyleSheet.create((theme, rt) => …)`, so a theme switch recolors
it natively without a re-render.

| Component | File | Variants and behaviour | From the PWA |
| --- | --- | --- | --- |
| `Text` | `text.tsx` | `step` (the type scale), `family` (`display`, `sans`, `mono`; `system`, the platform font at 500, only where a third party's brand rules ask for it), `weight` (300–700, as a font file), `tone` (`ink`, `muted`, `subtle`, `radiant`, `ok`, `soon`, `overdue`, `unknown`, `onInverse`, `onRadiant`; each status tone uses its `*Text` role), `align`, `heading` (`accessibilityRole="header"`). On Android it hangs a thin space after its words so no line is cut (Type → Text that fits) | — |
| `Icon` | `icon.tsx` | `size` `xs`–`xl`, `tone` or `color`, `label` (only when the icon means something alone), `fixed`. See Icons | lucide-react |
| `Button` | `button.tsx` | `variant`: `primary` (`radiantStrong`, glow), `secondary`, `ghost`, `danger`, `inverse`; `size`: `sm` 36, `md` 44, `lg` 56 (`minHeight`; `sm` gets `hitSlop` to 44); `icon`, `trailingIcon`, `loading` (the platform's spinner in place of the icon, keeps its label and colors, ignores presses, `busy`; the PWA also dims it, which left Android's thin arc almost invisible on the orange), `disabled` (dims to `opacity.disabled`), `block` | `ui/Button.tsx` |
| `IconButton` | `button.tsx` | `ghost`, `secondary`, `inverse`; 44 × 44; `label` is required | `ui/Button.tsx` |
| `Chip` | `chip.tsx` | `selected`, `count`, `icon`, `radio` (one of a group: `accessibilityRole="radio"`, the group is a `radiogroup`) | filter chips |
| `Card`, `SectionHeader`, `ListRow`, `RowDivider`, `IconTile` | `card.tsx` | A `ListRow` with `onPress` is one button with a chevron and a background highlight on press (never a scale); from `largeTextScale` (1.35×) its title, subtitle and trailing part stack. `IconTile` tone: `neutral`, `radiant`, `ok`, `soon`, `overdue`, `unknown`; size `sm`, `md` | `ui/Card.tsx` |
| `TextField`, `TextAreaField`, `NumberField`, `MileageField`, `Segmented`, `Field` | `fields.tsx` | Label above, `hint`, `error` (replaces the hint, red border, announced), `optional` («· opcional»), `suffix` (units), `mono`; a 2 pt `radiant` ring on focus. `NumberField` `kind`: `integer`, `decimal`. `MileageField` keeps a number, groups thousands as it is typed (es-SV: `45,000`) and shows `km` or `mi`. `Segmented` is a radio group | `ui/fields.tsx` |
| `SelectField`, `Toggle`, `MenuButton`, `DateField` | `controls.tsx`, `native-controls*.tsx` | The platform's own controls from `@expo/ui` (results below). `Toggle` is a settings row whose switch carries the row's text as its label; from `largeTextScale` the switch goes under the text | `ui/fields.tsx` |
| `FormLayout` | `form.tsx` | A form's scroll view plus an action bar that rides on the keyboard (`react-native-keyboard-controller`): «Guardar» never sits under it. Dragging the form puts the keyboard away on iOS (the number pad has no return key). On Android a downward drag on a form sheet moves the sheet and closes it, typed values and all; Back puts the keyboard away there. Real forms must ask before closing with unsaved input (`usePreventRemove`); the sample form doesn't. The content of an Expo Router `formSheet` route, which replaces the PWA's Sheet | `ui/Sheet.tsx` |
| `SkeletonGroup`, `Skeleton`, `TextSkeleton`, `ListRowSkeleton` | `feedback.tsx` | Placeholders shaped like the content they replace, at its height (a `ListRowSkeleton` is a `ListRow`'s size); the group is announced once as «Cargando» | `ui/feedback.tsx` |
| `EmptyState`, `ErrorState` | `feedback.tsx` | Icon tile, title (`<testID>-title`), body, one action; `ErrorState` has default copy and «Reintentar», and is announced | `ui/feedback.tsx` |
| `StatusBadge`, `ProgressBar` | `feedback.tsx` | One per Reminder status, always with its text («Al día», «Pronto», «Vencido», «Revisar»); the bar fills to its value on mount and is a `progressbar` with its percentage | `ui/feedback.tsx` |
| `Toaster`, `notify`, `confirm` | `toast.tsx` | `sonner-native`, mounted once in `UIProvider`, at the top. `notify.success` is `inverse` with `onInverse` text, `notify.error` is `overdue` with `onInverse` text, both announced to VoiceOver and TalkBack with `announceForAccessibility` (on Android the toast itself never reaches the accessibility tree, so TalkBack hears it once but can't move to it). `confirm()` is the native alert and resolves to `true` or `false` | `ToastProvider` |
| `Logo` | `logo.tsx` | The isotype, `size` `sm`/`md`/`lg`, `surface` `auto`/`light`/`dark`; labelled «Seibi» | `components/Logo.tsx` |
| `Wordmark` | `wordmark.tsx` | «seibı» in `ink` with its red square dot, sized by a type `step` (its font size); drawing, silent for VoiceOver and TalkBack, so its container names the brand. Login stacks `Logo` `md` over `Wordmark` `title2` as one image labelled «Seibi» | `components/Lockup.tsx` |
| `Silhouette` | `silhouette.tsx` | One per `BodyType` (`sedan`, `hatchback`, `suv`, `pickup`, `van`, `minivan`, `coupe`, `wagon`), `paint` (silver when unset), `width`; labelled «Silueta del Vehículo» | `components/VehicleVisual.tsx` |
| `AppleSignInButton`, `GoogleSignInButton` | `src/auth/provider-buttons.tsx` (not in the kit: they belong to sign-in) | Apple's: Apple's own `AppleAuthenticationButton`, «Continuar con Apple», black, a pill, as tall as Google's (Apple's HIG: the system button, equal prominence). Google's: built to Google's branding guidelines: light style (white fill, 1 pt `#747775` stroke, `#1f1f1f` text), the standard four-colour «G» at 20 pt, Google's padding (iOS 16 · 12 · 16, Android 12 · 10 · 12), a pill, «Continuar con Google» in the platform font at 500, 14/20 (`Text` `family="system"`: Google asks for Google Sans, which apps can't embed); `minHeight` 44, grows with the text; a spinner replaces the «G» while Google opens | Login's pills |
| `UIProvider` | `provider.tsx` | Wraps the root layout: gesture handler, keyboard controller, toaster | — |
| Combobox (makes and models) | — | Not in the kit yet: it comes with the Vehicle form | `ui/Combobox.tsx` |
| Floating [+] | — | Glass on iOS (`expo-glass-effect`), Material-style on Android; ticket C | The Dock's centre [+] |

**Native controls (`@expo/ui` 58).** Each was tried on both platforms in
the sample screen (SEI-54); none needed a React Native fallback, and only
iOS's select uses another `@expo/ui` control than the first one tried.

| Control | iOS | Android |
| --- | --- | --- |
| Select | `MenuView` over Seibi's field box: the system menu with a checkmark on the current option. SwiftUI's menu `Picker` (the universal one) was tried first: it opens only from its label, and at the largest text size its label runs past the box, so it is not used | Universal `Picker`: Material's exposed dropdown, which draws its own filled box at Material's width (280 dp), not the field's full width |
| Switch | Universal `Switch`, tinted `radiant`, label hidden and given to VoiceOver | Universal `Switch` (Compose), `radiant` seed color, TalkBack label through `semantics` |
| Menu | `MenuView` (`@expo/ui/community/menu`): SwiftUI menu with SF Symbols and a red destructive item | `MenuView`: Material dropdown menu, text only |
| Date | SwiftUI `DatePicker`, compact: a pill that opens the calendar in a popover, Spanish month and weekday names | `DateTimePicker` (`@expo/ui/community/datetime-picker`), Material's date dialog with «Aceptar» and «Cancelar». Its header and day names follow the phone's language, not the app's: English on an English phone |

The universal layer has no menu or date picker in SDK 58, so those two come
from the community drop-ins and, for iOS's date, from `@expo/ui/swift-ui`
in `native-controls.ios.tsx` (the SwiftUI modifiers can't load on Android).
On Android the menu's trigger has a border but no shadow: `MenuView` clips
its child to the trigger's square bounds, so the shadow showed as a grey
square behind the rounded button.

**Sample screen.** Seibi Dev has every component on one screen at
`seibi-dev://ui-kit`, with a sample form in a sheet (`src/ui/dev/`; the
routes in `src/app/ui-kit/` load them in development builds only). It
shows the theme, Reduce Motion and text size it is drawn with, and
whether every `Text` fits its box («fit: ok», or the cut words). Anywhere
but Seibi Dev the route redirects home and the samples aren't in the
bundle. `features/ui-kit.md` in the `verify` skill drives it.

## Icons

`Icon` wraps `SymbolView` from `expo-symbols`, with one map
(`src/ui/icon.tsx`, after Paradero's `src/components/icon.tsx`, MIT): each
meaning has an SF Symbol name for iOS and a Material Symbols name for
Android, typed so a missing or misspelled name fails `typecheck`. The map
has 78 entries for the PWA's 80 Lucide icons: `House` and `Home` are one
entry; `LoaderCircle` is `ActivityIndicator`, not an icon; `Rotate3d` went
with the 3D viewer (SEI-48); `Signal` and `Wifi` drew a phone status bar in
the Intro's animation, which the port drops. It adds `more` (menus) and
two filled icons for toasts. Two Lucide icons have no SF Symbol of their
own: `BellPlus` uses `bell.badge` and `Calculator` uses
`minus.forwardslash.plus`.

Icons are silent for VoiceOver and TalkBack unless they get a `label`: the
control around them carries the name. Icons beside text grow with the
system text size, up to twice their size (`maxIconScale`); icons in a
fixed box (tiles, icon buttons) pass `fixed` and keep theirs.

SVG (`react-native-svg`) covers what symbols can't: the logo, the
body-type silhouettes, the art on Login and the Intro, and filled icons on
Android, where Material Symbols has outline only (`androidPath`, from
Google's Material Icons, Apache 2.0).

## Motion

Reanimated 4 and Gesture Handler. The PWA's curves become
`Easing.bezier(...)` presets in the theme:

| Preset | Curve | PWA use |
| --- | --- | --- |
| `smooth` | `(0.33, 1, 0.68, 1)` | Screen transitions (out 220 ms, in 320 ms) |
| `spring` | `(0.34, 1.4, 0.64, 1)` | Small overshoots (splash ticks) |
| `paint` | `(0.2, 0.7, 0.2, 1)`, 400 ms | Garage paint and accent crossfade |

The theme's `motion` tokens hold the kit's timings: press feedback 120 ms
to scale 0.97 on the `out` curve `(0.23, 1, 0.32, 1)`, landing on
press-in (buttons and chips; rows highlight instead); the skeleton's pulse,
900 ms each way; a progress bar's fill on mount, 700 ms on `smooth`. They
are Reanimated CSS transitions and animations. Sheets, menus, pickers,
alerts and screen transitions are the system's own.

The three first-run animations are simplified in the port: a native
splash, one still image on Login, still slides in the Intro. Login has no
entrance animation of its own: the splash's 250 ms fade is the transition,
and its buttons give the kit's press feedback. With Reduce
Motion on, nothing animates; the content just appears: no press scale, a
still skeleton, bars drawn at their value, toasts that appear in place
(`sonner-native` reads the setting).

## Accessibility

The target is **WCAG 2.2 AA**. High-contrast palettes come after the
redesign.

| Phone setting | What Seibi does |
| --- | --- |
| Text size | All text grows; rows and switch rows stack from 1.35× (`largeTextScale`) instead of truncating; icons beside text grow with it. No line is cut on Android at any size (Type → Text that fits) |
| Reduce Motion | No animations; content appears in place |
| VoiceOver / TalkBack | Every pressable has `accessibilityRole` and a full spoken label that starts with its visible words; headings are marked as headings |

Rules:

- Every touch target is at least 44 pt, even when it looks smaller
  (`hitSlop`). `Button` `sm` is 36 pt tall, so it gets `hitSlop`. The one
  exception is a link inside a sentence (Login's «Términos» and «Política
  de privacidad»), which WCAG 2.2's target-size rule (2.5.8) exempts: they
  are spans of the sentence with `accessibilityRole="link"`, so VoiceOver
  and TalkBack list them as links.
- Buttons and chips grow with their text: `minHeight`, never `height`.
- Color is never the only signal: each Reminder status shows its text.
- Text contrast is 4.5:1, large text 3:1, checked on all three palettes
  (`light`, `night`, `garage`). Non-text status and brand colors (dots,
  bars, icons, focus rings) need 3:1.

**Contrast fixes** (light decided 2026-11-11; night and Garage
2026-11-12). The PWA's palettes failed AA in these pairs; the port changes
only the text roles, so fills, dots, bars and icons keep their colors
(non-text needs 3:1, which they meet). Text roles not in the table equal
their base colors, which already pass.

Which background each text role sits on:

- `ink` and `muted`: `bg`, `surface`, `surface2`, and `surface3`
  (controls: segmented controls, neutral badges and tiles).
- `subtle`: `bg`, `surface`, `surface2`.
- `radiantText`, `okText`, `soonText`, `overdueText`, `unknownText`: `bg`,
  `surface`, `surface2`, and their soft fill (`radiantSoft`, `okSoft`…). A
  badge sits on any of the three surfaces, so a translucent fill (night's)
  is measured over each of them.
- `onInverse` on `inverse` and on `overdue` (the error toast; 4.53 in
  light, 6.54 in night); `onRadiant` on `radiantStrong` and
  `radiantPressed`.

| Palette | Pair | PWA | Port | Worst ratio after |
| --- | --- | --- | --- | --- |
| light | White on the primary button | `radiant` 3.69 | fill `radiantStrong` | 4.88 |
| light | Radiant text on surfaces and `radiantSoft` | `radiant` 3.69 | `radiantText #c14019` | 4.63 |
| light | `subtle` on `bg`, `surface`, `surface2` | `#8a909a` 2.92 | `#686e79` | 4.65 |
| light | «Al día» text, incl. on `okSoft` | `ok` 3.86 | `okText #157c4c` | 4.61 |
| light | «Por vencer» text, incl. on `soonSoft` | `soon` 3.57 | `soonText #9d5e00` | 4.66 |
| light | «Vencido» text, incl. on `bg` and `overdueSoft` | `overdue` 4.25 | `overdueText #c63128` | 4.61 |
| night | `subtle` on `surface2` | `#7c828c` 4.27 | `#828891` | 4.62 |
| night | Radiant text on surfaces and `radiantSoft` | `radiant` 3.74 (on `radiantSoft` over `surface2`) | `radiantText #ec7148` | 4.62 |
| garage | `subtle` on Garage `bg` | `#9a9ca1` 2.43 | `#6a6c72` | 4.65 |
| garage | `muted` on Garage `surface3` | `#6b6e74` 4.03 | `#62656b` | 4.60 |

Each new shade keeps the role's hue and saturation and moves only its
lightness (darker on the light palettes, lighter on night) until it
reaches 4.6:1 against every background in its list. The contrast check
tests these pairs.

## Checks

Three scripts in `apps/mobile/scripts/`, adapted from Paradero (MIT; its
licence notice is in each). `pnpm check` at the repo root runs them after
the app's typecheck and lint, and CI runs it on every PR. Each failure
prints `file:line:column` (or the palette pair) and the fix.

| Script | Fails on |
| --- | --- |
| `check-tokens.mjs` | A raw color (hex, `rgb()`, `hsl()`, or a named color in a color prop) or a raw layout or type number (padding, gap, width, `borderRadius`, `fontSize`…; 0 is fine) in any file under `src/` except `src/theme/`. It reads `StyleSheet.create((theme) => …)`, its variants and inline styles, and names the token to use (`padding: 24` → `theme.space[6]`) |
| `check-contrast.ts` | A text pair from Accessibility's list below 4.5:1, or a status or brand color below 3:1 on `bg`, `surface` or `surface2`, in `light`, `night` or `garage` (`src/theme/palettes.ts`) |
| `check-strings.mjs` | Text in JSX, in shown or spoken props (`accessibilityLabel`, `title`, `placeholder`, …) or in `Alert.alert` that doesn't come from `es.json` |
