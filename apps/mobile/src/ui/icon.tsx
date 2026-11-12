// The { ios, android } symbol map and the SVG fallback for filled icons on
// Android are adapted from Paradero's src/components/icon.tsx (MIT License,
// Copyright (c) 2026 Croma and the Paradero contributors).
import { SymbolView, type AndroidSymbol, type SFSymbol } from 'expo-symbols';
import type { ColorValue } from 'react-native';
import { useUnistyles } from 'react-native-unistyles';
import Svg, { Path } from 'react-native-svg';

import type { size } from '@/theme/tokens';

/**
 * Every icon Seibi draws: an SF Symbol on iOS and a Material Symbol on
 * Android, one entry per meaning. It replaces the PWA's Lucide icons (the
 * Lucide name is in each comment). Material Symbols ships outline glyphs
 * only, so a filled icon gives Android an SVG path instead (`androidPath`,
 * from Google's Material Icons, Apache License 2.0).
 *
 * Not mapped, on purpose: `LoaderCircle` (a spinner: `ActivityIndicator`),
 * `Rotate3d` (the 3D viewer, removed in SEI-48), and `Signal` and `Wifi` (the
 * phone status bar drawn inside the Intro's animation, which the port drops).
 */
export const icons = {
  // Navigation and chrome
  home: { ios: 'house', android: 'home' }, // House, Home
  vehicle: { ios: 'car', android: 'directions_car' }, // CarFront
  reminders: { ios: 'bell', android: 'notifications' }, // Bell
  estimates: { ios: 'minus.forwardslash.plus', android: 'calculate' }, // Calculator
  add: { ios: 'plus', android: 'add' }, // Plus
  close: { ios: 'xmark', android: 'close' }, // X
  back: { ios: 'chevron.left', android: 'chevron_left' }, // ChevronLeft
  forward: { ios: 'chevron.right', android: 'chevron_right' }, // ChevronRight
  expand: { ios: 'chevron.down', android: 'expand_more' }, // ChevronDown
  next: { ios: 'arrow.right', android: 'arrow_forward' }, // ArrowRight
  send: { ios: 'arrow.up', android: 'arrow_upward' }, // ArrowUp
  more: { ios: 'ellipsis', android: 'more_horiz' }, // (menus)
  search: { ios: 'magnifyingglass', android: 'search' }, // Search
  noResults: { ios: 'text.magnifyingglass', android: 'search_off' }, // SearchX
  external: { ios: 'arrow.up.right.square', android: 'open_in_new' }, // ExternalLink
  // Actions
  check: { ios: 'checkmark', android: 'check' }, // Check
  edit: { ios: 'pencil', android: 'edit' }, // Pencil
  delete: { ios: 'trash', android: 'delete' }, // Trash2
  archive: { ios: 'archivebox', android: 'archive' }, // Archive
  restore: { ios: 'tray.and.arrow.up', android: 'unarchive' }, // ArchiveRestore
  refresh: { ios: 'arrow.clockwise', android: 'refresh' }, // RefreshCw
  undo: { ios: 'arrow.counterclockwise', android: 'undo' }, // RotateCcw
  attach: { ios: 'paperclip', android: 'attach_file' }, // Paperclip
  camera: { ios: 'camera', android: 'photo_camera' }, // Camera
  signOut: { ios: 'rectangle.portrait.and.arrow.right', android: 'logout' }, // LogOut
  // Domain
  service: { ios: 'wrench.adjustable', android: 'build' }, // Wrench
  mileage: { ios: 'gauge.with.dots.needle.67percent', android: 'speed' }, // Gauge
  addReminder: { ios: 'bell.badge', android: 'add_alert' }, // BellPlus
  remindersOn: { ios: 'bell.and.waves.left.and.right', android: 'notifications_active' }, // BellRing
  remindersOff: { ios: 'bell.slash', android: 'notifications_off' }, // BellOff
  addAppointment: { ios: 'calendar.badge.plus', android: 'calendar_add_on' }, // CalendarPlus
  appointment: { ios: 'calendar.badge.clock', android: 'event_upcoming' }, // CalendarClock
  calendar: { ios: 'calendar', android: 'calendar_today' }, // Calendar
  history: { ios: 'clock.arrow.circlepath', android: 'history' }, // History
  route: { ios: 'point.topleft.down.to.point.bottomright.curvepath', android: 'route' }, // Route
  location: { ios: 'mappin.and.ellipse', android: 'location_on' }, // MapPin
  dealer: { ios: 'building.2', android: 'apartment' }, // Building2
  shop: { ios: 'storefront', android: 'storefront' }, // Store
  receipt: { ios: 'receipt', android: 'receipt_long' }, // ReceiptText
  chat: { ios: 'message', android: 'chat_bubble' }, // MessageCircle
  sparkles: { ios: 'sparkles', android: 'auto_awesome' }, // Sparkles
  celebrate: { ios: 'party.popper', android: 'celebration' }, // PartyPopper
  knowledge: { ios: 'graduationcap', android: 'school' }, // GraduationCap
  // Perfil
  person: { ios: 'person', android: 'person' }, // UserRound
  theme: { ios: 'paintpalette', android: 'palette' }, // Palette
  privacy: { ios: 'checkmark.shield', android: 'verified_user' }, // ShieldCheck
  document: { ios: 'doc.text', android: 'description' }, // FileText
  guide: { ios: 'book', android: 'menu_book' }, // BookOpen
  plan: { ios: 'crown', android: 'workspace_premium' }, // Crown
  // Status and feedback
  info: { ios: 'info.circle', android: 'info' }, // Info
  help: { ios: 'questionmark.circle', android: 'help' }, // CircleHelp
  alert: { ios: 'exclamationmark.circle', android: 'error' }, // CircleAlert
  warning: { ios: 'exclamationmark.triangle', android: 'warning' }, // TriangleAlert
  success: { ios: 'checkmark.circle', android: 'check_circle' }, // CircleCheck
  clock: { ios: 'clock', android: 'schedule' }, // Clock
  // Filled, for toasts: Android draws these with SVG.
  successFill: {
    ios: 'checkmark.circle.fill',
    androidPath: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z',
  },
  alertFill: {
    ios: 'exclamationmark.circle.fill',
    androidPath: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z',
  },
  // Maintenance tasks (apps/app/src/lib/tasks.ts)
  engineOil: { ios: 'drop', android: 'water_drop' }, // Droplet
  fluid: { ios: 'drop.halffull', android: 'opacity' }, // Droplets: brake and power-steering fluid
  oilFilter: { ios: 'line.3.horizontal.decrease', android: 'filter_alt' }, // Filter
  airFilter: { ios: 'wind', android: 'air' }, // Wind
  cabinFilter: { ios: 'air.conditioner.horizontal', android: 'mode_fan' }, // AirVent
  fuelFilter: { ios: 'fuelpump', android: 'local_gas_station' }, // Fuel
  sparkPlugs: { ios: 'bolt', android: 'bolt' }, // Zap
  brakeInspection: { ios: 'doc.text.magnifyingglass', android: 'manage_search' }, // ScanSearch
  brakePads: { ios: 'opticaldisc', android: 'album' }, // Disc3
  coolant: { ios: 'thermometer.medium', android: 'device_thermostat' }, // Thermometer
  transmission: { ios: 'gearshape', android: 'settings' }, // Cog
  timingBelt: { ios: 'timer', android: 'timer' }, // Timer
  driveBelt: { ios: 'cable.connector', android: 'cable' }, // Cable
  tireRotation: { ios: 'arrow.trianglehead.clockwise', android: 'rotate_right' }, // RotateCw
  alignment: { ios: 'scope', android: 'my_location' }, // Crosshair
  tires: { ios: 'circle.circle', android: 'trip_origin' }, // CircleDot
  battery: { ios: 'battery.50percent', android: 'battery_5_bar' }, // BatteryMedium
  wipers: { ios: 'cloud.rain', android: 'rainy' }, // CloudRain
  airConditioning: { ios: 'snowflake', android: 'ac_unit' }, // Snowflake
  suspension: { ios: 'arrow.up.arrow.down', android: 'swap_vert' }, // ArrowDownUp
  inspection: { ios: 'checklist', android: 'fact_check' }, // ClipboardCheck
} as const satisfies Record<string, { ios: SFSymbol } & ({ android: AndroidSymbol } | { androidPath: string })>;

