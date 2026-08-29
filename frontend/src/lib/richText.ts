const ALLOWED_TAGS = new Set(["p", "br", "strong", "b", "em", "i", "u", "s", "strike", "ul", "ol", "li"]);

export function looksLikeHtml(text: string): boolean {
  return /<\/?(p|br|strong|b|em|i|u|s|strike|ul|ol|li)\b/i.test(text);
}

export function stripRichText(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim();
}

export function isRichHtmlEmpty(html: string): boolean {
  return stripRichText(html).length === 0;
}

function escapeText(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function sanitizeRichHtml(input: string): string {
  if (!input) return "";
  let html = input
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "");

  html = html.replace(/<\/?([a-z][a-z0-9]*)\b[^>]*>/gi, (match, tag: string) => {
    const name = tag.toLowerCase();
    if (!ALLOWED_TAGS.has(name)) return "";
    const closing = match.startsWith("</");
    if (name === "br") return closing ? "" : "<br>";
    return closing ? `</${name}>` : `<${name}>`;
  });

  return html;
}

export function toEditorHtml(raw: string): string {
  if (!raw) return "";
  if (looksLikeHtml(raw)) return sanitizeRichHtml(raw);
  return raw
    .split(/\n/)
    .map((line) => `<p>${escapeText(line)}</p>`)
    .join("");
}
