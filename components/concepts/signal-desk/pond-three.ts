import * as THREE from "three";

export type PondAsset = {
  texture: THREE.Texture;
  image: HTMLImageElement;
  width: number;
  height: number;
};

export async function loadPondAsset(path: string, signal: AbortSignal): Promise<PondAsset> {
  const response = await fetch(`/images/portfolio/${path}`, { signal });
  if (!response.ok) throw new Error(`Unable to load pond artwork (${response.status})`);
  const url = URL.createObjectURL(await response.blob());
  const image = new Image();
  try {
    image.src = url;
    await image.decode();
    signal.throwIfAborted();
    const texture = new THREE.Texture(image);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.minFilter = THREE.NearestFilter;
    texture.magFilter = THREE.NearestFilter;
    texture.generateMipmaps = false;
    texture.needsUpdate = true;
    return { texture, image, width: image.naturalWidth, height: image.naturalHeight };
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function createYDownPondQuad() {
  const geometry = new THREE.PlaneGeometry(1, 1);
  const uv = geometry.getAttribute("uv");
  for (let index = 0; index < uv.count; index += 1) uv.setY(index, 1 - uv.getY(index));
  return geometry;
}

export function createBentFishGeometry() {
  const geometry = new THREE.PlaneGeometry(1, 1, 1, 12);
  const uv = geometry.getAttribute("uv");
  for (let index = 0; index < uv.count; index += 1) uv.setY(index, 1 - uv.getY(index));
  return geometry;
}

export type FishBendUniforms = {
  time: { value: number };
  curve: { value: number };
  amount: { value: number };
};

const FISH_BEND_SNIPPET = `
float pondS = clamp(position.y + 0.5, 0.0, 1.0);
float pondWave = sin(7.539822 * pondS - uBendTime);
transformed.x += (0.08 * (0.25 + 0.75 * pondS) * pondWave + uBendCurve * pondS * pondS) * uBendAmount;
`;

export function attachFishBend(material: THREE.Material, bend: FishBendUniforms) {
  material.customProgramCacheKey = () => "pond-fish-bend";
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uBendTime = bend.time;
    shader.uniforms.uBendCurve = bend.curve;
    shader.uniforms.uBendAmount = bend.amount;
    shader.vertexShader = `uniform float uBendTime;\nuniform float uBendCurve;\nuniform float uBendAmount;\n${shader.vertexShader}`;
    shader.vertexShader = shader.vertexShader.replace("#include <begin_vertex>", `vec3 transformed = vec3(position);\n${FISH_BEND_SNIPPET}`);
  };
}

export type PondWaterMaskUniforms = {
  texture: { value: THREE.Texture };
  origin: { value: THREE.Vector2 };
  size: { value: THREE.Vector2 };
  enabled: { value: number };
};

export function attachPondWaterMask(material: THREE.Material, mask: PondWaterMaskUniforms) {
  const compile = material.onBeforeCompile;
  const cacheKey = material.customProgramCacheKey();
  material.customProgramCacheKey = () => `${cacheKey}:pond-water-mask`;
  material.onBeforeCompile = function (shader, renderer) {
    compile.call(this, shader, renderer);
    shader.uniforms.uPondWaterMask = mask.texture;
    shader.uniforms.uPondWaterOrigin = mask.origin;
    shader.uniforms.uPondWaterSize = mask.size;
    shader.uniforms.uPondWaterMaskEnabled = mask.enabled;
    shader.vertexShader = `varying vec2 vPondWaterPosition;\n${shader.vertexShader}`;
    shader.vertexShader = shader.vertexShader.replace(
      "#include <project_vertex>",
      "vPondWaterPosition = (modelMatrix * vec4(transformed, 1.0)).xy;\n#include <project_vertex>",
    );
    shader.fragmentShader = `uniform sampler2D uPondWaterMask;\nuniform vec2 uPondWaterOrigin;\nuniform vec2 uPondWaterSize;\nuniform float uPondWaterMaskEnabled;\nvarying vec2 vPondWaterPosition;\n${shader.fragmentShader}`;
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <clipping_planes_fragment>",
      `#include <clipping_planes_fragment>
      if (uPondWaterMaskEnabled > 0.5) {
        vec2 pondMaskPoint = (vPondWaterPosition - uPondWaterOrigin) / uPondWaterSize;
        if (any(lessThan(pondMaskPoint, vec2(0.0))) || any(greaterThanEqual(pondMaskPoint, vec2(1.0)))) discard;
        if (texture2D(uPondWaterMask, vec2(pondMaskPoint.x, 1.0 - pondMaskPoint.y)).a < 0.01) discard;
      }`,
    );
  };
  material.needsUpdate = true;
}

