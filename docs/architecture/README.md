# GENBA GEAR アーキテクチャ設計

> 最終更新: 2026-01-17

## 概要

**GENBA GEAR** は、建設現場で働く職人のための「AIポケット事務員」アプリです。

本ドキュメントでは、システム全体のアーキテクチャ設計について記述します。

---

## 目次

| ドキュメント | 内容 |
|-------------|------|
| [本ドキュメント](./README.md) | アーキテクチャ概要・設計原則 |
| [技術スタック](./tech-stack.md) | 使用技術の詳細と選定理由 |
| [システム構成図](./system-diagram.md) | 全体構成・データフロー |

### 詳細仕様（.claude/skills/）

より詳細な実装仕様は `.claude/skills/genba-app-architecture/references/` を参照:

| ファイル | 内容 |
|---------|------|
| [data-model.md](/.claude/skills/genba-app-architecture/references/data-model.md) | データモデル・ER図・SQL定義 |
| [offline-sync.md](/.claude/skills/genba-app-architecture/references/offline-sync.md) | オフライン同期設計・WatermelonDB |
| [voice-processing.md](/.claude/skills/genba-app-architecture/references/voice-processing.md) | 音声処理パイプライン・AI連携 |
| [pdf-generation.md](/.claude/skills/genba-app-architecture/references/pdf-generation.md) | PDF生成・帳票出力 |

---

## 設計原則

### 1. オフラインファースト

建設現場は電波が不安定。**オフラインでも全機能が使える**ことが最優先。

```
クライアント（WatermelonDB） ← 常に最新
         ↓
    オンライン時に同期
         ↓
サーバー（Supabase PostgreSQL） ← バックアップ
```

- すべてのデータはまずローカル（WatermelonDB）に保存
- サーバーはバックアップと同期のためにある
- オフライン時も音声録音・日報作成が可能

### 2. 音声が主役

テキスト入力は補助。**メインUIは常に音声入力ボタン**。

- 画面の一番目立つ場所に、一番大きなマイクボタン
- 騒音耐性AI（OpenAI Whisper + カスタムプロンプト）
- GPT-4o-miniで作業内容を構造化抽出

### 3. シンプル・イズ・ベスト

設定項目は最小限。**デフォルトで使える**。

- 長いオンボーディング不要
- 「使い方を覚える」という学習コストをゼロに
- 職人が直感で使える大きなボタン

### 4. 完成物を見せる

機能の説明より、**結果のプレビューを優先**。

- 「この日報が作れます」と完成物を見せる
- 編集可能な下書きを先に生成

---

## システムアーキテクチャ概要

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              クライアント層                               │
├─────────────────────────────────────────────────────────────────────────┤
│  ┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐  │
│  │  モバイルアプリ    │    │   ランディングLP   │    │  Web管理画面(v2)  │  │
│  │  React Native    │    │   Astro          │    │  Next.js         │  │
│  │  (Expo)          │    │   + Tailwind     │    │  (チームプラン)    │  │
│  └────────┬─────────┘    └──────────────────┘    └────────┬─────────┘  │
│           │                                               │            │
│  ┌────────▼─────────┐                                     │            │
│  │  WatermelonDB    │◄────── オフライン優先 ───────────────┤            │
│  │  (SQLite)        │                                     │            │
│  └────────┬─────────┘                                     │            │
└───────────┼─────────────────────────────────────────────────────────────┘
            │                                               │
            ▼                                               ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                              バックエンド層                               │
├─────────────────────────────────────────────────────────────────────────┤
│                            ┌──────────────────┐                         │
│                            │    Supabase      │                         │
│  ┌─────────────────────────┤                  ├────────────────────┐    │
│  │                         └──────────────────┘                    │    │
│  │                                                                 │    │
│  ▼                              ▼                          ▼       │    │
│  ┌──────────────┐    ┌──────────────────┐    ┌──────────────────┐  │    │
│  │   Auth       │    │   PostgreSQL     │    │   Storage        │  │    │
│  │  (認証)      │    │   (データベース)   │    │  (ファイル)      │  │    │
│  └──────────────┘    └──────────────────┘    └──────────────────┘  │    │
│                                                                    │    │
│  ┌──────────────────────────────────────────────────────────────┐  │    │
│  │                     Edge Functions                           │  │    │
│  │  - process-voice: 音声処理（Whisper + GPT-4o）               │  │    │
│  │  - generate-pdf: PDF生成                                     │  │    │
│  │  - send-sms: SMS送信（GPS通知）                              │  │    │
│  └──────────────────────────────────────────────────────────────┘  │    │
└─────────────────────────────────────────────────────────────────────────┘
            │
            ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                              外部サービス層                               │
├─────────────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐    ┌──────────────────┐    ┌──────────────────┐       │
│  │   OpenAI     │    │   天気API        │    │   SMS Gateway    │       │
│  │  Whisper     │    │  OpenWeatherMap  │    │   (Twilio等)     │       │
│  │  GPT-4o-mini │    │                  │    │                  │       │
│  └──────────────┘    └──────────────────┘    └──────────────────┘       │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 技術スタック概要

| レイヤー | 技術 | 選定理由 |
|---------|------|---------|
| モバイルアプリ | React Native (Expo) | iOS/Android同時開発、開発効率 |
| ローカルDB | WatermelonDB | オフライン優先、SQLiteベース、高速同期 |
| バックエンド | Supabase | PostgreSQL + Auth + Storage + Edge Functions |
| AI処理 | OpenAI (Whisper + GPT-4o-mini) | 騒音耐性文字起こし + 構造化抽出 |
| ランディングLP | Astro + Tailwind | 軽量・高速、SEO対応 |
| Web管理画面(v2) | Next.js 14 | SSR対応、Vercelデプロイ |

