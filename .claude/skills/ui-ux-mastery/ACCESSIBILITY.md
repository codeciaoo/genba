# アクセシビリティ完全ガイド

WCAG 2.2 AA準拠 + iOS/Android プラットフォームガイドライン対応

---

## 1. 視覚アクセシビリティ

### 1.1 コントラスト比要件

```typescript
// WCAG 2.2 AA基準
export const CONTRAST_REQUIREMENTS = {
  // テキスト
  text: {
    normal: 4.5,      // 通常テキスト（16px未満）
    large: 3.0,       // 大テキスト（18px+ または 14px bold+）
  },

  // UI要素
  ui: {
    components: 3.0,  // ボタン、入力フィールドの境界線
    focusIndicator: 3.0,
    icons: 3.0,
  },

  // 強化版（AAA）
  enhanced: {
    normalText: 7.0,
    largeText: 4.5,
  },
};
```

### 1.2 コントラストチェッカー実装

```typescript
// src/utils/accessibility/contrast.ts

/**
 * 2色間のコントラスト比を計算
 * @returns コントラスト比（1:1 〜 21:1）
 */
export function getContrastRatio(color1: string, color2: string): number {
  const lum1 = getRelativeLuminance(color1);
  const lum2 = getRelativeLuminance(color2);

  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);

  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * 相対輝度を計算（WCAG 2.1定義）
 */
function getRelativeLuminance(hex: string): number {
  const rgb = hexToRgb(hex);

  const [r, g, b] = rgb.map(channel => {
    const c = channel / 255;
    return c <= 0.03928
      ? c / 12.92
      : Math.pow((c + 0.055) / 1.055, 2.4);
  });

  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * コントラストが基準を満たすかチェック
 */
export function meetsContrastRequirement(
  foreground: string,
  background: string,
  level: 'normal' | 'large' | 'ui' = 'normal'
): boolean {
  const ratio = getContrastRatio(foreground, background);
  const requirement = {
    normal: 4.5,
    large: 3.0,
    ui: 3.0,
  }[level];

  return ratio >= requirement;
}

// 使用例
const isAccessible = meetsContrastRequirement('#147878', '#ffffff', 'normal');
// true: コントラスト比 4.52:1 >= 4.5:1
```

### 1.3 色覚異常対応

```typescript
// 色だけに依存しない設計
export const COLOR_BLIND_GUIDELINES = {
  // ❌ 悪い例: 色のみで状態を表現
  bad: {
    success: { color: 'green' },
    error: { color: 'red' },
  },

  // ✅ 良い例: 色 + アイコン + テキスト
  good: {
    success: {
      color: 'green',
      icon: 'check-circle',
      label: '成功',
    },
    error: {
      color: 'red',
      icon: 'x-circle',
      label: 'エラー',
    },
  },
};

// 色覚シミュレーション用パレット
export const COLOR_BLIND_SAFE_PALETTE = {
  // 赤緑色覚異常でも区別しやすい組み合わせ
  primary: '#0077BB',    // 青
  secondary: '#EE7733',  // オレンジ
  success: '#009988',    // ティール
  error: '#CC3311',      // 赤橙
  warning: '#EE3377',    // マゼンタ
  info: '#33BBEE',       // シアン
};
```

### 1.4 フォーカスインジケーター（WCAG 2.2新基準）

```typescript
// WCAG 2.4.13: Focus Appearance
export const FOCUS_INDICATOR = {
  // 最小要件
  minimum: {
    // 2px以上の境界線
    borderWidth: 2,
    // 隣接色と3:1以上のコントラスト
    contrastRatio: 3.0,
    // 要素全体を囲む、または面積がピクセル数で2px幅の境界以上
  },

  // 推奨スタイル
  recommended: {
    outlineWidth: 3,
    outlineStyle: 'solid',
    outlineColor: '#147878',
    outlineOffset: 2,
  },
};

// React Native実装
const FocusableButton = styled.Pressable`
  /* フォーカス時のスタイル */
  ${({ focused }) => focused && `
    border-width: 3px;
    border-color: #147878;
  `}
`;
```

---

## 2. 運動アクセシビリティ

### 2.1 タッチターゲットサイズ

```typescript
// WCAG 2.5.8: Target Size (Minimum)
export const TOUCH_TARGET = {
  // 最小サイズ
  minimum: {
    width: 24,   // WCAG 2.2 最小
    height: 24,
  },

  // プラットフォーム推奨
  ios: {
    width: 44,   // Apple HIG
    height: 44,
  },
  android: {
    width: 48,   // Material Design
    height: 48,
  },

  // 推奨サイズ
  recommended: {
    width: 48,
    height: 48,
  },

  // 隣接要素との間隔
  spacing: {
    minimum: 8,
    recommended: 16,
  },
};

// 実装例: 小さいアイコンでも大きいタッチ領域
const IconButton = ({ icon, onPress }) => (
  <Pressable
    onPress={onPress}
    style={{
      width: 48,          // タッチ領域
      height: 48,
      justifyContent: 'center',
      alignItems: 'center',
    }}
    accessibilityRole="button"
  >
    <Icon
      name={icon}
      size={24}           // 視覚的サイズは小さくてOK
    />
  </Pressable>
);
```

