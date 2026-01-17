# #002 データ層（WatermelonDB + Supabase）

## 概要

オフラインファーストのデータ層を構築する。WatermelonDBをローカルDBとして使用し、Supabaseとの同期機能を実装する。

## ステータス

🔵 Todo

## 優先度

P0（MVP必須）

## 依存

- #001 プロジェクト初期化・基盤構築

## 参照スキル

- `genba-app-architecture` - データモデル、オフライン同期

## タスク

### 1. WatermelonDBインストール

```bash
npx expo install @nozbe/watermelondb
npx expo install @babel/plugin-proposal-decorators
```

### 2. Supabaseテーブル作成

```sql
-- users: ユーザー拡張
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL UNIQUE,
  business_name TEXT NOT NULL,
  representative_name TEXT,
  postal_code TEXT,
  address TEXT,
  phone TEXT,
  email TEXT,
  invoice_registration_number TEXT,
  plan TEXT DEFAULT 'free',
  team_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- bank_accounts: 振込先口座
CREATE TABLE bank_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  bank_name TEXT NOT NULL,
  branch_name TEXT NOT NULL,
  account_type TEXT NOT NULL,
  account_number TEXT NOT NULL,
  account_holder TEXT NOT NULL,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- customers: 顧客（カルテ）
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  name TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  email TEXT,
  photos JSONB DEFAULT '[]',
  memos JSONB DEFAULT '[]',
  ai_summary TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- work_records: 作業記録
CREATE TABLE work_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  customer_id UUID REFERENCES customers,
  voice_transcript TEXT,
  structured_data JSONB,
  gps_location JSONB,
  weather TEXT,
  temperature REAL,
  recorded_at TIMESTAMPTZ NOT NULL,
  status TEXT DEFAULT 'draft',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- daily_reports: 日報
CREATE TABLE daily_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  work_record_id UUID REFERENCES work_records,
  customer_id UUID REFERENCES customers,
  report_date DATE NOT NULL,
  content JSONB,
  pdf_url TEXT,
  timestamp_signature TEXT,
  status TEXT DEFAULT 'draft',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- invoices: 請求書
CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  customer_id UUID REFERENCES customers,
  work_record_id UUID REFERENCES work_records,
  invoice_number TEXT NOT NULL,
  issue_date DATE NOT NULL,
  due_date DATE,
  items JSONB DEFAULT '[]',
  subtotal INTEGER DEFAULT 0,
  tax_amount INTEGER DEFAULT 0,
  total_amount INTEGER DEFAULT 0,
  notes TEXT,
  status TEXT DEFAULT 'draft',
  pdf_url TEXT,
  sent_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLSポリシー有効化
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
```

### 3. WatermelonDBスキーマ定義

```typescript
// src/database/schema.ts
import { appSchema, tableSchema } from '@nozbe/watermelondb';

export default appSchema({
  version: 1,
  tables: [
    tableSchema({
      name: 'user_profiles',
      columns: [
        { name: 'business_name', type: 'string' },
        { name: 'representative_name', type: 'string', isOptional: true },
        { name: 'invoice_registration_number', type: 'string', isOptional: true },
        { name: 'plan', type: 'string' },
        { name: 'is_synced', type: 'boolean' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'customers',
      columns: [
        { name: 'name', type: 'string' },
        { name: 'address', type: 'string', isOptional: true },
        { name: 'phone', type: 'string', isOptional: true },
        { name: 'photos', type: 'string' }, // JSON
        { name: 'memos', type: 'string' }, // JSON
        { name: 'ai_summary', type: 'string', isOptional: true },
        { name: 'is_synced', type: 'boolean' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'work_records',
      columns: [
        { name: 'customer_id', type: 'string', isOptional: true },
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
    tableSchema({
      name: 'daily_reports',
      columns: [
        { name: 'work_record_id', type: 'string' },
        { name: 'customer_id', type: 'string', isOptional: true },
        { name: 'report_date', type: 'string' },
        { name: 'content', type: 'string' }, // JSON
        { name: 'pdf_url', type: 'string', isOptional: true },
        { name: 'timestamp_signature', type: 'string', isOptional: true },
        { name: 'status', type: 'string' },
        { name: 'is_synced', type: 'boolean' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'invoices',
      columns: [
        { name: 'customer_id', type: 'string', isOptional: true },
        { name: 'work_record_id', type: 'string', isOptional: true },
        { name: 'invoice_number', type: 'string' },
        { name: 'issue_date', type: 'string' },
        { name: 'due_date', type: 'string', isOptional: true },
        { name: 'items', type: 'string' }, // JSON
        { name: 'subtotal', type: 'number' },
        { name: 'tax_amount', type: 'number' },
        { name: 'total_amount', type: 'number' },
        { name: 'notes', type: 'string', isOptional: true },
        { name: 'status', type: 'string' },
        { name: 'pdf_url', type: 'string', isOptional: true },
        { name: 'sent_at', type: 'number', isOptional: true },
        { name: 'paid_at', type: 'number', isOptional: true },
        { name: 'is_synced', type: 'boolean' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),
  ],
});
```

### 4. 同期エンジン実装

```typescript
// src/services/sync.ts
import { synchronize } from '@nozbe/watermelondb/sync';

export async function syncDatabase() {
  await synchronize({
    database,
    pullChanges: async ({ lastPulledAt }) => {
      // Supabaseから変更を取得
    },
    pushChanges: async ({ changes }) => {
      // Supabaseに変更をプッシュ
    },
  });
}
```

## 実行コマンド

```bash
# 指示文
genba-app-architectureスキルを参照して、
データ層を構築してください。

作業対象: /Users/tsubasatahara/dev/codeciao/genba/genba-gear

1. Supabaseにテーブルを作成
2. WatermelonDBのモデルとスキーマを定義
3. 同期エンジンを実装
```

## 完了条件

- [ ] Supabaseにすべてのテーブルが作成されている
- [ ] RLSポリシーが設定されている
- [ ] WatermelonDBモデルが定義されている
- [ ] スキーマが定義されている
- [ ] DB初期化処理が実装されている
- [ ] 基本的なCRUD操作が動作する
