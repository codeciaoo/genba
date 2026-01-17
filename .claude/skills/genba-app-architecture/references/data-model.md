# データモデル詳細

## ER図（概念）

```
┌─────────────┐       ┌─────────────┐
│    User     │───────│BusinessProfile│
└─────────────┘       └─────────────┘
       │                     │
       │              ┌──────┴──────┐
       │              │             │
       ▼              ▼             ▼
┌─────────────┐ ┌───────────┐ ┌───────────┐
│    Site     │ │BankAccount│ │ItemTemplate│
└─────────────┘ └───────────┘ └───────────┘
       │
       │
       ▼
┌─────────────┐
│ WorkRecord  │
└─────────────┘
       │
       ├──────────────┐
       ▼              ▼
┌─────────────┐ ┌─────────────┐
│   Invoice   │ │ DailyReport │
└─────────────┘ └─────────────┘
```

## テーブル定義

### users (Supabase Auth連携)

Supabase Authのauth.usersと連携。追加情報はprofilesテーブルで管理。

### business_profiles (事業者情報)

```sql
CREATE TABLE business_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  business_name VARCHAR(100) NOT NULL,        -- 屋号
  representative_name VARCHAR(50),            -- 代表者名
  postal_code VARCHAR(8),                     -- 郵便番号
  address TEXT,                               -- 住所
  phone VARCHAR(20),                          -- 電話番号
  email VARCHAR(255),                         -- メールアドレス
  invoice_registration_number VARCHAR(14),   -- T + 13桁
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);
```

### bank_accounts (振込先)

```sql
CREATE TABLE bank_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  bank_name VARCHAR(50) NOT NULL,
  branch_name VARCHAR(50) NOT NULL,
  account_type VARCHAR(10) DEFAULT '普通',    -- 普通/当座
  account_number VARCHAR(10) NOT NULL,
  account_holder VARCHAR(50) NOT NULL,        -- カタカナ
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### item_templates (品目テンプレート)

職人がよく使う作業項目と単価のマスター。

```sql
CREATE TABLE item_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,                 -- 品目名
  description TEXT,                           -- 詳細説明
  unit VARCHAR(20) NOT NULL,                  -- 単位（式、個、m、時間等）
  unit_price INTEGER NOT NULL,                -- 単価（税抜）
  tax_rate INTEGER DEFAULT 10,                -- 税率（%）
  category VARCHAR(50),                       -- カテゴリ（工事、材料、出張等）
  keywords TEXT[],                            -- 音声認識用キーワード
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 音声認識でマッチングしやすいよう、keywordsにGINインデックス
CREATE INDEX idx_item_templates_keywords ON item_templates USING GIN(keywords);
```

### sites (現場/顧客)

```sql
CREATE TABLE sites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,                 -- 現場名（田中邸、○○ビル等）
  client_name VARCHAR(100),                   -- 顧客名
  client_type VARCHAR(20) DEFAULT 'individual', -- individual/company
  postal_code VARCHAR(8),
  address TEXT,
  contact_name VARCHAR(50),                   -- 担当者名
  contact_phone VARCHAR(20),
  contact_email VARCHAR(255),
  notes TEXT,                                 -- 備考（駐車場情報等）
  latitude DECIMAL(10, 8),                    -- GPS用
  longitude DECIMAL(11, 8),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 現場名での検索用
CREATE INDEX idx_sites_name ON sites USING GIN(to_tsvector('japanese', name));
```

### work_records (作業記録)

音声入力の元データを保持。請求書・日報の元となる。

```sql
CREATE TABLE work_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  site_id UUID REFERENCES sites(id),
  recorded_at TIMESTAMPTZ DEFAULT NOW(),      -- 記録日時
  voice_file_url TEXT,                        -- 音声ファイルURL（Storage）
  voice_transcript TEXT,                      -- 音声文字起こし結果
  extracted_data JSONB,                       -- AI抽出した構造化データ
  work_items JSONB DEFAULT '[]',              -- 作業内容配列
  materials JSONB DEFAULT '[]',               -- 使用材料配列
  notes TEXT,                                 -- 備考
  work_start_time TIME,
  work_end_time TIME,
  status VARCHAR(20) DEFAULT 'draft',         -- draft/confirmed
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**work_items JSON構造:**
```json
[
  {
    "description": "エアコン設置",
    "details": "リビング 14畳用",
    "quantity": 1,
    "unit": "式",
    "unit_price": 50000,
    "completed": true
  }
]
```

