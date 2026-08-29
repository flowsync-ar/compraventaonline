"use client";

import { useEffect, type ReactNode } from "react";

interface ToastProps {
  message: string;
  type: "success" | "error";
  onClose: () => void;
  persist?: boolean;
  footer?: ReactNode;
}

function formatToastMessage(message: string): ReactNode {
  const parts = message.split(/(«[^»]+»)/);
  if (parts.length === 1) return message;
  return parts.map((part, index) =>
    part.startsWith("«") && part.endsWith("»") ? (
      <mark key={index} className="mx-0.5 rounded bg-white px-1 py-0.5 font-extrabold text-red-600">
        {part.slice(1, -1)}
      </mark>
    ) : (
      part
    ),
  );
}

export default function Toast({ message, type, onClose, persist = false, footer }: ToastProps) {
  useEffect(() => {
    if (persist) return;
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [message, onClose, persist]);

  return (
    <div
      className={`pointer-events-auto flex items-start gap-2 rounded-xl border px-4 py-3 text-xs font-semibold text-white shadow-lg backdrop-blur-md animate-in slide-in-from-top-4 fade-in duration-300 ${
        type === "success"
          ? "bg-accent-green/75 border-accent-green/50"
          : "bg-red-500/75 border-red-600/50"
      }`}
    >
      <span>{type === "success" ? "✓" : "⚠️"}</span>
      <div className="flex-1 flex flex-col gap-2">
        <span>{formatToastMessage(message)}</span>
        {footer}
      </div>
      <button
        onClick={onClose}
        className="opacity-60 hover:opacity-100 transition-opacity cursor-pointer"
        aria-label="Cerrar"
      >
        ✕
      </button>
    </div>
  );
}
