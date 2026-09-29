import { useEffect, useRef, useState, type MouseEvent } from 'react';
import { groupLabel, parseRanges } from '../../../core/pdf/split';
import type { Dict } from '../../../i18n/fr';
import { getPdfToolsApi } from '../../../workers/pdfToolsClient';
import { DropZone } from '../../ui/DropZone';
import { Icon } from '../../ui/Icon';
import { downloadBlob } from '../../ui/download';
import { baseName, extensionOf, fill, LARGE_FILE, PDF_ACCEPT, readBytes } from '../common/files';
import { ProgressBar } from '../common/ProgressBar';
import '../common/tools.css';

interface Source {
  name: string;
  bytes: Uint8Array;
  pages: number;
}

const THUMB_WIDTH = 160;

export default function SplitTool({ t }: { t: Dict['tools'] }) {
  const [source, setSource] = useState<Source | null>(null);
  const [thumbs, setThumbs] = useState<(string | null)[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [anchor, setAnchor] = useState<number | null>(null);
  const [mode, setMode] = useState<'extract' | 'split'>('extract');
  const [splitKind, setSplitKind] = useState<'ranges' | 'each'>('ranges');
  const [ranges, setRanges] = useState('');
  const [rangesError, setRangesError] = useState<string | null>(null);
  const [reading, setReading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [large, setLarge] = useState(false);
  const generation = useRef(0); // stops thumbnails of a previous file from landing on the new one
  const urls = useRef<string[]>([]);

  const releaseThumbs = () => {
    urls.current.forEach((url) => URL.revokeObjectURL(url));
    urls.current = [];
  };
  useEffect(() => releaseThumbs, []);

  async function load(files: File[]) {
    const [file] = files;
    setError(null);
    setDone(false);
    if (extensionOf(file.name) !== 'pdf') {
      setError(t.errorPdfOnly);
      return;
    }
    const current = ++generation.current;
    releaseThumbs();
    setLarge(file.size > LARGE_FILE);
    setReading(true);
    const { loadPdfDocument, renderThumbnail, closeDocument, PdfError } = await import('../../pdf/pdfjs');
    try {
      const bytes = await readBytes(file);
      const doc = await loadPdfDocument(bytes);
      setSource({ name: file.name, bytes, pages: doc.numPages });
      setThumbs(new Array<string | null>(doc.numPages).fill(null));
      setSelected(new Set());
      setAnchor(null);
      setReading(false);
      for (let i = 0; i < doc.numPages && generation.current === current; i++) {
        const url = await renderThumbnail(doc, i, THUMB_WIDTH).catch(() => null);
        if (!url) continue;
        if (generation.current !== current) {
          URL.revokeObjectURL(url);
          break;
        }
        urls.current.push(url);
        setThumbs((previous) => previous.map((thumb, j) => (j === i ? url : thumb)));
      }
      await closeDocument(doc);
    } catch (reason) {
      setError(reason instanceof PdfError && reason.reason === 'password' ? t.errorPassword : fill(t.errorRead, { name: file.name }));
    } finally {
      if (generation.current === current) setReading(false);
    }
  }

  function reset() {
    generation.current++;
    releaseThumbs();
    setSource(null);
    setThumbs([]);
    setSelected(new Set());
    setRanges('');
    setRangesError(null);
    setError(null);
    setDone(false);
    setLarge(false);
  }

  function toggle(index: number, event: MouseEvent) {
    setDone(false);
    setSelected((previous) => {
      const next = new Set(previous);
      if (event.shiftKey && anchor !== null) {
        const [from, to] = anchor < index ? [anchor, index] : [index, anchor];
        for (let i = from; i <= to; i++) next.add(i);
      } else if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
    setAnchor(index);
  }

  async function run() {
    if (!source) return;
    setError(null);
    setRangesError(null);
    setDone(false);
    const base = baseName(source.name);
    let task: () => Promise<void>;
    if (mode === 'extract') {
      if (selected.size === 0) {
        setError(t.split.needSelection);
        return;
      }
      const pages = [...selected].sort((a, b) => a - b);
      task = async () => downloadBlob(await getPdfToolsApi().extract(source.bytes, pages), 'application/pdf', `${base}_pages.pdf`);
    } else {
      let groups: number[][];
      if (splitKind === 'each') groups = Array.from({ length: source.pages }, (_, i) => [i]);
      else {
        const parsed = parseRanges(ranges, source.pages);
        if ('error' in parsed) {
          const messages = { empty: t.split.errorEmpty, syntax: t.split.errorSyntax, bounds: fill(t.split.errorBounds, { count: source.pages }) };
          setRangesError(messages[parsed.error]);
          return;
        }
        groups = parsed.groups;
      }
      const names = groups.map((group) => `${base}_${groupLabel(group)}.pdf`);
      task = async () => downloadBlob(await getPdfToolsApi().splitToZip(source.bytes, groups, names), 'application/zip', `${base}_decoupe.zip`);
    }
    setBusy(true);
    try {
      await task();
      setDone(true);
    } catch {
      setError(t.errorGeneric);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="tool">
      {error && (
        <p className="tool-error" role="alert">
          {error}
        </p>
      )}
      {!source ? (
        reading ? (
          <ProgressBar label={t.reading} />
        ) : (
          <DropZone accept={PDF_ACCEPT} label={t.split.dropLabel} buttonLabel={t.split.dropButton} onFiles={load} />
        )
      ) : (
        <>
          <div className="tool-file">
            <Icon name="file" />
            <span className="tool-file-text">
              <strong>{source.name}</strong>
              <span>{fill(t.pages, { count: source.pages })}</span>
            </span>
            <button type="button" className="btn btn-ghost" onClick={reset}>
              <Icon name="restart" />
              {t.change}
            </button>
          </div>
          {large && <p className="tool-hint">{t.largeFile}</p>}

          <fieldset className="segmented">
            <legend>{t.split.modeLabel}</legend>
            <label>
              <input type="radio" name="split-mode" checked={mode === 'extract'} onChange={() => setMode('extract')} />
              {t.split.modeExtract}
            </label>
            <label>
              <input type="radio" name="split-mode" checked={mode === 'split'} onChange={() => setMode('split')} />
              {t.split.modeSplit}
            </label>
          </fieldset>

          {mode === 'extract' ? (
            <>
              <div className="page-toolbar">
                <button type="button" className="btn btn-secondary" onClick={() => setSelected(new Set(thumbs.map((_, i) => i)))}>
                  {t.split.selectAll}
                </button>
                <button type="button" className="btn btn-ghost" onClick={() => setSelected(new Set())}>
                  {t.split.selectNone}
                </button>
                <span className="count" aria-live="polite">
                  {fill(t.split.selected, { count: selected.size })}
                </span>
              </div>
              <p className="tool-hint">{t.split.gridHint}</p>
            </>
          ) : (
            <>
              <fieldset className="segmented">
                <legend>{t.split.modeSplit}</legend>
                <label>
                  <input type="radio" name="split-kind" checked={splitKind === 'ranges'} onChange={() => setSplitKind('ranges')} />
                  {t.split.splitByRanges}
                </label>
                <label>
                  <input type="radio" name="split-kind" checked={splitKind === 'each'} onChange={() => setSplitKind('each')} />
                  {t.split.splitEachPage}
                </label>
              </fieldset>
              {splitKind === 'ranges' && (
                <div className="ranges">
                  <label htmlFor="split-ranges">{t.split.rangesLabel}</label>
                  <input
                    id="split-ranges"
                    value={ranges}
                    placeholder={t.split.rangesPlaceholder}
                    aria-invalid={rangesError ? 'true' : undefined}
                    aria-describedby="split-ranges-help"
                    onChange={(event) => {
                      setRanges(event.target.value);
                      setRangesError(null);
                    }}
                  />
                  <p id="split-ranges-help" className={rangesError ? 'tool-error' : 'tool-hint'} role={rangesError ? 'alert' : undefined}>
                    {rangesError ?? t.split.rangesHelp}
                  </p>
                </div>
              )}
            </>
          )}

          <ul className="page-grid">
            {thumbs.map((thumb, i) => {
              const label = fill(t.split.pageLabel, { n: i + 1 });
              return (
                <li key={i}>
                  <button
                    type="button"
                    className="page-thumb"
                    aria-pressed={mode === 'extract' ? selected.has(i) : undefined}
                    aria-label={label}
                    disabled={mode !== 'extract'}
                    onClick={(event) => toggle(i, event)}
                  >
                    {thumb ? <img src={thumb} alt="" /> : <span className="page-placeholder" />}
                    <span>{label}</span>
                    <span className="page-check" aria-hidden="true">
                      <Icon name="check" />
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>

          {busy ? (
            <ProgressBar label={t.split.working} />
          ) : (
            <button type="button" className="btn" onClick={run}>
              <Icon name={mode === 'extract' ? 'download' : 'scissors'} />
              {mode === 'extract' ? t.split.extractAction : t.split.splitAction}
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
