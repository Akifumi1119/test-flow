// エラーメッセージを表示する汎用コンポーネント。
// role="alert" を付与することで、スクリーンリーダーが即座に内容を読み上げる。
// className を省略可能にすることで、各ページから独自のスタイルを追加できる。
import "./ErrorMessage.css";

interface ErrorMessageProps {
  message: string;
  className?: string; // 呼び出し元でスタイルを追加したい場合に指定
}

export function ErrorMessage({ message, className }: ErrorMessageProps) {
  // デフォルトクラスと任意の追加クラスを結合する
  const classes = ["error-message", className].filter(Boolean).join(" ");
  return (
    <p className={classes} role="alert">
      {message}
    </p>
  );
}
