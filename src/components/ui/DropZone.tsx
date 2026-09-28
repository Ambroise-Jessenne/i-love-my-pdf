import { useId, useRef, useState, type DragEvent } from 'react';
import { Icon } from './Icon';
import './ui.css';

interface DropZoneProps {
  accept: string;
  label: string;
  buttonLabel: string;
  multiple?: boolean;
  onFiles: (files: File[]) => void;
}

export function DropZone({ accept, label, buttonLabel, multiple = false, onFiles }: DropZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const labelId = useId();

  const emit = (files: File[]) => {
    if (files.length > 0) onFiles(multiple ? files : files.slice(0, 1));
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    emit(Array.from(event.dataTransfer.files));
  };

  return (
    <div
      className={dragging ? 'dropzone is-dragging' : 'dropzone'}
      onDragOver={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
    >
      <Icon name="upload" className="dropzone-icon" />
      <p id={labelId}>{label}</p>
      <button
        type="button"
        className="btn btn-secondary"
        aria-describedby={labelId}
        onClick={() => inputRef.current?.click()}
      >
        {buttonLabel}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        hidden
        data-testid="file-input"
        onChange={(event) => {
          emit(Array.from(event.target.files ?? []));
          event.target.value = '';
        }}
      />
    </div>
  );
}
