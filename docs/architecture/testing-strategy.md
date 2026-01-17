# GENBA GEAR テスト戦略

> 最終更新: 2026-01-17

## 概要

本ドキュメントでは、GENBA GEARプロジェクトのテスト戦略、テストの種類、カバレッジ目標、テストの書き方について定義します。

---

## テストピラミッド

```
                    ┌─────────┐
                    │  E2E    │  少数・高コスト・遅い
                    │ テスト   │  重要なユーザーフロー
                   ─┴─────────┴─
                  ┌─────────────┐
                  │  統合テスト  │  中程度
                  │ Integration │  API・DB連携
                 ─┴─────────────┴─
               ┌───────────────────┐
               │    単体テスト      │  多数・低コスト・速い
               │   Unit Tests      │  関数・コンポーネント単位
              ─┴───────────────────┴─
```

### テスト比率の目標

| テスト種類 | 比率 | 実行頻度 |
|-----------|------|---------|
| 単体テスト | 70% | コミットごと |
| 統合テスト | 20% | PR作成時 |
| E2Eテスト | 10% | リリース前 |

---

## テストの種類と責務

### 1. 単体テスト（Unit Tests）

**対象:**
- Domain層のビジネスロジック
- ユーティリティ関数
- 個別のReactコンポーネント
- カスタムフック

**目的:**
- ロジックの正確性を検証
- 回帰バグの防止
- リファクタリングの安全性確保

**ツール:**
- Jest
- React Testing Library
- @testing-library/react-hooks

#### 単体テストの例

**Domain層のビジネスロジック:**

```typescript
// features/invoice/domain/__tests__/business-rules.test.ts
import { calculateInvoiceTotals, generateInvoiceNumber } from '../business-rules';

describe('calculateInvoiceTotals', () => {
  it('単一品目の合計を正しく計算する', () => {
    const items = [
      { description: 'エアコン設置', quantity: 1, unit: '式', unitPrice: 50000, taxRate: 10 },
    ];

    const result = calculateInvoiceTotals(items);

    expect(result.subtotal).toBe(50000);
    expect(result.taxAmount).toBe(5000);
    expect(result.totalAmount).toBe(55000);
  });

  it('複数品目・複数税率の合計を正しく計算する', () => {
    const items = [
      { description: 'エアコン設置', quantity: 1, unit: '式', unitPrice: 50000, taxRate: 10 },
      { description: '配管材料', quantity: 2, unit: 'm', unitPrice: 3000, taxRate: 10 },
      { description: '軽減税率対象品', quantity: 1, unit: '個', unitPrice: 1000, taxRate: 8 },
    ];

    const result = calculateInvoiceTotals(items);

    expect(result.subtotal).toBe(57000); // 50000 + 6000 + 1000
    expect(result.taxAmount).toBe(5680); // 5600 (10%) + 80 (8%)
    expect(result.totalAmount).toBe(62680);
  });

  it('空の品目リストは0を返す', () => {
    const result = calculateInvoiceTotals([]);

    expect(result.subtotal).toBe(0);
    expect(result.taxAmount).toBe(0);
    expect(result.totalAmount).toBe(0);
  });
});

describe('generateInvoiceNumber', () => {
  it('正しいフォーマットの請求書番号を生成する', () => {
    const date = new Date('2026-01-17');
    const sequence = 1;

    const result = generateInvoiceNumber(date, sequence);

    expect(result).toBe('INV-2026-0001');
  });

  it('連番が4桁でゼロパディングされる', () => {
    const date = new Date('2026-01-17');
    const sequence = 123;

    const result = generateInvoiceNumber(date, sequence);

    expect(result).toBe('INV-2026-0123');
  });
});
```

**バリデーションロジック:**

```typescript
// features/invoice/domain/__tests__/validation.test.ts
import { validateInvoice } from '../validation';

describe('validateInvoice', () => {
  it('有効な請求書を検証する', () => {
    const invoice = {
      invoiceNumber: 'INV-2026-0001',
      issueDate: new Date('2026-01-17'),
      dueDate: new Date('2026-02-17'),
      items: [
        { description: 'エアコン設置', quantity: 1, unit: '式', unitPrice: 50000, taxRate: 10 },
      ],
    };

    const result = validateInvoice(invoice);

    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('明細が空の場合はエラー', () => {
    const invoice = {
      invoiceNumber: 'INV-2026-0001',
      issueDate: new Date('2026-01-17'),
      items: [],
    };

    const result = validateInvoice(invoice);

    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('明細が1件以上必要です');
  });

  it('支払期限が発行日より前の場合はエラー', () => {
    const invoice = {
      invoiceNumber: 'INV-2026-0001',
      issueDate: new Date('2026-02-17'),
      dueDate: new Date('2026-01-17'), // 発行日より前
      items: [
        { description: 'エアコン設置', quantity: 1, unit: '式', unitPrice: 50000, taxRate: 10 },
      ],
    };

    const result = validateInvoice(invoice);

    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('支払期限は発行日以降にしてください');
  });
});
```

