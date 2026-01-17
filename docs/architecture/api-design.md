# GENBA GEAR API設計

> 最終更新: 2026-01-17

## 概要

本ドキュメントでは、GENBA GEARで使用するAPI（Supabase Edge Functions）の設計を定義します。

---

## API一覧

| エンドポイント | メソッド | 用途 | MVP |
|---------------|---------|------|-----|
| `/functions/v1/process-voice` | POST | 音声文字起こし + 構造化抽出 | Yes |
| `/functions/v1/generate-pdf` | POST | PDF生成（請求書/日報） | Yes |
| `/functions/v1/send-sms` | POST | SMS送信（GPS通知） | v1.1 |
| `/functions/v1/weather` | GET | 天気情報取得 | Yes |
| `/functions/v1/team-summary` | POST | チーム日報集約 | v2 |
| `/functions/v1/invoice-number` | GET | 請求書番号採番 | Yes |

---

## 共通仕様

### 認証

すべてのAPIは Supabase Auth の JWT トークンで認証。

```typescript
// リクエストヘッダー
Authorization: Bearer <jwt_token>
```

### レスポンス形式

**成功時:**

```typescript
interface SuccessResponse<T> {
  success: true;
  data: T;
}
```

**エラー時:**

```typescript
interface ErrorResponse {
  success: false;
  error: {
    code: string;       // エラーコード（例: VALIDATION_ERROR）
    message: string;    // ユーザー向けメッセージ
    details?: unknown;  // 詳細情報（開発用）
  };
}
```

### HTTPステータスコード

| コード | 用途 |
|--------|------|
| 200 | 成功 |
| 400 | バリデーションエラー |
| 401 | 認証エラー |
| 403 | 権限エラー |
| 404 | リソース未検出 |
| 429 | レート制限 |
| 500 | サーバーエラー |

### エラーコード一覧

| コード | 説明 |
|--------|------|
| `VALIDATION_ERROR` | 入力値のバリデーションエラー |
| `AUTHENTICATION_ERROR` | 認証エラー |
| `AUTHORIZATION_ERROR` | 権限エラー |
| `NOT_FOUND` | リソースが見つからない |
| `RATE_LIMIT_EXCEEDED` | レート制限超過 |
| `EXTERNAL_SERVICE_ERROR` | 外部サービスエラー（OpenAI等） |
| `PROCESSING_ERROR` | 処理エラー |
| `INTERNAL_ERROR` | 内部エラー |

---

## API詳細

### 1. 音声処理 API

#### POST /functions/v1/process-voice

音声ファイルを文字起こしし、構造化データを抽出する。

**リクエスト:**

```typescript
// Content-Type: multipart/form-data
interface ProcessVoiceRequest {
  audio: File;                    // 音声ファイル（m4a/wav/mp3）
  context?: {                     // オプション: コンテキスト情報
    recentSites?: string[];       // 最近の現場名（認識精度向上用）
    recentCustomers?: string[];   // 最近の顧客名
  };
}
```

**レスポンス:**

```typescript
interface ProcessVoiceResponse {
  success: true;
  data: {
    transcript: string;           // 文字起こし結果
    extracted: {
      site_hint: string | null;   // 現場名のヒント
      work_items: WorkItem[];     // 作業内容
      materials: Material[];      // 使用材料
      additional_work: AdditionalWork[];  // 追加作業
      notes: string[];            // 備考
      work_time: {
        start: string | null;     // HH:MM形式
        end: string | null;
      } | null;
    };
    confidence: number;           // 認識信頼度（0-1）
  };
}

interface WorkItem {
  description: string;
  details: string | null;
  quantity: number;
  unit: string;
  completed: boolean;
}

interface Material {
  name: string;
  quantity: string;
}

interface AdditionalWork {
  description: string;
  reason: string | null;
  approved: boolean | null;
}
```

**エラーレスポンス:**

