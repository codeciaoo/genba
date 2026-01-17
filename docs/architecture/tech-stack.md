# GENBA GEAR 技術スタック詳細

> 最終更新: 2026-01-17

## 概要

GENBA GEARで採用している技術スタックの詳細と選定理由をまとめます。

---

## 技術スタック一覧

| レイヤー | 技術 | バージョン | 用途 |
|---------|------|-----------|------|
| モバイルアプリ | React Native (Expo) | SDK 50+ | iOS/Androidクロスプラットフォーム |
| ルーティング | Expo Router | v3 | ファイルベースルーティング |
| ローカルDB | WatermelonDB | v0.27+ | オフラインファーストDB |
| バックエンド | Supabase | - | BaaS (Auth, DB, Storage, Functions) |
| データベース | PostgreSQL | 15+ | Supabaseマネージド |
| AI/音声処理 | OpenAI API | - | Whisper + GPT-4o-mini |
| ランディングLP | Astro | v4 | 静的サイト生成（Vercel） |
| Web管理画面 | Remix | v2 | チームプラン向け管理画面（Cloudflare Pages） |
| スタイリング | Tailwind CSS / NativeWind | v3 | ユーティリティファーストCSS |

---

## モバイルアプリ

### React Native (Expo)

**選定理由**:
- iOS/Android同時開発で開発コスト半減
- Expoによるビルド・配信の簡素化
- OTA（Over The Air）アップデート対応
- 豊富なエコシステム（expo-av, expo-location等）

**主要ライブラリ**:

```json
{
  "dependencies": {
    "expo": "~50.0.0",
    "expo-router": "~3.0.0",
    "expo-av": "~13.0.0",           // 音声録音
    "expo-location": "~16.0.0",     // GPS
    "expo-notifications": "~0.27.0", // プッシュ通知
    "expo-print": "~12.0.0",        // PDF生成
    "expo-sharing": "~11.0.0",      // ファイル共有
    "@nozbe/watermelondb": "^0.27.0",
    "@supabase/supabase-js": "^2.0.0",
    "openai": "^4.0.0"
  }
}
```

### Expo Router

**選定理由**:
- ファイルベースルーティングでシンプル
- React Navigation の上に構築
- Deep Link対応が容易

**ルーティング構成**:
```
app/
├── (tabs)/           # タブナビゲーション
│   ├── _layout.tsx   # タブ設定
│   ├── index.tsx     # ホーム
│   ├── reports.tsx   # 日報一覧
│   └── settings.tsx  # 設定
├── voice/
│   └── index.tsx     # 音声入力
├── draft/
│   └── [id].tsx      # 下書き編集
└── _layout.tsx       # ルートレイアウト
```

### WatermelonDB

**選定理由**:
- **オフラインファースト**: SQLiteベースで完全オフライン動作
- **高速同期**: 差分同期で効率的
- **React統合**: Observableパターンでリアクティブ更新
- **スケーラビリティ**: 数万件のレコードでも高速

**vs 他の選択肢**:

| 技術 | 長所 | 短所 | 不採用理由 |
|------|------|------|-----------|
| AsyncStorage | シンプル | 遅い、検索不可 | 大量データに不向き |
| Realm | 高速、同期機能 | ライセンス、MongoDB依存 | ベンダーロックイン |
| SQLite直接 | 柔軟 | React統合が手動 | 開発効率 |
| **WatermelonDB** | オフライン、React統合、高速 | 学習コスト | **採用** |

---

## バックエンド

### Supabase

**選定理由**:
- **オールインワン**: Auth + PostgreSQL + Storage + Edge Functions
- **オープンソース**: ベンダーロックイン回避
- **リアルタイム**: PostgreSQL変更をリアルタイム配信
- **Row Level Security**: データアクセス制御が簡単

**利用サービス**:

| サービス | 用途 |
|---------|------|
| Supabase Auth | ユーザー認証（Magic Link / SMS） |
| PostgreSQL | メインデータベース |
| Storage | 音声ファイル、PDF保存 |
| Edge Functions | AI処理、PDF生成、SMS送信 |
| Realtime | チームプランでの同期 |

**Edge Functions例**:
```typescript
// supabase/functions/process-voice/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import OpenAI from 'openai';

serve(async (req) => {
  const formData = await req.formData();
  const audioFile = formData.get('audio') as File;

  // 1. Whisperで文字起こし
  const transcript = await openai.audio.transcriptions.create({
    file: audioFile,
    model: 'whisper-1',
    language: 'ja',
  });

  // 2. GPT-4o-miniで構造化
  const structured = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: EXTRACTION_PROMPT },
      { role: 'user', content: transcript.text },
    ],
    response_format: { type: 'json_object' },
  });

  return new Response(JSON.stringify({
    transcript: transcript.text,
    data: JSON.parse(structured.choices[0].message.content),
  }));
});
```

---

## AI/音声処理

### OpenAI API

**使用モデル**:

| モデル | 用途 | コスト（目安） |
|--------|------|---------------|
| Whisper | 音声→テキスト | $0.006/分 |
| GPT-4o-mini | テキスト→構造化データ | $0.15/100万トークン |

**騒音耐性対応**:
```typescript
// プロンプトに建設現場の文脈を含める
const transcription = await openai.audio.transcriptions.create({
  file: audioFile,
  model: 'whisper-1',
  language: 'ja',
  prompt: '建設現場の作業報告。エアコン、配管、電気工事。田中邸、佐藤様。',
});
```

