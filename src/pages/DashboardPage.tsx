import { type FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./DashboardPage.css";

interface Project {
  project_id: number;
  project_name: string;
  task_per_complete: number;
  task_per_incomplete: number;
}

function buildAuthHeaders() {
  return {
    Authorization: `Bearer ${localStorage.getItem("token") ?? ""}`,
    "Content-Type": "application/json",
  };
}

export function DashboardPage() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const handleUnauthorized = useCallback(() => {
    localStorage.removeItem("token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("userName");
    localStorage.removeItem("userId");
    navigate("/login");
  }, [navigate]);

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const userId = localStorage.getItem("userId") ?? "";
      const res = await fetch(`/api/projects/${userId}`, {
        headers: buildAuthHeaders(),
      });
      if (res.status === 401) {
        handleUnauthorized();
        return;
      }
      const data = await res.json();
      if (!res.ok) {
        setError(data.message ?? "プロジェクトの取得に失敗しました");
        return;
      }
      setProjects(data);
    } catch {
      setError("サーバーに接続できませんでした");
    } finally {
      setLoading(false);
    }
  }, [handleUnauthorized]);

  const initialized = useRef(false);
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    fetchProjects();
  }, [fetchProjects]);

  const handleCreate = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!projectName.trim()) return;
    setCreating(true);
    setCreateError(null);
    try {
      const userId = Number(localStorage.getItem("userId") ?? "0");
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: buildAuthHeaders(),
        body: JSON.stringify({
          user_id: userId,
          project_name: projectName.trim(),
        }),
      });
      if (res.status === 401) {
        handleUnauthorized();
        return;
      }
      const data = await res.json();
      if (!res.ok) {
        setCreateError(data.message ?? "プロジェクトの作成に失敗しました");
        return;
      }
      setModalOpen(false);
      setProjectName("");
      await fetchProjects();
    } catch {
      setCreateError("サーバーに接続できませんでした");
    } finally {
      setCreating(false);
    }
  };

  const closeModal = () => {
    if (creating) return;
    setModalOpen(false);
    setProjectName("");
    setCreateError(null);
  };

  return (
    <div className="dashboard">
      {(loading || creating) && (
        <div className="dashboard-overlay" aria-hidden="true">
          <div className="dashboard-spinner" />
        </div>
      )}

      <div className="dashboard-header">
        <h1 className="dashboard-title">所属プロジェクト一覧</h1>
        <button
          className="dashboard-create-btn"
          onClick={() => setModalOpen(true)}
          disabled={loading}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M8 3v10M3 8h10"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>
          プロジェクトを新規作成
        </button>
      </div>

      {error && (
        <p className="dashboard-error" role="alert">
          {error}
        </p>
      )}

      {!loading && !error && projects.length === 0 && (
        <p className="dashboard-empty">
          プロジェクトがまだありません。新規作成してください。
        </p>
      )}

      <div className="project-grid">
        {projects.map((project) => (
          <div
            key={project.project_id}
            className="project-card"
            onClick={() =>
              navigate(
                `/tasks?project_id=${project.project_id}&user_id=${localStorage.getItem("userId") ?? ""}`,
              )
            }
            role="button"
            tabIndex={0}
            onKeyDown={(e) =>
              e.key === "Enter" &&
              navigate(`/tasks?project_id=${project.project_id}`)
            }
          >
            <h2 className="project-card-name">{project.project_name}</h2>
            <div className="project-progress-bar">
              <div
                className="project-progress-fill"
                style={{ width: `${project.task_per_complete}%` }}
              />
            </div>
            <div className="project-progress-labels">
              <span className="label-complete">
                完了 {project.task_per_complete}%
              </span>
              <span className="label-incomplete">
                未完了 {project.task_per_incomplete}%
              </span>
            </div>
          </div>
        ))}
      </div>

      {modalOpen && (
        <div className="modal-backdrop" onClick={closeModal}>
          <div
            className="modal"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
          >
            <h2 id="modal-title" className="modal-title">
              プロジェクトを新規作成
            </h2>
            <form onSubmit={handleCreate}>
              <div className="dashboard-field">
                <label htmlFor="project-name">プロジェクト名</label>
                <input
                  id="project-name"
                  type="text"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="プロジェクト名を入力"
                  required
                  autoFocus
                  disabled={creating}
                />
              </div>
              {createError && (
                <p className="modal-error" role="alert">
                  {createError}
                </p>
              )}
              <div className="modal-actions">
                <button
                  type="button"
                  className="modal-btn-cancel"
                  onClick={closeModal}
                  disabled={creating}
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  className="modal-btn-submit"
                  disabled={creating || !projectName.trim()}
                >
                  {creating ? "作成中..." : "作成"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
