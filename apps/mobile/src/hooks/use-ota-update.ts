import * as Updates from 'expo-updates';
import { useEffect, useRef } from 'react';
import { Alert, AppState } from 'react-native';

// Development builds load JavaScript from Metro, and builds without an EAS
// project have updates turned off (app.config.ts).
const enabled = !__DEV__ && Updates.isEnabled;

/**
 * Looks for an EAS Update on launch and whenever the app returns to the
 * foreground, downloads it, then offers a restart. A declined restart is
 * applied on the next cold launch anyway.
 */
export function useOTAUpdate() {
  const { isUpdatePending, downloadedUpdate } = Updates.useUpdates();
  const checking = useRef(false);
  const promptedFor = useRef<string | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const check = async () => {
      if (checking.current) return;
      checking.current = true;
      try {
        const result = await Updates.checkForUpdateAsync();
        if (result.isAvailable) await Updates.fetchUpdateAsync();
      } catch {
        // Offline or the update server failed: the next foreground tries again.
      } finally {
        checking.current = false;
      }
    };

    void check();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void check();
    });
    return () => subscription.remove();
  }, []);

  const pendingId = isUpdatePending ? (downloadedUpdate?.updateId ?? 'pending') : null;

  useEffect(() => {
    if (!enabled || pendingId === null || promptedFor.current === pendingId) return;
    promptedFor.current = pendingId;
    // Copy moves to i18n in SEI-43.
    Alert.alert('Hay una versión nueva de Seibi', 'Reinicia la app para usarla.', [
      { text: 'Ahora no', style: 'cancel' },
      { text: 'Reiniciar', onPress: () => void Updates.reloadAsync() },
    ]);
  }, [pendingId]);
}
