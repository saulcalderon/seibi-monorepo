// The app entry. Unistyles must be configured before any StyleSheet.create
// runs, and Expo Router loads route files on its own schedule, so the theme
// is configured here, right after Expo Router's entry
// (https://www.unistyl.es/v3/guides/expo-router).
import 'expo-router/entry';
import './src/theme/unistyles';
