"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { ShockwaveFilter } from "pixi-filters";
import type { AnimatedSprite, Application, Container } from "pixi.js";
import type {
  ArriveBehavior,
  EvadeBehavior,
  FleeBehavior,
  SeekBehavior,
  Vehicle,
  Vector3,
  WanderBehavior,
} from "yuka";
import {
  ArrowDown,
  ArrowUpRight,
  Github,
  Mail,
  Sparkles,
} from "lucide-react";
import { portfolioIdentity, portfolioProjects, type PortfolioProject } from "@/lib/portfolio-content";
import {
  createPondRandom,
  createPondWorld,
  CAT_INTEREST_RADIUS,
  ROCK_ANCHORS,
  type CatWorldState,
  type PondTarget,
  type PondWorldFrame,
} from "./pond-world";
import styles from "./signal-desk.module.css";

const supportingWork = [
  { name: "Bongo Cat", note: "Cross-platform desktop companion", href: "https://github.com/luinbytes/bongocat" },
  { name: "file-deduplicator", note: "Safe parallel duplicate finder", href: "https://github.com/luinbytes/file-deduplicator" },
  { name: "cursor-barrier", note: "Linux input daemon in C", href: "https://github.com/luinbytes/cursor-barrier" },
  { name: "ByteBot", note: "Stateful Discord operations", href: "https://github.com/luinbytes/bytebot-definitive-edition" },
] as const;

type PondRipple = { filter: ShockwaveFilter; born: number; life: number };
type PondRing = { x: number; y: number; born: number; life: number; radius: number; color: number };
type PondParticle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  born: number;
  life: number;
  size: number;
  color: number;
};
type PondElement = {
  container: Container;
  worldX: number;
  worldY: number;
  phase: number;
  lastReaction: number;
  offsetX: number;
  offsetY: number;
};
type PondInsect = {
  id: string;
  container: Container;
  wings: Container;
  worldX: number;
  worldY: number;
  orbitX: number;
  orbitY: number;
  phase: number;
  speed: number;
  lastX: number;
  lastY: number;
  avoidX: number;
  avoidY: number;
  startleUntil: number;
  velocityX: number;
  velocityY: number;
};
type AnimatedFish = {
  id: string;
  container: Container;
  sprite: AnimatedSprite;
  vehicle: Vehicle;
  pointerEvade: EvadeBehavior;
  catFlee: FleeBehavior;
  returnHome: SeekBehavior;
  foodArrive: ArriveBehavior;
  foodTarget: Vector3;
  wander: WanderBehavior;
  cruise: number;
  clearance: number;
  width: number;
  baseSpriteScaleX: number;
  baseSpriteScaleY: number;
  baseAlpha: number;
  species: string;
  lastWake: number;
  startleUntil: number;
  previousX: number;
  previousY: number;
  maxStep: number;
};

const EASE_OUT = [0.23, 1, 0.32, 1] as const;
const HERO_SEQUENCE = {
  hidden: {},
  visible: { transition: { delayChildren: 0.08, staggerChildren: 0.085 } },
};
const HERO_REVEAL = {
  hidden: { opacity: 0, y: 22, clipPath: "inset(0 0 20% 0)" },
  visible: { opacity: 1, y: 0, clipPath: "inset(0 0 0% 0)" },
};

function angleDelta(from: number, to: number) {
  return Math.atan2(Math.sin(to - from), Math.cos(to - from));
}

