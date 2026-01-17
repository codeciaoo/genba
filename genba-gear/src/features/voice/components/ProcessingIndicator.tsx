/**
 * ProcessingIndicator Component
 * 音声処理中の進行状況表示
 */
import React from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { VoiceProcessingState } from '../types';

interface ProcessingIndicatorProps {
  state: VoiceProcessingState;
}

const stateConfig: Record<
  Exclude<VoiceProcessingState, 'idle' | 'recording' | 'completed' | 'error'>,
  { icon: string; message: string; subMessage?: string }
> = {
  processing: {
    icon: 'cog',
    message: '処理中...',
    subMessage: '音声を分析しています',
  },
  transcribing: {
    icon: 'commenting',
    message: '文字起こし中...',
    subMessage: 'AIが音声を解析しています',
  },
  extracting: {
    icon: 'magic',
    message: '情報抽出中...',
    subMessage: '作業内容を整理しています',
  },
};

export function ProcessingIndicator({ state }: ProcessingIndicatorProps) {
  if (state === 'idle' || state === 'recording' || state === 'completed' || state === 'error') {
    return null;
  }

  const config = stateConfig[state];

  return (
    <View className="flex-1 items-center justify-center bg-navy px-6">
      <View className="items-center">
        {/* アイコン */}
        <View className="w-24 h-24 rounded-full bg-primary/20 items-center justify-center mb-6">
          <FontAwesome name={config.icon as any} size={40} color="#147878" />
        </View>

        {/* ローディングインジケーター */}
        <ActivityIndicator size="large" color="#147878" className="mb-4" />

        {/* メッセージ */}
        <Text className="text-white text-xl font-bold mb-2">
          {config.message}
        </Text>
        {config.subMessage && (
          <Text className="text-white/60 text-center">
            {config.subMessage}
          </Text>
        )}
      </View>

      {/* ヒント */}
      <View className="absolute bottom-8 left-0 right-0 px-6">
        <Text className="text-white/40 text-center text-sm">
          騒音環境でも正確に認識するAIを使用しています
        </Text>
      </View>
    </View>
  );
}
