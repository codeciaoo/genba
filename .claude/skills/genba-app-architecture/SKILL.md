---
name: genba-app-architecture
description: 「GENBA GEAR」アプリの設計・アーキテクチャガイド。技術選定、ディレクトリ構成、データモデル、機能要件の設計判断に使用。実装コードは genba-implementation-guide を参照。
---

# GENBA GEAR アーキテクチャ設計

## 1. プロダクト概要

### 1.1 コンセプト

**GENBA GEAR** - 建設現場職人向けAIポケット事務員アプリ

> 「AIがあなたのポケット事務員に。喋るだけで日報・請求書が完成！」

### 1.2 ターゲットユーザー

| プラン | 対象 | 価格 |
|--------|------|------|
| **個人プラン** | 個人事業主・一人親方 | 無料 |
| **チームプラン** | 中規模チーム（5-50人） | 月額¥3,000 |

### 1.3 解決する課題

```
課題                          → 解決策
─────────────────────────────────────────────────────
汚れた手でスマホ入力が面倒     → 騒音耐性AIボイス入力
騒音下でメモ取り、ミスが怖い   → AI文字起こし＋構造化
日報作成で残業が増える         → GPS/天気統合で1タップ日報
請求書作成が手間               → 日報から自動生成
チームの報告集約が大変         → チーム集約サマリー
圏外現場でアプリが使えない     → オフラインファースト設計
```

---

## 2. 機能マップ

### 2.1 フェーズ別機能一覧

```
┌─────────────────────────────────────────────────────────────┐
│ MVP (P0)                                                    │
├─────────────────────────────────────────────────────────────┤
│ ✅ 騒音耐性AIボイス入力                                      │
│    - マイク1タップ録音（3-30秒）                             │
│    - Whisper騒音フィルタリング                               │
│    - GPT-4o-mini構造化                                       │
│                                                             │
│ ✅ 簡易日報生成                                              │
│    - GPS/天気自動取得                                        │
│    - 法規準拠PDF出力                                         │
│    - タイムスタンプ署名                                      │
│                                                             │
│ ✅ 請求書自動生成                                            │
│    - 日報→請求書変換                                         │
│    - インボイス制度対応                                      │
│    - PDF出力・共有                                           │
├─────────────────────────────────────────────────────────────┤
│ v1.1 (P1)                                                   │
├─────────────────────────────────────────────────────────────┤
│ ○ GPS自動通知                                               │
│    - 現場500m検知→SMS送信                                    │
│                                                             │
│ ○ 軽量顧客カルテ                                            │
│    - 声検索、写真/メモ、AI要約                               │
│                                                             │
│ ○ 熱中症/安全アラート                                       │
│    - 35℃以上で警報                                          │
├─────────────────────────────────────────────────────────────┤
│ v2 (P2)                                                     │
├─────────────────────────────────────────────────────────────┤
│ △ チームプラン機能                                          │
│    - チーム管理、権限、集約レポート                          │
│                                                             │
│ △ 即時スマホ決済                                            │
│    - Stripe連携、QR決済                                      │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 機能別プラン対応

| 機能 | 個人（無料） | チーム（¥3,000） |
|------|-------------|------------------|
| ボイス入力 | ✅ | ✅ 共有可 |
| 日報生成 | ✅ | ✅ 集約サマリー |
| 請求書生成 | ✅ | ✅ |
| GPS通知 | 施主へ通知 | チーム共有 |
| 顧客カルテ | ローカル保存 | アクセス権限管理 |
| 安全アラート | 単独通知 | 一括通知 |

---

## 3. 技術スタック

### 3.1 選定技術

```
┌─────────────────────────────────────────────────────────────┐
│                      GENBA GEAR                             │
├─────────────────────────────────────────────────────────────┤
│  UI Layer                                                   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  React Native (Expo SDK 52+)                        │   │
│  │  + Expo Router (ファイルベースルーティング)          │   │
│  │  + NativeWind (Tailwind CSS)                        │   │
│  └─────────────────────────────────────────────────────┘   │
│                          ↓                                  │
│  Data Layer                                                 │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  WatermelonDB (ローカルDB)                          │   │
│  │  - SQLiteベース                                      │   │
│  │  - オフライン優先                                    │   │
│  │  - 高速同期                                          │   │
│  └─────────────────────────────────────────────────────┘   │
│                          ↕ 同期                             │
│  Backend Layer                                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Supabase                                           │   │
│  │  - PostgreSQL (データベース)                         │   │
│  │  - Auth (認証)                                       │   │
│  │  - Storage (ファイル保存)                            │   │
│  │  - Edge Functions (サーバーレス処理)                 │   │
│  └─────────────────────────────────────────────────────┘   │
│                          ↓                                  │
│  AI Layer                                                   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  OpenAI API                                         │   │
│  │  - Whisper (騒音フィルタリング文字起こし)            │   │
│  │  - GPT-4o-mini (構造化、要約)                        │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  External Services                                          │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  - Expo Location (GPS)                              │   │
│  │  - OpenWeatherMap (天気)                            │   │
│  │  - Expo Notifications (プッシュ通知)                │   │
│  │  - Stripe (決済) [v2]                               │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 技術選定理由

