import type { TextProps } from 'react-native';
import { Text } from 'react-native';

/**
 * `score`: large weight-600 composite number (0–100 displays). It sets no
 * color so the caller passes the score tone class; generated CSS is ordered
 * by class name, so a tone class cannot reliably override a variant color.
 * `action`: inline accent-colored text affordance inside a tappable surface.
 */
type AppTextVariant =
  | 'title'
  | 'subtitle'
  | 'body'
  | 'caption'
  | 'label'
  | 'score'
  | 'action';

type AppTextProps = TextProps & {
  variant?: AppTextVariant;
};

const variantClasses: Record<AppTextVariant, string> = {
  title: 'text-2xl font-semibold text-primary',
  subtitle: 'text-lg font-semibold text-primary',
  body: 'text-[17px] font-normal text-primary',
  caption: 'text-sm font-normal text-secondary',
  label: 'text-xs font-normal uppercase tracking-wide text-secondary',
  score: 'text-4xl font-semibold',
  action: 'text-[17px] font-semibold text-accent',
};

export function AppText({ variant = 'body', className, ...props }: AppTextProps) {
  return <Text className={`${variantClasses[variant]} ${className ?? ''}`} {...props} />;
}
