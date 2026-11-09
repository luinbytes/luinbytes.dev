import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import test from "node:test";
import ts from "typescript";
import { POND_ASCII_FPS_CAP, pondFrameBudget } from "../components/concepts/signal-desk/pond-ascii.ts";

const source = readFileSync(new URL("../components/concepts/signal-desk/pond-renderer.ts", import.meta.url), "utf8");
const javascript = (text: string) => ts.transpileModule(text, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None } }).outputText;

test("reduced ASCII preserves wall time and pacing at 60, 120, 144 and 240 Hz", () => {
  const draw = source.slice(source.indexOf("    const draw = (now:"), source.indexOf("    const visibility ="));
  function schedule(hz: number, reduced: boolean) {
    let seconds = 0;
    let renders = 0;
    const tick = runInNewContext(javascript(`let animationFrame = null; let previousTime = 0; let frameBudget = 0;\n${draw}\ndraw;`), {
      disposed: false, document: { hidden: false }, liveAscii: true, heroOnScreen: true, reduced,
      POND_ASCII_FPS_CAP, pondFrameBudget, Math, revealed: true,
      step: (_now: number, delta: number) => { seconds += delta * (reduced ? 0.2 : 1); },
      present: () => { renders += 1; },
      window: { requestAnimationFrame: () => 1 },
      fallback: (reason: string) => { throw new Error(reason); },
    });
    for (let index = 1; index <= hz; index += 1) tick(index * 1000 / hz);
    return { seconds, renders };
  }
  const results = [60, 120, 144, 240].map((hz) => ({ hz, reduced: schedule(hz, true), ordinary: schedule(hz, false) }));
  assert.ok(results.every(({ reduced }) => Math.abs(reduced.seconds - 0.2) < 0.004), JSON.stringify(results));
  for (const { hz, reduced, ordinary } of results) {
    assert.equal(reduced.renders, ordinary.renders, `${hz} Hz changed render cadence`);
    assert.ok(reduced.renders <= 61);
  }
});

test("ASCII starts with only the atlas while raster mode still loads its hit map", async () => {
  const assets = source.slice(source.indexOf("    const koiAtlas ="), source.indexOf("    host.replaceChildren(canvas);"));
  const pixelSource = readFileSync(new URL("../components/concepts/signal-desk/pond-pixel-renderer.ts", import.meta.url), "utf8");
  const pixelAssets = pixelSource.slice(pixelSource.indexOf("    const [pondTexture,"), pixelSource.indexOf("    host.replaceChildren(canvas);"));
  async function initialize(liveAscii: boolean, fail: (path: string) => boolean, pixel = false, mobile = false) {
    const loaded: string[] = [];
    let reads = 0;
    const initializeAssets = runInNewContext(javascript(`(async () => { ${pixel ? pixelAssets : assets} })`), {
      liveAscii,
      window: { matchMedia: () => ({ matches: mobile }) },
      load: async (path: string) => {
        loaded.push(path);
        if (fail(path)) throw new Error(`failed ${path}`);
        return { width: 1586, height: 992, texture: {}, image: {} };
      },
      loads: { signal: { throwIfAborted: () => {} } },
      own: (value: unknown) => value,
      THREE: { Texture: class { needsUpdate = false; } },
      document: { createElement: () => ({ width: 0, height: 0, getContext: () => ({
        drawImage: () => {},
        getImageData: () => { reads += 1; return { data: new Uint8ClampedArray(4) }; },
      }) }) },
      Uint8ClampedArray,
    });
    await initializeAssets();
    return { loaded, reads };
  }
  const ascii = await initialize(true, (path) => path !== "pixel-koi-atlas.webp");
  assert.deepEqual(ascii.loaded, ["pixel-koi-atlas.webp"]);
  assert.equal(ascii.reads, 0);
  const raster = await initialize(false, () => false);
  assert.equal(raster.loaded.length, 5);
  assert.equal(raster.reads, 1);
  const pixel = await initialize(false, () => false, true);
  assert.equal(pixel.loaded.length, 5);
  assert.equal(pixel.reads, 1);
  assert.ok(pixel.loaded.includes("pixel-pond-world.webp"));
  const mobilePixel = await initialize(false, () => false, true, true);
  assert.ok(mobilePixel.loaded.includes("pixel-pond-world-mobile.webp"));
  assert.equal(mobilePixel.reads, 1);
  await assert.rejects(initialize(false, (path) => path === "water-displacement.jpg"), /failed water-displacement/);
  await assert.rejects(initialize(true, () => true), /failed pixel-koi-atlas/);
});
