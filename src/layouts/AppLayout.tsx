import { Outlet } from 'react-router-dom'
import { Header } from '../components/Header'
import './AppLayout.css'

export function AppLayout() {
  const userName = localStorage.getItem('userName') ?? ''

  return (
    <div className="app-layout">
      <Header userName={userName} />
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  )
}
