import { ImagePasteField } from "./ImagePasteField";

interface DeckBasicsFieldsProps {
  name: string;
  onNameChange: (value: string) => void;
  coverImageDataUrl: string;
  onCoverImageChange: (value: string) => void;
  delayMs: number;
  onDelayMsChange: (value: number) => void;
  autoFocus?: boolean;
  namePlaceholder?: string;
}


// Render the reusable deck identity fields shared by create and settings flows.
export function DeckBasicsFields({
  name,
  onNameChange,
  coverImageDataUrl,
  onCoverImageChange,
  delayMs,
  onDelayMsChange,
  autoFocus = false,
  namePlaceholder = "덱 이름",
}: DeckBasicsFieldsProps) {
  return (
    <>
      <label className="field">
        <span>덱 이름</span>
        <input
          value={name}
          onChange={(event) => onNameChange(event.target.value)}
          placeholder={namePlaceholder}
          autoFocus={autoFocus}
        />
      </label>

      <div className="field">
        <span>대표 이미지</span>
        <ImagePasteField value={coverImageDataUrl} onChange={onCoverImageChange} />
      </div>

      <label className="field">
        <span>정답 표시 지연시간(ms)</span>
        <input type="number" min={0} step={100} value={delayMs} onChange={(event) => onDelayMsChange(Number(event.target.value))} />
      </label>
    </>
  );
}
