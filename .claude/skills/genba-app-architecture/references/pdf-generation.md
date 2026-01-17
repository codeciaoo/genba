# PDF生成

## 生成方式の選択

| 方式 | メリット | デメリット | 推奨用途 |
|------|---------|-----------|---------|
| クライアント側 | オフライン可能、即時生成 | 品質・フォント制限 | 簡易プレビュー |
| サーバー側 | 高品質、フォント自由 | ネットワーク必須 | 正式PDF |

**推奨**: プレビューはクライアント側、正式PDFはサーバー側

## クライアント側生成（React Native）

### expo-print を使用

```typescript
// src/features/invoice/generatePdf.ts
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Invoice } from '../../database/models';
import { generateInvoiceHtml } from './invoiceTemplate';

export async function generateInvoicePdf(invoice: Invoice): Promise<string> {
  const html = generateInvoiceHtml(invoice);

  const { uri } = await Print.printToFileAsync({
    html,
    base64: false,
  });

  return uri;
}

export async function shareInvoicePdf(invoice: Invoice) {
  const uri = await generateInvoicePdf(invoice);

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      dialogTitle: `請求書_${invoice.site?.name}_${invoice.invoiceNumber}`,
    });
  }
}
```

### HTMLテンプレート

```typescript
// src/features/invoice/invoiceTemplate.ts
import { Invoice } from '../../database/models';
import { formatCurrency, formatDate } from '../../utils/format';

export function generateInvoiceHtml(invoice: Invoice): string {
  const items = JSON.parse(invoice.items);

  return `
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    @page {
      size: A4;
      margin: 20mm;
    }
    body {
      font-family: "Noto Sans JP", "Hiragino Kaku Gothic ProN", sans-serif;
      font-size: 12px;
      line-height: 1.6;
      color: #1a1a1a;
    }
    .header {
      display: flex;
      justify-content: space-between;
      margin-bottom: 30px;
    }
    .company-info {
      text-align: left;
    }
    .company-name {
      font-size: 18px;
      font-weight: bold;
      color: #1a1f3d;
    }
    .registration-number {
      font-size: 10px;
      color: #4a4a4a;
    }
    .title {
      text-align: center;
      font-size: 24px;
      font-weight: bold;
      color: #1a1f3d;
      margin: 20px 0;
    }
    .total-section {
      background: #e0f5f5;
      padding: 15px;
      text-align: center;
      margin: 20px 0;
      border-radius: 4px;
    }
    .total-amount {
      font-size: 24px;
      font-weight: bold;
      color: #147878;
    }
    .client-info {
      margin: 20px 0;
      padding: 15px;
      border: 1px solid #b8b8b8;
      border-radius: 4px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
    }
    th, td {
      border: 1px solid #b8b8b8;
      padding: 10px;
      text-align: left;
    }
    th {
      background: #f5f5f5;
      font-weight: 600;
    }
    .text-right {
      text-align: right;
    }
    .subtotal-row {
      background: #e0f5f5;
      font-weight: bold;
    }
    .bank-info {
      margin-top: 30px;
      padding: 15px;
      border: 1px solid #b8b8b8;
      border-radius: 4px;
    }
    .bank-title {
      font-weight: bold;
      margin-bottom: 10px;
    }
    .notes {
      margin-top: 20px;
      font-size: 11px;
      color: #4a4a4a;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="company-info">
      <div class="company-name">${invoice.issuer?.businessName || ''}</div>
      <div>〒${invoice.issuer?.postalCode || ''}</div>
      <div>${invoice.issuer?.address || ''}</div>
      <div>TEL: ${invoice.issuer?.phone || ''}</div>
      <div class="registration-number">
        登録番号: ${invoice.issuer?.invoiceRegistrationNumber || ''}
      </div>
    </div>
    <div class="invoice-meta">
      <div>請求書番号: ${invoice.invoiceNumber}</div>
      <div>発行日: ${formatDate(invoice.issueDate)}</div>
      <div>お支払期限: ${formatDate(invoice.dueDate)}</div>
    </div>
  </div>

  <div class="title">請 求 書</div>

  <div class="client-info">
    <strong>${invoice.site?.clientName || invoice.site?.name} 様</strong><br>
    〒${invoice.site?.postalCode || ''}<br>
    ${invoice.site?.address || ''}
  </div>

  <div class="total-section">
    <div>ご請求金額</div>
    <div class="total-amount">¥${formatCurrency(invoice.totalAmount)}-</div>
    <div style="font-size: 10px;">（税込）</div>
  </div>

  <table>
    <thead>
      <tr>
        <th style="width: 40%">品目</th>
        <th style="width: 10%">数量</th>
        <th style="width: 10%">単位</th>
        <th style="width: 15%" class="text-right">単価</th>
        <th style="width: 15%" class="text-right">金額</th>
        <th style="width: 10%">税率</th>
      </tr>
    </thead>
    <tbody>
      ${items.map((item: any) => `
        <tr>
          <td>${item.description}</td>
          <td class="text-right">${item.quantity}</td>
          <td>${item.unit}</td>
          <td class="text-right">¥${formatCurrency(item.unitPrice)}</td>
          <td class="text-right">¥${formatCurrency(item.amount)}</td>
          <td class="text-right">${item.taxRate}%</td>
        </tr>
      `).join('')}
      <tr class="subtotal-row">
        <td colspan="4">小計</td>
        <td class="text-right">¥${formatCurrency(invoice.subtotal)}</td>
        <td></td>
      </tr>
      <tr>
        <td colspan="4">消費税（10%対象）</td>
        <td class="text-right">¥${formatCurrency(invoice.taxAmount)}</td>
        <td></td>
      </tr>
      <tr class="subtotal-row">
        <td colspan="4">合計</td>
        <td class="text-right">¥${formatCurrency(invoice.totalAmount)}</td>
        <td></td>
      </tr>
    </tbody>
  </table>

  <div class="bank-info">
    <div class="bank-title">【お振込先】</div>
    <div>${invoice.bankAccount?.bankName} ${invoice.bankAccount?.branchName}</div>
    <div>${invoice.bankAccount?.accountType} ${invoice.bankAccount?.accountNumber}</div>
    <div>口座名義: ${invoice.bankAccount?.accountHolder}</div>
  </div>

  <div class="notes">
    <div class="bank-title">【備考】</div>
    <div>${invoice.notes || 'お振込手数料はお客様ご負担でお願いいたします。'}</div>
  </div>
</body>
</html>
  `;
}
```

## サーバー側生成（Supabase Edge Function）

### Puppeteer使用

```typescript
// supabase/functions/generate-pdf/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import puppeteer from 'https://deno.land/x/puppeteer@16.2.0/mod.ts';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

serve(async (req) => {
  const { invoiceId, html } = await req.json();

  // Puppeteerでレンダリング
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  await page.setContent(html, { waitUntil: 'networkidle0' });

  const pdfBuffer = await page.pdf({
    format: 'A4',
    margin: { top: '20mm', right: '20mm', bottom: '20mm', left: '20mm' },
    printBackground: true,
  });

  await browser.close();

  // Supabase Storageにアップロード
  const fileName = `invoices/${invoiceId}.pdf`;
  const { data, error } = await supabase.storage
    .from('documents')
    .upload(fileName, pdfBuffer, {
      contentType: 'application/pdf',
      upsert: true,
    });

  if (error) throw error;

  // 公開URLを取得
  const { data: urlData } = supabase.storage
    .from('documents')
    .getPublicUrl(fileName);

  // invoicesテーブルを更新
  await supabase
    .from('invoices')
    .update({ pdf_url: urlData.publicUrl })
    .eq('id', invoiceId);

  return new Response(
    JSON.stringify({ url: urlData.publicUrl }),
    { headers: { 'Content-Type': 'application/json' } }
  );
});
```

### PDFKit使用（軽量版）

```typescript
// supabase/functions/generate-pdf-lite/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import PDFDocument from 'https://esm.sh/pdfkit@0.13.0';

serve(async (req) => {
  const { invoice } = await req.json();

  const doc = new PDFDocument({ size: 'A4', margin: 50 });
  const chunks: Uint8Array[] = [];

  doc.on('data', (chunk: Uint8Array) => chunks.push(chunk));

  // ヘッダー
  doc.fontSize(20).text(invoice.issuer.businessName, { align: 'left' });
  doc.fontSize(10).text(`登録番号: ${invoice.issuer.invoiceRegistrationNumber}`);

  // タイトル
  doc.moveDown();
  doc.fontSize(24).text('請 求 書', { align: 'center' });

  // ... 以下省略（テーブル描画など）

  doc.end();

  // Bufferを結合
  const pdfBuffer = Buffer.concat(chunks);

  // 以下、Storageへのアップロードは同様
});
```

## 日本語フォント対応

### クライアント側

expo-printはシステムフォントを使用。日本語は自動で利用可能。

### サーバー側（Puppeteer）

```dockerfile
# Dockerfile for Edge Function
FROM ghcr.io/anthropics/anthropic-api:latest

# 日本語フォントをインストール
RUN apt-get update && apt-get install -y \
    fonts-noto-cjk \
    fonts-noto-cjk-extra
```

### サーバー側（PDFKit）

```typescript
import PDFDocument from 'pdfkit';

// カスタムフォントを登録
doc.registerFont('NotoSansJP', './fonts/NotoSansJP-Regular.ttf');
doc.font('NotoSansJP');
```

## ファイル命名規則

```
請求書_[顧客名]_[請求書番号].pdf
日報_[現場名]_[日付YYYYMMDD].pdf

例:
請求書_田中様_INV-2026-0001.pdf
日報_田中邸_20260117.pdf
```

## プレビュー vs 正式PDF

| 用途 | 生成方式 | 透かし | 保存先 |
|------|---------|--------|--------|
| 確認用プレビュー | クライアント | 「確認用」 | ローカル一時ファイル |
| 正式PDF | サーバー | なし | Supabase Storage |
| メール添付 | サーバー | なし | URL共有 or 添付 |

```typescript
// プレビュー時は透かしを追加
function generatePreviewHtml(invoice: Invoice): string {
  const html = generateInvoiceHtml(invoice);
  return html.replace('</body>', `
    <div style="
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) rotate(-45deg);
      font-size: 100px;
      color: rgba(200, 200, 200, 0.3);
      pointer-events: none;
    ">確認用</div>
    </body>
  `);
}
```
