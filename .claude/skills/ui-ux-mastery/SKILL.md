# UI/UX Mastery Skill

一流のUI/UXエンジニアの知見を集約した包括的なデザインガイドライン。
Anthropic、Apple HIG、Material Design 3、WCAG 2.2のベストプラクティスに基づく。

---

## 1. 設計哲学

### 1.1 コアプリンシプル（Apple HIG準拠）

| 原則 | 説明 | 実践 |
|------|------|------|
| **Clarity（明瞭性）** | 直感的で混乱のないUI | クリーンなレイアウト、十分な余白、最小限の要素 |
| **Deference（控えめさ）** | UIはコンテンツを邪魔しない | 本質的なコンテンツが最も目立つ設計 |
| **Depth（深度）** | レイヤー、シャドウ、モーションで階層を表現 | 視覚的階層でユーザーの注意を誘導 |
| **Consistency（一貫性）** | 標準的なUI要素と視覚的手がかり | プラットフォーム慣習に従う |

### 1.2 AIスロップを避ける（Anthropic推奨）

**絶対に使わない「ジェネリック」パターン:**

```
❌ 避けるべきもの:
- Inter / Roboto をプライマリフォントに
- 紫グラデーション on 白背景
- 汎用SaaSブルー (#3B82F6)
- グラスモーフィズムの乱用
- 予測可能な3カラムレイアウト
- シャドウなしのフラットカード
```

**代わりに採用する:**

```
✅ 推奨:
- 個性的なフォント（Space Grotesk, Playfair Display, JetBrains Mono）
- 大胆な配色（ドミナントカラー + シャープなアクセント）
- 大気的な背景（グラデーション、テクスチャ、パターン）
- 意図的なモーションとマイクロインタラクション
- 独自のブランドアイデンティティ
```

---

## 2. タイポグラフィ

### 2.1 フォントサイズ階層

```typescript
// src/constants/typography.ts
export const TYPOGRAPHY = {
  // iOS: 17pt最小 / Android: 16sp最小
  body: {
    small: 14,      // キャプション、補足
    medium: 16,     // 本文（最小推奨）
    large: 18,      // 強調本文
  },
  heading: {
    h4: 20,         // セクション見出し
    h3: 24,         // ページ小見出し
    h2: 28,         // ページ見出し
    h1: 34,         // 大見出し（1.618x本文 = ゴールデンレシオ）
  },
  display: {
    small: 40,
    medium: 48,
    large: 56,
  },
} as const;

// 階層間の差: 最低4-6px
// 見出し = 本文 × 1.3〜1.618（ゴールデンレシオ）
```

### 2.2 フォントペアリング

```typescript
// 推奨ペアリング（日本語対応）
export const FONT_PAIRS = {
  // モダン × 読みやすさ
  modern: {
    heading: 'Space Grotesk',    // 見出し: 幾何学的
    body: 'Noto Sans JP',        // 本文: 高可読性
  },
  // エレガント × クリーン
  elegant: {
    heading: 'Playfair Display', // 見出し: セリフ
    body: 'Noto Sans JP',        // 本文: サンセリフ
  },
  // テック × 信頼
  tech: {
    heading: 'JetBrains Mono',   // 見出し: モノスペース
    body: 'Noto Sans JP',        // 本文: 標準
  },
  // システム（パフォーマンス優先）
  system: {
    heading: 'System',           // iOS: SF Pro / Android: Roboto
    body: 'System',
  },
} as const;

// ルール: 最大2-3フォントファミリー
```

### 2.3 行間（Leading）と文字間（Tracking）

```typescript
export const LINE_HEIGHT = {
  tight: 1.2,     // 見出し
  normal: 1.5,    // 本文（推奨）
  relaxed: 1.75,  // 長文
} as const;

export const LETTER_SPACING = {
  tight: -0.5,    // 大見出し
  normal: 0,      // 本文
  wide: 0.5,      // ボタン、ラベル
  extraWide: 1.5, // オールキャップス
} as const;
```

---

