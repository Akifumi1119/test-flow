// バックエンド API のベース URL を環境変数から取得する。
// .env.local に VITE_API_BASE_URL=http://localhost:8080 のように設定する。
// 環境変数が未設定の場合は空文字列となり、相対パスでリクエストが送られる。
export const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "";
