import * as AppleAuthentication from 'expo-apple-authentication';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import Svg, { Path } from 'react-native-svg';

import { PressScale, usePressed } from '@/ui/press';
import { Text } from '@/ui/text';

interface ProviderButtonProps {
  /** The visible words; VoiceOver and TalkBack say them too. */
  label: string;
  onPress: () => void;
  /** Another sign-in is running: the button dims and ignores presses. */
  disabled?: boolean;
  testID?: string;
}

/**
 * Apple's own «Continuar con Apple» button (ASAuthorizationAppleIDButton),
 * as Apple's Human Interface Guidelines ask: Apple draws the logo and the
 * words and gives VoiceOver its label, all in the phone's language (an
 * English iPhone reads «Continue with Apple»), so it takes no label of
 * ours. Black, for the light sign-in screen, and a pill like the PWA's. It
 * can't grow with its text, so it takes the height the screen gives it (as
 * tall as Google's button beside it).
 */
export function AppleSignInButton({
  onPress,
  disabled = false,
  height,
  testID,
}: Omit<ProviderButtonProps, 'label'> & { height: number }) {
  styles.useVariants({ disabled });
  return (
    <View style={styles.apple} pointerEvents={disabled ? 'none' : 'auto'}>
      <AppleAuthentication.AppleAuthenticationButton
        testID={testID}
        buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
        buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
        cornerRadius={height / 2}
        style={{ height }}
        onPress={onPress}
      />
    </View>
  );
}

/**
 * «Continuar con Google», built to Google's branding guidelines
 * (developers.google.com/identity/branding-guidelines): the light style
 * (white fill, a 1 pt #747775 stroke inside, #1F1F1F text), the standard
 * four-colour «G» at a fixed size, Google's padding per platform, and a pill
 * shape. Google's font is Google Sans, which an app can't embed, so the
 * words use the platform's own font at medium weight, 14/20. The «G» gives
 * way to a spinner while Google's sheet opens. It grows with the text size.
 */
export function GoogleSignInButton({
  label,
  onPress,
  disabled = false,
  busy = false,
  onHeight,
  testID,
}: ProviderButtonProps & { busy?: boolean; onHeight?: (height: number) => void }) {
  const { theme } = useUnistyles();
  const { pressed, pressHandlers } = usePressed();
  const inactive = disabled || busy;
  styles.useVariants({ disabled, pressed: pressed && !inactive });
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: inactive, busy }}
      disabled={inactive}
      onPress={onPress}
      onLayout={(event) => onHeight?.(event.nativeEvent.layout.height)}
      {...pressHandlers}
    >
      <PressScale pressed={pressed && !inactive}>
        <View style={styles.google}>
          {busy ? <ActivityIndicator size="small" color={theme.art.googleText} /> : <GoogleMark size={theme.size.icon.md} />}
          <Text family="system" step="subhead" style={styles.googleLabel}>
            {label}
          </Text>
        </View>
      </PressScale>
    </Pressable>
  );
}

/** Google's standard «G», from Google's own sign-in button, in its own 48 × 48 coordinates. */
function GoogleMark({ size }: { size: number }) {
  const { theme } = useUnistyles();
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48" accessible={false}>
      <Path
        fill={theme.art.googleRed}
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <Path
        fill={theme.art.googleBlue}
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <Path
        fill={theme.art.googleYellow}
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <Path
        fill={theme.art.googleGreen}
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </Svg>
  );
}

const styles = StyleSheet.create((theme) => ({
  apple: {
    alignSelf: 'stretch',
    variants: {
      disabled: { true: { opacity: theme.opacity.disabled }, false: {} },
    },
  },
  google: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: theme.size.control.md,
    borderRadius: theme.radius.pill,
    borderCurve: 'continuous',
    borderWidth: theme.size.border.thin,
    borderColor: theme.art.googleStroke,
    backgroundColor: theme.art.googleFill,
    // Google's padding: before the «G», between it and the words, after the words.
    paddingLeft: theme.space[process.env.EXPO_OS === 'ios' ? 4 : 3],
    paddingRight: theme.space[process.env.EXPO_OS === 'ios' ? 4 : 3],
    gap: theme.space[process.env.EXPO_OS === 'ios' ? 3 : 2.5],
    variants: {
      pressed: { true: { opacity: theme.opacity.pressed }, false: {} },
      disabled: { true: { opacity: theme.opacity.disabled }, false: {} },
    },
  },
  googleLabel: {
    color: theme.art.googleText,
    flexShrink: 1,
    textAlign: 'center',
    paddingVertical: theme.space[2],
  },
}));
