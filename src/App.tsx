// アプリ全体のルーティング定義。
// React Router v7 の BrowserRouter を使用し、各ページへのルートを管理する。
// basename="/test-flow" を設定することで、GitHub Pages のサブパス配下でも正しく動作する。
import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { AppLayout } from './layouts/AppLayout'
import { DashboardPage } from './pages/DashboardPage'
import { LoginPage } from './pages/LoginPage'
import { RegisterPage } from './pages/RegisterPage'
import { TaskRegisterPage } from './pages/TaskRegisterPage'
import { TasksPage } from './pages/TasksPage'

// 認証ガード。
// localStorage に JWT トークンが存在しない場合はログインページにリダイレクトし、
// 未認証ユーザーが保護されたページに直接アクセスできないようにする。
function PrivateRoute() {
  const token = localStorage.getItem('token')
  return token ? <Outlet /> : <Navigate to="/login" replace />
}

function App() {
  return (
    // basename を指定して GitHub Pages のサブパスに対応
    <BrowserRouter basename="/test-flow">
      <Routes>
        {/* 認証不要なページ（ログイン・新規登録） */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* 認証済みユーザーのみアクセス可能なページ。AppLayout でヘッダーを共通表示する */}
        <Route element={<PrivateRoute />}>
          <Route element={<AppLayout />}>
            {/* ダッシュボード: 所属プロジェクト一覧 */}
            <Route path="/" element={<DashboardPage />} />
            {/* タスク一覧: ?project_id=&user_id= で対象プロジェクトを指定 */}
            <Route path="/tasks" element={<TasksPage />} />
            {/* タスク登録: ?project_id=&user_id= で対象プロジェクトを指定 */}
            <Route path="/task-register" element={<TaskRegisterPage />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
