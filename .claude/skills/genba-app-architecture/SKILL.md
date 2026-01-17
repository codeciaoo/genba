---
name: genba-app-architecture
description: 「GENBA GEAR」アプリの設計・アーキテクチャ概要。詳細は docs/ を参照。実装コードは genba-implementation-guide を参照。
---

# GENBA GEAR アーキテクチャ設計

> **重要**: 詳細なドキュメントは `docs/` ディレクトリを参照してください。
> このスキルは設計時のクイックリファレンスとして使用します。

## ドキュメント参照ガイド

### 📐 アーキテクチャ・技術設計

| ドキュメント | パス | 内容 |
|-------------|------|------|
| **アーキテクチャ概要** | `/docs/architecture/README.md` | システム全体設計、設計原則、構成図 |
| **技術スタック** | `/docs/architecture/tech-stack.md` | 使用技術の詳細と選定理由 |
| **システム構成図** | `/docs/architecture/system-diagram.md` | 全体構成、データフロー、ER図 |
| **データベーススキーマ** | `/docs/architecture/database-schema.md` | PostgreSQL/WatermelonDB定義 |
| **API設計** | `/docs/architecture/api-design.md` | Edge Functions API仕様 |
| **コーディングガイドライン** | `/docs/architecture/coding-guidelines.md` | レイヤー構成、責務分担、命名規則 |
| **テスト戦略** | `/docs/architecture/testing-strategy.md` | テストの種類、カバレッジ目標 |

### 🎨 画面設計・UI/UX

| ドキュメント | パス | 内容 |
|-------------|------|------|
| **設計書README** | `/docs/design/README.md` | 画面設計書の概要 |
| **画面一覧** | `/docs/design/screens.md` | 全画面の仕様一覧 |
| **画面遷移図** | `/docs/design/screen-flow.md` | ユーザーフロー |
| **画面詳細** | `/docs/design/screens/*.md` | 各画面の詳細仕様 |

### 📋 要件定義

| ドキュメント | パス | 内容 |
|-------------|------|------|
| **機能一覧** | `/docs/requirements/features.md` | 機能要件、ロードマップ |

### 🛠️ 関連スキル

| スキル | 用途 |
|--------|------|
| `genba-implementation-guide` | 具体的な実装コード |
| `genba-design-system` | デザインシステム、コンポーネント |
| `ui-ux-mastery` | UI/UXベストプラクティス |

---

## クイックリファレンス

### コンセプト

**GENBA GEAR** - 建設現場職人向けAIポケット事務員アプリ

> 「喋るだけで日報が完成する。それがこのアプリの約束。」

### 設計原則（4つ）

1. **オフラインファースト**: ローカルDB優先、バックグラウンド同期
2. **音声が主役**: 画面の一番目立つ場所にマイクボタン
3. **シンプル・イズ・ベスト**: デフォルトで使える、設定最小限
4. **完成物を見せる**: 機能説明よりプレビュー優先

### 技術スタック概要

```
UI Layer:     React Native (Expo) + NativeWind
Data Layer:   WatermelonDB (オフライン) ↔ Supabase (クラウド)
AI Layer:     OpenAI (Whisper + GPT-4o-mini)
Services:     Expo Location, OpenWeatherMap, Stripe
```

> 詳細は `/docs/architecture/tech-stack.md` を参照

### 主要エンティティ

```
UserProfile → Customer → WorkRecord → DailyReport / Invoice
```

> 詳細は `/docs/architecture/database-schema.md` を参照

### ディレクトリ構成

```
app/              # Expo Router (画面)
src/
├── components/   # UIコンポーネント
├── features/     # 機能モジュール（Feature Sliced Design）
├── database/     # WatermelonDB
├── services/     # 外部サービス連携
├── hooks/        # カスタムフック
└── utils/        # ユーティリティ
```

> 詳細は `/docs/architecture/coding-guidelines.md` を参照

---

## 使用方法

このスキルは設計判断のクイックリファレンスです。

```
設計を確認したい    → docs/architecture/ を読む
画面仕様を確認したい → docs/design/ を読む
実装コードが必要    → genba-implementation-guide スキルを参照
```
