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

export function setAtlasFrame(texture: THREE.Texture, column: number, row: number, columns: number, rows: number) {
  texture.repeat.set(1 / columns, 1 / rows);
  texture.offset.set(column / columns, 1 - (row + 1) / rows);
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
    rippleCenters: { value: [new THREE.Vector4(), new THREE.Vector4()] },
    rippleWaves: { value: [new THREE.Vector4(), new THREE.Vector4()] },
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
      uniform vec4 rippleCenters[2];
      uniform vec4 rippleWaves[2];
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
        for (int i = 0; i < 2; i++) {
          vec4 center = rippleCenters[i];
          vec4 wave = rippleWaves[i];
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
