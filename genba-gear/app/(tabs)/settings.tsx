import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useAuthContext } from '@/features/auth/context/AuthContext';
import FontAwesome from '@expo/vector-icons/FontAwesome';

interface SettingsItemProps {
  icon: string;
  label: string;
  onPress: () => void;
  showBorder?: boolean;
}

function SettingsItem({ icon, label, onPress, showBorder = true }: SettingsItemProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      className={showBorder ? 'border-b border-gray-100' : ''}
    >
      <View className="flex-row items-center p-4">
        <View className="w-8 items-center">
          <FontAwesome name={icon as any} size={18} color="#147878" />
        </View>
        <Text className="flex-1 text-base text-navy ml-2">{label}</Text>
        <FontAwesome name="chevron-right" size={14} color="#9CA3AF" />
      </View>
    </TouchableOpacity>
  );
}

export default function SettingsScreen() {
  const router = useRouter();
  const { user, businessProfile, signOut } = useAuthContext();

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <View className="flex-1 bg-background">
      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16 }}>
        {/* ユーザー情報 */}
        <TouchableOpacity
          onPress={() => router.push('/settings/profile')}
          activeOpacity={0.8}
        >
          <Card variant="elevated" padding="lg">
            <View className="flex-row items-center gap-4">
              <View className="w-16 h-16 bg-primary/10 rounded-full items-center justify-center">
                <FontAwesome name="user" size={28} color="#147878" />
              </View>
              <View className="flex-1">
                <Text className="text-lg font-bold text-navy">
                  {businessProfile?.businessName || user?.email || 'ゲスト'}
                </Text>
                <Text className="text-sm text-gray-500">
                  {businessProfile?.businessName ? user?.email : '個人プラン'}
                </Text>
              </View>
              <FontAwesome name="chevron-right" size={16} color="#9CA3AF" />
            </View>
          </Card>
        </TouchableOpacity>

        {/* 事業者設定 */}
        <View className="mt-6">
          <Text className="text-sm font-medium text-gray-500 mb-2 px-2">
            事業者設定
          </Text>
          <Card variant="default" padding="none">
            <SettingsItem
              icon="building-o"
              label="事業者情報"
              onPress={() => router.push('/settings/profile')}
            />
            <SettingsItem
              icon="bank"
              label="振込先口座"
              onPress={() => router.push('/settings/bank-accounts')}
            />
            <SettingsItem
              icon="list-alt"
              label="品目テンプレート"
              onPress={() => router.push('/settings/templates')}
              showBorder={false}
            />
          </Card>
        </View>

        {/* アプリ設定 */}
        <View className="mt-6">
          <Text className="text-sm font-medium text-gray-500 mb-2 px-2">
            アプリ設定
          </Text>
          <Card variant="default" padding="none">
            <SettingsItem
              icon="bell-o"
              label="通知設定"
              onPress={() => {}}
            />
            <SettingsItem
              icon="refresh"
              label="データ同期"
              onPress={() => {}}
              showBorder={false}
            />
          </Card>
        </View>

        {/* サポート */}
        <View className="mt-6">
          <Text className="text-sm font-medium text-gray-500 mb-2 px-2">
            サポート
          </Text>
          <Card variant="default" padding="none">
            <SettingsItem
              icon="question-circle-o"
              label="ヘルプ"
              onPress={() => {}}
            />
            <SettingsItem
              icon="envelope-o"
              label="お問い合わせ"
              onPress={() => {}}
              showBorder={false}
            />
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
