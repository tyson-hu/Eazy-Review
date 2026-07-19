import type { TextInputProps } from 'react-native';
import { Platform, TextInput } from 'react-native';

type InputProps = TextInputProps & {
  className?: string;
  /** Marks the field invalid for assistive tech. */
  invalid?: boolean;
  /** id / nativeID of the error text (web: aria-describedby). */
  describedBy?: string;
  /** Current error copy for native screen readers (folded into accessibilityLabel). */
  errorMessage?: string;
};

export function Input({
  className,
  invalid = false,
  describedBy,
  errorMessage,
  accessibilityLabel,
  ...props
}: InputProps) {
  // Native RN has no aria-invalid / aria-describedby. Fold the error into the
  // spoken label so VoiceOver / TalkBack announce it with the field.
  const nativeAccessibilityLabel =
    Platform.OS !== 'web' && invalid && errorMessage
      ? [accessibilityLabel, errorMessage].filter(Boolean).join('. ')
      : accessibilityLabel;

  const webA11y =
    Platform.OS === 'web'
      ? ({
          'aria-invalid': invalid || undefined,
          'aria-describedby': describedBy,
        } as TextInputProps)
      : {};

  return (
    <TextInput
      className={`min-h-12 rounded-button border border-border bg-card px-4 text-base text-primary ${className ?? ''}`}
      placeholderTextColor="#6B7280"
      accessibilityLabel={nativeAccessibilityLabel}
      {...webA11y}
      {...props}
    />
  );
}