## 3. カラーシステム

### 3.1 60-30-10 ルール

```
┌─────────────────────────────────────────────┐
│                                             │
│   60% - Dominant（支配色）                   │
│   背景、大きな面積                           │
│                                             │
├─────────────────────────────────────────────┤
│   30% - Secondary（補助色）                  │
│   カード、セクション区切り                   │
├───────────────┬─────────────────────────────┤
│ 10% - Accent  │  CTA、ハイライト、アラート   │
└───────────────┴─────────────────────────────┘
```

### 3.2 カラーパレット構築

```typescript
// src/constants/colors.ts
export const createColorPalette = (brandHue: number) => ({
  // プライマリ（ブランドカラー）
  primary: {
    50: `hsl(${brandHue}, 100%, 97%)`,
    100: `hsl(${brandHue}, 95%, 90%)`,
    200: `hsl(${brandHue}, 90%, 80%)`,
    300: `hsl(${brandHue}, 85%, 70%)`,
    400: `hsl(${brandHue}, 80%, 60%)`,
    500: `hsl(${brandHue}, 75%, 50%)`,  // ベース
    600: `hsl(${brandHue}, 80%, 40%)`,
    700: `hsl(${brandHue}, 85%, 30%)`,
    800: `hsl(${brandHue}, 90%, 20%)`,
    900: `hsl(${brandHue}, 95%, 10%)`,
  },

  // ニュートラル（グレースケール）
  neutral: {
    0: '#ffffff',
    50: '#fafafa',
    100: '#f5f5f5',
    200: '#e5e5e5',
    300: '#d4d4d4',
    400: '#a3a3a3',
    500: '#737373',
    600: '#525252',
    700: '#404040',
    800: '#262626',
    900: '#171717',
    1000: '#000000',
  },

  // セマンティック
  semantic: {
    success: '#22c55e',   // 緑: 成功、完了
    warning: '#f59e0b',   // 黄: 警告、注意
    error: '#ef4444',     // 赤: エラー、危険
    info: '#3b82f6',      // 青: 情報
  },
});

// 色彩心理学
// 青 → 信頼、安定（金融、ヘルスケア）
// 緑 → 成長、自然（環境、ウェルネス）
// 赤 → 緊急、情熱（セール、アクション）
// 紫 → 高級、創造性（ラグジュアリー、クリエイティブ）
// オレンジ → エネルギー、親しみ（フィットネス、フード）
```

### 3.3 コントラスト比（WCAG 2.2準拠）

```typescript
export const CONTRAST_REQUIREMENTS = {
  // テキスト
  normalText: 4.5,    // AA: 4.5:1以上
  largeText: 3.0,     // AA Large (18pt+/14pt bold+): 3:1以上

  // UI要素
  uiComponents: 3.0,  // ボタン、アイコン: 3:1以上
  focusIndicator: 3.0, // フォーカス表示: 3:1以上

  // 強化版（AAA）
  enhancedText: 7.0,
  enhancedLarge: 4.5,
} as const;

// コントラストチェッカー関数
export function checkContrast(foreground: string, background: string): number {
  // 相対輝度を計算して比率を返す
  const getLuminance = (hex: string) => {
    const rgb = hexToRgb(hex);
    const [r, g, b] = rgb.map(c => {
      c = c / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };

  const l1 = getLuminance(foreground);
  const l2 = getLuminance(background);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);

  return (lighter + 0.05) / (darker + 0.05);
}
```

### 3.4 ダークモード対応

