import { htmlToPlain } from "./state-utils";


// Normalize stored HTML so legacy local image paths render in the webview.
export function normalizeStoredHtml(html: string): string {
  if (!html) {
    return "<p></p>";
  }

  return html.replace(/src="([A-Za-z]:\\[^"]+)"/g, (_match, path) => {
    const normalized = String(path).replace(/\\/g, "/");
    return `src="file:///${normalized}"`;
  });
}


// Return a fallback label when a stored HTML fragment only contains images.
export function htmlPreviewOrFallback(html: string, fallback: string): string {
  return htmlToPlain(html) || fallback;
}


// Convert plain text into a minimal paragraph-based HTML fragment.
export function plainToHtml(text: string): string {
  const escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\n/g, "<br>");
  return `<p>${escaped}</p>`;
}
