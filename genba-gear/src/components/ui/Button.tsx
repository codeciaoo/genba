import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  View,
  type TouchableOpacityProps,
} from 'react-native';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'warning';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends TouchableOpacityProps {
  children: React.ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  className?: string;
}

const variantStyles: Record<ButtonVariant, { container: string; text: string }> = {
  primary: {
    container: 'bg-primary',
    text: 'text-white',
  },
  secondary: {
    container: 'bg-navy',
    text: 'text-white',
  },
  outline: {
    container: 'bg-transparent border-2 border-navy',
    text: 'text-navy',
  },
  ghost: {
    container: 'bg-transparent',
    text: 'text-primary',
  },
  warning: {
    container: 'bg-warning',
    text: 'text-black',
  },
};

const sizeStyles: Record<ButtonSize, { container: string; text: string }> = {
  sm: {
    container: 'py-2 px-4 min-h-[40px]',
    text: 'text-sm',
  },
  md: {
    container: 'py-3 px-6 min-h-[48px]',
    text: 'text-base',
  },
  lg: {
    container: 'py-4 px-8 min-h-[56px]',
    text: 'text-lg',
  },
};

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  fullWidth = false,
  leftIcon,
  rightIcon,
  className,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;
  const variantStyle = variantStyles[variant];
  const sizeStyle = sizeStyles[size];

  return (
    <TouchableOpacity
      disabled={isDisabled}
      className={`
        ${variantStyle.container}
        ${sizeStyle.container}
        rounded-md
        flex-row
        items-center
        justify-center
        ${fullWidth ? 'w-full' : ''}
        ${isDisabled ? 'opacity-50' : ''}
        ${className || ''}
      `}
      activeOpacity={0.8}
      {...props}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === 'outline' || variant === 'ghost' ? '#147878' : 'white'}
          size="small"
        />
      ) : (
        <View className="flex-row items-center gap-2">
          {leftIcon}
          <Text
            className={`
              ${variantStyle.text}
              ${sizeStyle.text}
              font-semibold
              text-center
            `}
          >
            {children}
          </Text>
          {rightIcon}
        </View>
      )}
    </TouchableOpacity>
  );
}
