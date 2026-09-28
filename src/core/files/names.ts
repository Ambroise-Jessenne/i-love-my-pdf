/** Name of a filtered file: `_prv` before the extension; `extension` (with its dot) replaces the original one. */
export function filteredName(original: string, extension?: string): string {
  const dot = original.lastIndexOf('.');
  const base = dot <= 0 ? original || 'texte' : original.slice(0, dot);
  const ext = extension ?? (dot <= 0 ? '.txt' : original.slice(dot));
  return `${base}_prv${ext}`;
}
