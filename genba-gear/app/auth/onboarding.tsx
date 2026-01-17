import React, { useState } from 'react';
import { View, Text, KeyboardAvoidingView, Platform, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuthContext } from '@/features/auth/context/AuthContext';
import { supabase } from '@/services/supabase/client';
import { validateInvoiceNumber, validatePostalCode } from '@/features/auth/domain/validation';

export default function OnboardingScreen() {
  const router = useRouter();
  const { user, refreshSession } = useAuthContext();
  const [address, setAddress] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (postalCode) {
      const postalResult = validatePostalCode(postalCode);
      if (!postalResult.isValid) {
        newErrors.postalCode = postalResult.errors[0];
      }
    }

    if (invoiceNumber) {
      const invoiceResult = validateInvoiceNumber(invoiceNumber);
      if (!invoiceResult.isValid) {
        newErrors.invoiceNumber = invoiceResult.errors[0];
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleComplete = async () => {
    if (!validate()) return;
    if (!user) {
      Alert.alert('エラー', 'ユーザー情報が取得できませんでした');
      return;
    }

    setLoading(true);
    try {
      const updateData: Record<string, string> = {};
      if (address) updateData.address = address;
      if (postalCode) updateData.postal_code = postalCode;
      if (invoiceNumber) updateData.invoice_registration_number = invoiceNumber;

      if (Object.keys(updateData).length > 0) {
        const { error } = await supabase
          .from('business_profiles')
          .update(updateData)
          .eq('user_id', user.id);

        if (error) {
          throw error;
        }
      }

      await refreshSession();
      router.replace('/(tabs)');
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('エラー', 'プロファイルの更新に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    router.replace('/(tabs)');
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-primary"
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="flex-1 justify-center px-6 py-12">
          {/* ヘッダーエリア */}
          <View className="items-center mb-8">
            <View className="w-20 h-20 bg-white/20 rounded-full items-center justify-center mb-4">
              <Text className="text-3xl">🎉</Text>
            </View>
            <Text className="text-2xl font-bold text-white">登録完了</Text>
            <Text className="text-white/80 mt-2 text-center">
              あと少しで準備完了です{'\n'}
              任意の情報を入力してください
            </Text>
          </View>

          {/* フォームエリア */}
          <View className="bg-surface rounded-2xl p-6 shadow-lg">
            <Text className="text-xl font-bold text-navy mb-2">初期設定</Text>
            <Text className="text-sm text-gray-500 mb-6">
              後から設定画面で変更できます
            </Text>

            <View className="gap-4">
              <Input
                label="郵便番号"
                placeholder="123-4567"
                value={postalCode}
                onChangeText={setPostalCode}
                keyboardType="number-pad"
                error={errors.postalCode}
                helperText="ハイフンあり/なしどちらでもOK"
              />

              <Input
                label="住所"
                placeholder="東京都○○区..."
                value={address}
                onChangeText={setAddress}
                multiline
                numberOfLines={2}
              />

              <Input
                label="インボイス登録番号"
                placeholder="T1234567890123"
                value={invoiceNumber}
                onChangeText={setInvoiceNumber}
                autoCapitalize="characters"
                error={errors.invoiceNumber}
                helperText="適格請求書発行事業者の場合"
              />

              <View className="mt-4 gap-3">
                <Button
                  onPress={handleComplete}
                  loading={loading}
                  fullWidth
                  size="lg"
                >
                  設定して始める
                </Button>

                <Button
                  variant="ghost"
                  onPress={handleSkip}
                  disabled={loading}
                  fullWidth
                >
                  あとで設定する
                </Button>
              </View>
            </View>
          </View>

          {/* 説明テキスト */}
          <View className="mt-6 px-4">
            <Text className="text-white/60 text-sm text-center">
              インボイス登録番号を設定すると{'\n'}
              請求書に自動で記載されます
            </Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
