import type { TextInputProps } from 'react-native';
import { TextInput } from 'react-native';

type InputProps = TextInputProps & {
  className?: string;
};

export function Input({ className, ...props }: InputProps) {
  return (
    <TextInput
      className={`min-h-12 rounded-button border border-border bg-card px-4 text-base text-primary ${className ?? ''}`}
      placeholderTextColor="#6B7280"
      {...props}
    />
  );
}
