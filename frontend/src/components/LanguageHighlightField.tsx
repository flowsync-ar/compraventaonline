"use client";

import { useRef, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from "react";
import { findLanguageHighlightRanges } from "@/lib/communityLanguage";

function HighlightedMirror({ text, terms }: { text: string; terms: string[] }) {
  const ranges = findLanguageHighlightRanges(text, terms);
  if (ranges.length === 0) return <>{text}</>;

  const nodes: ReactNode[] = [];
  let cursor = 0;
  ranges.forEach((range, index) => {
    if (cursor < range.start) nodes.push(text.slice(cursor, range.start));
    nodes.push(
      <mark key={`${range.start}-${index}`} className="community-word-flag">
        {text.slice(range.start, range.end)}
      </mark>,
    );
    cursor = range.end;
  });
  if (cursor < text.length) nodes.push(text.slice(cursor));
  return <>{nodes}</>;
}

type InputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange"> & {
  as?: "input";
  value: string;
  onChange: (value: string) => void;
  terms: string[];
};

type TextareaProps = Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "value" | "onChange"> & {
  as: "textarea";
  value: string;
  onChange: (value: string) => void;
  terms: string[];
};

export default function LanguageHighlightField(props: InputProps | TextareaProps) {
  const { as = "input", value, onChange, terms, className = "", ...rest } = props;
  const overlayRef = useRef<HTMLDivElement>(null);
  const flagged = findLanguageHighlightRanges(value, terms).length > 0;

  const syncScroll = (el: HTMLElement) => {
    if (!overlayRef.current) return;
    overlayRef.current.scrollTop = el.scrollTop;
    overlayRef.current.scrollLeft = el.scrollLeft;
  };

  const ring = flagged ? " ring-1 ring-red-500" : "";
  const chrome = `${className}${ring}`;

  const hideInk = flagged
    ? { color: "transparent", WebkitTextFillColor: "transparent", caretColor: "var(--foreground, #111)" }
    : undefined;

  return (
    <div className="relative">
      {flagged && (
        <div
          ref={overlayRef}
          aria-hidden
          className={`${chrome} pointer-events-none absolute inset-0 overflow-hidden whitespace-pre-wrap wrap-break-word border-transparent bg-background text-foreground`}
        >
          <HighlightedMirror text={value} terms={terms} />
        </div>
      )}
      {as === "textarea" ? (
        <textarea
          {...(rest as TextareaHTMLAttributes<HTMLTextAreaElement>)}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onScroll={(e) => syncScroll(e.currentTarget)}
          style={hideInk}
          className={`${chrome} relative z-10 focus:outline-none ${flagged ? "bg-transparent" : ""}`}
        />
      ) : (
        <input
          type="text"
          {...(rest as InputHTMLAttributes<HTMLInputElement>)}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onScroll={(e) => syncScroll(e.currentTarget)}
          style={hideInk}
          className={`${chrome} relative z-10 focus:outline-none ${flagged ? "bg-transparent" : ""}`}
        />
      )}
    </div>
  );
}
