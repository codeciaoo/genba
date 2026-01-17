# #000 LP制作（ダウンロード誘導）

## 概要

「GENBA GEAR」のLP（ランディングページ）を作成する。
App Store / Google Playダウンロードへの誘導を目的とする。

## ステータス

🔵 Todo

## 優先度

P0（最優先）

## 依存

なし

## 参照スキル

- `genba-design-system` - カラー、タイポ、コンポーネント

## 技術スタック

- Astro
- Tailwind CSS
- Noto Sans JP（Google Fonts）

## 作成物

### 1. 素材

| ファイル | 説明 |
|---------|------|
| `lp/src/assets/screenshots/voice-input.png` | ボイス入力画面スクショ |
| `lp/src/assets/screenshots/report-generate.png` | 日報生成スクショ |
| `lp/src/assets/screenshots/notification.png` | 通知画面スクショ |
| `lp/src/assets/screenshots/safety-alert.png` | 安全アラートスクショ |
| `lp/src/assets/hero-image.png` | ヒーロー画像（職人+スマホ） |
| `lp/src/assets/app-store-badge.png` | App Storeバッジ |
| `lp/src/assets/google-play-badge.png` | Google Playバッジ |

### 2. ページ

| ファイル | 説明 |
|---------|------|
| `lp/src/pages/index.astro` | メインLP |
| `lp/src/pages/privacy.astro` | プライバシーポリシー |
| `lp/src/pages/terms.astro` | 利用規約 |

## LP構成（セクション）

### セクション1: ヘッドライン/ヒーロー

```html
<div class="hero">
  <h1>現場で事務仕事に追われる毎日、終わりにしませんか？</h1>
  <h2>GENBA GEAR – AIがあなたのポケット事務員に。喋るだけで日報完成！</h2>
  <img src="hero-image.png" alt="職人がマイクで入力するスクショ" />
  <p>個人職人から中規模チームまで、事務負担をゼロに。無料で今すぐスタート！</p>
  <div class="store-badges">
    <a href="#"><img src="app-store-badge.png" alt="App Store" /></a>
    <a href="#"><img src="google-play-badge.png" alt="Google Play" /></a>
  </div>
</div>
```

### セクション2: 問題提起

**見出し**: 「建設現場のこんな悩み、ありませんか？」

**チェックリスト**:
- ✅ 汚れた手や手袋でスマホ入力が面倒…
- ✅ 騒音の中でメモ取り、ミスが怖い…
- ✅ 日報作成で残業が増える…
- ✅ 中規模チームだと報告集約が大変…
- ✅ 圏外現場でアプリが使えない…

**締め**: 「個人事業主から小規模工務店まで、事務仕事が現場の生産性を奪っています。GENBA GEARは、そんな日常をAIで変えます。USの先進技術を日本仕様にローカライズ！」

### セクション3: 機能紹介

**見出し**: 「GENBA GEARのココがすごい！」

#### 機能1: 騒音耐性AIボイス入力
- **画像**: voice-input-screenshot.png
- **説明**: マイク1タップで喋るだけ。現場の機械音をフィルタリングし、作業内容を自動記録。オフラインOKで圏外現場も安心。個人で単独使用、中規模チームで共有可能。

#### 機能2: 簡易日報生成
- **画像**: report-generate-screenshot.png
- **説明**: ボイスデータからGPS/天気情報を自動結合。法規準拠のPDFを1タップで作成。個人で単独出力、中規模でチーム集約サマリー。

#### 機能3: GPS自動通知 & 軽量顧客カルテ
- **画像**: notification-screenshot.png
- **説明**: 現場接近でSMS自動送信、過去データ声検索で即確認。個人/中規模対応、オフライン優先。

#### 機能4: 熱中症/安全アラート
- **画像**: safety-alert-screenshot.png
- **説明**: 天気+GPSで高温通知。個人単独、中規模チーム一括で安全管理。

**補足**: 「拡張機能（決済/資金化）はv2以降で追加。競合アプリの複雑さを避け、シンプルに事務ゼロを実現します。」

### セクション4: メリット/ユーザー声

**見出し**: 「実際に使った職人さんの声」

**声1**:
> 「喋るだけで日報ができて、残業が減った！騒音下でも正確で助かる。」（塗装職人、個人事業主）

**声2**:
> 「チームの日報集約が楽になり、現場集中できた。オフラインで圏外でもOK。」（小規模工務店、10人チーム）

**メリット**: 事務時間半減、ミス減少、ストレスフリー。個人無料で今すぐ試せます。

### セクション5: 価格/プラン

**見出し**: 「プランと価格」

| プラン | 価格 | 内容 |
|--------|------|------|
| 個人プラン | **無料** | コア機能（ボイス入力/日報生成）で事務ゼロスタート |
| チームプラン | **月額¥3,000/チーム** | チーム共有/集約機能追加。無料トライアル1ヶ月 |

**補足**: 「拡張オプション: カスタムAI¥1,000追加。将来的にFintech連携でマネタイズ強化。」

### セクション6: CTA

**見出し**: 「今すぐ現場を変えよう！」

**テキスト**: 「App Store / Google Playから無料ダウンロード。Coming Soon: 中規模プランでさらにパワーアップ。」

**ボタン**:
- App Storeバッジ（リンク）
- Google Playバッジ（リンク）

### フッター

- 運営者情報: [要設定]
- プライバシーポリシー・利用規約リンク
- お問い合わせ

### 固定CTA（sticky）

- 画面下部に常時表示
- 「無料ダウンロード」→ App Store / Google Playリンク

## デザイン要件

- **プライマリカラー**: #147878（ティールグリーン）
- **セカンダリ**: #1a1f3d（ダークネイビー）
- **背景**: #f5f5f5
- **テキスト**: #1a1a1a
- **ボタン高さ**: 56px
- **角丸**: 6px（工具感）
- **フォント**: Noto Sans JP
- **見出し**: 24-32px
- **本文**: 16-18px

## 実行コマンド

```bash
# 指示文
genba-design-systemスキルを参照して、
GENBA GEARのLPを作成してください。

作成場所: /Users/tsubasatahara/dev/codeciao/genba/lp

上記の「作成物」「LP構成」「デザイン要件」に従って実装。
スクリーンショットはプレースホルダーでOK（iPhone枠のモックアップ）。

完了後:
cd /Users/tsubasatahara/dev/codeciao/genba/lp
npm install
npm run dev
```

## 完了条件

- [ ] 全セクションが実装されている
- [ ] ヒーロー画像/スクショがプレースホルダーで表示される
- [ ] プラン表示が正しい（個人無料/チーム¥3,000）
- [ ] App Store / Google Playバッジが表示される
- [ ] 固定CTAが表示される
- [ ] モバイルで正しく表示される
- [ ] `npm run dev`でローカル確認できる
