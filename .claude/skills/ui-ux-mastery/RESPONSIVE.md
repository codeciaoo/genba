# レスポンシブデザインガイド

モバイルファースト + アダプティブUI戦略

---

## 1. ブレークポイントシステム

### 1.1 デバイスカテゴリ

```typescript
// src/constants/breakpoints.ts
export const BREAKPOINTS = {
  // スマートフォン
  xs: 0,        // iPhone SE (375px)
  sm: 390,      // iPhone 14/15 (390px)
  md: 428,      // iPhone 14 Pro Max (430px)

  // タブレット
  lg: 744,      // iPad mini (744px)
  xl: 1024,     // iPad Pro 11" (1024px)

  // デスクトップ（Web対応時）
  '2xl': 1280,  // 小型デスクトップ
  '3xl': 1536,  // 大型デスクトップ
} as const;

// 一般的なデバイス幅
export const DEVICE_WIDTHS = {
  // iPhone
  'iPhone SE': 375,
  'iPhone 14': 390,
  'iPhone 14 Plus': 428,
  'iPhone 14 Pro Max': 430,

  // Android
  'Pixel 7': 412,
  'Pixel 7 Pro': 412,
  'Galaxy S23': 360,
  'Galaxy S23 Ultra': 384,

  // iPad
  'iPad mini': 744,
  'iPad Air': 820,
  'iPad Pro 11"': 834,
  'iPad Pro 12.9"': 1024,
} as const;
```

### 1.2 レスポンシブフック

```typescript
// src/hooks/useResponsive.ts
import { useWindowDimensions } from 'react-native';
import { BREAKPOINTS } from '@/constants/breakpoints';

export interface ResponsiveInfo {
  width: number;
  height: number;
  // 画面サイズカテゴリ
  isXs: boolean;      // < 390px
  isSm: boolean;      // 390-427px
  isMd: boolean;      // 428-743px
  isLg: boolean;      // 744-1023px
  isXl: boolean;      // >= 1024px
  // デバイスタイプ
  isPhone: boolean;   // < 744px
  isTablet: boolean;  // >= 744px
  isLargeTablet: boolean; // >= 1024px
  // 向き
  isPortrait: boolean;
  isLandscape: boolean;
}

export function useResponsive(): ResponsiveInfo {
  const { width, height } = useWindowDimensions();

  return {
    width,
    height,
    // サイズカテゴリ
    isXs: width < BREAKPOINTS.sm,
    isSm: width >= BREAKPOINTS.sm && width < BREAKPOINTS.md,
    isMd: width >= BREAKPOINTS.md && width < BREAKPOINTS.lg,
    isLg: width >= BREAKPOINTS.lg && width < BREAKPOINTS.xl,
    isXl: width >= BREAKPOINTS.xl,
    // デバイスタイプ
    isPhone: width < BREAKPOINTS.lg,
    isTablet: width >= BREAKPOINTS.lg,
    isLargeTablet: width >= BREAKPOINTS.xl,
    // 向き
    isPortrait: height > width,
    isLandscape: width > height,
  };
}

// 使用例
const MyComponent = () => {
  const { isPhone, isTablet, isPortrait } = useResponsive();

  if (isTablet && !isPortrait) {
    return <TwoColumnLayout />;
  }
  return <SingleColumnLayout />;
};
```

### 1.3 レスポンシブ値ヘルパー

```typescript
// src/utils/responsive.ts
import { Dimensions } from 'react-native';
import { BREAKPOINTS } from '@/constants/breakpoints';

type ResponsiveValue<T> = {
  xs?: T;
  sm?: T;
  md?: T;
  lg?: T;
  xl?: T;
  default: T;
};

/**
 * 画面幅に応じた値を返す
 */
export function responsive<T>(values: ResponsiveValue<T>): T {
  const { width } = Dimensions.get('window');

  if (width >= BREAKPOINTS.xl && values.xl !== undefined) return values.xl;
  if (width >= BREAKPOINTS.lg && values.lg !== undefined) return values.lg;
  if (width >= BREAKPOINTS.md && values.md !== undefined) return values.md;
  if (width >= BREAKPOINTS.sm && values.sm !== undefined) return values.sm;
  if (values.xs !== undefined) return values.xs;

  return values.default;
}

// 使用例
const fontSize = responsive({
  default: 16,
  lg: 18,
  xl: 20,
});

const columns = responsive({
  default: 1,
  lg: 2,
  xl: 3,
});
```

