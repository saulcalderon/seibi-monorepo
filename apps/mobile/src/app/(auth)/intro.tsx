import { StatusBar } from 'expo-status-bar';
import { ScopedTheme } from 'react-native-unistyles';

import { markIntroDone } from '@/data/preferences/store';
import { IntroScreen } from '@/intro/intro-screen';

/**
 * The Intro (S2): what Seibi does, in three still slides, before Login on a
 * phone's first launch. A first-run screen, so it stays on the light Garage
 * palette in night too (docs/DESIGN.md → Color), like Login. «Saltar» and
 * «Empezar» mark it done; the root layout's guards then open Login.
 */
export default function IntroRoute() {
  return (
    <ScopedTheme name="garage">
      {/* Light content whatever the theme; the root layout's `auto` returns when this screen closes. */}
      <StatusBar style="dark" />
      <IntroScreen onFinish={markIntroDone} />
    </ScopedTheme>
  );
}