### invoices (請求書)

```sql
CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  site_id UUID REFERENCES sites(id),
  work_record_id UUID REFERENCES work_records(id),
  invoice_number VARCHAR(30) NOT NULL,        -- INV-2026-0001形式
  issue_date DATE NOT NULL,
  due_date DATE,
  items JSONB NOT NULL,                       -- 明細配列
  subtotal INTEGER NOT NULL,                  -- 小計（税抜）
  tax_amount INTEGER NOT NULL,                -- 消費税額
  total_amount INTEGER NOT NULL,              -- 合計（税込）
  status VARCHAR(20) DEFAULT 'draft',         -- draft/sent/paid
  sent_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  pdf_url TEXT,                               -- 生成済みPDFのURL
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, invoice_number)
);

-- ステータス別検索用
CREATE INDEX idx_invoices_status ON invoices(user_id, status);
```

**items JSON構造:**
```json
[
  {
    "description": "エアコン設置工事",
    "quantity": 1,
    "unit": "式",
    "unit_price": 50000,
    "amount": 50000,
    "tax_rate": 10
  }
]
```

### daily_reports (日報)

```sql
CREATE TABLE daily_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  site_id UUID REFERENCES sites(id),
  work_record_id UUID REFERENCES work_records(id),
  report_date DATE NOT NULL,
  work_items JSONB NOT NULL,
  materials JSONB DEFAULT '[]',
  additional_work JSONB DEFAULT '[]',
  notes TEXT,
  worker_name VARCHAR(50),
  work_hours DECIMAL(4, 2),
  pdf_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

## WatermelonDB スキーマ（ローカル）

```typescript
// src/database/schema.ts
import { appSchema, tableSchema } from '@nozbe/watermelondb';

export const schema = appSchema({
  version: 1,
  tables: [
    tableSchema({
      name: 'sites',
      columns: [
        { name: 'server_id', type: 'string', isOptional: true },
        { name: 'name', type: 'string' },
        { name: 'client_name', type: 'string', isOptional: true },
        { name: 'address', type: 'string', isOptional: true },
        { name: 'contact_phone', type: 'string', isOptional: true },
        { name: 'notes', type: 'string', isOptional: true },
        { name: 'is_synced', type: 'boolean' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'work_records',
      columns: [
        { name: 'server_id', type: 'string', isOptional: true },
        { name: 'site_id', type: 'string', isIndexed: true },
        { name: 'recorded_at', type: 'number' },
        { name: 'voice_transcript', type: 'string', isOptional: true },
        { name: 'extracted_data', type: 'string' }, // JSON文字列
        { name: 'status', type: 'string' },
        { name: 'is_synced', type: 'boolean' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'invoices',
      columns: [
        { name: 'server_id', type: 'string', isOptional: true },
        { name: 'site_id', type: 'string', isIndexed: true },
        { name: 'work_record_id', type: 'string', isOptional: true },
        { name: 'invoice_number', type: 'string' },
        { name: 'issue_date', type: 'number' },
        { name: 'due_date', type: 'number', isOptional: true },
        { name: 'items', type: 'string' }, // JSON文字列
        { name: 'total_amount', type: 'number' },
        { name: 'status', type: 'string' },
        { name: 'is_synced', type: 'boolean' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'item_templates',
      columns: [
        { name: 'server_id', type: 'string', isOptional: true },
        { name: 'name', type: 'string' },
        { name: 'unit', type: 'string' },
        { name: 'unit_price', type: 'number' },
        { name: 'tax_rate', type: 'number' },
        { name: 'keywords', type: 'string' }, // JSON配列
        { name: 'is_synced', type: 'boolean' },
      ],
    }),
  ],
});
```

## 同期戦略

1. **作成時**: ローカルDBに即座に保存、`is_synced: false`
2. **オンライン復帰時**: 未同期データをSupabaseにプッシュ
3. **競合解決**: `updated_at`が新しい方を優先（Last Write Wins）
4. **削除**: 論理削除（`deleted_at`）を使用し、同期時に反映
