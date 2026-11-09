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
