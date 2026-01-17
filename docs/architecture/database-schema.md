# GENBA GEAR データベーススキーマ

> 最終更新: 2026-01-17

## 概要

本ドキュメントでは、GENBA GEARで使用するデータベーススキーマを定義します。

- **サーバー側**: Supabase PostgreSQL
- **クライアント側**: WatermelonDB (SQLite)

---

## ER図

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              ER図（物理）                                    │
└─────────────────────────────────────────────────────────────────────────────┘

  ┌──────────────────┐
  │   auth.users     │ (Supabase Auth管理)
  │──────────────────│
  │ id (PK)          │
  │ email            │
  │ phone            │
  │ created_at       │
  └────────┬─────────┘
           │
           │ 1:1
           ▼
  ┌──────────────────┐      ┌──────────────────┐      ┌──────────────────┐
  │business_profiles │      │  bank_accounts   │      │  item_templates  │
  │──────────────────│      │──────────────────│      │──────────────────│
  │ id (PK)          │      │ id (PK)          │      │ id (PK)          │
  │ user_id (FK)     │◄────►│ user_id (FK)     │      │ user_id (FK)     │
  │ business_name    │      │ bank_name        │      │ name             │
  │ representative   │      │ branch_name      │      │ unit             │
  │ postal_code      │      │ account_type     │      │ unit_price       │
  │ address          │      │ account_number   │      │ tax_rate         │
  │ phone            │      │ account_holder   │      │ category         │
  │ email            │      │ is_default       │      │ keywords         │
  │ invoice_reg_num  │      └──────────────────┘      └──────────────────┘
  └────────┬─────────┘
           │
           │ 1:N
           ▼
  ┌──────────────────┐
  │      sites       │
  │──────────────────│
  │ id (PK)          │
  │ user_id (FK)     │
  │ name             │
  │ client_name      │
  │ client_type      │
  │ postal_code      │
  │ address          │
  │ contact_name     │
  │ contact_phone    │
  │ latitude         │
  │ longitude        │
  └────────┬─────────┘
           │
           │ 1:N
           ▼
  ┌──────────────────┐
  │  work_records    │
  │──────────────────│
  │ id (PK)          │
  │ user_id (FK)     │
  │ site_id (FK)     │
  │ recorded_at      │
  │ voice_file_url   │
  │ voice_transcript │
  │ extracted_data   │
  │ work_items       │
  │ materials        │
  │ status           │
  └────────┬─────────┘
           │
     ┌─────┴─────┐
     │           │
     ▼           ▼
┌──────────┐ ┌──────────┐
│ invoices │ │  daily   │
│          │ │ reports  │
└──────────┘ └──────────┘


【チームプラン用（v2）】

  ┌──────────────────┐
  │      teams       │
  │──────────────────│
  │ id (PK)          │
  │ name             │
  │ owner_id (FK)    │──────┐
  │ created_at       │      │
  └────────┬─────────┘      │
           │                │
           │ 1:N            │
           ▼                │
  ┌──────────────────┐      │
  │  team_members    │      │
  │──────────────────│      │
  │ id (PK)          │      │
  │ team_id (FK)     │      │
  │ user_id (FK)     │◄─────┘
  │ role             │
  │ joined_at        │
  └──────────────────┘
```

---

## テーブル定義（Supabase PostgreSQL）

### users（Supabase Auth連携）

Supabase Authの `auth.users` テーブルを使用。追加のプロファイル情報は `business_profiles` で管理。

### business_profiles（事業者情報）

職人の事業者情報を管理。請求書の発行元情報として使用。

```sql
CREATE TABLE public.business_profiles (
  -- 主キー
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 外部キー
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- 事業者情報
  business_name VARCHAR(100) NOT NULL,           -- 屋号（例: 山田電気工事）
  representative_name VARCHAR(50),               -- 代表者名
  postal_code VARCHAR(8),                        -- 郵便番号（ハイフンなし）
  address TEXT,                                  -- 住所
  phone VARCHAR(20),                             -- 電話番号
  email VARCHAR(255),                            -- メールアドレス

  -- インボイス制度対応
  invoice_registration_number VARCHAR(14),       -- T + 13桁（例: T1234567890123）

  -- タイムスタンプ
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- 制約
  CONSTRAINT unique_user_profile UNIQUE (user_id),
  CONSTRAINT valid_invoice_number CHECK (
    invoice_registration_number IS NULL OR
    invoice_registration_number ~ '^T[0-9]{13}$'
  )
);

