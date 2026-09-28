import type { CSSProperties, ReactNode } from 'react';
import type { Detection, PiiType } from '../../../core/detect/types';

interface HighlightedTextProps {
  id: string;
  text: string;
  detections: Detection[];
  disabled: Set<string>;
  typeLabels: Record<PiiType, string>;
  onToggle: (id: string) => void;
}

export function HighlightedText({ id, text, detections, disabled, typeLabels, onToggle }: HighlightedTextProps) {
  const parts: ReactNode[] = [];
  let cursor = 0;
  let index = 0;
  for (const d of [...detections].sort((a, b) => a.start - b.start)) {
    if (d.start < cursor) continue;
    if (d.start > cursor) {
      parts.push(
        <span key={`t-${cursor}`} data-start={cursor}>
          {text.slice(cursor, d.start)}
        </span>,
      );
    }
    const off = disabled.has(d.id);
    parts.push(
      <mark
        key={d.id}
        data-start={d.start}
        data-label={typeLabels[d.type]}
        className={off ? 'pii pii-off' : 'pii'}
        style={{ '--i': Math.min(index++, 12) } as CSSProperties}
        role="button"
        tabIndex={0}
        aria-pressed={!off}
        aria-label={`${typeLabels[d.type]} : ${d.value}`}
        onClick={() => onToggle(d.id)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onToggle(d.id);
          }
        }}
      >
        {text.slice(d.start, d.end)}
      </mark>,
    );
    cursor = d.end;
  }
  if (cursor < text.length) {
    parts.push(
      <span key={`t-${cursor}`} data-start={cursor}>
        {text.slice(cursor)}
      </span>,
    );
  }
  return (
    <div id={id} className="filter-review">
      {parts}
    </div>
  );
}
