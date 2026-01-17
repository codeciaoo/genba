# #009 軽量顧客カルテ

## 概要

顧客ごとの過去データを声検索で即確認できる軽量顧客カルテ機能を実装する。AI要約で重要情報を素早く把握。

## ステータス

🔵 Todo

## 優先度

P1（v1.1）

## 依存

- #007 仕上げ・テスト（MVP）

## 参照スキル

- `genba-app-architecture` - 顧客カルテ
- `voice-to-document` - 音声検索

## タスク

### 1. 顧客データモデル

```typescript
interface Customer {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  photos: CustomerPhoto[];
  memos: CustomerMemo[];
  aiSummary?: string;
  workRecordIds: string[];
  invoiceIds: string[];
}
```

### 2. 声検索機能

```typescript
export async function searchCustomerByVoice(audioUri: string): Promise<Customer[]> {
  const query = await transcribeWithNoiseFiltering(audioUri);
  const searchParams = await parseSearchQuery(query);
  return searchCustomers(searchParams);
}
```

### 3. AI要約生成

```typescript
export async function generateCustomerSummary(customer: Customer): Promise<string> {
  const workRecords = await getWorkRecordsByCustomerId(customer.id);
  // GPT-4o-miniで200文字以内の要約生成
}
```

### 4. 顧客一覧・詳細画面

- 検索バー（テキスト + 音声）
- AI要約プレビュー
- 写真ギャラリー
- 作業履歴・請求書履歴

## 完了条件

- [ ] 顧客を登録できる
- [ ] 声で顧客を検索できる
- [ ] AI要約が生成される
- [ ] 写真・メモを追加できる
- [ ] オフラインでも閲覧できる