**構造化抽出プロンプト**:
```typescript
const EXTRACTION_PROMPT = `
あなたは建設現場の作業報告を構造化データに変換するアシスタントです。

音声入力されたテキストから、以下の情報をJSON形式で出力:
- site_hint: 現場名や顧客名のヒント
- work_items: 作業内容（description, quantity, unit, completed）
- materials: 使用材料
- additional_work: 追加・変更作業
- notes: 備考
- work_time: 作業時間

明示されていない情報は推測せず、nullまたは空配列に。
`;
```

**コスト見積もり（月100回音声入力）**:
| 処理 | 単価 | 1回あたり | 月100回 |
|------|------|----------|---------|
| Whisper (30秒) | $0.006/分 | $0.003 | $0.30 |
| GPT-4o-mini (入力500トークン) | $0.15/100万 | $0.0001 | $0.01 |
| GPT-4o-mini (出力200トークン) | $0.60/100万 | $0.0001 | $0.01 |
| **合計** | | ~$0.003 | **~$0.32** |

---

## フロントエンド（Web）

### Astro（ランディングLP）

**選定理由**:
- **超軽量**: ゼロJavaScriptがデフォルト
- **高速**: 静的サイト生成でLighthouse満点
- **柔軟**: 必要な箇所だけReact/Vue等を使用可能

### Remix v2（Web管理画面）

**選定理由**:
- **Cloudflare最適**: Edge Workersとの相性が抜群
- **Web標準準拠**: Fetch API、FormData等の標準APIベース
- **高速**: エッジでSSR、世界中で低レイテンシ
- **シンプル**: ローダー/アクションパターンで明快なデータフロー

**技術構成**:
```json
{
  "dependencies": {
    "@remix-run/cloudflare": "^2.0.0",
    "@remix-run/cloudflare-pages": "^2.0.0",
    "@remix-run/react": "^2.0.0",
    "@supabase/supabase-js": "^2.0.0",
    "tailwindcss": "^3.0.0",
    "recharts": "^2.0.0"
  }
}
```

---

## スタイリング

### Tailwind CSS / NativeWind

**選定理由**:
- **ユーティリティファースト**: 一貫したスタイリング
- **NativeWind**: React NativeでTailwindが使える
- **デザインシステム統一**: Web/モバイルで同じクラス名

**カラーパレット（GENBA GEAR）**:
```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        // プライマリ: 工具のティールグリーン
        teal: {
          DEFAULT: '#147878',
          light: '#1a9696',
          dark: '#0f5c5c',
        },
        // ベース: 深いネイビー
        navy: {
          DEFAULT: '#1a1f3d',
          light: '#2a3050',
          dark: '#12152b',
        },
        // アクセント: 安全イエロー
        safety: {
          DEFAULT: '#f5a623',
          light: '#ffc107',
        },
      },
    },
  },
};
```

---

## 開発ツール

| カテゴリ | ツール | 用途 |
|---------|--------|------|
| 言語 | TypeScript | 型安全性 |
| パッケージ管理 | npm / pnpm | 依存関係管理 |
| コード品質 | ESLint + Prettier | リンティング・フォーマット |
| テスト | Jest + React Testing Library | ユニット・統合テスト |
| E2Eテスト | Detox / Maestro | モバイルE2E |
| CI/CD | GitHub Actions | 自動ビルド・テスト |
| モバイルビルド | EAS Build | Expoクラウドビルド |

---

## インフラ構成

```
┌───────────────────────┐    ┌───────────────────────┐
│        Vercel         │    │   Cloudflare Pages    │
│  ┌─────────────────┐  │    │  ┌─────────────────┐  │
│  │       LP        │  │    │  │    管理画面      │  │
│  │     Astro       │  │    │  │     Remix       │  │
│  └─────────────────┘  │    │  └─────────────────┘  │
└───────────────────────┘    └───────────────────────┘
              │                          │
              └──────────┬───────────────┘
                         ▼
┌─────────────────────────────────────────────────┐
│                   Supabase                       │
│  ┌─────────┐  ┌─────────┐  ┌─────────────────┐  │
│  │  Auth   │  │ Storage │  │ Edge Functions  │  │
│  └─────────┘  └─────────┘  └─────────────────┘  │
│                    │                             │
│            ┌───────▼───────┐                    │
│            │  PostgreSQL   │                    │
│            │   (RLS有効)   │                    │
│            └───────────────┘                    │
└─────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────┐
│                  外部サービス                     │
│  ┌─────────┐  ┌─────────────┐  ┌─────────────┐  │
│  │ OpenAI  │  │ OpenWeather │  │   Twilio    │  │
│  │   API   │  │     API     │  │  (SMS/v1.1) │  │
│  └─────────┘  └─────────────┘  └─────────────┘  │
└─────────────────────────────────────────────────┘
```

---

## 環境変数

```bash
# .env.local（クライアント）
EXPO_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=xxx

# Supabase Edge Functions
OPENAI_API_KEY=sk-xxx
WEATHER_API_KEY=xxx
TWILIO_ACCOUNT_SID=xxx
TWILIO_AUTH_TOKEN=xxx
```

---

## 関連ドキュメント

- [アーキテクチャ概要](./README.md)
- [システム構成図](./system-diagram.md)
- [データモデル](/.claude/skills/genba-app-architecture/references/data-model.md)
- [オフライン同期](/.claude/skills/genba-app-architecture/references/offline-sync.md)
