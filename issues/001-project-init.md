# #001 プロジェクト初期化・基盤構築

## 概要

React Native (Expo) プロジェクトの初期化と基盤構築を行う。

## ステータス

🔵 Todo

## 優先度

P0（MVP必須）

## 依存

なし

## 参照スキル

- `genba-app-architecture` - 全体アーキテクチャ・ディレクトリ構成

## 技術スタック

- React Native (Expo SDK 52+)
- TypeScript
- NativeWind (Tailwind CSS for RN)
- Expo Router

## タスク

### 1. Expoプロジェクト作成

```bash
npx create-expo-app@latest genba-gear --template tabs
cd genba-gear
```

### 2. 必要パッケージインストール

```bash
# NativeWind (Tailwind CSS)
npx expo install nativewind tailwindcss

# ナビゲーション
npx expo install expo-router expo-linking expo-constants expo-status-bar

# ストレージ・認証
npx expo install @supabase/supabase-js expo-secure-store

# 音声・位置情報
npx expo install expo-av expo-location expo-file-system

# UI補助
npx expo install expo-haptics expo-linear-gradient
```

### 3. ディレクトリ構成

```
genba-gear/
├── app/                      # Expo Router
│   ├── (tabs)/
│   │   ├── index.tsx         # ホーム（今日の現場）
│   │   ├── reports.tsx       # 日報一覧
│   │   ├── customers.tsx     # 顧客カルテ
│   │   └── settings.tsx      # 設定
│   ├── voice/                # 音声入力画面
│   ├── draft/[id].tsx        # 下書き確認
│   ├── report/[id].tsx       # 日報詳細
│   └── _layout.tsx
├── src/
│   ├── components/
│   │   ├── ui/               # Button, Card, Input等
│   │   └── voice/            # VoiceRecorder等
│   ├── features/
│   │   ├── voice/            # 騒音耐性AIボイス入力
│   │   ├── report/           # 日報生成
│   │   ├── customer/         # 顧客カルテ
│   │   └── safety/           # 安全アラート
│   ├── database/
│   ├── services/
│   ├── hooks/
│   ├── utils/
│   └── constants/
├── assets/
└── supabase/
```

### 4. Tailwind設定

```javascript
// tailwind.config.js
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: '#147878', dark: '#0d5454', light: '#1a9e9e' },
        navy: { DEFAULT: '#1a1f3d', light: '#2a3050' },
        background: '#f5f5f5',
        surface: '#ffffff',
        success: '#2d8a4e',
        warning: '#c77700',
        error: '#c73b3b',
      },
    },
  },
};
```

### 5. 基本UIコンポーネント

| コンポーネント | 説明 |
|--------------|------|
| `Button` | プライマリ/セカンダリボタン |
| `Card` | カードコンテナ |
| `Input` | テキスト入力 |
| `Badge` | ステータスバッジ |

## 実行コマンド

```bash
# 指示文
genba-app-architectureスキルを参照して、
Expoプロジェクトを初期化し、基盤を構築してください。

作成場所: /Users/tsubasatahara/dev/codeciao/genba/genba-gear

完了後:
cd /Users/tsubasatahara/dev/codeciao/genba/genba-gear
npx expo start
```

## 完了条件

- [ ] Expoプロジェクトが作成されている
- [ ] 必要パッケージがインストールされている
- [ ] ディレクトリ構成が整っている
- [ ] NativeWindが動作している
- [ ] 基本UIコンポーネントが作成されている
- [ ] `npx expo start`でアプリが起動する