export const POND_FISH_COVERAGE_CUT = 0.35;

export function pondFishCellInside(alphas: readonly number[], cut = POND_FISH_COVERAGE_CUT) {
  if (alphas.length === 0) return false;
  let hits = 0;
  for (const alpha of alphas) if (alpha >= cut) hits += 1;
  return hits / alphas.length >= cut;
}

export function createFishIdMaterial(map: THREE.Texture, bend: FishBendUniforms, tancho: boolean) {
  const uniforms = {
    map: { value: map },
    uOffset: { value: new THREE.Vector2() },
    uRepeat: { value: new THREE.Vector2(1, 1) },
    uTancho: { value: tancho ? 1 : 0 },
    uBendTime: bend.time,
    uBendCurve: bend.curve,
    uBendAmount: bend.amount,
  };
  const material = new THREE.ShaderMaterial({
    uniforms,
    depthTest: false,
    depthWrite: false,
    side: THREE.DoubleSide,
    forceSinglePass: true,
    toneMapped: false,
    vertexShader: `
      uniform float uBendTime;
      uniform float uBendCurve;
      uniform float uBendAmount;
      varying vec2 vUv;
      varying float vS;
      varying float vAcross;
      void main() {
        vUv = uv;
        vec3 transformed = vec3(position);
        ${FISH_BEND_SNIPPET}
        vS = clamp(position.y + 0.5, 0.0, 1.0);
        vAcross = position.x + 0.5;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(transformed, 1.0);
      }
    `,
    fragmentShader: `
      uniform sampler2D map;
      uniform vec2 uOffset;
      uniform vec2 uRepeat;
      uniform float uTancho;
      varying vec2 vUv;
      varying float vS;
      varying float vAcross;
      void main() {
        vec2 footprint = vUv * uRepeat + uOffset;
        vec2 dx = dFdx(vUv) * uRepeat;
        vec2 dy = dFdy(vUv) * uRepeat;
        float hits = 0.0;
        if (dot(dx, dx) + dot(dy, dy) < 1e-10) {
          hits = texture2D(map, footprint).a >= ${POND_FISH_COVERAGE_CUT} ? 1.0 : 0.0;
        } else {
          for (int y = 0; y < 4; y++) {
            for (int x = 0; x < 4; x++) {
              vec2 sampleUv = footprint
                + dx * ((float(x) + 0.5) / 4.0 - 0.5)
                + dy * ((float(y) + 0.5) / 4.0 - 0.5);
              if (texture2D(map, sampleUv).a >= ${POND_FISH_COVERAGE_CUT}) hits += 1.0;
            }
          }
          hits /= 16.0;
        }
        if (hits < ${POND_FISH_COVERAGE_CUT}) discard;
        vec4 tex = texture2D(map, footprint);
        float across = clamp(abs(vAcross - 0.5) * 2.0, 0.0, 1.0);
        if (tex.a < ${POND_FISH_COVERAGE_CUT}) {
          gl_FragColor = vec4(5.0 / 255.0, vS, across, 1.0);
          return;
        }
        float luma = dot(tex.rgb, vec3(0.2126, 0.7152, 0.0722));
        float id = 5.0;
        bool eye = luma < 0.14 && vS > 0.05 && vS < 0.22 && abs(vAcross - 0.5) > 0.07 && abs(vAcross - 0.5) < 0.24;
        bool crown = abs(vAcross - 0.5) < 0.09 && vS > 0.035 && vS < 0.20;
        if (uTancho > 0.5) {
          if (eye) id = 9.0;
          if (crown) id = 7.0;
        } else {
          id = luma < 0.4 ? 6.0 : 5.0;
          if (tex.r > tex.g * 1.18 && tex.r > tex.b * 1.25 && tex.r > 0.3) id = 7.0;
          if (eye) id = 9.0;
        }
        gl_FragColor = vec4(id / 255.0, vS, across, 1.0);
      }
    `,
  });
  return {
    material,
    sync() {
      uniforms.uOffset.value.copy(map.offset);
      uniforms.uRepeat.value.copy(map.repeat);
    },
  };
}

export function createFlatIdMaterial(id: number) {
  return new THREE.ShaderMaterial({
    uniforms: { uId: { value: id } },
    depthTest: false,
    depthWrite: false,
    side: THREE.DoubleSide,
    forceSinglePass: true,
    toneMapped: false,
    vertexShader: `
      void main() {
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uId;
      void main() {
        gl_FragColor = vec4(uId / 255.0, 0.0, 0.0, 1.0);
      }
    `,
  });
}

