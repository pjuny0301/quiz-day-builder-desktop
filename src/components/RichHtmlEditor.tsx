import { useCallback, useEffect, useRef, type KeyboardEventHandler, type MutableRefObject } from "react";

interface RichHtmlEditorProps {
  value: string;
  placeholder: string;
  onChange: (html: string) => void;
  className?: string;
  editorRef?: MutableRefObject<HTMLDivElement | null>;
  onKeyDown?: KeyboardEventHandler<HTMLDivElement>;
}


// Edit stored card HTML and turn pasted images into inline data URLs for immediate persistence.
export function RichHtmlEditor({ value, placeholder, onChange, className = "", editorRef, onKeyDown }: RichHtmlEditorProps) {
  const localRef = useRef<HTMLDivElement | null>(null);

  const setEditorNode = useCallback(
    (node: HTMLDivElement | null) => {
      localRef.current = node;
      if (editorRef) {
        editorRef.current = node;
      }
    },
    [editorRef],
  );

  useEffect(() => {
    if (localRef.current && localRef.current.innerHTML !== value) {
      localRef.current.innerHTML = value || "";
    }
  }, [value]);

  // Intercept pasted images and convert them into inline HTML content the app can save directly.
  async function handlePaste(event: React.ClipboardEvent<HTMLDivElement>) {
    const items = Array.from(event.clipboardData.items);
    const imageItem = items.find((item) => item.type.startsWith("image/"));
    if (!imageItem) {
      return;
    }

    const file = imageItem.getAsFile();
    if (!file) {
      return;
    }

    event.preventDefault();
    const dataUrl = await fileToDataUrl(file);
    insertHtmlAtCursor(`<p><img src="${dataUrl}" alt="Pasted card asset" /></p>`);
    onChange(localRef.current?.innerHTML ?? "");
  }

  return (
    <div
      ref={setEditorNode}
      className={`rich-editor ${className}`.trim()}
      contentEditable
      data-placeholder={placeholder}
      onInput={(event) => onChange(event.currentTarget.innerHTML)}
      onKeyDown={onKeyDown}
      onPaste={handlePaste}
      suppressContentEditableWarning
    />
  );
}


// Convert clipboard image blobs into storable data URLs.
function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}


// Insert a stable divider marker at the current caret position so bulk parsing can split blocks reliably.
export function insertDividerAtCursor() {
  insertHtmlAtCursor('<div data-bulk-divider="true" class="bulk-divider-marker"><hr /></div><p><br></p>');
}


// Insert HTML at the current contenteditable caret position.
export function insertHtmlAtCursor(html: string) {
  document.execCommand("insertHTML", false, html);
}
