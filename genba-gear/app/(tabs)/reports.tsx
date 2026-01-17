import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { Card } from '@/components/ui/Card';

export default function ReportsScreen() {
  return (
    <View className="flex-1 bg-background">
      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16 }}>
        <Card variant="default" padding="lg">
          <Text className="text-gray-500 text-center py-8">
            まだ日報がありません
          </Text>
          <Text className="text-gray-400 text-sm text-center">
            ホーム画面のマイクボタンから日報を作成できます
          </Text>
        </Card>
      </ScrollView>
    </View>
  );
}
