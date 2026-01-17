import React, { useState } from 'react';
import { View, Text, Image, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuthContext } from '@/features/auth/context/AuthContext';

export default function LoginScreen() {
  const router = useRouter();
  const { signInWithEmail, loading, error } = useAuthContext();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async () => {
    const result = await signInWithEmail(email, password);
    if (!result.error) {
      router.replace('/(tabs)');
    }
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
          {/* ロゴエリア */}
          <View className="items-center mb-12">
            <View className="w-24 h-24 bg-white/20 rounded-2xl items-center justify-center mb-4">
              <Text className="text-4xl font-bold text-white">G</Text>
            </View>
            <Text className="text-3xl font-bold text-white">GENBA GEAR</Text>
            <Text className="text-white/80 mt-2">AIポケット事務員</Text>
          </View>

          {/* フォームエリア */}
          <View className="bg-surface rounded-2xl p-6 shadow-lg">
            <Text className="text-xl font-bold text-navy mb-6">ログイン</Text>

            {error && (
              <View className="bg-error/10 rounded-lg p-3 mb-4">
                <Text className="text-error text-sm">{error}</Text>
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
                placeholder="パスワードを入力"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoComplete="password"
              />

              <Button
                onPress={handleLogin}
                loading={loading}
                disabled={!email || !password}
                fullWidth
                size="lg"
              >
                ログイン
              </Button>
            </View>

            <View className="items-center mt-6">
              <Text className="text-gray-500 text-sm">
                アカウントをお持ちでない方は
              </Text>
              <Button
                variant="ghost"
                onPress={() => router.push('/auth/register')}
              >
                新規登録
              </Button>
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
