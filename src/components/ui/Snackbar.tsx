"use client";

import { useEffect } from "react";

interface SnackbarProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  tone?: "default" | "positive" | "critical";
  duration?: number;
}

export function Snackbar({
  open,
  onClose,
  children,
  tone = "default",
  duration = 3000,
}: SnackbarProps) {
  useEffect(() => {
    if (open && duration > 0) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [open, duration, onClose]);

  if (!open) return null;

  const toneStyles = {
    default: "bg-blue-500",
    positive: "bg-green-500",
    critical: "bg-red-500",
  };

  return (
    <div
      className={`${toneStyles[tone]} text-white px-4 py-3 rounded-lg shadow-lg flex items-center justify-between animate-slide-down fixed top-0 left-0 right-0 z-[9999] mx-4 mt-4 max-w-[calc(100%-2rem)]`}
    >
      <span className="flex-1">{children}</span>
      <button
        onClick={onClose}
        className="ml-4 text-white hover:text-gray-200 transition-colors text-xl font-bold leading-none"
        aria-label="Close"
      >
        ×
      </button>
    </div>
  );
}
