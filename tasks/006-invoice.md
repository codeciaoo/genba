# #006 請求書自動生成（インボイス対応）

## 概要

日報・作業記録から請求書を自動生成する機能を実装する。インボイス制度（適格請求書等保存方式）に完全対応。

## ステータス

🔵 Todo

## 優先度

P0（MVP必須）

## 依存

- #005 簡易日報生成（GPS+天気）

## 参照スキル

- `invoice-generator` - 請求書自動生成

## タスク

### 1. 請求書データモデル

```typescript
// src/features/invoice/types.ts
interface Invoice {
  id: string;
  userId: string;
  customerId?: string;
  workRecordId?: string;

  // 請求書番号
  invoiceNumber: string;     // INV-2024-0001 形式

  // 日付
  issueDate: string;         // 発行日
  dueDate?: string;          // 支払期限

  // 明細
  items: InvoiceItem[];

  // 金額
  subtotal: number;          // 小計（税抜）
  taxAmount: number;         // 消費税額
  totalAmount: number;       // 合計（税込）

  // その他
  notes?: string;            // 備考
  status: 'draft' | 'sent' | 'paid';
  pdfUrl?: string;
  sentAt?: Date;
  paidAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}

interface InvoiceItem {
  description: string;       // 品目・作業内容
  quantity: number;          // 数量
  unit: string;              // 単位
  unitPrice: number;         // 単価
  taxRate: number;           // 税率（10% or 8%）
  amount: number;            // 金額（税抜）
}
```

### 2. 作業記録→請求書変換

```typescript
// src/features/invoice/converter.ts
export function convertWorkRecordToInvoice(
  workRecord: WorkRecord,
  userProfile: UserProfile,
  customer?: Customer
): Partial<Invoice> {
  const items = extractInvoiceItems(workRecord.structuredData);
  const subtotal = calculateSubtotal(items);
  const taxAmount = calculateTax(items);

  return {
    invoiceNumber: generateInvoiceNumber(userProfile.userId),
    issueDate: formatDate(new Date()),
    items,
    subtotal,
    taxAmount,
    totalAmount: subtotal + taxAmount,
    status: 'draft',
  };
}

function extractInvoiceItems(structuredData: StructuredWorkData): InvoiceItem[] {
  // 作業内容から明細項目を抽出
  // GPT-4o-miniで金額推定（オプション）
}

function generateInvoiceNumber(userId: string): string {
  const year = new Date().getFullYear();
  const sequence = getNextSequence(userId, year);
  return `INV-${year}-${sequence.toString().padStart(4, '0')}`;
}
```

### 3. 税額計算

```typescript
// src/features/invoice/taxCalculator.ts
export function calculateTax(items: InvoiceItem[]): number {
  // 税率ごとにグループ化
  const taxGroups = groupByTaxRate(items);

  let totalTax = 0;
  for (const [rate, groupItems] of Object.entries(taxGroups)) {
    const groupSubtotal = groupItems.reduce((sum, item) => sum + item.amount, 0);
    // 端数処理: 切り捨て
    totalTax += Math.floor(groupSubtotal * (Number(rate) / 100));
  }

  return totalTax;
}
```

### 4. 請求書PDF生成（インボイス対応）

