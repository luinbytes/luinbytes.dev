import {
  PALETTES,
  SCENES,
  cellDelay,
  cellMotion,
  rasterize,
  styleField,
  type Scene,
} from "./scenes";

const easeOut = (t: number) => 1 - (1 - t) ** 3;
const easeInOut = (t: number) =>
  t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2;

function hash(n: number) {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
}

export class DotCut {
  private canvas = document.createElement("canvas");
  private ctx = this.canvas.getContext("2d");
  private cols = 42;
  private rows = 12;
  private pitch = 10;
  private ox = 0;
  private oy = 0;
  private target = new Uint8Array();
  private live = new Float32Array();
  private from = new Float32Array();
  private delay = new Float32Array();
  private rnd = new Float32Array();
  private prog = new Float32Array();
  private dir = new Float32Array();
  private bore = new Float32Array();
  private sceneIdx = 0;
  private prevScene = 0;
  private phase: "hold" | "morph" = "hold";
  private phaseT = 0;
  private styleT = 0;
  private paletteMix = 1;
  private prevPalette = 0;
  private pointer: { x: number; y: number } | null = null;
  private raf = 0;
  private last = 0;
  private running = false;
  private dpr = 1;
  private ro: ResizeObserver;

  constructor(private host: HTMLElement, private fontFamily = "sans-serif") {
    this.canvas.style.cssText = "display:block;width:100%;height:100%";
    this.canvas.setAttribute("aria-hidden", "true");
    host.appendChild(this.canvas);
    this.resize();
    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(host);
  }

