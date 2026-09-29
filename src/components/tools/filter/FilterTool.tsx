import { useEffect, useMemo, useState } from 'react';
import type { Detection } from '../../../core/detect/types';
import { filteredName } from '../../../core/files/names';
import { boxesFor, buildPdfText, type PdfSpan } from '../../../core/pdf/layout';
import { addManual } from '../../../core/redact/redact';
import type { Dict } from '../../../i18n/fr';
import { getFilterApi } from '../../../workers/filterClient';
import { DropZone } from '../../ui/DropZone';
import { Icon } from '../../ui/Icon';
import { Notice } from '../../ui/Notice';
import { downloadBlob, downloadText } from '../../ui/download';
import { HighlightedText } from './HighlightedText';
import type { LoadedPdf } from './pdfBrowser';
import { ScanReveal, type ScanImages } from './ScanReveal';
import { getSelectionOffsets } from './selection';
import './filter.css';

const REVIEW_ID = 'filter-review';
const NO_DETECTIONS: Detection[] = [];
const LARGE_FILE = 100 * 1024 * 1024;
const ACCEPT = '.txt,.docx,.pdf,text/plain,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const DOCX_TYPE = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

/** Where the text under review comes from; files keep what is needed to rebuild a filtered copy. */
type Source =
  | { kind: 'text' }
  | { kind: 'txt'; name: string }
  | { kind: 'docx'; name: string; bytes: Uint8Array }
  | { kind: 'pdf'; name: string; bytes: Uint8Array; pdf: LoadedPdf; spans: PdfSpan[] };

const loadPdfTools = () => import('./pdfBrowser');

interface FilterToolProps {
  t: Dict['filter'];
  scan: ScanImages;
}

