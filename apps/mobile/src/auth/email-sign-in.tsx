import { type ComponentRef, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { type TextInput, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { supabase } from '@/lib/supabase';
import { Button } from '@/ui/button';
import { TextField } from '@/ui/fields';
import { Text } from '@/ui/text';

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
  const passwordInput = useRef<ComponentRef<typeof TextInput>>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (busy || !email || !password) return;
    setBusy(true);
    setError(null);
    const result = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    // A test tool: the server's own words are the most useful here.
    if (result.error) setError(result.error.message);
  }

  return (
    <View testID="test-sign-in" style={styles.form}>
      <Text step="footnote" weight={600} tone="muted" align="center">
        {t('testSignIn.title')}
      </Text>
      <TextField
        testID="test-sign-in-email"
        label={t('testSignIn.email')}
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="off"
        keyboardType="email-address"
        textContentType="none"
        // Return moves on to the password, keeping the keyboard up.
        returnKeyType="next"
        submitBehavior="submit"
        onSubmitEditing={() => passwordInput.current?.focus()}
      />
      <TextField
        testID="test-sign-in-password"
        ref={passwordInput}
        label={t('testSignIn.password')}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoCapitalize="none"
        autoComplete="off"
        textContentType="none"
        returnKeyType="go"
        onSubmitEditing={() => void submit()}
      />
      <Button
        testID="test-sign-in-submit"
        variant="secondary"
        block
        label={t('testSignIn.submit')}
        loading={busy}
        disabled={!email || !password}
        onPress={() => void submit()}
      />
      {error ? (
        <Text
          testID="test-sign-in-error"
          step="footnote"
          weight={500}
          tone="overdue"
          align="center"
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
        >
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  form: {
    alignSelf: 'stretch',
    gap: theme.space[3],
    paddingTop: theme.space[4],
    borderTopWidth: theme.size.border.thin,
    borderTopColor: theme.colors.line,
  },
}));