**カスタムフック:**

```typescript
// hooks/__tests__/useOffline.test.ts
import { renderHook, act } from '@testing-library/react-hooks';
import NetInfo from '@react-native-community/netinfo';
import { useOffline } from '../useOffline';

jest.mock('@react-native-community/netinfo');

describe('useOffline', () => {
  it('オンライン時はisOfflineがfalse', () => {
    (NetInfo.useNetInfo as jest.Mock).mockReturnValue({
      isConnected: true,
      isInternetReachable: true,
    });

    const { result } = renderHook(() => useOffline());

    expect(result.current.isOffline).toBe(false);
  });

  it('オフライン時はisOfflineがtrue', () => {
    (NetInfo.useNetInfo as jest.Mock).mockReturnValue({
      isConnected: false,
      isInternetReachable: false,
    });

    const { result } = renderHook(() => useOffline());

    expect(result.current.isOffline).toBe(true);
  });

  it('接続状態が変化するとisOfflineが更新される', () => {
    let netInfoState = { isConnected: true, isInternetReachable: true };
    (NetInfo.useNetInfo as jest.Mock).mockImplementation(() => netInfoState);

    const { result, rerender } = renderHook(() => useOffline());

    expect(result.current.isOffline).toBe(false);

    // オフラインに変化
    netInfoState = { isConnected: false, isInternetReachable: false };
    rerender();

    expect(result.current.isOffline).toBe(true);
  });
});
```

**UIコンポーネント:**

```typescript
// components/ui/__tests__/Button.test.tsx
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Button } from '../Button';

describe('Button', () => {
  it('ラベルが表示される', () => {
    const { getByText } = render(<Button label="保存" onPress={() => {}} />);

    expect(getByText('保存')).toBeTruthy();
  });

  it('押下時にonPressが呼ばれる', () => {
    const onPress = jest.fn();
    const { getByText } = render(<Button label="保存" onPress={onPress} />);

    fireEvent.press(getByText('保存'));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('disabled時はonPressが呼ばれない', () => {
    const onPress = jest.fn();
    const { getByText } = render(
      <Button label="保存" onPress={onPress} disabled />
    );

    fireEvent.press(getByText('保存'));

    expect(onPress).not.toHaveBeenCalled();
  });

  it('loading時はスピナーが表示される', () => {
    const { getByTestId, queryByText } = render(
      <Button label="保存" onPress={() => {}} loading />
    );

    expect(getByTestId('loading-spinner')).toBeTruthy();
    expect(queryByText('保存')).toBeNull();
  });
});
```

### 2. 統合テスト（Integration Tests）

**対象:**
- Repository層（DB・API連携）
- 複数レイヤーをまたぐフロー
- カスタムフック + Repository

**目的:**
- 層間の連携が正しく動作することを検証
- 外部サービスとの連携を検証（モック/スタブ使用）

**ツール:**
- Jest
- MSW（Mock Service Worker）
- WatermelonDB テスト用アダプター

#### 統合テストの例

**Repository層:**

```typescript
// features/voice/repository/__tests__/voice-repository.test.ts
import { setupServer } from 'msw/node';
import { rest } from 'msw';
import { VoiceRepository } from '../voice-repository';

const server = setupServer(
  rest.post('*/functions/v1/process-voice', (req, res, ctx) => {
    return res(
      ctx.json({
        transcript: '今日の現場、田中邸。エアコン設置完了。',
      })
    );
  }),
  rest.post('*/functions/v1/extract-work-data', (req, res, ctx) => {
    return res(
      ctx.json({
        site_hint: '田中邸',
        work_items: [
          { description: 'エアコン設置', completed: true },
        ],
      })
    );
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('VoiceRepository', () => {
  let repository: VoiceRepository;

  beforeEach(() => {
    repository = new VoiceRepository();
  });

  it('音声を正しく文字起こしする', async () => {
    const result = await repository.transcribe('file:///audio/test.m4a');

    expect(result).toBe('今日の現場、田中邸。エアコン設置完了。');
  });

  it('構造化データを正しく抽出する', async () => {
    const transcript = '今日の現場、田中邸。エアコン設置完了。';

    const result = await repository.extractStructuredData(transcript);

    expect(result.site_hint).toBe('田中邸');
    expect(result.work_items).toHaveLength(1);
    expect(result.work_items[0].description).toBe('エアコン設置');
  });

  it('APIエラー時にVoiceProcessingErrorをスローする', async () => {
    server.use(
      rest.post('*/functions/v1/process-voice', (req, res, ctx) => {
        return res(ctx.status(500), ctx.json({ error: 'Internal Server Error' }));
      })
    );

    await expect(repository.transcribe('file:///audio/test.m4a'))
      .rejects
      .toThrow('音声の処理に失敗しました');
  });
});
```