```typescript
export const DARK_MODE_PRINCIPLES = {
  // 1. 純粋な黒は避ける
  background: '#121212',  // NOT #000000

  // 2. 彩度を下げる
  // ダークモードでは鮮やかな色が目立ちすぎる
  primaryLight: 'hsl(174, 75%, 50%)',  // ライトモード
  primaryDark: 'hsl(174, 60%, 60%)',   // ダークモード（彩度↓、明度↑）

  // 3. エレベーション = 明るさ
  // Material Design: 高いエレベーション = より明るい
  surface: {
    level0: '#121212',  // 背景
    level1: '#1e1e1e',  // カード
    level2: '#232323',  // ダイアログ
    level3: '#282828',  // ナビゲーション
    level4: '#2c2c2c',  // メニュー
  },

  // 4. テキストの不透明度
  text: {
    primary: 'rgba(255, 255, 255, 0.87)',   // 高強調
    secondary: 'rgba(255, 255, 255, 0.60)', // 中強調
    disabled: 'rgba(255, 255, 255, 0.38)',  // 無効
  },
};
```

---

## 4. スペーシングシステム

### 4.1 8pxグリッドシステム

```typescript
// src/constants/spacing.ts
export const SPACING = {
  0: 0,
  1: 4,    // 2xs: 微細な調整
  2: 8,    // xs: アイコンとテキストの間
  3: 12,   // sm: 関連要素間
  4: 16,   // md: 標準パディング
  5: 20,   // md+
  6: 24,   // lg: セクション内要素間
  8: 32,   // xl: セクション間
  10: 40,  // 2xl
  12: 48,  // 3xl: 大きなセクション間
  16: 64,  // 4xl
  20: 80,  // 5xl: ページセクション間
  24: 96,  // 6xl
} as const;

// 8の倍数を基本とする（4は微調整用）
```

### 4.2 コンポーネントスペーシング

```typescript
export const COMPONENT_SPACING = {
  // ボタン
  button: {
    paddingX: SPACING[4],  // 16px
    paddingY: SPACING[3],  // 12px
    gap: SPACING[2],       // 8px（アイコンとテキスト間）
  },

  // カード
  card: {
    padding: SPACING[4],   // 16px
    gap: SPACING[3],       // 12px（内部要素間）
    borderRadius: 12,
  },

  // リストアイテム
  listItem: {
    paddingX: SPACING[4],  // 16px
    paddingY: SPACING[3],  // 12px
    gap: SPACING[3],       // 12px
  },

  // 入力フィールド
  input: {
    paddingX: SPACING[4],  // 16px
    paddingY: SPACING[3],  // 12px
    height: 48,            // タッチターゲット最小サイズ
  },

  // モーダル
  modal: {
    padding: SPACING[6],   // 24px
    gap: SPACING[4],       // 16px
  },
};
```

---

## 5. タッチターゲットとインタラクション

### 5.1 タッチターゲットサイズ（WCAG 2.2 + プラットフォームガイドライン）

```typescript
export const TOUCH_TARGETS = {
  // 最小サイズ
  minimum: {
    ios: 44,      // Apple HIG: 44x44pt
    android: 48,  // Material Design: 48x48dp
  },

  // 推奨サイズ
  recommended: {
    small: 40,    // セカンダリアクション
    medium: 48,   // 標準ボタン
    large: 56,    // プライマリCTA
  },

  // スペーシング
  spacing: {
    minimum: 8,   // 隣接要素との最小間隔
    recommended: 16,
  },
} as const;

// 重要: 視覚的サイズ ≠ タッチターゲット
// 小さいアイコンでも、タッチ領域は48px確保する
```

### 5.2 インタラクションステート

```typescript
export const INTERACTION_STATES = {
  // ボタンステート
  button: {
    default: {
      opacity: 1,
      scale: 1,
    },
    hover: {
      opacity: 0.9,
      scale: 1,
      // Web: カーソルがホバー
    },
    pressed: {
      opacity: 0.8,
      scale: 0.98,
      // タッチ中
    },
    focused: {
      // キーボードフォーカス
      outline: '2px solid',
      outlineOffset: 2,
    },
    disabled: {
      opacity: 0.5,
      // タッチ不可
    },
    loading: {
      // スピナー表示
    },
  },

  // 入力フィールドステート
  input: {
    default: {
      borderColor: 'neutral.300',
    },
    focused: {
      borderColor: 'primary.500',
      borderWidth: 2,
    },
    error: {
      borderColor: 'semantic.error',
    },
    disabled: {
      backgroundColor: 'neutral.100',
      opacity: 0.5,
    },
  },
};
```

