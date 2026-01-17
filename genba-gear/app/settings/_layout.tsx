import { Stack } from 'expo-router';

export default function SettingsLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: '#147878',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: '600',
        },
      }}
    >
      <Stack.Screen
        name="profile"
        options={{
          title: '事業者情報',
        }}
      />
      <Stack.Screen
        name="bank-accounts/index"
        options={{
          title: '振込先口座',
        }}
      />
      <Stack.Screen
        name="bank-accounts/[id]"
        options={{
          title: '口座編集',
        }}
      />
      <Stack.Screen
        name="templates/index"
        options={{
          title: '品目テンプレート',
        }}
      />
      <Stack.Screen
        name="templates/[id]"
        options={{
          title: '品目編集',
        }}
      />
    </Stack>
  );
}
