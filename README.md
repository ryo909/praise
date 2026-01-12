# Peer Praise - 社内向け称賛アプリ

社内向けの Peer Praise（称賛）Webアプリケーション MVP です。

**Live Demo**: [https://ryo909.github.io/praise/](https://ryo909.github.io/praise/)

## 機能

- 🎉 **QuickPraise**: テンプレートを選んで15秒で称賛を送信
- 📰 **Feed**: 20秒ポーリングでリアルタイム更新、新着バナー
- 👏 **Clap**: 1人1回のトグル式リアクション
- 📊 **Weekly**: 週次まとめ、Top Receivers/Givers
- 👤 **Profile**: 受け取った/送った称賛履歴、称号表示
- 🔧 **Admin**: パスコードロック、ユーザー管理、履歴削除

## 技術スタック

- **Frontend**: React + TypeScript + Vite
- **Backend**: Supabase (PostgreSQL)
- **Hosting**: GitHub Pages

## セットアップ

### 1. 依存関係のインストール

```bash
npm install
```

### 2. 環境変数の設定

`.env.local` を作成：

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_ADMIN_PASSCODE=your-admin-passcode
```

### 3. Supabase テーブル作成

Supabase SQL Editor で以下を実行（詳細は仕様書参照）：
- `users`, `recognitions`, `reactions`, `weekly_digests`, `badges`, `user_badges`

### 4. 開発サーバー起動

```bash
npm run dev
```

## GitHub Pages デプロイ

### GitHub Secrets に追加が必要なキー

| Secret 名 | 説明 |
|-----------|------|
| `VITE_SUPABASE_URL` | Supabase プロジェクト URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase Anon Key |
| `VITE_ADMIN_PASSCODE` | Admin ページのパスコード |

### 追加方法

1. GitHub リポジトリの **Settings** → **Secrets and variables** → **Actions**
2. **New repository secret** をクリック
3. 各キーと値を入力して保存

`main` ブランチにプッシュすると自動でデプロイされます。

## Admin 機能

### パスコード設定

Admin ページは `VITE_ADMIN_PASSCODE` 環境変数で保護されています。

- **ローカル**: `.env.local` に設定
- **本番**: GitHub Secrets に設定

環境変数が設定されていない場合、Admin ページにログインできません。

### 履歴削除機能

Admin ページロック解除後、「⚠️ 危険な操作」セクションで利用できます。

| ボタン | 削除対象 |
|--------|----------|
| 直近24時間の履歴を削除 | 過去24時間の recognitions, reactions |
| 履歴を全削除（テスト用） | recognitions, reactions, weekly_digests |
| 称号も含めて全削除 | 上記 + user_badges |

**⚠️ 注意**: 削除は元に戻せません。確認のため `DELETE` と入力が必要です。

## ライセンス

MIT
