import type { ShockwaveFilter } from "pixi-filters";
import type { AnimatedSprite, Container } from "pixi.js";

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
type Ripple = { filter: ShockwaveFilter; born: number; life: number };
type FishVisual = {
  container: Container;
  sprite: AnimatedSprite;
  baseScaleX: number;
  baseScaleY: number;
  lastWake: number;
};
type FlyVisual = { container: Container; wings: Container };

const DEBUG = process.env.NODE_ENV !== "production";
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
  if (DEBUG) {
    host.dataset.pixiState = "loading";
    host.dataset.motion = reduced ? "reduced" : "full";
  }

  const probe = document.createElement("canvas");
  const probeContext = probe.getContext("webgl2") ?? probe.getContext("webgl");
  if (!probeContext) {
    if (DEBUG) {
      host.dataset.pixiState = "fallback";
      host.dataset.fallbackReason = "webgl-unavailable";
    }
    pond.dataset.renderer = "fallback";
    return () => {};
  }
  probeContext.getExtension("WEBGL_lose_context")?.loseContext();

  const [PIXI, { BulgePinchFilter, ShockwaveFilter }] = await Promise.all([
    import("pixi.js"),
    import("pixi-filters"),
  ]);
  if (options.signal.aborted) return () => {};
  const [pondTexture, waterTexture, koiAtlas, foregroundTexture, pondWaterTexture, catAtlas, catTurnAtlas] = await Promise.all([
    PIXI.Assets.load("/images/portfolio/pixel-pond-world.webp"),
    PIXI.Assets.load("/images/portfolio/water-displacement.jpg"),
    PIXI.Assets.load("/images/portfolio/pixel-koi-atlas.webp"),
    PIXI.Assets.load("/images/portfolio/pixel-pond-foreground.webp"),
    PIXI.Assets.load("/images/portfolio/pixel-pond-water-layer.webp"),
    PIXI.Assets.load("/images/portfolio/pixel-tabby-atlas.webp"),
    PIXI.Assets.load("/images/portfolio/pixel-tabby-turn-atlas.webp"),
  ]);
  if (options.signal.aborted) return () => {};
  for (const texture of [pondTexture, koiAtlas, foregroundTexture, pondWaterTexture, catAtlas, catTurnAtlas]) {
    texture.source.scaleMode = "nearest";
  }

  const hitCanvas = document.createElement("canvas");
  hitCanvas.width = pondWaterTexture.source.pixelWidth;
  hitCanvas.height = pondWaterTexture.source.pixelHeight;
  const hitContext = hitCanvas.getContext("2d", { willReadFrequently: true });
  if (!hitContext) throw new Error("Unable to create the pond hit map");
  hitContext.drawImage(pondWaterTexture.source.resource as CanvasImageSource, 0, 0);
  const hitPixels = hitContext.getImageData(0, 0, hitCanvas.width, hitCanvas.height).data;

  const app = new PIXI.Application();
  let initialized = false;
  let destroyed = false;
  const destroyApp = () => {
    if (destroyed) return;
    destroyed = true;
    if (initialized) app.canvas.remove();
    app.destroy({ removeView: false }, { children: true });
  };
  try {
    await app.init({
      resizeTo: window,
      preference: "webgl",
      antialias: false,
      autoDensity: true,
      backgroundAlpha: 0,
      resolution: Math.min(window.devicePixelRatio || 1, Math.max(0.65, Math.min(1, 1040 / window.innerWidth))),
      powerPreference: "high-performance",
    });
    initialized = true;
  } catch (error) {
    try { destroyApp(); } catch {}
    throw error;
  }
  if (options.signal.aborted) {
    destroyApp();
    return () => {};
  }
  host.replaceChildren(app.canvas);
  app.canvas.className = options.canvasClassName;

  app.stage.sortableChildren = true;
  const background = new PIXI.Sprite(pondTexture);
  background.anchor.set(0.5);
  background.zIndex = 0;
  const scene = new PIXI.Container();
  scene.zIndex = 1;
  const waterShade = new PIXI.Sprite(pondWaterTexture);
  const waterSurface = new PIXI.Sprite(pondWaterTexture);
  const waterGlow = new PIXI.Sprite(pondWaterTexture);
  for (const layer of [waterShade, waterSurface, waterGlow]) layer.anchor.set(0.5);
  waterShade.tint = 0x0a4f55;
  waterShade.alpha = 0.16;
  waterShade.blendMode = "multiply";
  waterSurface.alpha = 0.72;
  waterGlow.tint = 0xa8f4dc;
  waterGlow.alpha = 0.09;
  waterGlow.blendMode = "screen";
  scene.addChild(waterShade, waterSurface, waterGlow);
  const fishLayer = new PIXI.Container();
  fishLayer.zIndex = 2;
  fishLayer.sortableChildren = true;
  const foreground = new PIXI.Sprite(foregroundTexture);
  foreground.anchor.set(0.5);
  foreground.zIndex = 4;

  waterTexture.source.style.addressMode = "repeat";
  const displacementA = new PIXI.Sprite(waterTexture);
  const displacementB = new PIXI.Sprite(waterTexture);
  displacementA.anchor.set(0.5);
  displacementB.anchor.set(0.5);
  displacementA.alpha = 0.001;
  displacementB.alpha = 0.001;
  displacementB.rotation = Math.PI / 3;
  const effectResolution = window.innerWidth > 900 ? 0.5 : 0.56;
  const waterA = new PIXI.DisplacementFilter({ sprite: displacementA, scale: { x: 4.6, y: 3.2 } });
  const waterB = new PIXI.DisplacementFilter({ sprite: displacementB, scale: { x: -2.4, y: 2.8 } });
  waterA.resolution = effectResolution;
  waterB.resolution = effectResolution;
  const finger = new BulgePinchFilter({ radius: 150, strength: 0 });
  finger.resolution = effectResolution;
  finger.enabled = false;
  scene.filters = [waterA, waterB, finger];
  displacementA.zIndex = -2;
  displacementB.zIndex = -2;
  app.stage.addChild(displacementA, displacementB, background, scene, fishLayer, foreground);

  const worldCenterX = () => pondTexture.width / 2 + (window.innerWidth < 720 ? 170 : 0);
  const worldToScreen = (position: PondPoint) => ({
    x: window.innerWidth / 2 + (position.x - worldCenterX()) * background.scale.x,
    y: window.innerHeight / 2 + (position.y - pondTexture.height / 2) * background.scale.y,
  });
  const screenToWorld = (x: number, y: number) => ({
    x: worldCenterX() + (x - window.innerWidth / 2) / background.scale.x,
    y: pondTexture.height / 2 + (y - window.innerHeight / 2) / background.scale.y,
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
    const scale = Math.max(window.innerWidth / pondTexture.width, window.innerHeight / pondTexture.height) * 1.015;
    const position = {
      x: window.innerWidth / 2 - (worldCenterX() - pondTexture.width / 2) * scale,
      y: window.innerHeight / 2,
    };
    for (const layer of [background, waterShade, waterSurface, waterGlow, foreground]) {
      layer.position.set(position.x, position.y);
      layer.scale.set(scale);
    }
    const displacementScale = Math.max(window.innerWidth / waterTexture.width, window.innerHeight / waterTexture.height) * 1.72;
    displacementA.scale.set(displacementScale);
    displacementB.scale.set(displacementScale * 1.08);
    scene.filterArea = app.screen;
  };
  layout();

  const atlasCell = koiAtlas.width / 4;
  const atlasRows = Array.from({ length: 4 }, (_, row) =>
    Array.from({ length: 4 }, (_, column) => new PIXI.Texture({
      source: koiAtlas.source,
      frame: new PIXI.Rectangle(column * atlasCell, row * atlasCell, atlasCell, atlasCell),
    })),
  );
  const catCell = catAtlas.width / 4;
  const catRows = Array.from({ length: 4 }, (_, row) =>
    Array.from({ length: 4 }, (_, column) => new PIXI.Texture({
      source: catAtlas.source,
      frame: new PIXI.Rectangle(column * catCell, row * catCell, catCell, catCell),
    })),
  );
  const catTurnCell = catTurnAtlas.width / 5;
  const catTurnFrames = Array.from({ length: 5 }, (_, column) => new PIXI.Texture({
    source: catTurnAtlas.source,
    frame: new PIXI.Rectangle(column * catTurnCell, 0, catTurnCell, catTurnAtlas.height),
  }));

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
        x: worldCenterX() + (x - 0.5) * (window.innerWidth / background.scale.x) * 0.88,
        y: pondTexture.height / 2 + (y - 0.5) * (window.innerHeight / background.scale.y) * 0.88,
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
  const visualRandom = createPondRandom(`${pondSeed}:render`);

  const fishVisuals = new Map<string, FishVisual>();
  for (const fish of fishDefinitions) {
    const frames = [1, 0, 1, 2, 3, 2].map((column) => atlasRows[fish.row][column]);
    const sprite = new PIXI.AnimatedSprite(frames);
    sprite.anchor.set(0.5);
    sprite.width = fish.displayWidth;
    sprite.height = fish.displayWidth;
    sprite.animationSpeed = 0.038 + fish.row * 0.003;
    sprite.gotoAndPlay(fish.row % frames.length);
    const shadow = new PIXI.Graphics({ roundPixels: true });
    shadow.ellipse(3, 7, fish.displayWidth * 0.14, fish.displayWidth * 0.31).fill({ color: 0x062e30, alpha: 0.2 });
    shadow.blendMode = "multiply";
    const container = new PIXI.Container();
    container.alpha = fish.alpha;
    container.addChild(shadow, sprite);
    fishLayer.addChild(container);
    fishVisuals.set(fish.id, {
      container,
      sprite,
      baseScaleX: sprite.scale.x,
      baseScaleY: sprite.scale.y,
      lastWake: 0,
    });
  }

  const insectLayer = new PIXI.Container();
  insectLayer.zIndex = 6;
  app.stage.addChild(insectLayer);
  const flyVisuals = new Map<string, FlyVisual>();
  for (const fly of [
    { id: "fly-0", color: 0x56d7c8 },
    { id: "fly-1", color: 0xe8a64f },
  ]) {
    const wings = new PIXI.Container();
    const wingPixels = new PIXI.Graphics({ roundPixels: true });
    wingPixels.rect(-2, -5, 5, 2).fill({ color: 0xe3fff5, alpha: 0.7 });
    wingPixels.rect(-1, 3, 5, 2).fill({ color: 0xe3fff5, alpha: 0.7 });
    wingPixels.rect(1, -3, 4, 2).fill({ color: 0x9de9df, alpha: 0.58 });
    wingPixels.rect(2, 1, 4, 2).fill({ color: 0x9de9df, alpha: 0.58 });
    wings.addChild(wingPixels);
    const body = new PIXI.Graphics({ roundPixels: true });
    body.rect(-5, -1, 11, 2).fill({ color: fly.color });
    body.rect(5, -2, 3, 4).fill({ color: 0x173d3c });
    body.rect(-7, 0, 3, 1).fill({ color: 0xf4da82 });
    const container = new PIXI.Container();
    container.addChild(wings, body);
    insectLayer.addChild(container);
    flyVisuals.set(fly.id, { container, wings });
  }
  const midgeLayer = new PIXI.Graphics({ roundPixels: true });
  insectLayer.addChild(midgeLayer);
  const midges = Array.from({ length: reduced ? 5 : 12 }, (_, index) => ({
    position: { x: 170 + (index * 113) % 1220, y: 130 + (index * 173) % 680 },
    phase: index * 1.73,
    orbit: 7 + index % 5,
  }));

  const ambientLayer = new PIXI.Container();
  ambientLayer.zIndex = 4.2;
  app.stage.addChild(ambientLayer);
  const pondElements = [
    { x: 837, y: 98 }, { x: 955, y: 126 }, { x: 1007, y: 200 }, { x: 1129, y: 206 },
    { x: 1192, y: 200 }, { x: 1252, y: 207 }, { x: 1120, y: 480 }, { x: 1230, y: 630 },
    { x: 922, y: 738 }, { x: 1050, y: 835 },
  ].map((position, index) => {
    const mark = new PIXI.Graphics({ roundPixels: true });
    mark.rect(-5, -2, 8, 2).fill({ color: 0xdff7a5, alpha: 0.2 });
    mark.rect(4, -1, 3, 1).fill({ color: 0xf4efb1, alpha: 0.32 });
    const container = new PIXI.Container();
    container.addChild(mark);
    ambientLayer.addChild(container);
    return { position, phase: index * 0.77, container, offset: { x: 0, y: 0 } };
  });

  const particleLayer = new PIXI.Graphics({ roundPixels: true });
  particleLayer.zIndex = 3.2;
  app.stage.addChild(particleLayer);
  let particles: Particle[] = [];
  let rings: Ring[] = [];
  let ripples: Ripple[] = [];
  const syncFilters = () => {
    scene.filters = [waterA, waterB, finger, ...ripples.map((ripple) => ripple.filter)];
  };
  const addParticle = (x: number, y: number, vx: number, vy: number, life = 760, size = 2, color = 0xc8fff0) => {
    particles.push({ x, y, vx, vy, born: performance.now(), life, size, color });
    if (particles.length > (reduced ? 32 : 120)) particles = particles.slice(reduced ? -32 : -120);
    if (DEBUG) host.dataset.wakeCount = String(particles.length);
  };
  const addRing = (x: number, y: number, radius = 34, life = 620, color = 0xb9f5e7) => {
    rings.push({ x, y, born: performance.now(), life, radius, color });
    if (rings.length > (reduced ? 4 : 10)) rings = rings.slice(reduced ? -4 : -10);
    if (DEBUG) host.dataset.ringCount = String(rings.length);
  };
  const addRipple = (x: number, y: number, size = 132, strength = 1) => {
    const speed = 145 + strength * 45;
    const filter = new ShockwaveFilter({
      center: { x, y }, speed, amplitude: 1.2 + strength * 3.8,
      wavelength: 22 + size * 0.16, brightness: 1 + strength * 0.008, radius: size,
    });
    filter.resolution = effectResolution;
    ripples.push({ filter, born: performance.now(), life: size / speed * 1000 + 180 });
    while (ripples.length > 2) ripples.shift()?.filter.destroy();
    syncFilters();
    if (DEBUG) host.dataset.rippleCount = String(ripples.length);
  };

  const foodLayer = new PIXI.Container();
  foodLayer.zIndex = 3.4;
  app.stage.addChild(foodLayer);
  const foodVisuals = new Map<string, { container: Container; group: Container; pellets: Container[]; shadow: Container }>();
  const createFoodVisual = (id: string) => {
    const shadow = new PIXI.Graphics({ roundPixels: true });
    shadow.ellipse(0, 3, 7, 3).fill({ color: 0x062d2c, alpha: 0.24 });
    shadow.blendMode = "multiply";
    const group = new PIXI.Container();
    const pellets = Array.from({ length: 9 }, (_, index) => {
      const pellet = new PIXI.Graphics({ roundPixels: true });
      const angle = index * 2.399;
      const radius = index === 0 ? 0 : 2 + index % 3 * 2;
      pellet.rect(-1, -1, index % 4 === 0 ? 3 : 2, 2).fill({
        color: index % 3 === 0 ? 0xe4bb68 : index % 3 === 1 ? 0xb97a43 : 0xf0d184,
        alpha: 0.96,
      });
      pellet.position.set(Math.cos(angle) * radius, Math.sin(angle) * radius * 0.72);
      group.addChild(pellet);
      return pellet;
    });
    const container = new PIXI.Container();
    container.addChild(shadow, group);
    foodLayer.addChild(container);
    const visual = { container, group, pellets, shadow };
    foodVisuals.set(id, visual);
    return visual;
  };
  const feedAffordance = new PIXI.Graphics({ roundPixels: true });
  feedAffordance.rect(-8, -1, 4, 2).fill({ color: 0xffefab, alpha: 0.72 });
  feedAffordance.rect(5, -1, 4, 2).fill({ color: 0xffefab, alpha: 0.72 });
  feedAffordance.rect(-1, -8, 2, 4).fill({ color: 0xd7fff0, alpha: 0.64 });
  feedAffordance.rect(-1, 5, 2, 4).fill({ color: 0xd7fff0, alpha: 0.64 });
  feedAffordance.alpha = 0;
  feedAffordance.zIndex = 7;
  app.stage.addChild(feedAffordance);
  let affordanceTarget = 0;

  const catLayer = new PIXI.Container();
  catLayer.zIndex = 5;
  app.stage.addChild(catLayer);
  const catSize = window.innerWidth < 720 ? 80 : 118;
  const catSprite = new PIXI.AnimatedSprite(catRows[0]);
  catSprite.anchor.set(0.5, CAT_FRAME_CONTACT_Y[0][0]);
  catSprite.width = catSize * 1.25;
  catSprite.height = catSize * 1.25;
  catSprite.animationSpeed = 0.035;
  catSprite.gotoAndPlay(0);
  const catBaseScale = { x: Math.abs(catSprite.scale.x), y: Math.abs(catSprite.scale.y) };
  const catTurnSprite = new PIXI.Sprite(catTurnFrames[0]);
  catTurnSprite.anchor.set(0.5, CAT_TURN_CONTACT_Y);
  catTurnSprite.width = catSprite.width;
  catTurnSprite.height = catSprite.height;
  catTurnSprite.visible = false;
  const catTurnScale = { x: Math.abs(catTurnSprite.scale.x), y: Math.abs(catTurnSprite.scale.y) };
  const catShadow = new PIXI.Graphics({ roundPixels: true });
  catShadow.ellipse(0, 2, catSize * 0.28, catSize * 0.1).fill({ color: 0x071c1a, alpha: 0.28 });
  catShadow.blendMode = "multiply";
  const catContainer = new PIXI.Container();
  catContainer.addChild(catSprite, catTurnSprite);
  catLayer.addChild(catShadow, catContainer);
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
  const disposeInput = installPondInput({
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
      feedAffordance.position.set(screen.x, screen.y);
      affordanceTarget = visible ? 0.34 : 0;
      if (DEBUG) host.dataset.foodAffordance = String(visible);
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
  let revealFrame = 0;
  let revealed = false;
  const current = { ax: 0, ay: 0, bx: 0, by: 0 };

  const renderCat = (next: PondSimulationFrame, now: number, delta: number) => {
    const row = animationRowFor(next.cat.state);
    if (row !== catAnimationRow) {
      catAnimationRow = row;
      catSprite.textures = catRows[row];
      catSprite.animationSpeed = row === 2 || row === 3 ? 0.12 : row === 1 ? 0.07 : 0.035;
      catSprite.gotoAndPlay(0);
    }
    catSprite.anchor.y = CAT_FRAME_CONTACT_Y[row][catSprite.currentFrame] ?? CAT_FRAME_CONTACT_Y[row][0];
    const contact = worldToScreen(next.cat.contact);
    const aim = worldToScreen(next.cat.aim);
    const lift = next.cat.lift * background.scale.y * (reduced ? 0.25 : 1);
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
      catTurnSprite.texture = catTurnFrames[turnFrom === 1 ? turnFrame : 4 - turnFrame];
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
    catContainer.position.set(Math.round(contact.x), Math.round(contact.y - lift));
    catContainer.rotation += pondAngleDelta(catContainer.rotation, next.cat.surfaceAngle + aimLean) * Math.min(1, delta * 12);
    catSprite.scale.set(catBaseScale.x * renderedFacing * next.cat.squashX, catBaseScale.y * next.cat.squashY);
    catTurnSprite.scale.set(catTurnScale.x * next.cat.squashX, catTurnScale.y * next.cat.squashY);
    catShadow.position.set(Math.round(contact.x), Math.round(contact.y));
    catShadow.rotation = next.cat.surfaceAngle;
    catShadow.scale.set(1 - Math.min(0.22, lift / Math.max(1, catSize) * 0.34), 1 - Math.min(0.1, lift / Math.max(1, catSize) * 0.12));
    catShadow.alpha = 0.95 - Math.min(0.58, lift / Math.max(1, catSize));
  };

  app.ticker.add((ticker) => {
    const now = performance.now();
    const delta = Math.min(ticker.deltaMS / 1000, 0.08);
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
        velocity: { x: pointer.velocity.x / background.scale.x, y: pointer.velocity.y / background.scale.y },
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
    displacementA.position.set(window.innerWidth / 2 + current.ax, window.innerHeight / 2 + current.ay);
    displacementB.position.set(window.innerWidth / 2 + current.bx, window.innerHeight / 2 + current.by);
    displacementA.rotation += (environment.currentA.y - environment.currentA.x) * simulationDelta * 0.0009;
    displacementB.rotation += (environment.currentB.x + environment.currentB.y) * simulationDelta * 0.0007;
    const waterEnergy = pointerInfluence * pointer.energy;
    waterA.scale.x = environment.surfaceA.x + waterEnergy * 2.6 * motionScale;
    waterA.scale.y = environment.surfaceA.y + waterEnergy * 1.9 * motionScale;
    waterB.scale.x = environment.surfaceB.x - waterEnergy * 1.25 * motionScale;
    waterB.scale.y = environment.surfaceB.y + waterEnergy * motionScale;
    waterGlow.alpha += (0.055 + environment.light * 0.34 - waterGlow.alpha) * Math.min(1, delta * 0.42);
    finger.enabled = waterEnergy > 0.005;
    finger.centerX = pointer.screen.x / window.innerWidth;
    finger.centerY = pointer.screen.y / window.innerHeight;
    finger.radius = 140 + waterEnergy * 80;
    finger.strength = -0.105 * waterEnergy * motionScale;

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
      visual.container.position.set(Math.round(point.x), Math.round(point.y));
      visual.group.position.y = -fall;
      visual.group.scale.set((0.76 + food.pelletSize / 13) * (food.state === "depleted" ? 0.72 : 1));
      visual.shadow.alpha = food.state === "dropping" ? 0.12 + food.dropProgress * 0.5 : 0.7;
      visual.pellets.forEach((pellet, index) => { pellet.visible = index < Math.ceil(food.remainingAmount); });
    }
    for (const [id, visual] of foodVisuals) {
      if (!liveFood.has(id)) {
        visual.container.destroy({ children: true });
        foodVisuals.delete(id);
      }
    }
    feedAffordance.alpha += (affordanceTarget - feedAffordance.alpha) * Math.min(1, delta * 8);
    feedAffordance.rotation += environment.wind * delta * 0.025;

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
      element.container.position.set(Math.round(base.x + element.offset.x), Math.round(base.y + element.offset.y));
      element.container.rotation = element.offset.x * 0.008;
      element.container.alpha = 0.45 + reaction * 0.34;
    }

    midgeLayer.clear();
    for (const midge of midges) {
      const base = worldToScreen(midge.position);
      const x = Math.round(base.x + Math.sin(simulationNow * 0.0011 + midge.phase) * midge.orbit + environment.wind * 2);
      const y = Math.round(base.y + Math.cos(simulationNow * 0.00145 + midge.phase * 1.3) * midge.orbit * 0.65);
      midgeLayer.rect(x, y, 2, 2).fill({ color: 0x172f2d, alpha: 0.8 });
    }
    for (const fly of frame.flies) {
      const visual = flyVisuals.get(fly.id);
      if (!visual) continue;
      const point = worldToScreen(fly.position);
      visual.container.position.set(Math.round(point.x), Math.round(point.y));
      visual.container.rotation += pondAngleDelta(visual.container.rotation, fly.heading) * Math.min(1, delta * 5);
      visual.wings.scale.y = 0.45 + Math.abs(Math.sin(fly.wingPhase)) * (fly.reacting ? 1.1 : 0.75);
    }

    for (const fish of frame.fish) {
      const visual = fishVisuals.get(fish.id);
      if (!visual) continue;
      const point = worldToScreen(fish.position);
      visual.container.position.set(Math.round(point.x), Math.round(point.y));
      visual.container.zIndex = point.y;
      visual.container.rotation += pondAngleDelta(visual.container.rotation, fish.heading + Math.PI / 2) * Math.min(1, delta * (fish.reacting ? 8 : fish.goal ? 4.5 : 2.2));
      visual.sprite.animationSpeed = 0.032 + Math.min(0.026, Math.hypot(fish.velocity.x, fish.velocity.y) / 13 * 0.014);
      const depthAlpha = fish.state === "feeding" ? 0.98 : fish.state === "circling" ? 0.93 : fish.alpha;
      visual.container.alpha += (depthAlpha - visual.container.alpha) * Math.min(1, delta * 4);
      visual.sprite.tint = fish.state === "feeding" ? 0xf4fff3 : 0xe8fff9;
      const peck = fish.state === "feeding" ? 1 - Math.abs(fish.feedingPulse * 2 - 1) * 0.055 : 1;
      visual.sprite.scale.set(visual.baseScaleX * peck, visual.baseScaleY * (2 - peck));
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
      particleLayer.rect(Math.round(particle.x), Math.round(particle.y), particle.size, particle.size)
        .fill({ color: particle.color, alpha: Math.max(0, 1 - age / particle.life) * 0.72 });
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
        particleLayer.rect(
          Math.round(ring.x + Math.cos(angle) * radius),
          Math.round(ring.y + Math.sin(angle) * radius * 0.72),
          progress < 0.5 ? 3 : 2,
          2,
        ).fill({ color: ring.color, alpha });
      }
      return true;
    });
    let filtersChanged = false;
    ripples = ripples.filter((ripple) => {
      const age = now - ripple.born;
      if (age >= ripple.life) {
        ripple.filter.destroy();
        filtersChanged = true;
        return false;
      }
      ripple.filter.time = age / 1000;
      return true;
    });
    if (filtersChanged) syncFilters();

    frameCount += 1;
    if (DEBUG && frameCount % 12 === 0) {
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
      host.dataset.catRotation = catContainer.rotation.toFixed(3);
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
      host.dataset.pondCamera = `${worldCenterX().toFixed(3)},${(pondTexture.height / 2).toFixed(3)},${background.scale.x.toFixed(5)},${background.scale.y.toFixed(5)}`;
      host.dataset.touchGesture = touchGesture;
      host.dataset.frame = String(frameCount);
      host.dataset.pondSeed = pondSeed;
      host.dataset.waterOffset = `${displacementA.position.x.toFixed(2)},${displacementA.position.y.toFixed(2)};${waterA.scale.x.toFixed(2)},${waterB.scale.y.toFixed(2)}`;
    }
    if (!revealed) {
      revealed = true;
      revealFrame = window.requestAnimationFrame(() => {
        if (!options.signal.aborted) pond.dataset.renderer = "pixi";
      });
    }
  });

  const visibility = () => {
    if (document.hidden) {
      app.stop();
      if (DEBUG) host.dataset.pixiState = "paused";
    } else {
      app.start();
      if (DEBUG) host.dataset.pixiState = "running";
    }
  };
  window.addEventListener("resize", layout);
  document.addEventListener("visibilitychange", visibility);
  visibility();
  if (DEBUG) {
    host.dataset.fishCount = String(fishDefinitions.length);
    host.dataset.pondElementCount = String(pondElements.length);
    host.dataset.insectCount = String(midges.length + flyVisuals.size);
    host.dataset.catCount = "1";
    host.dataset.fishLogic = "authoritative-seeded-world-steering";
    host.dataset.worldModel = "seeded-routine-rock-target-food-environment";
  }

  return () => {
    window.cancelAnimationFrame(revealFrame);
    disposeInput();
    window.removeEventListener("resize", layout);
    document.removeEventListener("visibilitychange", visibility);
    simulation.destroy();
    ripples.forEach((ripple) => ripple.filter.destroy());
    waterA.destroy();
    waterB.destroy();
    finger.destroy();
    destroyApp();
  };
}
