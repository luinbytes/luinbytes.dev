import * as THREE from "three";

import { installPondInput } from "./pond-input.ts";
import {
  ROCK_ANCHORS,
  createPondRandom,
  pondAngleDelta,
  type CatWorldState,
  type PondPoint,
} from "./pond-model.ts";
import {
  createPondSimulation,
  type FishDefinition,
  type PondSimulationFrame,
} from "./pond-simulation.ts";

import {
  createYDownPondQuad,
  createPondSprite,
  createPondWater,
  loadPondAsset,
  PondPixels,
  setAtlasFrame,
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
};

type Particle = { x: number; y: number; vx: number; vy: number; born: number; life: number; size: number; color: number };
type Ring = { x: number; y: number; born: number; life: number; radius: number; color: number };
type Ripple = { x: number; y: number; size: number; strength: number; speed: number; born: number; life: number };
type AtlasAnimation = { texture: THREE.Texture; frames: readonly number[]; row: number; progress: number; speed: number; frame: number };
type FishVisual = {
  container: THREE.Group;
  sprite: PondSprite;
  shadow: PondPixels;
  animation: AtlasAnimation;
  alpha: number;
  baseScaleX: number;
  baseScaleY: number;
  lastWake: number;
};
type FlyVisual = { container: THREE.Group; wings: PondPixels };
type FoodVisual = { container: THREE.Group; group: THREE.Group; pellets: PondPixels[]; shadow: PondPixels };

const CAT_FRAME_CONTACT_Y = [
  [0.784, 0.784, 0.797, 0.797],
  [0.628, 0.691, 0.691, 0.691],
  [0.597, 0.572, 0.597, 0.653],
  [0.603, 0.628, 0.628, 0.591],
] as const;
const CAT_TURN_CONTACT_Y = 255 / 320;
const CAT_TURN_DURATION = 420;

