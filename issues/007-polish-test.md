# #007 仕上げ・テスト（MVP）

## 概要

MVP機能の仕上げとテストを行い、App Store / Google Playへのリリース準備を完了する。

## ステータス

🔵 Todo

## 優先度

P0（MVP必須）

## 依存

- #006 請求書自動生成（インボイス対応）

## 参照スキル

- `genba-design-system` - UIの統一
- `genba-app-architecture` - 全体アーキテクチャ

## タスク

### 1. UI/UX統一

- [ ] 全画面のデザインシステム準拠確認
- [ ] カラー・タイポグラフィの統一
- [ ] ボタン・カードの統一
- [ ] エラー表示の統一
- [ ] ローディング表示の統一
- [ ] 空状態（Empty State）の実装

### 2. オフライン対応確認

```typescript
// src/hooks/useNetworkStatus.ts
import NetInfo from '@react-native-community/netinfo';

export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOnline(state.isConnected ?? false);
    });
    return () => unsubscribe();
  }, []);

  return { isOnline };
}
```

- [ ] オフライン時のUI表示
- [ ] オフライン録音→オンライン復帰→自動同期
- [ ] ローカルDBとSupabaseの同期確認

### 3. エラーハンドリング

```typescript
// src/utils/errorHandler.ts
export function handleError(error: Error, context: string) {
  console.error(`[${context}]`, error);

  // ユーザーフレンドリーなメッセージ
  if (error.message.includes('network')) {
    showToast('ネットワークエラー。オフラインモードで動作中です。');
  } else if (error.message.includes('permission')) {
    showToast('権限が必要です。設定から許可してください。');
  } else {
    showToast('エラーが発生しました。再度お試しください。');
  }
}
```

- [ ] API エラーハンドリング
- [ ] ネットワークエラーハンドリング
- [ ] 権限エラーハンドリング
- [ ] 入力バリデーションエラー

### 4. パフォーマンス最適化

- [ ] 画像の最適化（圧縮、キャッシュ）
- [ ] リスト表示の最適化（FlatList、仮想化）
- [ ] メモリリーク対策
- [ ] 起動時間の計測・改善

### 5. アクセシビリティ

- [ ] 適切なaccessibilityLabel設定
- [ ] コントラスト比の確認
- [ ] タッチターゲットサイズ（最小44x44px）
- [ ] フォントサイズの動的対応

### 6. テスト

#### 単体テスト

```typescript
// __tests__/invoice/taxCalculator.test.ts
describe('税額計算', () => {
  it('10%税率の計算が正しい', () => {
    const items = [{ amount: 10000, taxRate: 10 }];
    expect(calculateTax(items)).toBe(1000);
  });

  it('端数切り捨てが正しい', () => {
    const items = [{ amount: 10001, taxRate: 10 }];
    expect(calculateTax(items)).toBe(1000); // 1000.1 → 1000
  });
});
```

- [ ] 税額計算テスト
- [ ] 請求書番号生成テスト
- [ ] 日付フォーマットテスト

#### E2Eテスト

- [ ] 録音→文字起こし→日報生成フロー
- [ ] 日報→請求書生成フロー
- [ ] オフライン→オンライン同期フロー

### 7. ストア申請準備

#### App Store

- [ ] アプリアイコン（1024x1024）
- [ ] スクリーンショット（iPhone 6.5", 5.5"）
- [ ] アプリ説明文
- [ ] プライバシーポリシーURL
- [ ] サポートURL
- [ ] App Store Connect設定

#### Google Play

- [ ] 高解像度アイコン（512x512）
- [ ] フィーチャーグラフィック（1024x500）
- [ ] スクリーンショット
- [ ] 説明文（短縮版80文字、詳細版4000文字）
- [ ] プライバシーポリシーURL
- [ ] Google Play Console設定

### 8. 環境変数管理

```typescript
// app.config.ts
export default {
  expo: {
    extra: {
      supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
      supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
      openaiApiKey: process.env.EXPO_PUBLIC_OPENAI_API_KEY,
      weatherApiKey: process.env.EXPO_PUBLIC_WEATHER_API_KEY,
    },
  },
};
```

- [ ] 開発/本番環境の切り替え
- [ ] 機密情報の管理（Expo SecureStore）
- [ ] EAS Build設定

## 実行コマンド

```bash
# 指示文
全スキルを参照して、MVPの仕上げとテストを行ってください。

作業対象: /Users/tsubasatahara/dev/codeciao/genba/genba-gear

1. UI/UXの統一確認
2. オフライン対応の確認
3. エラーハンドリングの実装
4. テストの作成・実行
5. ストア申請準備

完了後:
npx expo prebuild
eas build --platform all
```

## 完了条件

- [ ] 全画面のデザインが統一されている
- [ ] オフラインで録音・保存ができる
- [ ] エラーが適切にハンドリングされる
- [ ] 主要機能のテストが通る
- [ ] App Store申請に必要な素材が揃っている
- [ ] Google Play申請に必要な素材が揃っている
- [ ] EAS Buildでビルドが成功する