---

## 2. レイアウトパターン

### 2.1 単一カラム（モバイル標準）

```typescript
// スマートフォン向け: フルワイドの縦スクロール
const SingleColumnLayout = ({ children }) => (
  <ScrollView
    style={styles.container}
    contentContainerStyle={styles.content}
  >
    {children}
  </ScrollView>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    gap: 16,
  },
});
```

### 2.2 グリッドレイアウト

```typescript
// src/components/layout/ResponsiveGrid.tsx
interface ResponsiveGridProps {
  children: React.ReactNode;
  minItemWidth?: number;  // アイテムの最小幅
  gap?: number;
}

export const ResponsiveGrid = ({
  children,
  minItemWidth = 160,
  gap = 16,
}: ResponsiveGridProps) => {
  const { width } = useResponsive();

  // 利用可能な幅からカラム数を計算
  const availableWidth = width - 32; // padding考慮
  const columns = Math.max(1, Math.floor(availableWidth / (minItemWidth + gap)));

  return (
    <View style={[styles.grid, { gap }]}>
      {React.Children.map(children, (child, index) => (
        <View
          style={{
            width: (availableWidth - gap * (columns - 1)) / columns,
          }}
        >
          {child}
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
});
```

### 2.3 マスター/ディテール（タブレット）

```typescript
// src/components/layout/MasterDetail.tsx
interface MasterDetailProps {
  master: React.ReactNode;
  detail: React.ReactNode;
  masterWidth?: number | string;
}

export const MasterDetail = ({
  master,
  detail,
  masterWidth = '35%',
}: MasterDetailProps) => {
  const { isTablet, isPortrait } = useResponsive();

  // タブレット横向き: 分割表示
  if (isTablet && !isPortrait) {
    return (
      <View style={styles.splitContainer}>
        <View style={[styles.master, { width: masterWidth }]}>
          {master}
        </View>
        <View style={styles.detail}>
          {detail}
        </View>
      </View>
    );
  }

  // その他: スタック表示（ナビゲーションで切り替え）
  return <>{master}</>;
};

const styles = StyleSheet.create({
  splitContainer: {
    flex: 1,
    flexDirection: 'row',
  },
  master: {
    borderRightWidth: 1,
    borderRightColor: '#e5e5e5',
  },
  detail: {
    flex: 1,
  },
});
```

### 2.4 サイドバー + コンテンツ

```typescript
// src/components/layout/SidebarLayout.tsx
export const SidebarLayout = ({ sidebar, content }) => {
  const { isLargeTablet, isLandscape } = useResponsive();

  // 大型タブレット横向き: サイドバー常時表示
  if (isLargeTablet && isLandscape) {
    return (
      <View style={styles.container}>
        <View style={styles.sidebar}>
          {sidebar}
        </View>
        <View style={styles.content}>
          {content}
        </View>
      </View>
    );
  }

  // その他: ドロワーナビゲーション
  return (
    <DrawerLayout
      drawerContent={sidebar}
      drawerWidth={280}
    >
      {content}
    </DrawerLayout>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
  },
  sidebar: {
    width: 280,
    borderRightWidth: 1,
    borderRightColor: '#e5e5e5',
  },
  content: {
    flex: 1,
  },
});
```

---

## 3. レスポンシブタイポグラフィ

### 3.1 スケーリングシステム

```typescript
// src/constants/typography.ts
import { responsive } from '@/utils/responsive';

export const getTypography = () => ({
  // 本文
  body: {
    small: responsive({ default: 13, lg: 14, xl: 15 }),
    medium: responsive({ default: 15, lg: 16, xl: 17 }),
    large: responsive({ default: 17, lg: 18, xl: 19 }),
  },

  // 見出し
  heading: {
    h4: responsive({ default: 18, lg: 20, xl: 22 }),
    h3: responsive({ default: 22, lg: 24, xl: 28 }),
    h2: responsive({ default: 26, lg: 30, xl: 34 }),
    h1: responsive({ default: 32, lg: 38, xl: 44 }),
  },

  // 行間
  lineHeight: {
    tight: 1.25,
    normal: 1.5,
    relaxed: 1.75,
  },
});

// 使用例
const Typography = getTypography();

const styles = StyleSheet.create({
  title: {
    fontSize: Typography.heading.h1,
    lineHeight: Typography.heading.h1 * Typography.lineHeight.tight,
  },
  body: {
    fontSize: Typography.body.medium,
    lineHeight: Typography.body.medium * Typography.lineHeight.normal,
  },
});
```