| 技術 | 選定理由 | 代替案との比較 |
|------|---------|---------------|
| **React Native (Expo)** | クロスプラットフォーム、Expo Router、豊富なライブラリ | Flutter: Dart習得コスト |
| **WatermelonDB** | オフライン優先、SQLite互換、高速同期 | Realm: ライセンス懸念 |
| **Supabase** | PostgreSQL、RLS、Edge Functions、低コスト | Firebase: 従量課金が読みにくい |
| **OpenAI** | Whisperの日本語精度、GPT-4o-miniのコスパ | Google Speech: 騒音処理が弱い |

### 3.3 UIライブラリ・ツール選定

#### モバイルアプリ（React Native）

| カテゴリ | ライブラリ | バージョン | 選定理由 |
|---------|-----------|-----------|---------|
| **スタイリング** | NativeWind | v4+ | Tailwind CSS構文、Web管理画面と統一 |
| **UIコンポーネント** | 自作 + NativeWind | - | デザインシステムに完全準拠するため自作 |
| **アイコン** | Lucide React Native | latest | 軽量、一貫したデザイン、Web版と統一 |
| **フォーム** | React Hook Form | v7+ | 軽量、パフォーマンス良好 |
| **バリデーション** | Zod | v3+ | TypeScript型推論、軽量 |
| **日付** | date-fns | v3+ | 軽量、Tree-shaking対応 |
| **PDF生成** | react-native-pdf-lib | latest | ローカルPDF生成 |
| **アニメーション** | React Native Reanimated | v3+ | 高パフォーマンス |

```
モバイルアプリ UIスタック:
┌─────────────────────────────────────────────────────────────┐
│  React Native (Expo SDK 52+)                                │
├─────────────────────────────────────────────────────────────┤
│  NativeWind v4 (Tailwind CSS)                               │
│  └── デザイントークン: genba-design-system準拠               │
├─────────────────────────────────────────────────────────────┤
│  自作コンポーネント (src/components/ui/)                     │
│  ├── Button, Card, Input, Badge, Modal                      │
│  ├── VoiceRecorder, WaveformVisualizer                      │
│  └── ReportCard, InvoiceCard                                │
├─────────────────────────────────────────────────────────────┤
│  Lucide Icons + React Hook Form + Zod                       │
└─────────────────────────────────────────────────────────────┘
```

#### Web管理画面（Next.js）

| カテゴリ | ライブラリ | バージョン | 選定理由 |
|---------|-----------|-----------|---------|
| **フレームワーク** | Next.js | v14+ (App Router) | SSR、Server Actions、Vercelデプロイ |
| **スタイリング** | Tailwind CSS | v3.4+ | モバイルアプリと統一 |
| **UIコンポーネント** | shadcn/ui | latest | コピペ可能、カスタマイズ容易、Radix UI基盤 |
| **アイコン** | Lucide React | latest | shadcn/uiデフォルト、モバイルと統一 |
| **フォーム** | React Hook Form | v7+ | Server Actionsと相性良い |
| **バリデーション** | Zod | v3+ | Server Actions型安全 |
| **グラフ** | Recharts | v2+ | シンプル、軽量、React専用 |
| **テーブル** | TanStack Table | v8+ | shadcn/ui統合済み |
| **日付ピッカー** | react-day-picker | v8+ | shadcn/ui統合済み |
| **トースト** | Sonner | latest | shadcn/ui推奨 |

