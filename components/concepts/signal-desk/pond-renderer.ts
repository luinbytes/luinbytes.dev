import * as THREE from "three";

import {
  POND_ASCII_DPR_CAP,
  POND_ASCII_FPS_CAP,
  PondAscii,
  pondAsciiGrid,
  pondFrameBudget,
  pondKoiQuadPixels,
} from "./pond-ascii.ts";
import { installPondInput } from "./pond-input.ts";
import {
  ROCK_ANCHORS,
  createPondRandom,
  pondAngleDelta,
  type PondPoint,
} from "./pond-model.ts";
import {
  createPondSimulation,
  type FishDefinition,
  type PondSimulationFrame,
} from "./pond-simulation.ts";

import {
  attachFishBend,
  attachPondWaterMask,
  createBentFishGeometry,
  createFishIdMaterial,
  createFlatIdMaterial,
  createWakeIdMaterial,
  createYDownPondQuad,
  createPondSprite,
  createPondWater,
  loadPondAsset,
  PondPixels,
  POND_RIPPLE_CAPACITY,
  setAtlasFrame,
  type FishBendUniforms,
  type PondAsset,
  type PondSprite,
} from "./pond-three.ts";

type StartOptions = {
  pond: HTMLDivElement;
  host: HTMLDivElement;
  interaction: HTMLDivElement;
  reduced: boolean;
  canvasClassName: string;
  signal: AbortSignal;
  onCaptureReady: (capture: () => string) => void;
};

type KoiTestPose = { row: number; column: number; heading: number; feedingPulse?: number };
type AtlasFrameBounds = { top: number; height: number };

type Particle = { x: number; y: number; vx: number; vy: number; born: number; life: number; size: number; color: number };
type Ring = { x: number; y: number; born: number; life: number; radius: number; color: number };
type Ripple = { x: number; y: number; size: number; strength: number; speed: number; born: number; life: number };
type AtlasAnimation = { texture: THREE.Texture; frames: readonly number[]; row: number; bounds?: readonly AtlasFrameBounds[]; progress: number; speed: number; frame: number };
type FishVisual = {
  container: THREE.Group;
  sprite: PondSprite;
  shadow: PondPixels;
  animation: AtlasAnimation;
  alpha: number;
  baseScaleX: number;
  lastWake: number;
  surfaced: boolean;
  status: THREE.Group;
  bonk: PondPixels;
  stars: PondPixels;
  bend: FishBendUniforms | null;
  bendHeading: number;
};
type FlyVisual = { container: THREE.Group; wings: PondPixels };
type FoodVisual = { container: THREE.Group; group: THREE.Group; pellets: PondPixels[]; shadow: PondPixels };

const KOI_FRAME_BOUNDS_PX: readonly (readonly AtlasFrameBounds[])[] = [
  [{ top: 0, height: 300 }, { top: 0, height: 307 }, { top: 0, height: 304 }, { top: 0, height: 308 }],
  [{ top: 300, height: 306 }, { top: 307, height: 301 }, { top: 304, height: 304 }, { top: 308, height: 300 }],
  [{ top: 606, height: 303 }, { top: 608, height: 303 }, { top: 608, height: 304 }, { top: 608, height: 302 }],
  [{ top: 909, height: 347 }, { top: 911, height: 345 }, { top: 912, height: 344 }, { top: 910, height: 346 }],
];