function PondEnvironment({ reduced }: { reduced: boolean }) {
  const pondRef = useRef<HTMLDivElement>(null);
  const pixiHostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const pond = pondRef.current;
    const host = pixiHostRef.current;
    if (!pond || !host) return;

    let disposed = false;
    let teardown = () => {};
    let liveApp: Application | null = null;
    const destroyApp = () => {
      const current = liveApp;
      liveApp = null;
      try {
        current?.destroy({ removeView: true }, { children: true });
      } catch {
        // A renderer that failed during init can already have torn itself down.
      }
    };
    host.dataset.pixiState = "loading";
    host.dataset.motion = reduced ? "reduced" : "full";

    const probe = document.createElement("canvas");
    const probeContext = probe.getContext("webgl2") ?? probe.getContext("webgl");
    if (!probeContext) {
      host.dataset.pixiState = "fallback";
      host.dataset.fallbackReason = "webgl-unavailable";
      pond.dataset.renderer = "fallback";
      return;
    }
    probeContext.getExtension("WEBGL_lose_context")?.loseContext();

    void (async () => {
      const [PIXI, { BulgePinchFilter, ShockwaveFilter }, YUKA] = await Promise.all([
        import("pixi.js"),
        import("pixi-filters"),
        import("yuka"),
      ]);
      const app = new PIXI.Application();
      liveApp = app;
      await app.init({
        resizeTo: window,
        preference: "webgl",
        antialias: false,
        autoDensity: true,
        backgroundAlpha: 0,
        resolution: Math.min(window.devicePixelRatio || 1, Math.max(0.65, Math.min(1, 1040 / window.innerWidth))),
        powerPreference: "high-performance",
      });

      if (disposed) {
        destroyApp();
        return;
      }

      // Own the renderer as soon as it exists, including while assets are loading.
      teardown = destroyApp;

      host.replaceChildren(app.canvas);
      app.canvas.className = styles.pixiCanvas;

      const [pondTexture, waterTexture, koiAtlas, foregroundTexture, pondWaterTexture, catAtlas] = await Promise.all([
        PIXI.Assets.load("/images/portfolio/pixel-pond-world.png"),
        PIXI.Assets.load("/images/portfolio/water-displacement.jpg"),
        PIXI.Assets.load("/images/portfolio/pixel-koi-atlas.png"),
        PIXI.Assets.load("/images/portfolio/pixel-pond-foreground.png"),
        PIXI.Assets.load("/images/portfolio/pixel-pond-water-layer.png"),
        PIXI.Assets.load("/images/portfolio/pixel-tabby-atlas.png"),
      ]);

      if (disposed) {
        destroyApp();
        return;
      }

      pondTexture.source.scaleMode = "nearest";
      koiAtlas.source.scaleMode = "nearest";
      foregroundTexture.source.scaleMode = "nearest";
      pondWaterTexture.source.scaleMode = "nearest";
      catAtlas.source.scaleMode = "nearest";
      const waterHitCanvas = document.createElement("canvas");
      waterHitCanvas.width = pondWaterTexture.source.pixelWidth;
      waterHitCanvas.height = pondWaterTexture.source.pixelHeight;
      const waterHitContext = waterHitCanvas.getContext("2d", { willReadFrequently: true });
      if (!waterHitContext) throw new Error("Unable to create the pond hit map");
      waterHitContext.drawImage(pondWaterTexture.source.resource as CanvasImageSource, 0, 0);
      const waterHitPixels = waterHitContext.getImageData(0, 0, waterHitCanvas.width, waterHitCanvas.height).data;
      app.stage.sortableChildren = true;
      const scene = new PIXI.Container();
      scene.zIndex = 1;
      const background = new PIXI.Sprite(pondTexture);
      background.anchor.set(0.5);
      background.zIndex = 0;
      const waterSurface = new PIXI.Sprite(pondWaterTexture);
      waterSurface.anchor.set(0.5);
      const waterShade = new PIXI.Sprite(pondWaterTexture);
      waterShade.anchor.set(0.5);
      waterShade.tint = 0x0a4f55;
      waterShade.alpha = 0.16;
      waterShade.blendMode = "multiply";
      const waterGlow = new PIXI.Sprite(pondWaterTexture);
      waterGlow.anchor.set(0.5);
      waterGlow.tint = 0xa8f4dc;
      waterGlow.alpha = 0.09;
      waterGlow.blendMode = "screen";
      scene.addChild(waterShade, waterSurface, waterGlow);
      const fishLayer = new PIXI.Container();
      fishLayer.zIndex = 2;
      fishLayer.sortableChildren = true;

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
      app.stage.addChild(displacementA, displacementB, background, scene, fishLayer);
      const foreground = new PIXI.Sprite(foregroundTexture);
      foreground.anchor.set(0.5);
      foreground.zIndex = 4;
      app.stage.addChild(foreground);

      const entityManager = new YUKA.EntityManager();
      const pointerAgent = new YUKA.Vehicle();
      pointerAgent.position.set(-1000, 0, -1000);
      const catTarget = new YUKA.Vector3(-1000, 0, -1000);
      const centerTarget = new YUKA.Vector3(pondTexture.width / 2, 0, pondTexture.height / 2);
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

      const worldCenterX = () => pondTexture.width / 2 + (window.innerWidth < 720 ? 170 : 0);
      const cameraScale = () => Math.max(window.innerWidth / pondTexture.width, window.innerHeight / pondTexture.height) * 1.015;
      const worldToScreen = (worldX: number, worldY: number) => ({
        x: window.innerWidth / 2 + (worldX - worldCenterX()) * background.scale.x,
        y: window.innerHeight / 2 + (worldY - pondTexture.height / 2) * background.scale.y,
      });
      const screenToWorld = (screenX: number, screenY: number) => ({
        x: worldCenterX() + (screenX - window.innerWidth / 2) / background.scale.x,
        y: pondTexture.height / 2 + (screenY - window.innerHeight / 2) / background.scale.y,
      });
      const isWaterWorld = (worldX: number, worldY: number) => {
        const pixelX = Math.round(worldX);
        const pixelY = Math.round(worldY);
        if (pixelX < 0 || pixelY < 0 || pixelX >= waterHitCanvas.width || pixelY >= waterHitCanvas.height) return false;
        return waterHitPixels[(pixelY * waterHitCanvas.width + pixelX) * 4 + 3] > 96;
      };
      const isWaterAt = (screenX: number, screenY: number) => {
        const world = screenToWorld(screenX, screenY);
        return isWaterWorld(world.x, world.y);
      };
      const nearestWaterPosition = (x: number, y: number) => {
        if (isWaterWorld(x, y)) return { x, y };
        const phase = (x * 0.017 + y * 0.011) % (Math.PI * 2);
        for (let radius = 12; radius <= 240; radius += 12) {
          for (let sample = 0; sample < 24; sample += 1) {
            const angle = phase + sample / 24 * Math.PI * 2;
            const candidate = { x: x + Math.cos(angle) * radius, y: y + Math.sin(angle) * radius };
            if (isWaterWorld(candidate.x, candidate.y)) return candidate;
          }
        }
        return { x: pondTexture.width / 2, y: pondTexture.height / 2 };
      };
      const initialFishPosition = (x: number, y: number) => {
        const scale = cameraScale();
        return nearestWaterPosition(
          worldCenterX() + (x - 0.5) * (window.innerWidth / scale) * 0.88,
          pondTexture.height / 2 + (y - 0.5) * (window.innerHeight / scale) * 0.88,
        );
      };

      const createFish = (
        id: string,
        row: number,
        width: number,
        x: number,
        y: number,
        heading: number,
        cruise: number,
        alpha: number,
      ): AnimatedFish => {
        const frames = [1, 0, 1, 2, 3, 2].map((column) => atlasRows[row][column]);
        const sprite = new PIXI.AnimatedSprite(frames);
        sprite.anchor.set(0.5);
        sprite.width = width;
        sprite.height = width;
        sprite.animationSpeed = 0.038 + row * 0.003;
        sprite.gotoAndPlay(row % frames.length);

        const shadow = new PIXI.Graphics({ roundPixels: true });
        shadow.ellipse(3, 7, width * 0.14, width * 0.31).fill({ color: 0x062e30, alpha: 0.2 });
        shadow.blendMode = "multiply";
        const container = new PIXI.Container();
        container.alpha = alpha;
        const initialScreen = worldToScreen(x, y);
        container.position.set(initialScreen.x, initialScreen.y);
        container.rotation = heading + Math.PI / 2;
        container.zIndex = initialScreen.y;
        container.addChild(shadow, sprite);
        fishLayer.addChild(container);

        const vehicle = new YUKA.Vehicle();
        vehicle.position.set(x, 0, y);
        vehicle.velocity.set(Math.cos(heading) * cruise, 0, Math.sin(heading) * cruise);
        vehicle.maxSpeed = cruise;
        vehicle.maxForce = 5.5;
        vehicle.maxTurnRate = 0.9;
        vehicle.neighborhoodRadius = 145;
        vehicle.updateNeighborhood = true;
        vehicle.smoother = new YUKA.Smoother(10);

        const wander = new YUKA.WanderBehavior(5, 15, 0.3);
        const separation = new YUKA.SeparationBehavior();
        const alignment = new YUKA.AlignmentBehavior();
        const cohesion = new YUKA.CohesionBehavior();
        const pointerEvade = new YUKA.EvadeBehavior(pointerAgent, 390, 0.42);
        const catFlee = new YUKA.FleeBehavior(catTarget, 210);
        const returnHome = new YUKA.SeekBehavior(centerTarget);
        const foodTarget = new YUKA.Vector3(x, 0, y);
        const foodArrive = new YUKA.ArriveBehavior(foodTarget, 2.4, 10);
        wander.weight = 0.72;
        separation.weight = 1.7;
        alignment.weight = 0.24;
        cohesion.weight = 0.11;
        pointerEvade.weight = 0;
        pointerEvade.active = false;
        catFlee.weight = 2.8;
        catFlee.active = false;
        returnHome.weight = 0.7;
        returnHome.active = false;
        foodArrive.weight = 0;
        foodArrive.active = false;
        vehicle.steering.add(pointerEvade).add(catFlee).add(returnHome).add(separation).add(foodArrive).add(alignment).add(cohesion).add(wander);
        entityManager.add(vehicle);

        return {
          id,
          container,
          sprite,
          vehicle,
          pointerEvade,
          catFlee,
          returnHome,
          foodArrive,
          foodTarget,
          wander,
          cruise,
          clearance: width * 0.56,
          width,
          baseSpriteScaleX: sprite.scale.x,
          baseSpriteScaleY: sprite.scale.y,
          baseAlpha: alpha,
          species: ["kohaku", "ogon", "showa", "utsuri"][row],
          lastWake: 0,
          startleUntil: 0,
          previousX: x,
          previousY: y,
          maxStep: 0,
        };
      };

      const mobileScale = window.innerWidth < 720 ? 0.78 : 1;
      const fishDefinitions = [
        [0, 82, 0.78, 0.18, 2.2, 17, 0.94],
        [1, 66, 0.22, 0.74, -0.7, 13, 0.86],
        [2, 52, 0.58, 0.28, 2.7, 11, 0.68],
        [3, 74, 0.83, 0.68, -2.4, 15, 0.87],
        [0, 48, 0.36, 0.12, 1.1, 10, 0.67],
        [1, 58, 0.12, 0.47, 0.2, 12, 0.76],
        [2, 70, 0.64, 0.82, -1.4, 14, 0.82],
        [3, 46, 0.42, 0.63, 2.9, 9, 0.64],
        [0, 44, 0.72, 0.48, -2.1, 10, 0.62],
        [1, 62, 0.48, 0.9, -0.9, 12, 0.78],
        [2, 40, 0.31, 0.34, 1.7, 9, 0.58],
        [3, 56, 0.9, 0.8, -2.7, 11, 0.74],
      ] as const;
      const swimmers = fishDefinitions
        .slice(0, window.innerWidth < 720 ? 8 : 12)
        .map(([row, width, x, y, heading, cruise, alpha], index) => {
          const position = initialFishPosition(x, y);
          return createFish(
            `fish-${index}`,
            row,
            width * mobileScale,
            position.x,
            position.y,
            heading,
            cruise,
            alpha,
          );
        });

      const pondElementLayer = new PIXI.Container();
      pondElementLayer.zIndex = 4.2;
      app.stage.addChild(pondElementLayer);
      const pondElements: PondElement[] = [
        { worldX: 837, worldY: 98, phase: 0.2, lastReaction: 0 },
        { worldX: 955, worldY: 126, phase: 1.1, lastReaction: 0 },
        { worldX: 1007, worldY: 200, phase: 2.4, lastReaction: 0 },
        { worldX: 1129, worldY: 206, phase: 3.3, lastReaction: 0 },
        { worldX: 1192, worldY: 200, phase: 4.1, lastReaction: 0 },
        { worldX: 1252, worldY: 207, phase: 5.2, lastReaction: 0 },
        { worldX: 1120, worldY: 480, phase: 1.8, lastReaction: 0 },
        { worldX: 1230, worldY: 630, phase: 3.8, lastReaction: 0 },
        { worldX: 922, worldY: 738, phase: 4.7, lastReaction: 0 },
        { worldX: 1050, worldY: 835, phase: 2.9, lastReaction: 0 },
      ].map((element) => {
        const highlight = new PIXI.Graphics({ roundPixels: true });
        highlight.rect(-5, -2, 8, 2).fill({ color: 0xdff7a5, alpha: 0.2 });
        highlight.rect(4, -1, 3, 1).fill({ color: 0xf4efb1, alpha: 0.32 });
        const container = new PIXI.Container();
        container.addChild(highlight);
        pondElementLayer.addChild(container);
        return { ...element, container, offsetX: 0, offsetY: 0 };
      });

      const foliageLayer = new PIXI.Container();
      foliageLayer.zIndex = 4.4;
      app.stage.addChild(foliageLayer);
      const foliage = [
        { worldX: 770, worldY: 78, height: 22, phase: 0.4 },
        { worldX: 1025, worldY: 850, height: 31, phase: 1.7 },
        { worldX: 1505, worldY: 285, height: 27, phase: 2.8 },
        { worldX: 286, worldY: 860, height: 25, phase: 4.1 },
      ].map((plant) => {
        const blades = new PIXI.Graphics({ roundPixels: true });
        blades.rect(-7, -plant.height * 0.72, 3, plant.height * 0.72).fill({ color: 0x4c8950, alpha: 0.44 });
        blades.rect(-1, -plant.height, 3, plant.height).fill({ color: 0x77a957, alpha: 0.5 });
        blades.rect(5, -plant.height * 0.82, 2, plant.height * 0.82).fill({ color: 0x9abe65, alpha: 0.38 });
        const container = new PIXI.Container();
        container.addChild(blades);
        foliageLayer.addChild(container);
        return { ...plant, container, offsetX: 0, offsetY: 0 };
      });

      const waterGlintLayer = new PIXI.Container();
      waterGlintLayer.blendMode = "screen";
      scene.addChild(waterGlintLayer);
      const waterGlints = Array.from({ length: 24 }, (_, index) => {
        const mark = new PIXI.Graphics({ roundPixels: true });
        const length = 2 + index % 4;
        mark.rect(-length, 0, length * 2, index % 3 === 0 ? 2 : 1).fill({
          color: index % 5 === 0 ? 0xffefb0 : 0xc8fff2,
          alpha: 0.72,
        });
        const container = new PIXI.Container();
        container.addChild(mark);
        waterGlintLayer.addChild(container);
        return {
          container,
          worldX: 190 + (index * 193) % 1050,
          worldY: 150 + (index * 137) % 610,
          alpha: 0.12 + index % 4 * 0.04,
          phase: index * 0.73,
          drift: index % 2 === 0 ? 1 : -1,
        };
      });

      const insectLayer = new PIXI.Container();
      insectLayer.zIndex = 6;
      app.stage.addChild(insectLayer);
      const midgeLayer = new PIXI.Graphics({ roundPixels: true });
      insectLayer.addChild(midgeLayer);
      const midges = Array.from({ length: 14 }, (_, index) => ({
        worldX: 170 + (index * 113) % 1220,
        worldY: 130 + (index * 173) % 680,
        phase: index * 1.73,
        orbit: 7 + index % 5,
        avoidX: 0,
        avoidY: 0,
      }));

      const addDragonfly = (
        id: string,
        worldX: number,
        worldY: number,
        orbitX: number,
        orbitY: number,
        phase: number,
        speed: number,
        color: number,
      ): PondInsect => {
        const wings = new PIXI.Container();
        const wingPixels = new PIXI.Graphics({ roundPixels: true });
        wingPixels.rect(-2, -5, 5, 2).fill({ color: 0xe3fff5, alpha: 0.7 });
        wingPixels.rect(-1, 3, 5, 2).fill({ color: 0xe3fff5, alpha: 0.7 });
        wingPixels.rect(1, -3, 4, 2).fill({ color: 0x9de9df, alpha: 0.58 });
        wingPixels.rect(2, 1, 4, 2).fill({ color: 0x9de9df, alpha: 0.58 });
        wings.addChild(wingPixels);
        const body = new PIXI.Graphics({ roundPixels: true });
        body.rect(-5, -1, 11, 2).fill({ color });
        body.rect(5, -2, 3, 4).fill({ color: 0x173d3c });
        body.rect(-7, 0, 3, 1).fill({ color: 0xf4da82 });
        const container = new PIXI.Container();
        container.addChild(wings, body);
        insectLayer.addChild(container);
        return {
          id,
          container,
          wings,
          worldX,
          worldY,
          orbitX,
          orbitY,
          phase,
          speed,
          lastX: 0,
          lastY: 0,
          avoidX: 0,
          avoidY: 0,
          startleUntil: 0,
          velocityX: 0,
          velocityY: 0,
        };
      };

      const dragonflies = [
        addDragonfly("fly-0", 580, 285, 240, 90, 0.4, 0.00013, 0x56d7c8),
        addDragonfly("fly-1", 1040, 560, 190, 115, 2.7, 0.00011, 0xe8a64f),
      ];

      const particleLayer = new PIXI.Graphics({ roundPixels: true });
      particleLayer.zIndex = 3;
      app.stage.addChild(particleLayer);

      const foodLayer = new PIXI.Container();
      foodLayer.zIndex = 3.4;
      app.stage.addChild(foodLayer);
      const foodDebug = new PIXI.Graphics({ roundPixels: true });
      foodDebug.zIndex = 6.5;
      const debugWorld = process.env.NODE_ENV !== "production" && new URLSearchParams(window.location.search).get("pond-debug") === "1";
      foodDebug.visible = debugWorld;
      app.stage.addChild(foodDebug);
      const feedAffordance = new PIXI.Graphics({ roundPixels: true });
      feedAffordance.rect(-8, -1, 4, 2).fill({ color: 0xffefab, alpha: 0.72 });
      feedAffordance.rect(5, -1, 4, 2).fill({ color: 0xffefab, alpha: 0.72 });
      feedAffordance.rect(-1, -8, 2, 4).fill({ color: 0xd7fff0, alpha: 0.64 });
      feedAffordance.rect(-1, 5, 2, 4).fill({ color: 0xd7fff0, alpha: 0.64 });
      feedAffordance.alpha = 0;
      feedAffordance.zIndex = 6.2;
      app.stage.addChild(feedAffordance);
      const foodVisuals = new Map<string, {
        container: Container;
        pelletGroup: Container;
        pellets: Container[];
        shadow: Container;
      }>();

      const createFoodVisual = (id: string) => {
        const shadow = new PIXI.Graphics({ roundPixels: true });
        shadow.ellipse(0, 3, 7, 3).fill({ color: 0x062d2c, alpha: 0.24 });
        shadow.blendMode = "multiply";
        const pelletGroup = new PIXI.Container();
        const pellets = Array.from({ length: 9 }, (_, index) => {
          const pellet = new PIXI.Graphics({ roundPixels: true });
          const angle = index * 2.399;
          const radius = index === 0 ? 0 : 2 + index % 3 * 2;
          pellet.rect(-1, -1, index % 4 === 0 ? 3 : 2, 2).fill({
            color: index % 3 === 0 ? 0xe4bb68 : index % 3 === 1 ? 0xb97a43 : 0xf0d184,
            alpha: 0.96,
          });
          pellet.position.set(Math.cos(angle) * radius, Math.sin(angle) * radius * 0.72);
          pelletGroup.addChild(pellet);
          return pellet;
        });
        const container = new PIXI.Container();
        container.addChild(shadow, pelletGroup);
        foodLayer.addChild(container);
        const visual = { container, pelletGroup, pellets, shadow };
        foodVisuals.set(id, visual);
        return visual;
      };

      let ripples: PondRipple[] = [];
      let rings: PondRing[] = [];
      let particles: PondParticle[] = [];
      let frameCount = 0;
      let lastTrailRing = 0;
      let pointer = { x: -1000, y: -1000, worldX: -1000, worldY: -1000, time: 0, energy: 0 };
      const current = {
        ax: 0,
        ay: 0,
        bx: 0,
        by: 0,
      };
      const pondSeed = new URLSearchParams(window.location.search).get("pond-seed")?.trim() || "6c75";
      const pondWorld = createPondWorld(pondSeed);
      const visualRandom = createPondRandom(`${pondSeed}:render`);
      const motionScale = reduced ? 0.2 : 1;
      let simulationNow = performance.now();
      let pondFrame: PondWorldFrame | null = null;
      let catScreen = { x: -1000, y: -1000 };
      let catPounceCount = 0;
      let catBapCount = 0;
      let catEmptyBapCount = 0;
      let catGroundedWaterViolation = false;
      let foodDroppedCount = 0;
      let fishFedCount = 0;
      let foodExpiredCount = 0;
      let maxFoodCount = 0;
      let primaryImpactCount = 0;

      const addParticle = (
        x: number,
        y: number,
        vx: number,
        vy: number,
        life = 760,
        size = 2,
        color = 0xc8fff0,
      ) => {
        particles.push({ x, y, vx, vy, born: performance.now(), life, size, color });
        if (particles.length > 120) particles = particles.slice(-120);
        host.dataset.wakeCount = String(particles.length);
      };

      const addRing = (x: number, y: number, radius = 34, life = 620, color = 0xb9f5e7) => {
        rings.push({ x, y, born: performance.now(), life, radius, color });
        if (rings.length > 10) rings = rings.slice(-10);
        host.dataset.ringCount = String(rings.length);
      };

      const catLayer = new PIXI.Container();
      catLayer.zIndex = 5;
      app.stage.addChild(catLayer);
      const catSize = window.innerWidth < 720 ? 80 : 118;
      const catSprite = new PIXI.AnimatedSprite(catRows[0]);
      catSprite.anchor.set(0.5, 0.86);
      catSprite.width = catSize * 1.25;
      catSprite.height = catSize * 1.25;
      const catBaseScaleX = Math.abs(catSprite.scale.x);
      const catBaseScaleY = Math.abs(catSprite.scale.y);
      catSprite.animationSpeed = 0.035;
      catSprite.gotoAndPlay(0);
      const catGhost = new PIXI.AnimatedSprite(catRows[0]);
      catGhost.anchor.copyFrom(catSprite.anchor);
      catGhost.width = catSprite.width;
      catGhost.height = catSprite.height;
      catGhost.alpha = 0;
      const catShadow = new PIXI.Graphics({ roundPixels: true });
      catShadow.ellipse(0, 2, catSize * 0.28, catSize * 0.1).fill({ color: 0x071c1a, alpha: 0.28 });
      catShadow.blendMode = "multiply";
      const catContainer = new PIXI.Container();
      catContainer.addChild(catShadow, catGhost, catSprite);
      catLayer.addChild(catContainer);
      let catAnimationRow = 0;
      let catAnimationBlend = 1;
      let renderedCatFacing = 1;
      const animationRowFor = (state: CatWorldState) => {
        if (state === "airborne") return 2;
        if (state === "prepare-bat" || state === "bat") return 3;
        if (state === "approach" || state === "anticipate-hop" || state === "react" || state === "recover") return 1;
        return 0;
      };
      const setCatAnimation = (state: CatWorldState) => {
        const row = animationRowFor(state);
        if (row === catAnimationRow) return;
        catGhost.textures = catSprite.textures;
        catGhost.gotoAndStop(catSprite.currentFrame);
        catGhost.alpha = Math.max(catSprite.alpha, 0.6);
        catSprite.textures = catRows[row];
        catSprite.animationSpeed = row === 2 || row === 3 ? 0.12 : row === 1 ? 0.07 : 0.035;
        catSprite.gotoAndPlay(0);
        catSprite.alpha = 0;
        catAnimationBlend = 0;
        catAnimationRow = row;
      };

      const layout = () => {
        activeTouch = null;
        lastTouchTap = null;
        if (pendingSingleTap !== null) window.clearTimeout(pendingSingleTap);
        pendingSingleTap = null;
        const width = window.innerWidth;
        const height = window.innerHeight;
        const scale = Math.max(width / pondTexture.width, height / pondTexture.height) * 1.015;
        background.position.set(width / 2 - (worldCenterX() - pondTexture.width / 2) * scale, height / 2);
        background.scale.set(scale);
        waterShade.position.copyFrom(background.position);
        waterShade.scale.copyFrom(background.scale);
        waterSurface.position.copyFrom(background.position);
        waterSurface.scale.copyFrom(background.scale);
        waterGlow.position.copyFrom(background.position);
        waterGlow.scale.copyFrom(background.scale);
        foreground.position.copyFrom(background.position);
        foreground.scale.copyFrom(background.scale);
        const displacementScale = Math.max(width / waterTexture.width, height / waterTexture.height) * 1.72;
        displacementA.scale.set(displacementScale);
        displacementB.scale.set(displacementScale * 1.08);
        centerTarget.set(pondTexture.width / 2, 0, pondTexture.height / 2);
        scene.filterArea = app.screen;
        for (const dragonfly of dragonflies) {
          dragonfly.container.scale.set(Math.max(1, background.scale.x * 1.35));
        }
        for (const element of pondElements) element.container.scale.set(Math.max(0.86, background.scale.x));
        for (const plant of foliage) plant.container.scale.set(Math.max(0.9, background.scale.x));
        for (const swimmer of swimmers) {
          swimmer.clearance = swimmer.width / background.scale.x * 0.56;
          swimmer.vehicle.position.x = Math.max(swimmer.clearance, Math.min(pondTexture.width - swimmer.clearance, swimmer.vehicle.position.x));
          swimmer.vehicle.position.z = Math.max(swimmer.clearance, Math.min(pondTexture.height - swimmer.clearance, swimmer.vehicle.position.z));
          const position = worldToScreen(swimmer.vehicle.position.x, swimmer.vehicle.position.z);
          swimmer.container.position.set(position.x, position.y);
        }
        if (pondFrame) {
          catScreen = worldToScreen(pondFrame.cat.contact.x, pondFrame.cat.contact.y);
          catContainer.position.set(Math.round(catScreen.x), Math.round(catScreen.y));
        }
      };

      const syncFilters = () => {
        scene.filters = [waterA, waterB, finger, ...ripples.map((ripple) => ripple.filter)];
      };

      const addRipple = (x: number, y: number, size = 132, strength = 1) => {
        const speed = 145 + strength * 45;
        const filter = new ShockwaveFilter({
          center: { x, y },
          speed,
          amplitude: 1.2 + strength * 3.8,
          wavelength: 22 + size * 0.16,
          brightness: 1 + strength * 0.008,
          radius: size,
        });
        filter.resolution = effectResolution;
        ripples.push({ filter, born: performance.now(), life: (size / speed) * 1000 + 180 });
        while (ripples.length > 2) {
          const oldest = ripples.shift();
          oldest?.filter.destroy();
        }
        syncFilters();
        host.dataset.rippleCount = String(ripples.length);
      };

      const isInteractiveTarget = (target: EventTarget | null) =>
        target instanceof Element && Boolean(target.closest(
          "a, button, input, select, textarea, summary, label, [role='button'], [role='menuitem'], [draggable='true'], [contenteditable='true'], [data-pond-input='ignore']",
        ));
      const isValidFoodDrop = (x: number, y: number, target: EventTarget | null) =>
        x >= 0 && x <= window.innerWidth && y >= 0 && y <= window.innerHeight && !isInteractiveTarget(target) && isWaterAt(x, y);
      let lastFoodInput = Number.NEGATIVE_INFINITY;
      let feedAffordanceTarget = 0;
      let activeTouch: { id: number; x: number; y: number; started: number; moved: boolean; target: EventTarget | null } | null = null;
      let lastTouchTap: { x: number; y: number; time: number; target: EventTarget | null } | null = null;
      let pendingSingleTap: number | null = null;

      const dropFoodAt = (x: number, y: number, target: EventTarget | null) => {
        if (!isValidFoodDrop(x, y, target)) return false;
        const now = performance.now();
        if (now - lastFoodInput >= 140) {
          const world = screenToWorld(x, y);
          pondWorld.dropFood(world);
          lastFoodInput = now;
          if (process.env.NODE_ENV !== "production") {
            host.dataset.foodRequestedAt = `${world.x.toFixed(2)},${world.y.toFixed(2)}`;
          }
        }
        return true;
      };

      const primaryImpact = (x: number, y: number) => {
        primaryImpactCount += 1;
        host.dataset.primaryImpactCount = String(primaryImpactCount);
        const now = performance.now();
        const overWater = isWaterAt(x, y);
        const world = screenToWorld(x, y);
        pointer = { x, y, worldX: world.x, worldY: world.y, time: now, energy: overWater ? 1 : 0 };
        pointerAgent.position.set(pointer.worldX, 0, pointer.worldY);
        pointerAgent.velocity.multiplyScalar(0.55);
        if (overWater) {
          addRipple(x, y, reduced ? 72 : 132, reduced ? 0.28 : 1);
          addRing(x, y, reduced ? 36 : 72, reduced ? 620 : 920, 0xffe8a0);
          const particleCount = reduced ? 4 : 14;
          for (let index = 0; index < particleCount; index += 1) {
            const angle = index / particleCount * Math.PI * 2;
            const speed = 18 + index % 3 * 5;
            addParticle(x, y, Math.cos(angle) * speed, Math.sin(angle) * speed, 680, index % 4 === 0 ? 3 : 2, index % 3 === 0 ? 0xfff1a8 : 0xd4fff4);
          }
        }
        if (Math.hypot(x - catScreen.x, y - catScreen.y) < 280) pondWorld.requestHop();
      };

      const move = (event: globalThis.PointerEvent) => {
        const now = performance.now();
        const pointerDx = event.clientX - pointer.x;
        const pointerDy = event.clientY - pointer.y;
        const distance = Math.hypot(pointerDx, pointerDy);
        const elapsed = Math.max(16, now - pointer.time);
        const overWater = isWaterAt(event.clientX, event.clientY);
        const world = screenToWorld(event.clientX, event.clientY);
        if (activeTouch?.id === event.pointerId && Math.hypot(event.clientX - activeTouch.x, event.clientY - activeTouch.y) > 16) {
          activeTouch.moved = true;
        }
        const validFoodDrop = isValidFoodDrop(event.clientX, event.clientY, event.target);
        feedAffordanceTarget = event.pointerType !== "touch" && validFoodDrop ? 0.34 : 0;
        host.dataset.foodAffordance = String(validFoodDrop);
        feedAffordance.position.set(event.clientX, event.clientY);
        const energy = overWater ? (pointer.time ? Math.min(1, 0.2 + (distance / elapsed) * 0.32) : 0.34) : 0;
        if (overWater && pointer.time && distance > 4) {
          const count = Math.min(5, Math.max(1, Math.floor(distance / 18)));
          for (let index = 0; index < count; index += 1) {
            const progress = (index + 1) / (count + 1);
            const x = pointer.x + (event.clientX - pointer.x) * progress;
            const y = pointer.y + (event.clientY - pointer.y) * progress;
            addParticle(x, y, (visualRandom() - 0.5) * 10, -5 - visualRandom() * 8, 520 + visualRandom() * 280, visualRandom() > 0.72 ? 3 : 2);
          }
          if (now - lastTrailRing > 82) {
            addRing(event.clientX, event.clientY);
            lastTrailRing = now;
          }
        }
        if (pointer.time) {
          let velocityX = pointerDx / elapsed * 1000 / background.scale.x;
          let velocityY = pointerDy / elapsed * 1000 / background.scale.y;
          const speed = Math.hypot(velocityX, velocityY);
          if (speed > 900) {
            velocityX *= 900 / speed;
            velocityY *= 900 / speed;
          }
          pointerAgent.velocity.x += (velocityX - pointerAgent.velocity.x) * 0.28;
          pointerAgent.velocity.z += (velocityY - pointerAgent.velocity.z) * 0.28;
        }
        pointer = { x: event.clientX, y: event.clientY, worldX: world.x, worldY: world.y, time: now, energy };
        pointerAgent.position.set(pointer.worldX, 0, pointer.worldY);
      };

      const press = (event: globalThis.PointerEvent) => {
        if (event.pointerType === "touch") {
          if (!event.isPrimary || activeTouch) {
            activeTouch = null;
            lastTouchTap = null;
            if (pendingSingleTap !== null) window.clearTimeout(pendingSingleTap);
            pendingSingleTap = null;
            return;
          }
          activeTouch = {
            id: event.pointerId,
            x: event.clientX,
            y: event.clientY,
            started: performance.now(),
            moved: false,
            target: event.target,
          };
          return;
        }
        if (event.button === 0 && !isInteractiveTarget(event.target)) {
          primaryImpact(event.clientX, event.clientY);
        }
      };

      const releaseTouch = (event: globalThis.PointerEvent) => {
        if (event.pointerType !== "touch" || !activeTouch || activeTouch.id !== event.pointerId) return;
        const touch = activeTouch;
        activeTouch = null;
        const now = performance.now();
        const tapDuration = now - touch.started;
        const validDrop =
          !isInteractiveTarget(event.target) &&
          isValidFoodDrop(event.clientX, event.clientY, touch.target);
        if (process.env.NODE_ENV !== "production") {
          host.dataset.touchGesture = `released:${tapDuration.toFixed(0)}:${touch.moved ? "moved" : "still"}:${validDrop ? "water" : "blocked"}`;
        }
        if (touch.moved || tapDuration > 430 || !validDrop) return;
        const previous = lastTouchTap;
        if (
          previous &&
          now - previous.time >= 70 &&
          now - previous.time <= 430 &&
          Math.hypot(event.clientX - previous.x, event.clientY - previous.y) <= 34
        ) {
          if (pendingSingleTap !== null) window.clearTimeout(pendingSingleTap);
          pendingSingleTap = null;
          lastTouchTap = null;
          if (dropFoodAt(event.clientX, event.clientY, touch.target) && event.cancelable) event.preventDefault();
          if (process.env.NODE_ENV !== "production") host.dataset.touchGesture = "double-tap-food";
          return;
        }
        lastTouchTap = { x: event.clientX, y: event.clientY, time: now, target: touch.target };
        if (pendingSingleTap !== null) window.clearTimeout(pendingSingleTap);
        pendingSingleTap = window.setTimeout(() => {
          if (lastTouchTap?.time === now) primaryImpact(touch.x, touch.y);
          if (process.env.NODE_ENV !== "production") host.dataset.touchGesture = "single-tap-impact";
          lastTouchTap = null;
          pendingSingleTap = null;
        }, 440);
      };

      const cancelTouch = (event: globalThis.PointerEvent) => {
        if (activeTouch?.id === event.pointerId) activeTouch = null;
      };

      const contextMenu = (event: globalThis.MouseEvent) => {
        if (event.button === 2 && dropFoodAt(event.clientX, event.clientY, event.target)) event.preventDefault();
      };

      app.ticker.add((ticker) => {
        const now = performance.now();
        const delta = Math.min(ticker.deltaMS / 1000, 0.08);
        const simulationDelta = delta * motionScale;
        simulationNow += simulationDelta * 1000;
        const pointerInfluence = Math.max(0, 1 - (now - pointer.time) / 1400);
        let reacting = false;

        if (now - pointer.time > 70) pointerAgent.velocity.multiplyScalar(Math.exp(-delta * 4.4));

        const pondTargets: PondTarget[] = [
          ...swimmers.map((swimmer) => {
            const { position, velocity } = swimmer.vehicle;
            const pointerDistance = Math.hypot(position.x - pointer.worldX, position.z - pointer.worldY);
            const pointerDanger = pointerInfluence * Math.max(0, 1 - pointerDistance / 330) * pointer.energy;
            const startleDanger = Math.max(0, Math.min(1, (swimmer.startleUntil - now) / 1250));
            return {
              id: swimmer.id,
              type: "fish" as const,
              position: { x: position.x, y: position.z },
              velocity: { x: velocity.x, y: velocity.z },
              visible: isWaterWorld(position.x, position.z),
              attackable: true,
              interactionRange: swimmer.width / background.scale.x * 0.28,
              species: swimmer.species,
              danger: Math.max(pointerDanger, startleDanger),
            };
          }),
          ...dragonflies.map((dragonfly) => ({
            id: dragonfly.id,
            type: "fly" as const,
            position: screenToWorld(dragonfly.lastX, dragonfly.lastY),
            velocity: { x: dragonfly.velocityX, y: dragonfly.velocityY },
            visible:
              dragonfly.lastX > -20 &&
              dragonfly.lastX < window.innerWidth + 20 &&
              dragonfly.lastY > -20 &&
              dragonfly.lastY < window.innerHeight + 20,
            attackable: true,
            interactionRange: 12,
          })),
        ];
        const catHorizontalClearance = catSize * 0.625 + 4;
        const catTopClearance = catSize * 1.075 + 4;
        const catBottomClearance = catSize * 0.175 + 4;
        const visibleAnchorIds = ROCK_ANCHORS
          .filter((anchor) => {
            const point = worldToScreen(anchor.position.x, anchor.position.y);
            return (
              point.x > catHorizontalClearance &&
              point.x < window.innerWidth - catHorizontalClearance &&
              point.y > catTopClearance &&
              point.y < window.innerHeight - catBottomClearance &&
              !isWaterAt(point.x, point.y)
            );
          })
          .map((anchor) => anchor.id);
        pondFrame = pondWorld.step({
          now: simulationNow,
          delta: simulationDelta,
          targets: pondTargets,
          visibleAnchorIds,
        });
        const { environment } = pondFrame;
        const targetById = new Map(pondTargets.map((target) => [target.id, target]));
        const intentByFish = new Map(pondFrame.fish.map((intent) => [intent.fishId, intent]));

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
        waterShade.alpha += (0.14 + Math.abs(environment.currentA.y) * 0.002 - waterShade.alpha) * Math.min(1, delta * 0.35);
        finger.enabled = waterEnergy > 0.005;
        finger.centerX = pointer.x / window.innerWidth;
        finger.centerY = pointer.y / window.innerHeight;
        finger.radius = 140 + waterEnergy * 80;
        finger.strength = -0.105 * waterEnergy * motionScale;

        for (const event of pondFrame.events) {
          if (event.type === "takeoff") catPounceCount += 1;
          if (event.type === "ambient-ripple") {
            const point = worldToScreen(event.position.x, event.position.y);
            if (isWaterAt(point.x, point.y)) addRing(point.x, point.y, 20 + event.strength * 22, 1100, 0xb4e8d5);
          }
          if (event.type === "food-dropped") {
            foodDroppedCount += 1;
            const point = worldToScreen(event.position.x, event.position.y);
            addRipple(point.x, point.y, reduced ? 42 : 72, event.rippleStrength * (reduced ? 0.32 : 1));
            addRing(point.x, point.y, reduced ? 18 : 30, reduced ? 460 : 720, 0xf2d58a);
            const count = reduced ? 2 : 5;
            for (let index = 0; index < count; index += 1) {
              const angle = index / count * Math.PI * 2;
              addParticle(point.x, point.y, Math.cos(angle) * 7, Math.sin(angle) * 4 - 3, 420, 2, 0xf0d184);
            }
            if (process.env.NODE_ENV !== "production") {
              host.dataset.foodLastDrop = `${event.position.x.toFixed(2)},${event.position.y.toFixed(2)}`;
              host.dataset.foodLastDropId = event.foodId;
            }
          }
          if (event.type === "fish-fed") {
            fishFedCount += 1;
            const point = worldToScreen(event.position.x, event.position.y);
            addRing(point.x, point.y, 13, 390, 0xe8d38d);
            addParticle(point.x, point.y, 0, -7, 340, 2, 0xffe9a8);
          }
          if (event.type === "food-expired") {
            foodExpiredCount += 1;
            const point = worldToScreen(event.position.x, event.position.y);
            if (event.consumed) addRing(point.x, point.y, 10, 320, 0xc8e6bd);
          }
          if (event.type === "land") {
            const point = worldToScreen(event.position.x, event.position.y);
            addRing(point.x, point.y + 2, 12 + event.impact * 12, 360, 0x9ab276);
            for (let index = 0; index < 5; index += 1) {
              const direction = -0.9 + index * 0.45;
              addParticle(point.x, point.y, Math.sin(direction) * (5 + index), -5 - index, 360, index % 2 + 1, 0xb8c78a);
            }
          }
          if (event.type === "bat") {
            const target = targetById.get(event.targetId);
            if (!target || event.distance > event.reach) catEmptyBapCount += 1;
            else {
              catBapCount += 1;
              const point = worldToScreen(event.aim.x, event.aim.y);
              host.dataset.catLastBatTarget = event.targetId;
              if (event.targetType === "fish") {
                const fish = swimmers.find((swimmer) => swimmer.id === event.targetId);
                if (fish) fish.startleUntil = now + (event.hit ? 1250 : 760);
                if (isWaterAt(point.x, point.y)) {
                  addRing(point.x, point.y, event.hit ? 38 : 27, 620, 0xf7dfa0);
                  for (let index = 0; index < 7; index += 1) {
                    const angle = (pondFrame.cat.facing < 0 ? Math.PI : 0) + (index - 3) * 0.18;
                    addParticle(point.x, point.y, Math.cos(angle) * (12 + index), Math.sin(angle) * (12 + index) - 4, 520, index % 3 === 0 ? 3 : 2, 0xe4fff4);
                  }
                }
              } else {
                const fly = dragonflies.find((dragonfly) => dragonfly.id === event.targetId);
                if (fly) {
                  const dx = fly.lastX - catScreen.x;
                  const dy = fly.lastY - catScreen.y;
                  const length = Math.max(1, Math.hypot(dx, dy));
                  fly.avoidX += dx / length * 42;
                  fly.avoidY += dy / length * 42 - 12;
                  fly.startleUntil = now + 950;
                }
              }
            }
          }
        }

        const liveFoodIds = new Set(pondFrame.foods.map((food) => food.id));
        maxFoodCount = Math.max(maxFoodCount, pondFrame.foods.length);
        for (const food of pondFrame.foods) {
          const visual = foodVisuals.get(food.id) ?? createFoodVisual(food.id);
          const point = worldToScreen(food.position.x, food.position.y);
          const fall = Math.pow(1 - food.dropProgress, 2) * (reduced ? 5 : 22);
          visual.container.position.set(Math.round(point.x), Math.round(point.y));
          visual.pelletGroup.position.y = -fall;
          visual.pelletGroup.scale.set((0.76 + food.pelletSize / 13) * (food.state === "depleted" ? 0.72 : 1));
          visual.shadow.alpha = food.state === "dropping" ? 0.12 + food.dropProgress * 0.5 : 0.7;
          visual.shadow.scale.set(0.65 + food.dropProgress * 0.35);
          visual.pellets.forEach((pellet, index) => {
            pellet.visible = index < Math.ceil(food.remainingAmount);
          });
          visual.container.alpha += ((food.state === "depleted" ? 0.18 : 1) - visual.container.alpha) * Math.min(1, delta * 6);
        }
        for (const [id, visual] of foodVisuals) {
          if (!liveFoodIds.has(id)) {
            visual.container.destroy({ children: true });
            foodVisuals.delete(id);
          }
        }

        feedAffordance.alpha += (feedAffordanceTarget - feedAffordance.alpha) * Math.min(1, delta * 8);
        feedAffordance.rotation += environment.wind * delta * 0.025;
        if (debugWorld) {
          foodDebug.clear();
          for (const food of pondFrame.foods) {
            const point = worldToScreen(food.position.x, food.position.y);
            foodDebug.circle(point.x, point.y, food.attractionRadius * background.scale.x).stroke({ color: 0xffd77f, alpha: 0.24, width: 1 });
            foodDebug.circle(point.x, point.y, 5).fill({ color: 0xffd77f, alpha: 0.65 });
          }
          for (const intent of pondFrame.fish) {
            if (!intent.goal) continue;
            const fish = swimmers.find((candidate) => candidate.id === intent.fishId);
            if (!fish) continue;
            const from = worldToScreen(fish.vehicle.position.x, fish.vehicle.position.z);
            const to = worldToScreen(intent.goal.x, intent.goal.y);
            foodDebug.moveTo(from.x, from.y).lineTo(to.x, to.y).stroke({ color: intent.reserved ? 0xa8f4dc : 0xffffff, alpha: 0.42, width: 1 });
          }
        }

        setCatAnimation(pondFrame.cat.state);
        catAnimationBlend = Math.min(1, catAnimationBlend + delta * 10);
        catSprite.alpha = catAnimationBlend;
        catGhost.alpha = 1 - catAnimationBlend;
        renderedCatFacing += (pondFrame.cat.facing - renderedCatFacing) * Math.min(1, delta * 9);
        const contact = worldToScreen(pondFrame.cat.contact.x, pondFrame.cat.contact.y);
        const aim = worldToScreen(pondFrame.cat.aim.x, pondFrame.cat.aim.y);
        const lift = pondFrame.cat.lift * background.scale.y * (reduced ? 0.25 : 1);
        const aimLean =
          pondFrame.cat.state === "prepare-bat" || pondFrame.cat.state === "bat"
            ? Math.max(-0.055, Math.min(0.055, Math.atan2(aim.y - contact.y, Math.abs(aim.x - contact.x)) * 0.16))
            : 0;
        catScreen = contact;
        catContainer.position.set(Math.round(contact.x), Math.round(contact.y - lift));
        catContainer.rotation = pondFrame.cat.surfaceAngle + aimLean;
        const facingScale = Math.max(0.08, Math.abs(renderedCatFacing)) * Math.sign(renderedCatFacing || 1);
        catSprite.scale.set(
          catBaseScaleX * facingScale * pondFrame.cat.squashX,
          catBaseScaleY * pondFrame.cat.squashY,
        );
        catGhost.scale.copyFrom(catSprite.scale);
        catShadow.position.y = lift;
        catShadow.scale.set(1 - Math.min(0.22, lift / Math.max(1, catSize) * 0.34), 1 - Math.min(0.1, lift / Math.max(1, catSize) * 0.12));
        catShadow.alpha = 0.95 - Math.min(0.58, lift / Math.max(1, catSize));
        catTarget.set(pondFrame.cat.contact.x, 0, pondFrame.cat.contact.y);
        catGroundedWaterViolation ||= pondFrame.cat.grounded && isWaterAt(contact.x, contact.y);

        for (const element of pondElements) {
          const base = worldToScreen(element.worldX, element.worldY);
          const dx = base.x - pointer.x;
          const dy = base.y - pointer.y;
          const distance = Math.max(1, Math.hypot(dx, dy));
          const reaction = pointerInfluence * Math.max(0, 1 - distance / 145);
          const targetX = dx / distance * reaction * 6 + environment.wind * 0.55;
          const targetY = dy / distance * reaction * 3.5;
          element.offsetX += (targetX - element.offsetX) * Math.min(1, delta * 5.2);
          element.offsetY += (targetY - element.offsetY) * Math.min(1, delta * 5.2);
          element.container.position.set(Math.round(base.x + element.offsetX), Math.round(base.y + element.offsetY));
          element.container.rotation = element.offsetX * 0.008;
          element.container.alpha = 0.54 + reaction * 0.34;
          if (reaction > 0.28 && now - element.lastReaction > 480) {
            addRing(base.x + element.offsetX, base.y + element.offsetY, 24, 680, 0xc6efab);
            element.lastReaction = now;
          }
        }

        for (const plant of foliage) {
          const base = worldToScreen(plant.worldX, plant.worldY);
          const dx = base.x - pointer.x;
          const dy = base.y - pointer.y;
          const distance = Math.max(1, Math.hypot(dx, dy));
          const reaction = pointerInfluence * Math.max(0, 1 - distance / 185);
          const targetX = environment.wind * (2.2 + plant.phase * 0.18) + dx / distance * reaction * 7;
          const targetY = dy / distance * reaction * 2;
          plant.offsetX += (targetX - plant.offsetX) * Math.min(1, delta * 3.4);
          plant.offsetY += (targetY - plant.offsetY) * Math.min(1, delta * 3.4);
          plant.container.position.set(Math.round(base.x + plant.offsetX), Math.round(base.y + plant.offsetY));
          plant.container.rotation = plant.offsetX * 0.012;
        }

        for (const glint of waterGlints) {
          const base = worldToScreen(glint.worldX, glint.worldY);
          glint.container.visible = isWaterAt(base.x, base.y);
          glint.container.alpha = glint.alpha * (0.72 + environment.light * 1.9 + Math.abs(environment.wind + glint.phase * 0.03) * 0.1);
          glint.container.position.set(
            Math.round(base.x + current.ax * 0.08 * glint.drift),
            Math.round(base.y + current.ay * 0.07),
          );
        }

        midgeLayer.clear();
        for (const midge of midges) {
          const base = worldToScreen(midge.worldX, midge.worldY);
          const x = base.x + Math.sin(simulationNow * 0.0011 + midge.phase) * midge.orbit + environment.wind * 2;
          const y = base.y + Math.cos(simulationNow * 0.00145 + midge.phase * 1.3) * midge.orbit * 0.65;
          const dx = x - pointer.x;
          const dy = y - pointer.y;
          const distance = Math.max(1, Math.hypot(dx, dy));
          const pointerSpeed = Math.hypot(pointerAgent.velocity.x, pointerAgent.velocity.z);
          const approach = pointerSpeed > 1
            ? Math.max(0, (pointerAgent.velocity.x * dx + pointerAgent.velocity.z * dy) / (pointerSpeed * distance))
            : 0;
          const flee = pointerInfluence * Math.max(0, 1 - distance / 100) * (8 + approach * 20);
          const avoidX = dx / distance * flee;
          const avoidY = dy / distance * flee;
          midge.avoidX += (avoidX - midge.avoidX) * Math.min(1, delta * 5.5);
          midge.avoidY += (avoidY - midge.avoidY) * Math.min(1, delta * 5.5);
          const drawX = Math.round(x + midge.avoidX);
          const drawY = Math.round(y + midge.avoidY);
          midgeLayer.rect(drawX, drawY, 2, 2).fill({ color: 0x172f2d, alpha: 0.8 });
          if (Math.sin(simulationNow * 0.018 + midge.phase) > 0) {
            midgeLayer.rect(drawX - 1, drawY - 1, 1, 1).fill({ color: 0xe8f2c4, alpha: 0.72 });
            midgeLayer.rect(drawX + 2, drawY - 1, 1, 1).fill({ color: 0xe8f2c4, alpha: 0.72 });
          }
        }

        for (const dragonfly of dragonflies) {
          const orbitX =
            dragonfly.worldX +
            Math.sin(simulationNow * dragonfly.speed + dragonfly.phase) * dragonfly.orbitX +
            Math.sin(simulationNow * dragonfly.speed * 0.37 + dragonfly.phase * 2.1) * dragonfly.orbitX * 0.23 +
            environment.wind * 5;
          const orbitY =
            dragonfly.worldY +
            Math.sin(simulationNow * dragonfly.speed * 1.43 + dragonfly.phase * 1.7) * dragonfly.orbitY +
            environment.currentA.y * 0.9;
          const base = worldToScreen(orbitX, orbitY);
          const dx = base.x - pointer.x;
          const dy = base.y - pointer.y;
          const distance = Math.max(1, Math.hypot(dx, dy));
          const startle = Math.max(0, Math.min(1, (dragonfly.startleUntil - now) / 950));
          const flee = pointerInfluence * Math.max(0, 1 - distance / 150) * 54 + startle * 18;
          const avoidX = dx / distance * flee;
          const avoidY = dy / distance * flee;
          dragonfly.avoidX += (avoidX - dragonfly.avoidX) * Math.min(1, delta * 4.2);
          dragonfly.avoidY += (avoidY - dragonfly.avoidY) * Math.min(1, delta * 4.2);
          const x = base.x + dragonfly.avoidX;
          const y = base.y + dragonfly.avoidY;
          if (dragonfly.lastX || dragonfly.lastY) {
            const heading = Math.atan2(y - dragonfly.lastY, x - dragonfly.lastX);
            dragonfly.container.rotation += angleDelta(dragonfly.container.rotation, heading) * Math.min(1, delta * 5);
            dragonfly.velocityX = (x - dragonfly.lastX) / Math.max(0.001, simulationDelta) / background.scale.x;
            dragonfly.velocityY = (y - dragonfly.lastY) / Math.max(0.001, simulationDelta) / background.scale.y;
          }
          dragonfly.container.position.set(Math.round(x), Math.round(y));
          dragonfly.wings.scale.y = 0.45 + Math.abs(Math.sin(simulationNow * 0.021 + dragonfly.phase)) * (0.75 + startle * 0.35);
          dragonfly.wings.alpha = 0.65 + Math.abs(Math.cos(simulationNow * 0.021 + dragonfly.phase)) * 0.35;
          dragonfly.lastX = x;
          dragonfly.lastY = y;
        }

        for (const swimmer of swimmers) {
          const { position, velocity } = swimmer.vehicle;
          const intent = intentByFish.get(swimmer.id);
          const distance = Math.hypot(position.x - pointer.worldX, position.z - pointer.worldY);
          const proximity = Math.max(0, Math.min(1, (365 - distance) / 315));
          const smoothProximity = proximity * proximity * (3 - 2 * proximity);
          const pointerSpeed = Math.hypot(pointerAgent.velocity.x, pointerAgent.velocity.z);
          const approach = pointerSpeed > 1 && distance > 1
            ? Math.max(0, Math.min(1, (pointerAgent.velocity.x * (position.x - pointer.worldX) + pointerAgent.velocity.z * (position.z - pointer.worldY)) / (pointerSpeed * distance)))
            : 0;
          const threat = pointerInfluence * smoothProximity * (0.16 + pointer.energy * 0.18 + approach * 0.66);
          const catDistance = Math.hypot(position.x - pondFrame.cat.contact.x, position.z - pondFrame.cat.contact.y);
          const catEnergy =
            pondFrame.cat.state === "bat" || pondFrame.cat.state === "react"
              ? 1
              : pondFrame.cat.state === "airborne"
                ? 0.72
                : pondFrame.cat.state === "prepare-bat"
                  ? 0.58
                  : pondFrame.cat.state === "recover"
                    ? 0.22
                    : 0;
          const impactStartle = Math.max(0, Math.min(1, (swimmer.startleUntil - now) / 1250));
          const catThreat = Math.max(catEnergy * Math.max(0, 1 - catDistance / 225), impactStartle);
          const targetEvadeWeight = threat * 4.1;
          swimmer.pointerEvade.weight += (targetEvadeWeight - swimmer.pointerEvade.weight) * Math.min(1, delta * 4.6);
          swimmer.pointerEvade.active = swimmer.pointerEvade.weight > 0.012;
          swimmer.catFlee.active = catThreat > 0.012;
          swimmer.catFlee.weight = 2.8 + catThreat * 2.6;
          reacting ||= swimmer.pointerEvade.active || swimmer.catFlee.active;
          const totalThreat = Math.max(threat, catThreat);
          if (intent?.goal) {
            swimmer.foodTarget.set(intent.goal.x, 0, intent.goal.y);
            swimmer.foodArrive.active = true;
            swimmer.foodArrive.weight = intent.state === "feeding" ? 1.2 : intent.state === "circling" ? 0.9 : 1.65;
            swimmer.foodArrive.deceleration = intent.state === "feeding" ? 1.6 : 2.4;
            swimmer.foodArrive.tolerance = Math.max(5, intent.arrivalRadius * 0.28);
            swimmer.wander.weight += ((intent.state === "approaching-food" ? 0.18 : 0.08) - swimmer.wander.weight) * Math.min(1, delta * 3);
          } else {
            swimmer.foodArrive.active = false;
            swimmer.foodArrive.weight = 0;
            swimmer.wander.weight += (0.72 - swimmer.wander.weight) * Math.min(1, delta * 1.8);
          }
          swimmer.vehicle.maxForce += (5.5 + totalThreat * 13 - swimmer.vehicle.maxForce) * Math.min(1, delta * 4);
          swimmer.vehicle.maxSpeed +=
            (swimmer.cruise * (intent?.speedScale ?? 1) * (1 + totalThreat * 0.7) - swimmer.vehicle.maxSpeed) *
            Math.min(1, delta * 1.8);
          swimmer.vehicle.velocity.x += environment.currentA.x * simulationDelta * 0.018;
          swimmer.vehicle.velocity.z += environment.currentA.y * simulationDelta * 0.018;
          swimmer.returnHome.active =
            position.x < swimmer.clearance + 85 ||
            position.x > pondTexture.width - swimmer.clearance - 85 ||
            position.z < swimmer.clearance + 85 ||
            position.z > pondTexture.height - swimmer.clearance - 85;

          const speed = Math.max(1, Math.hypot(velocity.x, velocity.z));
          const aheadDistance = swimmer.clearance * 1.8 + speed * 0.8;
          const aheadX = position.x + velocity.x / speed * aheadDistance;
          const aheadY = position.z + velocity.z / speed * aheadDistance;
          if (!isWaterWorld(aheadX, aheadY)) {
            const heading = Math.atan2(velocity.z, velocity.x);
            const look = (turn: number) =>
              isWaterWorld(
                position.x + Math.cos(heading + turn) * aheadDistance,
                position.z + Math.sin(heading + turn) * aheadDistance,
              );
            const turn = look(0.72) ? 0.72 : look(-0.72) ? -0.72 : Number(swimmer.id.slice(5)) % 2 ? 1.05 : -1.05;
            const targetX = Math.cos(heading + turn) * speed;
            const targetY = Math.sin(heading + turn) * speed;
            velocity.x += (targetX - velocity.x) * Math.min(1, delta * 2.8);
            velocity.z += (targetY - velocity.z) * Math.min(1, delta * 2.8);
          }
        }

        entityManager.update(simulationDelta);

        for (const swimmer of swimmers) {
          const { position, velocity } = swimmer.vehicle;
          if (!isWaterWorld(position.x, position.z)) {
            const from = { x: swimmer.previousX, y: swimmer.previousY };
            const to = { x: position.x, y: position.z };
            if (isWaterWorld(from.x, from.y)) {
              let inside = 0;
              let outside = 1;
              for (let iteration = 0; iteration < 7; iteration += 1) {
                const probe = (inside + outside) / 2;
                if (isWaterWorld(from.x + (to.x - from.x) * probe, from.y + (to.y - from.y) * probe)) inside = probe;
                else outside = probe;
              }
              position.x = from.x + (to.x - from.x) * inside;
              position.z = from.y + (to.y - from.y) * inside;
            } else {
              const recovered = nearestWaterPosition(position.x, position.z);
              position.set(recovered.x, 0, recovered.y);
            }
            const heading = Math.atan2(velocity.z, velocity.x);
            const turn = isWaterWorld(position.x + Math.cos(heading + 0.9) * 42, position.z + Math.sin(heading + 0.9) * 42)
              ? 0.9
              : -0.9;
            const speed = Math.max(swimmer.cruise * 0.72, Math.hypot(velocity.x, velocity.z));
            velocity.set(Math.cos(heading + turn) * speed, 0, Math.sin(heading + turn) * speed);
          }
          const min = swimmer.clearance;
          const maxX = pondTexture.width - min;
          const maxY = pondTexture.height - min;
          if (position.x < min || position.x > maxX) {
            position.x = Math.max(min, Math.min(maxX, position.x));
            velocity.x *= -0.7;
          }
          if (position.z < min || position.z > maxY) {
            position.z = Math.max(min, Math.min(maxY, position.z));
            velocity.z *= -0.7;
          }

          const heading = Math.atan2(velocity.z, velocity.x);
          const targetRotation = heading + Math.PI / 2;
          swimmer.container.rotation += angleDelta(swimmer.container.rotation, targetRotation) * Math.min(1, delta * 2.2);
          const screenPosition = worldToScreen(position.x, position.z);
          swimmer.container.position.set(Math.round(screenPosition.x), Math.round(screenPosition.y));
          swimmer.container.zIndex = screenPosition.y;
          swimmer.sprite.animationSpeed = 0.032 + Math.min(0.026, swimmer.vehicle.getSpeed() / swimmer.cruise * 0.014);
          const stepDistance = Math.hypot(position.x - swimmer.previousX, position.z - swimmer.previousY);
          swimmer.maxStep = Math.max(swimmer.maxStep, stepDistance);
          swimmer.previousX = position.x;
          swimmer.previousY = position.z;
          const intent = intentByFish.get(swimmer.id);
          const feedingPulse = intent?.feedingPulse ?? 0;
          const depthAlpha = intent?.state === "feeding" ? 0.98 : intent?.state === "circling" ? 0.93 : swimmer.baseAlpha;
          swimmer.container.alpha += (depthAlpha - swimmer.container.alpha) * Math.min(1, delta * 4);
          swimmer.sprite.tint = intent?.state === "feeding" ? 0xf4fff3 : 0xe8fff9;
          const peck = intent?.state === "feeding" ? 1 - Math.abs(feedingPulse * 2 - 1) * 0.055 : 1;
          swimmer.sprite.scale.set(swimmer.baseSpriteScaleX * peck, swimmer.baseSpriteScaleY * (2 - peck));

          if (now - swimmer.lastWake > 230 + swimmer.width * 2) {
            const tail = worldToScreen(
              position.x - Math.cos(heading) * swimmer.clearance * 0.45,
              position.z - Math.sin(heading) * swimmer.clearance * 0.45,
            );
            addParticle(tail.x, tail.y, -Math.cos(heading) * 4, -Math.sin(heading) * 4 - 2, 820, 2, 0x9be4d7);
            swimmer.lastWake = now;
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
          const alpha = Math.max(0, 1 - age / particle.life) * 0.72;
          particleLayer
            .rect(Math.round(particle.x), Math.round(particle.y), particle.size, particle.size)
            .fill({ color: particle.color, alpha });
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
            particleLayer
              .rect(
                Math.round(ring.x + Math.cos(angle) * radius),
                Math.round(ring.y + Math.sin(angle) * radius * 0.72),
                progress < 0.5 ? 3 : 2,
                2,
              )
              .fill({ color: ring.color, alpha });
          }
          return true;
        });

        let filtersChanged = false;
        ripples = ripples.filter((ripple) => {
          const age = now - ripple.born;
          if (age < 0) return true;
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
        if (frameCount % 12 === 0) {
          host.dataset.fishPositions = swimmers.map((fish) => {
            const point = worldToScreen(fish.vehicle.position.x, fish.vehicle.position.z);
            return `${point.x.toFixed(1)},${point.y.toFixed(1)}`;
          }).join(";");
          host.dataset.fishReacting = String(reacting);
          host.dataset.fishWaterViolation = String(swimmers.some((fish) => !isWaterWorld(fish.vehicle.position.x, fish.vehicle.position.z)));
          host.dataset.fishMaxStep = Math.max(...swimmers.map((fish) => fish.maxStep)).toFixed(2);
          host.dataset.rippleCount = String(ripples.length);
          host.dataset.wakeCount = String(particles.length);
          host.dataset.ringCount = String(rings.length);
          host.dataset.foodCount = String(pondFrame.foods.length);
          host.dataset.foodDroppedCount = String(foodDroppedCount);
          host.dataset.foodExpiredCount = String(foodExpiredCount);
          host.dataset.foodMaxCount = String(maxFoodCount);
          host.dataset.fishFedCount = String(fishFedCount);
          host.dataset.fishFoodStates = pondFrame.fish.map((fish) => `${fish.fishId}:${fish.state}:${fish.foodId ?? "none"}`).join(";");
          host.dataset.waterOffset = `${displacementA.position.x.toFixed(2)},${displacementA.position.y.toFixed(2)};${waterA.scale.x.toFixed(2)},${waterB.scale.y.toFixed(2)}`;
          host.dataset.catState = pondFrame.cat.state;
          host.dataset.catPosition = `${catScreen.x.toFixed(1)},${catScreen.y.toFixed(1)}`;
          host.dataset.catPounceCount = String(catPounceCount);
          host.dataset.catBapCount = String(catBapCount);
          host.dataset.catEmptyBapCount = String(catEmptyBapCount);
          host.dataset.catOverWater = String(isWaterAt(catScreen.x, catScreen.y));
          host.dataset.catWaterViolation = String(catGroundedWaterViolation);
          host.dataset.catRotation = catContainer.rotation.toFixed(3);
          host.dataset.frame = String(frameCount);
          if (process.env.NODE_ENV !== "production") {
            const targetDistances = pondTargets
              .filter((target) => target.visible && target.attackable)
              .map((target) => Math.hypot(target.position.x - pondFrame!.cat.contact.x, target.position.y - pondFrame!.cat.contact.y));
            host.dataset.catCandidateCount = String(targetDistances.filter((distance) => distance <= CAT_INTEREST_RADIUS).length);
            host.dataset.catNearestTargetDistance = targetDistances.length ? Math.min(...targetDistances).toFixed(2) : "none";
            host.dataset.fishWaterViolationIds = swimmers.filter((fish) => !isWaterWorld(fish.vehicle.position.x, fish.vehicle.position.z)).map((fish) => fish.id).join(",");
            host.dataset.fishWorldPositions = swimmers.map((fish) => `${fish.vehicle.position.x.toFixed(2)},${fish.vehicle.position.z.toFixed(2)}`).join(";");
            host.dataset.pondSeed = pondSeed;
            host.dataset.catAnchor = pondFrame.cat.anchorId;
            host.dataset.catRock = pondFrame.cat.rockId;
            host.dataset.catDestination = pondFrame.cat.destinationAnchorId ?? "none";
            host.dataset.catTarget = pondFrame.cat.selectedTargetId ?? "none";
            host.dataset.catTargetType = pondFrame.cat.selectedTargetType ?? "none";
            host.dataset.catGrounded = String(pondFrame.cat.grounded);
            host.dataset.catReason = pondFrame.debug.reason;
            host.dataset.catFacing = String(pondFrame.cat.facing);
            host.dataset.catAim = `${pondFrame.cat.aim.x.toFixed(1)},${pondFrame.cat.aim.y.toFixed(1)}`;
            host.dataset.catAimScreen = `${aim.x.toFixed(1)},${aim.y.toFixed(1)}`;
            host.dataset.foodEntities = pondFrame.foods.map((food) => `${food.id}:${food.position.x.toFixed(2)},${food.position.y.toFixed(2)}:${food.state}:${food.remainingAmount}`).join(";");
            host.dataset.foodReservations = pondFrame.fish.filter((fish) => fish.reserved).map((fish) => `${fish.fishId}:${fish.foodId}`).join(";");
            host.dataset.pondCamera = `${worldCenterX().toFixed(2)},${(pondTexture.height / 2).toFixed(2)},${background.scale.x.toFixed(5)},${background.scale.y.toFixed(5)}`;
          }
        }
      });

      const visibility = () => {
        if (document.hidden) {
          app.stop();
          host.dataset.pixiState = "paused";
        } else {
          app.start();
          host.dataset.pixiState = "running";
        }
      };

      layout();
      pond.dataset.renderer = "pixi";
      host.dataset.pixiState = "running";
      host.dataset.fishCount = String(swimmers.length);
      host.dataset.pondElementCount = String(pondElements.length);
      host.dataset.insectCount = String(midges.length + dragonflies.length);
      host.dataset.catCount = "1";
      host.dataset.fishLogic = "seeded-world-flock-predictive-evade";
      host.dataset.worldModel = "seeded-rock-target-food-environment";
      window.addEventListener("resize", layout);
      window.addEventListener("pointermove", move, { passive: true });
      window.addEventListener("pointerdown", press, { passive: true });
      window.addEventListener("pointerup", releaseTouch, { passive: false });
      window.addEventListener("pointercancel", cancelTouch, { passive: true });
      window.addEventListener("contextmenu", contextMenu);
      document.addEventListener("visibilitychange", visibility);

      teardown = () => {
        window.removeEventListener("resize", layout);
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerdown", press);
        window.removeEventListener("pointerup", releaseTouch);
        window.removeEventListener("pointercancel", cancelTouch);
        window.removeEventListener("contextmenu", contextMenu);
        document.removeEventListener("visibilitychange", visibility);
        if (pendingSingleTap !== null) window.clearTimeout(pendingSingleTap);
        entityManager.clear();
        foodVisuals.clear();
        ripples.forEach((ripple) => ripple.filter.destroy());
        waterA.destroy();
        waterB.destroy();
        finger.destroy();
        destroyApp();
      };
    })().catch((error: unknown) => {
      destroyApp();
      host.replaceChildren();
      if (process.env.NODE_ENV !== "production") {
        host.dataset.fallbackReason = error instanceof Error ? error.message : "renderer-init-failed";
      }
      host.dataset.pixiState = "fallback";
      pond.dataset.renderer = "fallback";
    });

    return () => {
      disposed = true;
      teardown();
    };
  }, [reduced]);

  return (
    <div ref={pondRef} className={styles.pond} data-renderer="fallback" aria-hidden="true">
      <div className={styles.pondImage} />
      <div ref={pixiHostRef} className={styles.pixiHost} data-pixi-state="idle" data-ripple-count="0" data-ring-count="0" data-wake-count="0" data-fish-count="0" data-food-count="0" data-food-dropped-count="0" data-food-expired-count="0" data-fish-fed-count="0" data-primary-impact-count="0" data-food-affordance="false" data-pond-element-count="0" data-insect-count="0" data-cat-count="0" data-cat-state="idle" data-cat-pounce-count="0" data-cat-bap-count="0" data-cat-empty-bap-count="0" data-cat-over-water="false" data-cat-water-violation="false" data-cat-rotation="0.000" data-fish-reacting="false" data-fish-water-violation="false" />
      <div className={styles.pondGrade} />
      <div className={`${styles.koi} ${styles.koiOne}`} />
      <div className={`${styles.koi} ${styles.koiTwo}`} />
      <div className={styles.tabby} />
      <div className={styles.surfaceLight} />
    </div>
  );
}

