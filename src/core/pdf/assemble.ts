import { PDFDocument } from 'pdf-lib';

/** A page already rendered as an image with its black boxes painted in. */
export interface RedactedPageImage {
  page: number;
  jpeg: Uint8Array;
  /** Page size in PDF points, as displayed (rotation applied). */
  width: number;
  height: number;
}

const APP_NAME = 'I Love My P.D.F.';

/** New PDF where each redacted page is replaced by its image — so no hidden text survives under the boxes —
 *  and every other page is copied unchanged. Document-level data (metadata, outline, attachments) is not carried over. */
export async function assembleRedactedPdf(original: Uint8Array, images: RedactedPageImage[]): Promise<Uint8Array> {
  const source = await PDFDocument.load(original);
  const output = await PDFDocument.create();
  const byPage = new Map(images.map((image) => [image.page, image]));
  const kept = source.getPageIndices().filter((index) => !byPage.has(index));
  const copies = new Map((await output.copyPages(source, kept)).map((page, i) => [kept[i], page]));

  for (const index of source.getPageIndices()) {
    const image = byPage.get(index);
    if (!image) {
      output.addPage(copies.get(index)!);
      continue;
    }
    const embedded = await output.embedJpg(image.jpeg);
    output.addPage([image.width, image.height]).drawImage(embedded, { x: 0, y: 0, width: image.width, height: image.height });
  }

  output.setTitle('');
  output.setAuthor('');
  output.setSubject('');
  output.setKeywords([]);
  output.setCreator(APP_NAME);
  output.setProducer(APP_NAME);
  return output.save();
}