### 2.2 ジェスチャーの代替手段

```typescript
// WCAG 2.5.1: Pointer Gestures
export const GESTURE_ALTERNATIVES = {
  // スワイプで削除 → 削除ボタンも提供
  swipeToDelete: {
    gesture: 'swipe_left',
    alternative: 'delete_button',
    implementation: `
      <SwipeableRow
        renderRightActions={() => (
          <DeleteButton accessibilityLabel="削除" />
        )}
      >
        <ListItem />
      </SwipeableRow>
    `,
  },

  // ピンチでズーム → ボタンでも可能に
  pinchToZoom: {
    gesture: 'pinch',
    alternative: 'zoom_buttons',
  },

  // ロングプレス → メニューボタン
  longPress: {
    gesture: 'long_press',
    alternative: 'menu_button',
  },
};
```

### 2.3 タイムアウトと自動更新

```typescript
// WCAG 2.2.1: Timing Adjustable
export const TIMING_GUIDELINES = {
  // セッションタイムアウト
  sessionTimeout: {
    // 警告を表示
    warningBefore: 60, // 秒
    // 延長オプション提供
    allowExtension: true,
    // 最低20秒の猶予
    minimumGrace: 20,
  },

  // 自動更新コンテンツ
  autoUpdate: {
    // 停止オプション提供
    allowPause: true,
    // 非表示オプション
    allowHide: true,
  },

  // カルーセル/スライドショー
  carousel: {
    // 自動再生はデフォルトOFF
    autoPlayDefault: false,
    // 停止ボタン必須
    pauseButton: true,
    // 十分な表示時間
    minimumDisplayTime: 5000, // ms
  },
};
```

---

## 3. 認知アクセシビリティ

### 3.1 一貫したナビゲーション

```typescript
// WCAG 3.2.3: Consistent Navigation
export const NAVIGATION_CONSISTENCY = {
  // 全画面で同じ位置にナビゲーション
  position: 'fixed',

  // 同じ順序
  order: [
    'back_button',
    'title',
    'action_buttons',
  ],

  // 同じラベリング
  labels: {
    back: '戻る',      // 「前へ」「キャンセル」混在NG
    menu: 'メニュー',
    search: '検索',
  },
};
```

### 3.2 エラーメッセージ

```typescript
// WCAG 3.3.1, 3.3.3: Error Identification & Suggestion
export const ERROR_HANDLING = {
  // ❌ 悪い例
  bad: {
    message: 'エラーが発生しました',
    // 何が間違っているか不明
    // どう修正すればいいか不明
  },

  // ✅ 良い例
  good: {
    // 1. 何が間違っているか
    field: 'メールアドレス',
    error: '無効な形式です',

    // 2. どう修正すればいいか
    suggestion: '例: example@email.com',

    // 3. エラー箇所を明示
    focusOnError: true,
    highlightField: true,
  },
};

// 実装例
const FormField = ({ error, suggestion }) => (
  <View>
    <TextInput
      accessibilityLabel={label}
      accessibilityInvalid={!!error}
      accessibilityErrorMessage={error}
      style={error ? styles.errorInput : styles.input}
    />
    {error && (
      <View role="alert">
        <Text style={styles.errorText}>{error}</Text>
        {suggestion && (
          <Text style={styles.suggestionText}>{suggestion}</Text>
        )}
      </View>
    )}
  </View>
);
```

### 3.3 認証の簡素化（WCAG 2.2新基準）

```typescript
// WCAG 3.3.8: Accessible Authentication
export const AUTH_GUIDELINES = {
  // 認知機能テストを避ける
  avoid: [
    'CAPTCHA（画像認識）',
    '複雑なパスワード記憶',
    '秘密の質問',
  ],

  // 推奨認証方法
  recommended: [
    'パスキー / Face ID / Touch ID',
    'マジックリンク（メール/SMS）',
    'コピー&ペースト可能なコード',
    'パスワードマネージャー対応',
  ],

  // パスワード要件を表示
  showRequirements: true,

  // ペースト許可
  allowPaste: true,
};
```

---

## 4. スクリーンリーダー対応

### 4.1 React Native アクセシビリティAPI

