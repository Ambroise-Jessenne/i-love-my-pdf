import { useEffect, useRef, useState, type DragEvent } from 'react';
import type { Dict } from '../../../i18n/fr';
import { getPdfToolsApi } from '../../../workers/pdfToolsClient';
import { DropZone } from '../../ui/DropZone';
import { Icon } from '../../ui/Icon';
import { downloadBlob } from '../../ui/download';
import { baseName, fill, isPdf, LARGE_FILE, PDF_ACCEPT, readBytes } from '../common/files';
import { ProgressBar } from '../common/ProgressBar';
import '../common/tools.css';

interface Item {
  id: string;
  name: string;
  bytes: Uint8Array;
  pages: number;
  thumb: string | null;
}

let nextId = 0;

export default function MergeTool({ t }: { t: Dict['tools'] }) {
  const [items, setItems] = useState<Item[]>([]);
  const [reading, setReading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [large, setLarge] = useState(false);
  const [dragging, setDragging] = useState<number | null>(null);
  const thumbs = useRef(new Set<string>());

  useEffect(() => () => thumbs.current.forEach((url) => URL.revokeObjectURL(url)), []);

  async function addFiles(files: File[]) {
    setError(null);
    setDone(false);
    setReading(true);
    const { loadPdfDocument, renderThumbnail, closeDocument, PdfError } = await import('../../pdf/pdfjs');
    try {
      for (const file of files) {
        if (!(await isPdf(file))) {
          setError(t.errorPdfOnly);
          continue;
        }
        if (file.size > LARGE_FILE) setLarge(true);
        try {
          const bytes = await readBytes(file);
          const doc = await loadPdfDocument(bytes);
          const thumb = await renderThumbnail(doc, 0, 120).catch(() => null);
          if (thumb) thumbs.current.add(thumb);
          const item: Item = { id: `f${nextId++}`, name: file.name, bytes, pages: doc.numPages, thumb };
          await closeDocument(doc);
          setItems((previous) => [...previous, item]);
        } catch (reason) {
          setError(reason instanceof PdfError && reason.reason === 'password' ? t.errorPassword : fill(t.errorRead, { name: file.name }));
        }
      }
    } finally {
      setReading(false);
    }
  }

  function move(from: number, to: number) {
    if (to < 0 || to >= items.length || from === to) return;
    setItems((previous) => {
      const next = [...previous];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });
    setDone(false);
  }

  function remove(index: number) {
    const item = items[index];
    if (item.thumb) {
      URL.revokeObjectURL(item.thumb);
      thumbs.current.delete(item.thumb);
    }
    setItems((previous) => previous.filter((_, i) => i !== index));
    setDone(false);
  }

  function dragOver(event: DragEvent<HTMLLIElement>, index: number) {
    if (dragging === null) return; // files dragged from the desktop go to the drop zone
    event.preventDefault();
    if (index !== dragging) {
      move(dragging, index);
      setDragging(index);
    }
  }

  async function merge() {
    setBusy(true);
    setError(null);
    setDone(false);
    try {
      const bytes = await getPdfToolsApi().merge(items.map((item) => item.bytes));
      downloadBlob(bytes, 'application/pdf', `${baseName(items[0].name)}_fusion.pdf`);
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
      <DropZone
        accept={PDF_ACCEPT}
        multiple
        label={items.length > 0 ? t.merge.addMore : t.merge.dropLabel}
        buttonLabel={t.merge.dropButton}
        onFiles={addFiles}
      />
      {reading && <ProgressBar label={t.reading} />}
      {large && <p className="tool-hint">{t.largeFile}</p>}
      {items.length > 0 && (
        <>
          <p className="tool-hint">{t.merge.dragHint}</p>
          <ol className="file-list" aria-label={t.merge.listLabel}>
            {items.map((item, i) => (
              <li
                key={item.id}
                className={dragging === i ? 'file-item is-dragging' : 'file-item'}
                draggable
                onDragStart={(event) => {
                  event.dataTransfer.effectAllowed = 'move';
                  setDragging(i);
                }}
                onDragOver={(event) => dragOver(event, i)}
                onDrop={(event) => event.preventDefault()}
                onDragEnd={() => setDragging(null)}
              >
                <Icon name="grip" className="file-grip" />
                <span className="file-order">{i + 1}</span>
                {item.thumb ? <img className="file-thumb" src={item.thumb} alt="" /> : <Icon name="file" className="file-grip" />}
                <span className="file-item-text">
                  <strong>{item.name}</strong>
                  <span>{fill(t.pages, { count: item.pages })}</span>
                </span>
                <span className="file-item-actions">
                  <button type="button" className="icon-btn" aria-label={`${t.merge.moveUp} : ${item.name}`} disabled={i === 0} onClick={() => move(i, i - 1)}>
                    <Icon name="arrowUp" />
                  </button>
                  <button
                    type="button"
                    className="icon-btn"
                    aria-label={`${t.merge.moveDown} : ${item.name}`}
                    disabled={i === items.length - 1}
                    onClick={() => move(i, i + 1)}
                  >
                    <Icon name="arrowDown" />
                  </button>
                  <button type="button" className="icon-btn" aria-label={`${t.remove} : ${item.name}`} onClick={() => remove(i)}>
                    <Icon name="close" />
                  </button>
                </span>
              </li>
            ))}
          </ol>
        </>
      )}
      {items.length === 1 && <p className="tool-hint">{t.merge.needTwo}</p>}
      {busy ? (
        <ProgressBar label={t.merge.working} />
      ) : (
        <button type="button" className="btn" onClick={merge} disabled={items.length < 2 || reading}>
          <Icon name="layers" />
          {t.merge.action}
        </button>
      )}
      {done && (
        <p className="tool-done" role="status">
          {t.done}
        </p>
      )}
    </section>
  );
}