```typescript
// 400: バリデーションエラー
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "音声ファイルが必要です",
    "details": { "field": "audio" }
  }
}

// 400: ファイル形式エラー
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "対応していないファイル形式です。m4a, wav, mp3に対応しています",
    "details": { "received": "application/pdf" }
  }
}

// 500: 外部サービスエラー
{
  "success": false,
  "error": {
    "code": "EXTERNAL_SERVICE_ERROR",
    "message": "音声処理サービスに接続できませんでした。しばらく待ってから再試行してください"
  }
}
```

**実装例:**

```typescript
// supabase/functions/process-voice/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: Deno.env.get('OPENAI_API_KEY') });

const EXTRACTION_PROMPT = `
あなたは建設現場の作業報告を構造化データに変換するアシスタントです。

音声入力されたテキストから、以下の情報をJSON形式で出力してください。

## 出力形式
{
  "site_hint": "現場名や顧客名のヒント（推測含む）",
  "work_items": [
    {
      "description": "作業内容",
      "details": "詳細・補足",
      "quantity": 数量（数値）,
      "unit": "単位",
      "completed": true/false
    }
  ],
  "materials": [
    { "name": "材料名", "quantity": "数量（単位込み）" }
  ],
  "additional_work": [
    {
      "description": "追加・変更作業",
      "reason": "理由（あれば）",
      "approved": true/false/null
    }
  ],
  "notes": ["備考・申し送り事項"],
  "work_time": {
    "start": "HH:MM または null",
    "end": "HH:MM または null"
  }
}

## ルール
1. 明示されていない情報は推測せず、nullまたは空配列にする
2. 数量が不明な場合は1とし、unitは"式"とする
3. 「追加」「変更」「予定外」などの言葉があればadditional_workに分類
4. 「次回」「今度」などの言葉があればnotesに分類
5. 金額は抽出しない（テンプレートから補完するため）
`;

serve(async (req) => {
  try {
    // 認証チェック
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({
          success: false,
          error: { code: 'AUTHENTICATION_ERROR', message: '認証が必要です' },
        }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // フォームデータ取得
    const formData = await req.formData();
    const audioFile = formData.get('audio') as File;
    const contextStr = formData.get('context') as string | null;

    // バリデーション
    if (!audioFile) {
      return new Response(
        JSON.stringify({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: '音声ファイルが必要です' },
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const allowedTypes = ['audio/m4a', 'audio/x-m4a', 'audio/wav', 'audio/mpeg', 'audio/mp3'];
    if (!allowedTypes.includes(audioFile.type)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: '対応していないファイル形式です',
            details: { received: audioFile.type },
          },
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // コンテキスト解析
    const context = contextStr ? JSON.parse(contextStr) : {};
    const promptHints = [
      '建設現場の作業報告。',
      ...(context.recentSites || []).slice(0, 5),
      ...(context.recentCustomers || []).slice(0, 5),
    ].join(' ');

    // 1. Whisperで文字起こし
    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-1',
      language: 'ja',
      prompt: promptHints,
    });

    // 2. GPT-4o-miniで構造化抽出
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: EXTRACTION_PROMPT },
        { role: 'user', content: transcription.text },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1,
    });

    const extracted = JSON.parse(completion.choices[0].message.content || '{}');

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          transcript: transcription.text,
          extracted,
          confidence: 0.85, // TODO: 実際の信頼度を計算
        },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Process voice error:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: {
          code: 'PROCESSING_ERROR',
          message: '音声処理中にエラーが発生しました',
        },
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
```

---

### 2. PDF生成 API

#### POST /functions/v1/generate-pdf

請求書または日報のPDFを生成する。

**リクエスト:**

```typescript
interface GeneratePdfRequest {
  type: 'invoice' | 'daily_report';
  id: string;                     // 請求書ID または 日報ID
  options?: {
    preview?: boolean;            // プレビュー用（透かし入り）
    format?: 'a4' | 'a5';         // 用紙サイズ
  };
}
```

**レスポンス:**

```typescript
interface GeneratePdfResponse {
  success: true;
  data: {
    url: string;                  // PDF URL（Supabase Storage）
    filename: string;             // ファイル名
    size: number;                 // ファイルサイズ（bytes）
    expires_at?: string;          // プレビューの場合、有効期限
  };
}
```

