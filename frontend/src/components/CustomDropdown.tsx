"use client";

import { useState, useEffect, useLayoutEffect, useRef, type CSSProperties } from "react";
import { createPortal } from "react-dom";

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
  // When the user types in the search box, filter this list instead of
  // `options`. Used to keep the idle menu short (e.g. root categories)
  // while still matching nested items (subcategories of subcategories).
  searchOptions?: DropdownOption[];
  onChange?: (value: string) => void;
  // Overrides the trigger button's classes entirely — for contexts like a
  // seamless pill segment where the boxed default (bg/border/rounded) would
  // look like a nested control instead of blending in.
  triggerClassName?: string;
  // Overrides the panel's width — defaults to matching the trigger (w-full).
  // Useful when the trigger sits in a narrow segment but the option list
  // (e.g. long category names) needs more room to stay readable.
  panelWidthClassName?: string;
  // Open the panel on first mount (e.g. after "otra categoría" so the
  // seller lands on the root category picker without an extra click).
  openOnMount?: boolean;
  // When the search has no matches, offer to propose the typed name
  // (used on the publish category picker).
  onProposeSearch?: (query: string) => void;
}

function normalizeForSearch(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function optionMatchesQuery(opt: DropdownOption, query: string): boolean {
  const tokens = normalizeForSearch(query).split(/[^a-z0-9]+/).filter(Boolean);
  if (tokens.length === 0) return true;
  const words = normalizeForSearch([opt.name, opt.value, opt.groupLabel].filter(Boolean).join(" "))
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
  return tokens.every((token) => words.some((word) => word.startsWith(token)));
}

const DEFAULT_TRIGGER_CLASSNAME =
  "w-full bg-background border border-card-border rounded-xl px-3 py-2.5 text-xs text-foreground text-left focus:outline-none focus:border-accent-gold flex items-center justify-between cursor-pointer select-none";

export default function CustomDropdown({
  options,
  defaultValue,
  name,
  placeholder = "Buscar...",
  showSearch = false,
  searchOptions,
  onChange,
  triggerClassName,
  panelWidthClassName = "w-full",
  openOnMount = false,
  onProposeSearch,
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [panelStyle, setPanelStyle] = useState<CSSProperties>({});
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [selected, setSelected] = useState<DropdownOption>(() => {
    const pool = searchOptions ? [...options, ...searchOptions] : options;
    return pool.find((o) => o.value === defaultValue) || options[0] || { name: "", value: "" };
  });

  // Sync selection if defaultValue or options change. searchOptions is
  // included so a nested pick (not in the idle root list) still restores
  // from a URL param like ?category=vinos-y-espumantes.
  useEffect(() => {
    const pool = searchOptions ? [...options, ...searchOptions] : options;
    const matched = pool.find((o) => o.value === defaultValue);
    if (matched) {
      setSelected(matched); // eslint-disable-line react-hooks/set-state-in-effect
    } else if (options[0]) {
      setSelected(options[0]);
    }
  }, [defaultValue, options, searchOptions]);

  useEffect(() => {
    if (!openOnMount) return;
    setIsOpen(true);
    setSearch("");
    triggerRef.current?.focus();
  }, [openOnMount]);

  useLayoutEffect(() => {
    if (!isOpen) return;
    const place = () => {
      const el = triggerRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const spaceBelow = window.innerHeight - r.bottom;
      const openUp = spaceBelow < 280 && r.top > spaceBelow;
      const wide = panelWidthClassName.includes("w-max");
      setPanelStyle({
        position: "fixed",
        left: r.left,
        top: openUp ? undefined : r.bottom + 8,
        bottom: openUp ? window.innerHeight - r.top + 8 : undefined,
        zIndex: 250,
        width: wide ? undefined : r.width,
        minWidth: r.width,
        maxWidth: panelWidthClassName.includes("max-w-xs") ? 320 : undefined,
      });
    };
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [isOpen, panelWidthClassName]);

  const hasQuery = normalizeForSearch(search).length > 0;
  const listForSearch = showSearch && hasQuery && searchOptions ? searchOptions : options;
  const filtered = listForSearch.filter((opt) => {
    if (!showSearch || !hasQuery) return true;
    return optionMatchesQuery(opt, search);
  });

  return (
    <div className="relative w-full">
      {/* Hidden input to submit with HTML Form */}
      <input type="hidden" name={name} value={selected.value} />

      {/* Trigger Button */}
      <button
        type="button"
        ref={triggerRef}
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
      {isOpen &&
        createPortal(
        <>
          {/* Backdrop to close click outside */}
          <div className="fixed inset-0 z-[240]" onClick={() => setIsOpen(false)} />
          
          <div style={panelStyle} className="rounded-2xl bg-card-bg-solid border border-card-border p-3 shadow-2xl flex flex-col gap-2 animate-in fade-in slide-in-from-top-2 duration-200">
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
                <div className="flex flex-col items-center gap-2 py-3 px-1 text-center">
                  <span className="text-[10px] text-text-muted">No se encontraron resultados</span>
                  {onProposeSearch && hasQuery && (
                    <>
                      <p className="text-[11px] text-foreground leading-snug">
                        ¿Te gustaría proponer <span className="font-bold">“{search.trim()}”</span> a CompraVentaOnline?
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          onProposeSearch(search.trim());
                          setIsOpen(false);
                          setSearch("");
                        }}
                        className="rounded-lg bg-accent-gold/15 border border-accent-gold/40 text-accent-gold px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wide hover:bg-accent-gold/25 cursor-pointer"
                      >
                        Proponer esta categoría
                      </button>
                    </>
                  )}
                </div>
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
        </>,
        document.body
      )}
    </div>
  );
}
