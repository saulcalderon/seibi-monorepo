export interface DateControlProps {
  /** Spoken, and the dialog's title on Android. The Field shows it on screen. */
  label: string;
  value: Date;
  onChange: (date: Date) => void;
  minimumDate?: Date;
  maximumDate?: Date;
  testID?: string;
}

export interface SelectControlProps<T extends string | number> {
  /** Spoken with the chosen option. The Field shows it on screen. */
  label: string;
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string }[];
  testID?: string;
}
