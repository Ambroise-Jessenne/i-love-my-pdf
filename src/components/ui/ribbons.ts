// Subtle animated background: a mesh of flowing ribbons drawn on a canvas.
// Adapted from the "Flowing Ribbons" effect, rewritten without React so static pages ship no framework.

interface Disturbance {
  x: number;
  y: number;
  time: number;
}

const SPACING = 22; // px between two lines of the mesh
const STEPS = 64; // points per line
const FRAME_MS = 1000 / 30; // a slow drift looks the same at 30 fps and costs half the work
const SPEED = 0.012; // phase units per millisecond
const MAX_DPR = 1.5;
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
    const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
    width = canvas.clientWidth;
    height = canvas.clientHeight;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
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

  const deform = (x: number, y: number, t: number, progress: number, now: number) => {
    const mouseInfluence = Math.max(0, 1 - Math.hypot(x - mouse.x, y - mouse.y) / MOUSE_RADIUS);
    const disturbance = waves.length > 0 ? waveAt(x, y, now) : 0;
    const wave1 = Math.sin(progress * Math.PI * 4 + t * 0.01) * 30;
    const wave2 = Math.sin(progress * Math.PI * 7 - t * 0.008) * 15;
    const harmonic = Math.sin(x * 0.02 + y * 0.015 + t * 0.005) * 10;
    const mouseWave = mouseInfluence * Math.sin(t * 0.02 + progress * Math.PI * 2) * 20;
    const disturbanceWave = disturbance * Math.sin(t * 0.015 + progress * Math.PI * 3) * 25;
    return [x + wave1 + harmonic + mouseWave + disturbanceWave, y + wave2 + mouseWave * 0.5 + disturbanceWave * 0.7];
  };

  const draw = (now: number, t: number) => {
    waves = waves.filter((wave) => now - wave.time < WAVE_MS);
    ctx.clearRect(0, 0, width, height);
    ctx.strokeStyle = lineColor;
    ctx.lineWidth = 0.6;

    const ribbonWidth = width * 0.85;
    const offset = (width - ribbonWidth) / 2;
    const columns = Math.max(16, Math.round(ribbonWidth / SPACING));
    const rows = Math.max(16, Math.round((height * 1.2) / SPACING));

    // One path per direction: a single stroke() call is far cheaper than one per line.
    ctx.beginPath();
    for (let i = 0; i < columns; i++) {
      const x = offset + (i / columns) * ribbonWidth;
      for (let j = 0; j <= STEPS; j++) {
        const progress = (j / STEPS) * 1.2 - 0.1;
        const [px, py] = deform(x, progress * height, t, progress, now);
        if (j === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
    }
    for (let j = 0; j < rows; j++) {
      const progress = (j / rows) * 1.2 - 0.1;
      const y = progress * height;
      for (let i = 0; i <= STEPS; i++) {
        const [px, py] = deform(offset + (i / STEPS) * ribbonWidth, y, t, progress, now);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
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