export type IconName = keyof typeof icons;

/** Icon colours. Status tones use the base colour: icons are non-text, so 3:1 is enough. */
export type IconTone =
  | 'ink'
  | 'muted'
  | 'subtle'
  | 'radiant'
  | 'ok'
  | 'soon'
  | 'overdue'
  | 'unknown'
  | 'onInverse'
  | 'onRadiant';

export interface IconProps {
  name: IconName;
  size?: keyof typeof size.icon;
  tone?: IconTone;
  /** Overrides `tone`, for an icon that must match the text beside it exactly. */
  color?: ColorValue;
  /** Only for an icon that means something on its own; most sit beside a label and stay silent. */
  label?: string;
  testID?: string;
}

/**
 * One icon from the map, at a size from the theme. Silent for VoiceOver and
 * TalkBack unless it has a `label`: the control around it carries the name.
 */
export function Icon({ name, size: side = 'md', tone = 'ink', color, label, testID }: IconProps) {
  const { theme } = useUnistyles();
  const points = theme.size.icon[side];
  const tint = color ?? theme.colors[tone];
  const entry: { ios: SFSymbol; android?: AndroidSymbol; androidPath?: string } = icons[name];
  const a11y = label
    ? { accessible: true, accessibilityRole: 'image' as const, accessibilityLabel: label }
    : { accessible: false, importantForAccessibility: 'no-hide-descendants' as const, accessibilityElementsHidden: true };

  if (process.env.EXPO_OS === 'android' && entry.androidPath) {
    return (
      <Svg width={points} height={points} viewBox="0 0 24 24" testID={testID} {...a11y}>
        <Path fill={tint} d={entry.androidPath} />
      </Svg>
    );
  }
  return (
    <SymbolView
      name={{ ios: entry.ios, android: entry.android }}
      size={points}
      tintColor={tint}
      weight="medium"
      resizeMode="scaleAspectFit"
      testID={testID}
      {...a11y}
    />
  );
}