```
Web管理画面 UIスタック:
┌─────────────────────────────────────────────────────────────┐
│  Next.js 14 (App Router)                                    │
├─────────────────────────────────────────────────────────────┤
│  Tailwind CSS v3.4                                          │
│  └── デザイントークン: genba-design-system準拠               │
├─────────────────────────────────────────────────────────────┤
│  shadcn/ui (Radix UI + Tailwind)                            │
│  ├── Button, Card, Input, Badge, Dialog, Sheet              │
│  ├── Table, DataTable (TanStack Table)                      │
│  ├── Form (React Hook Form + Zod統合)                       │
│  ├── DatePicker, Select, Combobox                           │
│  └── Toast (Sonner)                                         │
├─────────────────────────────────────────────────────────────┤
│  Lucide Icons + Recharts                                    │
└─────────────────────────────────────────────────────────────┘
```

#### shadcn/ui カスタマイズ方針

shadcn/uiはコピペ式のため、GENBA GEARデザインシステムに合わせてカスタマイズ:

```typescript
// tailwind.config.ts
const config = {
  theme: {
    extend: {
      colors: {
        // GENBA GEAR カラーをshadcn/ui変数にマッピング
        primary: {
          DEFAULT: '#147878',  // genba-teal-700
          foreground: '#ffffff',
        },
        secondary: {
          DEFAULT: '#2d3561',  // genba-navy-700
          foreground: '#ffffff',
        },
        accent: {
          DEFAULT: '#f5c518',  // genba-yellow-500
          foreground: '#1a1a1a',
        },
        destructive: {
          DEFAULT: '#c73b3b',  // genba-error
          foreground: '#ffffff',
        },
        muted: {
          DEFAULT: '#f5f5f5',  // genba-gray-100
          foreground: '#4a4a4a',
        },
        background: '#f5f5f5', // 白すぎない背景
        foreground: '#1a1a1a',
        card: {
          DEFAULT: '#fafafa',
          foreground: '#1a1a1a',
        },
        border: '#b8b8b8',
      },
      borderRadius: {
        lg: '8px',   // 角丸は控えめ（工具っぽさ）
        md: '6px',
        sm: '4px',
      },
    },
  },
};
```

#### 共通ライブラリ（モバイル・Web両方）

| カテゴリ | ライブラリ | 用途 |
|---------|-----------|------|
| **バリデーション** | Zod | スキーマ共有 |
| **日付処理** | date-fns | フォーマット統一 |
| **型定義** | TypeScript | 型共有 |

### 3.4 選定しなかったライブラリ

| ライブラリ | 不採用理由 |
|-----------|-----------|
| **Tamagui** | 学習コスト高い、NativeWindで十分 |
| **React Native Paper** | Material Designベースで世界観に合わない |
| **Chakra UI** | 丸みが強すぎ、GENBA GEARの堅牢感に合わない |
| **MUI** | 重い、カスタマイズ面倒 |
| **Ant Design** | 中華圏デザイン、日本向け職人アプリに合わない |
| **Formik** | React Hook Formより重い |
| **Chart.js** | React統合がRechartsより弱い |

---

## 4. アーキテクチャパターン

### 4.1 オフラインファースト設計

```
┌──────────────────────────────────────────────────────────┐
│                    ユーザー操作                          │
└──────────────────────────────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────┐
│                   WatermelonDB                           │
│                   (ローカルDB)                           │
│                                                          │
│  ✅ 即座に読み書き                                       │
│  ✅ オフラインでも動作                                   │
│  ✅ UIはローカルデータを参照                             │
└──────────────────────────────────────────────────────────┘
                           │
                           │ バックグラウンド同期
                           │ (ネットワーク復帰時)
                           ▼
┌──────────────────────────────────────────────────────────┐
│                     Supabase                             │
│                   (クラウドDB)                           │
│                                                          │
│  📡 データ永続化                                         │
│  🔄 マルチデバイス同期                                   │
│  👥 チーム間共有                                         │
└──────────────────────────────────────────────────────────┘
```