**カスタムフック + Repository:**

```typescript
// features/voice/hooks/__tests__/useVoiceRecording.integration.test.ts
import { renderHook, act, waitFor } from '@testing-library/react-hooks';
import { setupServer } from 'msw/node';
import { rest } from 'msw';
import { useVoiceRecording } from '../useVoiceRecording';
import { TestDatabaseProvider } from '@/test/utils/database';

const server = setupServer(
  rest.post('*/functions/v1/process-voice', (req, res, ctx) => {
    return res(ctx.json({ transcript: 'テスト音声' }));
  }),
  rest.post('*/functions/v1/extract-work-data', (req, res, ctx) => {
    return res(ctx.json({ site_hint: 'テスト現場', work_items: [] }));
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('useVoiceRecording Integration', () => {
  it('音声処理フロー全体が正しく動作する', async () => {
    const { result } = renderHook(() => useVoiceRecording(), {
      wrapper: TestDatabaseProvider,
    });

    expect(result.current.state).toBe('idle');

    // 処理開始
    act(() => {
      result.current.processRecording('file:///audio/test.m4a');
    });

    expect(result.current.state).toBe('processing');

    // 処理完了を待つ
    await waitFor(() => {
      expect(result.current.state).toBe('completed');
    });

    expect(result.current.extractedData?.site_hint).toBe('テスト現場');
  });
});
```

### 3. E2Eテスト（End-to-End Tests）

**対象:**
- 重要なユーザーフロー
- クリティカルパス

**目的:**
- 実際のユーザー操作をシミュレート
- システム全体の動作を検証

**ツール:**
- Maestro（推奨）
- Detox

**テスト対象フロー:**

| フロー | 優先度 | 説明 |
|--------|-------|------|
| 音声入力 → 日報作成 | 高 | コア機能 |
| ログイン → ホーム表示 | 高 | 認証フロー |
| 日報 → 請求書生成 | 高 | 請求書フロー |
| オフライン → オンライン同期 | 中 | オフライン対応 |
| 設定変更 | 低 | 設定機能 |

#### E2Eテストの例（Maestro）

```yaml
# e2e/flows/voice-to-report.yaml
appId: com.genba.gear
name: 音声入力から日報作成
---
- launchApp

# ログイン済みを想定
- assertVisible: "今日の現場"

# 音声入力画面へ
- tapOn: "マイクボタン"
- assertVisible: "音声入力"

# 録音開始
- tapOn: "録音開始"
- waitForAnimationToEnd

# 3秒待機（録音シミュレート）
- extendedWaitUntil:
    visible: "録音中"
    timeout: 5000

# 録音停止
- tapOn: "録音停止"
- assertVisible: "処理中"

# 処理完了を待機
- extendedWaitUntil:
    visible: "下書き確認"
    timeout: 30000

# 下書き確認画面
- assertVisible: "現場名"
- assertVisible: "作業内容"

# 保存
- tapOn: "保存"
- assertVisible: "日報を保存しました"

# ホームに戻る
- tapOn: "ホーム"
- assertVisible: "今日の現場"
```

```yaml
# e2e/flows/offline-sync.yaml
appId: com.genba.gear
name: オフライン時の動作と同期
---
- launchApp

# オフラインモードをシミュレート（デバイス設定）
- runScript:
    file: scripts/enable-airplane-mode.js

# オフラインバナー表示
- assertVisible: "オフラインモード"

# オフラインでも日報作成可能
- tapOn: "マイクボタン"
- assertVisible: "音声入力"

# （オフライン時は音声処理がローカルに保存される）
- tapOn: "録音開始"
- wait: 3000
- tapOn: "録音停止"

# オフライン保存されたことを確認
- assertVisible: "オンライン時に処理されます"
- tapOn: "OK"

# オンラインに戻す
- runScript:
    file: scripts/disable-airplane-mode.js

# 同期開始を確認
- extendedWaitUntil:
    visible: "同期中"
    timeout: 10000

# 同期完了
- extendedWaitUntil:
    visible: "同期完了"
    timeout: 30000
```

---

## テストカバレッジ目標

