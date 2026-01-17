import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { Card } from '@/components/ui/Card';
import { useItemTemplates } from '@/features/settings/hooks/useItemTemplates';
import FontAwesome from '@expo/vector-icons/FontAwesome';

export default function ItemTemplatesScreen() {
  const router = useRouter();
  const { templates, loading, refresh, deleteTemplate } = useItemTemplates();

  const handleDelete = (id: string, name: string) => {
    Alert.alert('削除確認', `「${name}」を削除しますか？`, [
      { text: 'キャンセル', style: 'cancel' },
      {
        text: '削除',
        style: 'destructive',
        onPress: async () => {
          const { error } = await deleteTemplate(id);
          if (error) {
            Alert.alert('エラー', error);
          }
        },
      },
    ]);
  };

  const formatPrice = (price: number): string => {
    return `¥${price.toLocaleString()}`;
  };

  return (
    <View className="flex-1 bg-background">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16 }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} />}
      >
        {templates.length === 0 && !loading ? (
          <Card variant="default" padding="lg">
            <View className="items-center py-8">
              <FontAwesome name="list-alt" size={48} color="#9CA3AF" />
              <Text className="text-gray-500 mt-4 text-center">
                登録された品目がありません
              </Text>
              <Text className="text-gray-400 text-sm mt-2 text-center">
                よく使う作業項目を登録しておくと{'\n'}
                日報・請求書の作成が楽になります
              </Text>
            </View>
          </Card>
        ) : (
          <View className="gap-3">
            {templates.map((template) => (
              <TouchableOpacity
                key={template.id}
                onPress={() => router.push(`/settings/templates/${template.id}`)}
                activeOpacity={0.8}
              >
                <Card variant="default" padding="md">
                  <View className="flex-row items-start justify-between">
                    <View className="flex-1">
                      <View className="flex-row items-center gap-2">
                        <Text className="text-lg font-bold text-navy">
                          {template.name}
                        </Text>
                        {template.category && (
                          <View className="bg-gray-100 px-2 py-0.5 rounded">
                            <Text className="text-gray-600 text-xs">
                              {template.category}
                            </Text>
                          </View>
                        )}
                      </View>
                      {template.description && (
                        <Text className="text-gray-500 text-sm mt-1">
                          {template.description}
                        </Text>
                      )}
                      <View className="flex-row items-center gap-3 mt-2">
                        <Text className="text-primary font-semibold">
                          {formatPrice(template.unitPrice)} / {template.unit}
                        </Text>
                        <View className={`px-2 py-0.5 rounded ${template.taxRate === 10 ? 'bg-navy/10' : 'bg-warning/10'}`}>
                          <Text className={`text-xs ${template.taxRate === 10 ? 'text-navy' : 'text-warning'}`}>
                            {template.taxRate}%
                          </Text>
                        </View>
                      </View>
                    </View>
                    <TouchableOpacity
                      onPress={() => handleDelete(template.id, template.name)}
                      className="p-2"
                    >
                      <FontAwesome name="trash-o" size={20} color="#c73b3b" />
                    </TouchableOpacity>
                  </View>
                </Card>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* 説明テキスト */}
        <View className="mt-6 px-4">
          <Text className="text-gray-400 text-sm text-center">
            品目テンプレートは音声入力時の{'\n'}
            自動マッチングにも使用されます
          </Text>
        </View>
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity
        onPress={() => router.push('/settings/templates/new')}
        className="absolute bottom-6 right-6 w-14 h-14 bg-primary rounded-full items-center justify-center shadow-lg"
        activeOpacity={0.8}
      >
        <FontAwesome name="plus" size={24} color="white" />
      </TouchableOpacity>
    </View>
  );
}
