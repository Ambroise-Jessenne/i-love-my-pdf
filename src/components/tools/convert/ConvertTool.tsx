import { useState } from 'react';
import type { Dict } from '../../../i18n/fr';
import { getPdfToolsApi } from '../../../workers/pdfToolsClient';
import { DropZone } from '../../ui/DropZone';
import { Icon } from '../../ui/Icon';
import { Notice } from '../../ui/Notice';
import { downloadBlob } from '../../ui/download';
import { baseName, DOCX_ACCEPT, DOCX_TYPE, extensionOf, fill, LARGE_FILE, PDF_ACCEPT, readBytes } from '../common/files';
import { ProgressBar } from '../common/ProgressBar';
import '../common/tools.css';

interface ConvertToolProps {
  t: Dict['tools'];
  direction: 'pdfToWord' | 'wordToPdf';
}

export default function ConvertTool({ t, direction }: ConvertToolProps) {
  const texts = t[direction];
  const toWord = direction === 'pdfToWord';
  const [file, setFile] = useState<{ name: string; bytes: Uint8Array; large: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function choose(files: File[]) {
    const [chosen] = files;
    setError(null);
    setDone(false);
    if (extensionOf(chosen.name) !== (toWord ? 'pdf' : 'docx')) {
      setError(toWord ? t.errorPdfOnly : t.errorWordOnly);
      return;
    }
    setFile({ name: chosen.name, bytes: await readBytes(chosen), large: chosen.size > LARGE_FILE });
  }

  async function convert() {
    if (!file) return;
    setBusy(true);
    setError(null);
    setDone(false);
    try {
      if (toWord) {
        const { loadPdfDocument, extractStyledPages, closeDocument, PdfError } = await import('../../pdf/pdfjs');
        let pages;
        try {
          const doc = await loadPdfDocument(file.bytes);
          pages = await extractStyledPages(doc);
          await closeDocument(doc);
        } catch (reason) {
          setError(reason instanceof PdfError && reason.reason === 'password' ? t.errorPassword : fill(t.errorRead, { name: file.name }));
          return;
        }
        if (!pages.some((page) => page.items.some((item) => item.str.trim()))) {
          setError(t.pdfToWord.errorScanned);
          return;
        }
        downloadBlob(await getPdfToolsApi().pdfToDocx(pages), DOCX_TYPE, `${baseName(file.name)}.docx`);
      } else {
        downloadBlob(await getPdfToolsApi().wordToPdf(file.bytes), 'application/pdf', `${baseName(file.name)}.pdf`);
      }
      setDone(true);
    } catch {
      setError(toWord ? t.errorGeneric : fill(t.errorRead, { name: file.name }));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="tool">
      <Notice tone="info">{texts.limits}</Notice>
      {error && (
        <p className="tool-error" role="alert">
          {error}
        </p>
      )}
      {!file ? (
        <DropZone accept={toWord ? PDF_ACCEPT : DOCX_ACCEPT} label={texts.dropLabel} buttonLabel={texts.dropButton} onFiles={choose} />
      ) : (
        <>
          <div className="tool-file">
            <Icon name="file" />
            <span className="tool-file-text">
              <strong>{file.name}</strong>
              <span>{toWord ? 'PDF' : 'Word'}</span>
            </span>
            <button
              type="button"
              className="btn btn-ghost"
              disabled={busy}
              onClick={() => {
                setFile(null);
                setDone(false);
                setError(null);
              }}
            >
              <Icon name="restart" />
              {t.change}
            </button>
          </div>
          {file.large && <p className="tool-hint">{t.largeFile}</p>}
          {busy ? (
            <ProgressBar label={texts.working} />
          ) : (
            <button type="button" className="btn" onClick={convert}>
              <Icon name="convert" />
              {texts.action}
            </button>
          )}
          {done && (
            <p className="tool-done" role="status">
              {t.done}
            </p>
          )}
        </>
      )}
    </section>
  );
}
