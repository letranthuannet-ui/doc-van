import { useEffect, useState, type ReactNode } from 'react';

interface Props {
  onConfirm: () => void;
  children: ReactNode;
  className?: string;
  title?: string;
}

// Two-click confirm instead of window.confirm.
export default function ConfirmButton({ onConfirm, children, className = 'btn small danger', title }: Props) {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!armed) return;
    const t = setTimeout(() => setArmed(false), 3000);
    return () => clearTimeout(t);
  }, [armed]);
  return (
    <button
      className={className}
      title={title}
      onClick={() => {
        if (armed) {
          setArmed(false);
          onConfirm();
        } else setArmed(true);
      }}
    >
      {armed ? 'Chắc chưa?' : children}
    </button>
  );
}
