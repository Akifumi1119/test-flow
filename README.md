# TaskFlow

チームのタスクをプロジェクト単位で管理するWebアプリケーションです。

## 技術スタック

- **React 19** / **TypeScript**
- **Vite**
- **React Router DOM v7**

## 機能

- ユーザー登録・ログイン（JWT認証）
- プロジェクトの作成・編集・削除
- タスクの作成・編集・削除
- タスクへのコメント投稿・編集・削除
- プロジェクトへのメンバー追加
- プロジェクト責任者の変更

## セットアップ

```bash
npm install
npm run dev
```

## スクリプト

| コマンド | 内容 |
|---|---|
| `npm run dev` | 開発サーバー起動 |
| `npm run build` | 本番ビルド |
| `npm run preview` | ビルド結果のプレビュー |
| `npm run lint` | ESLintによる静的解析 |
