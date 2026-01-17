import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useBankAccounts } from '@/features/settings/hooks/useBankAccounts';
import FontAwesome from '@expo/vector-icons/FontAwesome';

export default function BankAccountsScreen() {
  const router = useRouter();
  const { bankAccounts, loading, refresh, deleteBankAccount, setDefaultAccount } = useBankAccounts();

  const handleDelete = (id: string, bankName: string) => {
    Alert.alert('削除確認', `「${bankName}」を削除しますか？`, [
      { text: 'キャンセル', style: 'cancel' },
      {
        text: '削除',
        style: 'destructive',
        onPress: async () => {
          const { error } = await deleteBankAccount(id);
          if (error) {
            Alert.alert('エラー', error);
          }
        },
      },
    ]);
  };

  const handleSetDefault = async (id: string) => {
    const { error } = await setDefaultAccount(id);
    if (error) {
      Alert.alert('エラー', error);
    }
  };

  return (
    <View className="flex-1 bg-background">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16 }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} />}
      >
        {bankAccounts.length === 0 && !loading ? (
          <Card variant="default" padding="lg">
            <View className="items-center py-8">
              <FontAwesome name="bank" size={48} color="#9CA3AF" />
              <Text className="text-gray-500 mt-4 text-center">
                登録された口座がありません
              </Text>
              <Text className="text-gray-400 text-sm mt-2 text-center">
                請求書に振込先を記載するには{'\n'}
                口座を登録してください
              </Text>
            </View>
          </Card>
        ) : (
          <View className="gap-3">
            {bankAccounts.map((account) => (
              <TouchableOpacity
                key={account.id}
                onPress={() => router.push(`/settings/bank-accounts/${account.id}`)}
                activeOpacity={0.8}
              >
                <Card variant={account.isDefault ? 'elevated' : 'default'} padding="md">
                  <View className="flex-row items-start justify-between">
                    <View className="flex-1">
                      <View className="flex-row items-center gap-2">
                        <Text className="text-lg font-bold text-navy">
                          {account.bankName}
                        </Text>
                        {account.isDefault && (
                          <View className="bg-primary px-2 py-0.5 rounded">
                            <Text className="text-white text-xs font-medium">
                              デフォルト
                            </Text>
                          </View>
                        )}
                      </View>
                      <Text className="text-gray-600 mt-1">
                        {account.branchName}支店
                      </Text>
                      <Text className="text-gray-500 text-sm mt-2">
                        {account.accountType} {account.accountNumber}
                      </Text>
                      <Text className="text-gray-500 text-sm">
                        {account.accountHolder}
                      </Text>
                    </View>
                    <View className="flex-row gap-2">
                      {!account.isDefault && (
                        <TouchableOpacity
                          onPress={() => handleSetDefault(account.id)}
                          className="p-2"
                        >
                          <FontAwesome name="star-o" size={20} color="#147878" />
                        </TouchableOpacity>
                      )}
                      <TouchableOpacity
                        onPress={() => handleDelete(account.id, account.bankName)}
                        className="p-2"
                      >
                        <FontAwesome name="trash-o" size={20} color="#c73b3b" />
                      </TouchableOpacity>
                    </View>
                  </View>
                </Card>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity
        onPress={() => router.push('/settings/bank-accounts/new')}
        className="absolute bottom-6 right-6 w-14 h-14 bg-primary rounded-full items-center justify-center shadow-lg"
        activeOpacity={0.8}
      >
        <FontAwesome name="plus" size={24} color="white" />
      </TouchableOpacity>
    </View>
  );
}
