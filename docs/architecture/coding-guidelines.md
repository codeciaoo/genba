# GENBA GEAR コーディングガイドライン

> 最終更新: 2026-01-17

## 概要

本ドキュメントでは、GENBA GEARのコードベースにおけるレイヤー構成、責務分担、命名規則、ディレクトリルールを定義します。

---

## レイヤーアーキテクチャ

React Native + Expo プロジェクトにおいて、クリーンアーキテクチャの考え方を適用した4層構成を採用します。

```
┌─────────────────────────────────────────────────────────────────┐
│                      Presentation Layer                          │
│                      (app/, components/)                         │
│  UI表示・ユーザー操作のハンドリング                               │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Application Layer                           │
│                      (hooks/, features/*/hooks/)                 │
│  ユースケース・ビジネスロジックのオーケストレーション             │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        Domain Layer                              │
│                      (features/*/domain/)                        │
│  ビジネスルール・エンティティ・バリデーション                     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Infrastructure Layer                         │
│                 (database/, services/, features/*/repository/)   │
│  外部サービス・DB・API通信                                       │
└─────────────────────────────────────────────────────────────────┘
```

### 依存関係のルール

```
Presentation → Application → Domain ← Infrastructure
                              ↑
                              │
                    Domain は他に依存しない
```

- **上位レイヤーは下位レイヤーに依存できる**
- **下位レイヤーは上位レイヤーに依存してはならない**
- **Domain層は他のどの層にも依存しない**（純粋なビジネスロジック）
- **Infrastructure層はDomain層のインターフェースを実装する**

---

## ディレクトリ構成と責務

```
src/
├── components/           # 【Presentation】共通UIコンポーネント
│   ├── ui/               # 基本UI（Button, Card, Input, Modal等）
│   ├── layout/           # レイアウト（Header, Footer, Container等）
│   └── feedback/         # フィードバック（Toast, Loading, Error等）
│
├── features/             # 【機能別モジュール】
│   ├── voice/            # 音声入力機能
│   │   ├── components/   # 機能固有のUIコンポーネント
│   │   ├── hooks/        # 機能固有のカスタムフック（Application層）
│   │   ├── domain/       # ビジネスロジック・型定義（Domain層）
│   │   │   ├── types.ts          # 型定義
│   │   │   ├── validation.ts     # バリデーションルール
│   │   │   └── business-rules.ts # ビジネスルール
│   │   └── repository/   # データアクセス（Infrastructure層）
│   │       ├── voice-repository.ts
│   │       └── voice-repository.interface.ts
│   │
│   ├── report/           # 日報機能
│   ├── invoice/          # 請求書機能
│   ├── customer/         # 顧客カルテ機能
│   └── auth/             # 認証機能
│
├── database/             # 【Infrastructure】WatermelonDB
│   ├── schema.ts         # スキーマ定義
│   ├── models/           # モデルクラス
│   ├── sync.ts           # 同期ロジック
│   └── migrations/       # マイグレーション
│
├── services/             # 【Infrastructure】外部サービス
│   ├── supabase/         # Supabaseクライアント
│   │   ├── client.ts
│   │   ├── auth.ts
│   │   └── storage.ts
│   ├── openai/           # OpenAI API
│   │   ├── client.ts
│   │   ├── transcription.ts
│   │   └── extraction.ts
│   └── weather/          # 天気API
│
├── hooks/                # 【Application】共通カスタムフック
│   ├── useSync.ts        # 同期フック
│   ├── useOffline.ts     # オフライン検知
│   └── useLocation.ts    # GPS位置情報
│
├── utils/                # ユーティリティ（純粋関数）
│   ├── format.ts         # フォーマット（日付、金額等）
│   ├── validation.ts     # 共通バリデーション
│   └── error.ts          # エラーハンドリング
│
├── constants/            # 定数
│   ├── config.ts         # アプリ設定
│   ├── theme.ts          # テーマ定数
│   └── messages.ts       # メッセージ定数
│
└── types/                # 共通型定義
    ├── common.ts
    └── api.ts
```

---

## 各レイヤーの責務と実装ルール

### 1. Presentation Layer（app/, components/）

