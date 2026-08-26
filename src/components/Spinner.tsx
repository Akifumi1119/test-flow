import "./Spinner.css";

interface SpinnerProps {
  size?: number;
}

export function Spinner({ size = 36 }: SpinnerProps) {
  return (
    <div
      className="spinner"
      style={{ width: size, height: size }}
      aria-hidden="true"
    />
  );
}

export function LoadingOverlay() {
  return (
    <div className="loading-overlay" aria-hidden="true">
      <Spinner />
    </div>
  );
}
