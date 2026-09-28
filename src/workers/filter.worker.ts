import { expose } from 'comlink';
import { detect } from '../core/detect/detect';
import { docxRedact, docxText } from '../core/docx/docx';
import { assembleRedactedPdf } from '../core/pdf/assemble';
import { redact } from '../core/redact/redact';

const api = { detect, redact, docxText, docxRedact, assembleRedactedPdf };

export type FilterApi = typeof api;

expose(api);
