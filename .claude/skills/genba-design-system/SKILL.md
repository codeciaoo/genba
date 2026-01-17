---
name: genba-design-system
description: 建設現場職人向けAIポケット事務員アプリ「GENBA GEAR」のデザインシステム。プロの電動工具（マキタ、HiKOKI）を想起させる堅牢で信頼感のあるUIを生成。LP、モバイルアプリ、帳票など全てのデザイン作業で使用。「現場」「職人」「工具」「道具」「日報」「ボイス入力」に関するUI作成時に適用。
---

# GENBA GEAR デザインシステム

## コンセプト: 「ITツール」ではなく「プロの道具」

職人が毎日使う電動工具のように、手に馴染み、信頼でき、現場で映えるデザイン。
**AIがあなたのポケット事務員に。喋るだけで日報完成！**

### ターゲット

- **個人プラン（無料）**: 個人事業主・一人親方
- **チームプラン（月額¥3,000）**: 中規模チーム（5-50人規模の工務店）

### デザイン原則

1. **堅牢感** - 白っぽいIT感を排除。工具のような重厚さ
2. **視認性** - 汚れた手、眩しい現場でも一目で分かる
3. **信頼性** - 「これなら使える」と思わせる完成物の提示
4. **簡潔さ** - 長文禁止。チェック形式・箇条書き優先
5. **オフライン優先** - 圏外でも安心感を与えるUI

## カラーパレット

### プライマリ: ティールグリーン系（マキタ風）

```css
--genba-teal-900: #0d4f4f;    /* 最も濃い。ヘッダー、重要ボタン */
--genba-teal-700: #147878;    /* メインアクセント */
--genba-teal-500: #1a9e9e;    /* ホバー、セカンダリ */
--genba-teal-100: #e0f5f5;    /* 薄い背景 */
```

### セカンダリ: ダークネイビー系（HiKOKI風）

```css
--genba-navy-900: #1a1f3d;    /* 最も濃い。テキスト、ヘッダー */
--genba-navy-700: #2d3561;    /* サブヘッダー */
--genba-navy-500: #4a5286;    /* ボーダー、区切り線 */
```

### アクセント: 警告イエロー

```css
--genba-yellow-500: #f5c518;  /* CTA、重要な通知、安全アラート */
--genba-yellow-600: #d4a817;  /* ホバー */
```

### ベース

```css
--genba-black: #1a1a1a;       /* テキスト */
--genba-gray-700: #4a4a4a;    /* サブテキスト */
--genba-gray-300: #b8b8b8;    /* ボーダー */
--genba-gray-100: #f5f5f5;    /* 背景（白すぎない） */
--genba-white: #fafafa;       /* カード背景 */
```

### 状態色

```css
--genba-success: #2d8a4e;     /* 完了、同期済 */
--genba-warning: #c77700;     /* 未同期、注意 */
--genba-error: #c73b3b;       /* エラー、高温警報 */
```

## タイポグラフィ

### 日本語フォント優先順

```css
font-family:
  "Noto Sans JP",        /* 第一優先: 視認性高い */
  "Hiragino Kaku Gothic ProN",
  "Meiryo",
  sans-serif;
```

### サイズ（モバイル基準）

| 用途 | サイズ | 太さ |
|------|--------|------|
| 大見出し（FV） | 28-32px | 700 (Bold) |
| セクション見出し | 22-24px | 600 (SemiBold) |
| 本文 | 16-18px | 400 (Regular) |
| 補足・注意書き | 14px | 400 |
| CTAボタン | 18px | 600 |

### 文字色

- 見出し: `--genba-navy-900`
- 本文: `--genba-black`
- 補足: `--genba-gray-700`
- リンク: `--genba-teal-700`

## コンポーネント規約

### ボタン

**プライマリCTA（ダウンロード、録音開始）**
```css
.btn-primary {
  background: var(--genba-teal-700);
  color: white;
  padding: 16px 32px;
  border-radius: 6px;      /* 角丸は控えめ。工具っぽさ */
  font-weight: 600;
  font-size: 18px;
  min-height: 56px;        /* 親指で押しやすい */
  box-shadow: 0 2px 4px rgba(0,0,0,0.2);
}
.btn-primary:hover {
  background: var(--genba-teal-500);
}
```

