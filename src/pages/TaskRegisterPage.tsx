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

  const projectId = searchParams.get("project_id") ?? "";
  const userId = searchParams.get("user_id") ?? "";

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [members, setMembers] = useState<Member[]>([]);
  const [membersLoading, setMembersLoading] = useState(true);

  const handleUnauthorized = useCallback(() => {
    localStorage.removeItem("token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("userName");
    localStorage.removeItem("userId");
    navigate("/login");
  }, [navigate]);

  // 所属メンバー取得(担当者プルダウン用)
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
      // メンバー取得失敗時はプルダウンを空のまま継続
    } finally {
      setMembersLoading(false);
    }
  }, [projectId, handleUnauthorized]);

  // タブの名前
  useEffect(() => {
    document.title = "タスク登録 - TaskFlow";
  }, []);

  const initialized = useRef(false);
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    fetchMembers();
  }, [fetchMembers]);

  // タスク一覧画面に遷移
  const handleCancel = () => {
    navigate(`/tasks?project_id=${projectId}&user_id=${userId}`);
  };

  // タスク登録
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
      // 登録成功後タスク一覧画面に遷移
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

        <textarea
          className="task-register-textarea"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="説明"
          disabled={submitting}
        />

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
