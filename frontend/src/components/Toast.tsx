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
      // Mostly-solid (90%) + blur instead of fully opaque — enough
      // translucency to feel like a floating toast instead of a flat card,
      // while staying readable over arbitrary page content (the original
      // /10 was too see-through against a busy header).
      className={`pointer-events-auto flex items-start gap-2 rounded-xl border px-4 py-3 text-xs font-semibold text-white shadow-lg backdrop-blur-md animate-in slide-in-from-top-4 fade-in duration-300 ${
        type === "success"
          ? "bg-accent-green/90 border-accent-green/60"
          : "bg-red-500/90 border-red-600/60"
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
