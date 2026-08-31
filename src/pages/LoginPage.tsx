// ログインページ。
// バックエンド（Render）がスリープ状態の場合があるため、
// ページ表示と同時にヘルスチェックを開始し、サーバーが起動するまで待機画面を表示する。
// サーバーが起動したらログインフォームを表示し、認証に成功したらダッシュボードへ遷移する。
import { API_BASE } from "../utils/api";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ErrorMessage } from "../components/ErrorMessage";
import { PasswordInput } from "../components/PasswordInput";
import { Spinner } from "../components/Spinner";
import "./LoginPage.css";

interface LoginForm {
  email: string;
  password: string;
}

// ヘルスチェックのポーリング間隔（ミリ秒）
const HEALTH_INTERVAL = 4000;
// ヘルスチェックのタイムアウト時間（ミリ秒）。この時間を超えたらタイムアウトエラーを表示する
const HEALTH_TIMEOUT = 75000;

export function LoginPage() {
  useEffect(() => {
    document.title = "ログイン - TaskFlow";
  }, []);

  // バックエンドの起動状態を管理する
  const [backendReady, setBackendReady] = useState(false);   // true になったらログインフォームを表示
  const [backendTimedOut, setBackendTimedOut] = useState(false); // true になったらタイムアウトエラーを表示

  // バックエンドのヘルスチェック。
  // Render の無料プランはアイドル状態でスリープするため、初回アクセス時に起動待ちが必要。
  // GET /api/health が 200 を返すまで HEALTH_INTERVAL ミリ秒ごとにポーリングする。
  // HEALTH_TIMEOUT を超えた場合はタイムアウトとしてポーリングを停止し、再試行ボタンを表示する。
  // コンポーネントがアンマウントされた場合は cancelled フラグで後続の state 更新を防ぐ。
  useEffect(() => {
    let cancelled = false;
    const startedAt = Date.now();

    const check = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/health`);
        if (res.ok) {
          if (!cancelled) setBackendReady(true);
          return;
        }
      } catch {
        // サーバーがまだ起動中のため次のポーリングまで待機
      }
      if (cancelled) return;
      if (Date.now() - startedAt >= HEALTH_TIMEOUT) {
        setBackendTimedOut(true);
      } else {
        setTimeout(check, HEALTH_INTERVAL);
      }
    };

    check();
    return () => {
      cancelled = true;
    };
  }, []);

  const [form, setForm] = useState<LoginForm>({ email: "", password: "" });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // ログイン処理。
  // POST /api/login にメールアドレスとパスワードを送信する。
  // 成功時はレスポンスの JWT トークン・リフレッシュトークン・ユーザー情報を
  // localStorage に保存してダッシュボード（/）へ遷移する。
  // 失敗時はサーバーから返却されたエラーメッセージを表示する。
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/api/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "ログインに失敗しました");
        return;
      }

      // 認証情報を localStorage に保存（ページリロード後も認証状態を維持するため）
      localStorage.setItem("token", data.token);
      localStorage.setItem("refresh_token", data.refresh_token ?? "");
      localStorage.setItem("userId", String(data.user_id ?? ""));
      localStorage.setItem("userName", data.name ?? "");
      navigate("/");
    } catch {
      setError("サーバーに接続できませんでした");
    } finally {
      setLoading(false);
    }
  };

  // サーバー起動待ち画面。
  // backendReady になるまでスピナーまたはタイムアウトメッセージを表示する。
  if (!backendReady) {
    return (
      <div className="login-container">
        <div className="login-card">
          <h1 className="login-title">TaskFlow</h1>
          {backendTimedOut ? (
            // タイムアウト時: 再試行ボタンでページをリロードしてヘルスチェックを再開する
            <div className="login-wake-timeout">
              <p>サーバーへの接続がタイムアウトしました。</p>
              <button
                className="login-button"
                onClick={() => window.location.reload()}
              >
                再試行
              </button>
            </div>
          ) : (
            // 起動中: スピナーと案内メッセージを表示
            <div className="login-wake">
              <Spinner size={40} />
              <p className="login-wake-message">
                サーバーを起動中です。しばらくお待ちください…
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="login-container">
      <div className="login-card">
        <h1 className="login-title">TaskFlow</h1>
        <p className="login-subtitle">アカウントにサインイン</p>

        <form onSubmit={handleSubmit} className="login-form" noValidate>
          <div className="field">
            <label htmlFor="email">メールアドレス</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="example@example.com"
            />
          </div>

          <PasswordInput
            id="password"
            label="パスワード"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            placeholder="パスワードを入力"
            autoComplete="current-password"
            required
          />

          {error && <ErrorMessage message={error} />}

          <button type="submit" className="login-button" disabled={loading}>
            {loading ? "ログイン中..." : "ログイン"}
          </button>
        </form>
      </div>

      <p className="login-footer">
        アカウントをお持ちでない方は
        <Link to="/register">新規登録</Link>
      </p>
    </div>
  );
}
