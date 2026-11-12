export interface FloatingActionProps {
  /** Required: the button shows only a [+], so this is all VoiceOver and TalkBack say. */
  label: string;
  onPress: () => void;
  testID?: string;
}
