// ローディング状態を示すUIコンポーネント群。
// aria-hidden="true" を付与し、スクリーンリーダーには読み上げさせない（視覚的装飾のため）。
import "./Spinner.css";

interface SpinnerProps {
  size?: number; // スピナーのサイズ（px）。デフォルト 36px
}

// 単体のスピナー（回転するリング）。サイズを props で変更可能。
export function Spinner({ size = 36 }: SpinnerProps) {
  return (
    <div
      className="spinner"
      style={{ width: size, height: size }}
      aria-hidden="true"
    />
  );
}

// 画面全体を覆う半透明オーバーレイ付きスピナー。
// API 通信中やデータ取得中など、ページ全体の操作をブロックしたい場合に使用する。
export function LoadingOverlay() {
  return (
    <div className="loading-overlay" aria-hidden="true">
      <Spinner />
    </div>
  );
}