### 3.2 Dynamic Type対応（iOS）

```typescript
// iOS Dynamic Type対応
import { Text, TextProps } from 'react-native';

interface ScalableTextProps extends TextProps {
  allowFontScaling?: boolean;
  maxFontSizeMultiplier?: number;
}

export const ScalableText = ({
  allowFontScaling = true,
  maxFontSizeMultiplier = 1.5, // 最大150%まで
  ...props
}: ScalableTextProps) => (
  <Text
    allowFontScaling={allowFontScaling}
    maxFontSizeMultiplier={maxFontSizeMultiplier}
    {...props}
  />
);

// 重要なUI要素は制限を緩める
<ScalableText maxFontSizeMultiplier={2.0}>
  重要なテキスト
</ScalableText>

// 固定サイズが必要な場合（まれ）
<ScalableText allowFontScaling={false}>
  固定サイズテキスト
</ScalableText>
```

---

## 4. レスポンシブスペーシング

### 4.1 スケーリングスペーシング

```typescript
// src/constants/spacing.ts
import { responsive } from '@/utils/responsive';

export const getSpacing = () => ({
  0: 0,
  1: responsive({ default: 4, xl: 6 }),
  2: responsive({ default: 8, xl: 10 }),
  3: responsive({ default: 12, xl: 14 }),
  4: responsive({ default: 16, xl: 20 }),
  5: responsive({ default: 20, xl: 24 }),
  6: responsive({ default: 24, xl: 32 }),
  8: responsive({ default: 32, xl: 40 }),
  10: responsive({ default: 40, xl: 48 }),
  12: responsive({ default: 48, xl: 64 }),
});

// コンテナパディング
export const getContainerPadding = () => responsive({
  default: 16,
  lg: 24,
  xl: 32,
});

// セーフエリア対応
export const getSafeAreaPadding = () => ({
  horizontal: getContainerPadding(),
  top: responsive({ default: 16, lg: 24 }),
  bottom: responsive({ default: 16, lg: 24 }),
});
```

### 4.2 コンテナ幅制限

```typescript
// src/components/layout/Container.tsx
interface ContainerProps {
  children: React.ReactNode;
  maxWidth?: number;
  centered?: boolean;
}

export const Container = ({
  children,
  maxWidth = 1200,
  centered = true,
}: ContainerProps) => {
  const { width } = useResponsive();
  const padding = getContainerPadding();

  const containerWidth = Math.min(width - padding * 2, maxWidth);

  return (
    <View
      style={[
        styles.container,
        {
          width: containerWidth,
          paddingHorizontal: padding,
          alignSelf: centered ? 'center' : 'flex-start',
        },
      ]}
    >
      {children}
    </View>
  );
};

// タブレット以上で中央寄せ、最大幅制限
```

---

## 5. レスポンシブナビゲーション

### 5.1 アダプティブナビゲーション

```typescript
// src/navigation/AdaptiveNavigation.tsx
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createDrawerNavigator } from '@react-navigation/drawer';

const Tab = createBottomTabNavigator();
const Drawer = createDrawerNavigator();

export const AdaptiveNavigation = () => {
  const { isTablet, isLandscape } = useResponsive();

  // タブレット横向き: ドロワーナビゲーション
  if (isTablet && isLandscape) {
    return (
      <Drawer.Navigator
        screenOptions={{
          drawerType: 'permanent',
          drawerStyle: { width: 280 },
        }}
      >
        <Drawer.Screen name="Home" component={HomeScreen} />
        <Drawer.Screen name="Reports" component={ReportsScreen} />
        <Drawer.Screen name="Settings" component={SettingsScreen} />
      </Drawer.Navigator>
    );
  }

  // スマートフォン/タブレット縦向き: ボトムタブ
  return (
    <Tab.Navigator>
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Reports" component={ReportsScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
};
```

### 5.2 ナビゲーションレール（タブレット）

