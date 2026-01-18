# Expoトラブルシューティング詳細

## モジュール解決エラー

### 症状

```
Unable to resolve module @/components/xxx from /path/to/file.tsx
```

### 原因と解決

1. **babel-plugin-module-resolver の設定確認（最重要）**

   tsconfig.json のパスエイリアスだけでは Metro は認識しない。
   babel.config.js に module-resolver の設定が必須。

   ```javascript
   // babel.config.js
   plugins: [
     [
       'module-resolver',
       {
         root: ['./'],
         alias: {
           '@': './src',
         },
       },
     ],
   ],
   ```

   ```bash
   # 未インストールの場合
   npm install --save-dev babel-plugin-module-resolver
   ```

2. **tsconfig.jsonの設定確認**
   ```json
   {
     "compilerOptions": {
       "paths": {
         "@/*": ["./src/*"]
       }
     }
   }
   ```

3. **ファイルが実際に存在するか確認**
   ```bash
   ls -la genba-gear/src/components/ui/
   ```

4. **Metroキャッシュクリア**
   ```bash
   rm -rf node_modules/.cache .expo
   npx expo start --clear
   ```

5. **インポートパスの修正**
   ```typescript
   // ✅ 正しい（@/は./src/を指す）
   import { Button } from '@/components/ui/Button';

   // ❌ 間違い
   import { Button } from '@/src/components/ui/Button';
   ```

---

## WatermelonDBデコレータエラー

### 症状

```
Definitely assigned fields cannot be initialized here, but only in the constructor
```

### 原因

WatermelonDBのモデルでデコレータ（`@text`, `@field`等）と `!:` (definite assignment assertion) を使用する場合、Babelの設定が必要。

### 解決

```javascript
// babel.config.js
plugins: [
  ['@babel/plugin-proposal-decorators', { legacy: true }],
  ['@babel/plugin-transform-class-properties', { loose: true }],  // ← これが必須
  // ... 他のプラグイン
],
```

**重要**: プラグインの順序に注意。decorators → class-properties の順。

---

## Metro Bundler問題

### ポート競合

```bash
# 使用中のポート確認
lsof -i :8081 | grep LISTEN

# プロセス強制終了
pkill -f "expo start"

# 別ポートで起動
npx expo start --port 8082
```

### キャッシュ問題

```bash
# 段階的クリア
rm -rf node_modules/.cache    # Metroキャッシュ
rm -rf .expo                  # Expo設定キャッシュ
npx expo start --clear        # 起動時クリア

# 最終手段
rm -rf node_modules
npm install
npx expo start --clear
```

---

## Expo Go問題

### バージョン不整合

```
Project is incompatible with this version of Expo Go
```

**解決法:**
```bash
# 自動で最新Expo Goをインストール
npx expo start --ios
```

### 接続できない

```
Could not connect to the server
```

**チェックリスト:**
1. Metroが起動しているか
2. 正しいポートか（デフォルト8081）
3. ファイアウォール設定

```bash
# サーバー確認
curl http://localhost:8081/status

# シミュレーターから接続
xcrun simctl openurl <UDID> "exp://127.0.0.1:8081"
```

---

## Web SSR問題

### localStorage is not defined

**症状:** Webビルド時にサーバーサイドでlocalStorageアクセスエラー

**解決:**
```typescript
// services/supabase/client.ts
const ExpoSecureStoreAdapter = {
  getItem: async (key: string) => {
    if (Platform.OS === 'web') {
      // SSR対応: windowの存在確認
      if (typeof window !== 'undefined' && window.localStorage) {
        return localStorage.getItem(key);
      }
      return null;
    }
    return SecureStore.getItemAsync(key);
  },
  // setItem, removeItem も同様
};
```

---

## NativeWind問題

### スタイルが適用されない

1. **global.css のインポート確認**
   ```typescript
   // app/_layout.tsx
   import '../global.css';
   ```

2. **tailwind.config.js の content 確認**
   ```javascript
   content: [
     "./app/**/*.{js,jsx,ts,tsx}",
     "./src/**/*.{js,jsx,ts,tsx}",
   ],
   ```

3. **Metro再起動**
   ```bash
   npx expo start --clear
   ```

---

## デバッグ手順

### 1. 最小限の確認

```bash
# Web版が動くか確認（最も素早くエラーを発見）
npx expo start --web
```

### 2. ログ確認

```bash
# Metro bundlerログ
npx expo start 2>&1 | tee /tmp/expo.log

# iOSシミュレーターのスクリーンショット
xcrun simctl io <UDID> screenshot /tmp/ios.png
```

### 3. 段階的デバッグ

1. エラーメッセージを正確に読む
2. 該当ファイルを特定
3. インポートパスを確認
4. ファイルの存在を確認
5. キャッシュクリアして再試行
