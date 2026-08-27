# TaskFlow

チームのタスクをプロジェクト単位で管理するWebアプリケーションです。

## 技術スタック

- **React 19** / **TypeScript**
- **Vite**
- **React Router DOM v7**

## 機能

- ユーザー登録・ログイン（JWT認証）
- プロフィール編集（名前・メールアドレス）
- プロジェクトの作成・編集・削除
- プロジェクトへのメンバー追加・権限管理
- プロジェクト責任者の変更
- プロジェクトからの退場
- タスクの作成・編集・削除
- タスクへのコメント投稿・編集・削除

## セットアップ

### 1. 依存関係のインストール

```bash
npm install
```

### 2. 環境変数の設定

`.env.local` を作成して、バックエンドのURLを設定。

```env
VITE_API_BASE_URL=http://localhost:8080
```

### 3. 開発サーバーの起動

```bash
npm run dev
```

## スクリプト

| コマンド          | 内容                   |
| ----------------- | ---------------------- |
| `npm run dev`     | 開発サーバー起動       |
| `npm run build`   | 本番ビルド             |
| `npm run preview` | ビルド結果のプレビュー |
| `npm run lint`    | ESLintによる静的解析   |

## ディレクトリ構成

```
src/
├── components/   # 共通UIコンポーネント
├── layouts/      # ページレイアウト
├── pages/        # 各ページコンポーネント
└── utils/        # API設定などのユーティリティ
```

## デプロイ

Vercelにホスティング。`vercel.json` でSPA向けのリライト設定済み。バックエンドはRender（`https://test-flow-backend.onrender.com`）にデプロイしています。
