import React from 'react';
import { View, Pressable } from 'react-native';

interface CardProps {
  children: React.ReactNode;
  onPress?: () => void;
  variant?: 'default' | 'elevated';
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export function Card({
  children,
  onPress,
  variant = 'default',
  padding = 'md',
}: CardProps) {
  const baseStyles = 'bg-surface rounded-xl overflow-hidden';

  const variantStyles = {
    default: 'border border-gray-200',
    elevated: 'shadow-md',
  };

  const paddingStyles = {
    none: '',
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6',
  };

  const className = `${baseStyles} ${variantStyles[variant]} ${paddingStyles[padding]}`;

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        className={`${className} active:opacity-90`}
      >
        {children}
      </Pressable>
    );
  }

  return <View className={className}>{children}</View>;
}