-- インデックス
CREATE INDEX idx_business_profiles_user_id ON public.business_profiles(user_id);

-- RLS
ALTER TABLE public.business_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON public.business_profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
  ON public.business_profiles FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile"
  ON public.business_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- トリガー: updated_at自動更新
CREATE TRIGGER update_business_profiles_updated_at
  BEFORE UPDATE ON public.business_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
```

### bank_accounts（振込先）

請求書に記載する振込先情報。複数登録可能。

```sql
CREATE TABLE public.bank_accounts (
  -- 主キー
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 外部キー
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- 銀行情報
  bank_name VARCHAR(50) NOT NULL,                -- 銀行名
  branch_name VARCHAR(50) NOT NULL,              -- 支店名
  account_type VARCHAR(10) NOT NULL DEFAULT '普通', -- 口座種別（普通/当座）
  account_number VARCHAR(10) NOT NULL,           -- 口座番号
  account_holder VARCHAR(50) NOT NULL,           -- 口座名義（カタカナ）

  -- フラグ
  is_default BOOLEAN NOT NULL DEFAULT FALSE,     -- デフォルト口座

  -- タイムスタンプ
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- 制約
  CONSTRAINT valid_account_type CHECK (account_type IN ('普通', '当座'))
);

-- インデックス
CREATE INDEX idx_bank_accounts_user_id ON public.bank_accounts(user_id);
CREATE INDEX idx_bank_accounts_default ON public.bank_accounts(user_id, is_default) WHERE is_default = TRUE;

-- RLS
ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own bank accounts"
  ON public.bank_accounts FOR ALL
  USING (auth.uid() = user_id);

-- トリガー: デフォルト口座は1つのみ
CREATE OR REPLACE FUNCTION public.ensure_single_default_bank_account()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_default = TRUE THEN
    UPDATE public.bank_accounts
    SET is_default = FALSE
    WHERE user_id = NEW.user_id AND id != NEW.id AND is_default = TRUE;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ensure_single_default_bank_account
  BEFORE INSERT OR UPDATE ON public.bank_accounts
  FOR EACH ROW
  EXECUTE FUNCTION public.ensure_single_default_bank_account();
```

### item_templates（品目テンプレート）

よく使う作業項目と単価のマスター。音声認識でマッチングに使用。

```sql
CREATE TABLE public.item_templates (
  -- 主キー
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 外部キー
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- 品目情報
  name VARCHAR(100) NOT NULL,                    -- 品目名（例: エアコン設置工事）
  description TEXT,                              -- 詳細説明
  unit VARCHAR(20) NOT NULL,                     -- 単位（式、個、m、時間 等）
  unit_price INTEGER NOT NULL,                   -- 単価（税抜、円）
  tax_rate INTEGER NOT NULL DEFAULT 10,          -- 税率（%）
  category VARCHAR(50),                          -- カテゴリ（工事、材料、出張 等）

  -- 音声認識マッチング用
  keywords TEXT[] DEFAULT '{}',                  -- キーワード配列

  -- 表示順
  sort_order INTEGER NOT NULL DEFAULT 0,

  -- フラグ
  is_active BOOLEAN NOT NULL DEFAULT TRUE,

  -- タイムスタンプ
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- 制約
  CONSTRAINT valid_tax_rate CHECK (tax_rate IN (8, 10)),
  CONSTRAINT valid_unit_price CHECK (unit_price >= 0)
);

-- インデックス
CREATE INDEX idx_item_templates_user_id ON public.item_templates(user_id);
CREATE INDEX idx_item_templates_active ON public.item_templates(user_id, is_active) WHERE is_active = TRUE;
CREATE INDEX idx_item_templates_keywords ON public.item_templates USING GIN(keywords);

-- RLS
ALTER TABLE public.item_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own templates"
  ON public.item_templates FOR ALL
  USING (auth.uid() = user_id);
