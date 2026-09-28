import type { Detection, PiiType } from '../detect/types';

const COMPACT_TYPES: PiiType[] = ['TELEPHONE', 'IBAN', 'CARTE_BANCAIRE', 'NIR'];

function normalize(type: PiiType, value: string): string {
  if (COMPACT_TYPES.includes(type)) return value.replace(/[^A-Za-z0-9+]/g, '').toUpperCase();
  return value.trim().replace(/\s+/g, ' ').toLowerCase();
}

export function redact(text: string, detections: Detection[]): string {
  const sorted = [...detections].sort((a, b) => a.start - b.start);
  const counters = new Map<PiiType, number>();
  const labels = new Map<string, string>();
  let output = '';
  let cursor = 0;
  for (const d of sorted) {
    if (d.start < cursor) continue;
    const key = `${d.type}:${normalize(d.type, d.value)}`;
    let label = labels.get(key);
    if (!label) {
      const n = (counters.get(d.type) ?? 0) + 1;
      counters.set(d.type, n);
      label = `[${d.type}_${n}]`;
      labels.set(key, label);
    }
    output += text.slice(cursor, d.start) + label;
    cursor = d.end;
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