```typescript
// Material Design スタイルのナビゲーションレール
const NavigationRail = ({ items, activeIndex, onSelect }) => (
  <View style={styles.rail}>
    {items.map((item, index) => (
      <Pressable
        key={item.key}
        style={[
          styles.railItem,
          activeIndex === index && styles.railItemActive,
        ]}
        onPress={() => onSelect(index)}
        accessibilityRole="tab"
        accessibilityState={{ selected: activeIndex === index }}
      >
        <Icon name={item.icon} size={24} />
        <Text style={styles.railLabel}>{item.label}</Text>
      </Pressable>
    ))}
  </View>
);

const styles = StyleSheet.create({
  rail: {
    width: 72,
    paddingVertical: 8,
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: '#e5e5e5',
  },
  railItem: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    marginVertical: 4,
  },
  railItemActive: {
    backgroundColor: '#e8f5f5',
  },
  railLabel: {
    fontSize: 12,
    marginTop: 4,
  },
});
```

---

## 6. レスポンシブコンポーネント

### 6.1 レスポンシブカード

```typescript
// src/components/ui/ResponsiveCard.tsx
interface ResponsiveCardProps {
  children: React.ReactNode;
  horizontal?: boolean | 'auto';
}

export const ResponsiveCard = ({
  children,
  horizontal = 'auto',
}: ResponsiveCardProps) => {
  const { isTablet } = useResponsive();

  // 'auto': タブレットで横並び
  const isHorizontal = horizontal === 'auto'
    ? isTablet
    : horizontal;

  return (
    <View
      style={[
        styles.card,
        isHorizontal ? styles.horizontal : styles.vertical,
      ]}
    >
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  vertical: {
    flexDirection: 'column',
  },
  horizontal: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
```

### 6.2 レスポンシブモーダル

```typescript
// src/components/ui/ResponsiveModal.tsx
interface ResponsiveModalProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export const ResponsiveModal = ({
  visible,
  onClose,
  children,
}: ResponsiveModalProps) => {
  const { isTablet, width, height } = useResponsive();

  // タブレット: 中央にダイアログ
  // スマートフォン: ボトムシート
  const modalStyle = isTablet
    ? {
        width: Math.min(600, width * 0.8),
        maxHeight: height * 0.8,
        alignSelf: 'center',
        borderRadius: 16,
      }
    : {
        width: '100%',
        maxHeight: height * 0.9,
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        position: 'absolute',
        bottom: 0,
      };

  return (
    <Modal
      visible={visible}
      transparent
      animationType={isTablet ? 'fade' : 'slide'}
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <View style={[styles.modalContent, modalStyle]}>
          {children}
        </View>
      </Pressable>
    </Modal>
  );
};
```

### 6.3 レスポンシブリスト

```typescript
// src/components/ui/ResponsiveList.tsx
interface ResponsiveListProps<T> {
  data: T[];
  renderItem: (item: T) => React.ReactNode;
  numColumns?: number | 'auto';
}

export function ResponsiveList<T>({
  data,
  renderItem,
  numColumns = 'auto',
}: ResponsiveListProps<T>) {
  const { width, isTablet, isLargeTablet } = useResponsive();

  const columns = numColumns === 'auto'
    ? isLargeTablet ? 3 : isTablet ? 2 : 1
    : numColumns;

  if (columns === 1) {
    return (
      <FlatList
        data={data}
        renderItem={({ item }) => renderItem(item)}
        keyExtractor={(_, index) => index.toString()}
      />
    );
  }

  return (
    <FlatList
      data={data}
      renderItem={({ item }) => (
        <View style={{ width: (width - 48) / columns - 8 }}>
          {renderItem(item)}
        </View>
      )}
      numColumns={columns}
      columnWrapperStyle={{ gap: 16 }}
      contentContainerStyle={{ gap: 16 }}
      keyExtractor={(_, index) => index.toString()}
    />
  );
}
```

---

## 7. 画面向き対応

### 7.1 向き検出

```typescript
// src/hooks/useOrientation.ts
import { useWindowDimensions } from 'react-native';

export type Orientation = 'portrait' | 'landscape';

export function useOrientation(): Orientation {
  const { width, height } = useWindowDimensions();
  return height > width ? 'portrait' : 'landscape';
}

// 向きロック
import * as ScreenOrientation from 'expo-screen-orientation';

// 縦向きにロック
await ScreenOrientation.lockAsync(
  ScreenOrientation.OrientationLock.PORTRAIT_UP
);

// ロック解除
await ScreenOrientation.unlockAsync();
```

