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
  style,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      disabled={isDisabled}
      className={`min-h-12 items-center justify-center rounded-button px-5 ${variantClasses[variant]} ${
        isDisabled ? 'opacity-50' : ''
      } ${className ?? ''}`}
      style={(state) => [
        { transform: [{ scale: state.pressed && !isDisabled ? 0.95 : 1 }] },
        typeof style === 'function' ? style(state) : style,
      ]}
      {...props}>
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? '#ffffff' : '#0066cc'} />
      ) : (
        <AppText className={`font-normal ${labelClasses[variant]}`}>{label}</AppText>
      )}
    </Pressable>
  );
}
