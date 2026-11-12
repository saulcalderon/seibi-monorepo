import { currentOdometer } from '@seibi/maintenance-engine/odometer';
import { StyleSheet, Text, useColorScheme, View } from 'react-native';

// Placeholder start screen (SEI-41): proves the app boots, the fonts load and
// Metro resolves the shared @seibi/maintenance-engine package. Raw values
// stand in until the Unistyles theme (SEI-42); the app shell (SEI-55)
// replaces this screen.
const sampleReading = currentOdometer([
  { reading: 12000, recordedOn: '2026-11-01' },
  { reading: 12500, recordedOn: '2026-11-10' },
]);

export default function StartScreen() {
  const night = useColorScheme() === 'dark';

  return (
    <View testID="start-screen" style={[styles.screen, night ? styles.screenNight : styles.screenLight]}>
      <Text testID="start-title" accessibilityRole="header" style={[styles.title, night ? styles.inkNight : styles.inkLight]}>
        Seibi
      </Text>
      <Text testID="engine-check" style={[styles.engine, night ? styles.mutedNight : styles.mutedLight]}>
        {`maintenance-engine: ${sampleReading?.reading ?? 'sin lectura'} km`}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, padding: 24 },
  screenLight: { backgroundColor: '#f2f4f7' },
  screenNight: { backgroundColor: '#0e0f11' },
  title: { fontFamily: 'Archivo_700Bold', fontSize: 34, letterSpacing: -0.34 },
  inkLight: { color: '#141517' },
  inkNight: { color: '#f2f4f7' },
  engine: { fontFamily: 'GeistMono_400Regular', fontSize: 13 },
  mutedLight: { color: '#5b606a' },
  mutedNight: { color: '#a3a8b1' },
});
