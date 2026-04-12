import { useRef } from "react";

interface ImagePasteFieldProps {
  value: string;
  onChange: (nextValue: string) => void;
}


// Edit one representative image through paste or file selection without forcing the user into another tool.
export function ImagePasteField({ value, onChange }: ImagePasteFieldProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Accept clipboard images and convert them into a storable data URL immediately.
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
    onChange(await fileToDataUrl(file));
  }

  // Load one manually chosen image file into the same saved deck-image format.
  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    onChange(await fileToDataUrl(file));
  }

  // Open the hidden native file picker for users who prefer click-based selection over paste.
  function openFilePicker() {
    inputRef.current?.click();
  }

  // Clear the currently assigned deck image so the card falls back to its placeholder art.
  function clearImage() {
    onChange("");
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }

  return (
    <section className="image-paste-field">
      <div className="image-paste-field__surface" tabIndex={0} onPaste={handlePaste}>
        {value ? (
          <img src={value} alt="Deck cover preview" className="image-paste-field__preview" />
        ) : (
          <div className="image-paste-field__placeholder">
            <strong>대표 이미지</strong>
            <span>Ctrl+V로 붙여넣거나 파일을 선택하세요.</span>
          </div>
        )}
      </div>

      <div className="stack-actions">
        <button className="button button--secondary" type="button" onClick={() => openFilePicker()}>
          이미지 선택
        </button>
        <button className="button button--ghost" type="button" onClick={() => clearImage()} disabled={!value}>
          이미지 제거
        </button>
      </div>

      <input ref={inputRef} type="file" accept="image/*" hidden onChange={handleFileChange} />
    </section>
  );
}


// Convert one image file into a data URL so deck covers can be saved inside the existing JSON store.
function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
