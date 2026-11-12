import { Button, Host } from '@expo/ui';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Text, TextInput, View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { supabase } from '@/lib/supabase';

/**
 * Email + password sign-in for the seibi-dev test account (the `verify`
 * skill and Maestro use it). Only development and preview builds have it:
 * the sign-in screen requires this module behind EXPO_PUBLIC_TEST_SIGN_IN,
 * so a production bundle does not contain it at all. Its copy is in
 * es.json (`testSignIn`) like every other string, so production carries
 * those few words but never the form.
 */
export function EmailSignIn() {
  const { t } = useTranslation();
  const { theme } = useUnistyles();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setBusy(true);
    setError(null);
    const result = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (result.error) setError(result.error.message);
  }

  return (
    <View testID="test-sign-in" style={styles.form}>
      <Text style={styles.label}>{t('testSignIn.title')}</Text>
      <TextInput
        testID="test-sign-in-email"
        style={styles.input}
        value={email}
        onChangeText={setEmail}
        placeholder={t('testSignIn.email')}
        placeholderTextColor={theme.colors.subtle}
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="off"
        keyboardType="email-address"
        textContentType="none"
      />
      <TextInput
        testID="test-sign-in-password"
        style={styles.input}
        value={password}
        onChangeText={setPassword}
        placeholder={t('testSignIn.password')}
        placeholderTextColor={theme.colors.subtle}
        secureTextEntry
        autoCapitalize="none"
        autoComplete="off"
        textContentType="none"
        onSubmitEditing={() => void submit()}
      />
      <Host matchContents>
        <Button
          testID="test-sign-in-submit"
          label={busy ? t('testSignIn.submitting') : t('testSignIn.submit')}
          variant="outlined"
          disabled={busy || !email || !password}
          onPress={() => void submit()}
        />
      </Host>
      {error ? (
        <Text testID="test-sign-in-error" accessibilityRole="alert" style={styles.error}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  form: {
    alignSelf: 'stretch',
    gap: theme.space[2.5],
  },
  label: {
    ...theme.type.footnote,
    fontFamily: theme.fonts.sans[500],
    color: theme.colors.muted,
  },
  input: {
    ...theme.type.callout,
    fontFamily: theme.fonts.sans[400],
    color: theme.colors.ink,
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.line,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: theme.radius.lg,
    borderCurve: 'continuous',
    paddingHorizontal: theme.space[3.5],
    paddingVertical: theme.space[3],
  },
  error: {
    ...theme.type.footnote,
    fontFamily: theme.fonts.sans[400],
    color: theme.colors.overdueText,
  },
}));
