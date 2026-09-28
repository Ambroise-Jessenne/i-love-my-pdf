import { useEffect, useMemo, useState } from 'react';
import type { Detection } from '../../../core/detect/types';
import { addManual } from '../../../core/redact/redact';
import { filteredName } from '../../../core/files/names';
import type { Dict } from '../../../i18n/fr';
import { getFilterApi } from '../../../workers/filterClient';
import { DropZone } from '../../ui/DropZone';
import { Icon } from '../../ui/Icon';
import { Notice } from '../../ui/Notice';
import { downloadText } from '../../ui/download';
import { HighlightedText } from './HighlightedText';
import { ScanReveal, type ScanImages } from './ScanReveal';
import { getSelectionOffsets } from './selection';
import './filter.css';

const REVIEW_ID = 'filter-review';
const NO_DETECTIONS: Detection[] = [];

interface FilterToolProps {
  t: Dict['filter'];
  scan: ScanImages;
}

export default function FilterTool({ t, scan }: FilterToolProps) {
  const [step, setStep] = useState<'input' | 'review'>('input');
  const [text, setText] = useState('');
  const [fileName, setFileName] = useState<string | null>(null);
  const [detections, setDetections] = useState<Detection[]>([]);
  const [disabled, setDisabled] = useState<Set<string>>(new Set());
  const [output, setOutput] = useState('');
  const [busy, setBusy] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const active = useMemo(() => detections.filter((d) => !disabled.has(d.id)), [detections, disabled]);

  // Warm the browser cache so the scanner starts at once.
  useEffect(() => {
    for (const src of [scan.exposed, scan.protected, scan.seal]) new Image().src = src;
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

  async function handleFiles(files: File[]) {
    const [file] = files;
    setError(null);
    if (!file.name.toLowerCase().endsWith('.txt')) {
      setError(t.errorFileType);
      return;
    }
    setText(await file.text());
    setFileName(file.name);
  }

  async function analyze() {
    setBusy(true);
    setError(null);
    try {
      setDetections(await getFilterApi().detect(text));
      setDisabled(new Set());
      setScanning(!window.matchMedia('(prefers-reduced-motion: reduce)').matches);
      setStep('review');
    } catch {
      setError(t.errorGeneric);
    } finally {
      setBusy(false);
    }
  }

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

  function restart() {
    setStep('input');
    setText('');
    setFileName(null);
    setDetections([]);
    setDisabled(new Set());
    setOutput('');
    setScanning(false);
    setError(null);
  }

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
          <textarea
            id="filter-text"
            value={text}
            placeholder={t.inputPlaceholder}
            rows={12}
            onChange={(event) => {
              setText(event.target.value);
              setFileName(null);
            }}
          />
          <DropZone accept=".txt,text/plain" label={t.dropLabel} buttonLabel={t.dropButton} onFiles={handleFiles} />
          <button type="button" className="btn" onClick={analyze} disabled={busy || text.trim() === ''}>
            {busy ? <span className="spinner" aria-hidden="true" /> : <Icon name="sparkle" />}
            {busy ? t.analyzing : t.analyze}
          </button>
        </div>
      ) : (
        <div className="filter-review-layout rise-in">
          <div className="filter-panel">
            <h2>{t.reviewTitle}</h2>
            <p className="filter-help">{t.reviewHelp}</p>
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
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => downloadText(output, filteredName(fileName ?? t.defaultFileName))}
                  >
                    <Icon name="download" />
                    {t.download}
                  </button>
                  <button type="button" className="btn btn-ghost" onClick={restart}>
                    <Icon name="restart" />
                    {t.restart}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
