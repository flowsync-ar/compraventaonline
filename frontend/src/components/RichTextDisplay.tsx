import { looksLikeHtml, sanitizeRichHtml } from "@/lib/richText";

export default function RichTextDisplay({ html, className = "" }: { html: string; className?: string }) {
  if (!html) return null;
  if (!looksLikeHtml(html)) {
    return <p className={`whitespace-pre-line ${className}`.trim()}>{html}</p>;
  }
  return (
    <div
      className={`rich-text ${className}`.trim()}
      dangerouslySetInnerHTML={{ __html: sanitizeRichHtml(html) }}
    />
  );
}
