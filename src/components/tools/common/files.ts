export const LARGE_FILE = 100 * 1024 * 1024;
export const DOCX_TYPE = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
export const PDF_ACCEPT = '.pdf,application/pdf';
export const DOCX_ACCEPT = `.docx,${DOCX_TYPE}`;

export function extensionOf(name: string): string {
  return name.toLowerCase().split('.').pop() ?? '';
}

/** File name without its extension (« rapport.final.pdf » → « rapport.final »). */
export function baseName(name: string): string {
  const dot = name.lastIndexOf('.');
  return (dot > 0 ? name.slice(0, dot) : name) || 'document';
}

/** Replaces « {name} » placeholders in a text. */
export function fill(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (whole, key: string) => (key in values ? String(values[key]) : whole));
}

export async function readBytes(file: File): Promise<Uint8Array> {
  return new Uint8Array(await file.arrayBuffer());
}