---

## 6. アクセシビリティ（WCAG 2.2準拠）

### 6.1 React Native アクセシビリティProps

```typescript
// 必須アクセシビリティ属性
interface AccessibleComponent {
  // 要素の説明（スクリーンリーダー用）
  accessibilityLabel: string;

  // 要素の役割
  accessibilityRole:
    | 'button'
    | 'link'
    | 'header'
    | 'image'
    | 'text'
    | 'checkbox'
    | 'radio'
    | 'switch'
    | 'adjustable'  // スライダー
    | 'alert'
    | 'none';

  // 現在の状態
  accessibilityState?: {
    disabled?: boolean;
    selected?: boolean;
    checked?: boolean | 'mixed';
    busy?: boolean;
    expanded?: boolean;
  };

  // 値（スライダー等）
  accessibilityValue?: {
    min?: number;
    max?: number;
    now?: number;
    text?: string;
  };

  // ヒント（操作方法）
  accessibilityHint?: string;
}

// 使用例
<TouchableOpacity
  accessibilityLabel="設定を開く"
  accessibilityRole="button"
  accessibilityHint="ダブルタップで設定画面に移動します"
>
  <Icon name="settings" />
</TouchableOpacity>
```

### 6.2 アクセシビリティチェックリスト

```typescript
export const ACCESSIBILITY_CHECKLIST = {
  // 視覚
  visual: [
    '□ テキストコントラスト比 4.5:1以上（通常）/ 3:1以上（大テキスト）',
    '□ UIコンポーネントコントラスト比 3:1以上',
    '□ 色だけに依存しない情報伝達（アイコン、テキスト併用）',
    '□ フォーカスインジケーター明確（2px以上の境界線）',
    '□ テキストリサイズ対応（Dynamic Type）',
  ],

  // 運動
  motor: [
    '□ タッチターゲット 44x44pt (iOS) / 48x48dp (Android) 以上',
    '□ 隣接要素間のスペース 8px以上',
    '□ ジェスチャーの代替手段提供',
    '□ タイムアウトの延長オプション',
  ],

  // 聴覚
  auditory: [
    '□ 音声コンテンツにキャプション/字幕',
    '□ 音のみに依存しないフィードバック（振動、視覚）',
  ],

  // 認知
  cognitive: [
    '□ 一貫したナビゲーション',
    '□ 明確なエラーメッセージと解決方法',
    '□ 複雑なパスワード要件の代替（パスキー等）',
    '□ アニメーション停止オプション（Reduced Motion対応）',
  ],

  // スクリーンリーダー
  screenReader: [
    '□ 全インタラクティブ要素にaccessibilityLabel',
    '□ 適切なaccessibilityRole設定',
    '□ 論理的なフォーカス順序',
    '□ VoiceOver (iOS) / TalkBack (Android) テスト実施',
  ],
};
```

### 6.3 Reduced Motion対応

```typescript
import { AccessibilityInfo } from 'react-native';
import { useEffect, useState } from 'react';

export function useReducedMotion(): boolean {
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);

    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setReduceMotion
    );

    return () => subscription.remove();
  }, []);

  return reduceMotion;
}

// 使用例
const reduceMotion = useReducedMotion();

const animationConfig = reduceMotion
  ? { duration: 0 }
  : { duration: 300, easing: Easing.out(Easing.cubic) };
```

---

## 7. モーションとアニメーション

### 7.1 アニメーション原則

