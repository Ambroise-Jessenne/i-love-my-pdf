import type { Detection } from '../detect/types';
import { planReplacements } from './labels';

export function redact(text: string, detections: Detection[]): string {
  let output = '';
  let cursor = 0;
  for (const r of planReplacements(detections)) {
    output += text.slice(cursor, r.start) + r.label;
    cursor = r.end;
  }
  return output + text.slice(cursor);
}

export function addManual(detections: Detection[], text: string, from: number, to: number): Detection[] {
  let start = Math.min(from, to);
  let end = Math.max(from, to);
  if (start === end) return detections;
  const kept: Detection[] = [];
  for (const d of detections) {
    if (d.start < end && start < d.end) {
      start = Math.min(start, d.start);
      end = Math.max(end, d.end);
    } else {
      kept.push(d);
    }
  }
  const manual: Detection = { id: `MASQUE-${start}-${end}`, type: 'MASQUE', start, end, value: text.slice(start, end) };
  return [...kept, manual].sort((a, b) => a.start - b.start);
}