→ 詳細は [tech-stack.md](./tech-stack.md) を参照

---

## ディレクトリ構成（モバイルアプリ）

```
genba-gear/
├── app/                      # Expo Router (ファイルベースルーティング)
│   ├── (tabs)/               # タブナビゲーション
│   │   ├── index.tsx         # ホーム（今日の現場）
│   │   ├── reports.tsx       # 日報一覧
│   │   ├── customers.tsx     # 顧客カルテ
│   │   └── settings.tsx      # 設定
│   ├── voice/                # 音声入力画面
│   ├── draft/[id].tsx        # 下書き確認・編集
│   ├── report/[id].tsx       # 日報詳細
│   └── _layout.tsx           # ルートレイアウト
├── src/
│   ├── components/           # UIコンポーネント
│   │   ├── ui/               # 基本UI（Button, Card, Input等）
│   │   ├── voice/            # 音声入力関連
│   │   └── templates/        # 日報テンプレート
│   ├── features/             # 機能別モジュール
│   │   ├── voice/            # 騒音耐性AIボイス入力
│   │   ├── report/           # 簡易日報生成
│   │   ├── customer/         # 軽量顧客カルテ
│   │   ├── notification/     # GPS自動通知
│   │   ├── safety/           # 熱中症/安全アラート
│   │   └── team/             # チームタスク割り当て（v2）
│   ├── database/             # WatermelonDB設定
│   │   ├── schema.ts         # スキーマ定義
│   │   ├── models/           # モデル定義
│   │   └── sync.ts           # Supabase同期ロジック
│   ├── services/             # 外部サービス連携
│   │   ├── supabase.ts       # Supabaseクライアント
│   │   ├── openai.ts         # OpenAI API
│   │   ├── weather.ts        # 天気API
│   │   └── sms.ts            # SMS送信
│   ├── hooks/                # カスタムフック
│   ├── utils/                # ユーティリティ
│   └── constants/            # 定数・設定
├── assets/                   # 画像・フォント等
├── supabase/                 # Supabase設定
│   ├── migrations/           # DBマイグレーション
│   └── functions/            # Edge Functions
└── package.json
```

---

## データフロー

### 音声入力 → 日報生成

```
1. 音声録音（クライアント）
   │
   ▼
2. ローカル保存（WatermelonDB）
   │  ※オフライン時はここで一旦停止、オンライン復帰後に再開
   ▼
3. 音声ファイルアップロード → Supabase Storage
   │
   ▼
4. Edge Function: process-voice
   │  ├─ OpenAI Whisper: 文字起こし
   │  └─ GPT-4o-mini: 構造化データ抽出
   ▼
5. 構造化データ返却
   │  └─ {site_hint, work_items, materials, notes...}
   ▼
6. 下書き確認画面（クライアント）
   │  └─ ユーザーが編集・確定
   ▼
7. 日報保存（WatermelonDB → Supabase同期）
```

### オフライン同期

```
┌─────────────┐                    ┌─────────────┐
│  クライアント  │                    │  Supabase   │
│ WatermelonDB │                    │ PostgreSQL  │
└──────┬──────┘                    └──────┬──────┘
       │                                   │
       │  1. ローカル変更発生               │
       │  ────────────────────►           │
       │  （is_synced = false）            │
       │                                   │
       │  2. オンライン検出                 │
       │  ──────────────────────────────► │
       │  pullChanges: サーバー変更取得     │
       │ ◄──────────────────────────────  │
       │                                   │
       │  3. マージ・競合解決               │
       │  （Last Write Wins）              │
       │                                   │
       │  4. pushChanges: ローカル変更送信  │
       │  ──────────────────────────────► │
       │                                   │
       │  5. is_synced = true              │
       │                                   │
```

---

## セキュリティ設計

### 認証

- **Supabase Auth**: Magic Link（メール）またはSMS認証
- **JWT**: セッション管理
- シンプルなログインフロー（職人が使いやすい）

### データアクセス制御

```sql
-- Row Level Security (RLS)
-- 個人プラン: 自分のデータのみアクセス可能
CREATE POLICY "Users can access own data"
ON work_records FOR ALL
USING (auth.uid() = user_id);

-- チームプラン: チームメンバーのデータにアクセス可能
CREATE POLICY "Team members can access team data"
ON work_records FOR SELECT
USING (
  team_id IN (
    SELECT team_id FROM team_members WHERE user_id = auth.uid()
  )
);
```

### プライバシー

- 顧客データ削除ボタン必須
- GPS通知は初回同意必須
- 音声データは処理後に削除可能

---

## パフォーマンス考慮

| 項目 | 対策 |
|------|------|
| オフライン応答速度 | WatermelonDBでローカル優先、UI即座に更新 |
| 音声処理 | 3-30秒制限、軽量前処理はオンデバイス |
| PDF生成 | バックグラウンド非同期生成 |
| バッテリー | GPS精度調整（高精度は必要時のみ） |
| 同期効率 | 差分同期、未同期データのみ送信 |

---

## 関連ドキュメント

- [プロダクト憲法](/CLAUDE.md) - 設計思想・世界観
- [機能一覧](/docs/requirements/features.md) - 機能要件
- [画面設計](/docs/design/README.md) - UI/UX設計
- [デザインシステム](/.claude/skills/genba-design-system/SKILL.md) - カラー・コンポーネント

---

## 変更履歴

| 日付 | 変更内容 |
|------|---------|
| 2026-01-17 | 初版作成。全体アーキテクチャ概要をまとめた |
