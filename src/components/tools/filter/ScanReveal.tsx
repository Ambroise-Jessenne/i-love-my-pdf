import { useEffect, useRef, useState, type CSSProperties } from 'react';

export interface ScanImages {
  /** Shown first: the face is visible, like unprotected data. */
  exposed: string;
  /** Revealed by the scanner bar: the face is hidden, like protected data. */
  protected: string;
  /** Small round crop of `protected`, kept next to the result as a "protected" seal. */
  seal: string;
}

interface ScanRevealProps {
  images: ScanImages;
  label: string;
  onDone: () => void;
}

const LOAD_MAX_MS = 800; // never wait longer than this for the images
const SCAN_MS = 1600;
const HOLD_MS = 450;
const LEAVE_MS = 380;

type Phase = 'load' | 'scan' | 'hold' | 'leave';

/** Sweeps a scanner bar over the exposed image; the protected one appears in its wake. */
export function ScanReveal({ images, label, onDone }: ScanRevealProps) {
  const [phase, setPhase] = useState<Phase>('load');
  const done = useRef(onDone);
  done.current = onDone;

  useEffect(() => {
    let cancelled = false;
    const decode = (src: string) => {
      const img = new Image();
      img.src = src;
      return img.decode().catch(() => undefined);
    };
    const timeout = new Promise((resolve) => setTimeout(resolve, LOAD_MAX_MS));
    Promise.race([Promise.all([decode(images.exposed), decode(images.protected)]), timeout]).then(() => {
      if (!cancelled) setPhase('scan');
    });
    return () => {
      cancelled = true;
    };
  }, [images.exposed, images.protected]);

  useEffect(() => {
    const next: Partial<Record<Phase, [number, () => void]>> = {
      scan: [SCAN_MS, () => setPhase('hold')],
      hold: [HOLD_MS, () => setPhase('leave')],
      leave: [LEAVE_MS, () => done.current()],
    };
    const step = next[phase];
    if (!step) return;
    const id = setTimeout(step[1], step[0]);
    return () => clearTimeout(id);
  }, [phase]);

  const style = { '--scan-duration': `${SCAN_MS}ms`, '--leave-duration': `${LEAVE_MS}ms` } as CSSProperties;

  return (
    <div className={`scan is-${phase}`} style={style} role="img" aria-label={label}>
      <img className="scan-img" src={images.exposed} alt="" decoding="async" />
      <img className="scan-img scan-protected" src={images.protected} alt="" decoding="async" />
      <div className="scan-sweep" />
    </div>
  );
}
