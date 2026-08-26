import "./ErrorMessage.css";

interface ErrorMessageProps {
  message: string;
  className?: string;
}

export function ErrorMessage({ message, className }: ErrorMessageProps) {
  const classes = ["error-message", className].filter(Boolean).join(" ");
  return (
    <p className={classes} role="alert">
      {message}
    </p>
  );
}
