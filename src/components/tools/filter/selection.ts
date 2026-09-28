export interface TextRange {
  start: number;
  end: number;
}

/** Converts the browser selection into character offsets of the original text.
 *  Every child of `container` must carry `data-start` (its offset in the text). */
export function getSelectionOffsets(container: HTMLElement | null): TextRange | null {
  const selection = window.getSelection();
  if (!container || !selection || selection.rangeCount === 0 || selection.isCollapsed) return null;
  const range = selection.getRangeAt(0);
  if (!container.contains(range.startContainer) || !container.contains(range.endContainer)) return null;
  const start = toOffset(container, range.startContainer, range.startOffset);
  const end = toOffset(container, range.endContainer, range.endOffset);
  if (start === null || end === null || start === end) return null;
  return { start: Math.min(start, end), end: Math.max(start, end) };
}

function toOffset(container: HTMLElement, node: Node, offset: number): number | null {
  if (node === container) {
    const child = container.childNodes[offset] as HTMLElement | undefined;
    return child ? Number(child.dataset.start) : (container.textContent ?? '').length;
  }
  const element = node.nodeType === Node.TEXT_NODE ? node.parentElement : (node as HTMLElement);
  const holder = element?.closest<HTMLElement>('[data-start]');
  if (!holder) return null;
  const base = Number(holder.dataset.start);
  if (node.nodeType === Node.TEXT_NODE) return base + offset;
  return offset === 0 ? base : base + (holder.textContent ?? '').length;
}
