"use client";

import { useState } from "react";

export default function ClearableTextInput({
  name,
  defaultValue = "",
  placeholder,
  className,
}: {
  name: string;
  defaultValue?: string;
  placeholder?: string;
  className?: string;
}) {
  const [value, setValue] = useState(defaultValue);

  return (
    <div className="relative">
      <input
        type="text"
        name={name}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        className={`${className ?? ""} ${value ? "pr-8" : ""}`}
      />
      {value ? (
        <button
          type="button"
          onClick={() => setValue("")}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted hover:text-foreground transition-colors cursor-pointer"
          aria-label="Limpiar búsqueda"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      ) : null}
    </div>
  );
}
