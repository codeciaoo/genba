import React, { useState } from 'react';
import { View, Text, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuthContext } from '@/features/auth/context/AuthContext';

export default function RegisterScreen() {
  const router = useRouter();
  const { signUpWithEmail, loading, error } = useAuthContext();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  const handleRegister = async () => {
    setLocalError(null);

    if (password !== confirmPassword) {
      setLocalError('パスワードが一致しません');
      return;
    }

    if (password.length < 6) {
      setLocalError('パスワードは6文字以上で入力してください');
      return;
    }

    const result = await signUpWithEmail(email, password);
    if (!result.error) {
      router.replace('/(tabs)');
    }
  };

  const displayError = localError || error;

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
          {/* ロゴエリア */}
          <View className="items-center mb-12">
            <View className="w-24 h-24 bg-white/20 rounded-2xl items-center justify-center mb-4">
              <Text className="text-4xl font-bold text-white">G</Text>
            </View>
            <Text className="text-3xl font-bold text-white">GENBA GEAR</Text>
            <Text className="text-white/80 mt-2">新規登録</Text>
          </View>

          {/* フォームエリア */}
          <View className="bg-surface rounded-2xl p-6 shadow-lg">
            <Text className="text-xl font-bold text-navy mb-6">アカウント作成</Text>

            {displayError && (
              <View className="bg-error/10 rounded-lg p-3 mb-4">
                <Text className="text-error text-sm">{displayError}</Text>
              </View>
            )}

            <View className="gap-4">
              <Input
                label="メールアドレス"
                placeholder="example@email.com"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
              />

              <Input
                label="パスワード"
                placeholder="6文字以上"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoComplete="new-password"
              />

              <Input
                label="パスワード（確認）"
                placeholder="もう一度入力"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
                autoComplete="new-password"
              />

              <Button
                onPress={handleRegister}
                loading={loading}
                disabled={!email || !password || !confirmPassword}
                fullWidth
                size="lg"
              >
                登録する
              </Button>
            </View>

            <View className="items-center mt-6">
              <Text className="text-gray-500 text-sm">
                すでにアカウントをお持ちの方は
              </Text>
              <Button
                variant="ghost"
                onPress={() => router.back()}
              >
                ログイン
              </Button>
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
