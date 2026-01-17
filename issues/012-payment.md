# #012 即時スマホ決済

## 概要

Stripe連携によるQR決済機能を実装し、現場での即時決済を可能にする。

## ステータス

🔵 Todo

## 優先度

P2（v2）

## 依存

- #011 チームプラン機能

## 参照スキル

- `genba-app-architecture` - 決済機能
- `invoice-generator` - 請求書連携

## タスク

### 1. Stripe Connect設定

```typescript
// src/services/stripe.ts
import { StripeProvider } from '@stripe/stripe-react-native';

export async function createPaymentIntent(
  invoiceId: string,
  amount: number
): Promise<string> {
  const response = await fetch('/api/create-payment-intent', {
    method: 'POST',
    body: JSON.stringify({ invoiceId, amount }),
  });
  const { clientSecret } = await response.json();
  return clientSecret;
}
```

### 2. QRコード決済

```typescript
// src/features/payment/qrPayment.ts
import QRCode from 'react-native-qrcode-svg';

export function generatePaymentQR(invoiceId: string, amount: number): string {
  const paymentUrl = `${APP_URL}/pay/${invoiceId}`;
  return paymentUrl;
}

// 顧客がQRスキャン → Stripe決済ページ → 支払い完了
```

### 3. 決済画面

```typescript
// app/payment/[invoiceId].tsx
// 請求金額表示
// カード入力（Stripe Elements）
// Apple Pay / Google Pay
// 支払い確定
```

### 4. 請求書との連携

```typescript
// 請求書ステータス更新
export async function onPaymentComplete(invoiceId: string) {
  await supabase.from('invoices').update({
    status: 'paid',
    paidAt: new Date(),
  }).eq('id', invoiceId);

  // 通知送信
  await sendPaymentNotification(invoiceId);
}
```

### 5. 売上レポート

- 日別/月別売上
- 入金済み/未入金
- 顧客別集計

## 実行コマンド

```bash
# 指示文
genba-app-architectureスキルとinvoice-generatorスキルを参照して、
即時スマホ決済機能を実装してください。

作業対象: /Users/tsubasatahara/dev/codeciao/genba/genba-gear

1. Stripe Connect設定
2. QRコード決済
3. 決済画面
4. 請求書連携
5. 売上レポート
```

## 完了条件

- [ ] Stripe Connectが設定されている
- [ ] 請求書からQRコードを生成できる
- [ ] QRスキャンで決済ページが開く
- [ ] カード決済ができる
- [ ] Apple Pay / Google Payが使える
- [ ] 支払い完了で請求書ステータスが更新される
- [ ] 売上レポートが表示される
