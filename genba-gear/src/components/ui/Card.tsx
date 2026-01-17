import React from 'react';
import { View, TouchableOpacity } from 'react-native';

type CardVariant = 'default' | 'elevated' | 'outlined';
type CardPadding = 'none' | 'sm' | 'md' | 'lg';

interface CardProps {
  children: React.ReactNode;
  variant?: CardVariant;
  padding?: CardPadding;
  className?: string;
  onPress?: () => void;
}

const variantStyles: Record<CardVariant, string> = {
  default: 'bg-surface border border-gray-200',
  elevated: 'bg-surface shadow-lg',
  outlined: 'bg-transparent border-2 border-gray-300',
};

const paddingStyles: Record<CardPadding, string> = {
  none: '',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6',
};

export function Card({
  children,
  variant = 'default',
  padding = 'md',
  className,
  onPress,
}: CardProps) {
  const cardClassName = `
    ${variantStyles[variant]}
    ${paddingStyles[padding]}
    rounded-lg
    ${className || ''}
  `;

  if (onPress) {
    return (
      <TouchableOpacity
        onPress={onPress}
        className={cardClassName}
        activeOpacity={0.7}
      >
        {children}
      </TouchableOpacity>
    );
  }

  return (
    <View className={cardClassName}>
      {children}
    </View>
  );
}
