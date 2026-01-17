# モーション＆アニメーション仕様

React Native / Expo向け マイクロインタラクション＆トランジション設計

---

## 1. モーション設計原則

### 1.1 アニメーションの目的

```typescript
// アニメーションは装飾ではなく、機能的役割を持つ
export const ANIMATION_PURPOSE = {
  // 1. フィードバック: ユーザーアクションの確認
  feedback: '押した、選択した、完了した',

  // 2. 状態変化: 現在の状態を伝える
  stateChange: 'ローディング中、成功、エラー',

  // 3. 注目誘導: 重要な情報に目を向けさせる
  attention: '新しい通知、重要なメッセージ',

  // 4. 空間理解: UIの構造を理解させる
  spatialOrientation: '画面遷移、要素の出入り',

  // 5. 待機緩和: 待ち時間を短く感じさせる
  perceivedPerformance: 'スケルトン、プログレス',
};
```

### 1.2 マイクロインタラクションの4要素

```typescript
// Dan Saffer's Microinteractions Model
export const MICRO_INTERACTION_ANATOMY = {
  // 1. トリガー: 何がインタラクションを開始するか
  trigger: {
    userInitiated: 'タップ、スワイプ、ロングプレス',
    systemInitiated: '通知、時間経過、データ更新',
  },

  // 2. ルール: 何が起こるかを決める
  rules: {
    conditions: '状態チェック、バリデーション',
    actions: '実行する処理',
  },

  // 3. フィードバック: ユーザーに何が起きたか伝える
  feedback: {
    visual: '色変化、スケール、位置移動',
    haptic: '振動パターン',
    audio: 'サウンドエフェクト',
  },

  // 4. ループとモード: 繰り返しや状態変化
  loopsAndModes: {
    loop: '連続アニメーション（ローディング）',
    mode: '状態切り替え（トグル）',
  },
};
```

---

## 2. タイミング定数

### 2.1 デュレーション

```typescript
// src/constants/animation.ts
export const DURATION = {
  // 即座（100ms以下）
  instant: 50,      // ホバー、リップル開始
  micro: 100,       // 小さなフィードバック

  // 高速（100-200ms）
  fast: 150,        // ボタンプレス、トグル
  quick: 200,       // ドロップダウン開閉

  // 標準（200-400ms）
  normal: 300,      // ページ遷移、モーダル
  moderate: 400,    // 複雑なトランジション

  // ゆっくり（400ms以上）
  slow: 500,        // 強調アニメーション
  emphasis: 700,    // 注目を集める
  dramatic: 1000,   // 特別なシーン
} as const;

// ガイドライン
// - フィードバック: 100-200ms
// - 遷移: 200-400ms
// - 強調: 400-700ms
```

### 2.2 イージング関数

```typescript
import { Easing } from 'react-native-reanimated';

export const EASING = {
  // 標準（加速→減速）: 最も自然
  // 使用: 一般的な移動、スケール
  standard: Easing.bezier(0.4, 0.0, 0.2, 1),

  // 減速のみ: 画面に入ってくる要素
  // 使用: 画面外から現れる、フェードイン
  decelerate: Easing.bezier(0.0, 0.0, 0.2, 1),

  // 加速のみ: 画面から出ていく要素
  // 使用: 画面外へ消える、フェードアウト
  accelerate: Easing.bezier(0.4, 0.0, 1, 1),

  // 強調: バウンス効果
  // 使用: 成功フィードバック、注目要素
  emphasize: Easing.bezier(0.175, 0.885, 0.32, 1.275),

  // リニア: 連続的な変化
  // 使用: プログレスバー、カラー遷移
  linear: Easing.linear,
} as const;

// CSS互換
export const EASING_CSS = {
  standard: 'cubic-bezier(0.4, 0.0, 0.2, 1)',
  decelerate: 'cubic-bezier(0.0, 0.0, 0.2, 1)',
  accelerate: 'cubic-bezier(0.4, 0.0, 1, 1)',
  emphasize: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
};
```

### 2.3 スプリング設定