### 7.2 向き別レイアウト

```typescript
// src/components/layout/OrientationLayout.tsx
interface OrientationLayoutProps {
  portrait: React.ReactNode;
  landscape: React.ReactNode;
}

export const OrientationLayout = ({
  portrait,
  landscape,
}: OrientationLayoutProps) => {
  const orientation = useOrientation();

  return orientation === 'portrait' ? portrait : landscape;
};

// 使用例
<OrientationLayout
  portrait={<VerticalVideoPlayer />}
  landscape={<HorizontalVideoPlayer />}
/>
```

---

## 8. セーフエリア対応

### 8.1 セーフエリアコンテキスト

```typescript
// src/components/layout/SafeAreaLayout.tsx
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

interface SafeAreaLayoutProps {
  children: React.ReactNode;
  edges?: ('top' | 'bottom' | 'left' | 'right')[];
}

export const SafeAreaLayout = ({
  children,
  edges = ['top', 'bottom'],
}: SafeAreaLayoutProps) => {
  return (
    <SafeAreaView style={styles.container} edges={edges}>
      {children}
    </SafeAreaView>
  );
};

// カスタムパディング付き
export const useSafeAreaPadding = () => {
  const insets = useSafeAreaInsets();
  const basePadding = getContainerPadding();

  return {
    paddingTop: Math.max(insets.top, basePadding),
    paddingBottom: Math.max(insets.bottom, basePadding),
    paddingLeft: Math.max(insets.left, basePadding),
    paddingRight: Math.max(insets.right, basePadding),
  };
};
```

### 8.2 キーボード回避

```typescript
// src/components/layout/KeyboardAwareLayout.tsx
import { KeyboardAvoidingView, Platform } from 'react-native';

interface KeyboardAwareLayoutProps {
  children: React.ReactNode;
}

export const KeyboardAwareLayout = ({
  children,
}: KeyboardAwareLayoutProps) => {
  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      {children}
    </KeyboardAvoidingView>
  );
};
```

---

## 9. テストとデバッグ

### 9.1 レスポンシブデバッグオーバーレイ

```typescript
// src/components/debug/ResponsiveDebug.tsx
export const ResponsiveDebug = () => {
  const { width, height, isPhone, isTablet } = useResponsive();

  if (!__DEV__) return null;

  return (
    <View style={styles.debugOverlay}>
      <Text style={styles.debugText}>
        {width} x {height}
      </Text>
      <Text style={styles.debugText}>
        {isPhone ? 'Phone' : isTablet ? 'Tablet' : 'Desktop'}
      </Text>
    </View>
  );
};
```

### 9.2 ブレークポイントテスト

```typescript
// __tests__/responsive.test.ts
import { responsive } from '@/utils/responsive';

describe('Responsive Utils', () => {
  it('小画面で正しい値を返す', () => {
    jest.spyOn(Dimensions, 'get').mockReturnValue({ width: 375 });

    const result = responsive({
      default: 16,
      lg: 20,
    });

    expect(result).toBe(16);
  });

  it('タブレットで正しい値を返す', () => {
    jest.spyOn(Dimensions, 'get').mockReturnValue({ width: 800 });

    const result = responsive({
      default: 16,
      lg: 20,
    });

    expect(result).toBe(20);
  });
});
```

---

## 10. チェックリスト

```markdown
## レスポンシブ対応チェックリスト

### レイアウト
- [ ] モバイル（375-430px）で正しく表示
- [ ] タブレット縦向き（744-834px）で最適化
- [ ] タブレット横向き（1024px+）で分割表示
- [ ] 向き変更時にレイアウトが崩れない

### タイポグラフィ
- [ ] 全画面サイズで読みやすいフォントサイズ
- [ ] Dynamic Type対応（iOS）
- [ ] maxFontSizeMultiplier設定

### ナビゲーション
- [ ] スマートフォン: ボトムタブ
- [ ] タブレット: ドロワー/レール
- [ ] 全サイズでタッチターゲット確保

### コンポーネント
- [ ] カードが画面幅に応じて調整
- [ ] モーダルがデバイスに最適化
- [ ] リストが適切なカラム数

### セーフエリア
- [ ] ノッチ/ダイナミックアイランド対応
- [ ] ホームインジケーター対応
- [ ] キーボード表示時の調整
```
