"use client";

import { useEffect, useReducer, useRef, type ReactNode } from "react";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { findLanguageHighlightRanges } from "@/lib/communityLanguage";
import { isRichHtmlEmpty, toEditorHtml } from "@/lib/richText";

interface Props {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  highlightTerms?: string[];
}

function ToolbarButton({
  title,
  active,
  onClick,
  children,
}: {
  title: string;
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      aria-pressed={active}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={`flex h-7 w-7 items-center justify-center rounded-md cursor-pointer transition-colors ${
        active
          ? "bg-accent-gold/20 text-accent-gold"
          : "text-foreground/70 hover:bg-card-border/40 hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

function ToolbarDivider() {
  return <span className="mx-0.5 h-4 w-px bg-card-border" />;
}

function ToolbarGroup({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center gap-0.5 rounded-lg border border-card-border/80 bg-card-bg/50 px-0.5 py-0.5">
      {children}
    </div>
  );
}

export default function RichTextEditor({ value, onChange, placeholder, highlightTerms = [] }: Props) {
  const termsRef = useRef(highlightTerms);
  termsRef.current = highlightTerms;

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: false,
        codeBlock: false,
        blockquote: false,
        horizontalRule: false,
        code: false,
        link: false,
      }),
    ],
    content: toEditorHtml(value),
    editorProps: {
      attributes: {
        class:
          "min-h-24 max-h-64 overflow-y-auto px-4 py-3 text-xs text-foreground leading-relaxed outline-none rich-text",
      },
    },
    onUpdate: ({ editor: ed }) => {
      const html = ed.getHTML();
      onChange(isRichHtmlEmpty(html) ? "" : html);
    },
  });

  useEffect(() => {
    if (!editor) return;
    const next = toEditorHtml(value);
    const current = editor.getHTML();
    if (isRichHtmlEmpty(current) && !value) return;
    if (current === next) return;
    editor.commands.setContent(next, { emitUpdate: false });
  }, [value, editor]);

  useEffect(() => {
    if (!editor) return;
    const key = new PluginKey("communityHighlight");
    const plugin = new Plugin({
      key,
      props: {
        decorations(state) {
          const terms = termsRef.current;
          if (terms.length === 0) return DecorationSet.empty;
          const decos: ReturnType<typeof Decoration.inline>[] = [];
          state.doc.descendants((node, pos) => {
            if (!node.isText || !node.text) return;
            for (const range of findLanguageHighlightRanges(node.text, terms)) {
              decos.push(
                Decoration.inline(pos + range.start, pos + range.end, {
                  class: "community-word-flag",
                }),
              );
            }
          });
          return DecorationSet.create(state.doc, decos);
        },
      },
    });
    editor.registerPlugin(plugin);
    return () => {
      editor.unregisterPlugin(key);
    };
  }, [editor]);

  useEffect(() => {
    if (!editor) return;
    editor.view.dispatch(editor.state.tr);
  }, [highlightTerms, editor]);

  const [, rerender] = useReducer((n: number) => n + 1, 0);
  useEffect(() => {
    if (!editor) return;
    const onTx = () => rerender();
    editor.on("transaction", onTx);
    return () => {
      editor.off("transaction", onTx);
    };
  }, [editor]);

  if (!editor) {
    return (
      <div className="w-full min-h-32 rounded-xl border border-card-border bg-background" />
    );
  }

  const empty = isRichHtmlEmpty(editor.getHTML());
  const flagged = findLanguageHighlightRanges(editor.state.doc.textContent, highlightTerms).length > 0;

  return (
    <div className={`w-full overflow-hidden rounded-xl border bg-background ${
      flagged ? "border-red-500" : "border-card-border focus-within:border-accent-gold"
    }`}>
      <div className="flex flex-wrap items-center gap-1.5 border-b border-card-border bg-card-bg/30 px-2 py-1.5">
        <ToolbarGroup>
          <ToolbarButton
            title="Negrita"
            active={editor.isActive("bold")}
            onClick={() => editor.chain().focus().toggleBold().run()}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 4h8a4 4 0 0 1 0 8H6z" />
              <path d="M6 12h9a4 4 0 0 1 0 8H6z" />
            </svg>
          </ToolbarButton>
          <ToolbarDivider />
          <ToolbarButton
            title="Cursiva"
            active={editor.isActive("italic")}
            onClick={() => editor.chain().focus().toggleItalic().run()}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="4" x2="10" y2="4" />
              <line x1="14" y1="20" x2="5" y2="20" />
              <line x1="15" y1="4" x2="9" y2="20" />
            </svg>
          </ToolbarButton>
          <ToolbarDivider />
          <ToolbarButton
            title="Subrayado"
            active={editor.isActive("underline")}
            onClick={() => editor.chain().focus().toggleUnderline().run()}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 4v6a6 6 0 0 0 12 0V4" />
              <line x1="4" y1="20" x2="20" y2="20" />
            </svg>
          </ToolbarButton>
          <ToolbarDivider />
          <ToolbarButton
            title="Tachado"
            active={editor.isActive("strike")}
            onClick={() => editor.chain().focus().toggleStrike().run()}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 4H9a3 3 0 0 0 0 6h6" />
              <path d="M8 20h7a3 3 0 0 0 0-6H6" />
              <line x1="4" y1="12" x2="20" y2="12" />
            </svg>
          </ToolbarButton>
        </ToolbarGroup>

        <ToolbarGroup>
          <ToolbarButton
            title="Viñetas"
            active={editor.isActive("bulletList")}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="8" y1="6" x2="21" y2="6" />
              <line x1="8" y1="12" x2="21" y2="12" />
              <line x1="8" y1="18" x2="21" y2="18" />
              <circle cx="4" cy="6" r="1" fill="currentColor" />
              <circle cx="4" cy="12" r="1" fill="currentColor" />
              <circle cx="4" cy="18" r="1" fill="currentColor" />
            </svg>
          </ToolbarButton>
          <ToolbarDivider />
          <ToolbarButton
            title="Numeración"
            active={editor.isActive("orderedList")}
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="10" y1="6" x2="21" y2="6" />
              <line x1="10" y1="12" x2="21" y2="12" />
              <line x1="10" y1="18" x2="21" y2="18" />
              <text x="3" y="8" fontSize="7" fill="currentColor" stroke="none" fontFamily="sans-serif" fontWeight="700">1</text>
              <text x="3" y="14" fontSize="7" fill="currentColor" stroke="none" fontFamily="sans-serif" fontWeight="700">2</text>
              <text x="3" y="20" fontSize="7" fill="currentColor" stroke="none" fontFamily="sans-serif" fontWeight="700">3</text>
            </svg>
          </ToolbarButton>
        </ToolbarGroup>
      </div>
      <div className="relative">
        {empty && placeholder && (
          <span className="pointer-events-none absolute left-4 top-3 text-xs text-text-muted">
            {placeholder}
          </span>
        )}
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
