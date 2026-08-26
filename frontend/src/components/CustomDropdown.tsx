"use client";

import { useState, useEffect } from "react";

interface DropdownOption {
  name: string;
  value: string;
  // Optional grouping label — when set on consecutive options, a
  // non-selectable header is rendered above the first one in each group.
  // Leave unset for plain, ungrouped dropdowns (e.g. Condición, Ordenar por).
  groupLabel?: string;
  // Optional per-option text color (e.g. depth-based coloring in a category
  // tree dropdown). Leave unset to use the default option text color.
  color?: string;
}

interface Props {
  options: DropdownOption[];
  defaultValue: string;
  name: string;
  placeholder?: string;
  showSearch?: boolean;
  onChange?: (value: string) => void;
  // Overrides the trigger button's classes entirely — for contexts like a
  // seamless pill segment where the boxed default (bg/border/rounded) would
  // look like a nested control instead of blending in.
  triggerClassName?: string;
  // Overrides the panel's width — defaults to matching the trigger (w-full).
  // Useful when the trigger sits in a narrow segment but the option list
  // (e.g. long category names) needs more room to stay readable.
  panelWidthClassName?: string;
}

const DEFAULT_TRIGGER_CLASSNAME =
  "w-full bg-background border border-card-border rounded-xl px-3 py-2.5 text-xs text-foreground text-left focus:outline-none focus:border-accent-gold flex items-center justify-between cursor-pointer select-none";

export default function CustomDropdown({
  options,
  defaultValue,
  name,
  placeholder = "Buscar...",
  showSearch = false,
  onChange,
  triggerClassName,
  panelWidthClassName = "w-full",
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<DropdownOption>(
    options.find((o) => o.value === defaultValue) || options[0] || { name: "", value: "" }
  );

  // Sync selection if defaultValue or options change
  useEffect(() => {
    const matched = options.find((o) => o.value === defaultValue);
    if (matched) {
      setSelected(matched); // eslint-disable-line react-hooks/set-state-in-effect
    } else if (options[0]) {
      setSelected(options[0]);
    }
  }, [defaultValue, options]);

  const filtered = options.filter((opt) => {
    if (!showSearch) return true;
    return opt.name.toLowerCase().includes(search.toLowerCase()) || 
           opt.value.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div className="relative w-full">
      {/* Hidden input to submit with HTML Form */}
      <input type="hidden" name={name} value={selected.value} />

      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => {
          // Clear any leftover search text from a previous open/close cycle
          // that ended without picking an option — otherwise it silently
          // keeps filtering out options on the next open.
          if (!isOpen) setSearch("");
          setIsOpen(!isOpen);
        }}
        className={triggerClassName ?? DEFAULT_TRIGGER_CLASSNAME}
      >
        <span className="truncate">{selected.name}</span>
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-text-muted shrink-0 ml-1">
          <path d="m6 9 6 6 6-6"/>
        </svg>
      </button>

      {/* Dropdown panel */}
      {isOpen && (
        <>
          {/* Backdrop to close click outside */}
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          
          <div className={`absolute left-0 mt-2 ${panelWidthClassName} rounded-2xl bg-card-bg-solid border border-card-border p-3 shadow-2xl z-50 flex flex-col gap-2 animate-in fade-in slide-in-from-top-2 duration-200`}>
            {/* Search Input inside Dropdown */}
            {showSearch && (
              <div className="relative">
                <input
                  type="text"
                  placeholder={placeholder}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-background border border-card-border rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:border-accent-gold"
                  autoFocus
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    className="absolute right-2.5 top-2 text-text-muted hover:text-foreground text-[10px] cursor-pointer"
                  >
                    ✕
                  </button>
                )}
              </div>
            )}

            {/* List of options */}
            <div className="flex flex-col gap-0.5 max-h-48 overflow-y-auto pr-1">
              {filtered.length === 0 ? (
                <span className="text-[10px] text-text-muted text-center py-4">No se encontraron resultados</span>
              ) : (
                filtered.map((opt, idx) => {
                  const isSelected = opt.value === selected.value;
                  const showGroupHeader = opt.groupLabel && opt.groupLabel !== filtered[idx - 1]?.groupLabel;
                  return (
                    <div key={opt.value}>
                      {showGroupHeader && (
                        <span className="block px-2.5 pt-2 pb-1 text-[10px] font-extrabold uppercase tracking-wider text-text-muted">
                          {opt.groupLabel}
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setSelected(opt);
                          setIsOpen(false);
                          setSearch("");
                          if (onChange) onChange(opt.value);
                        }}
                        className={`w-full text-left px-2.5 py-2 rounded-lg text-xs transition-all cursor-pointer flex items-center justify-between ${
                          opt.groupLabel ? "pl-4" : ""
                        } ${
                          isSelected
                            ? "bg-accent-gold/20 text-accent-gold font-bold"
                            : "text-foreground/80 hover:bg-card-border/30"
                        }`}
                      >
                        <span className="truncate" style={opt.color ? { color: opt.color } : undefined}>{opt.name}</span>
                        {isSelected && <span className="text-accent-gold text-[10px]">✓</span>}
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
