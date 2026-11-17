import { Stack, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useUnistyles } from 'react-native-unistyles';

import { IconButton } from '@/ui/button';

/**
 * The Vehicle form, presented as a modal over the tabs (`(app)/_layout.tsx`),
 * with a stack of its own so its pickers push inside it: `new` (Agregar
 * Vehículo), `[id]/edit` (Editar Vehículo) and `pick` (make, year, model).
 * Anything can open it with a Vehicle id alone: `/vehicle/new`,
 * `/vehicle/<id>/edit`.
 */
export default function VehicleFormLayout() {
  const { t } = useTranslation();
  const { theme } = useUnistyles();
  const router = useRouter();
  const ios = process.env.EXPO_OS === 'ios';
  const close = () => <IconButton testID="vehicle-form-close" icon="close" label={t('vehicleForm.close')} onPress={() => router.back()} />;
  return (
    <Stack
      screenOptions={{
        // As the tab stacks: glass over the content on iOS 26, a plain bar on Android.
        headerTransparent: ios,
        headerShadowVisible: false,
        headerStyle: ios ? undefined : { backgroundColor: theme.colors.bg },
        headerTintColor: theme.colors.ink,
        headerTitleStyle: { fontFamily: theme.fonts.display, color: theme.colors.ink },
        headerBackButtonDisplayMode: 'minimal',
        headerBackButtonMenuEnabled: false,
        contentStyle: { backgroundColor: theme.colors.bg },
      }}
    >
      <Stack.Screen name="new" options={{ title: t('vehicleForm.addTitle'), headerLeft: close }} />
      <Stack.Screen name="[id]/edit" options={{ title: t('vehicleForm.editTitle'), headerLeft: close }} />
      <Stack.Screen name="pick" />
    </Stack>
  );
}
