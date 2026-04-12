import { normalizeStoredHtml } from "../lib/content";


// Render trusted quiz card HTML while normalizing legacy image paths for the desktop webview.
export function HtmlView({ html, className }: { html: string; className?: string }) {
  return <div className={className} dangerouslySetInnerHTML={{ __html: normalizeStoredHtml(html) }} />;
}
