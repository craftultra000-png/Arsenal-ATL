interface OrbDefinition {
  size: (width: number, height: number) => number;
  position: (width: number, height: number, size: number) => { x: number; y: number };
  delta: (width: number, height: number) => { x: number; y: number };
  color: [string, string];
  duration: number;
  delay: number;
}

interface OrbHandle {
  destroy(): void;
}

const orbs: readonly OrbDefinition[] = [
  { size: (w) => Math.min(w * .8, 480), position: (w, h) => ({ x: -w * .12, y: -h * .08 }), delta: (w, h) => ({ x: w * .08, y: h * .10 }), color: ['rgba(30,110,230,1)', 'rgba(20,80,180,.60)'], duration: 20_000, delay: 0 },
  { size: (w) => Math.min(w * .65, 380), position: (w, h, s) => ({ x: w - w * .10 - s, y: h * .10 }), delta: (w, h) => ({ x: -w * .07, y: h * .08 }), color: ['rgba(0,220,180,.90)', 'rgba(0,180,150,.50)'], duration: 25_000, delay: -7_000 },
  { size: (w) => Math.min(w * .60, 360), position: (w, h) => ({ x: w * .25, y: h * .30 }), delta: (w, h) => ({ x: -w * .06, y: -h * .08 }), color: ['rgba(220,170,40,.75)', 'rgba(200,140,20,.40)'], duration: 22_000, delay: -12_000 },
  { size: (w) => Math.min(w * .60, 360), position: (w, h) => ({ x: -w * .08, y: h * .55 }), delta: (w, h) => ({ x: w * .09, y: -h * .06 }), color: ['rgba(30,110,230,.80)', 'rgba(20,80,180,.40)'], duration: 28_000, delay: -4_000 },
  { size: (w) => Math.min(w * .65, 380), position: (w, h, s) => ({ x: w - w * .10 - s, y: h - h * .08 - s }), delta: (w, h) => ({ x: -w * .08, y: -h * .07 }), color: ['rgba(0,220,180,.85)', 'rgba(0,180,150,.45)'], duration: 23_000, delay: -10_000 }
] as const;

/**
 * A specialised, single-canvas reproduction of Arsenal's five blurred background orbs.
 * Gradients are rasterised once then only composited, so it costs less than animating five CSS blur filters.
 */
export function mountReferenceOrbs(host: HTMLElement): OrbHandle {
  const canvas = document.createElement('canvas');
  canvas.className = 'arsenal-reference-orbs';
  canvas.setAttribute('aria-hidden', 'true');
  host.appendChild(canvas);

  const context = canvas.getContext('2d', { alpha: true });
  if (!context) return { destroy: () => canvas.remove() };

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const isPhone = window.matchMedia('(max-width: 560px)');
  const sprites = orbs.map((orb) => createOrbSprite(orb.color));
  let width = 1;
  let height = 1;
  let frame = 0;
  let lastDraw = -Infinity;
  let stopped = false;
  const frameInterval = () => 1000 / (isPhone.matches ? 24 : 30);

  const resize = () => {
    width = Math.max(host.clientWidth, 1);
    height = Math.max(host.clientHeight, 1);
    canvas.width = width;
    canvas.height = height;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    draw(performance.now(), true);
  };
  const observer = new ResizeObserver(resize);
  observer.observe(host);

  const draw = (time: number, force = false) => {
    if (stopped || (!force && time - lastDraw < frameInterval())) return;
    lastDraw = time;
    context.clearRect(0, 0, width, height);
    orbs.forEach((orb, index) => {
      const size = orb.size(width, height);
      const base = orb.position(width, height, size);
      const movement = orb.delta(width, height);
      const phase = (time + orb.delay) / orb.duration;
      const travel = (Math.sin(phase * Math.PI * 2 - Math.PI / 2) + 1) / 2;
      const pulse = .30 + .70 * (Math.sin((time + orb.delay) / (orb.duration * .90) * Math.PI * 2 - Math.PI / 2) + 1) / 2;
      context.globalAlpha = pulse;
      context.drawImage(sprites[index], base.x + movement.x * travel, base.y + movement.y * travel, size, size);
    });
    context.globalAlpha = 1;
  };

  const animate = (time: number) => {
    frame = 0;
    draw(time);
    if (!stopped && !reducedMotion.matches) frame = window.requestAnimationFrame(animate);
  };
  const start = () => {
    if (!frame && !stopped && !reducedMotion.matches) frame = window.requestAnimationFrame(animate);
  };
  const onVisibility = () => {
    if (document.hidden) {
      if (frame) window.cancelAnimationFrame(frame);
      frame = 0;
    } else start();
  };
  const onMotionChange = () => {
    if (reducedMotion.matches) {
      if (frame) window.cancelAnimationFrame(frame);
      frame = 0;
      draw(0, true);
    } else start();
  };

  document.addEventListener('visibilitychange', onVisibility);
  reducedMotion.addEventListener('change', onMotionChange);
  resize();
  start();

  return {
    destroy() {
      stopped = true;
      if (frame) window.cancelAnimationFrame(frame);
      observer.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      reducedMotion.removeEventListener('change', onMotionChange);
      canvas.remove();
    }
  };
}

function createOrbSprite([core, edge]: OrbDefinition['color']): HTMLCanvasElement {
  const sprite = document.createElement('canvas');
  sprite.width = 256;
  sprite.height = 256;
  const context = sprite.getContext('2d');
  if (!context) return sprite;
  const gradient = context.createRadialGradient(128, 128, 0, 128, 128, 128);
  gradient.addColorStop(0, core);
  gradient.addColorStop(.40, edge);
  gradient.addColorStop(.72, 'rgba(0,0,0,0)');
  gradient.addColorStop(1, 'rgba(0,0,0,0)');
  context.fillStyle = gradient;
  context.fillRect(0, 0, 256, 256);
  return sprite;
}