```typescript
// React Native Reanimated スプリング
export const SPRING = {
  // デフォルト: バランスの取れた動き
  default: {
    damping: 15,
    stiffness: 150,
    mass: 1,
  },

  // 弾力: バウンス感
  bouncy: {
    damping: 10,
    stiffness: 100,
    mass: 1,
  },

  // 硬め: すばやく止まる
  stiff: {
    damping: 20,
    stiffness: 300,
    mass: 1,
  },

  // 柔らかめ: ゆったり動く
  gentle: {
    damping: 15,
    stiffness: 100,
    mass: 1,
  },

  // スナップ: 即座に目標へ
  snap: {
    damping: 25,
    stiffness: 400,
    mass: 1,
  },
} as const;
```

---

## 3. マイクロインタラクション実装

### 3.1 ボタンプレス

```typescript
// src/components/ui/AnimatedButton.tsx
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

interface AnimatedButtonProps {
  onPress: () => void;
  children: React.ReactNode;
  haptic?: boolean;
}

export const AnimatedButton = ({
  onPress,
  children,
  haptic = true,
}: AnimatedButtonProps) => {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.96, SPRING.stiff);
    opacity.value = withTiming(0.8, { duration: DURATION.micro });

    if (haptic) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, SPRING.default);
    opacity.value = withTiming(1, { duration: DURATION.fast });
  };

  const handlePress = () => {
    if (haptic) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    onPress();
  };

  return (
    <Pressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
    >
      <Animated.View style={animatedStyle}>
        {children}
      </Animated.View>
    </Pressable>
  );
};
```

### 3.2 いいねボタン

```typescript
// src/components/ui/LikeButton.tsx
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withSpring,
  withTiming,
  interpolateColor,
} from 'react-native-reanimated';

export const LikeButton = ({ liked, onToggle }) => {
  const scale = useSharedValue(1);
  const colorProgress = useSharedValue(liked ? 1 : 0);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const iconStyle = useAnimatedStyle(() => ({
    color: interpolateColor(
      colorProgress.value,
      [0, 1],
      ['#737373', '#ef4444']
    ),
  }));

  const handlePress = () => {
    // スケールアニメーション
    scale.value = withSequence(
      withSpring(1.3, SPRING.bouncy),
      withSpring(1, SPRING.default)
    );

    // 色変化
    colorProgress.value = withTiming(liked ? 0 : 1, {
      duration: DURATION.fast,
    });

    // 触覚フィードバック
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    onToggle();
  };

  return (
    <Pressable onPress={handlePress}>
      <Animated.View style={animatedStyle}>
        <Animated.Text style={iconStyle}>
          {liked ? '❤️' : '🤍'}
        </Animated.Text>
      </Animated.View>
    </Pressable>
  );
};
```

### 3.3 スイッチトグル

```typescript
// src/components/ui/AnimatedSwitch.tsx
export const AnimatedSwitch = ({ value, onToggle }) => {
  const translateX = useSharedValue(value ? 20 : 0);
  const backgroundColor = useSharedValue(value ? 1 : 0);

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const trackStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      backgroundColor.value,
      [0, 1],
      ['#d4d4d4', '#147878']
    ),
  }));

  const handleToggle = () => {
    translateX.value = withSpring(value ? 0 : 20, SPRING.stiff);
    backgroundColor.value = withTiming(value ? 0 : 1, {
      duration: DURATION.fast,
    });

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onToggle(!value);
  };

  return (
    <Pressable onPress={handleToggle}>
      <Animated.View style={[styles.track, trackStyle]}>
        <Animated.View style={[styles.thumb, thumbStyle]} />
      </Animated.View>
    </Pressable>
  );
};
```

### 3.4 プルトゥリフレッシュ

