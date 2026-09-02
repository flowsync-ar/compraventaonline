"use client";

import React from "react";
import { createPortal } from "react-dom";

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  discardText?: string;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
  onDiscard?: () => void;
  isLoading?: boolean;
  type?: "danger" | "warning" | "info";
}

export default function ConfirmModal({
  isOpen,
  title,
  description,
  confirmText = "Confirmar",
  cancelText = "Cancelar",
  discardText,
  onConfirm,
  onCancel,
  onDiscard,
  isLoading = false,
  type = "info",
}: ConfirmModalProps) {
  if (!isOpen || typeof document === "undefined") return null;

  // Icono y estilos de botón según el tipo
  let icon = (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-6 h-6 text-accent-gold">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
    </svg>
  );
  let confirmBtnClass = "rounded-xl bg-gradient-to-r from-accent-gold to-accent-gold-hover px-4 py-2 text-xs font-bold text-white shadow-md hover:opacity-95 transition-all disabled:opacity-50 cursor-pointer";

  if (type === "danger") {
    icon = (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-6 h-6 text-red-500">
        <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.34 9m-4.78 0L9 9m9.96-3.08c.18.04.36.08.54.13M15 3.57a48.008 48.008 0 0 0-6 0M4.5 6.08c.18-.05.36-.09.54-.13M18 6.08a48.108 48.108 0 0 0-12 0M6.25 6.08l.81 12.35c.04.83.69 1.5 1.52 1.5H15.4c.83 0 1.48-.67 1.52-1.5l.81-12.35m-9.96 0h12" />
      </svg>
    );
    confirmBtnClass = "rounded-xl bg-red-600 hover:bg-red-700 px-4 py-2 text-xs font-bold text-white shadow-md transition-all disabled:opacity-50 cursor-pointer";
  } else if (type === "warning") {
    icon = (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-6 h-6 text-yellow-500">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
      </svg>
    );
    confirmBtnClass = "rounded-xl bg-yellow-500 hover:bg-yellow-600 px-4 py-2 text-xs font-bold text-white shadow-md transition-all disabled:opacity-50 cursor-pointer";
  }

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl glass-panel border border-card-border p-6 shadow-2xl">
        <div className="flex items-start gap-4">
          <div className="p-2 rounded-xl bg-card-bg border border-card-border flex items-center justify-center shrink-0">
            {icon}
          </div>
          <div className="flex-1">
            <h3 className="font-heading text-base font-bold text-foreground">
              {title}
            </h3>
            <p className="text-xs text-text-muted mt-2 leading-relaxed">
              {description}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap justify-end gap-2 mt-6">
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="rounded-xl border border-card-border hover:bg-card-bg/20 px-4 py-2 text-xs font-bold text-foreground transition-all cursor-pointer disabled:opacity-50"
          >
            {cancelText}
          </button>
          {onDiscard && discardText ? (
            <button
              type="button"
              onClick={onDiscard}
              disabled={isLoading}
              className="rounded-xl border border-card-border hover:bg-card-bg/20 px-4 py-2 text-xs font-bold text-text-muted transition-all cursor-pointer disabled:opacity-50"
            >
              {discardText}
            </button>
          ) : null}
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={confirmBtnClass}
          >
            {isLoading ? "Procesando..." : confirmText}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
