export interface DateControlProps {
  /** Spoken, and the dialog's title on Android. The Field shows it on screen. */
  label: string;
  value: Date;
  onChange: (date: Date) => void;
  minimumDate?: Date;
  maximumDate?: Date;
  testID?: string;
}
