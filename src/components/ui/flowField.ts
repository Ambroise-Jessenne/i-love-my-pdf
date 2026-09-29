// Subtle animated background: a grid of short strokes that follow a slow, fluid current and part around the pointer.
// Adapted from the "Fluid Flow Grid" effect, rewritten without React so static pages ship no framework.

const SPACING = 35; // px between two strokes
const LENGTH = 14; // stroke length, px
const NEAR_LENGTH = 22; // stroke length close to the pointer
const POINTER_RADIUS = 220;
const SPEED = 0.00048; // phase units per millisecond (0.008 per frame at 60 fps)
const FOLLOW = 0.08; // share of the gap to the pointer covered per 60 fps frame
const FRAME_MS = 1000 / 30; // the current is slow: 30 fps looks the same as 60 and costs half the work
// Faint strokes survive a lower resolution unharmed, and painting fewer pixels is what costs the least.
const RESOLUTION = 0.75;
const LEVELS = 5; // strokes are batched by opacity: one stroke() call per level instead of one per stroke

interface Colors {
  line: string;
  active: string;
  strength: number;
}

export function startFlowField(canvas: HTMLCanvasElement): () => void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return () => {};

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const darkScheme = window.matchMedia('(prefers-color-scheme: dark)');
  const pointer = { x: -1000, y: -1000, targetX: -1000, targetY: -1000 };
  let colors: Colors = { line: '0, 0, 0', active: '0, 0, 0', strength: 1 };
  let width = 0;
  let height = 0;
  let frameId: number | null = null;
  let lastFrame = 0;

  const readColors = () => {
    const style = getComputedStyle(document.documentElement);
    colors = {
      line: style.getPropertyValue('--flow-line').trim() || '0, 0, 0',
      active: style.getPropertyValue('--flow-line-active').trim() || '0, 0, 0',
      strength: Number(style.getPropertyValue('--flow-strength')) || 1,
    };
  };

  const resize = () => {
    width = canvas.clientWidth;
    height = canvas.clientHeight;
    canvas.width = Math.round(width * RESOLUTION);
    canvas.height = Math.round(height * RESOLUTION);
    ctx.setTransform(RESOLUTION, 0, 0, RESOLUTION, 0, 0); // absolute, so repeated resizes never compound the scale
  };

  const draw = (t: number) => {
    ctx.clearRect(0, 0, width, height);
    ctx.lineWidth = 1.2;
    const levels = Array.from({ length: LEVELS }, () => new Path2D());
    const near = new Path2D();

    for (let x = 0; x <= width + SPACING; x += SPACING) {
      for (let y = 0; y <= height + SPACING; y += SPACING) {
        let angle = Math.sin(x * 0.003 + t) + Math.cos(y * 0.003 + t);
        const dx = pointer.x - x;
        const dy = pointer.y - y;
        const distance = Math.hypot(dx, dy);
        const isNear = distance < POINTER_RADIUS && distance > 0;
        if (isNear) {
          const force = 1 - distance / POINTER_RADIUS;
          angle = angle * (1 - force) + (Math.atan2(dy, dx) + Math.PI) * force;
        }
        const length = isNear ? NEAR_LENGTH : LENGTH;
        const level = Math.min(LEVELS - 1, Math.floor(((Math.sin(x * 0.01 + y * 0.01 + t) + 1) / 2) * LEVELS));
        const path = isNear ? near : levels[level];
        path.moveTo(x, y);
        path.lineTo(x + Math.cos(angle) * length, y + Math.sin(angle) * length);
      }
    }

    levels.forEach((path, i) => {
      ctx.strokeStyle = `rgba(${colors.line}, ${(0.06 + i * 0.05) * colors.strength})`;
      ctx.stroke(path);
    });
    ctx.strokeStyle = `rgba(${colors.active}, ${0.5 * colors.strength})`;
    ctx.stroke(near);
  };

  // The phase comes from the clock, so the current keeps flowing seamlessly from one page to the next.
  const phase = () => (Date.now() % 1e9) * SPEED;

  const loop = (timestamp: number) => {
    frameId = requestAnimationFrame(loop);
    if (lastFrame && timestamp - lastFrame < FRAME_MS) return;
    const elapsed = lastFrame ? Math.min(timestamp - lastFrame, 100) : 16.7;
    lastFrame = timestamp;
    const follow = 1 - (1 - FOLLOW) ** (elapsed / 16.7);
    pointer.x += (pointer.targetX - pointer.x) * follow;
    pointer.y += (pointer.targetY - pointer.y) * follow;
    draw(phase());
  };

  const stop = () => {
    if (frameId !== null) cancelAnimationFrame(frameId);
    frameId = null;
    lastFrame = 0;
  };

  const start = () => {
    stop();
    if (reducedMotion.matches) draw(0); // one still frame
    else if (!document.hidden) frameId = requestAnimationFrame(loop);
  };

  const onResize = () => {
    resize();
    if (reducedMotion.matches) draw(0);
  };
  const onPointerMove = (event: PointerEvent) => {
    pointer.targetX = event.clientX;
    pointer.targetY = event.clientY;
  };
  const onPointerLeave = () => {
    pointer.targetX = -1000;
    pointer.targetY = -1000;
  };
  const onScheme = () => {
    readColors();
    if (reducedMotion.matches) draw(0);
  };

  readColors();
  resize();
  start();

  window.addEventListener('resize', onResize);
  window.addEventListener('pointermove', onPointerMove, { passive: true });
  document.documentElement.addEventListener('pointerleave', onPointerLeave);
  window.addEventListener('blur', onPointerLeave);
  document.addEventListener('visibilitychange', start);
  reducedMotion.addEventListener('change', start);
  darkScheme.addEventListener('change', onScheme);

  return () => {
    stop();
    window.removeEventListener('resize', onResize);
    window.removeEventListener('pointermove', onPointerMove);
    document.documentElement.removeEventListener('pointerleave', onPointerLeave);
    window.removeEventListener('blur', onPointerLeave);
    document.removeEventListener('visibilitychange', start);
    reducedMotion.removeEventListener('change', start);
    darkScheme.removeEventListener('change', onScheme);
  };
}