**責務:**
- UI表示
- ユーザー操作のハンドリング
- 状態の表示（ローディング、エラー、成功）

**ルール:**
- ビジネスロジックを書かない
- APIを直接呼ばない（hooksを経由する）
- 状態管理はhooksに委譲

```typescript
// ✅ Good: UIに集中、ロジックはhooksへ
export function VoiceInputScreen() {
  const { isRecording, startRecording, stopRecording, error } = useVoiceRecording();

  return (
    <View>
      {error && <ErrorMessage message={error} />}
      <MicButton
        isRecording={isRecording}
        onPress={isRecording ? stopRecording : startRecording}
      />
    </View>
  );
}

// ❌ Bad: UIコンポーネント内でビジネスロジック
export function VoiceInputScreen() {
  const [isRecording, setIsRecording] = useState(false);

  const handlePress = async () => {
    if (isRecording) {
      const uri = await recording.stopAndUnloadAsync();
      // ❌ APIを直接呼んでいる
      const result = await fetch('/api/transcribe', { body: uri });
      // ❌ ビジネスロジックがUIに混在
      if (result.text.length < 10) {
        alert('もう少し詳しく話してください');
      }
    }
  };
}
```

### 2. Application Layer（hooks/）

**責務:**
- ユースケースの実行
- 複数のドメインサービス・リポジトリの協調
- 状態管理
- エラーハンドリング

**ルール:**
- ビジネスルールはDomain層に委譲
- 外部サービスへの直接アクセスはしない（Repositoryを使う）
- 副作用の管理（useEffect）

```typescript
// ✅ Good: ユースケースをオーケストレーション
export function useVoiceRecording() {
  const [state, setState] = useState<VoiceRecordingState>('idle');
  const [error, setError] = useState<string | null>(null);
  const voiceRepository = useVoiceRepository();
  const reportRepository = useReportRepository();

  const processRecording = async (audioUri: string) => {
    try {
      setState('processing');

      // 1. 音声処理（Repository経由）
      const transcript = await voiceRepository.transcribe(audioUri);

      // 2. バリデーション（Domain層）
      const validationResult = validateTranscript(transcript);
      if (!validationResult.isValid) {
        setError(validationResult.message);
        return;
      }

      // 3. 構造化データ抽出（Repository経由）
      const extractedData = await voiceRepository.extractStructuredData(transcript);

      // 4. 下書き保存（Repository経由）
      await reportRepository.saveDraft(extractedData);

      setState('completed');
    } catch (e) {
      setError(handleError(e));
      setState('error');
    }
  };

  return { state, error, processRecording };
}
```

### 3. Domain Layer（features/*/domain/）

**責務:**
- ビジネスルールの定義
- エンティティの型定義
- バリデーションルール
- ドメイン固有の計算ロジック

**ルール:**
- 外部依存を持たない（純粋なTypeScript）
- 副作用を持たない（純粋関数）
- テストが容易であること

```typescript
// features/invoice/domain/types.ts
export interface InvoiceItem {
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  taxRate: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  issueDate: Date;
  dueDate: Date;
  items: InvoiceItem[];
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  status: 'draft' | 'sent' | 'paid';
}

// features/invoice/domain/business-rules.ts
export function calculateInvoiceTotals(items: InvoiceItem[]): {
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
} {
  const subtotal = items.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0
  );

  // 税率ごとにグループ化して計算（インボイス制度対応）
  const taxByRate = items.reduce((acc, item) => {
    const itemTotal = item.quantity * item.unitPrice;
    const rate = item.taxRate;
    acc[rate] = (acc[rate] || 0) + Math.floor(itemTotal * (rate / 100));
    return acc;
  }, {} as Record<number, number>);

  const taxAmount = Object.values(taxByRate).reduce((sum, tax) => sum + tax, 0);
  const totalAmount = subtotal + taxAmount;

  return { subtotal, taxAmount, totalAmount };
}

// features/invoice/domain/validation.ts
export function validateInvoice(invoice: Partial<Invoice>): ValidationResult {
  const errors: string[] = [];

  if (!invoice.items || invoice.items.length === 0) {
    errors.push('明細が1件以上必要です');
  }

  if (invoice.dueDate && invoice.issueDate && invoice.dueDate < invoice.issueDate) {
    errors.push('支払期限は発行日以降にしてください');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
```

