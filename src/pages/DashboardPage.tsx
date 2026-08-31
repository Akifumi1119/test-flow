// ダッシュボードページ。
// ログインユーザーが所属するプロジェクト一覧を表示する。
// 各プロジェクトカードにはタスクの完了率をプログレスバーで可視化する。
// 新規プロジェクトの作成もこの画面から行う。
import { API_BASE } from "../utils/api";
import {
  type FormEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";
import { ErrorMessage } from "../components/ErrorMessage";
import { LoadingOverlay } from "../components/Spinner";
import "./DashboardPage.css";

interface Project {
  project_id: number;
  project_name: string;
  task_per_complete: number;   // タスク完了率（%）
  task_per_incomplete: number; // タスク未完了率（%）
}

// 認証ヘッダーを生成するヘルパー。
// すべての認証が必要な API リクエストで共通して使用する。
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

  // 認証エラー（401）発生時の共通処理。
  // localStorage のトークンを削除してログインページへリダイレクトする。
  const handleUnauthorized = useCallback(() => {
    localStorage.removeItem("token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("userName");
    localStorage.removeItem("userId");
    navigate("/login");
  }, [navigate]);

  // 所属プロジェクト一覧を取得する。
  // GET /api/projects/:userId でログインユーザーが所属する全プロジェクトを取得する。
  // 各プロジェクトにはタスクの完了率・未完了率が含まれており、カードに表示する。
  const fetchProjects = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const userId = localStorage.getItem("userId") ?? "";
      const res = await fetch(`${API_BASE}/api/projects/${userId}`, {
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

  useEffect(() => {
    document.title = "トップページ - TaskFlow";
  }, []);

  // React StrictMode では useEffect が2回実行されるため、
  // initialized フラグで初回のみ fetchProjects を呼び出すようにしている。
  const initialized = useRef(false);
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    fetchProjects();
  }, [fetchProjects]);

  // プロジェクト作成処理。
  // POST /api/projects にプロジェクト名とユーザーIDを送信する。
  // 作成成功後はモーダルを閉じてプロジェクト一覧を再取得することでリストに追加する。
  const handleCreate = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!projectName.trim()) return;
    setCreating(true);
    setCreateError(null);
    try {
      const userId = Number(localStorage.getItem("userId") ?? "0");
      const res = await fetch(`${API_BASE}/api/projects`, {
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
      // 作成したプロジェクトを一覧に反映するために再取得する
      await fetchProjects();
    } catch {
      setCreateError("サーバーに接続できませんでした");
    } finally {
      setCreating(false);
    }
  };

  // プロジェクト作成モーダルを閉じる。
  // API 送信中（creating）はモーダルを閉じられないようにする。
  const closeModal = () => {
    if (creating) return;
    setModalOpen(false);
    setProjectName("");
    setCreateError(null);
  };

  return (
    <div className="dashboard">
      {/* API 通信中は画面全体をオーバーレイで覆い操作を無効化する */}
      {(loading || creating) && <LoadingOverlay />}

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

      {error && <ErrorMessage message={error} className="dashboard-error" />}

      {/* プロジェクトが0件の場合は案内メッセージを表示 */}
      {!loading && !error && projects.length === 0 && (
        <p className="dashboard-empty">
          プロジェクトがまだありません。他プロジェクトに追加いただくか、新規作成してください。
        </p>
      )}

      {/* プロジェクトカード一覧。クリックでタスク一覧ページへ遷移する */}
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
            {/* タスク完了率をプログレスバーで表示 */}
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

      {/* プロジェクト作成モーダル。背景クリックで閉じる */}
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
                <ErrorMessage message={createError} className="modal-error" />
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