**設計原則:**
1. ローカルDBへの書き込みを優先（ユーザー体感を最優先）
2. ネットワーク状態に関わらず操作可能
3. バックグラウンドで非同期同期
4. 競合解決はタイムスタンプベース（後勝ち）

### 4.2 音声処理パイプライン

```
┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐
│  録音   │ → │ 送信    │ → │ AI処理  │ → │ 保存    │
│ (3-30秒)│    │         │    │         │    │         │
└─────────┘    └─────────┘    └─────────┘    └─────────┘
     │              │              │              │
     ▼              ▼              ▼              ▼
  ローカル      オフライン時   Whisper +      ローカルDB
  音声ファイル   キュー保存    GPT-4o-mini    + Supabase
```

**オフライン時の動作:**
1. 音声ファイルをローカル保存
2. GPS/天気情報もキャプチャ
3. `pending_records`テーブルに保存
4. ネットワーク復帰時に自動処理

### 4.3 機能モジュール構成

```
features/
├── voice/          # 騒音耐性AIボイス入力
│   ├── 録音制御
│   ├── Whisper連携
│   └── 構造化処理
│
├── report/         # 簡易日報生成
│   ├── GPS/天気統合
│   ├── PDF生成
│   └── 署名処理
│
├── invoice/        # 請求書自動生成
│   ├── 日報→請求書変換
│   ├── 税計算
│   └── PDF生成
│
├── customer/       # 軽量顧客カルテ
│   ├── 声検索
│   └── AI要約
│
├── notification/   # GPS自動通知
│   ├── ジオフェンシング
│   └── SMS送信
│
├── safety/         # 熱中症/安全アラート
│   ├── 天気監視
│   └── プッシュ通知
│
└── team/           # チーム機能（v2）
    ├── メンバー管理
    └── 集約レポート
```

---

## 5. ディレクトリ構成

```
genba-gear/
│
├── app/                          # Expo Router (画面)
│   ├── (tabs)/                   # タブナビゲーション
│   │   ├── index.tsx             # ホーム（今日の現場）
│   │   ├── reports.tsx           # 日報一覧
│   │   ├── invoices.tsx          # 請求書一覧
│   │   ├── customers.tsx         # 顧客カルテ
│   │   └── settings.tsx          # 設定
│   │
│   ├── voice/                    # 音声入力フロー
│   │   ├── index.tsx             # 録音画面
│   │   └── confirm.tsx           # 文字起こし確認
│   │
│   ├── report/
│   │   ├── [id].tsx              # 日報詳細
│   │   └── preview.tsx           # PDF プレビュー
│   │
│   ├── invoice/
│   │   ├── [id].tsx              # 請求書詳細
│   │   └── create.tsx            # 請求書作成
│   │
│   ├── customer/
│   │   └── [id].tsx              # 顧客詳細
│   │
│   ├── auth/                     # 認証
│   │   ├── login.tsx
│   │   └── signup.tsx
│   │
│   └── _layout.tsx               # ルートレイアウト
│
├── src/
│   ├── components/               # UIコンポーネント
│   │   ├── ui/                   # 汎用UI
│   │   │   ├── Button.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Input.tsx
│   │   │   └── ...
│   │   │
│   │   ├── voice/                # 音声入力専用
│   │   │   ├── VoiceRecorder.tsx
│   │   │   ├── WaveformVisualizer.tsx
│   │   │   └── TranscriptEditor.tsx
│   │   │
│   │   └── report/               # 日報専用
│   │       ├── ReportCard.tsx
│   │       └── PDFViewer.tsx
│   │
│   ├── features/                 # 機能モジュール
│   │   ├── voice/
│   │   ├── report/
│   │   ├── invoice/
│   │   ├── customer/
│   │   ├── notification/
│   │   ├── safety/
│   │   └── team/
│   │
│   ├── database/                 # WatermelonDB
│   │   ├── index.ts              # DB初期化
│   │   ├── schema.ts             # スキーマ定義
│   │   ├── models/               # モデル定義
│   │   │   ├── UserProfile.ts
│   │   │   ├── Customer.ts
│   │   │   ├── WorkRecord.ts
│   │   │   ├── DailyReport.ts
│   │   │   └── Invoice.ts
│   │   └── sync.ts               # Supabase同期
│   │
│   ├── services/                 # 外部サービス
│   │   ├── supabase.ts
│   │   ├── openai.ts
│   │   ├── weather.ts
│   │   └── sms.ts
│   │
│   ├── hooks/                    # カスタムフック
│   │   ├── useAuth.ts
│   │   ├── useDatabase.ts
│   │   ├── useLocation.ts
│   │   └── useNetworkStatus.ts
│   │
│   ├── utils/                    # ユーティリティ
│   │   ├── format.ts
│   │   ├── validation.ts
│   │   └── pdf.ts
│   │
│   └── constants/                # 定数
│       ├── colors.ts
│       ├── typography.ts
│       └── config.ts
│
├── assets/                       # 静的アセット
│   ├── images/
│   ├── fonts/
│   └── animations/
│
├── supabase/                     # Supabase設定
│   ├── migrations/               # DBマイグレーション
│   └── functions/                # Edge Functions
│
└── __tests__/                    # テスト
```

