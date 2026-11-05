import * as THREE from "three";
import { FullScreenQuad } from "three/addons/postprocessing/Pass.js";

export const POND_ASCII_CELL_PLATES = false;
export const POND_ASCII_DPR_CAP = 1.5;
export const POND_ASCII_FPS_CAP = 60;
export const POND_ASCII_MAX_COLS = 160;
export const POND_ASCII_MAX_ROWS = 90;
export const POND_ASCII_STATE_CELL = "floor(vec2(vUv.x, 1.0 - vUv.y) * uGrid)";

const RAMP = ".' ,:;t%#XS8@".replace(/ /g, "");
const GLYPH_ROWS = [
  RAMP,
  "-\\|/'",
  "·",
  "&8@",
  "o0",
  "\"',.",
  ".-=~",
  "'.,",
  "o°",
] as const;

const ATLAS_COLS = 12;
const ATLAS_ROWS = GLYPH_ROWS.length;

export type PondAsciiGrid = {
  cell: number;
  cols: number;
  rows: number;
};

export type PondGlyphInk = {
  cssWidth: number;
  cssHeight: number;
  fontPx: number;
  atlasCell: number;
};

export function pondAsciiGrid(width: number, height: number): PondAsciiGrid {
  const nominal = width < 640 ? 10 : 12;
  let cell = nominal;
  if (Math.ceil(width / cell) > POND_ASCII_MAX_COLS) cell = Math.ceil(width / POND_ASCII_MAX_COLS);
  if (Math.ceil(height / cell) > POND_ASCII_MAX_ROWS) cell = Math.max(cell, Math.ceil(height / POND_ASCII_MAX_ROWS));
  const cols = Math.max(1, Math.min(POND_ASCII_MAX_COLS, Math.round(width / cell)));
  const rows = Math.max(1, Math.min(POND_ASCII_MAX_ROWS, Math.round(height / cell)));
  return { cell, cols, rows };
}

export const POND_ASCII_RAMP = RAMP;
export const POND_BODY_MIN_COLUMN = 3;
export const POND_KOI_FRAME_WIDTH = 314;
export const POND_KOI_BOUNDS_HEIGHT = 303;
export const POND_KOI_OPAQUE_WIDTH = 181;
export const POND_KOI_OPAQUE_HEIGHT = 295;

export function pondBodyGlyphColumn(shade: number) {
  const rounded = Math.min(11, Math.max(0, Math.floor(shade * 11 + 0.5)));
  return Math.max(POND_BODY_MIN_COLUMN, rounded);
}

export function pondKoiQuadPixels(lengthCells: number, cell: number) {
  const lengthPx = lengthCells * cell;
  const widthPx = lengthPx * POND_KOI_OPAQUE_WIDTH / POND_KOI_OPAQUE_HEIGHT;
  return {
    lengthCells,
    widthCells: widthPx / cell,
    scaleX: widthPx * POND_KOI_FRAME_WIDTH / POND_KOI_OPAQUE_WIDTH,
    scaleY: lengthPx * POND_KOI_BOUNDS_HEIGHT / POND_KOI_OPAQUE_HEIGHT,
  };
}

export const POND_ASCII_FRAME_TOLERANCE_MS = 2;

export function pondFrameBudget(budget: number, deltaMs: number, interval: number, tolerance = POND_ASCII_FRAME_TOLERANCE_MS) {
  const accumulated = budget + deltaMs;
  if (accumulated < interval - tolerance) return { budget: accumulated, stepMs: 0 };
  const remainder = accumulated >= interval ? accumulated % interval : 0;
  return { budget: remainder, stepMs: accumulated - remainder };
}

function themeVector(hex: string, alpha: number) {
  const color = new THREE.Color(hex);
  return new THREE.Vector4(color.r, color.g, color.b, alpha);
}

