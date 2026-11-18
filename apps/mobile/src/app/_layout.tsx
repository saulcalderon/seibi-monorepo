import { Archivo_300Light } from '@expo-google-fonts/archivo/300Light';
import { Archivo_400Regular } from '@expo-google-fonts/archivo/400Regular';
import { Archivo_500Medium } from '@expo-google-fonts/archivo/500Medium';
import { Archivo_600SemiBold } from '@expo-google-fonts/archivo/600SemiBold';
import { Archivo_700Bold } from '@expo-google-fonts/archivo/700Bold';
import { GeistMono_400Regular } from '@expo-google-fonts/geist-mono/400Regular';
import { QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';

import { useAuth, type AuthState } from '@/auth/session';
import { markIntroDone, useIntroDone } from '@/data/preferences/store';
import { useProfile } from '@/data/profile/queries';
import { queryClient } from '@/data/query-client';
import { useOTAUpdate } from '@/hooks/use-ota-update';
// Initialises i18next synchronously, before the first render.
import '@/i18n';
import { introDoneBySession, introOpen } from '@/intro/flow';
import { firstRunStatus } from '@/onboarding/flow';
import { UIProvider } from '@/ui/provider';

// The native splash stays up until the fonts are ready, the saved session
// has been read and, when signed in, the profile says whether the first-run
// questions are done (as the PWA's Splash waits for `homePathFor`), so no
// screen renders in a fallback font and a signed-in person never sees the
// sign-in screen or Inicio flash before the questions.
void SplashScreen.preventAutoHideAsync();
SplashScreen.setOptions({ fade: true, duration: 250 });

export default function RootLayout() {
  useOTAUpdate();
  const auth = useAuth();

  // The fonts docs/DESIGN.md names. Headings use Archivo 600 until Clash
  // Display can ship without its file in this public repo (docs/PLAN.md).
  const [loaded, error] = useFonts({
    Archivo_300Light,
    Archivo_400Regular,
    Archivo_500Medium,
    Archivo_600SemiBold,
    Archivo_700Bold,
    GeistMono_400Regular,
  });
  // A font that fails to load must not keep the app on the splash forever.
  if (!(loaded || error !== null) || auth.status === 'loading') return null;

  // Screens read and write data only through the hooks in src/data/, which
  // share this one query cache.
  return (
    <QueryClientProvider client={queryClient}>
      <UIProvider>
        <StatusBar style="auto" />
        <RootStack auth={auth} />
      </UIProvider>
    </QueryClientProvider>
  );
}

function RootStack({ auth }: { auth: Exclude<AuthState, { status: 'loading' }> }) {
  const profile = useProfile();
  const firstRun = firstRunStatus({ signedIn: auth.status === 'signed-in', profile: profile.data, failed: profile.isError });
  const introDone = useIntroDone();
  const intro = introOpen({ auth: auth.status, introDone });
  // Launched once the first screen is known; it stays launched after (a sign-in later waits on the sign-in screen).
  const [launched, setLaunched] = useState(false);
  if (!launched && firstRun !== 'unknown') setLaunched(true);

  useEffect(() => {
    if (launched) void SplashScreen.hideAsync();
  }, [launched]);

  // A session marks the Intro done (the PWA's splash does the same), so a
  // sign-out later opens Login, not the Intro.
  useEffect(() => {
    if (introDoneBySession({ auth: auth.status, introDone })) markIntroDone();
  }, [auth.status, introDone]);

  // At launch, the splash covers the wait for the profile.
  if (!launched && firstRun === 'unknown') return null;

  const signedIn = auth.status === 'signed-in';
  // Exactly one group is open at a time; when the auth state or the profile
  // changes, the router leaves the closed screens on its own (no redirects
  // by hand). Right after signing in, while the profile loads, sign-in stays
  // up rather than open Inicio or the questions too early.
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={signedIn && firstRun === 'done'}>
        <Stack.Screen name="(app)" />
      </Stack.Protected>
      <Stack.Protected guard={signedIn && firstRun === 'due'}>
        {/* The first-run questions (S3): no going back to sign-in from them. */}
        <Stack.Screen name="onboarding" options={{ gestureEnabled: false }} />
      </Stack.Protected>
      {/* The Intro (S2): signed out on a first launch, before Login. «Saltar» and
          «Empezar» mark it done, and the guards below open Login. */}
      <Stack.Protected guard={intro}>
        <Stack.Screen name="(auth)/intro" />
      </Stack.Protected>
      <Stack.Protected guard={(auth.status === 'signed-out' && !intro) || (signedIn && firstRun === 'unknown')}>
        <Stack.Screen name="(auth)/sign-in" />
      </Stack.Protected>
      <Stack.Protected guard={auth.status === 'account-deleted'}>
        <Stack.Screen name="(auth)/account-deleted" />
      </Stack.Protected>
      {/* The UI kit's samples (development builds only) open whatever the session,
          except during the first-run questions: a closed screen falls back to the
          first open one in route order, and ui-kit sorts before onboarding. */}
      <Stack.Protected guard={firstRun !== 'due'}>
        <Stack.Screen name="ui-kit" />
      </Stack.Protected>
    </Stack>
  );
}
