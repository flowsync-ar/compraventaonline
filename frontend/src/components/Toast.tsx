"use client";

import { useEffect } from "react";

interface ToastProps {
  message: string;
  type: "success" | "error";
  onClose: () => void;
}

export default function Toast({ message, type, onClose }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [message, onClose]);

  return (
    <div
      // 75% + blur — more see-through than the original /90, still legible
      // (white text stays high-contrast against red/green either way).
      className={`pointer-events-auto flex items-start gap-2 rounded-xl border px-4 py-3 text-xs font-semibold text-white shadow-lg backdrop-blur-md animate-in slide-in-from-top-4 fade-in duration-300 ${
        type === "success"
          ? "bg-accent-green/75 border-accent-green/50"
          : "bg-red-500/75 border-red-600/50"
      }`}
    >
      <span>{type === "success" ? "✓" : "⚠️"}</span>
      <span className="flex-1">{message}</span>
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