**セカンダリ（キャンセル、戻る）**
```css
.btn-secondary {
  background: transparent;
  border: 2px solid var(--genba-navy-700);
  color: var(--genba-navy-700);
  border-radius: 6px;
}
```

**警告CTA（安全アラート、重要通知）**
```css
.btn-warning {
  background: var(--genba-yellow-500);
  color: var(--genba-black);
}
```

### 音声入力ボタン（メインアクション）

```css
.voice-button {
  width: 120px;
  height: 120px;
  border-radius: 50%;
  background: var(--genba-teal-700);
  color: white;
  box-shadow: 0 4px 16px rgba(20, 120, 120, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
}
.voice-button.recording {
  background: var(--genba-error);
  animation: pulse 1s infinite;
}
@keyframes pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
}
```

### カード

```css
.card {
  background: var(--genba-white);
  border: 1px solid var(--genba-gray-300);
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
}
```

### フォーム入力

```css
.input {
  border: 2px solid var(--genba-gray-300);
  border-radius: 6px;
  padding: 14px 16px;
  font-size: 16px;
  min-height: 52px;
}
.input:focus {
  border-color: var(--genba-teal-700);
  outline: none;
}
```

### ステータスバッジ

```css
.badge-offline { background: var(--genba-warning); color: white; }
.badge-synced { background: var(--genba-success); color: white; }
.badge-recording { background: var(--genba-error); color: white; }
.badge-team { background: var(--genba-teal-700); color: white; }
```

## レイアウト原則

### モバイルファースト

- スマホ閲覧100%想定
- 横幅は`max-width: 480px`を基準
- 余白は`16px`または`24px`の倍数

### 固定CTA

LP・アプリ共に、画面下部に常時表示のCTAを配置:

```css
.sticky-cta {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 12px 16px;
  background: var(--genba-white);
  border-top: 1px solid var(--genba-gray-300);
  box-shadow: 0 -2px 8px rgba(0,0,0,0.1);
}
```

### オフライン状態インジケーター

```css
.offline-indicator {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  background: var(--genba-warning);
  color: white;
  padding: 8px;
  text-align: center;
  font-size: 14px;
}
```

## 避けるべきパターン

1. **白ベースの軽いデザイン** - IT感が出てしまう
2. **丸すぎる角丸（16px以上）** - かわいくなりすぎ
3. **紫のグラデーション** - AIっぽさが出る
4. **過度な装飾・アニメーション** - 現場で邪魔
5. **小さいボタン（44px未満）** - 汚れた指で押せない
6. **長文の説明** - 職人は読まない
7. **複雑な設定画面** - シンプルに事務ゼロを実現

## 帳票（日報）デザイン

### 日報

詳細は [references/daily-report-template.md](references/daily-report-template.md) を参照。

基本構成:
- 日付、現場名、GPS位置、天気
- 作業内容（箇条書き）
- 使用材料
- 備考・メモ
- 法規準拠（タイムスタンプ/署名）

## 画像・写真のトーン

- 現場帰りの車内（ハイエース運転席）
- スマホに話しかける職人（マイクボタンをタップ）
- 騒音の中で音声入力するシーン
- 疲れた後の安堵感
- 夕暮れ、オレンジ系の光
- 作業服、工具ベルト
- チームでの現場作業

**避ける画像**:
- スーツ姿のビジネスマン
- 真っ白なオフィス
- ピカピカの新品機材
- 複雑なダッシュボード画面

## LP専用セクション

### ヘッドライン例

```
現場で事務仕事に追われる毎日、終わりにしませんか？
GENBA GEAR – AIがあなたのポケット事務員に。喋るだけで日報完成！
```

### 問題提起

- 汚れた手や手袋でスマホ入力が面倒…
- 騒音の中でメモ取り、ミスが怖い…
- 日報作成で残業が増える…
- 中規模チームだと報告集約が大変…
- 圏外現場でアプリが使えない…

### プラン表示

| プラン | 価格 | 内容 |
|--------|------|------|
| 個人プラン | 無料 | コア機能（ボイス入力/日報生成） |
| チームプラン | ¥3,000/月 | チーム共有/集約機能追加、無料トライアル1ヶ月 |
