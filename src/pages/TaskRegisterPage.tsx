// タスク登録ページ。
// URL パラメータ（project_id・user_id）で対象プロジェクトを特定し、
// タイトル・説明・担当者を入力して新しいタスクを作成する。
// 登録完了後はタスク一覧ページへ戻る。
import { API_BASE } from "../utils/api";
import { useCallback, useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ErrorMessage } from "../components/ErrorMessage";
import "./TaskRegisterPage.css";

interface Member {
  user_id: number;
  name: string;
}

export function TaskRegisterPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // URL クエリパラメータからプロジェクトIDとユーザーIDを取得する
  const projectId = searchParams.get("project_id") ?? "";
  const userId = searchParams.get("user_id") ?? "";

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [assigneeId, setAssigneeId] = useState(""); // 担当者のユーザーID（未選択時は空文字）
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [members, setMembers] = useState<Member[]>([]);
  const [membersLoading, setMembersLoading] = useState(true);

  // 認証エラー（401）発生時の共通処理。
  // localStorage のトークンを削除してログインページへリダイレクトする。
  const handleUnauthorized = useCallback(() => {
    localStorage.removeItem("token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("userName");
    localStorage.removeItem("userId");
    navigate("/login");
  }, [navigate]);

  // プロジェクトメンバー一覧を取得する。
  // GET /api/projects/:projectId/members で担当者の選択肢を取得する。
  // 取得失敗時もタスク登録自体は続行できるようにプルダウンを空のまま表示する。
  const fetchMembers = useCallback(async () => {
    setMembersLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/projects/${projectId}/members`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token") ?? ""}`,
        },
      });
      if (res.status === 401) {
        handleUnauthorized();
        return;
      }
      if (res.ok) {
        const data: Member[] = await res.json();
        setMembers(data);
      }
    } catch {
      // メンバー取得失敗時はプルダウンを空のまま継続（タスク登録は可能）
    } finally {
      setMembersLoading(false);
    }
  }, [projectId, handleUnauthorized]);

  useEffect(() => {
    document.title = "タスク登録 - TaskFlow";
  }, []);

  // StrictMode による二重実行を防ぐため initialized フラグを使用する
  const initialized = useRef(false);
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    fetchMembers();
  }, [fetchMembers]);

  // タスク一覧ページへ戻る（登録をキャンセルした場合）
  const handleCancel = () => {
    navigate(`/tasks?project_id=${projectId}&user_id=${userId}`);
  };

  // タスク登録処理。
  // POST /api/tasks にタイトル・説明・担当者IDを送信する。
  // 担当者が未選択（assigneeId が空）の場合は user_name フィールドを送らない。
  // 登録成功後はタスク一覧ページへ戻る。
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const body: Record<string, unknown> = {
        created_by: Number(userId),
        project_id: Number(projectId),
        title: title.trim(),
        content,
      };
      // 担当者が選択されている場合のみリクエストに含める
      if (assigneeId) {
        body.user_name = Number(assigneeId);
      }

      const res = await fetch(`${API_BASE}/api/tasks`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token") ?? ""}`,
        },
        body: JSON.stringify(body),
      });

      if (res.status === 401) {
        handleUnauthorized();
        return;
      }

      const data = await res.json();
      if (!res.ok) {
        setError(data.message ?? "タスクの登録に失敗しました");
        return;
      }
      // 登録成功後タスク一覧画面に遷移する
      navigate(`/tasks?project_id=${projectId}&user_id=${userId}`);
    } catch {
      setError("サーバーに接続できませんでした");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="task-register">
      <h1 className="task-register-title">タスク登録</h1>

      <form className="task-register-form" onSubmit={handleSubmit}>
        {/* タイトルは必須入力 */}
        <input
          className="task-register-input"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="タイトル"
          required
          autoFocus
          disabled={submitting}
        />

        {/* 説明は任意入力 */}
        <textarea
          className="task-register-textarea"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="説明"
          disabled={submitting}
        />

        {/* 担当者は任意選択。メンバー一覧取得中は disabled にする */}
        <select
          className="task-register-select"
          value={assigneeId}
          onChange={(e) => setAssigneeId(e.target.value)}
          disabled={submitting || membersLoading}
        >
          <option value="">タスク担当者（任意）</option>
          {members.map((m) => (
            <option key={m.user_id} value={m.user_id}>
              {m.name}
            </option>
          ))}
        </select>

        {error && <ErrorMessage message={error} />}

        <div className="task-register-actions">
          <button
            type="button"
            className="task-register-btn-cancel"
            onClick={handleCancel}
            disabled={submitting}
          >
            キャンセル
          </button>
          {/* タイトルが空の場合は登録ボタンを無効化する */}
          <button
            type="submit"
            className="task-register-btn-submit"
            disabled={!title.trim() || submitting}
          >
            {submitting ? "登録中..." : "登録"}
          </button>
        </div>
      </form>
    </div>
  );
}