function themeSet(dark: boolean) {
  const water = dark ? themeVector("#cfc0dd", 0.07) : themeVector("#66516f", 0.07);
  const stone = dark ? themeVector("#8a8076", 0.4) : themeVector("#8a7f74", 0.4);
  const grass = dark ? themeVector("#7c8a68", 0.72) : themeVector("#6f8250", 0.72);
  const pad = dark ? themeVector("#7f9a7a", 0.82) : themeVector("#5f7f5c", 0.82);
  const body = themeVector("#e2ded4", 1);
  const ink = themeVector("#52514e", 1);
  const tancho = themeVector("#df7136", 1);
  const fin = dark ? themeVector("#8ca0bd", 0.9) : themeVector("#8f829b", 0.9);
  const eye = dark ? themeVector("#f4edf9", 1) : themeVector("#1f1a2a", 1);
  const ripple = dark ? themeVector("#cfc0dd", 0.75) : themeVector("#66516f", 0.8);
  const wake = dark ? themeVector("#cfc0dd", 0.55) : themeVector("#66516f", 0.55);
  const food = dark ? themeVector("#ece6f0", 1) : themeVector("#6e6a86", 1);
  const cat = dark ? themeVector("#c4b8a4", 0.92) : themeVector("#5e4d6b", 0.92);
  const fly = dark ? themeVector("#8ca0bd", 0.85) : themeVector("#6f84a3", 0.85);
  const bonk = dark ? themeVector("#cfc0dd", 1) : themeVector("#66516f", 1);
  return [themeVector("#000000", 0), water, stone, grass, pad, body, ink, tancho, fin, eye, ripple, wake, food, cat, fly, bonk];
}

function makeTarget(width: number, height: number) {
  const target = new THREE.WebGLRenderTarget(width, height, {
    depthBuffer: false,
    stencilBuffer: false,
    magFilter: THREE.NearestFilter,
    minFilter: THREE.NearestFilter,
    generateMipmaps: false,
    type: THREE.UnsignedByteType,
  });
  target.texture.colorSpace = THREE.NoColorSpace;
  return target;
}

function drawGlyphAtlas(context: CanvasRenderingContext2D, atlasCell: number, fontPx: number) {
  context.clearRect(0, 0, context.canvas.width, context.canvas.height);
  context.fillStyle = "#ffffff";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.font = `700 ${fontPx}px "Space Mono", monospace`;
  GLYPH_ROWS.forEach((row, rowIndex) => {
    for (let column = 0; column < row.length; column += 1) {
      context.fillText(row[column], column * atlasCell + atlasCell / 2, rowIndex * atlasCell + atlasCell / 2 + 1);
    }
  });
}

function glyphBounds(context: CanvasRenderingContext2D, atlasCell: number, column: number, row: number) {
  const image = context.getImageData(column * atlasCell, row * atlasCell, atlasCell, atlasCell);
  let left = atlasCell;
  let top = atlasCell;
  let right = -1;
  let bottom = -1;
  for (let y = 0; y < atlasCell; y += 1) {
    for (let x = 0; x < atlasCell; x += 1) {
      if (image.data[(y * atlasCell + x) * 4 + 3] <= 24) continue;
      left = Math.min(left, x);
      top = Math.min(top, y);
      right = Math.max(right, x);
      bottom = Math.max(bottom, y);
    }
  }
  return {
    left,
    top,
    right,
    bottom,
    width: right < 0 ? 0 : right - left + 1,
    height: bottom < 0 ? 0 : bottom - top + 1,
  };
}

