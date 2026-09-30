import { describe, expect, it } from 'vitest';
import { isPdf } from './files';

const PDF_BYTES = new TextEncoder().encode('%PDF-1.7\n%âãÏÓ\n1 0 obj');

describe('isPdf', () => {
  it('recognises a PDF by its extension, whatever its case', async () => {
    expect(await isPdf(new File(['anything'], 'Rapport.PDF'))).toBe(true);
  });

  it('recognises a PDF by its type', async () => {
    expect(await isPdf(new File(['anything'], 'rapport', { type: 'application/pdf' }))).toBe(true);
  });

  it('recognises a PDF with neither extension nor type by its first bytes', async () => {
    expect(await isPdf(new File([PDF_BYTES], 'rapport'))).toBe(true);
  });

  it('turns down other files', async () => {
    expect(await isPdf(new File(['bonjour'], 'note.txt', { type: 'text/plain' }))).toBe(false);
    expect(await isPdf(new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], 'image'))).toBe(false);
  });
});
