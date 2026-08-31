// パスワード入力フィールドのコンポーネント。
// 目のアイコンボタンで平文表示／非表示を切り替えられる。
// ログインページ・新規登録ページで共通利用する。
import { useState } from "react";
import "./PasswordInput.css";

interface PasswordInputProps {
  id: string;
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  autoComplete?: string;
  required?: boolean;
  disabled?: boolean;
}

// パスワード非表示時に表示するアイコン（目に斜線）
const EyeOffIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19M1 1l22 22"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8" />
  </svg>
);

// パスワード表示時に表示するアイコン（目）
const EyeIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8" />
  </svg>
);

export function PasswordInput({
  id,
  label,
  value,
  onChange,
  placeholder,
  autoComplete,
  required,
  disabled,
}: PasswordInputProps) {
  // show: true のとき type="text" にして平文表示、false のとき type="password" でマスク表示
  const [show, setShow] = useState(false);

  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <div className="input-wrapper">
        <input
          id={id}
          type={show ? "text" : "password"}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          autoComplete={autoComplete}
          required={required}
          disabled={disabled}
        />
        {/* クリックするたびに show を反転してパスワードの表示／非表示を切り替える */}
        <button
          type="button"
          className="password-toggle"
          onClick={() => setShow((prev) => !prev)}
          aria-label={show ? "パスワードを隠す" : "パスワードを表示する"}
        >
          {show ? <EyeOffIcon /> : <EyeIcon />}
        </button>
      </div>
    </div>
  );
}
