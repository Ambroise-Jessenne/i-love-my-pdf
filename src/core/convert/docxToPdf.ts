import mammoth from 'mammoth';
import { parseMammothHtml } from './html';
import { typeset, type FontFiles } from './typeset';

/** The HTML mammoth reads from a Word document (it expects a Buffer in Node and an ArrayBuffer in browsers). */
export async function docxToHtml(bytes: Uint8Array): Promise<string> {
  const input =
    typeof Buffer !== 'undefined'
      ? { buffer: Buffer.from(bytes) }
      : { arrayBuffer: bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer };
  return (await mammoth.convertToHtml(input)).value;
}

/** A PDF with real, selectable text laid out from a Word document. */
export async function docxToPdf(bytes: Uint8Array, fonts: FontFiles): Promise<Uint8Array> {
  return typeset(parseMammothHtml(await docxToHtml(bytes)), fonts);
}
