import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';

export default function HomeScreen() {
  const router = useRouter();

  const handleVoiceInput = () => {
    router.push('/voice');
  };

  return (
    <View className="flex-1 bg-background">
      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16 }}>
        {/* 日付表示 */}
        <View className="mb-4">
          <Text className="text-2xl font-bold text-navy">
            {new Date().toLocaleDateString('ja-JP', {
              month: 'long',
              day: 'numeric',
              weekday: 'long',
            })}
          </Text>
        </View>

        {/* 今日の現場カード（プレースホルダー） */}
        <Card variant="elevated" padding="lg">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-lg font-bold text-navy">今日の予定</Text>
            <Badge variant="info">0件</Badge>
          </View>
          <Text className="text-gray-500">
            まだ今日の現場がありません
          </Text>
          <Text className="text-gray-400 text-sm mt-2">
            音声入力で日報を作成すると、現場の履歴が表示されます
          </Text>
        </Card>

        {/* クイックアクション */}
        <View className="mt-6 mb-4">
          <Text className="text-lg font-bold text-navy mb-3">クイックアクション</Text>
        </View>

        <View className="flex-row gap-4">
          <Card variant="default" padding="md" onPress={handleVoiceInput}>
            <View className="items-center py-2">
              <View className="w-12 h-12 bg-primary/10 rounded-full items-center justify-center mb-2">
                <FontAwesome name="microphone" size={24} color="#147878" />
              </View>
              <Text className="text-sm font-medium text-navy">日報作成</Text>
            </View>
          </Card>

          <Card variant="default" padding="md">
            <View className="items-center py-2">
              <View className="w-12 h-12 bg-primary/10 rounded-full items-center justify-center mb-2">
                <FontAwesome name="file-text-o" size={24} color="#147878" />
              </View>
              <Text className="text-sm font-medium text-navy">請求書</Text>
            </View>
          </Card>

          <Card variant="default" padding="md">
            <View className="items-center py-2">
              <View className="w-12 h-12 bg-primary/10 rounded-full items-center justify-center mb-2">
                <FontAwesome name="user-plus" size={24} color="#147878" />
              </View>
              <Text className="text-sm font-medium text-navy">顧客追加</Text>
            </View>
          </Card>
        </View>

        {/* 最近の日報（プレースホルダー） */}
        <View className="mt-6 mb-4">
          <Text className="text-lg font-bold text-navy">最近の日報</Text>
        </View>

        <Card variant="default" padding="md">
          <Text className="text-gray-500 text-center py-4">
            まだ日報がありません
          </Text>
        </Card>
      </ScrollView>

      {/* 大きな音声入力ボタン */}
      <View className="absolute bottom-24 left-0 right-0 items-center">
        <TouchableOpacity
          onPress={handleVoiceInput}
          className="w-20 h-20 bg-primary rounded-full items-center justify-center shadow-lg active:bg-primary-dark"
          activeOpacity={0.8}
        >
          <FontAwesome name="microphone" size={36} color="#ffffff" />
        </TouchableOpacity>
        <Text className="text-xs text-gray-500 mt-2">タップして話す</Text>
      </View>
    </View>
  );
}
