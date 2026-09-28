import type { Detection } from './types';

export interface Candidate extends Detection {
  priority: number;
}

export function resolveOverlaps(candidates: Candidate[]): Detection[] {
  const ordered = [...candidates].sort(
    (a, b) => b.end - b.start - (a.end - a.start) || b.priority - a.priority || a.start - b.start,
  );
  const kept: Candidate[] = [];
  for (const candidate of ordered) {
    const overlaps = kept.some((k) => candidate.start < k.end && k.start < candidate.end);
    if (!overlaps) kept.push(candidate);
  }
  return kept
    .sort((a, b) => a.start - b.start)
    .map(({ id, type, start, end, value }) => ({ id, type, start, end, value }));
}