```typescript
export const ANIMATION_PRINCIPLES = {
  // 1. 目的を持つ
  // アニメーションは装飾ではなく、機能的フィードバック

  // 2. 自然な動き
  // イージング関数で物理的な動きを模倣

  // 3. パフォーマンス優先
  // 60fps (16ms/frame) を維持

  // 4. 控えめに
  // 過度なアニメーションはユーザーを疲れさせる
};

export const DURATION = {
  instant: 100,     // ホバー、リップル
  fast: 200,        // ボタンプレス、トグル
  normal: 300,      // ページ遷移、モーダル
  slow: 500,        // 複雑なトランジション
  emphasis: 700,    // 注目を集める
} as const;

export const EASING = {
  // 加速→減速（最も自然）
  standard: 'cubic-bezier(0.4, 0.0, 0.2, 1)',

  // 減速のみ（画面に入る要素）
  decelerate: 'cubic-bezier(0.0, 0.0, 0.2, 1)',

  // 加速のみ（画面から出る要素）
  accelerate: 'cubic-bezier(0.4, 0.0, 1, 1)',

  // バウンス効果
  bounce: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',

  // スプリング（React Native Reanimated）
  spring: {
    damping: 15,
    stiffness: 150,
    mass: 1,
  },
} as const;
```

### 7.2 マイクロインタラクション

```typescript
// マイクロインタラクションの4要素（Dan Saffer）
export const MICRO_INTERACTION = {
  // 1. トリガー: ユーザーアクションまたはシステムイベント
  trigger: 'user_action' | 'system_event',

  // 2. ルール: 何が起こるかを決定
  rules: 'define_behavior',

  // 3. フィードバック: ユーザーに何が起きたか伝える
  feedback: 'visual' | 'haptic' | 'auditory',

  // 4. ループとモード: 繰り返しや状態変化
  loops: 'repeat_or_change',
};

// 実装例: いいねボタン
export const LikeButtonAnimation = {
  // トリガー: タップ
  onPress: () => {
    // ルール: 状態をトグル
    setLiked(!liked);

    // フィードバック
    // 1. 視覚: スケールアニメーション + 色変化
    Animated.sequence([
      Animated.spring(scale, { toValue: 1.2, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, useNativeDriver: true }),
    ]).start();

    // 2. 触覚: バイブレーション
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // 3. 聴覚: (オプション) サウンドエフェクト
  },
};
```

### 7.3 ページ遷移

```typescript
// Expo Router / React Navigation
export const SCREEN_TRANSITIONS = {
  // スライド（デフォルト）
  slide: {
    animation: 'slide_from_right',
    duration: DURATION.normal,
  },

  // フェード（モーダル的）
  fade: {
    animation: 'fade',
    duration: DURATION.fast,
  },

  // ボトムシート
  bottomSheet: {
    animation: 'slide_from_bottom',
    duration: DURATION.normal,
  },

  // ズーム（詳細画面）
  zoom: {
    animation: 'zoom',
    duration: DURATION.normal,
  },

  // なし（即時切り替え）
  none: {
    animation: 'none',
    duration: 0,
  },
};
```

---

## 8. レスポンシブデザイン

### 8.1 ブレークポイント

```typescript
export const BREAKPOINTS = {
  // モバイル優先
  xs: 0,      // 小型スマートフォン
  sm: 375,    // iPhone SE以上
  md: 428,    // iPhone Pro Max等
  lg: 768,    // タブレット
  xl: 1024,   // 大型タブレット / デスクトップ
  '2xl': 1280, // 大画面
} as const;

// React Native用フック
export function useBreakpoint() {
  const { width } = useWindowDimensions();

  return {
    isXs: width < BREAKPOINTS.sm,
    isSm: width >= BREAKPOINTS.sm && width < BREAKPOINTS.md,
    isMd: width >= BREAKPOINTS.md && width < BREAKPOINTS.lg,
    isLg: width >= BREAKPOINTS.lg && width < BREAKPOINTS.xl,
    isXl: width >= BREAKPOINTS.xl,
    isTablet: width >= BREAKPOINTS.lg,
    isDesktop: width >= BREAKPOINTS.xl,
  };
}
```

### 8.2 レスポンシブタイポグラフィ