export default function FilterTool({ t, scan }: FilterToolProps) {
  const [step, setStep] = useState<'input' | 'review'>('input');
  const [text, setText] = useState('');
  const [source, setSource] = useState<Source>({ kind: 'text' });
  const [detections, setDetections] = useState<Detection[]>([]);
  const [disabled, setDisabled] = useState<Set<string>>(new Set());
  const [output, setOutput] = useState('');
  const [busy, setBusy] = useState(false);
  const [reading, setReading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [largeFile, setLargeFile] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [strict, setStrict] = useState(true);

  const active = useMemo(() => detections.filter((d) => !disabled.has(d.id)), [detections, disabled]);
  const fromFile = source.kind === 'docx' || source.kind === 'pdf';

  // Warm the browser cache so the scanner starts at once, and load the word lists ahead of the first analysis.
  useEffect(() => {
    for (const src of [scan.exposed, scan.protected, scan.seal]) new Image().src = src;
    getFilterApi()
      .prepare()
      .catch(() => undefined); // retried on the first analysis
  }, [scan]);

  useEffect(() => {
    if (step !== 'review') return;
    let cancelled = false;
    getFilterApi()
      .redact(text, active)
      .then((result) => {
        if (!cancelled) setOutput(result);
      })
      .catch(() => setError(t.errorGeneric));
    return () => {
      cancelled = true;
    };
  }, [step, text, active, t.errorGeneric]);

  function releaseSource() {
    if (source.kind === 'pdf') void loadPdfTools().then(({ closePdf }) => closePdf(source.pdf));
  }

  async function readFile(file: File): Promise<void> {
    const extension = file.name.toLowerCase().split('.').pop();
    if (extension === 'txt') {
      setText(await file.text());
      setSource({ kind: 'txt', name: file.name });
      return;
    }
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (extension === 'docx') {
      setText(await getFilterApi().docxText(bytes));
      setSource({ kind: 'docx', name: file.name, bytes });
      return;
    }
    const { openPdf, closePdf, PdfError } = await loadPdfTools();
    let pdf: LoadedPdf;
    try {
      pdf = await openPdf(bytes);
    } catch (reason) {
      setError(reason instanceof PdfError && reason.reason === 'password' ? t.errorPassword : t.errorFileRead);
      return;
    }
    const built = buildPdfText(pdf.pages);
    if (built.text.trim() === '') {
      await closePdf(pdf);
      setError(t.errorScanned);
      return;
    }
    setText(built.text);
    setSource({ kind: 'pdf', name: file.name, bytes, pdf, spans: built.spans });
  }

  async function handleFiles(files: File[]) {
    const [file] = files;
    const extension = file.name.toLowerCase().split('.').pop() ?? '';
    setError(null);
    if (!['txt', 'docx', 'pdf'].includes(extension)) {
      setError(t.errorFileType);
      return;
    }
    releaseSource();
    setSource({ kind: 'text' });
    setText('');
    setLargeFile(file.size > LARGE_FILE);
    setReading(true);
    try {
      await readFile(file);
    } catch {
      setError(t.errorFileRead);
    } finally {
      setReading(false);
    }
  }

  function removeFile() {
    releaseSource();
    setSource({ kind: 'text' });
    setText('');
    setLargeFile(false);
  }

  async function analyze() {
    setBusy(true);
    setError(null);
    try {
      setDetections(await getFilterApi().detect(text, strict));
      setDisabled(new Set());
      setScanning(!window.matchMedia('(prefers-reduced-motion: reduce)').matches);
      setStep('review');
    } catch {
      setError(t.errorGeneric);
    } finally {
      setBusy(false);
    }
  }

  /** Switching strict mode during the review runs the detection again, keeping what was masked by hand. */
  async function changeStrict(value: boolean) {
    setStrict(value);
    if (step !== 'review') return;
    try {
      let next = await getFilterApi().detect(text, value);
      for (const manual of detections.filter((d) => d.type === 'MASQUE')) next = addManual(next, text, manual.start, manual.end);
      setDetections(next);
      setDisabled(new Set());
    } catch {
      setError(t.errorGeneric);
    }
  }

  const strictToggle = (
    <label className="strict-toggle">
      <input type="checkbox" checked={strict} onChange={(event) => void changeStrict(event.target.checked)} />
      <span className="strict-switch" aria-hidden="true" />
      <span className="strict-text">
        <strong>{t.strictLabel}</strong>
        <small>{t.strictHelp}</small>
      </span>
    </label>
  );

  function toggle(id: string) {
    setDisabled((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function maskSelection() {
    const range = getSelectionOffsets(document.getElementById(REVIEW_ID));
    if (!range) return;
    setDetections((previous) => addManual(previous, text, range.start, range.end));
    window.getSelection()?.removeAllRanges();
  }

  async function copy() {
    await navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function exportFile() {
    setExporting(true);
    setError(null);
    try {
      if (source.kind === 'pdf') {
        const { renderRedactedPages, measureText } = await loadPdfTools();
        const boxes = boxesFor(active, source.pdf.pages, source.spans, measureText);
        const images = await renderRedactedPages(source.pdf, boxes);
        const bytes = await getFilterApi().assembleRedactedPdf(source.bytes, images);
        downloadBlob(bytes, 'application/pdf', filteredName(source.name));
      } else if (source.kind === 'docx') {
        downloadBlob(await getFilterApi().docxRedact(source.bytes, active), DOCX_TYPE, filteredName(source.name));
      } else {
        downloadText(output, filteredName(source.kind === 'txt' ? source.name : t.defaultFileName));
      }
    } catch {
      setError(t.errorGeneric);
    } finally {
      setExporting(false);
    }
  }

  function restart() {
    releaseSource();
    setStep('input');
    setText('');
    setSource({ kind: 'text' });
    setDetections([]);
    setDisabled(new Set());
    setOutput('');
    setScanning(false);
    setLargeFile(false);
    setError(null);
  }

  const fileMeta =
    source.kind === 'pdf'
      ? t.fileKinds.pdf.replace('{count}', String(source.pdf.pages.length))
      : source.kind === 'docx' || source.kind === 'txt'
        ? t.fileKinds[source.kind]
        : '';

  return (
    <section className="filter-tool">
      <Notice>{t.warning}</Notice>
      {error && (
        <p className="filter-error" role="alert">
          {error}
        </p>
      )}
      {step === 'input' ? (
        <div className="filter-input rise-in">
          <label htmlFor="filter-text" className="filter-label">
            {t.inputLabel}
          </label>
          {source.kind !== 'text' && (
            <div className="file-card rise-in">
              <Icon name="file" className="file-card-icon" />
              <div className="file-card-text">
                <strong>{source.name}</strong>
                <span>{fileMeta}</span>
              </div>
              <button type="button" className="btn btn-ghost" onClick={removeFile}>
                <Icon name="close" />
                {t.fileRemove}
              </button>
            </div>
          )}
          <textarea
            id="filter-text"
            value={text}
            placeholder={t.inputPlaceholder}
            rows={12}
            readOnly={fromFile}
            aria-describedby={fromFile ? 'filter-readonly' : undefined}
            onChange={(event) => {
              setText(event.target.value);
              if (source.kind === 'txt') setSource({ kind: 'text' });
            }}
          />
          {fromFile && (
            <p id="filter-readonly" className="filter-note">
              {t.fileReadOnly}
            </p>
          )}
          {largeFile && <Notice tone="info">{t.largeFile}</Notice>}
          {reading ? (
            <p className="filter-reading" role="status">
              <span className="spinner" aria-hidden="true" />
              {t.reading}
            </p>
          ) : (
            <DropZone accept={ACCEPT} label={t.dropLabel} buttonLabel={t.dropButton} onFiles={handleFiles} />
          )}
          {strictToggle}
          <button type="button" className="btn" onClick={analyze} disabled={busy || reading || text.trim() === ''}>
            {busy ? <span className="spinner" aria-hidden="true" /> : <Icon name="sparkle" />}
            {busy ? t.analyzing : t.analyze}
          </button>
        </div>
      ) : (
        <div className="filter-review-layout rise-in">
          <div className="filter-panel">
            <h2>{t.reviewTitle}</h2>
            <p className="filter-help">{t.reviewHelp}</p>
            {!scanning && strictToggle}
            <p className="filter-count" aria-live="polite">
              {scanning && <span className="spinner" aria-hidden="true" />}
              {scanning ? t.scanning : active.length === 0 ? t.noneFound : t.found.replace('{count}', String(active.length))}
            </p>
            <HighlightedText
              id={REVIEW_ID}
              text={text}
              detections={scanning ? NO_DETECTIONS : detections}
              disabled={disabled}
              typeLabels={t.types}
              onToggle={toggle}
            />
            <button
              type="button"
              className="btn btn-secondary"
              disabled={scanning}
              onMouseDown={(event) => event.preventDefault()}
              onClick={maskSelection}
            >
              <Icon name="eraser" />
              {t.maskSelection}
            </button>
          </div>
          <div className="filter-panel">
            <div className="filter-panel-head">
              <h2>{t.resultTitle}</h2>
              {!scanning && (
                <span className="seal">
                  <img src={scan.seal} alt="" />
                  {t.protectedBadge}
                </span>
              )}
            </div>
            <p className="sr-only" role="status">
              {scanning ? '' : t.resultReady}
            </p>
            {scanning ? (
              <ScanReveal images={scan} label={t.scanLabel} onDone={() => setScanning(false)} />
            ) : (
              <>
                <pre className="filter-output" data-testid="filter-output">
                  {output}
                </pre>
                <div className="filter-actions rise-in">
                  <button type="button" className="btn" onClick={copy}>
                    <Icon key={copied ? 'done' : 'idle'} name={copied ? 'check' : 'copy'} className="icon-pop" />
                    {copied ? t.copied : t.copy}
                  </button>
                  <button type="button" className="btn btn-secondary" onClick={exportFile} disabled={exporting}>
                    {exporting ? <span className="spinner" aria-hidden="true" /> : <Icon name="download" />}
                    {exporting && source.kind === 'pdf' ? t.redacting : source.kind === 'pdf' ? t.downloadPdf : t.download}
                  </button>
                  {source.kind === 'pdf' && (
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => downloadText(output, filteredName(source.name, '.txt'))}
                    >
                      <Icon name="download" />
                      {t.downloadText}
                    </button>
                  )}
                  <button type="button" className="btn btn-ghost" onClick={restart}>
                    <Icon name="restart" />
                    {t.restart}
                  </button>
                </div>
                {source.kind === 'pdf' && <p className="filter-note">{t.pdfNote}</p>}
                {source.kind === 'docx' && <p className="filter-note">{t.docxNote}</p>}
              </>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