function ProjectArtwork({ project }: { project: PortfolioProject }) {
  const image = project.id === "linux-sonar" ? "/share-cards/linux-sonar.png" : project.image;

  if (!image) return null;

  if (project.id === "rakazo-android") {
    return (
      <div className={`${styles.projectMedia} ${styles.mediarakazoandroid}`}>
        <div className={styles.rakazoIdentity}>
          <Image src={image} alt={project.imageAlt ?? "Rakazo Android application icon"} width={104} height={104} />
          <span><strong>Rakazo</strong><small>Native Android + upstream</small></span>
        </div>
        <div className={styles.rakazoSignals} aria-label="Highlighted upstream work">
          <span>Delegated replies</span>
          <span>Android parity</span>
          <span>Scheduled group work</span>
          <span>Long-chat performance</span>
        </div>
        <span className={styles.mediaCaption}>{project.category}</span>
      </div>
    );
  }

  return (
    <div className={`${styles.projectMedia} ${styles[`media${project.id.replaceAll("-", "")}`]}`}>
      <Image
        src={image}
        alt={project.imageAlt ?? `${project.name} project artwork`}
        fill
        sizes="(max-width: 820px) 92vw, 48vw"
        priority={project.id === "orchid-android"}
      />
      <span className={styles.mediaCaption}>{project.category}</span>
    </div>
  );
}