export function createWakeIdMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: {},
    depthTest: false,
    depthWrite: false,
    side: THREE.DoubleSide,
    forceSinglePass: true,
    toneMapped: false,
    vertexShader: `
      attribute vec4 color;
      varying float vLife;
      void main() {
        vLife = color.a;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      varying float vLife;
      void main() {
        gl_FragColor = vec4(11.0 / 255.0, vLife, 0.0, 1.0);
      }
    `,
  });
}

export function createPondSprite(geometry: THREE.BufferGeometry, texture: THREE.Texture, order: number) {
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    side: THREE.DoubleSide,
    forceSinglePass: true,
    toneMapped: false,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.renderOrder = order;
  mesh.frustumCulled = false;
  return mesh;
}

export type PondSprite = ReturnType<typeof createPondSprite>;

export function setAtlasFrame(
  texture: THREE.Texture,
  column: number,
  row: number,
  columns: number,
  rows: number,
  bounds?: { top: number; height: number },
) {
  if (!bounds) {
    texture.repeat.set(1 / columns, 1 / rows);
    texture.offset.set(column / columns, 1 - (row + 1) / rows);
    return;
  }
  const imageHeight = (texture.image as { height: number }).height;
  texture.repeat.set(1 / columns, bounds.height / imageHeight);
  texture.offset.set(column / columns, 1 - (bounds.top + bounds.height) / imageHeight);
}

export class PondPixels extends THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial> {
  private readonly positions: THREE.BufferAttribute;
  private readonly colors: THREE.BufferAttribute;
  private readonly color = new THREE.Color();
  private vertices = 0;

  constructor(order: number, capacity = 64) {
    const geometry = new THREE.BufferGeometry();
    const positions = new THREE.BufferAttribute(new Float32Array(capacity * 6 * 3), 3);
    const colors = new THREE.BufferAttribute(new Float32Array(capacity * 6 * 4), 4);
    positions.setUsage(THREE.DynamicDrawUsage);
    colors.setUsage(THREE.DynamicDrawUsage);
    geometry.setAttribute("position", positions);
    geometry.setAttribute("color", colors);
    geometry.setDrawRange(0, 0);
    super(geometry, new THREE.MeshBasicMaterial({
      vertexColors: true,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      side: THREE.DoubleSide,
      forceSinglePass: true,
      toneMapped: false,
    }));
    this.positions = positions;
    this.colors = colors;
    this.renderOrder = order;
    this.frustumCulled = false;
  }

  clear() {
    this.vertices = 0;
    this.geometry.setDrawRange(0, 0);
    return this;
  }

  private vertex(x: number, y: number, alpha: number) {
    this.positions.setXYZ(this.vertices, x, y, 0);
    this.colors.setXYZW(this.vertices, this.color.r, this.color.g, this.color.b, alpha);
    this.vertices += 1;
  }

  rectangle(x: number, y: number, width: number, height: number, color: number, alpha = 1) {
    if (this.vertices + 6 > this.positions.count) return;
    this.color.setHex(color);
    this.vertex(x, y, alpha);
    this.vertex(x + width, y, alpha);
    this.vertex(x, y + height, alpha);
    this.vertex(x + width, y, alpha);
    this.vertex(x + width, y + height, alpha);
    this.vertex(x, y + height, alpha);
    this.commit();
  }

  ellipse(x: number, y: number, radiusX: number, radiusY: number, color: number, alpha = 1) {
    const segments = 24;
    if (this.vertices + segments * 3 > this.positions.count) return;
    this.color.setHex(color);
    for (let index = 0; index < segments; index += 1) {
      const start = index / segments * Math.PI * 2;
      const end = (index + 1) / segments * Math.PI * 2;
      this.vertex(x, y, alpha);
      this.vertex(x + Math.cos(start) * radiusX, y + Math.sin(start) * radiusY, alpha);
      this.vertex(x + Math.cos(end) * radiusX, y + Math.sin(end) * radiusY, alpha);
    }
    this.commit();
  }

  private commit() {
    this.geometry.setDrawRange(0, this.vertices);
    this.positions.needsUpdate = true;
    this.colors.needsUpdate = true;
  }
}

export const POND_RIPPLE_CAPACITY = 6;

