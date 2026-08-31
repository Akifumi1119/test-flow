// 認証済みページ共通のレイアウト。
// ヘッダー（Header コンポーネント）を上部に固定し、その下にページコンテンツを表示する。
// React Router の <Outlet /> によって、子ルートのページコンポーネントがここに描画される。
//
// userName は Header の表示名として使い、プロフィール編集で名前が変更されたとき
// onNameUpdate コールバックで state を更新することで即座にヘッダーに反映する。
import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Header } from '../components/Header'
import './AppLayout.css'

export function AppLayout() {
  // 初期値は localStorage から取得（ページリロード後も表示名を維持するため）
  const [userName, setUserName] = useState(
    () => localStorage.getItem('userName') ?? ''
  )

  return (
    <div className="app-layout">
      {/* ヘッダー。名前変更時に setUserName を呼び出して表示を更新する */}
      <Header userName={userName} onNameUpdate={setUserName} />
      {/* 各ページのコンテンツ */}
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  )
}
