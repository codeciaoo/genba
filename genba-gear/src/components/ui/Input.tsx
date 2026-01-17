import React, { useState } from 'react';
import { View, Text, TextInput, type TextInputProps } from 'react-native';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  helperText?: string;
  required?: boolean;
}

export function Input({
  label,
  error,
  helperText,
  required = false,
  className,
  ...props
}: InputProps) {
  const [isFocused, setIsFocused] = useState(false);

  const borderColor = error
    ? 'border-error'
    : isFocused
      ? 'border-primary'
      : 'border-gray-300';

  return (
    <View className={`${className || ''}`}>
      {label && (
        <Text className="text-sm font-medium text-navy mb-1.5">
          {label}
          {required && <Text className="text-error"> *</Text>}
        </Text>
      )}
      <TextInput
        className={`
          border-2
          ${borderColor}
          rounded-md
          px-4
          py-3
          text-base
          text-black
          bg-white
          min-h-[52px]
        `}
        placeholderTextColor="#9CA3AF"
        onFocus={(e) => {
          setIsFocused(true);
          props.onFocus?.(e);
        }}
        onBlur={(e) => {
          setIsFocused(false);
          props.onBlur?.(e);
        }}
        {...props}
      />
      {error && <Text className="text-sm text-error mt-1">{error}</Text>}
      {helperText && !error && (
        <Text className="text-sm text-gray-500 mt-1">{helperText}</Text>
      )}
    </View>
  );
}
