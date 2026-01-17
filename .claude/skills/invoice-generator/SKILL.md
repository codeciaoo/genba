---
name: invoice-generator
description: GENBA GEARの請求書自動生成機能。作業記録（日報）から請求書下書きを作成し、PDF出力まで行う。インボイス制度対応。請求書、見積書、帳票の実装時に使用。
---

# 請求書自動生成ワークフロー

## 機能概要

作業記録（日報）から請求書を自動生成し、PDF出力・送付までをサポート。
ボイス入力で記録された作業内容から、請求書の下書きを自動作成。

```
作業記録 → 請求書下書き → 確認・編集 → PDF生成 → 送付
(日報)     (自動生成)     (タップ修正)  (1タップ)   (メール/共有)
```

## ワークフローチェックリスト

```
□ Step 1: 請求書データの構成
  □ 作業記録からの明細変換
  □ 単価・税率の計算
  □ 合計金額の算出

□ Step 2: 請求書番号の採番
  □ 年度ベースの連番
  □ 重複チェック

□ Step 3: 確認・編集画面
  □ 明細の追加・削除・編集
  □ 備考の入力
  □ 支払期限の設定

□ Step 4: PDF生成
  □ HTMLテンプレート適用
  □ クライアント側プレビュー
  □ サーバー側正式PDF

□ Step 5: 送付・ステータス管理
  □ メール/LINE送信
  □ ステータス更新（draft→sent→paid）
```

## Step 1: 作業記録から請求書変換

### 変換ロジック

```typescript
// src/features/invoice/createInvoiceFromWorkRecord.ts
import { WorkRecord, Customer, Invoice } from '../../database/models';

interface InvoiceItem {
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  amount: number;
  taxRate: number;
}

export async function createInvoiceFromWorkRecord(
  workRecord: WorkRecord,
  customer: Customer
): Promise<InvoiceData> {
  const structuredData = JSON.parse(workRecord.structuredData);

  // 作業項目を請求明細に変換
  const items: InvoiceItem[] = structuredData.tasks.map(task => ({
    description: task.description,
    quantity: task.hours || 1,
    unit: task.hours ? '時間' : '式',
    unitPrice: task.unit_price || 0, // テンプレートから補完
    amount: (task.hours || 1) * (task.unit_price || 0),
    taxRate: 10,
  }));

  // 材料も明細に追加
  structuredData.materials?.forEach(material => {
    items.push({
      description: material.name,
      quantity: parseFloat(material.quantity) || 1,
      unit: material.unit || '個',
      unitPrice: material.unit_price || 0,
      amount: (parseFloat(material.quantity) || 1) * (material.unit_price || 0),
      taxRate: 10,
    });
  });

  // 金額計算
  const subtotal = items.reduce((sum, item) => sum + item.amount, 0);
  const taxAmount = calculateTax(items);
  const totalAmount = subtotal + taxAmount;

  return {
    customerId: customer.id,
    workRecordId: workRecord.id,
    items,
    subtotal,
    taxAmount,
    totalAmount,
    issueDate: new Date(),
    dueDate: calculateDueDate(new Date()),
  };
}

function calculateDueDate(issueDate: Date): Date {
  // 月末締め翌月末払い
  const nextMonth = new Date(issueDate);
  nextMonth.setMonth(nextMonth.getMonth() + 2);
  nextMonth.setDate(0);
  return nextMonth;
}
```

### 税額計算

```typescript
// src/utils/calculation.ts

// 税率ごとに集計して計算（端数は切り捨て）
export function calculateTax(items: InvoiceItem[]): number {
  const taxByRate = items.reduce((acc, item) => {
    const rate = item.taxRate;
    if (!acc[rate]) acc[rate] = 0;
    acc[rate] += item.amount;
    return acc;
  }, {} as Record<number, number>);

  return Object.entries(taxByRate).reduce((total, [rate, amount]) => {
    return total + Math.floor(amount * (Number(rate) / 100));
  }, 0);
}
```

## Step 2: 請求書番号の採番

```typescript
// src/features/invoice/generateInvoiceNumber.ts

export async function generateInvoiceNumber(userId: string): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `INV-${year}-`;

  // 今年度の最大番号を取得
  const invoices = await database
    .get('invoices')
    .query(Q.where('invoice_number', Q.like(`${prefix}%`)))
    .fetch();

  const maxNumber = invoices.reduce((max, inv) => {
    const num = parseInt(inv.invoiceNumber.split('-')[2], 10);
    return num > max ? num : max;
  }, 0);

  return `${prefix}${String(maxNumber + 1).padStart(4, '0')}`;
  // 例: INV-2026-0001
}
```

## Step 3: 確認・編集画面

