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

const HEALTH_INTERVAL = 4000;
const HEALTH_TIMEOUT = 75000;

// タブの名前
export function LoginPage() {
  useEffect(() => {
    document.title = "ログイン - TaskFlow";
  }, []);

  const [backendReady, setBackendReady] = useState(false);
  const [backendTimedOut, setBackendTimedOut] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const startedAt = Date.now();

    // サーバーが起動中か確認
    const check = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/health`);
        if (res.ok) {
          if (!cancelled) setBackendReady(true);
          return;
        }
      } catch {
        // スリープ中
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

  // ログイン
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

  if (!backendReady) {
    return (
      <div className="login-container">
        <div className="login-card">
          <h1 className="login-title">TaskFlow</h1>
          {backendTimedOut ? (
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
