import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Header } from '../components/Header'
import './AppLayout.css'

export function AppLayout() {
  const [userName, setUserName] = useState(
    () => localStorage.getItem('userName') ?? ''
  )

  return (
    <div className="app-layout">
      <Header userName={userName} onNameUpdate={setUserName} />
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  )
}
