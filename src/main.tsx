// アプリケーションのエントリーポイント。
// public/index.html の <div id="root"> に React アプリをマウントする。
// StrictMode を有効にすることで、開発時に潜在的な問題（副作用の二重実行など）を検出しやすくする。
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