```typescript
// src/components/ui/PullToRefresh.tsx
export const PullToRefresh = ({ onRefresh, children }) => {
  const pullDistance = useSharedValue(0);
  const isRefreshing = useSharedValue(false);

  const indicatorStyle = useAnimatedStyle(() => {
    const rotation = interpolate(
      pullDistance.value,
      [0, 80],
      [0, 360]
    );

    return {
      opacity: interpolate(pullDistance.value, [0, 40, 80], [0, 0.5, 1]),
      transform: [
        { translateY: Math.min(pullDistance.value, 80) },
        { rotate: `${rotation}deg` },
      ],
    };
  });

  const handleRefresh = async () => {
    isRefreshing.value = true;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    await onRefresh();

    isRefreshing.value = false;
    pullDistance.value = withSpring(0, SPRING.default);
  };

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View>
        <Animated.View style={indicatorStyle}>
          <RefreshIndicator />
        </Animated.View>
        {children}
      </Animated.View>
    </GestureDetector>
  );
};
```

---

## 4. 画面遷移アニメーション

### 4.1 基本遷移パターン

```typescript
// src/navigation/transitions.ts
import { TransitionPresets } from '@react-navigation/stack';

export const SCREEN_TRANSITIONS = {
  // スライド（横から）: 階層移動
  slideFromRight: {
    ...TransitionPresets.SlideFromRightIOS,
    transitionSpec: {
      open: {
        animation: 'timing',
        config: { duration: DURATION.normal, easing: EASING.decelerate },
      },
      close: {
        animation: 'timing',
        config: { duration: DURATION.normal, easing: EASING.accelerate },
      },
    },
  },

  // ボトムシート（下から）: モーダル、設定
  slideFromBottom: {
    ...TransitionPresets.ModalSlideFromBottomIOS,
  },

  // フェード: タブ切り替え、軽量な遷移
  fade: {
    ...TransitionPresets.FadeFromBottomAndroid,
    transitionSpec: {
      open: {
        animation: 'timing',
        config: { duration: DURATION.fast },
      },
      close: {
        animation: 'timing',
        config: { duration: DURATION.fast },
      },
    },
  },

  // 共有要素遷移: 詳細画面への移動
  sharedElement: {
    // React Navigation Shared Element参照
  },
};
```

### 4.2 カスタム遷移アニメーション

```typescript
// src/navigation/customTransitions.ts
export const customFadeTransition = {
  cardStyleInterpolator: ({ current, layouts }) => ({
    cardStyle: {
      opacity: current.progress,
      transform: [
        {
          scale: current.progress.interpolate({
            inputRange: [0, 1],
            outputRange: [0.95, 1],
          }),
        },
      ],
    },
  }),
};

export const customSlideTransition = {
  cardStyleInterpolator: ({ current, next, layouts }) => ({
    cardStyle: {
      transform: [
        {
          translateX: current.progress.interpolate({
            inputRange: [0, 1],
            outputRange: [layouts.screen.width, 0],
          }),
        },
      ],
    },
    overlayStyle: {
      opacity: current.progress.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 0.5],
      }),
    },
  }),
};
```

### 4.3 共有要素トランジション

```typescript
// src/screens/ListScreen.tsx
import { SharedElement } from 'react-navigation-shared-element';

const ListItem = ({ item, onPress }) => (
  <Pressable onPress={() => onPress(item)}>
    <SharedElement id={`item.${item.id}.photo`}>
      <Image source={item.photo} style={styles.thumbnail} />
    </SharedElement>
    <Text>{item.title}</Text>
  </Pressable>
);

// src/screens/DetailScreen.tsx
const DetailScreen = ({ route }) => {
  const { item } = route.params;

  return (
    <View>
      <SharedElement id={`item.${item.id}.photo`}>
        <Image source={item.photo} style={styles.heroImage} />
      </SharedElement>
      <Text>{item.description}</Text>
    </View>
  );
};

// ナビゲーション設定
DetailScreen.sharedElements = (route) => {
  const { item } = route.params;
  return [`item.${item.id}.photo`];
};
```

---

## 5. ローディングとフィードバック

### 5.1 スケルトンローダー

