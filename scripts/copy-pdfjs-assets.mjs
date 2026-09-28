// Copies the data files pdf.js loads at runtime (character maps, standard fonts, image decoders, colour
// profiles) into public/, so the site serves them itself and never fetches anything from another origin.
import { cpSync, rmSync } from 'node:fs';

const from = 'node_modules/pdfjs-dist/';
const to = 'public/pdfjs/';

rmSync(to, { recursive: true, force: true });
for (const dir of ['cmaps', 'standard_fonts', 'wasm', 'iccs']) {
  cpSync(`${from}${dir}`, `${to}${dir}`, { recursive: true });
}
