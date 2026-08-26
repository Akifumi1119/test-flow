import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE } from "../utils/api";
import "./Header.css";

interface Props {
  userName: string;
  onNameUpdate: (name: string) => void;
}

interface UserProfile {
  name: string;
  email: string;
  projects: { project_id: number; project_name: string; authority: number }[];
}

const AUTHORITY_LABEL: Record<number, string> = {
  3: "管理者",
  2: "編集者",
  1: "メンバー",
};

const ADMIN_TOOLTIP =
  "管理者はプロジェクト退場することができません。管理者を変更してから再度お試しください";

export function Header({ userName, onNameUpdate }: Props) {
  const [open, setOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [removingProjectId, setRemovingProjectId] = useState<number | null>(
    null,
  );
  const [leaveError, setLeaveError] = useState<string | null>(null);

  const menuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const userId = localStorage.getItem("userId") ?? "";

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!profileOpen) return;
    let cancelled = false;
    const fetchProfile = async () => {
      setProfileLoading(true);
      setProfileError(null);
      setUserProfile(null);
      try {
        const res = await fetch(`${API_BASE}/api/users/${userId}`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token") ?? ""}`,
          },
        });
        if (cancelled) return;
        if (!res.ok) {
          setProfileError("プロフィールの取得に失敗しました");
          return;
        }
        const data: UserProfile = await res.json();
        if (!cancelled) {
          setUserProfile(data);
          setEditName(data.name);
          setEditEmail(data.email);
        }
      } catch {
        if (!cancelled) setProfileError("サーバーに接続できませんでした");
      } finally {
        if (!cancelled) setProfileLoading(false);
      }
    };
    fetchProfile();
    return () => {
      cancelled = true;
    };
  }, [profileOpen, userId]);

  const handleCloseProfile = () => {
    setProfileOpen(false);
    setSaveError(null);
    setLeaveError(null);
  };

  const handleSave = async () => {
    if (!editName.trim()) return;
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch(`${API_BASE}/api/users/${userId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token") ?? ""}`,
        },
        body: JSON.stringify({
          name: editName.trim(),
          email: editEmail.trim(),
        }),
      });
      if (res.status === 409) {
        setSaveError("このメールアドレスはすでに使用されています");
        return;
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setSaveError(data.message ?? "保存に失敗しました");
        return;
      }
      localStorage.setItem("userName", editName.trim());
      onNameUpdate(editName.trim());
      handleCloseProfile();
    } catch {
      setSaveError("サーバーに接続できませんでした");
    } finally {
      setSaving(false);
    }
  };

  const handleLeaveProject = async (projectId: number) => {
    const project = userProfile?.projects.find((p) => p.project_id === projectId);
    if (!project) return;
    setRemovingProjectId(projectId);
    setLeaveError(null);
    try {
      const res = await fetch(`${API_BASE}/api/users/${userId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token") ?? ""}`,
        },
        body: JSON.stringify({
          projects: [{ project_id: projectId, project_name: project.project_name }],
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setLeaveError(data.message ?? "プロジェクトの退場に失敗しました");
        return;
      }
      handleCloseProfile();
    } catch {
      setLeaveError("サーバーに接続できませんでした");
    } finally {
      setRemovingProjectId(null);
    }
  };

  const handleLogout = async () => {
    const token = localStorage.getItem("token");
    try {
      await fetch(`${API_BASE}/api/logout`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
    } finally {
      localStorage.removeItem("token");
      localStorage.removeItem("refresh_token");
      localStorage.removeItem("userName");
      setOpen(false);
      navigate("/login");
    }
  };

  const initial = userName.charAt(0).toUpperCase();

  return (
    <>
      <header className="header">
        <span className="header-logo">TaskFlow</span>

        <div className="header-user" ref={menuRef}>
          <button
            className="header-user-button"
            onClick={() => setOpen((prev) => !prev)}
            aria-expanded={open}
            aria-haspopup="menu"
          >
            <span className="header-avatar" aria-hidden="true">
              {initial}
            </span>
            <span className="header-username">{userName}</span>
            <svg
              className={`header-chevron ${open ? "open" : ""}`}
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M4 6l4 4 4-4"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>

          {open && (
            <div className="header-dropdown" role="menu">
              <button
                className="header-dropdown-item"
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  setProfileOpen(true);
                }}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                  aria-hidden="true"
                >
                  <circle
                    cx="8"
                    cy="5"
                    r="3"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  />
                  <path
                    d="M2 14c0-3.314 2.686-5 6-5s6 1.686 6 5"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
                プロフィール
              </button>
              <div className="header-dropdown-divider" role="separator" />
              <button
                className="header-dropdown-item danger"
                role="menuitem"
                onClick={handleLogout}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                  aria-hidden="true"
                >
                  <path
                    d="M6 2H3a1 1 0 00-1 1v10a1 1 0 001 1h3M10 11l3-3-3-3M13 8H6"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                ログアウト
              </button>
            </div>
          )}
        </div>
      </header>

      {profileOpen && (
        <div
          className="profile-backdrop"
          onClick={handleCloseProfile}
          aria-modal="true"
          role="dialog"
          aria-labelledby="profile-title"
        >
          <div className="profile-modal" onClick={(e) => e.stopPropagation()}>
            <h2 id="profile-title" className="profile-modal-title">
              プロフィール
            </h2>
            <button
              className="profile-close"
              onClick={handleCloseProfile}
              aria-label="閉じる"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 18 18"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M3 3l12 12M15 3L3 15"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
              </svg>
            </button>

            <div className="profile-avatar" aria-hidden="true">
              {initial}
            </div>

            {profileLoading && <p className="profile-loading">読み込み中...</p>}

            {profileError && (
              <p className="profile-error" role="alert">
                {profileError}
              </p>
            )}

            {!profileLoading && userProfile && (
              <>
                <div className="profile-fields">
                  <div className="profile-field">
                    <label htmlFor="profile-name">名前</label>
                    <input
                      id="profile-name"
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      disabled={saving}
                    />
                  </div>
                  <div className="profile-field">
                    <label htmlFor="profile-email">メールアドレス</label>
                    <input
                      id="profile-email"
                      type="email"
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                      disabled={saving}
                    />
                  </div>
                </div>

                {saveError && (
                  <p className="profile-save-error" role="alert">
                    {saveError}
                  </p>
                )}

                <button
                  className="profile-save-btn"
                  onClick={handleSave}
                  disabled={saving || !editName.trim()}
                >
                  {saving ? "保存中..." : "保存"}
                </button>

                {userProfile.projects.length > 0 && (
                  <div className="profile-projects">
                    <p className="profile-projects-label">所属プロジェクト</p>
                    {leaveError && (
                      <p className="profile-save-error" role="alert">
                        {leaveError}
                      </p>
                    )}
                    <ul className="profile-projects-list">
                      {userProfile.projects.map((p) => (
                        <li key={p.project_id} className="profile-project-item">
                          <span className="profile-project-name">
                            {p.project_name}
                          </span>
                          <div className="profile-project-right">
                            <span className="profile-project-authority">
                              {AUTHORITY_LABEL[p.authority] ??
                                `権限 ${p.authority}`}
                            </span>
                            {p.authority === 3 ? (
                              <span
                                className="profile-tooltip-wrapper"
                                data-tooltip={ADMIN_TOOLTIP}
                              >
                                <button
                                  className="profile-project-leave"
                                  disabled
                                  aria-label={`${p.project_name} から退場`}
                                >
                                  <svg
                                    width="14"
                                    height="14"
                                    viewBox="0 0 14 14"
                                    fill="none"
                                    aria-hidden="true"
                                  >
                                    <path
                                      d="M2 2l10 10M12 2L2 12"
                                      stroke="currentColor"
                                      strokeWidth="1.6"
                                      strokeLinecap="round"
                                    />
                                  </svg>
                                </button>
                              </span>
                            ) : (
                              <button
                                className="profile-project-leave"
                                onClick={() => handleLeaveProject(p.project_id)}
                                disabled={removingProjectId === p.project_id}
                                aria-label={`${p.project_name} から退場`}
                              >
                                {removingProjectId === p.project_id ? (
                                  <svg
                                    width="14"
                                    height="14"
                                    viewBox="0 0 14 14"
                                    fill="none"
                                    aria-hidden="true"
                                  >
                                    <circle
                                      cx="7"
                                      cy="7"
                                      r="5"
                                      stroke="currentColor"
                                      strokeWidth="1.6"
                                      strokeDasharray="20"
                                      strokeDashoffset="5"
                                    />
                                  </svg>
                                ) : (
                                  <svg
                                    width="14"
                                    height="14"
                                    viewBox="0 0 14 14"
                                    fill="none"
                                    aria-hidden="true"
                                  >
                                    <path
                                      d="M2 2l10 10M12 2L2 12"
                                      stroke="currentColor"
                                      strokeWidth="1.6"
                                      strokeLinecap="round"
                                    />
                                  </svg>
                                )}
                              </button>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
