import type { PressableProps } from 'react-native';
import { ActivityIndicator, Pressable } from 'react-native';

import { AppText } from '@/src/components/ui/AppText';

type ButtonVariant = 'primary' | 'secondary' | 'ghost';

type ButtonProps = PressableProps & {
  label: string;
  variant?: ButtonVariant;
  loading?: boolean;
  className?: string;
};

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-accent',
  secondary: 'border border-border bg-card',
  ghost: 'bg-transparent',
};

const labelClasses: Record<ButtonVariant, string> = {
  primary: 'text-white',
  secondary: 'text-primary',
  ghost: 'text-accent',
};

export function Button({
  label,
  variant = 'primary',
  loading = false,
  disabled,
  className,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      disabled={isDisabled}
      className={`min-h-12 items-center justify-center rounded-button px-4 ${variantClasses[variant]} ${
        isDisabled ? 'opacity-50' : ''
      } ${className ?? ''}`}
      {...props}>
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? '#FFFFFF' : '#2563EB'} />
      ) : (
        <AppText className={`font-semibold ${labelClasses[variant]}`}>{label}</AppText>
      )}
    </Pressable>
  );
}
