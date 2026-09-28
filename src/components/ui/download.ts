export function downloadBlob(data: string | Uint8Array, type: string, fileName: string): void {
  const url = URL.createObjectURL(new Blob([data as BlobPart], { type }));
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function downloadText(content: string, fileName: string): void {
  downloadBlob(content, 'text/plain;charset=utf-8', fileName);
}