function ProjectExplorer({ reduced }: { reduced: boolean }) {
  const [activeId, setActiveId] = useState(portfolioProjects[0]?.id ?? "orchid-android");
  const [direction, setDirection] = useState(1);
  const activeIndex = Math.max(0, portfolioProjects.findIndex((project) => project.id === activeId));
  const activeProject = portfolioProjects[activeIndex] ?? portfolioProjects[0];

  if (!activeProject) return null;

  return (
    <section className={styles.workSection} id="work" aria-labelledby="work-title">
      <motion.div
        className={styles.sectionIntro}
        initial={{ opacity: 0, clipPath: "inset(0 0 18% 0)", y: 26 }}
        whileInView={{ opacity: 1, clipPath: "inset(0 0 0% 0)", y: 0 }}
        viewport={{ once: true, amount: 0.35 }}
        transition={{ duration: reduced ? 0 : 0.62, ease: EASE_OUT }}
      >
        <span className={styles.eyebrow}>Selected work / 2026</span>
        <h2 id="work-title">Built where the interesting problems live.</h2>
        <p>Native apps, agent infrastructure, Linux systems. Pick a project to inspect the work.</p>
      </motion.div>

      <motion.div
        className={styles.projectExplorer}
        initial={{ opacity: 0, scale: 0.985, y: 22 }}
        whileInView={{ opacity: 1, scale: 1, y: 0 }}
        viewport={{ once: true, amount: 0.12 }}
        transition={{ duration: reduced ? 0 : 0.56, ease: EASE_OUT }}
      >
        <div className={styles.projectNav} role="group" aria-label="Featured projects">
          {portfolioProjects.map((project, index) => {
            const active = project.id === activeProject.id;
            return (
              <motion.button
                type="button"
                key={project.id}
                onClick={() => {
                  setDirection(index >= activeIndex ? 1 : -1);
                  setActiveId(project.id);
                }}
                className={active ? styles.activeProject : ""}
                aria-pressed={active}
                whileTap={reduced ? undefined : { scale: 0.985 }}
                transition={{ duration: 0.1 }}
              >
                {active && <motion.i className={styles.projectMarker} layoutId="project-marker" transition={{ duration: reduced ? 0 : 0.24, ease: EASE_OUT }} />}
                <span>0{index + 1}</span>
                <strong>{project.name}</strong>
                <small>{project.category}</small>
              </motion.button>
            );
          })}
        </div>

        <div className={styles.projectStage} aria-live="polite">
          <AnimatePresence mode="sync" initial={false} custom={direction}>
            <motion.article
              className={styles.projectPanel}
              key={activeProject.id}
              custom={direction}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={reduced ? undefined : { opacity: 0 }}
              transition={{ duration: reduced ? 0 : 0.24, ease: EASE_OUT }}
            >
              <motion.div
                className={styles.projectVisual}
                initial={{ clipPath: direction > 0 ? "inset(0 11% 0 0)" : "inset(0 0 0 11%)", scale: 1.025 }}
                animate={{ clipPath: "inset(0 0 0 0)", scale: 1 }}
                exit={reduced ? undefined : { opacity: 0, scale: 0.99 }}
                transition={{ duration: reduced ? 0 : 0.34, ease: EASE_OUT }}
              >
                <ProjectArtwork project={activeProject} />
              </motion.div>
              <motion.div
                className={styles.projectCopy}
                initial={{ opacity: 0, x: direction * 18 }}
                animate={{ opacity: 1, x: 0 }}
                exit={reduced ? undefined : { opacity: 0, x: direction * -10 }}
                transition={{ duration: reduced ? 0 : 0.3, delay: reduced ? 0 : 0.035, ease: EASE_OUT }}
              >
                <span className={styles.projectEyebrow}>{activeProject.eyebrow}</span>
                <h3>{activeProject.name}</h3>
                <p className={styles.projectSummary}>{activeProject.summary}</p>
                <p className={styles.projectDetail}>{activeProject.detail}</p>
                <div className={styles.proofRow}>
                  {activeProject.proof?.map((item) => <span key={item}>{item}</span>)}
                </div>
                <div className={styles.projectActions}>
                  <a href={activeProject.href} target="_blank" rel="noreferrer">
                    View project <ArrowUpRight aria-hidden="true" />
                  </a>
                  {activeProject.secondaryHref && (
                    <a href={activeProject.secondaryHref} target="_blank" rel="noreferrer">
                      {activeProject.secondaryLabel} <ArrowUpRight aria-hidden="true" />
                    </a>
                  )}
                </div>
              </motion.div>
            </motion.article>
          </AnimatePresence>
        </div>
      </motion.div>
    </section>
  );
}

