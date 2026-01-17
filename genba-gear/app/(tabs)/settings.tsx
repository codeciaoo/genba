import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useAuthContext } from '@/features/auth/context/AuthContext';
import FontAwesome from '@expo/vector-icons/FontAwesome';

export default function SettingsScreen() {
  const { user, signOut } = useAuthContext();

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <View className="flex-1 bg-background">
      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16 }}>
        {/* ユーザー情報 */}
        <Card variant="elevated" padding="lg">
          <View className="flex-row items-center gap-4">
            <View className="w-16 h-16 bg-primary/10 rounded-full items-center justify-center">
              <FontAwesome name="user" size={28} color="#147878" />
            </View>
            <View className="flex-1">
              <Text className="text-lg font-bold text-navy">
                {user?.email || 'ゲスト'}
              </Text>
              <Text className="text-sm text-gray-500">個人プラン</Text>
            </View>
          </View>
        </Card>

        {/* 設定項目 */}
        <View className="mt-6">
          <Text className="text-sm font-medium text-gray-500 mb-2 px-2">
            アカウント
          </Text>
          <Card variant="default" padding="none">
            <View className="border-b border-gray-100">
              <View className="flex-row items-center justify-between p-4">
                <Text className="text-base text-navy">プロフィール編集</Text>
                <FontAwesome name="chevron-right" size={14} color="#9CA3AF" />
              </View>
            </View>
            <View className="flex-row items-center justify-between p-4">
              <Text className="text-base text-navy">事業者情報</Text>
              <FontAwesome name="chevron-right" size={14} color="#9CA3AF" />
            </View>
          </Card>
        </View>

        <View className="mt-6">
          <Text className="text-sm font-medium text-gray-500 mb-2 px-2">
            アプリ設定
          </Text>
          <Card variant="default" padding="none">
            <View className="border-b border-gray-100">
              <View className="flex-row items-center justify-between p-4">
                <Text className="text-base text-navy">通知設定</Text>
                <FontAwesome name="chevron-right" size={14} color="#9CA3AF" />
              </View>
            </View>
            <View className="flex-row items-center justify-between p-4">
              <Text className="text-base text-navy">データ同期</Text>
              <FontAwesome name="chevron-right" size={14} color="#9CA3AF" />
            </View>
          </Card>
        </View>

        <View className="mt-6">
          <Text className="text-sm font-medium text-gray-500 mb-2 px-2">
            サポート
          </Text>
          <Card variant="default" padding="none">
            <View className="border-b border-gray-100">
              <View className="flex-row items-center justify-between p-4">
                <Text className="text-base text-navy">ヘルプ</Text>
                <FontAwesome name="chevron-right" size={14} color="#9CA3AF" />
              </View>
            </View>
            <View className="flex-row items-center justify-between p-4">
              <Text className="text-base text-navy">お問い合わせ</Text>
              <FontAwesome name="chevron-right" size={14} color="#9CA3AF" />
            </View>
          </Card>
        </View>

        {/* ログアウト */}
        <View className="mt-8 mb-8">
          <Button variant="outline" fullWidth onPress={handleSignOut}>
            ログアウト
          </Button>
        </View>

        {/* バージョン情報 */}
        <Text className="text-center text-gray-400 text-xs">
          GENBA GEAR v1.0.0
        </Text>
      </ScrollView>
    </View>
  );
}