```

### sites（現場/顧客）

作業現場・顧客情報を管理。

```sql
CREATE TABLE public.sites (
  -- 主キー
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 外部キー
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL, -- v2: チーム共有

  -- 現場情報
  name VARCHAR(100) NOT NULL,                    -- 現場名（例: 田中邸、○○ビル）
  client_name VARCHAR(100),                      -- 顧客名
  client_type VARCHAR(20) NOT NULL DEFAULT 'individual', -- 顧客種別

  -- 住所情報
  postal_code VARCHAR(8),                        -- 郵便番号
  address TEXT,                                  -- 住所

  -- 連絡先
  contact_name VARCHAR(50),                      -- 担当者名
  contact_phone VARCHAR(20),                     -- 電話番号
  contact_email VARCHAR(255),                    -- メールアドレス

  -- GPS
  latitude DECIMAL(10, 8),                       -- 緯度
  longitude DECIMAL(11, 8),                      -- 経度

  -- 備考
  notes TEXT,                                    -- 備考（駐車場情報等）

  -- フラグ
  is_active BOOLEAN NOT NULL DEFAULT TRUE,

  -- タイムスタンプ
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- 制約
  CONSTRAINT valid_client_type CHECK (client_type IN ('individual', 'company'))
);

-- インデックス
CREATE INDEX idx_sites_user_id ON public.sites(user_id);
CREATE INDEX idx_sites_team_id ON public.sites(team_id) WHERE team_id IS NOT NULL;
CREATE INDEX idx_sites_name ON public.sites USING GIN(to_tsvector('japanese', name));
CREATE INDEX idx_sites_active ON public.sites(user_id, is_active) WHERE is_active = TRUE;

-- RLS
ALTER TABLE public.sites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own sites"
  ON public.sites FOR ALL
  USING (auth.uid() = user_id);

-- v2: チームメンバーは閲覧可能
CREATE POLICY "Team members can view team sites"
  ON public.sites FOR SELECT
  USING (
    team_id IN (
      SELECT team_id FROM public.team_members WHERE user_id = auth.uid()
    )
  );
```

### work_records（作業記録）

音声入力の元データを保持。請求書・日報の元となる。

```sql
CREATE TABLE public.work_records (
  -- 主キー
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 外部キー
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  site_id UUID REFERENCES public.sites(id) ON DELETE SET NULL,
  team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL, -- v2

  -- 記録情報
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), -- 記録日時

  -- 音声データ
  voice_file_url TEXT,                           -- 音声ファイルURL（Storage）
  voice_transcript TEXT,                         -- 音声文字起こし結果

  -- AI抽出データ
  extracted_data JSONB,                          -- AI抽出した構造化データ全体

  -- 作業情報（JSONBで柔軟に）
  work_items JSONB NOT NULL DEFAULT '[]',        -- 作業内容配列
  materials JSONB NOT NULL DEFAULT '[]',         -- 使用材料配列
  additional_work JSONB NOT NULL DEFAULT '[]',   -- 追加作業配列

  -- 作業時間
  work_start_time TIME,                          -- 作業開始時刻
  work_end_time TIME,                            -- 作業終了時刻

  -- 備考
  notes TEXT,                                    -- 備考・申し送り

  -- ステータス
  status VARCHAR(20) NOT NULL DEFAULT 'draft',   -- draft/confirmed

  -- タイムスタンプ
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- 制約
  CONSTRAINT valid_status CHECK (status IN ('draft', 'confirmed'))
);

-- インデックス
CREATE INDEX idx_work_records_user_id ON public.work_records(user_id);
CREATE INDEX idx_work_records_site_id ON public.work_records(site_id);
CREATE INDEX idx_work_records_recorded_at ON public.work_records(recorded_at DESC);
CREATE INDEX idx_work_records_status ON public.work_records(user_id, status);

