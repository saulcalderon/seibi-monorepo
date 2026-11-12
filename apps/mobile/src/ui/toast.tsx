import { AccessibilityInfo, Alert } from 'react-native';
import { useUnistyles } from 'react-native-unistyles';
import { Toaster as SonnerToaster, toast as sonner } from 'sonner-native';

import { Icon } from './icon';

/** How long a toast stays: the PWA's 3.2 s. */
const DURATION = 3200;

/**
 * The toasts' host, mounted once at the root (`UIProvider`). Toasts keep the
 * PWA's look: an inverse pill for success, the «Vencido» red for errors,
 * with the text in `onInverse` on both (AA in every palette). With Reduce
 * Motion on, sonner-native shows and hides them without sliding.
 */
export function Toaster() {
  const { theme } = useUnistyles();
  const text = { ...theme.type.subhead, fontFamily: theme.fonts.sans[600], color: theme.colors.onInverse };
  return (
    <SonnerToaster
      position="top-center"
      duration={DURATION}
      visibleToasts={3}
      swipeToDismissDirection="up"
      icons={{
        success: <Icon name="successFill" size="md" tone="onInverse" />,
        error: <Icon name="alertFill" size="md" tone="onInverse" />,
      }}
      toastOptions={{
        style: {
          backgroundColor: theme.colors.inverse,
          borderRadius: theme.radius.xl,
          borderCurve: 'continuous',
          boxShadow: theme.shadow.float,
          paddingHorizontal: theme.space[4],
          paddingVertical: theme.space[3],
        },
        titleStyle: text,
        descriptionStyle: { ...text, fontFamily: theme.fonts.sans[400] },
        error: { backgroundColor: theme.colors.overdue },
      }}
    />
  );
}

/**
 * Short confirmations of something that just happened. The message is read
 * out too: sonner-native doesn't announce its toasts to VoiceOver, and on
 * Android its toast never reaches the accessibility tree, so TalkBack can't
 * find it on screen. Pass text from `t()`.
 */
export const notify = {
  success(message: string) {
    sonner.success(message);
    AccessibilityInfo.announceForAccessibility(message);
  },
  error(message: string) {
    sonner.error(message);
    AccessibilityInfo.announceForAccessibility(message);
  },
};

export interface ConfirmOptions {
  title: string;
  message?: string;
  /** The action's verb («Eliminar»), never «Sí». */
  confirmLabel: string;
  cancelLabel: string;
  /** Red, for actions that delete or can't be undone. */
  destructive?: boolean;
}

/**
 * Asks before a consequential action, with the system alert (the PWA's
 * custom dialogs become the native one). Resolves `true` when the person
 * confirms. Pass text from `t()`.
 */
export function confirm({ title, message, confirmLabel, cancelLabel, destructive = false }: ConfirmOptions): Promise<boolean> {
  return new Promise((resolve) => {
    Alert.alert(
      title,
      message,
      [
        { text: cancelLabel, style: 'cancel', onPress: () => resolve(false) },
        { text: confirmLabel, style: destructive ? 'destructive' : 'default', onPress: () => resolve(true) },
      ],
      { cancelable: true, onDismiss: () => resolve(false) },
    );
  });
}