```typescript
export function getResponsiveTypography(width: number) {
  const scale = width < BREAKPOINTS.sm ? 0.9 : width >= BREAKPOINTS.lg ? 1.1 : 1;

  return {
    body: {
      small: Math.round(14 * scale),
      medium: Math.round(16 * scale),
      large: Math.round(18 * scale),
    },
    heading: {
      h4: Math.round(20 * scale),
      h3: Math.round(24 * scale),
      h2: Math.round(28 * scale),
      h1: Math.round(34 * scale),
    },
  };
}
```

### 8.3 レイアウトパターン

```typescript
export const LAYOUT_PATTERNS = {
  // スタック（モバイル）
  stack: {
    direction: 'column',
    gap: SPACING[4],
  },

  // グリッド（タブレット以上）
  grid: {
    columns: {
      sm: 1,
      md: 2,
      lg: 3,
      xl: 4,
    },
    gap: SPACING[4],
  },

  // サイドバー + コンテンツ（タブレット以上）
  sidebar: {
    sidebarWidth: 280,
    minContentWidth: 600,
  },

  // マスター/ディテール（iPad）
  masterDetail: {
    masterWidth: '35%',
    detailWidth: '65%',
  },
};
```

---

## 9. プラットフォーム別ガイドライン

### 9.1 iOS (Human Interface Guidelines 2025)

```typescript
export const IOS_GUIDELINES = {
  // Liquid Glass デザイン言語
  visualStyle: {
    translucency: true,         // 半透明効果
    blur: 'systemMaterial',     // ブラー効果
    depth: true,                // 深度表現
  },

  // ナビゲーション
  navigation: {
    backButton: 'left',         // 左上に戻るボタン
    tabBar: 'bottom',           // 下部タブバー
    searchBar: 'large_title',   // ラージタイトル内に検索
  },

  // タッチターゲット
  touchTarget: {
    minimum: 44,
    recommended: 48,
  },

  // システムカラー
  colors: {
    systemBlue: '#007AFF',
    systemGreen: '#34C759',
    systemRed: '#FF3B30',
    systemOrange: '#FF9500',
    systemYellow: '#FFCC00',
  },
};
```

### 9.2 Android (Material Design 3 Expressive)

```typescript
export const ANDROID_GUIDELINES = {
  // M3 Expressive
  visualStyle: {
    dynamicColor: true,         // Material You
    shapes: 'expressive',       // 動的シェイプ
    motion: 'spring',           // スプリングアニメーション
  },

  // ナビゲーション
  navigation: {
    backButton: 'system',       // システム戻るジェスチャー
    navigationBar: 'bottom',    // ボトムナビゲーション
    navigationRail: 'side',     // タブレット: サイドレール
  },

  // タッチターゲット
  touchTarget: {
    minimum: 48,
    recommended: 56,
  },

  // エレベーション
  elevation: {
    level0: 0,
    level1: 1,
    level2: 3,
    level3: 6,
    level4: 8,
    level5: 12,
  },
};
```

### 9.3 クロスプラットフォーム戦略

```typescript
import { Platform } from 'react-native';

export const CROSS_PLATFORM = {
  // 共通: 一貫したブランドアイデンティティ
  shared: {
    colors: true,       // ブランドカラー
    typography: true,   // フォントスケール
    spacing: true,      // スペーシングシステム
    icons: true,        // アイコンセット
  },

  // プラットフォーム固有
  platformSpecific: {
    navigation: Platform.select({
      ios: 'stack_with_tab',
      android: 'bottom_navigation',
    }),
    statusBar: Platform.select({
      ios: 'light-content',
      android: 'auto',
    }),
    haptics: Platform.select({
      ios: 'available',
      android: 'limited',
    }),
  },
};
```

---

## 10. パフォーマンス最適化

### 10.1 アニメーションパフォーマンス

```typescript
export const PERFORMANCE_GUIDELINES = {
  // 60fps = 16.67ms/frame
  targetFPS: 60,
  maxFrameTime: 16,

  // ネイティブドライバーを使用
  useNativeDriver: true,

  // 最適化するプロパティ
  optimizedProps: [
    'transform',
    'opacity',
    // 以下は避ける（レイアウト再計算が発生）
    // 'width', 'height', 'margin', 'padding'
  ],

  // 重い操作は避ける
  avoid: [
    'box-shadow (大量)',
    'blur (大きい半径)',
    'transform with perspective',
  ],
};
```