-- RLS
ALTER TABLE public.work_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own work records"
  ON public.work_records FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Team members can view team work records"
  ON public.work_records FOR SELECT
  USING (
    team_id IN (
      SELECT team_id FROM public.team_members WHERE user_id = auth.uid()
    )
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
    "tax_rate": 10,
    "completed": true,
    "template_id": "uuid-of-template"
  }
]
```

**materials JSON構造:**

```json
[
  {
    "name": "冷媒配管",
    "quantity": "2m",
    "unit_price": 3000
  }
]
```

### invoices（請求書）

```sql
CREATE TABLE public.invoices (
  -- 主キー
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 外部キー
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  site_id UUID REFERENCES public.sites(id) ON DELETE SET NULL,
  work_record_id UUID REFERENCES public.work_records(id) ON DELETE SET NULL,

  -- 請求書番号
  invoice_number VARCHAR(30) NOT NULL,           -- INV-2026-0001形式

  -- 日付
  issue_date DATE NOT NULL,                      -- 発行日
  due_date DATE,                                 -- 支払期限

  -- 明細
  items JSONB NOT NULL,                          -- 明細配列

  -- 金額
  subtotal INTEGER NOT NULL,                     -- 小計（税抜）
  tax_amount INTEGER NOT NULL,                   -- 消費税額
  total_amount INTEGER NOT NULL,                 -- 合計（税込）

  -- 税率別内訳（インボイス制度対応）
  tax_breakdown JSONB NOT NULL DEFAULT '{}',     -- {"10": 5000, "8": 80}

  -- ステータス
  status VARCHAR(20) NOT NULL DEFAULT 'draft',   -- draft/sent/paid

  -- 送付・支払日時
  sent_at TIMESTAMPTZ,                           -- 送付日時
  paid_at TIMESTAMPTZ,                           -- 支払日時

  -- PDF
  pdf_url TEXT,                                  -- 生成済みPDFのURL

  -- 備考
  notes TEXT,                                    -- 備考

  -- タイムスタンプ
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- 制約
  CONSTRAINT unique_invoice_number UNIQUE (user_id, invoice_number),
  CONSTRAINT valid_invoice_status CHECK (status IN ('draft', 'sent', 'paid')),
  CONSTRAINT valid_amounts CHECK (subtotal >= 0 AND tax_amount >= 0 AND total_amount >= 0)
);

-- インデックス
CREATE INDEX idx_invoices_user_id ON public.invoices(user_id);
CREATE INDEX idx_invoices_site_id ON public.invoices(site_id);
CREATE INDEX idx_invoices_status ON public.invoices(user_id, status);
CREATE INDEX idx_invoices_issue_date ON public.invoices(issue_date DESC);

