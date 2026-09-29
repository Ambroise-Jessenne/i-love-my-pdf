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

/** Joins overlapping candidates into one detection covering all of them, typed after the strongest one
 *  (longest, then highest priority). Unlike `resolveOverlaps`, no character of any candidate is left out. */
export function mergeOverlaps(text: string, candidates: Candidate[]): Detection[] {
  const sorted = [...candidates].sort((a, b) => a.start - b.start || b.end - a.end);
  const groups: Candidate[][] = [];
  let groupEnd = -1;
  for (const candidate of sorted) {
    if (groups.length > 0 && candidate.start < groupEnd) {
      groups[groups.length - 1].push(candidate);
      groupEnd = Math.max(groupEnd, candidate.end);
    } else {
      groups.push([candidate]);
      groupEnd = candidate.end;
    }
  }
  return groups.map((group) => {
    const strongest = group.reduce((best, c) =>
      c.end - c.start > best.end - best.start || (c.end - c.start === best.end - best.start && c.priority > best.priority) ? c : best,
    );
    const start = group[0].start;
    const end = group.reduce((max, c) => Math.max(max, c.end), 0);
    return { id: `${strongest.type}-${start}-${end}`, type: strongest.type, start, end, value: text.slice(start, end) };
  });
}
