/**
 * ErrorView Component
 * 音声処理エラー時の表示
 */
import React from 'react';
import { View, Text } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Button } from '@/components/ui/Button';

interface ErrorViewProps {
  message: string;
  queued?: boolean;
  onRetry: () => void;
  onManualInput: () => void;
  onClose: () => void;
}

export function ErrorView({
  message,
  queued,
  onRetry,
  onManualInput,
  onClose,
}: ErrorViewProps) {
  return (
    <View className="flex-1 bg-navy items-center justify-center px-6">
      <View className="items-center mb-8">
        {/* アイコン */}
        <View
          className={`w-24 h-24 rounded-full items-center justify-center mb-6 ${
            queued ? 'bg-warning/20' : 'bg-error/20'
          }`}
        >
          <FontAwesome
            name={queued ? 'cloud-upload' : 'exclamation-triangle'}
            size={40}
            color={queued ? '#c77700' : '#c73b3b'}
          />
        </View>

        {/* メッセージ */}
        <Text className="text-white text-xl font-bold mb-2 text-center">
          {queued ? 'オフラインキューに追加' : '処理に失敗しました'}
        </Text>
        <Text className="text-white/60 text-center mb-4">{message}</Text>

        {queued && (
          <View className="bg-warning/20 rounded-lg p-4 mb-4">
            <Text className="text-warning text-center text-sm">
              オンラインに戻ると自動で処理されます
            </Text>
          </View>
        )}
      </View>

      {/* ボタン */}
      <View className="w-full gap-3">
        {!queued && (
          <Button
            fullWidth
            size="lg"
            onPress={onRetry}
            leftIcon={<FontAwesome name="microphone" size={18} color="#fff" />}
          >
            もう一度録音
          </Button>
        )}

        <Button
          variant="outline"
          fullWidth
          size="lg"
          onPress={onManualInput}
          leftIcon={<FontAwesome name="pencil" size={18} color="#1a1f3d" />}
        >
          手動で入力
        </Button>

        <Button variant="ghost" fullWidth size="md" onPress={onClose}>
          キャンセル
        </Button>
      </View>
    </View>
  );
}
