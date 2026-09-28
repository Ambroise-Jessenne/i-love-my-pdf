export function filteredName(original: string): string {
  const dot = original.lastIndexOf('.');
  if (dot <= 0) return `${original || 'texte'}_prv.txt`;
  return `${original.slice(0, dot)}_prv${original.slice(dot)}`;
}
