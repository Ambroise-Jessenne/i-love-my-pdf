import type { Detection, PiiType } from '../detect/types';

export interface Replacement {
  start: number;
  end: number;
  label: string;
}

const COMPACT_TYPES: PiiType[] = ['TELEPHONE', 'IBAN', 'CARTE_BANCAIRE', 'NIR'];

function normalize(type: PiiType, value: string): string {
  if (COMPACT_TYPES.includes(type)) return value.replace(/[^A-Za-z0-9+]/g, '').toUpperCase();
  return value.trim().replace(/\s+/g, ' ').toLowerCase();
}

/** Turns detections into non-overlapping replacements with consistent labels (`[EMAIL_1]`…).
 *  Every output (filtered text, Word document) is built from this plan so the labels always agree. */
export function planReplacements(detections: Detection[]): Replacement[] {
  const sorted = [...detections].sort((a, b) => a.start - b.start);
  const counters = new Map<PiiType, number>();
  const labels = new Map<string, string>();
  const plan: Replacement[] = [];
  for (const d of sorted) {
    const previous = plan.at(-1);
    if (previous && d.start < previous.end) {
      // Overlaps the previous replacement: its tail is masked by the same label.
      previous.end = Math.max(previous.end, d.end);
      continue;
    }
    const key = `${d.type}:${normalize(d.type, d.value)}`;
    let label = labels.get(key);
    if (!label) {
      const n = (counters.get(d.type) ?? 0) + 1;
      counters.set(d.type, n);
      label = `[${d.type}_${n}]`;
      labels.set(key, label);
    }
    plan.push({ start: d.start, end: d.end, label });
  }
  return plan;
}