### 4. Infrastructure Layer（database/, services/, repository/）

**責務:**
- 外部サービスとの通信
- データベースアクセス
- ファイルシステムアクセス
- Domain層で定義したインターフェースの実装

**ルール:**
- Domain層の型を使用
- エラーをDomain層の形式に変換
- 技術的詳細をカプセル化

```typescript
// features/voice/repository/voice-repository.interface.ts
export interface IVoiceRepository {
  transcribe(audioUri: string): Promise<string>;
  extractStructuredData(transcript: string): Promise<ExtractedWorkData>;
  saveAudioFile(audioUri: string): Promise<string>;
}

// features/voice/repository/voice-repository.ts
import { supabase } from '@/services/supabase/client';
import { openai } from '@/services/openai/client';
import type { IVoiceRepository } from './voice-repository.interface';
import type { ExtractedWorkData } from '../domain/types';

export class VoiceRepository implements IVoiceRepository {
  async transcribe(audioUri: string): Promise<string> {
    try {
      const { data, error } = await supabase.functions.invoke('process-voice', {
        body: { audioUri },
      });

      if (error) throw error;
      return data.transcript;
    } catch (e) {
      // 技術的エラーをドメインエラーに変換
      throw new VoiceProcessingError('音声の処理に失敗しました', e);
    }
  }

  async extractStructuredData(transcript: string): Promise<ExtractedWorkData> {
    const { data, error } = await supabase.functions.invoke('extract-work-data', {
      body: { transcript },
    });

    if (error) throw error;
    return data as ExtractedWorkData;
  }

  async saveAudioFile(audioUri: string): Promise<string> {
    const fileName = `voice/${Date.now()}.m4a`;
    const { data, error } = await supabase.storage
      .from('audio')
      .upload(fileName, audioUri);

    if (error) throw error;
    return data.path;
  }
}
```

---

## 命名規則

### ファイル名

| 種類 | 規則 | 例 |
|------|------|-----|
| コンポーネント | PascalCase | `MicButton.tsx`, `InvoicePreview.tsx` |
| フック | camelCase + use接頭辞 | `useVoiceRecording.ts`, `useSync.ts` |
| ユーティリティ | camelCase | `formatDate.ts`, `calculateTax.ts` |
| 型定義 | camelCase | `types.ts`, `invoice.types.ts` |
| 定数 | camelCase | `config.ts`, `theme.ts` |
| テスト | 元ファイル名 + .test | `MicButton.test.tsx`, `useVoiceRecording.test.ts` |

### 変数・関数名

| 種類 | 規則 | 例 |
|------|------|-----|
| 変数 | camelCase | `invoiceNumber`, `isLoading` |
| 関数 | camelCase + 動詞 | `calculateTotal()`, `validateInvoice()` |
| 定数 | UPPER_SNAKE_CASE | `MAX_RECORDING_SECONDS`, `API_BASE_URL` |
| コンポーネント | PascalCase | `<MicButton />`, `<InvoiceList />` |
| 型/インターフェース | PascalCase | `Invoice`, `IVoiceRepository` |
| Enum | PascalCase | `InvoiceStatus.Draft` |

### 接頭辞・接尾辞

| 接頭辞/接尾辞 | 用途 | 例 |
|--------------|------|-----|
| `use` | カスタムフック | `useVoiceRecording` |
| `I` | インターフェース | `IVoiceRepository` |
| `is`, `has`, `can` | boolean | `isLoading`, `hasError`, `canSubmit` |
| `on` | イベントハンドラ | `onPress`, `onSubmit` |
| `handle` | イベントハンドラ実装 | `handlePress`, `handleSubmit` |
| `Error` | エラークラス | `VoiceProcessingError` |
| `Props` | コンポーネントProps | `MicButtonProps` |

---

## コーディングスタイル

### インポート順序