```typescript
// 基本的なアクセシビリティProps
interface AccessibilityProps {
  // 必須: 要素の説明
  accessibilityLabel: string;

  // 要素の役割
  accessibilityRole:
    | 'none'
    | 'button'
    | 'link'
    | 'search'
    | 'image'
    | 'text'
    | 'adjustable'
    | 'header'
    | 'summary'
    | 'alert'
    | 'checkbox'
    | 'combobox'
    | 'menu'
    | 'menubar'
    | 'menuitem'
    | 'progressbar'
    | 'radio'
    | 'radiogroup'
    | 'scrollbar'
    | 'spinbutton'
    | 'switch'
    | 'tab'
    | 'tablist'
    | 'timer'
    | 'toolbar';

  // 現在の状態
  accessibilityState?: {
    disabled?: boolean;
    selected?: boolean;
    checked?: boolean | 'mixed';
    busy?: boolean;
    expanded?: boolean;
  };

  // 操作ヒント
  accessibilityHint?: string;

  // ライブリージョン（動的更新通知）
  accessibilityLiveRegion?: 'none' | 'polite' | 'assertive';

  // 値（スライダー等）
  accessibilityValue?: {
    min?: number;
    max?: number;
    now?: number;
    text?: string;
  };
}
```

### 4.2 コンポーネント別実装例

```typescript
// ボタン
<Pressable
  onPress={handlePress}
  accessibilityRole="button"
  accessibilityLabel="設定を開く"
  accessibilityHint="ダブルタップで設定画面に移動します"
  accessibilityState={{ disabled: isDisabled }}
>
  <Text>設定</Text>
</Pressable>

// チェックボックス
<Pressable
  onPress={() => setChecked(!checked)}
  accessibilityRole="checkbox"
  accessibilityLabel="利用規約に同意する"
  accessibilityState={{ checked }}
>
  <CheckIcon checked={checked} />
  <Text>利用規約に同意する</Text>
</Pressable>

// スライダー
<Slider
  accessibilityRole="adjustable"
  accessibilityLabel="音量"
  accessibilityValue={{
    min: 0,
    max: 100,
    now: volume,
    text: `${volume}パーセント`,
  }}
  accessibilityHint="上下にスワイプして調整"
/>

// 画像
<Image
  source={profileImage}
  accessibilityRole="image"
  accessibilityLabel="田中太郎のプロフィール写真"
/>

// 装飾的画像（読み上げ不要）
<Image
  source={decorativePattern}
  accessibilityElementsHidden={true}
  importantForAccessibility="no"
/>

// ライブリージョン（通知等）
<View
  accessibilityLiveRegion="polite"
  accessibilityRole="alert"
>
  <Text>{notification}</Text>
</View>
```

### 4.3 フォーカス管理

```typescript
import { AccessibilityInfo, findNodeHandle } from 'react-native';

// フォーカスをプログラムで移動
const setAccessibilityFocus = (ref: React.RefObject<any>) => {
  const handle = findNodeHandle(ref.current);
  if (handle) {
    AccessibilityInfo.setAccessibilityFocus(handle);
  }
};

// モーダル表示時にフォーカス移動
const Modal = ({ visible, children }) => {
  const titleRef = useRef(null);

  useEffect(() => {
    if (visible) {
      // モーダルタイトルにフォーカス
      setTimeout(() => setAccessibilityFocus(titleRef), 100);
    }
  }, [visible]);

  return (
    <View accessibilityViewIsModal={true}>
      <Text ref={titleRef} accessibilityRole="header">
        モーダルタイトル
      </Text>
      {children}
    </View>
  );
};
```

### 4.4 読み上げ順序

```typescript
// 論理的な読み上げ順序を保証
<View>
  {/* 1. ヘッダー（最初に読み上げ） */}
  <Text accessibilityRole="header">商品詳細</Text>

  {/* 2. 主要コンテンツ */}
  <Text>商品名: スマートウォッチ</Text>
  <Text>価格: ¥29,800</Text>

  {/* 3. アクション（最後に読み上げ） */}
  <Pressable accessibilityRole="button">
    <Text>カートに追加</Text>
  </Pressable>
</View>

// 視覚的順序と論理的順序が異なる場合
<View
  accessibilityElementsHidden={false}
  importantForAccessibility="yes"
>
  {/* accessibilityOrder でカスタム順序指定 (iOS 17+) */}
</View>
```

---

## 5. Reduced Motion対応

### 5.1 システム設定の検出

```typescript
import { AccessibilityInfo } from 'react-native';
import { useEffect, useState } from 'react';

export function useReducedMotion(): boolean {
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    // 初期値取得
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);

    // 変更を監視
    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setReduceMotion
    );

    return () => subscription.remove();
  }, []);

  return reduceMotion;
}
```

### 5.2 アニメーションの条件分岐

