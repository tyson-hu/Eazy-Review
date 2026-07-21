import type { TextProps } from 'react-native';
import { Text } from 'react-native';

type AppTextVariant = 'title' | 'subtitle' | 'body' | 'caption' | 'label';

type AppTextProps = TextProps & {
  variant?: AppTextVariant;
};

const variantClasses: Record<AppTextVariant, string> = {
  title: 'text-2xl font-semibold text-primary',
  subtitle: 'text-lg font-semibold text-primary',
  body: 'text-[17px] font-normal text-primary',
  caption: 'text-sm font-normal text-secondary',
  label: 'text-xs font-normal uppercase tracking-wide text-secondary',
};

export function AppText({ variant = 'body', className, ...props }: AppTextProps) {
  return <Text className={`${variantClasses[variant]} ${className ?? ''}`} {...props} />;
}
