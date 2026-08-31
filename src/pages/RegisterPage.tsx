// 新規ユーザー登録ページ。
// 名前・メールアドレス・パスワード（確認含む）を入力してアカウントを作成する。
// 登録成功後はログインページへ遷移する。
import { API_BASE } from "../utils/api";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ErrorMessage } from "../components/ErrorMessage";
import { PasswordInput } from "../components/PasswordInput";
import "./RegisterPage.css";

interface RegisterForm {
  name: string;
  email: string;
  password: string;
  passwordConfirm: string; // パスワード確認用（サーバーには送らない）
}

export function RegisterPage() {
  useEffect(() => {
    document.title = "新規登録 - TaskFlow";
  }, []);

  const [form, setForm] = useState<RegisterForm>({
    name: "",
    email: "",
    password: "",
    passwordConfirm: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // ユーザー登録処理。
  // フロントエンドでパスワード一致を検証してから POST /api/users を呼び出す。
  // 409 はメールアドレス重複のため専用メッセージを表示する。
  // 登録成功後はログインページへ遷移する（自動ログインはしない）。
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // パスワードと確認パスワードが一致するかクライアントサイドで検証
    if (form.password !== form.passwordConfirm) {
      setError("パスワードが一致しません");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/api/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          password: form.password,
          // passwordConfirm はサーバーに送らない
        }),
      });

      const data = await res.json();

      // メールアドレス重複の場合は専用メッセージを表示
      if (res.status === 409) {
        setError("このメールアドレスはすでに登録されています");
        return;
      }

      if (!res.ok) {
        setError(data.message ?? "アカウント作成に失敗しました");
        return;
      }

      // 登録成功: ログインページへ遷移（自動ログインせず手動でサインインさせる）
      navigate("/login");
    } catch {
      setError("サーバーに接続できませんでした");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-container">
      <div className="register-card">
        <h1 className="register-title">TaskFlow</h1>
        <p className="register-subtitle">新規アカウントを作成</p>

        <form onSubmit={handleSubmit} className="register-form" noValidate>
          <div className="field">
            <label htmlFor="name">名前</label>
            <input
              id="name"
              type="text"
              autoComplete="name"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="山田 太郎"
            />
          </div>

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
            placeholder="8文字以上で入力"
            autoComplete="new-password"
            required
          />

          <PasswordInput
            id="passwordConfirm"
            label="パスワード（確認）"
            value={form.passwordConfirm}
            onChange={(e) =>
              setForm({ ...form, passwordConfirm: e.target.value })
            }
            placeholder="パスワードを再入力"
            autoComplete="new-password"
            required
          />

          {error && <ErrorMessage message={error} />}

          <button type="submit" className="register-button" disabled={loading}>
            {loading ? "作成中..." : "アカウントを作成"}
          </button>
        </form>
      </div>

      <p className="register-footer">
        すでにアカウントをお持ちの方は
        <Link to="/login">ログイン</Link>
      </p>
    </div>
  );
}
