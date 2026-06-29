import type { ReactNode } from 'react';
import type { ViewProps } from 'react-native';
import { View } from 'react-native';

type CardProps = ViewProps & {
  children: ReactNode;
};

export function Card({ children, className, ...props }: CardProps) {
  return (
    <View
      className={`rounded-card border border-border bg-card p-4 ${className ?? ''}`}
      {...props}>
      {children}
    </View>
  );
}