```typescript
// src/components/ui/Skeleton.tsx
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  interpolate,
} from 'react-native-reanimated';

export const Skeleton = ({ width, height, borderRadius = 4 }) => {
  const shimmer = useSharedValue(0);

  useEffect(() => {
    shimmer.value = withRepeat(
      withTiming(1, { duration: 1500 }),
      -1, // 無限繰り返し
      false
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    backgroundColor: '#e5e5e5',
    width,
    height,
    borderRadius,
    overflow: 'hidden',
  }));

  const shimmerStyle = useAnimatedStyle(() => ({
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#f5f5f5',
    opacity: interpolate(shimmer.value, [0, 0.5, 1], [0, 1, 0]),
    transform: [
      {
        translateX: interpolate(
          shimmer.value,
          [0, 1],
          [-width, width]
        ),
      },
    ],
  }));

  return (
    <Animated.View style={animatedStyle}>
      <Animated.View style={shimmerStyle} />
    </Animated.View>
  );
};

// 使用例
<Skeleton width={200} height={20} />
<Skeleton width="100%" height={100} borderRadius={8} />
```

### 5.2 成功/エラーフィードバック

```typescript
// src/components/feedback/SuccessAnimation.tsx
import LottieView from 'lottie-react-native';

export const SuccessAnimation = ({ onComplete }) => {
  const animationRef = useRef<LottieView>(null);

  useEffect(() => {
    animationRef.current?.play();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, []);

  return (
    <LottieView
      ref={animationRef}
      source={require('@/assets/animations/success.json')}
      style={styles.animation}
      loop={false}
      onAnimationFinish={onComplete}
    />
  );
};

// カスタム実装（Lottieなし）
export const SuccessCheckmark = () => {
  const scale = useSharedValue(0);
  const strokeProgress = useSharedValue(0);

  useEffect(() => {
    scale.value = withSpring(1, SPRING.bouncy);
    strokeProgress.value = withTiming(1, {
      duration: DURATION.normal,
      easing: EASING.decelerate,
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, []);

  return (
    <Animated.View style={useAnimatedStyle(() => ({
      transform: [{ scale: scale.value }],
    }))}>
      <Svg width={64} height={64}>
        <AnimatedCircle
          cx={32}
          cy={32}
          r={30}
          stroke="#22c55e"
          strokeWidth={2}
          fill="none"
        />
        <AnimatedPath
          d="M20 32 L28 40 L44 24"
          stroke="#22c55e"
          strokeWidth={3}
          fill="none"
          strokeDasharray={40}
          strokeDashoffset={useAnimatedStyle(() => ({
            strokeDashoffset: (1 - strokeProgress.value) * 40,
          }))}
        />
      </Svg>
    </Animated.View>
  );
};
```

### 5.3 プログレスインジケーター

```typescript
// src/components/ui/ProgressBar.tsx
export const AnimatedProgressBar = ({ progress, color = '#147878' }) => {
  const width = useSharedValue(0);

  useEffect(() => {
    width.value = withTiming(progress, {
      duration: DURATION.normal,
      easing: EASING.standard,
    });
  }, [progress]);

  const progressStyle = useAnimatedStyle(() => ({
    width: `${width.value * 100}%`,
    backgroundColor: color,
    height: '100%',
    borderRadius: 4,
  }));

  return (
    <View style={styles.track}>
      <Animated.View style={progressStyle} />
    </View>
  );
};

// 円形プログレス
export const CircularProgress = ({ progress, size = 64, strokeWidth = 4 }) => {
  const animatedProgress = useSharedValue(0);
  const circumference = 2 * Math.PI * ((size - strokeWidth) / 2);

  useEffect(() => {
    animatedProgress.value = withTiming(progress, {
      duration: DURATION.normal,
    });
  }, [progress]);

  return (
    <Svg width={size} height={size}>
      {/* 背景円 */}
      <Circle
        cx={size / 2}
        cy={size / 2}
        r={(size - strokeWidth) / 2}
        stroke="#e5e5e5"
        strokeWidth={strokeWidth}
        fill="none"
      />
      {/* プログレス円 */}
      <AnimatedCircle
        cx={size / 2}
        cy={size / 2}
        r={(size - strokeWidth) / 2}
        stroke="#147878"
        strokeWidth={strokeWidth}
        fill="none"
        strokeDasharray={circumference}
        strokeDashoffset={useAnimatedStyle(() => ({
          strokeDashoffset: circumference * (1 - animatedProgress.value),
        }))}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
    </Svg>
  );
};
```

