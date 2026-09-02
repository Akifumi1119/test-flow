// タスク一覧ページ。
// URL パラメータ（project_id・user_id）で対象プロジェクトを特定し、
// そのプロジェクトのタスク一覧を表示する。
// タイトル検索・ステータス・担当者・作成者によるクライアントサイド絞り込みに対応する。
// タスクをクリックすると詳細モーダルが開き、内容の編集・コメント投稿・タスク削除ができる。
// 管理者（authority === 3）はプロジェクト設定モーダルからメンバー追加・名前変更・責任者変更・プロジェクト削除が行える。
import { API_BASE } from "../utils/api";
import { type FormEvent, useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { formatDate } from "../utils/formatDate";
import { ErrorMessage } from "../components/ErrorMessage";
import { LoadingOverlay } from "../components/Spinner";
import "./TasksPage.css";

interface Task {
  task_id: number;
  title: string;
  status: number;
  priority: number | null;
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
  priority: number | null;
  content: string;
  comments: Comment[];
  created_by: string;
  created_by_id: number;
  user_name: string;
  created_at: string;
}

const STATUS_LABEL: Record<number, string> = {
  1: "未着手",
  2: "進行中",
  3: "完了",
};

const PRIORITY_LABEL: Record<number, string> = {
  1: "緊急",
  2: "高",
  3: "中",
  4: "低",
};

const PRIORITY_TO_STRING: Record<number, string> = {
  1: "urgent",
  2: "high",
  3: "medium",
  4: "low",
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

  // フィルター state。値が空文字のときはその項目の絞り込みを行わない。
  // filterTitle: タイトル部分一致検索（クライアントサイド）
  // filterStatus: ステータス絞り込み（1=未着手 2=進行中 3=完了）
  // filterAssignee: 担当者名で絞り込み。UNASSIGNED 定数を指定すると未割り当てタスクのみ表示
  // filterCreator: 作成者名で絞り込み
  const [filterTitle, setFilterTitle] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterAssignee, setFilterAssignee] = useState("");
  const [filterCreator, setFilterCreator] = useState("");
  // showSuggestions: タイトル検索のサジェストドロップダウンの表示状態
  const [showSuggestions, setShowSuggestions] = useState(false);
  // searchWrapRef: サジェストドロップダウン外クリック検知のための参照
  const searchWrapRef = useRef<HTMLDivElement>(null);

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
  const [editPriority, setEditPriority] = useState<string>("");
  const [savingContent, setSavingContent] = useState(false);
  const [saveContentError, setSaveContentError] = useState<string | null>(null);
  const [editingCommentId, setEditingCommentId] = useState<number | null>(null);
  const [editCommentText, setEditCommentText] = useState("");
  const [updatingComment, setUpdatingComment] = useState(false);
  const [updateCommentError, setUpdateCommentError] = useState<string | null>(
    null,
  );
  const [confirmDeleteCommentId, setConfirmDeleteCommentId] = useState<
    number | null
  >(null);
  const [deletingCommentId, setDeletingCommentId] = useState<number | null>(
    null,
  );
  const [confirmDeleteTask, setConfirmDeleteTask] = useState(false);
  const [deletingTask, setDeletingTask] = useState(false);

  // タスク詳細取得。
  // GET /api/tasks/:taskId でタスクの詳細情報（内容・コメント一覧等）を取得する。
  // 詳細モーダルを開くときと、タスク編集・コメント操作後の再取得に使用する。
  const fetchTaskDetail = async (taskId: number) => {
    setDetailLoading(true);
    setDetailError(null);
    try {
      const res = await fetch(`${API_BASE}/api/tasks/${taskId}`, {
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

  // タスク詳細モーダルを開く。
  // タスク詳細取得とメンバー一覧取得を並行実行することで表示を高速化する。
  // メンバー一覧は担当者変更のプルダウンに使用する。
  const openDetailModal = async (task: Task) => {
    setDetailModalOpen(true);
    setTaskDetail(null);
    await Promise.all([fetchTaskDetail(task.task_id), fetchMembers()]);
  };

  // タスク内容の更新処理。
  // PUT /api/tasks/:taskId に説明・ステータス・担当者IDを送信して更新する。
  // 更新成功後はタスク詳細と一覧を並行再取得することで画面を最新状態に保つ。
  const handleSaveContent = async (taskDetail: TaskDetail) => {
    setSavingContent(true);
    setSaveContentError(null);
    try {
      const res = await fetch(`${API_BASE}/api/tasks/${taskDetail.task_id}`, {
        method: "PUT",
        headers: buildAuthHeaders(),
        body: JSON.stringify({
          user_id: Number(userId),
          task_id: taskDetail.task_id,
          title: taskDetail.title,
          content: editContent,
          status: editStatus,
          assignee_user_id: editAssigneeId,
          priority: editPriority,
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
      // タスク詳細を再取得
      await Promise.all([fetchTaskDetail(taskDetail.task_id), fetchTasks()]);
    } catch {
      setSaveContentError("サーバーに接続できませんでした");
    } finally {
      setSavingContent(false);
    }
  };

  // コメント更新処理。
  // PUT /api/comments/:commentId に編集後のコメントテキストを送信する。
  // 更新成功後はタスク詳細を再取得してコメント一覧を最新化する。
  // 自分のコメントのみ編集できる（UI 側で created_by_id と現在のユーザーIDを比較して表示制御）。
  const handleUpdateComment = async () => {
    if (!taskDetail || editingCommentId === null || !editCommentText.trim())
      return;
    setUpdatingComment(true);
    setUpdateCommentError(null);
    try {
      const res = await fetch(`${API_BASE}/api/comments/${editingCommentId}`, {
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
      // コメントを再取得するためにタスク詳細を再取得
      await fetchTaskDetail(taskDetail.task_id);
    } catch {
      setUpdateCommentError("サーバーに接続できませんでした");
    } finally {
      setUpdatingComment(false);
    }
  };

  // コメント削除処理。
  // DELETE /api/comments/:commentId を呼び出してコメントを削除する。
  // 削除成功後はトースト通知を表示してタスク詳細を再取得する。
  // エラー時もトーストで通知する（モーダルを閉じずにインライン表示しないため）。
  const handleDeleteComment = async (commentId: number) => {
    if (!taskDetail) return;
    setDeletingCommentId(commentId);
    try {
      const res = await fetch(`${API_BASE}/api/comments/${commentId}`, {
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
      // コメントを再取得するためにタスク詳細を再取得
      await fetchTaskDetail(taskDetail.task_id);
    } catch {
      addToast("サーバーに接続できませんでした");
    } finally {
      setDeletingCommentId(null);
    }
  };

  // タスク削除処理。
  // DELETE /api/tasks/:taskId を呼び出してタスクを削除する。
  // 削除成功後は詳細モーダルを閉じ、トースト通知を表示してタスク一覧を再取得する。
  const handleDeleteTask = async () => {
    if (!taskDetail) return;
    setDeletingTask(true);
    try {
      const res = await fetch(`${API_BASE}/api/tasks/${taskDetail.task_id}`, {
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
      // タスク一覧を再取得
      await fetchTasks();
    } catch {
      addToast("サーバーに接続できませんでした");
    } finally {
      setDeletingTask(false);
    }
  };

  // コメント投稿処理。
  // POST /api/comments/:taskId にコメントテキストを送信する。
  // 投稿成功後は入力欄をクリアしてタスク詳細を再取得することでコメント一覧を更新する。
  const handleSubmitComment = async () => {
    if (!taskDetail || !commentInput.trim()) return;
    setSubmittingComment(true);
    setCommentError(null);
    try {
      const res = await fetch(
        `${API_BASE}/api/comments/${taskDetail.task_id}`,
        {
          method: "POST",
          headers: buildAuthHeaders(),
          body: JSON.stringify({
            user_id: Number(userId),
            task_id: taskDetail.task_id,
            comment: commentInput,
          }),
        },
      );
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
      // コメントを再取得するためにタスク詳細を再取得
      await fetchTaskDetail(taskDetail.task_id);
    } catch {
      setCommentError("サーバーに接続できませんでした");
    } finally {
      setSubmittingComment(false);
    }
  };

  // タスク詳細モーダルを閉じ、モーダル内で使用するすべての state をリセットする。
  // 編集中の内容・コメント・確認ダイアログなどが残らないようにすべての関連 state を初期値に戻す。
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
    setEditPriority("");
    setSavingContent(false);
    setSaveContentError(null);
  };

  // 画面下部に一時的なトースト通知を表示する仕組み。
  // addToast でメッセージを追加し、3秒後に自動で消える。
  // 複数のトーストを同時表示できるよう ID で管理する。
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
  const [pendingMembers, setPendingMembers] = useState<
    { email: string; name: string }[]
  >([]);

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

  // 認証エラー（401）発生時の共通処理。
  // localStorage のトークンをすべて削除してログインページへリダイレクトする。
  const handleUnauthorized = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("userName");
    localStorage.removeItem("userId");
    navigate("/login");
  };

  // タスク一覧を取得する。
  // GET /api/tasks?project_id=... でプロジェクトの全タスクを取得する。
  // 絞り込みはクライアントサイドで行うため、API には常に全件リクエストを送る。
  // 取得したタスクから担当者名・作成者名を抽出してフィルタードロップダウンの選択肢を生成する。
  const fetchTasks = async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const res = await fetch(
        `${API_BASE}/api/tasks?project_id=${Number(projectId)}`,
        {
          method: "GET",
          headers: buildAuthHeaders(),
        },
      );
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

  // ログインユーザーのプロジェクト権限を取得する。
  // GET /api/projects/:projectId/authority?user_id=... で権限値（1=メンバー 2=編集者 3=管理者）を取得する。
  // authority === 3（管理者）の場合のみ「プロジェクトの設定」ボタンを表示する。
  // 取得失敗時はデフォルトの 1（メンバー）として扱い、設定ボタンを非表示にする。
  const fetchAuthority = async () => {
    try {
      const res = await fetch(
        `${API_BASE}/api/projects/${projectId}/authority?user_id=${userId}`,
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

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        searchWrapRef.current &&
        !searchWrapRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // タブの名前
  useEffect(() => {
    document.title = "タスク一覧 - TaskFlow";
  }, []);

  // すべてのフィルターをリセットしてタスク一覧全件を表示する。
  const clearFilters = () => {
    setFilterTitle("");
    setFilterStatus("");
    setFilterAssignee("");
    setFilterCreator("");
  };

  // 未割り当てタスクを担当者フィルターで選択するためのセンチネル値。
  // 空文字は「すべて（フィルターなし）」と区別するために専用の定数を使用する。
  const UNASSIGNED = "__unassigned__";

  // フィルター条件を tasks 配列に適用して表示対象のタスクを絞り込む派生データ。
  // API を呼び出さずクライアントサイドで処理するため、フィルター変更時も高速に反映される。
  const filteredTasks = tasks.filter((task) => {
    if (
      filterTitle &&
      !task.title.toLowerCase().includes(filterTitle.toLowerCase())
    )
      return false;
    if (filterStatus && task.status !== Number(filterStatus)) return false;
    if (filterAssignee) {
      if (filterAssignee === UNASSIGNED) {
        if (task.user_name) return false;
      } else {
        if (task.user_name !== filterAssignee) return false;
      }
    }
    if (filterCreator && task.created_by !== filterCreator) return false;
    return true;
  });

  // 未割り当てタスクが存在するかどうか。true の場合にのみ担当者フィルターに「未割り当て」選択肢を表示する。
  const hasUnassigned = tasks.some((t) => !t.user_name);
  // タスク一覧から重複を除いた担当者名の配列。フィルタードロップダウンの選択肢として使用する。
  const assigneeOptions = [
    ...new Set(tasks.map((t) => t.user_name).filter(Boolean)),
  ];
  // タスク一覧から重複を除いた作成者名の配列。フィルタードロップダウンの選択肢として使用する。
  const creatorOptions = [
    ...new Set(tasks.map((t) => t.created_by).filter(Boolean)),
  ];
  // タイトル検索入力値に部分一致するタスクタイトルの候補一覧。インクリメンタルサーチのサジェストに使用する。
  const titleSuggestions = filterTitle
    ? [
        ...new Set(
          tasks
            .map((t) => t.title)
            .filter((title) =>
              title.toLowerCase().includes(filterTitle.toLowerCase()),
            ),
        ),
      ]
    : [];

  const initialized = useRef(false);
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    fetchTasks();
    fetchAuthority();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // プロジェクトメンバー一覧を取得する。
  // GET /api/projects/:projectId/members を呼び出す。
  // タスク詳細モーダルの担当者変更プルダウンと、プロジェクト設定モーダルの責任者変更プルダウンで共用する。
  // 詳細モーダルを開くときと、プロジェクト設定モーダルを開くときに呼び出す。
  const fetchMembers = async () => {
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
      // 取得失敗時はプルダウンを空のまま継続
    } finally {
      setMembersLoading(false);
    }
  };

  // プロジェクト設定モーダルを開く。同時にメンバー一覧を取得して責任者変更のプルダウンを準備する。
  const openModal = () => {
    setModalOpen(true);
    fetchMembers();
  };

  // プロジェクト設定モーダルを閉じ、入力内容をリセットする。
  // force=true のとき API 送信中でも強制的に閉じる（設定適用成功後など）。
  // force=false のとき applying または deleting 中は閉じない。
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

  // メンバー追加前のユーザー存在確認。
  // GET /api/users/check?email=...&project_id=... でメールアドレスの登録状況を確認する。
  // exists の値によって次の動作が変わる:
  //   1 = 存在するユーザー → pendingMembers に追加してチップ表示
  //   2 = 未登録ユーザー → トーストでエラー表示
  //   3 = すでにプロジェクトに所属 → トーストでエラー表示
  // pendingMembers はフォーム送信時に一括でメンバー追加リクエストを送るための一時リスト。
  const checkAndAddMember = async (email: string) => {
    if (!email) return;
    if (pendingMembers.some((m) => m.email === email)) {
      addToast("このユーザーはすでに追加済みです");
      return;
    }
    setMemberChecking(true);
    try {
      const res = await fetch(
        `${API_BASE}/api/users/check?email=${encodeURIComponent(email)}&project_id=${Number(projectId)}`,
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
      // data.exists === 1の場合、存在する → チップ追加。チップ表示は name、API 送信は email を使う
      setPendingMembers((prev) => [...prev, { email, name: data.name }]);
      setMemberInput("");
    } catch {
      addToast("ユーザーの確認に失敗しました");
    } finally {
      setMemberChecking(false);
    }
  };

  // メンバーの追加にてEnterキーで該当ユーザーの存在確認を発火
  const handleMemberKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    checkAndAddMember(memberInput.trim());
  };
  // メンバーの追加にてフォーカスアウトで該当ユーザーの存在確認を発火
  const handleMemberBlur = () => {
    checkAndAddMember(memberInput.trim());
  };
  // 追加メンバーのチップを削除
  const removeMember = (email: string) => {
    setPendingMembers((prev) => prev.filter((m) => m.email !== email));
  };

  // プロジェクト設定更新処理。
  // PUT /api/projects にメンバー追加・プロジェクト名変更・責任者変更をまとめて送信する。
  // 入力された項目のみが反映され、未入力項目は変更されない（サーバー側の仕様）。
  // 成功後は権限情報を再取得して責任者変更が自分に影響する場合に設定ボタンを非表示にする。
  const handleApply = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setApplying(true);
    setApplyError(null);
    try {
      const res = await fetch(`${API_BASE}/api/projects`, {
        method: "PUT",
        headers: buildAuthHeaders(),
        body: JSON.stringify({
          project_id: Number(projectId),
          manager: Number(ownerUserId),
          rename_project: editProjectName,
          members: pendingMembers.map((m) => m.email),
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
      // 権限情報を再取得
      await fetchAuthority();
      closeModal(true);
    } catch {
      setApplyError("サーバーに接続できませんでした");
    } finally {
      setApplying(false);
    }
  };

  // プロジェクト削除処理。
  // DELETE /api/projects/:projectId を呼び出してプロジェクトを削除する。
  // 削除成功後はダッシュボード（/）へ遷移する。
  // 管理者（authority === 3）のみ実行できる（UI 側でプロジェクト設定モーダルへのアクセスを制限）。
  const handleDelete = async () => {
    setDeleting(true);
    setDeleteError(null);
    try {
      const res = await fetch(`${API_BASE}/api/projects/${projectId}`, {
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
      // プロジェクト一覧に遷移
      navigate("/");
    } catch {
      setDeleteError("サーバーに接続できませんでした");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="tasks">
      {(applying || loading) && <LoadingOverlay />}

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
        <ErrorMessage message={fetchError} className="tasks-fetch-error" />
      )}

      {!fetchError && (
        <div className="tasks-filter-bar">
          <div className="tasks-filter-search-wrap" ref={searchWrapRef}>
            <svg
              className="tasks-filter-search-icon"
              width="14"
              height="14"
              viewBox="0 0 16 16"
              fill="none"
              aria-hidden="true"
            >
              <circle
                cx="6.5"
                cy="6.5"
                r="4.5"
                stroke="currentColor"
                strokeWidth="1.5"
              />
              <path
                d="M10 10l3.5 3.5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
            <input
              type="search"
              className="tasks-filter-search"
              value={filterTitle}
              onChange={(e) => {
                setFilterTitle(e.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              placeholder="タイトルで検索"
              disabled={loading}
              aria-label="タイトルで検索"
              aria-autocomplete="list"
              autoComplete="off"
            />
            {showSuggestions && titleSuggestions.length > 0 && (
              <ul className="tasks-filter-suggestions" role="listbox">
                {titleSuggestions.map((title) => (
                  <li
                    key={title}
                    className="tasks-filter-suggestion-item"
                    role="option"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      setFilterTitle(title);
                      setShowSuggestions(false);
                    }}
                  >
                    {title}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <select
            className="tasks-filter-select"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            disabled={loading}
          >
            <option value="">ステータス: すべて</option>
            {Object.entries(STATUS_LABEL).map(([val, label]) => (
              <option key={val} value={val}>
                {label}
              </option>
            ))}
          </select>
          <select
            className="tasks-filter-select"
            value={filterAssignee}
            onChange={(e) => setFilterAssignee(e.target.value)}
            disabled={loading}
          >
            <option value="">担当者: すべて</option>
            {hasUnassigned && <option value={UNASSIGNED}>未割り当て</option>}
            {assigneeOptions.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
          <select
            className="tasks-filter-select"
            value={filterCreator}
            onChange={(e) => setFilterCreator(e.target.value)}
            disabled={loading}
          >
            <option value="">作成者: すべて</option>
            {creatorOptions.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
          {(filterTitle || filterStatus || filterAssignee || filterCreator) && (
            <button className="tasks-filter-clear" onClick={clearFilters}>
              絞り込みを解除
            </button>
          )}
        </div>
      )}

      {!loading && !fetchError && filteredTasks.length === 0 && (
        <p className="tasks-empty">
          {tasks.length === 0
            ? "タスクがまだありません。"
            : "条件に一致するタスクがありません。"}
        </p>
      )}

      {!loading && !fetchError && filteredTasks.length > 0 && (
        <table className="tasks-table">
          <thead>
            <tr>
              <th>タイトル</th>
              <th>ステータス</th>
              <th>優先度</th>
              <th>作成者</th>
              <th>担当者</th>
              <th>作成日時</th>
            </tr>
          </thead>
          <tbody>
            {filteredTasks.map((task) => (
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
                <td>
                  {task.priority !== null && task.priority !== undefined ? (
                    <span
                      className={`tasks-priority tasks-priority--${task.priority}`}
                    >
                      {PRIORITY_LABEL[task.priority] ?? task.priority}
                    </span>
                  ) : (
                    "—"
                  )}
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
        <div className="tasks-modal-backdrop">
          <div
            className="tasks-modal"
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
                    {pendingMembers.map((m) => (
                      <span key={m.email} className="member-tag">
                        {m.name}
                        <button
                          type="button"
                          className="member-tag-remove"
                          onClick={() => removeMember(m.email)}
                          aria-label={`${m.name}を削除`}
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
                      <ErrorMessage
                        message={deleteError}
                        className="tasks-modal-error"
                      />
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
                <ErrorMessage
                  message={applyError}
                  className="tasks-modal-error"
                />
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
        <div className="tasks-modal-backdrop">
          <div
            className="tasks-modal tasks-detail-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="task-detail-modal-title"
          >
            {detailLoading && (
              <p className="tasks-detail-loading">読み込み中...</p>
            )}
            {detailError && (
              <ErrorMessage
                message={detailError}
                className="tasks-modal-error"
              />
            )}

            {taskDetail && (
              <>
                <div className="tasks-detail-header">
                  <h2
                    id="task-detail-modal-title"
                    className="tasks-detail-title"
                  >
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
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span
                        className={`tasks-status tasks-status--${taskDetail.status}`}
                      >
                        {STATUS_LABEL[taskDetail.status] ?? taskDetail.status}
                      </span>
                    )}
                    {isEditingContent ? (
                      <select
                        className="tasks-select tasks-detail-status-select"
                        value={editPriority}
                        onChange={(e) => setEditPriority(e.target.value)}
                        disabled={savingContent}
                      >
                        <option value="urgent">緊急</option>
                        <option value="high">高</option>
                        <option value="medium">中</option>
                        <option value="low">低</option>
                        <option value="">指定なし</option>
                      </select>
                    ) : (
                      <p className="tasks-detail-meta-info">
                        優先度：
                        {taskDetail.priority !== null &&
                        taskDetail.priority !== undefined ? (
                          <span
                            className={`tasks-priority tasks-priority--${taskDetail.priority}`}
                          >
                            {PRIORITY_LABEL[taskDetail.priority] ??
                              taskDetail.priority}
                          </span>
                        ) : (
                          "—"
                        )}
                      </p>
                    )}
                    <p className="tasks-detail-meta-info">
                      作成者:{taskDetail.created_by}{" "}
                      {formatDate(taskDetail.created_at)}
                    </p>
                    {isEditingContent ? (
                      <select
                        className="tasks-select tasks-detail-status-select"
                        value={editAssigneeId}
                        onChange={(e) =>
                          setEditAssigneeId(Number(e.target.value))
                        }
                        disabled={savingContent || membersLoading}
                      >
                        <option value={0}>未割り当て</option>
                        {members.map((m) => (
                          <option key={m.user_id} value={m.user_id}>
                            {m.name}
                          </option>
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
                          onClick={() => {
                            setIsEditingContent(false);
                            setEditContent("");
                            setEditPriority("");
                            setSaveContentError(null);
                            setConfirmDeleteTask(false);
                          }}
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
                            <span className="tasks-detail-task-delete-confirm-text">
                              本当に削除しますか？
                            </span>
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
                          const current = members.find(
                            (m) => m.name === taskDetail.user_name,
                          );
                          setEditAssigneeId(current?.user_id ?? 0);
                          setEditPriority(
                            taskDetail.priority !== null && taskDetail.priority !== undefined
                              ? (PRIORITY_TO_STRING[taskDetail.priority] ?? "")
                              : "",
                          );
                        }}
                      >
                        編集
                      </button>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  className="tasks-detail-close-btn"
                  onClick={closeDetailModal}
                  aria-label="タスク詳細を閉じる"
                >
                  ×
                </button>

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
                      <ErrorMessage
                        message={saveContentError}
                        className="tasks-modal-error"
                      />
                    )}
                  </>
                ) : (
                  <div className="tasks-detail-content">
                    {taskDetail.content || "—"}
                  </div>
                )}

                {taskDetail.comments.length > 0 && (
                  <ul className="tasks-detail-comments-list">
                    {[...taskDetail.comments]
                      .sort((a, b) => a.comment_id - b.comment_id)
                      .map((c) => (
                        <li
                          key={c.comment_id}
                          className="tasks-detail-comment-item"
                        >
                          <div className="tasks-detail-comment-body">
                            <div className="tasks-detail-comment-meta">
                              <span className="tasks-detail-comment-author">
                                {c.created_by}
                              </span>
                              <span className="tasks-detail-comment-date">
                                {formatDate(c.created_at)}
                              </span>
                            </div>
                            {editingCommentId === c.comment_id ? (
                              <>
                                <textarea
                                  className="tasks-detail-comment-edit-textarea"
                                  value={editCommentText}
                                  onChange={(e) =>
                                    setEditCommentText(e.target.value)
                                  }
                                  rows={3}
                                  autoFocus
                                  disabled={updatingComment}
                                />
                                {updateCommentError && (
                                  <ErrorMessage
                                    message={updateCommentError}
                                    className="tasks-modal-error"
                                  />
                                )}
                                <div className="tasks-detail-comment-edit-actions">
                                  <button
                                    type="button"
                                    className="tasks-modal-btn-cancel"
                                    onClick={() => {
                                      setEditingCommentId(null);
                                      setEditCommentText("");
                                      setUpdateCommentError(null);
                                    }}
                                    disabled={updatingComment}
                                  >
                                    キャンセル
                                  </button>
                                  <button
                                    type="button"
                                    className="tasks-modal-btn-submit"
                                    onClick={handleUpdateComment}
                                    disabled={
                                      updatingComment || !editCommentText.trim()
                                    }
                                  >
                                    {updatingComment ? "更新中..." : "更新"}
                                  </button>
                                </div>
                              </>
                            ) : (
                              <span className="tasks-detail-comment-text">
                                {c.content}
                              </span>
                            )}
                          </div>
                          {c.created_by_id ===
                            Number(localStorage.getItem("userId")) &&
                            editingCommentId !== c.comment_id &&
                            (confirmDeleteCommentId === c.comment_id ? (
                              <div className="tasks-detail-comment-delete-confirm">
                                <span className="tasks-detail-comment-delete-confirm-text">
                                  削除しますか？
                                </span>
                                <button
                                  type="button"
                                  className="tasks-modal-btn-cancel"
                                  onClick={() =>
                                    setConfirmDeleteCommentId(null)
                                  }
                                  disabled={deletingCommentId === c.comment_id}
                                >
                                  キャンセル
                                </button>
                                <button
                                  type="button"
                                  className="tasks-detail-comment-delete-btn"
                                  onClick={() =>
                                    handleDeleteComment(c.comment_id)
                                  }
                                  disabled={deletingCommentId === c.comment_id}
                                >
                                  {deletingCommentId === c.comment_id
                                    ? "削除中..."
                                    : "OK"}
                                </button>
                              </div>
                            ) : (
                              <div className="tasks-detail-comment-actions">
                                <button
                                  type="button"
                                  className="tasks-detail-comment-edit-btn"
                                  onClick={() => {
                                    setEditingCommentId(c.comment_id);
                                    setEditCommentText(c.content);
                                    setUpdateCommentError(null);
                                  }}
                                >
                                  編集
                                </button>
                                <button
                                  type="button"
                                  className="tasks-detail-comment-delete-btn"
                                  onClick={() =>
                                    setConfirmDeleteCommentId(c.comment_id)
                                  }
                                >
                                  削除
                                </button>
                              </div>
                            ))}
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
                  <ErrorMessage
                    message={commentError}
                    className="tasks-modal-error"
                  />
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
