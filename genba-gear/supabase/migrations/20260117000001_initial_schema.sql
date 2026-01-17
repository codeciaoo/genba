-- GENBA GEAR Initial Database Schema
-- Version: 1.0.0
-- Date: 2026-01-17

-- ======================
-- 共通関数
-- ======================

-- updated_at自動更新関数
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ======================
-- business_profiles（事業者情報）
-- ======================

CREATE TABLE public.business_profiles (
  -- 主キー
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 外部キー
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- 事業者情報
  business_name VARCHAR(100) NOT NULL,
  representative_name VARCHAR(50),
  postal_code VARCHAR(8),
  address TEXT,
  phone VARCHAR(20),
  email VARCHAR(255),

  -- インボイス制度対応
  invoice_registration_number VARCHAR(14),

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

-- トリガー
CREATE TRIGGER update_business_profiles_updated_at
  BEFORE UPDATE ON public.business_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ======================
-- bank_accounts（振込先）
-- ======================

CREATE TABLE public.bank_accounts (
  -- 主キー
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 外部キー
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- 銀行情報
  bank_name VARCHAR(50) NOT NULL,
  branch_name VARCHAR(50) NOT NULL,
  account_type VARCHAR(10) NOT NULL DEFAULT '普通',
  account_number VARCHAR(10) NOT NULL,
  account_holder VARCHAR(50) NOT NULL,

  -- フラグ
  is_default BOOLEAN NOT NULL DEFAULT FALSE,

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

-- デフォルト口座は1つのみ
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

-- トリガー
CREATE TRIGGER update_bank_accounts_updated_at
  BEFORE UPDATE ON public.bank_accounts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ======================
-- item_templates（品目テンプレート）
-- ======================

CREATE TABLE public.item_templates (
  -- 主キー
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 外部キー
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- 品目情報
  name VARCHAR(100) NOT NULL,
  description TEXT,
  unit VARCHAR(20) NOT NULL,
  unit_price INTEGER NOT NULL,
  tax_rate INTEGER NOT NULL DEFAULT 10,
  category VARCHAR(50),

  -- 音声認識マッチング用
  keywords TEXT[] DEFAULT '{}',

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

-- トリガー
CREATE TRIGGER update_item_templates_updated_at
  BEFORE UPDATE ON public.item_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ======================
-- sites（現場/顧客）
-- ======================

CREATE TABLE public.sites (
  -- 主キー
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 外部キー
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- 現場情報
  name VARCHAR(100) NOT NULL,
  client_name VARCHAR(100),
  client_type VARCHAR(20) NOT NULL DEFAULT 'individual',

  -- 住所情報
  postal_code VARCHAR(8),
  address TEXT,

  -- 連絡先
  contact_name VARCHAR(50),
  contact_phone VARCHAR(20),
  contact_email VARCHAR(255),

  -- GPS
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),

  -- 備考
  notes TEXT,

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
CREATE INDEX idx_sites_active ON public.sites(user_id, is_active) WHERE is_active = TRUE;

-- RLS
ALTER TABLE public.sites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own sites"
  ON public.sites FOR ALL
  USING (auth.uid() = user_id);

-- トリガー
CREATE TRIGGER update_sites_updated_at
  BEFORE UPDATE ON public.sites
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ======================
-- work_records（作業記録）
-- ======================

CREATE TABLE public.work_records (
  -- 主キー
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 外部キー
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  site_id UUID REFERENCES public.sites(id) ON DELETE SET NULL,

  -- 記録情報
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- 音声データ
  voice_file_url TEXT,
  voice_transcript TEXT,

  -- AI抽出データ
  extracted_data JSONB,

  -- 作業情報
  work_items JSONB NOT NULL DEFAULT '[]',
  materials JSONB NOT NULL DEFAULT '[]',
  additional_work JSONB NOT NULL DEFAULT '[]',

  -- 作業時間
  work_start_time TIME,
  work_end_time TIME,

  -- 備考
  notes TEXT,

  -- ステータス
  status VARCHAR(20) NOT NULL DEFAULT 'draft',

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

-- トリガー
CREATE TRIGGER update_work_records_updated_at
  BEFORE UPDATE ON public.work_records
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ======================
-- invoices（請求書）
-- ======================

CREATE TABLE public.invoices (
  -- 主キー
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 外部キー
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  site_id UUID REFERENCES public.sites(id) ON DELETE SET NULL,
  work_record_id UUID REFERENCES public.work_records(id) ON DELETE SET NULL,

  -- 請求書番号
  invoice_number VARCHAR(30) NOT NULL,

  -- 日付
  issue_date DATE NOT NULL,
  due_date DATE,

  -- 明細
  items JSONB NOT NULL,

  -- 金額
  subtotal INTEGER NOT NULL,
  tax_amount INTEGER NOT NULL,
  total_amount INTEGER NOT NULL,

  -- 税率別内訳（インボイス制度対応）
  tax_breakdown JSONB NOT NULL DEFAULT '{}',

  -- ステータス
  status VARCHAR(20) NOT NULL DEFAULT 'draft',

  -- 送付・支払日時
  sent_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,

  -- PDF
  pdf_url TEXT,

  -- 備考
  notes TEXT,

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

-- トリガー
CREATE TRIGGER update_invoices_updated_at
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ======================
-- daily_reports（日報）
-- ======================

CREATE TABLE public.daily_reports (
  -- 主キー
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 外部キー
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  site_id UUID REFERENCES public.sites(id) ON DELETE SET NULL,
  work_record_id UUID REFERENCES public.work_records(id) ON DELETE SET NULL,

  -- 日報日付
  report_date DATE NOT NULL,

  -- 作業内容
  work_items JSONB NOT NULL,
  materials JSONB NOT NULL DEFAULT '[]',
  additional_work JSONB NOT NULL DEFAULT '[]',

  -- 作業者情報
  worker_name VARCHAR(50),
  work_hours DECIMAL(4, 2),

  -- 天気
  weather VARCHAR(20),
  temperature DECIMAL(4, 1),

  -- 備考
  notes TEXT,

  -- PDF
  pdf_url TEXT,

  -- タイムスタンプ
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- インデックス
CREATE INDEX idx_daily_reports_user_id ON public.daily_reports(user_id);
CREATE INDEX idx_daily_reports_site_id ON public.daily_reports(site_id);
CREATE INDEX idx_daily_reports_date ON public.daily_reports(report_date DESC);

-- RLS
ALTER TABLE public.daily_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own reports"
  ON public.daily_reports FOR ALL
  USING (auth.uid() = user_id);

-- トリガー
CREATE TRIGGER update_daily_reports_updated_at
  BEFORE UPDATE ON public.daily_reports
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