export function createPondWater(geometry: THREE.BufferGeometry, background: THREE.Texture, water: THREE.Texture, displacement: THREE.Texture) {
  const uniforms = {
    background: { value: background },
    water: { value: water },
    displacement: { value: displacement },
    imageSize: { value: new THREE.Vector2(1, 1) },
    imageOrigin: { value: new THREE.Vector2() },
    noiseSize: { value: new THREE.Vector2(1, 1) },
    viewportCenter: { value: new THREE.Vector2() },
    currentA: { value: new THREE.Vector4(0, 0, 4.6, 3.2) },
    currentB: { value: new THREE.Vector4(0, 0, -2.4, 2.8) },
    angles: { value: new THREE.Vector2(0, Math.PI / 3) },
    finger: { value: new THREE.Vector4(-1000, -1000, 150, 0) },
    glow: { value: 0.09 },
    rippleCenters: { value: Array.from({ length: POND_RIPPLE_CAPACITY }, () => new THREE.Vector4()) },
    rippleWaves: { value: Array.from({ length: POND_RIPPLE_CAPACITY }, () => new THREE.Vector4()) },
  };
  const material = new THREE.ShaderMaterial({
    uniforms,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    side: THREE.DoubleSide,
    forceSinglePass: true,
    toneMapped: false,
    vertexShader: `
      varying vec2 pondUv;
      void main() {
        pondUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform sampler2D background;
      uniform sampler2D water;
      uniform sampler2D displacement;
      uniform vec2 imageSize;
      uniform vec2 imageOrigin;
      uniform vec2 noiseSize;
      uniform vec2 viewportCenter;
      uniform vec4 currentA;
      uniform vec4 currentB;
      uniform vec2 angles;
      uniform vec4 finger;
      uniform float glow;
      uniform vec4 rippleCenters[${POND_RIPPLE_CAPACITY}];
      uniform vec4 rippleWaves[${POND_RIPPLE_CAPACITY}];
      varying vec2 pondUv;
      vec2 rotatePoint(vec2 point, float angle) {
        float s = sin(angle);
        float c = cos(angle);
        return mat2(c, -s, s, c) * point;
      }
      void main() {
        vec4 stillWater = texture2D(water, pondUv);
        if (stillWater.a < 0.01) discard;
        vec2 screen = imageOrigin + vec2(pondUv.x, 1.0 - pondUv.y) * imageSize;
        vec2 noiseA = rotatePoint(screen - viewportCenter - currentA.xy, angles.x) / noiseSize + 0.5;
        vec2 noiseB = rotatePoint(screen - viewportCenter - currentB.xy, angles.y) / (noiseSize * 1.08) + 0.5;
        vec2 offset = (texture2D(displacement, noiseA).rg - 0.5) * currentA.zw;
        offset += (texture2D(displacement, noiseB).rg - 0.5) * currentB.zw;
        vec2 fromFinger = screen - finger.xy;
        float fingerFalloff = max(0.0, 1.0 - length(fromFinger) / finger.z);
        offset += fromFinger * finger.w * fingerFalloff * fingerFalloff;
        float brightness = 1.0;
        for (int i = 0; i < ${POND_RIPPLE_CAPACITY}; i++) {
          vec4 wave = rippleWaves[i];
          if (wave.w <= 0.0) continue;
          vec4 center = rippleCenters[i];
          vec2 fromCenter = screen - center.xy;
          float distanceToCenter = length(fromCenter);
          float ringDistance = distanceToCenter - wave.x * wave.y;
          float envelope = max(0.0, 1.0 - abs(ringDistance) / max(wave.z, 1.0));
          float fade = max(0.0, 1.0 - distanceToCenter / max(center.z, 1.0));
          float pulse = sin(ringDistance / max(wave.z, 1.0) * 6.2831853) * envelope * fade * wave.w;
          offset += fromCenter / max(distanceToCenter, 1.0) * pulse * center.w;
          brightness += pulse * 0.001;
        }
        vec2 shiftedUv = clamp(pondUv + vec2(offset.x, -offset.y) / imageSize, 0.0, 1.0);
        vec4 surface = texture2D(water, shiftedUv);
        vec3 base = texture2D(background, pondUv).rgb;
        vec3 shaded = base * mix(vec3(1.0), surface.rgb * vec3(0.003, 0.078, 0.091), 0.16 * surface.a);
        vec3 color = mix(shaded, surface.rgb, surface.a * 0.72);
        color = 1.0 - (1.0 - color) * (1.0 - surface.rgb * vec3(0.392, 0.905, 0.716) * glow * surface.a);
        gl_FragColor = vec4(color * brightness, stillWater.a);
        #include <colorspace_fragment>
      }
    `,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.renderOrder = 1;
  mesh.frustumCulled = false;
  return { mesh, uniforms };
}