**実装例:**

```typescript
// supabase/functions/generate-pdf/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from '@supabase/supabase-js';
import { renderToString } from 'react-dom/server';

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  try {
    const { type, id, options = {} } = await req.json();

    // データ取得
    let data;
    let html;
    let filename;

    if (type === 'invoice') {
      const { data: invoice, error } = await supabase
        .from('invoices')
        .select(`
          *,
          site:sites(*),
          issuer:business_profiles(*),
          bank_account:bank_accounts(*)
        `)
        .eq('id', id)
        .single();

      if (error || !invoice) {
        return new Response(
          JSON.stringify({
            success: false,
            error: { code: 'NOT_FOUND', message: '請求書が見つかりません' },
          }),
          { status: 404, headers: { 'Content-Type': 'application/json' } }
        );
      }

      data = invoice;
      html = generateInvoiceHtml(invoice, options.preview);
      filename = `請求書_${invoice.site?.name || ''}${invoice.invoice_number}.pdf`;
    } else if (type === 'daily_report') {
      const { data: report, error } = await supabase
        .from('daily_reports')
        .select(`
          *,
          site:sites(*),
          worker:business_profiles(*)
        `)
        .eq('id', id)
        .single();

      if (error || !report) {
        return new Response(
          JSON.stringify({
            success: false,
            error: { code: 'NOT_FOUND', message: '日報が見つかりません' },
          }),
          { status: 404, headers: { 'Content-Type': 'application/json' } }
        );
      }

      data = report;
      html = generateDailyReportHtml(report, options.preview);
      const dateStr = new Date(report.report_date).toISOString().split('T')[0].replace(/-/g, '');
      filename = `日報_${report.site?.name || ''}_${dateStr}.pdf`;
    } else {
      return new Response(
        JSON.stringify({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: '不正なtypeです' },
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // PDF生成（Puppeteer使用）
    const pdfBuffer = await generatePdfFromHtml(html, {
      format: options.format || 'a4',
    });

    // Storage にアップロード
    const storagePath = options.preview
      ? `preview/${id}.pdf`
      : `documents/${type}s/${id}.pdf`;

    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(storagePath, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: true,
      });

    if (uploadError) throw uploadError;

    // URL取得
    const { data: urlData } = supabase.storage
      .from('documents')
      .getPublicUrl(storagePath);

    // DB更新（正式版のみ）
    if (!options.preview) {
      await supabase
        .from(type === 'invoice' ? 'invoices' : 'daily_reports')
        .update({ pdf_url: urlData.publicUrl })
        .eq('id', id);
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          url: urlData.publicUrl,
          filename,
          size: pdfBuffer.byteLength,
          ...(options.preview && {
            expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          }),
        },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Generate PDF error:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: {
          code: 'PROCESSING_ERROR',
          message: 'PDF生成中にエラーが発生しました',
        },
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
```

---

### 3. SMS送信 API（v1.1）

#### POST /functions/v1/send-sms

GPS到着通知などのSMSを送信する。

**リクエスト:**

```typescript
interface SendSmsRequest {
  to: string;                     // 送信先電話番号（E.164形式）
  template: 'arrival' | 'custom'; // テンプレート種別
  data?: {
    site_name?: string;           // 現場名
    eta_minutes?: number;         // 到着予定（分）
    message?: string;             // カスタムメッセージ
  };
}
```

**レスポンス:**

```typescript
interface SendSmsResponse {
  success: true;
  data: {
    message_id: string;           // SMSメッセージID
    status: 'queued' | 'sent';
  };
}
```

---

### 4. 天気情報 API

#### GET /functions/v1/weather

指定座標の現在の天気情報を取得する。

**リクエスト:**

```
GET /functions/v1/weather?lat=35.6762&lon=139.6503
```

| パラメータ | 型 | 必須 | 説明 |
|-----------|-----|-----|------|
| lat | number | Yes | 緯度 |
| lon | number | Yes | 経度 |

