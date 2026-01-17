import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { useAuthContext } from '@/features/auth/context/AuthContext';
import { supabase } from '@/services/supabase/client';
import {
  validateBusinessName,
  validateInvoiceNumber,
  validatePostalCode,
  validatePhone,
} from '@/features/auth/domain/validation';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, businessProfile, loadingProfile } = useAuthContext();

  const [businessName, setBusinessName] = useState('');
  const [representativeName, setRepresentativeName] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // プロファイル情報をフォームに設定
  useEffect(() => {
    if (businessProfile) {
      setBusinessName(businessProfile.businessName || '');
      setRepresentativeName(businessProfile.representativeName || '');
      setPostalCode(businessProfile.postalCode || '');
      setAddress(businessProfile.address || '');
      setPhone(businessProfile.phone || '');
      setEmail(businessProfile.email || '');
      setInvoiceNumber(businessProfile.invoiceRegistrationNumber || '');
    }
  }, [businessProfile]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    const businessNameResult = validateBusinessName(businessName);
    if (!businessNameResult.isValid) {
      newErrors.businessName = businessNameResult.errors[0];
    }

    if (postalCode) {
      const postalResult = validatePostalCode(postalCode);
      if (!postalResult.isValid) {
        newErrors.postalCode = postalResult.errors[0];
      }
    }

    if (phone) {
      const phoneResult = validatePhone(phone);
      if (!phoneResult.isValid) {
        newErrors.phone = phoneResult.errors[0];
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

  const handleSave = async () => {
    if (!validate()) return;
    if (!user) {
      Alert.alert('エラー', 'ユーザー情報が取得できませんでした');
      return;
    }

    setLoading(true);
    try {
      const updateData = {
        business_name: businessName,
        representative_name: representativeName || null,
        postal_code: postalCode || null,
        address: address || null,
        phone: phone || null,
        email: email || null,
        invoice_registration_number: invoiceNumber || null,
      };

      const { error } = await supabase
        .from('business_profiles')
        .update(updateData)
        .eq('user_id', user.id);

      if (error) {
        throw error;
      }

      Alert.alert('完了', '事業者情報を更新しました', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('エラー', '更新に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  if (loadingProfile) {
    return (
      <View className="flex-1 bg-background items-center justify-center">
        <Text className="text-gray-500">読み込み中...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-background"
    >
      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16 }}>
        <Card variant="elevated" padding="lg">
          <View className="gap-4">
            <Input
              label="屋号（事業者名）"
              placeholder="例: 山田電気工事"
              value={businessName}
              onChangeText={setBusinessName}
              error={errors.businessName}
              required
            />

            <Input
              label="代表者名"
              placeholder="山田 太郎"
              value={representativeName}
              onChangeText={setRepresentativeName}
            />

            <View className="border-b border-gray-200 my-2" />

            <Input
              label="郵便番号"
              placeholder="123-4567"
              value={postalCode}
              onChangeText={setPostalCode}
              keyboardType="number-pad"
              error={errors.postalCode}
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
              label="電話番号"
              placeholder="090-1234-5678"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              error={errors.phone}
            />

            <Input
              label="メールアドレス"
              placeholder="example@email.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <View className="border-b border-gray-200 my-2" />

            <View className="bg-teal-50 rounded-lg p-4 mb-2">
              <Text className="text-sm font-medium text-primary mb-1">
                インボイス制度対応
              </Text>
              <Text className="text-xs text-gray-600">
                適格請求書発行事業者の場合は登録番号を入力してください
              </Text>
            </View>

            <Input
              label="インボイス登録番号"
              placeholder="T1234567890123"
              value={invoiceNumber}
              onChangeText={setInvoiceNumber}
              autoCapitalize="characters"
              error={errors.invoiceNumber}
              helperText="T＋13桁の数字"
            />
          </View>
        </Card>

        <View className="mt-6 mb-8">
          <Button onPress={handleSave} loading={loading} fullWidth size="lg">
            保存
          </Button>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