```typescript
// src/features/invoice/pdfGenerator.ts
function buildInvoiceHTML(
  invoice: Invoice,
  userProfile: UserProfile,
  customer?: Customer
): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: 'Noto Sans JP', sans-serif; padding: 40px; }
        .header { display: flex; justify-content: space-between; margin-bottom: 40px; }
        .title { font-size: 28px; font-weight: bold; color: #1a1f3d; }
        .invoice-number { font-size: 14px; color: #666; }
        .parties { display: flex; justify-content: space-between; margin-bottom: 30px; }
        .party { width: 45%; }
        .party-title { font-weight: bold; border-bottom: 1px solid #147878; padding-bottom: 4px; margin-bottom: 8px; }
        .registration-number { color: #147878; font-weight: bold; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th { background: #147878; color: white; padding: 10px; text-align: left; }
        td { border-bottom: 1px solid #ddd; padding: 10px; }
        .amount-row td { text-align: right; }
        .total-row { font-weight: bold; font-size: 18px; background: #f5f5f5; }
        .tax-breakdown { margin: 20px 0; padding: 15px; background: #f9f9f9; }
        .footer { margin-top: 40px; }
        .bank-info { background: #f5f5f5; padding: 15px; margin-top: 20px; }
      </style>
    </head>
    <body>
      <div class="header">
        <div>
          <div class="title">請求書</div>
          <div class="invoice-number">${invoice.invoiceNumber}</div>
        </div>
        <div>
          <div>発行日: ${invoice.issueDate}</div>
          ${invoice.dueDate ? `<div>お支払期限: ${invoice.dueDate}</div>` : ''}
        </div>
      </div>

      <div class="parties">
        <div class="party">
          <div class="party-title">請求先</div>
          ${customer ? `
            <div>${customer.name} 様</div>
            ${customer.address ? `<div>${customer.address}</div>` : ''}
          ` : '<div>（請求先未設定）</div>'}
        </div>
        <div class="party">
          <div class="party-title">請求元</div>
          <div>${userProfile.businessName}</div>
          ${userProfile.address ? `<div>${userProfile.address}</div>` : ''}
          ${userProfile.phone ? `<div>TEL: ${userProfile.phone}</div>` : ''}
          ${userProfile.invoiceRegistrationNumber ? `
            <div class="registration-number">
              登録番号: ${userProfile.invoiceRegistrationNumber}
            </div>
          ` : ''}
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>品目</th>
            <th>数量</th>
            <th>単位</th>
            <th>単価</th>
            <th>税率</th>
            <th>金額</th>
          </tr>
        </thead>
        <tbody>
          ${invoice.items.map(item => `
            <tr>
              <td>${item.description}</td>
              <td>${item.quantity}</td>
              <td>${item.unit}</td>
              <td>¥${item.unitPrice.toLocaleString()}</td>
              <td>${item.taxRate}%</td>
              <td>¥${item.amount.toLocaleString()}</td>
            </tr>
          `).join('')}
          <tr class="amount-row">
            <td colspan="5">小計（税抜）</td>
            <td>¥${invoice.subtotal.toLocaleString()}</td>
          </tr>
          <tr class="amount-row">
            <td colspan="5">消費税</td>
            <td>¥${invoice.taxAmount.toLocaleString()}</td>
          </tr>
          <tr class="amount-row total-row">
            <td colspan="5">合計（税込）</td>
            <td>¥${invoice.totalAmount.toLocaleString()}</td>
          </tr>
        </tbody>
      </table>

      <div class="tax-breakdown">
        <div><strong>税率ごとの内訳</strong></div>
        ${buildTaxBreakdown(invoice.items)}
      </div>

      ${invoice.notes ? `
        <div class="footer">
          <div><strong>備考</strong></div>
          <div>${invoice.notes}</div>
        </div>
      ` : ''}

      <!-- 振込先情報は別途追加 -->
    </body>
    </html>
  `;
}
```

### 5. 請求書一覧画面

```typescript
// app/invoices/index.tsx
// ステータス別フィルター（下書き/送信済み/入金済み）
// 月別集計表示
// 検索機能
```

### 6. 請求書作成・編集画面

```typescript
// app/invoices/[id].tsx
// 明細の追加・編集・削除
// 顧客選択
// 金額自動計算
// PDF生成・プレビュー
```

## インボイス制度対応チェックリスト

- [ ] 適格請求書発行事業者の登録番号（T+13桁）表示
- [ ] 税率ごとの区分表示（10%/8%）
- [ ] 税率ごとの税額表示
- [ ] 取引年月日
- [ ] 取引内容
- [ ] 税込金額
- [ ] 書類の交付を受ける事業者の氏名/名称

## 実行コマンド

```bash
# 指示文
invoice-generatorスキルを参照して、
請求書自動生成機能を実装してください。

作業対象: /Users/tsubasatahara/dev/codeciao/genba/genba-gear

1. 請求書データモデル
2. 作業記録→請求書変換
3. 税額計算（税率ごと）
4. PDF生成（インボイス対応）
5. 請求書一覧画面
6. 請求書作成・編集画面
```

## 完了条件

- [ ] 作業記録から請求書が自動生成される
- [ ] 請求書番号が自動採番される
- [ ] 明細を追加・編集・削除できる
- [ ] 税額が正しく計算される
- [ ] インボイス制度に準拠したPDFが生成される
- [ ] 登録番号が表示される
- [ ] 税率ごとの内訳が表示される
- [ ] 請求書一覧が表示される
- [ ] ステータス管理ができる（下書き→送信→入金）
- [ ] PDFを共有できる
