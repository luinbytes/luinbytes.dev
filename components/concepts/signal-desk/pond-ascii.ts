import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { FullScreenQuad } from "three/addons/postprocessing/Pass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";

export const POND_ASCII_CELL_PLATES = false;
export const POND_ASCII_DPR_CAP = 1.5;
export const POND_ASCII_FPS_CAP = 60;
export const POND_ASCII_MAX_COLS = 160;
export const POND_ASCII_MAX_ROWS = 90;

const RAMP = ".' ,:;t%#XS8@".replace(/ /g, "");
const GLYPH_ROWS = [
  RAMP,
  "-\\|/'",
  "·",
  "&8@",
  "O0#",
  "\"',.",
  ".-=~",
  "-'.",
  "o°",
] as const;

const ATLAS_COLS = 12;
const ATLAS_ROWS = GLYPH_ROWS.length;
const ATLAS_CELL = 32;

export type PondAsciiGrid = {
  cell: number;
  cols: number;
  rows: number;
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

function themeVector(hex: string, alpha: number) {
  const color = new THREE.Color(hex);
  return new THREE.Vector4(color.r, color.g, color.b, alpha);
}

function themeSet(dark: boolean) {
  const water = dark ? themeVector("#cfc0dd", 0.14) : themeVector("#66516f", 0.16);
  const stone = dark ? themeVector("#8a8076", 0.55) : themeVector("#8a7f74", 0.55);
  const grass = dark ? themeVector("#7c8a68", 0.72) : themeVector("#6f8250", 0.72);
  const pad = dark ? themeVector("#7f9a7a", 0.82) : themeVector("#5f7f5c", 0.82);
  const body = dark ? themeVector("#ece6f0", 1) : themeVector("#6e6a86", 1);
  const ink = dark ? themeVector("#6e6a86", 1) : themeVector("#1f1a2a", 1);
  const tancho = themeVector("#D9452B", 1);
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

function makeTarget(width: number, height: number, filter: THREE.MagnificationTextureFilter) {
  const target = new THREE.WebGLRenderTarget(width, height, {
    depthBuffer: false,
    stencilBuffer: false,
    magFilter: filter,
    minFilter: filter,
    generateMipmaps: false,
    type: THREE.UnsignedByteType,
  });
  target.texture.colorSpace = THREE.NoColorSpace;
  return target;
}

function buildGlyphAtlas() {
  const canvas = document.createElement("canvas");
  canvas.width = ATLAS_CELL * ATLAS_COLS;
  canvas.height = ATLAS_CELL * ATLAS_ROWS;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("Unable to draw the pond glyph atlas");
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "#ffffff";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.font = `700 ${ATLAS_CELL - 8}px "Space Mono", monospace`;
  GLYPH_ROWS.forEach((row, rowIndex) => {
    for (let column = 0; column < row.length; column += 1) {
      context.fillText(row[column], column * ATLAS_CELL + ATLAS_CELL / 2, rowIndex * ATLAS_CELL + ATLAS_CELL / 2 + 1);
    }
  });
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.NoColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.needsUpdate = true;
  return texture;
}

const ASCII_SHADER = {
  uniforms: {
    tScene: { value: null as THREE.Texture | null },
    tMaterial: { value: null as THREE.Texture | null },
    tGlyphs: { value: null as THREE.Texture | null },
    tState: { value: null as THREE.Texture | null },
    uSceneSize: { value: new THREE.Vector2(1, 1) },
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
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tScene;
    uniform sampler2D tMaterial;
    uniform sampler2D tGlyphs;
    uniform sampler2D tState;
    uniform vec2 uSceneSize;
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
    varying vec2 vUv;

    float hash21(vec2 cell) {
      vec3 p = fract(vec3(cell.xyx) * 0.1031);
      p += dot(p, p.yzx + 33.33);
      return fract((p.x + p.y) * p.z);
    }

    vec2 cssFromUv(vec2 uv) {
      return vec2(uv.x, 1.0 - uv.y) * uResolution;
    }

    vec2 sceneUv(vec2 css) {
      return vec2(css.x / uResolution.x, 1.0 - css.y / uResolution.y);
    }

    float materialAt(vec2 css) {
      vec2 uv = sceneUv(css);
      return floor(texture2D(tMaterial, uv).r * 255.0 + 0.5);
    }

    float majority(vec2 origin) {
      float samples[4];
      samples[0] = materialAt(origin + vec2(0.25, 0.25) * uCell);
      samples[1] = materialAt(origin + vec2(0.75, 0.25) * uCell);
      samples[2] = materialAt(origin + vec2(0.25, 0.75) * uCell);
      samples[3] = materialAt(origin + vec2(0.75, 0.75) * uCell);
      float best = 0.0;
      float bestCount = 0.0;
      for (int i = 0; i < 4; i++) {
        if (samples[i] < 0.5) continue;
        float count = 0.0;
        for (int j = 0; j < 4; j++) if (abs(samples[j] - samples[i]) < 0.5) count += 1.0;
        if (count > bestCount) {
          bestCount = count;
          best = samples[i];
        }
      }
      return best;
    }

    float coverage(vec2 origin) {
      float total = 0.0;
      vec2 taps[4];
      taps[0] = origin + vec2(0.25, 0.25) * uCell;
      taps[1] = origin + vec2(0.75, 0.25) * uCell;
      taps[2] = origin + vec2(0.25, 0.75) * uCell;
      taps[3] = origin + vec2(0.75, 0.75) * uCell;
      for (int i = 0; i < 4; i++) total += texture2D(tScene, sceneUv(taps[i])).a;
      return clamp(total * 0.25, 0.0, 1.0);
    }

    float wakeLife(vec2 origin) {
      float life = 0.0;
      vec2 taps[4];
      taps[0] = origin + vec2(0.25, 0.25) * uCell;
      taps[1] = origin + vec2(0.75, 0.25) * uCell;
      taps[2] = origin + vec2(0.25, 0.75) * uCell;
      taps[3] = origin + vec2(0.75, 0.75) * uCell;
      for (int i = 0; i < 4; i++) {
        vec4 texel = texture2D(tMaterial, sceneUv(taps[i]));
        if (floor(texel.r * 255.0 + 0.5) > 10.5 && floor(texel.r * 255.0 + 0.5) < 11.5) life = max(life, texel.g);
      }
      return life;
    }

    float glyph(float row, float column, vec2 local) {
      vec2 atlas = vec2((column + local.x) / ${ATLAS_COLS}.0, 1.0 - (row + local.y) / ${ATLAS_ROWS}.0);
      return texture2D(tGlyphs, atlas).a;
    }

    float rampColumn(float index) {
      return clamp(floor(index * 11.0 + 0.5), 0.0, 11.0);
    }

    void main() {
      vec2 css = uPass < 0.5
        ? (vec2(vUv.x, 1.0 - vUv.y) * uGrid + 0.5) * uCell
        : cssFromUv(vUv);
      vec2 cell = clamp(floor(css / uCell), vec2(0.0), uGrid - 1.0);
      vec2 origin = cell * uCell;
      vec2 local = fract(css / uCell);
      float id = majority(origin);
      float thick = clamp(coverage(origin) / 0.8, 0.0, 1.0);
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

      bool creature = id > 4.5 && id < 10.5 || id > 11.5;
      if (!creature && id < 10.5) {
        if (rippleStrength > 0.02 && radius < 1.02) id = 10.0;
        else if (padHit > 0.5 && radius < 1.0) id = 4.0;
        else if (edge >= 0.0 && edge < 2.0) id = 2.0;
        else if (edge >= 2.0 && edge < 6.5) id = 3.0;
        else if (radius < 1.0) id = 1.0;
        else id = 0.0;
      }
      if (id > 10.5 && id < 11.5 && wakeLife(origin) <= 0.02) id = radius < 1.0 ? 1.0 : 0.0;

      float shade = 0.5;
      if (id > 4.5 && id < 5.5) shade = uDark > 0.5 ? mix(0.72, 1.0, thick) : mix(0.42, 0.78, thick);
      else if (id > 5.5 && id < 6.5) shade = uDark > 0.5 ? mix(0.58, 0.86, thick) : mix(0.78, 1.0, thick);
      else if (id > 6.5 && id < 7.5) shade = 0.92;
      else if (id > 12.5 && id < 13.5) shade = 0.42 + 0.35 * hash21(cell);
      else if (id > 13.5 && id < 14.5) shade = 0.62;
      else if (id > 14.5) shade = 0.88;

      vec2 stateUv = vec2((cell.x + 0.5) / uGrid.x, 1.0 - (cell.y + 0.5) / uGrid.y);
      vec4 previous = texture2D(tState, stateUv);
      float previousId = floor(previous.g * 255.0 + 0.5);
      if (uPass < 0.5) {
        if (abs(previousId - id) < 0.5 && abs(shade - previous.r) < uHysteresis) shade = previous.r;
        gl_FragColor = vec4(shade, id / 255.0, 0.0, 1.0);
        return;
      }
      if (abs(previousId - id) < 0.5) shade = previous.r;

      int themeIndex = int(clamp(id, 0.0, 15.0));
      vec4 theme = uTheme[themeIndex];
      float column = 0.0;
      float row = 0.0;
      float alpha = theme.a;
      if (id < 0.5) {
        gl_FragColor = vec4(0.0);
        return;
      } else if (id < 1.5) {
        row = 2.0;
        alpha = theme.a;
      } else if (id < 2.5) {
        row = 4.0;
        column = floor(hash21(cell + 4.0) * 3.0);
        alpha = mix(0.4, 0.7, hash21(cell + 8.0));
      } else if (id < 3.5) {
        float t = clamp(1.0 - (edge - 2.0) / 4.5, 0.0, 1.0);
        if (hash21(cell + 12.0) > 0.85 * t) {
          gl_FragColor = vec4(0.0);
          return;
        }
        row = 5.0;
        column = floor(hash21(cell + 3.0) * 4.0);
        alpha = mix(0.35, 0.95, t);
      } else if (id < 4.5) {
        row = 3.0;
        column = padCover > 0.85 ? 0.0 : padCover > 0.55 ? 1.0 : 2.0;
        alpha = mix(0.6, 1.0, padCover);
      } else if (id < 8.5 && abs(id - 8.0) > 0.5) {
        row = 0.0;
        column = rampColumn(shade);
      } else if (id > 7.5 && id < 8.5) {
        if (thick > 0.62) {
          row = 0.0;
          column = rampColumn(mix(0.7, 1.0, thick));
          alpha = theme.a;
        } else {
          float left = materialAt(origin + vec2(-uCell, uCell * 0.5));
          float right = materialAt(origin + vec2(uCell * 2.0, uCell * 0.5));
          float down = materialAt(origin + vec2(uCell * 0.5, -uCell));
          float up = materialAt(origin + vec2(uCell * 0.5, uCell * 2.0));
          float gx = (right > 7.5 && right < 8.5 ? 1.0 : 0.0) - (left > 7.5 && left < 8.5 ? 1.0 : 0.0);
          float gy = (up > 7.5 && up < 8.5 ? 1.0 : 0.0) - (down > 7.5 && down < 8.5 ? 1.0 : 0.0);
          if (gx * gx + gy * gy < 0.2) {
            row = 1.0;
            column = 4.0;
          } else {
            float stroke = mod(atan(gy, gx) + 1.5707963 + 3.14159265, 3.14159265);
            row = 1.0;
            column = stroke < 0.3927 ? 2.0 : stroke < 1.1781 ? 3.0 : stroke < 1.9635 ? 0.0 : 1.0;
          }
          alpha = mix(0.5, 1.0, thick);
        }
      } else if (id < 9.5) {
        row = 8.0;
        column = 0.0;
      } else if (id < 10.5) {
        row = 6.0;
        column = rippleStrength > 0.75 ? 3.0 : rippleStrength > 0.5 ? 2.0 : rippleStrength > 0.25 ? 1.0 : 0.0;
        alpha = theme.a * rippleStrength * (1.0 - rippleRadius);
      } else if (id < 11.5) {
        float life = wakeLife(origin);
        row = 7.0;
        column = life > 0.66 ? 0.0 : life > 0.33 ? 1.0 : 2.0;
        alpha = theme.a * life;
      } else if (id < 12.5) {
        row = 8.0;
        column = hash21(cell) > 0.5 ? 1.0 : 0.0;
      } else if (id < 15.5) {
        row = 0.0;
        column = rampColumn(shade);
      }

      float mask = glyph(row, column, local);
      float dim = 1.0;
      if (css.x > uCard.x && css.x < uCard.z && css.y > uCard.y && css.y < uCard.w) dim = uDim;
      bool plated = uCellPlates > 0.5 && id > 4.5 && id < 9.5;
      float plate = plated ? 0.25 * dim : 0.0;
      float glyphAlpha = mask * alpha * dim;
      float outAlpha = max(glyphAlpha, plate * alpha);
      vec3 encoded = linearToOutputTexel(vec4(theme.rgb, 1.0)).rgb;
      gl_FragColor = vec4(encoded * outAlpha, outAlpha);
    }
  `,
};

export type PondRippleUniform = { x: number; y: number; radius: number; strength: number };

export class PondAscii {
  readonly composer: EffectComposer;
  private readonly pass: ShaderPass;
  private readonly quad: FullScreenQuad;
  private sceneTarget: THREE.WebGLRenderTarget;
  private materialTarget: THREE.WebGLRenderTarget;
  private stateRead: THREE.WebGLRenderTarget;
  private stateWrite: THREE.WebGLRenderTarget;
  private readonly glyphs: THREE.Texture;
  readonly grid: PondAsciiGrid = { cell: 12, cols: 1, rows: 1 };
  private dark = true;

  constructor(renderer: THREE.WebGLRenderer) {
    this.glyphs = buildGlyphAtlas();
    const size = renderer.getSize(new THREE.Vector2());
    const ratio = renderer.getPixelRatio();
    this.sceneTarget = makeTarget(2, 2, THREE.NearestFilter);
    this.materialTarget = makeTarget(2, 2, THREE.NearestFilter);
    this.stateRead = makeTarget(1, 1, THREE.NearestFilter);
    this.stateWrite = makeTarget(1, 1, THREE.NearestFilter);
    this.composer = new EffectComposer(renderer);
    this.pass = new ShaderPass(ASCII_SHADER, "tUnused");
    this.pass.material.blending = THREE.NoBlending;
    this.pass.material.depthTest = false;
    this.pass.material.depthWrite = false;
    this.pass.material.toneMapped = false;
    this.composer.addPass(this.pass);
    this.quad = new FullScreenQuad(this.pass.material);
    this.pass.uniforms.tGlyphs.value = this.glyphs;
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
    this.grid.cell = grid.cell;
    this.grid.cols = grid.cols;
    this.grid.rows = grid.rows;
    this.sceneTarget.setSize(grid.cols * 2, grid.rows * 2);
    this.materialTarget.setSize(grid.cols * 2, grid.rows * 2);
    this.stateRead.setSize(grid.cols, grid.rows);
    this.stateWrite.setSize(grid.cols, grid.rows);
    this.composer.setPixelRatio(pixelRatio);
    this.composer.setSize(width, height);
    const uniforms = this.pass.uniforms;
    uniforms.uGrid.value.set(grid.cols, grid.rows);
    uniforms.uResolution.value.set(width, height);
    uniforms.uCell.value = grid.cell;
    uniforms.uSceneSize.value.set(grid.cols * 2, grid.rows * 2);
    uniforms.tScene.value = this.sceneTarget.texture;
    uniforms.tMaterial.value = this.materialTarget.texture;
  }

  setTheme(dark: boolean) {
    this.dark = dark;
    const next = themeSet(dark);
    const theme = this.pass.uniforms.uTheme.value as THREE.Vector4[];
    next.forEach((color, index) => theme[index].copy(color));
    this.pass.uniforms.uDark.value = dark ? 1 : 0;
  }

  get isDark() {
    return this.dark;
  }

  setFrame(ellipse: THREE.Vector4, card: THREE.Vector4, ripples: readonly PondRippleUniform[]) {
    this.pass.uniforms.uEllipse.value.copy(ellipse);
    this.pass.uniforms.uCard.value.copy(card);
    const slots = this.pass.uniforms.uRipples.value as THREE.Vector4[];
    for (let index = 0; index < slots.length; index += 1) {
      const ripple = ripples[index];
      if (ripple && ripple.strength > 0) slots[index].set(ripple.x, ripple.y, ripple.radius, ripple.strength);
      else slots[index].set(-9999, -9999, 0, 0);
    }
    const cell = this.grid.cell;
    const pads = this.pass.uniforms.uPads.value as THREE.Vector4[];
    pads[0].set(-0.34 * ellipse.z, -0.18 * ellipse.w, Math.max(1.6, cell > 10 ? 2.3 : 1.8), 0.5);
    pads[1].set(0.38 * ellipse.z, 0.12 * ellipse.w, Math.max(1.4, cell > 10 ? 1.9 : 1.5), 2.3);
    pads[2].set(-0.04 * ellipse.z, 0.42 * ellipse.w, Math.max(1.7, cell > 10 ? 2.5 : 1.9), 4.0);
  }

  compose(renderer: THREE.WebGLRenderer) {
    const previous = renderer.getRenderTarget();
    const uniforms = this.pass.uniforms;
    uniforms.uPass.value = 0;
    uniforms.tState.value = this.stateRead.texture;
    renderer.setRenderTarget(this.stateWrite);
    renderer.clear();
    this.quad.render(renderer);
    uniforms.uPass.value = 1;
    uniforms.tState.value = this.stateWrite.texture;
    renderer.setRenderTarget(previous);
    this.composer.render();
    const swap = this.stateRead;
    this.stateRead = this.stateWrite;
    this.stateWrite = swap;
  }

  dispose() {
    this.sceneTarget.dispose();
    this.materialTarget.dispose();
    this.stateRead.dispose();
    this.stateWrite.dispose();
    this.glyphs.dispose();
    this.pass.material.dispose();
    const composer = this.composer as EffectComposer & {
      renderTarget1: THREE.WebGLRenderTarget;
      renderTarget2: THREE.WebGLRenderTarget;
      copyPass: { material: THREE.Material };
    };
    composer.renderTarget1.dispose();
    composer.renderTarget2.dispose();
    composer.copyPass.material.dispose();
  }
}
