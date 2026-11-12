// Android half of the floating [+]: Material 3's own FloatingActionButton
// (Jetpack Compose through @expo/ui), with its shape, elevation and ripple.
// iOS's half is floating-action.ios.tsx; both export the same component.
import { FloatingActionButton, Host, Icon } from '@expo/ui/jetpack-compose';
import { semantics } from '@expo/ui/jetpack-compose/modifiers';
import { View } from 'react-native';
import { useUnistyles } from 'react-native-unistyles';

import type { FloatingActionProps } from './floating-action.types';

/**
 * The fill is `radiantStrong` with an `onRadiant` glyph (4.88:1), the
 * primary button's pair. Compose's Icon draws an XML vector drawable, so the
 * [+] is Material Icons' `add` (assets/icons/add.xml). The wrapping view
 * carries the `testID`; TalkBack reads the label from the button's semantics.
 */
export function FloatingAction({ label, onPress, testID }: FloatingActionProps) {
  const { theme } = useUnistyles();
  return (
    <View testID={testID}>
      <Host matchContents>
        <FloatingActionButton containerColor={theme.colors.radiantStrong} onClick={onPress} modifiers={[semantics({ contentDescription: label })]}>
          <FloatingActionButton.Icon>
            <Icon source={require('@/assets/icons/add.xml')} tint={theme.colors.onRadiant} size={theme.size.icon.lg} />
          </FloatingActionButton.Icon>
        </FloatingActionButton>
      </Host>
    </View>
  );
}
