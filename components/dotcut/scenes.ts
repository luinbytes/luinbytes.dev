export type TransitionKind =
  | "wipe"
  | "ripple"
  | "scatter"
  | "collapse"
  | "columns";

export type StyleKind = "drift" | "grain" | "swell" | "streak" | null;

export interface Scene {
  kind: "text" | "rings" | "checker" | "bars" | "columns" | "boxes";
  value?: string;
  transition: TransitionKind;
  palette: number;
  style?: StyleKind;
}

export const SCENES: Scene[] = [
  { kind: "text", value: "LU", transition: "wipe", palette: 0, style: "drift" },
  { kind: "rings", transition: "ripple", palette: 1, style: "grain" },
  { kind: "columns", transition: "columns", palette: 2, style: "streak" },
  { kind: "checker", transition: "scatter", palette: 3, style: "swell" },
  { kind: "boxes", transition: "collapse", palette: 4, style: "grain" },
  { kind: "bars", transition: "wipe", palette: 5, style: "drift" },
];

export const PALETTES: [string, string][] = [
  ["#1b0715", "#f58abd"],
  ["#4a102f", "#f7a4cb"],
  ["#220a1b", "#ee79ae"],
  ["#59183a", "#ffb2d5"],
  ["#2f0b24", "#e984b3"],
  ["#13040f", "#f493c1"],
];