function buildGlyphAtlas(cell: number, pixelRatio: number) {
  const atlasCell = Math.max(8, Math.round(cell * pixelRatio));
  const canvas = document.createElement("canvas");
  canvas.width = atlasCell * ATLAS_COLS;
  canvas.height = atlasCell * ATLAS_ROWS;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("Unable to draw the pond glyph atlas");
  let fontPx = atlasCell;
  let bounds = { left: 0, top: 0, right: 0, bottom: 0, width: 0, height: 0 };
  for (let attempt = 0; attempt < 5; attempt += 1) {
    drawGlyphAtlas(context, atlasCell, fontPx);
    bounds = glyphBounds(context, atlasCell, RAMP.length - 1, 0);
    const wideEnough = bounds.width >= atlasCell * 0.6;
    const tallEnough = bounds.height >= atlasCell * 0.75;
    const clipped = bounds.left <= 0 || bounds.top <= 0 || bounds.right >= atlasCell - 1 || bounds.bottom >= atlasCell - 1;
    if ((wideEnough && tallEnough) || clipped || bounds.width === 0) break;
    const needed = Math.max(0.6 / (bounds.width / atlasCell), 0.75 / (bounds.height / atlasCell));
    const next = Math.min(atlasCell * 1.35, Math.ceil(fontPx * Math.min(needed, 1.2)));
    if (next <= fontPx) break;
    fontPx = next;
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.NoColorSpace;
  texture.minFilter = THREE.NearestFilter;
  texture.magFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.needsUpdate = true;
  const ink: PondGlyphInk = {
    cssWidth: bounds.width / atlasCell * cell,
    cssHeight: bounds.height / atlasCell * cell,
    fontPx,
    atlasCell,
  };
  return { texture, ink };
}

function createAsciiMaterial() {
  const material = new THREE.ShaderMaterial({
    uniforms: {
      tMaterial: { value: null as THREE.Texture | null },
      tGlyphs: { value: null as THREE.Texture | null },
      tState: { value: null as THREE.Texture | null },
      uGrid: { value: new THREE.Vector2(1, 1) },
      uResolution: { value: new THREE.Vector2(1, 1) },
      uCell: { value: 12 },
      uDark: { value: 1 },
      uTheme: { value: themeSet(true) },
      uRipples: { value: Array.from({ length: 6 }, () => new THREE.Vector4(-9999, -9999, 0, 0)) },
      uCard: { value: new THREE.Vector4(-1, -1, -1, -1) },
      uDim: { value: 0.3 },
      uEllipse: { value: new THREE.Vector4(0, 0, 23, 18) },
      uPads: { value: [
        new THREE.Vector4(-8, -3, 2.3, 0.4),
        new THREE.Vector4(7, 2, 1.9, 2.2),
        new THREE.Vector4(-1, 6, 2.5, 4.1),
      ] },
      uHysteresis: { value: 0.04 },
      uCellPlates: { value: POND_ASCII_CELL_PLATES ? 1 : 0 },
      uPass: { value: 1 },
      uBackground: { value: new THREE.Vector3(37 / 255, 32 / 255, 49 / 255) },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform sampler2D tMaterial;
      uniform sampler2D tGlyphs;
      uniform sampler2D tState;
      uniform vec2 uGrid;
      uniform vec2 uResolution;
      uniform float uCell;
      uniform float uDark;
      uniform vec4 uTheme[16];
      uniform vec4 uRipples[6];
      uniform vec4 uCard;
      uniform float uDim;
      uniform vec4 uEllipse;
      uniform vec4 uPads[3];
      uniform float uHysteresis;
      uniform float uCellPlates;
      uniform float uPass;
      uniform vec3 uBackground;
      varying vec2 vUv;

      float hash21(vec2 cell) {
        vec3 p = fract(vec3(cell.xyx) * 0.1031);
        p += dot(p, p.yzx + 33.33);
        return fract((p.x + p.y) * p.z);
      }

      vec2 cssFromUv(vec2 uv) {
        return vec2(uv.x, 1.0 - uv.y) * uResolution;
      }

      vec4 materialCell(vec2 cell) {
        vec2 uv = vec2((cell.x + 0.5) / uGrid.x, 1.0 - (cell.y + 0.5) / uGrid.y);
        return texture2D(tMaterial, uv);
      }

      float idAt(vec2 cell) {
        if (cell.x < 0.0 || cell.y < 0.0 || cell.x >= uGrid.x || cell.y >= uGrid.y) return 0.0;
        return floor(materialCell(cell).r * 255.0 + 0.5);
      }

      bool bodyId(float id) {
        return id > 4.5 && id < 9.5;
      }

      float edgeDistance(vec2 cell) {
        float dist = 6.0;
        for (int y = -4; y <= 4; y++) {
          for (int x = -4; x <= 4; x++) {
            if (!bodyId(idAt(cell + vec2(float(x), float(y))))) dist = min(dist, length(vec2(float(x), float(y))));
          }
        }
        return dist;
      }

      float glyph(float row, float column, vec2 local) {
        vec2 atlas = vec2((column + local.x) / ${ATLAS_COLS}.0, 1.0 - (row + local.y) / ${ATLAS_ROWS}.0);
        return texture2D(tGlyphs, atlas).a;
      }

      float rampColumn(float index) {
        return clamp(floor(index * 11.0 + 0.5), 0.0, 11.0);
      }

      void main() {
        vec2 screenCss = cssFromUv(vUv);
        if (uPass >= 0.5) {
          vec2 cell = clamp(floor(screenCss / uCell), vec2(0.0), uGrid - 1.0);
          vec2 local = fract(screenCss / max(uCell, 0.001));
          vec2 stateUv = vec2((cell.x + 0.5) / uGrid.x, 1.0 - (cell.y + 0.5) / uGrid.y);
          vec4 state = texture2D(tState, stateUv);
          float id = floor(state.g * 255.0 + 0.5);
          float alpha = state.a;
          if (id < 0.5 || alpha < 0.004) {
            gl_FragColor = vec4(uBackground, 1.0);
            return;
          }
          float packed = floor(state.b * 255.0 + 0.5);
          float row = floor(packed / 16.0);
          float column = mod(packed, 16.0);
          vec4 theme = uTheme[int(clamp(id, 0.0, 15.0))];
          float dim = screenCss.x > uCard.x && screenCss.x < uCard.z && screenCss.y > uCard.y && screenCss.y < uCard.w ? uDim : 1.0;
          float glyphAlpha = glyph(row, column, local) * alpha * dim;
          vec3 encoded = linearToOutputTexel(vec4(theme.rgb, 1.0)).rgb;
          gl_FragColor = vec4(encoded * glyphAlpha + uBackground * (1.0 - glyphAlpha), 1.0);
          return;
        }

        vec2 cell = ${POND_ASCII_STATE_CELL};
        vec2 css = (cell + 0.5) * uCell;
        vec2 fromCenter = cell + 0.5 - uEllipse.xy;
        float angle = atan(fromCenter.y, fromCenter.x);
        float wobble = 1.0 + 0.035 * sin(angle * 3.0);
        vec2 stretched = fromCenter / (uEllipse.zw * wobble);
        float radius = length(stretched);
        vec2 gradient = fromCenter / max(uEllipse.zw * uEllipse.zw, vec2(0.001));
        float edge = (radius - 1.0) / max(length(gradient), 0.001);

        float padHit = 0.0;
        float padCover = 0.0;
        for (int i = 0; i < 3; i++) {
          vec2 pad = uPads[i].xy;
          float dist = length(cell + 0.5 - (uEllipse.xy + pad));
          if (dist < uPads[i].z) {
            float wedge = abs(atan(sin(angle - uPads[i].w), cos(angle - uPads[i].w)));
            if (wedge > 0.35) {
              padHit = 1.0;
              padCover = max(padCover, 1.0 - dist / uPads[i].z);
            }
          }
        }

        float rippleStrength = 0.0;
        float rippleRadius = 0.0;
        for (int i = 0; i < 6; i++) {
          if (uRipples[i].w <= 0.001) continue;
          float band = abs(length(css - uRipples[i].xy) - uRipples[i].z);
          if (band < 1.6 * uCell && uRipples[i].w > rippleStrength) {
            rippleStrength = uRipples[i].w;
            rippleRadius = band / (1.6 * uCell);
          }
        }

        if (uPass < 0.5) {
          float id = idAt(cell);
          vec4 fish = materialCell(cell);
          float along = fish.g;
          float across = fish.b;
          bool creature = id > 4.5 && id < 10.5 || id > 11.5;
          if (!creature && id < 10.5) {
            if (rippleStrength > 0.02 && radius < 1.02) id = 10.0;
            else if (padHit > 0.5 && radius < 1.0) id = 4.0;
            else if (edge >= 0.0 && edge < 2.7) id = 2.0;
            else if (edge >= 2.7 && edge < 6.5) id = 3.0;
            else if (radius < 1.0) id = 1.0;
            else id = 0.0;
          }
          if (id > 10.5 && id < 11.5 && fish.g <= 0.02) id = radius < 1.0 ? 1.0 : 0.0;

          float shade = 0.5;
          if (bodyId(id) && abs(id - 8.0) > 0.5 && abs(id - 9.0) > 0.5) {
            float dist = edgeDistance(cell);
            if (along > 0.74) {
              float tail = clamp((along - 0.74) / 0.26, 0.0, 1.0);
              shade = tail < 0.45 ? 0.0909 : 0.0;
            } else if (across < 0.24 && dist > 1.7) {
              shade = hash21(cell) > 0.42 ? 1.0 : 0.9091;
            } else if (dist < 1.15 || across > 0.48) {
              float edgePick = hash21(cell + 1.0);
              shade = edgePick > 0.66 ? 0.4545 : edgePick > 0.33 ? 0.3636 : 0.2727;
            } else {
              float middle = hash21(cell + 2.0);
              shade = middle > 0.66 ? 0.8182 : middle > 0.33 ? 0.7273 : 0.5455;
            }
            if (id > 6.5 && id < 7.5) shade = 1.0;
          }
          if (id > 12.5 && id < 13.5) shade = 0.42 + 0.35 * hash21(cell);
          else if (id > 13.5 && id < 14.5) shade = 0.62;
          else if (id > 14.5) shade = 0.88;

          if (id > 0.5 && id < 1.5) {
            float nearest = 9.0;
            bool fin = false;
            for (int y = -2; y <= 2; y++) {
              for (int x = -2; x <= 2; x++) {
                float reach = length(vec2(float(x), float(y)));
                if (reach < 0.5 || reach > 2.05) continue;
                vec2 neighbor = cell + vec2(float(x), float(y));
                vec4 beside = materialCell(neighbor);
                float besideId = idAt(neighbor);
                if (besideId > 4.5 && besideId < 7.5 && beside.g > 0.12 && beside.g < 0.40 && beside.b > 0.40) {
                  fin = true;
                  nearest = min(nearest, reach);
                }
              }
            }
            if (fin) {
              id = 8.0;
              shade = nearest < 1.35 ? 0.3636 : 0.2727;
            }
          }

          vec2 stateUv = vec2((cell.x + 0.5) / uGrid.x, 1.0 - (cell.y + 0.5) / uGrid.y);
          vec4 previous = texture2D(tState, stateUv);
          float previousId = floor(previous.g * 255.0 + 0.5);
          if (id < 10.5 && abs(previousId - id) < 0.5 && abs(shade - previous.r) < uHysteresis) shade = previous.r;

          float column = 0.0;
          float row = 0.0;
          float alpha = id < 0.5 ? 0.0 : uTheme[int(clamp(id, 0.0, 15.0))].a;
          if (id < 0.5) {
            alpha = 0.0;
          } else if (id < 1.5) {
            row = 2.0;
          } else if (id < 2.5) {
            row = 4.0;
            column = hash21(cell + 4.0) > 0.5 ? 1.0 : 0.0;
            alpha = mix(0.45, 0.35, clamp(edge / 2.7, 0.0, 1.0));
          } else if (id < 3.5) {
            float t = clamp(1.0 - (edge - 2.7) / 3.8, 0.0, 1.0);
            if (hash21(cell + 12.0) > 0.85 * t) alpha = 0.0;
            row = 5.0;
            column = floor(hash21(cell + 3.0) * 4.0);
            if (alpha > 0.0) alpha = mix(0.35, 0.95, t);
          } else if (id < 4.5) {
            row = 3.0;
            column = padCover > 0.85 ? 0.0 : padCover > 0.55 ? 1.0 : 2.0;
            alpha = mix(0.6, 1.0, padCover);
          } else if (id < 8.5) {
            row = 0.0;
            column = max(${POND_BODY_MIN_COLUMN}.0, rampColumn(shade));
          } else if (id < 9.5) {
            row = 8.0;
          } else if (id < 10.5) {
            row = 6.0;
            column = rippleStrength > 0.75 ? 3.0 : rippleStrength > 0.5 ? 2.0 : rippleStrength > 0.25 ? 1.0 : 0.0;
            alpha *= rippleStrength * (1.0 - rippleRadius);
          } else if (id < 11.5) {
            float life = fish.g;
            row = 7.0;
            column = life > 0.66 ? 0.0 : life > 0.33 ? 2.0 : 1.0;
            alpha *= life;
          } else if (id < 12.5) {
            row = 8.0;
            column = hash21(cell) > 0.5 ? 1.0 : 0.0;
          } else {
            row = 0.0;
            column = rampColumn(shade);
          }
          gl_FragColor = vec4(shade, id / 255.0, (row * 16.0 + column) / 255.0, alpha);
        }
      }
    `,
  });
  material.blending = THREE.NoBlending;
  material.depthTest = false;
  material.depthWrite = false;
  material.toneMapped = false;
  return material;
}

function createScreenMaterial() {
  const material = new THREE.ShaderMaterial({
    uniforms: {
      tGlyphs: { value: null as THREE.Texture | null },
      tState: { value: null as THREE.Texture | null },
      uGrid: { value: new THREE.Vector2(1, 1) },
      uResolution: { value: new THREE.Vector2(1, 1) },
      uCell: { value: 12 },
      uTheme: { value: themeSet(true) },
      uCard: { value: new THREE.Vector4(-1, -1, -1, -1) },
      uDim: { value: 0.3 },
      uBackground: { value: new THREE.Vector3(37 / 255, 32 / 255, 49 / 255) },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      precision highp float;
      uniform sampler2D tGlyphs;
      uniform sampler2D tState;
      uniform vec2 uGrid;
      uniform vec2 uResolution;
      uniform float uCell;
      uniform vec4 uTheme[16];
      uniform vec4 uCard;
      uniform float uDim;
      uniform vec3 uBackground;
      varying vec2 vUv;

      vec2 cssFromUv(vec2 uv) {
        return vec2(uv.x, 1.0 - uv.y) * uResolution;
      }

      float glyph(float row, float column, vec2 local) {
        vec2 atlas = vec2((column + local.x) / ${ATLAS_COLS}.0, 1.0 - (row + local.y) / ${ATLAS_ROWS}.0);
        return texture2D(tGlyphs, atlas).a;
      }

      void main() {
        vec2 screenCss = cssFromUv(vUv);
        vec2 cell = clamp(floor(screenCss / uCell), vec2(0.0), uGrid - 1.0);
        vec2 local = fract(screenCss / max(uCell, 0.001));
        vec2 stateUv = vec2((cell.x + 0.5) / uGrid.x, 1.0 - (cell.y + 0.5) / uGrid.y);
        vec4 state = texture2D(tState, stateUv);
        float id = floor(state.g * 255.0 + 0.5);
        float alpha = state.a;
        if (id < 0.5 || alpha < 0.004) {
          gl_FragColor = vec4(uBackground, 1.0);
          return;
        }
        float packed = floor(state.b * 255.0 + 0.5);
        float row = floor(packed / 16.0);
        float column = mod(packed, 16.0);
        vec4 theme = uTheme[int(clamp(id, 0.0, 15.0))];
        float dim = screenCss.x > uCard.x && screenCss.x < uCard.z && screenCss.y > uCard.y && screenCss.y < uCard.w ? uDim : 1.0;
        float glyphAlpha = glyph(row, column, local) * alpha * dim;
        vec3 encoded = linearToOutputTexel(vec4(theme.rgb, 1.0)).rgb;
        if (id > 4.5 && id < 7.5) {
          float plate = step(0.055, local.x) * step(local.x, 0.945) * step(0.055, local.y) * step(local.y, 0.945) * alpha * dim;
          vec3 fill = mix(uBackground, encoded, plate * 0.82);
          gl_FragColor = vec4(mix(fill, uBackground, glyphAlpha * 0.65), 1.0);
        } else {
          gl_FragColor = vec4(encoded * glyphAlpha + uBackground * (1.0 - glyphAlpha), 1.0);
        }
      }
    `,
  });
  material.blending = THREE.NoBlending;
  material.depthTest = false;
  material.depthWrite = false;
  material.toneMapped = false;
  return material;
}

export type PondRippleUniform = { x: number; y: number; radius: number; strength: number };

export class PondAscii {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly material: THREE.ShaderMaterial;
  private readonly screenMaterial: THREE.ShaderMaterial;
  private readonly quad: FullScreenQuad;
  private sceneTarget: THREE.WebGLRenderTarget;
  private materialTarget: THREE.WebGLRenderTarget;
  private stateRead: THREE.WebGLRenderTarget;
  private stateWrite: THREE.WebGLRenderTarget;
  private glyphs: THREE.Texture | null = null;
  private readonly clearColor = new THREE.Color();
  readonly grid: PondAsciiGrid = { cell: 12, cols: 1, rows: 1 };
  ink: PondGlyphInk = { cssWidth: 0, cssHeight: 0, fontPx: 0, atlasCell: 0 };
  private dark = true;
  private pixelRatio = 1;

  constructor(renderer: THREE.WebGLRenderer) {
    this.renderer = renderer;
    const size = renderer.getSize(new THREE.Vector2());
    const ratio = renderer.getPixelRatio();
    this.material = createAsciiMaterial();
    this.screenMaterial = createScreenMaterial();
    this.sceneTarget = makeTarget(2, 2);
    this.materialTarget = makeTarget(2, 2);
    this.stateRead = makeTarget(1, 1);
    this.stateWrite = makeTarget(1, 1);
    this.quad = new FullScreenQuad(this.material);
    this.resize(size.x, size.y, ratio);
    this.setTheme(window.matchMedia("(prefers-color-scheme: light)").matches ? false : true);
  }

  get sceneBuffer() {
    return this.sceneTarget;
  }

  get materialBuffer() {
    return this.materialTarget;
  }

  resize(width: number, height: number, pixelRatio: number) {
    const grid = pondAsciiGrid(width, height);
    const rebake = this.glyphs === null || grid.cell !== this.grid.cell || pixelRatio !== this.pixelRatio;
    this.grid.cell = grid.cell;
    this.grid.cols = grid.cols;
    this.grid.rows = grid.rows;
    this.pixelRatio = pixelRatio;
    this.sceneTarget.setSize(grid.cols, grid.rows);
    this.materialTarget.setSize(grid.cols, grid.rows);
    this.stateRead.setSize(grid.cols, grid.rows);
    this.stateWrite.setSize(grid.cols, grid.rows);
    const uniforms = this.material.uniforms;
    const screen = this.screenMaterial.uniforms;
    uniforms.uGrid.value.set(grid.cols, grid.rows);
    screen.uGrid.value.set(grid.cols, grid.rows);
    uniforms.uResolution.value.set(width, height);
    screen.uResolution.value.set(width, height);
    uniforms.uCell.value = grid.cell;
    screen.uCell.value = grid.cell;
    uniforms.tMaterial.value = this.materialTarget.texture;
    if (rebake) {
      const next = buildGlyphAtlas(grid.cell, pixelRatio);
      this.glyphs?.dispose();
      this.glyphs = next.texture;
      this.ink = next.ink;
      uniforms.tGlyphs.value = this.glyphs;
      screen.tGlyphs.value = this.glyphs;
    }
    const previous = this.renderer.getRenderTarget();
    this.renderer.getClearColor(this.clearColor);
    const clearAlpha = this.renderer.getClearAlpha();
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.setRenderTarget(this.stateRead);
    this.renderer.clear();
    this.renderer.setRenderTarget(this.stateWrite);
    this.renderer.clear();
    this.renderer.setRenderTarget(previous);
    this.renderer.setClearColor(this.clearColor, clearAlpha);
  }

  setTheme(dark: boolean) {
    this.dark = dark;
    const background = dark
      ? [20 / 255, 20 / 255, 20 / 255]
      : [242 / 255, 241 / 255, 237 / 255];
    (this.material.uniforms.uBackground.value as THREE.Vector3).set(background[0], background[1], background[2]);
    (this.screenMaterial.uniforms.uBackground.value as THREE.Vector3).set(background[0], background[1], background[2]);
    const next = themeSet(dark);
    const theme = this.material.uniforms.uTheme.value as THREE.Vector4[];
    const screenTheme = this.screenMaterial.uniforms.uTheme.value as THREE.Vector4[];
    next.forEach((color, index) => {
      theme[index].copy(color);
      screenTheme[index].copy(color);
    });
    this.material.uniforms.uDark.value = dark ? 1 : 0;
  }

  get isDark() {
    return this.dark;
  }

  setFrame(ellipse: THREE.Vector4, card: THREE.Vector4, ripples: readonly PondRippleUniform[]) {
    this.material.uniforms.uEllipse.value.copy(ellipse);
    this.material.uniforms.uCard.value.copy(card);
    this.screenMaterial.uniforms.uCard.value.copy(card);
    const slots = this.material.uniforms.uRipples.value as THREE.Vector4[];
    for (let index = 0; index < slots.length; index += 1) {
      const ripple = ripples[index];
      if (ripple && ripple.strength > 0) slots[index].set(ripple.x, ripple.y, ripple.radius, ripple.strength);
      else slots[index].set(-9999, -9999, 0, 0);
    }
    const cell = this.grid.cell;
    const pads = this.material.uniforms.uPads.value as THREE.Vector4[];
    pads[0].set(-0.34 * ellipse.z, -0.18 * ellipse.w, Math.max(1.6, cell > 10 ? 2.3 : 1.8), 0.5);
    pads[1].set(0.38 * ellipse.z, 0.12 * ellipse.w, Math.max(1.4, cell > 10 ? 1.9 : 1.5), 2.3);
    pads[2].set(-0.04 * ellipse.z, 0.42 * ellipse.w, Math.max(1.7, cell > 10 ? 2.5 : 1.9), 4.0);
  }

  compose(renderer: THREE.WebGLRenderer) {
    const previous = renderer.getRenderTarget();
    renderer.getClearColor(this.clearColor);
    const clearAlpha = renderer.getClearAlpha();
    renderer.setClearColor(0x000000, 0);
    const uniforms = this.material.uniforms;
    uniforms.uPass.value = 0;
    uniforms.tState.value = this.stateRead.texture;
    renderer.setRenderTarget(this.stateWrite);
    renderer.clear();
    this.quad.render(renderer);
    this.quad.material = this.screenMaterial;
    this.screenMaterial.uniforms.tState.value = this.stateWrite.texture;
    renderer.setRenderTarget(null);
    this.quad.render(renderer);
    this.quad.material = this.material;
    renderer.setRenderTarget(previous);
    renderer.setClearColor(this.clearColor, clearAlpha);
    const swap = this.stateRead;
    this.stateRead = this.stateWrite;
    this.stateWrite = swap;
  }

  dispose() {
    this.sceneTarget.dispose();
    this.materialTarget.dispose();
    this.stateRead.dispose();
    this.stateWrite.dispose();
    this.glyphs?.dispose();
    this.material.dispose();
    this.screenMaterial.dispose();
  }
}