### 10.2 画像最適化

```typescript
export const IMAGE_OPTIMIZATION = {
  // フォーマット
  format: {
    photo: 'webp',        // 写真: WebP
    icon: 'svg',          // アイコン: SVG
    animation: 'lottie',  // アニメーション: Lottie
  },

  // サイズ
  sizes: {
    thumbnail: { width: 150, height: 150 },
    small: { width: 300, height: 300 },
    medium: { width: 600, height: 600 },
    large: { width: 1200, height: 1200 },
  },

  // 遅延読み込み
  lazyLoad: true,

  // プレースホルダー
  placeholder: 'blur' | 'shimmer',
};
```

---

## 11. デザインシステムテンプレート

### 11.1 コンポーネントチェックリスト

```typescript
export const COMPONENT_CHECKLIST = {
  required: [
    '□ 全状態をカバー（default, hover, pressed, focused, disabled, loading）',
    '□ アクセシビリティ属性設定',
    '□ タッチターゲット最小サイズ確保',
    '□ ダークモード対応',
    '□ Reduced Motion対応',
    '□ RTL（右から左）言語対応',
  ],

  recommended: [
    '□ バリエーション（サイズ、色、スタイル）',
    '□ アイコン対応',
    '□ ローディング状態',
    '□ エラー状態',
    '□ アニメーション/トランジション',
    '□ TypeScript型定義',
    '□ Storybook/ドキュメント',
  ],
};
```

### 11.2 デザインレビューチェックリスト

```typescript
export const DESIGN_REVIEW_CHECKLIST = {
  // 視覚
  visual: [
    '□ 視覚的階層が明確',
    '□ 一貫したスペーシング',
    '□ 適切なコントラスト',
    '□ ブランドガイドライン準拠',
  ],

  // インタラクション
  interaction: [
    '□ フィードバックが即座',
    '□ 状態変化が明確',
    '□ エラー回復が可能',
    '□ 元に戻す操作がある',
  ],

  // アクセシビリティ
  accessibility: [
    '□ スクリーンリーダーテスト済み',
    '□ キーボード操作可能',
    '□ 色覚異常対応',
    '□ 動体視力配慮',
  ],

  // パフォーマンス
  performance: [
    '□ 60fps維持',
    '□ 初回レンダリング高速',
    '□ メモリリークなし',
    '□ バッテリー消費配慮',
  ],
};
```

---

## 12. リソースとツール

### 12.1 推奨ツール

| カテゴリ | ツール | 用途 |
|---------|--------|------|
| デザイン | Figma | UIデザイン、プロトタイプ |
| カラー | Coolors, Paletton | パレット生成 |
| コントラスト | WebAIM Contrast Checker | WCAG準拠確認 |
| タイポグラフィ | Fontjoy, FontPair | フォントペアリング |
| アイコン | Phosphor Icons, Lucide | アイコンセット |
| アニメーション | Lottie, Rive | マイクロアニメーション |
| テスト | Storybook, Chromatic | コンポーネントテスト |

### 12.2 参考リンク

- [Apple Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/)
- [Material Design 3](https://m3.material.io/)
- [WCAG 2.2](https://www.w3.org/TR/WCAG22/)
- [React Native Accessibility](https://reactnative.dev/docs/accessibility)
- [Anthropic Frontend Design](https://claude.com/blog/improving-frontend-design-through-skills)

---

## 使用方法

このスキルを参照してUI/UXを設計する際:

```
このスキル（ui-ux-mastery）を参照して、
[コンポーネント名/画面名]を設計してください。

要件:
- [具体的な要件]

確認事項:
1. アクセシビリティチェックリストを満たしているか
2. タッチターゲットサイズは適切か
3. コントラスト比は十分か
4. アニメーションは目的を持っているか
5. ダークモード対応しているか
```
