import { FlashList } from '@shopify/flash-list';
import type { ReactElement } from 'react';
import { Pressable, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { Field, type FieldShellProps } from './fields';
import { KEYBOARD_DISMISS } from './form';
import { Icon } from './icon';
import { usePressed } from './press';
import { Text } from './text';

/*
 * Choosing one value from a long list (makes, models, years): a field that
 * opens a search screen, and the list that screen shows. They replace the
 * PWA's Combobox: on a phone the list gets a screen of its own with the
 * system's search bar (Stack.SearchBar), and free text is still allowed
 * where the PWA allowed it.
 */

export interface PickerFieldProps extends FieldShellProps {
  /** The chosen value; empty shows the placeholder. */
  value: string;
  placeholder: string;
  onPress: () => void;
  /** Spoken after the label and value: what a tap does. */
  accessibilityHint?: string;
}

/** A field box with the chosen value and a chevron; a tap opens the picker screen. */
export function PickerField({ label, hint, error, optional, value, placeholder, onPress, accessibilityHint, testID }: PickerFieldProps) {
  const { pressed, pressHandlers } = usePressed();
  styles.useVariants({ pressed, invalid: Boolean(error) });
  const shown = value.trim();
  return (
    <Field label={label} hint={hint} error={error} optional={optional}>
      <Pressable
        testID={testID}
        accessibilityRole="button"
        accessibilityLabel={[label, shown || placeholder, error].filter(Boolean).join(', ')}
        accessibilityHint={accessibilityHint}
        onPress={onPress}
        style={styles.box}
        {...pressHandlers}
      >
        <Text step="callout" tone={shown ? 'ink' : 'subtle'} style={styles.value}>
          {shown || placeholder}
        </Text>
        <Icon name="forward" size="sm" tone="subtle" />
      </Pressable>
    </Field>
  );
}

export type PickerItem =
  | { type: 'header'; key: string; title: string }
  | { type: 'note'; key: string; text: string }
  | {
      type: 'option';
      key: string;
      label: string;
      /** Spoken in full; defaults to the label. */
      spoken?: string;
      selected?: boolean;
      /** The «Usar “…”» row that takes what was typed. */
      custom?: boolean;
      /** Where the row sits in its group, for the grouped corners. */
      position: 'first' | 'middle' | 'last' | 'only';
      onPress: () => void;
      testID?: string;
    };

/** Gives each option its place in its run of options, so the group draws as one rounded card. */
export function groupOptions(items: (Exclude<PickerItem, { type: 'option' }> | Omit<Extract<PickerItem, { type: 'option' }>, 'position'>)[]): PickerItem[] {
  return items.map((item, i) => {
    if (item.type !== 'option') return item;
    const before = items[i - 1]?.type === 'option';
    const after = items[i + 1]?.type === 'option';
    const position = before && after ? 'middle' : before ? 'last' : after ? 'first' : 'only';
    return { ...item, position };
  });
}

/**
 * A picker screen's list, virtualised (FlashList): section headers, notes,
 * and options in iOS's inset-grouped style, the chosen one with a check. It
 * is the screen's first view, so the header's search bar and large title
 * work with it, and dragging it puts the keyboard away.
 */
export function PickerList({ items, header, testID }: { items: PickerItem[]; header?: ReactElement; testID?: string }) {
  return (
    <FlashList
      testID={testID}
      data={items}
      keyExtractor={(item) => item.key}
      getItemType={(item) => item.type}
      renderItem={({ item }) => <PickerRow item={item} />}
      ListHeaderComponent={header}
      contentInsetAdjustmentBehavior="automatic"
      keyboardDismissMode={KEYBOARD_DISMISS}
      keyboardShouldPersistTaps="handled"
      style={styles.list}
      contentContainerStyle={styles.listContent}
    />
  );
}

function PickerRow({ item }: { item: PickerItem }) {
  if (item.type === 'header') {
    return (
      <Text step="footnote" weight={600} tone="muted" heading style={styles.header}>
        {item.title}
      </Text>
    );
  }
  if (item.type === 'note') {
    return (
      <Text step="footnote" tone="muted" style={styles.note}>
        {item.text}
      </Text>
    );
  }
  return <OptionRow item={item} />;
}

function OptionRow({ item }: { item: Extract<PickerItem, { type: 'option' }> }) {
  const { pressed, pressHandlers } = usePressed();
  styles.useVariants({ position: item.position, pressed });
  return (
    <Pressable
      testID={item.testID}
      accessibilityRole="button"
      accessibilityLabel={item.spoken ?? item.label}
      accessibilityState={{ selected: Boolean(item.selected) }}
      onPress={item.onPress}
      style={styles.option}
      {...pressHandlers}
    >
      {item.custom ? <Icon name="edit" size="sm" tone="radiant" /> : null}
      <Text step="body" weight={item.selected || item.custom ? 600 : 400} tone={item.custom ? 'radiant' : 'ink'} style={styles.value}>
        {item.label}
      </Text>
      {item.selected ? <Icon name="check" size="sm" tone="radiant" /> : null}
      {item.position === 'first' || item.position === 'middle' ? <View style={styles.divider} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create((theme) => ({
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space[2],
    minHeight: theme.size.field,
    paddingHorizontal: theme.space[4],
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.xl,
    borderCurve: 'continuous',
    borderWidth: theme.size.border.thin,
    borderColor: theme.colors.line,
    variants: {
      pressed: { true: { backgroundColor: theme.colors.surface2 }, false: {} },
      invalid: { true: { borderColor: theme.colors.overdue }, false: {} },
    },
  },
  value: {
    flex: 1,
    paddingVertical: theme.space[3],
  },
  list: {
    flex: 1,
    backgroundColor: theme.colors.bg,
  },
  listContent: {
    paddingHorizontal: theme.space[4],
    paddingTop: theme.space[2],
    paddingBottom: theme.space[8],
  },
  header: {
    paddingHorizontal: theme.space[4],
    paddingTop: theme.space[5],
    paddingBottom: theme.space[2],
  },
  note: {
    paddingHorizontal: theme.space[4],
    paddingVertical: theme.space[3],
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space[3],
    minHeight: theme.size.row,
    paddingHorizontal: theme.space[4],
    // Every option has a fill from mount, so its rounded corners survive Android's flattening
    // (docs/DESIGN.md → Corners on Android).
    backgroundColor: theme.colors.surface,
    borderCurve: 'continuous',
    variants: {
      pressed: { true: { backgroundColor: theme.colors.surface2 }, false: {} },
      position: {
        first: { borderTopLeftRadius: theme.radius.xl, borderTopRightRadius: theme.radius.xl },
        middle: {},
        last: { borderBottomLeftRadius: theme.radius.xl, borderBottomRightRadius: theme.radius.xl },
        only: { borderRadius: theme.radius.xl },
      },
    },
  },
  divider: {
    position: 'absolute',
    left: theme.space[4],
    right: 0,
    bottom: 0,
    height: theme.size.border.thin,
    backgroundColor: theme.colors.line,
  },
}));
