import { useEffect, useRef } from "react";

interface RichHtmlEditorProps {
  value: string;
  placeholder: string;
  onChange: (html: string) => void;
}


// Edit stored card HTML and turn pasted images into inline data URLs for immediate persistence.
export function RichHtmlEditor({ value, placeholder, onChange }: RichHtmlEditorProps) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (ref.current && ref.current.innerHTML !== value) {
      ref.current.innerHTML = value || "";
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
    onChange(ref.current?.innerHTML ?? "");
  }

  return (
    <div
      ref={ref}
      className="rich-editor"
      contentEditable
      data-placeholder={placeholder}
      onInput={(event) => onChange(event.currentTarget.innerHTML)}
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


// Insert HTML at the current contenteditable caret position.
function insertHtmlAtCursor(html: string) {
  document.execCommand("insertHTML", false, html);
}