export function SignalDesk() {
  const [reducedMotion, setReducedMotion] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReducedMotion(preference.matches);
    sync();
    preference.addEventListener("change", sync);
    return () => preference.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    let current = window.scrollY > 36;
    const sync = () => {
      const next = window.scrollY > 36;
      if (next !== current) {
        current = next;
        setScrolled(next);
      }
    };
    window.addEventListener("scroll", sync, { passive: true });
    return () => window.removeEventListener("scroll", sync);
  }, []);

  return (
    <div className={styles.page} id="top">
      <PondEnvironment reduced={reducedMotion} />
      <p className={styles.srOnly}>The decorative pond responds to pointer movement. Right-click open water, or double-tap it on touch devices, to feed the fish.</p>

      <motion.header
        className={`${styles.header} ${scrolled ? styles.headerScrolled : ""}`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: reducedMotion ? 0 : 0.42, ease: EASE_OUT }}
      >
        <a className={styles.brand} href="#top" aria-label="Lu, back to top">
          <Image src="/images/portfolio/lu-avatar.jpg" alt="" width={38} height={38} priority />
          <span><strong>LU / 6C75</strong><small>SOFTWARE ENGINEER</small></span>
        </a>
        <nav aria-label="Portfolio navigation">
          <a href="#work">Work</a>
          <a href="#about">About</a>
          <a href="#contact">Contact</a>
        </nav>
        <span className={styles.availability}><i /> Building at Orchid.ai</span>
      </motion.header>

      <div>
        <section className={styles.hero} aria-labelledby="hero-title">
          <motion.div
            className={styles.heroCopy}
            variants={reducedMotion ? { hidden: {}, visible: {} } : HERO_SEQUENCE}
            initial="hidden"
            animate="visible"
          >
            <motion.span variants={HERO_REVEAL} transition={{ duration: reducedMotion ? 0 : 0.62, ease: EASE_OUT }} className={styles.eyebrow}><Sparkles aria-hidden="true" /> Lu / software engineer</motion.span>
            <motion.h1 variants={HERO_REVEAL} transition={{ duration: reducedMotion ? 0 : 0.62, ease: EASE_OUT }} id="hero-title">I make stubborn software <em>behave.</em></motion.h1>
            <motion.p variants={HERO_REVEAL} transition={{ duration: reducedMotion ? 0 : 0.62, ease: EASE_OUT }}>I build Orchid.ai’s native Android app, agent systems, and Linux tools that do the useful part without making a fuss.</motion.p>
            <motion.div variants={HERO_REVEAL} transition={{ duration: reducedMotion ? 0 : 0.62, ease: EASE_OUT }} className={styles.heroActions}>
              <a href="#work">See the work <ArrowDown aria-hidden="true" /></a>
              <a href={portfolioIdentity.email}>Start a conversation <Mail aria-hidden="true" /></a>
            </motion.div>
          </motion.div>
        </section>

        <ProjectExplorer reduced={reducedMotion} />

        <section className={styles.aboutSection} id="about" aria-labelledby="about-title">
          <motion.div
            className={styles.aboutLead}
            initial={{ opacity: 0, clipPath: "inset(0 0 16% 0)", y: 28 }}
            whileInView={{ opacity: 1, clipPath: "inset(0 0 0% 0)", y: 0 }}
            viewport={{ once: true, amount: 0.28 }}
            transition={{ duration: reducedMotion ? 0 : 0.62, ease: EASE_OUT }}
          >
            <span className={styles.eyebrow}>About / how I work</span>
            <h2 id="about-title">Practical systems. Properly finished.</h2>
            <p>I work across native apps, agent infrastructure, Linux, and the awkward seams between them. I like the problems where “mostly works” is still broken.</p>
            <div className={styles.profileLine}>
              <Image src="/images/portfolio/lu-avatar.jpg" alt="Lu's illustrated avatar wearing a pink cap" width={64} height={64} />
              <span><strong>Lu</strong><small>@x6c75 · United Kingdom</small></span>
            </div>
          </motion.div>

          <motion.article
            className={styles.iniuriaCard}
            initial={{ opacity: 0, scale: 0.965, y: 24 }}
            whileInView={{ opacity: 1, scale: 1, y: 0 }}
            viewport={{ once: true, amount: 0.32 }}
            transition={{ duration: reducedMotion ? 0 : 0.56, ease: EASE_OUT }}
          >
            <span className={styles.projectEyebrow}>Independent work / Iniuria.us</span>
            <h3>Automation with an actual job to do.</h3>
            <p>Discord automation, internal admin panels, and AI-assisted support triage built around the daily realities of an active community.</p>
            <div className={styles.proofRow}><span>Discord systems</span><span>Admin tooling</span><span>AI triage</span></div>
          </motion.article>

          <motion.div
            className={styles.moreWork}
            initial={{ opacity: 0, clipPath: "inset(0 0 0 8%)" }}
            whileInView={{ opacity: 1, clipPath: "inset(0 0 0 0%)" }}
            viewport={{ once: true, amount: 0.18 }}
            transition={{ duration: reducedMotion ? 0 : 0.58, ease: EASE_OUT }}
          >
            <div>
              <span className={styles.eyebrow}><Github aria-hidden="true" /> More open source</span>
              <h3>Small tools. Sharp edges.</h3>
            </div>
            <div className={styles.moreGrid}>
              {supportingWork.map((project) => (
                <a key={project.name} href={project.href} target="_blank" rel="noreferrer">
                  <span><strong>{project.name}</strong><small>{project.note}</small></span>
                  <ArrowUpRight aria-hidden="true" />
                </a>
              ))}
            </div>
          </motion.div>
        </section>

        <motion.section
          className={styles.contactSection}
          id="contact"
          aria-labelledby="contact-title"
          initial={{ opacity: 0, scale: 0.975, y: 24 }}
          whileInView={{ opacity: 1, scale: 1, y: 0 }}
          viewport={{ once: true, amount: 0.28 }}
          transition={{ duration: reducedMotion ? 0 : 0.56, ease: EASE_OUT }}
        >
          <span className={styles.eyebrow}>Open channel</span>
          <h2 id="contact-title">Got a useful problem?</h2>
          <p>Native apps, agent infrastructure, strange systems, and software that needs to behave.</p>
          <a href={portfolioIdentity.email}>Start a conversation <ArrowUpRight aria-hidden="true" /></a>
        </motion.section>
      </div>

      <motion.footer
        className={styles.footer}
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true, amount: 0.7 }}
        transition={{ duration: reducedMotion ? 0 : 0.42, ease: EASE_OUT }}
      >
        <span>© {new Date().getFullYear()} Lu / 6C75</span>
        <div>
          <a href={portfolioIdentity.github} target="_blank" rel="noreferrer">GitHub</a>
          <a href={portfolioIdentity.x} target="_blank" rel="noreferrer">@x6c75</a>
          <a href={portfolioIdentity.orchid} target="_blank" rel="noreferrer">Orchid.ai</a>
        </div>
      </motion.footer>
    </div>
  );
}