---

## 6. データモデル

### 6.1 ER図

```
┌─────────────────┐       ┌─────────────────┐
│   auth.users    │       │     teams       │
│   (Supabase)    │       │                 │
├─────────────────┤       ├─────────────────┤
│ id (PK)         │       │ id (PK)         │
│ email           │       │ name            │
│ ...             │       │ owner_id (FK)   │
└────────┬────────┘       │ plan            │
         │                │ created_at      │
         │ 1              └────────┬────────┘
         │                         │
         ▼                         │ 1
┌─────────────────┐                │
│  user_profiles  │◄───────────────┘
├─────────────────┤                │
│ id (PK)         │                │
│ user_id (FK)    │                │
│ team_id (FK)    │◄───────────────┘ N
│ business_name   │
│ representative  │
│ invoice_reg_num │
│ plan            │
└────────┬────────┘
         │
         │ 1
         │
         ▼ N
┌─────────────────┐       ┌─────────────────┐
│   customers     │       │  bank_accounts  │
├─────────────────┤       ├─────────────────┤
│ id (PK)         │       │ id (PK)         │
│ user_id (FK)    │       │ user_id (FK)    │
│ name            │       │ bank_name       │
│ address         │       │ branch_name     │
│ phone           │       │ account_type    │
│ photos (JSON)   │       │ account_number  │
│ memos (JSON)    │       │ account_holder  │
│ ai_summary      │       │ is_default      │
└────────┬────────┘       └─────────────────┘
         │
         │ 1
         │
         ▼ N
┌─────────────────┐
│  work_records   │
├─────────────────┤
│ id (PK)         │
│ user_id (FK)    │
│ customer_id (FK)│
│ voice_transcript│
│ structured_data │
│ gps_location    │
│ weather         │
│ temperature     │
│ recorded_at     │
│ status          │
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
    ▼ 1       ▼ 1
┌─────────┐ ┌─────────┐
│ daily_  │ │invoices │
│ reports │ │         │
├─────────┤ ├─────────┤
│ id      │ │ id      │
│ ...     │ │ ...     │
└─────────┘ └─────────┘
```

### 6.2 主要エンティティ

#### UserProfile（ユーザー）
```
- business_name: 事業者名（必須）
- representative_name: 代表者名
- postal_code, address, phone, email: 連絡先
- invoice_registration_number: インボイス登録番号（T+13桁）
- plan: 'free' | 'team'
- team_id: チームID（チームプラン時）
```

#### Customer（顧客カルテ）
```
- name: 顧客名（必須）
- address, phone, email: 連絡先
- photos: 写真/図面（JSON配列）
- memos: メモ（JSON配列）
- ai_summary: AI生成要約
```

#### WorkRecord（作業記録）
```
- customer_id: 紐付け顧客
- voice_transcript: 音声文字起こし
- structured_data: 構造化データ（JSON）
  - workType, location, details, materials, quantity
- gps_location: GPS座標（JSON）
- weather: 天気
- temperature: 気温
- recorded_at: 録音日時
- status: 'draft' | 'processed' | 'synced'
```

#### DailyReport（日報）
```
- work_record_id: 作業記録ID
- customer_id: 顧客ID
- report_date: 日報日付
- content: 日報内容（JSON）
- pdf_url: 生成PDF URL
- timestamp_signature: タイムスタンプ署名
- status: 'draft' | 'finalized' | 'sent'
```

