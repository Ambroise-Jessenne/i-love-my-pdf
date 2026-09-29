import { zipSync } from 'fflate';

/** A ZIP archive of the given files. PDFs are already compressed, so they are stored as they are. */
export function zipFiles(files: { name: string; bytes: Uint8Array }[]): Uint8Array {
  return zipSync(Object.fromEntries(files.map((file) => [file.name, [file.bytes, { level: 0 }]])));
}
