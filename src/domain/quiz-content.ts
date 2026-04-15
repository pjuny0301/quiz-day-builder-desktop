import type { Card } from "../lib/types";

// Extract visible text from HTML for matching and previews.
export function htmlToPlain(html: string): string {
  if (!html) {
    return "";
  }
  const parser = new DOMParser();
  const document = parser.parseFromString(html, "text/html");
  return (document.body.textContent ?? "").trim();
}

// Normalize answer text so case and repeated whitespace do not break matching.
export function normalizeText(value: string): string {
  return value.trim().toLocaleLowerCase().replace(/\s+/g, " ");
}

// Return whether a card side contains meaningful text or at least one image.
export function hasHtmlContent(html: string): boolean {
  return Boolean(htmlToPlain(html)) || /<img[\s>]/i.test(html);
}

// Return a user-friendly plain preview of a stored HTML fragment.
export function previewText(html: string, limit = 90): string {
  const plain = htmlToPlain(html);
  if (plain.length <= limit) {
    return plain;
  }
  return `${plain.slice(0, limit - 1).trimEnd()}…`;
}

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

export interface BulkEditorParseResult {
  cards: Array<{ questionHtml: string; answerHtml: string }>;
  blockCount: number;
  danglingQuestion: boolean;
}

// Parse one bulk editor HTML document by alternating question and answer blocks split by stable divider markers.
export function parseBulkEditorHtml(html: string): BulkEditorParseResult {
  const blocks = splitBulkEditorBlocks(html);
  const cards: Array<{ questionHtml: string; answerHtml: string }> = [];

  for (let index = 0; index + 1 < blocks.length; index += 2) {
    cards.push({
      questionHtml: blocks[index],
      answerHtml: blocks[index + 1],
    });
  }

  return {
    cards,
    blockCount: blocks.length,
    danglingQuestion: blocks.length % 2 === 1,
  };
}

// Build multiple-choice options by mixing the correct answer with other deck answers.
export function buildChoices(correctAnswer: string, otherAnswers: string[], targetCount = 4): string[] {
  const seen = new Set([normalizeText(correctAnswer)]);
  const pool: string[] = [];
  for (const answer of otherAnswers) {
    const normalized = normalizeText(answer);
    if (!normalized || seen.has(normalized)) {
      continue;
    }
    seen.add(normalized);
    pool.push(answer);
  }

  const distractorCount = Math.min(Math.max(targetCount - 1, 0), pool.length);
  const distractors = shuffleArray(pool).slice(0, distractorCount);
  return shuffleArray([...distractors, correctAnswer]);
}

// Shuffle cards or option arrays for randomized study order and distractors.
export function shuffleArray<T>(value: T[]): T[] {
  const next = [...value];
  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
  }
  return next;
}

// Parse bulk import lines into question and answer pairs while reporting skipped rows.
export function parseBulkCards(rawText: string): { cards: Array<{ question: string; answer: string }>; skipped: number[] } {
  const cards: Array<{ question: string; answer: string }> = [];
  const skipped: number[] = [];

  rawText.split(/\r?\n/).forEach((line, index) => {
    const value = line.trim();
    if (!value) {
      return;
    }

    let question = "";
    let answer = "";
    if (value.includes("\t")) {
      [question, answer] = value.split("\t", 2);
    } else if (value.includes("|")) {
      [question, answer] = value.split("|", 2);
    } else if (value.includes("::")) {
      [question, answer] = value.split("::", 2);
    } else {
      skipped.push(index + 1);
      return;
    }

    if (!question.trim() || !answer.trim()) {
      skipped.push(index + 1);
      return;
    }

    cards.push({
      question: question.trim(),
      answer: answer.trim(),
    });
  });

  return { cards, skipped };
}

// Split the bulk editor into clean HTML blocks while treating divider markers as hard separators.
function splitBulkEditorBlocks(html: string): string[] {
  if (!html.trim()) {
    return [];
  }

  const parser = new DOMParser();
  const document = parser.parseFromString(`<div id="bulk-root">${html}</div>`, "text/html");
  const root = document.getElementById("bulk-root");
  if (!root) {
    return [];
  }

  const blocks: string[] = [];
  const fragmentHost = document.createElement("div");

  for (const node of Array.from(root.childNodes)) {
    if (isDividerNode(node)) {
      pushBulkBlock(blocks, fragmentHost.innerHTML);
      fragmentHost.innerHTML = "";
      continue;
    }

    fragmentHost.appendChild(node.cloneNode(true));
  }

  pushBulkBlock(blocks, fragmentHost.innerHTML);
  return blocks;
}

// Treat explicit bulk divider wrappers and plain horizontal rules as question-answer separators.
function isDividerNode(node: ChildNode): boolean {
  if (node.nodeType !== Node.ELEMENT_NODE) {
    return false;
  }

  const element = node as HTMLElement;
  if (element.matches("[data-bulk-divider='true']")) {
    return true;
  }
  if (element.tagName === "HR") {
    return true;
  }

  const onlyDividerChild = element.childNodes.length === 1
    && element.firstChild?.nodeType === Node.ELEMENT_NODE
    && (element.firstChild as HTMLElement).matches("hr, [data-bulk-divider='true']");

  return onlyDividerChild && !element.textContent?.trim();
}

// Normalize one parsed block so empty paragraphs added around dividers do not break question-answer pairing.
function sanitizeBulkBlockHtml(html: string): string {
  if (!html.trim()) {
    return "";
  }

  const parser = new DOMParser();
  const document = parser.parseFromString(`<div id="bulk-block">${html}</div>`, "text/html");
  const root = document.getElementById("bulk-block");
  if (!root) {
    return "";
  }

  trimEmptyBoundaryNodes(root, "start");
  trimEmptyBoundaryNodes(root, "end");
  return root.innerHTML.trim();
}

// Remove empty leading or trailing wrapper nodes from one bulk block.
function trimEmptyBoundaryNodes(root: HTMLElement, side: "start" | "end"): void {
  while (root.childNodes.length > 0) {
    const node = side === "start" ? root.firstChild : root.lastChild;
    if (!node || !isEmptyBoundaryNode(node)) {
      return;
    }
    node.remove();
  }
}

// Detect paragraphs or wrappers that only contain line breaks and whitespace around a divider split.
function isEmptyBoundaryNode(node: ChildNode): boolean {
  if (node.nodeType === Node.TEXT_NODE) {
    return !node.textContent?.trim();
  }

  if (node.nodeType !== Node.ELEMENT_NODE) {
    return false;
  }

  const element = node as HTMLElement;
  if (element.matches("[data-bulk-divider='true'], hr")) {
    return true;
  }

  const html = element.innerHTML
    .replace(/<br\s*\/?>/gi, "")
    .replace(/&nbsp;/gi, "")
    .trim();

  return !html && !element.textContent?.trim();
}

// Add one meaningful parsed block to the bulk editor result list.
function pushBulkBlock(target: string[], html: string): void {
  const sanitized = sanitizeBulkBlockHtml(html);
  if (!hasHtmlContent(sanitized)) {
    return;
  }
  target.push(sanitized);
}

