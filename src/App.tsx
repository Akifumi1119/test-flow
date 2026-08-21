import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { AppLayout } from './layouts/AppLayout'
import { DashboardPage } from './pages/DashboardPage'
import { LoginPage } from './pages/LoginPage'
import { RegisterPage } from './pages/RegisterPage'
import { TaskRegisterPage } from './pages/TaskRegisterPage'
import { TasksPage } from './pages/TasksPage'

function PrivateRoute() {
  const token = localStorage.getItem('token')
  return token ? <Outlet /> : <Navigate to="/login" replace />
}

function App() {
  return (
    <BrowserRouter basename="/test-flow">
      <Routes>
        {/* 認証不要 */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* 認証済みページ（ヘッダーあり） */}
        <Route element={<PrivateRoute />}>
          <Route element={<AppLayout />}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/tasks" element={<TasksPage />} />
            <Route path="/task-register" element={<TaskRegisterPage />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
