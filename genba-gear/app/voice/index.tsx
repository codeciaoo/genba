import React, { useState } from 'react';
import { View, Text, TouchableOpacity, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Button } from '@/components/ui/Button';

export default function VoiceInputScreen() {
  const router = useRouter();
  const [isRecording, setIsRecording] = useState(false);

  const handleMicPress = () => {
    setIsRecording(!isRecording);
  };

  const handleClose = () => {
    router.back();
  };

  return (
    <SafeAreaView className="flex-1 bg-navy">
      {/* ヘッダー */}
      <View className="flex-row items-center justify-between px-4 py-4">
        <TouchableOpacity onPress={handleClose} className="p-2">
          <FontAwesome name="times" size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text className="text-white text-lg font-bold">音声入力</Text>
        <View className="w-10" />
      </View>

      {/* メインエリア */}
      <View className="flex-1 items-center justify-center px-6">
        {/* 録音状態表示 */}
        <View className="mb-8">
          {isRecording ? (
            <View className="items-center">
              <View className="flex-row gap-1 mb-4">
                {[...Array(5)].map((_, i) => (
                  <View
                    key={i}
                    className="w-1 bg-primary rounded-full"
                    style={{
                      height: Math.random() * 40 + 20,
                    }}
                  />
                ))}
              </View>
              <Text className="text-white text-xl">聞いています...</Text>
            </View>
          ) : (
            <Text className="text-white/60 text-center text-lg">
              マイクボタンをタップして{'\n'}今日の作業内容を話してください
            </Text>
          )}
        </View>

        {/* 大きなマイクボタン */}
        <TouchableOpacity
          onPress={handleMicPress}
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

        {/* ヒント */}
        <View className="mt-12 px-4">
          <Text className="text-white/40 text-center text-sm">
            例: 「今日は田中邸でエアコン設置。配管2m追加」
          </Text>
        </View>
      </View>

      {/* フッター */}
      <View className="px-6 pb-8">
        {isRecording && (
          <Button
            variant="secondary"
            fullWidth
            size="lg"
            onPress={() => setIsRecording(false)}
          >
            キャンセル
          </Button>
        )}
      </View>
    </SafeAreaView>
  );
}
