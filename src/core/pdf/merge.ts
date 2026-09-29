import { PDFDocument } from 'pdf-lib';

export const APP_NAME = 'I Love My P.D.F.';

/** One PDF holding every page of `files`, in order. Pages are copied as they are (text stays selectable). */
export async function mergePdfs(files: Uint8Array[]): Promise<Uint8Array> {
  const output = await PDFDocument.create();
  for (const bytes of files) {
    const source = await PDFDocument.load(bytes);
    for (const page of await output.copyPages(source, source.getPageIndices())) output.addPage(page);
  }
  output.setCreator(APP_NAME);
  output.setProducer(APP_NAME);
  return output.save();
}