### レイヤー別カバレッジ目標

| レイヤー | 目標カバレッジ | 理由 |
|---------|---------------|------|
| Domain層 | 90%以上 | ビジネスロジックは完全にテスト |
| Application層（hooks） | 80%以上 | ユースケースの正確性 |
| Presentation層 | 60%以上 | 重要なUIロジック |
| Infrastructure層 | 70%以上 | 外部連携の信頼性 |

### 必須テスト対象

以下は必ずテストを書く:

- [ ] 金額計算ロジック（請求書、日報）
- [ ] バリデーションロジック
- [ ] 日付・時間のフォーマット
- [ ] インボイス番号生成
- [ ] オフライン同期ロジック
- [ ] エラーハンドリング

---

## テストファイルの配置

```
src/
├── features/
│   └── invoice/
│       ├── domain/
│       │   ├── business-rules.ts
│       │   ├── validation.ts
│       │   └── __tests__/           # ドメイン層のテスト
│       │       ├── business-rules.test.ts
│       │       └── validation.test.ts
│       ├── hooks/
│       │   ├── useInvoice.ts
│       │   └── __tests__/           # フック層のテスト
│       │       └── useInvoice.test.ts
│       └── repository/
│           ├── invoice-repository.ts
│           └── __tests__/           # リポジトリ層のテスト
│               └── invoice-repository.test.ts
├── components/
│   └── ui/
│       ├── Button.tsx
│       └── __tests__/               # コンポーネントのテスト
│           └── Button.test.tsx
└── __tests__/                       # 統合テスト
    └── integration/
        └── invoice-flow.test.ts

e2e/                                 # E2Eテスト
├── flows/
│   ├── voice-to-report.yaml
│   └── offline-sync.yaml
└── scripts/
    └── enable-airplane-mode.js
```

---

## テストユーティリティ

### テスト用Wrapper

```typescript
// test/utils/wrappers.tsx
import React from 'react';
import { DatabaseProvider } from '@nozbe/watermelondb/react';
import { createTestDatabase } from './database';

export function TestDatabaseProvider({ children }: { children: React.ReactNode }) {
  const database = createTestDatabase();

  return (
    <DatabaseProvider database={database}>
      {children}
    </DatabaseProvider>
  );
}

export function AllProviders({ children }: { children: React.ReactNode }) {
  return (
    <TestDatabaseProvider>
      {children}
    </TestDatabaseProvider>
  );
}
```

### テスト用データファクトリ

```typescript
// test/factories/invoice.ts
import { faker } from '@faker-js/faker';
import type { Invoice, InvoiceItem } from '@/features/invoice/domain/types';

export function createInvoiceItem(overrides?: Partial<InvoiceItem>): InvoiceItem {
  return {
    description: faker.commerce.productName(),
    quantity: faker.number.int({ min: 1, max: 10 }),
    unit: faker.helpers.arrayElement(['式', '個', 'm', '時間']),
    unitPrice: faker.number.int({ min: 1000, max: 100000 }),
    taxRate: faker.helpers.arrayElement([8, 10]),
    ...overrides,
  };
}

export function createInvoice(overrides?: Partial<Invoice>): Invoice {
  const items = overrides?.items || [createInvoiceItem(), createInvoiceItem()];
  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const taxAmount = Math.floor(subtotal * 0.1);

  return {
    id: faker.string.uuid(),
    invoiceNumber: `INV-${faker.date.recent().getFullYear()}-${faker.string.numeric(4)}`,
    issueDate: faker.date.recent(),
    dueDate: faker.date.future(),
    items,
    subtotal,
    taxAmount,
    totalAmount: subtotal + taxAmount,
    status: 'draft',
    ...overrides,
  };
}
```

---

## CI/CD統合

### GitHub Actions設定

```yaml
# .github/workflows/test.yml
name: Test

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  unit-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - run: npm ci
      - run: npm run test:unit -- --coverage

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info

  integration-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - run: npm ci
      - run: npm run test:integration

  e2e-test:
    runs-on: macos-latest
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - run: npm ci
      - run: npm run build:ios
      - run: npm run test:e2e
```

### package.json スクリプト

```json
{
  "scripts": {
    "test": "jest",
    "test:unit": "jest --testPathPattern='__tests__/.*\\.test\\.(ts|tsx)$'",
    "test:integration": "jest --testPathPattern='__tests__/integration'",
    "test:e2e": "maestro test e2e/flows",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage"
  }
}
```

---

## 関連ドキュメント

- [コーディングガイドライン](./coding-guidelines.md)
- [データベーススキーマ](./database-schema.md)
- [API設計](./api-design.md)
