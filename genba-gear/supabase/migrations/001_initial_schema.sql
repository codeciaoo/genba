-- GENBA GEAR 初期スキーマ
-- 実行方法: Supabase Dashboard > SQL Editor でこのファイルの内容を実行

-- =====================================================
-- 1. テーブル作成
-- =====================================================

-- business_profiles テーブル（ユーザープロファイル）
CREATE TABLE IF NOT EXISTS public.business_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  business_name TEXT NOT NULL,
  representative_name TEXT,
  postal_code TEXT,
  address TEXT,
  phone TEXT,
  email TEXT,
  invoice_registration_number TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- bank_accounts テーブル（振込先口座）
CREATE TABLE IF NOT EXISTS public.bank_accounts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  bank_name TEXT NOT NULL,
  branch_name TEXT NOT NULL,
  account_type TEXT NOT NULL CHECK (account_type IN ('ordinary', 'checking')),
  account_number TEXT NOT NULL,
  account_holder TEXT NOT NULL,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- item_templates テーブル（品目テンプレート）
CREATE TABLE IF NOT EXISTS public.item_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  unit TEXT NOT NULL,
  unit_price INTEGER NOT NULL,
  tax_rate INTEGER NOT NULL CHECK (tax_rate IN (10, 8)),
  category TEXT,
  voice_keywords TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- work_records テーブル（作業記録/日報）
CREATE TABLE IF NOT EXISTS public.work_records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  voice_transcript TEXT,
  structured_data JSONB,
  gps_latitude DOUBLE PRECISION,
  gps_longitude DOUBLE PRECISION,
  weather TEXT,
  temperature DOUBLE PRECISION,
  recorded_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'confirmed', 'exported')),
  is_synced BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- =====================================================
-- 2. RLS（Row Level Security）有効化
-- =====================================================

ALTER TABLE public.business_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.item_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_records ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 3. RLSポリシー設定
-- =====================================================

-- business_profiles: 自分のプロファイルのみアクセス可能
CREATE POLICY "Users can view own profile"
  ON public.business_profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
  ON public.business_profiles FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile"
  ON public.business_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- bank_accounts: 自分の口座のみアクセス可能
CREATE POLICY "Users can manage own bank accounts"
  ON public.bank_accounts FOR ALL
  USING (auth.uid() = user_id);

-- item_templates: 自分の品目のみアクセス可能
CREATE POLICY "Users can manage own templates"
  ON public.item_templates FOR ALL
  USING (auth.uid() = user_id);

-- work_records: 自分の作業記録のみアクセス可能
CREATE POLICY "Users can manage own work records"
  ON public.work_records FOR ALL
  USING (auth.uid() = user_id);

-- =====================================================
-- 4. updated_at 自動更新トリガー
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_business_profiles_updated_at
  BEFORE UPDATE ON public.business_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bank_accounts_updated_at
  BEFORE UPDATE ON public.bank_accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_item_templates_updated_at
  BEFORE UPDATE ON public.item_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_work_records_updated_at
  BEFORE UPDATE ON public.work_records
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