#### Invoice（請求書）
```
- customer_id: 請求先顧客
- work_record_id: 作業記録（元データ）
- invoice_number: 請求書番号（INV-YYYY-NNNN）
- issue_date: 発行日
- due_date: 支払期限
- items: 明細（JSON配列）
- subtotal, tax_amount, total_amount: 金額
- status: 'draft' | 'sent' | 'paid'
- pdf_url: PDF URL
```

---

## 7. セキュリティ設計

### 7.1 認証

```
認証方式: Supabase Auth
├── Magic Link（推奨）: メールでワンタイムログイン
├── Email/Password: 従来型
└── 将来: Apple/Google Sign-In
```

### 7.2 認可（Row Level Security）

```sql
-- 個人プラン: 自分のデータのみアクセス可能
POLICY "Users can access own data"
  → auth.uid() = user_id

-- チームプラン: チームメンバーのデータにアクセス可能
POLICY "Team members can access team data"
  → team_id IN (SELECT team_id FROM user_profiles WHERE user_id = auth.uid())

-- 権限レベル
owner: 全権限
admin: メンバー管理、データ閲覧・編集
member: 自分のデータ作成・編集、他メンバーのデータ閲覧
```

### 7.3 データ保護

```
✅ 機密情報
├── 音声データ: 処理後に削除（保存しない）
├── 認証トークン: Expo SecureStore
└── APIキー: 環境変数（サーバーサイド）

✅ プライバシー
├── GPS通知: 初回同意必須
├── 顧客データ: 削除機能必須
└── チームデータ: 退会時に選択削除
```

---

## 8. パフォーマンス設計

### 8.1 目標指標

| 指標 | 目標 | 手段 |
|------|------|------|
| 初回起動 | < 3秒 | バンドル最適化 |
| 画面遷移 | < 300ms | ネイティブナビゲーション |
| ローカルDB読み込み | < 100ms | WatermelonDB |
| 音声処理 | < 10秒 | ストリーミング対応 |
| PDF生成 | < 5秒 | バックグラウンド処理 |

### 8.2 最適化戦略

```
オフライン優先
├── ローカルDBを常に優先参照
├── ネットワーク待ちなしで即座にレスポンス
└── バックグラウンドで非同期同期

リソース管理
├── 画像: WebP + 遅延読み込み
├── 音声: 録音後即座にアップロード（ローカル保持最小化）
├── PDF: 生成後クラウド保存（ローカルはキャッシュのみ）
└── GPS: 必要時のみ高精度（バッテリー節約）
```

---

## 9. コスト設計

### 9.1 月額ランニングコスト（推定）

| ユーザー数 | Supabase | OpenAI | その他 | 合計 |
|-----------|----------|--------|--------|------|
| 50人 (MVP) | ¥0 (Free) | ¥1,500 | ¥1,000 | **約¥2,500** |
| 100人 | ¥0 | ¥2,500 | ¥1,000 | **約¥3,500** |
| 300人 | ¥3,000 | ¥6,000 | ¥1,000 | **約¥10,000** |

### 9.2 コスト最適化

```
OpenAI
├── Whisper: 約¥0.6/分 → 30秒平均で¥0.3/回
├── GPT-4o-mini: 約¥0.02/1K tokens → 構造化で¥0.05/回
└── 1ユーザー10回/日: 約¥3.5/日 → 約¥100/月

Supabase
├── Free: 500MB DB, 1GB Storage, 50K Auth
├── Pro (¥3,000/月): 8GB DB, 100GB Storage
└── チームプラン収益でカバー可能
```

---

## 10. 使用方法

このスキルは**設計判断**に使用します。

```
使用シーン:
- 新機能の設計時
- アーキテクチャの見直し時
- 技術選定の議論時
- データモデルの設計時

具体的な実装コードは genba-implementation-guide を参照してください。
```

### 関連スキル

| スキル | 用途 |
|--------|------|
| `genba-implementation-guide` | 具体的な実装コード |
| `genba-design-system` | UIデザイン、コンポーネント |
| `voice-to-document` | 音声入力ワークフロー |
| `invoice-generator` | 請求書生成ロジック |
| `ui-ux-mastery` | UI/UXベストプラクティス |