```typescript
const AnimatedComponent = () => {
  const reduceMotion = useReducedMotion();

  // Reduced Motionが有効な場合は即座に変化
  const animationConfig = reduceMotion
    ? { duration: 0 }
    : {
        duration: 300,
        easing: Easing.out(Easing.cubic),
      };

  // または、代替アニメーション
  const getAnimation = () => {
    if (reduceMotion) {
      // フェードのみ（動きなし）
      return {
        opacity: withTiming(1, { duration: 150 }),
      };
    }
    // 通常: スライド + フェード
    return {
      opacity: withTiming(1, { duration: 300 }),
      transform: [
        { translateY: withSpring(0) },
      ],
    };
  };

  return <Animated.View style={getAnimation()} />;
};
```

### 5.3 アニメーション代替パターン

```typescript
export const REDUCED_MOTION_ALTERNATIVES = {
  // スライド → フェード
  slideIn: {
    normal: 'translateX + opacity',
    reduced: 'opacity only',
  },

  // バウンス → 即座
  bounce: {
    normal: 'spring animation',
    reduced: 'instant change',
  },

  // 連続アニメーション → 静止
  continuous: {
    normal: 'rotating loader',
    reduced: 'static progress indicator',
  },

  // パララックス → 固定
  parallax: {
    normal: 'scroll-linked movement',
    reduced: 'static positioning',
  },
};
```

---

## 6. テストチェックリスト

### 6.1 自動テスト

```typescript
// Jest + React Native Testing Library
import { render, screen } from '@testing-library/react-native';

describe('Accessibility Tests', () => {
  it('ボタンにアクセシブルラベルがある', () => {
    render(<MyButton />);

    const button = screen.getByRole('button');
    expect(button).toHaveAccessibilityValue({
      text: expect.any(String),
    });
  });

  it('画像に説明がある', () => {
    render(<ProfileImage />);

    const image = screen.getByRole('image');
    expect(image.props.accessibilityLabel).toBeTruthy();
  });

  it('フォームエラーが適切に通知される', () => {
    render(<LoginForm />);

    const errorMessage = screen.getByRole('alert');
    expect(errorMessage).toBeTruthy();
  });
});
```

### 6.2 手動テスト

```markdown
## VoiceOver (iOS) テスト

1. [ ] 設定 > アクセシビリティ > VoiceOver をON
2. [ ] 全てのインタラクティブ要素にフォーカス可能
3. [ ] 読み上げ内容が意味をなす
4. [ ] 論理的なフォーカス順序
5. [ ] カスタムアクションが動作する
6. [ ] モーダル内にフォーカスが閉じ込められる

## TalkBack (Android) テスト

1. [ ] 設定 > ユーザー補助 > TalkBack をON
2. [ ] 全てのインタラクティブ要素にフォーカス可能
3. [ ] 読み上げ内容が意味をなす
4. [ ] 論理的なフォーカス順序
5. [ ] ダブルタップでアクション実行
6. [ ] スワイプでナビゲーション可能

## キーボードナビゲーション (タブレット/外部キーボード)

1. [ ] Tab キーで全要素にアクセス可能
2. [ ] フォーカスインジケーターが見える
3. [ ] Enter/Space でアクション実行
4. [ ] Escape でモーダルを閉じる
5. [ ] 矢印キーでリスト内移動
```

### 6.3 監査ツール

```typescript
// React Native AMA (Accessibility Made Accessible)
// https://github.com/nearform/react-native-ama

import { AMAProvider } from 'react-native-ama';

const App = () => (
  <AMAProvider>
    {/* 開発中にアクセシビリティ問題を検出 */}
    <YourApp />
  </AMAProvider>
);

// Expo用設定
// npx expo install react-native-ama
```

---

## 7. クイックリファレンス

### 必須チェックリスト

```markdown
## 視覚

- [ ] テキストコントラスト 4.5:1以上
- [ ] UIコンポーネントコントラスト 3:1以上
- [ ] フォーカスインジケーター明確
- [ ] 色だけに依存しない情報伝達
- [ ] テキストリサイズ対応

## 運動

- [ ] タッチターゲット 44x44pt / 48x48dp 以上
- [ ] ジェスチャーの代替手段
- [ ] タイムアウト延長オプション

## 認知

- [ ] 一貫したナビゲーション
- [ ] 明確なエラーメッセージ
- [ ] 認証の簡素化

## スクリーンリーダー

- [ ] 全要素にaccessibilityLabel
- [ ] 適切なaccessibilityRole
- [ ] 論理的なフォーカス順序
- [ ] ライブリージョンで動的更新通知

## モーション

- [ ] Reduced Motion対応
- [ ] 自動再生コンテンツの停止オプション
```
