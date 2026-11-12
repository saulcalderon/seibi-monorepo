import { Button, Host } from '@expo/ui';
import { useState } from 'react';
import { StyleSheet, Text, TextInput, useColorScheme, View } from 'react-native';

import { supabase } from '@/lib/supabase';

/**
 * Email + password sign-in for the seibi-dev test account (the `verify`
 * skill and Maestro use it). Only development and preview builds have it:
 * the sign-in screen requires this module behind EXPO_PUBLIC_TEST_SIGN_IN,
 * so a production bundle does not contain it at all. Its copy stays here,
 * not in es.json, for the same reason: es.json ships in every bundle.
 */
export function EmailSignIn() {
  const night = useColorScheme() === 'dark';
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

  const input = [styles.input, night ? styles.inputNight : styles.inputLight];
  return (
    <View testID="test-sign-in" style={styles.form}>
      <Text style={[styles.label, night ? styles.mutedNight : styles.mutedLight]}>Entrar con la cuenta de prueba</Text>
      <TextInput
        testID="test-sign-in-email"
        style={input}
        value={email}
        onChangeText={setEmail}
        placeholder="Correo"
        placeholderTextColor="#8b9099"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="off"
        keyboardType="email-address"
        textContentType="none"
      />
      <TextInput
        testID="test-sign-in-password"
        style={input}
        value={password}
        onChangeText={setPassword}
        placeholder="Contraseña"
        placeholderTextColor="#8b9099"
        secureTextEntry
        autoCapitalize="none"
        autoComplete="off"
        textContentType="none"
        onSubmitEditing={() => void submit()}
      />
      <Host matchContents>
        <Button
          testID="test-sign-in-submit"
          label={busy ? 'Entrando…' : 'Entrar con correo'}
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

const styles = StyleSheet.create({
  form: { alignSelf: 'stretch', gap: 10 },
  label: { fontFamily: 'Archivo_500Medium', fontSize: 13 },
  input: {
    fontFamily: 'Archivo_400Regular',
    fontSize: 16,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  inputLight: { backgroundColor: '#ffffff', borderColor: '#c9cdd4', color: '#141517' },
  inputNight: { backgroundColor: '#1a1c1f', borderColor: '#3a3d43', color: '#f2f4f7' },
  mutedLight: { color: '#5b606a' },
  mutedNight: { color: '#a3a8b1' },
  error: { fontFamily: 'Archivo_400Regular', fontSize: 13, color: '#c2410c' },
});