export async function startPondRenderer(options: StartOptions) {
  const { pond, host, interaction, reduced } = options;
  if (options.signal.aborted) return () => {};
  host.dataset.pondState = "loading";
  host.dataset.motion = reduced ? "reduced" : "full";
  delete host.dataset.fallbackReason;

  const resources = new Set<{ dispose: () => void }>();
  const loads = new AbortController();
  let disposed = false;
  let animationFrame: number | null = null;
  let revealFrame = 0;
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
    window.cancelAnimationFrame(revealFrame);
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
    const context = canvas.getContext("webgl2", { alpha: true, antialias: false, powerPreference: "high-performance" });
    if (!context) {
      fallback("webgl-unavailable");
      return dispose;
    }
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas, context, alpha: true, antialias: false });
    } catch (error) {
      context.getExtension("WEBGL_lose_context")?.loseContext();
      throw error;
    }
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setClearColor(0x000000, 0);
    renderer.debug.onShaderError = () => { throw new Error("Unable to compile the pond shader"); };
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
    const [pondTexture, waterTexture, koiAtlas, foregroundTexture, pondWaterTexture, catAtlas, catTurnAtlas] = await Promise.all([
      load("pixel-pond-world.webp"),
      load("water-displacement.jpg"),
      load("pixel-koi-atlas.webp"),
      load("pixel-pond-foreground.webp"),
      load("pixel-pond-water-layer.webp"),
      load("pixel-tabby-atlas.webp"),
      load("pixel-tabby-turn-atlas.webp"),
    ]);
    loads.signal.throwIfAborted();
    const hitCanvas = document.createElement("canvas");
    hitCanvas.width = pondWaterTexture.width;
    hitCanvas.height = pondWaterTexture.height;
    const hitContext = hitCanvas.getContext("2d", { willReadFrequently: true });
    if (!hitContext) throw new Error("Unable to create the pond hit map");
    hitContext.drawImage(pondWaterTexture.image, 0, 0);
    const hitPixels = hitContext.getImageData(0, 0, hitCanvas.width, hitCanvas.height).data;

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
      setAtlasFrame(animation.texture, animation.frames[animation.frame], animation.row, 4, 4);
    };
    const background = sprite(pondTexture, 0);
    const foreground = sprite(foregroundTexture, 4);
    waterTexture.texture.colorSpace = THREE.NoColorSpace;
    waterTexture.texture.wrapS = THREE.RepeatWrapping;
    waterTexture.texture.wrapT = THREE.RepeatWrapping;
    waterTexture.texture.minFilter = THREE.LinearFilter;
    waterTexture.texture.magFilter = THREE.LinearFilter;
    const water = createPondWater(quad, pondTexture.texture, pondWaterTexture.texture, waterTexture.texture);
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
    const isWaterWorld = (x: number, y: number) => {
      const pixelX = Math.round(x);
      const pixelY = Math.round(y);
      return pixelX >= 0 && pixelY >= 0 && pixelX < hitCanvas.width && pixelY < hitCanvas.height &&
        hitPixels[(pixelY * hitCanvas.width + pixelX) * 4 + 3] > 96;
    };
    const isWaterScreen = (x: number, y: number) => {
      const world = screenToWorld(x, y);
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
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, Math.max(0.65, Math.min(1, 1040 / window.innerWidth))));
      renderer.setSize(window.innerWidth, window.innerHeight, false);
    };
    layout();

    const fishSource = [
      [0, 82, 0.78, 0.18, 2.2, 17, 0.94], [1, 66, 0.22, 0.74, -0.7, 13, 0.86],
      [2, 52, 0.58, 0.28, 2.7, 11, 0.68], [3, 74, 0.83, 0.68, -2.4, 15, 0.87],
      [0, 48, 0.36, 0.12, 1.1, 10, 0.67], [1, 58, 0.12, 0.47, 0.2, 12, 0.76],
      [2, 70, 0.64, 0.82, -1.4, 14, 0.82], [3, 46, 0.42, 0.63, 2.9, 9, 0.64],
      [0, 44, 0.72, 0.48, -2.1, 10, 0.62], [1, 62, 0.48, 0.9, -0.9, 12, 0.78],
      [2, 40, 0.31, 0.34, 1.7, 9, 0.58], [3, 56, 0.9, 0.8, -2.7, 11, 0.74],
      [0, 50, 0.68, 0.58, 0.8, 11, 0.7], [1, 46, 0.86, 0.42, -1.9, 10, 0.66],
      [2, 60, 0.76, 0.34, -0.2, 14, 0.76], [3, 54, 0.92, 0.57, 2.4, 12, 0.7],
      [0, 68, 0.56, 0.72, -1.1, 15, 0.82], [1, 50, 0.25, 0.2, 0.6, 11, 0.68],
      [2, 58, 0.8, 0.86, -2.2, 13, 0.74], [3, 42, 0.18, 0.62, 1.9, 10, 0.62],
    ] as const;
    const mobileScale = window.innerWidth < 720 ? 0.8 : 1;
    const fishDefinitions: FishDefinition[] = fishSource
      .slice(0, window.innerWidth < 720 ? 14 : 20)
      .map(([row, displayWidth, x, y, heading, cruise, alpha], index) => ({
        id: `fish-${index}`,
        row,
        displayWidth: displayWidth * mobileScale,
        position: nearestWater({
          x: worldCenterX() + (x - 0.5) * (window.innerWidth / viewScale) * 0.88,
          y: pondTexture.height / 2 + (y - 0.5) * (window.innerHeight / viewScale) * 0.88,
        }),
        heading,
        cruise: Math.round(cruise * 1.35 + 3),
        alpha,
        species: ["kohaku", "ogon", "showa", "utsuri"][row],
      }));
    const pondSeed = new URLSearchParams(window.location.search).get("pond-seed")?.trim() || "6c75";
    const simulation = createPondSimulation({
      seed: pondSeed,
      width: pondTexture.width,
      height: pondTexture.height,
      fish: fishDefinitions,
      flies: [
        { id: "fly-0", position: { x: 580, y: 285 }, orbitX: 240, orbitY: 90, phase: 0.4, speed: 0.021, color: 0x56d7c8 },
        { id: "fly-1", position: { x: 1040, y: 560 }, orbitX: 190, orbitY: 115, phase: 2.7, speed: 0.019, color: 0xe8a64f },
      ],
      isWater: isWaterWorld,
    });
    destroySimulation = () => simulation.destroy();
    const visualRandom = createPondRandom(`${pondSeed}:render`);

    const fishVisuals = new Map<string, FishVisual>();
    for (const fish of fishDefinitions) {
      const fishSprite = sprite(koiAtlas, 2, true);
      fishSprite.scale.set(fish.displayWidth, fish.displayWidth, 1);
      const animation: AtlasAnimation = {
        texture: fishSprite.material.map!, frames: [1, 0, 1, 2, 3, 2], row: fish.row,
        speed: 0.038 + fish.row * 0.003, progress: fish.row % 6, frame: 0,
      };
      animate(animation, 0);
      const shadow = pixels(2);
      shadow.ellipse(3, 7, fish.displayWidth * 0.14, fish.displayWidth * 0.31, 0x062e30, 0.2);
      shadow.material.blending = THREE.MultiplyBlending;
      shadow.material.premultipliedAlpha = true;
      const container = new THREE.Group();
      container.add(shadow, fishSprite);
      fishLayer.add(container);
      fishVisuals.set(fish.id, {
        container, sprite: fishSprite, shadow, animation, alpha: fish.alpha,
        baseScaleX: fish.displayWidth, baseScaleY: fish.displayWidth, lastWake: 0,
      });
    }

    const insectLayer = layer();
    const flyVisuals = new Map<string, FlyVisual>();
    for (const fly of [
      { id: "fly-0", color: 0x56d7c8 },
      { id: "fly-1", color: 0xe8a64f },
    ]) {
      const wings = pixels(6);
      wings.rectangle(-2, -5, 5, 2, 0xe3fff5, 0.7);
      wings.rectangle(-1, 3, 5, 2, 0xe3fff5, 0.7);
      wings.rectangle(1, -3, 4, 2, 0x9de9df, 0.58);
      wings.rectangle(2, 1, 4, 2, 0x9de9df, 0.58);
      const body = pixels(6);
      body.rectangle(-5, -1, 11, 2, fly.color);
      body.rectangle(5, -2, 3, 4, 0x173d3c);
      body.rectangle(-7, 0, 3, 1, 0xf4da82);
      const container = new THREE.Group();
      container.add(wings, body);
      insectLayer.add(container);
      flyVisuals.set(fly.id, { container, wings });
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
      host.dataset.wakeCount = String(particles.length);
    };
    const addRing = (x: number, y: number, radius = 34, life = 620, color = 0xb9f5e7) => {
      rings.push({ x, y, born: performance.now(), life, radius, color });
      if (rings.length > (reduced ? 4 : 10)) rings = rings.slice(reduced ? -4 : -10);
      host.dataset.ringCount = String(rings.length);
    };
    const addRipple = (x: number, y: number, size = 132, strength = 1) => {
      const speed = 145 + strength * 45;
      ripples.push({ x, y, size, strength, speed, born: performance.now(), life: size / speed * 1000 + 180 });
      if (ripples.length > 2) ripples.shift();
      host.dataset.rippleCount = String(ripples.length);
    };

    const foodLayer = layer();
    const foodVisuals = new Map<string, FoodVisual>();
    const createFoodVisual = (id: string) => {
      const shadow = pixels(3.4);
      shadow.ellipse(0, 3, 7, 3, 0x062d2c, 0.24);
      shadow.material.blending = THREE.MultiplyBlending;
      shadow.material.premultipliedAlpha = true;
      const group = new THREE.Group();
      const pellets = Array.from({ length: 9 }, (_, index) => {
        const pellet = pixels(3.4, 1);
        const angle = index * 2.399;
        const radius = index === 0 ? 0 : 2 + index % 3 * 2;
        pellet.rectangle(-1, -1, index % 4 === 0 ? 3 : 2, 2,
          index % 3 === 0 ? 0xe4bb68 : index % 3 === 1 ? 0xb97a43 : 0xf0d184, 0.96);
        pellet.position.set(Math.cos(angle) * radius, Math.sin(angle) * radius * 0.72, 0);
        group.add(pellet);
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

    const catLayer = layer();
    const catSize = window.innerWidth < 720 ? 80 : 118;
    const catSprite = sprite(catAtlas, 5.01, true);
    catSprite.scale.set(catSize * 1.25, catSize * 1.25, 1);
    const catAnimation: AtlasAnimation = {
      texture: catSprite.material.map!, frames: [0, 1, 2, 3], row: 0, speed: 0.035, progress: 0, frame: 0,
    };
    animate(catAnimation, 0);
    const catBaseScale = { x: catSprite.scale.x, y: catSprite.scale.y };
    const catTurnSprite = sprite(catTurnAtlas, 5.02, true);
    catTurnSprite.scale.copy(catSprite.scale);
    catTurnSprite.visible = false;
    const catShadow = pixels(5);
    catShadow.ellipse(0, 2, catSize * 0.28, catSize * 0.1, 0x071c1a, 0.28);
    catShadow.material.blending = THREE.MultiplyBlending;
    catShadow.material.premultipliedAlpha = true;
    const catContainer = new THREE.Group();
    catContainer.add(catSprite, catTurnSprite);
    catLayer.add(catShadow, catContainer);
    let catAnimationRow = 0;
    let renderedFacing: 1 | -1 = 1;
    let turnFrom: 1 | -1 = 1;
    let turnTo: 1 | -1 = 1;
    let turnStarted = 0;
    let turning = false;
    let catScreen = { x: -1000, y: -1000 };
    const animationRowFor = (state: CatWorldState) => {
      if (state === "airborne") return 2;
      if (state === "prepare-bat" || state === "bat") return 3;
      if (["approach", "anticipate-hop", "react", "recover"].includes(state)) return 1;
      return 0;
    };

    let pointer = {
      screen: { x: -1000, y: -1000 }, world: { x: -1000, y: -1000 },
      velocity: { x: 0, y: 0 }, time: 0, energy: 0,
    };
    let lastTrailRing = 0;
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
        if (Math.hypot(screen.x - catScreen.x, screen.y - catScreen.y) < 280) simulation.requestHop();
      },
      onFoodDrop: (_screen, world) => {
        lastFoodRequested = { ...world };
        simulation.dropFood(world);
      },
      onAffordance: (screen, visible) => {
        feedAffordance.position.set(screen.x, screen.y, 0);
        affordanceTarget = visible ? 0.34 : 0;
        host.dataset.foodAffordance = String(visible);
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
    let catPounceCount = 0;
    let catBapCount = 0;
    let catEmptyBapCount = 0;
    let revealed = false;
    const current = { ax: 0, ay: 0, bx: 0, by: 0 };

    const renderCat = (next: PondSimulationFrame, now: number, delta: number) => {
      const row = animationRowFor(next.cat.state);
      if (row !== catAnimationRow) {
        catAnimationRow = row;
        catAnimation.row = row;
        catAnimation.speed = row === 2 || row === 3 ? 0.12 : row === 1 ? 0.07 : 0.035;
        catAnimation.progress = 0;
      }
      animate(catAnimation, delta);
      const contactY = CAT_FRAME_CONTACT_Y[row][catAnimation.frame] ?? CAT_FRAME_CONTACT_Y[row][0];
      const contact = worldToScreen(next.cat.contact);
      const aim = worldToScreen(next.cat.aim);
      const lift = next.cat.lift * viewScale * (reduced ? 0.25 : 1);
      const desiredFacing = Math.abs(aim.x - contact.x) < 16 ? renderedFacing : next.cat.facing;
      if (!turning && desiredFacing !== renderedFacing) {
        turnFrom = renderedFacing;
        turnTo = desiredFacing;
        turnStarted = now;
        turning = true;
      }
      if (turning) {
        const progress = Math.min(1, (now - turnStarted) / CAT_TURN_DURATION);
        const turnFrame = Math.min(4, Math.round(progress * 4));
        setAtlasFrame(catTurnSprite.material.map!, turnFrom === 1 ? turnFrame : 4 - turnFrame, 0, 5, 1);
        catTurnSprite.visible = turnFrame > 0 && turnFrame < 4;
        catSprite.visible = !catTurnSprite.visible;
        if (progress >= 1) {
          renderedFacing = turnTo;
          turning = false;
          catTurnSprite.visible = false;
          catSprite.visible = true;
        }
      }
      const aimLean = ["prepare-bat", "bat"].includes(next.cat.state)
        ? Math.max(-0.055, Math.min(0.055, Math.atan2(aim.y - contact.y, Math.abs(aim.x - contact.x)) * 0.16))
        : 0;
      catScreen = contact;
      catContainer.position.set(Math.round(contact.x), Math.round(contact.y - lift), 0);
      catContainer.rotation.z += pondAngleDelta(catContainer.rotation.z, next.cat.surfaceAngle + aimLean) * Math.min(1, delta * 12);
      catSprite.scale.set(catBaseScale.x * renderedFacing * next.cat.squashX, catBaseScale.y * next.cat.squashY, 1);
      catSprite.position.y = (0.5 - contactY) * catSprite.scale.y;
      catTurnSprite.scale.set(catBaseScale.x * next.cat.squashX, catBaseScale.y * next.cat.squashY, 1);
      catTurnSprite.position.y = (0.5 - CAT_TURN_CONTACT_Y) * catTurnSprite.scale.y;
      catShadow.position.set(Math.round(contact.x), Math.round(contact.y), 0);
      catShadow.rotation.z = next.cat.surfaceAngle;
      catShadow.scale.set(1 - Math.min(0.22, lift / Math.max(1, catSize) * 0.34), 1 - Math.min(0.1, lift / Math.max(1, catSize) * 0.12), 1);
      catShadow.material.opacity = 0.95 - Math.min(0.58, lift / Math.max(1, catSize));
    };

    const step = (now: number, delta: number) => {
      const simulationDelta = delta * motionScale;
      simulationNow += simulationDelta * 1000;
      const pointerInfluence = pointer.time === 0 ? 0 : Math.max(0, 1 - (now - pointer.time) / 1400);
      const visibleAnchorIds = ROCK_ANCHORS.filter((anchor) => {
        const point = worldToScreen(anchor.position);
        const horizontal = catSize * 0.625 + 4;
        return point.x > horizontal && point.x < window.innerWidth - horizontal &&
          point.y > catSize * 1.075 + 4 && point.y < window.innerHeight - catSize * 0.175 - 4;
      }).map((anchor) => anchor.id);
      frame = simulation.step({
        now: simulationNow,
        delta: simulationDelta,
        pointer: {
          position: pointer.world,
          velocity: { x: pointer.velocity.x / viewScale, y: pointer.velocity.y / viewScale },
          influence: pointerInfluence,
          energy: pointer.energy,
        },
        visibleAnchorIds,
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
        if (event.type === "takeoff") catPounceCount += 1;
        if (event.type === "ambient-ripple") {
          const point = worldToScreen(event.position);
          if (isWaterScreen(point.x, point.y)) addRing(point.x, point.y, 20 + event.strength * 22, 1100, 0xb4e8d5);
        } else if (event.type === "food-dropped") {
          foodDroppedCount += 1;
          lastFoodDropped = { ...event.position };
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
        } else if (event.type === "land") {
          const point = worldToScreen(event.position);
          addRing(point.x, point.y + 2, 12 + event.impact * 12, 360, 0x9ab276);
        } else if (event.type === "bat") {
          if (event.distance > event.reach) catEmptyBapCount += 1;
          else {
            catBapCount += 1;
            const point = worldToScreen(event.aim);
            if (event.targetType === "fish" && isWaterScreen(point.x, point.y)) {
              addRing(point.x, point.y, event.hit ? 38 : 27, 620, 0xf7dfa0);
            }
          }
        }
      }

      const liveFood = new Set(frame.foods.map((food) => food.id));
      maxFoodCount = Math.max(maxFoodCount, frame.foods.length);
      for (const food of frame.foods) {
        const visual = foodVisuals.get(food.id) ?? createFoodVisual(food.id);
        const point = worldToScreen(food.position);
        const fall = Math.pow(1 - food.dropProgress, 2) * (reduced ? 5 : 22);
        visual.container.position.set(Math.round(point.x), Math.round(point.y), 0);
        visual.group.position.y = -fall;
        visual.group.scale.setScalar((0.76 + food.pelletSize / 13) * (food.state === "depleted" ? 0.72 : 1));
        visual.shadow.material.opacity = food.state === "dropping" ? 0.12 + food.dropProgress * 0.5 : 0.7;
        visual.pellets.forEach((pellet, index) => { pellet.visible = index < Math.ceil(food.remainingAmount); });
      }
      for (const [id, visual] of foodVisuals) {
        if (!liveFood.has(id)) {
          visual.container.removeFromParent();
          for (const mesh of [visual.shadow, ...visual.pellets]) {
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

      renderCat(frame, now, delta);

      for (const element of pondElements) {
        const base = worldToScreen(element.position);
        const dx = base.x - pointer.screen.x;
        const dy = base.y - pointer.screen.y;
        const distance = Math.max(1, Math.hypot(dx, dy));
        const reaction = pointerInfluence * Math.max(0, 1 - distance / 145);
        const targetX = dx / distance * reaction * 6 + environment.wind * 0.55;
        const targetY = dy / distance * reaction * 3.5;
        element.offset.x += (targetX - element.offset.x) * Math.min(1, delta * 5.2);
        element.offset.y += (targetY - element.offset.y) * Math.min(1, delta * 5.2);
        element.container.position.set(Math.round(base.x + element.offset.x), Math.round(base.y + element.offset.y), 0);
        element.container.rotation.z = element.offset.x * 0.008;
        element.container.material.opacity = 0.45 + reaction * 0.34;
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
        visual.container.position.set(Math.round(point.x), Math.round(point.y), 0);
        visual.container.rotation.z += pondAngleDelta(visual.container.rotation.z, fly.heading) * Math.min(1, delta * 5);
        visual.wings.scale.y = 0.45 + Math.abs(Math.sin(fly.wingPhase)) * (fly.reacting ? 1.1 : 0.75);
      }

      for (const fish of frame.fish) {
        const visual = fishVisuals.get(fish.id);
        if (!visual) continue;
        const point = worldToScreen(fish.position);
        visual.container.position.set(Math.round(point.x), Math.round(point.y), 0);
        const order = 2 + point.y / (1 + Math.abs(point.y)) * 0.1;
        visual.shadow.renderOrder = order;
        visual.sprite.renderOrder = order + 1e-9;
        visual.container.rotation.z += pondAngleDelta(visual.container.rotation.z, fish.heading + Math.PI / 2) * Math.min(1, delta * (fish.reacting ? 8 : fish.goal ? 4.5 : 2.2));
        visual.animation.speed = 0.032 + Math.min(0.026, Math.hypot(fish.velocity.x, fish.velocity.y) / 13 * 0.014);
        const depthAlpha = fish.state === "feeding" ? 0.98 : fish.state === "circling" ? 0.93 : fish.alpha;
        visual.alpha += (depthAlpha - visual.alpha) * Math.min(1, delta * 4);
        visual.sprite.material.opacity = visual.alpha;
        visual.shadow.material.opacity = visual.alpha;
        visual.sprite.material.color.setHex(fish.state === "feeding" ? 0xf4fff3 : 0xe8fff9);
        animate(visual.animation, delta);
        const peck = fish.state === "feeding" ? 1 - Math.abs(fish.feedingPulse * 2 - 1) * 0.055 : 1;
        visual.sprite.scale.set(visual.baseScaleX * peck, visual.baseScaleY * (2 - peck), 1);
        if (now - visual.lastWake > 230 + fish.displayWidth * 2) {
          const tail = worldToScreen({
            x: fish.position.x - Math.cos(fish.heading) * fish.displayWidth * 0.22,
            y: fish.position.y - Math.sin(fish.heading) * fish.displayWidth * 0.22,
          });
          addParticle(tail.x, tail.y, -Math.cos(fish.heading) * 4, -Math.sin(fish.heading) * 4 - 2, 820, 2, 0x9be4d7);
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
      for (let index = 0; index < 2; index += 1) {
        const ripple = ripples[index];
        if (ripple) {
          water.uniforms.rippleCenters.value[index].set(ripple.x, ripple.y, ripple.size, 1.2 + ripple.strength * 3.8);
          water.uniforms.rippleWaves.value[index].set((now - ripple.born) / 1000, ripple.speed, 22 + ripple.size * 0.16, 1);
        } else {
          water.uniforms.rippleWaves.value[index].w = 0;
        }
      }

      frameCount += 1;
      if (frameCount % 12 === 0) {
        host.dataset.fishPositions = frame.fish.map((fish) => {
          const point = worldToScreen(fish.position);
          return `${point.x.toFixed(1)},${point.y.toFixed(1)}`;
        }).join(";");
        host.dataset.fishWorldPositions = frame.fish.map((fish) => `${fish.position.x.toFixed(2)},${fish.position.y.toFixed(2)}`).join(";");
        host.dataset.fishReacting = String(frame.fish.some((fish) => fish.reacting));
        host.dataset.fishWaterViolation = String(frame.fish.some((fish) => !isWaterWorld(fish.position.x, fish.position.y)));
        host.dataset.fishMaxStep = Math.max(...frame.fish.map((fish) => fish.maxStep)).toFixed(2);
        host.dataset.fishAverageSpeed = (
          frame.fish.reduce((sum, fish) => sum + Math.hypot(fish.velocity.x, fish.velocity.y), 0) /
          Math.max(1, frame.fish.length)
        ).toFixed(2);
        host.dataset.visibleAnchorIds = visibleAnchorIds.join(",");
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
        host.dataset.catState = frame.cat.state;
        host.dataset.catRoutine = frame.cat.routine;
        host.dataset.catPosition = `${catScreen.x.toFixed(1)},${catScreen.y.toFixed(1)}`;
        host.dataset.catAimScreen = `${worldToScreen(frame.cat.aim).x.toFixed(1)},${worldToScreen(frame.cat.aim).y.toFixed(1)}`;
        host.dataset.catFacing = String(frame.cat.facing);
        host.dataset.catPounceCount = String(catPounceCount);
        host.dataset.catBapCount = String(catBapCount);
        host.dataset.catEmptyBapCount = String(catEmptyBapCount);
        const catAnchorId = frame.cat.anchorId;
        const groundedAnchor = ROCK_ANCHORS.find((anchor) => anchor.id === catAnchorId);
        const missedAuthoredSurface = frame.cat.grounded && (!groundedAnchor || Math.hypot(
          frame.cat.contact.x - groundedAnchor.position.x,
          frame.cat.contact.y - groundedAnchor.position.y,
        ) > 0.01);
        host.dataset.catWaterViolation = String(missedAuthoredSurface);
        host.dataset.catOverWater = String(missedAuthoredSurface);
        host.dataset.catRotation = catContainer.rotation.z.toFixed(3);
        host.dataset.catAnchor = frame.cat.anchorId;
        host.dataset.catRock = frame.cat.rockId;
        host.dataset.catDestination = frame.cat.destinationAnchorId ?? "none";
        host.dataset.catTarget = frame.cat.selectedTargetId ?? "none";
        host.dataset.catTargetType = frame.cat.selectedTargetType ?? "none";
        host.dataset.catGrounded = String(frame.cat.grounded);
        host.dataset.catReason = frame.debug.reason;
        host.dataset.catAim = `${frame.cat.aim.x.toFixed(1)},${frame.cat.aim.y.toFixed(1)}`;
        host.dataset.foodEntities = frame.foods.map((food) => `${food.id}:${food.position.x.toFixed(2)},${food.position.y.toFixed(2)}:${food.state}:${food.remainingAmount}`).join(";");
        if (lastFoodRequested) host.dataset.foodRequestedAt = `${lastFoodRequested.x.toFixed(2)},${lastFoodRequested.y.toFixed(2)}`;
        if (lastFoodDropped) host.dataset.foodLastDrop = `${lastFoodDropped.x.toFixed(2)},${lastFoodDropped.y.toFixed(2)}`;
        host.dataset.foodReservations = frame.fish.filter((fish) => fish.reserved).map((fish) => `${fish.id}:${fish.foodId}`).join(";");
        host.dataset.pondCamera = `${worldCenterX().toFixed(3)},${(pondTexture.height / 2).toFixed(3)},${viewScale.toFixed(5)},${viewScale.toFixed(5)}`;
        host.dataset.touchGesture = touchGesture;
        host.dataset.frame = String(frameCount);
        host.dataset.pondSeed = pondSeed;
        host.dataset.waterOffset = `${(window.innerWidth / 2 + current.ax).toFixed(2)},${(window.innerHeight / 2 + current.ay).toFixed(2)};${water.uniforms.currentA.value.z.toFixed(2)},${water.uniforms.currentB.value.w.toFixed(2)}`;
      }
    };

    let previousTime: number | null = null;
    const draw = (now: number) => {
      animationFrame = null;
      if (disposed || document.hidden) return;
      const delta = previousTime === null ? 1 / 60 : Math.min(Math.max((now - previousTime) / 1000, 0), 0.08);
      previousTime = now;
      try {
        step(now, delta);
        renderer.render(stage, camera);
      } catch (error) {
        fallback(error instanceof Error ? error.message : "renderer-frame-failed");
        return;
      }
      if (!revealed) {
        revealed = true;
        revealFrame = window.requestAnimationFrame(() => {
          if (!disposed) pond.dataset.renderer = "three";
        });
      }
      animationFrame = window.requestAnimationFrame(draw);
    };
    const visibility = () => {
      if (disposed) return;
      previousTime = null;
      if (document.hidden) {
        if (animationFrame !== null) window.cancelAnimationFrame(animationFrame);
        animationFrame = null;
        host.dataset.pondState = "paused";
      } else {
        if (animationFrame === null) animationFrame = window.requestAnimationFrame(draw);
        host.dataset.pondState = "running";
      }
    };
    window.addEventListener("resize", layout);
    document.addEventListener("visibilitychange", visibility);
    removeListeners = () => {
      window.removeEventListener("resize", layout);
      document.removeEventListener("visibilitychange", visibility);
    };
    host.dataset.fishCount = String(fishDefinitions.length);
    host.dataset.pondElementCount = String(pondElements.length);
    host.dataset.insectCount = String(midges.length + flyVisuals.size);
    host.dataset.catCount = "1";
    host.dataset.fishLogic = "authoritative-seeded-world-steering";
    host.dataset.worldModel = "seeded-routine-rock-target-food-environment";
    visibility();
    return dispose;
  } catch (error) {
    const cancelled = loads.signal.aborted;
    dispose();
    if (!cancelled) throw error;
    return dispose;
  }
}