```typescript
// src/features/invoice/InvoiceEditor.tsx

export function InvoiceEditor({ invoiceData, onSave }) {
  const [items, setItems] = useState(invoiceData.items);
  const [notes, setNotes] = useState('');
  const [dueDate, setDueDate] = useState(invoiceData.dueDate);

  // 金額の再計算
  const { subtotal, taxAmount, totalAmount } = useMemo(() => {
    const sub = items.reduce((sum, item) => sum + item.amount, 0);
    const tax = calculateTax(items);
    return { subtotal: sub, taxAmount: tax, totalAmount: sub + tax };
  }, [items]);

  const updateItem = (index: number, field: string, value: any) => {
    const newItems = [...items];
    newItems[index][field] = value;

    if (field === 'quantity' || field === 'unitPrice') {
      newItems[index].amount = newItems[index].quantity * newItems[index].unitPrice;
    }

    setItems(newItems);
  };

  return (
    <ScrollView>
      {/* 顧客情報 */}
      <CustomerInfoSection customer={invoiceData.customer} />

      {/* 明細テーブル */}
      <Card className="m-4">
        <Text className="font-bold mb-2">明細</Text>
        {items.map((item, index) => (
          <InvoiceItemRow
            key={index}
            item={item}
            onUpdate={(field, value) => updateItem(index, field, value)}
            onRemove={() => removeItem(index)}
          />
        ))}
        <Button
          title="+ 明細を追加"
          variant="outline"
          onPress={addItem}
        />
      </Card>

      {/* 合計 */}
      <TotalSection
        subtotal={subtotal}
        taxAmount={taxAmount}
        totalAmount={totalAmount}
      />

      {/* 支払期限・備考 */}
      <DatePicker label="お支払期限" value={dueDate} onChange={setDueDate} />
      <TextInput
        label="備考"
        value={notes}
        onChangeText={setNotes}
        multiline
        placeholder="お振込手数料はお客様ご負担でお願いします"
      />

      {/* アクション */}
      <View className="p-4 gap-3">
        <Button title="プレビュー" variant="secondary" onPress={preview} />
        <Button title="保存" onPress={() => onSave({ items, notes, dueDate })} />
      </View>
    </ScrollView>
  );
}
```

## Step 4: PDF生成

### HTMLテンプレート