  private applyScene(scene: Scene, instant: boolean) {
    const next = rasterize(scene, this.cols, this.rows, this.fontFamily);
    this.from.set(this.live);
    this.target = next;
    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols; x++) {
        const i = y * this.cols + x;
        this.delay[i] = cellDelay(
          scene.transition,
          x,
          y,
          this.cols,
          this.rows,
          this.rnd[i],
        );
      }
    }
    if (instant) {
      this.live.set(next);
      this.from.set(next);
    }
  }

  private resize() {
    if (!this.ctx) return;
    const w = this.host.clientWidth;
    const h = this.host.clientHeight;
    if (!w || !h) return;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.round(w * this.dpr);
    this.canvas.height = Math.round(h * this.dpr);
    this.pitch = w / (this.cols + 1.5);
    this.rows = Math.max(3, Math.floor((h - 1.5 * this.pitch) / this.pitch));
    this.ox = (w - this.cols * this.pitch) / 2;
    this.oy = (h - this.rows * this.pitch) / 2;

    const n = this.cols * this.rows;
    this.target = new Uint8Array(n);
    this.live = new Float32Array(n);
    this.from = new Float32Array(n);
    this.delay = new Float32Array(n);
    this.rnd = new Float32Array(n);
    this.prog = new Float32Array(n);
    this.dir = new Float32Array(n);
    this.bore = new Float32Array(n);
    for (let i = 0; i < n; i++) this.rnd[i] = hash(i * 1.37 + 0.5);
    this.applyScene(SCENES[this.sceneIdx], true);
    this.draw(0);
  }

  private advance() {
    this.prevScene = this.sceneIdx;
    this.sceneIdx = (this.sceneIdx + 1) % SCENES.length;
    this.prevPalette = SCENES[this.prevScene].palette;
    this.paletteMix = 0;
    this.phase = "morph";
    this.phaseT = 0;
    this.styleT = 0;
    this.applyScene(SCENES[this.sceneIdx], false);
  }

  private step(dt: number) {
    this.phaseT += dt * 1000;
    if (this.phase === "hold" && this.phaseT >= 600) this.advance();
    else if (this.phase === "morph" && this.phaseT >= 520) {
      this.phase = "hold";
      this.phaseT = 0;
    }

    const p = this.phase === "morph" ? Math.min(1, this.phaseT / 520) : 1;
    for (let i = 0; i < this.live.length; i++) {
      const local = Math.min(1, Math.max(0, (p - this.delay[i] * 0.72) / 0.28));
      this.live[i] = this.from[i] + (this.target[i] - this.from[i]) * easeOut(local);
      this.prog[i] =
        this.from[i] !== this.target[i] && this.phase === "morph" ? local : 0;
      this.dir[i] = this.target[i] > this.from[i] ? 1 : -1;
    }
    this.paletteMix = Math.min(1, this.paletteMix + dt * 2.2);
    this.styleT =
      this.phase === "morph" ? Math.min(1, this.styleT + dt / 0.52) : 1;
    styleField(
      SCENES[this.sceneIdx],
      this.cols,
      this.rows,
      this.styleT,
      this.bore,
      SCENES[this.prevScene],
    );
  }

  private draw(dt: number) {
    if (!this.ctx) return;
    this.step(dt);
    const scene = SCENES[this.sceneIdx];
    const [cA, bA] = PALETTES[this.prevPalette];
    const [cB, bB] = PALETTES[scene.palette];
    const mix = easeInOut(this.paletteMix);
    const s = this.dpr;
    const pitch = this.pitch * s;
    const radius = pitch / 2;
    const path = new Path2D();

    this.ctx.fillStyle = mixHex(bA, bB, mix);
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.fillStyle = mixHex(cA, cB, mix);

    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols; x++) {
        const i = y * this.cols + x;
        let value = this.live[i];
        if (this.pointer) {
          const d = Math.hypot(x + 0.5 - this.pointer.x, y + 0.5 - this.pointer.y);
          if (d < 1.6) value *= Math.min(1, (d / 1.6) ** 2);
        }
        if (value <= 0.004) continue;
        const motion = cellMotion(
          scene.transition,
          this.prog[i],
          this.dir[i],
          this.rnd[i],
        );
        const cx = this.ox * s + (x + 0.5 + motion.dx) * pitch;
        const cy = this.oy * s + (y + 0.5 + motion.dy) * pitch;
        const r = radius * value * motion.scale;
        if (r <= 0.3) continue;
        const inner = r > 3.2 * s ? (r - Math.max(1.1 * s, r * 0.3)) * this.bore[i] : 0;
        path.moveTo(cx + r, cy);
        path.arc(cx, cy, r, 0, Math.PI * 2);
        if (inner > 0.4) {
          path.moveTo(cx + inner, cy);
          path.arc(cx, cy, inner, 0, Math.PI * 2, true);
        }
      }
    }
    this.ctx.fill(path, "evenodd");
  }

  setPointer(px: number, py: number) {
    this.pointer = {
      x: (px - this.ox) / this.pitch,
      y: (py - this.oy) / this.pitch,
    };
  }

  clearPointer() {
    this.pointer = null;
  }

  renderStill() {
    this.stop();
    this.phase = "hold";
    this.phaseT = 0;
    this.paletteMix = 1;
    this.applyScene(SCENES[this.sceneIdx], true);
    this.draw(0);
  }

  start() {
    if (this.running || !this.ctx) return;
    this.running = true;
    this.last = performance.now();
    const tick = (now: number) => {
      if (!this.running) return;
      const elapsed = now - this.last;
      if (elapsed >= 1000 / 30) {
        this.last = now - (elapsed % (1000 / 30));
        this.draw(Math.min(elapsed / 1000, 1 / 30));
      }
      this.raf = requestAnimationFrame(tick);
    };
    this.raf = requestAnimationFrame(tick);
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this.raf);
  }

  destroy() {
    this.stop();
    this.ro.disconnect();
    this.canvas.remove();
  }
}

function mixHex(a: string, b: string, t: number) {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const channel = (shift: number) =>
    Math.round(((pa >> shift) & 255) * (1 - t) + ((pb >> shift) & 255) * t);
  return `rgb(${channel(16)},${channel(8)},${channel(0)})`;
}
