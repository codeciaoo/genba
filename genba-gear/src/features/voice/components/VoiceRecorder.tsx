/**
 * VoiceRecorder Component
 * 音声録音のUIコンポーネント
 */
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useVoiceRecorder } from '../hooks/useVoiceRecorder';
import { RECORDING_CONFIG } from '../types';

interface VoiceRecorderProps {
  onRecordingComplete: (uri: string, duration: number) => void;
  onError?: (error: Error) => void;
}

export function VoiceRecorder({ onRecordingComplete, onError }: VoiceRecorderProps) {
  const {
    isRecording,
    duration,
    progress,
    startRecording,
    stopRecording,
    cancelRecording,
  } = useVoiceRecorder({
    onRecordingComplete,
    onError,
  });

  const maxSeconds = RECORDING_CONFIG.MAX_DURATION_MS / 1000;
  const remainingSeconds = maxSeconds - duration;

  return (
    <View className="items-center">
      {/* プログレスリング + マイクボタン */}
      <View className="relative items-center justify-center">
        {/* プログレスリング背景 */}
        <View
          className="absolute w-36 h-36 rounded-full border-4 border-white/20"
          style={{ borderWidth: 6 }}
        />

        {/* プログレスリング（SVGの代わりにシンプルなボーダーで表現） */}
        {isRecording && (
          <View
            className="absolute w-36 h-36 rounded-full border-primary"
            style={{
              borderWidth: 6,
              borderTopColor: '#147878',
              borderRightColor: progress > 0.25 ? '#147878' : 'transparent',
              borderBottomColor: progress > 0.5 ? '#147878' : 'transparent',
              borderLeftColor: progress > 0.75 ? '#147878' : 'transparent',
              transform: [{ rotate: '-90deg' }],
            }}
          />
        )}

        {/* マイクボタン */}
        <TouchableOpacity
          onPress={isRecording ? stopRecording : startRecording}
          className={`w-32 h-32 rounded-full items-center justify-center shadow-lg ${
            isRecording ? 'bg-error' : 'bg-primary'
          }`}
          activeOpacity={0.8}
        >
          <FontAwesome
            name={isRecording ? 'stop' : 'microphone'}
            size={48}
            color="#ffffff"
          />
        </TouchableOpacity>
      </View>

      {/* 時間表示 */}
      <View className="mt-6 items-center">
        {isRecording ? (
          <>
            <Text className="text-white text-3xl font-bold">{duration}秒</Text>
            <Text className="text-white/60 text-sm mt-1">
              残り{remainingSeconds}秒
            </Text>
          </>
        ) : (
          <Text className="text-white/60 text-center text-lg">
            マイクをタップして{'\n'}今日の作業内容を話してください
          </Text>
        )}
      </View>

      {/* 録音中のヒント */}
      {isRecording && (
        <View className="mt-6">
          <Text className="text-white/40 text-center text-sm">
            話し終わったらもう一度タップ
          </Text>
        </View>
      )}

      {/* キャンセルボタン */}
      {isRecording && (
        <TouchableOpacity
          onPress={cancelRecording}
          className="mt-8 py-3 px-6"
          activeOpacity={0.7}
        >
          <Text className="text-white/60 text-base">キャンセル</Text>
        </TouchableOpacity>
      )}

      {/* ヒント（録音前） */}
      {!isRecording && (
        <View className="mt-8 px-4">
          <Text className="text-white/40 text-center text-sm">
            例: 「今日は田中邸でエアコン設置。配管2m追加」
          </Text>
        </View>
      )}
    </View>
  );
}
