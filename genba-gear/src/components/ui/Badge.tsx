import React from 'react';
import { View, Text, type ViewProps } from 'react-native';

type BadgeVariant = 'default' | 'primary' | 'success' | 'warning' | 'error' | 'info';
type BadgeSize = 'sm' | 'md' | 'lg';

interface BadgeProps extends ViewProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  size?: BadgeSize;
  className?: string;
}

const variantStyles: Record<BadgeVariant, { bg: string; text: string }> = {
  default: { bg: 'bg-gray-200', text: 'text-gray-700' },
  primary: { bg: 'bg-primary', text: 'text-white' },
  success: { bg: 'bg-green-500', text: 'text-white' },
  warning: { bg: 'bg-warning', text: 'text-navy' },
  error: { bg: 'bg-red-500', text: 'text-white' },
  info: { bg: 'bg-blue-500', text: 'text-white' },
};

const sizeStyles: Record<BadgeSize, { container: string; text: string }> = {
  sm: { container: 'px-2 py-0.5', text: 'text-xs' },
  md: { container: 'px-2.5 py-1', text: 'text-sm' },
  lg: { container: 'px-3 py-1.5', text: 'text-base' },
};

export function Badge({
  children,
  variant = 'default',
  size = 'md',
  className,
  ...props
}: BadgeProps) {
  const variantStyle = variantStyles[variant];
  const sizeStyle = sizeStyles[size];

  return (
    <View
      className={`
        ${variantStyle.bg}
        ${sizeStyle.container}
        rounded-full
        ${className || ''}
      `}
      {...props}
    >
      <Text className={`${variantStyle.text} ${sizeStyle.text} font-medium`}>
        {children}
      </Text>
    </View>
  );
}
