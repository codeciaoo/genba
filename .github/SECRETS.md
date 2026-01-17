# GitHub Secrets 設定ガイド

このドキュメントでは、CI/CDパイプラインに必要なGitHub Secretsの設定方法を説明します。

## 必要なSecrets一覧

### LP用

| Secret名 | 説明 | 取得方法 |
|---------|------|---------|
| `VERCEL_TOKEN` | Vercel APIトークン | [Vercel Dashboard](https://vercel.com/account/tokens) → Create Token |
| `VERCEL_ORG_ID` | Vercel組織ID | Vercelプロジェクト → Settings → General → Vercel ID |
| `VERCEL_PROJECT_ID_LP` | LP用VercelプロジェクトID | Vercelプロジェクト → Settings → General → Project ID |

### モバイルアプリ用

| Secret名 | 説明 | 取得方法 |
|---------|------|---------|
| `EXPO_TOKEN` | Expo APIトークン | [Expo Dashboard](https://expo.dev/accounts/[account]/settings/access-tokens) → Create Token |
| `CODECOV_TOKEN` | Codecovトークン | [Codecov](https://codecov.io/) → Settings → Repository → Upload Token |

### App Store / Google Play（本番リリース時）

| Secret名 | 説明 | 取得方法 |
|---------|------|---------|
| `APPLE_ID` | Apple ID | App Store Connect用のApple ID |
| `APPLE_APP_SPECIFIC_PASSWORD` | App用パスワード | [Apple ID](https://appleid.apple.com/) → App用パスワード |
| `ASC_API_KEY` | App Store Connect APIキー | App Store Connect → Users → Keys |
| `GOOGLE_SERVICE_ACCOUNT_KEY` | Google Playサービスアカウント | Google Cloud Console → IAM → サービスアカウント |

## 設定手順

### 1. Vercel連携（LP用）

```bash
# Vercel CLIをインストール
npm i -g vercel

# ログイン
vercel login

# プロジェクトをリンク（lpディレクトリで実行）
cd lp
vercel link

# .vercel/project.json からorgIdとprojectIdを確認
cat .vercel/project.json
```

### 2. Expo連携（モバイルアプリ用）

```bash
# Expo CLIをインストール
npm i -g eas-cli

# ログイン
eas login

# アクセストークンを作成
# https://expo.dev/accounts/[account]/settings/access-tokens
```

### 3. GitHub Secretsへの登録

1. GitHubリポジトリ → Settings → Secrets and variables → Actions
2. 「New repository secret」をクリック
3. Name と Value を入力して「Add secret」

## 環境（Environment）の設定

本番デプロイには`production`環境の承認が必要です:

1. GitHubリポジトリ → Settings → Environments
2. 「New environment」→「production」を作成
3. 「Required reviewers」を設定（任意）
4. 「Deployment branches」で`main`のみに制限

## ローカル開発用の環境変数

ローカル開発では `.env.local` を使用:

```bash
# lp/.env.local
PUBLIC_SITE_URL=http://localhost:4321

# mobile/.env.local
EXPO_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=xxx
```

⚠️ `.env.local` は `.gitignore` に追加されていることを確認してください。

## トラブルシューティング

### Vercelデプロイが失敗する

- `VERCEL_TOKEN` が有効か確認
- `VERCEL_ORG_ID` と `VERCEL_PROJECT_ID_LP` が正しいか確認
- Vercelプロジェクトの設定でGitHub連携が有効になっているか確認

### EASビルドが失敗する

- `EXPO_TOKEN` が有効か確認（有効期限に注意）
- `eas.json` のプロファイル設定を確認
- `app.json` または `app.config.js` の設定を確認

### Codecovにカバレッジがアップロードされない

- `CODECOV_TOKEN` が設定されているか確認
- カバレッジファイルのパスが正しいか確認