```typescript
// 1. React/React Native
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';

// 2. 外部ライブラリ
import { useQuery } from '@tanstack/react-query';

// 3. 内部モジュール（絶対パス）
import { Button } from '@/components/ui/Button';
import { useVoiceRecording } from '@/features/voice/hooks/useVoiceRecording';
import { formatDate } from '@/utils/format';

// 4. 相対パス
import { MicButton } from './MicButton';
import type { VoiceInputScreenProps } from './types';

// 5. スタイル/定数
import { styles } from './styles';
import { RECORDING_OPTIONS } from './constants';
```

### コンポーネント構造

```typescript
// 1. 型定義
interface MicButtonProps {
  isRecording: boolean;
  onPress: () => void;
  disabled?: boolean;
}

// 2. コンポーネント
export function MicButton({ isRecording, onPress, disabled = false }: MicButtonProps) {
  // 3. フック（状態、副作用）
  const [isPressed, setIsPressed] = useState(false);

  // 4. 派生値（useMemo）
  const buttonColor = useMemo(() => {
    if (disabled) return colors.gray;
    if (isRecording) return colors.red;
    return colors.teal;
  }, [disabled, isRecording]);

  // 5. イベントハンドラ
  const handlePressIn = () => setIsPressed(true);
  const handlePressOut = () => setIsPressed(false);

  // 6. 早期リターン
  if (disabled) {
    return <DisabledMicButton />;
  }

  // 7. レンダリング
  return (
    <TouchableOpacity
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[styles.button, { backgroundColor: buttonColor }]}
    >
      <MicIcon size={48} color="white" />
    </TouchableOpacity>
  );
}
```

---

## エラーハンドリング

### エラークラスの定義

```typescript
// utils/error.ts
export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public originalError?: unknown
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class VoiceProcessingError extends AppError {
  constructor(message: string, originalError?: unknown) {
    super(message, 'VOICE_PROCESSING_ERROR', originalError);
    this.name = 'VoiceProcessingError';
  }
}

export class NetworkError extends AppError {
  constructor(message: string, originalError?: unknown) {
    super(message, 'NETWORK_ERROR', originalError);
    this.name = 'NetworkError';
  }
}

export class ValidationError extends AppError {
  constructor(message: string, public fields?: Record<string, string>) {
    super(message, 'VALIDATION_ERROR');
    this.name = 'ValidationError';
  }
}
```

### エラーハンドリングパターン

```typescript
// hooks/useErrorHandler.ts
export function useErrorHandler() {
  const handleError = useCallback((error: unknown): string => {
    // 既知のエラー
    if (error instanceof ValidationError) {
      return error.message;
    }

    if (error instanceof NetworkError) {
      return 'ネットワークに接続できません。オフラインモードで続行します。';
    }

    if (error instanceof VoiceProcessingError) {
      return '音声の処理に失敗しました。もう一度お試しください。';
    }

    // 未知のエラー
    console.error('Unexpected error:', error);
    return '予期しないエラーが発生しました';
  }, []);

  return { handleError };
}
```

---

## 状態管理

### ローカル状態 vs グローバル状態

| 状態の種類 | 管理方法 | 例 |
|-----------|---------|-----|
| UIの状態（一時的） | useState | モーダルの開閉、入力値 |
| サーバー状態 | React Query / SWR | API取得データ |
| DBデータ | WatermelonDB Observable | 日報一覧、顧客カルテ |
| アプリ全体の状態 | Context / Zustand | 認証状態、テーマ |

### WatermelonDB の使い方

```typescript
// hooks/useReports.ts
import { useDatabase } from '@nozbe/watermelondb/hooks';
import { Q } from '@nozbe/watermelondb';

export function useReports(siteId?: string) {
  const database = useDatabase();

  // Observableで自動更新
  const reports = useObservable(() => {
    let query = database.get<DailyReport>('daily_reports').query(
      Q.sortBy('report_date', Q.desc),
      Q.take(50)
    );

    if (siteId) {
      query = query.extend(Q.where('site_id', siteId));
    }

    return query.observe();
  }, [siteId]);

  return reports;
}
```

---

## 関連ドキュメント

- [テスト戦略](./testing-strategy.md)
- [データベーススキーマ](./database-schema.md)
- [API設計](./api-design.md)
- [アーキテクチャ概要](./README.md)