```typescript
// src/features/invoice/invoiceHtmlTemplate.ts

export function generateInvoiceHtml(invoice: Invoice): string {
  const items = JSON.parse(invoice.items);
  const issuer = invoice.issuer; // 事業者プロファイル
  const customer = invoice.customer;
  const bankAccount = invoice.bankAccount;

  return `
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <style>
    @page { size: A4; margin: 20mm; }
    body {
      font-family: "Noto Sans JP", sans-serif;
      font-size: 12px;
      color: #1a1a1a;
    }
    .header { display: flex; justify-content: space-between; }
    .company-name { font-size: 18px; font-weight: bold; color: #1a1f3d; }
    .registration-number { font-size: 10px; color: #4a4a4a; }
    .title {
      text-align: center;
      font-size: 24px;
      font-weight: bold;
      margin: 20px 0;
      letter-spacing: 0.5em;
    }
    .total-section {
      background: #e0f5f5;
      padding: 15px;
      text-align: center;
      border-radius: 4px;
    }
    .total-amount {
      font-size: 24px;
      font-weight: bold;
      color: #147878;
    }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th, td { border: 1px solid #b8b8b8; padding: 10px; }
    th { background: #f5f5f5; }
    .text-right { text-align: right; }
    .subtotal-row { background: #e0f5f5; font-weight: bold; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="company-name">${issuer?.businessName || ''}</div>
      <div>〒${issuer?.postalCode || ''} ${issuer?.address || ''}</div>
      <div>TEL: ${issuer?.phone || ''}</div>
      <div class="registration-number">登録番号: ${issuer?.invoiceRegistrationNumber || ''}</div>
    </div>
    <div>
      <div>請求書番号: ${invoice.invoiceNumber}</div>
      <div>発行日: ${formatDate(invoice.issueDate)}</div>
      <div>お支払期限: ${formatDate(invoice.dueDate)}</div>
    </div>
  </div>

  <div class="title">請 求 書</div>

  <div style="margin: 20px 0; padding: 15px; border: 1px solid #b8b8b8;">
    <strong>${customer?.name} 様</strong>
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
        <th style="width: 10%" class="text-right">数量</th>
        <th style="width: 10%">単位</th>
        <th style="width: 15%" class="text-right">単価</th>
        <th style="width: 15%" class="text-right">金額</th>
        <th style="width: 10%" class="text-right">税率</th>
      </tr>
    </thead>
    <tbody>
      ${items.map(item => `
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

  <div style="margin-top: 30px; padding: 15px; border: 1px solid #b8b8b8;">
    <div style="font-weight: bold; margin-bottom: 10px;">【お振込先】</div>
    <div>${bankAccount?.bankName} ${bankAccount?.branchName}</div>
    <div>${bankAccount?.accountType} ${bankAccount?.accountNumber}</div>
    <div>口座名義: ${bankAccount?.accountHolder}</div>
  </div>

  <div style="margin-top: 20px; font-size: 11px; color: #4a4a4a;">
    <div style="font-weight: bold;">【備考】</div>
    <div>${invoice.notes || 'お振込手数料はお客様ご負担でお願いいたします。'}</div>
  </div>
</body>
</html>
  `;
}
```

### PDF共有

```typescript
// src/features/invoice/shareInvoice.ts
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

export async function shareInvoicePdf(invoice: Invoice) {
  const html = generateInvoiceHtml(invoice);
  const { uri } = await Print.printToFileAsync({ html });

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      dialogTitle: `請求書_${invoice.customer?.name}_${invoice.invoiceNumber}`,
    });
  }
}
```

## Step 5: ステータス管理

```typescript
// src/features/invoice/invoiceStatus.ts

// ステータス遷移: draft → sent → paid
export async function markAsSent(invoiceId: string) {
  await database.write(async () => {
    const invoice = await database.get('invoices').find(invoiceId);
    await invoice.update(inv => {
      inv.status = 'sent';
      inv.sentAt = new Date().toISOString();
    });
  });
}

export async function markAsPaid(invoiceId: string) {
  await database.write(async () => {
    const invoice = await database.get('invoices').find(invoiceId);
    await invoice.update(inv => {
      inv.status = 'paid';
      inv.paidAt = new Date().toISOString();
    });
  });
}
```

## 請求書一覧画面

```typescript
// src/features/invoice/InvoiceList.tsx

export function InvoiceList() {
  const [filter, setFilter] = useState<'all' | 'draft' | 'sent' | 'paid'>('all');

  const invoices = useQuery(
    database.get('invoices').query(
      filter !== 'all' ? Q.where('status', filter) : Q.where('id', Q.notEq('')),
      Q.sortBy('created_at', Q.desc)
    )
  );

  const counts = useMemo(() => ({
    draft: invoices.filter(i => i.status === 'draft').length,
    sent: invoices.filter(i => i.status === 'sent').length,
  }), [invoices]);

  return (
    <View className="flex-1 bg-background">
      <FilterTabs
        tabs={[
          { key: 'all', label: 'すべて' },
          { key: 'draft', label: `未送付 (${counts.draft})`, badge: counts.draft > 0 },
          { key: 'sent', label: `送付済 (${counts.sent})` },
          { key: 'paid', label: '入金済' },
        ]}
        selected={filter}
        onChange={setFilter}
      />

      <FlatList
        data={invoices}
        renderItem={({ item }) => (
          <InvoiceCard
            invoice={item}
            onPress={() => router.push(`/invoice/${item.id}`)}
          />
        )}
      />
    </View>
  );
}
```

## インボイス制度対応チェックリスト

請求書に必須の記載事項:

```
✅ 発行者の氏名・名称
✅ 登録番号（T + 13桁）
✅ 取引年月日
✅ 取引内容（品目）
✅ 税率ごとの対価の額
✅ 税率ごとの消費税額
✅ 適用税率（10%、8%）
✅ 交付を受ける事業者の氏名・名称
```

## 日報から請求書への自動変換フロー

```typescript
// 日報確認画面から請求書を作成
const handleCreateInvoice = async (workRecord: WorkRecord) => {
  // 顧客情報を取得
  const customer = await database.get('customers').find(workRecord.customerId);

  // 請求書データを自動生成
  const invoiceData = await createInvoiceFromWorkRecord(workRecord, customer);

  // 請求書番号を採番
  const invoiceNumber = await generateInvoiceNumber(userId);

  // 請求書を保存
  const invoice = await database.write(async () => {
    return database.get('invoices').create(inv => {
      inv.customerId = customer.id;
      inv.workRecordId = workRecord.id;
      inv.invoiceNumber = invoiceNumber;
      inv.items = JSON.stringify(invoiceData.items);
      inv.subtotal = invoiceData.subtotal;
      inv.taxAmount = invoiceData.taxAmount;
      inv.totalAmount = invoiceData.totalAmount;
      inv.issueDate = new Date().toISOString();
      inv.dueDate = invoiceData.dueDate.toISOString();
      inv.status = 'draft';
    });
  });

  // 編集画面へ遷移
  router.push(`/invoice/${invoice.id}`);
};
```