---

## 6. リストアニメーション

### 6.1 スタガードアニメーション

```typescript
// src/components/list/AnimatedList.tsx
export const AnimatedListItem = ({ index, children }) => {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(20);

  useEffect(() => {
    const delay = index * 50; // 50ms間隔

    opacity.value = withDelay(
      delay,
      withTiming(1, { duration: DURATION.normal })
    );
    translateY.value = withDelay(
      delay,
      withSpring(0, SPRING.default)
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View style={animatedStyle}>
      {children}
    </Animated.View>
  );
};

// 使用例
<FlatList
  data={items}
  renderItem={({ item, index }) => (
    <AnimatedListItem index={index}>
      <ListItem item={item} />
    </AnimatedListItem>
  )}
/>
```

### 6.2 スワイプアクション

```typescript
// src/components/list/SwipeableRow.tsx
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

export const SwipeableRow = ({ onDelete, children }) => {
  const translateX = useSharedValue(0);
  const deleteButtonWidth = 80;

  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      translateX.value = Math.max(-deleteButtonWidth, event.translationX);
    })
    .onEnd((event) => {
      if (event.translationX < -deleteButtonWidth / 2) {
        // スワイプ完了 → 削除ボタン表示
        translateX.value = withSpring(-deleteButtonWidth, SPRING.stiff);
      } else {
        // 戻す
        translateX.value = withSpring(0, SPRING.default);
      }
    });

  const rowStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const deleteStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      translateX.value,
      [-deleteButtonWidth, 0],
      [1, 0]
    ),
  }));

  return (
    <View>
      <Animated.View style={[styles.deleteButton, deleteStyle]}>
        <Pressable onPress={onDelete}>
          <Text>削除</Text>
        </Pressable>
      </Animated.View>
      <GestureDetector gesture={panGesture}>
        <Animated.View style={rowStyle}>
          {children}
        </Animated.View>
      </GestureDetector>
    </View>
  );
};
```

---

## 7. 触覚フィードバック（Haptics）

### 7.1 ハプティクスパターン

```typescript
// src/utils/haptics.ts
import * as Haptics from 'expo-haptics';

export const HAPTIC_PATTERNS = {
  // インパクト（物理的接触感）
  impact: {
    light: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
    medium: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium),
    heavy: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy),
  },

  // 通知（結果のフィードバック）
  notification: {
    success: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
    warning: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning),
    error: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error),
  },

  // 選択（UIの選択）
  selection: () => Haptics.selectionAsync(),
};

// 使用シーン
export const HAPTIC_USE_CASES = {
  // ボタンタップ
  buttonPress: HAPTIC_PATTERNS.impact.light,

  // スイッチトグル
  toggle: HAPTIC_PATTERNS.impact.medium,

  // 削除アクション
  delete: HAPTIC_PATTERNS.notification.warning,

  // フォーム送信成功
  submitSuccess: HAPTIC_PATTERNS.notification.success,

  // バリデーションエラー
  validationError: HAPTIC_PATTERNS.notification.error,

  // リスト項目選択
  listSelection: HAPTIC_PATTERNS.selection,

  // プルトゥリフレッシュ開始
  pullToRefresh: HAPTIC_PATTERNS.impact.heavy,

  // スライダー値変更
  sliderChange: HAPTIC_PATTERNS.impact.light,
};
```

### 7.2 ハプティクスフック

```typescript
// src/hooks/useHaptics.ts
import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

export function useHaptics() {
  // Androidでは一部のハプティクスが利用不可
  const isAvailable = Platform.OS === 'ios';

  const impact = (style: Haptics.ImpactFeedbackStyle = Haptics.ImpactFeedbackStyle.Medium) => {
    if (isAvailable) {
      Haptics.impactAsync(style);
    }
  };

  const notification = (type: Haptics.NotificationFeedbackType) => {
    if (isAvailable) {
      Haptics.notificationAsync(type);
    }
  };

  const selection = () => {
    Haptics.selectionAsync(); // 両プラットフォームで利用可
  };

  return { impact, notification, selection, isAvailable };
}
```

