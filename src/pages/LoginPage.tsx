import { API_BASE } from "../utils/api";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./LoginPage.css";

interface LoginForm {
  email: string;
  password: string;
}

export function LoginPage() {
  useEffect(() => {
    document.title = "ログイン - TaskFlow";
  }, []);
  const [form, setForm] = useState<LoginForm>({ email: "", password: "" });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

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

          <div className="field">
            <label htmlFor="password">パスワード</label>
            <div className="input-wrapper">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                required
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="パスワードを入力"
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={
                  showPassword ? "パスワードを隠す" : "パスワードを表示する"
                }
              >
                {showPassword ? (
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    aria-hidden="true"
                  >
                    <path
                      d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19M1 1l22 22"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <circle
                      cx="12"
                      cy="12"
                      r="3"
                      stroke="currentColor"
                      strokeWidth="1.8"
                    />
                  </svg>
                ) : (
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    aria-hidden="true"
                  >
                    <path
                      d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <circle
                      cx="12"
                      cy="12"
                      r="3"
                      stroke="currentColor"
                      strokeWidth="1.8"
                    />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {error && (
            <p className="login-error" role="alert">
              {error}
            </p>
          )}

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
