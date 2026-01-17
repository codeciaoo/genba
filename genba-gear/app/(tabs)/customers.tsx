import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import FontAwesome from '@expo/vector-icons/FontAwesome';

export default function CustomersScreen() {
  return (
    <View className="flex-1 bg-background">
      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16 }}>
        <Card variant="default" padding="lg">
          <Text className="text-gray-500 text-center py-8">
            まだ顧客が登録されていません
          </Text>
          <Text className="text-gray-400 text-sm text-center mb-4">
            日報を作成すると自動で顧客カルテが作成されます
          </Text>
          <Button
            variant="outline"
            fullWidth
            leftIcon={<FontAwesome name="user-plus" size={16} color="#1a1f3d" />}
            onPress={() => {}}
          >
            顧客を追加
          </Button>
        </Card>
      </ScrollView>
    </View>
  );
}