**レスポンス:**

```typescript
interface WeatherResponse {
  success: true;
  data: {
    condition: string;            // 天気（晴れ/曇り/雨/雪 等）
    condition_code: string;       // 天気コード
    temperature: number;          // 気温（℃）
    humidity: number;             // 湿度（%）
    wind_speed: number;           // 風速（m/s）
    description: string;          // 天気の説明
    icon: string;                 // アイコンURL
    fetched_at: string;           // 取得日時
  };
}
```

**実装例:**

```typescript
// supabase/functions/weather/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const WEATHER_API_KEY = Deno.env.get('OPENWEATHER_API_KEY');

// 天気コードを日本語に変換
const WEATHER_MAP: Record<string, string> = {
  '01d': '晴れ', '01n': '晴れ',
  '02d': '晴れ時々曇り', '02n': '晴れ時々曇り',
  '03d': '曇り', '03n': '曇り',
  '04d': '曇り', '04n': '曇り',
  '09d': '雨', '09n': '雨',
  '10d': '雨', '10n': '雨',
  '11d': '雷雨', '11n': '雷雨',
  '13d': '雪', '13n': '雪',
  '50d': '霧', '50n': '霧',
};

serve(async (req) => {
  const url = new URL(req.url);
  const lat = url.searchParams.get('lat');
  const lon = url.searchParams.get('lon');

  // バリデーション
  if (!lat || !lon) {
    return new Response(
      JSON.stringify({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'lat, lonは必須です' },
      }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    const response = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${WEATHER_API_KEY}&units=metric&lang=ja`
    );

    if (!response.ok) {
      throw new Error('Weather API error');
    }

    const data = await response.json();
    const iconCode = data.weather[0].icon;

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          condition: WEATHER_MAP[iconCode] || data.weather[0].main,
          condition_code: iconCode,
          temperature: Math.round(data.main.temp * 10) / 10,
          humidity: data.main.humidity,
          wind_speed: data.wind.speed,
          description: data.weather[0].description,
          icon: `https://openweathermap.org/img/wn/${iconCode}@2x.png`,
          fetched_at: new Date().toISOString(),
        },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Weather API error:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: {
          code: 'EXTERNAL_SERVICE_ERROR',
          message: '天気情報を取得できませんでした',
        },
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
```

---

### 5. 請求書番号採番 API

#### GET /functions/v1/invoice-number

次の請求書番号を取得する。

**リクエスト:**

```
GET /functions/v1/invoice-number?year=2026
```

| パラメータ | 型 | 必須 | 説明 |
|-----------|-----|-----|------|
| year | number | No | 年（デフォルト: 現在年） |

**レスポンス:**

```typescript
interface InvoiceNumberResponse {
  success: true;
  data: {
    invoice_number: string;       // INV-2026-0001形式
    sequence: number;             // 連番
    year: number;                 // 年
  };
}
```

**実装例:**

```typescript
// supabase/functions/invoice-number/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from '@supabase/supabase-js';

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  // 認証
  const authHeader = req.headers.get('Authorization');
  const token = authHeader?.replace('Bearer ', '');
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);

  if (authError || !user) {
    return new Response(
      JSON.stringify({
        success: false,
        error: { code: 'AUTHENTICATION_ERROR', message: '認証が必要です' },
      }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const url = new URL(req.url);
  const year = parseInt(url.searchParams.get('year') || '') || new Date().getFullYear();

  // 現在の最大連番を取得
  const { data, error } = await supabase
    .from('invoices')
    .select('invoice_number')
    .eq('user_id', user.id)
    .like('invoice_number', `INV-${year}-%`)
    .order('invoice_number', { ascending: false })
    .limit(1);

  let sequence = 1;
  if (data && data.length > 0) {
    const lastNumber = data[0].invoice_number;
    const match = lastNumber.match(/INV-\d{4}-(\d{4})/);
    if (match) {
      sequence = parseInt(match[1], 10) + 1;
    }
  }

  const invoiceNumber = `INV-${year}-${String(sequence).padStart(4, '0')}`;

  return new Response(
    JSON.stringify({
      success: true,
      data: {
        invoice_number: invoiceNumber,
        sequence,
        year,
      },
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
});
```

---

### 6. チーム日報集約 API（v2）

#### POST /functions/v1/team-summary

チーム全員の日報をAIで集約・要約する。

**リクエスト:**

```typescript
interface TeamSummaryRequest {
  team_id: string;
  date: string;                   // YYYY-MM-DD形式
  options?: {
    include_details?: boolean;    // 詳細を含める
  };
}
```

**レスポンス:**

```typescript
interface TeamSummaryResponse {
  success: true;
  data: {
    date: string;
    team_name: string;
    member_count: number;
    reports_count: number;
    summary: string;              // AI生成の要約
    highlights: string[];         // 重要ポイント
    by_member?: MemberSummary[];  // メンバー別サマリー
  };
}

interface MemberSummary {
  user_id: string;
  name: string;
  site_name: string;
  work_items: string[];
  hours: number;
}
```

---

## クライアント側の呼び出し

### サービス層の実装

```typescript
// src/services/api/voice.ts
import { supabase } from '../supabase/client';
import type { ProcessVoiceResponse } from './types';

export async function processVoice(
  audioUri: string,
  context?: { recentSites?: string[]; recentCustomers?: string[] }
): Promise<ProcessVoiceResponse['data']> {
  const formData = new FormData();

  // ファイルを取得してFormDataに追加
  const response = await fetch(audioUri);
  const blob = await response.blob();
  formData.append('audio', blob, 'recording.m4a');

  if (context) {
    formData.append('context', JSON.stringify(context));
  }

  const { data, error } = await supabase.functions.invoke('process-voice', {
    body: formData,
  });

  if (error) {
    throw new VoiceProcessingError(error.message);
  }

  if (!data.success) {
    throw new VoiceProcessingError(data.error.message);
  }

  return data.data;
}
```

```typescript
// src/services/api/pdf.ts
import { supabase } from '../supabase/client';

export async function generateInvoicePdf(
  invoiceId: string,
  options?: { preview?: boolean }
): Promise<{ url: string; filename: string }> {
  const { data, error } = await supabase.functions.invoke('generate-pdf', {
    body: {
      type: 'invoice',
      id: invoiceId,
      options,
    },
  });

  if (error || !data.success) {
    throw new PdfGenerationError(error?.message || data.error.message);
  }

  return data.data;
}

export async function generateDailyReportPdf(
  reportId: string,
  options?: { preview?: boolean }
): Promise<{ url: string; filename: string }> {
  const { data, error } = await supabase.functions.invoke('generate-pdf', {
    body: {
      type: 'daily_report',
      id: reportId,
      options,
    },
  });

  if (error || !data.success) {
    throw new PdfGenerationError(error?.message || data.error.message);
  }

  return data.data;
}
```

---

## レート制限

| エンドポイント | 制限 | 理由 |
|---------------|------|------|
| process-voice | 10回/分 | OpenAI API コスト |
| generate-pdf | 20回/分 | サーバー負荷 |
| send-sms | 5回/分 | SMS コスト |
| weather | 60回/分 | 外部API制限 |
| invoice-number | 100回/分 | 低負荷 |

---

## セキュリティ考慮事項

1. **認証必須**: すべてのAPIはJWT認証必須
2. **入力検証**: すべての入力をサーバー側で検証
3. **ファイルサイズ制限**: 音声ファイルは最大10MB
4. **レート制限**: 各エンドポイントにレート制限を設定
5. **ログ記録**: エラーと重要な操作をログに記録
6. **機密情報**: API キーは環境変数で管理

---

## 関連ドキュメント

- [音声処理パイプライン](/.claude/skills/genba-app-architecture/references/voice-processing.md)
- [PDF生成](/.claude/skills/genba-app-architecture/references/pdf-generation.md)
- [データベーススキーマ](./database-schema.md)
- [コーディングガイドライン](./coding-guidelines.md)
