import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { useBankAccounts } from '@/features/settings/hooks/useBankAccounts';
import { validateAccountNumber } from '@/features/auth/domain/validation';

type AccountType = '普通' | '当座';

export default function EditBankAccountScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const isNew = id === 'new';
  const { bankAccounts, createBankAccount, updateBankAccount } = useBankAccounts();

  const [bankName, setBankName] = useState('');
  const [branchName, setBranchName] = useState('');
  const [accountType, setAccountType] = useState<AccountType>('普通');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountHolder, setAccountHolder] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // 編集時は既存データを設定
  useEffect(() => {
    if (!isNew && id) {
      const account = bankAccounts.find((a) => a.id === id);
      if (account) {
        setBankName(account.bankName);
        setBranchName(account.branchName);
        setAccountType(account.accountType);
        setAccountNumber(account.accountNumber);
        setAccountHolder(account.accountHolder);
        setIsDefault(account.isDefault);
      }
    }
  }, [isNew, id, bankAccounts]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!bankName.trim()) {
      newErrors.bankName = '銀行名を入力してください';
    }

    if (!branchName.trim()) {
      newErrors.branchName = '支店名を入力してください';
    }

    const accountNumberResult = validateAccountNumber(accountNumber);
    if (!accountNumberResult.isValid) {
      newErrors.accountNumber = accountNumberResult.errors[0];
    }

    if (!accountHolder.trim()) {
      newErrors.accountHolder = '口座名義を入力してください';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;

    setLoading(true);
    try {
      if (isNew) {
        const { error } = await createBankAccount({
          bankName,
          branchName,
          accountType,
          accountNumber,
          accountHolder,
          isDefault,
        });

        if (error) {
          Alert.alert('エラー', error);
          return;
        }

        Alert.alert('完了', '口座を登録しました', [
          { text: 'OK', onPress: () => router.back() },
        ]);
      } else {
        const { error } = await updateBankAccount(id!, {
          bankName,
          branchName,
          accountType,
          accountNumber,
          accountHolder,
          isDefault,
        });

        if (error) {
          Alert.alert('エラー', error);
          return;
        }

        Alert.alert('完了', '口座情報を更新しました', [
          { text: 'OK', onPress: () => router.back() },
        ]);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-background"
    >
      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16 }}>
        <Card variant="elevated" padding="lg">
          <View className="gap-4">
            <Input
              label="銀行名"
              placeholder="例: みずほ銀行"
              value={bankName}
              onChangeText={setBankName}
              error={errors.bankName}
              required
            />

            <Input
              label="支店名"
              placeholder="例: 新宿支店"
              value={branchName}
              onChangeText={setBranchName}
              error={errors.branchName}
              required
            />

            <View>
              <Text className="text-sm font-medium text-navy mb-2">
                口座種別 <Text className="text-error">*</Text>
              </Text>
              <View className="flex-row gap-3">
                <Button
                  variant={accountType === '普通' ? 'primary' : 'outline'}
                  onPress={() => setAccountType('普通')}
                  size="md"
                >
                  普通
                </Button>
                <Button
                  variant={accountType === '当座' ? 'primary' : 'outline'}
                  onPress={() => setAccountType('当座')}
                  size="md"
                >
                  当座
                </Button>
              </View>
            </View>

            <Input
              label="口座番号"
              placeholder="1234567"
              value={accountNumber}
              onChangeText={setAccountNumber}
              keyboardType="number-pad"
              maxLength={7}
              error={errors.accountNumber}
              helperText="7桁の数字"
              required
            />

            <Input
              label="口座名義（カナ）"
              placeholder="ヤマダ タロウ"
              value={accountHolder}
              onChangeText={setAccountHolder}
              error={errors.accountHolder}
              required
            />

            {isNew && bankAccounts.length === 0 && (
              <View className="bg-teal-50 rounded-lg p-3">
                <Text className="text-sm text-primary">
                  最初に登録した口座はデフォルトとして設定されます
                </Text>
              </View>
            )}
          </View>
        </Card>

        <View className="mt-6 mb-8">
          <Button onPress={handleSave} loading={loading} fullWidth size="lg">
            {isNew ? '登録する' : '保存する'}
          </Button>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
