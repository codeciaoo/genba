# コードスタイル・規約

## プロジェクト構造

```
genba-gear/
├── app/                    # Expo Router画面（UIのみ）
├── src/                    # アプリケーションコード
│   ├── components/ui/      # 共通UIコンポーネント
│   ├── features/           # 機能別モジュール
│   ├── database/           # WatermelonDB関連
│   ├── services/           # 外部サービス連携
│   └── hooks/              # 共通フック
└── tsconfig.json           # @/* -> ./src/*
```

## インポートルール

```typescript
// ✅ 正しい: @/ は src/ を指す
import { Button } from '@/components/ui/Button';
import { useDatabase } from '@/database';
import { useAuth } from '@/features/auth/hooks/useAuth';

// ❌ 間違い: @/src/ は冗長
import { Button } from '@/src/components/ui/Button';

// ❌ 間違い: 深い相対パス
import { Button } from '../../../components/ui/Button';
```

## 命名規則

| 対象 | 規則 | 例 |
|------|------|-----|
| コンポーネント | PascalCase | `VoiceRecorder.tsx` |
| フック | camelCase + use | `useVoiceRecording.ts` |
| ユーティリティ | camelCase | `formatDate.ts` |
| 定数 | UPPER_SNAKE | `MAX_RECORDING_TIME` |
| 型/インターフェース | PascalCase | `WorkRecord`, `VoiceInputProps` |

## Feature Sliced Design

```
src/features/voice/
├── components/       # UI部品
├── hooks/            # ユースケース
├── domain/           # ビジネスロジック・型
└── repository/       # DB/API操作
```

## エラーハンドリング

```typescript
// オフライン対応: ローカル保存を先に、同期は後から
try {
  await localDB.save(record);
  syncQueue.add(record); // 非同期で後から同期
} catch (error) {
  // リトライ可能な形でエラー保存
  errorQueue.add({ record, error, retryCount: 0 });
}
```
