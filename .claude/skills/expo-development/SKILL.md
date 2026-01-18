---
name: expo-development
description: Expo/React Native開発のトラブルシューティングと開発ガイド。Metro bundlerエラー、モジュール解決エラー、iOSシミュレーター問題、Expo Go更新など開発時の問題解決に使用。
invocationKeywords:
  - expo
  - metro
  - react native
  - シミュレーター
  - bundler
  - module resolve
  - Unable to resolve
---

# Expo開発ガイド

## クイックリファレンス

### 開発サーバー起動

```bash
cd genba-gear

# 通常起動
npx expo start

# キャッシュクリアして起動（問題発生時）
npx expo start --clear

# プラットフォーム指定
npx expo start --ios
npx expo start --android
npx expo start --web
```

### 動作確認の順序

1. **Web版で先に確認** - モジュールエラーを素早く発見
2. **iOSシミュレーター** - Expo Goで確認
3. **実機テスト** - 最終確認

---

## トラブルシューティング

詳細は [TROUBLESHOOTING.md](TROUBLESHOOTING.md) を参照。

### よくあるエラー

| エラー | 原因 | 解決法 |
|--------|------|--------|
| Unable to resolve module @/xxx | babel-plugin-module-resolver未設定 | babel.config.jsにmodule-resolver追加 |
| Definitely assigned fields... | WatermelonDBデコレータ設定不備 | class-propertiesにloose:true設定 |
| Could not connect to server | Metro未起動/ポート競合 | ポート確認、プロセス再起動 |
| Expo Go version mismatch | SDK/Expo Go不整合 | `npx expo start --ios`で自動更新 |
| localStorage is not defined | Web SSR問題 | `typeof window !== 'undefined'`チェック |

### 緊急リセット

```bash
# 全キャッシュクリア
rm -rf node_modules/.cache .expo
npx expo start --clear
```

---

## 設定ファイル

### babel.config.js 必須設定

```javascript
module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ['babel-preset-expo', { jsxImportSource: 'nativewind' }],
      'nativewind/babel',
    ],
    plugins: [
      // WatermelonDBデコレータ対応
      ['@babel/plugin-proposal-decorators', { legacy: true }],
      ['@babel/plugin-transform-class-properties', { loose: true }],
      // パスエイリアス対応（@/ → ./src/）
      [
        'module-resolver',
        {
          root: ['./'],
          alias: {
            '@': './src',
          },
        },
      ],
      // Reanimatedは必ず最後
      'react-native-reanimated/plugin',
    ],
  };
};
```

**必要なパッケージ:**
```bash
npm install --save-dev babel-plugin-module-resolver
```

### tsconfig.json パスエイリアス

```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

### app.json 必須設定

```json
{
  "expo": {
    "ios": {
      "bundleIdentifier": "com.genbagear.app"
    },
    "android": {
      "package": "com.genbagear.app"
    }
  }
}
```

---

## iOSシミュレーター

### Expo Go確認

```bash
# 起動中のシミュレーター確認
xcrun simctl list devices | grep Booted

# インストール済みアプリ確認
xcrun simctl listapps <UDID> | grep -i expo
```

### スクリーンショット取得

```bash
xcrun simctl io <UDID> screenshot /tmp/screenshot.png
```
