import type { ReactNode } from 'react';
import { Pressable, View, type ViewProps } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { Icon, type IconName } from './icon';
import { usePressed } from './press';
import { Text } from './text';

/** A surface for a group of rows or a block of content: the PWA's Card. */
export function Card({ children, style, ...rest }: ViewProps & { children: ReactNode }) {
  return (
    <View {...rest} style={[styles.card, style]}>
      {children}
    </View>
  );
}

/** A section's title, with an optional link-style action on the right («Ver todo»). */
export function SectionHeader({
  title,
  action,
  onAction,
  testID,
}: {
  title: string;
  action?: string;
  onAction?: () => void;
  testID?: string;
}) {
  return (
    <View style={styles.sectionHeader} testID={testID}>
      <Text step="callout" family="display" heading style={styles.sectionTitle}>
        {title}
      </Text>
      {action && onAction ? (
        <Pressable accessibilityRole="button" accessibilityLabel={action} onPress={onAction} style={styles.sectionAction}>
          <Text step="subhead" weight={600} tone="radiant">
            {action}
          </Text>
          <Icon name="forward" size="sm" tone="radiant" />
        </Pressable>
      ) : null}
    </View>
  );
}

export interface ListRowProps {
  title: string;
  subtitle?: string;
  leading?: ReactNode;
  trailing?: ReactNode;
  onPress?: () => void;
  /** Shown by default when the row is tappable. */
  chevron?: boolean;
  /** Spoken in full; defaults to the title and subtitle. Start it with the visible words. */
  accessibilityLabel?: string;
  testID?: string;
}

/**
 * A row inside a Card list. Tappable rows highlight their background while
 * pressed (a whole row never scales). At large text sizes the trailing
 * content moves below the title instead of squeezing it.
 */
export function ListRow({ title, subtitle, leading, trailing, onPress, chevron = Boolean(onPress), accessibilityLabel, testID }: ListRowProps) {
  const { pressed, pressHandlers } = usePressed();
  styles.useVariants({ pressed, tappable: Boolean(onPress) });
  const content = (
    <>
      {leading ? <View style={styles.leading}>{leading}</View> : null}
      <View style={styles.body}>
        <View style={styles.text}>
          <Text step="body" weight={600}>
            {title}
          </Text>
          {subtitle ? (
            <Text step="footnote" tone="muted">
              {subtitle}
            </Text>
          ) : null}
        </View>
        {trailing ? <View style={styles.trailing}>{trailing}</View> : null}
      </View>
      {chevron ? <Icon name="forward" size="sm" tone="subtle" /> : null}
    </>
  );
  const label = accessibilityLabel ?? [title, subtitle].filter(Boolean).join(', ');
  return onPress ? (
    <Pressable testID={testID} accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={styles.row} {...pressHandlers}>
      {content}
    </Pressable>
  ) : (
    <View testID={testID} accessible accessibilityLabel={label} style={styles.row}>
      {content}
    </View>
  );
}

/** A thin line between rows, inset to the text. */
export function RowDivider() {
  return <View style={styles.divider} />;
}

export type TileTone = 'neutral' | 'radiant' | 'ok' | 'soon' | 'overdue' | 'unknown';

const TILE_ICON = { neutral: 'ink', radiant: 'radiant', ok: 'ok', soon: 'soon', overdue: 'overdue', unknown: 'unknown' } as const;

/** An icon on a tinted square, leading a row or a card. */
export function IconTile({ icon, tone = 'neutral', size = 'md' }: { icon: IconName; tone?: TileTone; size?: 'sm' | 'md' }) {
  styles.useVariants({ tileTone: tone, tileSize: size });
  return (
    <View style={styles.tile}>
      <Icon name={icon} size={size === 'md' ? 'md' : 'sm'} tone={TILE_ICON[tone]} fixed />
    </View>
  );
}

const styles = StyleSheet.create((theme, rt) => ({
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius['3xl'],
    borderCurve: 'continuous',
    boxShadow: theme.shadow.card,
  },
  sectionHeader: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    columnGap: theme.space[3],
    paddingHorizontal: theme.space[1],
  },
  sectionTitle: {
    flexShrink: 1,
  },
  sectionAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space[0.5],
    minHeight: theme.size.target,
    paddingHorizontal: theme.space[1],
    marginRight: -theme.space[1],
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space[3],
    paddingHorizontal: theme.space[4],
    paddingVertical: theme.space[3.5],
    variants: {
      tappable: { true: { minHeight: theme.size.row }, false: {} },
      pressed: { true: { backgroundColor: theme.colors.surface2 }, false: {} },
    },
  },
  leading: {
    flexShrink: 0,
  },
  body: {
    flex: 1,
    gap: theme.space[1],
    // Large text: trailing content goes under the title, so nothing truncates.
    flexDirection: rt.fontScale >= theme.largeTextScale ? 'column' : 'row',
    alignItems: rt.fontScale >= theme.largeTextScale ? 'flex-start' : 'center',
  },
  text: {
    flexShrink: 1,
    flexGrow: 1,
    gap: theme.space[0.5],
  },
  trailing: {
    flexShrink: 0,
    alignItems: rt.fontScale >= theme.largeTextScale ? 'flex-start' : 'flex-end',
  },
  divider: {
    height: theme.size.border.thin,
    marginLeft: theme.space[4],
    backgroundColor: theme.colors.line,
  },
  tile: {
    alignItems: 'center',
    justifyContent: 'center',
    borderCurve: 'continuous',
    variants: {
      tileSize: {
        sm: { width: theme.size.tile.sm, height: theme.size.tile.sm, borderRadius: theme.radius.lg },
        md: { width: theme.size.tile.md, height: theme.size.tile.md, borderRadius: theme.radius.xl },
      },
      tileTone: {
        neutral: { backgroundColor: theme.colors.surface3 },
        radiant: { backgroundColor: theme.colors.radiantSoft },
        ok: { backgroundColor: theme.colors.okSoft },
        soon: { backgroundColor: theme.colors.soonSoft },
        overdue: { backgroundColor: theme.colors.overdueSoft },
        unknown: { backgroundColor: theme.colors.unknownSoft },
      },
    },
  },
}));
