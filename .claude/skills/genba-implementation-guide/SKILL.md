---
name: genba-implementation-guide
description: 「GENBA GEAR」アプリの実装ガイド。具体的なコード例とパターン集。設計判断は docs/ と genba-app-architecture を参照。
---

# GENBA GEAR 実装ガイド

> **重要**: コーディング規約・レイヤー設計の詳細は `/docs/architecture/coding-guidelines.md` を参照。
> このスキルは実装時のコード例・パターン集として使用します。

## ドキュメント参照ガイド

### 📖 まず読むべきドキュメント

| ドキュメント | パス | 内容 |
|-------------|------|------|
| **コーディングガイドライン** | `/docs/architecture/coding-guidelines.md` | レイヤー構成、責務分担、命名規則 |
| **API設計** | `/docs/architecture/api-design.md` | Edge Functions API仕様、エンドポイント |
| **データベーススキーマ** | `/docs/architecture/database-schema.md` | PostgreSQL/WatermelonDB定義 |
| **テスト戦略** | `/docs/architecture/testing-strategy.md` | テストの種類、カバレッジ目標、テスト例 |

### 🛠️ 関連スキル

| スキル | 用途 |
|--------|------|
| `genba-app-architecture` | 設計判断、アーキテクチャ概要 |
| `genba-design-system` | デザインシステム、コンポーネント仕様 |
| `ui-ux-mastery` | UI/UXパターン、アニメーション |

---

## クイック実装リファレンス

### 1. プロジェクトセットアップ

```bash
# プロジェクト作成
npx create-expo-app@latest genba-gear --template tabs
cd genba-gear

# 必須パッケージ
npx expo install expo-router expo-av expo-location expo-file-system expo-haptics
npx expo install expo-secure-store expo-notifications expo-print expo-sharing
npx expo install nativewind tailwindcss

# データベース
npx expo install @nozbe/watermelondb
npm install @supabase/supabase-js

# その他
npm install openai date-fns zod react-hook-form
```

### 2. Supabaseクライアント

```typescript
// src/services/supabase/client.ts
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { CONFIG } from '@/constants/config';

const ExpoSecureStoreAdapter = {
  getItem: async (key: string) => SecureStore.getItemAsync(key),
  setItem: async (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: async (key: string) => SecureStore.deleteItemAsync(key),
};

export const supabase = createClient(
  CONFIG.supabase.url,
  CONFIG.supabase.anonKey,
  {
    auth: {
      storage: ExpoSecureStoreAdapter,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
);
```

### 3. 認証フック

```typescript
// src/hooks/useAuth.ts
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/services/supabase/client';
import type { User, Session } from '@supabase/supabase-js';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    return { data, error };
  }, []);

  const signOut = useCallback(async () => {
    return supabase.auth.signOut();
  }, []);

  return { user, session, loading, signInWithEmail, signOut };
}
```

### 4. WatermelonDBスキーマ

> 詳細は `/docs/architecture/database-schema.md` を参照

```typescript
// src/database/schema.ts
import { appSchema, tableSchema } from '@nozbe/watermelondb';

export const schema = appSchema({
  version: 1,
  tables: [
    tableSchema({
      name: 'work_records',
      columns: [
        { name: 'server_id', type: 'string', isOptional: true },
        { name: 'user_id', type: 'string', isIndexed: true },
        { name: 'customer_id', type: 'string', isOptional: true, isIndexed: true },
        { name: 'voice_transcript', type: 'string' },
        { name: 'structured_data', type: 'string' }, // JSON
        { name: 'gps_location', type: 'string' }, // JSON
        { name: 'weather', type: 'string', isOptional: true },
        { name: 'temperature', type: 'number', isOptional: true },
        { name: 'recorded_at', type: 'number' },
        { name: 'status', type: 'string' },
        { name: 'is_synced', type: 'boolean' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),
    // 他のテーブルは database-schema.md を参照
  ],
});
```

### 5. 音声処理（OpenAI連携）

```typescript
// src/services/openai/voice.ts
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.EXPO_PUBLIC_OPENAI_API_KEY });

const NOISE_FILTERING_PROMPT = `
建設現場での作業報告音声です。
背景に機械音、電動工具音、車両音、風音などの騒音が含まれる可能性があります。
人の声のみを抽出し、作業内容を正確に文字起こししてください。
`.trim();

export async function transcribeAudio(audioFile: File): Promise<string> {
  const response = await openai.audio.transcriptions.create({
    file: audioFile,
    model: 'whisper-1',
    language: 'ja',
    prompt: NOISE_FILTERING_PROMPT,
  });
  return response.text;
}

export async function structureTranscript(transcript: string) {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: STRUCTURING_PROMPT },
      { role: 'user', content: transcript },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.3,
  });
  return JSON.parse(response.choices[0].message.content || '{}');
}

const STRUCTURING_PROMPT = `
建設現場の作業報告を構造化データに変換してください。
JSON形式で出力: { workType, location, details, materials, quantity, unit, issues, nextAction }
不明な項目はnullを設定。
`.trim();
```

### 6. Feature Sliced Design パターン

> 詳細は `/docs/architecture/coding-guidelines.md` の「3. レイヤー構成」を参照

```
src/features/invoice/
├── domain/                    # ビジネスロジック
│   ├── types.ts              # 型定義
│   ├── business-rules.ts     # 税計算、バリデーション
│   └── validation.ts         # Zodスキーマ
├── hooks/                     # Application層
│   └── useInvoice.ts         # ユースケース
├── repository/                # Infrastructure層
│   └── invoice-repository.ts # DB/API操作
└── components/                # Presentation層
    ├── InvoiceCard.tsx
    └── InvoiceForm.tsx
```

### 7. API呼び出しパターン

> API仕様は `/docs/architecture/api-design.md` を参照

```typescript
// src/services/api/voice.ts
import { supabase } from '@/services/supabase/client';

export async function processVoice(audioUri: string) {
  const formData = new FormData();
  const response = await fetch(audioUri);
  const blob = await response.blob();
  formData.append('audio', blob, 'recording.m4a');

  const { data, error } = await supabase.functions.invoke('process-voice', {
    body: formData,
  });

  if (error || !data.success) {
    throw new Error(error?.message || data.error.message);
  }

  return data.data;
}
```

### 8. エラーハンドリングパターン

```typescript
// src/utils/error-handler.ts
type ErrorType = 'network' | 'permission' | 'validation' | 'auth' | 'server' | 'unknown';

export function classifyError(error: Error): { type: ErrorType; message: string } {
  const message = error.message.toLowerCase();

  if (message.includes('network') || message.includes('fetch')) {
    return { type: 'network', message: 'ネットワークに接続できません' };
  }
  if (message.includes('permission') || message.includes('denied')) {
    return { type: 'permission', message: '必要な権限がありません' };
  }
  if (message.includes('auth') || message.includes('unauthorized')) {
    return { type: 'auth', message: 'ログインが必要です' };
  }

  return { type: 'unknown', message: 'エラーが発生しました' };
}
```

---

## 使用方法

このスキルは実装時のコード例として使用します。

```
コーディング規約を確認したい → docs/architecture/coding-guidelines.md を読む
API仕様を確認したい       → docs/architecture/api-design.md を読む
テストの書き方を確認したい → docs/architecture/testing-strategy.md を読む
設計判断を確認したい       → genba-app-architecture スキルを参照
```
