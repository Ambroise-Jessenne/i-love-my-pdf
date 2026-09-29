import { wrap, type Remote } from 'comlink';
import type { PdfToolsApi } from './pdfTools.worker';

let api: Remote<PdfToolsApi> | undefined;

export function getPdfToolsApi(): Remote<PdfToolsApi> {
  api ??= wrap<PdfToolsApi>(new Worker(new URL('./pdfTools.worker.ts', import.meta.url), { type: 'module' }));
  return api;
}