export async function startPondRenderer(options: StartOptions) {
  const { pond, host, interaction, reduced } = options;
  const testWindow = window as Window & {
    __POND_TEST_KOI__?: KoiTestPose;
    __POND_TEST_DIAGNOSTICS__?: boolean;
  };
  const testPose = testWindow.__POND_TEST_KOI__;
  const liveAscii = !testPose;
  const diagnostics = testWindow.__POND_TEST_DIAGNOSTICS__ === true;
  if (options.signal.aborted) return () => {};
  host.dataset.pondState = "loading";
  host.dataset.motion = reduced ? "reduced" : "full";
  delete host.dataset.fallbackReason;
  if (diagnostics) {
    Object.assign(host.dataset, {
      rippleCount: "0",
      ringCount: "0",
      wakeCount: "0",
      fishCount: "0",
      foodCount: "0",
      foodDroppedCount: "0",
      foodExpiredCount: "0",
      fishFedCount: "0",
      primaryImpactCount: "0",
      foodAffordance: "false",
      pondElementCount: "0",
      insectCount: "0",
      fishReacting: "false",
      fishWaterViolation: "false",
    });
  }

  const resources = new Set<{ dispose: () => void }>();
  const loads = new AbortController();
  let disposed = false;
  let animationFrame: number | null = null;
  let disposeInput = () => {};
  let destroySimulation = () => {};
  let releaseRenderer = () => {};
  let removeListeners = () => {};
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    loads.abort();
    options.signal.removeEventListener("abort", dispose);
    if (animationFrame !== null) window.cancelAnimationFrame(animationFrame);
    disposeInput();
    removeListeners();
    destroySimulation();
    for (const resource of resources) resource.dispose();
    resources.clear();
    releaseRenderer();
  };
  const own = <T extends { dispose: () => void }>(resource: T): T => {
    resources.add(resource);
    return resource;
  };
  const fallback = (reason: string) => {
    host.dataset.pondState = "fallback";
    host.dataset.fallbackReason = reason;
    pond.dataset.renderer = "fallback";
    dispose();
  };
  options.signal.addEventListener("abort", dispose, { once: true });

  try {
    const canvas = document.createElement("canvas");
    if (liveAscii) canvas.dataset.presented = "pending";
    const context = canvas.getContext("webgl2", {
      alpha: !liveAscii,
      antialias: false,
      powerPreference: "high-performance",
      preserveDrawingBuffer: Boolean(testPose),
    });
    if (!context) {
      fallback("webgl-unavailable");
      return dispose;
    }
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas, context, alpha: !liveAscii, antialias: false });
    } catch (error) {
      context.getExtension("WEBGL_lose_context")?.loseContext();
      throw error;
    }
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setClearColor(liveAscii ? 0x252031 : 0x000000, liveAscii ? 1 : 0);
    if (liveAscii && window.matchMedia("(prefers-color-scheme: light)").matches) renderer.setClearColor(0xeee8f3, 1);
    renderer.debug.onShaderError = (gl, program, vertexShader, fragmentShader) => {
      const programLog = gl.getProgramInfoLog(program) ?? "";
      const vertexLog = gl.getShaderInfoLog(vertexShader) ?? "";
      const fragmentLog = gl.getShaderInfoLog(fragmentShader) ?? "";
      throw new Error(`Unable to compile the pond shader\n${programLog}\n${vertexLog}\n${fragmentLog}`);
    };
    const stage = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(0, window.innerWidth, 0, window.innerHeight, 0.1, 100);
    camera.position.z = 10;
    const contextLost = (event: Event) => {
      event.preventDefault();
      fallback("webgl-context-lost");
    };
    canvas.addEventListener("webglcontextlost", contextLost);
    releaseRenderer = () => {
      canvas.removeEventListener("webglcontextlost", contextLost);
      stage.clear();
      renderer.dispose();
      renderer.forceContextLoss();
      canvas.remove();
    };
    const load = async (path: string) => {
      const asset = await loadPondAsset(path, loads.signal);
      if (disposed) {
        asset.texture.dispose();
        throw new DOMException("Pond initialization cancelled", "AbortError");
      }
      own(asset.texture);
      return asset;
    };
    const koiAtlas = await load("pixel-koi-atlas.webp");
    const colorAssets = await Promise.all([
      load("pixel-pond-world.webp"),
      load("water-displacement.jpg"),
      load("pixel-pond-foreground.webp"),
      load("pixel-pond-water-layer.webp"),
    ]);
    loads.signal.throwIfAborted();
    const blankAsset = (width: number, height: number): PondAsset => {
      const surface = document.createElement("canvas");
      surface.width = 1;
      surface.height = 1;
      const texture = new THREE.Texture(surface);
      texture.needsUpdate = true;
      own(texture);
      return { texture, image: surface as unknown as HTMLImageElement, width, height };
    };
    const pondTexture = colorAssets ? colorAssets[0] : blankAsset(1586, 992);
    const waterTexture = colorAssets ? colorAssets[1] : blankAsset(1024, 1024);
    const foregroundTexture = colorAssets ? colorAssets[2] : blankAsset(1586, 992);
    const pondWaterTexture = colorAssets ? colorAssets[3] : blankAsset(1586, 992);
    const hitCanvas = document.createElement("canvas");
    let hitPixels = new Uint8ClampedArray(0);
    if (colorAssets) {
      hitCanvas.width = pondWaterTexture.width;
      hitCanvas.height = pondWaterTexture.height;
      const hitContext = hitCanvas.getContext("2d", { willReadFrequently: true });
      if (!hitContext) throw new Error("Unable to create the pond hit map");
      hitContext.drawImage(pondWaterTexture.image, 0, 0);
      hitPixels = hitContext.getImageData(0, 0, hitCanvas.width, hitCanvas.height).data;
    }

    host.replaceChildren(canvas);
    canvas.className = options.canvasClassName;
    const quad = own(createYDownPondQuad());
    const sprite = (asset: PondAsset, order: number, atlas = false) => {
      const texture = atlas ? own(asset.texture.clone()) : asset.texture;
      const mesh = createPondSprite(quad, texture, order);
      own(mesh.material);
      return mesh;
    };
    const pixels = (order: number, capacity = 64) => {
      const mesh = new PondPixels(order, capacity);
      own(mesh.geometry);
      own(mesh.material);
      return mesh;
    };
    const layer = () => {
      const group = new THREE.Group();
      stage.add(group);
      return group;
    };
    const animate = (animation: AtlasAnimation, delta: number) => {
      animation.progress = (animation.progress + delta * 60 * animation.speed) % animation.frames.length;
      animation.frame = Math.floor(animation.progress);
      const column = animation.frames[animation.frame];
      setAtlasFrame(animation.texture, column, animation.row, 4, 4, animation.bounds?.[column]);
    };
    const background = sprite(pondTexture, 0);
    const foreground = sprite(foregroundTexture, 4);
    waterTexture.texture.colorSpace = THREE.NoColorSpace;
    waterTexture.texture.wrapS = THREE.RepeatWrapping;
    waterTexture.texture.wrapT = THREE.RepeatWrapping;
    waterTexture.texture.minFilter = THREE.LinearFilter;
    waterTexture.texture.magFilter = THREE.LinearFilter;
    const water = createPondWater(quad, pondTexture.texture, pondWaterTexture.texture, waterTexture.texture);
    const fishWaterMask = {
      texture: { value: pondWaterTexture.texture },
      origin: water.uniforms.imageOrigin,
      size: water.uniforms.imageSize,
      enabled: { value: 0 },
    };
    own(water.mesh.material);
    const fishLayer = layer();
    stage.add(background, water.mesh, foreground);
    let viewScale = 1;

    const worldCenterX = () => pondTexture.width / 2 + (window.innerWidth < 720 ? 170 : 0);
    const worldToScreen = (position: PondPoint) => ({
      x: window.innerWidth / 2 + (position.x - worldCenterX()) * viewScale,
      y: window.innerHeight / 2 + (position.y - pondTexture.height / 2) * viewScale,
    });
    const screenToWorld = (x: number, y: number) => ({
      x: worldCenterX() + (x - window.innerWidth / 2) / viewScale,
      y: pondTexture.height / 2 + (y - window.innerHeight / 2) / viewScale,
    });
    const pondFrame = {
      cell: 12,
      cx: window.innerWidth * 0.72,
      cy: window.innerHeight * 0.42,
      rx: 23,
      ry: 18,
      card: new THREE.Vector4(-1, -1, -1, -1),
    };
    const ellipseUniform = new THREE.Vector4();
    const measureFrame = () => {
      const width = window.innerWidth;
      const { cell } = pondAsciiGrid(width, window.innerHeight);
      const cx = width / 2;
      const cy = window.innerHeight / 2;
      const rx = width / cell;
      const ry = window.innerHeight / cell;
      pondFrame.cell = cell;
      pondFrame.cx = cx;
      pondFrame.cy = cy;
      pondFrame.rx = rx;
      pondFrame.ry = ry;
      measureCard();
    };
    const measureCard = () => {
      const cardEl = document.querySelector("[data-hero-card]");
      const cell = pondFrame.cell;
      if (cardEl instanceof HTMLElement) {
        const rect = cardEl.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          pondFrame.card.set(rect.left - cell, rect.top - cell, rect.right + cell, rect.bottom + cell);
          if (diagnostics) {
            host.dataset.pondCard = `${pondFrame.card.x.toFixed(1)},${pondFrame.card.y.toFixed(1)},${pondFrame.card.z.toFixed(1)},${pondFrame.card.w.toFixed(1)}`;
          }
          return;
        }
      }
      pondFrame.card.set(-1, -1, -1, -1);
      if (diagnostics) host.dataset.pondCard = "none";
    };
    const isPixelWater = (x: number, y: number) => {
      const pixelX = Math.round(x);
      const pixelY = Math.round(y);
      return pixelX >= 0 && pixelY >= 0 && pixelX < hitCanvas.width && pixelY < hitCanvas.height &&
        hitPixels[(pixelY * hitCanvas.width + pixelX) * 4 + 3] > 96;
    };
    const isWaterWorld = (x: number, y: number) => {
      if (!liveAscii) return isPixelWater(x, y);
      return x >= 0 && y >= 0 && x <= pondTexture.width && y <= pondTexture.height;
    };
    const isWaterScreen = (x: number, y: number) => {
      const world = screenToWorld(x, y);
      if (pond.dataset.view === "pixel") return isPixelWater(world.x, world.y);
      return isWaterWorld(world.x, world.y);
    };
    const nearestWater = (position: PondPoint) => {
      if (isWaterWorld(position.x, position.y)) return position;
      for (let radius = 12; radius <= 240; radius += 12) {
        for (let sample = 0; sample < 24; sample += 1) {
          const angle = sample / 24 * Math.PI * 2;
          const candidate = { x: position.x + Math.cos(angle) * radius, y: position.y + Math.sin(angle) * radius };
          if (isWaterWorld(candidate.x, candidate.y)) return candidate;
        }
      }
      return { x: pondTexture.width / 2, y: pondTexture.height / 2 };
    };

    const layout = () => {
      viewScale = Math.max(window.innerWidth / pondTexture.width, window.innerHeight / pondTexture.height) * 1.015;
      const position = {
        x: window.innerWidth / 2 - (worldCenterX() - pondTexture.width / 2) * viewScale,
        y: window.innerHeight / 2,
      };
      for (const mesh of [background, water.mesh, foreground]) {
        mesh.position.set(position.x, position.y, 0);
        mesh.scale.set(pondTexture.width * viewScale, pondTexture.height * viewScale, 1);
      }
      water.uniforms.imageSize.value.set(pondTexture.width * viewScale, pondTexture.height * viewScale);
      water.uniforms.imageOrigin.value.set(position.x - pondTexture.width * viewScale / 2, position.y - pondTexture.height * viewScale / 2);
      const displacementScale = Math.max(window.innerWidth / waterTexture.width, window.innerHeight / waterTexture.height) * 1.72;
      water.uniforms.noiseSize.value.set(waterTexture.width * displacementScale, waterTexture.height * displacementScale);
      water.uniforms.viewportCenter.value.set(window.innerWidth / 2, window.innerHeight / 2);
      camera.right = window.innerWidth;
      camera.bottom = window.innerHeight;
      camera.updateProjectionMatrix();
      const pixelRatio = liveAscii
        ? Math.min(window.devicePixelRatio || 1, POND_ASCII_DPR_CAP)
        : Math.min(window.devicePixelRatio || 1, Math.max(0.65, Math.min(1, 1040 / window.innerWidth)));
      renderer.setPixelRatio(pixelRatio);
      renderer.setSize(window.innerWidth, window.innerHeight, false);
      measureFrame();
      ascii?.resize(window.innerWidth, window.innerHeight, pixelRatio);
      if (diagnostics && ascii) {
        host.dataset.glyphInk = `${ascii.ink.cssWidth.toFixed(2)},${ascii.ink.cssHeight.toFixed(2)}`;
      }
    };
    let ascii: PondAscii | null = null;
    layout();
    if (liveAscii) {
      await Promise.race([
        document.fonts.load(`700 ${pondFrame.cell}px "Space Mono"`),
        new Promise((resolve) => { window.setTimeout(resolve, 1200); }),
      ]);
      if (disposed) throw new DOMException("Pond initialization cancelled", "AbortError");
      ascii = own(new PondAscii(renderer));
      layout();
    }

    const fishCells = new Map<string, number>();
    const bodyScales = new Map<string, number>();
    const tanchoIds = new Set<string>();
    const fishDefinitions: FishDefinition[] = testPose
      ? [{
        id: "fish-0",
        row: testPose.row,
        displayWidth: 160 * (window.innerWidth < 720 ? 0.8 : 1),
        position: nearestWater({
          x: worldCenterX() + (0.74 - 0.5) * (window.innerWidth / viewScale) * 0.88,
          y: pondTexture.height / 2 + (0.45 - 0.5) * (window.innerHeight / viewScale) * 0.88,
        }),
        heading: testPose.heading,
        cruise: Math.round(0 * 1.8 + 5),
        alpha: 1,
        species: ["kohaku", "ogon", "showa", "utsuri"][testPose.row] ?? "showa",
      }]
      : Array.from({ length: window.innerWidth < 640 ? 8 : 18 }, (_, index) => {
        const entry = {
          cells: (index < 7 ? (window.innerWidth < 640 ? 15 : 19) : (window.innerWidth < 640 ? 8 : 10)) + index % 3,
          cruise: 24 + index % 5 * 3,
          heading: index * 2.4,
          nx: ((index * 7) % 20 + 0.5) / 20,
          ny: ((index * 11) % 20 + 0.5) / 20,
        };
        const id = `fish-${index}`;
        fishCells.set(id, entry.cells);
        const bodyScale = 1.12;
        bodyScales.set(id, bodyScale);
        const visualLength = entry.cells * pondFrame.cell / viewScale;
        return {
          id,
          row: 0,
          displayWidth: visualLength * bodyScale,
          visualLength,
          position: nearestWater({
            x: pondTexture.width * (window.innerWidth < 640 ? 0.4 + entry.nx * 0.4 : 0.08 + entry.nx * 0.84),
            y: pondTexture.height * (0.08 + entry.ny * 0.84),
          }),
          heading: entry.heading,
          cruise: entry.cruise,
          alpha: 0.94,
          species: "kohaku",
        };
      });
    if (testPose) {
      const point = worldToScreen(fishDefinitions[0].position);
      if (diagnostics) host.dataset.koiTest = JSON.stringify({
        row: testPose.row,
        column: testPose.column,
        x: point.x,
        y: point.y,
        size: fishDefinitions[0].displayWidth * viewScale,
      });
    }
    const pondSeed = new URLSearchParams(window.location.search).get("pond-seed")?.slice(0, 128).trim() || "6c75";
    if (diagnostics) host.dataset.pondSeed = pondSeed;
    const simulationOptions = {
      seed: pondSeed,
      width: pondTexture.width,
      height: pondTexture.height,
      fish: fishDefinitions,
      headSeparation: 0,
      avoidHeadOn: liveAscii,
      shoreClearance: liveAscii ? 12 : undefined,
      resizeAdmission: liveAscii,
      recoverOutside: liveAscii,
      waterBounds: liveAscii ? () => ({ minX: 0, maxX: pondTexture.width, minY: 0, maxY: pondTexture.height }) : undefined,
      flies: [
        { id: "fly-0", position: screenToWorld(window.innerWidth * 0.72, window.innerHeight * 0.25), orbitX: 240, orbitY: 90, phase: 0.4, speed: 0.021, color: 0x56d7c8 },
        { id: "fly-1", position: screenToWorld(window.innerWidth * 0.33, window.innerHeight * 0.36), orbitX: 190, orbitY: 115, phase: 2.7, speed: 0.019, color: 0xe8a64f },
      ],
      isWater: isWaterWorld,
    };
    let simulation: ReturnType<typeof createPondSimulation>;
    while (true) {
      try {
        simulation = createPondSimulation(simulationOptions);
        break;
      } catch (error) {
        if (!(error instanceof Error) || error.message !== "Pond cannot fit non-overlapping fish in water" || fishDefinitions.length <= 1) throw error;
        fishDefinitions.pop();
      }
    }
    destroySimulation = () => simulation.destroy();
    const visualRandom = createPondRandom(`${pondSeed}:render`);

    const sourceCellHeight = koiAtlas.height / 4;
    const fishGeometry = liveAscii ? own(createBentFishGeometry()) : quad;
    type MaterialSwap = {
      mesh: THREE.Mesh;
      colorMaterial: THREE.Material;
      idMaterial: THREE.Material;
      sync?: () => void;
    };
    const swaps: MaterialSwap[] = [];
    const bindSwap = (mesh: THREE.Mesh, idMaterial: THREE.Material, sync?: () => void) => {
      swaps.push({ mesh, colorMaterial: mesh.material as THREE.Material, idMaterial, sync });
    };
    const foodIdMaterial = own(createFlatIdMaterial(12));
    const flyIdMaterial = own(createFlatIdMaterial(14));
    const bonkIdMaterial = own(createFlatIdMaterial(15));
    const fishVisuals = new Map<string, FishVisual>();
    for (const fish of fishDefinitions) {
      const fishSprite = liveAscii
        ? createPondSprite(fishGeometry, own(koiAtlas.texture.clone()), 2)
        : sprite(koiAtlas, 2, true);
      if (liveAscii) own(fishSprite.material);
      const bend: FishBendUniforms | null = liveAscii ? {
        time: { value: 0 },
        curve: { value: 0 },
        amount: { value: 1 },
      } : null;
      if (bend) attachFishBend(fishSprite.material, bend);
      if (liveAscii) attachPondWaterMask(fishSprite.material, fishWaterMask);
      if (bend && fishSprite.material.map) {
        const identified = createFishIdMaterial(fishSprite.material.map, bend, tanchoIds.has(fish.id));
        own(identified.material);
        bindSwap(fishSprite, identified.material, identified.sync);
      }
      fishSprite.scale.set(fish.displayWidth, fish.displayWidth, 1);
      const animation: AtlasAnimation = {
        texture: fishSprite.material.map!,
        frames: testPose ? [testPose.column] : liveAscii ? [1] : [1, 0, 1, 2, 3, 2],
        row: fish.row,
        bounds: KOI_FRAME_BOUNDS_PX[fish.row],
        speed: liveAscii ? 0 : 0.038 + fish.row * 0.003,
        progress: liveAscii ? 0 : fish.row % 6,
        frame: 0,
      };
      animate(animation, 0);
      const shadow = pixels(2);
      if (liveAscii) attachPondWaterMask(shadow.material, fishWaterMask);
      shadow.ellipse(3, 7, fish.displayWidth * 0.14, fish.displayWidth * 0.31, 0x062e30, 0.2);
      shadow.material.blending = THREE.MultiplyBlending;
      shadow.material.premultipliedAlpha = true;
      const container = new THREE.Group();
      container.rotation.z = fish.heading + Math.PI / 2;
      container.add(shadow, fishSprite);
      fishLayer.add(container);
      const bonk = pixels(9, 180);
      const glyphs = [
        ["010", "111", "010", "101", "000"],
        ["100", "100", "110", "101", "110"],
        ["000", "000", "010", "101", "010"],
        ["000", "000", "110", "101", "101"],
        ["100", "101", "110", "101", "101"],
        ["010", "111", "010", "101", "000"],
      ];
      for (const shadowPass of [true, false]) {
        glyphs.forEach((glyph, letter) => glyph.forEach((row, y) => {
          for (let x = 0; x < row.length; x += 1) {
            if (row[x] === "1") bonk.rectangle((letter * 4 + x - 11.5) * 2 + (shadowPass ? 1 : 0),
              y * 2 + (shadowPass ? 1 : 0), 2, 2, shadowPass ? 0x173d3c : 0xffefb0);
          }
        }));
      }
      const stars = pixels(9.1, 24);
      const status = new THREE.Group();
      status.add(bonk, stars);
      status.visible = false;
      if (liveAscii) status.scale.setScalar(Math.max(1, pondFrame.cell / 4));
      stage.add(status);
      fishVisuals.set(fish.id, {
        container, sprite: fishSprite, shadow, animation, alpha: fish.alpha,
        baseScaleX: (fishCells.get(fish.id) ?? fish.displayWidth) * (fishCells.has(fish.id) ? pondFrame.cell / viewScale : 1),
        lastWake: 0, surfaced: false, status, bonk, stars,
        bend, bendHeading: fish.heading,
      });
      if (liveAscii) {
        shadow.visible = false;
        bindSwap(bonk, bonkIdMaterial);
        bindSwap(stars, bonkIdMaterial);
      }
    }

    const insectLayer = layer();
    const flyVisuals = new Map<string, FlyVisual>();
    for (const fly of [
      { id: "fly-0", color: 0x56d7c8 },
      { id: "fly-1", color: 0xe8a64f },
    ]) {
      const wings = pixels(6);
      wings.rectangle(-6, -9, 10, 3, 0xe3fff5, 0.78);
      wings.rectangle(-6, 6, 10, 3, 0xe3fff5, 0.78);
      wings.rectangle(-2, -6, 8, 2, 0x9de9df, 0.66);
      wings.rectangle(-2, 4, 8, 2, 0x9de9df, 0.66);
      wings.rectangle(-5, -8, 6, 1, 0xffffff, 0.82);
      wings.rectangle(-5, 7, 6, 1, 0xffffff, 0.82);
      const body = pixels(6);
      for (let segment = 0; segment < 5; segment += 1) {
        body.rectangle(-14 + segment * 3, -1, 2, 2, segment % 2 ? 0x173d3c : fly.color);
      }
      body.rectangle(0, -2, 7, 4, fly.color);
      body.rectangle(6, -3, 3, 2, 0x173d3c);
      body.rectangle(6, 1, 3, 2, 0x173d3c);
      body.rectangle(7, -2, 1, 1, 0xf4fff1);
      body.rectangle(7, 1, 1, 1, 0xf4fff1);
      const container = new THREE.Group();
      container.add(wings, body);
      insectLayer.add(container);
      flyVisuals.set(fly.id, { container, wings });
      if (liveAscii) {
        bindSwap(wings, flyIdMaterial);
        bindSwap(body, flyIdMaterial);
      }
    }
    const midgeLayer = pixels(6);
    insectLayer.add(midgeLayer);
    const midges = Array.from({ length: reduced ? 5 : 12 }, (_, index) => ({
      position: { x: 170 + (index * 113) % 1220, y: 130 + (index * 173) % 680 },
      phase: index * 1.73,
      orbit: 7 + index % 5,
    }));

    const ambientLayer = layer();
    const pondElements = [
      { x: 837, y: 98 }, { x: 955, y: 126 }, { x: 1007, y: 200 }, { x: 1129, y: 206 },
      { x: 1192, y: 200 }, { x: 1252, y: 207 }, { x: 1120, y: 480 }, { x: 1230, y: 630 },
      { x: 922, y: 738 }, { x: 1050, y: 835 },
    ].map((position, index) => {
      const mark = pixels(4.2);
      mark.rectangle(-5, -2, 8, 2, 0xdff7a5, 0.2);
      mark.rectangle(4, -1, 3, 1, 0xf4efb1, 0.32);
      ambientLayer.add(mark);
      return { position, phase: index * 0.77, container: mark, offset: { x: 0, y: 0 } };
    });

    const particleLayer = pixels(3.2, 2048);
    stage.add(particleLayer);
    let particles: Particle[] = [];
    let rings: Ring[] = [];
    let ripples: Ripple[] = [];
    const addParticle = (x: number, y: number, vx: number, vy: number, life = 760, size = 2, color = 0xc8fff0) => {
      particles.push({ x, y, vx, vy, born: performance.now(), life, size, color });
      if (particles.length > (reduced ? 32 : 120)) particles = particles.slice(reduced ? -32 : -120);
      if (diagnostics) host.dataset.wakeCount = String(particles.length);
    };
    const addRing = (x: number, y: number, radius = 34, life = 620, color = 0xb9f5e7) => {
      rings.push({ x, y, born: performance.now(), life, radius, color });
      if (rings.length > (reduced ? 4 : 10)) rings = rings.slice(reduced ? -4 : -10);
      if (diagnostics) host.dataset.ringCount = String(rings.length);
    };
    const addRipple = (x: number, y: number, size = 132, strength = 1) => {
      if (liveAscii && reduced) return;
      const speed = 145 + strength * 45;
      const rippleSize = liveAscii ? 14 * pondFrame.cell : size;
      const life = liveAscii ? 1200 : size / speed * 1000 + 180;
      ripples.push({ x, y, size: rippleSize, strength, speed, born: performance.now(), life });
      if (ripples.length > POND_RIPPLE_CAPACITY) ripples.shift();
      if (diagnostics) host.dataset.rippleCount = String(ripples.length);
    };

    const foodLayer = layer();
    const foodVisuals = new Map<string, FoodVisual>();
    const createFoodVisual = (id: string) => {
      const shadow = pixels(3.4);
      shadow.ellipse(0, 3, 7, 3, 0x062d2c, 0.24);
      shadow.material.blending = THREE.MultiplyBlending;
      shadow.material.premultipliedAlpha = true;
      if (liveAscii) shadow.visible = false;
      const group = new THREE.Group();
      const pellets = Array.from({ length: 9 }, (_, index) => {
        const pellet = pixels(3.4, 1);
        const angle = index * 2.399;
        const radius = index === 0 ? 0 : 2 + index % 3 * 2;
        pellet.rectangle(-1, -1, index % 4 === 0 ? 3 : 2, 2,
          index % 3 === 0 ? 0xe4bb68 : index % 3 === 1 ? 0xb97a43 : 0xf0d184, 0.96);
        pellet.position.set(Math.cos(angle) * radius, Math.sin(angle) * radius * 0.72, 0);
        group.add(pellet);
        if (liveAscii) bindSwap(pellet, foodIdMaterial);
        return pellet;
      });
      const container = new THREE.Group();
      container.add(shadow, group);
      foodLayer.add(container);
      const visual = { container, group, pellets, shadow };
      foodVisuals.set(id, visual);
      return visual;
    };
    const feedAffordance = pixels(7);
    feedAffordance.rectangle(-8, -1, 4, 2, 0xffefab, 0.72);
    feedAffordance.rectangle(5, -1, 4, 2, 0xffefab, 0.72);
    feedAffordance.rectangle(-1, -8, 2, 4, 0xd7fff0, 0.64);
    feedAffordance.rectangle(-1, 5, 2, 4, 0xd7fff0, 0.64);
    feedAffordance.material.opacity = 0;
    stage.add(feedAffordance);
    let affordanceTarget = 0;

    let pointer = {
      screen: { x: -1000, y: -1000 }, world: { x: -1000, y: -1000 },
      velocity: { x: 0, y: 0 }, time: 0, energy: 0,
    };
    let lastTrailRing = 0;
    let lastPointerWake = 0;
    let glyphWakes: { x: number; y: number; born: number; life: number }[] = [];
    const addGlyphWake = (x: number, y: number, life: number) => {
      if (!liveAscii || reduced) return;
      glyphWakes.push({ x, y, born: performance.now(), life });
      if (glyphWakes.length > 120) glyphWakes = glyphWakes.slice(-120);
    };
    const wakeLayer = pixels(1.2, 760);
    wakeLayer.material = own(createWakeIdMaterial()) as unknown as THREE.MeshBasicMaterial;
    wakeLayer.visible = false;
    stage.add(wakeLayer);
    let primaryImpactCount = 0;
    let lastFoodRequested: PondPoint | null = null;
    let lastFoodDropped: PondPoint | null = null;
    let maxFoodCount = 0;
    let touchGesture = "none";
    disposeInput = installPondInput({
      interaction,
      toWorld: screenToWorld,
      isWater: isWaterScreen,
      onPointer: (screen, world, velocity, energy) => {
        const now = performance.now();
        const distance = Math.hypot(screen.x - pointer.screen.x, screen.y - pointer.screen.y);
        if (energy > 0 && pointer.time && distance > 4) {
          const count = Math.min(5, Math.max(1, Math.floor(distance / 18)));
          for (let index = 0; index < count; index += 1) {
            const progress = (index + 1) / (count + 1);
            addParticle(
              pointer.screen.x + (screen.x - pointer.screen.x) * progress,
              pointer.screen.y + (screen.y - pointer.screen.y) * progress,
              (visualRandom() - 0.5) * 10,
              -5 - visualRandom() * 8,
              520 + visualRandom() * 280,
              visualRandom() > 0.72 ? 3 : 2,
            );
          }
          if (now - lastTrailRing > 82) {
            addRing(screen.x, screen.y);
            lastTrailRing = now;
          }
          if (liveAscii && now - lastPointerWake > 40) {
            addGlyphWake(screen.x, screen.y, 1000);
            lastPointerWake = now;
          }
        }
        pointer = { screen, world, velocity, time: energy > 0 ? now : 0, energy };
      },
      onPrimaryImpact: (screen) => {
        primaryImpactCount += 1;
        addRipple(screen.x, screen.y, reduced ? 72 : 132, reduced ? 0.28 : 1);
        addRing(screen.x, screen.y, reduced ? 36 : 72, reduced ? 620 : 920, 0xffe8a0);
        const count = reduced ? 4 : 14;
        for (let index = 0; index < count; index += 1) {
          const angle = index / count * Math.PI * 2;
          const speed = 18 + index % 3 * 5;
          addParticle(screen.x, screen.y, Math.cos(angle) * speed, Math.sin(angle) * speed, 680, index % 4 === 0 ? 3 : 2);
        }
      },
      onFoodDrop: (_screen, world) => {
        if (diagnostics) lastFoodRequested = { ...world };
        simulation.dropFood(world);
      },
      onAffordance: (screen, visible) => {
        feedAffordance.position.set(screen.x, screen.y, 0);
        affordanceTarget = visible ? 0.34 : 0;
        if (diagnostics) host.dataset.foodAffordance = String(visible);
      },
      onGesture: (gesture) => { touchGesture = gesture; },
    });

    const motionScale = reduced ? 0.2 : 1;
    let simulationNow = performance.now();
    let frame: PondSimulationFrame | null = null;
    let frameCount = 0;
    let foodDroppedCount = 0;
    let foodExpiredCount = 0;
    let fishFedCount = 0;
    let revealed = false;
    const current = { ax: 0, ay: 0, bx: 0, by: 0 };
    const step = (now: number, delta: number) => {
      const simulationDelta = delta * motionScale;
      simulationNow += simulationDelta * 1000;
      const pointerInfluence = pointer.time === 0 ? 0 : Math.max(0, 1 - (now - pointer.time) / 1400);
      frame = simulation.step({
        now: simulationNow,
        delta: simulationDelta,
        pointer: {
          position: pointer.world,
          velocity: { x: pointer.velocity.x / viewScale, y: pointer.velocity.y / viewScale },
          influence: pointerInfluence,
          energy: pointer.energy,
        },
      });
      const { environment } = frame;

      current.ax += environment.currentA.x * simulationDelta;
      current.ay += environment.currentA.y * simulationDelta;
      current.bx += environment.currentB.x * simulationDelta;
      current.by += environment.currentB.y * simulationDelta;
      water.uniforms.angles.value.x += (environment.currentA.y - environment.currentA.x) * simulationDelta * 0.0009;
      water.uniforms.angles.value.y += (environment.currentB.x + environment.currentB.y) * simulationDelta * 0.0007;
      const waterEnergy = pointerInfluence * pointer.energy;
      water.uniforms.currentA.value.set(current.ax, current.ay,
        environment.surfaceA.x + waterEnergy * 2.6 * motionScale,
        environment.surfaceA.y + waterEnergy * 1.9 * motionScale);
      water.uniforms.currentB.value.set(current.bx, current.by,
        environment.surfaceB.x - waterEnergy * 1.25 * motionScale,
        environment.surfaceB.y + waterEnergy * motionScale);
      water.uniforms.glow.value += (0.055 + environment.light * 0.34 - water.uniforms.glow.value) * Math.min(1, delta * 0.42);
      water.uniforms.finger.value.set(pointer.screen.x, pointer.screen.y,
        140 + waterEnergy * 80, waterEnergy > 0.005 ? -0.105 * waterEnergy * motionScale : 0);

      for (const event of frame.events) {
        if (event.type === "ambient-ripple") {
          const point = worldToScreen(event.position);
          if (isWaterScreen(point.x, point.y)) {
            addRing(point.x, point.y, 20 + event.strength * 22, 1100, 0xb4e8d5);
            if (!reduced) addRipple(point.x, point.y, 65, event.strength * 0.3);
          }
        } else if (event.type === "food-dropped") {
          foodDroppedCount += 1;
          if (diagnostics) lastFoodDropped = { ...event.position };
          const point = worldToScreen(event.position);
          addRipple(point.x, point.y, reduced ? 42 : 72, event.rippleStrength * (reduced ? 0.32 : 1));
          addRing(point.x, point.y, reduced ? 18 : 30, reduced ? 460 : 720, 0xf2d58a);
        } else if (event.type === "fish-fed") {
          fishFedCount += 1;
          const point = worldToScreen(event.position);
          addRing(point.x, point.y, 13, 390, 0xe8d38d);
          addParticle(point.x, point.y, 0, -7, 340, 2, 0xffe9a8);
        } else if (event.type === "food-expired") {
          foodExpiredCount += 1;
        }
      }

      const liveFood = new Set(frame.foods.map((food) => food.id));
      maxFoodCount = Math.max(maxFoodCount, frame.foods.length);
      for (const food of frame.foods) {
        const visual = foodVisuals.get(food.id) ?? createFoodVisual(food.id);
        const point = worldToScreen(food.position);
        const fall = Math.pow(1 - food.dropProgress, 2) * (reduced ? 5 : 22);
        visual.container.position.set(point.x, point.y, 0);
        visual.group.position.y = -fall;
        const foodScale = (0.76 + food.pelletSize / 13) * (food.state === "depleted" ? 0.72 : 1);
        visual.group.scale.setScalar(liveAscii ? foodScale * Math.max(1, pondFrame.cell / 2.4) : foodScale);
        visual.shadow.material.opacity = food.state === "dropping" ? 0.12 + food.dropProgress * 0.5 : 0.7;
        visual.pellets.forEach((pellet, index) => { pellet.visible = index < Math.ceil(food.remainingAmount); });
      }
      for (const [id, visual] of foodVisuals) {
        if (!liveFood.has(id)) {
          visual.container.removeFromParent();
          for (const mesh of [visual.shadow, ...visual.pellets]) {
            const index = swaps.findIndex((swap) => swap.mesh === mesh);
            if (index >= 0) swaps.splice(index, 1);
            mesh.geometry.dispose();
            mesh.material.dispose();
            resources.delete(mesh.geometry);
            resources.delete(mesh.material);
          }
          foodVisuals.delete(id);
        }
      }
      feedAffordance.material.opacity += (affordanceTarget - feedAffordance.material.opacity) * Math.min(1, delta * 8);
      feedAffordance.rotation.z += environment.wind * delta * 0.025;


      for (const element of pondElements) {
        const base = worldToScreen(element.position);
        const dx = base.x - pointer.screen.x;
        const dy = base.y - pointer.screen.y;
        const distance = Math.max(1, Math.hypot(dx, dy));
        const reaction = pointerInfluence * Math.max(0, 1 - distance / 145);
        const drift = Math.sin(simulationNow * 0.0012 + element.phase);
        const targetX = dx / distance * reaction * 6 + environment.wind * 2.5 + drift * 2;
        const targetY = dy / distance * reaction * 3.5 + Math.cos(simulationNow * 0.0009 + element.phase) * 1.5;
        element.offset.x += (targetX - element.offset.x) * Math.min(1, delta * 5.2);
        element.offset.y += (targetY - element.offset.y) * Math.min(1, delta * 5.2);
        element.container.position.set(Math.round(base.x + element.offset.x), Math.round(base.y + element.offset.y), 0);
        element.container.rotation.z = element.offset.x * 0.008;
        element.container.material.opacity = 0.38 + drift * 0.18 + reaction * 0.34;
      }

      midgeLayer.clear();
      for (const midge of midges) {
        const base = worldToScreen(midge.position);
        const x = Math.round(base.x + Math.sin(simulationNow * 0.0011 + midge.phase) * midge.orbit + environment.wind * 2);
        const y = Math.round(base.y + Math.cos(simulationNow * 0.00145 + midge.phase * 1.3) * midge.orbit * 0.65);
        midgeLayer.rectangle(x, y, 2, 2, 0x172f2d, 0.8);
      }
      for (const fly of frame.flies) {
        const visual = flyVisuals.get(fly.id);
        if (!visual) continue;
        const point = worldToScreen(fly.position);
        if (liveAscii) {
          const angle = fly.id === "fly-0" ? -2.35 : 0.55;
          const band = 1.15 + Math.sin(simulationNow * 0.001 + (fly.id === "fly-0" ? 0.4 : 2.1)) * 0.35;
          visual.container.position.set(
            pondFrame.cx + Math.cos(angle) * (pondFrame.rx + band) * pondFrame.cell,
            pondFrame.cy + Math.sin(angle) * (pondFrame.ry + band) * pondFrame.cell,
            0,
          );
        } else visual.container.position.set(point.x, point.y, 0);
        visual.container.scale.setScalar((1 + fly.lift * 0.008) * (liveAscii ? 1.7 : 1));
        const speed = Math.hypot(fly.velocity.x, fly.velocity.y);
        if (speed > 2) visual.container.rotation.z += pondAngleDelta(visual.container.rotation.z, fly.heading) * (1 - Math.exp(-delta * 8));
        visual.wings.scale.y = 0.35 + Math.abs(Math.sin(fly.wingPhase)) * fly.wingActivity * (fly.reacting ? 1.1 : 0.75);
      }

      for (const fish of frame.fish) {
        const visual = fishVisuals.get(fish.id);
        if (!visual) continue;
        const point = worldToScreen(testPose ? fishDefinitions[0].position : fish.position);
        visual.container.position.set(point.x, point.y, 0);
        const order = 2 + point.y / (1 + Math.abs(point.y)) * 0.1;
        visual.shadow.renderOrder = order;
        visual.sprite.renderOrder = order + 1e-9;
        const speed = Math.hypot(fish.velocity.x, fish.velocity.y);
        const targetHeading = (testPose?.heading ?? fish.heading) + Math.PI / 2;
        visual.container.rotation.z += pondAngleDelta(visual.container.rotation.z, targetHeading) * Math.min(1, delta * 6);
        const effort = Math.min(2.5, fish.speedScale);
        if (visual.bend) {
          const turn = pondAngleDelta(visual.bendHeading, fish.heading);
          visual.bendHeading = fish.heading;
          const curve = Math.max(-0.22, Math.min(0.22, turn * 1.5));
          visual.bend.curve.value += (curve - visual.bend.curve.value) * Math.min(1, delta * 8);
          visual.bend.time.value += delta * motionScale * (2.5 + effort * 2);
        }
        visual.animation.speed = (0.012 + effort * 0.025) * motionScale;
        const depthAlpha = testPose ? 1 : Math.min(0.98, fish.alpha + (0.5 - fish.depth) * 0.55);
        visual.alpha = testPose ? 1 : visual.alpha + (depthAlpha - visual.alpha) * Math.min(1, delta * 4);
        visual.sprite.material.opacity = visual.alpha;
        visual.shadow.material.opacity = visual.alpha;
        visual.sprite.material.color.setHex(fish.stun ? 0xd4d5ef : fish.state === "feeding" ? 0xf4fff3 : 0xe8fff9);
        animate(visual.animation, delta);
        const feedingPulse = testPose?.feedingPulse ?? (fish.state === "feeding" ? fish.feedingPulse : null);
        const peck = feedingPulse === null ? 1 : 1 - Math.abs(feedingPulse * 2 - 1) * 0.055;
        visual.sprite.rotation.z = 0;
        const depthScale = testPose ? 1 : 0.9 + (1 - fish.depth) * 0.18;
        const frameBounds = KOI_FRAME_BOUNDS_PX[fish.row][visual.animation.frames[visual.animation.frame]];
        const frameCenter = frameBounds.top + frameBounds.height / 2;
        const sourceCellCenter = (fish.row + 0.5) * sourceCellHeight;
        const pixelScale = visual.baseScaleX * viewScale * depthScale / sourceCellHeight;
        visual.sprite.position.y = (frameCenter - sourceCellCenter) * pixelScale * (2 - peck);
        if (liveAscii && !testPose) {
          const span = pondKoiQuadPixels(fishCells.get(fish.id) ?? 14, pondFrame.cell);
          visual.baseScaleX = span.scaleY / viewScale;
          visual.sprite.position.y = 0;
          visual.sprite.scale.set(span.scaleX * peck, span.scaleY * (2 - peck), 1);
        } else {
          visual.sprite.scale.set(visual.baseScaleX * viewScale * peck * depthScale, frameBounds.height * pixelScale * (2 - peck), 1);
        }
        visual.shadow.scale.setScalar((0.86 + fish.depth * 0.24) * viewScale);
        visual.status.visible = fish.stun !== null;
        if (fish.stun) {
          const headOffset = visual.baseScaleX * viewScale * depthScale * 0.43;
          visual.status.position.set(point.x + Math.cos(fish.heading) * headOffset,
            point.y + Math.sin(fish.heading) * headOffset - 14, 0);
          visual.bonk.position.y = -22 - Math.min(1, fish.stun.elapsed / 1.3) * (reduced ? 0 : 10);
          visual.bonk.material.opacity = Math.max(0, 1 - fish.stun.elapsed / 1.3);
          visual.stars.clear();
          for (let index = 0; index < 3; index += 1) {
            const angle = index / 3 * Math.PI * 2 + (reduced ? 0 : fish.stun.elapsed * 4);
            const x = Math.round(Math.cos(angle) * 15);
            const y = Math.round(Math.sin(angle) * 6);
            visual.stars.rectangle(x - 1, y - 4, 2, 3, 0xffdb72);
            visual.stars.rectangle(x - 5, y - 1, 10, 2, 0xffdb72);
            visual.stars.rectangle(x - 3, y + 1, 6, 2, 0xffdb72);
            visual.stars.rectangle(x - 4, y + 3, 2, 2, 0xffdb72);
            visual.stars.rectangle(x + 2, y + 3, 2, 2, 0xffdb72);
            visual.stars.rectangle(x - 1, y - 1, 2, 2, 0xfff8d3);
          }
          visual.stars.material.opacity = Math.min(1, fish.stun.remaining / 0.35);
        }
        const surfaced = fish.depth < 0.18;
        if (surfaced && !visual.surfaced && !reduced) {
          addRing(point.x, point.y, fish.displayWidth * 0.34, 1100, 0xd9fff0);
          addRipple(point.x, point.y, fish.displayWidth * 1.3, 0.45);
        }
        visual.surfaced = surfaced;
        if (liveAscii && !reduced && speed > 6 && now - visual.lastWake > Math.max(90, 90 * 28 / Math.max(speed, 6))) {
          const tail = worldToScreen({
            x: fish.position.x - Math.cos(fish.heading) * visual.baseScaleX * 0.42,
            y: fish.position.y - Math.sin(fish.heading) * visual.baseScaleX * 0.42,
          });
          const lateral = (visualRandom() - 0.5) * 3 * pondFrame.cell;
          const wakeX = tail.x + Math.cos(fish.heading + Math.PI / 2) * lateral;
          const wakeY = tail.y + Math.sin(fish.heading + Math.PI / 2) * lateral;
          if (isWaterScreen(wakeX, wakeY)) addGlyphWake(wakeX, wakeY, 1200);
          visual.lastWake = now;
        }
        if (!liveAscii && !reduced && speed > 9 && (fish.depth < 0.4 || fish.reacting) && now - visual.lastWake > 240 / Math.max(0.65, effort)) {
          const tail = worldToScreen({
            x: fish.position.x - Math.cos(fish.heading) * fish.displayWidth * 0.22,
            y: fish.position.y - Math.sin(fish.heading) * fish.displayWidth * 0.22,
          });
          for (const side of [-1, 1]) {
            addParticle(tail.x, tail.y,
              -Math.cos(fish.heading) * speed * 0.2 + Math.sin(fish.heading) * side * 9,
              -Math.sin(fish.heading) * speed * 0.2 - Math.cos(fish.heading) * side * 9,
              850, 2, 0x9be4d7);
          }
          visual.lastWake = now;
        }
      }

      particleLayer.clear();
      particles = particles.filter((particle) => {
        const age = now - particle.born;
        if (age >= particle.life) return false;
        particle.x += particle.vx * delta;
        particle.y += particle.vy * delta;
        particle.vx *= Math.pow(0.92, delta * 60);
        particle.vy *= Math.pow(0.92, delta * 60);
        particleLayer.rectangle(Math.round(particle.x), Math.round(particle.y), particle.size, particle.size,
          particle.color, Math.max(0, 1 - age / particle.life) * 0.72);
        return true;
      });
      rings = rings.filter((ring) => {
        const age = now - ring.born;
        if (age >= ring.life) return false;
        const progress = age / ring.life;
        const radius = 4 + ring.radius * (1 - Math.pow(1 - progress, 2));
        const alpha = Math.sin(progress * Math.PI) * 0.68;
        const points = Math.max(16, Math.round(radius * 0.55));
        for (let index = 0; index < points; index += 2) {
          const angle = index / points * Math.PI * 2;
          particleLayer.rectangle(
            Math.round(ring.x + Math.cos(angle) * radius),
            Math.round(ring.y + Math.sin(angle) * radius * 0.72),
            progress < 0.5 ? 3 : 2,
            2, ring.color, alpha,
          );
        }
        return true;
      });
      ripples = ripples.filter((ripple) => now - ripple.born < ripple.life);
      wakeLayer.clear();
      glyphWakes = glyphWakes.filter((wake) => {
        const age = now - wake.born;
        if (age >= wake.life) return false;
        const life = 1 - age / wake.life;
        const size = pondFrame.cell * 0.9;
        wakeLayer.rectangle(wake.x - size / 2, wake.y - size / 2, size, size, 0xffffff, life);
        return true;
      });
      for (let index = 0; index < POND_RIPPLE_CAPACITY; index += 1) {
        const ripple = ripples[index];
        if (ripple) {
          water.uniforms.rippleCenters.value[index].set(ripple.x, ripple.y, ripple.size, 1.2 + ripple.strength * 3.8);
          const age = (now - ripple.born) / 1000;
          water.uniforms.rippleWaves.value[index].set(age, ripple.speed, 22 + ripple.size * 0.16, Math.exp(-age * 1.4));
        } else {
          water.uniforms.rippleWaves.value[index].w = 0;
        }
      }

      frameCount += 1;
      if (diagnostics && (frameCount === 1 || frameCount % 12 === 0)) {
        host.dataset.fishPositions = frame.fish.map((fish) => {
          const point = worldToScreen(fish.position);
          return `${point.x.toFixed(1)},${point.y.toFixed(1)}`;
        }).join(";");
        host.dataset.fishWorldPositions = frame.fish.map((fish) => `${fish.position.x.toFixed(2)},${fish.position.y.toFixed(2)}`).join(";");
        host.dataset.fishIds = frame.fish.map((fish) => fish.id).join(";");
        host.dataset.fishWidths = frame.fish.map((fish) => fish.displayWidth.toFixed(2)).join(";");
        host.dataset.fishReacting = String(frame.fish.some((fish) => fish.reacting));
        host.dataset.fishActivities = frame.fish.map((fish) => `${fish.id}:${fish.activity}`).join(";");
        host.dataset.fishStuns = frame.fish.flatMap((fish) => fish.stun
          ? [`${fish.id}:${fish.stun.remaining.toFixed(2)}:${fish.stun.serial}`] : []).join(";");
        host.dataset.fishHeadings = frame.fish.map((fish) => fish.heading.toFixed(3)).join(";");
        host.dataset.fishWaterViolation = String(frame.fish.some((fish) => !isWaterWorld(fish.position.x, fish.position.y)));
        host.dataset.fishMaxStep = Math.max(...frame.fish.map((fish) => fish.maxStep)).toFixed(2);
        host.dataset.fishAverageSpeed = (
          frame.fish.reduce((sum, fish) => sum + Math.hypot(fish.velocity.x, fish.velocity.y), 0) /
          Math.max(1, frame.fish.length)
        ).toFixed(2);
        host.dataset.padAnchorIds = ROCK_ANCHORS.map((anchor) => anchor.id).join(",");
        host.dataset.rippleCount = String(ripples.length);
        host.dataset.wakeCount = String(particles.length);
        host.dataset.ringCount = String(rings.length);
        host.dataset.foodCount = String(frame.foods.length);
        host.dataset.foodMaxCount = String(maxFoodCount);
        host.dataset.foodDroppedCount = String(foodDroppedCount);
        host.dataset.foodExpiredCount = String(foodExpiredCount);
        host.dataset.fishFedCount = String(fishFedCount);
        host.dataset.primaryImpactCount = String(primaryImpactCount);
        host.dataset.fishFoodStates = frame.fish.map((fish) => `${fish.id}:${fish.state}:${fish.foodId ?? "none"}`).join(";");
        host.dataset.foodEntities = frame.foods.map((food) => `${food.id}:${food.position.x.toFixed(2)},${food.position.y.toFixed(2)}:${food.state}:${food.remainingAmount}`).join(";");
        if (lastFoodRequested) host.dataset.foodRequestedAt = `${lastFoodRequested.x.toFixed(2)},${lastFoodRequested.y.toFixed(2)}`;
        if (lastFoodDropped) host.dataset.foodLastDrop = `${lastFoodDropped.x.toFixed(2)},${lastFoodDropped.y.toFixed(2)}`;
        host.dataset.foodReservations = frame.fish.filter((fish) => fish.reserved).map((fish) => `${fish.id}:${fish.foodId}`).join(";");
        host.dataset.pondCamera = `${worldCenterX().toFixed(3)},${(pondTexture.height / 2).toFixed(3)},${viewScale.toFixed(5)},${viewScale.toFixed(5)}`;
        host.dataset.touchGesture = touchGesture;
        host.dataset.frame = String(frameCount);
        host.dataset.waterOffset = `${(window.innerWidth / 2 + current.ax).toFixed(2)},${(window.innerHeight / 2 + current.ay).toFixed(2)};${water.uniforms.currentA.value.z.toFixed(2)},${water.uniforms.currentB.value.w.toFixed(2)}`;
      }
    };

    if (testPose) {
      for (const child of stage.children) child.visible = child === fishLayer;
      for (const visual of fishVisuals.values()) visual.shadow.visible = false;
    }
    if (liveAscii) {
      background.visible = false;
      water.mesh.visible = false;
      foreground.visible = false;
      ambientLayer.visible = false;
      particleLayer.visible = false;
      midgeLayer.visible = false;
      feedAffordance.visible = false;
    }

    const idClear = new THREE.Color();
    const present = (view = pond.dataset.view) => {
      if (liveAscii && view === "pixel") {
        fishWaterMask.enabled.value = 1;
        background.visible = true;
        water.mesh.visible = true;
        foreground.visible = true;
        ambientLayer.visible = true;
        particleLayer.visible = true;
        midgeLayer.visible = true;
        feedAffordance.visible = true;
        try {
          renderer.render(stage, camera);
        } finally {
          fishWaterMask.enabled.value = 0;
        }
        background.visible = false;
        water.mesh.visible = false;
        foreground.visible = false;
        ambientLayer.visible = false;
        particleLayer.visible = false;
        midgeLayer.visible = false;
        feedAffordance.visible = false;
        return;
      }
      if (!liveAscii || !ascii) {
        renderer.render(stage, camera);
        return;
      }
      const previousTarget = renderer.getRenderTarget();
      renderer.getClearColor(idClear);
      const clearAlpha = renderer.getClearAlpha();
      renderer.setClearColor(0x000000, 0);
      wakeLayer.visible = true;
      for (const swap of swaps) {
        swap.sync?.();
        swap.mesh.material = swap.idMaterial;
      }
      try {
        renderer.setRenderTarget(ascii.materialBuffer);
        renderer.clear();
        renderer.render(stage, camera);
      } finally {
        for (const swap of swaps) swap.mesh.material = swap.colorMaterial;
        wakeLayer.visible = false;
        renderer.setRenderTarget(previousTarget);
        renderer.setClearColor(idClear, clearAlpha);
      }
      const stamp = performance.now();
      ellipseUniform.set(pondFrame.cx / pondFrame.cell, pondFrame.cy / pondFrame.cell, pondFrame.rx, pondFrame.ry);
      ascii.setFrame(ellipseUniform, pondFrame.card, ripples.slice(0, POND_RIPPLE_CAPACITY).map((ripple) => {
        const elapsed = Math.min(1, (stamp - ripple.born) / Math.max(1, ripple.life));
        const eased = 1 - (1 - elapsed) * (1 - elapsed);
        return {
          x: ripple.x,
          y: ripple.y,
          radius: eased * 14 * pondFrame.cell,
          strength: (1 - elapsed) * ripple.strength,
        };
      }), ROCK_ANCHORS.map((anchor) => {
        const point = worldToScreen(anchor.position);
        return new THREE.Vector2(point.x, point.y);
      }), (frame?.fish ?? []).map((fish) => {
        const point = worldToScreen(fish.position);
        return new THREE.Vector2(point.x, point.y);
      }), simulationNow, reduced);
      ascii.compose(renderer);
    };

    let previousTime: number | null = null;
    options.onCaptureReady(() => {
      present();
      return canvas.toDataURL();
    });
    let frameBudget = 0;
    let heroOnScreen = true;
    const draw = (now: number) => {
      animationFrame = null;
      if (disposed || document.hidden || (liveAscii && !heroOnScreen)) {
        if (!disposed) host.dataset.pondState = "paused";
        return;
      }
      const deltaMs = previousTime === null ? 1000 / POND_ASCII_FPS_CAP : Math.min(Math.max(now - previousTime, 0), 80);
      previousTime = now;
      const frameInterval = 1000 / POND_ASCII_FPS_CAP;
      let stepMs = deltaMs;
      if (liveAscii) {
        const paced = pondFrameBudget(frameBudget, deltaMs, frameInterval);
        frameBudget = paced.budget;
        if (paced.stepMs === 0) {
          animationFrame = window.requestAnimationFrame(draw);
          return;
        }
        stepMs = paced.stepMs;
      }
      const delta = Math.min(0.08, stepMs / 1000);
      try {
        step(now, delta);
        present();
      } catch (error) {
        fallback(error instanceof Error ? error.message : "renderer-frame-failed");
        return;
      }
      if (!revealed) {
        revealed = true;
        if (liveAscii) {
          host.style.transition = "none";
          canvas.dataset.presented = "ascii";
          pond.dataset.asciiFrame = "1";
        }
        pond.dataset.renderer = "three";
      }
      animationFrame = window.requestAnimationFrame(draw);
    };
    const visibility = () => {
      if (disposed) return;
      previousTime = null;
      frameBudget = 0;
      if (document.hidden || (liveAscii && !heroOnScreen)) {
        if (animationFrame !== null) window.cancelAnimationFrame(animationFrame);
        animationFrame = null;
        host.dataset.pondState = "paused";
      } else {
        host.dataset.pondState = "running";
        if (animationFrame === null) animationFrame = window.requestAnimationFrame(draw);
      }
    };
    const onResize = () => {
      layout();
      if (!liveAscii) return;
      const updates: { id: string; displayWidth: number; visualLength: number; visible: boolean }[] = [];
      for (const fish of fishDefinitions) {
        const visual = fishVisuals.get(fish.id);
        const index = Number(fish.id.slice(5));
        const cells = testPose ? fishCells.get(fish.id) : (index < 7 ? (window.innerWidth < 640 ? 15 : 19) : (window.innerWidth < 640 ? 8 : 10)) + index % 3;
        const bodyScale = bodyScales.get(fish.id);
        if (!visual || !cells || bodyScale === undefined) continue;
        fishCells.set(fish.id, cells);
        const visualLength = cells * pondFrame.cell / viewScale;
        visual.baseScaleX = visualLength;
        fish.displayWidth = visualLength * bodyScale;
        fish.visualLength = visualLength;
        const position = worldToScreen(simulation.fishPosition(fish.id) ?? fish.position);
        updates.push({ id: fish.id, displayWidth: fish.displayWidth, visualLength, visible: position.x >= 0 && position.x <= window.innerWidth && position.y >= 0 && position.y <= window.innerHeight });
      }
      const beforeResize = diagnostics ? updates.map(({ id }) => simulation.fishPosition(id)) : [];
      const admitted = new Set(simulation.resizeFish(updates));
      if (diagnostics) {
        host.dataset.resizeFishDisplacement = String(Math.max(0, ...updates.map(({ id }, index) => {
          const before = beforeResize[index];
          const after = simulation.fishPosition(id);
          return before && after ? Math.hypot(after.x - before.x, after.y - before.y) : 0;
        })));
        host.dataset.resizeViewport = `${window.innerWidth}x${window.innerHeight}`;
      }
      for (const [id, visual] of fishVisuals) {
        visual.container.visible = admitted.has(id);
        if (!admitted.has(id)) visual.status.visible = false;
      }
      if (diagnostics) host.dataset.fishCount = String(admitted.size);
      if (reduced && frameCount > 0) {
        step(performance.now(), 1 / 60);
        present();
      }
    };
    const onScroll = () => {
      if (!liveAscii || disposed) return;
      measureCard();
      if (reduced && frameCount > 0) present();
    };
    const heroCard = liveAscii ? document.querySelector("[data-hero-card]") : null;
    const heroObserver = heroCard ? new IntersectionObserver((entries) => {
      heroOnScreen = entries.some((entry) => entry.isIntersecting);
      visibility();
    }) : null;
    if (heroCard && heroObserver) heroObserver.observe(heroCard);
    const themeMedia = window.matchMedia("(prefers-color-scheme: light)");
    const onTheme = () => {
      ascii?.setTheme(!themeMedia.matches);
      if (liveAscii) renderer.setClearColor(themeMedia.matches ? 0xeee8f3 : 0x252031, 1);
      if (liveAscii && reduced && frameCount > 0) present();
    };
    if (liveAscii) themeMedia.addEventListener("change", onTheme);
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onScroll, { capture: true, passive: true });
    document.addEventListener("visibilitychange", visibility);
    removeListeners = () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onScroll, { capture: true });
      document.removeEventListener("visibilitychange", visibility);
      heroObserver?.disconnect();
      if (liveAscii) themeMedia.removeEventListener("change", onTheme);
    };
    if (diagnostics) {
      host.dataset.fishCount = String(fishDefinitions.length);
      host.dataset.pondElementCount = String(pondElements.length);
      host.dataset.insectCount = String(midges.length + flyVisuals.size);
      host.dataset.fishLogic = "authoritative-seeded-world-steering";
      host.dataset.worldModel = "seeded-fish-food-environment";
    }
    visibility();
    return dispose;
  } catch (error) {
    const cancelled = loads.signal.aborted;
    dispose();
    if (!cancelled) throw error;
    return dispose;
  }
}