---

## 8. Reduced Motion対応

### 8.1 アクセシビリティ設定の検出

```typescript
// src/hooks/useReducedMotion.ts
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
```

### 8.2 条件付きアニメーション

```typescript
// src/utils/animation.ts
export function getAnimationConfig(reduceMotion: boolean) {
  if (reduceMotion) {
    return {
      duration: 0,
      spring: { damping: 100, stiffness: 1000 }, // 即座に
    };
  }

  return {
    duration: DURATION.normal,
    spring: SPRING.default,
  };
}

// 使用例
const AnimatedComponent = () => {
  const reduceMotion = useReducedMotion();
  const config = getAnimationConfig(reduceMotion);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: withTiming(1, { duration: config.duration }),
    transform: [
      {
        translateY: reduceMotion
          ? 0
          : withSpring(0, config.spring),
      },
    ],
  }));

  return <Animated.View style={animatedStyle} />;
};
```

### 8.3 代替パターン

```typescript
export const REDUCED_MOTION_ALTERNATIVES = {
  // スライド → フェードのみ
  slide: {
    normal: { translateX: withSpring(0), opacity: withTiming(1) },
    reduced: { opacity: withTiming(1) },
  },

  // バウンス → 即座
  bounce: {
    normal: withSpring(1, SPRING.bouncy),
    reduced: withTiming(1, { duration: 0 }),
  },

  // ローテーション → 静止
  rotate: {
    normal: withRepeat(withTiming(360), -1),
    reduced: 0, // 静止した代替インジケーター
  },

  // パララックス → 固定
  parallax: {
    normal: scrollOffset.value * 0.5,
    reduced: 0,
  },
};
```

---

## 9. パフォーマンス最適化

### 9.1 ネイティブドライバー

```typescript
// ✅ ネイティブドライバー使用（推奨）
// transform, opacity のみ
const animatedStyle = useAnimatedStyle(() => ({
  transform: [
    { translateX: translateX.value },
    { scale: scale.value },
    { rotate: `${rotate.value}deg` },
  ],
  opacity: opacity.value,
}));

// ❌ JSスレッドでの計算（避ける）
// width, height, margin, padding, borderRadius
const avoidStyle = useAnimatedStyle(() => ({
  width: width.value,      // パフォーマンス低下
  marginTop: margin.value, // パフォーマンス低下
}));
```

### 9.2 メモ化

```typescript
// アニメーションスタイルをメモ化
const animatedStyle = useAnimatedStyle(() => ({
  transform: [{ scale: scale.value }],
}), [scale]); // 依存配列を明示

// コールバックをメモ化
const handlePressIn = useCallback(() => {
  scale.value = withSpring(0.95, SPRING.stiff);
}, []);
```

### 9.3 workletの活用

```typescript
// UIスレッドで実行（高パフォーマンス）
const handleGesture = useAnimatedGestureHandler({
  onStart: (_, ctx) => {
    'worklet';
    ctx.startX = translateX.value;
  },
  onActive: (event, ctx) => {
    'worklet';
    translateX.value = ctx.startX + event.translationX;
  },
  onEnd: () => {
    'worklet';
    translateX.value = withSpring(0);
  },
});
```

---

## 10. チェックリスト

```markdown
## モーション設計チェックリスト

### 目的
- [ ] アニメーションに明確な目的がある
- [ ] 装飾ではなく機能的フィードバック
- [ ] ユーザーの理解を助ける

### タイミング
- [ ] フィードバック: 100-200ms
- [ ] 遷移: 200-400ms
- [ ] 適切なイージング関数

### アクセシビリティ
- [ ] Reduced Motion対応
- [ ] 代替パターン提供
- [ ] 触覚フィードバック併用

### パフォーマンス
- [ ] 60fps維持
- [ ] ネイティブドライバー使用
- [ ] メモ化適用

### 一貫性
- [ ] 同じアクションには同じアニメーション
- [ ] デザインシステムに準拠
- [ ] プラットフォーム慣習を尊重
```