-- RLS
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own invoices"
  ON public.invoices FOR ALL
  USING (auth.uid() = user_id);
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
  },
  {
    "description": "冷媒配管追加",
    "quantity": 2,
    "unit": "m",
    "unit_price": 3000,
    "amount": 6000,
    "tax_rate": 10
  }
]
```

### daily_reports（日報）

```sql
CREATE TABLE public.daily_reports (
  -- 主キー
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 外部キー
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  site_id UUID REFERENCES public.sites(id) ON DELETE SET NULL,
  work_record_id UUID REFERENCES public.work_records(id) ON DELETE SET NULL,
  team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL, -- v2

  -- 日報日付
  report_date DATE NOT NULL,                     -- 日報の対象日

  -- 作業内容
  work_items JSONB NOT NULL,                     -- 作業内容配列
  materials JSONB NOT NULL DEFAULT '[]',         -- 使用材料
  additional_work JSONB NOT NULL DEFAULT '[]',   -- 追加作業

  -- 作業者情報
  worker_name VARCHAR(50),                       -- 作業者名
  work_hours DECIMAL(4, 2),                      -- 作業時間（時間単位）

  -- 天気（自動取得）
  weather VARCHAR(20),                           -- 天気（晴/曇/雨 等）
  temperature DECIMAL(4, 1),                     -- 気温

  -- 備考
  notes TEXT,                                    -- 備考

  -- PDF
  pdf_url TEXT,                                  -- 生成済みPDFのURL

  -- タイムスタンプ
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- インデックス
CREATE INDEX idx_daily_reports_user_id ON public.daily_reports(user_id);
CREATE INDEX idx_daily_reports_site_id ON public.daily_reports(site_id);
CREATE INDEX idx_daily_reports_date ON public.daily_reports(report_date DESC);
CREATE INDEX idx_daily_reports_team_id ON public.daily_reports(team_id) WHERE team_id IS NOT NULL;

-- RLS
ALTER TABLE public.daily_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own reports"
  ON public.daily_reports FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Team members can view team reports"
  ON public.daily_reports FOR SELECT
  USING (
    team_id IN (
      SELECT team_id FROM public.team_members WHERE user_id = auth.uid()
    )
  );
```

---

## チームプラン用テーブル（v2）

### teams（チーム）

```sql
CREATE TABLE public.teams (
  -- 主キー
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- チーム情報
  name VARCHAR(100) NOT NULL,                    -- チーム名
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- 設定
  settings JSONB NOT NULL DEFAULT '{}',          -- チーム設定

  -- タイムスタンプ
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team owners can manage team"
  ON public.teams FOR ALL
  USING (auth.uid() = owner_id);

CREATE POLICY "Team members can view team"
  ON public.teams FOR SELECT
  USING (
    id IN (
      SELECT team_id FROM public.team_members WHERE user_id = auth.uid()
    )
  );
```

### team_members（チームメンバー）

```sql
CREATE TABLE public.team_members (
  -- 主キー
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 外部キー
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- ロール
  role VARCHAR(20) NOT NULL DEFAULT 'member',    -- owner/admin/member

  -- タイムスタンプ
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- 制約
  CONSTRAINT unique_team_member UNIQUE (team_id, user_id),
  CONSTRAINT valid_role CHECK (role IN ('owner', 'admin', 'member'))
);

-- インデックス
CREATE INDEX idx_team_members_team_id ON public.team_members(team_id);
CREATE INDEX idx_team_members_user_id ON public.team_members(user_id);

-- RLS
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members can view members"
  ON public.team_members FOR SELECT
  USING (
    team_id IN (
      SELECT team_id FROM public.team_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage members"
  ON public.team_members FOR ALL
  USING (
    team_id IN (
      SELECT team_id FROM public.team_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );
```

---

## 共通関数・トリガー

### updated_at自動更新

```sql
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 各テーブルにトリガー設定
CREATE TRIGGER update_sites_updated_at
  BEFORE UPDATE ON public.sites
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- （他のテーブルも同様）
```

---

## WatermelonDB スキーマ（クライアント側）

```typescript
// src/database/schema.ts
import { appSchema, tableSchema } from '@nozbe/watermelondb';

export const schema = appSchema({
  version: 1,
  tables: [
    // 現場
    tableSchema({
      name: 'sites',
      columns: [
        { name: 'server_id', type: 'string', isOptional: true },
        { name: 'name', type: 'string' },
        { name: 'client_name', type: 'string', isOptional: true },
        { name: 'client_type', type: 'string' },
        { name: 'postal_code', type: 'string', isOptional: true },
        { name: 'address', type: 'string', isOptional: true },
        { name: 'contact_name', type: 'string', isOptional: true },
        { name: 'contact_phone', type: 'string', isOptional: true },
        { name: 'latitude', type: 'number', isOptional: true },
        { name: 'longitude', type: 'number', isOptional: true },
        { name: 'notes', type: 'string', isOptional: true },
        { name: 'is_active', type: 'boolean' },
        { name: 'is_synced', type: 'boolean' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),

    // 作業記録
    tableSchema({
      name: 'work_records',
      columns: [
        { name: 'server_id', type: 'string', isOptional: true },
        { name: 'site_id', type: 'string', isIndexed: true },
        { name: 'recorded_at', type: 'number', isIndexed: true },
        { name: 'voice_file_url', type: 'string', isOptional: true },
        { name: 'voice_transcript', type: 'string', isOptional: true },
        { name: 'extracted_data', type: 'string', isOptional: true }, // JSON
        { name: 'work_items', type: 'string' }, // JSON
        { name: 'materials', type: 'string' }, // JSON
        { name: 'additional_work', type: 'string' }, // JSON
        { name: 'work_start_time', type: 'string', isOptional: true },
        { name: 'work_end_time', type: 'string', isOptional: true },
        { name: 'notes', type: 'string', isOptional: true },
        { name: 'status', type: 'string' },
        { name: 'is_synced', type: 'boolean' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),

    // 請求書
    tableSchema({
      name: 'invoices',
      columns: [
        { name: 'server_id', type: 'string', isOptional: true },
        { name: 'site_id', type: 'string', isIndexed: true },
        { name: 'work_record_id', type: 'string', isOptional: true },
        { name: 'invoice_number', type: 'string' },
        { name: 'issue_date', type: 'number', isIndexed: true },
        { name: 'due_date', type: 'number', isOptional: true },
        { name: 'items', type: 'string' }, // JSON
        { name: 'subtotal', type: 'number' },
        { name: 'tax_amount', type: 'number' },
        { name: 'total_amount', type: 'number' },
        { name: 'tax_breakdown', type: 'string' }, // JSON
        { name: 'status', type: 'string', isIndexed: true },
        { name: 'pdf_url', type: 'string', isOptional: true },
        { name: 'notes', type: 'string', isOptional: true },
        { name: 'is_synced', type: 'boolean' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),

    // 日報
    tableSchema({
      name: 'daily_reports',
      columns: [
        { name: 'server_id', type: 'string', isOptional: true },
        { name: 'site_id', type: 'string', isIndexed: true },
        { name: 'work_record_id', type: 'string', isOptional: true },
        { name: 'report_date', type: 'number', isIndexed: true },
        { name: 'work_items', type: 'string' }, // JSON
        { name: 'materials', type: 'string' }, // JSON
        { name: 'additional_work', type: 'string' }, // JSON
        { name: 'worker_name', type: 'string', isOptional: true },
        { name: 'work_hours', type: 'number', isOptional: true },
        { name: 'weather', type: 'string', isOptional: true },
        { name: 'temperature', type: 'number', isOptional: true },
        { name: 'notes', type: 'string', isOptional: true },
        { name: 'pdf_url', type: 'string', isOptional: true },
        { name: 'is_synced', type: 'boolean' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),

    // 品目テンプレート
    tableSchema({
      name: 'item_templates',
      columns: [
        { name: 'server_id', type: 'string', isOptional: true },
        { name: 'name', type: 'string' },
        { name: 'description', type: 'string', isOptional: true },
        { name: 'unit', type: 'string' },
        { name: 'unit_price', type: 'number' },
        { name: 'tax_rate', type: 'number' },
        { name: 'category', type: 'string', isOptional: true },
        { name: 'keywords', type: 'string' }, // JSON array
        { name: 'sort_order', type: 'number' },
        { name: 'is_active', type: 'boolean' },
        { name: 'is_synced', type: 'boolean' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),

    // 事業者情報
    tableSchema({
      name: 'business_profiles',
      columns: [
        { name: 'server_id', type: 'string', isOptional: true },
        { name: 'business_name', type: 'string' },
        { name: 'representative_name', type: 'string', isOptional: true },
        { name: 'postal_code', type: 'string', isOptional: true },
        { name: 'address', type: 'string', isOptional: true },
        { name: 'phone', type: 'string', isOptional: true },
        { name: 'email', type: 'string', isOptional: true },
        { name: 'invoice_registration_number', type: 'string', isOptional: true },
        { name: 'is_synced', type: 'boolean' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),

    // 振込先
    tableSchema({
      name: 'bank_accounts',
      columns: [
        { name: 'server_id', type: 'string', isOptional: true },
        { name: 'bank_name', type: 'string' },
        { name: 'branch_name', type: 'string' },
        { name: 'account_type', type: 'string' },
        { name: 'account_number', type: 'string' },
        { name: 'account_holder', type: 'string' },
        { name: 'is_default', type: 'boolean' },
        { name: 'is_synced', type: 'boolean' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),

    // 音声処理キュー（オフライン用）
    tableSchema({
      name: 'voice_queue',
      columns: [
        { name: 'audio_uri', type: 'string' },
        { name: 'metadata', type: 'string' }, // JSON
        { name: 'status', type: 'string' }, // pending/processing/completed/failed
        { name: 'error_message', type: 'string', isOptional: true },
        { name: 'retry_count', type: 'number' },
        { name: 'created_at', type: 'number' },
      ],
    }),
  ],
});
```

---

## 同期戦略

### 同期フィールド

各テーブルに以下のフィールドを持つ:

| フィールド | 用途 |
|-----------|------|
| `server_id` | サーバー側のUUID（同期後に設定） |
| `is_synced` | 同期済みフラグ |
| `created_at` | 作成日時 |
| `updated_at` | 更新日時 |

### 競合解決

**Last Write Wins (LWW)**: `updated_at` が新しい方を優先。

```typescript
const resolveConflict = (local: any, remote: any) => {
  if (new Date(remote.updated_at) > new Date(local.updated_at)) {
    return remote;
  }
  return local;
};
```

---

## 関連ドキュメント

- [オフライン同期詳細](/.claude/skills/genba-app-architecture/references/offline-sync.md)
- [コーディングガイドライン](./coding-guidelines.md)
- [API設計](./api-design.md)
