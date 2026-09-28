// Subtle animated background: a mesh of flowing ribbons drawn on a canvas.
// Adapted from the "Flowing Ribbons" effect, rewritten without React so static pages ship no framework.

interface Disturbance {
  x: number;
  y: number;
  time: number;
}

const SPACING = 26; // px between two lines of the mesh
const STEPS = 56; // points per line
const FRAME_MS = 1000 / 24; // a slow drift looks the same at 24 fps and costs far less than 60
const SPEED = 0.012; // phase units per millisecond
// Faint lines survive a lower resolution unharmed, and painting a quarter of the pixels is much cheaper.
const RESOLUTION = 0.5;
const WAVE_MS = 3000;
const MOUSE_RADIUS = 200;

export function startRibbons(canvas: HTMLCanvasElement): () => void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return () => {};

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const darkScheme = window.matchMedia('(prefers-color-scheme: dark)');
  const mouse = { x: -9999, y: -9999 };
  let waves: Disturbance[] = [];
  let lineColor = '';
  let width = 0;
  let height = 0;
  let frameId: number | null = null;
  let lastFrame = 0;

  const readColor = () => {
    lineColor = getComputedStyle(document.documentElement).getPropertyValue('--ribbon-line').trim() || 'rgb(0 0 0 / 0.1)';
  };

  const resize = () => {
    width = canvas.clientWidth;
    height = canvas.clientHeight;
    canvas.width = Math.round(width * RESOLUTION);
    canvas.height = Math.round(height * RESOLUTION);
    ctx.setTransform(RESOLUTION, 0, 0, RESOLUTION, 0, 0);
  };

  const waveAt = (x: number, y: number, now: number): number => {
    let total = 0;
    for (const wave of waves) {
      const age = now - wave.time;
      const distance = Math.hypot(x - wave.x, y - wave.y);
      const gap = Math.abs(distance - (age / WAVE_MS) * 400);
      if (gap < 80) total += (1 - age / WAVE_MS) * (1 - gap / 80) * Math.sin((distance - (age / WAVE_MS) * 400) * 0.1);
    }
    return total;
  };

  // Terms that depend only on the line's progress, computed once per line instead of once per point.
  const lineTerms = (progress: number, t: number) => ({
    wave1: Math.sin(progress * Math.PI * 4 + t * 0.01) * 30,
    wave2: Math.sin(progress * Math.PI * 7 - t * 0.008) * 15,
    mouse: Math.sin(t * 0.02 + progress * Math.PI * 2) * 20,
    ripple: Math.sin(t * 0.015 + progress * Math.PI * 3) * 25,
  });

  const plot = (x: number, y: number, t: number, terms: ReturnType<typeof lineTerms>, now: number, first: boolean) => {
    const dx = x - mouse.x;
    const dy = y - mouse.y;
    const near = dx * dx + dy * dy < MOUSE_RADIUS * MOUSE_RADIUS;
    const mouseWave = near ? (1 - Math.sqrt(dx * dx + dy * dy) / MOUSE_RADIUS) * terms.mouse : 0;
    const disturbanceWave = waves.length > 0 ? waveAt(x, y, now) * terms.ripple : 0;
    const harmonic = Math.sin(x * 0.02 + y * 0.015 + t * 0.005) * 10;
    const px = x + terms.wave1 + harmonic + mouseWave + disturbanceWave;
    const py = y + terms.wave2 + mouseWave * 0.5 + disturbanceWave * 0.7;
    if (first) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  };

  const draw = (now: number, t: number) => {
    waves = waves.filter((wave) => now - wave.time < WAVE_MS);
    ctx.clearRect(0, 0, width, height);
    ctx.strokeStyle = lineColor;
    ctx.lineWidth = 1;

    const ribbonWidth = width * 0.85;
    const offset = (width - ribbonWidth) / 2;
    const columns = Math.max(16, Math.round(ribbonWidth / SPACING));
    const rows = Math.max(16, Math.round((height * 1.2) / SPACING));
    const stepTerms = Array.from({ length: STEPS + 1 }, (_, j) => lineTerms((j / STEPS) * 1.2 - 0.1, t));

    // A single path and a single stroke() call: far cheaper than one per line.
    ctx.beginPath();
    for (let i = 0; i < columns; i++) {
      const x = offset + (i / columns) * ribbonWidth;
      for (let j = 0; j <= STEPS; j++) {
        plot(x, ((j / STEPS) * 1.2 - 0.1) * height, t, stepTerms[j], now, j === 0);
      }
    }
    for (let j = 0; j < rows; j++) {
      const progress = (j / rows) * 1.2 - 0.1;
      const terms = lineTerms(progress, t);
      for (let i = 0; i <= STEPS; i++) {
        plot(offset + (i / STEPS) * ribbonWidth, progress * height, t, terms, now, i === 0);
      }
    }
    ctx.stroke();
  };

  // The phase comes from the clock, so the ribbons keep flowing seamlessly from one page to the next.
  const phase = (now: number) => (now % 1e9) * SPEED;

  const loop = (timestamp: number) => {
    frameId = requestAnimationFrame(loop);
    if (timestamp - lastFrame < FRAME_MS) return;
    lastFrame = timestamp;
    const now = Date.now();
    draw(now, phase(now));
  };

  const stop = () => {
    if (frameId !== null) cancelAnimationFrame(frameId);
    frameId = null;
  };

  const start = () => {
    stop();
    if (reducedMotion.matches) {
      draw(0, 0); // one still frame
    } else if (!document.hidden) {
      frameId = requestAnimationFrame(loop);
    }
  };

  const onResize = () => {
    resize();
    if (reducedMotion.matches) draw(0, 0);
  };
  const onPointerMove = (event: PointerEvent) => {
    mouse.x = event.clientX;
    mouse.y = event.clientY;
  };
  const onPointerLeave = () => {
    mouse.x = -9999;
    mouse.y = -9999;
  };
  const onPointerDown = (event: PointerEvent) => {
    waves.push({ x: event.clientX, y: event.clientY, time: Date.now() });
  };
  const onScheme = () => {
    readColor();
    if (reducedMotion.matches) draw(0, 0);
  };

  readColor();
  resize();
  start();

  window.addEventListener('resize', onResize);
  window.addEventListener('pointermove', onPointerMove, { passive: true });
  window.addEventListener('pointerdown', onPointerDown, { passive: true });
  document.documentElement.addEventListener('pointerleave', onPointerLeave);
  document.addEventListener('visibilitychange', start);
  reducedMotion.addEventListener('change', start);
  darkScheme.addEventListener('change', onScheme);

  return () => {
    stop();
    window.removeEventListener('resize', onResize);
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerdown', onPointerDown);
    document.documentElement.removeEventListener('pointerleave', onPointerLeave);
    document.removeEventListener('visibilitychange', start);
    reducedMotion.removeEventListener('change', start);
    darkScheme.removeEventListener('change', onScheme);
  };
}