const smooth01 = (v: number, e0: number, e1: number) => {
  const t = Math.min(1, Math.max(0, (v - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
};

function hash2(x: number, y: number) {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return s - Math.floor(s);
}

export function cellMotion(
  kind: TransitionKind,
  t: number,
  dir: number,
  rand: number,
) {
  const u = Math.sin(Math.min(1, Math.max(0, t)) * Math.PI);
  switch (kind) {
    case "wipe":
      return { scale: 1, dx: u * 0.16 * -dir, dy: 0 };
    case "ripple":
      return { scale: 1 - u * 0.1, dx: 0, dy: u * -0.13 };
    case "scatter":
      return {
        scale: 1,
        dx: u * 0.18 * Math.cos(rand * Math.PI * 2),
        dy: u * 0.18 * Math.sin(rand * Math.PI * 2),
      };
    case "collapse":
      return { scale: 1 - u * 0.18, dx: 0, dy: 0 };
    case "columns":
      return { scale: 1, dx: 0, dy: u * 0.22 };
  }
}

export function styleField(
  scene: Scene,
  cols: number,
  rows: number,
  t: number,
  out: Float32Array,
  prev?: Scene,
) {
  const cx = (cols - 1) / 2;
  const cy = (rows - 1) / 2;
  const maxR = Math.hypot(cols, rows) / 2;
  const flip = 0.32;

  const stateOf = (style: StyleKind | undefined, x: number, y: number) => {
    switch (style) {
      case "drift": {
        const a = Math.sin(x * 0.41 + y * 0.23);
        const b = Math.sin(x * 0.17 - y * 0.53 + 2.1);
        return smooth01((a + b) * 0.5, -0.15, 0.75);
      }
      case "grain": {
        const n =
          hash2(x, y) * 0.55 +
          hash2(x + 1, y) * 0.15 +
          hash2(x, y + 1) * 0.15 +
          hash2(x + 1, y + 1) * 0.15;
        return smooth01(n, 0.34, 0.86);
      }
      case "swell": {
        const d = Math.hypot(x - cx, y - cy) / maxR;
        const warp = Math.sin(Math.atan2(y - cy, x - cx) * 3) * 0.14;
        return smooth01(1 - (d + warp), 0.28, 0.92);
      }
      case "streak": {
        const s = Math.sin(x * 0.28 + y * 0.62);
        const cut = Math.sin(x * 0.09 - y * 0.11 + 1.3) * 0.5 + 0.5;
        return smooth01(s * cut, -0.05, 0.7);
      }
      default:
        return 0;
    }
  };

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      let order = 0;
      switch (scene.style) {
        case "drift":
          order = (x / cols) * 0.75 + Math.sin(y * 0.5) * 0.12 + 0.12;
          break;
        case "grain":
          order = (x / cols) * 0.55 + (y / rows) * 0.25 + hash2(x, y) * 0.2;
          break;
        case "swell":
          order = Math.hypot(x - cx, y - cy) / maxR;
          break;
        case "streak":
          order = (x / cols) * 0.8 + (y / rows) * 0.2;
      }

      const from = stateOf(prev?.style ?? scene.style, x, y);
      const to = stateOf(scene.style, x, y);
      const u = Math.min(1, Math.max(0, (t - order * (1 - flip)) / flip));
      const eased = u * u * (3 - 2 * u);
      out[y * cols + x] = from + (to - from) * eased;
    }
  }
}

export function rasterize(
  scene: Scene,
  cols: number,
  rows: number,
  fontFamily: string,
) {
  const out = new Uint8Array(cols * rows).fill(1);
  const cx = (cols - 1) / 2;
  const cy = (rows - 1) / 2;

  for (let y = 0; y < rows && scene.kind !== "text"; y++) {
    for (let x = 0; x < cols; x++) {
      const i = y * cols + x;
      if (scene.kind === "checker") {
        const b = Math.max(2, Math.round(cols / 14));
        if ((Math.floor(x / b) + Math.floor(y / b)) % 2 === 0) out[i] = 0;
      } else if (scene.kind === "bars") {
        if (Math.floor((x + y) / 3) % 2 === 0) out[i] = 0;
      } else if (scene.kind === "columns") {
        const band = Math.floor(y / 3);
        if (Math.floor((x + (band % 2 === 0 ? 0 : 2)) / 4) % 2 === 0)
          out[i] = 0;
      } else if (scene.kind === "boxes") {
        const d = Math.max(Math.abs(x - cx), Math.abs(y - cy));
        if (Math.floor(d / 2.5) % 2 === 0) out[i] = 0;
      } else if (scene.kind === "rings") {
        const d = Math.hypot(x - cx, y - cy) / (Math.hypot(cols, rows) / 2);
        if (Math.floor(d * 6) % 2 === 0) out[i] = 0;
      }
    }
  }
  if (scene.kind !== "text") return out;

  const canvas = document.createElement("canvas");
  canvas.width = cols;
  canvas.height = rows;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  const text = scene.value?.trim();
  if (!ctx || !text) return out;

  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, cols, rows);
  ctx.fillStyle = "#fff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  let size = rows * 0.8;
  ctx.font = `700 ${size}px ${fontFamily}`;
  const maxW = cols * 0.72;
  const measured = ctx.measureText(text);
  if (measured.width > maxW) size *= maxW / measured.width;
  ctx.font = `700 ${size}px ${fontFamily}`;
  const metrics = ctx.measureText(text);
  const glyphHeight =
    metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent;
  if (glyphHeight > rows * 0.58) size *= (rows * 0.58) / glyphHeight;
  ctx.font = `700 ${size}px ${fontFamily}`;
  ctx.fillText(text, cols / 2, rows / 2 + rows * 0.02);

  const data = ctx.getImageData(0, 0, cols, rows).data;
  for (let i = 0; i < out.length; i++) if (data[i * 4] > 110) out[i] = 0;
  return out;
}

export function cellDelay(
  kind: TransitionKind,
  x: number,
  y: number,
  cols: number,
  rows: number,
  rand: number,
) {
  const fx = cols > 1 ? x / (cols - 1) : 0;
  const fy = rows > 1 ? y / (rows - 1) : 0;
  switch (kind) {
    case "wipe":
      return Math.min(1, (fx * 0.75 + fy * 0.25) * 0.85 + rand * 0.15);
    case "ripple":
      return Math.min(1, (Math.hypot(fx - 0.5, fy - 0.5) / 0.707) * 0.9 + rand * 0.1);
    case "scatter":
      return rand;
    case "collapse":
      return Math.min(1, (1 - Math.hypot(fx - 0.5, fy - 0.5) / 0.707) * 0.85 + rand * 0.15);
    case "columns":
      return Math.min(1, fx * 0.9 + rand * 0.1);
  }
}
