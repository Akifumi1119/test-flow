import { type FormEvent, useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { formatDate } from "../utils/formatDate";
import "./TasksPage.css";

interface Task {
  task_id: number;
  title: string;
  status: number;
  created_by: string;
  user_name: string;
  created_at: string;
}

interface Member {
  user_id: number;
  name: string;
}

interface Comment {
  comment_id: number;
  content: string;
  created_by: string;
  created_by_id: number;
  created_at: string;
}

interface TaskDetail {
  task_id: number;
  title: string;
  status: number;
  content: string;
  comments: Comment[];
  created_by: string;
  user_name: string;
  created_at: string;
}

const STATUS_LABEL: Record<number, string> = {
  1: "未着手",
  2: "進行中",
  3: "完了",
};

function buildAuthHeaders() {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${localStorage.getItem("token") ?? ""}`,
  };
}

export function TasksPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const projectId = searchParams.get("project_id") ?? "";
  const userId = searchParams.get("user_id") ?? "";

  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [authority, setAuthority] = useState<number>(1);

  const [modalOpen, setModalOpen] = useState(false);

  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [taskDetail, setTaskDetail] = useState<TaskDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [commentInput, setCommentInput] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [commentError, setCommentError] = useState<string | null>(null);
  const [isEditingContent, setIsEditingContent] = useState(false);
  const [editContent, setEditContent] = useState("");
  const [editStatus, setEditStatus] = useState<number>(1);
  const [editAssigneeId, setEditAssigneeId] = useState<number>(0);
  const [savingContent, setSavingContent] = useState(false);
  const [saveContentError, setSaveContentError] = useState<string | null>(null);
  const [editingCommentId, setEditingCommentId] = useState<number | null>(null);
  const [editCommentText, setEditCommentText] = useState("");
  const [updatingComment, setUpdatingComment] = useState(false);
  const [updateCommentError, setUpdateCommentError] = useState<string | null>(null);
  const [confirmDeleteCommentId, setConfirmDeleteCommentId] = useState<number | null>(null);
  const [deletingCommentId, setDeletingCommentId] = useState<number | null>(null);
  const [confirmDeleteTask, setConfirmDeleteTask] = useState(false);
  const [deletingTask, setDeletingTask] = useState(false);

  const fetchTaskDetail = async (taskId: number) => {
    setDetailLoading(true);
    setDetailError(null);
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token") ?? ""}` },
      });
      if (res.status === 401) {
        handleUnauthorized();
        return;
      }
      const data = await res.json();
      if (!res.ok) {
        setDetailError(data.message ?? "タスク詳細の取得に失敗しました");
        return;
      }
      setTaskDetail(data);
    } catch {
      setDetailError("サーバーに接続できませんでした");
    } finally {
      setDetailLoading(false);
    }
  };

  const openDetailModal = async (task: Task) => {
    setDetailModalOpen(true);
    setTaskDetail(null);
    await Promise.all([fetchTaskDetail(task.task_id), fetchMembers()]);
  };

  const handleSaveContent = async (taskDetail: TaskDetail) => {
    setSavingContent(true);
    setSaveContentError(null);
    try {
      const res = await fetch(`/api/tasks/${taskDetail.task_id}`, {
        method: "PUT",
        headers: buildAuthHeaders(),
        body: JSON.stringify({
          user_id: Number(userId),
          task_id: taskDetail.task_id,
          title: taskDetail.title,
          content: editContent,
          status: editStatus,
          assignee_user_id: editAssigneeId,
        }),
      });
      if (res.status === 401) {
        handleUnauthorized();
        return;
      }
      const data = await res.json();
      if (!res.ok) {
        setSaveContentError(data.message ?? "タスクの更新に失敗しました");
        return;
      }
      setIsEditingContent(false);
      setEditContent("");
      await Promise.all([fetchTaskDetail(taskDetail.task_id), fetchTasks()]);
    } catch {
      setSaveContentError("サーバーに接続できませんでした");
    } finally {
      setSavingContent(false);
    }
  };

  const handleUpdateComment = async () => {
    if (!taskDetail || editingCommentId === null || !editCommentText.trim()) return;
    setUpdatingComment(true);
    setUpdateCommentError(null);
    try {
      const res = await fetch(`/api/comments/${editingCommentId}`, {
        method: "PUT",
        headers: buildAuthHeaders(),
        body: JSON.stringify({
          user_id: Number(localStorage.getItem("userId")),
          comment_id: editingCommentId,
          comment: editCommentText,
        }),
      });
      if (res.status === 401) {
        handleUnauthorized();
        return;
      }
      const data = await res.json();
      if (!res.ok) {
        setUpdateCommentError(data.message ?? "コメントの更新に失敗しました");
        return;
      }
      setEditingCommentId(null);
      setEditCommentText("");
      await fetchTaskDetail(taskDetail.task_id);
    } catch {
      setUpdateCommentError("サーバーに接続できませんでした");
    } finally {
      setUpdatingComment(false);
    }
  };

  const handleDeleteComment = async (commentId: number) => {
    if (!taskDetail) return;
    setDeletingCommentId(commentId);
    try {
      const res = await fetch(`/api/comments/${commentId}`, {
        method: "DELETE",
        headers: buildAuthHeaders(),
        body: JSON.stringify({
          user_id: Number(localStorage.getItem("userId")),
          comment_id: commentId,
        }),
      });
      if (res.status === 401) {
        handleUnauthorized();
        return;
      }
      const data = await res.json();
      if (!res.ok) {
        addToast(data.message ?? "コメントの削除に失敗しました");
        return;
      }
      setConfirmDeleteCommentId(null);
      addToast("コメントを削除しました");
      await fetchTaskDetail(taskDetail.task_id);
    } catch {
      addToast("サーバーに接続できませんでした");
    } finally {
      setDeletingCommentId(null);
    }
  };

  const handleDeleteTask = async () => {
    if (!taskDetail) return;
    setDeletingTask(true);
    try {
      const res = await fetch(`/api/tasks/${taskDetail.task_id}`, {
        method: "DELETE",
        headers: buildAuthHeaders(),
        body: JSON.stringify({
          user_id: Number(userId),
          task_id: taskDetail.task_id,
        }),
      });
      if (res.status === 401) {
        handleUnauthorized();
        return;
      }
      const data = await res.json();
      if (!res.ok) {
        addToast(data.message ?? "タスクの削除に失敗しました");
        return;
      }
      closeDetailModal();
      addToast("タスクを削除しました");
      await fetchTasks();
    } catch {
      addToast("サーバーに接続できませんでした");
    } finally {
      setDeletingTask(false);
    }
  };

  const handleSubmitComment = async () => {
    if (!taskDetail || !commentInput.trim()) return;
    setSubmittingComment(true);
    setCommentError(null);
    try {
      const res = await fetch(`/api/comments/${taskDetail.task_id}`, {
        method: "POST",
        headers: buildAuthHeaders(),
        body: JSON.stringify({
          user_id: Number(userId),
          task_id: taskDetail.task_id,
          comment: commentInput,
        }),
      });
      if (res.status === 401) {
        handleUnauthorized();
        return;
      }
      const data = await res.json();
      if (!res.ok) {
        setCommentError(data.message ?? "コメントの送信に失敗しました");
        return;
      }
      setCommentInput("");
      await fetchTaskDetail(taskDetail.task_id);
    } catch {
      setCommentError("サーバーに接続できませんでした");
    } finally {
      setSubmittingComment(false);
    }
  };

  const closeDetailModal = () => {
    setDetailModalOpen(false);
    setTaskDetail(null);
    setDetailError(null);
    setCommentInput("");
    setSubmittingComment(false);
    setCommentError(null);
    setEditingCommentId(null);
    setEditCommentText("");
    setUpdatingComment(false);
    setUpdateCommentError(null);
    setConfirmDeleteCommentId(null);
    setDeletingCommentId(null);
    setConfirmDeleteTask(false);
    setDeletingTask(false);
    setIsEditingContent(false);
    setEditContent("");
    setEditStatus(1);
    setEditAssigneeId(0);
    setSavingContent(false);
    setSaveContentError(null);
  };

  // トースト
  const [toasts, setToasts] = useState<{ id: number; message: string }[]>([]);
  const toastIdRef = useRef(0);
  const addToast = (message: string) => {
    const id = ++toastIdRef.current;
    setToasts((prev) => [...prev, { id, message }]);
    setTimeout(
      () => setToasts((prev) => prev.filter((t) => t.id !== id)),
      3000,
    );
  };

  // メンバー追加
  const [memberInput, setMemberInput] = useState("");
  const [memberChecking, setMemberChecking] = useState(false);
  const [pendingMembers, setPendingMembers] = useState<string[]>([]);

  // プロジェクト名編集
  const [editProjectName, setEditProjectName] = useState("");

  // 責任者変更
  const [ownerUserId, setOwnerUserId] = useState("");

  const [applying, setApplying] = useState(false);
  const [applyError, setApplyError] = useState<string | null>(null);

  // プロジェクト削除
  const [deleteConfirming, setDeleteConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [members, setMembers] = useState<Member[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);

  const handleUnauthorized = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("userName");
    localStorage.removeItem("userId");
    navigate("/login");
  };

  const fetchTasks = async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const res = await fetch(`/api/tasks?project_id=${Number(projectId)}`, {
        method: "GET",
        headers: buildAuthHeaders(),
      });
      if (res.status === 401) {
        handleUnauthorized();
        return;
      }
      const data = await res.json();
      if (!res.ok) {
        setFetchError(data.message ?? "タスクの取得に失敗しました");
        return;
      }
      setTasks(data);
    } catch {
      setFetchError("サーバーに接続できませんでした");
    } finally {
      setLoading(false);
    }
  };

  const fetchAuthority = async () => {
    try {
      const res = await fetch(
        `/api/projects/${projectId}/authority?user_id=${userId}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token") ?? ""}`,
          },
        },
      );
      if (res.status === 401) {
        handleUnauthorized();
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setAuthority(data.authority ?? 1);
      }
    } catch {
      // 取得失敗時はデフォルト（メンバー）として継続
    }
  };

  const initialized = useRef(false);
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    fetchTasks();
    fetchAuthority();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchMembers = async () => {
    setMembersLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/members`, {
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
      // 取得失敗時はプルダウンを空のまま継続
    } finally {
      setMembersLoading(false);
    }
  };

  const openModal = () => {
    setModalOpen(true);
    fetchMembers();
  };

  const closeModal = (force = false) => {
    if (!force && (applying || deleting)) return;
    setModalOpen(false);
    setMemberInput("");
    setPendingMembers([]);
    setEditProjectName("");
    setOwnerUserId("");
    setApplyError(null);
    setDeleteConfirming(false);
    setDeleteError(null);
  };

  const checkAndAddMember = async (email: string) => {
    if (!email) return;
    if (pendingMembers.includes(email)) {
      addToast("このユーザーはすでに追加済みです");
      return;
    }
    setMemberChecking(true);
    try {
      const res = await fetch(
        `/api/users/check?email=${encodeURIComponent(email)}&project_id=${Number(projectId)}`,
      );
      const data = await res.json();
      if (!res.ok) {
        addToast("ユーザーの確認に失敗しました");
        return;
      }
      if (data.exists === 2) {
        addToast("登録されていないユーザーです");
        return;
      }
      if (data.exists === 3) {
        addToast("このユーザーはすでにプロジェクトに所属済みです");
        return;
      }
      // data.exists === 1: 存在する → チップ追加
      setPendingMembers((prev) => [...prev, email]);
      setMemberInput("");
    } catch {
      addToast("ユーザーの確認に失敗しました");
    } finally {
      setMemberChecking(false);
    }
  };

  const handleMemberKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    checkAndAddMember(memberInput.trim());
  };

  const handleMemberBlur = () => {
    checkAndAddMember(memberInput.trim());
  };

  const removeMember = (email: string) => {
    setPendingMembers((prev) => prev.filter((m) => m !== email));
  };

  const handleApply = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setApplying(true);
    setApplyError(null);
    try {
      const res = await fetch("/api/projects", {
        method: "PUT",
        headers: buildAuthHeaders(),
        body: JSON.stringify({
          project_id: Number(projectId),
          manager: Number(ownerUserId),
          rename_project: editProjectName,
          members: pendingMembers,
        }),
      });
      if (res.status === 401) {
        handleUnauthorized();
        return;
      }
      const data = await res.json();
      if (!res.ok) {
        setApplyError(data.message ?? "設定の適用に失敗しました");
        return;
      }
      await fetchAuthority();
      closeModal(true);
    } catch {
      setApplyError("サーバーに接続できませんでした");
    } finally {
      setApplying(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    setDeleteError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token") ?? ""}`,
        },
      });
      if (res.status === 401) {
        handleUnauthorized();
        return;
      }
      const data = await res.json();
      if (!res.ok) {
        setDeleteError(data.message ?? "プロジェクトの削除に失敗しました");
        return;
      }
      navigate("/");
    } catch {
      setDeleteError("サーバーに接続できませんでした");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="tasks">
      {(applying || loading) && (
        <div className="tasks-overlay" aria-hidden="true">
          <div className="tasks-spinner" />
        </div>
      )}

      <div className="tasks-header">
        <button
          className="tasks-back-btn"
          onClick={() => navigate("/")}
          aria-label="ダッシュボードに戻る"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M10 3L5 8l5 5"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          戻る
        </button>

        <div className="tasks-header-actions">
          <button
            className="tasks-create-btn"
            onClick={() =>
              navigate(
                `/task-register?project_id=${projectId}&user_id=${userId}`,
              )
            }
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
            タスクを作成
          </button>

          {authority === 3 && (
            <button className="tasks-add-member-btn" onClick={openModal}>
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                aria-hidden="true"
              >
                <circle
                  cx="6"
                  cy="5"
                  r="3"
                  stroke="currentColor"
                  strokeWidth="1.5"
                />
                <path
                  d="M1 14c0-2.761 2.239-4 5-4s5 1.239 5 4"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
                <path
                  d="M12 7v4M14 9h-4"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
              プロジェクトの設定
            </button>
          )}
        </div>
      </div>

      {fetchError && (
        <p className="tasks-fetch-error" role="alert">
          {fetchError}
        </p>
      )}

      {!loading && !fetchError && tasks.length === 0 && (
        <p className="tasks-empty">タスクがまだありません。</p>
      )}

      {!loading && !fetchError && tasks.length > 0 && (
        <table className="tasks-table">
          <thead>
            <tr>
              <th>タイトル</th>
              <th>ステータス</th>
              <th>作成者</th>
              <th>担当者</th>
              <th>作成日時</th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((task) => (
              <tr
                key={task.task_id}
                onClick={() => openDetailModal(task)}
                style={{ cursor: "pointer" }}
              >
                <td>{task.title}</td>
                <td>
                  <span className={`tasks-status tasks-status--${task.status}`}>
                    {STATUS_LABEL[task.status] ?? task.status}
                  </span>
                </td>
                <td>{task.created_by}</td>
                <td>{task.user_name || "—"}</td>
                <td>{formatDate(task.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {modalOpen && (
        <div className="tasks-modal-backdrop" onClick={() => closeModal()}>
          <div
            className="tasks-modal"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="tasks-modal-title"
          >
            <h2 id="tasks-modal-title" className="tasks-modal-title">
              プロジェクトの設定
            </h2>

            <form
              onSubmit={handleApply}
              onKeyDown={(e) => {
                if (
                  e.key === "Enter" &&
                  (e.target as HTMLElement).tagName !== "BUTTON"
                ) {
                  e.preventDefault();
                }
              }}
            >
              {/* メンバーの追加 */}
              <section className="settings-section">
                <h3 className="settings-section-title">メンバーの追加</h3>
                <div className="tasks-field">
                  <label htmlFor="member-input">メールアドレス</label>
                  <input
                    id="member-input"
                    type="email"
                    value={memberInput}
                    onChange={(e) => setMemberInput(e.target.value)}
                    onKeyDown={handleMemberKeyDown}
                    onBlur={handleMemberBlur}
                    placeholder="example@example.com"
                    autoFocus
                    disabled={applying || memberChecking}
                  />
                </div>
                {pendingMembers.length > 0 && (
                  <div className="member-tags">
                    {pendingMembers.map((email) => (
                      <span key={email} className="member-tag">
                        {email}
                        <button
                          type="button"
                          className="member-tag-remove"
                          onClick={() => removeMember(email)}
                          aria-label={`${email}を削除`}
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </section>

              <hr className="settings-divider" />

              {/* プロジェクト名の編集 */}
              <section className="settings-section">
                <h3 className="settings-section-title">プロジェクト名の編集</h3>
                <div className="tasks-field">
                  <input
                    type="text"
                    value={editProjectName}
                    onChange={(e) => setEditProjectName(e.target.value)}
                    placeholder="新しいプロジェクト名"
                    disabled={applying}
                  />
                </div>
              </section>

              {/* プロジェクト責任者の変更 */}
              <section className="settings-section">
                <h3 className="settings-section-title">
                  プロジェクト責任者の変更
                </h3>
                <div className="tasks-field">
                  <select
                    id="owner-input"
                    value={ownerUserId}
                    onChange={(e) => setOwnerUserId(e.target.value)}
                    disabled={applying || membersLoading}
                    className="tasks-select"
                  >
                    <option value="">メンバーを選択</option>
                    {members.map((m) => (
                      <option key={m.user_id} value={m.user_id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </div>
              </section>

              <hr className="settings-divider" />

              {/* プロジェクトの削除 */}
              <section className="settings-section">
                <h3 className="settings-section-title settings-section-title--danger">
                  プロジェクトの削除
                </h3>
                {!deleteConfirming ? (
                  <button
                    type="button"
                    className="tasks-delete-btn"
                    onClick={() => setDeleteConfirming(true)}
                    disabled={applying || deleting}
                  >
                    このプロジェクトを削除する
                  </button>
                ) : (
                  <div className="tasks-delete-confirm">
                    <p className="tasks-delete-confirm-text">
                      本当に削除しますか？この操作は取り消せません。
                    </p>
                    {deleteError && (
                      <p className="tasks-modal-error" role="alert">
                        {deleteError}
                      </p>
                    )}
                    <div className="tasks-delete-confirm-actions">
                      <button
                        type="button"
                        className="tasks-modal-btn-cancel"
                        onClick={() => {
                          setDeleteConfirming(false);
                          setDeleteError(null);
                        }}
                        disabled={deleting}
                      >
                        キャンセル
                      </button>
                      <button
                        type="button"
                        className="tasks-delete-confirm-btn"
                        onClick={handleDelete}
                        disabled={deleting}
                      >
                        {deleting ? "削除中..." : "削除する"}
                      </button>
                    </div>
                  </div>
                )}
              </section>

              {applyError && (
                <p className="tasks-modal-error" role="alert">
                  {applyError}
                </p>
              )}

              <div className="tasks-modal-actions">
                <button
                  type="button"
                  className="tasks-modal-btn-cancel"
                  onClick={() => closeModal()}
                  disabled={applying}
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  className="tasks-modal-btn-submit"
                  disabled={
                    applying ||
                    memberChecking ||
                    (!editProjectName.trim() &&
                      !ownerUserId &&
                      pendingMembers.length === 0)
                  }
                >
                  {applying ? "適用中..." : "適用"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {detailModalOpen && (
        <div className="tasks-modal-backdrop" onClick={closeDetailModal}>
          <div
            className="tasks-modal tasks-detail-modal"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="task-detail-modal-title"
          >
            {detailLoading && (
              <p className="tasks-detail-loading">読み込み中...</p>
            )}
            {detailError && (
              <p className="tasks-modal-error" role="alert">{detailError}</p>
            )}

            {taskDetail && (
              <>
                <div className="tasks-detail-header">
                  <h2 id="task-detail-modal-title" className="tasks-detail-title">
                    {taskDetail.title}
                  </h2>
                  <div className="tasks-detail-meta">
                    {isEditingContent ? (
                      <select
                        className="tasks-select tasks-detail-status-select"
                        value={editStatus}
                        onChange={(e) => setEditStatus(Number(e.target.value))}
                        disabled={savingContent}
                      >
                        {Object.entries(STATUS_LABEL).map(([value, label]) => (
                          <option key={value} value={value}>{label}</option>
                        ))}
                      </select>
                    ) : (
                      <span className={`tasks-status tasks-status--${taskDetail.status}`}>
                        {STATUS_LABEL[taskDetail.status] ?? taskDetail.status}
                      </span>
                    )}
                    <p className="tasks-detail-meta-info">
                      作成者:{taskDetail.created_by} {formatDate(taskDetail.created_at)}
                    </p>
                    {isEditingContent ? (
                      <select
                        className="tasks-select tasks-detail-status-select"
                        value={editAssigneeId}
                        onChange={(e) => setEditAssigneeId(Number(e.target.value))}
                        disabled={savingContent || membersLoading}
                      >
                        <option value={0}>未割り当て</option>
                        {members.map((m) => (
                          <option key={m.user_id} value={m.user_id}>{m.name}</option>
                        ))}
                      </select>
                    ) : (
                      <p className="tasks-detail-meta-info">
                        担当者:{taskDetail.user_name || "未割り当て"}
                      </p>
                    )}
                    {isEditingContent ? (
                      <div className="tasks-detail-edit-actions">
                        <button
                          type="button"
                          className="tasks-modal-btn-cancel"
                          onClick={() => { setIsEditingContent(false); setEditContent(""); setSaveContentError(null); setConfirmDeleteTask(false); }}
                          disabled={savingContent || deletingTask}
                        >
                          キャンセル
                        </button>
                        <button
                          type="button"
                          className="tasks-modal-btn-submit"
                          onClick={() => handleSaveContent(taskDetail)}
                          disabled={savingContent || deletingTask}
                        >
                          {savingContent ? "保存中..." : "保存"}
                        </button>
                        {confirmDeleteTask ? (
                          <div className="tasks-detail-task-delete-confirm">
                            <span className="tasks-detail-task-delete-confirm-text">本当に削除しますか？</span>
                            <button
                              type="button"
                              className="tasks-modal-btn-cancel"
                              onClick={() => setConfirmDeleteTask(false)}
                              disabled={deletingTask}
                            >
                              キャンセル
                            </button>
                            <button
                              type="button"
                              className="tasks-delete-confirm-btn"
                              onClick={handleDeleteTask}
                              disabled={deletingTask}
                            >
                              {deletingTask ? "削除中..." : "OK"}
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            className="tasks-delete-btn"
                            onClick={() => setConfirmDeleteTask(true)}
                            disabled={savingContent || deletingTask}
                          >
                            タスクを削除
                          </button>
                        )}
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="tasks-detail-edit-btn"
                        onClick={() => {
                          setIsEditingContent(true);
                          setEditContent(taskDetail.content);
                          setEditStatus(taskDetail.status);
                          const current = members.find((m) => m.name === taskDetail.user_name);
                          setEditAssigneeId(current?.user_id ?? 0);
                        }}
                      >
                        編集
                      </button>
                    )}
                  </div>
                </div>

                {isEditingContent ? (
                  <>
                    <textarea
                      className="tasks-detail-comment-textarea"
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      rows={6}
                      autoFocus
                      disabled={savingContent}
                    />
                    {saveContentError && (
                      <p className="tasks-modal-error" role="alert">{saveContentError}</p>
                    )}
                  </>
                ) : (
                  <div className="tasks-detail-content">
                    {taskDetail.content || "—"}
                  </div>
                )}

                {taskDetail.comments.length > 0 && (
                  <ul className="tasks-detail-comments-list">
                    {[...taskDetail.comments].sort((a, b) => a.comment_id - b.comment_id).map((c) => (
                      <li key={c.comment_id} className="tasks-detail-comment-item">
                        <div className="tasks-detail-comment-body">
                          <div className="tasks-detail-comment-meta">
                            <span className="tasks-detail-comment-author">{c.created_by}</span>
                            <span className="tasks-detail-comment-date">{formatDate(c.created_at)}</span>
                          </div>
                          {editingCommentId === c.comment_id ? (
                            <>
                              <textarea
                                className="tasks-detail-comment-edit-textarea"
                                value={editCommentText}
                                onChange={(e) => setEditCommentText(e.target.value)}
                                rows={3}
                                autoFocus
                                disabled={updatingComment}
                              />
                              {updateCommentError && (
                                <p className="tasks-modal-error" role="alert">{updateCommentError}</p>
                              )}
                              <div className="tasks-detail-comment-edit-actions">
                                <button
                                  type="button"
                                  className="tasks-modal-btn-cancel"
                                  onClick={() => { setEditingCommentId(null); setEditCommentText(""); setUpdateCommentError(null); }}
                                  disabled={updatingComment}
                                >
                                  キャンセル
                                </button>
                                <button
                                  type="button"
                                  className="tasks-modal-btn-submit"
                                  onClick={handleUpdateComment}
                                  disabled={updatingComment || !editCommentText.trim()}
                                >
                                  {updatingComment ? "更新中..." : "更新"}
                                </button>
                              </div>
                            </>
                          ) : (
                            <span className="tasks-detail-comment-text">{c.content}</span>
                          )}
                        </div>
                        {c.created_by_id === Number(localStorage.getItem("userId")) && editingCommentId !== c.comment_id && (
                          confirmDeleteCommentId === c.comment_id ? (
                            <div className="tasks-detail-comment-delete-confirm">
                              <span className="tasks-detail-comment-delete-confirm-text">削除しますか？</span>
                              <button
                                type="button"
                                className="tasks-modal-btn-cancel"
                                onClick={() => setConfirmDeleteCommentId(null)}
                                disabled={deletingCommentId === c.comment_id}
                              >
                                キャンセル
                              </button>
                              <button
                                type="button"
                                className="tasks-detail-comment-delete-btn"
                                onClick={() => handleDeleteComment(c.comment_id)}
                                disabled={deletingCommentId === c.comment_id}
                              >
                                {deletingCommentId === c.comment_id ? "削除中..." : "OK"}
                              </button>
                            </div>
                          ) : (
                            <div className="tasks-detail-comment-actions">
                              <button
                                type="button"
                                className="tasks-detail-comment-edit-btn"
                                onClick={() => { setEditingCommentId(c.comment_id); setEditCommentText(c.content); setUpdateCommentError(null); }}
                              >
                                編集
                              </button>
                              <button
                                type="button"
                                className="tasks-detail-comment-delete-btn"
                                onClick={() => setConfirmDeleteCommentId(c.comment_id)}
                              >
                                削除
                              </button>
                            </div>
                          )
                        )}
                      </li>
                    ))}
                  </ul>
                )}

                <textarea
                  className="tasks-detail-comment-textarea"
                  value={commentInput}
                  onChange={(e) => setCommentInput(e.target.value)}
                  placeholder="コメントを入力"
                  rows={4}
                  disabled={submittingComment}
                />

                {commentError && (
                  <p className="tasks-modal-error" role="alert">{commentError}</p>
                )}

                <div className="tasks-detail-submit-row">
                  <button
                    type="button"
                    className="tasks-detail-submit-btn"
                    onClick={handleSubmitComment}
                    disabled={submittingComment || !commentInput.trim()}
                  >
                    {submittingComment ? "送信中..." : "送信"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {toasts.length > 0 && (
        <div className="tasks-toast-container" aria-live="polite">
          {toasts.map((t) => (
            <div key={t.id} className="tasks-toast">
              {t.message}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
