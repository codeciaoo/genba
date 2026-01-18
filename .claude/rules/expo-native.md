---
paths:
  - "genba-gear/app/**/*.tsx"
  - "genba-gear/src/**/*.tsx"
  - "genba-gear/src/**/*.ts"
---

# Expo / React Native 開発ルール

## NativeWindスタイリング

```tsx
// ✅ className を使用
<View className="flex-1 bg-background p-4">
  <Text className="text-lg font-bold text-navy">タイトル</Text>
</View>

// ❌ StyleSheet は避ける（既存コードとの一貫性のため）
const styles = StyleSheet.create({ ... });
```

## プラットフォーム分岐

```typescript
import { Platform } from 'react-native';

// Web SSR対応
if (Platform.OS === 'web') {
  if (typeof window !== 'undefined' && window.localStorage) {
    // ブラウザ環境のみ
  }
} else {
  // ネイティブ環境
  await SecureStore.setItemAsync(key, value);
}
```

## UIコンポーネント使用

```tsx
// 共通コンポーネントを使用
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';

// ボタンは最小44px（職人の指で押せるサイズ）
<Button size="lg" variant="primary">保存</Button>
```

## Expo Router ナビゲーション

```tsx
import { useRouter, useLocalSearchParams } from 'expo-router';

const router = useRouter();

// 画面遷移
router.push('/voice');
router.replace('/(tabs)');
router.back();

// パラメータ取得
const { id } = useLocalSearchParams<{ id: string }>();
```

## 音声・権限

```typescript
import { Audio } from 'expo-av';
import * as Location from 'expo-location';

// 権限リクエストは使用直前に
const { status } = await Audio.requestPermissionsAsync();
if (status !== 'granted') {
  // ユーザーにわかりやすく説明
}
```
