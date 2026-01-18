# React Native UIコンポーネント

## 概要

`src/components/ui/`に配置された共通UIコンポーネント。
NativeWindでTailwind CSSクラスを使用。

---

## Button

```tsx
import { Button } from '@/components/ui/Button';

<Button
  variant="primary"     // "primary" | "secondary" | "outline" | "ghost" | "warning"
  size="lg"             // "sm" | "md" | "lg"
  fullWidth={false}     // boolean
  loading={false}       // boolean - ローディング状態
  disabled={false}      // boolean
  leftIcon={<Icon />}   // ReactNode
  rightIcon={<Icon />}  // ReactNode
  className=""          // string - 追加スタイル
  onPress={() => {}}    // 押下ハンドラ
>
  ボタンテキスト
</Button>
```

### バリアント

| variant | 用途 |
|---------|------|
| primary | メインアクション（保存、送信） |
| secondary | サブアクション |
| outline | キャンセル、戻る |
| ghost | テキストリンク風 |
| warning | 削除、注意が必要な操作 |

### サイズ

| size | 高さ | 用途 |
|------|------|------|
| sm | 36px | 補助的なボタン |
| md | 44px | 通常 |
| lg | 56px | メインCTA（推奨） |

---

## Card

```tsx
import { Card } from '@/components/ui/Card';

<Card
  variant="elevated"   // "default" | "elevated" | "outlined"
  padding="lg"         // "none" | "sm" | "md" | "lg"
  onPress={() => {}}   // タップ可能にする場合
  className=""
>
  <Text>カード内容</Text>
</Card>
```

### バリアント

| variant | スタイル |
|---------|---------|
| default | 背景色 + 薄いボーダー |
| elevated | 背景色 + シャドウ |
| outlined | 透明 + 太めボーダー |

---

## Input

```tsx
import { Input } from '@/components/ui/Input';

<Input
  label="メールアドレス"
  placeholder="example@email.com"
  value={value}
  onChangeText={setValue}
  error="無効なメールアドレスです"  // エラーメッセージ
  secureTextEntry={false}           // パスワード入力
  keyboardType="email-address"      // キーボードタイプ
  autoCapitalize="none"
  className=""
/>
```

---

## Badge

```tsx
import { Badge } from '@/components/ui/Badge';

<Badge
  variant="info"      // "default" | "primary" | "success" | "warning" | "error" | "info"
  size="md"           // "sm" | "md" | "lg"
  className=""
>
  0件
</Badge>
```

### バリアント

| variant | 用途 |
|---------|------|
| default | ニュートラル |
| primary | 強調 |
| success | 完了、同期済み |
| warning | 未同期、注意 |
| error | エラー |
| info | 情報 |

---

## 使用例

### ホーム画面カード

```tsx
<Card variant="elevated" padding="lg">
  <View className="flex-row items-center justify-between mb-3">
    <Text className="text-lg font-bold text-navy">今日の予定</Text>
    <Badge variant="info">0件</Badge>
  </View>
  <Text className="text-gray-500">
    まだ今日の現場がありません
  </Text>
</Card>
```

### 音声入力ボタン

```tsx
<TouchableOpacity
  onPress={handleVoiceInput}
  className="w-20 h-20 bg-primary rounded-full items-center justify-center shadow-lg"
  activeOpacity={0.8}
>
  <FontAwesome name="microphone" size={36} color="#ffffff" />
</TouchableOpacity>
```

### フォーム

```tsx
<View className="gap-4">
  <Input
    label="メールアドレス"
    placeholder="example@email.com"
    value={email}
    onChangeText={setEmail}
    keyboardType="email-address"
    autoCapitalize="none"
  />
  <Input
    label="パスワード"
    placeholder="パスワードを入力"
    value={password}
    onChangeText={setPassword}
    secureTextEntry
  />
  <Button variant="primary" size="lg" fullWidth onPress={handleLogin}>
    ログイン
  </Button>
</View>
```

---

## Tailwindカラー（tailwind.config.js）

```javascript
colors: {
  primary: {
    DEFAULT: '#147878',
    dark: '#0d4f4f',
    light: '#1a9e9e',
  },
  navy: {
    DEFAULT: '#1a1f3d',
    700: '#2d3561',
    500: '#4a5286',
  },
  warning: '#f5c518',
  background: '#f5f5f5',
  surface: '#fafafa',
}
```
