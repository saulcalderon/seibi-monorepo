import { useRouter } from 'expo-router';
import { useEffect, useRef, useState, type ComponentRef, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, TextInput, View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { errorMessage } from '@/data/errors';
import { COUNTRIES, countryName, type Country } from '@/data/profile/countries';
import { useProfile, useUpdateProfile, type Profile } from '@/data/profile/queries';
import { KNOWLEDGE_LEVELS, levelDescription, levelTitle, type KnowledgeLevel } from '@/lib/knowledge';
import { Button, IconButton } from '@/ui/button';
import { SelectField } from '@/ui/controls';
import { ErrorState, Skeleton, SkeletonGroup, TextSkeleton } from '@/ui/feedback';
import { TextField } from '@/ui/fields';
import { FormLayout } from '@/ui/form';
import { Icon } from '@/ui/icon';
import { usePressed } from '@/ui/press';
import { Text } from '@/ui/text';
import { useUnsavedGuard } from '@/ui/use-unsaved-guard';

import { CITY_MAX, locationDraft, NAME_MAX, nameDraft, unsaved } from './profile-logic';

/*
 * Perfil's three sheets (S11), the PWA's NameSheet, LevelSheet and
 * LocationSheet, each the content of its own `formSheet` route
 * (`profile-name`, `profile-level`, `profile-location`). They save through
 * `useUpdateProfile`, which shows the change at once and puts it back if the
 * save fails, and close once it lands, as the PWA's do.
 */

/** «¿Cómo te llamamos?»: `profiles.display_name`. An empty name saves as none («Sin nombre»). */
export function NameSheet() {
  return <WithProfile testID="profile-name-sheet">{(profile) => <NameForm profile={profile} />}</WithProfile>;
}

function NameForm({ profile }: { profile: Profile }) {
  const { t } = useTranslation();
  const update = useUpdateProfile();
  const [start] = useState(() => nameDraft(profile));
  const [name, setName] = useState(start);
  const [error, setError] = useState<string | null>(null);
  const input = useFocusAfterPresent();
  const { leave } = useUnsavedGuard(unsaved({ name: start }, { name }), useDiscardCopy());

  const save = () => {
    setError(null);
    update.mutateAsync({ displayName: name }).then(leave, (cause: unknown) => setError(errorMessage(cause, t)));
  };

  return (
    <FormLayout testID="profile-name-sheet" footer={<SaveButton testID="profile-name-save" loading={update.isPending} error={error} onPress={save} />}>
      <SheetHeader testID="profile-name-title" closeTestID="profile-name-close" title={t('profile.name.title')} />
      <TextField
        testID="profile-name-field"
        ref={input}
        label={t('profile.name.label')}
        value={name}
        onChangeText={(text) => {
          setName(text);
          setError(null);
        }}
        maxLength={NAME_MAX}
        autoCapitalize="words"
        autoComplete="given-name"
        textContentType="givenName"
        returnKeyType="done"
        submitBehavior="blurAndSubmit"
        onSubmitEditing={save}
      />
    </FormLayout>
  );
}

/**
 * «Nivel de conocimiento»: tapping a level saves it and closes the sheet. No
 * field and no save button, so it is a plain view rather than a `FormLayout`.
 */
export function LevelSheet() {
  return <WithProfile testID="profile-level-sheet">{(profile) => <LevelForm profile={profile} />}</WithProfile>;
}

function LevelForm({ profile }: { profile: Profile }) {
  const { t } = useTranslation();
  const router = useRouter();
  const update = useUpdateProfile();
  const [error, setError] = useState<string | null>(null);
  // The optimistic save already shows the new level; the sheet reads it from the cache.
  const current = useProfile().data?.knowledgeLevel ?? profile.knowledgeLevel;

  const choose = (level: KnowledgeLevel) => {
    if (update.isPending) return;
    setError(null);
    update.mutateAsync({ knowledgeLevel: level }).then(
      () => router.back(),
      (cause: unknown) => setError(errorMessage(cause, t)),
    );
  };

  return (
    <View testID="profile-level-sheet" style={styles.sheet}>
      <SheetHeader testID="profile-level-title" closeTestID="profile-level-close" title={t('profile.level.title')} body={t('profile.level.body')} />
      <View accessibilityRole="radiogroup" accessibilityLabel={t('profile.level.group')} style={styles.levels}>
        {KNOWLEDGE_LEVELS.map((level) => (
          <LevelOption
            key={level}
            testID={`profile-level-${level}`}
            title={levelTitle(level, t)}
            description={levelDescription(level, t)}
            selected={current === level}
            onPress={() => choose(level)}
          />
        ))}
      </View>
      {error ? <SheetError testID="profile-level-error" message={error} /> : null}
    </View>
  );
}

/** One level: its name and what it means; the chosen one is tinted, ringed and marked, as the PWA's. */
function LevelOption({ title, description, selected, onPress, testID }: { title: string; description: string; selected: boolean; onPress: () => void; testID: string }) {
  const { pressed, pressHandlers } = usePressed();
  styles.useVariants({ selected, pressed });
  return (
    <Pressable
      testID={testID}
      accessibilityRole="radio"
      accessibilityLabel={`${title}, ${description}`}
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      style={styles.level}
      {...pressHandlers}
    >
      <View style={styles.levelText}>
        <Text step="body" weight={700}>
          {title}
        </Text>
        <Text step="subhead" tone="muted">
          {description}
        </Text>
      </View>
      {selected ? <Icon name="forward" size="sm" tone="radiant" /> : null}
    </Pressable>
  );
}

/** «Ubicación»: `profiles.country` and `profiles.city`, for Estimates of the person's area. */
export function LocationSheet() {
  return <WithProfile testID="profile-location-sheet">{(profile) => <LocationForm profile={profile} />}</WithProfile>;
}

function LocationForm({ profile }: { profile: Profile }) {
  const { t } = useTranslation();
  const update = useUpdateProfile();
  const [start] = useState(() => locationDraft(profile));
  const [country, setCountry] = useState<Country>(start.country);
  const [city, setCity] = useState(start.city);
  const [error, setError] = useState<string | null>(null);
  const { leave } = useUnsavedGuard(unsaved(start, { country, city }), useDiscardCopy());

  const save = () => {
    setError(null);
    update.mutateAsync({ country, city }).then(leave, (cause: unknown) => setError(errorMessage(cause, t)));
  };

  return (
    <FormLayout testID="profile-location-sheet" footer={<SaveButton testID="profile-location-save" loading={update.isPending} error={error} onPress={save} />}>
      <SheetHeader testID="profile-location-title" closeTestID="profile-location-close" title={t('profile.location.title')} body={t('profile.location.body')} />
      <SelectField
        testID="profile-location-country"
        label={t('profile.location.country')}
        value={country}
        onChange={(next) => {
          setCountry(next);
          setError(null);
        }}
        options={COUNTRIES.map((c) => ({ value: c.id, label: t('profile.location.countryOption', { flag: c.flag, name: countryName(c.id, t) }) }))}
      />
      <TextField
        testID="profile-location-city"
        label={t('profile.location.city')}
        value={city}
        onChangeText={(text) => {
          setCity(text);
          setError(null);
        }}
        maxLength={CITY_MAX}
        autoCapitalize="words"
        textContentType="addressCity"
        returnKeyType="done"
        submitBehavior="blurAndSubmit"
        onSubmitEditing={save}
      />
    </FormLayout>
  );
}

/**
 * Draws a sheet once the profile is in hand. Perfil has usually loaded it
 * already; a sheet opened before that waits for it, and one that can't load
 * it says so with «Reintentar».
 */
function WithProfile({ children, testID }: { children: (profile: Profile) => ReactNode; testID: string }) {
  const { t } = useTranslation();
  const { theme } = useUnistyles();
  const router = useRouter();
  const profile = useProfile();
  if (profile.data) return children(profile.data);
  return (
    <View testID={profile.isError ? `${testID}-error` : `${testID}-loading`} style={styles.sheet}>
      {profile.isError ? (
        <ErrorState onRetry={() => void profile.refetch()} />
      ) : (
        <SkeletonGroup>
          <TextSkeleton step="title3" width="55%" />
          <Skeleton width="100%" height={theme.size.field} round="xl" />
        </SkeletonGroup>
      )}
      <Button variant="secondary" block label={t('profile.close')} onPress={() => router.back()} />
    </View>
  );
}

/** The sheet's title, an optional line under it, and «Cerrar». */
function SheetHeader({ title, body, testID, closeTestID }: { title: string; body?: string; testID: string; closeTestID: string }) {
  const { t } = useTranslation();
  const router = useRouter();
  return (
    <View style={styles.header}>
      <View style={styles.headerRow}>
        <Text testID={testID} step="title3" family="display" heading style={styles.title}>
          {title}
        </Text>
        <IconButton testID={closeTestID} icon="close" label={t('profile.close')} onPress={() => router.back()} />
      </View>
      {body ? (
        <Text step="subhead" tone="muted">
          {body}
        </Text>
      ) : null}
    </View>
  );
}

function SaveButton({ testID, loading, error, onPress }: { testID: string; loading: boolean; error: string | null; onPress: () => void }) {
  const { t } = useTranslation();
  return (
    <>
      {error ? <SheetError testID={`${testID}-error`} message={error} /> : null}
      <Button testID={testID} block size="lg" label={t('profile.save')} loading={loading} onPress={onPress} />
    </>
  );
}

function SheetError({ message, testID }: { message: string; testID: string }) {
  return (
    <View style={styles.error} accessibilityRole="alert" accessibilityLiveRegion="polite">
      <Text testID={testID} step="subhead" weight={500} tone="overdue">
        {message}
      </Text>
    </View>
  );
}

function useDiscardCopy() {
  const { t } = useTranslation();
  return {
    title: t('profile.discard.title'),
    message: t('profile.discard.body'),
    confirmLabel: t('profile.discard.confirm'),
    cancelLabel: t('profile.discard.cancel'),
  };
}

/** Focuses the field once the sheet has settled: `autoFocus` races the formSheet's presentation on iOS. */
function useFocusAfterPresent() {
  const input = useRef<ComponentRef<typeof TextInput>>(null);
  useEffect(() => {
    const focus = setTimeout(() => input.current?.focus(), 350);
    return () => clearTimeout(focus);
  }, []);
  return input;
}

const styles = StyleSheet.create((theme) => ({
  sheet: {
    gap: theme.space[4],
    padding: theme.space[5],
  },
  header: {
    gap: theme.space[1],
    paddingTop: theme.space[4],
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.space[3],
  },
  title: {
    flex: 1,
  },
  levels: {
    gap: theme.space[2],
  },
  level: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.space[3],
    padding: theme.space[4],
    borderRadius: theme.radius['2xl'],
    borderCurve: 'continuous',
    // The PWA's `ring-1`: an outline, so choosing never moves the layout.
    outlineStyle: 'solid',
    outlineWidth: theme.size.border.thin,
    variants: {
      selected: {
        true: { backgroundColor: theme.colors.radiantSoft, outlineColor: theme.colors.radiant },
        false: { backgroundColor: theme.colors.surface, outlineColor: theme.colors.line },
      },
      pressed: { true: {}, false: {} },
    },
    // Pressed, an option highlights its background, as a row does (it never scales).
    compoundVariants: [{ selected: false, pressed: true, styles: { backgroundColor: theme.colors.surface2 } }],
  },
  levelText: {
    flex: 1,
    gap: theme.space[0.5],
  },
  error: {
    marginBottom: theme.space[2],
  },
}));
